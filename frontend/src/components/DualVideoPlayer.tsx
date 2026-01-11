import VideoPlayer from "./VideoPlayer";
import { Timeline } from "../core/Timeline";
import { useEffect, useState } from "react";

const FPS_OPTIONS = [1, 5, 10, 15, 30, 60, 120, 240];

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

  useEffect(() => {
    timeline.subscribe(() => forceRender((v) => v + 1));
  }, [timeline]);

  const togglePlay = () => {
    if (timeline.currentTime >= timeline.duration) {
      timeline.seek(0);
    }
    timeline.play();
  };

  const pauseTimeline = () => timeline.pause();

  return (
    <div>
      <div style={{ display: "flex", gap: "10px" }}>
        <VideoPlayer src={video1Src} timeline={timeline} />
        <VideoPlayer src={video2Src} timeline={timeline} />
      </div>

      {/* Scrubber */}
      <input
        type="range"
        min={0}
        max={timeline.duration}
        step={1 / timeline.fps}
        value={timeline.currentTime}
        onChange={(e) => timeline.seek(Number(e.target.value))}
        style={{ width: "100%", marginTop: "10px" }}
      />

      {/* Controls */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginTop: "10px",
        }}
      >
        {/* Frame stepping */}
        <button onClick={() => timeline.stepFrames(-1)}>◀</button>
        <button onClick={() => timeline.stepFrames(1)}>▶</button>

        {/* FPS Selector */}
        <label>
          FPS:
          <select
            value={timeline.fps}
            onChange={(e) => timeline.setFPS(Number(e.target.value))}
            style={{ marginLeft: "5px" }}
          >
            {FPS_OPTIONS.map((fps) => (
              <option key={fps} value={fps}>
                {fps}
              </option>
            ))}
          </select>
        </label>

        <button onClick={togglePlay}>Play</button>
        <button onClick={pauseTimeline}>Pause</button>
      </div>
    </div>
  );
}
