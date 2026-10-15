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
    for (let i = 0; i < totalRooms; i++) this.bar.append(document.createElement('i'));
  }

  show(v) { this.root.hidden = !v; }

  setRoom(name, accent) {
    this.room.textContent = name;
    document.documentElement.style.setProperty('--accent', accent || '#d9a85f');
  }

  setPrompt(text, key = 'E') {
    this.prompt.hidden = !text;
    if (!text) return;
    this.promptKey.textContent = key;
    this.promptKey.hidden = !key;
    this.promptText.textContent = text;
  }

  setCard(card) {
    this.card.hidden = !card;
    if (!card) return;
    this.cardTitle.textContent = card.title;
    this.cardText.textContent = card.text;
    this.card.style.setProperty('--card-accent', card.accent || '#d9a85f');
  }

  setProgress(progress) {
    const n = progress.visitedCount;
    [...this.bar.children].forEach((c, i) => c.classList.toggle('on', i < n));
    this.text.textContent = `${n} of ${this.total} rooms explored`;
  }

  showReturn(v) { this.ret.hidden = !v; }
  showCapture(v) { this.capture.hidden = !v; }
}
