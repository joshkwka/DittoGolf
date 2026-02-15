import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { Timeline, SyncMode } from "../core/Timeline";

// Helper to detect mobile devices
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

    // Metadata & Setup Listener
    useEffect(() => {
      const video = internalRef.current;
      if (!video) return;

      const onLoaded = () => timeline.setDuration(video.duration, videoIndex);
      if (video.readyState >= 1) onLoaded();
      else video.addEventListener("loadedmetadata", onLoaded);

      // Disable Audio Pitch Preservation
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

        // 1. Live Scrubbing (Priority)
        if (action === "preview") {
            if (meta && meta.videoIndex === videoIndex) {
                video.currentTime = meta.step / timeline.masterFPS;
                video.pause(); 
            }
            return; 
        }

        // --- MOBILE OPTIMIZATION ---
        tickCounter++;
        if (isMobile && action === undefined && tickCounter % 5 !== 0) {
            return; 
        }

        const targetTime = timeline.calculateVideoTime(videoIndex, step);
        const timeDiff = targetTime - video.currentTime;
        const drift = Math.abs(timeDiff);

        // 2. Playback State
        if (action === "play") {
            video.play().catch(() => {});
        } 
        // FIX: Cast 'action' to any (or string) to suppress the overlap error
        else if ((action as any) === "pause") {
            video.pause();
            if (drift > 0.05) video.currentTime = targetTime; 
            return;
        }

        // 3. Sync Logic
        const isVideoRunning = !video.paused && !video.ended && video.readyState > 2;
        
        // FIX: Cast 'action' here as well just to be safe in the comparison
        if ((action as any) !== "pause" && (action === "play" || isVideoRunning)) {
           
           if (isMobile) {
               // [Mobile] Loose Sync
               if (drift > 0.15) {
                   video.currentTime = targetTime;
               }
           } 
           else {
               // [Desktop] Perfect Sync
               const warpRate = timeline.getInstantaneousRate(videoIndex);
               let finalRate = timeline.playbackRate * warpRate;
               const isHighSpeed = timeline.playbackRate > 2;
               const isDrifting = drift > 0.04 && drift < 0.25;
               
               if (isDrifting && !isHighSpeed) {
                   finalRate += (timeDiff * 0.5); 
               }

               const safeRate = Math.max(0.0625, Math.min(finalRate, 16));
               if (Math.abs(video.playbackRate - safeRate) > 0.01) {
                 video.playbackRate = safeRate;
               }
           }
        }

        // 4. Position Correction
        const isScrubbing = action === "seek" || action === "update";
        
        if (isScrubbing) {
           if (drift > 0.001) video.currentTime = targetTime;
        } else {
           if (!isMobile) {
               const isWarp = timeline.syncMode === SyncMode.SYNC;
               const baseTolerance = isWarp ? 0.25 : 0.1;
               const dynamicTolerance = baseTolerance * Math.max(1, timeline.playbackRate);

               if (drift > dynamicTolerance) {
                 video.currentTime = targetTime;
               }
           }
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