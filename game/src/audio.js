// Solmar Bay — all sound is synthesised with WebAudio: engine hum,
// police siren, gunshots, punches and cash blips. No audio files.
(function () {
  'use strict';

  var SB = window.SB;

  function makeAudio() {
    var ctx = null;
    var master = null;
    var engineOsc = null, engineOsc2 = null, engineGain = null;
    var sirenOsc = null, sirenGain = null, sirenTimer = 0;
    var muted = false;

    function ensure() {
      if (ctx) {
        if (ctx.state === 'suspended') ctx.resume();
        return true;
      }
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = 0.5;
        master.connect(ctx.destination);
        // engine: sawtooth + sub sine through a low gain
        engineOsc = ctx.createOscillator();
        engineOsc.type = 'sawtooth';
        engineOsc.frequency.value = 55;
        engineOsc2 = ctx.createOscillator();
        engineOsc2.type = 'sine';
        engineOsc2.frequency.value = 28;
        engineGain = ctx.createGain();
        engineGain.gain.value = 0;
        var filt = ctx.createBiquadFilter();
        filt.type = 'lowpass';
        filt.frequency.value = 420;
        engineOsc.connect(filt); engineOsc2.connect(filt);
        filt.connect(engineGain); engineGain.connect(master);
        engineOsc.start(); engineOsc2.start();
        // siren: square wave that alternates tone
        sirenOsc = ctx.createOscillator();
        sirenOsc.type = 'square';
        sirenOsc.frequency.value = 720;
        sirenGain = ctx.createGain();
        sirenGain.gain.value = 0;
        sirenOsc.connect(sirenGain); sirenGain.connect(master);
        sirenOsc.start();
      } catch (e) { ctx = null; return false; }
      return true;
    }

    function noiseBurst(dur, freq, vol) {
      if (!ensure()) return;
      var len = Math.floor(ctx.sampleRate * dur);
      var buf = ctx.createBuffer(1, len, ctx.sampleRate);
      var data = buf.getChannelData(0);
      for (var i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      var src = ctx.createBufferSource();
      src.buffer = buf;
      var f = ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = freq;
      var g = ctx.createGain(); g.gain.value = vol;
      src.connect(f); f.connect(g); g.connect(master);
      src.start();
    }

    function blip(freq, dur, vol, type) {
      if (!ensure()) return;
      var o = ctx.createOscillator();
      o.type = type || 'sine';
      o.frequency.value = freq;
      var g = ctx.createGain();
      g.gain.setValueAtTime(vol, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      o.connect(g); g.connect(master);
      o.start();
      o.stop(ctx.currentTime + dur);
    }

    return {
      unlock: ensure,
      toggleMute: function () {
        muted = !muted;
        if (master) master.gain.value = muted ? 0 : 0.5;
        return muted;
      },
      setEngine: function (speed01, on) {
        if (!ensure()) return;
        var target = on ? 0.05 + speed01 * 0.09 : 0;
        engineGain.gain.setTargetAtTime(target, ctx.currentTime, 0.1);
        engineOsc.frequency.setTargetAtTime(55 + speed01 * 130, ctx.currentTime, 0.1);
        engineOsc2.frequency.setTargetAtTime(28 + speed01 * 60, ctx.currentTime, 0.1);
      },
      setSiren: function (on, dt) {
        if (!ensure()) return;
        if (!on) { sirenGain.gain.setTargetAtTime(0, ctx.currentTime, 0.2); return; }
        sirenGain.gain.setTargetAtTime(0.045, ctx.currentTime, 0.2);
        sirenTimer += dt;
        var hi = Math.floor(sirenTimer * 1.6) % 2 === 0;
        sirenOsc.frequency.setTargetAtTime(hi ? 950 : 700, ctx.currentTime, 0.05);
      },
      gunshot: function () { noiseBurst(0.14, 1800, 0.5); blip(120, 0.08, 0.3, 'square'); },
      punch: function () { noiseBurst(0.09, 700, 0.4); },
      cash: function () { blip(880, 0.12, 0.3); setTimeout(function () { blip(1320, 0.18, 0.3); }, 90); },
      pickup: function () { blip(660, 0.1, 0.25); setTimeout(function () { blip(990, 0.12, 0.25); }, 70); },
      crash: function () { noiseBurst(0.25, 500, 0.5); },
      click: function () { blip(1200, 0.05, 0.2, 'square'); },
    };
  }

  SB.makeAudio = makeAudio;
})();
