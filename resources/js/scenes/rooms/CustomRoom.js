import { M } from '../../game/materials.js';
import { lightBar } from '../../game/props.js';
import { blocked } from '../../game/collision.js';
import { createRoom, lighting, pointGlow } from '../roomKit.js';
import { BUILDERS } from '../custom/builders.js';
import { newLayout } from '../custom/catalog.js';

const LIGHTS = {
  warm: { sky: '#dfe6f2', ground: '#4b4036', color: '#ffe8c8', bar: '#ffe2b0', point: '#ffd9a8' },
  neutral: { sky: '#e8ecf2', ground: '#40403f', color: '#fff4e6', bar: '#fff6e8', point: '#fff0e0' },
  cool: { sky: '#cfe0ff', ground: '#232a38', color: '#dfe9ff', bar: '#d6e6ff', point: '#cfe0ff' },
};

/**
 * A room built entirely from room.layout (size, theme and placed objects) that you design
 * in the dashboard. Objects that fail to build are skipped with a console warning, so one
 * bad entry can never make the room unenterable.
 */
export default function build(ctx, room) {
  const L = room.layout ?? newLayout();
  const { w, d, h } = L.size;
  const t = L.theme;
  const mat = (name, fallback) => (typeof M[name] === 'function' ? M[name]() : M[fallback]());
  const big = Math.max(w, d);

  const world = createRoom(ctx, room, {
    w, d, h,
    floor: mat(t.floor, 'wood'), wall: mat(t.wall, 'plaster'), ceiling: mat(t.ceiling, 'plaster'),
    floorTile: t.floor === 'wood' ? 2.4 : 3,
    ambient: { base: t.ambient_hz, bright: t.ambient_bright, floor: t.floor_sound },
    bg: t.bg, fog: t.fog ? [big * 1.2, big * 3.2] : undefined,
    accentStrip: t.accent_strip,
  });

  const preset = t.light === 'accent'
    ? { sky: '#cbd5e1', ground: '#2a2a2e', color: room.accent, bar: room.accent, point: room.accent }
    : LIGHTS[t.light] ?? LIGHTS.warm;
  const b = t.brightness;
  lighting(world, { sky: preset.sky, ground: preset.ground, hemi: 0.78 * b, color: preset.color, key: 0.85 * b });
  pointGlow(world, preset.point, 34 * b, 0, h - 1, 0, big * 1.1);
  if (t.lightbars) {
    const count = Math.max(1, Math.min(6, Math.round(d / 5.5)));
    for (let i = 0; i < count; i++) {
      const z = -d / 2 + (d * (i + 0.5)) / count;
      lightBar(world, { x: 0, y: h - 0.08, z, w: w - 4, d: 0.16, color: preset.bar, intensity: 1.2 * b });
    }
  }

  for (const o of L.objects) {
    const fn = BUILDERS[o.type];
    if (!fn) { console.warn(`[${room.id}] unknown object type "${o.type}"`); continue; }
    try { fn(world, room, o, ctx); } catch (err) { console.warn(`[${room.id}] could not build ${o.type} "${o.id}":`, err.message); }
  }

  // Safety net: nothing may ever trap the player on arrival, even if data was edited by hand.
  for (let i = world.colliders.length - 1; i >= 0; i--) {
    if (blocked(world.spawn.x, world.spawn.z, 0.7, [world.colliders[i]])) world.colliders.splice(i, 1);
  }
  return world;
}
