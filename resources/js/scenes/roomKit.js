import * as THREE from 'three';
import { World } from '../game/World.js';
import { M, wrapText, FONT_DISPLAY, FONT_BODY } from '../game/materials.js';
import { wall, door, sign, moduleScreen, canvasPlane } from '../game/props.js';
import { SETTINGS } from '../config/settings.js';

const WALL_T = 0.3;

/**
 * Builds the shell every room shares: floor, ceiling, four walls, an exit door on
 * the south wall, spawn point, bounds and a return interaction.
 *
 * o: { w, d, h, floor, wall, ceiling?, ambient, bg?, fog?, floorTile? }
 * The player enters at the south door and faces north (-Z).
 */
export function createRoom(ctx, cfg, o) {
  const { w, d, h } = o;
  const world = new World(ctx, { id: cfg.id, name: cfg.name, accent: cfg.accent, ambient: o.ambient });
  world.size = { w, d, h };
  const bg = o.bg ?? '#0b0d11';
  world.scene.background = new THREE.Color(bg);
  if (o.fog) world.scene.fog = new THREE.Fog(bg, o.fog[0], o.fog[1]);

  const inner = WALL_T / 2;
  world.bounds = { minX: -w / 2 + inner, maxX: w / 2 - inner, minZ: -d / 2 + inner, maxZ: d / 2 - inner };
  world.spawn = { x: 0, z: d / 2 - 2.4, yaw: 0 };

  world.box({ x: 0, y: -0.3, z: 0, w, h: 0.3, d, material: o.floor, tile: o.floorTile ?? 2.4, cast: false });
  world.box({ x: 0, y: h, z: 0, w, h: 0.3, d, material: o.ceiling ?? M.plaster(), cast: false, receive: false });

  const wm = o.wall;
  wall(world, { axis: 'z', at: -w / 2, from: -d / 2, to: d / 2, height: h, material: wm });
  wall(world, { axis: 'z', at: w / 2, from: -d / 2, to: d / 2, height: h, material: wm });
  wall(world, { axis: 'x', at: -d / 2, from: -w / 2, to: w / 2, height: h, material: wm });
  wall(world, { axis: 'x', at: d / 2, from: -w / 2, to: w / 2, height: h, material: wm, gaps: [{ c: 0, w: 2.68, h: 3.34 }] });

  // accent skirting: the room's colour identity at floor level
  if (o.accentStrip !== false) {
    const strip = M.emissive(cfg.accent, 0.9);
    world.box({ x: 0, y: 0.04, z: -d / 2 + inner + 0.01, w: w - WALL_T, h: 0.05, d: 0.02, material: strip, cast: false });
    world.box({ x: -w / 2 + inner + 0.01, y: 0.04, z: 0, w: 0.02, h: 0.05, d: d - WALL_T, material: strip, cast: false });
    world.box({ x: w / 2 - inner - 0.01, y: 0.04, z: 0, w: 0.02, h: 0.05, d: d - WALL_T, material: strip, cast: false });
  }

  const exit = door(world, { x: 0, z: d / 2, inward: 'z-', accent: cfg.accent });
  world.exitDoor = exit;
  sign(world, { title: 'Back to the mansion', accent: cfg.accent, x: 0, y: 3.34 + (h - 3.34) / 2, z: d / 2 - 0.17, rotY: Math.PI, w: 2.6, h: Math.min(0.6, h - 3.5) });
  world.interact({
    x: 0, z: d / 2, radius: 3.6,
    label: 'Return to the mansion',
    onFocus: (v) => exit.setFocus(v),
    action: () => ctx.game.returnToMansion(),
  });

  return world;
}

/** Ambient + hemisphere + one shadow-casting key light sized to the room. */
export function lighting(world, { sky = '#dfe6f2', ground = '#4b4036', hemi = 0.7, color = '#fff0d8', key = 1.0, dir = [0.25, 3, 0.3] } = {}) {
  const { w, d, h } = world.size;
  world.scene.add(new THREE.HemisphereLight(sky, ground, hemi));
  const sun = new THREE.DirectionalLight(color, key);
  sun.position.set(w * dir[0], h * dir[1], d * dir[2]);
  sun.castShadow = SETTINGS.render.shadows;
  sun.shadow.mapSize.set(2048, 2048);
  const r = Math.max(w, d) / 2 + 2;
  Object.assign(sun.shadow.camera, { left: -r, right: r, top: r, bottom: -r, near: 1, far: h * 8 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  world.scene.add(sun, sun.target);
  return sun;
}

export function pointGlow(world, color, intensity, x, y, z, distance = 18) {
  return world.light(new THREE.PointLight(color, intensity, distance, 2), x, y, z);
}

/** Wall slots for module displays: north wall first, then alternating west/east. */
export function moduleSlots(w, d, count, { gap = 4.3, inset = 0.28 } = {}) {
  const slots = [];
  const nNorth = Math.min(count, Math.max(1, Math.floor((w - 3) / gap)));
  for (let i = 0; i < nNorth; i++) slots.push({ x: (i - (nNorth - 1) / 2) * gap, z: -d / 2 + inset, rotY: 0 });
  const sideZ = [];
  for (let z = -d / 2 + 4.8; z <= d / 2 - 4.6; z += gap) sideZ.push(z);
  for (const z of sideZ) {
    slots.push({ x: -w / 2 + inset, z, rotY: Math.PI / 2 });
    slots.push({ x: w / 2 - inset, z, rotY: -Math.PI / 2 });
  }
  return slots.slice(0, Math.max(count, 0));
}

export function placeModules(world, room, { start = 0, ...slotOpts } = {}) {
  const { w, d } = world.size;
  const mods = room.modules.slice(start);
  const slots = moduleSlots(w, d, mods.length, slotOpts);
  mods.forEach((m, i) => {
    if (!slots[i]) { console.warn(`[${room.id}] no wall space left for module "${m.name}"`); return; }
    moduleScreen(world, room, m, slots[i]);
  });
}

/** Podium that opens the project overview (problem, role, architecture, links). */
export function overviewPodium(world, room, { x, z, h = 1.0, title = 'Project overview', label = 'Read the project overview' }) {
  if (!room.overview) return null;
  const { progress, game } = world.ctx;
  world.cylinder({ x, z, r: 0.5, rTop: 0.42, h, material: M.graphite(), collide: true, seg: 28 });
  const top = M.emissive(room.accent, 1.3);
  world.cylinder({ x, z, y: h, r: 0.5, h: 0.05, material: top, seg: 28, cast: false });
  const s = sign(world, { title, sub: room.name, accent: room.accent, x, y: h + 0.62, z, rotY: 0, w: 1.4, h: 0.62 });
  // face the entrance (+Z) from both sides is unnecessary: billboard it
  world.onUpdate(() => {
    const cam = world.ctx.game.camera;
    s.mesh.rotation.y = Math.atan2(cam.position.x - x, cam.position.z - z);
  });
  world.interact({
    x, z, radius: 3.2,
    label,
    onFocus: (v) => { top.emissiveIntensity = v ? 3 : 1.3; },
    action: () => { progress.viewModule(room.id, '__overview'); game.openModule(room, room.overview); },
  });
  return s;
}

/** Slowly turning wireframe form, a cheap "hologram". */
export function hologram(world, { x, y, z, radius = 0.8, color = '#ffffff', detail = 1, spin = 0.4 }) {
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 });
  const mesh = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(radius, detail)), mat);
  mesh.position.set(x, y, z);
  world.scene.add(mesh);
  world.onUpdate((dt, t) => {
    mesh.rotation.y += dt * spin;
    mesh.rotation.x = Math.sin(t * 0.5) * 0.3;
    mesh.position.y = y + Math.sin(t * 1.1) * 0.06;
  });
  return mesh;
}

/** Seeded random for stable procedural layouts. */
export function seeded(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a * 1664525 + 1013904223) >>> 0;
    return a / 4294967296;
  };
}


/**
 * Framed wall board with a title and wrapped text; optionally interactive.
 * Quarter-turn rotations only.
 */
export function textBoard(world, { x, y = 1.3, z, rotY = 0, w = 3.6, h = 2.2, title, body = '', accent, label, action, radius = 4.4 }) {
  const nx = Math.sin(rotY); const nz = Math.cos(rotY);
  const halo = M.emissive(accent, 0.25);
  world.box({ x: x - nx * 0.035, y: y - 0.1, z: z - nz * 0.035, w: w + 0.2, h: h + 0.2, d: 0.05, material: halo, rotY, cast: false });
  canvasPlane(world, {
    w, h, x: x + nx * 0.03, y: y + h / 2, z: z + nz * 0.03, rotY, px: 900,
    draw: (g, cw, ch) => {
      g.fillStyle = '#0f1318'; g.fillRect(0, 0, cw, ch);
      g.fillStyle = accent; g.fillRect(0, 0, cw, 10);
      g.textBaseline = 'top'; g.textAlign = 'left';
      g.fillStyle = '#f2ede1'; g.font = `700 ${cw * 0.055}px ${FONT_DISPLAY}`;
      const ty = wrapText(g, title, 48, 48, cw - 96, cw * 0.064, 2);
      g.fillStyle = '#b4bbc6'; g.font = `400 ${cw * 0.035}px ${FONT_BODY}`;
      wrapText(g, body, 48, ty + 16, cw - 96, cw * 0.049, 7);
    },
  });
  if (action) {
    let focus = 0; let target = 0;
    world.onUpdate((dt) => { focus += (target - focus) * Math.min(1, dt * 8); halo.emissiveIntensity = 0.25 + focus * 1.8; });
    world.interact({ x, z, radius, label, onFocus: (v) => { target = v ? 1 : 0; }, action });
  }
}

/** Free-standing pedestal with a small sign above it and an interaction. */
export function totem(world, { x, z, title, sub = '', accent, label, action, enabled, h = 1.0, rotY = 0, billboard = true, radius = 3.2 }) {
  world.cylinder({ x, z, r: 0.5, rTop: 0.42, h, material: M.graphite(), collide: true, seg: 28 });
  const top = M.emissive(accent, 1.3);
  world.cylinder({ x, z, y: h, r: 0.5, h: 0.05, material: top, seg: 28, cast: false });
  const s = sign(world, { title, sub, accent, x, y: h + 0.75, z, rotY, w: 1.9, h: 0.85 });
  if (billboard) {
    world.onUpdate(() => {
      const cam = world.ctx.game.camera;
      s.mesh.rotation.y = Math.atan2(cam.position.x - x, cam.position.z - z);
    });
  }
  world.interact({
    x, z, radius, label, enabled,
    onFocus: (v) => { top.emissiveIntensity = v ? 3 : 1.3; },
    action,
  });
  return s;
}
