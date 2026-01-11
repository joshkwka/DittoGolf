import VideoPlayer from "./VideoPlayer";
import { Timeline } from "../core/Timeline";
import { useEffect, useRef, useState } from "react";

const SPEED_OPTIONS = [0.25, 0.5, 1, 2, 4, 8];

type DualVideoPlayerProps = {
  video1Src: string;
  video2Src: string;
};

export default function DualVideoPlayer({ video1Src, video2Src }: DualVideoPlayerProps) {
  const [timeline] = useState(() => new Timeline());
  const [, forceRender] = useState(0);
  const videoRefs = useRef<HTMLVideoElement[]>([]);

  useEffect(() => {
    return timeline.subscribe(() => forceRender(v => v + 1));
  }, [timeline]);

  return (
    <div>
      <div style={{ display: "flex", gap: 10 }}>
        {[video1Src, video2Src].map((src, i) => (
          <VideoPlayer
            key={src}
            src={src}
            timeline={timeline}
            ref={el => {
              if (el) videoRefs.current[i] = el;
            }}
            notifyTimeline={i === 0}
          />
        ))}
      </div>

      <input
        type="range"
        min={0}
        max={timeline.duration}
        step={1 / timeline.nativeFPS}
        value={timeline.currentTime}
        onChange={e => timeline.seek(Number(e.target.value))}
        disabled={!videoRefs.current[0]?.duration}
        style={{ width: "100%", marginTop: 10 }}
      />

      <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
        <button onClick={() => timeline.stepFrames(-1)}>◀</button>
        <button onClick={() => timeline.stepFrames(1)}>▶</button>


        <label>
          <select
            value={timeline.playbackRate}
            onChange={e => timeline.setPlaybackRate(Number(e.target.value))}
          >
            {SPEED_OPTIONS.map(s => (
              <option key={s} value={s}>{s}×</option>
            ))}
          </select>
        </label>


        <button onClick={() => timeline.play()}>Play</button>
        <button onClick={() => timeline.pause()}>Pause</button>
      </div>
    </div>
  );
}
