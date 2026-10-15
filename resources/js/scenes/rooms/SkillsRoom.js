import * as THREE from 'three';
import { M } from '../../game/materials.js';
import { labelSprite, column } from '../../game/props.js';
import { createRoom, lighting, pointGlow } from '../roomKit.js';

/* A constellation: one node per skill category, orbiting dots for each skill listed. No ratings. */
export default function build(ctx, room) {
  const { data, progress, game } = ctx;
  const W = 22; const D = 20; const H = 6.4;
  const world = createRoom(ctx, room, {
    w: W, d: D, h: H, floor: M.graphite(), wall: M.ink(), ceiling: M.graphite(), floorTile: 2.6,
    ambient: { base: 92, bright: 0.85, floor: 'metal' }, bg: '#080b10', fog: [28, 64],
  });
  const accent = room.accent;
  lighting(world, { sky: '#9fb8d8', ground: '#10161d', hemi: 0.6, key: 0.55, color: '#dfe9ff' });
  const cz = -1.2;
  pointGlow(world, accent, 90, 0, 4.2, cz, 22);

  // centre
  world.cylinder({ x: 0, z: cz, r: 1.0, h: 0.5, material: M.graphite(), collide: true, seg: 36 });
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 1), M.emissive(accent, 2.2));
  core.position.set(0, 2.4, cz); world.scene.add(core);
  labelSprite(world, 'Skills', { x: 0, y: 3.4, z: cz, scale: 0.7, accent });
  const ring = new THREE.Mesh(new THREE.RingGeometry(6.0, 6.06, 96), M.unlit(accent, 0.6));
  ring.rotation.x = -Math.PI / 2; ring.position.set(0, 0.03, cz); world.scene.add(ring);

  const cats = data.skills;
  const nodes = cats.map((cat, i) => {
    const a = (i / cats.length) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(a) * 6.0; const z = cz + Math.sin(a) * 6.0;
    const color = new THREE.Color().setHSL(((i / cats.length) * 0.7 + 0.42) % 1, 0.55, 0.62);
    const mat = M.emissive(`#${color.getHexString()}`, 1.3);
    const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 1), mat);
    mesh.position.set(x, 2.3, z); mesh.castShadow = true; world.scene.add(mesh);
    world.scene.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 2.4, cz), mesh.position.clone()]),
      new THREE.LineBasicMaterial({ color: accent, transparent: true, opacity: 0.35 }),
    ));
    const pad = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.78, 40), M.unlit(`#${color.getHexString()}`, 0.9));
    pad.rotation.x = -Math.PI / 2; pad.position.set(x, 0.035, z); world.scene.add(pad);
    labelSprite(world, cat.name, { x, y: 3.35, z, scale: 0.62, accent: `#${color.getHexString()}` });

    const dots = (cat.items ?? []).slice(0, 8).map((_, k, arr) => {
      const d = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 10), M.unlit('#ffffff'));
      world.scene.add(d); return { d, phase: (k / arr.length) * Math.PI * 2 };
    });
    world.interact({
      x, z, radius: 3.4, label: `Open ${cat.name}`,
      onFocus: (v) => { mat.emissiveIntensity = v ? 3 : (progress.hasModule('skills', cat.id) ? 2.2 : 1.3); },
      action: () => { progress.viewModule('skills', cat.id); game.openSkills(cat); },
    });
    return { cat, mesh, mat, dots, x, z };
  });

  world.onUpdate((dt, t) => {
    core.rotation.y += dt * 0.7; core.rotation.x += dt * 0.3;
    for (const n of nodes) {
      n.mesh.rotation.y += dt * 0.8;
      n.mesh.position.y = 2.3 + Math.sin(t * 1.1 + n.x) * 0.1;
      n.dots.forEach(({ d, phase }) => {
        const a = t * 1.3 + phase;
        d.position.set(n.x + Math.cos(a) * 0.85, n.mesh.position.y + Math.sin(a * 0.7) * 0.25, n.z + Math.sin(a) * 0.85);
      });
    }
  });
  for (const x of [-9.5, 9.5]) for (const z of [-7, 0, 7]) column(world, { x, z, h: H, accent });
  return world;
}
