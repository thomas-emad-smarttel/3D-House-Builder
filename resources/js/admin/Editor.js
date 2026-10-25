import { el } from '../ui/dom.js';
import { api } from './api.js';
import { makeFields } from './fields.js';
import { pkey, setIn } from './util.js';
import { ownerSection, profileSection, skillsSection, timelineSection, contactSection, settingsSection } from './sections.js';
import { roomsSection, newCustomRoom } from './rooms.js';
import { designerSection } from './designer/Designer.js';
import { mediaSection, historySection } from './library.js';
import { objectLibrarySection } from './library/objectLibrarySection.js';
import { syncLibrary } from '../scenes/custom/library.js';

const SECTIONS = [
  { id: 'owner', label: 'Site and owner', render: ownerSection, prefixes: ['owner'] },
  { id: 'profile', label: 'Profile', render: profileSection, prefixes: ['profile'] },
  { id: 'skills', label: 'Skills', render: skillsSection, prefixes: ['skills'] },
  { id: 'timeline', label: 'Career timeline', render: timelineSection, prefixes: ['timeline'] },
  { id: 'contact', label: 'Contact and CV', render: contactSection, prefixes: ['contact', 'cv_file'] },
  { id: 'rooms', label: 'Rooms and projects', render: roomsSection, prefixes: ['rooms'] },
  { id: 'designer', label: 'Room designer', render: designerSection, prefixes: [] },
  { id: 'library', label: 'Object library', render: objectLibrarySection, prefixes: [] },
  { id: 'settings', label: 'Game settings', render: settingsSection, prefixes: ['settings'] },
  { id: 'media', label: 'Media library', render: mediaSection, prefixes: [] },
  { id: 'history', label: 'History and reset', render: historySection, prefixes: [] },
];

const clone = (v) => JSON.parse(JSON.stringify(v));

/** null -> '' so inputs behave; `overview` stays null when a room has none. */
function hydrate(content) {
  const walk = (v, key) => {
    if (Array.isArray(v)) return v.map((x) => walk(x));
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x, k)]));
    return v === null && key !== 'overview' && key !== 'layout' ? '' : v;
  };
  const c = walk(clone(content));
  for (const room of c.rooms ?? []) {
    for (const m of [room.overview, ...(room.modules ?? [])]) {
      if (!m) continue;
      m.features = (m.features ?? []).map((f) => (typeof f === 'string' ? { name: f, status: '' } : { name: f.name ?? '', status: f.status ?? '' }));
    }
  }
  return c;
}

/** Drops editor-only keys (leading underscore). The server sanitises everything else. */
function serialize(state) {
  const walk = (v) => {
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).filter(([k]) => !k.startsWith('_')).map(([k, x]) => [k, walk(x)]));
    return v;
  };
  return walk(state);
}

export class Editor {
  constructor(root, urls = {}) {
    this.root = root;
    this.urls = { content: '/admin/content', media: '/admin/media', revisions: '/admin/revisions', reset: '/admin/content/reset', ...urls };
    this.state = null; this.meta = null;
    this.errors = {}; this.dirty = false; this.saving = false;
    this.section = 'owner';
    this.openSet = new Set();
    this.libCache = null;
    this.f = null;
    this.designIndex = -1;
    this.designers = new Map();
  }

  async init() {
    this.root.replaceChildren(el('p', { class: 'loading', text: 'Loading your content…' }));
    try {
      const data = await api('GET', this.urls.content);
      this.meta = data.meta; this.state = hydrate(data.content);
      if (Array.isArray(data.library)) syncLibrary(data.library);
    } catch (e) {
      this.root.replaceChildren(el('p', { class: 'error', role: 'alert', text: e.message }));
      return;
    }
    this.buildShell();
    this.render();
    window.addEventListener('beforeunload', (e) => { if (this.dirty) { e.preventDefault(); e.returnValue = ''; } });
    window.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); this.save(); } });
  }

  /* ------------------------------------------------------------ state */
  set(path, value) { setIn(this.state, path, value); this.markDirty(); }

  markDirty() {
    if (!this.dirty) { this.dirty = true; this.updateStatus(); }
  }

  hasErrorUnder(prefix) {
    return Object.keys(this.errors).some((k) => k === prefix || k.startsWith(`${prefix}.`));
  }

  serialize() { return serialize(this.state); }

  newCustomRoom() { return newCustomRoom(this.state.rooms); }

  async replaceContent(data) {
    this.meta = data.meta; this.state = hydrate(data.content);
    if (Array.isArray(data.library)) syncLibrary(data.library);
    this.errors = {}; this.dirty = false; this.openSet.clear(); this.designers.clear();
    this.updateStatus(); this.render();
  }

  /* ------------------------------------------------------------- save */
  async save() {
    if (this.saving) return;
    this.saving = true; this.updateStatus();
    try {
      const res = await api('PUT', this.urls.content, { content: this.serialize() });
      this.meta = res.meta; this.state = hydrate(res.content);
      this.errors = {}; this.dirty = false;
      this.toast('Saved. Reload the game tab to see the changes.');
    } catch (e) {
      if (e.status === 422 && e.data?.errors) {
        this.errors = e.data.errors;
        const first = Object.keys(this.errors)[0];
        const layoutErr = Object.keys(this.errors).find((k) => /^rooms\.\d+\.layout/.test(k));
        const target = SECTIONS.find((s) => s.prefixes.some((p) => first === p || first.startsWith(`${p}.`)));
        if (layoutErr && (/^rooms\.\d+\.layout/.test(first) || !target)) {
          this.section = 'designer'; this.designIndex = Number(layoutErr.split('.')[1]);
        } else if (target) this.section = target.id;
        this.toast(`${Object.keys(this.errors).length} field(s) need attention`, 'bad');
      } else this.toast(e.message, 'bad');
    } finally {
      this.saving = false; this.updateStatus(); this.render({ scrollToError: true });
    }
  }

  /* ------------------------------------------------------------ media */
  async library(force = false) {
    if (!force && this.libCache) return this.libCache;
    const { files } = await api('GET', this.urls.media);
    this.libCache = files;
    return files;
  }

  async upload(files) {
    const body = new FormData();
    files.forEach((f) => body.append('files[]', f));
    try {
      const res = await api('POST', this.urls.media, body);
      this.libCache = null;
      this.toast(`Uploaded ${res.files.length} file(s)`);
      return res.files;
    } catch (e) {
      const first = e.data?.errors ? Object.values(e.data.errors)[0]?.[0] : null;
      this.toast(first || e.message, 'bad');
      return [];
    }
  }

  /* --------------------------------------------------------------- UI */
  buildShell() {
    this.statusEl = el('span', { class: 'status', role: 'status', 'aria-live': 'polite' });
    this.saveBtn = el('button', { type: 'button', class: 'btn btn-primary', onclick: () => this.save() }, 'Save changes');
    this.navEl = el('nav', { class: 'nav', 'aria-label': 'Sections' });
    this.mainEl = el('main', { class: 'main', id: 'main' });
    this.toastEl = el('div', { class: 'toast', role: 'status', 'aria-live': 'polite', hidden: true });
    const logout = document.getElementById('logout-form');
    this.root.replaceChildren(
      el('header', { class: 'topbar' },
        el('strong', { class: 'brand', text: 'Portfolio dashboard' }),
        this.statusEl,
        el('span', { class: 'topbar-actions' },
          el('a', { class: 'btn', href: this.meta.game_url, target: '_blank', rel: 'noopener', text: 'Open the game ↗' }),
          el('a', { class: 'btn', href: this.meta.cv_url, target: '_blank', rel: 'noopener', text: 'Open the CV ↗' }),
          this.saveBtn,
          logout ? el('button', { type: 'button', class: 'btn', onclick: () => logout.submit() }, 'Log out') : null)),
      el('div', { class: 'layout' }, this.navEl, this.mainEl),
      this.toastEl);
    this.updateStatus();
  }

  updateStatus() {
    if (!this.statusEl) return;
    this.statusEl.textContent = this.saving ? 'Saving…' : this.dirty ? 'Unsaved changes' : 'All changes saved';
    this.statusEl.classList.toggle('dirty', this.dirty && !this.saving);
    this.saveBtn.disabled = this.saving;
  }

  toast(message, kind = 'good') {
    if (!this.toastEl) return;
    this.toastEl.textContent = message;
    this.toastEl.className = `toast ${kind}`;
    this.toastEl.hidden = false;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { this.toastEl.hidden = true; }, 4200);
  }

  renderNav() {
    this.navEl.replaceChildren(...SECTIONS.map((s) => {
      const n = Object.keys(this.errors).filter((k) => s.prefixes.some((p) => k === p || k.startsWith(`${p}.`))).length;
      return el('button', {
        type: 'button', class: `nav-item${s.id === this.section ? ' active' : ''}`, 'aria-current': s.id === this.section ? 'page' : null,
        onclick: () => { this.section = s.id; this.render(); },
      }, s.label, n ? el('span', { class: 'badge-err', text: String(n) }) : null);
    }));
  }

  render({ focusKey, scrollToError } = {}) {
    if (!this.state) return;
    const scroll = this.mainEl.scrollTop;
    this.f = makeFields(this);
    this.renderNav();
    const s = SECTIONS.find((x) => x.id === this.section);
    this.mainEl.replaceChildren(el('h1', { text: s.label }), ...[].concat(s.render(this, this.f)).filter(Boolean));
    this.mainEl.scrollTop = scroll;
    if (focusKey) this.mainEl.querySelector(`.strings[data-key="${focusKey}"] .string-row:last-child input`)?.focus();
    if (scrollToError) this.mainEl.querySelector('.has-error input, .has-error textarea, .has-error select, .error')?.scrollIntoView?.({ block: 'center' });
  }
}
