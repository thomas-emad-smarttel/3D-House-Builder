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
    this.selectedDoorId = null;
    this.selectedWindowId = null;
    this.selectedWallKey = 'all'; // 'all' | 'south' | 'north' | 'east' | 'west'
    this.activeTab = 'rooms'; // 'rooms' | 'doors' | 'windows' | 'furniture'
    this.showCeilings = false; // default cutaway so admin sees inside clearly
    this.lightingMode = 'day'; // 'day' | 'sunset' | 'night'
    this.activeFloorLevel = 0; // 0, 1, 2... or 'all'
    this.disposed = false;
    this.animationId = null;

    // Undo / Redo Step History
    this.undoStack = [];
    this.redoStack = [];
    this.maxHistory = 50;

    // Camera Navigation State (W + S + A + D)
    this.keysDown = new Set();
    this.shiftHeld = false;

    // Ensure floors and rooms exist
    if (!this.house.floors || !this.house.floors.length) {
      if (this.house.floors_data && Array.isArray(this.house.floors_data) && this.house.floors_data.length) {
        this.house.floors = this.house.floors_data;
      }
    }
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

    // Ensure architectural stairs exist
    if (!this.house.stairs) {
      if (Array.isArray(this.house.environment?.stairs) && this.house.environment.stairs.length > 0) {
        this.house.stairs = this.house.environment.stairs;
      } else {
        this.house.stairs = [
          {
            id: 'stairs-foyer',
            name: 'Grand Foyer Stairs (Level 0 ➔ Level 1)',
            startX: -9.0,
            startY: 0.0,
            startZ: 2.2,
            endX: -9.0,
            endY: 3.4,
            endZ: -2.2,
            width: 1.4,
            steps: 18,
            style: 'floating_wood',
          },
        ];
      }
    }
    if (!this.house.environment) this.house.environment = {};
    this.house.environment.stairs = this.house.stairs;
    this.selectedStairsId = this.house.stairs[0]?.id || null;
  }

  get floors() {
    return this.house.floors || [];
  }

  get stairs() {
    if (!this.house.stairs) {
      this.house.stairs = this.house.environment?.stairs || [];
    }
    return this.house.stairs;
  }

  get currentFloor() {
    return this.floors[this.selectedFloorIdx] || this.floors[0];
  }

  get currentRoom() {
    const r = this.currentFloor?.rooms?.[this.selectedRoomIdx] || this.currentFloor?.rooms?.[0] || null;
    return r;
  }

  render() {
    this.inspectorCollapsed = false;

    this.wrap = el('div', {
      class: 'house-builder-3d-app',
      style: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: '480px',
        background: '#090d16',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid #1e293b',
        boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
      },
    });

    this.topbar = this.buildTopBar();
    this.body = el('div', {
      class: 'body-container',
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
        width: 'clamp(300px, 28vw, 420px)',
        minWidth: '280px',
        maxWidth: '440px',
        background: '#0f172a',
        borderLeft: '1px solid #1e293b',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        overflowX: 'hidden',
        zIndex: '15',
        flexShrink: '0',
        transition: 'all 0.2s ease',
      },
    });

    this.body.append(this.viewportWrap, this.inspectorPanel);
    this.wrap.append(this.topbar, this.body);

    this.renderInspector();

    // Defer WebGL mounting until attached to DOM
    setTimeout(() => this.mount(), 50);

    return this.wrap;
  }

  toggleInspector() {
    this.inspectorCollapsed = !this.inspectorCollapsed;
    if (this.inspectorPanel) {
      if (this.inspectorCollapsed) {
        this.inspectorPanel.style.display = 'none';
        if (this.inspectorToggleBtn) {
          this.inspectorToggleBtn.style.background = '#1e293b';
          this.inspectorToggleBtn.style.color = '#94a3b8';
          this.inspectorToggleBtn.textContent = '🎛️ Show Inspector';
        }
      } else {
        this.inspectorPanel.style.display = 'flex';
        if (this.inspectorToggleBtn) {
          this.inspectorToggleBtn.style.background = '#2563eb';
          this.inspectorToggleBtn.style.color = '#fff';
          this.inspectorToggleBtn.textContent = '🎛️ Inspector';
        }
      }
    }
    setTimeout(() => this.resize(), 100);
  }

  buildTopBar() {
    const titleEl = el('div', {
      class: 'builder-title-block',
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexShrink: '0',
        minWidth: '0',
      },
    },
      el('span', { style: { fontSize: '1.3rem', flexShrink: '0' }, text: '🏗️' }),
      el('div', { style: { minWidth: '0' } },
        el('h3', {
          style: {
            margin: 0,
            fontSize: '0.98rem',
            color: '#f8fafc',
            fontWeight: '700',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '280px',
          },
          text: `3D Builder: ${this.house.title || 'Villa'}`,
        }),
        el('span', { style: { fontSize: '0.72rem', color: '#64748b', display: 'block', whiteSpace: 'nowrap' }, text: 'Visual Architectural Studio' }),
      ),
    );

    // Inspector toggle button
    this.inspectorToggleBtn = el('button', {
      type: 'button',
      class: 'btn btn-small',
      style: { background: '#1e293b', color: '#60a5fa', border: '1px solid #3b82f6', fontWeight: '600', flexShrink: '0' },
      text: '🎛️ Inspector',
      title: 'Toggle Inspector Sidebar',
      onclick: () => this.toggleInspector(),
    });

    // Ceilings Toggle
    this.ceilingBtn = el('button', {
      type: 'button',
      class: 'btn btn-small',
      style: { background: this.showCeilings ? '#3b82f6' : '#1e293b', color: '#fff', border: '1px solid #334155', flexShrink: '0' },
      text: this.showCeilings ? '👁️ Ceilings: On' : '👁️ Cutaway',
      title: 'Toggle ceiling cutaway',
      onclick: () => {
        this.showCeilings = !this.showCeilings;
        this.ceilingBtn.textContent = this.showCeilings ? '👁️ Ceilings: On' : '👁️ Cutaway';
        this.ceilingBtn.style.background = this.showCeilings ? '#3b82f6' : '#1e293b';
        this.toggleCeilingsVisibility();
      },
    });

    // View Modes
    const orbitBtn = el('button', {
      type: 'button',
      class: 'btn btn-small',
      style: { background: '#1e293b', color: '#cbd5e1', flexShrink: '0' },
      text: '🔄 Orbit',
      title: '3D Orbit View',
      onclick: () => this.setOrbitView(),
    });

    const topBtn = el('button', {
      type: 'button',
      class: 'btn btn-small',
      style: { background: '#1e293b', color: '#cbd5e1', flexShrink: '0' },
      text: '📐 Top Plan',
      title: 'Top Architectural 2D Plan',
      onclick: () => this.setTopView(),
    });

    const isoBtn = el('button', {
      type: 'button',
      class: 'btn btn-small',
      style: { background: '#1e293b', color: '#cbd5e1', flexShrink: '0' },
      text: '🏠 Iso',
      title: 'Isometric View',
      onclick: () => this.setIsoView(),
    });

    // Lighting Toggle
    this.lightBtn = el('button', {
      type: 'button',
      class: 'btn btn-small',
      style: { background: '#1e293b', color: '#fef08a', flexShrink: '0' },
      text: '☀️ Day',
      title: 'Cycle Daylight / Sunset / Night',
      onclick: () => this.cycleLighting(),
    });

    // Undo Button
    this.undoBtn = el('button', {
      type: 'button',
      class: 'btn btn-small',
      style: { background: '#1e293b', color: '#cbd5e1', flexShrink: '0', opacity: '0.5' },
      text: '↩️ Undo',
      title: 'Undo last step (Ctrl+Z)',
      onclick: () => this.undo(),
    });

    // Redo Button
    this.redoBtn = el('button', {
      type: 'button',
      class: 'btn btn-small',
      style: { background: '#1e293b', color: '#cbd5e1', flexShrink: '0', opacity: '0.5' },
      text: '↪️ Redo',
      title: 'Redo last step (Ctrl+Y)',
      onclick: () => this.redo(),
    });

    // Save Button
    this.saveBtn = el('button', {
      type: 'button',
      class: 'btn btn-small btn-primary',
      style: { fontWeight: '600', flexShrink: '0' },
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
      style: { background: '#334155', color: '#fff', textDecoration: 'none', flexShrink: '0' },
      href: `/house/${this.house.slug || ''}?admin=1`,
      target: '_blank',
      rel: 'noopener',
      text: '🎮 Full Tour ↗',
    });

    // Action buttons toolbar
    const actionStrip = el('div', {
      class: 'builder-action-strip',
      style: {
        display: 'flex',
        gap: '6px',
        alignItems: 'center',
        flexWrap: 'wrap',
        justifyContent: 'flex-end',
      },
    },
      this.ceilingBtn,
      orbitBtn,
      topBtn,
      isoBtn,
      this.lightBtn,
      this.undoBtn,
      this.redoBtn,
      this.saveBtn,
      tourLink,
      this.inspectorToggleBtn,
    );

    // Row 1: Title on left, actions on right
    const row1 = el('div', {
      class: 'builder-topbar-row1',
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        flexWrap: 'wrap',
        width: '100%',
      },
    }, titleEl, actionStrip);

    // Row 2: Scrollable Floors & Rooms navigation strip
    this.floorPillsWrap = el('div', {
      class: 'builder-topbar-row2',
      style: {
        display: 'flex',
        gap: '6px',
        alignItems: 'center',
        overflowX: 'auto',
        width: '100%',
        paddingBottom: '2px',
      },
    });
    this.updateFloorPills();

    return el('header', {
      class: 'builder-topbar',
      style: {
        padding: '10px 14px',
        background: '#0d1322',
        borderBottom: '1px solid #1e293b',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        zIndex: '20',
      },
    }, row1, this.floorPillsWrap);
  }

  updateFloorPills() {
    const isAll = this.activeFloorLevel === 'all';

    // 1. Floor level switcher pills
    const floorButtons = [
      el('button', {
        type: 'button',
        class: `btn btn-small${isAll ? ' btn-primary' : ''}`,
        style: {
          fontSize: '0.8rem',
          background: isAll ? '#8b5cf6' : '#1e293b',
          color: '#fff',
          border: isAll ? '1px solid #c084fc' : '1px solid #334155',
          fontWeight: isAll ? '700' : 'normal',
          whiteSpace: 'nowrap',
          cursor: 'pointer',
          flexShrink: '0',
        },
        text: '🏢 Dollhouse (All Floors)',
        title: 'View all floors together with connecting stairs',
        onclick: () => {
          this.activeFloorLevel = 'all';
          this.updateFloorPills();
          this.renderInspector();
          this.rebuild3D();
        },
      }),
      ...this.floors.map((fl, idx) => {
        const isCurrent = !isAll && this.selectedFloorIdx === idx;
        return el('button', {
          type: 'button',
          class: `btn btn-small${isCurrent ? ' btn-primary' : ''}`,
          style: {
            fontSize: '0.8rem',
            background: isCurrent ? '#2563eb' : '#1e293b',
            color: isCurrent ? '#fff' : '#cbd5e1',
            border: isCurrent ? '1px solid #60a5fa' : '1px solid #334155',
            fontWeight: isCurrent ? '700' : 'normal',
            whiteSpace: 'nowrap',
            cursor: 'pointer',
            flexShrink: '0',
          },
          text: `Level ${fl.level ?? idx}: ${fl.name || `Floor ${idx}`}`,
          onclick: () => {
            this.selectedFloorIdx = idx;
            this.activeFloorLevel = fl.level ?? idx;
            this.selectedRoomIdx = 0;
            this.selectedObjectId = null;
            this.updateFloorPills();
            this.renderInspector();
            this.updateSelectionToast();
            this.rebuild3D();
          },
        });
      }),
      el('button', {
        type: 'button',
        class: 'btn btn-small',
        style: { fontSize: '0.8rem', background: '#1e293b', color: '#38bdf8', border: '1px dashed #0284c7', fontWeight: '600', whiteSpace: 'nowrap', cursor: 'pointer', flexShrink: '0' },
        text: '➕ Floor',
        title: 'Add a new floor story level',
        onclick: () => this.addNewFloor(),
      }),
    ];

    // 2. Room buttons for active floor
    const rooms = this.currentFloor?.rooms || [];
    const roomButtons = rooms.map((rm, idx) => {
      const isActive = !isAll && this.selectedRoomIdx === idx;
      const icons = { living: '🛋️', kitchen: '🍳', bedroom: '🛏️', bathroom: '🚿', balcony: '🌿' };
      const icon = icons[rm.type] || '🏠';
      return el('button', {
        type: 'button',
        class: `btn btn-small${isActive ? ' btn-primary' : ''}`,
        style: {
          fontSize: '0.78rem',
          background: isActive ? '#059669' : '#131b2e',
          color: isActive ? '#fff' : '#94a3b8',
          border: isActive ? '1px solid #34d399' : '1px solid #2d3b55',
          fontWeight: isActive ? '600' : 'normal',
          whiteSpace: 'nowrap',
          cursor: 'pointer',
          flexShrink: '0',
        },
        text: `${icon} ${rm.name || `Room ${idx + 1}`}`,
        onclick: () => {
          if (this.activeFloorLevel === 'all') {
            this.activeFloorLevel = this.currentFloor?.level ?? 0;
            this.rebuild3D();
          }
          this.selectedRoomIdx = idx;
          this.selectedObjectId = null;
          this.updateFloorPills();
          this.renderInspector();
          this.updateSelectionToast();
          this.selectRoomIn3D(idx);
        },
      });
    });

    const addRoomBtn = el('button', {
      type: 'button',
      class: 'btn btn-small',
      style: { fontSize: '0.78rem', background: '#131b2e', color: '#10b981', border: '1px dashed #059669', fontWeight: '600', whiteSpace: 'nowrap', cursor: 'pointer', flexShrink: '0' },
      text: '➕ Room',
      onclick: () => this.addNewRoom(),
    });

    const divider = el('div', {
      style: {
        width: '1px',
        height: '24px',
        background: '#334155',
        margin: '0 6px',
        flexShrink: '0',
      },
    });

    this.floorPillsWrap.replaceChildren(
      el('span', { style: { fontSize: '0.72rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginRight: '2px', flexShrink: '0' }, text: 'Levels:' }),
      ...floorButtons,
      divider,
      el('span', { style: { fontSize: '0.72rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginRight: '2px', flexShrink: '0' }, text: 'Rooms:' }),
      ...roomButtons,
      addRoomBtn,
    );
  }

  selectRoomIn3D(idx) {
    const room = this.currentFloor?.rooms?.[idx];
    if (!room) return;
    const pos = room.layout?.position || { x: 0, z: 0 };
    const rx = Number(pos.x) || 0;
    const rz = Number(pos.z) || 0;
    if (this.controls) {
      this.controls.target.set(rx, 1.2, rz);
      this.controls.update();
    }
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
      class: 'builder-hud-overlay',
      style: {
        position: 'absolute',
        bottom: '12px',
        left: '12px',
        background: 'rgba(15, 23, 42, 0.88)',
        backdropFilter: 'blur(8px)',
        border: '1px solid #334155',
        padding: '6px 12px',
        borderRadius: '8px',
        color: '#94a3b8',
        fontSize: '0.75rem',
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        maxWidth: 'calc(100% - 24px)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      },
      text: '🎮 W/A/S/D: Move Camera · 🖱️ Orbit / Pan · ↩️ Ctrl+Z: Undo · ↪️ Ctrl+Y: Redo · 🏹 Arrows: Move Selected',
    });

    this.selectionToast = el('div', {
      class: 'builder-selection-toast',
      style: {
        position: 'absolute',
        top: '12px',
        left: '12px',
        background: 'rgba(30, 41, 59, 0.92)',
        backdropFilter: 'blur(8px)',
        border: '1px solid #475569',
        padding: '6px 12px',
        borderRadius: '6px',
        color: '#e2e8f0',
        fontSize: '0.82rem',
        fontWeight: '600',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        maxWidth: 'calc(100% - 24px)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        pointerEvents: 'none',
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
      { id: 'levels', icon: '🏢', label: 'Floors & Stairs' },
      { id: 'rooms', icon: '🛋️', label: 'Rooms & Walls' },
      { id: 'doors', icon: '🚪', label: 'Doors' },
      { id: 'windows', icon: '🪟', label: 'Windows' },
      { id: 'furniture', icon: '🪑', label: 'Furnish' },
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
        padding: '12px 4px',
        fontSize: '0.75rem',
        fontWeight: '600',
        background: this.activeTab === t.id ? '#1e293b' : 'transparent',
        color: this.activeTab === t.id ? '#60a5fa' : '#64748b',
        border: 'none',
        borderBottom: this.activeTab === t.id ? '2px solid #3b82f6' : '2px solid transparent',
        cursor: 'pointer',
        textAlign: 'center',
        transition: 'all 0.15s ease',
        whiteSpace: 'nowrap',
      },
      text: `${t.icon} ${t.label}`,
      onclick: () => {
        this.activeTab = t.id;
        this.renderInspector();
      },
    })));

    let tabContent = null;
    if (this.activeTab === 'levels' || this.activeTab === 'floors') tabContent = this.renderLevelsAndStairsTab();
    else if (this.activeTab === 'rooms') tabContent = this.renderRoomsTab();
    else if (this.activeTab === 'doors') tabContent = this.renderDoorsTab();
    else if (this.activeTab === 'windows') tabContent = this.renderWindowsTab();
    else if (this.activeTab === 'furniture') tabContent = this.renderFurnitureTab();

    if (!this._inspectorHistoryAttached && this.inspectorPanel) {
      this._inspectorHistoryAttached = true;
      this.inspectorPanel.addEventListener('focusin', (e) => {
        if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) {
          this.saveHistorySnapshot();
        }
      });
      this.inspectorPanel.addEventListener('pointerdown', (e) => {
        if (['INPUT', 'SELECT', 'BUTTON'].includes(e.target.tagName)) {
          this.saveHistorySnapshot();
        }
      });
    }

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
      style: { width: '100%', boxSizing: 'border-box' },
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
      style: { width: '100%', boxSizing: 'border-box' },
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
      style: { width: '100%', marginBottom: '10px' },
      onchange: (e) => {
        theme.wall = e.target.value;
        this.markDirty();
        this.rebuild3D();
      },
    }, ...WALL_MATERIALS.map(([val, label]) => el('option', { value: val, selected: theme.wall === val, text: label })));

    const currentWallTarget = this.selectedWallKey || 'all';
    const wallColors = theme.wall_colors || (theme.wall_colors = {});
    const activeColor = (currentWallTarget !== 'all' && wallColors[currentWallTarget])
      ? wallColors[currentWallTarget]
      : (theme.wall_color || '#f3f4f6');

    const wallTargets = [
      { key: 'all', label: '🏠 All Walls' },
      { key: 'south', label: 'South Wall (+Z)' },
      { key: 'north', label: 'North Wall (-Z)' },
      { key: 'east', label: 'East Wall (+X)' },
      { key: 'west', label: 'West Wall (-X)' },
    ];

    const wallTargetBar = el('div', {
      style: { display: 'flex', gap: '4px', marginBottom: '8px', flexWrap: 'wrap' },
    }, ...wallTargets.map((t) => el('button', {
      type: 'button',
      class: 'btn btn-small',
      style: {
        flex: '1',
        minWidth: '58px',
        fontSize: '0.72rem',
        padding: '5px 4px',
        background: currentWallTarget === t.key ? '#2563eb' : '#1e293b',
        color: currentWallTarget === t.key ? '#fff' : '#94a3b8',
        border: currentWallTarget === t.key ? '1px solid #60a5fa' : '1px solid #334155',
      },
      text: t.label,
      onclick: () => {
        this.selectedWallKey = t.key;
        this.renderInspector();
      },
    })));

    const applyWallColor = (hex) => {
      if (currentWallTarget === 'all') {
        theme.wall_color = hex;
        delete theme.wall_colors;
      } else {
        if (!theme.wall_colors) theme.wall_colors = {};
        theme.wall_colors[currentWallTarget] = hex;
      }
      this.markDirty();
      this.rebuild3D();
    };

    const wallColorInput = el('input', {
      type: 'color',
      value: activeColor,
      style: { width: '46px', height: '38px', border: 'none', background: 'none', cursor: 'pointer', borderRadius: '4px' },
      oninput: (e) => {
        hexInput.value = e.target.value.toUpperCase();
        applyWallColor(e.target.value);
      },
    });

    const hexInput = el('input', {
      type: 'text',
      class: 'input',
      value: activeColor.toUpperCase(),
      style: { width: '92px', fontFamily: 'monospace', textTransform: 'uppercase', fontSize: '0.85rem' },
      oninput: (e) => {
        const val = e.target.value.trim();
        if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
          wallColorInput.value = val;
          applyWallColor(val);
        }
      },
    });

    const presetColors = [
      { hex: '#FFFFFF', name: 'Pure White' },
      { hex: '#F3F4F6', name: 'Plaster White' },
      { hex: '#F5EFE6', name: 'Warm Linen' },
      { hex: '#E6DDCF', name: 'Soft Sand' },
      { hex: '#CBD5E1', name: 'Light Slate' },
      { hex: '#64748B', name: 'Cool Gray' },
      { hex: '#334155', name: 'Charcoal' },
      { hex: '#1E293B', name: 'Midnight Navy' },
      { hex: '#5F7464', name: 'Sage Green' },
      { hex: '#B45309', name: 'Terracotta' },
      { hex: '#3B82F6', name: 'Azure Accent' },
      { hex: '#0F766E', name: 'Deep Teal' },
    ];

    const swatchRow = el('div', {
      style: { display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '6px', marginTop: '10px' },
    }, ...presetColors.map((c) => el('button', {
      type: 'button',
      title: `${c.name} (${c.hex})`,
      style: {
        height: '28px',
        borderRadius: '5px',
        backgroundColor: c.hex,
        border: (activeColor.toUpperCase() === c.hex.toUpperCase()) ? '2px solid #60a5fa' : '1px solid rgba(255,255,255,0.2)',
        cursor: 'pointer',
        boxShadow: (activeColor.toUpperCase() === c.hex.toUpperCase()) ? '0 0 6px #3b82f6' : 'none',
      },
      onclick: () => {
        wallColorInput.value = c.hex;
        hexInput.value = c.hex;
        applyWallColor(c.hex);
        this.renderInspector();
      },
    })));

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
      el('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' } },
        el('div', { style: { minWidth: '0' } },
          el('label', { style: { fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }, text: 'Room Name:' }),
          nameInput,
        ),
        el('div', { style: { minWidth: '0' } },
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
        el('legend', { style: { fontSize: '0.82rem', color: '#cbd5e1', fontWeight: '600', padding: '0 6px' }, text: '🧱 Wall Material & Color ("Change Wall Color")' }),
        el('label', { style: { fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }, text: 'Target Wall to Paint:' }),
        wallTargetBar,
        el('label', { style: { fontSize: '0.78rem', color: '#94a3b8', display: 'block', margin: '8px 0 4px' }, text: 'Wall Architectural Material Texture:' }),
        wallMatSelect,
        el('label', { style: { fontSize: '0.78rem', color: '#94a3b8', display: 'block', margin: '8px 0 4px' }, text: 'Wall Paint Color:' }),
        el('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
          wallColorInput,
          hexInput,
          el('span', { style: { fontSize: '0.75rem', color: '#94a3b8' }, text: currentWallTarget === 'all' ? '(Applies to all walls)' : `(Applies to ${currentWallTarget} wall)` }),
        ),
        el('label', { style: { fontSize: '0.78rem', color: '#94a3b8', display: 'block', margin: '10px 0 2px' }, text: '🎨 Modern Designer Palette Swatches:' }),
        swatchRow,
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
    const size = layout.size || { w: 10, d: 8 };

    const doorList = el('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' } });

    if (!doors.length) {
      doorList.append(el('p', { class: 'hint', text: 'No doors built in this room yet. Add doors below to create wall openings and interactive doors.' }));
    } else {
      doors.forEach((dr, idx) => {
        if (!dr.id) dr.id = `door-${room.id || 'r'}-${idx + 1}-${Math.random().toString(36).slice(2, 6)}`;
        const isSelected = this.selectedDoorId === dr.id;
        const currentWall = (dr.wall || 'south').toLowerCase();
        const wallLen = (currentWall === 'east' || currentWall === 'west') ? (size.d || 8) : (size.w || 10);
        const maxOffset = Math.max(0.2, (wallLen / 2) - ((Number(dr.width) || 1.2) / 2) - 0.2);

        const offsetBadge = el('span', {
          style: { fontSize: '0.78rem', color: '#60a5fa', fontWeight: '600' },
          text: (dr.offset || 0) === 0 ? 'Center (0.0m)' : `${(dr.offset || 0) > 0 ? '+' : ''}${Number(dr.offset || 0).toFixed(1)}m`,
        });

        const offsetSlider = el('input', {
          type: 'range',
          min: (-maxOffset).toFixed(1),
          max: maxOffset.toFixed(1),
          step: '0.1',
          value: String(dr.offset ?? 0),
          style: { width: '100%', accentColor: '#3b82f6', margin: '4px 0' },
          oninput: (e) => {
            dr.offset = Number(e.target.value);
            offsetBadge.textContent = dr.offset === 0 ? 'Center (0.0m)' : `${dr.offset > 0 ? '+' : ''}${dr.offset.toFixed(1)}m`;
            this.selectedDoorId = dr.id;
            this.markDirty();
            this.rebuild3D();
          },
        });

        const wallDropdown = el('select', {
          class: 'input',
          style: { width: '100%', fontWeight: '600', color: '#60a5fa' },
          onchange: (e) => {
            dr.wall = e.target.value;
            dr.offset = 0; // reset to center of chosen wall
            this.selectedDoorId = dr.id;
            this.markDirty();
            this.renderInspector();
            this.rebuild3D();
          },
        },
          el('option', { value: 'south', selected: currentWall === 'south', text: 'South Wall (+Z · Front)' }),
          el('option', { value: 'north', selected: currentWall === 'north', text: 'North Wall (-Z · Back)' }),
          el('option', { value: 'east', selected: currentWall === 'east', text: 'East Wall (+X · Right)' }),
          el('option', { value: 'west', selected: currentWall === 'west', text: 'West Wall (-X · Left)' }),
        );

        const styleDropdown = el('select', {
          class: 'input',
          style: { width: '100%' },
          onchange: (e) => {
            dr.type = e.target.value;
            this.selectedDoorId = dr.id;
            this.markDirty();
            this.rebuild3D();
          },
        }, ...DOOR_TYPES.map(([val, label]) => el('option', { value: val, selected: dr.type === val, text: label })));

        const item = el('div', {
          style: {
            background: isSelected ? '#1e293b' : '#141c2b',
            border: isSelected ? '2px solid #3b82f6' : '1px solid #334155',
            borderRadius: '8px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            boxShadow: isSelected ? '0 0 10px rgba(59,130,246,0.25)' : 'none',
          },
        },
          el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
            el('strong', { style: { fontSize: '0.88rem', color: isSelected ? '#60a5fa' : '#f8fafc' }, text: `🚪 Door ${idx + 1}: ${dr.type || 'Standard'}` }),
            el('div', { style: { display: 'flex', gap: '6px' } },
              el('button', {
                type: 'button',
                class: 'btn btn-small',
                style: { background: '#7f1d1d', color: '#fca5a5', padding: '2px 8px', fontSize: '0.75rem' },
                text: '🗑️ Delete',
                onclick: () => {
                  this.saveHistorySnapshot();
                  doors.splice(idx, 1);
                  if (this.selectedDoorId === dr.id) this.selectedDoorId = null;
                  this.markDirty();
                  this.renderInspector();
                  this.rebuild3D();
                },
              }),
            ),
          ),
          el('div', {},
            el('label', { style: { fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '3px' }, text: 'Change Wall (Relocate):' }),
            wallDropdown,
          ),
          el('div', {},
            el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' } },
              el('label', { style: { fontSize: '0.75rem', color: '#94a3b8' }, text: 'Slide Along Wall (Offset):' }),
              offsetBadge,
            ),
            offsetSlider,
            el('div', { style: { display: 'flex', gap: '4px' } },
              el('button', {
                type: 'button',
                class: 'btn btn-small',
                style: { flex: '1', fontSize: '0.72rem', padding: '3px' },
                text: '◀ -0.5m',
                onclick: () => {
                  dr.offset = Math.max(-maxOffset, Number(((dr.offset || 0) - 0.5).toFixed(1)));
                  this.selectedDoorId = dr.id;
                  this.markDirty();
                  this.renderInspector();
                  this.rebuild3D();
                },
              }),
              el('button', {
                type: 'button',
                class: 'btn btn-small',
                style: { flex: '1', fontSize: '0.72rem', padding: '3px' },
                text: '⌖ Center',
                onclick: () => {
                  dr.offset = 0;
                  this.selectedDoorId = dr.id;
                  this.markDirty();
                  this.renderInspector();
                  this.rebuild3D();
                },
              }),
              el('button', {
                type: 'button',
                class: 'btn btn-small',
                style: { flex: '1', fontSize: '0.72rem', padding: '3px' },
                text: '+0.5m ▶',
                onclick: () => {
                  dr.offset = Math.min(maxOffset, Number(((dr.offset || 0) + 0.5).toFixed(1)));
                  this.selectedDoorId = dr.id;
                  this.markDirty();
                  this.renderInspector();
                  this.rebuild3D();
                },
              }),
            ),
          ),
          el('div', {},
            el('label', { style: { fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '3px' }, text: 'Door Architectural Style:' }),
            styleDropdown,
          ),
          el('div', { style: { display: 'flex', gap: '8px' } },
            el('div', { style: { flex: '1' } },
              el('label', { style: { fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '2px' }, text: 'Width (m):' }),
              el('input', {
                class: 'input',
                type: 'number',
                step: '0.1',
                value: String(dr.width || 1.2),
                onchange: (e) => {
                  dr.width = Math.max(0.6, Number(e.target.value) || 1.2);
                  this.selectedDoorId = dr.id;
                  this.markDirty();
                  this.rebuild3D();
                },
              }),
            ),
            el('div', { style: { flex: '1' } },
              el('label', { style: { fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '2px' }, text: 'Height (m):' }),
              el('input', {
                class: 'input',
                type: 'number',
                step: '0.1',
                value: String(dr.height || 2.4),
                onchange: (e) => {
                  dr.height = Math.max(1.8, Number(e.target.value) || 2.4);
                  this.selectedDoorId = dr.id;
                  this.markDirty();
                  this.rebuild3D();
                },
              }),
            ),
          ),
        );
        doorList.append(item);
      });
    }

    // Add Door Form
    const wallSelect = el('select', { class: 'input', style: { width: '100%' } },
      el('option', { value: 'south', text: 'South Wall (+Z · Front)' }),
      el('option', { value: 'north', text: 'North Wall (-Z · Back)' }),
      el('option', { value: 'east', text: 'East Wall (+X · Right)' }),
      el('option', { value: 'west', text: 'West Wall (-X · Left)' }),
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
      style: { width: '100%', marginTop: '8px' },
      text: '➕ Build New Door into Wall',
      onclick: () => {
        this.saveHistorySnapshot();
        const newDoor = {
          id: `door-${room.id || 'r'}-${Date.now().toString(36)}`,
          wall: wallSelect.value,
          type: typeSelect.value,
          width: Number(widthInput.value) || 1.2,
          height: Number(heightInput.value) || 2.4,
          offset: Number(offsetInput.value) || 0,
        };
        doors.push(newDoor);
        this.selectedDoorId = newDoor.id;
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
    const size = layout.size || { w: 10, d: 8 };

    const winList = el('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' } });

    if (!windows.length) {
      winList.append(el('p', { class: 'hint', text: 'No windows in this room yet. Add windows below to cut openings and install glass.' }));
    } else {
      windows.forEach((win, idx) => {
        if (!win.id) win.id = `win-${room.id || 'r'}-${idx + 1}-${Math.random().toString(36).slice(2, 6)}`;
        const isSelected = this.selectedWindowId === win.id;
        const currentWall = (win.wall || 'north').toLowerCase();
        const wallLen = (currentWall === 'east' || currentWall === 'west') ? (size.d || 8) : (size.w || 10);
        const maxOffset = Math.max(0.2, (wallLen / 2) - ((Number(win.width) || 1.8) / 2) - 0.2);

        const offsetBadge = el('span', {
          style: { fontSize: '0.78rem', color: '#60a5fa', fontWeight: '600' },
          text: (win.offset || 0) === 0 ? 'Center (0.0m)' : `${(win.offset || 0) > 0 ? '+' : ''}${Number(win.offset || 0).toFixed(1)}m`,
        });

        const offsetSlider = el('input', {
          type: 'range',
          min: (-maxOffset).toFixed(1),
          max: maxOffset.toFixed(1),
          step: '0.1',
          value: String(win.offset ?? 0),
          style: { width: '100%', accentColor: '#3b82f6', margin: '4px 0' },
          oninput: (e) => {
            win.offset = Number(e.target.value);
            offsetBadge.textContent = win.offset === 0 ? 'Center (0.0m)' : `${win.offset > 0 ? '+' : ''}${win.offset.toFixed(1)}m`;
            this.selectedWindowId = win.id;
            this.markDirty();
            this.rebuild3D();
          },
        });

        const wallDropdown = el('select', {
          class: 'input',
          style: { width: '100%', fontWeight: '600', color: '#60a5fa' },
          onchange: (e) => {
            win.wall = e.target.value;
            win.offset = 0; // reset to center of chosen wall
            this.selectedWindowId = win.id;
            this.markDirty();
            this.renderInspector();
            this.rebuild3D();
          },
        },
          el('option', { value: 'north', selected: currentWall === 'north', text: 'North Wall (-Z · Back)' }),
          el('option', { value: 'south', selected: currentWall === 'south', text: 'South Wall (+Z · Front)' }),
          el('option', { value: 'east', selected: currentWall === 'east', text: 'East Wall (+X · Right)' }),
          el('option', { value: 'west', selected: currentWall === 'west', text: 'West Wall (-X · Left)' }),
        );

        const typeDropdown = el('select', {
          class: 'input',
          style: { width: '100%' },
          onchange: (e) => {
            win.type = e.target.value;
            this.selectedWindowId = win.id;
            this.markDirty();
            this.rebuild3D();
          },
        }, ...WINDOW_TYPES.map(([val, label]) => el('option', { value: val, selected: win.type === val, text: label })));

        const item = el('div', {
          style: {
            background: isSelected ? '#1e293b' : '#141c2b',
            border: isSelected ? '2px solid #3b82f6' : '1px solid #334155',
            borderRadius: '8px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            boxShadow: isSelected ? '0 0 10px rgba(59,130,246,0.25)' : 'none',
          },
        },
          el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
            el('strong', { style: { fontSize: '0.88rem', color: isSelected ? '#60a5fa' : '#f8fafc' }, text: `🪟 Window ${idx + 1}: ${win.type || 'Standard'}` }),
            el('div', { style: { display: 'flex', gap: '6px' } },
              el('button', {
                type: 'button',
                class: 'btn btn-small',
                style: { background: '#7f1d1d', color: '#fca5a5', padding: '2px 8px', fontSize: '0.75rem' },
                text: '🗑️ Delete',
                onclick: () => {
                  this.saveHistorySnapshot();
                  windows.splice(idx, 1);
                  if (this.selectedWindowId === win.id) this.selectedWindowId = null;
                  this.markDirty();
                  this.renderInspector();
                  this.rebuild3D();
                },
              }),
            ),
          ),
          el('div', {},
            el('label', { style: { fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '3px' }, text: 'Change Wall (Relocate):' }),
            wallDropdown,
          ),
          el('div', {},
            el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' } },
              el('label', { style: { fontSize: '0.75rem', color: '#94a3b8' }, text: 'Slide Along Wall (Offset):' }),
              offsetBadge,
            ),
            offsetSlider,
            el('div', { style: { display: 'flex', gap: '4px' } },
              el('button', {
                type: 'button',
                class: 'btn btn-small',
                style: { flex: '1', fontSize: '0.72rem', padding: '3px' },
                text: '◀ -0.5m',
                onclick: () => {
                  win.offset = Math.max(-maxOffset, Number(((win.offset || 0) - 0.5).toFixed(1)));
                  this.selectedWindowId = win.id;
                  this.markDirty();
                  this.renderInspector();
                  this.rebuild3D();
                },
              }),
              el('button', {
                type: 'button',
                class: 'btn btn-small',
                style: { flex: '1', fontSize: '0.72rem', padding: '3px' },
                text: '⌖ Center',
                onclick: () => {
                  win.offset = 0;
                  this.selectedWindowId = win.id;
                  this.markDirty();
                  this.renderInspector();
                  this.rebuild3D();
                },
              }),
              el('button', {
                type: 'button',
                class: 'btn btn-small',
                style: { flex: '1', fontSize: '0.72rem', padding: '3px' },
                text: '+0.5m ▶',
                onclick: () => {
                  win.offset = Math.min(maxOffset, Number(((win.offset || 0) + 0.5).toFixed(1)));
                  this.selectedWindowId = win.id;
                  this.markDirty();
                  this.renderInspector();
                  this.rebuild3D();
                },
              }),
            ),
          ),
          el('div', {},
            el('label', { style: { fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '3px' }, text: 'Window Type:' }),
            typeDropdown,
          ),
          el('div', { style: { display: 'flex', gap: '8px' } },
            el('div', { style: { flex: '1' } },
              el('label', { style: { fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '2px' }, text: 'Width (m):' }),
              el('input', {
                class: 'input',
                type: 'number',
                step: '0.1',
                value: String(win.width || 2.4),
                onchange: (e) => {
                  win.width = Math.max(0.6, Number(e.target.value) || 2.4);
                  this.selectedWindowId = win.id;
                  this.markDirty();
                  this.rebuild3D();
                },
              }),
            ),
            el('div', { style: { flex: '1' } },
              el('label', { style: { fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '2px' }, text: 'Height (m):' }),
              el('input', {
                class: 'input',
                type: 'number',
                step: '0.1',
                value: String(win.height || 1.8),
                onchange: (e) => {
                  win.height = Math.max(0.6, Number(e.target.value) || 1.8);
                  this.selectedWindowId = win.id;
                  this.markDirty();
                  this.rebuild3D();
                },
              }),
            ),
            el('div', { style: { flex: '1' } },
              el('label', { style: { fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '2px' }, text: 'Sill (m):' }),
              el('input', {
                class: 'input',
                type: 'number',
                step: '0.1',
                value: String(win.sill_height || 0.6),
                onchange: (e) => {
                  win.sill_height = Math.max(0, Number(e.target.value) || 0.6);
                  this.selectedWindowId = win.id;
                  this.markDirty();
                  this.rebuild3D();
                },
              }),
            ),
          ),
        );
        winList.append(item);
      });
    }

    const wallSelect = el('select', { class: 'input', style: { width: '100%' } },
      el('option', { value: 'north', text: 'North Wall (-Z · Back)' }),
      el('option', { value: 'south', text: 'South Wall (+Z · Front)' }),
      el('option', { value: 'east', text: 'East Wall (+X · Right)' }),
      el('option', { value: 'west', text: 'West Wall (-X · Left)' }),
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
      style: { width: '100%', marginTop: '8px' },
      text: '➕ Add Window to Wall ("Build Windows")',
      onclick: () => {
        this.saveHistorySnapshot();
        const newWin = {
          id: `win-${room.id || 'r'}-${Date.now().toString(36)}`,
          wall: wallSelect.value,
          type: typeSelect.value,
          width: Number(widthInput.value) || 2.4,
          height: Number(heightInput.value) || 1.8,
          sill_height: Number(sillInput.value) || 0.6,
          offset: Number(offsetInput.value) || 0,
        };
        windows.push(newWin);
        this.selectedWindowId = newWin.id;
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
              this.saveHistorySnapshot();
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
          onclick: (e) => {
            selectedObj.rot = ((selectedObj.rot || 0) + 90) % 360;
            const objMesh = this.world?.objects?.get(selectedObj.id);
            if (objMesh) {
              objMesh.rotation.y = (selectedObj.rot * Math.PI) / 180;
              if (this.objectBoxHelper) this.objectBoxHelper.update();
            }
            e.target.textContent = `🔄 Rotate 90° (Current: ${selectedObj.rot || 0}°)`;
            this.markDirty();
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
            this.saveHistorySnapshot();
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

  /* ------------------------------------------------ Floors & Stairs Tab */
  renderLevelsAndStairsTab() {
    // 1. FLOORS & ARCHITECTURAL LEVELS SECTION
    const floorCards = el('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' } });

    this.floors.forEach((fl, idx) => {
      const isCurrent = this.selectedFloorIdx === idx && this.activeFloorLevel !== 'all';
      const item = el('div', {
        style: {
          background: isCurrent ? '#172554' : '#1a2333',
          border: isCurrent ? '1px solid #3b82f6' : '1px solid #334155',
          borderRadius: '8px',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        },
      },
        el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
          el('div', { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
            el('span', {
              style: {
                background: isCurrent ? '#2563eb' : '#334155',
                color: '#fff',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: '700',
              },
              text: `Level ${fl.level ?? idx}`,
            }),
            el('input', {
              class: 'input',
              style: { fontWeight: '600', padding: '4px 8px', fontSize: '0.85rem', width: '160px' },
              value: fl.name || `Floor ${fl.level ?? idx}`,
              placeholder: 'Floor Name',
              onchange: (e) => {
                fl.name = e.target.value;
                this.markDirty();
                this.updateFloorPills();
              },
            }),
          ),
          el('span', { style: { fontSize: '0.75rem', color: '#94a3b8' }, text: `${fl.rooms?.length || 0} room(s)` }),
        ),
        el('div', { style: { display: 'flex', gap: '8px' } },
          el('div', { style: { flex: '1' } },
            el('label', { style: { fontSize: '0.72rem', color: '#94a3b8' }, text: 'Height (m):' }),
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
            el('label', { style: { fontSize: '0.72rem', color: '#94a3b8' }, text: 'Elevation (m):' }),
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
        el('div', { style: { display: 'flex', gap: '6px', marginTop: '2px' } },
          el('button', {
            type: 'button',
            class: `btn btn-small${isCurrent ? ' btn-primary' : ''}`,
            style: { flex: '1', fontSize: '0.75rem' },
            text: isCurrent ? '✓ Active Level' : 'Switch to this Floor',
            onclick: () => {
              this.selectedFloorIdx = idx;
              this.activeFloorLevel = fl.level ?? idx;
              this.selectedRoomIdx = 0;
              this.selectedObjectId = null;
              this.updateFloorPills();
              this.renderInspector();
              this.rebuild3D();
            },
          }),
          this.floors.length > 1 ? el('button', {
            type: 'button',
            class: 'btn btn-small',
            style: { background: '#7f1d1d', color: '#fca5a5', fontSize: '0.75rem' },
            text: '🗑️ Delete',
            onclick: () => this.deleteFloor(idx),
          }) : null,
        ),
      );
      floorCards.append(item);
    });

    const addFloorBtn = el('button', {
      type: 'button',
      class: 'btn btn-small',
      style: { width: '100%', background: '#1e293b', color: '#38bdf8', border: '1px dashed #0284c7', fontWeight: '600' },
      text: '➕ Add New Floor Story Level',
      onclick: () => this.addNewFloor(),
    });

    // 2. ARCHITECTURAL STAIRS MANAGEMENT SECTION
    const stairsList = this.stairs;
    if (!this.selectedStairsId && stairsList.length > 0) {
      this.selectedStairsId = stairsList[0].id;
    }
    const currentStairs = stairsList.find((s) => s.id === this.selectedStairsId) || stairsList[0];

    const stairsSection = el('div', {
      style: {
        marginTop: '20px',
        paddingTop: '16px',
        borderTop: '1px solid #334155',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      },
    });

    stairsSection.append(
      el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
        el('h5', { style: { margin: 0, fontSize: '0.9rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' } },
          el('span', { text: '🪜' }),
          el('span', { text: `Architectural Stairs (${stairsList.length})` }),
        ),
        el('button', {
          type: 'button',
          class: 'btn btn-small',
          style: { fontSize: '0.72rem', background: '#065f46', color: '#a7f3d0' },
          text: '➕ Add Stairs',
          onclick: () => this.addNewStairs(),
        }),
      ),
    );

    if (currentStairs) {
      const st = currentStairs;

      // Dropdown selector if multiple staircases
      if (stairsList.length > 1) {
        const stairsSelect = el('select', {
          class: 'input',
          style: { width: '100%', color: '#38bdf8', fontWeight: '600' },
          onchange: (e) => {
            this.selectedStairsId = e.target.value;
            this.renderInspector();
          },
        }, ...stairsList.map((s) => el('option', { value: s.id, selected: s.id === st.id, text: `🪜 ${s.name || s.id}` })));
        stairsSection.append(stairsSelect);
      }

      // Stairs Name & Style
      const nameInput = el('input', {
        class: 'input',
        style: { width: '100%' },
        value: st.name || '',
        placeholder: 'Stairs Name',
        oninput: (e) => {
          st.name = e.target.value;
          this.markDirty();
        },
      });

      const STAIR_STYLES = [
        ['floating_wood', '🪵 Floating Oak Treads + Glass Balustrade + LED Glow'],
        ['marble', '🏛️ Solid Polished White Carrara Marble + Brass Handrails'],
        ['steel_glass', '🏢 Modern Architectural Blackened Steel Spine + Clear Glass'],
      ];

      const styleSelect = el('select', {
        class: 'input',
        style: { width: '100%' },
        onchange: (e) => {
          st.style = e.target.value;
          this.markDirty();
          this.rebuild3D();
        },
      }, ...STAIR_STYLES.map(([val, label]) => el('option', { value: val, selected: st.style === val, text: label })));

      // Real-time Moving Controls: Position X & Z
      const posXBadge = el('span', { style: { color: '#38bdf8', fontWeight: '600' }, text: `${Number(st.startX || 0).toFixed(1)}m` });
      const posXSlider = el('input', {
        type: 'range',
        min: '-20',
        max: '20',
        step: '0.2',
        value: String(st.startX || 0),
        style: { width: '100%', accentColor: '#3b82f6' },
        oninput: (e) => {
          const newX = Number(e.target.value);
          const deltaX = newX - (st.startX || 0);
          st.startX = newX;
          st.endX = Number(((st.endX || 0) + deltaX).toFixed(2));
          posXBadge.textContent = `${st.startX.toFixed(1)}m`;
          this.markDirty();
          this.rebuild3D();
        },
      });

      const posZBadge = el('span', { style: { color: '#38bdf8', fontWeight: '600' }, text: `${Number(st.startZ || 0).toFixed(1)}m` });
      const posZSlider = el('input', {
        type: 'range',
        min: '-20',
        max: '20',
        step: '0.2',
        value: String(st.startZ || 0),
        style: { width: '100%', accentColor: '#3b82f6' },
        oninput: (e) => {
          const newZ = Number(e.target.value);
          const deltaZ = newZ - (st.startZ || 0);
          st.startZ = newZ;
          st.endZ = Number(((st.endZ || 0) + deltaZ).toFixed(2));
          posZBadge.textContent = `${st.startZ.toFixed(1)}m`;
          this.markDirty();
          this.rebuild3D();
        },
      });

      // 4-Way Nudge Buttons to move entire staircase
      const nudgeStairs = (dx, dz) => {
        st.startX = Number(((st.startX || 0) + dx).toFixed(2));
        st.endX = Number(((st.endX || 0) + dx).toFixed(2));
        st.startZ = Number(((st.startZ || 0) + dz).toFixed(2));
        st.endZ = Number(((st.endZ || 0) + dz).toFixed(2));
        this.markDirty();
        this.renderInspector();
        this.rebuild3D();
      };

      const nudgeButtons = el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' } },
        el('button', { type: 'button', class: 'btn btn-small', text: '⬅️ -0.5m', onclick: () => nudgeStairs(-0.5, 0) }),
        el('button', { type: 'button', class: 'btn btn-small', text: '➡️ +0.5m', onclick: () => nudgeStairs(0.5, 0) }),
        el('button', { type: 'button', class: 'btn btn-small', text: '⬆️ North', onclick: () => nudgeStairs(0, -0.5) }),
        el('button', { type: 'button', class: 'btn btn-small', text: '⬇️ South', onclick: () => nudgeStairs(0, 0.5) }),
      );

      // Ascend Direction Presets
      const setAscendDirection = (dir) => {
        const runLen = 4.4;
        const sx = st.startX || 0;
        const sz = st.startZ || 0;
        if (dir === 'north') { st.endX = sx; st.endZ = Number((sz - runLen).toFixed(2)); }
        else if (dir === 'south') { st.endX = sx; st.endZ = Number((sz + runLen).toFixed(2)); }
        else if (dir === 'east') { st.endX = Number((sx + runLen).toFixed(2)); st.endZ = sz; }
        else if (dir === 'west') { st.endX = Number((sx - runLen).toFixed(2)); st.endZ = sz; }
        this.markDirty();
        this.renderInspector();
        this.rebuild3D();
      };

      const directionButtons = el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' } },
        el('button', { type: 'button', class: 'btn btn-small', text: 'North ⬆️', onclick: () => setAscendDirection('north') }),
        el('button', { type: 'button', class: 'btn btn-small', text: 'South ⬇️', onclick: () => setAscendDirection('south') }),
        el('button', { type: 'button', class: 'btn btn-small', text: 'East ➡️', onclick: () => setAscendDirection('east') }),
        el('button', { type: 'button', class: 'btn btn-small', text: 'West ⬅️', onclick: () => setAscendDirection('west') }),
      );

      // Width & Step Count
      const widthBadge = el('span', { style: { color: '#38bdf8', fontWeight: '600' }, text: `${Number(st.width || 1.4).toFixed(1)}m` });
      const widthSlider = el('input', {
        type: 'range',
        min: '1.0',
        max: '2.6',
        step: '0.1',
        value: String(st.width || 1.4),
        style: { width: '100%', accentColor: '#3b82f6' },
        oninput: (e) => {
          st.width = Number(e.target.value);
          widthBadge.textContent = `${st.width.toFixed(1)}m`;
          this.markDirty();
          this.rebuild3D();
        },
      });

      // Quick Connect Buttons
      const quickConnect = el('div', { style: { display: 'flex', gap: '6px' } },
        el('button', {
          type: 'button',
          class: 'btn btn-small',
          style: { flex: '1', fontSize: '0.72rem' },
          text: 'Snap: Level 0 ➔ 1',
          onclick: () => {
            st.startY = 0;
            st.endY = 3.4;
            this.markDirty();
            this.renderInspector();
            this.rebuild3D();
          },
        }),
        el('button', {
          type: 'button',
          class: 'btn btn-small',
          style: { flex: '1', fontSize: '0.72rem' },
          text: 'Snap: Level 1 ➔ 2',
          onclick: () => {
            st.startY = 3.4;
            st.endY = 6.8;
            this.markDirty();
            this.renderInspector();
            this.rebuild3D();
          },
        }),
      );

      const deleteStairsBtn = el('button', {
        type: 'button',
        class: 'btn btn-small',
        style: { width: '100%', background: '#7f1d1d', color: '#fca5a5' },
        text: '🗑️ Delete This Staircase',
        onclick: () => this.deleteStairs(st.id),
      });

      stairsSection.append(
        el('div', {}, el('label', { style: { fontSize: '0.72rem', color: '#94a3b8' }, text: 'Staircase Label:' }), nameInput),
        el('div', {}, el('label', { style: { fontSize: '0.72rem', color: '#94a3b8' }, text: 'Architectural Style:' }), styleSelect),
        el('div', {},
          el('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8' } },
            el('span', { text: 'Move Position X:' }),
            posXBadge,
          ),
          posXSlider,
        ),
        el('div', {},
          el('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8' } },
            el('span', { text: 'Move Position Z:' }),
            posZBadge,
          ),
          posZSlider,
        ),
        el('div', {},
          el('label', { style: { fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '2px' }, text: 'Nudge Stairs Position:' }),
          nudgeButtons,
        ),
        el('div', {},
          el('label', { style: { fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '2px' }, text: 'Ascend Direction (Climb Angle):' }),
          directionButtons,
        ),
        el('div', {},
          el('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8' } },
            el('span', { text: 'Staircase Width:' }),
            widthBadge,
          ),
          widthSlider,
        ),
        el('div', { style: { display: 'flex', gap: '8px' } },
          el('div', { style: { flex: '1' } },
            el('label', { style: { fontSize: '0.72rem', color: '#94a3b8' }, text: 'Start Elevation (m):' }),
            el('input', {
              class: 'input',
              type: 'number',
              step: '0.1',
              value: String(st.startY ?? 0),
              onchange: (e) => {
                st.startY = Number(e.target.value);
                this.markDirty();
                this.rebuild3D();
              },
            }),
          ),
          el('div', { style: { flex: '1' } },
            el('label', { style: { fontSize: '0.72rem', color: '#94a3b8' }, text: 'End Elevation (m):' }),
            el('input', {
              class: 'input',
              type: 'number',
              step: '0.1',
              value: String(st.endY ?? 3.4),
              onchange: (e) => {
                st.endY = Number(e.target.value);
                this.markDirty();
                this.rebuild3D();
              },
            }),
          ),
        ),
        quickConnect,
        deleteStairsBtn,
      );
    }

    return el('div', { style: { padding: '16px' } },
      el('h4', { style: { margin: '0 0 10px', fontSize: '0.95rem', color: '#f8fafc' }, text: 'Multi-Story Villa Floors & Levels' }),
      floorCards,
      addFloorBtn,
      stairsSection,
    );
  }

  deleteFloor(idx) {
    if (this.floors.length <= 1) {
      alert('The house must have at least one floor level.');
      return;
    }
    const fl = this.floors[idx];
    if (!confirm(`Delete Level ${fl.level ?? idx}: "${fl.name || `Floor ${fl.level}`}" and all its rooms?`)) return;
    this.saveHistorySnapshot();
    this.floors.splice(idx, 1);
    this.selectedFloorIdx = Math.max(0, Math.min(this.selectedFloorIdx, this.floors.length - 1));
    this.activeFloorLevel = this.currentFloor?.level ?? 0;
    this.selectedRoomIdx = 0;
    this.selectedObjectId = null;
    this.markDirty();
    this.updateFloorPills();
    this.renderInspector();
    this.rebuild3D();
  }

  addNewStairs() {
    this.saveHistorySnapshot();
    const count = this.stairs.length + 1;
    const newStairs = {
      id: `stairs-${Date.now().toString(36)}`,
      name: `Architectural Staircase ${count}`,
      startX: -4.0 + count * 2,
      startY: 0.0,
      startZ: 2.0,
      endX: -4.0 + count * 2,
      endY: 3.4,
      endZ: -2.4,
      width: 1.4,
      steps: 18,
      style: 'floating_wood',
    };
    this.stairs.push(newStairs);
    if (!this.house.environment) this.house.environment = {};
    this.house.environment.stairs = this.stairs;
    this.selectedStairsId = newStairs.id;
    this.markDirty();
    this.renderInspector();
    this.rebuild3D();
  }

  deleteStairs(stairsId) {
    const idx = this.stairs.findIndex((s) => s.id === stairsId);
    if (idx !== -1) {
      this.saveHistorySnapshot();
      this.stairs.splice(idx, 1);
      if (!this.house.environment) this.house.environment = {};
      this.house.environment.stairs = this.stairs;
      this.selectedStairsId = this.stairs[0]?.id || null;
      this.markDirty();
      this.renderInspector();
      this.rebuild3D();
    }
  }

  /* ------------------------------------------------------------- Actions */
  addNewRoom() {
    const floor = this.currentFloor;
    if (!floor) return;
    if (!Array.isArray(floor.rooms)) floor.rooms = [];

    this.saveHistorySnapshot();
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

    this.saveHistorySnapshot();
    floor.rooms.splice(this.selectedRoomIdx, 1);
    this.selectedRoomIdx = Math.max(0, floor.rooms.length - 1);
    this.selectedObjectId = null;
    this.markDirty();
    this.renderInspector();
    this.updateSelectionToast();
    this.rebuild3D();
  }

  addNewFloor() {
    this.saveHistorySnapshot();
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
    if (!this.selectionToast) return;
    const room = this.currentRoom;
    if (this.activeTab === 'levels' && this.selectedStairsId) {
      const st = this.stairs.find((s) => s.id === this.selectedStairsId);
      this.selectionToast.textContent = `🪜 Stairs Selected: ${st?.name || 'Architectural Stairs'}`;
    } else if (this.selectedDoorId) {
      const dr = room?.layout?.doors?.find((d) => d.id === this.selectedDoorId);
      this.selectionToast.textContent = `🚪 Door Selected (${dr?.wall?.toUpperCase() || 'WALL'} Wall · Offset ${dr?.offset ?? 0}m) in ${room?.name || 'Room'}`;
    } else if (this.selectedWindowId) {
      const win = room?.layout?.windows?.find((w) => w.id === this.selectedWindowId);
      this.selectionToast.textContent = `🪟 Window Selected (${win?.wall?.toUpperCase() || 'WALL'} Wall · Offset ${win?.offset ?? 0}m) in ${room?.name || 'Room'}`;
    } else if (this.selectedObjectId) {
      const obj = room?.layout?.objects?.find((o) => o.id === this.selectedObjectId);
      this.selectionToast.textContent = `🪑 Object Selected: ${obj?.type || 'Furniture'} in ${room?.name || 'Room'}`;
    } else if (this.selectedWallKey && this.selectedWallKey !== 'all') {
      this.selectionToast.textContent = `🧱 ${this.selectedWallKey.toUpperCase()} Wall Selected in ${room?.name || 'Room'}`;
    } else {
      this.selectionToast.textContent = `🛋️ Selected Room: ${room?.name || 'Room'}`;
    }
  }

  /* ------------------------------------------------ History (Undo / Redo) */
  saveHistorySnapshot() {
    try {
      const current = JSON.stringify(this.house);
      const last = this.undoStack[this.undoStack.length - 1];
      if (last !== current) {
        this.undoStack.push(current);
        if (this.undoStack.length > this.maxHistory) {
          this.undoStack.shift();
        }
        this.redoStack = [];
        this.updateHistoryButtons();
      }
    } catch (e) {
      console.warn('Failed to snapshot history:', e);
    }
  }

  undo() {
    if (!this.undoStack.length) {
      this.showToast('ℹ️ Nothing to undo');
      return;
    }
    try {
      const current = JSON.stringify(this.house);
      this.redoStack.push(current);

      const prev = this.undoStack.pop();
      const parsed = JSON.parse(prev);

      for (const k of Object.keys(this.house)) {
        if (!(k in parsed)) delete this.house[k];
      }
      Object.assign(this.house, parsed);
      this.ed.house = this.house;

      if (this.selectedFloorIdx >= this.floors.length) {
        this.selectedFloorIdx = Math.max(0, this.floors.length - 1);
      }
      const floor = this.currentFloor;
      if (floor?.rooms && this.selectedRoomIdx >= floor.rooms.length) {
        this.selectedRoomIdx = Math.max(0, floor.rooms.length - 1);
      }
      this.selectedObjectId = null;

      this.markDirty();
      this.rebuild3D();
      this.renderInspector();
      this.updateFloorPills();
      this.updateHistoryButtons();
      this.showToast('↩️ Undone step (Ctrl+Z)');
    } catch (err) {
      console.error('Failed to undo:', err);
    }
  }

  redo() {
    if (!this.redoStack.length) {
      this.showToast('ℹ️ Nothing to redo');
      return;
    }
    try {
      const current = JSON.stringify(this.house);
      this.undoStack.push(current);

      const next = this.redoStack.pop();
      const parsed = JSON.parse(next);

      for (const k of Object.keys(this.house)) {
        if (!(k in parsed)) delete this.house[k];
      }
      Object.assign(this.house, parsed);
      this.ed.house = this.house;

      if (this.selectedFloorIdx >= this.floors.length) {
        this.selectedFloorIdx = Math.max(0, this.floors.length - 1);
      }
      const floor = this.currentFloor;
      if (floor?.rooms && this.selectedRoomIdx >= floor.rooms.length) {
        this.selectedRoomIdx = Math.max(0, floor.rooms.length - 1);
      }
      this.selectedObjectId = null;

      this.markDirty();
      this.rebuild3D();
      this.renderInspector();
      this.updateFloorPills();
      this.updateHistoryButtons();
      this.showToast('↪️ Redone step (Ctrl+Y)');
    } catch (err) {
      console.error('Failed to redo:', err);
    }
  }

  updateHistoryButtons() {
    if (this.undoBtn) {
      const canUndo = this.undoStack.length > 0;
      this.undoBtn.style.opacity = canUndo ? '1' : '0.5';
      this.undoBtn.title = canUndo ? `Undo last step (Ctrl+Z) · ${this.undoStack.length} step(s)` : 'Undo last step (Ctrl+Z)';
    }
    if (this.redoBtn) {
      const canRedo = this.redoStack.length > 0;
      this.redoBtn.style.opacity = canRedo ? '1' : '0.5';
      this.redoBtn.title = canRedo ? `Redo last step (Ctrl+Y) · ${this.redoStack.length} step(s)` : 'Redo last step (Ctrl+Y)';
    }
  }

  showToast(msg, duration = 2200) {
    if (!this.selectionToast) return;
    this.selectionToast.textContent = msg;
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      this.updateSelectionToast();
    }, duration);
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
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
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
      if (e.value) {
        this.saveHistorySnapshot();
      } else {
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

    let lastTime = performance.now();
    const loop = () => {
      if (this.disposed) return;
      this.animationId = requestAnimationFrame(loop);

      const now = performance.now();
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      this.updateCameraNavigation(dt);
      this.controls.update();

      if (this.world) {
        this.world.time += dt;
        for (const u of this.world.updaters) u(dt, this.world.time);
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

    // Cache interactive meshes for fast raycasting without scene traversal on pointermove
    this.interactiveMeshes = [];
    this.scene.traverse((c) => {
      if (c.isMesh && (c.userData.objectId || c.userData.roomId || c.userData.isDoor || c.userData.isWindow || c.userData.isWall || c.userData.doorId || c.userData.windowId || c.userData.isStairs || c.userData.stairsId)) {
        this.interactiveMeshes.push(c);
      }
    });

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
    this.keysDown = new Set();
    this.shiftHeld = false;

    this.onKeyDown = (e) => {
      // Don't intercept when user is typing inside form inputs
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

      // Handle Undo / Redo: Ctrl+Z or Cmd+Z
      if (e.ctrlKey || e.metaKey) {
        const k = e.key.toLowerCase();
        if (k === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            this.redo();
          } else {
            this.undo();
          }
          return;
        }
        if (k === 'y') {
          e.preventDefault();
          this.redo();
          return;
        }
      }

      this.shiftHeld = e.shiftKey;
      const key = e.key.toLowerCase();

      // W, A, S, D, Q, E Camera movement keys
      if (['w', 'a', 's', 'd', 'q', 'e'].includes(key)) {
        this.keysDown.add(key);
        e.preventDefault();
        return;
      }

      // Escape key: deselect object
      if (e.key === 'Escape') {
        this.selectObject(null);
        this.renderInspector();
        return;
      }

      // Delete / Backspace: delete selected object
      if ((e.key === 'Delete' || e.key === 'Backspace') && this.selectedObjectId) {
        const room = this.currentRoom;
        const idx = room?.layout?.objects?.findIndex((o) => o.id === this.selectedObjectId);
        if (idx !== -1) {
          this.saveHistorySnapshot();
          room.layout.objects.splice(idx, 1);
          this.selectObject(null);
          this.markDirty();
          this.rebuild3D();
          this.renderInspector();
        }
        e.preventDefault();
        return;
      }

      // R key: rotate selected object by 90 degrees
      if (key === 'r' && this.selectedObjectId) {
        const room = this.currentRoom;
        const obj = room?.layout?.objects?.find((o) => o.id === this.selectedObjectId);
        if (obj) {
          this.saveHistorySnapshot();
          obj.rot = ((obj.rot || 0) + 90) % 360;
          const objMesh = this.world?.objects?.get(this.selectedObjectId);
          if (objMesh) {
            objMesh.rotation.y = ((obj.rot || 0) * Math.PI) / 180;
            if (this.objectBoxHelper) this.objectBoxHelper.update();
          }
          this.markDirty();
        }
        e.preventDefault();
        return;
      }

      // Arrow keys: move selected object (or pan camera if no object selected)
      if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(key)) {
        e.preventDefault();
        if (this.selectedObjectId) {
          const room = this.currentRoom;
          const obj = room?.layout?.objects?.find((o) => o.id === this.selectedObjectId);
          if (obj) {
            this.saveHistorySnapshot();
            const step = e.shiftKey ? 1.0 : 0.2;
            if (e.key === 'ArrowLeft') obj.x -= step;
            else if (e.key === 'ArrowRight') obj.x += step;
            else if (e.key === 'ArrowUp') obj.z -= step;
            else if (e.key === 'ArrowDown') obj.z += step;

            obj.x = Math.round(obj.x * 10) / 10;
            obj.z = Math.round(obj.z * 10) / 10;
            const objMesh = this.world?.objects?.get(this.selectedObjectId);
            if (objMesh) {
              const rx = Number(room.layout?.position?.x) || 0;
              const rz = Number(room.layout?.position?.z) || 0;
              objMesh.position.x = rx + obj.x;
              objMesh.position.z = rz + obj.z;
              if (this.objectBoxHelper) this.objectBoxHelper.update();
            }
            this.updateInspectorSliders(obj);
            this.markDirty();
          }
        } else {
          if (key === 'arrowup') this.keysDown.add('w');
          if (key === 'arrowdown') this.keysDown.add('s');
          if (key === 'arrowleft') this.keysDown.add('a');
          if (key === 'arrowright') this.keysDown.add('d');
        }
      }
    };

    this.onKeyUp = (e) => {
      this.shiftHeld = e.shiftKey;
      const key = e.key.toLowerCase();
      this.keysDown.delete(key);
      if (key === 'arrowup') this.keysDown.delete('w');
      if (key === 'arrowdown') this.keysDown.delete('s');
      if (key === 'arrowleft') this.keysDown.delete('a');
      if (key === 'arrowright') this.keysDown.delete('d');
    };

    this.onWindowBlur = () => {
      this.keysDown.clear();
      this.shiftHeld = false;
    };

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onWindowBlur);
  }

  updateCameraNavigation(dt = 0.016) {
    if (!this.keysDown || this.keysDown.size === 0 || !this.camera || !this.controls) return;

    // Horizontal forward direction vector (on ground XZ plane)
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    // Right direction vector (perpendicular to forward and Y-up)
    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    const moveDir = new THREE.Vector3(0, 0, 0);

    if (this.keysDown.has('w')) moveDir.add(forward);
    if (this.keysDown.has('s')) moveDir.sub(forward);
    if (this.keysDown.has('d')) moveDir.add(right);
    if (this.keysDown.has('a')) moveDir.sub(right);
    if (this.keysDown.has('e')) moveDir.y += 1;
    if (this.keysDown.has('q')) moveDir.y -= 1;

    if (moveDir.lengthSq() > 0.0001) {
      moveDir.normalize();
      const speed = (this.shiftHeld ? 28 : 14) * dt;
      const moveDelta = moveDir.multiplyScalar(speed);

      // Move both camera position and orbit target together!
      this.camera.position.add(moveDelta);
      this.controls.target.add(moveDelta);
    }
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
      const meshes = this.interactiveMeshes || [];
      const hits = this.raycaster.intersectObjects(meshes, true);
      if (hits.length > 0) {
        let clickedObjId = null;
        let clickedDoorId = null;
        let clickedWindowId = null;
        let clickedWallKey = null;
        let clickedRoomId = null;
        let clickedStairsId = null;

        for (const hit of hits) {
          let cur = hit.object;
          while (cur && cur !== this.scene) {
            if ((cur.userData?.isStairs || cur.userData?.stairsId) && !clickedStairsId) {
              clickedStairsId = cur.userData.stairsId || 'stairs-foyer';
            }
            if (cur.userData?.objectId && !clickedObjId) {
              clickedObjId = cur.userData.objectId;
            }
            if (cur.userData?.doorId && !clickedDoorId) {
              clickedDoorId = cur.userData.doorId;
            }
            if (cur.userData?.windowId && !clickedWindowId) {
              clickedWindowId = cur.userData.windowId;
            }
            if (cur.userData?.isWall && cur.userData?.wallKey && !clickedWallKey) {
              clickedWallKey = cur.userData.wallKey;
            }
            if (cur.userData?.roomId && !clickedRoomId) {
              clickedRoomId = cur.userData.roomId;
            }
            cur = cur.parent;
          }
          if (clickedStairsId || clickedObjId || clickedDoorId || clickedWindowId) break;
        }

        // 0. If clicked on stairs: SELECT IT & OPEN FLOORS & STAIRS TAB
        if (clickedStairsId) {
          this.selectedStairsId = clickedStairsId;
          this.selectedDoorId = null;
          this.selectedWindowId = null;
          this.selectObject(null);
          this.activeTab = 'levels';
          this.updateSelectionToast();
          this.renderInspector();
          return;
        }

        // 1. If clicked on a door: SELECT IT & OPEN DOORS TAB
        if (clickedDoorId) {
          const floor = this.currentFloor;
          const rIdx = floor?.rooms?.findIndex((r) => r.id === clickedRoomId);
          if (rIdx !== undefined && rIdx !== -1) {
            this.selectedRoomIdx = rIdx;
          }
          this.selectedDoorId = clickedDoorId;
          this.selectedWindowId = null;
          this.selectObject(null);
          this.activeTab = 'doors';
          this.updateSelectionToast();
          this.renderInspector();
          this.updateHighlightHelper();
          return;
        }

        // 2. If clicked on a window: SELECT IT & OPEN WINDOWS TAB
        if (clickedWindowId) {
          const floor = this.currentFloor;
          const rIdx = floor?.rooms?.findIndex((r) => r.id === clickedRoomId);
          if (rIdx !== undefined && rIdx !== -1) {
            this.selectedRoomIdx = rIdx;
          }
          this.selectedWindowId = clickedWindowId;
          this.selectedDoorId = null;
          this.selectObject(null);
          this.activeTab = 'windows';
          this.updateSelectionToast();
          this.renderInspector();
          this.updateHighlightHelper();
          return;
        }

        // 3. If clicked on a wall: SELECT IT & OPEN WALL COLOR STUDIO
        if (clickedWallKey) {
          const floor = this.currentFloor;
          const rIdx = floor?.rooms?.findIndex((r) => r.id === clickedRoomId);
          if (rIdx !== undefined && rIdx !== -1) {
            this.selectedRoomIdx = rIdx;
          }
          this.selectedWallKey = clickedWallKey;
          this.selectedDoorId = null;
          this.selectedWindowId = null;
          this.selectObject(null);
          this.activeTab = 'rooms';
          this.updateSelectionToast();
          this.renderInspector();
          this.updateHighlightHelper();
          return;
        }

        // 4. If clicked on a furniture object: SELECT IT & START DRAG
        if (clickedObjId) {
          this.selectedDoorId = null;
          this.selectedWindowId = null;
          this.selectObject(clickedObjId);
          const objMesh = this.world?.objects?.get(clickedObjId);
          if (objMesh) {
            const elevation = this.currentFloor?.elevation ?? (this.currentFloor?.level * 3.4 || 0);
            this.dragPlane.constant = -elevation;
            const planeHit = new THREE.Vector3();
            if (this.raycaster.ray.intersectPlane(this.dragPlane, planeHit)) {
              this.saveHistorySnapshot();
              this.dragOffset.subVectors(planeHit, objMesh.position);
              this.isDirectDragging = true;
              this.controls.enabled = false;
            }
          }
          return;
        }

        // 5. If clicked on a room
        if (clickedRoomId) {
          const floor = this.currentFloor;
          const rIdx = floor?.rooms?.findIndex((r) => r.id === clickedRoomId);
          if (rIdx !== undefined && rIdx !== -1) {
            this.selectedRoomIdx = rIdx;
            this.selectedDoorId = null;
            this.selectedWindowId = null;
            this.selectObject(null);
            this.updateSelectionToast();
            this.renderInspector();
            this.updateHighlightHelper();
            return;
          }
        }
      }

      // Clicked ground outside -> deselect object
      if (this.selectedObjectId || this.selectedDoorId || this.selectedWindowId) {
        this.selectedDoorId = null;
        this.selectedWindowId = null;
        this.selectObject(null);
        this.updateSelectionToast();
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

      // Throttled hover feedback using cached interactive meshes (zero scene traversal!)
      const now = performance.now();
      if (!this._lastHoverCheck || now - this._lastHoverCheck > 60) {
        this._lastHoverCheck = now;
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const meshes = this.interactiveMeshes || [];
        const hits = this.raycaster.intersectObjects(meshes, true);
        const isOverInteractable = hits.some((h) => {
          let cur = h.object;
          while (cur) {
            if (cur.userData?.objectId || cur.userData?.isDoor || cur.userData?.isWindow || cur.userData?.isStairs) return true;
            cur = cur.parent;
          }
          return false;
        });
        this.canvas.style.cursor = isOverInteractable ? 'pointer' : 'default';
      }
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
    if (this.onKeyUp) window.removeEventListener('keyup', this.onKeyUp);
    if (this.onWindowBlur) window.removeEventListener('blur', this.onWindowBlur);
    if (this.transformControls) this.transformControls.dispose();
    if (this.controls) this.controls.dispose();
    if (this.renderer) this.renderer.dispose();
  }
}
