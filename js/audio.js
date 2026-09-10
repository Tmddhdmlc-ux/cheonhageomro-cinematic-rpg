(function (W) {
  "use strict";
  class AudioEngine {
    constructor() { this.ctx = null; this.enabled = true; this.master = null; }
    unlock() {
      if (!this.enabled) return;
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain(); this.master.gain.value = .2; this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === "suspended") this.ctx.resume();
    }
    tone(type, f0, f1, dur, gain, delay = 0) {
      if (!this.enabled) return;
      this.unlock(); if (!this.ctx) return;
      const t = this.ctx.currentTime + delay;
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
      g.gain.setValueAtTime(.001, t); g.gain.exponentialRampToValueAtTime(gain, t + .008); g.gain.exponentialRampToValueAtTime(.001, t + dur);
      o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + .02);
    }
    noise(dur, gain, filterFreq, delay = 0) {
      if (!this.enabled) return;
      this.unlock(); if (!this.ctx) return;
      const t = this.ctx.currentTime + delay, len = Math.floor(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, .8);
      const s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
      s.buffer = buf; f.type = "bandpass"; f.frequency.value = filterFreq; f.Q.value = .7; g.gain.value = gain;
      s.connect(f); f.connect(g); g.connect(this.master); s.start(t);
    }
    dash() { this.noise(.16, .35, 900); this.tone("sine", 180, 70, .13, .25); }
    slash(light = false) { this.noise(light ? .1 : .18, light ? .2 : .34, light ? 2400 : 1600); this.tone("sawtooth", light ? 700 : 520, 120, light ? .08 : .14, .08); }
    hit(power = 1, crit = false) { this.noise(.12 + power * .05, .25 + power * .18, 280 + power * 160); this.tone("square", crit ? 160 : 110, 45, .12 + power * .06, .18); if (crit) this.tone("triangle", 1300, 430, .18, .1, .015); }
    charge() { this.tone("sine", 90, 560, .55, .14); this.tone("triangle", 180, 720, .48, .05, .08); }
    thunder() { this.noise(.85, .7, 120); this.tone("sawtooth", 80, 28, .65, .32); }
    toggle() { this.enabled = !this.enabled; if (this.enabled) this.unlock(); return this.enabled; }
  }
  W.AudioEngine = AudioEngine;
})(window.Wuxia);
