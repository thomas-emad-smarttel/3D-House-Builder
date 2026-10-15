import * as THREE from 'three';
import { M } from '../../game/materials.js';
import { labelSprite, sign, lightBar } from '../../game/props.js';
import { createRoom, lighting, pointGlow } from '../roomKit.js';

/*
 * A long corridor you walk from the oldest role to the newest.
 * (config/portfolio.php lists newest first, like a CV; the corridor reverses it.)
 */
export default function build(ctx, room) {
  const { data, progress, game } = ctx;
  const entries = [...data.timeline].reverse();
  const W = 11; const spacing = 7;
  const D = Math.max(26, entries.length * spacing + 12);
  const H = 4.8;
  const world = createRoom(ctx, room, {
    w: W, d: D, h: H, floor: M.marble(), wall: M.graphite(), ceiling: M.graphite(), floorTile: 3,
    ambient: { base: 104, bright: 0.6, floor: 'marble' }, bg: '#0b0c0e', fog: [20, 55],
  });
  const accent = room.accent;
  lighting(world, { hemi: 0.75, key: 0.7, color: '#ffeccc' });
  for (let z = -D / 2 + 4; z < D / 2; z += 10) lightBar(world, { x: 0, y: H - 0.08, z, w: W - 3, d: 0.16, color: '#ffe6bd', intensity: 1.2 });
  pointGlow(world, '#ffdca8', 40, 0, H - 1, 0, 20);

  // glowing spine down the middle
  world.box({ x: 0, y: 0.015, z: 0, w: 0.12, h: 0.02, d: D - 1, material: M.emissive(accent, 1.2), cast: false });

  entries.forEach((e, i) => {
    const z = D / 2 - 6.5 - i * spacing;
    const x = i % 2 === 0 ? -3.3 : 3.3;
    const rotY = x < 0 ? Math.PI / 2 : -Math.PI / 2;
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.58, 40), M.unlit(accent, 0.95));
    ring.rotation.x = -Math.PI / 2; ring.position.set(0, 0.03, z); world.scene.add(ring);

    world.cylinder({ x, z, r: 0.5, rTop: 0.42, h: 0.95, material: M.graphite(), collide: true, seg: 28 });
    const top = M.emissive(accent, 1.3);
    world.cylinder({ x, z, y: 0.95, r: 0.5, h: 0.05, material: top, seg: 28, cast: false });
    sign(world, {
      title: e.organization, sub: `${e.role}${e.dates ? ` · ${e.dates}` : ''}`, accent,
      x, y: 1.95, z, rotY, w: 2.7, h: 1.0,
    });
    world.interact({
      x, z, radius: 3.4, label: `Read: ${e.organization}`,
      onFocus: (v) => { top.emissiveIntensity = v ? 3 : 1.3; },
      action: () => { progress.viewModule('timeline', e.id); game.openTimeline(e); },
    });
  });

  labelSprite(world, 'Present', { x: 0, y: 2.6, z: -D / 2 + 1.2, scale: 0.9, accent });
  return world;
}
