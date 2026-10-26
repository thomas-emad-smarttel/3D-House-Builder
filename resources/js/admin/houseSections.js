import { el } from '../ui/dom.js';
import { api } from './api.js';

const FLOOR_MATERIALS = [
  ['parquet', '🪵 Hardwood Parquet (Herringbone)'],
  ['marble', '🏛️ Luxury Polished Marble'],
  ['tile', '🔲 Porcelain Ceramic Tiles'],
  ['hardwood', '🪵 Natural Oak / Walnut Planks'],
  ['concrete', '🏗️ Architectural Micro-Cement / Concrete'],
  ['carpet', '🧶 Plush Soft Carpet'],
  ['granite', '⬛ Polished Dark Granite'],
];

const CEILING_TYPES = [
  ['gypsum_led', '✨ Gypsum Tray with Warm Perimeter LED Cove'],
  ['coffered', '🏛️ Luxury Coffered Wooden Grid Beam Ceiling'],
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
  ['front_entrance', '🚪 Main Entrance Security Pivot Door with Long Brass Handle'],
  ['standard', '🚪 Interior Hinged Panel Door with Lever Handle'],
  ['double_french', '🪟 Double French Glass Doors'],
  ['sliding_glass', '🪟 Modern Patio Sliding Glass Door'],
  ['barn_wood', '🪵 Rustic Modern Sliding Barn Door with Track'],
  ['arch', '🏛️ Clean Architectural Open Archway'],
];

const WINDOW_TYPES = [
  ['standard', '🪟 Standard Double-Hung Window'],
  ['panoramic', '🖼️ Floor-to-Ceiling Panoramic Glass Window'],
  ['bay', '🪟 Wide Landscape Picture Window'],
  ['transom', '🪟 Clerestory / High Transom Accent Window'],
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

/* ======================================================== 0. 3D VIEWER */
export function house3DSection(ed) {
  const house = ed.house;
  if (!house) return el('p', { class: 'hint', text: 'No active house.' });

  const url = `/house/${house.slug}?admin=1`;

  const container = el('div', {
    class: 'house-3d-section',
    style: { display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', minHeight: '680px' },
  });

  const header = el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
    el('div', {},
      el('h2', { style: { margin: 0 }, text: `Live 3D View: ${house.title}` }),
      el('p', { class: 'hint', style: { margin: '4px 0 0' }, text: 'Orbit around the house, switch floor levels, walk inside rooms, and test interactive doors in real-time 3D.' }),
    ),
    el('div', { style: { display: 'flex', gap: '8px' } },
      el('button', {
        type: 'button',
        class: 'btn btn-small',
        text: '🔄 Refresh 3D View',
        onclick: () => {
          const iframe = container.querySelector('iframe');
          if (iframe) iframe.src = iframe.src;
        },
      }),
      el('a', {
        class: 'btn btn-small btn-primary',
        href: url,
        target: '_blank',
        rel: 'noopener',
        text: 'Full Screen 3D Window ↗',
      }),
    ),
  );

  const frameWrap = el('div', {
    style: {
      position: 'relative',
      flex: '1',
      minHeight: '620px',
      borderRadius: '12px',
      overflow: 'hidden',
      border: '1px solid #334155',
      background: '#0b0f19',
    },
  },
    el('iframe', {
      src: url,
      style: {
        width: '100%',
        height: '100%',
        minHeight: '620px',
        border: 'none',
        display: 'block',
      },
      title: '3D House Viewer',
    }),
  );

  container.append(header, frameWrap);
  return container;
}

/* ========================================================= 1. PROJECTS */
export function projectsSection(ed) {
  const container = el('div', { class: 'projects-manager' });

  const header = el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' } },
    el('div', {},
      el('h2', { style: { margin: 0 }, text: 'House Projects' }),
      el('p', { class: 'hint', style: { margin: '4px 0 0' }, text: 'Create, duplicate, customize and switch between different houses and villas.' }),
    ),
    el('button', {
      type: 'button',
      class: 'btn btn-primary',
      text: '➕ Create New House Project',
      onclick: () => openNewHouseModal(ed),
    }),
  );

  const grid = el('div', { class: 'houses-grid', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' } });

  const renderHouses = () => {
    grid.replaceChildren(...(ed.allHouses || []).map((h) => {
      const isCurrent = ed.currentHouseId === h.id;
      const card = el('div', {
        class: `house-card${isCurrent ? ' house-card-current' : ''}`,
        style: {
          background: '#1a1f2c',
          border: isCurrent ? '2px solid #3b82f6' : '1px solid #2d3748',
          borderRadius: '12px',
          padding: '18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          position: 'relative',
        },
      });

      const badges = el('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } });
      if (isCurrent) badges.append(el('span', { class: 'badge', style: { background: '#2563eb', color: '#fff' }, text: 'Active in Builder' }));
      if (h.is_default) badges.append(el('span', { class: 'badge', style: { background: '#10b981', color: '#fff' }, text: '⭐ Default Showcase' }));
      badges.append(el('span', { class: 'badge', style: { background: '#374151', color: '#d1d5db' }, text: h.status === 'published' ? 'Published' : 'Draft' }));

      const stats = el('div', { style: { display: 'flex', gap: '14px', fontSize: '0.85rem', color: '#94a3b8' } },
        el('span', { text: `🏢 ${h.floors_count || 1} Floor(s)` }),
        el('span', { text: `🛋️ ${h.rooms_count || 1} Room(s)` }),
        el('span', { text: `📐 ${h.plot_width}×${h.plot_depth}m` }),
      );

      const actions = el('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid #2d3748' } });

      if (!isCurrent) {
        actions.append(el('button', {
          type: 'button',
          class: 'btn btn-small btn-primary',
          text: '✏️ Edit This House',
          onclick: () => ed.switchHouse(h.id),
        }));
      }

      actions.append(
        el('a', {
          class: 'btn btn-small',
          href: h.view_url || `/house/${h.slug}`,
          target: '_blank',
          rel: 'noopener',
          text: '👁️ 3D View ↗',
        }),
        el('button', {
          type: 'button',
          class: 'btn btn-small',
          text: '📋 Clone',
          onclick: async () => {
            try {
              const res = await api('POST', `/admin/houses/${h.id}/clone`);
              ed.toast(res.message);
              await ed.loadHousesList();
              ed.render();
            } catch (err) {
              ed.toast(err.message, 'bad');
            }
          },
        }),
      );

      if (!h.is_default) {
        actions.append(el('button', {
          type: 'button',
          class: 'btn btn-small',
          text: '⭐ Set Default',
          onclick: async () => {
            try {
              const res = await api('POST', `/admin/houses/${h.id}/default`);
              ed.toast(res.message);
              await ed.loadHousesList();
              ed.render();
            } catch (err) {
              ed.toast(err.message, 'bad');
            }
          },
        }));
      }

      if ((ed.allHouses || []).length > 1) {
        actions.append(el('button', {
          type: 'button',
          class: 'btn btn-small btn-danger',
          text: '🗑️',
          title: 'Delete House',
          onclick: async () => {
            if (!confirm(`Are you sure you want to delete "${h.title}"?`)) return;
            try {
              const res = await api('DELETE', `/admin/houses/${h.id}`);
              ed.toast(res.message);
              if (isCurrent) {
                const remaining = (ed.allHouses || []).filter((x) => x.id !== h.id);
                if (remaining.length) await ed.switchHouse(remaining[0].id);
              } else {
                await ed.loadHousesList();
                ed.render();
              }
            } catch (err) {
              ed.toast(err.message, 'bad');
            }
          },
        }));
      }

      card.append(
        badges,
        el('h3', { style: { margin: 0, fontSize: '1.2rem', color: '#f8fafc' }, text: h.title }),
        el('p', { class: 'hint', style: { margin: 0, lineClamp: 2, display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical', overflow: 'hidden' }, text: h.description || 'No description provided.' }),
        stats,
        actions,
      );

      return card;
    }));
  };

  renderHouses();
  container.append(header, grid);
  return container;
}

function openNewHouseModal(ed) {
  const backdrop = el('div', { class: 'modal-backdrop' });
  const close = () => backdrop.remove();

  const titleInput = el('input', { type: 'text', class: 'input', placeholder: 'e.g. Modern Sunset Villa', required: true });
  const descInput = el('textarea', { class: 'input', rows: 3, placeholder: 'Describe the architectural project…' });
  const templateSelect = el('select', { class: 'input' },
    el('option', { value: 'villa', text: 'Modern Villa (2-Story with Living, Kitchen, Master Suite, Rooftop)' }),
    el('option', { value: 'blank', text: 'Blank Canvas (Empty Single Room to start fresh)' }),
  );
  const plotWInput = el('input', { type: 'number', class: 'input', value: '28', min: '10', max: '100', step: '1' });
  const plotDInput = el('input', { type: 'number', class: 'input', value: '24', min: '10', max: '100', step: '1' });

  const form = el('form', {
    onsubmit: async (e) => {
      e.preventDefault();
      try {
        const title = titleInput.value.trim();
        if (!title) return;
        const res = await api('POST', '/admin/houses', {
          title,
          description: descInput.value.trim(),
          template: templateSelect.value,
          plot_width: Number(plotWInput.value) || 28,
          plot_depth: Number(plotDInput.value) || 24,
        });
        ed.toast('House project created!');
        close();
        await ed.loadHousesList();
        await ed.switchHouse(res.house.id);
      } catch (err) {
        ed.toast(err.message, 'bad');
      }
    },
  },
    el('div', { class: 'field' }, el('label', { text: 'House Project Title *' }), titleInput),
    el('div', { class: 'field' }, el('label', { text: 'Description' }), descInput),
    el('div', { class: 'field' }, el('label', { text: 'Starting Template' }), templateSelect),
    el('div', { class: 'grid-2' },
      el('div', { class: 'field' }, el('label', { text: 'Plot Width (m)' }), plotWInput),
      el('div', { class: 'field' }, el('label', { text: 'Plot Depth (m)' }), plotDInput),
    ),
    el('div', { class: 'btn-row', style: { marginTop: '16px' } },
      el('button', { type: 'button', class: 'btn', text: 'Cancel', onclick: close }),
      el('button', { type: 'submit', class: 'btn btn-primary', text: 'Create House Project' }),
    ),
  );

  const box = el('div', { class: 'modal-box', style: { width: '540px' } },
    el('div', { class: 'modal-head' },
      el('h3', { text: 'Create New House Project' }),
      el('button', { type: 'button', class: 'btn btn-small', text: '✕', onclick: close }),
    ),
    form,
  );

  backdrop.append(box);
  document.body.append(backdrop);
}

/* =========================================================== 2. SPECS */
export function specsSection(ed, f) {
  const house = ed.house;
  if (!house) return el('p', { class: 'hint', text: 'No active house.' });

  return [
    el('p', { class: 'hint', text: 'Configure general project parameters, plot dimensions, and exterior lighting environment.' }),
    el('div', { class: 'grid-2' },
      f.text({ path: ['title'], label: 'House Title', max: 120 }),
      f.select({ path: ['status'], label: 'Publication Status', options: [['published', 'Published (Visible in 3D Tour)'], ['draft', 'Draft (Admin Only)']] }),
    ),
    f.area({ path: ['description'], label: 'House Description & Architectural Overview', rows: 3, max: 1000 }),
    el('div', { class: 'grid-2' },
      f.number({ path: ['plot_width'], label: 'Plot / Terrain Width (m)', min: 12, max: 100, step: 1 }),
      f.number({ path: ['plot_depth'], label: 'Plot / Terrain Depth (m)', min: 12, max: 100, step: 1 }),
    ),
    el('h3', { text: 'Exterior 3D Lighting & Environment' }),
    el('div', { class: 'grid-2' },
      f.color({ path: ['environment', 'sky_color'], label: 'Sky Color', default: '#dfe6f2' }),
      f.number({ path: ['environment', 'sun_intensity'], label: 'Sunlight Brightness', min: 0.2, max: 3.0, step: 0.1, default: 1.1 }),
    ),
  ];
}

/* ========================================================== 3. FLOORS */
export function floorsSection(ed, f) {
  const floors = ed.house?.floors || [];

  const addFloorBtn = el('button', {
    type: 'button',
    class: 'btn btn-primary',
    text: '➕ Add New Floor / Level',
    style: { marginBottom: '16px' },
    onclick: () => {
      const nextLevel = floors.length ? Math.max(...floors.map((fl) => fl.level)) + 1 : 0;
      const lastElevation = floors.length ? floors[floors.length - 1].elevation || 0 : 0;
      const lastHeight = floors.length ? floors[floors.length - 1].height || 3.2 : 3.2;

      floors.push({
        id: `floor-${Date.now()}`,
        name: nextLevel === 1 ? 'First Floor' : nextLevel === 2 ? 'Second Floor' : `Floor Level ${nextLevel}`,
        level: nextLevel,
        height: 3.2,
        elevation: Math.round((lastElevation + lastHeight) * 10) / 10,
        rooms: [],
      });
      ed.markDirty();
      ed.render();
      ed.toast('New floor added! Now add rooms to it.');
    },
  });

  const list = el('div', { class: 'floors-list', style: { display: 'flex', flexDirection: 'column', gap: '16px' } });

  floors.forEach((fl, idx) => {
    const card = el('div', {
      style: {
        background: '#1a1f2c',
        border: '1px solid #2d3748',
        borderRadius: '10px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      },
    });

    const header = el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
      el('h4', { style: { margin: 0, fontSize: '1.1rem', color: '#f1f5f9' }, text: `${fl.name} (Level ${fl.level})` }),
      floors.length > 1 ? el('button', {
        type: 'button',
        class: 'btn btn-small btn-danger',
        text: 'Delete Floor',
        onclick: () => {
          if (!confirm(`Delete "${fl.name}" and all its rooms?`)) return;
          floors.splice(idx, 1);
          ed.markDirty();
          ed.render();
        },
      }) : null,
    );

    const fields = el('div', { class: 'grid-3' },
      f.text({ path: ['floors', idx, 'name'], label: 'Floor Name' }),
      f.number({ path: ['floors', idx, 'height'], label: 'Ceiling Height (m)', min: 2.2, max: 8.0, step: 0.1 }),
      f.number({ path: ['floors', idx, 'elevation'], label: 'Elevation from Ground (m)', min: -10, max: 40, step: 0.1 }),
    );

    const roomSummary = el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#111520', padding: '10px 14px', borderRadius: '6px' } },
      el('span', { style: { color: '#94a3b8', fontSize: '0.9rem' }, text: `Contains ${fl.rooms?.length || 0} Room(s)` }),
      el('button', {
        type: 'button',
        class: 'btn btn-small',
        text: 'Manage Rooms on this Floor ↗',
        onclick: () => {
          ed.selectedFloorIdx = idx;
          ed.section = 'rooms';
          ed.render();
        },
      }),
    );

    card.append(header, fields, roomSummary);
    list.append(card);
  });

  return [
    el('p', { class: 'hint', text: 'Manage vertical levels of the house (e.g. Basement, Ground Floor, First Floor, Rooftop Terrace).' }),
    addFloorBtn,
    list,
  ];
}

/* =========================================================== 4. ROOMS */
export function roomsSection(ed, f) {
  const floors = ed.house?.floors || [];
  if (!floors.length) return el('p', { class: 'hint', text: 'No floors available. Add a floor first.' });

  const floorIdx = Math.max(0, Math.min(floors.length - 1, ed.selectedFloorIdx || 0));
  const activeFloor = floors[floorIdx];
  const rooms = activeFloor.rooms || (activeFloor.rooms = []);

  const floorTabs = el('div', { style: { display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' } },
    ...floors.map((fl, i) => el('button', {
      type: 'button',
      class: `btn btn-small${i === floorIdx ? ' btn-primary' : ''}`,
      text: `🏢 ${fl.name}`,
      onclick: () => {
        ed.selectedFloorIdx = i;
        ed.render();
      },
    })),
  );

  const addRoomBtn = el('button', {
    type: 'button',
    class: 'btn btn-primary',
    text: '➕ Add Room to this Floor',
    style: { marginBottom: '16px' },
    onclick: () => {
      const roomNum = rooms.length + 1;
      rooms.push({
        id: `room-${Date.now()}`,
        name: `Room ${roomNum}`,
        type: 'living',
        color: '#3b82f6',
        layout: {
          size: { w: 8.0, d: 7.0, h: activeFloor.height || 3.2 },
          position: { x: (rooms.length % 3) * 9 - 9, z: Math.floor(rooms.length / 3) * 8 - 4 },
          theme: {
            floor: 'parquet',
            wall: 'plaster',
            wall_color: '#f3f4f6',
            ceiling: 'gypsum_led',
            ceiling_color: '#ffffff',
            light: 'warm',
            brightness: 1.2,
          },
          doors: [
            {
              id: `door-${Date.now()}`,
              wall: 'south',
              type: 'standard',
              offset: 0,
              width: 1.0,
              height: 2.2,
              material: 'wood',
              label: 'Room Entrance',
            },
          ],
          windows: [
            {
              id: `win-${Date.now()}`,
              wall: 'north',
              type: 'standard',
              offset: 0,
              width: 1.8,
              height: 1.5,
              sill_height: 0.8,
            },
          ],
          objects: [],
        },
      });
      ed.markDirty();
      ed.render();
      ed.toast('Room added!');
    },
  });

  const roomsList = el('div', { class: 'rooms-list', style: { display: 'flex', flexDirection: 'column', gap: '20px' } });

  rooms.forEach((rm, rIdx) => {
    const card = el('div', {
      style: {
        background: '#1a1f2c',
        border: '1px solid #334155',
        borderRadius: '12px',
        padding: '18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
      },
    });

    const header = el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
      el('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
        el('span', { style: { width: '14px', height: '14px', borderRadius: '50%', background: rm.color || '#3b82f6', display: 'inline-block' } }),
        el('h4', { style: { margin: 0, fontSize: '1.15rem', color: '#f8fafc' }, text: rm.name || 'Untitled Room' }),
      ),
      el('div', { style: { display: 'flex', gap: '8px' } },
        el('button', {
          type: 'button',
          class: 'btn btn-small btn-primary',
          text: '📐 Open in 2D Designer ↗',
          onclick: () => {
            ed.selectedFloorIdx = floorIdx;
            ed.selectedRoomIdx = rIdx;
            ed.section = 'designer';
            ed.render();
          },
        }),
        el('button', {
          type: 'button',
          class: 'btn btn-small btn-danger',
          text: 'Delete',
          onclick: () => {
            if (!confirm(`Delete "${rm.name}"?`)) return;
            rooms.splice(rIdx, 1);
            ed.markDirty();
            ed.render();
          },
        }),
      ),
    );

    const p = ['floors', floorIdx, 'rooms', rIdx];
    const generalFields = el('div', { class: 'grid-3' },
      f.text({ path: [...p, 'name'], label: 'Room Name' }),
      f.select({ path: [...p, 'type'], label: 'Room Type', options: ROOM_TYPES }),
      f.color({ path: [...p, 'color'], label: 'Accent / Map Color', default: '#3b82f6' }),
    );

    const dimsFields = el('div', { class: 'grid-4' },
      f.number({ path: [...p, 'layout', 'size', 'w'], label: 'Width (m)', min: 2, max: 40, step: 0.1 }),
      f.number({ path: [...p, 'layout', 'size', 'd'], label: 'Depth (m)', min: 2, max: 40, step: 0.1 }),
      f.number({ path: [...p, 'layout', 'position', 'x'], label: 'Position X (m)', min: -50, max: 50, step: 0.2 }),
      f.number({ path: [...p, 'layout', 'position', 'z'], label: 'Position Z (m)', min: -50, max: 50, step: 0.2 }),
    );

    const finishesSection = el('div', { style: { background: '#111520', padding: '14px', borderRadius: '8px' } },
      el('h5', { style: { margin: '0 0 10px', color: '#93c5fd', fontSize: '0.95rem' }, text: '✨ Room Architectural Finishes & Ceilings' }),
      el('div', { class: 'grid-3' },
        f.select({ path: [...p, 'layout', 'theme', 'floor'], label: 'Floor Finish Material', options: FLOOR_MATERIALS }),
        f.select({ path: [...p, 'layout', 'theme', 'ceiling'], label: 'Ceiling ("Clining") Style', options: CEILING_TYPES }),
        f.select({ path: [...p, 'layout', 'theme', 'wall'], label: 'Wall Material', options: WALL_MATERIALS }),
      ),
      el('div', { class: 'grid-3', style: { marginTop: '10px' } },
        f.color({ path: [...p, 'layout', 'theme', 'wall_color'], label: 'Wall Paint Color', default: '#f3f4f6' }),
        f.select({ path: [...p, 'layout', 'theme', 'light'], label: 'Interior Light Mood', options: [['warm', 'Warm Ambient (#ffe8c8)'], ['neutral', 'Neutral Daylight (#fff4e6)'], ['cool', 'Cool Modern (#cfe0ff)']] }),
        f.number({ path: [...p, 'layout', 'theme', 'brightness'], label: 'Lighting Brightness', min: 0.2, max: 3.0, step: 0.1, default: 1.2 }),
      ),
    );

    const doorsAndWindowsSummary = el('div', { style: { display: 'flex', gap: '16px', fontSize: '0.9rem', color: '#cbd5e1' } },
      el('span', { text: `🚪 ${(rm.layout?.doors || []).length} Door(s)` }),
      el('span', { text: `🪟 ${(rm.layout?.windows || []).length} Window(s)` }),
      el('span', { text: `🛋️ ${(rm.layout?.objects || []).length} Placed Object(s)` }),
      el('button', {
        type: 'button',
        class: 'btn btn-small',
        style: { marginLeft: 'auto' },
        text: 'Manage Doors & Windows ↗',
        onclick: () => {
          ed.selectedFloorIdx = floorIdx;
          ed.selectedRoomIdx = rIdx;
          ed.section = 'doors';
          ed.render();
        },
      }),
    );

    card.append(header, generalFields, dimsFields, finishesSection, doorsAndWindowsSummary);
    roomsList.append(card);
  });

  return [
    el('p', { class: 'hint', text: 'Define each room on this floor, its dimensions, floor material, and custom ceiling ("Clining") design.' }),
    floorTabs,
    addRoomBtn,
    roomsList,
  ];
}

/* =================================================== 5. DOORS & WINDOWS */
export function doorsAndWindowsSection(ed, f) {
  const floors = ed.house?.floors || [];
  if (!floors.length) return el('p', { class: 'hint', text: 'No floors available.' });

  const floorIdx = Math.max(0, Math.min(floors.length - 1, ed.selectedFloorIdx || 0));
  const activeFloor = floors[floorIdx];
  const rooms = activeFloor.rooms || [];
  if (!rooms.length) return el('p', { class: 'hint', text: 'No rooms on this floor. Add a room first.' });

  const roomIdx = Math.max(0, Math.min(rooms.length - 1, ed.selectedRoomIdx || 0));
  const activeRoom = rooms[roomIdx];
  const layout = activeRoom.layout || (activeRoom.layout = {});
  const doors = layout.doors || (layout.doors = []);
  const windows = layout.windows || (layout.windows = []);

  const roomSelector = el('div', { style: { display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '18px', background: '#1a1f2c', padding: '12px 16px', borderRadius: '8px' } },
    el('label', { style: { color: '#94a3b8', fontSize: '0.9rem' }, text: 'Select Room to Edit Openings:' }),
    el('select', {
      class: 'input',
      style: { maxWidth: '300px' },
      onchange: (e) => {
        ed.selectedRoomIdx = Number(e.target.value);
        ed.render();
      },
    },
      ...rooms.map((r, i) => el('option', { value: String(i), selected: i === roomIdx, text: `${r.name} (${activeFloor.name})` })),
    ),
  );

  /* --- DOORS --- */
  const doorsBox = el('div', { style: { background: '#1a1f2c', border: '1px solid #334155', borderRadius: '10px', padding: '18px', marginBottom: '20px' } },
    el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' } },
      el('h3', { style: { margin: 0 }, text: `🚪 Doors for "${activeRoom.name}"` }),
      el('button', {
        type: 'button',
        class: 'btn btn-primary btn-small',
        text: '➕ Add Door',
        onclick: () => {
          doors.push({
            id: `door-${Date.now()}`,
            wall: 'south',
            type: 'standard',
            offset: 0,
            width: 1.0,
            height: 2.2,
            material: 'wood',
            label: 'Door',
          });
          ed.markDirty();
          ed.render();
        },
      }),
    ),
  );

  if (!doors.length) {
    doorsBox.append(el('p', { class: 'hint', text: 'No doors yet. Click "+ Add Door" to place an interior or exterior door.' }));
  } else {
    doors.forEach((dr, dIdx) => {
      const p = ['floors', floorIdx, 'rooms', roomIdx, 'layout', 'doors', dIdx];
      const doorRow = el('div', {
        style: {
          background: '#111520',
          border: '1px solid #2d3748',
          borderRadius: '8px',
          padding: '14px',
          marginBottom: '10px',
        },
      });

      const head = el('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px' } },
        el('strong', { style: { color: '#93c5fd' }, text: dr.label || `Door #${dIdx + 1}` }),
        el('button', {
          type: 'button',
          class: 'btn btn-small btn-danger',
          text: 'Remove Door',
          onclick: () => {
            doors.splice(dIdx, 1);
            ed.markDirty();
            ed.render();
          },
        }),
      );

      const fields = el('div', { class: 'grid-4' },
        f.text({ path: [...p, 'label'], label: 'Door Label' }),
        f.select({ path: [...p, 'wall'], label: 'Wall', options: [['south', 'South (+Z)'], ['north', 'North (-Z)'], ['east', 'East (+X)'], ['west', 'West (-X)']] }),
        f.select({ path: [...p, 'type'], label: 'Door Style', options: DOOR_TYPES }),
        f.select({ path: [...p, 'material'], label: 'Door Material', options: [['wood', 'Wood'], ['glass', 'Glass'], ['metal', 'Metal'], ['white', 'White Lacquer']] }),
      );

      const geomFields = el('div', { class: 'grid-3', style: { marginTop: '8px' } },
        f.number({ path: [...p, 'offset'], label: 'Wall Offset (m from center)', min: -20, max: 20, step: 0.1 }),
        f.number({ path: [...p, 'width'], label: 'Door Width (m)', min: 0.7, max: 6.0, step: 0.1 }),
        f.number({ path: [...p, 'height'], label: 'Door Height (m)', min: 1.8, max: 4.0, step: 0.1 }),
      );

      doorRow.append(head, fields, geomFields);
      doorsBox.append(doorRow);
    });
  }

  /* --- WINDOWS --- */
  const windowsBox = el('div', { style: { background: '#1a1f2c', border: '1px solid #334155', borderRadius: '10px', padding: '18px' } },
    el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' } },
      el('h3', { style: { margin: 0 }, text: `🪟 Windows for "${activeRoom.name}"` }),
      el('button', {
        type: 'button',
        class: 'btn btn-primary btn-small',
        text: '➕ Add Window',
        onclick: () => {
          windows.push({
            id: `win-${Date.now()}`,
            wall: 'north',
            type: 'standard',
            offset: 0,
            width: 1.8,
            height: 1.5,
            sill_height: 0.8,
          });
          ed.markDirty();
          ed.render();
        },
      }),
    ),
  );

  if (!windows.length) {
    windowsBox.append(el('p', { class: 'hint', text: 'No windows yet. Click "+ Add Window" to add natural light.' }));
  } else {
    windows.forEach((wn, wIdx) => {
      const p = ['floors', floorIdx, 'rooms', roomIdx, 'layout', 'windows', wIdx];
      const winRow = el('div', {
        style: {
          background: '#111520',
          border: '1px solid #2d3748',
          borderRadius: '8px',
          padding: '14px',
          marginBottom: '10px',
        },
      });

      const head = el('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px' } },
        el('strong', { style: { color: '#6ee7b7' }, text: `Window #${wIdx + 1} (${wn.wall || 'north'})` }),
        el('button', {
          type: 'button',
          class: 'btn btn-small btn-danger',
          text: 'Remove Window',
          onclick: () => {
            windows.splice(wIdx, 1);
            ed.markDirty();
            ed.render();
          },
        }),
      );

      const fields = el('div', { class: 'grid-2' },
        f.select({ path: [...p, 'wall'], label: 'Wall', options: [['north', 'North (-Z)'], ['south', 'South (+Z)'], ['east', 'East (+X)'], ['west', 'West (-X)']] }),
        f.select({ path: [...p, 'type'], label: 'Window Style', options: WINDOW_TYPES }),
      );

      const geomFields = el('div', { class: 'grid-4', style: { marginTop: '8px' } },
        f.number({ path: [...p, 'offset'], label: 'Wall Offset (m)', min: -20, max: 20, step: 0.1 }),
        f.number({ path: [...p, 'width'], label: 'Width (m)', min: 0.6, max: 8.0, step: 0.1 }),
        f.number({ path: [...p, 'height'], label: 'Height (m)', min: 0.4, max: 4.0, step: 0.1 }),
        f.number({ path: [...p, 'sill_height'], label: 'Sill Height (m above floor)', min: 0, max: 3.0, step: 0.1 }),
      );

      winRow.append(head, fields, geomFields);
      windowsBox.append(winRow);
    });
  }

  return [
    el('p', { class: 'hint', text: 'Build doors ("Build doorس") and windows on room walls. Doors can be front security doors, interior hinged, sliding glass, double French, or arches.' }),
    roomSelector,
    doorsBox,
    windowsBox,
  ];
}
