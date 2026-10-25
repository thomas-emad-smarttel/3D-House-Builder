import { el } from '../../ui/dom.js';
import { makeFields } from '../fields.js';
import catalog, { typeDef, footprint, defaultParams, newLayout, newObject, snapToWall, optionsOf, ROTATIONS } from '../../scenes/custom/catalog.js';
import { analyze, objectLabel, overlaps } from './analysis.js';

const NS = 'http://www.w3.org/2000/svg';
const S = 40;      // pixels per metre on the plan
const PAD = 1;     // metres of margin around the room
const FLOOR_FILL = { wood: '#a07a52', marble: '#e3e0d8', tile: '#c9c6bf', graphite: '#2a2e35', ink: '#141a26', rubber: '#1d1f23', carpet: '#2c3340' };
const WALL_PULL = 1.4; // wall objects snap to a wall when released this close

const svgEl = (tag, attrs = {}, ...kids) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== null && v !== undefined && v !== false) n.setAttribute(k, v);
  kids.forEach((c) => c && n.append(c));
  return n;
};
const snapTo = (v, step) => Math.round(v / step) * step;
const r2 = (v) => Math.round(v * 100) / 100;
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** Footprint that never returns NaN, even while a number field is empty mid-typing. */
function fp(o, rot = o.rot) {
  try {
    const f = footprint(o.type, o.p, rot);
    if (f.w > 0 && f.d > 0) return f;
  } catch { /* fall through */ }
  return { w: 1, d: 1 };
}

export class Designer {
  constructor(ed, roomIndex) {
    this.ed = ed;
    this.ri = roomIndex;
    this.selected = null;
    this.tab = 'object';
    this.showWalk = false;
    this.undoStack = []; this.redoStack = [];
    this.last = null;
    this.baselineTaken = false;
    this.nudgeAt = 0;
  }

  get room() { return this.ed.state.rooms[this.ri]; }
  get layout() { return this.room.layout; }
  objectIndex(id) { return this.layout.objects.findIndex((o) => o.id === id); }
  sel() { return this.layout.objects.find((o) => o.id === this.selected) ?? null; }

  ensure() {
    const base = newLayout();
    const L = this.room.layout && typeof this.room.layout === 'object' ? this.room.layout : (this.room.layout = base);
    L.size = { ...base.size, ...(L.size ?? {}) };
    L.theme = { ...base.theme, ...(L.theme ?? {}) };
    if (!Array.isArray(L.objects)) L.objects = [];
  }

  /* ------------------------------------------------------------- layout */
  build() {
    this.ensure();
    this.undoBtn = el('button', { type: 'button', class: 'btn btn-small', onclick: () => this.undo() }, '↶ Undo');
    this.redoBtn = el('button', { type: 'button', class: 'btn btn-small', onclick: () => this.redo() }, '↷ Redo');
    this.svg = svgEl('svg', { class: 'plan', tabindex: '0', role: 'application', 'aria-label': 'Room floor plan. Arrow keys move the selected object, R rotates it, Delete removes it.' });
    this.inspectorEl = el('aside', { class: 'inspector', 'aria-label': 'Properties' });
    this.issuesEl = el('div', { class: 'issues', role: 'status', 'aria-live': 'polite' });

    const walk = el('input', { type: 'checkbox', id: 'walk-toggle' });
    walk.checked = this.showWalk;
    walk.addEventListener('change', () => { this.showWalk = walk.checked; this.refreshAnalysis(); });

    this.root = el('div', { class: 'designer' },
      el('div', { class: 'designer-toolbar' },
        this.undoBtn, this.redoBtn,
        el('label', { class: 'toggle', for: 'walk-toggle' }, walk, el('span', { text: 'Show where visitors can walk' })),
        el('button', { type: 'button', class: 'btn btn-small', onclick: () => this.autoPlaceModules() }, 'Add displays for all modules'),
        el('button', { type: 'button', class: 'btn btn-small', onclick: () => { this.ed.openSet.add(`rooms.${this.ri}`); this.ed.section = 'rooms'; this.ed.render(); } }, 'Room name, colour and modules…'),
        el('button', { type: 'button', class: 'btn btn-small btn-primary', onclick: () => this.saveAndTest() }, 'Save and test in game ↗')),
      el('div', { class: 'designer-body' },
        this.paletteEl(),
        el('div', { class: 'plan-wrap' }, this.svg,
          el('p', { class: 'hint', text: 'Drag objects to move them. Wall items snap to walls. Alt = fine placement. ↑↓←→ nudge, R rotate, D duplicate, Delete remove, Ctrl+Z undo.' })),
        this.inspectorEl),
      this.issuesEl);

    this.bindPlan();
    this.bindInspector();
    this.drawPlan();
    this.renderInspector();
    this.refreshAnalysis();
    this.updateToolbar();
    return this.root;
  }

  paletteEl() {
    const box = el('aside', { class: 'palette', 'aria-label': 'Objects to add' }, el('h3', { text: 'Add to the room' }));
    for (const group of catalog.groups) {
      const types = Object.entries(catalog.types).filter(([, d]) => d.group === group);
      if (!types.length) continue;
      box.append(el('h4', { text: group }), el('div', { class: 'palette-group' }, types.map(([type, def]) => el('button', {
        type: 'button', class: 'palette-item', title: def.label, 'data-type': type, onclick: () => this.addObject(type),
      }, el('span', { class: 'palette-icon', style: { color: def.color }, text: def.icon }), el('span', { text: def.label })))));
    }
    return box;
  }

  /* --------------------------------------------------------------- plan */
  X(x) { return (x + this.layout.size.w / 2 + PAD) * S; }
  Z(z) { return (z + this.layout.size.d / 2 + PAD) * S; }

  drawPlan() {
    const { w, d } = this.layout.size;
    this.vbW = (w + PAD * 2) * S; this.vbH = (d + PAD * 2) * S;
    this.svg.setAttribute('viewBox', `0 0 ${this.vbW} ${this.vbH}`);
    this.svg.replaceChildren();
    const L = this.layout;

    this.svg.append(svgEl('rect', { x: this.X(-w / 2), y: this.Z(-d / 2), width: w * S, height: d * S, fill: FLOOR_FILL[L.theme.floor] ?? '#999', class: 'plan-floor' }));
    let grid = '';
    for (let i = 1; i < w; i++) grid += `M${this.X(-w / 2 + i)} ${this.Z(-d / 2)}V${this.Z(d / 2)}`;
    for (let j = 1; j < d; j++) grid += `M${this.X(-w / 2)} ${this.Z(-d / 2 + j)}H${this.X(w / 2)}`;
    this.svg.append(svgEl('path', { d: grid, class: 'plan-grid' }));

    // entrance clearance (solid objects may not go here) and the visitor's start
    this.svg.append(svgEl('rect', { x: this.X(-1.7), y: this.Z(d / 2 - 3.6), width: 3.4 * S, height: 3.6 * S, class: 'plan-clear' }));
    this.walkLayer = svgEl('g', { class: 'plan-walk' });
    this.svg.append(this.walkLayer);

    this.objLayer = svgEl('g');
    this.svg.append(this.objLayer);
    this.gs = new Map();
    const ordered = [...L.objects].sort((a, b) => (a.type === 'rug' ? 0 : 1) - (b.type === 'rug' ? 0 : 1));
    ordered.forEach((o) => { const g = this.objectG(o); this.gs.set(o.id, g); this.objLayer.append(g); });

    this.svg.append(
      svgEl('rect', { x: this.X(-w / 2), y: this.Z(-d / 2), width: w * S, height: d * S, class: 'plan-walls', fill: 'none' }),
      svgEl('line', { x1: this.X(-1.34), x2: this.X(1.34), y1: this.Z(d / 2), y2: this.Z(d / 2), class: 'plan-door' }),
      svgEl('text', { x: this.X(0), y: this.Z(d / 2) + 22, class: 'plan-label', 'text-anchor': 'middle' }, document.createTextNode('Entrance and exit')),
      svgEl('circle', { cx: this.X(0), cy: this.Z(d / 2 - 2.4), r: 7, class: 'plan-spawn' }),
      svgEl('text', { x: this.X(0) + 12, y: this.Z(d / 2 - 2.4) + 4, class: 'plan-label' }, document.createTextNode('You start here')));
    this.applySelection();
    if (this.showWalk && this.last?.cells) this.drawWalkLayer();
  }

  objectG(o) {
    const def = typeDef(o.type);
    const g = svgEl('g', { class: 'obj', 'data-id': o.id, transform: `translate(${this.X(o.x)} ${this.Z(o.z)}) rotate(${-o.rot})` });
    if (!def) return g;
    const f = fp(o, 0);
    const wallItem = def.wall;
    const wPx = f.w * S; const dPx = (wallItem ? Math.max(f.d, 0.32) : f.d) * S;
    const color = (def.params.color && o.p.color) || def.color;
    const fill = o.type === 'rug' ? `${color}` : color;
    const common = { fill, 'fill-opacity': o.type === 'rug' ? 0.55 : 0.92, class: 'obj-shape' };
    g.append(def.shape === 'circle'
      ? svgEl('circle', { r: (Math.max(f.w, f.d) / 2) * S, ...common })
      : svgEl('rect', { x: -wPx / 2, y: -dPx / 2, width: wPx, height: dPx, rx: 3, ...common }));
    // generous invisible hit area so tiny objects stay easy to grab
    g.append(svgEl('rect', { x: -Math.max(wPx, 26) / 2, y: -Math.max(dPx, 26) / 2, width: Math.max(wPx, 26), height: Math.max(dPx, 26), fill: 'transparent', class: 'obj-hit' }));
    if (def.shape !== 'circle' && o.type !== 'rug') {
      g.append(svgEl('path', { d: `M0 ${dPx / 2} l0 9 m-5 -5 l5 5 l5 -5`, class: 'obj-facing' }));
    }
    const label = svgEl('text', { class: 'obj-icon', 'text-anchor': 'middle', 'dominant-baseline': 'central', transform: `rotate(${o.rot})`, 'pointer-events': 'none' }, document.createTextNode(def.icon));
    g.append(label);
    return g;
  }

  moveG(o) { this.gs.get(o.id)?.setAttribute('transform', `translate(${this.X(o.x)} ${this.Z(o.z)}) rotate(${-o.rot})`); }

  redrawObject(o) {
    const old = this.gs.get(o.id);
    const g = this.objectG(o);
    if (old) { old.replaceWith(g); this.gs.set(o.id, g); }
    this.applySelection();
  }

  applySelection() {
    const bad = new Set((this.last?.issues ?? []).filter((i) => i.objId).map((i) => i.objId));
    for (const [id, g] of this.gs) {
      g.classList.toggle('sel', id === this.selected);
      g.classList.toggle('issue', bad.has(id));
    }
  }

  drawWalkLayer() {
    const { cells, cell } = this.last;
    let ok = ''; let no = '';
    const s = cell * S;
    for (const c of cells) {
      const seg = `M${this.X(c.x) - s / 2} ${this.Z(c.z) - s / 2}h${s}v${s}h${-s}z`;
      if (c.ok) ok += seg; else no += seg;
    }
    this.walkLayer.replaceChildren(svgEl('path', { d: ok, class: 'walk-ok' }), svgEl('path', { d: no, class: 'walk-no' }));
  }

  /* --------------------------------------------------------- pointer + keys */
  toWorld(e) {
    const r = this.svg.getBoundingClientRect();
    const sx = ((e.clientX - r.left) / (r.width || this.vbW)) * this.vbW;
    const sy = ((e.clientY - r.top) / (r.height || this.vbH)) * this.vbH;
    return { x: sx / S - this.layout.size.w / 2 - PAD, z: sy / S - this.layout.size.d / 2 - PAD };
  }

  bindPlan() {
    this.svg.addEventListener('pointerdown', (e) => {
      const g = e.target.closest?.('.obj');
      this.svg.focus?.({ preventScroll: true });
      if (!g) { this.select(null); return; }
      const o = this.layout.objects.find((x) => x.id === g.getAttribute('data-id'));
      if (!o) return;
      this.select(o.id);
      const p = this.toWorld(e);
      this.drag = { o, dx: p.x - o.x, dz: p.z - o.z, moved: false, before: JSON.stringify(this.layout) };
      const move = (ev) => this.onDrag(ev);
      const up = () => {
        window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
        const dr = this.drag; this.drag = null;
        if (dr?.moved) { this.ed.markDirty(); this.renderInspector(); this.refreshAnalysis(); }
      };
      window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
      e.preventDefault?.();
    });
    this.svg.addEventListener('keydown', (e) => this.onKey(e));
  }

  onDrag(e) {
    const dr = this.drag; if (!dr) return;
    const { w, d } = this.layout.size;
    const p = this.toWorld(e);
    const step = e.altKey ? 0.05 : 0.25;
    let x = snapTo(p.x - dr.dx, step); let z = snapTo(p.z - dr.dz, step);
    x = Math.max(-w / 2 + 0.15, Math.min(w / 2 - 0.15, x));
    z = Math.max(-d / 2 + 0.15, Math.min(d / 2 - 0.15, z));
    const o = dr.o;
    if (typeDef(o.type).wall) {
      const s = snapToWall(x, z, this.layout.size);
      const near = Math.min(Math.abs(x + w / 2), Math.abs(x - w / 2), Math.abs(z + d / 2), Math.abs(z - d / 2));
      if (near < WALL_PULL) { x = r2(s.x); z = r2(s.z); if (o.rot !== s.rot) { o.rot = s.rot; } }
    }
    if (x === o.x && z === o.z && !dr.moved) return;
    if (!dr.moved) { this.pushUndo(dr.before); dr.moved = true; }
    o.x = r2(x); o.z = r2(z);
    this.moveG(o);
  }

  onKey(e) {
    const mod = e.ctrlKey || e.metaKey;
    const k = e.key.toLowerCase();
    if (mod && k === 'z') { e.preventDefault(); if (e.shiftKey) this.redo(); else this.undo(); return; }
    if (mod && k === 'y') { e.preventDefault(); this.redo(); return; }
    const o = this.sel(); if (!o) return;
    const { w, d } = this.layout.size;
    const step = e.shiftKey ? 1 : 0.25;
    const arrows = { arrowleft: [-step, 0], arrowright: [step, 0], arrowup: [0, -step], arrowdown: [0, step] };
    if (arrows[k]) {
      e.preventDefault();
      if (Date.now() - this.nudgeAt > 700) this.pushUndo();
      this.nudgeAt = Date.now();
      o.x = r2(Math.max(-w / 2 + 0.15, Math.min(w / 2 - 0.15, o.x + arrows[k][0])));
      o.z = r2(Math.max(-d / 2 + 0.15, Math.min(d / 2 - 0.15, o.z + arrows[k][1])));
      this.moveG(o); this.ed.markDirty(); this.syncPosition(); this.scheduleAnalysis();
    } else if (k === 'delete' || k === 'backspace') { e.preventDefault(); this.removeSelected(); }
    else if (k === 'r') { e.preventDefault(); this.rotateSelected(); }
    else if (k === 'd' && !mod) { e.preventDefault(); this.duplicateSelected(); }
    else if (k === 'escape') this.select(null);
  }

  /* ------------------------------------------------------------ undo/redo */
  pushUndo(snapshot = JSON.stringify(this.layout)) {
    this.undoStack.push(snapshot);
    if (this.undoStack.length > 60) this.undoStack.shift();
    this.redoStack = [];
    this.updateToolbar();
  }

  restore(json) {
    this.room.layout = JSON.parse(json);
    if (!this.layout.objects.some((o) => o.id === this.selected)) this.selected = null;
    this.ed.markDirty();
    this.afterStructure();
  }

  undo() { if (!this.undoStack.length) return; this.redoStack.push(JSON.stringify(this.layout)); this.restore(this.undoStack.pop()); }
  redo() { if (!this.redoStack.length) return; this.undoStack.push(JSON.stringify(this.layout)); this.restore(this.redoStack.pop()); }

  updateToolbar() {
    if (!this.undoBtn) return;
    this.undoBtn.disabled = !this.undoStack.length;
    this.redoBtn.disabled = !this.redoStack.length;
  }

  afterStructure() {
    this.drawPlan(); this.renderInspector(); this.refreshAnalysis(); this.updateToolbar();
  }

  /* ----------------------------------------------------------- operations */
  select(id) {
    this.selected = id;
    if (id) this.tab = 'object';
    this.applySelection(); this.renderInspector();
  }

  /** First free place for a new object: along a wall for wall items, otherwise nearest to the middle. */
  findSpot(type, p) {
    const { w, d } = this.layout.size;
    const def = typeDef(type);
    const others = this.layout.objects.map((o) => ({ x: o.x, z: o.z, ...fp(o) }));
    const fits = (x, z, rot) => {
      const f = footprint(type, p, rot);
      return !others.some((o) => overlaps({ x, z, w: f.w, d: f.d }, o));
    };
    if (def.wall) {
      const cand = [];
      for (let k = 0; k <= w / 2 - 1.5; k += 0.5) for (const sx of k ? [1, -1] : [1]) cand.push({ x: sx * k, z: -d / 2 + 0.28, rot: 0 });
      for (let z = -d / 2 + 2; z <= d / 2 - 3.8; z += 0.5) { cand.push({ x: -w / 2 + 0.28, z, rot: 90 }); cand.push({ x: w / 2 - 0.28, z, rot: 270 }); }
      return cand.find((c) => fits(c.x, c.z, c.rot)) ?? cand[0];
    }
    const cand = [];
    for (let x = -w / 2 + 1; x <= w / 2 - 1; x += 0.5) for (let z = -d / 2 + 1; z <= d / 2 - 3.9; z += 0.5) cand.push({ x, z, rot: 0, dist: Math.hypot(x, z + 1) });
    cand.sort((a, b) => a.dist - b.dist);
    return cand.find((c) => fits(c.x, c.z, 0)) ?? { x: 0, z: 0, rot: 0 };
  }

  addObject(type, overrides = {}, { silent = false } = {}) {
    if (!silent) this.pushUndo();
    const p = { ...defaultParams(type), ...overrides };
    if (type === 'module' && !p.module) {
      const used = new Set(this.layout.objects.filter((o) => o.type === 'module').map((o) => o.p.module));
      p.module = (this.room.modules.find((m) => !used.has(m.id)) ?? this.room.modules[0])?.id ?? '';
    }
    const spot = this.findSpot(type, p);
    const o = newObject(type, this.layout.objects, r2(spot.x), r2(spot.z), spot.rot);
    o.p = p;
    this.layout.objects.push(o);
    this.selected = o.id;
    if (!silent) { this.ed.markDirty(); this.afterStructure(); this.svg.focus?.({ preventScroll: true }); }
    return o;
  }

  autoPlaceModules() {
    const used = new Set(this.layout.objects.filter((o) => o.type === 'module').map((o) => o.p.module));
    const missing = this.room.modules.filter((m) => !used.has(m.id));
    if (!missing.length) { this.ed.toast(this.room.modules.length ? 'Every module already has a display.' : 'This room has no modules yet. Add some under Rooms and projects.', 'bad'); return; }
    this.pushUndo();
    missing.forEach((m) => this.addObject('module', { module: m.id }, { silent: true }));
    this.ed.markDirty(); this.afterStructure();
    this.ed.toast(`Added ${missing.length} display(s) along the walls.`);
  }

  removeSelected() {
    const i = this.objectIndex(this.selected); if (i < 0) return;
    this.pushUndo();
    this.layout.objects.splice(i, 1);
    this.selected = null;
    this.ed.markDirty(); this.afterStructure();
  }

  rotateSelected() {
    const o = this.sel(); if (!o) return;
    this.pushUndo();
    o.rot = (o.rot + 90) % 360;
    this.ed.markDirty(); this.redrawObject(o); this.renderInspector(); this.scheduleAnalysis();
  }

  duplicateSelected() {
    const o = this.sel(); if (!o) return;
    this.pushUndo();
    const { w, d } = this.layout.size;
    const copy = newObject(o.type, this.layout.objects, r2(Math.min(w / 2 - 0.15, o.x + 0.5)), r2(Math.min(d / 2 - 0.15, o.z + 0.5)), o.rot);
    copy.p = JSON.parse(JSON.stringify(o.p));
    this.layout.objects.push(copy);
    this.selected = copy.id;
    this.ed.markDirty(); this.afterStructure();
  }

  async saveAndTest() {
    const win = window.open('about:blank', '_blank');
    await this.ed.save();
    if (Object.keys(this.ed.errors).length) { win?.close(); return; }
    const url = `${this.ed.meta.game_url}?room=${encodeURIComponent(this.room.id)}`;
    if (win) win.location.href = url; else window.open(url, '_blank');
  }

  /* ------------------------------------------------------------ inspector */
  bindInspector() {
    const edited = () => {
      if (!this.baselineTaken) { this.baselineTaken = true; this.pushUndo(this.baseline); }
      const o = this.sel();
      if (this.tab === 'room') { this.clampObjects(); this.drawPlan(); }
      else if (o) { o.rot = Number(o.rot) || 0; this.redrawObject(o); }
      this.scheduleAnalysis();
    };
    this.inspectorEl.addEventListener('input', edited);
    this.inspectorEl.addEventListener('change', edited);
  }

  clampObjects() {
    const { w, d } = this.layout.size;
    for (const o of this.layout.objects) {
      o.x = r2(Math.max(-w / 2 + 0.15, Math.min(w / 2 - 0.15, Number(o.x) || 0)));
      o.z = r2(Math.max(-d / 2 + 0.15, Math.min(d / 2 - 0.15, Number(o.z) || 0)));
    }
  }

  /** Keeps the X/Z inputs in step while dragging or nudging. */
  syncPosition() {
    const o = this.sel(); if (!o) return;
    const inputs = this.inspectorEl.querySelectorAll('[data-pos]');
    inputs.forEach((i) => { i.value = o[i.getAttribute('data-pos')]; });
  }

  renderInspector() {
    this.baseline = JSON.stringify(this.layout);
    this.baselineTaken = false;
    const f = makeFields(this.ed);
    const tabs = el('div', { class: 'tabs', role: 'tablist' },
      ['object', 'room'].map((t) => el('button', {
        type: 'button', role: 'tab', class: `tab${this.tab === t ? ' active' : ''}`, 'aria-selected': String(this.tab === t),
        onclick: () => { this.tab = t; this.renderInspector(); },
      }, t === 'object' ? 'Selected object' : 'Room size and look')));
    this.inspectorEl.replaceChildren(tabs, this.tab === 'room' ? this.roomTab(f) : this.objectTab(f));
  }

  roomTab(f) {
    const base = ['rooms', this.ri, 'layout'];
    const T = catalog.themes;
    const opts = (list) => list.map((v) => [v, cap(v)]);
    const R = catalog.room;
    return el('div', { class: 'inspector-body' },
      el('h4', { text: 'Size' }),
      el('div', { class: 'grid-3' },
        f.number({ path: [...base, 'size', 'w'], label: 'Width (m)', min: R.w.min, max: R.w.max, step: 1 }),
        f.number({ path: [...base, 'size', 'd'], label: 'Depth (m)', min: R.d.min, max: R.d.max, step: 1 }),
        f.number({ path: [...base, 'size', 'h'], label: 'Height (m)', min: R.h.min, max: R.h.max, step: 0.5 })),
      el('h4', { text: 'Materials' }),
      f.select({ path: [...base, 'theme', 'floor'], label: 'Floor', options: opts(T.floor) }),
      f.select({ path: [...base, 'theme', 'wall'], label: 'Walls', options: opts(T.wall) }),
      f.select({ path: [...base, 'theme', 'ceiling'], label: 'Ceiling', options: opts(T.ceiling) }),
      el('h4', { text: 'Light and mood' }),
      f.select({ path: [...base, 'theme', 'light'], label: 'Light colour', options: opts(T.light) }),
      f.number({ path: [...base, 'theme', 'brightness'], label: 'Brightness', min: 0.4, max: 1.8, step: 0.1 }),
      f.color({ path: [...base, 'theme', 'bg'], label: 'Background beyond the walls' }),
      f.check({ path: [...base, 'theme', 'fog'], label: 'Soft fog in the distance' }),
      f.check({ path: [...base, 'theme', 'lightbars'], label: 'Ceiling light bars' }),
      f.check({ path: [...base, 'theme', 'accent_strip'], label: 'Glowing accent strip along the walls' }),
      el('h4', { text: 'Sound' }),
      f.number({ path: [...base, 'theme', 'ambient_hz'], label: 'Ambient pitch (Hz)', min: 60, max: 220, step: 5, hint: 'Lower is deeper and calmer.' }),
      f.number({ path: [...base, 'theme', 'ambient_bright'], label: 'Ambient brightness', min: 0, max: 1, step: 0.05 }),
      f.select({ path: [...base, 'theme', 'floor_sound'], label: 'Footstep sound', options: opts(T.floor_sound) }));
  }

  objectTab(f) {
    const o = this.sel();
    if (!o) {
      return el('div', { class: 'inspector-body' },
        el('p', { class: 'empty', text: 'Nothing selected.' }),
        el('p', { class: 'hint', text: 'Click an object on the plan to edit it, or add one from the list on the left. Press the room tab for size, materials and lighting.' }));
    }
    const def = typeDef(o.type);
    const idx = this.objectIndex(o.id);
    const base = ['rooms', this.ri, 'layout', 'objects', idx];
    const { w, d } = this.layout.size;

    const posField = (key, label, lim) => {
      const field = f.number({ path: [...base, key], label, min: -lim, max: lim, step: 0.05 });
      field.querySelector('input').setAttribute('data-pos', key);
      return field;
    };
    const controls = [
      el('div', { class: 'inspector-head' },
        el('span', { class: 'palette-icon', style: { color: def.color }, text: def.icon }),
        el('strong', { text: def.label }),
        el('span', { class: 'hint', text: o.id })),
      el('div', { class: 'btn-row tight' },
        el('button', { type: 'button', class: 'btn btn-small', onclick: () => this.rotateSelected() }, '⟳ Rotate'),
        el('button', { type: 'button', class: 'btn btn-small', onclick: () => this.duplicateSelected() }, 'Duplicate'),
        el('button', { type: 'button', class: 'btn btn-small btn-danger', onclick: () => this.removeSelected() }, 'Delete')),
      el('div', { class: 'grid-3' },
        posField('x', 'X (m)', w / 2), posField('z', 'Z (m)', d / 2),
        f.select({ path: [...base, 'rot'], label: 'Facing', options: ROTATIONS.map((r) => [String(r), `${r}°`]), onChange: () => { o.rot = Number(o.rot); } })),
    ];
    for (const [key, pd] of Object.entries(def.params)) controls.push(this.paramField(f, [...base, 'p', key], pd));
    return el('div', { class: 'inspector-body' }, controls);
  }

  paramField(f, path, pd) {
    switch (pd.kind) {
      case 'number': return f.number({ path, label: pd.label, min: pd.min, max: pd.max, step: pd.step ?? 'any' });
      case 'int': return f.number({ path, label: pd.label, min: pd.min, max: pd.max, step: 1 });
      case 'bool': return f.check({ path, label: pd.label });
      case 'color': return f.color({ path, label: pd.label });
      case 'string': return f.text({ path, label: pd.label, max: pd.max });
      case 'text': return f.area({ path, label: pd.label, rows: 4, max: pd.max });
      case 'url': return f.text({ path, label: pd.label, placeholder: 'https://', max: 500 });
      case 'src': return f.file({ path, label: pd.label, kinds: ['image', 'video'], placeholder: '/storage/portfolio/… or https://…' });
      case 'enum': return f.select({ path, label: pd.label, options: optionsOf(pd).map((v) => [v, cap(v)]) });
      case 'module': {
        const mods = this.room.modules;
        if (!mods.length) return el('p', { class: 'note', text: 'This room has no modules yet. Add some under "Rooms and projects", then choose one here.' });
        return f.select({ path, label: pd.label, options: [['', 'Choose a module…'], ...mods.map((m) => [m.id, m.name || m.id])] });
      }
      default: return el('span');
    }
  }

  /* ------------------------------------------------------------- analysis */
  scheduleAnalysis() {
    clearTimeout(this.analysisTimer);
    this.analysisTimer = setTimeout(() => this.refreshAnalysis(), 120);
  }

  refreshAnalysis() {
    try { this.last = analyze(this.layout, this.room, { cells: this.showWalk }); } catch { this.last = { issues: [] }; }
    const { issues } = this.last;
    const errors = issues.filter((i) => i.level === 'error').length;
    this.issuesEl.replaceChildren(
      el('p', { class: `issues-summary ${errors ? 'bad' : 'good'}`, text: errors ? `${errors} problem(s) to fix before visitors can use this room properly` : issues.length ? 'Everything is reachable. A few suggestions:' : 'Everything is reachable. Nice room.' }),
      ...issues.map((i) => el('button', {
        type: 'button', class: `issue ${i.level}`, onclick: () => { if (i.objId) this.select(i.objId); },
      }, el('span', { text: i.level === 'error' ? '✕' : '!' }), el('span', { text: i.text }))));
    this.applySelection();
    if (this.showWalk) { if (this.last.cells) this.drawWalkLayer(); } else this.walkLayer?.replaceChildren();
  }
}

/* ======================================================================
   Dashboard section: pick (or create) a custom room, then design it.
   ====================================================================== */
export function designerSection(ed) {
  const customs = ed.state.rooms.map((r, i) => ({ r, i })).filter((x) => x.r.scene === 'custom');
  const create = () => {
    const rooms = ed.state.rooms;
    const room = ed.newCustomRoom();
    rooms.push(room);
    ed.designIndex = rooms.length - 1;
    ed.markDirty(); ed.render();
  };

  if (!customs.length) {
    return [
      el('p', { class: 'lead', text: 'Design a room of your own: choose its size, materials and lighting, then drag furniture, screens, pictures, text and info points onto the floor plan.' }),
      el('button', { type: 'button', class: 'btn btn-primary', onclick: create }, 'Create my room'),
    ];
  }
  if (!customs.some((x) => x.i === ed.designIndex)) ed.designIndex = customs[0].i;

  const picker = el('select', { 'aria-label': 'Room to design' }, customs.map(({ r, i }) => el('option', { value: String(i), text: r.name || r.id })));
  picker.value = String(ed.designIndex);
  picker.addEventListener('change', () => { ed.designIndex = Number(picker.value); ed.render(); });

  const key = ed.state.rooms[ed.designIndex].id;
  let designer = ed.designers.get(key);
  if (!designer || designer.ri !== ed.designIndex) { designer = new Designer(ed, ed.designIndex); ed.designers.set(key, designer); }

  return [
    el('div', { class: 'designer-head' },
      el('label', { class: 'label', text: 'Room' }), picker,
      el('button', { type: 'button', class: 'btn btn-small', onclick: create }, '+ New custom room')),
    designer.build(),
  ];
}

export { objectLabel };
