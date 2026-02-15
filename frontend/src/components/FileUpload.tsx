import { useRef, useState } from 'react';

type FileUploadProps = {
  label: string;
  onFileSelect: (url: string) => void;
};

export default function FileUpload({ label, onFileSelect }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = (file: File) => {
    if (file && file.type.startsWith('video/')) {
      // Create a local URL for the file (no server needed)
      const url = URL.createObjectURL(file);
      onFileSelect(url);
    } else {
      alert("Please upload a valid video file.");
    }
  };

  return (
    <div 
      style={{
        flex: 1,
        border: `2px dashed ${isDragging ? '#10b981' : '#cbd5e1'}`,
        borderRadius: '12px',
        padding: '40px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isDragging ? '#f0fdf4' : '#f8fafc',
        transition: 'all 0.2s',
        cursor: 'pointer',
        minHeight: '200px'
      }}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
      }}
      onClick={() => inputRef.current?.click()}
    >
      <input
        type="file"
        ref={inputRef}
        style={{ display: 'none' }}
        accept="video/*" // Triggers mobile gallery/camera
        onChange={(e) => {
          if (e.target.files?.[0]) handleFile(e.target.files[0]);
        }}
      />
      
      <div style={{ fontSize: '32px', marginBottom: '10px' }}>
        {label.includes("1") ? "🏌️" : "⛳️"}
      </div>
      <div style={{ fontWeight: 600, color: '#334155', marginBottom: '5px' }}>{label}</div>
      <div style={{ fontSize: '12px', color: '#64748b', textAlign: 'center' }}>
        Click to browse or drag video here
      </div>
    </div>
  );
}