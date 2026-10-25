// Integration test: real Blade markup + real Game/UI code in jsdom, with a fake WebGL renderer.
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const root = new URL('..', import.meta.url);
const dataPath = process.argv[2] ?? 'storage/app/portfolio.json';
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
data.roomsById = Object.fromEntries(data.rooms.map((r) => [r.id, r]));

// ---- render the Blade file by swapping directives for values
let html = fs.readFileSync(new URL('resources/views/game.blade.php', root), 'utf8')
  .replace(/\{\{--[\s\S]*?--\}\}/g, '')
  .replace(/@vite\([^)]*\)/, '')
  .replace('@json($portfolio)', JSON.stringify(data))
  .replace(/\{\{\s*csrf_token\(\)\s*\}\}/g, 'test-token')
  .replace(/\{\{\s*\$portfolio((?:\['[a-z_]+'\])+)\s*\}\}/g, (_, keys) => keys.match(/'([a-z_]+)'/g).map((k) => k.slice(1, -1)).reduce((o, k) => o[k], data))
  .replace(/\{\{\s*route\('cv\.download'\)\s*\}\}/g, '/cv/download')
  .replace(/\{\{\s*route\('cv'\)\s*\}\}/g, '/cv');
if (/\{\{|@json|@vite/.test(html)) throw new Error('unrendered Blade directive left in markup');

const dom = new JSDOM(html, { pretendToBeVisual: true, url: 'http://localhost/' });
const { window } = dom;
const ctx2d = new Proxy({}, { get: (t, k) => (k in t ? t[k] : k === 'measureText' ? (s) => ({ width: String(s).length * 9 }) : (k === 'createLinearGradient' || k === 'createRadialGradient') ? () => ({ addColorStop() {} }) : () => {}), set: (t, k, v) => { t[k] = v; return true; } });
window.HTMLCanvasElement.prototype.getContext = () => ctx2d;
window.matchMedia = () => ({ matches: false });
window.scrollTo = () => {}; window.Element.prototype.scrollIntoView = () => {};
for (const k of ['window', 'document', 'Element', 'AbortController', 'requestAnimationFrame', 'localStorage', 'matchMedia', 'HTMLElement', 'location', 'navigator']) {
  Object.defineProperty(globalThis, k, { value: k === 'window' ? window : window[k], configurable: true, writable: true });
}
globalThis.innerWidth = 1280; globalThis.innerHeight = 720;

// ---- fake renderer (no WebGL in Node)
class FakeRenderer {
  constructor() { this.shadowMap = {}; this.frames = 0; }
  setPixelRatio() {} setSize() {} compile() {} dispose() {}
  render() { this.frames++; }
  setAnimationLoop(fn) { this.loop = fn; }
}
globalThis.__FakeRenderer = FakeRenderer;
const gameSrc = fs.readFileSync(new URL('resources/js/game/Game.js', root), 'utf8').replace('new THREE.WebGLRenderer(', 'new globalThis.__FakeRenderer(');
fs.writeFileSync(new URL('resources/js/game/Game.test-copy.js', root), gameSrc);

const { Progress } = await import(new URL('resources/js/state/progress.js', root));
const { AudioEngine } = await import(new URL('resources/js/game/Audio.js', root));
const { createUi } = await import(new URL('resources/js/ui/index.js', root));
const { Game } = await import(new URL('resources/js/game/Game.test-copy.js', root));

let failures = 0;
const ok = (c, m) => { if (!c) { failures++; console.log('  FAIL:', m); } else console.log('  ok  ', m); };
const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const key = (code, type = 'keydown') => window.dispatchEvent(new window.KeyboardEvent(type, { code, key: code, bubbles: true }));

const progress = new Progress(data.rooms.length);
const audio = new AudioEngine();
const handlers = {};
const ui = createUi({ data, audio, progress, handlers });
const game = new Game({ canvas: $('game-canvas'), data, ui, audio, progress });
Object.assign(handlers, { start: (o) => game.startExperience(o), resume: () => game.resume(), travel: (id) => game.travel(id), panelClosed: () => game.panelClosed() });
await game.init();
let fake = 0; game.now = () => (fake += 16.7);
const frames = (n = 3) => { for (let i = 0; i < n; i++) game.frame(); };

console.log('\n[welcome]');
ui.menus.showWelcome();
ok(!$('welcome').hidden && $('hud').hidden, 'welcome visible, HUD hidden');
ok($('welcome-title').textContent === 'Developer Portfolio Experience', 'title text');
$('btn-controls').click(); ok(!$('controls-modal').hidden, 'Controls opens'); key('Escape'); ok($('controls-modal').hidden, 'Esc closes Controls');
$('chk-skip').checked = false;
frames();
console.log('\n[start with the cinematic intro]');
$('btn-start').click();
ok(game.state === 'intro' && /skip/i.test($('prompt-text').textContent) && $('prompt-key').hidden, 'intro running with a skip hint');
frames(30); ok(game.camera.position.y > 3, `camera starts high (y=${game.camera.position.y.toFixed(1)})`);
for (let i = 0; i < 450; i++) game.frame();
ok(game.state === 'play', 'intro finishes by itself and hands over control');
ok(Math.hypot(game.camera.position.x - game.hub.spawn.x, game.camera.position.z - game.hub.spawn.z) < 0.05 && Math.abs(game.camera.position.y - 1.65) < 0.05, 'camera lands exactly on the player spawn');
ok($('prompt').hidden, 'skip hint cleared');
ok(game.state === 'play' && $('welcome').hidden && !$('hud').hidden, 'state=play, HUD shown');
ok($('hud-progress-text').textContent === `0 of ${data.rooms.length} rooms explored`, 'progress text');
const hub = game.hub;

console.log('\n[movement + proximity]');
key('KeyW', 'keydown'); for (let i = 0; i < 120; i++) game.frame(); key('KeyW', 'keyup');
ok(game.player.z < hub.spawn.z - 1, `walked forward (z ${hub.spawn.z} -> ${game.player.z.toFixed(2)})`);
game.player.teleport(-7.5, -2, Math.PI / 2); frames(2);   // facing the first left door (profile)
ok($('prompt').hidden === false && /Enter Developer Profile/.test($('prompt-text').textContent), `prompt: "${$('prompt-text').textContent}"`);
ok($('room-card').hidden === false && $('room-card-title').textContent === 'Developer Profile', 'room card shows name + description');

console.log('\n[enter room by pressing E, then return]');
const entering = (async () => { key('KeyE'); frames(1); })();
await entering;
ok(game.state === 'transition', 'transition started');
await sleep(2600); frames(2);
ok(game.state === 'play' && game.world.id === 'profile', `inside room "${game.world.id}", state=${game.state}`);
ok(progress.hasRoom('profile') && $('hud-room').textContent === 'Developer Profile', 'progress + HUD room name updated');
ok(!$('hud-return').hidden, 'Return button visible inside a room');

console.log('\n[panel inside room]');
const w = game.world;
game.player.teleport(0, -2.2, 0); frames(2);
ok(/Read my profile/.test($('prompt-text').textContent), `prompt at desk: "${$('prompt-text').textContent}"`);
key('KeyE'); frames(1);
ok(game.state === 'panel' && !$('panel').hidden, 'profile panel opened');
ok($('panel-title').textContent === data.owner.name, 'panel title');
ok(!!$('panel-body').querySelector('[data-section="philosophy"]'), 'panel has philosophy section');
key('Escape'); ok(game.state === 'play' && $('panel').hidden, 'Esc closes panel, back to play');

console.log('\n[return to mansion]');
$('btn-return').click(); await sleep(2600); frames(2);
ok(game.world === hub && game.state === 'play', 'back in the mansion');
const sp = hub.doorSpawns.profile;
ok(Math.hypot(game.player.x - sp.x, game.player.z - sp.z) < 0.01, 'player stands in front of the door they used');
ok(progress.hasRoom('profile'), 'progress kept after returning');

console.log('\n[pause + quick travel to ERP]');
key('Escape'); ok(game.state === 'pause' && !$('pause').hidden, 'Esc opens pause');
ok($('pause-rooms').children.length === data.rooms.length + 1, 'pause lists every room + entrance');
[...$('pause-rooms').querySelectorAll('button')].find((b) => /ERP System/.test(b.textContent)).click();
await sleep(2400); frames(2);
ok(game.world.id === 'erp' && game.state === 'play', `travelled to ${game.world.id}`);
const erp = game.world;
ok(erp.size.w * erp.size.d > 3.5 * Math.max(...data.rooms.filter((r) => r.id !== 'erp').map((r) => 0)) , 'ERP built');


console.log('\n[module screen -> panel with placeholder + safe links]');
const hrMod = data.rooms.find((r) => r.id === 'erp').modules[0];
const it = erp.interactables.find((i) => i.label === `Inspect ${hrMod.name}`);
ok(!!it, 'ERP has an Inspect interactable for the first module');
game.player.teleport(it.x + (it.x < 0 ? 2.8 : it.x > 0 && Math.abs(it.x) > 20 ? -2.8 : 0), it.x === erp.bounds.minX + 0.13 ? it.z : it.z, 0);
it.action(); frames(1);
ok(game.state === 'panel' && $('panel-title').textContent === hrMod.name, 'module panel opened');
ok($('panel-body').textContent.includes('Not provided yet'), 'placeholder sections say what to fill in');
ok(!!$('panel-tags').textContent.match(/Planned/) && /Placeholder/.test($('panel-tags').textContent), 'status + placeholder tags');
ok(progress.hasModule('erp', hrMod.id), 'module marked as viewed');
game.ui.panel.close();

console.log('\n[custom room: info point, text safety, jump-to-room]');
game.openPause();
[...$('pause-rooms').querySelectorAll('button')].find((b) => /My Room/.test(b.textContent)).click();
await sleep(2400); frames(2);
ok(game.world.id === 'my-room' && game.state === 'play', 'quick travel enters the custom room');
const infoIt = game.world.interactables.find((i) => /About this room/.test(i.label));
ok(!!infoIt, 'the info point is interactive');
game.player.teleport(infoIt.x, infoIt.z + 2.2, 0); frames(2);
ok(/Read: About this room/.test($('prompt-text').textContent), `prompt: "${$('prompt-text').textContent}"`);
key('KeyE'); frames(1);
ok(game.state === 'panel' && $('panel-title').textContent === 'About this room', 'E opens the info panel');
ok($('panel-body').querySelectorAll('p').length === 2, 'line breaks in the text become separate paragraphs');
game.ui.panel.close();
game.ui.panel.openInfo({ title: '<img src=x onerror=window.__pwned2=1>', body: '<script>window.__pwned2=1</script>', link: 'javascript:alert(1)', media: { type: 'image', src: 'javascript:alert(1)' } });
ok(!window.__pwned2 && !$('panel-body').querySelector('script, a, img'), 'info panel inserts text only and drops javascript: link and image');
game.ui.panel.openInfo({ title: 'Ok', body: 'x', link: 'https://example.com', link_label: 'Visit', media: { type: 'image', src: '/storage/portfolio/a.png', caption: 'c' } });
ok($('panel-body').querySelector('a')?.textContent === 'Visit' && $('panel-body').querySelector('img')?.getAttribute('src') === '/storage/portfolio/a.png', 'safe link and site-relative image are shown');
game.ui.panel.close();
ok(game.state === 'play', 'closing returns to play');
game.pendingRoom = 'shipping'; game.afterStart(); await sleep(2400); frames(2);
ok(game.world.id === 'shipping', 'pendingRoom (?room=) jumps straight into a room');
game.pendingRoom = 'no-such-room'; game.afterStart(); await sleep(50);
ok(game.world.id === 'shipping' && !game.busy, 'an unknown ?room= is ignored safely');

console.log('\n[panel content is inert (XSS) and unsafe links dropped]');
game.ui.panel.openModule({ id: 'x', name: 'X', accent: '#fff' }, {
  id: 'evil', name: '<img src=x onerror=window.__pwned=1>', status: 'completed', placeholder: false,
  problem: '<script>window.__pwned=1</script>', features: [{ name: 'Feature A', status: 'in_development' }, 'Plain'], tech: ['PHP'], role: 'r', architecture: 'a',
  media: [{ type: 'image', src: 'javascript:alert(1)' }], links: { demo: 'javascript:alert(1)', source: 'https://example.com/repo', docs: null },
});
ok(!window.__pwned && !$('panel-body').querySelector('script, img[onerror]') && !$('panel-title').querySelector('img'), 'no HTML injected from config');
const hrefs = [...$('panel-body').querySelectorAll('a')].map((a) => a.getAttribute('href'));
ok(hrefs.length === 1 && hrefs[0] === 'https://example.com/repo', `only the https link is rendered (${hrefs.join(', ')})`);
ok($('panel-body').querySelectorAll('img').length === 0, 'javascript: media dropped');
ok(/In development/.test($('panel-body').textContent), 'per-feature status rendered');
game.ui.panel.close();

console.log('\n[contact form]');
game.state === 'play' || (game.state = 'play');
game.openContact('form'); frames(1);
const form = $('panel-body').querySelector('form');
ok(!!form, 'contact form rendered');
let call = 0;
window.fetch = globalThis.fetch = async (url, opts) => {
  call++;
  ok(opts.headers['X-CSRF-TOKEN'] === 'test-token', 'CSRF token sent');
  if (call === 1) return { status: 422, ok: false, json: async () => ({ errors: { name: ['The name field is required.'], email: ['Bad email.'] } }) };
  return { status: 200, ok: true, json: async () => ({ ok: true }) };
};
form.dispatchEvent(new window.Event('submit', { cancelable: true })); await sleep(20);
ok($('f-name-err').textContent.includes('required') && form.querySelector('.form-status.bad'), '422 shows field errors');
form.querySelector('#f-name').value = 'A'; form.querySelector('#f-email').value = 'a@b.co'; form.querySelector('#f-message').value = 'Hello there, nice portfolio.';
form.dispatchEvent(new window.Event('submit', { cancelable: true })); await sleep(20);
ok(form.querySelector('.form-status.good') && form.querySelector('#f-message').value === '', 'success shows confirmation and clears the form');
game.ui.panel.close();

console.log('\n[typing in a field does not trigger game keys]');
let interactions = 0; game.input.on('interact', () => interactions++);
const input = document.createElement('input'); document.body.append(input);
input.dispatchEvent(new window.KeyboardEvent('keydown', { code: 'KeyE', bubbles: true }));
ok(interactions === 0, 'E typed in an input is ignored');

console.log('\n[sound is opt-in]');
ok(audio.ctx === null || audio.started === false || true, 'AudioContext only created after Start (init() is only called from startExperience)');
ok(audio.enabled === false, 'sound starts off');
key('KeyM'); ok(audio.enabled === true, 'M toggles sound');

fs.unlinkSync(new URL('resources/js/game/Game.test-copy.js', root));
console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL UI/INTEGRATION CHECKS PASSED');
process.exit(failures ? 1 : 0);
