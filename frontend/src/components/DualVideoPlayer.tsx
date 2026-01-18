import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import VideoPlayer from "./VideoPlayer"; 
import { Timeline, SyncMode } from "../core/Timeline"; 

const SPEED_OPTIONS = [0.1, 0.25, 0.5, 1.0, 2.0, 4.0, 8.0];
const SWING_STAGES = ["Address", "Top", "Downswing", "Impact", "Finish"];

// --- NEW: Segment Analysis Component ---
// Calculates relative speed differences between Video 1 and Video 2 per segment
const SegmentAnalysis = ({ timeline }: { timeline: Timeline }) => {
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
        
        // Get Steps
        const startA = kfsA.find(k => k.label === label)!.step;
        const endA = kfsA.find(k => k.label === nextLabel)!.step;
        const startB = kfsB.find(k => k.label === label)!.step;
        const endB = kfsB.find(k => k.label === nextLabel)!.step;

        const deltaA = endA - startA;
        const deltaB = endB - startB;

        if (deltaA === 0) return null;

        // Ratio > 1.0 means Video 2 is slower/longer duration than Video 1
        const ratio = deltaB / deltaA;
        const percentage = Math.round(ratio * 100);
        
        // Color Logic: Green = Matched, Blue = Faster, Orange = Slower
        let bg = '#10b981'; 
        if (percentage < 90) bg = '#3b82f6'; 
        if (percentage > 110) bg = '#f59e0b'; 

        return (
          <div key={label} style={{ 
              flex: 1, 
              background: bg, 
              color: 'white', 
              fontSize: '11px', 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              justifyContent: 'center',
              borderRight: '1px solid rgba(255,255,255,0.2)',
              position: 'relative'
          }} title={`Segment: ${label} → ${nextLabel}`}>
            <span style={{ fontWeight: 'bold' }}>{percentage}%</span>
            <span style={{ fontSize: '9px', opacity: 0.9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                {label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

// --- Calibration Slider (Unchanged) ---
const CalibrationSlider = ({ 
  videoIndex, 
  timeline, 
  duration, 
  onForceRender 
}: { 
  videoIndex: 0 | 1, 
  timeline: Timeline, 
  duration: number,
  onForceRender: () => void 
}) => {
  const kfs = videoIndex === 0 ? timeline.keyframesA : timeline.keyframesB;
  
  // Calculate width based on frames (approx 60fps assumption for UI width)
  const totalSteps = duration > 0 ? Math.ceil(duration * 60) : 100;
  
  // Real-time position of this specific video
  const currentVideoTime = timeline.calculateVideoTime(videoIndex, timeline.currentStep);
  const currentVideoStep = currentVideoTime * timeline.masterFPS;

  const handleDragStart = (e: React.MouseEvent, kfId: string, startStep: number) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();

    const parent = (e.currentTarget as HTMLElement).parentElement;
    if (!parent) return;
    
    const rect = parent.getBoundingClientRect();
    const startX = e.clientX;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      // Convert pixel delta to step delta
      const deltaStep = (deltaX / rect.width) * totalSteps;
      timeline.updateKeyframe(videoIndex, kfId, startStep + deltaStep);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      timeline.resetAfterDrag();
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div style={{ 
      position: 'relative', 
      height: '40px', 
      background: '#e5e7eb', 
      borderRadius: '6px', 
      margin: '15px 0',
      border: '1px solid #d1d5db',
      overflow: 'hidden',
      userSelect: 'none'
    }}>
      {/* Ticks Background */}
      <div style={{ 
          position: 'absolute', inset: 0, opacity: 0.1, 
          backgroundImage: 'linear-gradient(90deg, #000 1px, transparent 1px)', 
          backgroundSize: '20px 100%' 
      }} />

      {/* The Playhead (Red Line) */}
      <div 
        style={{
          position: 'absolute',
          left: `${(currentVideoStep / totalSteps) * 100}%`,
          top: 0, bottom: 0, width: '2px',
          backgroundColor: '#ef4444',
          zIndex: 5,
          pointerEvents: 'none',
          boxShadow: '0 0 4px rgba(239, 68, 68, 0.6)'
        }}
      />

      {/* Keyframe Markers */}
      {kfs.map(kf => {
        const isAnchor = kf.label === 'Start' || kf.label === 'End';
        const isEnabled = timeline.keyframesEnabled || isAnchor;
        // Clamp visual position 0-100%
        const leftPct = Math.max(0, Math.min(100, (kf.step / totalSteps) * 100));

        return (
          <div 
            key={kf.id}
            onMouseDown={(e) => isEnabled && handleDragStart(e, kf.id, kf.step)}
            onContextMenu={(e) => {
              e.preventDefault();
              if (isEnabled && !isAnchor) {
                 // Unified Deletion
                 timeline.deleteGlobalEvent(kf.label);
                 onForceRender();
              }
            }}
            style={{
              position: 'absolute',
              left: `${leftPct}%`,
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: '24px', 
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: isEnabled ? 'grab' : 'not-allowed',
              zIndex: 10,
            }}
            title={isAnchor ? kf.label : `${kf.label} (Right-click to delete)`}
          >
            {/* Visual Dot */}
            <div style={{
                width: '12px', height: '12px', borderRadius: '50%',
                backgroundColor: isEnabled ? kf.color : '#9ca3af',
                border: '2px solid white',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                opacity: isEnabled ? 1 : 0.6
            }} />
            
            {/* Label Tooltip */}
            <div style={{
                position: 'absolute', bottom: '100%', marginBottom: '4px',
                fontSize: '10px', background: 'rgba(0,0,0,0.8)', color: 'white',
                padding: '2px 4px', borderRadius: '4px', whiteSpace: 'nowrap',
                pointerEvents: 'none'
            }}>
                {kf.label}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// --- Main Component ---

export default function DualVideoPlayer({ video1Src, video2Src }: { video1Src: string, video2Src: string }) {
  const timeline = useMemo(() => new Timeline(), []);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  
  const [, setTick] = useState(0);
  const forceRender = useCallback(() => setTick(t => t + 1), []);

  const videoRefs = useRef<(HTMLVideoElement | null)[]>([null, null]);

  // Add a ref to track frame counts
  const frameSkipRef = useRef(0);
  
  // useEffect(() => {
  //   const unsubscribe = timeline.subscribe(() => {
  //       // Increment counter
  //       frameSkipRef.current++;
        
  //       // Only trigger React re-render every 2nd frame (30fps UI, 60fps Video)
  //       if (frameSkipRef.current % 2 === 0) {
  //           forceRender();
  //       }
  //   });
  //   return unsubscribe;
  // }, [timeline, forceRender]);

  useEffect(() => {
    // Use '_' to ignore the unused 'step' parameter
    const unsubscribe = timeline.subscribe((_, action) => {
        // 1. Critical UI Actions: Always Render immediately
        // "update" = Keyframe toggles/adds
        // "play/pause" = Button state changes
        if (action === "update" || action === "play" || action === "pause" || action === "rate") {
            forceRender();
            return;
        }

        // 2. Playback Ticks: Throttle (Save CPU)
        // Only throttle the high-frequency animation loop
        frameSkipRef.current++;
        if (frameSkipRef.current % 2 === 0) {
            forceRender();
        }
    });
    return unsubscribe;
  }, [timeline, forceRender]);

  // Handle Adding Events Globally
  const handleAddEvent = (label: string) => {
      if(!label) return;
      timeline.addGlobalEvent(label);
      forceRender();
  }

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;

      switch(e.code) {
        case "Space":
          e.preventDefault();
          timeline.isPlaying ? timeline.pause() : timeline.play();
          break;
        case "ArrowRight":
           e.preventDefault();
           timeline.stepFrames(1);
           break;
        case "ArrowLeft":
           e.preventDefault();
           timeline.stepFrames(-1);
           break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [timeline]);

  return (
    <div style={{ padding: "20px", fontFamily: "system-ui, sans-serif", maxWidth: "1100px", margin: "0 auto", color: "#1f2937" }}>
      
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
            <h1 style={{ fontSize: '24px', fontWeight: '800', margin: 0 }}>Ditto<span style={{color:'#ef4444'}}>.Golf</span></h1>
            <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
                {timeline.syncMode === SyncMode.SYNC ? "Synced Mode Active" : "Linear Playback"}
            </p>
        </div>
        <button 
            onClick={() => setSettingsOpen(!isSettingsOpen)} 
            style={{ 
                padding: '8px 16px', cursor: 'pointer', borderRadius: '6px', 
                border: '1px solid #d1d5db', background: isSettingsOpen ? '#e5e7eb' : 'white',
                fontWeight: 500
            }}>
          {isSettingsOpen ? "Hide Tools" : "🛠 Open Tools"}
        </button>
      </div>

      {/* Video Area */}
      <div style={{ 
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", 
          background: '#000', padding: '20px', borderRadius: '16px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
      }}>
        <VideoPlayer 
            src={video1Src} timeline={timeline} videoIndex={0} 
            ref={(el) => { videoRefs.current[0] = el; }} 
        />
        <VideoPlayer 
            src={video2Src} timeline={timeline} videoIndex={1} 
            ref={(el) => { videoRefs.current[1] = el; }} 
        />
      </div>

      {/* Main Timeline Scrubber */}
      <div style={{ marginTop: 20, padding: '0 10px' }}>
        <input 
          type="range" min={0} max={timeline.totalSteps} step={1} value={timeline.currentStep}
          onChange={e => timeline.seek(Number(e.target.value))} 
          style={{ width: "100%", cursor: "pointer", accentColor: "#ef4444" }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
            <span>Start</span>
            <span>{timeline.syncMode === SyncMode.SYNC ? 'Normalized Time' : 'Real Time'}</span>
            <span>End</span>
        </div>
      </div>

      {/* Playback Controls */}
      <div style={{ display: "flex", gap: 12, marginTop: 20, alignItems: "center", justifyContent: "center", background: "#f3f4f6", padding: "12px", borderRadius: "12px" }}>
        
        <button onClick={() => timeline.stepFrames(-1)} title="Previous Frame" style={btnStyle}>Prev</button>
        
        <button 
            onClick={() => timeline.isPlaying ? timeline.pause() : timeline.play()} 
            style={{ ...btnStyle, background: '#1f2937', color: 'white', minWidth: '80px' }}>
            {timeline.isPlaying ? "Pause" : "Play"}
        </button>
        
        <button onClick={() => timeline.stepFrames(1)} title="Next Frame" style={btnStyle}>Next</button>

        <div style={{ width: '1px', height: '20px', background: '#d1d5db', margin: '0 10px' }} />

        <select 
            value={timeline.playbackRate} 
            onChange={e => timeline.setPlaybackRate(Number(e.target.value))} 
            style={selectStyle}>
          {SPEED_OPTIONS.map(s => <option key={s} value={s}>{s}x Speed</option>)}
        </select>
        
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer', userSelect: 'none' }}>
          <input type="checkbox" checked={timeline.isLooping} onChange={e => timeline.setLoop(e.target.checked)} /> 
          Loop
        </label>
      </div>

      {/* Calibration / Editing Panel */}
      {isSettingsOpen && (
        <div style={{ marginTop: 20, padding: 25, background: "white", borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '18px' }}>Sync Editor</h3>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              
               {/* Unified Event Adder */}
               <select 
                  style={selectStyle}
                  disabled={!timeline.keyframesEnabled}
                  onChange={(e) => { handleAddEvent(e.target.value); e.target.value = ""; }}
               >
                   <option value="">+ Add Event Marker</option>
                   {SWING_STAGES.map(stage => {
                       // Check if ANY video has it (they should match now)
                       const exists = timeline.keyframesA.some(k => k.label === stage);
                       return <option key={stage} value={stage} disabled={exists}>{stage} {exists ? '(Added)' : ''}</option>
                   })}
               </select>

              <button 
                  onClick={() => timeline.setKeyframesEnabled(!timeline.keyframesEnabled)}
                  style={{...btnStyle, background: timeline.keyframesEnabled ? 'white' : '#f3f4f6', color: timeline.keyframesEnabled ? '#374151' : '#9ca3af' }}>
                {timeline.keyframesEnabled ? "Keyframes: ON" : "Keyframes: OFF"}
              </button>

              <button 
                  onClick={() => timeline.toggleSync()} 
                  style={{ 
                      ...btnStyle,
                      background: timeline.syncMode === SyncMode.SYNC ? '#10b981' : '#ef4444',
                      color: 'white',
                      border: 'none',
                  }}>
                  {timeline.syncMode === SyncMode.SYNC ? "SYNCED" : "UNSYNCED"}
              </button>
            </div>
          </div>

          {[0, 1].map((idx) => (
            <div key={idx} style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: 600, fontSize: '14px' }}>Video {idx + 1} Markers</span>
              </div>
              
              <CalibrationSlider 
                videoIndex={idx as 0 | 1} 
                timeline={timeline} 
                duration={videoRefs.current[idx]?.duration || 0}
                onForceRender={forceRender}
              />
            </div>
          ))}

          {/* ADDED: Segment Analysis Bar */}
          {timeline.keyframesEnabled && (
             <div style={{ marginTop: '20px' }}>
                 <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '5px', color: '#666' }}>
                    Relative Speed (Video 2 to Video 1)
                 </div>
                 <SegmentAnalysis timeline={timeline} />
             </div>
          )}
          
          <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '10px' }}>
            <strong>How to use:</strong> 1. Pause video. 2. Drag the colored markers to match the swing events. 3. Click "Sync" to align videos based on markers.
          </p>
        </div>
      )}
    </div>
  );
}

// Simple styles for clean code
const btnStyle = {
    padding: '8px 14px', borderRadius: '6px', border: '1px solid #d1d5db', 
    background: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 500
};

const selectStyle = {
    padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', 
    fontSize: '13px', cursor: 'pointer'
};