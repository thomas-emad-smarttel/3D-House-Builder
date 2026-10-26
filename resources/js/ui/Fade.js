import { $ } from './dom.js';
import { prefersReducedMotion } from '../config/settings.js';

/** Full-screen colour wipe used for room transitions (optionally with a title card). */
export class Fade {
  constructor() {
    this.root = $('fade');
    this.title = $('fade-title');
  }

  wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

  async out(ms = 600, { color = '#05070a', title = null } = {}) {
    if (!this.root) return;
    if (prefersReducedMotion()) ms = Math.min(ms, 250);
    this.root.style.setProperty('--fade-color', color);
    this.root.style.transitionDuration = `${ms}ms`;
    if (this.title) {
      this.title.textContent = title ?? '';
      this.title.classList.toggle('on', !!title);
    }
    this.root.classList.add('on');
    await this.wait(ms + (title ? 450 : 40));
  }

  async in(ms = 600) {
    if (!this.root) return;
    if (prefersReducedMotion()) ms = Math.min(ms, 250);
    this.root.style.transitionDuration = `${ms}ms`;
    if (this.title) this.title.classList.remove('on');
    this.root.classList.remove('on');
    await this.wait(ms);
  }
}
