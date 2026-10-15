import { $ } from './dom.js';

export class Loading {
  constructor() { this.root = $('loading'); this.fill = $('loading-fill'); this.text = $('loading-text'); }
  set(p, text) { this.fill.style.width = `${Math.round(p * 100)}%`; if (text) this.text.textContent = text; }
  hide() { this.root.classList.add('done'); setTimeout(() => { this.root.hidden = true; }, 600); }
}
