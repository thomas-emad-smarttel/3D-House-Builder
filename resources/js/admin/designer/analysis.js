import { blocked, makeAabb } from '../../game/collision.js';
import { collides, footprint, typeDef } from '../../scenes/custom/catalog.js';

const R = 0.34; // player radius, same as the game

/** Objects the visitor can walk up to and press E on. */
export function isInteractive(o) {
  const def = typeDef(o.type);
  if (!def?.interactive) return false;
  if (o.type === 'board') return !!o.p.opens;
  if (o.type === 'picture') return !!(o.p.opens || o.p.media === 'video');
  return true;
}

export function objectLabel(o) {
  const def = typeDef(o.type);
  const name = o.p?.title || o.p?.caption || '';
  return `${def?.label ?? o.type}${name ? ` "${name}"` : ''}`;
}

/**
 * Walkability check with the same collision rules as the game: can a player starting at the door
 * reach the exit and everything interactive? Returns issues plus (optionally) the grid for an overlay.
 */
export function analyze(layout, room, { cell = 0.25, cells = false } = {}) {
  const { w, d } = layout.size;
  const b = { minX: -w / 2 + 0.15 + R, maxX: w / 2 - 0.15 - R, minZ: -d / 2 + 0.15 + R, maxZ: d / 2 - 0.15 - R };
  const colliders = [makeAabb(0, d / 2, 2.68, 0.3)]; // the exit door is a closed slab until used
  for (const o of layout.objects) {
    if (!typeDef(o.type) || !collides(o.type, o.p)) continue;
    const f = footprint(o.type, o.p, o.rot);
    colliders.push(makeAabb(o.x, o.z, f.w, f.d));
  }

  const spawn = { x: 0, z: d / 2 - 2.4 };
  const issues = [];

  // Same rule the server enforces: nothing solid in the doorway area.
  for (const o of layout.objects) {
    if (!typeDef(o.type) || !collides(o.type, o.p)) continue;
    const f = footprint(o.type, o.p, o.rot);
    if (o.x - f.w / 2 < 1.7 && o.x + f.w / 2 > -1.7 && o.z - f.d / 2 < d / 2 && o.z + f.d / 2 > d / 2 - 3.6) {
      issues.push({ level: 'error', objId: o.id, text: `${objectLabel(o)} is blocking the entrance. Move it away from the door.` });
    }
  }
  if (blocked(spawn.x, spawn.z, R, colliders)) issues.push({ level: 'error', text: 'Something is standing on the starting point just inside the door.' });

  const nx = Math.floor((b.maxX - b.minX) / cell) + 1;
  const nz = Math.floor((b.maxZ - b.minZ) / cell) + 1;
  const pos = (i, j) => [b.minX + i * cell, b.minZ + j * cell];
  const free = new Uint8Array(nx * nz);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const [x, z] = pos(i, j); free[j * nx + i] = blocked(x, z, R, colliders) ? 0 : 1; }

  const seen = new Uint8Array(nx * nz);
  const si = Math.round((spawn.x - b.minX) / cell); const sj = Math.round((spawn.z - b.minZ) / cell);
  const reach = [];
  if (free[sj * nx + si]) {
    const q = [[si, sj]]; seen[sj * nx + si] = 1;
    while (q.length) {
      const [i, j] = q.pop(); reach.push(pos(i, j));
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const a = i + di; const c = j + dj;
        if (a < 0 || c < 0 || a >= nx || c >= nz || seen[c * nx + a] || !free[c * nx + a]) continue;
        seen[c * nx + a] = 1; q.push([a, c]);
      }
    }
  }
  const near = (x, z, r) => reach.some(([px, pz]) => Math.hypot(px - x, pz - z) <= r);

  if (!near(0, d / 2, 3.4)) issues.push({ level: 'error', text: 'The exit door cannot be reached from the starting point.' });
  for (const o of layout.objects) {
    if (!typeDef(o.type) || !isInteractive(o)) continue;
    const r = Math.min(typeDef(o.type).radius ?? 3.2, 3.4);
    if (!near(o.x, o.z, r)) issues.push({ level: 'error', objId: o.id, text: `${objectLabel(o)} cannot be reached on foot.` });
  }

  const shown = new Set(layout.objects.filter((o) => o.type === 'module').map((o) => o.p.module));
  for (const m of room.modules ?? []) {
    if (!shown.has(m.id)) issues.push({ level: 'warn', text: `Module "${m.name}" has no display in this room yet.` });
  }
  const lights = layout.objects.filter((o) => o.type === 'light').length;
  if (lights > 6) issues.push({ level: 'error', text: `${lights} lights placed; the maximum is 6.` });

  const out = { issues, reachable: reach.length };
  if (cells) {
    out.cells = [];
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) if (free[j * nx + i]) { const [x, z] = pos(i, j); out.cells.push({ x, z, ok: !!seen[j * nx + i] }); }
    out.cell = cell;
  }
  return out;
}

export const overlaps = (a, b, gap = 0.04) => Math.abs(a.x - b.x) < (a.w + b.w) / 2 - gap && Math.abs(a.z - b.z) < (a.d + b.d) / 2 - gap;
