import { el } from '../ui/dom.js';
import { slugify, uniqueId } from './util.js';
import { newLayout } from '../scenes/custom/catalog.js';

const SCENES = [
  ['custom', 'Custom room: design it yourself in the Room designer'],
  ['generic', 'Generic project room (any new project)'],
  ['erp', 'ERP command centre (large flagship room)'],
  ['shipping', 'Shipping and logistics control room'],
  ['gym', 'Gym and fitness centre'],
  ['installments', 'Payments and installments office'],
  ['profile', 'Profile office (shows the Profile section)'],
  ['skills', 'Skills constellation (shows the Skills section)'],
  ['timeline', 'Career corridor (shows the Timeline section)'],
  ['contact', 'Contact lounge (shows the Contact section)'],
];
const SECTION_SCENES = { profile: 'Profile', skills: 'Skills', timeline: 'Timeline', contact: 'Contact and CV' };
const STATUS_LABELS = { completed: 'Completed', in_development: 'In development', planned: 'Planned' };

export const newModule = (withId, ids = []) => ({
  id: withId ? uniqueId('module', ids) : null,
  name: withId ? '' : 'Project overview', status: 'planned', placeholder: false,
  problem: '', features: [], tech: [], role: '', architecture: '', media: [],
  links: { demo: '', source: '', docs: '' }, _auto: withId,
});

export const newCustomRoom = (rooms) => ({
  id: uniqueId('my-room', rooms.map((r) => r.id)), scene: 'custom', kind: 'cv',
  name: 'My Room', tagline: 'A space I designed myself.', accent: '#e08fb0', flagship: false,
  overview: null, modules: [], layout: newLayout(),
});

export const newRoom = (rooms) => ({
  id: uniqueId('room', rooms.map((r) => r.id)), scene: 'generic', kind: 'project',
  name: '', tagline: '', accent: '#c084fc', flagship: false,
  overview: newModule(false), modules: [], _auto: true,
});

/** Everything a module (or a room's overview) can say about itself. */
function moduleForm(ed, f, item, p, refresh, { withId, siblings = [] }) {
  const idField = withId ? f.text({ path: [...p, 'id'], label: 'Identifier', hint: 'Used internally. Changing it resets the "viewed" tick for visitors.', max: 60 }) : null;
  const nameField = f.text({
    path: [...p, 'name'], label: 'Name', max: 120,
    onInput: (v) => {
      if (withId && item._auto) {
        item.id = uniqueId(v || 'module', siblings.filter((s) => s !== item).map((s) => s.id));
        idField.querySelector('input').value = item.id;
      }
      refresh();
    },
  });
  const featureRows = (() => {
    const path = [...p, 'features'];
    return f.repeater({
      path, label: 'Key features', addLabel: 'Add feature', max: 20, empty: 'No features listed.',
      hint: 'Optionally mark each feature as completed, in development or planned.',
      create: () => ({ name: '', status: '' }),
      title: (x) => x.name,
      body: (x, fp, i, r) => [
        f.text({ path: [...fp, 'name'], label: 'Feature', max: 160, onInput: r }),
        f.select({ path: [...fp, 'status'], label: 'Status', options: [['', 'Not tracked'], ...Object.entries(STATUS_LABELS)] }),
      ],
    });
  })();

  return [
    nameField,
    idField,
    el('div', { class: 'grid-2' },
      f.select({ path: [...p, 'status'], label: 'Status', options: Object.entries(STATUS_LABELS) }),
      f.check({ path: [...p, 'placeholder'], label: 'This text is placeholder', hint: 'Shows a "Placeholder" tag until you untick it.' })),
    f.area({ path: [...p, 'problem'], label: 'What problem it solves', rows: 3, max: 1500 }),
    featureRows,
    f.strings({ path: [...p, 'tech'], label: 'Technologies', addLabel: 'Add technology', maxLen: 60 }),
    f.area({ path: [...p, 'role'], label: 'My role and responsibilities', rows: 3, max: 1000 }),
    f.area({ path: [...p, 'architecture'], label: 'Architecture and implementation', rows: 4, max: 2000 }),
    f.repeater({
      path: [...p, 'media'], label: 'Screenshots and demo videos', addLabel: 'Add media', max: 12, empty: 'No media yet.',
      create: () => ({ type: 'image', src: '', caption: '' }),
      title: (m) => m.caption || m.src,
      body: (m, mp) => [
        f.select({ path: [...mp, 'type'], label: 'Type', options: [['image', 'Image'], ['video', 'Video']] }),
        f.file({ path: [...mp, 'src'], label: 'File', kinds: ['image', 'video'], placeholder: '/storage/portfolio/… or https://…', hint: 'Upload a file or paste a link.' }),
        f.text({ path: [...mp, 'caption'], label: 'Caption', max: 200 }),
      ],
    }),
    el('fieldset', { class: 'links' }, el('legend', { text: 'Links (leave blank to hide)' }),
      f.text({ path: [...p, 'links', 'demo'], label: 'Live demo', placeholder: 'https://', max: 500 }),
      f.text({ path: [...p, 'links', 'source'], label: 'Source code', placeholder: 'https://', max: 500 }),
      f.text({ path: [...p, 'links', 'docs'], label: 'Documentation', placeholder: 'https://', max: 500 })),
  ];
}

export function roomsSection(ed, f) {
  const rooms = ed.state.rooms;
  return [
    el('p', { class: 'lead', text: 'Each room is a door in the mansion, in this order (alternating left and right). Mark one room as the flagship to give it the grand door at the end of the hall.' }),
    f.repeater({
      path: ['rooms'], addLabel: 'Add room', max: ed.meta.max.rooms, create: () => newRoom(rooms),
      title: (r) => `${r.flagship ? '★ ' : ''}${r.name || ''}`,
      body: (room, p, i, refresh) => {
        const idField = f.text({ path: [...p, 'id'], label: 'Identifier', max: 60, hint: 'Used internally. Changing it resets the "explored" tick for visitors.' });
        const parts = [
          f.text({
            path: [...p, 'name'], label: 'Room name (shown on the door)', max: 80,
            onInput: (v) => {
              if (room._auto) {
                room.id = uniqueId(v || 'room', rooms.filter((r) => r !== room).map((r) => r.id));
                idField.querySelector('input').value = room.id;
              }
              refresh();
            },
          }),
          f.text({ path: [...p, 'tagline'], label: 'Short description (shown when you approach the door)', max: 240 }),
          el('div', { class: 'grid-2' },
            f.select({ path: [...p, 'scene'], label: 'Room environment', options: SCENES, onChange: (v) => { if (v === 'custom' && !room.layout) room.layout = newLayout(); ed.render(); } }),
            f.color({ path: [...p, 'accent'], label: 'Accent colour' })),
          el('div', { class: 'grid-2' },
            f.select({ path: [...p, 'kind'], label: 'Counts as', options: [['project', 'A project'], ['cv', 'A CV area']] }),
            f.check({
              path: [...p, 'flagship'], label: 'Flagship room (grand door, largest room)',
              onChange: (v) => { if (v) rooms.forEach((r) => { if (r !== room) r.flagship = false; }); ed.render(); },
            })),
          idField,
        ];
        if (SECTION_SCENES[room.scene]) {
          parts.push(el('p', { class: 'note', text: `This room displays your "${SECTION_SCENES[room.scene]}" section, so there are no project modules to edit here.` }));
          return parts;
        }
        if (room.scene === 'custom') {
          parts.push(el('div', { class: 'note' },
            el('p', { text: 'This room is laid out in the Room designer: size, materials, lighting and every object.' }),
            el('button', { type: 'button', class: 'btn btn-small btn-primary', onclick: () => { ed.designIndex = i; ed.section = 'designer'; ed.render(); } }, 'Open in the Room designer')));
        }
        parts.push(el('div', { class: 'subhead' }, el('h4', { text: 'Project overview' }),
          el('p', { class: 'hint', text: 'The panel opened from the overview podium inside the room.' })));
        const has = !!room.overview;
        room._hasOverview = has;
        parts.push(f.check({ path: [...p, '_hasOverview'], label: 'This room has a project overview', onChange: (v) => { room.overview = v ? newModule(false) : null; ed.render(); } }));
        if (has) parts.push(el('div', { class: 'nested' }, moduleForm(ed, f, room.overview, [...p, 'overview'], () => {}, { withId: false })));
        parts.push(f.repeater({
          path: [...p, 'modules'], label: 'Modules (one display each, on the room walls)', addLabel: 'Add module', max: ed.meta.max.modules,
          empty: 'No modules yet.',
          create: (arr) => newModule(true, arr.map((m) => m.id)),
          title: (m) => m.name,
          body: (m, mp, j, r) => moduleForm(ed, f, m, mp, r, { withId: true, siblings: room.modules }),
        }));
        return parts;
      },
    }),
  ];
}

export { slugify };
