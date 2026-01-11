export class Timeline {
  private _currentTime = 0;
  private _duration = 0;
  private _playing = false;
  private _subscribers: ((time: number, action?: "play" | "pause") => void)[] = [];

  setDuration(duration: number) {
    this._duration = duration;
  }

  play() {
    if (!this._playing) {
      this._playing = true;
      this._subscribers.forEach(cb => cb(this._currentTime, "play"));
      this._tick();
    }
  }

  pause() {
    this._playing = false;
    this._subscribers.forEach(cb => cb(this._currentTime, "pause"));
  }

  subscribe(callback: (time: number, action?: "play" | "pause") => void) {
    this._subscribers.push(callback);
  }

  seek(time: number) {
    this._currentTime = time;
    this._subscribers.forEach(cb => cb(this._currentTime));
  }

  private _tick() {
    if (!this._playing) return;

    const interval = 1000 / 30; // 30fps
    setTimeout(() => {
      this._currentTime += interval / 1000;
      if (this._currentTime > this._duration) {
        this._currentTime = this._duration;
        this._playing = false;
        this._subscribers.forEach(cb => cb(this._currentTime, "pause"));
        return;
      }
      this._subscribers.forEach(cb => cb(this._currentTime));
      this._tick();
    }, interval);
  }

  get currentTime() {
    return this._currentTime;
  }

  get duration() {
    return this._duration;
  }
}
