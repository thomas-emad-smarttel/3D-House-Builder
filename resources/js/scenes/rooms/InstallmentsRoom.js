import * as THREE from 'three';
import { M, FONT_BODY, FONT_DISPLAY } from '../../game/materials.js';
import { desk, chair, deskMonitor, plant, lightBar, canvasPlane, rug, sofa, table } from '../../game/props.js';
import { createRoom, lighting, pointGlow, placeModules, overviewPodium } from '../roomKit.js';

/* Financial operations office: an installment timeline wall and payment-status towers (illustrative only). */
export default function build(ctx, room) {
  const W = 24; const D = 18; const H = 5.2;
  const world = createRoom(ctx, room, {
    w: W, d: D, h: H, floor: M.marble(), wall: M.plaster(), floorTile: 3,
    ambient: { base: 130, bright: 0.7, floor: 'marble' }, bg: '#0d0e14', fog: [28, 66],
  });
  const accent = room.accent;
  lighting(world, { hemi: 0.8, key: 0.85, color: '#f2f0ff' });
  pointGlow(world, '#eceaff', 38, 0, H - 1, -1, 22);
  for (const z of [-5, 1, 6]) lightBar(world, { x: 0, y: H - 0.08, z, w: W - 5, d: 0.18, color: '#f0eeff', intensity: 1.2 });
  rug(world, { x: 0, z: 2, w: 9, d: 6, material: M.carpet() });

  // long operations desk with three monitors
  desk(world, { x: 0, z: 2, w: 6.4, d: 1.1, top: M.wood() });
  for (const x of [-2, 0, 2]) deskMonitor(world, { x, y: 0.76, z: 1.8, rotY: 0, accent, w: 0.9, h: 0.52 });
  for (const x of [-2, 0, 2]) chair(world, { x, z: 3.1, rotY: 0, color: '#2c3140' });

  // installment timeline wall (east): paid / due / upcoming blocks, no amounts
  const marks = [0, 0, 0, 0, 1, 2, 2, 2, 2, 2];
  const col = ['#4ade80', '#fbbf24', '#4b5563'];
  const tl = canvasPlane(world, {
    w: 9, h: 2.4, x: W / 2 - 0.2, y: 1.6, z: -1, rotY: -Math.PI / 2, px: 1100,
    draw: (g, w, h, t) => {
      g.fillStyle = '#0f1318'; g.fillRect(0, 0, w, h);
      g.fillStyle = accent; g.fillRect(0, 0, w, 8);
      g.textBaseline = 'top'; g.fillStyle = '#f2ede1'; g.font = `700 ${h * 0.1}px ${FONT_DISPLAY}`; g.fillText('Installment timeline', 36, 34);
      g.fillStyle = '#8f98a6'; g.font = `500 ${h * 0.058}px ${FONT_BODY}`; g.fillText('Illustrative: paid, due and upcoming instalments', 36, 34 + h * 0.13);
      const n = marks.length; const bw = (w - 72) / n;
      const sweep = Math.floor(t * 1.2) % n;
      marks.forEach((m, i) => {
        g.fillStyle = col[m]; g.globalAlpha = i === sweep ? 1 : 0.7;
        g.fillRect(36 + i * bw, h * 0.52, bw - 10, h * 0.2);
        g.globalAlpha = 1;
      });
      [['Paid', col[0]], ['Due', col[1]], ['Upcoming', col[2]]].forEach(([l, c], i) => {
        g.fillStyle = c; g.fillRect(36 + i * 190, h * 0.82, 20, 20);
        g.fillStyle = '#c9ced6'; g.font = `500 ${h * 0.058}px ${FONT_BODY}`; g.fillText(l, 66 + i * 190, h * 0.82 - 2);
      });
    },
  });
  let acc = 0;
  world.onUpdate((dt, t) => { acc += dt; if (acc > 0.3) { acc = 0; tl.redraw(t); } });

  // payment-status towers (west, illustrative)
  const towers = [['#4ade80', 1.7], ['#fbbf24', 1.1], ['#ef6b6b', 0.6]];
  towers.forEach(([c, h], i) => {
    world.cylinder({ x: -W / 2 + 2.2, z: -1.5 + i * 1.5, r: 0.45, h, material: M.emissive(c, 0.9), collide: true, seg: 24 });
  });
  world.box({ x: -W / 2 + 2.2, z: 0, w: 1.4, h: 0.1, d: 5, material: M.graphite(), cast: false });

  // waiting area
  sofa(world, { x: -7.5, z: 6.4, rotY: 0, w: 2.6, color: '#3a4256' });
  table(world, { x: -7.5, z: 4.9, w: 1.1, d: 0.6 });
  plant(world, { x: -10.6, z: 7.6 });
  plant(world, { x: 10.6, z: 7.6 });

  placeModules(world, room);
  overviewPodium(world, room, { x: 4.4, z: D / 2 - 4.6 });
  return world;
}
