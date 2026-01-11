import VideoPlayer from "./VideoPlayer";
import { Timeline } from "../core/Timeline";
import { useEffect, useState } from "react";

const PLAYBACK_OPTIONS = [0.25, 0.5, 1, 2, 4];

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
  const [playbackRate, setPlaybackRate] = useState(1);

  // Force re-render when timeline updates (for seek bar)
  useEffect(() => {
    timeline.subscribe(() => forceRender((v) => v + 1));
  }, [timeline]);

  const togglePlay = () => {
    if (timeline.currentTime >= timeline.duration) timeline.seek(0);
    timeline.play();
  };

  const pauseTimeline = () => timeline.pause();
  const stepBackward = () => timeline.stepFrames(-1);
  const stepForward = () => timeline.stepFrames(1);

  const handlePlaybackChange = (rate: number) => {
    setPlaybackRate(rate);
    timeline.setPlaybackRate(rate);
  };

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
        step={1 / timeline.videoFPS} // step per video frame
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
        <button onClick={stepBackward}>◀</button>
        <button onClick={stepForward}>▶</button>

        {/* Playback speed selector */}
        <label>
          Speed:
          <select
            value={playbackRate}
            onChange={(e) => handlePlaybackChange(Number(e.target.value))}
            style={{ marginLeft: "5px" }}
          >
            {PLAYBACK_OPTIONS.map((rate) => (
              <option key={rate} value={rate}>
                {rate}x
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
