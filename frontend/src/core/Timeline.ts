export type TimelineAction = "play" | "pause" | "rate" | "seek" | undefined;
export type TimelineSubscriber = (step: number, action?: TimelineAction) => void;

export class Timeline {
  private _currentStep = 0;
  private _totalSteps = 0;
  private _masterFPS = 30;
  private _durationInSeconds = 0;
  private _playbackRate = 1;
  private _subscribers: TimelineSubscriber[] = [];

  // Decoupled Logic Properties
  private _isPlaying = false;
  private _animationFrameId: number | null = null;
  private _lastTimestamp: number | null = null;

  setDuration(seconds: number) {
    this._durationInSeconds = Math.max(this._durationInSeconds, seconds);
    this._totalSteps = Math.ceil(this._durationInSeconds * this._masterFPS);
  }

  subscribe(cb: TimelineSubscriber) {
    this._subscribers.push(cb);
    cb(this._currentStep); 
    return () => {
      this._subscribers = this._subscribers.filter(s => s !== cb);
    };
  }

  notify(step: number, action?: TimelineAction) {
    this._currentStep = step;
    this._subscribers.forEach(cb => cb(step, action));
  }

  seek(step: number) {
    const clampedStep = Math.max(0, Math.min(step, this._totalSteps));
    this.notify(clampedStep, "seek");
  }

  // --- VIRTUAL CLOCK ---

  private _tick = (now: number) => {
    if (!this._isPlaying) return;

    if (this._lastTimestamp !== null) {
      const deltaTimeSeconds = (now - this._lastTimestamp) / 1000;
      
      // Calculate how many steps we've moved based on real time
      const stepsToMove = deltaTimeSeconds * this._masterFPS * this._playbackRate;
      const nextStep = this._currentStep + stepsToMove;

      if (nextStep >= this._totalSteps) {
        this.pause();
        this.seek(this._totalSteps);
        return;
      }

      // Update current step internally but don't use 'seek' 
      // to avoid triggering "seek" events in the video players
      this._currentStep = nextStep;
      this._subscribers.forEach(cb => cb(this._currentStep));
    }

    this._lastTimestamp = now;
    this._animationFrameId = requestAnimationFrame(this._tick);
  };

  play() {
    if (this._isPlaying) return;
    this._isPlaying = true;
    this._lastTimestamp = null; // Reset timestamp to prevent "jumping"
    this._animationFrameId = requestAnimationFrame(this._tick);
    this.notify(this._currentStep, "play");
  }

  pause() {
    this._isPlaying = false;
    if (this._animationFrameId !== null) {
      cancelAnimationFrame(this._animationFrameId);
    }
    this.notify(this._currentStep, "pause");
  }

  stepFrames(steps: number) {
    this.seek(this._currentStep + steps);
  }

  setPlaybackRate(rate: number) {
    this._playbackRate = rate;
    this.notify(this._currentStep, "rate");
  }

  // GETTERS
  get currentStep() { return this._currentStep; }
  get totalSteps() { return this._totalSteps; }
  get masterFPS() { return this._masterFPS; }
  get playbackRate() { return this._playbackRate; }
}