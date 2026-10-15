import { M, FONT_BODY, FONT_DISPLAY } from '../../game/materials.js';
import { canvasPlane, sofa, plant, lightBar, rug, table, floorLamp } from '../../game/props.js';
import { createRoom, lighting, pointGlow, totem } from '../roomKit.js';

/* The last room: three totems (links, CV, message) and a wall that sums up your visit. */
export default function build(ctx, room) {
  const { data, progress, game } = ctx;
  const W = 18; const D = 16; const H = 4.8;
  const world = createRoom(ctx, room, {
    w: W, d: D, h: H, floor: M.wood(), wall: M.plaster(), floorTile: 2.4,
    ambient: { base: 98, bright: 0.55, floor: 'wood' }, bg: '#0f0e0c', fog: [24, 52],
  });
  const accent = room.accent;
  lighting(world, { hemi: 0.85, key: 0.8, color: '#ffe8c8', ground: '#5a4636' });
  pointGlow(world, '#ffd9a8', 32, 0, H - 1, -1, 18);
  lightBar(world, { x: 0, y: H - 0.08, z: -1, w: W - 4, d: 0.16, color: '#ffe2b0', intensity: 1.2 });
  rug(world, { x: 0, z: -1, w: 11, d: 5, material: M.carpet() });

  const c = data.contact;
  const hasLinks = !!(c.email || c.linkedin || c.github);
  totem(world, { x: -4.5, z: -2.6, title: 'Email and profiles', sub: hasLinks ? 'Open my links' : 'Not set up yet', accent, label: 'Open contact links', action: () => game.openContact('links') });
  totem(world, { x: 0, z: -3.4, title: 'Download CV', sub: data.cv.has_pdf ? 'PDF' : 'Printable page', accent, label: 'Download the CV', action: () => game.downloadCv() });
  totem(world, { x: 4.5, z: -2.6, title: 'Send a message', sub: c.form_enabled ? 'Write to me' : 'Form is switched off', accent, label: 'Write a message', enabled: () => !!c.form_enabled, action: () => game.openContact('form') });

  const wrap = canvasPlane(world, {
    w: 7, h: 2.6, x: 0, y: 1.8, z: -D / 2 + 0.2, px: 1000,
    draw: (g, w, h) => {
      g.fillStyle = '#0f1318'; g.fillRect(0, 0, w, h);
      g.fillStyle = accent; g.fillRect(0, 0, w, 10);
      g.textBaseline = 'top'; g.fillStyle = '#f2ede1'; g.font = `700 ${h * 0.14}px ${FONT_DISPLAY}`;
      g.fillText('Thanks for visiting', 44, 44);
      g.fillStyle = '#b4bbc6'; g.font = `500 ${h * 0.085}px ${FONT_BODY}`;
      g.fillText(`You explored ${progress.visitedCount} of ${data.rooms.length} rooms.`, 44, 44 + h * 0.24);
      g.fillText('Use the totems to get in touch.', 44, 44 + h * 0.38);
    },
  });
  world.onDispose(progress.onChange(() => wrap.redraw()));

  sofa(world, { x: -6.5, z: 4, rotY: Math.PI / 2, w: 2.4, color: '#4a4137' });
  sofa(world, { x: 6.5, z: 4, rotY: -Math.PI / 2, w: 2.4, color: '#4a4137' });
  table(world, { x: 0, z: 4.6, w: 1.3, d: 0.8 });
  plant(world, { x: -W / 2 + 1, z: -D / 2 + 1 });
  plant(world, { x: W / 2 - 1, z: -D / 2 + 1 });
  floorLamp(world, { x: W / 2 - 0.8, z: 6 });
  return world;
}
