import fs from 'node:fs';
import * as THREE from 'three';

/* ---- minimal browser stubs (no WebGL needed: we only build scene graphs) ---- */
const ctx2d = new Proxy({}, {
  get: (t, k) => (k in t ? t[k] : k === 'measureText' ? (s) => ({ width: String(s).length * 9 })
    : (k === 'createLinearGradient' || k === 'createRadialGradient') ? () => ({ addColorStop() {} })
    : () => {}),
  set: (t, k, v) => { t[k] = v; return true; },
});
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx2d, style: {} }), getElementById: () => null };
globalThis.window = globalThis;
globalThis.matchMedia = () => ({ matches: false });
const store = new Map();
globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };

const { Progress } = await import('../resources/js/state/progress.js');
const { buildMansion } = await import('../resources/js/scenes/Mansion.js');
const { loadRoomBuilder } = await import('../resources/js/scenes/index.js');
const { Player } = await import('../resources/js/game/Player.js');
const { blocked } = await import('../resources/js/game/collision.js');
const { SETTINGS } = await import('../resources/js/config/settings.js');

const data = JSON.parse(fs.readFileSync(process.argv[2] ?? 'storage/app/portfolio.json', 'utf8'));
data.roomsById = Object.fromEntries(data.rooms.map((r) => [r.id, r]));
const progress = new Progress(data.rooms.length);
const camera = new THREE.PerspectiveCamera(70, 1.6, 0.05, 180);
const game = { camera, openModule() {}, openProfile() {}, openSkills() {}, openTimeline() {}, openContact() {}, downloadCv() {}, enterRoom() {}, returnToMansion() {}, openPause() {} };
const audio = { footstep() {} };
const ctx = { data, progress, audio, game, ui: {} };
const R = SETTINGS.player.radius;

let failures = 0;
const fail = (m) => { failures++; console.log('   FAIL:', m); };

function reachable(world) {
  const b = world.bounds; const step = 0.2;
  const nx = Math.ceil((b.maxX - b.minX) / step); const nz = Math.ceil((b.maxZ - b.minZ) / step);
  const free = (i, j) => !blocked(b.minX + i * step, b.minZ + j * step, R, world.colliders);
  const si = Math.round((world.spawn.x - b.minX) / step); const sj = Math.round((world.spawn.z - b.minZ) / step);
  const seen = new Uint8Array(nx * nz); const q = [[si, sj]]; seen[sj * nx + si] = 1;
  const cells = [];
  while (q.length) {
    const [i, j] = q.pop(); cells.push([b.minX + i * step, b.minZ + j * step]);
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const a = i + di; const c = j + dj;
      if (a < 0 || c < 0 || a >= nx || c >= nz || seen[c * nx + a] || !free(a, c)) continue;
      seen[c * nx + a] = 1; q.push([a, c]);
    }
  }
  return { cells, total: nx * nz };
}

function walkIntoWalls(world) {
  const p = new Player(camera);
  const input = { consumeLook: () => ({ x: 0, y: 0 }), axes: () => ({ x: 0, z: 1, turn: 0.35, sprint: true }) };
  p.teleport(world.spawn.x, world.spawn.z, world.spawn.yaw);
  for (let i = 0; i < 60 * 40; i++) {
    p.update(1 / 60, input, world, audio);
    if (blocked(p.x, p.z, R - 0.02, world.colliders)) return `inside a collider at (${p.x.toFixed(2)}, ${p.z.toFixed(2)})`;
    const b = world.bounds;
    if (p.x < b.minX || p.x > b.maxX || p.z < b.minZ || p.z > b.maxZ) return `escaped bounds at (${p.x.toFixed(2)}, ${p.z.toFixed(2)})`;
  }
  return null;
}

function check(world, label) {
  const t0 = performance.now();
  let meshes = 0; world.scene.traverse((o) => { if (o.isMesh) meshes++; });
  console.log(`\n${label}: ${meshes} meshes, ${world.colliders.length} colliders, ${world.interactables.length} interactables, ${world.scene.children.length} top-level objects`);
  if (blocked(world.spawn.x, world.spawn.z, R, world.colliders)) fail('spawn point is inside a collider');
  const { cells, total } = reachable(world);
  console.log(`   walkable area reachable from spawn: ${cells.length}/${total} grid cells`);
  for (const it of world.interactables) {
    if (!it.label) fail('interactable without a label');
    const r = Math.min(it.radius, 3.4);
    const ok = cells.some(([x, z]) => Math.hypot(x - it.x, z - it.z) <= r);
    if (!ok) fail(`"${it.label}" cannot be reached (nothing walkable within ${r}m of ${it.x.toFixed(1)}, ${it.z.toFixed(1)})`);
  }
  for (let i = 0; i < 180; i++) for (const u of world.updaters) u(1 / 60, i / 60);
  const w = walkIntoWalls(world);
  if (w) fail('wall test: ' + w);
  world.dispose();
  console.log(`   ok (${(performance.now() - t0).toFixed(0)} ms)`);
}

/* ---- hub ---- */
const hub = buildMansion(ctx);
for (const r of data.rooms) {
  if (!hub.doors[r.id]) fail(`hub has no door for "${r.id}"`);
  const s = hub.doorSpawns[r.id];
  if (blocked(s.x, s.z, R, hub.colliders)) fail(`return spawn for "${r.id}" is blocked`);
}
// every door slab must really be solid while closed, and passable once open
for (const [id, d] of Object.entries(hub.doors)) {
  if (!d.collider.enabled) fail(`door ${id} not solid when closed`);
  d.open(); if (d.collider.enabled) fail(`door ${id} still solid after opening`); d.close();
}
check(hub, 'HUB (mansion)');

/* ---- rooms ---- */
for (const r of data.rooms) {
  const build = await loadRoomBuilder(r);
  const w = build(ctx, r);
  check(w, `ROOM ${r.id} [${r.scene}]`);
}

/* ---- generic room via an unknown scene key + extra module counts ---- */
const extra = { id: 'ml', scene: 'nonexistent', kind: 'project', name: 'Vision Lab', tagline: 't', accent: '#c084fc', flagship: false,
  overview: data.rooms.find((r) => r.id === 'gym').overview,
  modules: Array.from({ length: 8 }, (_, i) => ({ ...data.rooms.find((r) => r.id === 'gym').modules[0], id: 'm' + i, name: 'Module ' + i })) };
data.rooms.push(extra); data.roomsById.ml = extra;
check(await (await loadRoomBuilder(extra))(ctx, extra), 'ROOM ml [generic fallback, 8 modules]');
const hub2 = buildMansion(ctx);
console.log(`\nHub with ${data.rooms.length} rooms rebuilt: ${Object.keys(hub2.doors).length} doors, hall end z=${hub2.hallEnd}`);
check(hub2, 'HUB (9 rooms)');

console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL CHECKS PASSED');
process.exit(failures ? 1 : 0);
