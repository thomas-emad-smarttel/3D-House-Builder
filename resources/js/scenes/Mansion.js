import * as THREE from 'three';
import { World } from '../game/World.js';
import { M, canvasTexture, makeCanvas, FONT_DISPLAY, FONT_BODY } from '../game/materials.js';
import {
  wall, door, sign, sofa, plant, column, rug, table, desk, chair, floorLamp, lightBar,
  bookshelf, deskMonitor, canvasPlane, DOOR_ROT,
} from '../game/props.js';
import { SETTINGS } from '../config/settings.js';

/*
 * The mansion hub. Its layout is generated from the rooms in config/portfolio.php:
 * - rooms alternate left / right along the hall, one pair of doors every `doorSpacing` metres
 * - the room flagged `flagship` gets the grand door at the far end
 * Adding a room to the config adds a door here; nothing else has to change.
 */
export function buildMansion(ctx) {
  const { data, progress } = ctx;
  const cfg = SETTINGS.hub;
  const halfW = cfg.width / 2;
  const H = cfg.height;

  const flagship = data.rooms.find((r) => r.flagship) ?? null;
  const side = data.rooms.filter((r) => r !== flagship);
  const rows = Math.max(1, Math.ceil(side.length / 2));
  const lastZ = cfg.firstDoorZ - (rows - 1) * cfg.doorSpacing;
  const endZ = lastZ - (flagship ? 10 : 6);
  const entryZ = cfg.entryZ;
  const length = entryZ - endZ;
  const midZ = (entryZ + endZ) / 2;

  const world = new World(ctx, {
    id: 'hub', name: 'The Mansion', accent: '#d9a85f',
    ambient: { base: 110, bright: 0.45, floor: 'wood' },
  });
  world.bounds = { minX: -halfW, maxX: halfW, minZ: endZ, maxZ: entryZ };
  world.spawn = { x: 0, z: 3.4, yaw: 0 };
  world.doors = {};
  world.doorSpawns = {};
  world.doorThrough = {};
  world.hallEnd = endZ;
  const scene = world.scene;
  scene.background = new THREE.Color('#0b0d11');
  scene.fog = new THREE.Fog('#0b0d11', 34, 90);

  /* ---------------------------------------------------------- lighting */
  scene.add(new THREE.HemisphereLight('#d7deec', '#4b3b2c', 0.7));
  const sun = new THREE.DirectionalLight('#ffe7c4', 1.0);
  sun.position.set(6, 16, midZ + 8);
  sun.target.position.set(0, 0, midZ);
  sun.castShadow = SETTINGS.render.shadows;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -14, right: 14, top: length / 2 + 3, bottom: -(length / 2 + 3), near: 1, far: 60 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);
  const glows = Math.max(3, Math.round(length / 12));
  for (let i = 0; i < glows; i++) {
    const z = entryZ - 2 - (i * (length - 4)) / Math.max(1, glows - 1);
    world.light(new THREE.PointLight('#ffd9a8', 24, 20, 2), 0, H - 1, z);
  }

  /* ------------------------------------------------------- shell + floor */
  world.box({ x: 0, y: -0.3, z: midZ, w: cfg.width, h: 0.3, d: length, material: M.wood(), tile: 2.4, cast: false });
  // central marble runway with brass inlay
  world.box({ x: 0, y: 0, z: midZ, w: 5, h: 0.02, d: length - 1, material: M.marble(), tile: 2.6, cast: false });
  const brass = M.emissive('#d9a85f', 0.9);
  for (const sx of [-1, 1]) world.box({ x: sx * 2.54, y: 0, z: midZ, w: 0.06, h: 0.03, d: length - 1, material: brass, cast: false });
  // ceiling, skylight, light bars
  world.box({ x: 0, y: H, z: midZ, w: cfg.width, h: 0.3, d: length, material: M.plaster(), cast: false, receive: false });
  world.box({ x: 0, y: H - 0.03, z: midZ, w: 3.2, h: 0.04, d: length - 6, material: M.emissive('#cfe3ff', 0.9), cast: false, receive: false });
  for (const sx of [-1, 1]) lightBar(world, { x: sx * 5.2, y: H - 0.07, z: midZ, w: 0.14, d: length - 3, color: '#ffe2b0', intensity: 1.4 });

  /* -------------------------------------------------------------- walls */
  const wallMat = M.plaster();
  const gapFor = (w, h) => ({ w: w + 0.28, h: h + 0.14 });
  const sideSlots = side.map((room, i) => {
    const left = i % 2 === 0;
    const row = Math.floor(i / 2);
    return { room, left, z: cfg.firstDoorZ - row * cfg.doorSpacing };
  });

  for (const left of [true, false]) {
    const gaps = sideSlots.filter((s) => s.left === left).map((s) => ({ c: s.z, ...gapFor(2.4, 3.2) }));
    wall(world, { axis: 'z', at: left ? -halfW : halfW, from: endZ, to: entryZ, gaps, height: H, material: wallMat });
  }
  wall(world, {
    axis: 'x', at: endZ, from: -halfW, to: halfW, height: H, material: wallMat,
    gaps: flagship ? [{ c: 0, ...gapFor(5, 4.4) }] : [],
  });
  wall(world, { axis: 'x', at: entryZ, from: -halfW, to: halfW, height: H, material: wallMat });

  // skirting + brass crown line
  const skirt = M.graphite();
  for (const sx of [-1, 1]) {
    world.box({ x: sx * (halfW - 0.17), z: midZ, w: 0.04, h: 0.14, d: length, material: skirt, cast: false });
    world.box({ x: sx * (halfW - 0.17), y: H - 0.2, z: midZ, w: 0.03, h: 0.04, d: length, material: brass, cast: false });
  }

  /* ------------------------------------------------------------- doors */
  const signs = [];
  const placeDoor = (room, x, z, inward, width, height, signW, signH) => {
    const accent = room.accent;
    const d = door(world, { x, z, inward, width, height, accent });
    world.doors[room.id] = d;

    const rot = DOOR_ROT[inward];
    const nx = Math.sin(rot); const nz = Math.cos(rot);
    const gapTop = height + 0.14;
    const s = sign(world, {
      title: room.name, sub: room.tagline, accent,
      x: x + nx * 0.17, y: gapTop + (H - gapTop) / 2, z: z + nz * 0.17, rotY: rot, w: signW, h: signH,
    });
    signs.push({ room, ...s });

    world.doorSpawns[room.id] = { x: x + nx * 2.4, z: z + nz * 2.4, yaw: rot };
    world.doorThrough[room.id] = { x: x - nx * 1.3, z: z - nz * 1.3, openMs: room.flagship ? 1400 : 900 };

    world.interact({
      x, z, radius: width > 3 ? 5.2 : 4.2, cardRadius: width > 3 ? 11 : 8,
      label: `Enter ${room.name}`,
      card: { title: room.name, text: room.tagline, accent },
      onFocus: (v) => d.setFocus(v),
      action: () => ctx.game.enterRoom(room.id),
    });
    return d;
  };

  for (const s of sideSlots) {
    placeDoor(s.room, s.left ? -halfW : halfW, s.z, s.left ? 'x+' : 'x-', 2.4, 3.2, 3.2, 0.95);
  }
  if (flagship) {
    placeDoor(flagship, 0, endZ, 'z+', 5, 4.4, 6.4, 1.05);
    // floor emblem + vertical light blades flanking the grand door
    for (const [r0, r1, k] of [[2.2, 2.28, 1], [3.6, 3.66, 0.6]]) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 64), M.unlit(flagship.accent, 0.85 * k));
      ring.rotation.x = -Math.PI / 2; ring.position.set(0, 0.035, endZ + 3.2); scene.add(ring);
    }
    for (const sx of [-1, 1]) {
      world.box({ x: sx * 4.1, y: 0.4, z: endZ + 0.2, w: 0.1, h: 4.4, d: 0.08, material: M.emissive(flagship.accent, 1.5), cast: false });
    }
  }
  const refreshSigns = () => signs.forEach((s) => s.redraw({ badge: progress.hasRoom(s.room.id) ? 'Explored' : undefined }));
  refreshSigns();
  world.onDispose(progress.onChange(refreshSigns));

  /* ------------------------------------------------- wayfinding & decor */
  // entrance windows with a night skyline
  const skyline = canvasTexture(512, 768, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, '#0d1424'); grd.addColorStop(1, '#2a3550');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    let x = 0; let seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    while (x < w) {
      const bw = 40 + rnd() * 70; const bh = 160 + rnd() * 330;
      g.fillStyle = '#0a0e17'; g.fillRect(x, h - bh, bw, bh);
      for (let wy = h - bh + 14; wy < h - 10; wy += 22) for (let wx = x + 8; wx < x + bw - 8; wx += 16) {
        if (rnd() > 0.55) { g.fillStyle = rnd() > 0.8 ? '#ffd9a0' : '#7d8db3'; g.globalAlpha = 0.5 + rnd() * 0.5; g.fillRect(wx, wy, 7, 10); }
      }
      g.globalAlpha = 1; x += bw + 4;
    }
  });
  for (const wx of [-6.5, 0, 6.5]) {
    world.box({ x: wx, y: 0.9, z: entryZ - 0.18, w: 3.6, h: 3.6, d: 0.06, material: M.solid('#1c2026', { rough: 0.4, metal: 0.7 }), cast: false });
    const p = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), new THREE.MeshBasicMaterial({ map: skyline, toneMapped: false }));
    p.position.set(wx, 2.7, entryZ - 0.215); p.rotation.y = Math.PI; scene.add(p);
  }

  // who lives here / how to play, as wall plaques near the entrance
  sign(world, { title: data.owner.name, sub: data.owner.title, accent: '#d9a85f', x: -halfW + 0.17, y: 2.3, z: 3.4, rotY: Math.PI / 2, w: 3.2, h: 1.0 });
  sign(world, { title: 'How to explore', sub: 'WASD walk, mouse look, E to open doors and displays, Esc for the menu.', accent: '#d9a85f', x: halfW - 0.17, y: 2.3, z: 3.4, rotY: -Math.PI / 2, w: 3.2, h: 1.0 });

  // reception corner
  desk(world, { x: -6.4, z: 4.3, w: 3.2, d: 0.9, top: M.marble() });
  chair(world, { x: -6.4, z: 5.2 });
  deskMonitor(world, { x: -6.9, y: 0.81, z: 4.3, rotY: Math.PI, accent: '#d9a85f' });
  // seating
  sofa(world, { x: halfW - 1.3, z: 2.2, rotY: -Math.PI / 2, w: 2.4 });
  table(world, { x: halfW - 3.0, z: 2.2, w: 0.9, d: 1.2, rotY: 0 });
  rug(world, { x: halfW - 2.4, z: 2.2, w: 3.4, d: 3.4 });
  sofa(world, { x: -halfW + 1.3, z: 1.3, rotY: Math.PI / 2, w: 2.4, color: '#4a4137' });
  bookshelf(world, { x: 3.6, z: entryZ - 0.4, rotY: Math.PI, w: 2.4, accent: '#d9a85f' });
  plant(world, { x: -halfW + 0.8, z: entryZ - 0.8, s: 1.2 });
  plant(world, { x: halfW - 0.8, z: entryZ - 0.8, s: 1.2 });
  floorLamp(world, { x: halfW - 0.7, z: 0.2 });

  // columns between door rows, and framed abstract art
  const art = (accent) => (g, w, h) => {
    g.fillStyle = '#0f1318'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 22; i++) {
      g.fillStyle = i % 5 === 0 ? accent : '#2a313c';
      g.globalAlpha = 0.5 + (i % 4) * 0.12;
      g.fillRect(40 + (i * 37) % 120, 30 + i * (h - 60) / 22, 60 + ((i * 53) % (w - 200)), 7);
    }
    g.globalAlpha = 1;
  };
  for (let r = 0; r < rows; r++) {
    const zMid = cfg.firstDoorZ - r * cfg.doorSpacing - cfg.doorSpacing / 2;
    if (r < rows - 1) for (const sx of [-1, 1]) column(world, { x: sx * 7, z: zMid, h: H, accent: '#d9a85f' });
    if (r < rows - 1) {
      for (const sx of [-1, 1]) {
        canvasPlane(world, {
          w: 1.8, h: 1.2, x: sx * (halfW - 0.17), y: 2.2, z: zMid, rotY: sx < 0 ? Math.PI / 2 : -Math.PI / 2, px: 384, draw: art('#d9a85f'),
        });
      }
    }
  }
  // an empty right-hand slot (odd number of rooms) gets a piece of art, not a blank wall
  if (side.length % 2 === 1) {
    canvasPlane(world, { w: 2.4, h: 1.6, x: halfW - 0.17, y: 2.0, z: lastZ, rotY: -Math.PI / 2, px: 512, draw: art('#d9a85f') });
  }

  /* ------------------------------------------- directory kiosk + hologram */
  const kx = 0; const kz = midZ;
  world.cylinder({ x: kx, z: kz, r: 1.1, h: 0.5, material: M.graphite(), collide: true, seg: 32 });
  world.cylinder({ x: kx, z: kz, y: 0.5, r: 0.8, h: 0.08, material: M.emissive('#d9a85f', 1.2), seg: 32, cast: false });
  const holoMat = new THREE.LineBasicMaterial({ color: '#ffb340', transparent: true, opacity: 0.9 });
  const holo = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.62, 1)), holoMat);
  holo.position.set(kx, 1.7, kz);
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.22), M.emissive('#ffcf7a', 2));
  core.position.copy(holo.position);
  scene.add(holo, core);
  world.onUpdate((dt, t) => {
    holo.rotation.y += dt * 0.5; holo.rotation.x = Math.sin(t * 0.6) * 0.25;
    core.rotation.y -= dt * 0.9;
    holo.position.y = core.position.y = 1.7 + Math.sin(t * 1.2) * 0.06;
  });
  world.interact({
    x: kx, z: kz, radius: 3.4,
    label: 'Open the directory',
    action: () => ctx.game.openPause(),
  });

  return world;
}
