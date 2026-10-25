import catalog from './catalog.json' with { type: 'json' };

/*
 * Shared by the game (CustomRoom builder), the dashboard designer and the walkability checker.
 * The same catalog.json is read by app/Support/ContentSanitizer.php, so what the designer
 * offers, what the server accepts and what the game builds can never drift apart.
 */
export default catalog;

export const RADIANS = (deg) => (deg * Math.PI) / 180;
export const ROTATIONS = [0, 90, 180, 270];

export const typeDef = (type) => catalog.types[type];

export function optionsOf(def) {
  return Array.isArray(def.options) ? def.options : (catalog.materials);
}

export function defaultParams(type) {
  const out = {};
  for (const [k, def] of Object.entries(typeDef(type).params)) {
    if (def.default !== undefined) out[k] = def.default;
    else out[k] = def.kind === 'module' || def.kind === 'src' || def.kind === 'url' ? '' : '';
  }
  return out;
}

/** Floor footprint {w,d} in metres after rotation, matching how the game builds each object. */
export function footprint(type, p, rot = 0) {
  const f = typeDef(type).footprint;
  const val = (v) => (typeof v === 'number' ? v : Number(p[v]));
  let w = val(f.w); let d = val(f.d);
  if (f.mult !== undefined) { const m = val(f.mult); w *= m; d *= m; }
  return rot === 90 || rot === 270 ? { w: d, d: w } : { w, d };
}

/** Does this object block walking? Raised blocks (2.2 m or higher) never do. */
export function collides(type, p) {
  const c = typeDef(type).collide;
  if (c === 'param') return !!p.collide && !(Number(p.y) >= 2.2);
  return !!c;
}

export function newLayout() {
  return {
    size: { w: catalog.room.w.default, d: catalog.room.d.default, h: catalog.room.h.default },
    theme: {
      floor: 'wood', wall: 'plaster', ceiling: 'plaster', light: 'warm', brightness: 1,
      bg: '#0b0d11', fog: true, lightbars: true, accent_strip: true,
      ambient_hz: 105, ambient_bright: 0.5, floor_sound: 'wood',
    },
    objects: [],
  };
}

export function uniqueObjectId(type, objects) {
  const taken = new Set(objects.map((o) => o.id));
  let n = 1;
  while (taken.has(`${type}-${n}`)) n++;
  return `${type}-${n}`;
}

export function newObject(type, objects, x = 0, z = 0, rot = 0) {
  return { id: uniqueObjectId(type, objects), type, x, z, rot, p: defaultParams(type) };
}

/** Where a wall object sits when snapped to the nearest wall (rot is the direction it faces). */
export function snapToWall(x, z, size, inset = 0.28) {
  const { w, d } = size;
  const dist = [
    { k: 'n', v: Math.abs(z + d / 2) }, { k: 's', v: Math.abs(z - d / 2) },
    { k: 'w', v: Math.abs(x + w / 2) }, { k: 'e', v: Math.abs(x - w / 2) },
  ].sort((a, b) => a.v - b.v)[0];
  switch (dist.k) {
    case 'n': return { x, z: -d / 2 + inset, rot: 0 };
    case 's': return { x, z: d / 2 - inset, rot: 180 };
    case 'w': return { x: -w / 2 + inset, z, rot: 90 };
    default: return { x: w / 2 - inset, z, rot: 270 };
  }
}
