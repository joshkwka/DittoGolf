export type TimelineAction = "play" | "pause" | "rate" | "seek" | "update" | "preview" | undefined;
export type TimelineSubscriber = (step: number, action?: TimelineAction, meta?: any) => void;

export const SyncMode = {
  UNSYNC: "unsync",
  SYNC: "sync",
} as const;

export type SyncModeType = (typeof SyncMode)[keyof typeof SyncMode];

export type Keyframe = {
  id: string;
  label: string;
  step: number;
  color: string;
};

// A calculated "Sync Point" shared by both videos
interface SyncPoint {
  virtualStep: number; // 0 to 1000
  localStepA: number;
  localStepB: number;
}

const SWING_SEQUENCE = ["Address", "Top", "Downswing", "Impact", "Finish"];
const VIRTUAL_TOTAL = 1000;

export class Timeline {
  private _currentStep = 0;
  private _masterFPS = 60;
  private _totalSteps = 0;
  private _playbackRate = 1;
  private _subscribers: TimelineSubscriber[] = [];

  private _rawTotalStepsA = 0;
  private _rawTotalStepsB = 0;

  private _loopEnabled = false;
  private _syncMode: SyncModeType = SyncMode.UNSYNC;
  private _keyframesEnabled = true;

  private _trimA = { start: 0, end: 0 };
  private _trimB = { start: 0, end: 0 };
  private _keyframesA: Keyframe[] = [];
  private _keyframesB: Keyframe[] = [];

  // Cache for the calculated warp map
  private _cachedSyncPoints: SyncPoint[] | null = null;
  private _isPlaying = false;
  private _animationFrameId: number | null = null;
  private _lastTimestamp: number | null = null;

  setDuration(seconds: number, videoIndex: 0 | 1) {
    const steps = Math.ceil(seconds * this._masterFPS);
    const isA = videoIndex === 0;

    // 1. Update Raw Totals
    if (isA) this._rawTotalStepsA = steps;
    else this._rawTotalStepsB = steps;

    // 2. Update Trim Boundaries
    const trim = isA ? this._trimA : this._trimB;
    trim.end = steps;

    // 3. Ensure 'End' keyframe matches the new duration
    const list = isA ? this._keyframesA : this._keyframesB;
    const endKf = list.find(k => k.label === 'End');
    
    if (endKf) {
      endKf.step = steps;
    } else {
      // Init defaults if empty
      const newList = [
        { id: isA ? 'start-a' : 'start-b', label: 'Start', step: 0, color: '#666' },
        { id: isA ? 'end-a' : 'end-b', label: 'End', step: steps, color: '#666' }
      ];
      if (isA) this._keyframesA = newList;
      else this._keyframesB = newList;
    }

    this._updateTotalSteps();
    this._invalidateCache();
  }

  private _updateTotalSteps() {
    if (this._syncMode === SyncMode.UNSYNC) {
      this._totalSteps = Math.max(this._rawTotalStepsA, this._rawTotalStepsB);
    } else {
      this._totalSteps = VIRTUAL_TOTAL;
    }
  }

  private _invalidateCache() {
    this._cachedSyncPoints = null;
  }

  // --- Core Warp Logic ---
  private _getSyncPoints(): SyncPoint[] {
    if (this._cachedSyncPoints) return this._cachedSyncPoints;

    // 1. Identify common labels present in BOTH videos
    const allLabels = ['Start', ...SWING_SEQUENCE, 'End'];
    const commonLabels = allLabels.filter(label => 
      this._keyframesA.some(k => k.label === label) && 
      this._keyframesB.some(k => k.label === label)
    );

    // 2. Build Sync Points
    const points: SyncPoint[] = [];
    
    commonLabels.forEach((label, index) => {
        const kfA = this._keyframesA.find(k => k.label === label)!;
        const kfB = this._keyframesB.find(k => k.label === label)!;

        // Calculate virtual position (Equidistant distribution)
        const virtualStep = (index / (commonLabels.length - 1)) * VIRTUAL_TOTAL;

        points.push({
            virtualStep,
            localStepA: kfA.step,
            localStepB: kfB.step
        });
    });

    this._cachedSyncPoints = points;
    return points;
  }

  calculateVideoTime(videoIndex: 0 | 1, masterStep: number): number {
    // A. Unsync Mode (Simple Linear)
    if (this._syncMode === SyncMode.UNSYNC) {
       const maxFn = videoIndex === 0 ? this._rawTotalStepsA : this._rawTotalStepsB;
       return Math.min(masterStep, maxFn) / this._masterFPS;
    }

    // B. Sync Mode: Linear Stretch (Keyframes Disabled)
    // Maps Start->End directly to 0->1000
    if (!this._keyframesEnabled) {
        const progress = Math.max(0, Math.min(masterStep / VIRTUAL_TOTAL, 1));
        const trim = videoIndex === 0 ? this._trimA : this._trimB;
        const durationSteps = trim.end - trim.start;
        
        const localStep = trim.start + (progress * durationSteps);
        return localStep / this._masterFPS;
    }

    // C. Sync Mode: Warp (Keyframes Enabled)
    const points = this._getSyncPoints();
    if (points.length < 2) return 0;

    // 1. Find which segment we are in
    const clampedStep = Math.max(0, Math.min(masterStep, VIRTUAL_TOTAL));
    
    let i = 0;
    while (i < points.length - 2 && clampedStep > points[i+1].virtualStep) {
        i++;
    }
    
    const pStart = points[i];
    const pEnd = points[i+1];

    // 2. Calculate Local Progress
    const segmentDuration = pEnd.virtualStep - pStart.virtualStep;
    if (segmentDuration <= 0) return pStart.localStepA / this._masterFPS; 

    const progress = (clampedStep - pStart.virtualStep) / segmentDuration;

    // 3. Map to Local Step
    const startLocal = videoIndex === 0 ? pStart.localStepA : pStart.localStepB;
    const endLocal = videoIndex === 0 ? pEnd.localStepA : pEnd.localStepB;

    const currentLocal = startLocal + (progress * (endLocal - startLocal));
    
    return currentLocal / this._masterFPS;
  }

  getInstantaneousRate(videoIndex: 0 | 1): number {
    if (this._syncMode === SyncMode.UNSYNC) return 1;

    // A. Sync Mode: Linear Stretch (Constant Rate)
    // Rate = ThisVideoDuration / MasterVideoDuration
    if (!this._keyframesEnabled) {
        const durA = this._trimA.end - this._trimA.start;
        const durTarget = videoIndex === 0 ? durA : (this._trimB.end - this._trimB.start);
        if (durA <= 0 || durTarget <= 0) return 1;
        
        // Example: If Video A is 10s and Video B is 5s.
        // B must play at 0.5x speed to stretch and finish at the same time as A.
        return durTarget / durA;
    }

    // B. Sync Mode: Warp (Variable Rate)
    const points = this._getSyncPoints();
    if (points.length < 2) return 1;

    // Find current segment
    const clampedStep = Math.max(0, Math.min(this._currentStep, VIRTUAL_TOTAL));
    let i = 0;
    while (i < points.length - 2 && clampedStep >= points[i+1].virtualStep) {
        i++;
    }

    const pStart = points[i];
    const pEnd = points[i+1];

    // Calculate Slopes
    const virtualDelta = pEnd.virtualStep - pStart.virtualStep;
    if (virtualDelta <= 0) return 1;

    const localDelta = videoIndex === 0 
        ? (pEnd.localStepA - pStart.localStepA)
        : (pEnd.localStepB - pStart.localStepB);

    const localPerVirtual = localDelta / virtualDelta;

    const durationA_Total = this._trimA.end - this._trimA.start;
    const virtualPerLocal_GlobalA = VIRTUAL_TOTAL / (durationA_Total || 1); 

    return localPerVirtual * virtualPerLocal_GlobalA; 
  }

  // --- Keyframe Management ---

  addGlobalEvent(label: string) {
    const calculateSmartStep = (list: Keyframe[], trim: {start: number, end: number}) => {
        const seqIndex = SWING_SEQUENCE.indexOf(label);
        let prevStep = trim.start;
        let nextStep = trim.end;
        for (let i = seqIndex - 1; i >= 0; i--) {
            const match = list.find(k => k.label === SWING_SEQUENCE[i]);
            if (match) { prevStep = match.step; break; }
        }
        for (let i = seqIndex + 1; i < SWING_SEQUENCE.length; i++) {
            const match = list.find(k => k.label === SWING_SEQUENCE[i]);
            if (match) { nextStep = match.step; break; }
        }
        return Math.round(prevStep + (nextStep - prevStep) / 2);
    };

    const addToList = (videoIndex: 0 | 1) => {
        const list = videoIndex === 0 ? this._keyframesA : this._keyframesB;
        if (list.some(k => k.label === label)) return; 

        const trim = videoIndex === 0 ? this._trimA : this._trimB;
        const step = calculateSmartStep(list, trim);
        
        const colors: Record<string, string> = { 
            'Impact': '#e74c3c', 'Top': '#9b59b6', 'Address': '#3498db', 'Finish': '#2ecc71', 'Downswing': '#f1c40f'
        };

        list.push({ 
            id: `kf-${videoIndex}-${Math.random().toString(36).substr(2, 5)}`, 
            label, step, color: colors[label] || '#999' 
        });
        list.sort((a, b) => a.step - b.step);
    };

    addToList(0); addToList(1);
    this._invalidateCache();
    this.notify(this._currentStep, "update");
  }

  deleteGlobalEvent(label: string) {
    if (label === 'Start' || label === 'End') return;
    this._keyframesA = this._keyframesA.filter(k => k.label !== label);
    this._keyframesB = this._keyframesB.filter(k => k.label !== label);
    this._invalidateCache();
    this.notify(this._currentStep, "update");
  }

  updateKeyframe(videoIndex: 0 | 1, id: string, newStep: number) {
    const list = videoIndex === 0 ? this._keyframesA : this._keyframesB;
    const idx = list.findIndex(k => k.id === id);
    if (idx === -1) return;

    const kf = list[idx];
    const prev = list[idx - 1];
    const next = list[idx + 1];
    
    const min = prev ? prev.step + 1 : 0;
    const max = next ? next.step - 1 : (videoIndex === 0 ? this._rawTotalStepsA : this._rawTotalStepsB);
    
    kf.step = Math.max(min, Math.min(Math.round(newStep), max));

    if (kf.label === 'Start') (videoIndex === 0 ? this._trimA : this._trimB).start = kf.step;
    if (kf.label === 'End') (videoIndex === 0 ? this._trimA : this._trimB).end = kf.step;

    this._invalidateCache();
    this.notify(this._currentStep, "preview", { videoIndex, step: kf.step });
  }

  // --- STATE TOGGLES (FREED) ---

  toggleSync() {
    // Just toggle the mode, preserve keyframe state
    this._syncMode = this._syncMode === SyncMode.SYNC ? SyncMode.UNSYNC : SyncMode.SYNC;
    this._updateTotalSteps();
    this.notify(this._currentStep, "update");
    this.seek(0);
  }

  setKeyframesEnabled(enabled: boolean) {
    // Just toggle the flag, preserve sync mode
    this._keyframesEnabled = enabled;
    this._invalidateCache();
    this.notify(this._currentStep, "update");
  }

  // --- Animation Loop ---

  private _tick = (now: number) => {
    if (!this._isPlaying) return;
    if (this._lastTimestamp !== null) {
      const deltaTime = (now - this._lastTimestamp) / 1000;
      
      let speedFactor = this._masterFPS;
      if (this._syncMode === SyncMode.SYNC) {
         // Master Clock Speed based on Video A's trimmed duration
         const durationA = (this._trimA.end - this._trimA.start) / this._masterFPS;
         speedFactor = durationA > 0 ? (VIRTUAL_TOTAL / durationA) : this._masterFPS;
      }

      let nextStep = this._currentStep + (deltaTime * speedFactor * this._playbackRate);

      if (nextStep >= this._totalSteps) {
        if (this._loopEnabled) nextStep = 0;
        else { this.pause(); this.seek(this._totalSteps); return; }
      }
      this._currentStep = nextStep;
      this._subscribers.forEach(cb => cb(this._currentStep));
    }
    this._lastTimestamp = now;
    this._animationFrameId = requestAnimationFrame(this._tick);
  };

  subscribe(cb: TimelineSubscriber) {
    this._subscribers.push(cb);
    cb(this._currentStep);
    return () => { this._subscribers = this._subscribers.filter(s => s !== cb); };
  }
  
  notify(step: number, action?: TimelineAction, meta?: any) {
    this._currentStep = step;
    this._subscribers.forEach(cb => cb(step, action, meta));
  }
  
  seek(step: number) { this.notify(Math.max(0, Math.min(step, this._totalSteps)), "seek"); }
  play() { this._isPlaying = true; this._lastTimestamp = null; this._animationFrameId = requestAnimationFrame(this._tick); this.notify(this._currentStep, "play"); }
  pause() { this._isPlaying = false; if (this._animationFrameId) cancelAnimationFrame(this._animationFrameId); this.notify(this._currentStep, "pause"); }
  
  stepFrames(steps: number) { 
    const amount = this._syncMode === SyncMode.SYNC ? (VIRTUAL_TOTAL/100)*steps : steps;
    this.seek(this._currentStep + amount); 
  }
  
  setPlaybackRate(rate: number) { this._playbackRate = rate; this.notify(this._currentStep, "rate"); }
  setLoop(enabled: boolean) { this._loopEnabled = enabled; this.notify(this._currentStep, "update"); }
  resetAfterDrag() { this.notify(this._currentStep, "seek"); }

  get isPlaying() { return this._isPlaying; }
  get currentStep() { return this._currentStep; }
  get totalSteps() { return this._totalSteps; }
  get masterFPS() { return this._masterFPS; }
  get playbackRate() { return this._playbackRate; }
  get syncMode() { return this._syncMode; }
  get isLooping() { return this._loopEnabled; }
  get keyframesA() { return this._keyframesA; }
  get keyframesB() { return this._keyframesB; }
  get keyframesEnabled() { return this._keyframesEnabled; }
}