import { useEffect, useRef } from "react";
import { Timeline } from "../core/Timeline";

type VideoPlayerProps = {
  src: string;
  timeline: Timeline;
};

export default function VideoPlayer({ src, timeline }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Register duration
    const handleLoaded = () => {
      timeline.setDuration(Math.max(timeline.duration, video.duration));
    };

    video.addEventListener("loadedmetadata", handleLoaded);
    return () => video.removeEventListener("loadedmetadata", handleLoaded);
  }, [timeline]);

  useEffect(() => {
    const callback = (time: number) => {
      const video = videoRef.current;
      if (!video) return;

      // Set video to exact frame
      video.currentTime = Math.min(time, video.duration);
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
      style={{ background: "#000", borderRadius: 8 }}
    />
  );
}
