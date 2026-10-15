import { M } from '../../game/materials.js';
import { desk, chair, deskMonitor, bookshelf, sofa, plant, floorLamp, lightBar, sign, rug, table } from '../../game/props.js';
import { createRoom, lighting, pointGlow, textBoard } from '../roomKit.js';

/* A warm private workspace: desk, shelves, and two boards that open the profile panel. */
export default function build(ctx, room) {
  const { data, game } = ctx;
  const W = 16; const D = 14; const H = 4.4;
  const world = createRoom(ctx, room, {
    w: W, d: D, h: H, floor: M.wood(), wall: M.plaster(), floorTile: 2.4,
    ambient: { base: 98, bright: 0.5, floor: 'wood' }, bg: '#100e0c', fog: [24, 50],
  });
  const accent = room.accent;
  lighting(world, { hemi: 0.85, key: 0.8, color: '#ffe8c8', ground: '#5a4636' });
  pointGlow(world, '#ffd9a8', 30, 0, H - 1, -2, 16);
  lightBar(world, { x: 0, y: H - 0.08, z: -1, w: W - 4, d: 0.16, color: '#ffe2b0', intensity: 1.2 });
  rug(world, { x: 0, z: 1.2, w: 7, d: 5, material: M.carpet() });

  const p = data.profile;
  sign(world, { title: data.owner.name, sub: data.owner.title, accent, x: 0, y: 3.3, z: -D / 2 + 0.17, rotY: 0, w: 4.4, h: 1.0 });

  desk(world, { x: 0, z: -3.6, w: 2.6, d: 1.0, top: M.wood() });
  deskMonitor(world, { x: -0.6, y: 0.76, z: -3.7, rotY: 0, accent, w: 0.8, h: 0.46 });
  deskMonitor(world, { x: 0.6, y: 0.76, z: -3.7, rotY: 0, accent, w: 0.8, h: 0.46 });
  chair(world, { x: 0, z: -4.6, rotY: Math.PI });
  world.interact({ x: 0, z: -3.6, radius: 4.2, label: 'Read my profile', action: () => game.openProfile() });

  for (const z of [-2.2, 0, 2.2]) bookshelf(world, { x: -W / 2 + 0.5, z, rotY: Math.PI / 2, w: 2, accent });
  sofa(world, { x: W / 2 - 1.3, z: 1, rotY: -Math.PI / 2, w: 2.4, color: '#4a4137' });
  table(world, { x: W / 2 - 3, z: 1, w: 0.8, d: 1.1 });
  plant(world, { x: W / 2 - 1, z: -3 });
  plant(world, { x: -W / 2 + 1, z: D / 2 - 1 });
  floorLamp(world, { x: W / 2 - 0.8, z: 3.4 });

  textBoard(world, {
    x: -5, z: -D / 2 + 0.28, rotY: 0, y: 1.1, w: 3.6, h: 2.2, accent,
    title: 'Areas of expertise', body: (p.expertise ?? []).join('. '),
    label: 'Read my profile', action: () => game.openProfile('expertise'),
  });
  textBoard(world, {
    x: 5, z: -D / 2 + 0.28, rotY: 0, y: 1.1, w: 3.6, h: 2.2, accent,
    title: 'How I work', body: p.philosophy ?? '',
    label: 'Read my philosophy', action: () => game.openProfile('philosophy'),
  });
  return world;
}
