import VideoPlayer from "./VideoPlayer";
import { Timeline } from "../core/Timeline";
import { useEffect, useState } from "react";

type DualVideoPlayerProps = {
  video1Src: string;
  video2Src: string;
};

export default function DualVideoPlayer({
  video1Src,
  video2Src,
}: DualVideoPlayerProps) {
  const [timeline] = useState(() => new Timeline());
  const [, forceRender] = useState(0);

  // Force React updates while timeline is playing
  useEffect(() => {
    const callback = () => forceRender((v) => v + 1);
    timeline.subscribe(callback);
  }, [timeline]);

  const togglePlay = () => {
    if (timeline.currentTime >= timeline.duration) {
      timeline.seek(0);
    }
    timeline.play();
  };

  const pauseTimeline = () => timeline.pause();

  const handleScrub = (value: number) => {
    timeline.seek(value);
  };

  return (
    <div>
      <div style={{ display: "flex", gap: "10px" }}>
        <VideoPlayer src={video1Src} timeline={timeline} />
        <VideoPlayer src={video2Src} timeline={timeline} />
      </div>

      {/* Universal scrubber */}
      <input
        type="range"
        min={0}
        max={timeline.duration}
        step={0.01}
        value={timeline.currentTime}
        onChange={(e) => handleScrub(Number(e.target.value))}
        style={{ width: "100%", marginTop: "10px" }}
      />

      <div style={{ marginTop: "10px" }}>
        <button onClick={togglePlay}>Play</button>
        <button onClick={pauseTimeline}>Pause</button>
      </div>
    </div>
  );
}
