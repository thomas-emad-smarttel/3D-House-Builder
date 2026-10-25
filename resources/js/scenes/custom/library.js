import { ROOM_CONFIG, THEMES, MATERIALS, GROUPS, LIMITS, BUILTIN_TYPES } from './roomConfig.js';

export const RADIANS = (deg) => (deg * Math.PI) / 180;
export const ROTATIONS = [0, 90, 180, 270];

const dynamicTypes = new Map();

/**
 * Register or update a custom library object definition (SVG, CAD, etc.).
 */
export function registerLibraryObject(item) {
  if (!item || !item.id) return;
  const def = item.definition ?? item;
  dynamicTypes.set(item.id, {
    ...def,
    id: item.id,
    name: item.name ?? def.label ?? item.id,
    file_type: item.file_type ?? def.file_type ?? 'custom',
    file_path: item.file_path ?? def.file_path ?? null,
    thumbnail_path: item.thumbnail_path ?? def.thumbnail_path ?? null,
    metadata: item.metadata ?? def.metadata ?? {},
  });
}

/**
 * Sync entire library objects list from the server.
 */
export function syncLibrary(items) {
  if (!Array.isArray(items)) return;
  dynamicTypes.clear();
  for (const item of items) {
    if (item.file_type !== 'builtin' && item.id) {
      registerLibraryObject(item);
    }
  }
}

/**
 * Get definition for any object type (built-in or custom library object).
 */
export function typeDef(type) {
  return dynamicTypes.get(type) ?? BUILTIN_TYPES[type] ?? null;
}

/**
 * Complete active catalog object (for backward compatibility).
 */
export const catalog = {
  version: 2,
  room: ROOM_CONFIG,
  themes: THEMES,
  materials: MATERIALS,
  groups: GROUPS,
  limits: LIMITS,
  get types() {
    const all = { ...BUILTIN_TYPES };
    for (const [id, def] of dynamicTypes) {
      all[id] = def;
    }
    return all;
  },
};

export default catalog;

export function optionsOf(def) {
  return Array.isArray(def?.options) ? def.options : MATERIALS;
}

export function defaultParams(type) {
  const def = typeDef(type);
  if (!def || !def.params) return {};
  const out = {};
  for (const [k, pd] of Object.entries(def.params)) {
    if (pd.default !== undefined) out[k] = pd.default;
    else out[k] = pd.kind === 'module' || pd.kind === 'src' || pd.kind === 'url' ? '' : '';
  }
  return out;
}

/** Floor footprint {w,d} in metres after rotation, matching how the game builds each object. */
export function footprint(type, p, rot = 0) {
  const def = typeDef(type);
  if (!def || !def.footprint) return { w: 1, d: 1 };
  const f = def.footprint;
  const val = (v) => (typeof v === 'number' ? v : Number(p?.[v] ?? 1));
  let w = val(f.w);
  let d = val(f.d);
  if (f.mult !== undefined) {
    const m = val(f.mult);
    w *= m;
    d *= m;
  }
  return rot === 90 || rot === 270 ? { w: d, d: w } : { w, d };
}

/** Does this object block walking? Raised blocks (2.2 m or higher) never do. */
export function collides(type, p) {
  const def = typeDef(type);
  if (!def) return false;
  const c = def.collide;
  if (c === 'param') return !!p?.collide && !(Number(p?.y ?? 0) >= 2.2);
  return !!c;
}

export function newLayout() {
  return {
    size: { w: ROOM_CONFIG.w.default, d: ROOM_CONFIG.d.default, h: ROOM_CONFIG.h.default },
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
  const base = type.replace(/[^a-z0-9_-]/gi, '').toLowerCase() || 'object';
  let n = 1;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

export function newObject(type, objects, x = 0, z = 0, rot = 0) {
  const obj = { id: uniqueObjectId(type, objects), type, x, z, rot, p: defaultParams(type) };
  const def = typeDef(type);
  if (def && def.file_type && def.file_type !== 'builtin') {
    obj.library_id = type;
  }
  return obj;
}

/** Where a wall object sits when snapped to the nearest wall (rot is the direction it faces). */
export function snapToWall(x, z, size, inset = 0.28) {
  const { w, d } = size;
  const dist = [
    { k: 'n', v: Math.abs(z + d / 2) },
    { k: 's', v: Math.abs(z - d / 2) },
    { k: 'w', v: Math.abs(x + w / 2) },
    { k: 'e', v: Math.abs(x - w / 2) },
  ].sort((a, b) => a.v - b.v)[0];
  switch (dist.k) {
    case 'n': return { x, z: -d / 2 + inset, rot: 0 };
    case 's': return { x, z: d / 2 - inset, rot: 180 };
    case 'w': return { x: -w / 2 + inset, z, rot: 90 };
    default: return { x: w / 2 - inset, z, rot: 270 };
  }
}
