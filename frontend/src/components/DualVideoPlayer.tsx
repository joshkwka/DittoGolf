import VideoPlayer from "./VideoPlayer";
import { Timeline } from "../core/Timeline";
import { useEffect, useRef, useState } from "react";

const SPEED_OPTIONS = [0.25, 0.5, 1, 2, 4, 8];

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

  

  const videoRefs = useRef<HTMLVideoElement[]>([]);

  useEffect(() => {
    const unsub = timeline.subscribe(() => forceRender(v => v + 1));
    return unsub;
  }, [timeline]);

  const play = () => {
    timeline.play();
  };

  const pause = () => {
    timeline.pause();
  };

  const seek = (time: number) => {
    // Immediately update master video for responsive scrubbing, then notify the
    // timeline so followers update via subscription.
    const master = videoRefs.current[0];
    if (master) master.currentTime = time;
    timeline.seek(time);
  };

  const step = (frames: number) => {
    timeline.stepFrames(frames);
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 10 }}>
        {[video1Src, video2Src].map((src, i) => (
          <VideoPlayer
            key={src}
            src={src}
            timeline={timeline}
            ref={(el: any) => (videoRefs.current[i] = el)}
            notifyTimeline={i === 0}
          />
        ))}
      </div>

      {/* Scrubber */}
      <input
        type="range"
        min={0}
        max={timeline.duration}
        step={0.001}
        value={timeline.currentTime}
        onChange={e => seek(Number(e.target.value))}
        style={{ width: "100%", marginTop: 10 }}
      />

      {/* Controls */}
      <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
        <button onClick={() => step(-1)}>◀</button>
        <button onClick={() => step(1)}>▶</button>

        <label>
          Speed:
          <select
            value={timeline.playbackRate}
            onChange={e => timeline.setPlaybackRate(Number(e.target.value))}
            style={{ marginLeft: 5 }}
          >
            {SPEED_OPTIONS.map(s => (
              <option key={s} value={s}>
                {s}×
              </option>
            ))}
          </select>
        </label>

        <button onClick={play}>Play</button>
        <button onClick={pause}>Pause</button>
      </div>
    </div>
  );
}
