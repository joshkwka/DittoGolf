import DualVideoPlayer from "./components/DualVideoPlayer";

export default function App() {
  return (
    <div style={{ padding: 20 }}>
      <h1>DittoGolf Dual Video Player</h1>
      <DualVideoPlayer
        video1Src="/videos/video1.mp4"
        video2Src="/videos/video2.mp4"
      />
    </div>
  );
}
