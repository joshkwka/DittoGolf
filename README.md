# DittoGolf: Dual-Stream Time-Warping Sync Engine

This repository contains a high-performance React application designed for side-by-side athletic video analysis. The project bridges the gap between standard media playback and precision systems engineering, utilizing a custom-built interpolation engine to synchronize asynchronous video feeds for frame-accurate comparison.

## System Architecture
* **Framework:** React 18 (TypeScript)
* **Logic Engine:** Piecewise Linear Interpolation State Machine
* **Infrastructure:** Docker / Nginx Alpine (Multi-stage build)
* **Rendering:** Direct DOM Video Manipulation (Bypassing Virtual DOM)

## Linear Playback
- Standard synchronized playback where both videos progress at their native frame rates from a shared start time.
- Ideal for comparing swings recorded at identical frame rates and starting positions.

## Time-Warped Sync
- Utilizes a custom **Warping Sync Engine** to normalize different athletic tempos across two videos.
- By setting keyframe markers at specific milestones (Address, Top, Impact, etc.), the engine calculates instantaneous playback rates to ensure both videos hit identical swing stages at the exact same millisecond.

## Prerequisites
To run this project exactly as intended without managing local Node.js environments, ensure you have the following installed:
1. [Docker](https://docs.docker.com/get-docker/)
2. [Docker Compose](https://docs.docker.com/compose/install/)

## Getting Started

### 1. Clone the Repository
```bash
git clone [https://github.com/joshkwka/DittoGolf.git](https://github.com/joshkwka/DittoGolf.git)
cd DittoGolf
```

### 2. Launch with Docker Compose
Gemini said
To update your DittoGolf README.md to include your Docker configuration, replace the following sections in your current file with these blocks:

1. Update System Architecture
Replace the top list with this to show off the containerization:

Markdown
## System Architecture
* **Framework:** React 18 (TypeScript)
* **Logic Engine:** Piecewise Linear Interpolation State Machine
* **Infrastructure:** Docker / Nginx Alpine (Multi-stage build)
* **Rendering:** Direct DOM Video Manipulation (Bypassing Virtual DOM)
2. Update Prerequisites & Getting Started
Replace the installation steps to prioritize Docker:

Markdown
## Prerequisites
To run this project exactly as intended without managing local Node.js environments, ensure you have the following installed:
1. [Docker](https://docs.docker.com/get-docker/)
2. [Docker Compose](https://docs.docker.com/compose/install/)

## Getting Started

### 1. Clone the Repository
```
git clone [https://github.com/joshkwka/DittoGolf.git](https://github.com/joshkwka/DittoGolf.git)
cd DittoGolf
```

### 2. Launch with Docker Compose
This project uses a multi-stage Dockerfile to build the React production assets and serve them via a lightweight Nginx container.
```
docker-compose up --build
```

### 3. Access the Application
The frontend is mapped to port 3000:
- Open your browser to: http://localhost:3000
```
npm run dev
```
Navigate to http://localhost:3000 to view the application.

### 4. Perform an Analysis
1. **Upload Videos:** Drag and drop or click to upload a "Reference" video and a "Student" video.
2. **Set Markers:** Open the Sync Editor (🛠 Tools) and add markers for "Top of Swing" or "Impact" for both videos.
3. **Adjust Keyframes:** Use the Calibration Sliders to fine-tune the exact frame for each marker.
4. **Enable Sync:** Toggle SYNCED mode to watch the engine warp the playback speeds to match the two swings perfectly.

## Technical Core
- `Timeline.ts`: The "Brain" of the application. It manages the master virtual clock (0-1000 steps) and broadcasts state updates to subscribers. It handles the mathematical mapping of virtual time to local video time using piecewise linear interpolation.
- `VideoPlayer.tsx`: The high-performance rendering layer. It subscribes to the Timeline and uses a Proportional-style correction loop to adjust video.playbackRate in just real-time, compensating for browser-level clock drift.
- `DualVideoPlayer.tsx`: The orchestration layer that manages the side-by-side layout, responsive design (Row vs. Column), and the global event bus for keyboard shortcuts (Space for Play/Pause, Arrows for Frame-Stepping).

## Learnings & Technical Takeaways

## Roadmap/Next Steps
- [x] **Containerized Deployment:** Multi-stage Docker builds and Compose orchestration.
- [x] **Dual Stream Sync:** Simultaneous playback of two local video files.
- [x] **Piecewise Time Warping:** Marker-based tempo normalization.
- [x] **Mobile Optimization:** Responsive layouts and touch-friendly calibration.
- [ ] **Cloud-Native Media Pipeline:** Migrate from local file blobs to a serverless architecture using **AWS S3** and **Lambda** for automated video transcoding (H.264 normalization).
- [ ] **Infrastructure as Code (IaC):** Define and deploy the full cloud stack (API Gateway, S3, CloudFront) using **Terraform** or **AWS CDK** for 1-click environment reproducibility.
- [ ] **Distributed Task Orchestration:** Implement a **Redis-backed worker queue** to handle high-concurrency video processing requests and manage worker node health.
- [ ] **Edge Delivery & Caching:** Integrate a Content Delivery Network (CDN) to minimize latency for high-bandwidth video assets across geographic regions.
- [ ] **Observability & Monitoring:** Implement centralized logging and health checks to monitor container performance and API latency in real-time.