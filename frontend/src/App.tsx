// src/pages/SyncedComparison.tsx
import React, { useState, useRef, useEffect } from "react";
import VideoPlayer from "./components/VideoPlayer";

export default function SyncedComparison() {
  const [leftUrl, setLeftUrl] = useState<string | null>(null);
  const [rightUrl, setRightUrl] = useState<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  const [leftDuration, setLeftDuration] = useState(0);
  const [rightDuration, setRightDuration] = useState(0);

  const [leftKeyframes, setLeftKeyframes] = useState<number[]>([]);
  const [rightKeyframes, setRightKeyframes] = useState<number[]>([]);

  const maxDuration = Math.max(leftDuration, rightDuration);

  // Master playback clock
  useEffect(() => {
    if (!isPlaying) return;

    const id = setInterval(() => {
      setCurrentTime((t) => {
        const next = t + 0.016; 
        if (next >= maxDuration) {
          setIsPlaying(false);
          return maxDuration;
        }
        return next;
      });
    }, 16);

    return () => clearInterval(id);
  }, [isPlaying, maxDuration]);

  // Handle timeline scrubbing
  const onScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    setCurrentTime(time);
  };

  // Add keyframe at current time
  const addKeyframe = (side: "left" | "right") => {
    if (side === "left") {
      setLeftKeyframes((k) => [...k, currentTime]);
    } else {
      setRightKeyframes((k) => [...k, currentTime]);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Synced Swing Comparison Tool</h2>

      <div style={{ display: "flex", gap: 20 }}>
        <div style={{ flex: 1 }}>
          <input
            type="file"
            accept="video/*"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                setLeftUrl(URL.createObjectURL(e.target.files[0]));
              }
            }}
          />
          <VideoPlayer
            fileUrl={leftUrl}
            isPlaying={isPlaying}
            currentTime={currentTime}
            playbackRate={1}
            onLoadedMetadata={setLeftDuration}
          />

          {/* Left keyframes */}
          <button onClick={() => addKeyframe("left")}>Add Left Keyframe</button>
          <div style={{ marginTop: 5 }}>
            {leftKeyframes.map((t, i) => (
              <span key={i} style={{ marginRight: 10 }}>
                ⬤ {t.toFixed(2)}
              </span>
            ))}
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <input
            type="file"
            accept="video/*"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                setRightUrl(URL.createObjectURL(e.target.files[0]));
              }
            }}
          />
          <VideoPlayer
            fileUrl={rightUrl}
            isPlaying={isPlaying}
            currentTime={currentTime}
            playbackRate={1}
            onLoadedMetadata={setRightDuration}
          />

          {/* Right keyframes */}
          <button onClick={() => addKeyframe("right")}>Add Right Keyframe</button>
          <div style={{ marginTop: 5 }}>
            {rightKeyframes.map((t, i) => (
              <span key={i} style={{ marginRight: 10 }}>
                ⬤ {t.toFixed(2)}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* MASTER TIMELINE */}
      <div style={{ marginTop: 20 }}>
        <input
          type="range"
          min={0}
          max={maxDuration || 1}
          step={0.01}
          value={currentTime}
          onChange={onScrub}
          style={{ width: "100%" }}
        />

        {/* Keyframe markers */}
        <div style={{ position: "relative", height: 10, marginTop: 4 }}>
          {leftKeyframes.map((t, i) => (
            <div
              key={"L" + i}
              style={{
                position: "absolute",
                left: `${(t / maxDuration) * 100}%`,
                width: 6,
                height: 10,
                background: "red",
              }}
            />
          ))}

          {rightKeyframes.map((t, i) => (
            <div
              key={"R" + i}
              style={{
                position: "absolute",
                left: `${(t / maxDuration) * 100}%`,
                width: 6,
                height: 10,
                background: "blue",
              }}
            />
          ))}
        </div>
      </div>

      <button
        style={{ marginTop: 15, padding: "10px 20px" }}
        onClick={() => setIsPlaying((p) => !p)}
      >
        {isPlaying ? "Pause" : "Play"}
      </button>
    </div>
  );
}
