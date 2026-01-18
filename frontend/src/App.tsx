import DualVideoPlayer from "./components/DualVideoPlayer";

export default function App() {
  return (
    <div style={{ padding: 20 }}>
      {/* Call the DualVideoPlayer component with the videos up for comparison */}
      <DualVideoPlayer
        video1Src="/videos/video1.mp4"
        video2Src="/videos/video2.mp4"
      />
    </div>
  );
}
