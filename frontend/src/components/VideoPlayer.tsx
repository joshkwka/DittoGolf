import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { Timeline, SyncMode } from "../core/Timeline";

const isMobileDevice = () => {
  return typeof window !== 'undefined' && window.innerWidth < 768;
};

type VideoPlayerProps = {
  src: string;
  timeline: Timeline;
  videoIndex: 0 | 1;
};

const VideoPlayer = forwardRef<HTMLVideoElement, VideoPlayerProps>(
  ({ src, timeline, videoIndex }, forwardedRef) => {
    const internalRef = useRef<HTMLVideoElement>(null);

    useImperativeHandle(forwardedRef, () => internalRef.current!);

    // Setup & Metadata
    useEffect(() => {
      const video = internalRef.current;
      if (!video) return;

      const onLoaded = () => timeline.setDuration(video.duration, videoIndex);
      if (video.readyState >= 1) onLoaded();
      else video.addEventListener("loadedmetadata", onLoaded);

      // Important for desktop smoothness
      const v = video as any; 
      if ('preservesPitch' in v) v.preservesPitch = false;
      else if ('mozPreservesPitch' in v) v.mozPreservesPitch = false;
      else if ('webkitPreservesPitch' in v) v.webkitPreservesPitch = false;

      return () => video.removeEventListener("loadedmetadata", onLoaded);
    }, [timeline, videoIndex, src]);

    // --- SYNC ENGINE ---
    useEffect(() => {
      const video = internalRef.current;
      if (!video) return;

      const isMobile = isMobileDevice();
      let tickCounter = 0;

      const unsub = timeline.subscribe((step, action, meta) => {
        if (!video) return;

        // 1. Live Scrubbing (Always Priority)
        if (action === "preview") {
            if (meta && meta.videoIndex === videoIndex) {
                video.currentTime = meta.step / timeline.masterFPS;
                video.pause(); 
            }
            return; 
        }

        const targetTime = timeline.calculateVideoTime(videoIndex, step);
        const signedDrift = targetTime - video.currentTime;
        const absDrift = Math.abs(signedDrift);

        // 2. Pause Handling
        if ((action as any) === "pause") {
            video.pause();
            // Force snap on pause so frames align perfectly
            if (absDrift > 0.05) video.currentTime = targetTime; 
            return;
        }

        // 3. Play Handling
        if (action === "play") {
            video.play().catch(() => {});
        }

        // 4. Sync Loop (Only when running)
        const isVideoRunning = !video.paused && !video.ended && video.readyState > 2;
        
        if ((action as any) !== "pause" && (action === "play" || isVideoRunning)) {
           
           // --- MOBILE OPTIMIZATION (TUNED) ---
           if (isMobile) {
               // Throttle: Check every 10 frames (approx 6 times/sec) - More responsive
               tickCounter++;
               if (tickCounter % 10 !== 0) return;

               // A. Small Drift (Floating)
               // TIGHTENED: Now ignores < 0.08s (was 0.2s). 
               // This is tight enough to look synced, but loose enough to prevent jitter.
               if (absDrift < 0.08) {
                   const warpRate = timeline.getInstantaneousRate(videoIndex);
                   const targetRate = timeline.playbackRate * warpRate;
                   // Reset speed to normal if we are synced
                   if (Math.abs(video.playbackRate - targetRate) > 0.1) {
                       video.playbackRate = targetRate;
                   }
                   return;
               }

               // B. Medium Drift (Catch Up)
               // INCREASED RANGE: Works up to 1.5s drift before snapping
               if (absDrift < 1.5) {
                   // AGGRESSIVE CATCH UP: Use 1.5x speed (was 1.25x)
                   const catchUpMultiplier = signedDrift > 0 ? 1.5 : 0.6; 
                   const warpRate = timeline.getInstantaneousRate(videoIndex);
                   const catchUpRate = (timeline.playbackRate * warpRate) * catchUpMultiplier;
                   
                   // Clamp (0.5x to 3.0x) allows faster catchup
                   video.playbackRate = Math.max(0.5, Math.min(catchUpRate, 3.0));
                   return;
               }

               // C. Huge Drift (Stalled): Hard Snap
               video.currentTime = targetTime;
           } 
           
           // --- DESKTOP LOGIC (High Precision) ---
           else {
               const warpRate = timeline.getInstantaneousRate(videoIndex);
               let finalRate = timeline.playbackRate * warpRate;
               
               const isHighSpeed = timeline.playbackRate > 2;
               
               // Anti-Jitter
               if (absDrift > 0.04 && absDrift < 0.25 && !isHighSpeed) {
                   finalRate += (signedDrift * 0.5); 
               }

               // Snap if drift is too large
               if (absDrift > 0.3) {
                   video.currentTime = targetTime;
               } else {
                   const safeRate = Math.max(0.0625, Math.min(finalRate, 16));
                   if (Math.abs(video.playbackRate - safeRate) > 0.01) {
                       video.playbackRate = safeRate;
                   }
               }
           }
        }

        // 5. Scrubbing Snap
        if (action === "seek" || action === "update") {
           if (absDrift > 0.05) video.currentTime = targetTime;
        }
      });
      return unsub;
    }, [timeline, videoIndex]);

    return (
      <video
        ref={internalRef}
        src={src}
        playsInline
        webkit-playsinline="true"
        muted
        style={{ 
          width: '100%', 
          height: '100%', 
          objectFit: 'contain', 
          background: '#000',
          transform: 'translateZ(0)',
          willChange: 'transform' 
        }}
      />
    );
  }
);

VideoPlayer.displayName = "VideoPlayer";
export default VideoPlayer;