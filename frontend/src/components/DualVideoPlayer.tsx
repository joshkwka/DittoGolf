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
  
  // Force a re-render whenever the timeline "ticks" so the slider moves
  const [, forceRender] = useState(0);
  const videoRefs = useRef<HTMLVideoElement[]>([]);

  useEffect(() => {
    // Subscribe to the heartbeat of the timeline
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
          />
        ))}
      </div>

      {/* SLIDER LOGIC:
          - max is the total number of integer steps.
          - step is 1, ensuring we hit every single frame.
      */}
      <input
        type="range"
        min={0}
        max={timeline.totalSteps}
        step={1}
        value={timeline.currentStep}
        onChange={e => timeline.seek(Number(e.target.value))}
        // Disable if we haven't calculated a duration yet
        disabled={timeline.totalSteps === 0}
        style={{ width: "100%", marginTop: 10 }}
      />

      <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
        {/* Step backward/forward by 1 master frame */}
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

      {/* Debug Info: Useful to see the frame math in action */}
      <div style={{ marginTop: 10, fontSize: 12, color: '#666' }}>
        Step: {Math.floor(timeline.currentStep)} / {timeline.totalSteps} | 
        Time: {(timeline.currentStep / timeline.masterFPS).toFixed(2)}s
      </div>
    </div>
  );
}