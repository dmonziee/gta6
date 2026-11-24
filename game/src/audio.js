// audio.js — every sound is synthesized live with WebAudio; no audio files.
export class AudioSys {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.engineFilter = null;
    this.muted = false;
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
      this.master.gain.value = this.muted ? 0 : 0.35;
      this.master.connect(this.ctx.destination);
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
    } catch (e) {
      this.ctx = null;
    }
  }
  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.35;
  }
  engine(speedNorm, inCar) {
    if (!this.ctx || !this.engineGain || !this.engineOsc) return;
    const target = this.muted ? 0 : (inCar ? 0.05 + speedNorm * 0.09 : 0);
    this.engineGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.1);
    this.engineOsc.frequency.setTargetAtTime(52 + speedNorm * 130, this.ctx.currentTime, 0.08);
  }
  blip(freq, dur, type = 'sine', vol = 0.25, when = 0) {
    if (!this.ctx || this.muted) return;
    try {
      const t0 = this.ctx.currentTime + when;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      o.connect(g);
      g.connect(this.master);
      o.start(t0);
      o.stop(t0 + dur + 0.05);
    } catch (e) {}
  }
  noise(dur, vol = 0.3, freq = 1200) {
    if (!this.ctx || this.muted) return;
    try {
      const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const filt = this.ctx.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.value = freq;
      const g = this.ctx.createGain();
      g.gain.value = vol;
      src.connect(filt);
      filt.connect(g);
      g.connect(this.master);
      src.start();
    } catch (e) {}
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
