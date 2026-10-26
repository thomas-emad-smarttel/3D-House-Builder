import { $ } from './dom.js';

/** In-game HUD: room name, progress, prompts and the proximity card on doors. */
export class Hud {
  constructor(totalRooms) {
    this.root = $('hud');
    this.room = $('hud-room');
    this.bar = $('hud-progress-bar');
    this.text = $('hud-progress-text');
    this.prompt = $('prompt');
    this.promptKey = $('prompt-key');
    this.promptText = $('prompt-text');
    this.card = $('room-card');
    this.cardTitle = $('room-card-title');
    this.cardText = $('room-card-text');
    this.ret = $('hud-return');
    this.capture = $('capture-hint');
    this.total = totalRooms;
    if (this.bar) {
      for (let i = 0; i < totalRooms; i++) this.bar.append(document.createElement('i'));
    }
  }

  show(v) { if (this.root) this.root.hidden = !v; }

  setRoom(name, accent) {
    if (this.room) this.room.textContent = name;
    document.documentElement.style.setProperty('--accent', accent || '#d9a85f');
  }

  setPrompt(text, key = 'E') {
    if (this.prompt) this.prompt.hidden = !text;
    if (!text) return;
    if (this.promptKey) {
      this.promptKey.textContent = key;
      this.promptKey.hidden = !key;
    }
    if (this.promptText) this.promptText.textContent = text;
  }

  setCard(card) {
    if (this.card) this.card.hidden = !card;
    if (!card) return;
    if (this.cardTitle) this.cardTitle.textContent = card.title;
    if (this.cardText) this.cardText.textContent = card.text;
    if (this.card) this.card.style.setProperty('--card-accent', card.accent || '#d9a85f');
  }

  setProgress(progress) {
    const n = progress.visitedCount;
    if (this.bar) {
      [...this.bar.children].forEach((c, i) => c.classList.toggle('on', i < n));
    }
    if (this.text) {
      this.text.textContent = `${n} of ${this.total} rooms explored`;
    }
  }

  showReturn(v) { if (this.ret) this.ret.hidden = !v; }
  showCapture(v) { if (this.capture) this.capture.hidden = !v; }
}
