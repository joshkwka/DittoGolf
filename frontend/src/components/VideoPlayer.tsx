import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { Timeline } from "../core/Timeline";

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

        // 1. Live Scrubbing (Always Priority - Desktop & Mobile)
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
            // Only snap if we are noticeably off (prevents micro-jumps on pause)
            if (absDrift > 0.1) video.currentTime = targetTime; 
            return;
        }

        // 3. Play Handling
        if (action === "play") {
            video.play().catch(() => {});
        }

        // 4. Sync Loop (Only when running)
        const isVideoRunning = !video.paused && !video.ended && video.readyState > 2;
        
        if ((action as any) !== "pause" && (action === "play" || isVideoRunning)) {
           
           // --- MOBILE OPTIMIZATION ---
           if (isMobile) {
               // Throttle: Only adjust speed every 15 frames (approx 2 times/sec)
               // This prevents the CPU from being overwhelmed by constant rate updates.
               tickCounter++;
               if (tickCounter % 15 !== 0) return;

               // A. Small Drift (Floating): Do nothing. Smoothness > Precision.
               if (absDrift < 0.2) {
                   // Ensure we are at normal speed (if we aren't already)
                   const warpRate = timeline.getInstantaneousRate(videoIndex);
                   const targetRate = timeline.playbackRate * warpRate;
                   if (Math.abs(video.playbackRate - targetRate) > 0.1) {
                       video.playbackRate = targetRate;
                   }
                   return;
               }

               // B. Medium Drift (Catch Up): Use Speed, NOT Jumping
               if (absDrift < 1.0) {
                   const catchUpMultiplier = signedDrift > 0 ? 1.25 : 0.75; // Speed up or Slow down
                   const warpRate = timeline.getInstantaneousRate(videoIndex);
                   const catchUpRate = (timeline.playbackRate * warpRate) * catchUpMultiplier;
                   
                   // Safety Clamp (0.5x to 2.0x)
                   video.playbackRate = Math.max(0.5, Math.min(catchUpRate, 2.0));
                   return;
               }

               // C. Huge Drift (Stalled): Hard Snap
               // This only happens if the video froze for a full second
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
                   // Apply micro-adjustments
                   const safeRate = Math.max(0.0625, Math.min(finalRate, 16));
                   if (Math.abs(video.playbackRate - safeRate) > 0.01) {
                       video.playbackRate = safeRate;
                   }
               }
           }
        }

        // 5. Scrubbing Snap (Dragging the slider)
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