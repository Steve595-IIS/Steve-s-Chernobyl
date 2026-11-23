export class ControlRoomAudio {
  private ctx: AudioContext | null = null;
  private muted = false;
  private humGain: GainNode | null = null;
  private humOsc: OscillatorNode | null = null;
  private steamGain: GainNode | null = null;
  private steamFilter: BiquadFilterNode | null = null;
  private lastAlarm = 0;
  private lastGeiger = 0;

  ensureStarted(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return;
    }
    try {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();

      // Subtle 50 Hz transformer / hall ambient hum
      const hum = this.ctx.createOscillator();
      hum.type = 'sawtooth';
      hum.frequency.value = 50;
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 130;
      const hg = this.ctx.createGain();
      hg.gain.value = this.muted ? 0 : 0.012;
      hum.connect(lp);
      lp.connect(hg);
      hg.connect(this.ctx.destination);
      hum.start();
      this.humOsc = hum;
      this.humGain = hg;

      // Filtered noise for БРУ-К steam dump hiss
      const bufSize = this.ctx.sampleRate * 1.5;
      const noiseBuf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
      const noiseSrc = this.ctx.createBufferSource();
      noiseSrc.buffer = noiseBuf;
      noiseSrc.loop = true;

      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1800;
      bp.Q.value = 0.7;
      const sg = this.ctx.createGain();
      sg.gain.value = 0;
      noiseSrc.connect(bp);
      bp.connect(sg);
      sg.connect(this.ctx.destination);
      noiseSrc.start();
      this.steamFilter = bp;
      this.steamGain = sg;
    } catch {
      // Audio unavailable
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.humGain && this.ctx) {
      this.humGain.gain.setTargetAtTime(muted ? 0 : 0.012, this.ctx.currentTime, 0.05);
    }
    if (this.steamGain && this.ctx && muted) {
      this.steamGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.04);
    }
  }

  silenceLoops(): void {
    if (!this.ctx) return;
    if (this.humGain) this.humGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.04);
    if (this.steamGain) this.steamGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.04);
  }

  resumeLoops(): void {
    if (!this.ctx || this.muted) return;
    if (this.humGain) this.humGain.gain.setTargetAtTime(0.012, this.ctx.currentTime, 0.08);
  }

  updateContinuous(nowSec: number, doseRh: number, steamValvePct: number, pressureBar: number, active: boolean): void {
    if (!this.ctx || this.muted || !active) return;

    // Steam dump hiss
    if (this.steamGain && this.steamFilter) {
      const level = (steamValvePct / 100) * Math.min(1, pressureBar / 35) * 0.045;
      this.steamGain.gain.setTargetAtTime(level, this.ctx.currentTime, 0.08);
      this.steamFilter.frequency.setTargetAtTime(1200 + steamValvePct * 14, this.ctx.currentTime, 0.1);
    }

    // Geiger counter clicks proportional to dose rate
    const rateHz = Math.min(28, 0.6 + doseRh * 6.5);
    if (nowSec - this.lastGeiger > (1 / rateHz) * (0.6 + Math.random() * 0.8)) {
      this.lastGeiger = nowSec;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'triangle';
      o.frequency.value = 1800 + Math.random() * 700;
      g.gain.setValueAtTime(0.014, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.012);
      o.connect(g);
      g.connect(this.ctx.destination);
      o.start();
      o.stop(this.ctx.currentTime + 0.014);
    }
  }

  playAlarmBeep(nowSec: number): void {
    if (this.muted || !this.ctx || nowSec - this.lastAlarm < 0.25) return;
    this.lastAlarm = nowSec;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'square';
    o.frequency.value = 740;
    g.gain.setValueAtTime(0.028, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.22);
    o.connect(g);
    g.connect(this.ctx.destination);
    o.start();
    o.stop(this.ctx.currentTime + 0.23);
  }

  playSwitchClick(pitch = 220): void {
    if (this.muted || !this.ctx) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(pitch, this.ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(pitch * 0.45, this.ctx.currentTime + 0.045);
    g.gain.setValueAtTime(0.04, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0005, this.ctx.currentTime + 0.05);
    o.connect(g);
    g.connect(this.ctx.destination);
    o.start();
    o.stop(this.ctx.currentTime + 0.055);
  }

  playScram(): void {
    if (this.muted || !this.ctx) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(160, this.ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(52, this.ctx.currentTime + 0.5);
    g.gain.setValueAtTime(0.08, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0005, this.ctx.currentTime + 0.52);
    o.connect(g);
    g.connect(this.ctx.destination);
    o.start();
    o.stop(this.ctx.currentTime + 0.55);
  }

  playExplosion(): void {
    if (this.muted || !this.ctx) return;
    const t0 = this.ctx.currentTime;
    // Sub-bass pressure vessel rupture thump
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(115, t0);
    o.frequency.exponentialRampToValueAtTime(22, t0 + 1.6);
    g.gain.setValueAtTime(0.18, t0);
    g.gain.exponentialRampToValueAtTime(0.0005, t0 + 1.65);
    o.connect(g);
    g.connect(this.ctx.destination);
    o.start(t0);
    o.stop(t0 + 1.7);

    // Low-passed filtered noise blast roar
    const bufSize = Math.floor(this.ctx.sampleRate * 2.2);
    const noiseBuf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = noiseBuf;

    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1400, t0);
    lp.frequency.exponentialRampToValueAtTime(180, t0 + 2.1);

    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.22, t0);
    ng.gain.exponentialRampToValueAtTime(0.0008, t0 + 2.15);

    src.connect(lp);
    lp.connect(ng);
    ng.connect(this.ctx.destination);
    src.start(t0);
    src.stop(t0 + 2.2);
  }

  playPurr(): void {
    if (this.muted || !this.ctx) return;
    const o = this.ctx.createOscillator();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    const g = this.ctx.createGain();
    o.type = 'triangle';
    o.frequency.value = 54;
    lfo.type = 'sine';
    lfo.frequency.value = 22;
    lfoGain.gain.value = 0.015;
    g.gain.setValueAtTime(0.025, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.55);
    lfo.connect(lfoGain);
    lfoGain.connect(g.gain);
    o.connect(g);
    g.connect(this.ctx.destination);
    o.start();
    lfo.start();
    o.stop(this.ctx.currentTime + 0.58);
    lfo.stop(this.ctx.currentTime + 0.58);
  }

  playValveTurn(): void {
    if (this.muted || !this.ctx) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(340, this.ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(190, this.ctx.currentTime + 0.08);
    g.gain.setValueAtTime(0.035, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0008, this.ctx.currentTime + 0.09);
    o.connect(g);
    g.connect(this.ctx.destination);
    o.start();
    o.stop(this.ctx.currentTime + 0.095);
  }

  dispose(): void {
    try {
      this.humOsc?.stop();
      void this.ctx?.close();
    } catch {
      // ignore
    }
    this.ctx = null;
  }
}
