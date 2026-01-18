import { useEffect, useRef, forwardRef } from "react";
import { Timeline } from "../core/Timeline";

type VideoPlayerProps = {
  src: string;
  timeline: Timeline;
};

const VideoPlayer = forwardRef<HTMLVideoElement, VideoPlayerProps>(
  ({ src, timeline }, forwardedRef) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    // Sync the ref with the forwardedRef from parent
    useEffect(() => {
      if (!forwardedRef) return;
      if (typeof forwardedRef === "function") {
        forwardedRef(videoRef.current);
      } else {
        forwardedRef.current = videoRef.current;
      }
    }, [forwardedRef]);

    // Metadata: Tell timeline how long this video is
    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      const onLoaded = () => timeline.setDuration(video.duration);
      video.addEventListener("loadedmetadata", onLoaded);
      return () => video.removeEventListener("loadedmetadata", onLoaded);
    }, [timeline]);

    // THE ENGINE: Follow the virtual clock
    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      const unsub = timeline.subscribe((step, action) => {
        const video = videoRef.current;
        if (!video) return;

        const targetTime = step / timeline.masterFPS;

        // 1. Handle Native Playback State & Rate
        // Set the hardware rate immediately so the browser's engine 
        // can handle the frame interpolation smoothly.
        if (action === "play") {
          video.playbackRate = timeline.playbackRate;
          video.play().catch(() => {});
        }
        if (action === "pause") {
          video.pause();
        }
        if (action === "rate") {
          video.playbackRate = timeline.playbackRate;
        }

        // 2. Handle Synchronization Logic
        const drift = Math.abs(video.currentTime - targetTime);
        const baseFrameDuration = 1 / timeline.masterFPS;

        /**
         * DYNAMIC THRESHOLD LOGIC:
         * At 1x speed, we snap if we are > 2 frames off.
         * At 4x speed, we allow up to 8 frames of drift (2 * 4) before snapping.
         * This prevents "stutter" caused by constant seek commands at high speeds.
         */
        const dynamicThreshold = baseFrameDuration * 2 * Math.max(1, timeline.playbackRate);

        const isSeeking = action === "seek";
        const isWayOff = drift > dynamicThreshold;

        // Snap to target time if user manually scrubbed OR if natural drift 
        // exceeded our dynamic threshold.
        if (isSeeking || (action === undefined && isWayOff)) {
          video.currentTime = targetTime;
        }
      });

      return unsub;
    }, [timeline]);

    // Initial and Rate Setup
    useEffect(() => {
      const video = videoRef.current;
      if (video) {
        video.playbackRate = timeline.playbackRate;
        video.currentTime = timeline.currentStep / timeline.masterFPS;
      }
    }, [timeline.playbackRate]);

    return (
      <video
        ref={videoRef}
        src={src}
        width={400}
        muted
        playsInline
        style={{ background: "#000", borderRadius: 8 }}
      />
    );
  }
);

export default VideoPlayer;