// src/components/VideoPlayer.tsx
import React, { useRef, useEffect } from "react";

interface Props {
  fileUrl: string | null;
  isPlaying: boolean;
  currentTime: number;
  playbackRate: number;
  onLoadedMetadata?: (duration: number) => void;
}

export default function VideoPlayer({
  fileUrl,
  isPlaying,
  currentTime,
  playbackRate,
  onLoadedMetadata
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Sync play / pause
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    if (isPlaying) vid.play();
    else vid.pause();
  }, [isPlaying]);

  // Sync currentTime
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    if (Math.abs(vid.currentTime - currentTime) > 0.03) {
      vid.currentTime = currentTime;
    }
  }, [currentTime]);

  // Sync playback rate
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  return (
    <div style={{ width: "100%" }}>
      <video
        ref={videoRef}
        src={fileUrl ?? undefined}
        style={{ width: "100%", border: "1px solid #ddd" }}
        onLoadedMetadata={() => {
          if (onLoadedMetadata && videoRef.current) {
            onLoadedMetadata(videoRef.current.duration);
          }
        }}
      />
    </div>
  );
}
