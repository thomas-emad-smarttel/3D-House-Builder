import * as THREE from 'three';
import { M, FONT_BODY, FONT_DISPLAY } from '../../game/materials.js';
import { canvasPlane, labelSprite, lightBar } from '../../game/props.js';
import { createRoom, lighting, pointGlow, placeModules, overviewPodium, seeded } from '../roomKit.js';

/* Logistics control room: a miniature city with delivery vehicles on live-looking routes. */
export default function build(ctx, room) {
  const W = 26; const D = 22; const H = 6.2;
  const world = createRoom(ctx, room, {
    w: W, d: D, h: H, floor: M.tile(), wall: M.plaster(), floorTile: 2.6,
    ambient: { base: 123, bright: 0.65, floor: 'marble' }, bg: '#0d1114', fog: [30, 70],
  });
  const accent = room.accent;
  lighting(world, { hemi: 0.75, key: 0.9 });
  pointGlow(world, '#dff7f2', 40, 0, H - 1, 0, 24);
  lightBar(world, { x: 0, y: H - 0.08, z: 0, w: W - 4, d: 0.18, color: '#e6fffa', intensity: 1.2 });
  lightBar(world, { x: 0, y: H - 0.08, z: -6, w: W - 4, d: 0.18, color: '#e6fffa', intensity: 1.2 });

  /* city table */
  const cx = 0; const cz = 1.5; const tw = 9.6; const td = 7.2; const top = 0.85;
  world.box({ x: cx, y: top - 0.12, z: cz, w: tw, h: 0.12, d: td, material: M.graphite(), collide: true });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) world.box({ x: cx + sx * (tw / 2 - 0.3), z: cz + sz * (td / 2 - 0.3), w: 0.25, h: top - 0.12, d: 0.25, material: M.solid('#1c2026', { metal: 0.7, rough: 0.4 }) });
  world.box({ x: cx, y: top, z: cz, w: tw - 0.3, h: 0.04, d: td - 0.3, material: M.solid('#121820', { rough: 0.9 }), cast: false });

  const rnd = seeded(9);
  const blockMats = ['#39424f', '#46505e', '#2e3640', '#515b69'].map((c) => M.solid(c, { rough: 0.7 }));
  const gx = 6; const gz = 4; const step = 1.4;
  const toWorld = (ix, iz) => ({ x: cx + (ix - (gx - 1) / 2) * step, z: cz + (iz - (gz - 1) / 2) * step });
  for (let ix = 0; ix < gx; ix++) for (let iz = 0; iz < gz; iz++) {
    const p = toWorld(ix, iz);
    const isWarehouse = ix === 0 && iz === 0;
    const h = isWarehouse ? 0.34 : 0.15 + rnd() * 0.5;
    world.box({ x: p.x, y: top + 0.04, z: p.z, w: step * (isWarehouse ? 0.85 : 0.5 + rnd() * 0.15), h, d: step * (isWarehouse ? 0.7 : 0.5 + rnd() * 0.15), material: isWarehouse ? M.emissive(accent, 0.9) : blockMats[(rnd() * 4) | 0], cast: false });
  }
  labelSprite(world, 'Warehouse', { ...{ x: toWorld(0, 0).x, y: top + 0.95, z: toWorld(0, 0).z }, scale: 0.5, accent });

  // routes along the streets between blocks
  const sx = (ix) => cx + (ix - (gx - 1) / 2) * step + step / 2;
  const sz = (iz) => cz + (iz - (gz - 1) / 2) * step + step / 2;
  const routes = [
    [[sx(-1), sz(-1)], [sx(4), sz(-1)], [sx(4), sz(1)], [sx(2), sz(1)], [sx(2), sz(2)]],
    [[sx(-1), sz(-1)], [sx(-1), sz(2)], [sx(1), sz(2)], [sx(1), sz(0)], [sx(3), sz(0)]],
    [[sx(-1), sz(-1)], [sx(1), sz(-1)], [sx(1), sz(1)], [sx(4), sz(1)], [sx(4), sz(2)]],
  ];
  const routeMat = M.emissive(accent, 1.3);
  const paths = routes.map((pts) => {
    const segs = [];
    let total = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, z1] = pts[i]; const [x2, z2] = pts[i + 1];
      const len = Math.hypot(x2 - x1, z2 - z1);
      world.box({ x: (x1 + x2) / 2, y: top + 0.045, z: (z1 + z2) / 2, w: Math.abs(x2 - x1) + 0.05, h: 0.02, d: Math.abs(z2 - z1) + 0.05, material: routeMat, cast: false });
      segs.push({ x1, z1, x2, z2, len, start: total }); total += len;
    }
    const last = pts[pts.length - 1];
    const pin = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.3, 12), M.emissive('#ffffff', 1.5));
    pin.position.set(last[0], top + 0.24, last[1]); pin.rotation.x = Math.PI; world.scene.add(pin);
    return { segs, total };
  });
  const vehicles = paths.flatMap((p, pi) => [0, 0.5].map((off, k) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.36), M.emissive('#ffffff', 1.1));
    mesh.castShadow = true; world.scene.add(mesh);
    return { mesh, p, off, speed: 0.55 + pi * 0.12 + k * 0.05 };
  }));
  world.onUpdate((dt, t) => {
    for (const v of vehicles) {
      const d = (((t * v.speed + v.off * v.p.total) % v.p.total) + v.p.total) % v.p.total;
      const seg = v.p.segs.find((s) => d >= s.start && d <= s.start + s.len) ?? v.p.segs[0];
      const k = (d - seg.start) / seg.len;
      v.mesh.position.set(seg.x1 + (seg.x2 - seg.x1) * k, top + 0.11, seg.z1 + (seg.z2 - seg.z1) * k);
      v.mesh.rotation.y = Math.atan2(seg.x2 - seg.x1, seg.z2 - seg.z1);
    }
  });

  /* shipment-status wall (illustrative flow, no data) */
  const stages = ['Picked up', 'In transit', 'Out for delivery', 'Delivered'];
  const status = canvasPlane(world, {
    w: 7, h: 2.2, x: W / 2 - 0.2, y: 2.0, z: 1.5, rotY: -Math.PI / 2, px: 900,
    draw: (g, w, h, t) => {
      g.fillStyle = '#0f1318'; g.fillRect(0, 0, w, h);
      g.fillStyle = accent; g.fillRect(0, 0, w, 8);
      g.fillStyle = '#f2ede1'; g.font = `700 ${h * 0.11}px ${FONT_DISPLAY}`; g.textBaseline = 'top'; g.fillText('Shipment status flow', 36, 36);
      g.fillStyle = '#8f98a6'; g.font = `500 ${h * 0.065}px ${FONT_BODY}`; g.fillText('Illustrative', 36, 36 + h * 0.14);
      const active = Math.floor(t * 0.6) % stages.length;
      stages.forEach((s, i) => {
        const x = 90 + (i * (w - 180)) / (stages.length - 1); const y = h * 0.66;
        if (i) { g.strokeStyle = i <= active ? accent : '#2a313c'; g.lineWidth = 6; g.beginPath(); g.moveTo(90 + ((i - 1) * (w - 180)) / 3, y); g.lineTo(x, y); g.stroke(); }
        g.fillStyle = i <= active ? accent : '#2a313c'; g.beginPath(); g.arc(x, y, 20, 0, Math.PI * 2); g.fill();
        g.fillStyle = i <= active ? '#f2ede1' : '#6b7480'; g.font = `600 ${h * 0.07}px ${FONT_BODY}`; g.textAlign = 'center'; g.fillText(s, x, y + 34); g.textAlign = 'left';
      });
    },
  });
  let acc = 0;
  world.onUpdate((dt, t) => { acc += dt; if (acc > 0.25) { acc = 0; status.redraw(t); } });

  /* warehouse racking in the west corner */
  const rack = M.solid('#2f3743', { metal: 0.5, rough: 0.5 });
  for (let i = 0; i < 3; i++) {
    const z = 2 + i * 2.6; const x = -W / 2 + 1.1;
    world.box({ x, z, w: 1.1, h: 2.4, d: 2.2, material: rack, collide: true, cast: true, receive: true }).material = rack;
    for (let l = 0; l < 3; l++) for (let b = 0; b < 3; b++) {
      world.box({ x: x + 0.62, y: 0.2 + l * 0.75, z: z - 0.7 + b * 0.7, w: 0.2, h: 0.5, d: 0.55, material: M.solid(['#8a6a4b', '#a07d58', '#6f553c'][(i + l + b) % 3], { rough: 0.9 }), cast: false });
    }
  }

  placeModules(world, room);
  overviewPodium(world, room, { x: 4.2, z: D / 2 - 4.6 });
  return world;
}
