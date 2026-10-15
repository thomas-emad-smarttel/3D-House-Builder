import { $, el, focusable } from './dom.js';

/** Welcome screen, controls modal and the pause menu (with quick travel). */
export class Menus {
  constructor({ audio, progress, data, onStart, onResume, onTravel }) {
    this.audio = audio; this.progress = progress; this.data = data;
    this.welcome = $('welcome');
    this.controls = $('controls-modal');
    this.pause = $('pause');
    this.restore = null;

    $('btn-start').addEventListener('click', () => onStart({ skip: $('chk-skip').checked }));
    $('btn-controls').addEventListener('click', () => this.openControls());
    $('controls-close').addEventListener('click', () => this.closeControls());
    $('pause-controls').addEventListener('click', () => this.openControls());
    $('pause-resume').addEventListener('click', () => onResume());
    this.onTravel = onTravel;

    const soundBtns = [$('btn-sound'), $('pause-sound'), $('hud-sound')];
    soundBtns.forEach((b) => b.addEventListener('click', () => { audio.toggle(); audio.ui(); }));
    audio.onChange((on) => {
      soundBtns.forEach((b) => {
        b.setAttribute('aria-pressed', String(on));
        b.textContent = b.id === 'hud-sound' ? (on ? 'Sound on' : 'Sound off') : `Sound: ${on ? 'on' : 'off'}`;
      });
    });

    this.buildRoomList();
    progress.onChange(() => this.buildRoomList());
    for (const modal of [this.controls, this.pause]) {
      modal.addEventListener('keydown', (e) => this.trap(e, modal));
    }
  }

  buildRoomList() {
    const list = $('pause-rooms');
    list.replaceChildren(
      el('li', {}, el('button', { class: 'room-item', type: 'button', onclick: () => this.onTravel('hub') },
        el('span', { class: 'room-dot', style: { background: '#d9a85f' } }), 'The Mansion entrance')),
      ...this.data.rooms.map((r) => el('li', {},
        el('button', { class: 'room-item', type: 'button', onclick: () => this.onTravel(r.id) },
          el('span', { class: 'room-dot', style: { background: r.accent } }),
          el('span', { class: 'room-name', text: r.name }),
          this.progress.hasRoom(r.id) ? el('span', { class: 'room-seen', text: 'Explored' }) : null))),
    );
  }

  trap(e, root) {
    if (e.key !== 'Tab') return;
    const f = focusable(root); if (!f.length) return;
    const first = f[0]; const last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  showWelcome() { this.welcome.hidden = false; $('btn-start').focus({ preventScroll: true }); }
  hideWelcome() { this.welcome.hidden = true; }

  get controlsOpen() { return !this.controls.hidden; }
  openControls() {
    this.restore = document.activeElement;
    this.controls.hidden = false;
    $('controls-close').focus();
  }
  closeControls() {
    this.controls.hidden = true;
    this.restore?.focus?.({ preventScroll: true });
  }

  get pauseOpen() { return !this.pause.hidden; }
  openPause() { this.pause.hidden = false; $('pause-resume').focus(); }
  closePause() { this.pause.hidden = true; }
}
