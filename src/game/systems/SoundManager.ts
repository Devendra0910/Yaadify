type ToneShape = "sine" | "square" | "triangle" | "sawtooth";

interface TonePart {
  freq: number;
  duration: number;
  shape?: ToneShape;
  delay?: number;
  gain?: number;
}

class SoundManagerImpl {
  private ctx: AudioContext | null = null;
  private muted = false;

  private getCtx(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
    }
    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  isMuted(): boolean {
    return this.muted;
  }

  /** Unlocks the AudioContext — call from a user gesture (first tap/click). */
  unlock(): void {
    this.getCtx();
  }

  private playTone(parts: TonePart[]): void {
    const ctx = this.getCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    for (const part of parts) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = part.shape ?? "sine";
      osc.frequency.value = part.freq;
      const start = now + (part.delay ?? 0);
      const dur = part.duration;
      const peak = part.gain ?? 0.2;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(peak, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur + 0.02);
    }
  }

  pickupCorrect(): void {
    this.playTone([
      { freq: 660, duration: 0.09, shape: "triangle" },
      { freq: 880, duration: 0.12, shape: "triangle", delay: 0.07 },
    ]);
  }

  pickupWrong(): void {
    this.playTone([{ freq: 180, duration: 0.18, shape: "sawtooth", gain: 0.18 }]);
  }

  uiTap(): void {
    this.playTone([{ freq: 520, duration: 0.05, shape: "square", gain: 0.1 }]);
  }

  countdownTick(): void {
    this.playTone([{ freq: 440, duration: 0.05, shape: "sine", gain: 0.12 }]);
  }

  memorizeStart(): void {
    this.playTone([
      { freq: 523, duration: 0.1, shape: "sine" },
      { freq: 659, duration: 0.1, shape: "sine", delay: 0.1 },
      { freq: 784, duration: 0.14, shape: "sine", delay: 0.2 },
    ]);
  }

  checkoutSuccess(): void {
    this.playTone([
      { freq: 523, duration: 0.12, shape: "triangle" },
      { freq: 659, duration: 0.12, shape: "triangle", delay: 0.1 },
      { freq: 784, duration: 0.12, shape: "triangle", delay: 0.2 },
      { freq: 1046, duration: 0.22, shape: "triangle", delay: 0.3 },
    ]);
  }

  timeUp(): void {
    this.playTone([
      { freq: 300, duration: 0.2, shape: "sawtooth", gain: 0.15 },
      { freq: 220, duration: 0.3, shape: "sawtooth", delay: 0.15, gain: 0.15 },
    ]);
  }
}

export const SoundManager = new SoundManagerImpl();
