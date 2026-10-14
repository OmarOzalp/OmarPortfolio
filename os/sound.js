// sound.js — tiny Web Audio synth for OzalpOS and the desk scene. No audio files:
// every sound is built from oscillators and filtered noise.
// Shared by the desk page and the OS iframe. Inside the iframe it borrows the parent's
// AudioContext (unlocked by the visitor's first click on the desk) so sounds can play
// before anyone clicks inside the screen. Mute state syncs through localStorage.

var OS = window.OS || (window.OS = {});

OS.sound = (function() {
  var KEY = 'ozalpos.muted';
  var _ctx = null, _master = null, _wet = null;
  var _muted = false;
  var _listeners = [];
  try { _muted = localStorage.getItem(KEY) === '1'; } catch (e) {}

  function context() {
    if (_ctx) return _ctx;
    try {
      if (window.parent !== window && window.parent.OS && window.parent.OS.sound) {
        _ctx = window.parent.OS.sound.context();
      }
    } catch (e) {}
    if (!_ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      _ctx = new AC();
    }
    _master = _ctx.createGain();
    _master.gain.value = 0.55;
    _master.connect(_ctx.destination);
    // A short feedback delay standing in for room reverb.
    var delay = _ctx.createDelay(1);
    delay.delayTime.value = 0.23;
    var fb = _ctx.createGain();
    fb.gain.value = 0.32;
    var damp = _ctx.createBiquadFilter();
    damp.type = 'lowpass';
    damp.frequency.value = 2600;
    _wet = _ctx.createGain();
    _wet.gain.value = 0.5;
    _wet.connect(delay);
    delay.connect(damp);
    damp.connect(fb);
    fb.connect(delay);
    damp.connect(_master);
    return _ctx;
  }

  function unlock() {
    var c = context();
    if (c && c.state === 'suspended') c.resume();
  }
  ['pointerdown', 'keydown', 'touchstart'].forEach(function(ev) {
    window.addEventListener(ev, unlock, { capture: true, passive: true });
  });

  function out(wet) {
    var g = _ctx.createGain();
    g.connect(_master);
    if (wet) g.connect(_wet);
    return g;
  }

  function tone(freq, t, dur, o) {
    o = o || {};
    var osc = _ctx.createOscillator();
    var g = _ctx.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(o.slideTo, t + dur);
    if (o.detune) osc.detune.value = o.detune;
    var peak = o.gain == null ? 0.3 : o.gain;
    var a = o.attack || 0.005;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    var node = osc;
    if (o.filter) {
      var f = _ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = o.filter;
      osc.connect(f);
      node = f;
    }
    node.connect(g);
    g.connect(o.dest || out(o.wet));
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  var _noiseBuf = null;
  function noise(t, dur, o) {
    o = o || {};
    if (!_noiseBuf) {
      _noiseBuf = _ctx.createBuffer(1, _ctx.sampleRate, _ctx.sampleRate);
      var d = _noiseBuf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    var src = _ctx.createBufferSource();
    src.buffer = _noiseBuf;
    var f = _ctx.createBiquadFilter();
    f.type = o.type || 'bandpass';
    f.frequency.setValueAtTime(o.freq || 2000, t);
    if (o.freqTo) f.frequency.exponentialRampToValueAtTime(o.freqTo, t + dur);
    f.Q.value = o.q || 1;
    var g = _ctx.createGain();
    g.gain.setValueAtTime(o.gain || 0.3, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(out(o.wet));
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.05);
  }

  var SOUNDS = {
    // A warm Cmaj7 pad under a rising bell arpeggio — the OzalpOS 98 startup chime.
    startup: function(t) {
      [130.81, 196.0, 329.63, 493.88].forEach(function(f, i) {
        tone(f, t, 3.4, { type: 'triangle', gain: 0.07, attack: 0.7, filter: 1600, wet: true, detune: i * 3 });
        tone(f * 1.003, t, 3.4, { type: 'sine', gain: 0.05, attack: 0.9, wet: true });
      });
      [659.25, 783.99, 987.77, 1174.66, 1567.98].forEach(function(f, i) {
        tone(f, t + 0.12 + i * 0.16, 1.6, { gain: 0.11, wet: true });
        tone(f * 2, t + 0.12 + i * 0.16, 0.6, { gain: 0.025, wet: true });
      });
      tone(1046.5, t + 1.05, 2.2, { gain: 0.08, wet: true, attack: 0.02 });
      tone(1568, t + 1.1, 2.0, { gain: 0.05, wet: true, attack: 0.02 });
    },
    shutdown: function(t) {
      [987.77, 783.99, 659.25, 523.25, 392].forEach(function(f, i) {
        tone(f, t + i * 0.17, 1.3, { gain: 0.1, wet: true });
      });
      [130.81, 196, 261.63].forEach(function(f) {
        tone(f, t + 0.2, 2.4, { type: 'triangle', gain: 0.07, attack: 0.4, filter: 1200, wet: true });
      });
    },
    ding: function(t) {
      tone(1318.5, t, 0.9, { gain: 0.18, wet: true });
      tone(2637, t, 0.35, { gain: 0.04 });
    },
    chord: function(t) {
      [523.25, 659.25, 783.99].forEach(function(f) { tone(f, t, 0.8, { type: 'triangle', gain: 0.09, wet: true }); });
    },
    click: function(t) { noise(t, 0.03, { freq: 3500, q: 2, gain: 0.25 }); },
    open: function(t) { tone(880, t, 0.08, { type: 'square', gain: 0.03, filter: 2500 }); tone(1320, t + 0.05, 0.1, { type: 'square', gain: 0.025, filter: 2500 }); },
    card: function(t) { noise(t, 0.06, { freq: 2400, q: 0.8, gain: 0.35 }); },
    flip: function(t) { noise(t, 0.05, { freq: 5000, q: 1.5, gain: 0.2 }); noise(t + 0.03, 0.04, { freq: 1800, gain: 0.15 }); },
    shuffle: function(t) { for (var i = 0; i < 12; i++) noise(t + i * 0.035, 0.05, { freq: 2000 + Math.random() * 3000, gain: 0.18 }); },
    tada: function(t) {
      [523.25, 659.25, 783.99, 1046.5].forEach(function(f, i) { tone(f, t + i * 0.09, 0.9, { type: 'triangle', gain: 0.12, wet: true }); });
      [1046.5, 1318.5, 1568].forEach(function(f) { tone(f, t + 0.45, 1.4, { type: 'square', gain: 0.03, filter: 3000, wet: true }); });
    },
    boom: function(t) {
      noise(t, 0.9, { type: 'lowpass', freq: 900, freqTo: 60, gain: 0.8 });
      tone(90, t, 0.5, { gain: 0.4, slideTo: 30 });
    },
    reveal: function(t) { tone(1200, t, 0.03, { type: 'square', gain: 0.03, filter: 3000 }); },
    flag: function(t) { tone(700, t, 0.06, { type: 'square', gain: 0.04, filter: 2000 }); tone(1050, t + 0.05, 0.06, { type: 'square', gain: 0.04, filter: 2000 }); },
    eat: function(t) { tone(520, t, 0.09, { type: 'square', gain: 0.06, slideTo: 1040, filter: 3000 }); },
    die: function(t) { tone(440, t, 0.6, { type: 'sawtooth', gain: 0.08, slideTo: 70, filter: 1500 }); },
    beep: function(t) { tone(1000, t, 0.18, { type: 'square', gain: 0.05, filter: 4000 }); },
    // Hard-drive chatter during boot.
    hdd: function(t) {
      for (var i = 0; i < 26; i++) {
        var at = t + i * 0.07 + Math.random() * 0.05;
        noise(at, 0.018, { freq: 3000 + Math.random() * 2500, q: 4, gain: 0.12 + Math.random() * 0.1 });
      }
    },
    // Desk-scene sounds.
    power: function(t) {
      noise(t, 0.05, { freq: 1500, q: 1, gain: 0.5 });
      tone(60, t + 0.02, 0.35, { gain: 0.25, slideTo: 40 });
    },
    degauss: function(t) {
      tone(15734, t + 0.05, 2.5, { gain: 0.012, attack: 0.3 });
      tone(55, t, 0.8, { type: 'sawtooth', gain: 0.12, filter: 300, slideTo: 45 });
      noise(t, 0.6, { type: 'lowpass', freq: 400, gain: 0.25 });
    },
    whoosh: function(t) { noise(t, 0.5, { freq: 500, freqTo: 1800, q: 0.6, gain: 0.06 }); },
    pick: function(t) { noise(t, 0.05, { freq: 900, q: 1, gain: 0.25 }); tone(220, t, 0.08, { gain: 0.06 }); },

    // OZ BOY (the handheld on phones): square-wave chiptune blips.
    blip: function(t) { sq(1480, t, 0.035, 0.03); },
    select: function(t) { sq(988, t, 0.05, 0.04); sq(1319, t + 0.055, 0.08, 0.04); },
    back: function(t) { sq(784, t, 0.05, 0.04); sq(523, t + 0.055, 0.08, 0.04); },
    bump: function(t) { sq(140, t, 0.07, 0.05, 900); },
    toggle: function(t) { noise(t, 0.015, { freq: 4200, q: 3, gain: 0.3 }); noise(t + 0.05, 0.015, { freq: 3000, q: 3, gain: 0.22 }); },
    bootding: function(t) {
      sq(1046.5, t, 0.09, 0.05);
      sq(2093, t + 0.1, 1.1, 0.045);
      tone(2093, t + 0.1, 1.3, { gain: 0.05 });
    },
    lift: function(t) { noise(t, 0.18, { freq: 700, freqTo: 1600, q: 0.7, gain: 0.08 }); },
    putdown: function(t) { noise(t, 0.04, { freq: 600, q: 1, gain: 0.3 }); tone(160, t, 0.08, { gain: 0.05 }); },
    step: function(t) { noise(t, 0.02, { freq: 1300, q: 2, gain: 0.07 }); },
    door: function(t) { sq(392, t, 0.07, 0.04); sq(523, t + 0.08, 0.07, 0.04); sq(784, t + 0.16, 0.12, 0.04); },
    cast: function(t) { noise(t, 0.3, { freq: 900, freqTo: 3200, q: 0.8, gain: 0.12 }); sq(660, t, 0.25, 0.02, 2000); },
    splash: function(t) { noise(t, 0.4, { type: 'lowpass', freq: 1600, freqTo: 250, gain: 0.45 }); },
    bite: function(t) { sq(1760, t, 0.04, 0.05); sq(1760, t + 0.07, 0.04, 0.05); },
    reel: function(t) { noise(t, 0.018, { freq: 2600, q: 6, gain: 0.14 }); },
    snap: function(t) { noise(t, 0.08, { freq: 5000, q: 1, gain: 0.35 }); sq(330, t + 0.04, 0.35, 0.05, 1500); },
    catch: function(t) {
      [523.25, 659.25, 783.99, 1046.5].forEach(function(f, i) { sq(f, t + i * 0.08, 0.1, 0.045); });
      sq(1318.5, t + 0.34, 0.45, 0.045); sq(1046.5, t + 0.34, 0.45, 0.03);
    },
    lose: function(t) { [659.25, 587.33, 523.25, 392].forEach(function(f, i) { sq(f, t + i * 0.13, 0.14, 0.04); }); },
    win: function(t) { [784, 988, 1175, 1568].forEach(function(f, i) { sq(f, t + i * 0.07, 0.12, 0.04); }); },
    // A cartridge sliding into the slot and seating with a clunk, and popping back out.
    cartin: function(t) {
      noise(t, 0.32, { freq: 1400, freqTo: 700, q: 0.9, gain: 0.07 });
      noise(t + 0.43, 0.07, { type: 'lowpass', freq: 900, gain: 0.55 });
      tone(115, t + 0.43, 0.12, { gain: 0.22, slideTo: 80 });
      noise(t + 0.47, 0.02, { freq: 3800, q: 3, gain: 0.25 });
    },
    eject: function(t) {
      noise(t, 0.03, { freq: 3200, q: 3, gain: 0.3 });
      tone(260, t + 0.01, 0.1, { type: 'triangle', gain: 0.1, slideTo: 620 });
      noise(t + 0.08, 0.3, { freq: 800, freqTo: 1800, q: 0.8, gain: 0.06 });
    }
  };

  // A short, dry square-wave note for the handheld.
  function sq(freq, t, dur, gain, filter) {
    tone(freq, t, dur, { type: 'square', gain: gain, filter: filter || 3500, attack: 0.003 });
  }

  function play(name) {
    if (_muted || !SOUNDS[name]) return;
    var c = context();
    if (!c) return;
    if (c.state === 'suspended') c.resume();
    try { SOUNDS[name](c.currentTime + 0.01); } catch (e) {}
  }

  function setMuted(m) {
    _muted = !!m;
    try { localStorage.setItem(KEY, _muted ? '1' : '0'); } catch (e) {}
    _listeners.forEach(function(fn) { fn(_muted); });
  }

  window.addEventListener('storage', function(e) {
    if (e.key !== KEY) return;
    _muted = e.newValue === '1';
    _listeners.forEach(function(fn) { fn(_muted); });
  });

  return {
    play: play,
    context: context,
    isMuted: function() { return _muted; },
    setMuted: setMuted,
    toggle: function() { setMuted(!_muted); },
    onChange: function(fn) { _listeners.push(fn); }
  };
})();
