import { SETTINGS } from '../config/settings.js';

const GAME_KEYS = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'ShiftLeft', 'ShiftRight', 'Space',
]);
const isTyping = (t) => t instanceof Element && !!t.closest('input, textarea, select, [contenteditable="true"]');

/**
 * Keyboard + mouse + touch in one place.
 * Scheme: WASD walks/strafes, Up/Down walk, Left/Right TURN, mouse looks, Shift runs.
 * Every listener hangs off one AbortController so dispose() removes them all.
 */
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.lookX = 0;
    this.lookY = 0;
    this.joy = { x: 0, y: 0 };
    this.handlers = {};
    this.gameplay = false;   // true while keys should be swallowed for movement
    this.isTouch = (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in window;
    this.ac = new AbortController();
    this.bind();
  }

  on(name, fn) { (this.handlers[name] ||= []).push(fn); }
  emit(name, e) { (this.handlers[name] || []).forEach((fn) => fn(e)); }

  bind() {
    const o = { signal: this.ac.signal };

    window.addEventListener('keydown', (e) => {
      if (isTyping(e.target)) return;
      if (this.gameplay && GAME_KEYS.has(e.code)) e.preventDefault();
      if (e.repeat) return;
      this.keys.add(e.code);
      if (e.code === 'KeyE') this.emit('interact', e);
      else if (e.code === 'Escape') this.emit('escape', e);
      else if (e.code === 'KeyF') this.emit('fullscreen', e);
      else if (e.code === 'KeyM') this.emit('mute', e);
      else this.emit('anykey', e);
    }, o);
    window.addEventListener('keyup', (e) => this.keys.delete(e.code), o);
    window.addEventListener('blur', () => this.reset(), o);

    window.addEventListener('mousemove', (e) => {
      const locked = document.pointerLockElement === this.canvas;
      if (locked || (e.buttons & 1 && e.target === this.canvas)) {
        this.lookX += e.movementX || 0;
        this.lookY += e.movementY || 0;
      }
    }, o);
    this.canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') this.emit('canvasclick', e);
      this.emit('anyclick', e);
    }, o);

    this.bindTouch(o);
  }

  bindTouch(o) {
    const base = document.getElementById('joystick');
    const knob = document.getElementById('joystick-knob');
    const zone = document.getElementById('touch-look');
    const btn = document.getElementById('touch-interact');
    if (!base || !zone || !btn) return;

    const R = 48;
    let joyId = null; let cx = 0; let cy = 0;
    base.addEventListener('pointerdown', (e) => {
      joyId = e.pointerId; base.setPointerCapture(joyId);
      const r = base.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2;
      moveJoy(e);
    }, o);
    const moveJoy = (e) => {
      if (e.pointerId !== joyId) return;
      let dx = e.clientX - cx; let dy = e.clientY - cy;
      const len = Math.hypot(dx, dy);
      if (len > R) { dx = (dx / len) * R; dy = (dy / len) * R; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      this.joy.x = dx / R; this.joy.y = dy / R;
    };
    const endJoy = (e) => {
      if (e.pointerId !== joyId) return;
      joyId = null; knob.style.transform = ''; this.joy.x = 0; this.joy.y = 0;
    };
    base.addEventListener('pointermove', moveJoy, o);
    base.addEventListener('pointerup', endJoy, o);
    base.addEventListener('pointercancel', endJoy, o);

    let lookId = null; let lx = 0; let ly = 0;
    zone.addEventListener('pointerdown', (e) => { lookId = e.pointerId; zone.setPointerCapture(lookId); lx = e.clientX; ly = e.clientY; }, o);
    zone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== lookId) return;
      this.lookX += ((e.clientX - lx) * SETTINGS.player.touchSensitivity) / SETTINGS.player.mouseSensitivity;
      this.lookY += ((e.clientY - ly) * SETTINGS.player.touchSensitivity) / SETTINGS.player.mouseSensitivity;
      lx = e.clientX; ly = e.clientY;
    }, o);
    const endLook = (e) => { if (e.pointerId === lookId) lookId = null; };
    zone.addEventListener('pointerup', endLook, o);
    zone.addEventListener('pointercancel', endLook, o);

    btn.addEventListener('pointerdown', (e) => { e.preventDefault(); this.emit('interact', e); }, o);
  }

  /** Mouse/touch look since the last call. */
  consumeLook() {
    const l = { x: this.lookX, y: this.lookY };
    this.lookX = 0; this.lookY = 0;
    return l;
  }

  axes() {
    const k = this.keys;
    let x = (k.has('KeyD') ? 1 : 0) - (k.has('KeyA') ? 1 : 0) + this.joy.x;
    let z = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0) - this.joy.y;
    const len = Math.hypot(x, z);
    if (len > 1) { x /= len; z /= len; }
    const turn = (k.has('ArrowLeft') ? 1 : 0) - (k.has('ArrowRight') ? 1 : 0);
    const sprint = k.has('ShiftLeft') || k.has('ShiftRight') || Math.hypot(this.joy.x, this.joy.y) > 0.97;
    return { x, z, turn, sprint };
  }

  reset() {
    this.keys.clear(); this.joy.x = 0; this.joy.y = 0; this.lookX = 0; this.lookY = 0;
  }

  dispose() { this.ac.abort(); }
}
