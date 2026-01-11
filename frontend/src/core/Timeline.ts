export type TimelineAction = "play" | "pause" | "rate" | undefined;
export type TimelineSubscriber = (time: number, action?: TimelineAction) => void;

export class Timeline {
  private _currentTime = 0;
  private _duration = 0;
  private _playbackRate = 1;
  private _subscribers: TimelineSubscriber[] = [];
  private _nativeFPS = 30;

  setDuration(duration: number) {
    this._duration = Math.max(this._duration, duration);
  }

  setPlaybackRate(rate: number) {
    this._playbackRate = rate;
    this.notify(this._currentTime, "rate");
  }

  subscribe(cb: TimelineSubscriber) {
    this._subscribers.push(cb);

    // 🔑 immediately sync subscriber
    cb(this._currentTime, undefined);

    return () => {
      this._subscribers = this._subscribers.filter(s => s !== cb);
    };
  }

  notify(time: number, action?: TimelineAction) {
    this._currentTime = time;
    this._subscribers.forEach(cb => cb(time, action));
  }

  seek(time: number) {
    this.notify(Math.max(0, Math.min(time, this._duration)));
  }

  get nativeFPS() {
    return this._nativeFPS;
  }

  setNativeFPS(fps: number) {
    if (fps > 0 && isFinite(fps)) {
      this._nativeFPS = fps;
    }
  }

  stepFrames(frames: number) {
    this.seek(this._currentTime + frames / this._nativeFPS);
  }

  play() {
    this.notify(this._currentTime, "play");
  }

  pause() {
    this.notify(this._currentTime, "pause");
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
}
