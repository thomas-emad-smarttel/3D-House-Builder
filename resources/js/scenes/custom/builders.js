import * as THREE from 'three';
import { M, makeCanvas, FONT_DISPLAY, FONT_BODY } from '../../game/materials.js';
import { desk, chair, sofa, table, plant, bookshelf, floorLamp, deskMonitor, sign, canvasPlane } from '../../game/props.js';
import { moduleScreen } from '../../game/props.js';
import { overviewPodium, textBoard, totem, hologram } from '../roomKit.js';
import { RADIANS } from './catalog.js';

/*
 * One builder per catalog object type. Each receives (world, room, o, ctx) with
 * o = { x, z, rot (degrees), p (params) }. Rotations are quarter turns only, so
 * colliders stay exact (see game/collision.js).
 */

const matFor = (name, color) => {
  switch (name) {
    case 'solid': return M.solid(color, { rough: 0.7 });
    case 'emissive': return M.emissive(color, 1.3);
    case 'glass': return M.glass(color, 0.28);
    default: return typeof M[name] === 'function' ? M[name]() : M.solid(color);
  }
};

/** Local (lx, lz) offset rotated into world space around the object's origin. */
const at = (o, lx, lz) => {
  const a = RADIANS(o.rot);
  return { x: o.x + lx * Math.cos(a) + lz * Math.sin(a), z: o.z - lx * Math.sin(a) + lz * Math.cos(a) };
};

const normal = (o) => { const a = RADIANS(o.rot); return { nx: Math.sin(a), nz: Math.cos(a) }; };

function pictureCard(w, h, label, caption) {
  const { canvas, g } = makeCanvas(640, Math.round((640 * h) / w));
  g.fillStyle = '#15191f'; g.fillRect(0, 0, canvas.width, canvas.height);
  g.fillStyle = '#6b7280'; g.font = `700 ${canvas.height * 0.2}px ${FONT_DISPLAY}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(label, canvas.width / 2, canvas.height * 0.45);
  if (caption) { g.font = `400 ${canvas.height * 0.08}px ${FONT_BODY}`; g.fillText(caption, canvas.width / 2, canvas.height * 0.72, canvas.width - 40); }
  const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export const BUILDERS = {
  block(world, room, o) {
    const p = o.p;
    world.box({ x: o.x, y: p.y, z: o.z, w: p.w, h: p.h, d: p.d, rotY: RADIANS(o.rot), material: matFor(p.material, p.color), collide: !!p.collide && p.y < 2.2, cast: p.material !== 'glass' });
  },

  cylinder(world, room, o) {
    const p = o.p;
    world.cylinder({ x: o.x, y: p.y, z: o.z, r: p.r, h: p.h, material: matFor(p.material, p.color), collide: !!p.collide && p.y < 2.2, seg: 32 });
  },

  rug(world, room, o) {
    const p = o.p;
    world.box({ x: o.x, y: 0.012, z: o.z, w: p.w, h: 0.02, d: p.d, rotY: RADIANS(o.rot), material: matFor(p.material, p.color), cast: false, tile: 2.5 });
  },

  desk(world, room, o) { desk(world, { x: o.x, z: o.z, rotY: RADIANS(o.rot), w: o.p.w, d: o.p.d, top: matFor(o.p.material, '#a07a52') }); },

  workstation(world, room, o) {
    const p = o.p; const rotY = RADIANS(o.rot);
    desk(world, { x: o.x, z: o.z, rotY, w: p.w, d: 0.9, top: M.wood() });
    const n = Math.max(1, Math.min(3, p.monitors));
    for (let i = 0; i < n; i++) {
      const c = at(o, (i - (n - 1) / 2) * 0.78, 0.05);
      deskMonitor(world, { x: c.x, y: 0.76, z: c.z, rotY, accent: room.accent, w: 0.72, h: 0.42 });
    }
    const c = at(o, 0, 0.95);
    chair(world, { x: c.x, z: c.z, rotY });
  },

  chair(world, room, o) { chair(world, { x: o.x, z: o.z, rotY: RADIANS(o.rot), color: o.p.color }); },
  sofa(world, room, o) { sofa(world, { x: o.x, z: o.z, rotY: RADIANS(o.rot), w: o.p.w, color: o.p.color }); },
  table(world, room, o) { table(world, { x: o.x, z: o.z, rotY: RADIANS(o.rot), w: o.p.w, d: o.p.d, top: matFor(o.p.material, '#cbd5e1') }); },
  plant(world, room, o) { plant(world, { x: o.x, z: o.z, s: o.p.s }); },
  bookshelf(world, room, o) { bookshelf(world, { x: o.x, z: o.z, rotY: RADIANS(o.rot), w: o.p.w, h: o.p.h, accent: room.accent }); },
  lamp(world, room, o) { floorLamp(world, { x: o.x, z: o.z, color: o.p.color }); },

  module(world, room, o) {
    const mod = room.modules.find((m) => m.id === o.p.module);
    if (!mod) throw new Error(`module "${o.p.module}" does not exist in this room`);
    moduleScreen(world, room, mod, { x: o.x, y: o.p.y, z: o.z, rotY: RADIANS(o.rot), w: o.p.w, h: o.p.h, radius: 4.4 });
  },

  sign(world, room, o) {
    const p = o.p;
    sign(world, { title: p.title, sub: p.sub, accent: room.accent, x: o.x, y: p.y, z: o.z, rotY: RADIANS(o.rot), w: p.w, h: p.h, dark: p.dark });
  },

  board(world, room, o, ctx) {
    const p = o.p;
    textBoard(world, {
      x: o.x, y: p.y, z: o.z, rotY: RADIANS(o.rot), w: p.w, h: p.h, title: p.title, body: p.body, accent: room.accent,
      label: `Read: ${p.title}`,
      action: p.opens ? () => ctx.game.openInfo({ title: p.title, body: p.body }) : undefined,
    });
  },

  picture(world, room, o, ctx) {
    const p = o.p; const rotY = RADIANS(o.rot); const { nx, nz } = normal(o);
    const halo = M.emissive(room.accent, 0.25);
    world.box({ x: o.x - nx * 0.035, y: p.y - 0.1, z: o.z - nz * 0.035, w: p.w + 0.2, h: p.h + 0.2, d: 0.05, material: halo, rotY, cast: false });
    world.box({ x: o.x, y: p.y - 0.06, z: o.z, w: p.w + 0.12, h: p.h + 0.12, d: 0.1, material: M.solid('#1c2026', { rough: 0.4, metal: 0.7 }), rotY });

    const isVideo = p.media === 'video';
    const mat = new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false });
    mat.map = pictureCard(p.w, p.h, isVideo ? '▶ Video' : 'Picture', p.caption);
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(p.w, p.h), mat);
    plane.position.set(o.x + nx * 0.056, p.y + p.h / 2, o.z + nz * 0.056);
    plane.rotation.y = rotY;
    world.scene.add(plane);

    if (!isVideo && p.src) {
      try {
        new THREE.TextureLoader().load(p.src, (tex) => {
          if (world.disposed) { tex.dispose(); return; }
          tex.colorSpace = THREE.SRGBColorSpace;
          mat.map?.dispose(); mat.map = tex; mat.needsUpdate = true;
        }, undefined, () => { /* keep the placeholder card if the file is missing */ });
      } catch { /* no image loading available */ }
    }

    if (p.opens || isVideo) {
      let focus = 0; let target = 0;
      world.onUpdate((dt) => { focus += (target - focus) * Math.min(1, dt * 8); halo.emissiveIntensity = 0.25 + focus * 1.8; });
      world.interact({
        x: o.x, z: o.z, radius: 4.4,
        label: `${isVideo ? 'Play' : 'View'}: ${p.caption || (isVideo ? 'video' : 'picture')}`,
        onFocus: (v) => { target = v ? 1 : 0; },
        action: () => ctx.game.openInfo({ title: p.caption || (isVideo ? 'Video' : 'Picture'), media: p.src ? { type: p.media, src: p.src, caption: p.caption } : null }),
      });
    }
  },

  dashboard(world, room, o) {
    const p = o.p; const rotY = RADIANS(o.rot); const { nx, nz } = normal(o);
    const board = canvasPlane(world, {
      w: p.w, h: p.h, x: o.x + nx * 0.03, y: p.y + p.h / 2, z: o.z + nz * 0.03, rotY, px: 640,
      draw: (g, w, h, t) => {
        g.fillStyle = 'rgba(8,12,20,0.9)'; g.fillRect(0, 0, w, h);
        g.strokeStyle = p.color; g.lineWidth = 3; g.strokeRect(3, 3, w - 6, h - 6);
        g.fillStyle = '#8f98a6'; g.font = `500 ${h * 0.06}px ${FONT_BODY}`; g.textBaseline = 'top'; g.textAlign = 'left';
        g.fillText('Illustrative visualisation, not real data', 16, 12);
        const n = 14; const bw = (w - 60) / n;
        for (let i = 0; i < n; i++) {
          const v = 0.4 + 0.28 * Math.sin(t * 1.2 + i * 0.7) + 0.14 * Math.sin(t * 0.6 + i * 1.9);
          g.fillStyle = i % 4 === 0 ? '#ffffff' : p.color; g.globalAlpha = 0.85;
          g.fillRect(30 + i * bw, h * 0.92 - v * h * 0.55, bw * 0.7, v * h * 0.55);
        }
        g.globalAlpha = 1;
      },
    });
    let acc = 0;
    world.onUpdate((dt, t) => { acc += dt; if (acc > 0.12) { acc = 0; board.redraw(t); } });
  },

  overview(world, room, o) { overviewPodium(world, room, { x: o.x, z: o.z, title: o.p.title, label: o.p.label }); },

  info(world, room, o, ctx) {
    const p = o.p;
    totem(world, {
      x: o.x, z: o.z, title: p.title, sub: p.sub, accent: room.accent,
      label: `Read: ${p.title}`,
      action: () => ctx.game.openInfo({ title: p.title, body: p.body, link: p.link, link_label: p.link_label }),
    });
  },

  hologram(world, room, o) { hologram(world, { x: o.x, y: o.p.y, z: o.z, radius: o.p.radius, color: o.p.color }); },

  light(world, room, o) {
    world.light(new THREE.PointLight(o.p.color, o.p.intensity, o.p.distance, 2), o.x, o.p.y, o.z);
  },
};

