export type TimelineAction = "play" | "pause" | "rate" | undefined;
export type TimelineSubscriber = (time: number, action?: TimelineAction) => void;

export class Timeline {
  private _currentTime = 0;
  private _duration = 0;
  private _playbackRate = 1;
  private _subscribers: TimelineSubscriber[] = [];

  setDuration(duration: number) {
    this._duration = Math.max(this._duration, duration);
  }

  setPlaybackRate(rate: number) {
    this._playbackRate = rate;
    this.notify(this._currentTime, "rate");
  }

  subscribe(cb: TimelineSubscriber) {
    this._subscribers.push(cb);
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

  stepFrames(frames: number, nativeFPS = 30) {
    this.seek(this._currentTime + frames / nativeFPS);
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
