import * as THREE from 'three';
import { M, makeCanvas, canvasTexture, wrapText, glowTexture, FONT_DISPLAY, FONT_BODY } from './materials.js';
import { STATUS } from '../config/settings.js';

const STEEL = () => M.solid('#1c2026', { rough: 0.4, metal: 0.7 });

/* ================================================================ walls */

/**
 * A wall with door gaps. axis 'z' runs along Z at x = `at`; axis 'x' runs along X at z = `at`.
 * gaps: [{ c: centre, w: width, h: height }]. Segments collide, lintels above gaps don't.
 */
export function wall(world, { axis, at, from, to, gaps = [], height, thickness = 0.3, material, tile = 3 }) {
  const sorted = [...gaps].sort((a, b) => a.c - b.c);
  const segment = (a, b, y = 0, h = height, collide = true) => {
    const len = b - a;
    if (len < 0.02) return;
    const mid = (a + b) / 2;
    world.box(axis === 'z'
      ? { x: at, y, z: mid, w: thickness, h, d: len, material, collide, tile }
      : { x: mid, y, z: at, w: len, h, d: thickness, material, collide, tile });
  };
  let cursor = from;
  for (const gap of sorted) {
    segment(cursor, gap.c - gap.w / 2);
    segment(gap.c - gap.w / 2, gap.c + gap.w / 2, gap.h, height - gap.h, false);
    cursor = gap.c + gap.w / 2;
  }
  segment(cursor, to);
}

/* ================================================================ doors */

export const DOOR_ROT = { 'x+': Math.PI / 2, 'x-': -Math.PI / 2, 'z+': 0, 'z-': Math.PI };

/**
 * Sliding double door set into a wall. `inward` is the direction the hall/room lies
 * ('x+' = towards +X ...). Behind it is a small glowing alcove that lights up on open.
 */
export function door(world, { x, y = 0, z, inward, width = 2.4, height = 3.2, accent = '#d9a85f', thickness = 0.3 }) {
  const rotY = DOOR_ROT[inward];
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  world.scene.add(g);

  const t = 0.14;
  const steel = STEEL();
  const glowMat = M.emissive(accent, 0.7);
  const depth = thickness + 0.08;

  world.box({ parent: g, x: -(width / 2 + t / 2), w: t, h: height, d: depth, material: steel });
  world.box({ parent: g, x: width / 2 + t / 2, w: t, h: height, d: depth, material: steel });
  world.box({ parent: g, y: height, w: width + 2 * t, h: t, d: depth, material: steel });

  const sz = depth / 2 + 0.01;
  world.box({ parent: g, x: -(width / 2 + t / 2), z: sz, w: 0.05, h: height, d: 0.02, material: glowMat, cast: false });
  world.box({ parent: g, x: width / 2 + t / 2, z: sz, w: 0.05, h: height, d: 0.02, material: glowMat, cast: false });
  world.box({ parent: g, y: height + t / 2 - 0.025, z: sz, w: width + 2 * t, h: 0.05, d: 0.02, material: glowMat, cast: false });

  const panelMat = M.solid('#262b33', { rough: 0.3, metal: 0.75 });
  const hw = width / 2 - 0.004;
  const left = world.box({ parent: g, x: -width / 4, w: hw, h: height, d: 0.08, material: panelMat });
  const right = world.box({ parent: g, x: width / 4, w: hw, h: height, d: 0.08, material: panelMat });
  const handleMat = M.basic('#e9e4d4');
  world.box({ parent: left, x: hw / 2 - 0.1, y: 0.9 - height / 2, z: 0.05, w: 0.03, h: 1.2, d: 0.02, material: handleMat, cast: false });
  world.box({ parent: right, x: -(hw / 2 - 0.1), y: 0.9 - height / 2, z: 0.05, w: 0.03, h: 1.2, d: 0.02, material: handleMat, cast: false });

  // Alcove behind the door
  const ad = 2.0;
  const az = -(thickness / 2 + ad / 2);
  const dark = M.solid('#14161a', { rough: 0.8 });
  world.box({ parent: g, z: az, w: width, h: 0.04, d: ad, material: dark, cast: false });
  world.box({ parent: g, x: -(width / 2 - 0.025), z: az, w: 0.05, h: height, d: ad, material: dark, cast: false });
  world.box({ parent: g, x: width / 2 - 0.025, z: az, w: 0.05, h: height, d: ad, material: dark, cast: false });
  world.box({ parent: g, y: height, z: az, w: width, h: 0.05, d: ad, material: dark, cast: false });
  const backMat = M.unlit(accent);
  world.box({ parent: g, z: -(thickness / 2 + ad), w: width, h: height, d: 0.05, material: backMat, cast: false, receive: false });

  const spillMat = new THREE.MeshBasicMaterial({
    map: glowTexture('#ffffff'), color: accent, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const spill = new THREE.Mesh(new THREE.PlaneGeometry(width * 2.2, 3.4), spillMat);
  spill.rotation.x = -Math.PI / 2;
  spill.position.set(0, 0.02, 1.7);
  g.add(spill);

  const collider = world.collider(x, z, width + 0.28, thickness, rotY, y, y + height);
  const accentColor = new THREE.Color(accent);

  const api = {
    group: g, collider, accent, t: 0, target: 0, focus: 0, focusTarget: 0,
    open() { api.target = 1; collider.enabled = false; },
    close() { api.target = 0; collider.enabled = true; },
    setOpenInstant(v) { api.t = api.target = v ? 1 : 0; collider.enabled = !v; },
    setFocus(v) { api.focusTarget = v ? 1 : 0; },
    get isOpen() { return api.t > 0.9; },
  };

  world.onUpdate((dt) => {
    api.t += (api.target - api.t) * Math.min(1, dt * 3.4);
    if (Math.abs(api.target - api.t) < 0.003) api.t = api.target;
    api.focus += (api.focusTarget - api.focus) * Math.min(1, dt * 8);
    left.position.x = -width / 4 - api.t * (width / 2);
    right.position.x = width / 4 + api.t * (width / 2);
    glowMat.emissiveIntensity = 0.7 + api.focus * 1.7 + api.t * 0.8;
    spillMat.opacity = api.focus * 0.32 + api.t * 0.55;
    backMat.color.copy(accentColor).multiplyScalar(0.22 + api.t * 0.78);
  });

  return api;
}

/* ================================================================ signs */

/**
 * Flat sign with a title and optional sub-line. Returns { mesh, redraw(state) }.
 * `draw` can add extras (e.g. an "Explored" badge) based on state.
 */
export function sign(world, { title, sub = '', accent, x, y, z, rotY = 0, w = 3.2, h = 0.9, parent, dark = true }) {
  const cw = 1024; const ch = Math.round((cw * h) / w);
  const { canvas, g } = makeCanvas(cw, ch);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;

  const redraw = (state = {}) => {
    g.clearRect(0, 0, cw, ch);
    g.fillStyle = dark ? '#10141a' : '#ece7da';
    g.fillRect(0, 0, cw, ch);
    g.fillStyle = accent; g.fillRect(0, 0, 14, ch);
    g.textBaseline = 'alphabetic';
    g.fillStyle = dark ? '#f2ede1' : '#16191e';
    const size = Math.min(ch * (sub ? 0.34 : 0.46), 78);
    g.font = `700 ${size}px ${FONT_DISPLAY}`;
    const ty = sub ? ch * 0.44 : ch * 0.6;
    wrapText(g, title, 48, ty, cw - 96 - (state.badge ? 170 : 0), size * 1.05, 1);
    if (sub) {
      g.fillStyle = dark ? '#a9b0ba' : '#555b64';
      g.font = `400 ${ch * 0.16}px ${FONT_BODY}`;
      wrapText(g, sub, 48, ch * 0.72, cw - 96, ch * 0.19, 2);
    }
    if (state.badge) {
      g.fillStyle = accent; g.font = `600 ${ch * 0.17}px ${FONT_BODY}`;
      g.textAlign = 'right'; g.fillText(state.badge, cw - 36, ch * 0.3); g.textAlign = 'left';
    }
    tex.needsUpdate = true;
  };
  redraw();

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  mesh.position.set(x, y, z);
  mesh.rotation.y = rotY;
  (parent ?? world.scene).add(mesh);
  return { mesh, redraw };
}

/** A canvas-textured plane you can redraw (used for animated dashboards). */
export function canvasPlane(world, { w, h, x, y, z, rotY = 0, px = 512, draw, parent, tone = false, opacity = 1 }) {
  const cw = px; const ch = Math.round((px * h) / w);
  const { canvas, g } = makeCanvas(cw, ch);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: tone, transparent: opacity < 1, opacity, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.position.set(x, y, z); mesh.rotation.y = rotY;
  (parent ?? world.scene).add(mesh);
  const redraw = (t = 0) => { draw(g, cw, ch, t); tex.needsUpdate = true; };
  redraw(0);
  return { mesh, redraw, mat };
}

/** Text that always faces the camera. */
export function labelSprite(world, text, { x, y, z, scale = 1, color = '#f2ede1', bg = 'rgba(14,17,22,0.72)', accent, parent } = {}) {
  const { canvas, g } = makeCanvas(768, 160);
  g.font = `700 54px ${FONT_DISPLAY}`;
  const tw = Math.min(720, g.measureText(text).width + 70);
  g.fillStyle = bg;
  g.beginPath(); g.roundRect?.(384 - tw / 2, 20, tw, 120, 26); if (!g.roundRect) g.rect(384 - tw / 2, 20, tw, 120); g.fill();
  if (accent) { g.fillStyle = accent; g.fillRect(384 - tw / 2, 20, 10, 120); }
  g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 384, 82, 690);
  const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sprite.scale.set(3.6 * scale, 0.75 * scale, 1);
  sprite.position.set(x, y, z);
  (parent ?? world.scene).add(sprite);
  return sprite;
}

/* ====================================================== module displays */

function drawModuleCard(g, w, h, { title, sub, status, accent, viewed, placeholder }) {
  g.fillStyle = '#0f1318'; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(255,255,255,0.045)'; g.lineWidth = 1;
  for (let i = 0; i < w; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); }
  for (let i = 0; i < h; i += 64) { g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); }
  g.fillStyle = accent; g.fillRect(0, 0, w, 12);

  g.textBaseline = 'top'; g.textAlign = 'left';
  g.fillStyle = '#f2ede1';
  g.font = `700 ${Math.round(w * 0.062)}px ${FONT_DISPLAY}`;
  const y = wrapText(g, title, 56, 66, w - 112, w * 0.072, 3);
  g.fillStyle = '#a9b0ba';
  g.font = `400 ${Math.round(w * 0.035)}px ${FONT_BODY}`;
  wrapText(g, sub || '', 56, y + 14, w - 112, w * 0.049, 3);

  const st = STATUS[status] ?? STATUS.planned;
  const by = h - 78;
  g.fillStyle = st.color; g.beginPath(); g.arc(70, by + 20, 11, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#e9e4d6'; g.font = `600 ${Math.round(w * 0.034)}px ${FONT_BODY}`; g.textBaseline = 'middle';
  g.fillText(st.label, 94, by + 21);
  g.textAlign = 'right';
  if (placeholder) { g.fillStyle = '#c9a85b'; g.fillText('Placeholder', w - 56, by + 21); g.textAlign = 'left'; }
  if (viewed) { g.fillStyle = '#7ee0a8'; g.textAlign = 'right'; g.fillText('✓ Viewed', w - 56, 56); }
  g.textAlign = 'left';
}

/**
 * Wall/console display for one module. Opens the information panel when used.
 * Quarter-turn rotations only (rotY: 0, ±π/2, π) so the colliders stay exact.
 */
export function moduleScreen(world, room, mod, { x, y = 0.9, z, rotY = 0, w = 3.4, h = 2.1, radius = 4.4, onOpen }) {
  const { progress, game } = world.ctx;
  const accent = room.accent;
  const nx = Math.sin(rotY); const nz = Math.cos(rotY);

  const cw = 1024; const ch = Math.round((cw * h) / w);
  const { canvas, g } = makeCanvas(cw, ch);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const redraw = () => {
    drawModuleCard(g, cw, ch, {
      title: mod.name, sub: mod.problem, status: mod.status, accent,
      viewed: progress.hasModule(room.id, mod.id), placeholder: mod.placeholder,
    });
    tex.needsUpdate = true;
  };
  redraw();

  const haloMat = M.emissive(accent, 0.25);
  world.box({ x: x - nx * 0.035, y: y - 0.1, z: z - nz * 0.035, w: w + 0.2, h: h + 0.2, d: 0.05, material: haloMat, rotY, cast: false });
  world.box({ x, y: y - 0.06, z, w: w + 0.12, h: h + 0.12, d: 0.1, material: STEEL(), rotY });

  const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  plane.position.set(x + nx * 0.056, y + h / 2, z + nz * 0.056);
  plane.rotation.y = rotY;
  world.scene.add(plane);

  let focus = 0; let focusTarget = 0;
  world.onUpdate((dt) => {
    focus += (focusTarget - focus) * Math.min(1, dt * 8);
    haloMat.emissiveIntensity = 0.25 + focus * 1.8;
  });

  world.interact({
    x, z, radius,
    label: `Inspect ${mod.name}`,
    onFocus: (v) => { focusTarget = v ? 1 : 0; },
    action: () => {
      progress.viewModule(room.id, mod.id);
      redraw();
      (onOpen ?? (() => game.openModule(room, mod)))();
    },
  });
  world.onDispose(progress.onChange(redraw)); // keeps the "Viewed" tick in sync
  return { mesh: plane, redraw, mod };
}

/* ================================================================ props */

export function desk(world, { x, y = 0, z, rotY = 0, w = 1.8, d = 0.8, top = M.wood(), legs = STEEL(), h = 0.76 }) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rotY; world.scene.add(g);
  world.box({ parent: g, y: h - 0.05, w, h: 0.05, d, material: top });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    world.box({ parent: g, x: sx * (w / 2 - 0.06), z: sz * (d / 2 - 0.06), w: 0.05, h: h - 0.05, d: 0.05, material: legs });
  }
  world.collider(x, z, w, d, rotY, y, y + h);
  return g;
}

export function chair(world, { x, y = 0, z, rotY = 0, color = '#2b3038' }) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rotY; world.scene.add(g);
  const m = M.solid(color, { rough: 0.8 });
  world.cylinder({ parent: g, r: 0.22, h: 0.04, material: STEEL(), seg: 5 });
  world.box({ parent: g, y: 0.04, w: 0.05, h: 0.38, d: 0.05, material: STEEL() });
  world.box({ parent: g, y: 0.42, w: 0.5, h: 0.08, d: 0.5, material: m });
  world.box({ parent: g, y: 0.5, z: 0.22, w: 0.5, h: 0.5, d: 0.07, material: m });
  world.collider(x, z, 0.5, 0.5, rotY, y, y + 0.9);
  return g;
}

export function sofa(world, { x, y = 0, z, rotY = 0, w = 2.2, color = '#3b4452' }) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rotY; world.scene.add(g);
  const m = M.solid(color, { rough: 0.95 });
  world.box({ parent: g, y: 0.1, w, h: 0.32, d: 0.9, material: m });
  world.box({ parent: g, y: 0.42, z: -0.36, w, h: 0.45, d: 0.2, material: m });
  world.box({ parent: g, y: 0.1, x: -(w / 2 - 0.11), w: 0.22, h: 0.6, d: 0.9, material: m });
  world.box({ parent: g, y: 0.1, x: w / 2 - 0.11, w: 0.22, h: 0.6, d: 0.9, material: m });
  for (const sx of [-1, 1]) world.box({ parent: g, x: sx * (w / 2 - 0.1), w: 0.06, h: 0.1, d: 0.7, material: STEEL() });
  world.collider(x, z, w, 0.9, rotY, y, y + 0.85);
  return g;
}

export function table(world, { x, y = 0, z, w = 1.2, d = 0.7, h = 0.42, top = M.marble(), rotY = 0 }) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rotY; world.scene.add(g);
  world.box({ parent: g, y: h - 0.04, w, h: 0.04, d, material: top });
  world.box({ parent: g, w: w * 0.8, h: h - 0.04, d: 0.06, material: STEEL() });
  world.collider(x, z, w, d, rotY, y, y + h);
  return g;
}

export function plant(world, { x, y = 0, z, s = 1 }) {
  const g = new THREE.Group(); g.position.set(x, y, z); world.scene.add(g);
  world.cylinder({ parent: g, r: 0.28 * s, rTop: 0.34 * s, h: 0.55 * s, material: M.solid('#2c2f35', { rough: 0.5 }) });
  const leaf = M.solid('#2f6b4a', { rough: 0.8 });
  const leaf2 = M.solid('#3d8a5d', { rough: 0.8 });
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.28 * s, 10, 8), i % 2 ? leaf : leaf2);
    m.scale.set(1, 1.6, 0.6);
    m.position.set(Math.cos(a) * 0.22 * s, (0.95 + (i % 3) * 0.12) * s, Math.sin(a) * 0.22 * s);
    m.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5);
    m.castShadow = true; g.add(m);
  }
  world.collider(x, z, 0.6 * s, 0.6 * s, 0, y, y + 1.2 * s);
  return g;
}

export function bookshelf(world, { x, y = 0, z, rotY = 0, w = 2, h = 2.2, d = 0.4, accent = '#d9a85f' }) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rotY; world.scene.add(g);
  const frame = M.solid('#1d2128', { rough: 0.6, metal: 0.3 });
  world.box({ parent: g, x: -w / 2 + 0.03, w: 0.06, h, d, material: frame });
  world.box({ parent: g, x: w / 2 - 0.03, w: 0.06, h, d, material: frame });
  world.box({ parent: g, z: -d / 2 + 0.02, w, h, d: 0.04, material: frame });
  const shelves = 5;
  for (let s = 0; s <= shelves; s++) world.box({ parent: g, y: (s * (h - 0.04)) / shelves, w, h: 0.04, d, material: frame, cast: false });

  // All the books are ONE textured plane (instead of hundreds of boxes) to keep draw calls low.
  const px = 64; // pixels per metre-ish
  const cw = Math.round(w * 256); const ch = Math.round(h * 256);
  const { canvas, g: c } = makeCanvas(cw, ch);
  const palette = ['#3b4452', '#7a5a3c', accent, '#c9c3b4', '#2f6b4a', '#8d3f3f', '#53607a'];
  let seed = Math.abs(Math.floor(x * 31 + z * 17)) + 7;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  void px;
  for (let s = 0; s < shelves; s++) {
    const baseY = ch - ((s * (h - 0.04)) / shelves + 0.04) * 256;
    let bx = 0.1 * 256;
    while (bx < cw - 0.1 * 256) {
      const bw = (0.035 + rand() * 0.05) * 256; const bh = (0.24 + rand() * 0.14) * 256;
      c.fillStyle = palette[(rand() * palette.length) | 0];
      c.fillRect(bx, baseY - bh, bw - 1, bh);
      c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(bx + bw - 3, baseY - bh, 2, bh);
      bx += bw;
    }
  }
  const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
  const books = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.12, h), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.9 }));
  books.position.set(0, h / 2, d / 2 - 0.1); books.receiveShadow = true;
  g.add(books);
  world.collider(x, z, w, d, rotY, y, y + h);
  return g;
}

export function column(world, { x, z, h, r = 0.32, accent, y = 0 }) {
  world.cylinder({ x, y, z, r, h, material: M.graphite(), collide: true, seg: 28 });
  if (accent) {
    const m = M.emissive(accent, 1.1);
    world.cylinder({ x, z, y: y + 0.35, r: r + 0.012, h: 0.05, material: m, cast: false, seg: 28 });
    world.cylinder({ x, z, y: y + h - 0.55, r: r + 0.012, h: 0.05, material: m, cast: false, seg: 28 });
  }
}

export function rug(world, { x, z, w, d, material = M.carpet(), y = 0.012 }) {
  return world.box({ x, y, z, w, h: 0.02, d, material, cast: false, tile: 2.5 });
}

export function floorLamp(world, { x, y = 0, z, color = '#ffd9a0' }) {
  const g = new THREE.Group(); g.position.set(x, y, z); world.scene.add(g);
  world.cylinder({ parent: g, r: 0.18, h: 0.04, material: STEEL() });
  world.cylinder({ parent: g, y: 0.04, r: 0.02, h: 1.5, material: STEEL(), seg: 8 });
  world.cylinder({ parent: g, y: 1.5, r: 0.2, rTop: 0.14, h: 0.3, material: M.emissive(color, 1.4), seg: 16, cast: false });
  world.collider(x, z, 0.3, 0.3, 0, y, y + 1.8);
  return g;
}

/** Emissive ceiling light bar. */
export function lightBar(world, { x, y, z, w, d, color = '#fff2d6', intensity = 1.6, h = 0.06 }) {
  return world.box({ x, y, z, w, h, d, material: M.emissive(color, intensity), cast: false, receive: false });
}

/** Small tilted monitor on a desk, with a canvas drawn once. */
export function deskMonitor(world, { x, y, z, rotY = 0, w = 0.6, h = 0.36, accent = '#6fd3b5', draw }) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rotY; world.scene.add(g);
  world.box({ parent: g, w: 0.18, h: 0.02, d: 0.14, material: STEEL() });
  world.box({ parent: g, w: 0.03, h: 0.18, d: 0.03, material: STEEL() });
  world.box({ parent: g, y: 0.16, w: w + 0.04, h: h + 0.04, d: 0.03, material: STEEL() });
  const tex = canvasTexture(512, Math.round((512 * h) / w), draw ?? ((c, cw, ch) => {
    c.fillStyle = '#0e1217'; c.fillRect(0, 0, cw, ch);
    c.fillStyle = accent; c.globalAlpha = 0.85;
    for (let i = 0; i < 9; i++) c.fillRect(30, 30 + i * ch / 11, 80 + ((i * 97) % 300), 8);
    c.globalAlpha = 1;
  }));
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  plane.position.set(0, 0.16 + (h + 0.04) / 2, 0.02);
  g.add(plane);
  return g;
}
