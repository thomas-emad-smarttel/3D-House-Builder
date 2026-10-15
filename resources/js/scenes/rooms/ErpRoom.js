import * as THREE from 'three';
import { M, wrapText, FONT_DISPLAY, FONT_BODY } from '../../game/materials.js';
import { column, desk, deskMonitor, canvasPlane, labelSprite, lightBar, moduleScreen } from '../../game/props.js';
import { createRoom, lighting, pointGlow, overviewPodium } from '../roomKit.js';
import { STATUS } from '../../config/settings.js';

/*
 * The flagship. 44 x 52 x 11.5 m: roughly four times the floor area of any other room.
 *
 *   - a holographic ERP core on an inlaid floor, with one glowing node per module
 *     (node colour = status, brighter once you have opened that module)
 *   - three module zones: two long walls of consoles and a back wall
 *   - a wall-sized "module map" diagram and floating illustrative dashboards
 *   - nothing here claims real figures: charts have no numbers and say so
 */
export default function build(ctx, room) {
  const W = 44; const D = 52; const H = 11.5;
  const { progress } = ctx;
  const world = createRoom(ctx, room, {
    w: W, d: D, h: H,
    floor: M.ink(), wall: M.ink(), ceiling: M.graphite(), floorTile: 3,
    ambient: { base: 82, bright: 0.75, floor: 'metal' },
    bg: '#070a10', fog: [45, 120],
  });
  const scene = world.scene;
  const accent = room.accent;
  const mods = room.modules;
  const coreZ = -4;

  /* ---------------------------------------------------------- lighting */
  lighting(world, { sky: '#a9bcff', ground: '#1b1510', hemi: 0.55, color: '#cfd8ff', key: 0.6 });
  const coreLight = pointGlow(world, accent, 180, 0, 6.2, coreZ, 34);
  pointGlow(world, '#ffd9a0', 90, -14, 7, 12, 26);
  pointGlow(world, '#ffd9a0', 90, 14, 7, 12, 26);
  pointGlow(world, '#9db8ff', 70, 0, 7, -19, 26);
  pointGlow(world, '#ffd9a0', 60, 0, 6, 19, 20);

  /* ------------------------------------------------ ceiling structure */
  const truss = M.graphite();
  for (let z = -D / 2 + 4; z <= D / 2 - 3; z += 8) {
    world.box({ x: 0, y: H - 0.45, z, w: W - 0.4, h: 0.3, d: 0.34, material: truss, cast: false });
    lightBar(world, { x: 0, y: H - 0.52, z, w: W - 6, d: 0.1, color: z % 16 === 0 ? '#ffd9a0' : '#bcd0ff', intensity: 1.3 });
  }
  for (const x of [-14, 14]) world.box({ x, y: H - 0.45, z: 0, w: 0.34, h: 0.3, d: D - 0.4, material: truss, cast: false });

  /* ----------------------------------------------- floor inlay and path */
  const ringMat = (op) => M.unlit(accent, op);
  [[4.2, 4.28, 1], [6.8, 6.86, 0.7], [9.8, 9.86, 0.5]].forEach(([a, b, op]) => {
    const r = new THREE.Mesh(new THREE.RingGeometry(a, b, 96), ringMat(op));
    r.rotation.x = -Math.PI / 2; r.position.set(0, 0.04, coreZ); scene.add(r);
  });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(4.2, 64), M.unlit('#0a0f18', 0.9));
  disc.rotation.x = -Math.PI / 2; disc.position.set(0, 0.03, coreZ); scene.add(disc);
  // guide path from the door to the core
  const pathLen = D / 2 - (coreZ + 9.8);
  world.box({ x: 0, y: 0.02, z: coreZ + 9.8 + pathLen / 2, w: 0.14, h: 0.02, d: pathLen, material: M.emissive(accent, 1.1), cast: false });

  /* ----------------------------------------------------- holographic core */
  world.cylinder({ x: 0, z: coreZ, r: 2.0, rTop: 1.7, h: 0.7, material: M.graphite(), collide: true, seg: 40 });
  world.cylinder({ x: 0, z: coreZ, y: 0.7, r: 1.7, h: 0.05, material: M.emissive(accent, 1.6), seg: 40, cast: false });

  const coreY = 3.6;
  const shell = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.55, 1)),
    new THREE.LineBasicMaterial({ color: accent, transparent: true, opacity: 0.95 }),
  );
  const inner = new THREE.Mesh(new THREE.IcosahedronGeometry(0.8, 1), M.emissive('#fff3d6', 2.6));
  const ringA = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.018, 8, 96), M.unlit(accent, 0.9));
  const ringB = new THREE.Mesh(new THREE.TorusGeometry(2.9, 0.014, 8, 96), M.unlit('#ffffff', 0.5));
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.07, H - coreY - 0.5, 12, 1, true),
    M.unlit(accent, 0.35, true),
  );
  beam.position.set(0, coreY + (H - coreY - 0.5) / 2, coreZ);
  for (const o of [shell, inner, ringA, ringB]) { o.position.set(0, coreY, coreZ); scene.add(o); }
  scene.add(beam);

  /* module nodes orbiting the core, wired to it, with data pulses */
  const nodes = mods.map((m, i) => {
    const a = (i / Math.max(1, mods.length)) * Math.PI * 2 - Math.PI / 2;
    const r = 4.8;
    const pos = new THREE.Vector3(Math.cos(a) * r, coreY - 0.2 + Math.sin(i * 1.7) * 0.35, coreZ + Math.sin(a) * r);
    const color = STATUS[m.status]?.color ?? STATUS.planned.color;
    const mat = M.emissive(color, 1.2);
    const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.3), mat);
    mesh.position.copy(pos); mesh.castShadow = true; scene.add(mesh);
    labelSprite(world, m.name, { x: pos.x, y: pos.y + 0.75, z: pos.z, scale: 0.62, accent: color });

    const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, coreY, coreZ), pos]);
    scene.add(new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: accent, transparent: true, opacity: 0.45 })));
    const pulse = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), M.unlit('#ffffff'));
    scene.add(pulse);
    // spoke on the floor towards the node
    world.box({ x: Math.cos(a) * 7.05, y: 0.035, z: coreZ + Math.sin(a) * 7.05, w: 5.4, h: 0.01, d: 0.04, rotY: -a, material: M.emissive(color, 0.7), cast: false });
    return { m, mesh, mat, pulse, pos, phase: i * 0.37 };
  });
  const from = new THREE.Vector3(0, coreY, coreZ);

  world.onUpdate((dt, t) => {
    shell.rotation.y += dt * 0.35; shell.rotation.x = Math.sin(t * 0.4) * 0.2;
    inner.rotation.y -= dt * 0.8;
    inner.scale.setScalar(1 + Math.sin(t * 2) * 0.05);
    ringA.rotation.x = Math.PI / 2 + Math.sin(t * 0.5) * 0.35; ringA.rotation.y += dt * 0.5;
    ringB.rotation.x = Math.PI / 2 - Math.sin(t * 0.4) * 0.3; ringB.rotation.z += dt * 0.3;
    coreLight.intensity = 175 + Math.sin(t * 2) * 25;
    for (const n of nodes) {
      const viewed = progress.hasModule(room.id, n.m.id);
      n.mat.emissiveIntensity = viewed ? 2.8 : 1.2;
      n.mesh.rotation.y += dt * 1.2;
      n.mesh.position.y = n.pos.y + Math.sin(t * 1.3 + n.phase) * 0.08;
      n.pulse.position.lerpVectors(from, n.mesh.position, (t * 0.35 + n.phase) % 1);
    }
  });

  /* ------------------------------------------------------ module bays */
  const bayW = 4.4; const bayH = 2.7;
  const leftZ = [-14, -4, 6, 16]; const rightZ = [-14, -4, 6, 16]; const backX = [-10, 0, 10];
  const slots = [
    ...leftZ.slice(0, 3).map((z) => ({ x: -W / 2 + 0.28, z, rotY: Math.PI / 2 })),
    ...rightZ.slice(0, 3).map((z) => ({ x: W / 2 - 0.28, z, rotY: -Math.PI / 2 })),
    ...backX.map((x) => ({ x, z: -D / 2 + 0.28, rotY: 0 })),
    { x: -W / 2 + 0.28, z: leftZ[3], rotY: Math.PI / 2 },
    { x: W / 2 - 0.28, z: rightZ[3], rotY: -Math.PI / 2 },
  ];
  mods.forEach((m, i) => {
    const s = slots[i];
    if (!s) { console.warn(`[erp] no bay left for module "${m.name}"`); return; }
    moduleScreen(world, room, m, { ...s, y: 1.0, w: bayW, h: bayH, radius: 5 });
    // console desk in front of the display, with two small monitors
    const nx = Math.sin(s.rotY); const nz = Math.cos(s.rotY);
    const tx = Math.cos(s.rotY); const tz = -Math.sin(s.rotY); // along the wall
    const cx = s.x + nx * 0.95; const cz = s.z + nz * 0.95;
    desk(world, { x: cx, z: cz, rotY: s.rotY, w: bayW, d: 0.7, top: M.graphite() });
    for (const k of [-1, 1]) {
      deskMonitor(world, { x: cx + tx * k * 1.2, y: 0.76, z: cz + tz * k * 1.2, rotY: s.rotY, w: 0.7, h: 0.4, accent });
    }
  });

  /* ---------------------------------------------- module map (back wall) */
  const drawMap = (g, w, h, t) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = 'rgba(8,12,20,0.92)'; g.fillRect(0, 0, w, h);
    g.strokeStyle = accent; g.globalAlpha = 0.7; g.lineWidth = 3; g.strokeRect(6, 6, w - 12, h - 12); g.globalAlpha = 1;
    g.textBaseline = 'middle';
    g.fillStyle = '#f2ede1'; g.font = `700 ${h * 0.085}px ${FONT_DISPLAY}`; g.textAlign = 'left';
    g.fillText('How the modules connect', 40, h * 0.12);
    g.fillStyle = '#8f98a6'; g.font = `500 ${h * 0.045}px ${FONT_BODY}`; g.textAlign = 'right';
    g.fillText('Illustrative module map', w - 40, h * 0.12);

    const hub = { x: w / 2, y: h * 0.34 };
    const rows = mods.length > 5 ? [mods.slice(0, 5), mods.slice(5)] : [mods];
    const bw = w * 0.165; const bh = h * 0.19;
    const pts = [];
    rows.forEach((row, ri) => {
      row.forEach((m, i) => {
        const x = w / 2 + (i - (row.length - 1) / 2) * (bw + w * 0.02);
        const y = h * (0.62 + ri * 0.24);
        pts.push({ m, x, y });
      });
    });
    // links + pulses
    pts.forEach((p, i) => {
      g.strokeStyle = accent; g.globalAlpha = 0.4; g.lineWidth = 2;
      g.beginPath(); g.moveTo(hub.x, hub.y + h * 0.06); g.lineTo(p.x, p.y - bh / 2); g.stroke(); g.globalAlpha = 1;
      const k = (t * 0.4 + i * 0.17) % 1;
      g.fillStyle = '#fff'; g.beginPath();
      g.arc(hub.x + (p.x - hub.x) * k, hub.y + h * 0.06 + (p.y - bh / 2 - hub.y - h * 0.06) * k, 5, 0, Math.PI * 2); g.fill();
    });
    // hub
    g.fillStyle = accent; g.beginPath(); g.arc(hub.x, hub.y, h * 0.09, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#10141a'; g.font = `700 ${h * 0.06}px ${FONT_DISPLAY}`; g.textAlign = 'center';
    g.fillText('ERP', hub.x, hub.y);
    // module boxes
    pts.forEach(({ m, x, y }) => {
      const st = STATUS[m.status] ?? STATUS.planned;
      g.fillStyle = '#141a24'; g.fillRect(x - bw / 2, y - bh / 2, bw, bh);
      g.fillStyle = st.color; g.fillRect(x - bw / 2, y - bh / 2, 8, bh);
      g.fillStyle = '#e9e4d6'; g.textAlign = 'left'; g.textBaseline = 'top';
      g.font = `600 ${h * 0.05}px ${FONT_BODY}`;
      wrapText(g, m.name, x - bw / 2 + 24, y - bh / 2 + bh * 0.16, bw - 36, h * 0.058, 3);
      g.textBaseline = 'middle';
    });
  };
  const map = canvasPlane(world, { w: 22, h: 6.2, x: 0, y: 7.1, z: -D / 2 + 0.2, px: 1792, draw: drawMap });

  /* ------------------------------------- floating illustrative dashboards */
  const drawBoard = (seed) => (g, w, h, t) => {
    g.fillStyle = 'rgba(8,12,20,0.86)'; g.fillRect(0, 0, w, h);
    g.strokeStyle = accent; g.globalAlpha = 0.8; g.lineWidth = 2; g.strokeRect(3, 3, w - 6, h - 6); g.globalAlpha = 1;
    g.fillStyle = '#8f98a6'; g.font = `500 ${h * 0.065}px ${FONT_BODY}`; g.textBaseline = 'top'; g.textAlign = 'left';
    g.fillText('Illustrative visualisation, not real data', 18, 14);
    const n = 14; const bw = (w - 60) / n;
    for (let i = 0; i < n; i++) {
      const v = 0.4 + 0.28 * Math.sin(t * 1.2 + i * 0.7 + seed) + 0.14 * Math.sin(t * 0.6 + i * 1.9);
      g.fillStyle = i % 4 === 0 ? '#ffffff' : accent; g.globalAlpha = 0.85;
      g.fillRect(30 + i * bw, h * 0.92 - v * h * 0.55, bw * 0.7, v * h * 0.55);
    }
    g.globalAlpha = 1; g.strokeStyle = '#ffffff'; g.lineWidth = 2; g.beginPath();
    for (let i = 0; i <= 40; i++) {
      const y = h * 0.38 + Math.sin(t * 0.9 + i * 0.3 + seed) * h * 0.08 + Math.sin(i * 0.11 + seed) * h * 0.06;
      i ? g.lineTo(30 + (i / 40) * (w - 60), y) : g.moveTo(30, y);
    }
    g.stroke();
  };
  const boards = [[-15.5, 6.6, -14, 1], [15.5, 6.6, -14, 2], [-16, 6.4, 9, 3], [16, 6.4, 9, 4]].map(([x, y, z, seed]) => {
    const rotY = Math.atan2(0 - x, coreZ - z);
    return canvasPlane(world, { w: 6.4, h: 3.4, x, y, z, rotY, px: 640, draw: drawBoard(seed), opacity: 0.94 });
  });
  let tick = 0;
  world.onUpdate((dt, t) => {
    tick += dt;
    if (tick > 0.12) {
      tick = 0;
      map.redraw(t);
      boards.forEach((b) => b.redraw(t));
    }
    boards.forEach((b, i) => { b.mesh.position.y += Math.sin(t * 0.8 + i) * 0.0015; });
  });

  /* ---------------------------------------------- data layer (decor) */
  for (let i = 0; i < 5; i++) {
    world.cylinder({ x: 16, z: -20, y: 0.4 + i * 0.55, r: 1.3, h: 0.3, material: M.graphite(), cast: true, seg: 36 });
    world.cylinder({ x: 16, z: -20, y: 0.7 + i * 0.55, r: 1.32, h: 0.04, material: M.emissive(accent, 1.2), cast: false, seg: 36 });
  }
  world.cylinder({ x: 16, z: -20, r: 0.35, h: 0.4, material: M.graphite(), collide: true });
  world.collider(16, -20, 2.7, 2.7);
  labelSprite(world, 'Data layer', { x: 16, y: 3.6, z: -20, scale: 0.7, accent });

  /* ------------------------------------------------------- architecture */
  for (let z = -20; z <= 20; z += 10) {
    column(world, { x: -17, z, h: H, accent });
    column(world, { x: 17, z, h: H, accent });
  }

  /* ---------------------------------------------------------- podiums */
  overviewPodium(world, room, { x: -3, z: 19, title: 'ERP overview', label: 'Read the ERP overview' });
  overviewPodium(world, room, { x: 0, z: -D / 2 + 5.2, title: 'System architecture', label: 'Read how the ERP fits together' });

  return world;
}
