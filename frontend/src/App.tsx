import { useState, useRef } from 'react';
import DualVideoPlayer from "./components/DualVideoPlayer";
import FileUpload from "./components/FileUpload";

const DEFAULT_VIDEO_1 = "/videos/video1.mp4";
const DEFAULT_VIDEO_2 = "/videos/video2.mp4";

export default function App() {
  const [video1, setVideo1] = useState<string | null>(DEFAULT_VIDEO_1);
  const [video2, setVideo2] = useState<string | null>(DEFAULT_VIDEO_2);

  const inputRef1 = useRef<HTMLInputElement>(null);
  const inputRef2 = useRef<HTMLInputElement>(null);

  const handleReplace = (index: 1 | 2, file: File) => {
    if (file && file.type.startsWith('video/')) {
      const url = URL.createObjectURL(file);
      if (index === 1) setVideo1(url);
      else setVideo2(url);
    }
  };

  // Condition: Are both ready?
  const bothReady = video1 && video2;

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui, sans-serif', paddingBottom: '50px' }}>
      
      {/* Hidden Inputs */}
      <input type="file" ref={inputRef1} style={{ display: 'none' }} accept="video/*" onChange={(e) => e.target.files?.[0] && handleReplace(1, e.target.files[0])} />
      <input type="file" ref={inputRef2} style={{ display: 'none' }} accept="video/*" onChange={(e) => e.target.files?.[0] && handleReplace(2, e.target.files[0])} />

      {bothReady ? (
        // STATE A: Both Ready -> Render the DualVideoPlayer with internal headers
        <DualVideoPlayer 
            key={`${video1}-${video2}`} // Reset timeline on change
            video1Src={video1} 
            video2Src={video2}
            onClearVideo={(idx) => idx === 1 ? setVideo1(null) : setVideo2(null)}
            onReplaceVideo={(idx) => idx === 1 ? inputRef1.current?.click() : inputRef2.current?.click()}
        />
      ) : (
        // STATE B: Not Ready -> Render a Layout that MIMICS DualVideoPlayer
        <div style={{ maxWidth: '95vw', margin: '0 auto', padding: '20px' }}>  
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: '800', margin: 0 }}>Ditto<span style={{color:'#ef4444'}}>.Golf</span></h1>
                    <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>Setup Mode</p>
                </div>
            </div>

            {/* The Grid (Identical styling to DualVideoPlayer) */}
            <div style={{ 
                background: '#000', padding: '20px', borderRadius: '16px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
            }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                    
                    {/* Left Column */}
                    <div>
                        <div style={headerStyle}>
                            <span>Reference Video (Left)</span>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={() => setVideo1(null)} style={changeBtnStyle}>Remove Video</button>
                                <button onClick={() => inputRef1.current?.click()} style={plusBtnStyle}>+</button>
                            </div>
                        </div>
                        <div style={{ height: '60vh', minHeight: '400px', width: '100%', background: '#111', borderRadius: '8px', overflow: 'hidden', display: 'flex' }}>
                            {video1 ? (
                                <video src={video1} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                            ) : (
                                <FileUpload label="Upload Reference" onFileSelect={setVideo1} />
                            )}
                        </div>
                    </div>

                    {/* Right Column */}
                    <div>
                        <div style={headerStyle}>
                            <span>Student Video (Right)</span>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={() => setVideo2(null)} style={changeBtnStyle}>Remove Video</button>
                                <button onClick={() => inputRef2.current?.click()} style={plusBtnStyle}>+</button>
                            </div>
                        </div>
                        <div style={{ height: '60vh', minHeight: '400px', width: '100%', background: '#111', borderRadius: '8px', overflow: 'hidden', display: 'flex' }}>
                             {video2 ? (
                                <video src={video2} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                            ) : (
                                <FileUpload label="Upload Student" onFileSelect={setVideo2} />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '40px', color: '#64748b' }}>
                {!video1 || !video2 ? "Please upload both videos to start analysis." : ""}
            </div>
        </div>
      )}
    </div>
  );
}

// Styles used in State B to match State A
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', color: '#e5e7eb', fontSize: '14px', fontWeight: 600 };
const changeBtnStyle = { fontSize: '11px', padding: '4px 8px', background: '#374151', border: '1px solid #4b5563', color: '#e5e7eb', borderRadius: '4px', cursor: 'pointer' };
const plusBtnStyle = { fontSize: '12px', padding: '4px 8px', background: '#ef4444', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' };