export class Timeline {
  private _currentTime = 0;
  private _duration = 0;
  private _playing = false;
  private _videoFPS = 30; // frames per second of the original video
  private _playbackRate = 1; // playback speed multiplier (0.25x, 0.5x, 1x, 2x, 4x)

  private _subscribers: ((time: number) => void)[] = [];

  setDuration(duration: number) {
    this._duration = duration;
  }

  setVideoFPS(fps: number) {
    this._videoFPS = fps;
  }

  setPlaybackRate(rate: number) {
    this._playbackRate = rate;
  }

  play() {
    if (!this._playing) {
      this._playing = true;
      this._tick();
    }
  }

  pause() {
    this._playing = false;
  }

  // Step exactly one video frame
  stepFrames(frames: number) {
    const delta = frames / this._videoFPS;
    this.seek(this._currentTime + delta);
  }

  seek(time: number) {
    this._currentTime = Math.max(0, Math.min(time, this._duration));
    this._subscribers.forEach((cb) => cb(this._currentTime));
  }

  subscribe(callback: (time: number) => void) {
    this._subscribers.push(callback);
  }

  private _tick() {
    if (!this._playing) return;

    const interval = 1000 / this._videoFPS; // use videoFPS as base for tick resolution
    setTimeout(() => {
      this._currentTime += (1 / this._videoFPS) * this._playbackRate;

      if (this._currentTime >= this._duration) {
        this._currentTime = this._duration;
        this._playing = false;
      }

      this._subscribers.forEach((cb) => cb(this._currentTime));

      if (this._playing) this._tick();
    }, interval);
  }

  get currentTime() {
    return this._currentTime;
  }

  get duration() {
    return this._duration;
  }

  get playbackRate() {
    return this._playbackRate;
  }

  get videoFPS() {
    return this._videoFPS;
  }
}
