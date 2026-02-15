import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import VideoPlayer from "./VideoPlayer"; 
import { Timeline, SyncMode } from "../core/Timeline"; 

const SPEED_OPTIONS = [0.1, 0.25, 0.5, 1.0, 2.0, 4.0, 8.0];
const SWING_STAGES = ["Address", "Top", "Downswing", "Impact", "Finish"];

// OPTIMIZATION 1: Wrap VideoPlayer to prevent re-renders on every timeline tick
const MemoizedVideoPlayer = React.memo(VideoPlayer);

// --- Segment Analysis (Memoized) ---
const SegmentAnalysis = React.memo(({ timeline }: { timeline: Timeline, dataVersion: number }) => {
  const kfsA = timeline.keyframesA;
  const kfsB = timeline.keyframesB;
  
  const sortedLabels = [...kfsA] 
    .sort((a, b) => a.step - b.step)
    .map(k => k.label)
    .filter(label => kfsB.some(k => k.label === label)); 

  if (sortedLabels.length < 2) return null;

  return (
    <div style={{ display: 'flex', gap: '2px', marginTop: '10px', height: '34px', width: '100%', borderRadius: '6px', overflow: 'hidden' }}>
      {sortedLabels.slice(0, -1).map((label, i) => {
        const nextLabel = sortedLabels[i + 1];
        
        const startA = kfsA.find(k => k.label === label)!.step;
        const endA = kfsA.find(k => k.label === nextLabel)!.step;
        const startB = kfsB.find(k => k.label === label)!.step;
        const endB = kfsB.find(k => k.label === nextLabel)!.step;

        const deltaA = endA - startA;
        const deltaB = endB - startB;

        if (deltaA === 0) return null;

        const ratio = deltaB / deltaA;
        const percentage = Math.round(ratio * 100);
        
        let bg = '#10b981'; 
        if (percentage < 90) bg = '#3b82f6'; 
        if (percentage > 110) bg = '#f59e0b'; 

        return (
          <div key={label} style={{ flex: 1, background: bg, color: 'white', fontSize: '11px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid rgba(255,255,255,0.2)', position: 'relative' }} title={`Segment: ${label} → ${nextLabel}`}>
            <span style={{ fontWeight: 'bold' }}>{percentage}%</span>
            <span style={{ fontSize: '9px', opacity: 0.9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}, (prev, next) => prev.dataVersion === next.dataVersion);


// --- Video Header (Memoized) ---
const VideoHeader = React.memo(({ label, onClear, onReplace }: { label: string, onClear: () => void, onReplace: () => void }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', color: 'white' }}>
    <span style={{ fontSize: '14px', fontWeight: 600, color: '#e5e7eb' }}>{label}</span>
    <div style={{ display: 'flex', gap: '8px' }}>
      <button onClick={onClear} style={{ fontSize: '11px', padding: '4px 8px', background: '#374151', border: '1px solid #4b5563', color: '#e5e7eb', borderRadius: '4px', cursor: 'pointer' }}>Change Video</button>
      <button onClick={onReplace} title="Replace without clearing" style={{ fontSize: '12px', padding: '4px 8px', background: '#ef4444', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>+</button>
    </div>
  </div>
));

// --- Calibration Slider (Updated with Touch Support) ---
const CalibrationSlider = ({ videoIndex, timeline, duration }: { videoIndex: 0 | 1, timeline: Timeline, duration: number }) => {
  const kfs = videoIndex === 0 ? timeline.keyframesA : timeline.keyframesB;
  const totalSteps = duration > 0 ? Math.ceil(duration * 60) : 100;
  const currentVideoTime = timeline.calculateVideoTime(videoIndex, timeline.currentStep);
  const currentVideoStep = currentVideoTime * timeline.masterFPS;

  // 1. Mouse Event Handler
  const handleMouseDown = (e: React.MouseEvent, kfId: string, startStep: number) => {
    if (e.button !== 0) return;
    e.stopPropagation(); e.preventDefault();
    initiateDrag(e.currentTarget as HTMLElement, e.clientX, kfId, startStep, false);
  };

  // 2. Touch Event Handler
  const handleTouchStart = (e: React.TouchEvent, kfId: string, startStep: number) => {
    e.stopPropagation(); 
    // We don't preventDefault here or buttons break, we do it on 'move'
    initiateDrag(e.currentTarget as HTMLElement, e.touches[0].clientX, kfId, startStep, true);
  };

  // 3. Unified Drag Logic
  const initiateDrag = (target: HTMLElement, startX: number, kfId: string, startStep: number, isTouch: boolean) => {
    const parent = target.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();

    const onMove = (clientX: number) => {
      const deltaX = clientX - startX;
      const deltaStep = (deltaX / rect.width) * totalSteps;
      timeline.updateKeyframe(videoIndex, kfId, startStep + deltaStep);
    };

    if (isTouch) {
        // Touch Handlers
        const onTouchMove = (e: TouchEvent) => {
            e.preventDefault(); // Stop page scrolling while dragging slider
            onMove(e.touches[0].clientX);
        };
        const onTouchEnd = () => {
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', onTouchEnd);
            timeline.resetAfterDrag();
        };
        // { passive: false } is required to allow preventDefault()
        window.addEventListener('touchmove', onTouchMove, { passive: false });
        window.addEventListener('touchend', onTouchEnd);
    } else {
        // Mouse Handlers
        const onMouseMove = (e: MouseEvent) => {
            e.preventDefault();
            onMove(e.clientX);
        };
        const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            timeline.resetAfterDrag();
        };
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    }
  };

  return (
    <div style={{ position: 'relative', height: '40px', background: '#e5e7eb', borderRadius: '6px', margin: '15px 0', border: '1px solid #d1d5db', overflow: 'hidden', userSelect: 'none', touchAction: 'none' }}>
      <div style={{ position: 'absolute', inset: 0, opacity: 0.1, backgroundImage: 'linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '20px 100%' }} />
      <div style={{ position: 'absolute', left: `${(currentVideoStep / totalSteps) * 100}%`, top: 0, bottom: 0, width: '2px', backgroundColor: '#ef4444', zIndex: 5, pointerEvents: 'none', boxShadow: '0 0 4px rgba(239, 68, 68, 0.6)' }} />
      {kfs.map(kf => {
        const isAnchor = kf.label === 'Start' || kf.label === 'End';
        const isEnabled = timeline.keyframesEnabled || isAnchor;
        const leftPct = Math.max(0, Math.min(100, (kf.step / totalSteps) * 100));
        return (
          <div key={kf.id} 
            onMouseDown={(e) => isEnabled && handleMouseDown(e, kf.id, kf.step)} 
            onTouchStart={(e) => isEnabled && handleTouchStart(e, kf.id, kf.step)}
            onContextMenu={(e) => { e.preventDefault(); if (isEnabled && !isAnchor) { timeline.deleteGlobalEvent(kf.label); }}} 
            style={{ 
                position: 'absolute', left: `${leftPct}%`, top: '50%', transform: 'translate(-50%, -50%)', 
                width: '30px', height: '30px', // Made touch target slightly larger
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                cursor: isEnabled ? 'grab' : 'not-allowed', zIndex: 10 
            }} 
            title={isAnchor ? kf.label : `${kf.label} (Right-click to delete)`}
          >
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: isEnabled ? kf.color : '#9ca3af', border: '2px solid white', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', opacity: isEnabled ? 1 : 0.6 }} />
            <div style={{ position: 'absolute', bottom: '100%', marginBottom: '4px', fontSize: '10px', background: 'rgba(0,0,0,0.8)', color: 'white', padding: '2px 4px', borderRadius: '4px', whiteSpace: 'nowrap', pointerEvents: 'none' }}>{kf.label}</div>
          </div>
        );
      })}
    </div>
  );
};


export default function DualVideoPlayer({ 
  video1Src, video2Src, 
  onClearVideo, onReplaceVideo 
}: { 
  video1Src: string, video2Src: string,
  onClearVideo: (idx: 1|2) => void,
  onReplaceVideo: (idx: 1|2) => void
}) {
  const timeline = useMemo(() => new Timeline(), []);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  
  const [, setUiTick] = useState(0);       
  const [dataVersion, setDataVersion] = useState(0); 

  const videoRefs = useRef<(HTMLVideoElement | null)[]>([null, null]);
  const frameSkipRef = useRef(0);
  
  useEffect(() => {
    const unsubscribe = timeline.subscribe((_, action) => {
        if (action === "update" || action === "play" || action === "pause" || action === "rate") {
            setDataVersion(v => v + 1); 
            setUiTick(t => t + 1);      
            return;
        }
        frameSkipRef.current++;
        if (frameSkipRef.current % 2 === 0) {
            setUiTick(t => t + 1);
        }
    });
    return unsubscribe;
  }, [timeline]);

  const handleAddEvent = (label: string) => {
      if(!label) return;
      timeline.addGlobalEvent(label);
  }

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      switch(e.code) {
        case "Space": e.preventDefault(); timeline.isPlaying ? timeline.pause() : timeline.play(); break;
        case "ArrowRight": e.preventDefault(); timeline.stepFrames(1); break;
        case "ArrowLeft": e.preventDefault(); timeline.stepFrames(-1); break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [timeline]);

  const handleClear1 = useCallback(() => onClearVideo(1), [onClearVideo]);
  const handleReplace1 = useCallback(() => onReplaceVideo(1), [onReplaceVideo]);
  const handleClear2 = useCallback(() => onClearVideo(2), [onClearVideo]);
  const handleReplace2 = useCallback(() => onReplaceVideo(2), [onReplaceVideo]);

  return (
    <div style={{ padding: "20px", fontFamily: "system-ui, sans-serif", maxWidth: "95vw", margin: "0 auto", color: "#1f2937" }}>
      
      {/* Top Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
            <h1 style={{ fontSize: '24px', fontWeight: '800', margin: 0 }}>Ditto<span style={{color:'#ef4444'}}>.Golf</span></h1>
            <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>{timeline.syncMode === SyncMode.SYNC ? "Synced Mode Active" : "Linear Playback"}</p>
        </div>
        <button onClick={() => setSettingsOpen(!isSettingsOpen)} style={btnStyle}>{isSettingsOpen ? "Hide Tools" : "🛠 Open Tools"}</button>
      </div>

      {/* Main Video Grid */}
      <div style={{ 
          background: '#000', padding: '20px', borderRadius: '16px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            
            {/* Left Column */}
            <div>
                <VideoHeader label="Reference Video (Left)" onClear={handleClear1} onReplace={handleReplace1} />
                <div style={{ height: '60vh', minHeight: '400px', width: '100%', background: '#111', borderRadius: '8px', overflow: 'hidden' }}>
                    <MemoizedVideoPlayer src={video1Src} timeline={timeline} videoIndex={0} ref={(el) => { videoRefs.current[0] = el; }} />
                </div>
            </div>

            {/* Right Column */}
            <div>
                <VideoHeader label="Student Video (Right)" onClear={handleClear2} onReplace={handleReplace2} />
                <div style={{ height: '60vh', minHeight: '400px', width: '100%', background: '#111', borderRadius: '8px', overflow: 'hidden' }}>
                    <MemoizedVideoPlayer src={video2Src} timeline={timeline} videoIndex={1} ref={(el) => { videoRefs.current[1] = el; }} />
                </div>
            </div>

        </div>
      </div>

      {/* Scrubber */}
      <div style={{ marginTop: 20, padding: '0 10px' }}>
        <input type="range" min={0} max={timeline.totalSteps} step={1} value={timeline.currentStep} onChange={e => timeline.seek(Number(e.target.value))} style={{ width: "100%", cursor: "pointer", accentColor: "#ef4444" }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#6b7280', marginTop: '4px' }}><span>Start</span><span>{timeline.syncMode === SyncMode.SYNC ? 'Normalized Time' : 'Real Time'}</span><span>End</span></div>
      </div>

      {/* Playback Controls */}
      <div style={{ display: "flex", gap: 12, marginTop: 20, alignItems: "center", justifyContent: "center", background: "#f3f4f6", padding: "12px", borderRadius: "12px" }}>
        <button onClick={() => timeline.stepFrames(-1)} style={btnStyle}>Prev</button>
        <button onClick={() => timeline.isPlaying ? timeline.pause() : timeline.play()} style={{ ...btnStyle, background: '#1f2937', color: 'white', minWidth: '80px' }}>{timeline.isPlaying ? "Pause" : "Play"}</button>
        <button onClick={() => timeline.stepFrames(1)} style={btnStyle}>Next</button>
        <div style={{ width: '1px', height: '20px', background: '#d1d5db', margin: '0 10px' }} />
        <select value={timeline.playbackRate} onChange={e => timeline.setPlaybackRate(Number(e.target.value))} style={selectStyle}>{SPEED_OPTIONS.map(s => <option key={s} value={s}>{s}x Speed</option>)}</select>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer', userSelect: 'none' }}><input type="checkbox" checked={timeline.isLooping} onChange={e => timeline.setLoop(e.target.checked)} /> Loop</label>
      </div>

      {/* Settings (Sync Editor) */}
      {isSettingsOpen && (
        <div style={{ marginTop: 20, padding: 25, background: "white", borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '18px' }}>Sync Editor</h3>
            <div style={{ display: 'flex', gap: '10px' }}>
               <select style={selectStyle} disabled={!timeline.keyframesEnabled} onChange={(e) => { handleAddEvent(e.target.value); e.target.value = ""; }}>
                   <option value="">+ Add Event Marker</option>
                   {SWING_STAGES.map(stage => { const exists = timeline.keyframesA.some(k => k.label === stage); return <option key={stage} value={stage} disabled={exists}>{stage} {exists ? '(Added)' : ''}</option> })}
               </select>
              <button onClick={() => timeline.setKeyframesEnabled(!timeline.keyframesEnabled)} style={{...btnStyle, background: timeline.keyframesEnabled ? 'white' : '#f3f4f6', color: timeline.keyframesEnabled ? '#374151' : '#9ca3af' }}>{timeline.keyframesEnabled ? "Keyframes: ON" : "Keyframes: OFF"}</button>
              <button onClick={() => timeline.toggleSync()} style={{ ...btnStyle, background: timeline.syncMode === SyncMode.SYNC ? '#10b981' : '#ef4444', color: 'white', border: 'none' }}>{timeline.syncMode === SyncMode.SYNC ? "SYNCED" : "UNSYNCED"}</button>
            </div>
          </div>
          {[0, 1].map((idx) => (
            <div key={idx} style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}><span style={{ fontWeight: 600, fontSize: '14px' }}>Video {idx + 1} Markers</span></div>
              <CalibrationSlider videoIndex={idx as 0 | 1} timeline={timeline} duration={videoRefs.current[idx]?.duration || 0} />
            </div>
          ))}
          {timeline.keyframesEnabled && (<div style={{ marginTop: '20px' }}><div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '5px', color: '#666' }}>Relative Speed (Video 2 to Video 1)</div>
            <SegmentAnalysis timeline={timeline} dataVersion={dataVersion} />
          </div>)}
        </div>
      )}
    </div>
  );
}
const btnStyle = { padding: '8px 14px', borderRadius: '6px', border: '1px solid #d1d5db', background: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 500 };
const selectStyle = { padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', cursor: 'pointer' };