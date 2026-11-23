// Solmar Bay — all sound is synthesized live with WebAudio. No audio files,
// no network: an engine hum that rises with speed, gunshots, crashes,
// pickup chimes and a two-tone alarm. Everything is guarded so a browser
// without audio (or a headless one) simply stays silent.
export class AudioSys {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.engineOsc = null;
    this.engineGain = null;
    this.engineFilter = null;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
      // Engine: a low sawtooth through a low-pass filter, always running
      // once audio exists; its pitch and level follow the car's speed.
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 55;
      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.value = 420;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      this.engineOsc.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.master);
      this.engineOsc.start();
    } catch {
      this.ctx = null;
    }
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.35;
  }

  engine(speedNorm, inCar) {
    if (!this.ctx || !this.engineOsc) return;
    const target = inCar ? 0.05 + speedNorm * 0.09 : 0;
    this.engineGain.gain.setTargetAtTime(this.muted ? 0 : target, this.ctx.currentTime, 0.1);
    this.engineOsc.frequency.setTargetAtTime(52 + speedNorm * 130, this.ctx.currentTime, 0.08);
  }

  blip(freq, dur, type = 'sine', vol = 0.25, when = 0) {
    if (!this.ctx || this.muted) return;
    try {
      const t0 = this.ctx.currentTime + when;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      osc.connect(g);
      g.connect(this.master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    } catch { /* silent */ }
  }

  noise(dur, vol = 0.3, freq = 1200) {
    if (!this.ctx || this.muted) return;
    try {
      const t0 = this.ctx.currentTime;
      const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = freq;
      const g = this.ctx.createGain();
      g.gain.value = vol;
      src.connect(filter);
      filter.connect(g);
      g.connect(this.master);
      src.start(t0);
    } catch { /* silent */ }
  }

  shoot() {
    this.noise(0.09, 0.32, 2600);
    this.blip(190, 0.07, 'square', 0.12);
  }

  crash() {
    this.noise(0.25, 0.4, 500);
    this.blip(62, 0.3, 'sine', 0.3);
  }

  chime() {
    this.blip(880, 0.12, 'sine', 0.22);
    this.blip(1318, 0.2, 'sine', 0.2, 0.09);
  }

  pickup() {
    this.blip(660, 0.1, 'triangle', 0.22);
    this.blip(990, 0.16, 'triangle', 0.2, 0.07);
  }

  alarm() {
    this.blip(720, 0.16, 'square', 0.14);
    this.blip(520, 0.16, 'square', 0.14, 0.18);
  }
}
