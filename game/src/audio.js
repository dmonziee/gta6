// All sound in Solmar Bay is synthesized with WebAudio — no audio files, no
// network. A tiny synth builds engine hums, gunshots, sirens, cash-register
// chimes and footsteps out of oscillators and filtered noise.

const NOTE = { C: 261.63, D: 293.66, E: 329.63, G: 392.0, A: 440.0, B: 493.88 };

export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;
  let engineOsc = null;
  let engineGain = null;
  let musicTimer = null;
  let musicStep = 0;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
    } catch {
      return false;
    }
    return true;
  }

  function tone(freq, dur, type, vol, when = 0, slideTo = 0) {
    if (!ensure() || muted) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise(dur, vol, filterFreq, when = 0) {
    if (!ensure() || muted) return;
    const t0 = ctx.currentTime + when;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t0);
  }

  // A lazy two-bar bass loop that only plays while the game is running.
  const BASS_LINE = [NOTE.C, 0, NOTE.C, NOTE.G, 0, NOTE.A, 0, NOTE.G, NOTE.C, 0, NOTE.E, 0, NOTE.D, 0, NOTE.G, 0];
  function startMusic() {
    if (!ensure() || musicTimer) return;
    musicTimer = window.setInterval(() => {
      if (muted || !ctx) return;
      const note = BASS_LINE[musicStep % BASS_LINE.length];
      musicStep += 1;
      if (note) tone(note / 2, 0.22, 'triangle', 0.10);
      if (musicStep % 4 === 0) noise(0.05, 0.05, 4000);
    }, 210);
  }

  function stopMusic() {
    if (musicTimer) {
      window.clearInterval(musicTimer);
      musicTimer = null;
    }
  }

  return {
    unlock() {
      ensure();
      if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    },
    setMuted(value) {
      muted = value;
      if (master) master.gain.value = value ? 0 : 0.5;
    },
    isMuted() {
      return muted;
    },
    startMusic,
    stopMusic,
    shoot() {
      noise(0.14, 0.5, 2600);
      tone(180, 0.09, 'square', 0.25, 0, 60);
    },
    punch() {
      noise(0.08, 0.35, 900);
    },
    pickup() {
      tone(NOTE.E, 0.09, 'sine', 0.3);
      tone(NOTE.G, 0.12, 'sine', 0.3, 0.08);
      tone(NOTE.B, 0.18, 'sine', 0.3, 0.16);
    },
    cash() {
      tone(NOTE.C * 2, 0.1, 'square', 0.14);
      tone(NOTE.E * 2, 0.1, 'square', 0.14, 0.09);
      tone(NOTE.G * 2, 0.22, 'square', 0.16, 0.18);
    },
    alarm() {
      tone(880, 0.16, 'square', 0.16);
      tone(660, 0.16, 'square', 0.16, 0.18);
      tone(880, 0.16, 'square', 0.16, 0.36);
    },
    siren() {
      tone(700, 0.5, 'sine', 0.10, 0, 950);
      tone(950, 0.5, 'sine', 0.10, 0.5, 700);
    },
    engineStart() {
      tone(60, 0.5, 'sawtooth', 0.2, 0, 140);
      noise(0.4, 0.15, 500);
    },
    crash() {
      noise(0.3, 0.5, 700);
      tone(90, 0.25, 'square', 0.25, 0, 40);
    },
    busted() {
      tone(NOTE.A, 0.3, 'sawtooth', 0.2);
      tone(NOTE.E, 0.3, 'sawtooth', 0.2, 0.28);
      tone(NOTE.C, 0.5, 'sawtooth', 0.2, 0.56);
    },
    missionDone() {
      [NOTE.C, NOTE.E, NOTE.G, NOTE.C * 2].forEach((n, i) => tone(n, 0.22, 'triangle', 0.25, i * 0.11));
    },
    step() {
      noise(0.04, 0.06, 500);
    },
    setEngine(running, speed01) {
      if (!ensure()) return;
      if (running && !engineOsc) {
        engineOsc = ctx.createOscillator();
        engineOsc.type = 'sawtooth';
        engineGain = ctx.createGain();
        engineGain.gain.value = 0.0;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 420;
        engineOsc.connect(filter);
        filter.connect(engineGain);
        engineGain.connect(master);
        engineOsc.start();
      }
      if (engineOsc) {
        const target = running && !muted ? 0.05 + speed01 * 0.07 : 0;
        engineGain.gain.setTargetAtTime(target, ctx.currentTime, 0.1);
        engineOsc.frequency.setTargetAtTime(55 + speed01 * 110, ctx.currentTime, 0.1);
      }
    },
  };
}
