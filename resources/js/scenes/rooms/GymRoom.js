import * as THREE from 'three';
import { M } from '../../game/materials.js';
import { desk, chair, deskMonitor, plant, lightBar, canvasPlane } from '../../game/props.js';
import { createRoom, lighting, pointGlow, placeModules, overviewPodium } from '../roomKit.js';

/* A fitness-centre floor: rubber flooring, a mirror wall, equipment and a reception desk. */
export default function build(ctx, room) {
  const W = 26; const D = 20; const H = 5.4;
  const world = createRoom(ctx, room, {
    w: W, d: D, h: H, floor: M.rubber(), wall: M.graphite(), ceiling: M.graphite(), floorTile: 2,
    ambient: { base: 98, bright: 0.8, floor: 'rubber' }, bg: '#0d0e10', fog: [30, 70],
  });
  const accent = room.accent;
  lighting(world, { hemi: 0.8, key: 0.8, color: '#fff3e6' });
  pointGlow(world, '#fff0e0', 36, -5, H - 1, 0, 22);
  pointGlow(world, '#fff0e0', 36, 5, H - 1, 0, 22);
  for (const z of [-6, 0, 6]) lightBar(world, { x: 0, y: H - 0.08, z, w: W - 5, d: 0.2, color: '#fff2e0', intensity: 1.3 });
  lightBar(world, { x: 0, y: H - 0.5, z: -D / 2 + 0.4, w: W - 2, d: 0.08, h: 0.08, color: accent, intensity: 2 });

  // floor markings
  const line = M.emissive(accent, 0.7);
  world.box({ x: 0, y: 0.01, z: -2.2, w: 12, h: 0.01, d: 0.07, material: line, cast: false });
  world.box({ x: 0, y: 0.01, z: 1.2, w: 12, h: 0.01, d: 0.07, material: line, cast: false });

  // mirror wall (west)
  const frame = M.solid('#15181d', { metal: 0.6, rough: 0.4 });
  for (let i = 0; i < 4; i++) {
    const z = -6.5 + i * 4.2;
    world.box({ x: -W / 2 + 0.2, y: 0.5, z, w: 0.05, h: 3.6, d: 4.0, material: M.glass('#bcd3e6', 0.35), cast: false });
    world.box({ x: -W / 2 + 0.19, y: 0.45, z, w: 0.04, h: 3.7, d: 4.1, material: frame, cast: false });
  }

  // treadmills (east)
  const steel = M.solid('#20242b', { metal: 0.6, rough: 0.4 });
  for (let i = 0; i < 4; i++) {
    const z = -5.5 + i * 2.6; const x = W / 2 - 2.2;
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = -Math.PI / 2; world.scene.add(g);
    world.box({ parent: g, y: 0.08, w: 0.85, h: 0.14, d: 1.9, material: M.solid('#101114', { rough: 0.9 }) });
    world.box({ parent: g, y: 0.22, w: 0.6, h: 0.03, d: 1.6, material: M.solid('#2b2f36', { rough: 0.95 }), cast: false });
    for (const s of [-1, 1]) world.box({ parent: g, x: s * 0.4, y: 0.1, z: -0.7, w: 0.05, h: 1.0, d: 0.05, material: steel });
    world.box({ parent: g, y: 1.05, z: -0.8, w: 0.9, h: 0.3, d: 0.1, material: steel });
    world.box({ parent: g, y: 1.12, z: -0.74, w: 0.5, h: 0.16, d: 0.02, material: M.emissive(accent, 1.4), cast: false });
    world.collider(x, z, 1.9, 0.9);
  }

  // weights rack, benches
  world.box({ x: -4, z: -7.2, w: 3.2, h: 1.0, d: 0.6, material: steel, collide: true });
  for (let i = 0; i < 6; i++) {
    for (const s of [0, 1]) {
      const d = new THREE.Mesh(new THREE.CylinderGeometry(0.1 + i * 0.012, 0.1 + i * 0.012, 0.22, 16), M.solid('#0e0f12', { rough: 0.5, metal: 0.4 }));
      d.rotation.z = Math.PI / 2; d.position.set(-5.3 + i * 0.5, 0.86 + s * 0.0, -7.2 + (s ? 0.12 : -0.12) * 0); d.position.y = 1.15; d.position.z = -7.2 + (s ? 0.12 : -0.12); world.scene.add(d);
    }
  }
  for (const x of [-7.5, 3.5]) {
    world.box({ x, z: 3.2, w: 1.5, h: 0.42, d: 0.5, material: M.solid('#1a1c20', { rough: 0.8 }), collide: true });
    world.box({ x, y: 0.42, z: 3.2, w: 1.3, h: 0.1, d: 0.42, material: M.solid(accent, { rough: 0.7 }), cast: false });
  }

  // reception desk, front right of the door
  desk(world, { x: 7.5, z: 6.2, w: 3.4, d: 0.9, top: M.solid('#e9e4d8', { rough: 0.35 }), h: 1.0 });
  chair(world, { x: 7.5, z: 7.3, rotY: 0 });
  deskMonitor(world, { x: 7, y: 1.0, z: 6.2, rotY: Math.PI, accent, w: 0.7, h: 0.4 });
  plant(world, { x: 10.5, z: 8.2 });

  placeModules(world, room);
  overviewPodium(world, room, { x: -3.6, z: D / 2 - 4.6 });
  return world;
}
