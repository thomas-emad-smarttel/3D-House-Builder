import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { el } from '../ui/dom.js';
import { buildHouseWorld } from '../scenes/HouseWorld.js';
import { typeDef } from '../scenes/custom/catalog.js';

const FLOOR_MATERIALS = [
  ['parquet', '🪵 Hardwood Parquet (Herringbone)'],
  ['marble', '🏛️ Luxury Polished Marble'],
  ['tile', '🔲 Porcelain Ceramic Tiles'],
  ['hardwood', '🪵 Natural Oak Planks'],
  ['concrete', '🏗️ Polished Micro-Cement'],
  ['carpet', '🧶 Plush Soft Carpet'],
  ['granite', '⬛ Polished Dark Granite'],
];

const CEILING_TYPES = [
  ['gypsum_led', '✨ Gypsum Tray with Warm LED Cove Glow'],
  ['coffered', '🏛️ Luxury Coffered Wooden Grid Beams'],
  ['wood_beams', '🪵 Exposed Architectural Timber Beams'],
  ['plaster', '◻️ Smooth Flat Plaster with Flush Spotlights'],
  ['suspended', '🏢 Suspended Acoustic Tile Grid'],
  ['open_sky', '☀️ Open Sky / Roof Terrace (No Ceiling)'],
];

const WALL_MATERIALS = [
  ['plaster', '◻️ Smooth Painted Plaster'],
  ['brick', '🧱 Exposed Red / Sand Brickwork'],
  ['stone', '🪨 Natural Architectural Stone'],
  ['wood_panel', '🪵 Modern Vertical Wood Slat Paneling'],
  ['tile', '🔲 High-Gloss Wall Tiles (Bath/Kitchen)'],
];

const DOOR_TYPES = [
  ['standard', '🚪 Interior Hinged Panel Door with Lever Handle'],
  ['front_entrance', '🚪 Front Entrance Security Pivot Door with Brass Bar Handle'],
  ['double_french', '🪟 Double French Glass Doors'],
  ['sliding_glass', '🪟 Modern Patio Sliding Glass Door'],
  ['barn_wood', '🪵 Rustic Modern Sliding Barn Door with Track'],
  ['arch', '🏛️ Clean Architectural Open Archway'],
];

const WINDOW_TYPES = [
  ['standard', '🪟 Standard Casement Window'],
  ['panoramic', '🖼️ Floor-to-Ceiling Panoramic Glass Window'],
  ['bay', '🪟 Wide Landscape Picture Window'],
  ['transom', '🪟 Clerestory / High Transom Window'],
];

const ROOM_TYPES = [
  ['living', '🛋️ Living Room / Salon'],
  ['kitchen', '🍳 Kitchen & Dining'],
  ['bedroom', '🛏️ Master / Guest Bedroom'],
  ['bathroom', '🛁 Bathroom / Powder Room'],
  ['office', '💻 Home Office / Study'],
  ['balcony', '🌿 Balcony / Terrace / Patio'],
  ['hallway', '🚪 Corridor / Foyer / Hallway'],
  ['garage', '🚗 Garage / Workshop'],
];

const FURNITURE_CATALOG = [
  { cat: '🛋️ Living', items: [
    { type: 'sofa', name: 'Luxury 3-Seat Sofa', p: { w: 2.2, d: 0.9, h: 0.8, color: '#3b4452', material: 'solid' } },
    { type: 'chair', name: 'Lounge Armchair', p: { color: '#2b3038' } },
    { type: 'table', name: 'Modern Coffee Table', p: { w: 1.2, d: 0.7, material: 'marble' } },
    { type: 'deskMonitor', name: 'Media TV & Console', p: { w: 0.8, h: 0.45 } },
    { type: 'bookshelf', name: 'Architectural Bookshelf', p: { w: 2.0, h: 2.2 } },
    { type: 'plant', name: 'Indoor Palm Plant', p: { s: 1 } },
    { type: 'floorLamp', name: 'Modern Arc Floor Lamp', p: { color: '#ffd9a0' } },
  ]},
  { cat: '🛏️ Bedroom', items: [
    { type: 'desk', name: 'King Bed Frame', p: { w: 2.2, d: 2.0, top: 'wood' } },
    { type: 'table', name: 'Nightstand Table', p: { w: 0.6, d: 0.5, material: 'wood' } },
    { type: 'bookshelf', name: 'Wardrobe Closet', p: { w: 2.2, h: 2.4 } },
    { type: 'plant', name: 'Bedroom Plant', p: { s: 0.8 } },
  ]},
  { cat: '🍳 Kitchen & Dining', items: [
    { type: 'table', name: 'Large Dining Table', p: { w: 2.0, d: 1.0, material: 'wood' } },
    { type: 'chair', name: 'Dining Chair', p: { color: '#334155' } },
    { type: 'desk', name: 'Kitchen Island Counter', p: { w: 2.4, d: 1.1, top: 'marble' } },
    { type: 'bookshelf', name: 'Kitchen Cabinet', p: { w: 1.8, h: 2.0 } },
  ]},
  { cat: '💻 Office', items: [
    { type: 'desk', name: 'Executive Wooden Desk', p: { w: 1.8, d: 0.8, top: 'wood' } },
    { type: 'chair', name: 'Ergonomic Office Chair', p: { color: '#1e293b' } },
    { type: 'deskMonitor', name: 'Dual Monitor Workstation', p: { w: 0.72, h: 0.42 } },
    { type: 'bookshelf', name: 'Library Bookshelf', p: { w: 2.0, h: 2.2 } },
  ]},
  { cat: '🛁 Bathroom', items: [
    { type: 'desk', name: 'Double Vanity Sink', p: { w: 1.6, d: 0.6, top: 'marble' } },
    { type: 'table', name: 'Freestanding Bathtub', p: { w: 1.7, d: 0.8, material: 'solid' } },
    { type: 'plant', name: 'Bath Fern', p: { s: 0.7 } },
  ]},
];

export class HouseBuilder3D {
  constructor(ed) {
    this.ed = ed;
    this.house = ed.house || ed.state;
    this.selectedFloorIdx = ed.selectedFloorIdx || 0;
    this.selectedRoomIdx = ed.selectedRoomIdx || 0;
    this.selectedObjectId = null;
    this.activeTab = 'rooms'; // 'rooms' | 'doors' | 'windows' | 'furniture' | 'floors'
    this.showCeilings = false; // default cutaway so admin sees inside clearly
    this.lightingMode = 'day'; // 'day' | 'sunset' | 'night'
    this.activeFloorLevel = 0; // 0, 1, 2... or 'all'
    this.disposed = false;
    this.animationId = null;

    // Ensure floors and rooms exist
    if (!this.house.floors || !this.house.floors.length) {
      this.house.floors = [
        {
          id: 'floor-0',
          name: 'Ground Floor',
          level: 0,
          height: 3.4,
          elevation: 0,
          rooms: [
            {
              id: 'room-1',
              name: 'Living Salon',
              type: 'living',
              color: '#3b82f6',
              layout: {
                size: { w: 10, d: 8, h: 3.2 },
                position: { x: 0, z: 0 },
                theme: { floor: 'parquet', wall: 'plaster', wall_color: '#f8fafc', ceiling: 'gypsum_led', ceiling_color: '#ffffff', light: 'warm', brightness: 1.2 },
                doors: [{ wall: 'south', type: 'front_entrance', offset: 0, width: 1.4, height: 2.4 }],
                windows: [{ wall: 'north', type: 'panoramic', offset: 0, width: 3.6, height: 2.2, sill_height: 0.2 }],
                objects: [{ id: 'obj-sofa', type: 'sofa', x: 0, z: 1.2, rot: 0 }],
              },
            },
          ],
        },
      ];
    }

    const currentFloor = this.house.floors[this.selectedFloorIdx] || this.house.floors[0];
    this.activeFloorLevel = currentFloor.level ?? 0;
  }

  get floors() {
    return this.house.floors || [];
  }

  get currentFloor() {
    return this.floors[this.selectedFloorIdx] || this.floors[0];
  }

  get currentRoom() {
    const r = this.currentFloor?.rooms?.[this.selectedRoomIdx] || this.currentFloor?.rooms?.[0] || null;
    return r;
  }

  render() {
    this.wrap = el('div', {
      class: 'house-builder-3d-app',
      style: {
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 120px)',
        minHeight: '740px',
        background: '#090d16',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid #1e293b',
        boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
      },
    });

    this.topbar = this.buildTopBar();
    this.body = el('div', {
      style: {
        display: 'flex',
        flex: '1',
        position: 'relative',
        overflow: 'hidden',
      },
    });

    this.viewportWrap = this.buildViewport();
    this.inspectorPanel = el('aside', {
      class: 'builder-inspector-panel',
      style: {
        width: '420px',
        minWidth: '380px',
        maxWidth: '460px',
        background: '#0f172a',
        borderLeft: '1px solid #1e293b',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        zIndex: '15',
      },
    });

    this.body.append(this.viewportWrap, this.inspectorPanel);
    this.wrap.append(this.topbar, this.body);

    this.renderInspector();

    // Defer WebGL mounting until attached to DOM
    setTimeout(() => this.mount(), 50);

    return this.wrap;
  }

  buildTopBar() {
    const titleEl = el('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
      el('span', { style: { fontSize: '1.4rem' }, text: '🏗️' }),
      el('div', {},
        el('h3', { style: { margin: 0, fontSize: '1.05rem', color: '#f8fafc', fontWeight: '700' }, text: `3D Builder: ${this.house.title || 'Untitled Villa'}` }),
        el('span', { style: { fontSize: '0.75rem', color: '#64748b' }, text: 'Visual Architectural 3D House Studio' }),
      ),
    );

    // Floor Selector Pills
    this.floorPillsWrap = el('div', { style: { display: 'flex', gap: '6px', alignItems: 'center' } });
    this.updateFloorPills();

    // Ceilings Toggle
    this.ceilingBtn = el('button', {
      type: 'button',
      class: 'btn btn-small',
      style: { background: this.showCeilings ? '#3b82f6' : '#1e293b', color: '#fff', border: '1px solid #334155' },
      text: this.showCeilings ? '👁️ Ceilings: On' : '👁️ Ceilings: Cutaway',
      onclick: () => {
        this.showCeilings = !this.showCeilings;
        this.ceilingBtn.textContent = this.showCeilings ? '👁️ Ceilings: On' : '👁️ Ceilings: Cutaway';
        this.ceilingBtn.style.background = this.showCeilings ? '#3b82f6' : '#1e293b';
        this.toggleCeilingsVisibility();
      },
    });

    // View Modes
    const orbitBtn = el('button', {
      type: 'button',
      class: 'btn btn-small',
      style: { background: '#1e293b', color: '#cbd5e1' },
      text: '🔄 3D Orbit',
      onclick: () => this.setOrbitView(),
    });

    const topBtn = el('button', {
      type: 'button',
      class: 'btn btn-small',
      style: { background: '#1e293b', color: '#cbd5e1' },
      text: '📐 Top Plan',
      onclick: () => this.setTopView(),
    });

    const isoBtn = el('button', {
      type: 'button',
      class: 'btn btn-small',
      style: { background: '#1e293b', color: '#cbd5e1' },
      text: '🏠 Isometric',
      onclick: () => this.setIsoView(),
    });

    // Lighting Toggle
    this.lightBtn = el('button', {
      type: 'button',
      class: 'btn btn-small',
      style: { background: '#1e293b', color: '#fef08a' },
      text: '☀️ Day',
      onclick: () => this.cycleLighting(),
    });

    // Save Button
    this.saveBtn = el('button', {
      type: 'button',
      class: 'btn btn-small btn-primary',
      style: { fontWeight: '600' },
      text: this.ed.dirty ? '💾 Save Changes *' : '💾 Saved',
      onclick: async () => {
        this.saveBtn.textContent = '⏳ Saving…';
        await this.ed.save();
        this.saveBtn.textContent = '✅ Saved';
        setTimeout(() => { if (!this.ed.dirty) this.saveBtn.textContent = '💾 Saved'; }, 2000);
      },
    });

    // Client tour link
    const tourLink = el('a', {
      class: 'btn btn-small',
      style: { background: '#334155', color: '#fff', textDecoration: 'none' },
      href: `/house/${this.house.slug || ''}?admin=1`,
      target: '_blank',
      rel: 'noopener',
      text: '🎮 Full Tour ↗',
    });

    return el('header', {
      class: 'builder-topbar',
      style: {
        height: '62px',
        padding: '0 18px',
        background: '#0d1322',
        borderBottom: '1px solid #1e293b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        zIndex: '20',
      },
    },
      titleEl,
      this.floorPillsWrap,
      el('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
        this.ceilingBtn,
        orbitBtn,
        topBtn,
        isoBtn,
        this.lightBtn,
        this.saveBtn,
        tourLink,
      ),
    );
  }

  updateFloorPills() {
    this.floorPillsWrap.replaceChildren(
      ...this.floors.map((fl, idx) => {
        const isActive = this.activeFloorLevel === fl.level;
        return el('button', {
          type: 'button',
          class: `btn btn-small${isActive ? ' btn-primary' : ''}`,
          style: {
            fontSize: '0.8rem',
            background: isActive ? '#3b82f6' : '#1e293b',
            color: isActive ? '#fff' : '#94a3b8',
            border: isActive ? '1px solid #60a5fa' : '1px solid #334155',
          },
          text: `${fl.name || `Floor ${fl.level}`}`,
          onclick: () => {
            this.selectedFloorIdx = idx;
            this.activeFloorLevel = fl.level;
            this.selectedRoomIdx = 0;
            this.updateFloorPills();
            this.renderInspector();
            this.rebuild3D();
          },
        });
      }),
      // Dollhouse mode button
      el('button', {
        type: 'button',
        class: `btn btn-small${this.activeFloorLevel === 'all' ? ' btn-primary' : ''}`,
        style: {
          fontSize: '0.8rem',
          background: this.activeFloorLevel === 'all' ? '#8b5cf6' : '#1e293b',
          color: this.activeFloorLevel === 'all' ? '#fff' : '#c4b5fd',
          border: this.activeFloorLevel === 'all' ? '1px solid #a78bfa' : '1px solid #4c1d95',
        },
        text: '🏠 Dollhouse (All Floors)',
        onclick: () => {
          this.activeFloorLevel = 'all';
          this.updateFloorPills();
          this.renderInspector();
          this.rebuild3D();
        },
      }),
      // Add Floor button
      el('button', {
        type: 'button',
        class: 'btn btn-small',
        style: { fontSize: '0.8rem', background: '#1e293b', color: '#10b981', border: '1px dashed #059669' },
        text: '➕ Add Floor',
        onclick: () => this.addNewFloor(),
      }),
    );
  }

  buildViewport() {
    this.canvas = el('canvas', {
      class: 'builder-3d-canvas',
      style: {
        width: '100%',
        height: '100%',
        display: 'block',
        outline: 'none',
      },
    });

    this.hudOverlay = el('div', {
      style: {
        position: 'absolute',
        bottom: '14px',
        left: '14px',
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(8px)',
        border: '1px solid #334155',
        padding: '8px 14px',
        borderRadius: '8px',
        color: '#94a3b8',
        fontSize: '0.82rem',
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      },
      text: '🖱️ Left Drag: 360° Orbit · Right Drag: Pan · Scroll: Zoom · Click Room or Object: Select & Edit',
    });

    this.selectionToast = el('div', {
      style: {
        position: 'absolute',
        top: '14px',
        left: '14px',
        background: 'rgba(30, 41, 59, 0.9)',
        backdropFilter: 'blur(8px)',
        border: '1px solid #475569',
        padding: '6px 14px',
        borderRadius: '6px',
        color: '#e2e8f0',
        fontSize: '0.85rem',
        fontWeight: '600',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      },
      text: `Selected: ${this.currentRoom?.name || 'House'}`,
    });

    return el('div', {
      class: 'viewport-wrap',
      style: {
        flex: '1',
        position: 'relative',
        background: '#080d19',
        overflow: 'hidden',
      },
    }, this.canvas, this.hudOverlay, this.selectionToast);
  }

  /* -------------------------------------------------------- Inspector UI */
  renderInspector() {
    const tabs = [
      { id: 'rooms', icon: '🛋️', label: 'Rooms & Finishes' },
      { id: 'doors', icon: '🚪', label: 'Doors' },
      { id: 'windows', icon: '🪟', label: 'Windows' },
      { id: 'furniture', icon: '🛋️', label: 'Furnish' },
      { id: 'floors', icon: '🏢', label: 'Levels' },
    ];

    const tabButtons = el('div', {
      class: 'inspector-tabs',
      style: {
        display: 'flex',
        borderBottom: '1px solid #1e293b',
        background: '#090e1a',
      },
    }, ...tabs.map((t) => el('button', {
      type: 'button',
      style: {
        flex: '1',
        padding: '12px 6px',
        fontSize: '0.8rem',
        fontWeight: '600',
        background: this.activeTab === t.id ? '#1e293b' : 'transparent',
        color: this.activeTab === t.id ? '#60a5fa' : '#64748b',
        border: 'none',
        borderBottom: this.activeTab === t.id ? '2px solid #3b82f6' : '2px solid transparent',
        cursor: 'pointer',
        textAlign: 'center',
        transition: 'all 0.15s ease',
      },
      text: `${t.icon} ${t.label}`,
      onclick: () => {
        this.activeTab = t.id;
        this.renderInspector();
      },
    })));

    let tabContent = null;
    if (this.activeTab === 'rooms') tabContent = this.renderRoomsTab();
    else if (this.activeTab === 'doors') tabContent = this.renderDoorsTab();
    else if (this.activeTab === 'windows') tabContent = this.renderWindowsTab();
    else if (this.activeTab === 'furniture') tabContent = this.renderFurnitureTab();
    else if (this.activeTab === 'floors') tabContent = this.renderFloorsTab();

    this.inspectorPanel.replaceChildren(tabButtons, tabContent);
  }

  renderRoomsTab() {
    const room = this.currentRoom;
    if (!room) {
      return el('div', { style: { padding: '20px' } },
        el('p', { class: 'hint', text: 'No rooms on this floor level yet.' }),
        el('button', {
          type: 'button',
          class: 'btn btn-primary',
          text: '➕ Add First Room',
          onclick: () => this.addNewRoom(),
        }),
      );
    }

    const roomsOnFloor = this.currentFloor?.rooms || [];
    const roomSelector = el('select', {
      class: 'input',
      style: { width: '100%', marginBottom: '14px' },
      onchange: (e) => {
        this.selectedRoomIdx = Number(e.target.value);
        this.selectedObjectId = null;
        this.updateSelectionToast();
        this.renderInspector();
        this.updateHighlightHelper();
      },
    }, ...roomsOnFloor.map((r, i) => el('option', { value: String(i), selected: i === this.selectedRoomIdx, text: `${r.name || `Room ${i + 1}`}` })));

    const layout = room.layout || (room.layout = {});
    const size = layout.size || (layout.size = { w: 10, d: 8, h: 3.2 });
    const pos = layout.position || (layout.position = { x: 0, z: 0 });
    const theme = layout.theme || (layout.theme = {
      floor: 'parquet',
      wall: 'plaster',
      wall_color: '#f8fafc',
      ceiling: 'gypsum_led',
      ceiling_color: '#ffffff',
      light: 'warm',
      brightness: 1.2,
    });

    // Inputs: Name & Type
    const nameInput = el('input', {
      class: 'input',
      type: 'text',
      value: room.name || '',
      placeholder: 'Room Name',
      oninput: (e) => {
        room.name = e.target.value;
        this.markDirty();
        this.updateSelectionToast();
      },
    });

    const typeSelect = el('select', {
      class: 'input',
      onchange: (e) => {
        room.type = e.target.value;
        this.markDirty();
      },
    }, ...ROOM_TYPES.map(([val, label]) => el('option', { value: val, selected: room.type === val, text: label })));

    // Dimension Sliders
    const makeSlider = (label, val, min, max, step, unit, onChange) => {
      const valLabel = el('span', { style: { color: '#60a5fa', fontWeight: '600' }, text: `${val}${unit}` });
      const range = el('input', {
        type: 'range',
        min: String(min),
        max: String(max),
        step: String(step),
        value: String(val),
        style: { width: '100%', accentColor: '#3b82f6' },
        oninput: (e) => {
          const num = Number(e.target.value);
          valLabel.textContent = `${num}${unit}`;
          onChange(num);
          this.markDirty();
          this.rebuild3D();
        },
      });
      return el('div', { style: { marginBottom: '10px' } },
        el('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '3px' } },
          el('span', { text: label }),
          valLabel,
        ),
        range,
      );
    };

    const widthSlider = makeSlider('Width (Length)', size.w || 10, 2, 25, 0.5, 'm', (v) => { size.w = v; });
    const depthSlider = makeSlider('Depth (Width)', size.d || 8, 2, 25, 0.5, 'm', (v) => { size.d = v; });
    const heightSlider = makeSlider('Ceiling Height', size.h || 3.2, 2.4, 6.0, 0.1, 'm', (v) => { size.h = v; });
    const posXSlider = makeSlider('Position X', pos.x || 0, -25, 25, 0.5, 'm', (v) => { pos.x = v; });
    const posZSlider = makeSlider('Position Z', pos.z || 0, -25, 25, 0.5, 'm', (v) => { pos.z = v; });

    // Floor Materials ("Build Floor")
    const floorMatSelect = el('select', {
      class: 'input',
      style: { width: '100%' },
      onchange: (e) => {
        theme.floor = e.target.value;
        this.markDirty();
        this.rebuild3D();
      },
    }, ...FLOOR_MATERIALS.map(([val, label]) => el('option', { value: val, selected: theme.floor === val, text: label })));

    // Ceiling Types ("Clining")
    const ceilingSelect = el('select', {
      class: 'input',
      style: { width: '100%' },
      onchange: (e) => {
        theme.ceiling = e.target.value;
        this.markDirty();
        this.rebuild3D();
      },
    }, ...CEILING_TYPES.map(([val, label]) => el('option', { value: val, selected: theme.ceiling === val, text: label })));

    // Wall Material & Color
    const wallMatSelect = el('select', {
      class: 'input',
      style: { width: '100%' },
      onchange: (e) => {
        theme.wall = e.target.value;
        this.markDirty();
        this.rebuild3D();
      },
    }, ...WALL_MATERIALS.map(([val, label]) => el('option', { value: val, selected: theme.wall === val, text: label })));

    const wallColorInput = el('input', {
      type: 'color',
      value: theme.wall_color || '#f8fafc',
      style: { width: '42px', height: '36px', border: 'none', background: 'none', cursor: 'pointer' },
      onchange: (e) => {
        theme.wall_color = e.target.value;
        this.markDirty();
        this.rebuild3D();
      },
    });

    const addRoomBtn = el('button', {
      type: 'button',
      class: 'btn btn-small btn-primary',
      style: { width: '100%', marginBottom: '8px' },
      text: '➕ Add New Room to Floor',
      onclick: () => this.addNewRoom(),
    });

    const deleteRoomBtn = el('button', {
      type: 'button',
      class: 'btn btn-small',
      style: { width: '100%', background: '#7f1d1d', color: '#fca5a5', border: '1px solid #991b1b' },
      text: '🗑️ Delete This Room',
      onclick: () => this.deleteCurrentRoom(),
    });

    return el('div', { style: { padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' } },
      el('div', {},
        el('label', { style: { fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }, text: 'Select Room:' }),
        roomSelector,
      ),
      el('div', { style: { display: 'flex', gap: '8px' } },
        el('div', { style: { flex: '1' } },
          el('label', { style: { fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }, text: 'Room Name:' }),
          nameInput,
        ),
        el('div', { style: { width: '140px' } },
          el('label', { style: { fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }, text: 'Room Type:' }),
          typeSelect,
        ),
      ),
      el('fieldset', { style: { border: '1px solid #334155', borderRadius: '8px', padding: '10px 14px' } },
        el('legend', { style: { fontSize: '0.82rem', color: '#cbd5e1', fontWeight: '600', padding: '0 6px' }, text: '📐 Dimensions & Layout' }),
        widthSlider,
        depthSlider,
        heightSlider,
        posXSlider,
        posZSlider,
      ),
      el('fieldset', { style: { border: '1px solid #334155', borderRadius: '8px', padding: '10px 14px' } },
        el('legend', { style: { fontSize: '0.82rem', color: '#cbd5e1', fontWeight: '600', padding: '0 6px' }, text: '🪵 Floor Material Finish ("Build Floor")' }),
        floorMatSelect,
      ),
      el('fieldset', { style: { border: '1px solid #334155', borderRadius: '8px', padding: '10px 14px' } },
        el('legend', { style: { fontSize: '0.82rem', color: '#cbd5e1', fontWeight: '600', padding: '0 6px' }, text: '✨ Ceiling Architecture ("Clining")' }),
        ceilingSelect,
      ),
      el('fieldset', { style: { border: '1px solid #334155', borderRadius: '8px', padding: '10px 14px' } },
        el('legend', { style: { fontSize: '0.82rem', color: '#cbd5e1', fontWeight: '600', padding: '0 6px' }, text: '🧱 Wall Material & Color' }),
        el('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
          el('div', { style: { flex: '1' } }, wallMatSelect),
          wallColorInput,
        ),
      ),
      el('div', { style: { marginTop: '8px' } },
        addRoomBtn,
        deleteRoomBtn,
      ),
    );
  }

  /* ----------------------------------------------------------- Doors Tab */
  renderDoorsTab() {
    const room = this.currentRoom;
    if (!room) return el('p', { class: 'hint', style: { padding: '20px' }, text: 'Select a room first.' });

    const layout = room.layout || (room.layout = {});
    const doors = layout.doors || (layout.doors = []);

    const doorList = el('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' } });

    if (!doors.length) {
      doorList.append(el('p', { class: 'hint', text: 'No doors built in this room yet. Add doors below to create wall openings and interactive doors.' }));
    } else {
      doors.forEach((dr, idx) => {
        const item = el('div', {
          style: {
            background: '#1a2333',
            border: '1px solid #334155',
            borderRadius: '6px',
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          },
        },
          el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
            el('strong', { style: { fontSize: '0.85rem', color: '#f8fafc' }, text: `🚪 Door ${idx + 1}: ${dr.type || 'Standard'}` }),
            el('button', {
              type: 'button',
              class: 'btn btn-small',
              style: { background: '#7f1d1d', color: '#fca5a5', padding: '2px 8px', fontSize: '0.75rem' },
              text: '🗑️ Delete',
              onclick: () => {
                doors.splice(idx, 1);
                this.markDirty();
                this.renderInspector();
                this.rebuild3D();
              },
            }),
          ),
          el('div', { style: { display: 'flex', gap: '8px', fontSize: '0.8rem', color: '#94a3b8' } },
            el('span', { text: `Wall: ${dr.wall?.toUpperCase() || 'SOUTH'}` }),
            el('span', { text: `Offset: ${dr.offset ?? 0}m` }),
            el('span', { text: `Width: ${dr.width || 1.2}m` }),
          ),
          el('input', {
            type: 'range',
            min: '-6',
            max: '6',
            step: '0.2',
            value: String(dr.offset ?? 0),
            style: { width: '100%', accentColor: '#3b82f6' },
            oninput: (e) => {
              dr.offset = Number(e.target.value);
              this.markDirty();
              this.rebuild3D();
            },
          }),
        );
        doorList.append(item);
      });
    }

    // Add Door Form
    const wallSelect = el('select', { class: 'input', style: { width: '100%' } },
      el('option', { value: 'south', text: 'South Wall (+Z)' }),
      el('option', { value: 'north', text: 'North Wall (-Z)' }),
      el('option', { value: 'east', text: 'East Wall (+X)' }),
      el('option', { value: 'west', text: 'West Wall (-X)' }),
    );

    const typeSelect = el('select', { class: 'input', style: { width: '100%' } },
      ...DOOR_TYPES.map(([val, label]) => el('option', { value: val, text: label })),
    );

    const widthInput = el('input', { class: 'input', type: 'number', step: '0.1', value: '1.2' });
    const heightInput = el('input', { class: 'input', type: 'number', step: '0.1', value: '2.4' });
    const offsetInput = el('input', { class: 'input', type: 'number', step: '0.2', value: '0' });

    const addBtn = el('button', {
      type: 'button',
      class: 'btn btn-primary',
      style: { width: '100%', marginTop: '6px' },
      text: '➕ Add Door to Wall ("Build doorس")',
      onclick: () => {
        doors.push({
          wall: wallSelect.value,
          type: typeSelect.value,
          width: Number(widthInput.value) || 1.2,
          height: Number(heightInput.value) || 2.4,
          offset: Number(offsetInput.value) || 0,
        });
        this.markDirty();
        this.renderInspector();
        this.rebuild3D();
      },
    });

    return el('div', { style: { padding: '16px' } },
      el('h4', { style: { margin: '0 0 10px', fontSize: '0.95rem', color: '#f8fafc' }, text: `Doors in ${room.name || 'Room'}` }),
      doorList,
      el('fieldset', { style: { border: '1px solid #334155', borderRadius: '8px', padding: '12px' } },
        el('legend', { style: { fontSize: '0.82rem', color: '#60a5fa', fontWeight: '600', padding: '0 6px' }, text: '➕ Build New Door' }),
        el('label', { style: { fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '3px' }, text: 'Wall Placement:' }),
        wallSelect,
        el('label', { style: { fontSize: '0.8rem', color: '#94a3b8', display: 'block', margin: '8px 0 3px' }, text: 'Door Architectural Style:' }),
        typeSelect,
        el('div', { style: { display: 'flex', gap: '8px', margin: '8px 0' } },
          el('div', { style: { flex: '1' } },
            el('label', { style: { fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '3px' }, text: 'Width (m):' }),
            widthInput,
          ),
          el('div', { style: { flex: '1' } },
            el('label', { style: { fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '3px' }, text: 'Height (m):' }),
            heightInput,
          ),
          el('div', { style: { flex: '1' } },
            el('label', { style: { fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '3px' }, text: 'Offset (m):' }),
            offsetInput,
          ),
        ),
        addBtn,
      ),
    );
  }

  /* --------------------------------------------------------- Windows Tab */
  renderWindowsTab() {
    const room = this.currentRoom;
    if (!room) return el('p', { class: 'hint', style: { padding: '20px' }, text: 'Select a room first.' });

    const layout = room.layout || (room.layout = {});
    const windows = layout.windows || (layout.windows = []);

    const winList = el('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' } });

    if (!windows.length) {
      winList.append(el('p', { class: 'hint', text: 'No windows in this room yet. Add windows below to cut openings and install glass.' }));
    } else {
      windows.forEach((win, idx) => {
        const item = el('div', {
          style: {
            background: '#1a2333',
            border: '1px solid #334155',
            borderRadius: '6px',
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          },
        },
          el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
            el('strong', { style: { fontSize: '0.85rem', color: '#f8fafc' }, text: `🪟 Window ${idx + 1}: ${win.type || 'Standard'}` }),
            el('button', {
              type: 'button',
              class: 'btn btn-small',
              style: { background: '#7f1d1d', color: '#fca5a5', padding: '2px 8px', fontSize: '0.75rem' },
              text: '🗑️ Delete',
              onclick: () => {
                windows.splice(idx, 1);
                this.markDirty();
                this.renderInspector();
                this.rebuild3D();
              },
            }),
          ),
          el('div', { style: { display: 'flex', gap: '8px', fontSize: '0.8rem', color: '#94a3b8' } },
            el('span', { text: `Wall: ${win.wall?.toUpperCase() || 'NORTH'}` }),
            el('span', { text: `Offset: ${win.offset ?? 0}m` }),
            el('span', { text: `Width: ${win.width || 1.8}m` }),
          ),
          el('input', {
            type: 'range',
            min: '-6',
            max: '6',
            step: '0.2',
            value: String(win.offset ?? 0),
            style: { width: '100%', accentColor: '#3b82f6' },
            oninput: (e) => {
              win.offset = Number(e.target.value);
              this.markDirty();
              this.rebuild3D();
            },
          }),
        );
        winList.append(item);
      });
    }

    const wallSelect = el('select', { class: 'input', style: { width: '100%' } },
      el('option', { value: 'north', text: 'North Wall (-Z)' }),
      el('option', { value: 'south', text: 'South Wall (+Z)' }),
      el('option', { value: 'east', text: 'East Wall (+X)' }),
      el('option', { value: 'west', text: 'West Wall (-X)' }),
    );

    const typeSelect = el('select', { class: 'input', style: { width: '100%' } },
      ...WINDOW_TYPES.map(([val, label]) => el('option', { value: val, text: label })),
    );

    const widthInput = el('input', { class: 'input', type: 'number', step: '0.1', value: '2.4' });
    const heightInput = el('input', { class: 'input', type: 'number', step: '0.1', value: '1.8' });
    const sillInput = el('input', { class: 'input', type: 'number', step: '0.1', value: '0.6' });
    const offsetInput = el('input', { class: 'input', type: 'number', step: '0.2', value: '0' });

    const addBtn = el('button', {
      type: 'button',
      class: 'btn btn-primary',
      style: { width: '100%', marginTop: '6px' },
      text: '➕ Add Window to Wall ("Build Windows")',
      onclick: () => {
        windows.push({
          wall: wallSelect.value,
          type: typeSelect.value,
          width: Number(widthInput.value) || 2.4,
          height: Number(heightInput.value) || 1.8,
          sill_height: Number(sillInput.value) || 0.6,
          offset: Number(offsetInput.value) || 0,
        });
        this.markDirty();
        this.renderInspector();
        this.rebuild3D();
      },
    });

    return el('div', { style: { padding: '16px' } },
      el('h4', { style: { margin: '0 0 10px', fontSize: '0.95rem', color: '#f8fafc' }, text: `Windows in ${room.name || 'Room'}` }),
      winList,
      el('fieldset', { style: { border: '1px solid #334155', borderRadius: '8px', padding: '12px' } },
        el('legend', { style: { fontSize: '0.82rem', color: '#60a5fa', fontWeight: '600', padding: '0 6px' }, text: '➕ Build New Window' }),
        el('label', { style: { fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '3px' }, text: 'Wall Placement:' }),
        wallSelect,
        el('label', { style: { fontSize: '0.8rem', color: '#94a3b8', display: 'block', margin: '8px 0 3px' }, text: 'Window Type:' }),
        typeSelect,
        el('div', { style: { display: 'flex', gap: '8px', margin: '8px 0' } },
          el('div', { style: { flex: '1' } },
            el('label', { style: { fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '3px' }, text: 'Width (m):' }),
            widthInput,
          ),
          el('div', { style: { flex: '1' } },
            el('label', { style: { fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '3px' }, text: 'Height (m):' }),
            heightInput,
          ),
          el('div', { style: { flex: '1' } },
            el('label', { style: { fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '3px' }, text: 'Sill (m):' }),
            sillInput,
          ),
        ),
        addBtn,
      ),
    );
  }

  /* ------------------------------------------------------- Furniture Tab */
  renderFurnitureTab() {
    const room = this.currentRoom;
    if (!room) return el('p', { class: 'hint', style: { padding: '20px' }, text: 'Select a room first.' });

    const layout = room.layout || (room.layout = {});
    const objects = layout.objects || (layout.objects = []);

    // Selected Object Inspector Controls
    let selectedObjSection = null;
    const selectedObj = objects.find((o) => o.id === this.selectedObjectId);

    if (selectedObj) {
      selectedObjSection = el('div', {
        style: {
          background: '#1e293b',
          border: '1px solid #3b82f6',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '16px',
        },
      },
        el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' } },
          el('strong', { style: { color: '#60a5fa', fontSize: '0.9rem' }, text: `Selected: ${selectedObj.type}` }),
          el('button', {
            type: 'button',
            class: 'btn btn-small',
            style: { background: '#7f1d1d', color: '#fca5a5' },
            text: '🗑️ Delete',
            onclick: () => {
              const idx = objects.findIndex((o) => o.id === selectedObj.id);
              if (idx !== -1) objects.splice(idx, 1);
              this.selectObject(null);
              this.markDirty();
              this.renderInspector();
              this.rebuild3D();
            },
          }),
        ),
        el('div', { style: { display: 'flex', gap: '8px', marginBottom: '8px' } },
          el('div', { style: { flex: '1' } },
            el('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8' } },
              el('span', { text: 'Pos X:' }),
              el('span', { 'data-obj-val': 'x', style: { color: '#60a5fa' }, text: `${selectedObj.x || 0}m` }),
            ),
            el('input', {
              type: 'range',
              'data-obj-coord': 'x',
              min: String(-(layout.size?.w || 10) / 2),
              max: String((layout.size?.w || 10) / 2),
              step: '0.1',
              value: String(selectedObj.x || 0),
              style: { width: '100%', accentColor: '#3b82f6' },
              oninput: (e) => {
                selectedObj.x = Number(e.target.value);
                const valEl = this.inspectorPanel?.querySelector('[data-obj-val="x"]');
                if (valEl) valEl.textContent = `${selectedObj.x}m`;
                const objMesh = this.world?.objects?.get(selectedObj.id);
                if (objMesh) {
                  const rx = Number(layout.position?.x) || 0;
                  objMesh.position.x = rx + selectedObj.x;
                  if (this.objectBoxHelper) this.objectBoxHelper.update();
                }
                this.markDirty();
              },
            }),
          ),
          el('div', { style: { flex: '1' } },
            el('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8' } },
              el('span', { text: 'Pos Z:' }),
              el('span', { 'data-obj-val': 'z', style: { color: '#60a5fa' }, text: `${selectedObj.z || 0}m` }),
            ),
            el('input', {
              type: 'range',
              'data-obj-coord': 'z',
              min: String(-(layout.size?.d || 8) / 2),
              max: String((layout.size?.d || 8) / 2),
              step: '0.1',
              value: String(selectedObj.z || 0),
              style: { width: '100%', accentColor: '#3b82f6' },
              oninput: (e) => {
                selectedObj.z = Number(e.target.value);
                const valEl = this.inspectorPanel?.querySelector('[data-obj-val="z"]');
                if (valEl) valEl.textContent = `${selectedObj.z}m`;
                const objMesh = this.world?.objects?.get(selectedObj.id);
                if (objMesh) {
                  const rz = Number(layout.position?.z) || 0;
                  objMesh.position.z = rz + selectedObj.z;
                  if (this.objectBoxHelper) this.objectBoxHelper.update();
                }
                this.markDirty();
              },
            }),
          ),
        ),
        el('button', {
          type: 'button',
          class: 'btn btn-small',
          style: { width: '100%', background: '#334155', color: '#fff' },
          text: `🔄 Rotate 90° (Current: ${selectedObj.rot || 0}°)`,
          onclick: () => {
            selectedObj.rot = ((selectedObj.rot || 0) + 90) % 360;
            this.markDirty();
            this.rebuild3D();
            this.selectObject(selectedObj.id);
          },
        }),
      );
    }

    // Catalog Categories
    const catalogCards = el('div', { style: { display: 'flex', flexDirection: 'column', gap: '14px' } });

    FURNITURE_CATALOG.forEach((catGroup) => {
      const itemsGrid = el('div', {
        style: {
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '8px',
        },
      });

      catGroup.items.forEach((item) => {
        const btn = el('button', {
          type: 'button',
          class: 'btn btn-small',
          style: {
            background: '#131b2e',
            border: '1px solid #334155',
            color: '#e2e8f0',
            textAlign: 'left',
            padding: '8px 10px',
            fontSize: '0.78rem',
            borderRadius: '6px',
            cursor: 'pointer',
          },
          text: `➕ ${item.name}`,
          onclick: () => {
            const defParams = item.p || { w: 1.8, d: 0.8, color: '#3b4452' };
            const newObj = {
              id: `obj-${item.type}-${Date.now().toString(36)}`,
              type: item.type,
              x: 0,
              z: 0,
              rot: 0,
              p: { ...defParams },
            };
            objects.push(newObj);
            this.markDirty();
            this.rebuild3D();
            this.selectObject(newObj.id);
          },
        });
        itemsGrid.append(btn);
      });

      catalogCards.append(
        el('div', {},
          el('h5', { style: { margin: '0 0 6px', fontSize: '0.85rem', color: '#94a3b8' }, text: catGroup.cat }),
          itemsGrid,
        ),
      );
    });

    return el('div', { style: { padding: '16px' } },
      el('h4', { style: { margin: '0 0 10px', fontSize: '0.95rem', color: '#f8fafc' }, text: `Furnish & Decorate ("Build Every Thing")` }),
      selectedObjSection,
      catalogCards,
    );
  }

  /* ---------------------------------------------------------- Floors Tab */
  renderFloorsTab() {
    const list = el('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' } });

    this.floors.forEach((fl, idx) => {
      const item = el('div', {
        style: {
          background: '#1a2333',
          border: '1px solid #334155',
          borderRadius: '6px',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        },
      },
        el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
          el('strong', { style: { fontSize: '0.9rem', color: '#60a5fa' }, text: `Level ${fl.level}: ${fl.name || `Floor ${fl.level}`}` }),
          el('span', { style: { fontSize: '0.75rem', color: '#94a3b8' }, text: `${fl.rooms?.length || 0} room(s)` }),
        ),
        el('div', { style: { display: 'flex', gap: '8px' } },
          el('div', { style: { flex: '1' } },
            el('label', { style: { fontSize: '0.75rem', color: '#94a3b8' }, text: 'Height (m):' }),
            el('input', {
              class: 'input',
              type: 'number',
              step: '0.1',
              value: String(fl.height || 3.4),
              onchange: (e) => {
                fl.height = Number(e.target.value);
                this.markDirty();
                this.rebuild3D();
              },
            }),
          ),
          el('div', { style: { flex: '1' } },
            el('label', { style: { fontSize: '0.75rem', color: '#94a3b8' }, text: 'Elevation (m):' }),
            el('input', {
              class: 'input',
              type: 'number',
              step: '0.1',
              value: String(fl.elevation ?? (fl.level * 3.4)),
              onchange: (e) => {
                fl.elevation = Number(e.target.value);
                this.markDirty();
                this.rebuild3D();
              },
            }),
          ),
        ),
      );
      list.append(item);
    });

    const addFloorBtn = el('button', {
      type: 'button',
      class: 'btn btn-primary',
      style: { width: '100%' },
      text: '➕ Add New Floor Level',
      onclick: () => this.addNewFloor(),
    });

    return el('div', { style: { padding: '16px' } },
      el('h4', { style: { margin: '0 0 10px', fontSize: '0.95rem', color: '#f8fafc' }, text: 'Floors & Architectural Levels' }),
      list,
      addFloorBtn,
    );
  }

  /* ------------------------------------------------------------- Actions */
  addNewRoom() {
    const floor = this.currentFloor;
    if (!floor) return;
    if (!Array.isArray(floor.rooms)) floor.rooms = [];

    const count = floor.rooms.length + 1;
    // Offset each new room slightly so they don't overlap exactly
    const offsetX = (count - 1) * 11;

    floor.rooms.push({
      id: `room-${Date.now().toString(36)}`,
      name: `Room ${count}`,
      type: count === 1 ? 'living' : (count === 2 ? 'kitchen' : 'bedroom'),
      color: '#3b82f6',
      layout: {
        size: { w: 10, d: 8, h: 3.2 },
        position: { x: offsetX, z: 0 },
        theme: {
          floor: 'parquet',
          wall: 'plaster',
          wall_color: '#f8fafc',
          ceiling: 'gypsum_led',
          ceiling_color: '#ffffff',
          light: 'warm',
          brightness: 1.2,
        },
        doors: [{ wall: 'south', type: 'standard', offset: 0, width: 1.0, height: 2.2 }],
        windows: [{ wall: 'north', type: 'standard', offset: 0, width: 1.8, height: 1.5, sill_height: 0.8 }],
        objects: [],
      },
    });

    this.selectedRoomIdx = floor.rooms.length - 1;
    this.selectedObjectId = null;
    this.markDirty();
    this.renderInspector();
    this.updateSelectionToast();
    this.rebuild3D();
  }

  deleteCurrentRoom() {
    const floor = this.currentFloor;
    if (!floor || !floor.rooms?.length) return;
    if (!confirm(`Delete "${this.currentRoom?.name || 'this room'}"?`)) return;

    floor.rooms.splice(this.selectedRoomIdx, 1);
    this.selectedRoomIdx = Math.max(0, floor.rooms.length - 1);
    this.selectedObjectId = null;
    this.markDirty();
    this.renderInspector();
    this.updateSelectionToast();
    this.rebuild3D();
  }

  addNewFloor() {
    const nextLevel = this.floors.length;
    const defaultElevation = nextLevel * 3.4;
    const floorNames = ['Ground Floor', 'First Floor', 'Second Floor', 'Rooftop Terrace', 'Penthouse'];
    const floorName = floorNames[nextLevel] || `Floor Level ${nextLevel}`;

    this.floors.push({
      id: `floor-${nextLevel}`,
      name: floorName,
      level: nextLevel,
      height: 3.4,
      elevation: defaultElevation,
      rooms: [
        {
          id: `room-fl${nextLevel}-1`,
          name: `${floorName} Suite`,
          type: nextLevel === 3 ? 'balcony' : 'bedroom',
          layout: {
            size: { w: 10, d: 8, h: 3.2 },
            position: { x: 0, z: 0 },
            theme: {
              floor: nextLevel === 3 ? 'tile' : 'hardwood',
              wall: 'plaster',
              wall_color: '#ffffff',
              ceiling: nextLevel === 3 ? 'open_sky' : 'gypsum_led',
              ceiling_color: '#ffffff',
              light: 'warm',
              brightness: 1.2,
            },
            doors: [{ wall: 'south', type: 'sliding_glass', offset: 0, width: 1.8, height: 2.4 }],
            windows: [{ wall: 'north', type: 'panoramic', offset: 0, width: 3.0, height: 2.2, sill_height: 0.2 }],
            objects: [],
          },
        },
      ],
    });

    this.selectedFloorIdx = this.floors.length - 1;
    this.activeFloorLevel = nextLevel;
    this.selectedRoomIdx = 0;
    this.selectedObjectId = null;
    this.markDirty();
    this.updateFloorPills();
    this.renderInspector();
    this.rebuild3D();
  }

  markDirty() {
    this.ed.markDirty();
    if (this.saveBtn) {
      this.saveBtn.textContent = '💾 Save Changes *';
      this.saveBtn.classList.add('btn-primary');
    }
  }

  updateSelectionToast() {
    if (this.selectionToast) {
      const room = this.currentRoom;
      const floor = this.currentFloor;
      this.selectionToast.textContent = `Selected: ${room?.name || 'Room'} (${floor?.name || 'Floor'})`;
    }
  }

  /* ------------------------------------------------------------- WebGL */
  mount() {
    if (this.disposed || !this.canvas) return;

    const rect = this.viewportWrap.getBoundingClientRect();
    const w = rect.width || 800;
    const h = rect.height || 600;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(w, h, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.camera = new THREE.PerspectiveCamera(48, w / h, 0.1, 300);
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.01;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // 3D Transform Gizmo
    this.transformControls = new TransformControls(this.camera, this.canvas);
    this.transformControls.setMode('translate');
    this.transformControls.showY = false;
    this.transformControls.size = 0.8;
    this.transformControls.addEventListener('dragging-changed', (e) => {
      this.controls.enabled = !e.value;
      if (!e.value) {
        this.markDirty();
      }
    });
    this.transformControls.addEventListener('objectChange', () => {
      this.onGizmoMove();
    });

    this.bindCanvasEvents();
    this.bindKeyboardEvents();
    this.setIsoView();
    this.rebuild3D();

    const loop = () => {
      if (this.disposed) return;
      this.animationId = requestAnimationFrame(loop);
      this.controls.update();

      if (this.world) {
        this.world.time += 0.016;
        for (const u of this.world.updaters) u(0.016, this.world.time);
      }

      this.renderer.render(this.scene, this.camera);
    };
    loop();

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.viewportWrap);
  }

  rebuild3D() {
    if (!this.renderer) return;

    // Detach gizmo before rebuilding world
    if (this.transformControls) {
      this.transformControls.detach();
    }
    if (this.objectBoxHelper && this.scene) {
      this.scene.remove(this.objectBoxHelper);
      this.objectBoxHelper = null;
    }

    // Build the house world
    this.world = buildHouseWorld(
      { data: { house: this.house, library: this.ed.allHouses } },
      this.house,
      this.activeFloorLevel,
      { showCeilings: this.showCeilings, allFloors: this.activeFloorLevel === 'all' },
    );

    this.scene = this.world.scene;

    // Add gizmo helper back into scene
    if (this.transformControls) {
      this.scene.add(this.transformControls.getHelper());
    }

    // Apply lighting preset
    this.applyLighting();

    // Reapply ceilings toggle
    this.toggleCeilingsVisibility();

    // Selection highlight helper
    this.updateHighlightHelper();

    // Restore selected object if still exists
    if (this.selectedObjectId) {
      this.selectObject(this.selectedObjectId);
    }
  }

  selectObject(objectId) {
    this.selectedObjectId = objectId;

    if (this.objectBoxHelper && this.scene) {
      this.scene.remove(this.objectBoxHelper);
      this.objectBoxHelper = null;
    }

    if (objectId) {
      const objMesh = this.world?.objects?.get(objectId);
      if (objMesh) {
        this.objectBoxHelper = new THREE.BoxHelper(objMesh, 0x38bdf8);
        this.scene.add(this.objectBoxHelper);
        if (this.transformControls) {
          this.transformControls.attach(objMesh);
        }
        if (this.selectionToast) {
          const room = this.currentRoom;
          const obj = room?.layout?.objects?.find((o) => o.id === objectId);
          this.selectionToast.textContent = `Selected: ${obj?.type || 'Object'} in ${room?.name || 'Room'}`;
        }
      }
      this.activeTab = 'furniture';
      this.renderInspector();
    } else {
      if (this.transformControls) {
        this.transformControls.detach();
      }
      this.updateSelectionToast();
    }
  }

  onGizmoMove() {
    const objMesh = this.transformControls?.object;
    if (!objMesh || !this.selectedObjectId) return;
    const room = this.currentRoom;
    const rx = Number(room.layout?.position?.x) || 0;
    const rz = Number(room.layout?.position?.z) || 0;
    const obj = room.layout?.objects?.find((o) => o.id === this.selectedObjectId);
    if (obj) {
      obj.x = Math.round((objMesh.position.x - rx) * 10) / 10;
      obj.z = Math.round((objMesh.position.z - rz) * 10) / 10;
    }
    if (this.objectBoxHelper) this.objectBoxHelper.update();
    this.updateInspectorSliders(obj);
    this.markDirty();
  }

  updateInspectorSliders(obj) {
    if (!obj || !this.inspectorPanel) return;
    const xSlider = this.inspectorPanel.querySelector('input[data-obj-coord="x"]');
    const zSlider = this.inspectorPanel.querySelector('input[data-obj-coord="z"]');
    const xVal = this.inspectorPanel.querySelector('[data-obj-val="x"]');
    const zVal = this.inspectorPanel.querySelector('[data-obj-val="z"]');
    if (xSlider) xSlider.value = String(obj.x);
    if (zSlider) zSlider.value = String(obj.z);
    if (xVal) xVal.textContent = `${obj.x}m`;
    if (zVal) zVal.textContent = `${obj.z}m`;
  }

  bindKeyboardEvents() {
    this.onKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      if (!this.selectedObjectId) return;
      const room = this.currentRoom;
      const obj = room?.layout?.objects?.find((o) => o.id === this.selectedObjectId);
      if (!obj) return;
      const step = e.shiftKey ? 1.0 : 0.2;
      let moved = false;

      if (e.key === 'ArrowLeft') { obj.x -= step; moved = true; }
      else if (e.key === 'ArrowRight') { obj.x += step; moved = true; }
      else if (e.key === 'ArrowUp') { obj.z -= step; moved = true; }
      else if (e.key === 'ArrowDown') { obj.z += step; moved = true; }
      else if (e.key.toLowerCase() === 'r') { obj.rot = ((obj.rot || 0) + 90) % 360; moved = true; }
      else if (e.key === 'Delete' || e.key === 'Backspace') {
        const idx = room.layout.objects.findIndex((o) => o.id === this.selectedObjectId);
        if (idx !== -1) room.layout.objects.splice(idx, 1);
        this.selectObject(null);
        this.markDirty();
        this.rebuild3D();
        this.renderInspector();
        e.preventDefault();
        return;
      } else if (e.key === 'Escape') {
        this.selectObject(null);
        this.renderInspector();
        return;
      }

      if (moved) {
        e.preventDefault();
        obj.x = Math.round(obj.x * 10) / 10;
        obj.z = Math.round(obj.z * 10) / 10;
        this.markDirty();
        this.rebuild3D();
        this.renderInspector();
      }
    };
    window.addEventListener('keydown', this.onKeyDown);
  }

  toggleCeilingsVisibility() {
    if (!this.scene) return;
    this.scene.traverse((obj) => {
      if (obj.userData?.isCeiling) {
        obj.visible = this.showCeilings;
      }
    });
  }

  updateHighlightHelper() {
    if (!this.scene) return;

    if (this.highlightHelper) {
      this.scene.remove(this.highlightHelper);
      this.highlightHelper = null;
    }

    const room = this.currentRoom;
    if (!room) return;

    const layout = room.layout || {};
    const size = layout.size || { w: 10, d: 8, h: 3.2 };
    const pos = layout.position || { x: 0, z: 0 };
    const elevation = this.currentFloor?.elevation ?? (this.currentFloor?.level * 3.4 || 0);

    const rw = Number(size.w) || 10;
    const rd = Number(size.d) || 8;
    const rh = Number(size.h) || 3.2;
    const rx = Number(pos.x) || 0;
    const rz = Number(pos.z) || 0;

    const boxGeo = new THREE.BoxGeometry(rw + 0.1, rh + 0.1, rd + 0.1);
    const edges = new THREE.EdgesGeometry(boxGeo);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x3b82f6, linewidth: 2 });
    this.highlightHelper = new THREE.LineSegments(edges, lineMat);
    this.highlightHelper.position.set(rx, elevation + rh / 2, rz);
    this.scene.add(this.highlightHelper);
  }

  bindCanvasEvents() {
    this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.dragOffset = new THREE.Vector3();
    this.isDirectDragging = false;

    this.canvas.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return; // only left click
      if (this.transformControls?.dragging) return;

      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const meshes = [];
      this.scene?.traverse((c) => {
        if (c.isMesh && (c.userData.objectId || c.userData.roomId)) {
          meshes.push(c);
        }
      });

      const hits = this.raycaster.intersectObjects(meshes, true);
      if (hits.length > 0) {
        let clickedObjId = null;
        let clickedRoomId = null;
        for (const hit of hits) {
          let cur = hit.object;
          while (cur) {
            if (cur.userData?.objectId && !clickedObjId) {
              clickedObjId = cur.userData.objectId;
              break;
            }
            if (cur.userData?.roomId && !clickedRoomId) {
              clickedRoomId = cur.userData.roomId;
            }
            cur = cur.parent;
          }
          if (clickedObjId) break;
        }

        // If clicked on a furniture object: SELECT IT & START DRAG
        if (clickedObjId) {
          this.selectObject(clickedObjId);
          const objMesh = this.world?.objects?.get(clickedObjId);
          if (objMesh) {
            const elevation = this.currentFloor?.elevation ?? (this.currentFloor?.level * 3.4 || 0);
            this.dragPlane.constant = -elevation;
            const planeHit = new THREE.Vector3();
            if (this.raycaster.ray.intersectPlane(this.dragPlane, planeHit)) {
              this.dragOffset.subVectors(planeHit, objMesh.position);
              this.isDirectDragging = true;
              this.controls.enabled = false;
            }
          }
          return;
        }

        // If clicked on a room
        if (clickedRoomId) {
          const floor = this.currentFloor;
          const rIdx = floor?.rooms?.findIndex((r) => r.id === clickedRoomId);
          if (rIdx !== undefined && rIdx !== -1) {
            this.selectedRoomIdx = rIdx;
            this.selectObject(null);
            this.updateSelectionToast();
            this.renderInspector();
            this.updateHighlightHelper();
            return;
          }
        }
      }

      // Clicked ground outside -> deselect object
      if (this.selectedObjectId) {
        this.selectObject(null);
        this.renderInspector();
      }
    });

    this.canvas.addEventListener('pointermove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (this.isDirectDragging && this.selectedObjectId) {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const planeHit = new THREE.Vector3();
        if (this.raycaster.ray.intersectPlane(this.dragPlane, planeHit)) {
          const objMesh = this.world?.objects?.get(this.selectedObjectId);
          if (objMesh) {
            const newWorldX = planeHit.x - this.dragOffset.x;
            const newWorldZ = planeHit.z - this.dragOffset.z;
            objMesh.position.x = newWorldX;
            objMesh.position.z = newWorldZ;

            const room = this.currentRoom;
            const rx = Number(room.layout?.position?.x) || 0;
            const rz = Number(room.layout?.position?.z) || 0;
            const obj = room.layout?.objects?.find((o) => o.id === this.selectedObjectId);
            if (obj) {
              obj.x = Math.round((newWorldX - rx) * 10) / 10;
              obj.z = Math.round((newWorldZ - rz) * 10) / 10;
            }

            if (this.objectBoxHelper) this.objectBoxHelper.update();
            this.updateInspectorSliders(obj);
            this.markDirty();
          }
        }
        this.canvas.style.cursor = 'grabbing';
        return;
      }

      // Hover feedback
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const meshes = [];
      this.scene?.traverse((c) => {
        if (c.isMesh && (c.userData.objectId || c.userData.roomId)) {
          meshes.push(c);
        }
      });
      const hits = this.raycaster.intersectObjects(meshes, true);
      const isOverObject = hits.some((h) => {
        let cur = h.object;
        while (cur) {
          if (cur.userData?.objectId) return true;
          cur = cur.parent;
        }
        return false;
      });
      this.canvas.style.cursor = isOverObject ? 'pointer' : 'default';
    });

    const stopDragging = () => {
      if (this.isDirectDragging) {
        this.isDirectDragging = false;
        this.controls.enabled = true;
        this.markDirty();
      }
    };

    this.canvas.addEventListener('pointerup', stopDragging);
    this.canvas.addEventListener('pointercancel', stopDragging);
  }

  /* ------------------------------------------------------ Camera Presets */
  setOrbitView() {
    const plotSize = Math.max(Number(this.house.plot_width) || 30, Number(this.house.plot_depth) || 30);
    this.camera.position.set(plotSize * 0.7, plotSize * 0.6, plotSize * 0.8);
    this.controls.target.set(0, 2, 0);
    this.controls.update();
  }

  setTopView() {
    const plotSize = Math.max(Number(this.house.plot_width) || 30, Number(this.house.plot_depth) || 30);
    this.camera.position.set(0, plotSize * 1.5, 0.01);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  setIsoView() {
    const plotSize = Math.max(Number(this.house.plot_width) || 30, Number(this.house.plot_depth) || 30);
    this.camera.position.set(plotSize * 0.6, plotSize * 0.5, plotSize * 0.6);
    this.controls.target.set(0, 1.5, 0);
    this.controls.update();
  }

  cycleLighting() {
    if (this.lightingMode === 'day') this.lightingMode = 'sunset';
    else if (this.lightingMode === 'sunset') this.lightingMode = 'night';
    else this.lightingMode = 'day';

    if (this.lightBtn) {
      if (this.lightingMode === 'day') {
        this.lightBtn.textContent = '☀️ Day';
        this.lightBtn.style.color = '#fef08a';
      } else if (this.lightingMode === 'sunset') {
        this.lightBtn.textContent = '🌅 Sunset';
        this.lightBtn.style.color = '#fdba74';
      } else {
        this.lightBtn.textContent = '🌙 Night';
        this.lightBtn.style.color = '#93c5fd';
      }
    }

    this.applyLighting();
  }

  applyLighting() {
    if (!this.scene) return;
    if (this.lightingMode === 'sunset') {
      this.scene.background = new THREE.Color('#fdba74');
      if (this.scene.fog) this.scene.fog.color = new THREE.Color('#fdba74');
    } else if (this.lightingMode === 'night') {
      this.scene.background = new THREE.Color('#0a0f1d');
      if (this.scene.fog) this.scene.fog.color = new THREE.Color('#0a0f1d');
    } else {
      const sky = this.house.environment?.sky_color || '#cfe0ff';
      this.scene.background = new THREE.Color(sky);
      if (this.scene.fog) this.scene.fog.color = new THREE.Color(sky);
    }
  }

  resize() {
    if (!this.viewportWrap || !this.renderer) return;
    const rect = this.viewportWrap.getBoundingClientRect();
    const w = rect.width || 800;
    const h = rect.height || 600;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  dispose() {
    this.disposed = true;
    if (this.animationId) cancelAnimationFrame(this.animationId);
    if (this.resizeObserver) this.resizeObserver.disconnect();
    if (this.onKeyDown) window.removeEventListener('keydown', this.onKeyDown);
    if (this.transformControls) this.transformControls.dispose();
    if (this.controls) this.controls.dispose();
    if (this.renderer) this.renderer.dispose();
  }
}
