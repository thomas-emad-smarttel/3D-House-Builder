import { SETTINGS } from '../config/settings.js';

/**
 * Fully procedural audio (Web Audio): no files to download, nothing plays until
 * the visitor presses Start (the AudioContext is only created then).
 */
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.enabled = this.readPref();
    this.started = false;
    this.pad = null;
    this.listeners = new Set();
  }

  readPref() {
    try { return localStorage.getItem('portfolio-sound') === 'on'; } catch { return false; }
  }
  writePref() { try { localStorage.setItem('portfolio-sound', this.enabled ? 'on' : 'off'); } catch { /* ignore */ } }
  onChange(fn) { this.listeners.add(fn); fn(this.enabled); }

  /** Must be called from a user gesture (the Start button). */
  init() {
    if (this.ctx) { this.ctx.resume?.(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.enabled ? SETTINGS.audio.masterVolume : 0;
    this.master.connect(this.ctx.destination);

    // reusable noise buffer
    const len = this.ctx.sampleRate * 0.6;
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    this.buildPad();
    this.started = true;
  }

  setEnabled(on) {
    this.enabled = on;
    this.writePref();
    if (this.master) {
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.linearRampToValueAtTime(on ? SETTINGS.audio.masterVolume : 0, t + 0.25);
    }
    this.listeners.forEach((fn) => fn(on));
  }
  toggle() { this.setEnabled(!this.enabled); return this.enabled; }

  /* Ambient pad: three detuned oscillators through a slow low-pass. */
  buildPad() {
    const c = this.ctx;
    const out = c.createGain(); out.gain.value = 0.0;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520; lp.Q.value = 0.7;
    const lfo = c.createOscillator(); lfo.frequency.value = 0.06;
    const lfoGain = c.createGain(); lfoGain.gain.value = 180;
    lfo.connect(lfoGain).connect(lp.frequency); lfo.start();
    const oscs = [1, 1.5, 2.005].map((mul, i) => {
      const o = c.createOscillator();
      o.type = i === 0 ? 'sine' : 'triangle';
      o.frequency.value = 110 * mul;
      const g = c.createGain(); g.gain.value = i === 0 ? 0.5 : 0.22;
      o.connect(g).connect(lp); o.start();
      return { o, mul };
    });
    lp.connect(out).connect(this.master);
    out.gain.linearRampToValueAtTime(0.17, c.currentTime + 4);
    this.pad = { oscs, lp, out };
  }

  /** Each room tints the pad: { base: Hz, bright: 0..1 } */
  ambient({ base = 110, bright = 0.4 } = {}) {
    if (!this.pad) return;
    const t = this.ctx.currentTime;
    this.pad.oscs.forEach(({ o, mul }) => o.frequency.linearRampToValueAtTime(base * mul, t + 2.5));
    this.pad.lp.frequency.linearRampToValueAtTime(380 + bright * 900, t + 2.5);
  }

  env(node, peak, a, d) {
    const t = this.ctx.currentTime;
    node.gain.setValueAtTime(0.0001, t);
    node.gain.exponentialRampToValueAtTime(peak, t + a);
    node.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  burst({ freq, q = 1, type = 'bandpass', peak = 0.4, a = 0.005, d = 0.12, rate = 1, delay = 0 }) {
    if (!this.started || !this.enabled) return;
    const c = this.ctx;
    const src = c.createBufferSource(); src.buffer = this.noise; src.playbackRate.value = rate;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain();
    src.connect(f).connect(g).connect(this.master);
    const t = c.currentTime + delay;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    src.start(t); src.stop(t + a + d + 0.05);
  }

  tone({ freq, type = 'sine', peak = 0.2, a = 0.005, d = 0.15, slide = 0, delay = 0 }) {
    if (!this.started || !this.enabled) return;
    const c = this.ctx;
    const o = c.createOscillator(); o.type = type;
    const t = c.currentTime + delay;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + a + d);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    o.connect(g).connect(this.master);
    o.start(t); o.stop(t + a + d + 0.05);
  }

  footstep(sprint = false, floor = 'wood') {
    const f = { wood: 220, marble: 420, rubber: 150, carpet: 120, metal: 600 }[floor] ?? 220;
    this.burst({ freq: f * (0.85 + Math.random() * 0.3), q: 0.9, peak: sprint ? 0.5 : 0.34, d: 0.09, rate: 0.8 + Math.random() * 0.4 });
  }
  jump() {
    this.burst({ freq: 280, q: 0.8, type: 'bandpass', peak: 0.38, a: 0.01, d: 0.12, rate: 0.9 });
    this.tone({ freq: 140, type: 'sine', peak: 0.18, a: 0.01, d: 0.15, slide: 90 });
  }
  door() {
    this.burst({ freq: 300, q: 0.5, type: 'lowpass', peak: 0.5, a: 0.05, d: 0.7, rate: 0.5 });
    this.tone({ freq: 90, peak: 0.3, a: 0.02, d: 0.5, slide: -40, delay: 0.05 });
  }
  whoosh() {
    this.burst({ freq: 400, q: 0.4, type: 'lowpass', peak: 0.55, a: 0.9, d: 1.1, rate: 0.9 });
    this.tone({ freq: 70, type: 'sawtooth', peak: 0.18, a: 0.8, d: 1.2, slide: 120 });
  }
  ui() { this.tone({ freq: 880, type: 'triangle', peak: 0.12, a: 0.004, d: 0.09, slide: 240 }); }
  open() { this.tone({ freq: 520, type: 'triangle', peak: 0.12, a: 0.01, d: 0.18, slide: 380 }); this.tone({ freq: 780, type: 'sine', peak: 0.08, a: 0.01, d: 0.25, delay: 0.07 }); }
  close() { this.tone({ freq: 620, type: 'triangle', peak: 0.1, a: 0.01, d: 0.16, slide: -300 }); }
}
