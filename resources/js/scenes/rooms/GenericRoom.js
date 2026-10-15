import { M } from '../../game/materials.js';
import { plant, lightBar } from '../../game/props.js';
import { createRoom, lighting, pointGlow, placeModules, overviewPodium, hologram } from '../roomKit.js';

/*
 * Fallback environment for any room you add to config/portfolio.php with
 * 'scene' => 'generic': module displays on the walls, a hologram in the middle.
 */
export default function build(ctx, room) {
  const W = 22; const D = 18; const H = 5.4;
  const world = createRoom(ctx, room, {
    w: W, d: D, h: H, floor: M.carpet(), wall: M.graphite(), floorTile: 2.5,
    ambient: { base: 105, bright: 0.55, floor: 'carpet' }, bg: '#0b0d11', fog: [26, 60],
  });
  lighting(world, { hemi: 0.8, key: 0.8 });
  pointGlow(world, room.accent, 60, 0, 4, -1, 18);
  lightBar(world, { x: 0, y: H - 0.08, z: 0, w: W - 5, d: 0.18, color: '#ffffff', intensity: 1.1 });
  world.cylinder({ x: 0, z: -1, r: 1.2, h: 0.45, material: M.graphite(), collide: true, seg: 36 });
  world.cylinder({ x: 0, z: -1, y: 0.45, r: 1.0, h: 0.05, material: M.emissive(room.accent, 1.4), seg: 36, cast: false });
  hologram(world, { x: 0, y: 2.1, z: -1, radius: 0.8, color: room.accent });
  plant(world, { x: -W / 2 + 1, z: D / 2 - 1 });
  plant(world, { x: W / 2 - 1, z: D / 2 - 1 });
  placeModules(world, room);
  overviewPodium(world, room, { x: 3.6, z: D / 2 - 4.6 });
  return world;
}
