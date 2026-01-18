import { useEffect, useRef, forwardRef } from "react";
import { Timeline } from "../core/Timeline";

type VideoPlayerProps = {
  src: string;
  timeline: Timeline;
  notifyTimeline?: boolean;
};

const VideoPlayer = forwardRef<HTMLVideoElement, VideoPlayerProps>(
  ({ src, timeline, notifyTimeline = true }, forwardedRef) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    // Expose video ref
    useEffect(() => {
      if (!forwardedRef) return;
      if (typeof forwardedRef === "function") {
        forwardedRef(videoRef.current);
      } else {
        forwardedRef.current = videoRef.current;
      }
    }, [forwardedRef]);

    // On load, set timeline duration (max of video.duration and timeline.duration)
    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      const onLoaded = () => timeline.setDuration(video.duration);
      video.addEventListener("loadedmetadata", onLoaded);
      return () => video.removeEventListener("loadedmetadata", onLoaded);
    }, [timeline]);

    // This is currently an issue, because if FOLLOWER.duration > MASTER.duration, 
      // it will hit a dead-end once MASTER playback completes
    // MASTER drives timeline time
    useEffect(() => {
      if (!notifyTimeline) return;
      const video = videoRef.current;
      if (!video) return;

      const onTimeUpdate = () => {
        timeline.notify(video.currentTime);
      };

      video.addEventListener("timeupdate", onTimeUpdate);
      return () => video.removeEventListener("timeupdate", onTimeUpdate);
    }, [timeline, notifyTimeline]);

    // FOLLOW timeline
    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      // Immediately sync video with timeline
      video.currentTime = timeline.currentTime;
      video.playbackRate = timeline.playbackRate;

      const unsub = timeline.subscribe((time, action) => {
        const video = videoRef.current;
        if (!video) return;

        if (Math.abs(video.currentTime - time) > 0.01) {
          video.currentTime = time;
        }

        // If play is clicked, notify Timeline to play
        if (action === "play") video.play().catch(() => {});
        if (action === "pause") video.pause();
        if (action === "rate") video.playbackRate = timeline.playbackRate;
      });

      return unsub;
    }, [timeline]);

    // Apply rate immediately
    useEffect(() => {
      const video = videoRef.current;
      if (video) video.playbackRate = timeline.playbackRate;
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
