import { useEffect, useRef, forwardRef } from "react";
import { Timeline, SyncMode } from "../core/Timeline";

type VideoPlayerProps = {
  src: string;
  timeline: Timeline;
  videoIndex: 0 | 1;
};

const VideoPlayer = forwardRef<HTMLVideoElement, VideoPlayerProps>(
  ({ src, timeline, videoIndex }, forwardedRef) => {
    const internalRef = useRef<HTMLVideoElement>(null);

    // Sync forwarded ref
    useEffect(() => {
      if (!forwardedRef) return;
      if (typeof forwardedRef === "function") forwardedRef(internalRef.current);
      else forwardedRef.current = internalRef.current;
    }, [forwardedRef]);

    // Metadata & Setup Listener
    useEffect(() => {
      const video = internalRef.current;
      if (!video) return;

      // 1. Set Duration
      const onLoaded = () => timeline.setDuration(video.duration, videoIndex);
      if (video.readyState >= 1) onLoaded();
      else video.addEventListener("loadedmetadata", onLoaded);

      // 2. DISABLE AUDIO PITCH PRESERVATION (Smooths playback rate changes)
      // We do this here instead of JSX to avoid TypeScript errors and handle prefixes.
      const v = video as any; 
      if ('preservesPitch' in v) v.preservesPitch = false;
      else if ('mozPreservesPitch' in v) v.mozPreservesPitch = false;
      else if ('webkitPreservesPitch' in v) v.webkitPreservesPitch = false;

      return () => video.removeEventListener("loadedmetadata", onLoaded);
    }, [timeline, videoIndex, src]);

    // // --- SYNC ENGINE ---
    // useEffect(() => {
    //   const video = internalRef.current;
    //   if (!video) return;

    //   // Ref to track if a seek is already pending for the next frame
    //   let seekRafId: number | null = null;

    //   const unsub = timeline.subscribe((step, action, meta) => {
    //     if (!video) return;

    //     // --- A. PREVIEW / SCRUBBING (The Laggy Part) ---
    //     // We use requestAnimationFrame to debounce high-frequency seek requests
    //     if (action === "seek" || action === "update" || action === "preview") {
    //         // If a seek is already queued for this frame, cancel it and use the newer one
    //         if (seekRafId) cancelAnimationFrame(seekRafId);

    //         seekRafId = requestAnimationFrame(() => {
    //             let target = 0;
                
    //             // Case 1: Dragging a marker (Preview)
    //             if (action === "preview" && meta?.videoIndex === videoIndex) {
    //                 target = meta.step / timeline.masterFPS;
    //                 video.pause();
    //             } 
    //             // Case 2: Scrubbing the main timeline
    //             else {
    //                 target = timeline.calculateVideoTime(videoIndex, step);
    //             }

    //             // Only touch the DOM if time has actually changed significantly
    //             // (Prevents micro-stutters when mouse moves 1 pixel)
    //             if (Math.abs(video.currentTime - target) > 0.001) {
    //                 video.currentTime = target;
    //             }
    //             seekRafId = null;
    //         });
    //         return; // Exit early, handled by RAF
    //     }

    //     // --- B. PLAYBACK (Standard Logic) ---
    //     // (This runs immediately because playback needs tight sync)
        
    //     const targetTime = timeline.calculateVideoTime(videoIndex, step);
    //     const timeDiff = targetTime - video.currentTime;
    //     const drift = Math.abs(timeDiff);

    //     if (action === "play") video.play().catch(() => {});
    //     else if (action === "pause") video.pause();

    //     if (action !== "pause" && (!video.paused || action === "play")) {
    //        const warpRate = timeline.getInstantaneousRate(videoIndex);
    //        let finalRate = timeline.playbackRate * warpRate;
           
    //        // High Speed Guard
    //        const isHighSpeed = timeline.playbackRate > 2;
    //        if (drift < 0.25 && !isHighSpeed) {
    //            finalRate += (timeDiff * 1.5);
    //        }

    //        const safeRate = Math.max(0.0625, Math.min(finalRate, 16));
    //        if (Math.abs(video.playbackRate - safeRate) > 0.01) {
    //          video.playbackRate = safeRate;
    //        }
    //     }

    //     // Playback Drift Correction
    //     const isWarp = timeline.syncMode === SyncMode.SYNC;
    //     const baseTolerance = isWarp ? 0.2 : 0.1;
    //     const dynamicTolerance = baseTolerance * Math.max(1, timeline.playbackRate);

    //     if (drift > dynamicTolerance) {
    //          video.currentTime = targetTime;
    //     }
    //   });

    //   return () => {
    //       unsub();
    //       if (seekRafId) cancelAnimationFrame(seekRafId);
    //   };
    // }, [timeline, videoIndex]);

    // --- SYNC ENGINE ---
    useEffect(() => {
      const video = internalRef.current;
      if (!video) return;

      const unsub = timeline.subscribe((step, action, meta) => {
        if (!video) return;

        // Live Scrubbing Logic
        if (action === "preview") {
            if (meta && meta.videoIndex === videoIndex) {
                video.currentTime = meta.step / timeline.masterFPS;
                video.pause(); 
            }
            return; 
        }

        const targetTime = timeline.calculateVideoTime(videoIndex, step);
        const timeDiff = targetTime - video.currentTime;
        const drift = Math.abs(timeDiff);

        // 1. Playback State
        if (action === "play") video.play().catch(() => {});
        else if (action === "pause") video.pause();

        // 2. Rate Management
        // STRICT CHECK: Only update rate if video is actually running
        const isVideoRunning = !video.paused && !video.ended && video.readyState > 2;
        
        if (action !== "pause" && (action === "play" || isVideoRunning)) {
           const warpRate = timeline.getInstantaneousRate(videoIndex);
           let finalRate = timeline.playbackRate * warpRate;
           
           const isHighSpeed = timeline.playbackRate > 2;
           
           // --- ANTI-JITTER FIX ---
           // 1. Dead Zone: Ignore drift < 0.04s (approx 1 frame). Let it float.
           // 2. Gentle Nudge: Reduced correction factor from 1.5 to 0.5
           const isDrifting = drift > 0.04 && drift < 0.25;
           
           if (isDrifting && !isHighSpeed) {
               finalRate += (timeDiff * 0.5); // Much gentler correction
           }

           const safeRate = Math.max(0.0625, Math.min(finalRate, 16));
           
           if (Math.abs(video.playbackRate - safeRate) > 0.01) {
             video.playbackRate = safeRate;
           }
        }

        // 3. Position Correction (Snap)
        const isScrubbing = action === "seek" || action === "update";
        
        if (isScrubbing) {
           if (drift > 0.001) video.currentTime = targetTime;
        } else {
           const isWarp = timeline.syncMode === SyncMode.SYNC;
           // Widen tolerance slightly to allow the "Dead Zone" to work
           const baseTolerance = isWarp ? 0.25 : 0.1;
           const dynamicTolerance = baseTolerance * Math.max(1, timeline.playbackRate);

           if (drift > dynamicTolerance) {
             video.currentTime = targetTime;
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
        muted
        style={{ 
          width: '100%', 
          height: '100%', 
          objectFit: 'contain', 
          background: '#000',
          // NEW: Force GPU acceleration and hint to browser
          transform: 'translateZ(0)', 
          willChange: 'transform' 
        }}
      />
    );
  }
);

export default VideoPlayer;