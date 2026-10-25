// Drives the real dashboard UI (jsdom) against a fake backend that runs the REAL PHP sanitiser on every save,
// then feeds the saved content into the 3D scene checks.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { JSDOM } from 'jsdom';

const root = new URL('..', import.meta.url);
const rootPath = (p) => new URL(p, root).pathname;
const php = (...args) => execFileSync('php', [rootPath('tools/sanitizer-check.php'), ...args], { encoding: 'utf8' });

const dom = new JSDOM('<!doctype html><meta name="csrf-token" content="tok"><body><div id="admin-app"></div><form id="logout-form" method="POST" action="/admin/logout" hidden></form></body>', { pretendToBeVisual: true, url: 'http://localhost/admin' });
const { window } = dom;
for (const k of ['window', 'document', 'Element', 'FormData', 'File', 'AbortController', 'HTMLElement']) Object.defineProperty(globalThis, k, { value: k === 'window' ? window : window[k], configurable: true, writable: true });
window.confirm = globalThis.confirm = () => true;
window.HTMLFormElement.prototype.submit = () => { globalThis.__loggedOut = true; };

/* ---------------- fake backend (real sanitiser behind it) ---------------- */
let stored = JSON.parse(php('--content'));
const history = [];
let files = [];
const calls = [];
const meta = () => ({ scenes: [], statuses: [], kinds: [], max: { rooms: 14, modules: 10, skills: 10, timeline: 12, list: 20, media: 12 }, customised: true, game_url: '/', cv_url: '/cv' });
const json = (status, body) => ({ status, ok: status < 400, json: async () => body });

globalThis.fetch = window.fetch = async (url, opts = {}) => {
  const method = opts.method ?? 'GET'; calls.push(`${method} ${url}`);
  if (opts.headers['X-CSRF-TOKEN'] !== 'tok') return json(419, { message: 'CSRF' });
  if (url === '/admin/content' && method === 'GET') return json(200, { content: stored, meta: meta() });
  if (url === '/admin/content' && method === 'PUT') {
    const tmp = path.join(os.tmpdir(), `payload-${process.pid}.json`);
    fs.writeFileSync(tmp, JSON.stringify(JSON.parse(opts.body).content));
    const { content, errors } = JSON.parse(php('--sanitize', tmp));
    if (Object.keys(errors).length) return json(422, { message: 'Some fields need attention.', errors });
    history.unshift({ id: history.length + 1, note: 'Before save', created_at: '2026-10-18 10:00:00', data: stored });
    stored = content;
    return json(200, { content, meta: meta() });
  }
  if (url === '/admin/revisions') return json(200, { revisions: history.map(({ id, note, created_at }) => ({ id, note, created_at })) });
  if (/\/admin\/revisions\/\d+\/restore/.test(url)) { stored = history[0].data; return json(200, { content: stored, meta: meta() }); }
  if (url === '/admin/media' && method === 'GET') return json(200, { files });
  if (url === '/admin/media' && method === 'POST') {
    const added = opts.body.getAll('files[]').map((f, i) => ({ name: `ab12-${f.name}`, type: f.name.endsWith('.pdf') ? 'pdf' : 'image', url: `/storage/portfolio/ab12-${f.name}`, path: `storage/portfolio/ab12-${f.name}`, size: 1234, modified: 1760000000 + i }));
    files = [...added, ...files];
    return json(201, { files: added });
  }
  if (url === '/admin/media' && method === 'DELETE') { files = files.filter((f) => f.name !== JSON.parse(opts.body).name); return json(200, {}); }
  return json(404, { message: 'not found' });
};

const { Editor } = await import(new URL('resources/js/admin/Editor.js', root));

let failures = 0;
const ok = (c, m) => { if (!c) { failures++; console.log('  FAIL:', m); } else console.log('  ok  ', m); };
const $$ = (sel, scope = document) => [...scope.querySelectorAll(sel)];
const byText = (sel, text, scope = document) => $$(sel, scope).find((n) => n.textContent.trim().startsWith(text));
const sleep = (ms = 25) => new Promise((r) => setTimeout(r, ms));
const type = (input, value) => { input.value = value; input.dispatchEvent(new window.Event('input', { bubbles: true })); };
const field = (label, scope = document) => { const l = $$('label, .label', scope).find((n) => n.textContent.trim() === label); return l?.control ?? l?.parentElement.querySelector('input, textarea, select'); };
const roomCards = () => [...document.querySelector('.main .repeater').children].filter((c) => c.matches('details.card'));
const modulesOf = (card) => [...$$('.field > .label', card).find((n) => n.textContent.startsWith('Modules (one display each')).parentElement.querySelector(':scope > .repeater').children].filter((c) => c.matches('details.card'));
const nav = (name) => byText('.nav-item', name).click();
const save = async () => { byText('button', 'Save changes').click(); await sleep(400); };
const status = () => document.querySelector('.status').textContent;

const ed = new Editor(document.getElementById('admin-app'));
await ed.init();

console.log('\n[shell]');
ok($$('.nav-item').length === 10, '10 sections in the navigation (incl. Room designer)');
ok(status() === 'All changes saved', 'starts clean');
ok(field('Your name').value === stored.owner.name, 'owner form is populated from the server');

console.log('\n[edit + save a simple field]');
type(field('Your name'), 'Ada Lovelace');
ok(status() === 'Unsaved changes', 'dirty indicator appears');
await save();
ok(stored.owner.name === 'Ada Lovelace' && status() === 'All changes saved', 'saved through the real sanitiser');
ok(history.length === 1, 'previous version went to history');

console.log('\n[server-side validation errors appear on the right field]');
type(field('Your name'), '');
type(field('Professional title'), 'x'.repeat(10));
nav('Contact and CV'); type(field('Public email'), 'not-an-email');
await save();
ok(document.querySelector('h1').textContent === 'Site and owner', 'jumps to the first section with errors');
ok(/required/i.test(document.querySelector('.has-error .error')?.textContent ?? ''), 'inline message under the name field');
ok(!!byText('.nav-item', 'Contact and CV').querySelector('.badge-err'), 'section badge shows the error count');
ok(stored.owner.name === 'Ada Lovelace', 'nothing invalid was stored');
type(field('Your name'), 'Ada Lovelace'); nav('Contact and CV'); type(field('Public email'), 'ada@example.com'); await save();
ok(stored.contact.email === 'ada@example.com' && !$$('.badge-err').length, 'fixing the errors saves cleanly');

console.log('\n[rooms: add, name, auto id, module, feature status]');
nav('Rooms and projects');
ok(roomCards().length === 9, `${roomCards().length} room cards listed`);
const roomsBefore = stored.rooms.length;
byText('button', '+ Add room').click();
let card = roomCards().at(-1);
ok(card.open, 'new room opens for editing');
type(field('Room name (shown on the door)', card), 'Computer Vision Lab');
ok(field('Identifier', card).value === 'computer-vision-lab', 'id is generated from the name');
type(field('Short description (shown when you approach the door)', card), 'Face and object detection.');
byText('button', '+ Add module', card).click();
card = roomCards().at(-1);
let modCard = modulesOf(card).at(-1);
type(field('Name', modCard), 'Face detector');
byText('button', '+ Add feature', modCard).click();
card = roomCards().at(-1);
modCard = modulesOf(card).at(-1);
const featCard = $$('details.card', modCard).find((c) => c.querySelector('label')?.textContent === 'Feature');
type(field('Feature', featCard), 'Live camera matching');
const featStatus = field('Status', featCard); featStatus.value = 'in_development'; featStatus.dispatchEvent(new window.Event('change'));
await save();
ok(stored.rooms.length === roomsBefore + 1, `room count ${roomsBefore} -> ${stored.rooms.length}`);
const nr = stored.rooms.at(-1);
ok(nr.id === 'computer-vision-lab' && nr.scene === 'generic' && nr.name === 'Computer Vision Lab', 'new room saved with generated id and generic scene');
ok(nr.modules[0]?.id === 'face-detector' && nr.modules[0].name === 'Face detector', 'module saved with generated id');
ok(JSON.stringify(nr.modules[0].features) === JSON.stringify([{ name: 'Live camera matching', status: 'in_development' }]), 'feature keeps its status');

console.log('\n[flagship is exclusive, ordering and deleting]');
ok(stored.rooms.find((r) => r.flagship).id === 'erp', 'ERP starts as the flagship');
card = roomCards().at(-1);
const flagBox = $$('.field-check input', card).find((b) => b.closest('label').textContent.includes('Flagship'));
flagBox.checked = true; flagBox.dispatchEvent(new window.Event('change', { bubbles: true }));
ok(ed.state.rooms.filter((r) => r.flagship).length === 1 && ed.state.rooms.at(-1).flagship, 'ticking flagship un-ticks the previous one');
const prevLast = ed.state.rooms.at(-2).id;
roomCards().at(-1).querySelector('summary [aria-label="Move up"]').click();
ok(ed.state.rooms.at(-2).id === 'computer-vision-lab' && ed.state.rooms.at(-1).id === prevLast, 'move up reorders rooms');
await save();
ok(stored.rooms.at(-2).id === 'computer-vision-lab' && stored.rooms.filter((r) => r.flagship).length === 1, 'order and single flagship persisted');
roomCards().at(-2).querySelector('summary [aria-label="Remove"]').click();
ok(ed.state.rooms.length === roomsBefore && status() === 'Unsaved changes', 'remove deletes the room (unsaved until you save)');
await ed.replaceContent({ content: stored, meta: meta() });
ok(ed.state.rooms.length === roomsBefore + 1 && status() === 'All changes saved', 'reloading server content discards unsaved edits');


console.log('\n[room designer: plan, selection, drag, keyboard, undo]');
const W = 20; const D = 16;
const PX = (x) => (x + W / 2 + 1) * 40; const PZ = (z) => (z + D / 2 + 1) * 40;
const fire = (target, type, x, y, extra = {}) => target.dispatchEvent(new window.MouseEvent(type, { bubbles: true, clientX: x, clientY: y, ...extra }));
const plan = () => document.querySelector('svg.plan');
const planKey = (key, extra = {}) => plan().dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true, ...extra }));
const objs = () => $$('svg.plan .obj');
const inspector = () => document.querySelector('.inspector');
const myIdx = () => ed.state.rooms.findIndex((r) => r.id === 'my-room');
const lay = () => ed.state.rooms[myIdx()].layout;
const dragObj = (id, from, to) => {
  const hit = document.querySelector(`.obj[data-id="${id}"] .obj-hit`);
  fire(hit, 'pointerdown', PX(from[0]), PZ(from[1]));
  fire(window, 'pointermove', PX(to[0]), PZ(to[1]));
  fire(window, 'pointerup', PX(to[0]), PZ(to[1]));
};
nav('Room designer'); await sleep(60);
ok(!!plan() && !!document.querySelector('.palette'), 'plan, palette and inspector render');
ok(objs().length === 11, `${objs().length} starter objects drawn on the plan`);
ok(document.querySelectorAll('.palette-item').length === 20, 'palette offers all 20 object types');
ok(/Everything is reachable/.test(document.querySelector('.issues-summary').textContent), 'starter room passes the walkability check');

fire(document.querySelector('.obj[data-id="info-1"] .obj-hit'), 'pointerdown', PX(-5), PZ(2.5)); fire(window, 'pointerup', 0, 0);
ok(document.querySelector('.obj[data-id="info-1"]').classList.contains('sel'), 'clicking an object selects it');
ok(!!field('Title', inspector()) && field('Title', inspector()).value === 'About this room', 'inspector shows that object\'s own fields');

dragObj('info-1', [-5, 2.5], [-3.1, 1.05]);
let info = lay().objects.find((o) => o.id === 'info-1');
ok(info.x === -3 && info.z === 1, `drag moves with 0.25 m snapping -> (${info.x}, ${info.z})`);
ok(status() === 'Unsaved changes', 'dragging marks the dashboard dirty');
planKey('z', { ctrlKey: true });
info = lay().objects.find((o) => o.id === 'info-1');
ok(info.x === -5 && info.z === 2.5, 'Ctrl+Z undoes the drag');
planKey('y', { ctrlKey: true });
ok(lay().objects.find((o) => o.id === 'info-1').x === -3, 'Ctrl+Y redoes it');
planKey('z', { ctrlKey: true });

planKey('ArrowRight');
ok(lay().objects.find((o) => o.id === 'info-1').x === -4.75, 'arrow key nudges by 0.25 m');
planKey('r');
ok(lay().objects.find((o) => o.id === 'info-1').rot === 90, 'R rotates a quarter turn');
planKey('d');
ok(objs().length === 12 && lay().objects.some((o) => o.id === 'info-2'), 'D duplicates (new unique id)');
planKey('Delete');
ok(objs().length === 11, 'Delete removes the selected object');
planKey('z', { ctrlKey: true });
ok(objs().length === 12, 'undo restores a deleted object');
planKey('z', { ctrlKey: true }); planKey('z', { ctrlKey: true }); planKey('z', { ctrlKey: true });
ok(objs().length === 11 && lay().objects.find((o) => o.id === 'info-1').rot === 0, 'repeated undo walks back through every step');

console.log('\n[room designer: palette, params, wall snapping]');
const before = lay().objects.length;
document.querySelector('.palette-item[data-type="desk"]').click();
ok(lay().objects.length === before + 1 && lay().objects.at(-1).type === 'desk', 'palette adds an object');
const desk = lay().objects.at(-1);
ok(objs().some((g) => g.getAttribute('data-id') === desk.id), 'it appears on the plan');
const noOverlap = lay().objects.filter((o) => o !== desk).every((o) => Math.abs(o.x - desk.x) > 0.3 || Math.abs(o.z - desk.z) > 0.3);
ok(noOverlap && desk.z <= 4.3, 'new objects are placed in free space, away from the entrance');
type(field('Width (m)', inspector()), '2.4');
ok(desk.p.w === 2.4, 'editing a parameter updates the layout');
ok(Number(document.querySelector(`.obj[data-id="${desk.id}"] .obj-shape`).getAttribute('width')) === 2.4 * 40, 'and the plan redraws at the new size');
document.querySelector('.palette-item[data-type="sign"]').click();
const sgn = lay().objects.at(-1);
ok(Math.abs(sgn.z - (-D / 2 + 0.28)) < 0.01 && sgn.rot === 0, 'wall items start on a wall (north)');
dragObj(sgn.id, [sgn.x, sgn.z], [-8.9, 1.1]);
ok(sgn.x === -9.72 && sgn.rot === 90, `dragging a wall item near a wall snaps and turns it (x=${sgn.x}, rot=${sgn.rot})`);

console.log('\n[room designer: walkability checker]');
document.querySelector('.palette-item[data-type="info"]').click();
const far = lay().objects.at(-1);
type(field('X (m)', inspector()), '4'); type(field('Z (m)', inspector()), '-6.5');
document.querySelector('.palette-item[data-type="block"]').click();
const wall = lay().objects.at(-1);
type(field('Width (m)', inspector()), '20'); type(field('Depth (m)', inspector()), '0.6');
type(field('Z (m)', inspector()), '-1'); type(field('X (m)', inspector()), '0');
await sleep(250);
ok($$('.issue.error').some((b) => /cannot be reached/.test(b.textContent) && /Info point/.test(b.textContent)), 'a wall across the room is flagged: the info point behind it cannot be reached');
ok(document.querySelector(`.obj[data-id="${far.id}"]`).classList.contains('issue'), 'the unreachable object is outlined on the plan');
document.querySelector('#walk-toggle').click(); await sleep(250);
ok(document.querySelector('.walk-no')?.getAttribute('d')?.length > 10 && document.querySelector('.walk-ok')?.getAttribute('d')?.length > 10, 'walk overlay shows reachable (green) and cut-off (red) floor');
document.querySelector('#walk-toggle').click();
planKey('Delete'); await sleep(250);
ok(!$$('.issue.error').length, 'removing the wall clears the problems');

console.log('\n[room designer: modules, room size and theme, save]');
const room = ed.state.rooms[myIdx()];
for (const n of [1, 2]) room.modules.push({ id: `m${n}`, name: `Module ${n}`, status: 'planned', placeholder: false, problem: '', features: [], tech: [], role: '', architecture: '', media: [], links: { demo: '', source: '', docs: '' } });
await sleep(10); nav('Room designer'); await sleep(40);
ok($$('.issue.warn').length === 2, 'modules without a display are suggested');
byText('button', 'Add displays for all modules').click(); await sleep(250);
const mods = lay().objects.filter((o) => o.type === 'module');
ok(mods.length === 2 && mods.map((m) => m.p.module).sort().join() === 'm1,m2', 'one display per module added automatically');
ok(mods.every((m) => Math.abs(Math.abs(m.x) - 9.72) < 0.01 || Math.abs(m.z + 7.72) < 0.01), 'and placed on walls');
ok(!$$('.issue.warn').length, 'suggestions disappear');
byText('button', 'Room size and look').click();
type(field('Width (m)', inspector()), '24');
const floorSel = field('Floor', inspector()); floorSel.value = 'marble'; floorSel.dispatchEvent(new window.Event('change', { bubbles: true }));
ok(lay().size.w === 24 && lay().theme.floor === 'marble', 'room size and floor material editable');
ok(document.querySelector('.plan-floor').getAttribute('fill') === '#e3e0d8', 'plan floor colour follows the material');
ok(lay().objects.every((o) => Math.abs(o.x) <= 12 - 0.15), 'objects stay inside the room');
await save();
const savedRoom = stored.rooms.find((r) => r.id === 'my-room');
ok(!Object.keys(ed.errors).length && savedRoom.layout.size.w === 24 && savedRoom.layout.theme.floor === 'marble', 'saved through the real PHP validator');
ok(savedRoom.layout.objects.filter((o) => o.type === 'module').length === 2 && savedRoom.layout.objects.some((o) => o.type === 'sign' && o.rot === 90), 'objects, modules and wall snapping persisted');

console.log('\n[room designer: server rejects an unusable layout and points at it]');
byText('button', 'Selected object').click();
document.querySelector('.palette-item[data-type="block"]').click();
const gate = lay().objects.at(-1);
type(field('Width (m)', inspector()), '4'); type(field('Depth (m)', inspector()), '1');
type(field('X (m)', inspector()), '0'); type(field('Z (m)', inspector()), '7.5');
await save();
ok(Object.keys(ed.errors).some((k) => /layout\.objects\.\d+$/.test(k)), 'blocking the entrance is rejected: ' + JSON.stringify(ed.errors).slice(0, 110));
ok(document.querySelector('h1').textContent === 'Room designer', 'dashboard jumps to the designer');
ok($$('.issue.error').some((b) => /blocking the entrance/.test(b.textContent)), 'the designer flags the same problem live, before saving');
planKey('Delete'); await save();
ok(!Object.keys(ed.errors).length, 'removing it lets the save through');

console.log('\n[room designer: create another custom room]');
byText('button', '+ New custom room').click(); await sleep(40);
ok(ed.state.rooms.filter((r) => r.scene === 'custom').length === 2, 'a second custom room is created');
type(document.querySelector('.designer-head select').closest('div').querySelector('select'), '');
await save();
ok(stored.rooms.filter((r) => r.scene === 'custom').length === 2 && stored.rooms.at(-1).layout.objects.length === 0, 'saved with an empty default layout');
document.querySelector('.palette-item[data-type="plant"]').click();
await save();
ok(stored.rooms.at(-1).layout.objects.length === 1, 'objects can be added to the new room straight away');

console.log('\n[the exact same content builds and is walkable in the 3D game]');
const gameData = { ...stored, contact: Object.fromEntries(Object.entries(stored.contact).filter(([k]) => k !== 'receive_email')), cv: { page_url: '/cv', download_url: '/cv/download', has_pdf: false }, endpoints: { contact: '/contact' } };
const gameFile = path.join(os.tmpdir(), `game-${process.pid}.json`);
fs.writeFileSync(gameFile, JSON.stringify(gameData));
let sceneOut = '';
try { sceneOut = execFileSync('node', [rootPath('tools/scene-check.mjs'), gameFile], { encoding: 'utf8' }); } catch (e) { sceneOut = e.stdout + e.stderr; }
ok(/ROOM computer-vision-lab \[generic\]/.test(sceneOut), 'dashboard-created room is built by the game');
ok(/ALL CHECKS PASSED/.test(sceneOut), 'every room incl. the new one passes spawn / reachability / collision checks');
if (!/ALL CHECKS PASSED/.test(sceneOut)) console.log(sceneOut.split('\n').filter((l) => /FAIL/.test(l)).join('\n'));

console.log('\n[media library + file pickers]');
nav('Media library');
const fi = document.querySelector('input[type=file][multiple]');
Object.defineProperty(fi, 'files', { value: [new window.File(['x'], 'shot one.png', { type: 'image/png' }), new window.File(['y'], 'cv.pdf', { type: 'application/pdf' })], configurable: true });
fi.dispatchEvent(new window.Event('change')); await sleep(80);
ok($$('.media-card').length === 2, 'uploaded files appear in the library');
byText('button', 'Delete', $$('.media-card')[0]).click(); await sleep(80);
ok($$('.media-card').length === 1 && files.length === 1, 'delete removes a file');
nav('Contact and CV'); await sleep(80);
ok($$('datalist option').some((o) => o.value === 'storage/portfolio/ab12-cv.pdf'), 'CV picker offers the uploaded PDF (path form)');
type(field('CV (PDF)'), 'storage/portfolio/ab12-cv.pdf'); await save();
ok(stored.cv_file === 'storage/portfolio/ab12-cv.pdf', 'cv_file saved');
type(field('CV (PDF)'), '../../.env'); await save();
ok(/PDF/.test(document.querySelector('.has-error .error')?.textContent ?? '') && stored.cv_file === 'storage/portfolio/ab12-cv.pdf', 'path traversal in cv_file is rejected by the server');
type(field('CV (PDF)'), 'storage/portfolio/ab12-cv.pdf');

console.log('\n[settings, history, logout]');
nav('Game settings'); type(field('Brightness (exposure)'), '1.4'); await save();
ok(stored.settings.exposure === 1.4, 'exposure saved');
type(field('Brightness (exposure)'), '9'); await save();
ok(/between/.test(document.querySelector('.has-error .error')?.textContent ?? ''), 'out-of-range exposure rejected');
nav('History and reset'); await sleep(60);
ok($$('.history-row').length > 0, 'history lists earlier versions');
byText('button', 'Restore').click(); await sleep(80);
ok(ed.dirty === false, 'restore replaces the editor content');
byText('button', 'Log out').click(); ok(globalThis.__loggedOut === true, 'log out submits the logout form');

console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL DASHBOARD CHECKS PASSED');
process.exit(failures ? 1 : 0);
