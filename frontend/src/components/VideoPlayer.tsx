import { useEffect, useRef } from "react";
import { Timeline } from "../core/Timeline";

type VideoPlayerProps = {
  src: string;
  timeline: Timeline;
};

export default function VideoPlayer({ src, timeline }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Register duration with timeline
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onLoaded = () => {
      timeline.setDuration(Math.max(timeline.duration, video.duration));
    };

    video.addEventListener("loadedmetadata", onLoaded);
    return () => video.removeEventListener("loadedmetadata", onLoaded);
  }, [timeline]);

  // Subscribe to timeline
  useEffect(() => {
    const callback = (time: number, action?: "play" | "pause") => {
      const video = videoRef.current;
      if (!video) return;

      // Sync time only if needed (prevents jitter)
      if (Math.abs(video.currentTime - time) > 0.03) {
        video.currentTime = Math.min(time, video.duration);
      }

      if (action === "play") video.play();
      if (action === "pause") video.pause();
    };

    timeline.subscribe(callback);
  }, [timeline]);

  return (
    <video
      ref={videoRef}
      src={src}
      width={400}
      muted
      playsInline
      controls={false}
    />
  );
}
