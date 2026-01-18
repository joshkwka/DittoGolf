export type TimelineAction = "play" | "pause" | "rate" | undefined;
export type TimelineSubscriber = (time: number, action?: TimelineAction) => void;

export class Timeline {
  private _currentTime = 0;
  private _duration = 0;
  private _playbackRate = 1;
  private _subscribers: TimelineSubscriber[] = [];
  private _nativeFPS = 30;

  // Sets the timeline duration to the duration of the longest video
  setDuration(duration: number) {
    this._duration = Math.max(this._duration, duration);
  }

  // Subscribe to timeline updates
  subscribe(cb: TimelineSubscriber) {
    this._subscribers.push(cb);
    cb(this._currentTime);
    return () => {
      this._subscribers = this._subscribers.filter(s => s !== cb);
    };
  }

  // Master notifies subscribers of current time
  notify(time: number, action?: TimelineAction) {
    this._currentTime = time;
    this._subscribers.forEach(cb => cb(time, action));
  }

  // Seek to a specific time
  seek(time: number) {
    this.notify(Math.max(0, Math.min(time, this._duration)));
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

  // Sets global video playback rate
  setPlaybackRate(rate: number) {
    this._playbackRate = rate;
    this.notify(this._currentTime, "rate");
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

  get nativeFPS() {
    return this._nativeFPS;
  }
}
