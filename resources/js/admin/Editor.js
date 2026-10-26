import { el } from '../ui/dom.js';
import { api } from './api.js';
import { makeFields } from './fields.js';
import { setIn } from './util.js';
import { HouseBuilder3D } from './HouseBuilder3D.js';
import {
  projectsSection,
  house3DSection,
  specsSection,
} from './houseSections.js';
import { designerSection } from './designer/Designer.js';
import { mediaSection } from './library.js';
import { objectLibrarySection } from './library/objectLibrarySection.js';
import { syncLibrary } from '../scenes/custom/library.js';

const SECTIONS = [
  {
    id: 'builder3d',
    label: '🏗️ 3D House Builder',
    render: (ed) => {
      if (ed.active3DBuilder) {
        ed.active3DBuilder.dispose();
      }
      ed.active3DBuilder = new HouseBuilder3D(ed);
      return ed.active3DBuilder.render();
    },
    prefixes: ['floors'],
  },
  { id: 'projects', label: '🏠 House Projects', render: projectsSection, prefixes: [] },
  { id: 'specs', label: '📐 House Specs & Plot', render: specsSection, prefixes: ['title', 'plot_width', 'plot_depth'] },
  { id: 'designer', label: '✏️ Room Designer (3D & 2D)', render: designerSection, prefixes: [] },
  { id: 'viewer3d', label: '🎮 Live 3D House Tour', render: house3DSection, prefixes: [] },
  { id: 'library', label: '📚 3D Object Library', render: objectLibrarySection, prefixes: [] },
  { id: 'media', label: '🖼️ Media Library', render: mediaSection, prefixes: [] },
];

export class Editor {
  constructor(root) {
    this.root = root;
    this.house = null;
    this.allHouses = [];
    this.currentHouseId = null;
    this.state = null;
    this.meta = null;
    this.errors = {};
    this.dirty = false;
    this.saving = false;
    this.section = 'builder3d'; // Default to 3D House Builder!
    this.selectedFloorIdx = 0;
    this.selectedRoomIdx = 0;
    this.libCache = null;
    this.f = null;
    this.designIndex = 0;
    this.designers = new Map();
    this.active3DBuilder = null;
  }

  async init() {
    this.root.replaceChildren(el('p', { class: 'loading', text: 'Loading House Builder…' }));
    try {
      await this.loadHousesList();
      const firstId = this.allHouses[0]?.id;
      if (firstId) {
        await this.loadHouse(firstId);
      }
    } catch (e) {
      this.root.replaceChildren(el('p', { class: 'error', role: 'alert', text: e.message }));
      return;
    }

    this.buildShell();
    this.render();
    window.addEventListener('beforeunload', (e) => { if (this.dirty) { e.preventDefault(); e.returnValue = ''; } });
    window.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); this.save(); } });
  }

  async loadHousesList() {
    const data = await api('GET', '/admin/houses');
    this.allHouses = data.houses || [];
    if (Array.isArray(data.library)) syncLibrary(data.library);
  }

  async loadHouse(id) {
    const data = await api('GET', `/admin/houses/${id}`);
    this.house = data.house;
    this.currentHouseId = data.house.id;
    this.state = this.house;
    this.meta = data.meta || {};
    this.selectedFloorIdx = 0;
    this.selectedRoomIdx = 0;
    this.designers.clear();
    this.dirty = false;
    if (Array.isArray(data.library)) syncLibrary(data.library);
  }

  async switchHouse(id) {
    if (this.dirty && !confirm('You have unsaved changes. Discard and switch house project?')) return;
    this.root.replaceChildren(el('p', { class: 'loading', text: 'Switching house project…' }));
    await this.loadHouse(id);
    await this.loadHousesList();
    this.buildShell();
    this.render();
  }

  /* ------------------------------------------------------------ state */
  set(path, value) {
    setIn(this.state, path, value);
    this.markDirty();
  }

  markDirty() {
    if (!this.dirty) {
      this.dirty = true;
      this.updateStatus();
    }
  }

  hasErrorUnder(prefix) {
    return Object.keys(this.errors).some((k) => k === prefix || k.startsWith(`${prefix}.`));
  }

  /* ------------------------------------------------------------- save */
  async save() {
    if (this.saving || !this.house) return;
    this.saving = true;
    this.updateStatus();
    try {
      const payload = {
        title: this.house.title,
        description: this.house.description,
        status: this.house.status,
        plot_width: this.house.plot_width,
        plot_depth: this.house.plot_depth,
        environment: this.house.environment,
        floors: this.house.floors,
        stairs: this.house.stairs || this.house.environment?.stairs || [],
      };

      const res = await api('PUT', `/admin/houses/${this.house.id}`, payload);
      if (res.house) {
        const returnedFloors = res.house.floors || res.house.floors_data;
        if (returnedFloors && Array.isArray(returnedFloors) && returnedFloors.length) {
          this.house.floors = returnedFloors;
        }
        if (res.house.stairs) {
          this.house.stairs = res.house.stairs;
        }
        this.house.id = res.house.id;
        this.house.title = res.house.title;
        this.house.slug = res.house.slug;
        this.house.status = res.house.status;
        this.house.plot_width = res.house.plot_width;
        this.house.plot_depth = res.house.plot_depth;
        this.house.environment = res.house.environment;
        this.state = this.house;
      }
      this.errors = {};
      this.dirty = false;
      await this.loadHousesList();
      this.toast('House saved successfully!');
    } catch (e) {
      if (e.status === 422 && e.data?.errors) {
        this.errors = e.data.errors;
        this.toast(`${Object.keys(this.errors).length} field(s) need attention`, 'bad');
      } else {
        this.toast(e.message, 'bad');
      }
    } finally {
      this.saving = false;
      this.updateStatus();
      if (this.section !== 'builder3d') {
        this.render();
      }
    }
  }

  /* ------------------------------------------------------------ media */
  async library(force = false) {
    if (!force && this.libCache) return this.libCache;
    const { files } = await api('GET', '/admin/media');
    this.libCache = files;
    return files;
  }

  async upload(files) {
    const body = new FormData();
    files.forEach((f) => body.append('files[]', f));
    try {
      const res = await api('POST', '/admin/media', body);
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

    const houseSwitcher = el('select', {
      class: 'input',
      style: { maxWidth: '240px', padding: '4px 8px', fontSize: '0.88rem' },
      onchange: (e) => this.switchHouse(Number(e.target.value)),
    },
      ...this.allHouses.map((h) => el('option', { value: String(h.id), selected: h.id === this.currentHouseId, text: h.title })),
    );

    const view3dUrl = this.house?.slug ? `/house/${this.house.slug}` : '/';

    this.root.replaceChildren(
      el('header', { class: 'topbar' },
        el('div', { style: { display: 'flex', alignItems: 'center', gap: '12px' } },
          el('strong', { class: 'brand', text: '🏠 3D House Builder' }),
          this.allHouses.length > 1 ? houseSwitcher : null,
        ),
        this.statusEl,
        el('span', { class: 'topbar-actions' },
          el('a', { class: 'btn', href: view3dUrl, target: '_blank', rel: 'noopener', text: 'Open 3D House ↗' }),
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
        type: 'button',
        class: `nav-item${s.id === this.section ? ' active' : ''}`,
        'aria-current': s.id === this.section ? 'page' : null,
        onclick: () => {
          this.section = s.id;
          this.render();
        },
      }, s.label, n ? el('span', { class: 'badge-err', text: String(n) }) : null);
    }));
  }

  render({ focusKey, scrollToError } = {}) {
    if (!this.state) return;
    if (this.section !== 'builder3d' && this.active3DBuilder) {
      this.active3DBuilder.dispose();
      this.active3DBuilder = null;
    }
    const scroll = this.mainEl.scrollTop;
    this.f = makeFields(this);
    this.renderNav();
    const s = SECTIONS.find((x) => x.id === this.section);
    if (s.id === 'builder3d') {
      this.mainEl.replaceChildren(...[].concat(s.render(this, this.f)).filter(Boolean));
    } else {
      this.mainEl.replaceChildren(el('h1', { text: s.label }), ...[].concat(s.render(this, this.f)).filter(Boolean));
    }
    this.mainEl.scrollTop = scroll;
    if (focusKey) this.mainEl.querySelector(`.strings[data-key="${focusKey}"] .string-row:last-child input`)?.focus();
    if (scrollToError) this.mainEl.querySelector('.has-error input, .has-error textarea, .has-error select, .error')?.scrollIntoView?.({ block: 'center' });
  }
}
