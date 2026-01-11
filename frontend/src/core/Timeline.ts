export class Timeline {
  private _currentTime = 0;
  private _duration = 0;
  private _playing = false;
  private _fps = 30;

  private _subscribers: ((time: number, action?: "play" | "pause") => void)[] =
    [];

  setDuration(duration: number) {
    this._duration = duration;
  }

  setFPS(fps: number) {
    this._fps = fps;
  }

  play() {
    if (!this._playing) {
      this._playing = true;
      this._subscribers.forEach((cb) =>
        cb(this._currentTime, "play")
      );
      this._tick();
    }
  }

  pause() {
    this._playing = false;
    this._subscribers.forEach((cb) =>
      cb(this._currentTime, "pause")
    );
  }

  stepFrames(frames: number) {
    const delta = frames / this._fps;
    this.seek(this._currentTime + delta);
  }

  seek(time: number) {
    this._currentTime = Math.max(0, Math.min(time, this._duration));
    this._subscribers.forEach((cb) => cb(this._currentTime));
  }

  subscribe(callback: (time: number, action?: "play" | "pause") => void) {
    this._subscribers.push(callback);
  }

  private _tick() {
    if (!this._playing) return;

    const interval = 1000 / this._fps;

    setTimeout(() => {
      this._currentTime += 1 / this._fps;

      if (this._currentTime >= this._duration) {
        this._currentTime = this._duration;
        this._playing = false;
        this._subscribers.forEach((cb) =>
          cb(this._currentTime, "pause")
        );
        return;
      }

      this._subscribers.forEach((cb) => cb(this._currentTime));
      this._tick();
    }, interval);
  }

  get currentTime() {
    return this._currentTime;
  }

  get duration() {
    return this._duration;
  }

  get fps() {
    return this._fps;
  }
}
