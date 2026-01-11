import { useEffect, useRef, forwardRef } from "react";
import { Timeline } from "../core/Timeline";

type VideoPlayerProps = {
  src: string;
  timeline: Timeline;
  notifyTimeline?: boolean;
};

const VideoPlayer = forwardRef<HTMLVideoElement, VideoPlayerProps>(
  ({ src, timeline, notifyTimeline = true }, forwardedRef) => {
      const localRef = useRef<HTMLVideoElement>(null);
      const videoRef = localRef;

      // Wire the forwarded ref to our local ref so parent can access the DOM element
      useEffect(() => {
        if (!forwardedRef) return;
        if (typeof forwardedRef === "function") {
          forwardedRef(localRef.current);
          return () => forwardedRef(null);
        }
        try {
          (forwardedRef as React.MutableRefObject<HTMLVideoElement | null>).current =
            localRef.current;
          return () => {
            (forwardedRef as React.MutableRefObject<HTMLVideoElement | null>).current =
              null;
          };
        } catch {
          return;
        }
      }, [forwardedRef, localRef.current]);

    // Register duration and try to capture native FPS if available
    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      const onLoaded = () => {
        timeline.setDuration(video.duration);
        // No reliable way to get FPS from HTMLMediaElement; keep timeline default
      };
      video.addEventListener("loadedmetadata", onLoaded);

      return () => video.removeEventListener("loadedmetadata", onLoaded);
    }, [timeline, videoRef]);

    // Notify timeline on native timeupdate events. Only the master video should
    // drive the timeline (notifyTimeline=true).
    useEffect(() => {
      if (!notifyTimeline) return;
      const video = videoRef.current;
      if (!video) return;

      const lastReported = { current: 0 };
      const MIN_DELTA = 0.03; // seconds

      const onTimeUpdate = () => {
        const t = video.currentTime;
        if (Math.abs(t - lastReported.current) < MIN_DELTA) return;
        lastReported.current = t;
        timeline.notify(t);
      };

      video.addEventListener("timeupdate", onTimeUpdate);
      return () => video.removeEventListener("timeupdate", onTimeUpdate);
    }, [timeline, notifyTimeline]);

    // Subscribe to timeline so timeline-driven changes update the video element
    useEffect(() => {
      const cb = (time: number, action?: any) => {
        const video = videoRef.current;
        if (!video) return;

        const MIN_SEEK_DELTA = 0.05; // seconds (for master or aggressive seeks)
        const DRIFT_THRESHOLD = 0.08; // seconds (~2-3 frames) for follower drift correction

        const targetTime = time;

        // Use a laxer threshold for follower videos to correct only substantial drift.
        const threshold = notifyTimeline ? MIN_SEEK_DELTA : DRIFT_THRESHOLD;

        if (Math.abs(video.currentTime - targetTime) > threshold) {
          video.currentTime = Math.min(targetTime, video.duration || Infinity);
        }

        // Handle play/pause/rate actions
        if (action === "play") {
          const p = video.play();
          if (p && typeof p.catch === "function") {
            p.catch(() => {});
          }
        }

        if (action === "pause") video.pause();
        if (action === "rate") video.playbackRate = timeline.playbackRate;
      };

      const unsub = timeline.subscribe(cb);
      return unsub;
    }, [timeline, notifyTimeline]);

    // Apply playback rate
    useEffect(() => {
      const video = videoRef.current;
      if (video) {
        video.playbackRate = timeline.playbackRate;
      }
    }, [timeline.playbackRate, videoRef]);

    return (
      <video
        ref={videoRef}
        src={src}
        width={400}
        muted
        playsInline
        controls={false}
        style={{ background: "#000", borderRadius: 8 }}
      />
    );
  }
);

export default VideoPlayer;
