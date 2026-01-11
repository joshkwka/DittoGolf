import DualVideoPlayer from "./components/DualVideoPlayer";

function App() {
  return (
    <div style={{ padding: "20px" }}>
      <h1>DittoGolf Dual Video Player</h1>
      <DualVideoPlayer
        video1Src="/videos/video1.mp4"
        video2Src="/videos/video2.mp4"
      />
    </div>
  );
}

export default App;
