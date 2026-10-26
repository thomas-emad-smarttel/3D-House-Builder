import * as THREE from 'three';
import { M, canvasTexture, makeCanvas, FONT_DISPLAY, FONT_BODY } from './materials.js';

const WALL_T = 0.28; // Wall thickness in meters

/**
 * Procedural textures specific to House Architecture
 */
const archTextures = {
  parquet: () => canvasTexture(1024, 1024, (g, w, h) => {
    // Herringbone parquet pattern
    g.fillStyle = '#9e754f';
    g.fillRect(0, 0, w, h);
    const cols = 8;
    const rows = 16;
    const cw = w / cols;
    const rh = h / rows;
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const isAlt = (i + j) % 2 === 0;
        g.fillStyle = isAlt ? '#a88057' : '#8d6541';
        g.fillRect(i * cw + 1, j * rh + 1, cw - 2, rh - 2);
        // wood grain lines
        g.strokeStyle = 'rgba(40, 20, 5, 0.15)';
        g.lineWidth = 1;
        for (let k = 0; k < 4; k++) {
          const yOff = j * rh + (k + 1) * (rh / 5);
          g.beginPath();
          g.moveTo(i * cw, yOff);
          g.lineTo((i + 1) * cw, yOff);
          g.stroke();
        }
      }
    }
  }, { repeat: true }),

  brick: () => canvasTexture(1024, 1024, (g, w, h) => {
    g.fillStyle = '#b35d46';
    g.fillRect(0, 0, w, h);
    const rows = 16;
    const bh = h / rows;
    const bw = bh * 2.2;
    g.fillStyle = '#c8cfd9'; // mortar
    g.lineWidth = 4;
    for (let r = 0; r < rows; r++) {
      const y = r * bh;
      const offset = (r % 2) * (bw / 2);
      g.strokeStyle = '#d6dbdf';
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(w, y);
      g.stroke();
      for (let x = -bw + offset; x <= w + bw; x += bw) {
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x, y + bh);
        g.stroke();
      }
    }
  }, { repeat: true }),

  stone: () => canvasTexture(1024, 1024, (g, w, h) => {
    g.fillStyle = '#a8a29e';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#78716c';
    g.lineWidth = 3;
    const r = (n) => ((Math.sin(n * 12.9898) * 43758.5453) % 1 + 1) / 2;
    for (let i = 0; i < 40; i++) {
      const bx = r(i * 3) * (w - 100);
      const by = r(i * 7) * (h - 60);
      const bw = 80 + r(i * 11) * 80;
      const bh = 40 + r(i * 13) * 40;
      g.fillStyle = `rgb(${150 + r(i * 5) * 40}, ${145 + r(i * 6) * 40}, ${140 + r(i * 8) * 40})`;
      g.fillRect(bx, by, bw, bh);
      g.strokeRect(bx, by, bw, bh);
    }
  }, { repeat: true }),
};

const archMatCache = new Map();
function getArchMaterial(key, factory) {
  if (!archMatCache.has(key)) {
    const mat = factory();
    mat.userData.shared = true;
    archMatCache.set(key, mat);
  }
  return archMatCache.get(key);
}

/**
 * Get standard material for floor finish
 */
export function getFloorMaterial(materialName) {
  const m = (materialName || 'parquet').toLowerCase();
  switch (m) {
    case 'parquet':
      return getArchMaterial('parquet', () => new THREE.MeshStandardMaterial({
        map: archTextures.parquet(),
        roughness: 0.38,
        metalness: 0.05,
      }));
    case 'marble':
      return M.marble();
    case 'tile':
      return M.tile();
    case 'hardwood':
    case 'wood':
      return M.wood();
    case 'concrete':
      return getArchMaterial('concrete', () => new THREE.MeshStandardMaterial({
        color: '#9ca3af',
        roughness: 0.75,
        metalness: 0.08,
      }));
    case 'carpet':
      return M.carpet();
    case 'granite':
      return M.graphite();
    default:
      return M.wood();
  }
}

/**
 * Get wall material
 */
export function getWallMaterial(wallStyle, wallColor = '#f3f4f6') {
  const s = (wallStyle || 'plaster').toLowerCase();
  switch (s) {
    case 'brick':
      return getArchMaterial('brick', () => new THREE.MeshStandardMaterial({
        map: archTextures.brick(),
        roughness: 0.85,
      }));
    case 'stone':
      return getArchMaterial('stone', () => new THREE.MeshStandardMaterial({
        map: archTextures.stone(),
        roughness: 0.8,
      }));
    case 'tile':
      return M.tile();
    case 'wood_panel':
      return M.wood();
    case 'plaster':
    default:
      return M.solid(wallColor || '#f3f4f6', { rough: 0.9, metal: 0.02 });
  }
}

/**
 * Build Floor Slab for a room with optional void opening (for stairs/atrium)
 */
export function buildFloorSlab(world, { x, y = 0, z, w, d, material, tile = 2.4, roomId, floorId, voidZone = null }) {
  const slabThickness = 0.3;
  const halfW = w / 2;
  const halfD = d / 2;

  let hasVoid = false;
  let vx1 = 0, vx2 = 0, vz1 = 0, vz2 = 0;
  if (voidZone) {
    const rx1 = x - halfW, rx2 = x + halfW;
    const rz1 = z - halfD, rz2 = z + halfD;
    vx1 = Math.max(rx1, voidZone.minX);
    vx2 = Math.min(rx2, voidZone.maxX);
    vz1 = Math.max(rz1, voidZone.minZ);
    vz2 = Math.min(rz2, voidZone.maxZ);
    if (vx2 - vx1 > 0.1 && vz2 - vz1 > 0.1) {
      hasVoid = true;
    }
  }

  const makeSlab = (sx, sz, sw, sd) => {
    if (sw < 0.05 || sd < 0.05) return null;
    const mesh = world.box({
      x: sx,
      y: y - slabThickness,
      z: sz,
      w: sw,
      h: slabThickness,
      d: sd,
      material,
      tile,
      cast: false,
      receive: true,
    });
    mesh.userData.isFloorSlab = true;
    if (roomId) mesh.userData.roomId = roomId;
    if (floorId) mesh.userData.floorId = floorId;
    return mesh;
  };

  if (!hasVoid) {
    return makeSlab(x, z, w, d);
  }

  const group = new THREE.Group();
  world.scene.add(group);

  const rx1 = x - halfW, rx2 = x + halfW;
  const rz1 = z - halfD, rz2 = z + halfD;

  if (vx1 > rx1) makeSlab((rx1 + vx1) / 2, z, vx1 - rx1, d);
  if (rx2 > vx2) makeSlab((vx2 + rx2) / 2, z, rx2 - vx2, d);
  if (vz1 > rz1) makeSlab((vx1 + vx2) / 2, (rz1 + vz1) / 2, vx2 - vx1, vz1 - rz1);
  if (rz2 > vz2) makeSlab((vx1 + vx2) / 2, (vz2 + rz2) / 2, vx2 - vx1, rz2 - vz2);

  return group;
}

/**
 * Build Ceiling ("Clining") with rich architectural styles
 */
export function buildCeiling(world, { x, y, z, w, d, ceilingType, ceilingColor = '#ffffff', roomId, floorId, voidZone = null }) {
  const type = (ceilingType || 'gypsum_led').toLowerCase();
  if (type === 'open_sky') {
    return null; // Rooftop or open balcony has no ceiling slab
  }

  const halfW = w / 2;
  const halfD = d / 2;
  let hasVoid = false;
  let vx1 = 0, vx2 = 0, vz1 = 0, vz2 = 0;
  if (voidZone) {
    const rx1 = x - halfW, rx2 = x + halfW;
    const rz1 = z - halfD, rz2 = z + halfD;
    vx1 = Math.max(rx1, voidZone.minX);
    vx2 = Math.min(rx2, voidZone.maxX);
    vz1 = Math.max(rz1, voidZone.minZ);
    vz2 = Math.min(rz2, voidZone.maxZ);
    if (vx2 - vx1 > 0.1 && vz2 - vz1 > 0.1) {
      hasVoid = true;
    }
  }

  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.userData.isCeiling = true;
  if (roomId) group.userData.roomId = roomId;
  if (floorId) group.userData.floorId = floorId;
  world.scene.add(group);

  const plasterMat = M.solid(ceilingColor, { rough: 0.92 });
  const woodMat = M.wood();
  const emissiveLed = M.emissive('#ffd9a0', 1.8);

  const makeCeilingPiece = (localX, localZ, pw, pd) => {
    if (pw < 0.05 || pd < 0.05) return null;
    return world.box({
      parent: group,
      x: localX,
      y: 0,
      z: localZ,
      w: pw,
      h: 0.2,
      d: pd,
      material: plasterMat,
      cast: false,
      receive: false,
    });
  };

  if (!hasVoid) {
    makeCeilingPiece(0, 0, w, d);
  } else {
    // Relative to ceiling group position (x, z)
    const lvx1 = vx1 - x, lvx2 = vx2 - x;
    const lvz1 = vz1 - z, lvz2 = vz2 - z;
    const lrx1 = -halfW, lrx2 = halfW;
    const lrz1 = -halfD, lrz2 = halfD;

    if (lvx1 > lrx1) makeCeilingPiece((lrx1 + lvx1) / 2, 0, lvx1 - lrx1, d);
    if (lrx2 > lvx2) makeCeilingPiece((lvx2 + lrx2) / 2, 0, lrx2 - lvx2, d);
    if (lvz1 > lrz1) makeCeilingPiece((lvx1 + lvx2) / 2, (lrz1 + lvz1) / 2, lvx2 - lvx1, lvz1 - lrz1);
    if (lrz2 > lvz2) makeCeilingPiece((lvx1 + lvx2) / 2, (lvz2 + lrz2) / 2, lvx2 - lvx1, lrz2 - lvz2);
  }

  if (type === 'gypsum_led' && !hasVoid) {
    // Gypsum dropped tray ceiling with hidden cove LED light around perimeter
    const margin = 0.8;
    const trayW = Math.max(1, w - margin * 2);
    const trayD = Math.max(1, d - margin * 2);
    const dropH = 0.12;

    world.box({
      parent: group,
      x: 0,
      y: -dropH,
      z: 0,
      w: trayW,
      h: dropH,
      d: trayD,
      material: plasterMat,
      cast: false,
      receive: false,
    });

    world.box({ parent: group, x: 0, y: -dropH / 2, z: -(trayD / 2 + 0.05), w: trayW, h: 0.03, d: 0.03, material: emissiveLed, cast: false });
    world.box({ parent: group, x: 0, y: -dropH / 2, z: (trayD / 2 + 0.05), w: trayW, h: 0.03, d: 0.03, material: emissiveLed, cast: false });
    world.box({ parent: group, x: -(trayW / 2 + 0.05), y: -dropH / 2, z: 0, w: 0.03, h: 0.03, d: trayD, material: emissiveLed, cast: false });
    world.box({ parent: group, x: (trayW / 2 + 0.05), y: -dropH / 2, z: 0, w: 0.03, h: 0.03, d: trayD, material: emissiveLed, cast: false });

    // Flush LED downlights at 4 corners
    const spots = [
      [-trayW * 0.35, -trayD * 0.35],
      [trayW * 0.35, -trayD * 0.35],
      [-trayW * 0.35, trayD * 0.35],
      [trayW * 0.35, trayD * 0.35],
    ];
    for (const [sx, sz] of spots) {
      world.cylinder({
        parent: group,
        x: sx,
        y: -dropH - 0.005,
        z: sz,
        r: 0.09,
        h: 0.02,
        material: emissiveLed,
        seg: 16,
      });
      // soft warm spot glow
      const pl = new THREE.PointLight('#ffe8c8', 12, 6, 2);
      pl.position.set(x + sx, y - dropH - 0.2, z + sz);
      world.scene.add(pl);
    }
  } else if (type === 'wood_beams') {
    // Exposed architectural wooden timber beams across the room depth
    const beamCount = Math.max(3, Math.round(w / 2.2));
    const beamW = 0.22;
    const beamH = 0.25;
    for (let i = 0; i < beamCount; i++) {
      const bx = -w / 2 + (w * (i + 0.5)) / beamCount;
      world.box({
        parent: group,
        x: bx,
        y: -beamH / 2,
        z: 0,
        w: beamW,
        h: beamH,
        d: d - 0.1,
        material: woodMat,
        cast: true,
        receive: false,
      });
    }
  } else if (type === 'coffered') {
    // Luxury coffered grid ceiling
    const cols = Math.max(2, Math.round(w / 3.0));
    const rows = Math.max(2, Math.round(d / 3.0));
    const gridH = 0.18;
    const ribW = 0.24;

    for (let i = 1; i < cols; i++) {
      const gx = -w / 2 + (w * i) / cols;
      world.box({
        parent: group,
        x: gx,
        y: -gridH / 2,
        z: 0,
        w: ribW,
        h: gridH,
        d: d - 0.1,
        material: woodMat,
      });
    }
    for (let j = 1; j < rows; j++) {
      const gz = -d / 2 + (d * j) / rows;
      world.box({
        parent: group,
        x: 0,
        y: -gridH / 2,
        z: gz,
        w: w - 0.1,
        h: gridH,
        d: ribW,
        material: woodMat,
      });
    }
  } else if (type === 'suspended') {
    // Suspended commercial grid tiles
    const tileMesh = world.box({
      parent: group,
      x: 0,
      y: -0.06,
      z: 0,
      w: w - 0.1,
      h: 0.05,
      d: d - 0.1,
      material: M.tile(),
      tile: 1.5,
    });
  }

  return group;
}

/**
 * Build an Architectural Door with frame, panels, handle, and interaction!
 */
export function buildArchitecturalDoor(world, {
  x,
  y = 0,
  z,
  rotY = 0,
  type = 'standard',
  width = 1.0,
  height = 2.2,
  material = 'wood',
  label = 'Door',
  accent = '#d9a85f',
}) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  world.scene.add(g);

  const frameT = 0.08;
  const frameD = WALL_T + 0.04;
  const frameMat = material === 'glass' ? M.solid('#1e293b', { rough: 0.3, metal: 0.8 }) : M.solid('#334155', { rough: 0.6 });
  const woodMat = M.wood();
  const glassMat = M.glass('#b8e2f8', 0.42);
  const handleMat = M.solid('#e2e8f0', { rough: 0.2, metal: 0.9 });
  const brassMat = M.solid('#d9a85f', { rough: 0.25, metal: 0.85 });

  // 1. Outer Frame (Left post, Right post, Top lintel)
  // Posts run from y = 0 to y = height
  world.box({ parent: g, x: -(width / 2 + frameT / 2), y: 0, z: 0, w: frameT, h: height, d: frameD, material: frameMat });
  world.box({ parent: g, x: (width / 2 + frameT / 2), y: 0, z: 0, w: frameT, h: height, d: frameD, material: frameMat });
  // Top lintel runs from y = height to y = height + frameT
  world.box({ parent: g, x: 0, y: height, z: 0, w: width + frameT * 2, h: frameT, d: frameD, material: frameMat });

  // 2. Door Panel Pivot Group (for smooth opening animation)
  const pivot = new THREE.Group();
  // Pivot placed at left frame hinge
  pivot.position.set(-width / 2, 0, 0);
  g.add(pivot);

  let pivotRight = null;
  let isOpen = false;

  // Door collider: blocks passage when door is closed, disabled when opened!
  let doorCollider = null;
  if (type !== 'arch') {
    doorCollider = world.collider(x, z, width, WALL_T, rotY);
  }

  if (type === 'front_entrance') {
    // Grand front entrance security door
    const panelThick = 0.07;
    const doorSlab = world.box({
      parent: pivot,
      x: width / 2,
      y: 0.01,
      z: 0,
      w: width - 0.02,
      h: height - 0.02,
      d: panelThick,
      material: M.solid('#1e293b', { rough: 0.4, metal: 0.4 }),
    });

    // Decorative brass vertical accent strip
    world.box({
      parent: doorSlab,
      x: width * 0.28,
      y: 0,
      z: panelThick / 2 + 0.005,
      w: 0.05,
      h: height - 0.3,
      d: 0.01,
      material: brassMat,
      cast: false,
    });

    // Modern vertical long pull bar handle
    world.cylinder({
      parent: doorSlab,
      x: width * 0.36,
      y: 0,
      z: panelThick / 2 + 0.04,
      r: 0.02,
      h: 1.2,
      material: brassMat,
      seg: 16,
    });
  } else if (type === 'double_french') {
    // Double French glass doors (two leafs swinging opposite)
    const leafW = (width - 0.04) / 2;
    const leafThick = 0.05;

    // Left Leaf on left pivot
    const leftLeaf = world.box({
      parent: pivot,
      x: leafW / 2,
      y: 0.01,
      z: 0,
      w: leafW,
      h: height - 0.02,
      d: leafThick,
      material: frameMat,
    });
    // Glass pane in left leaf
    world.box({
      parent: leftLeaf,
      x: 0,
      y: 0,
      z: 0,
      w: leafW - 0.16,
      h: height - 0.3,
      d: 0.015,
      material: glassMat,
      cast: false,
    });
    // Left handle
    world.cylinder({
      parent: leftLeaf,
      x: leafW / 2 - 0.06,
      y: -0.1,
      z: leafThick / 2 + 0.02,
      r: 0.015,
      h: 0.2,
      material: handleMat,
      seg: 12,
    });

    // Right Leaf on right pivot
    pivotRight = new THREE.Group();
    pivotRight.position.set(width / 2, 0, 0);
    g.add(pivotRight);

    const rightLeaf = world.box({
      parent: pivotRight,
      x: -leafW / 2,
      y: 0.01,
      z: 0,
      w: leafW,
      h: height - 0.02,
      d: leafThick,
      material: frameMat,
    });
    world.box({
      parent: rightLeaf,
      x: 0,
      y: 0,
      z: 0,
      w: leafW - 0.16,
      h: height - 0.3,
      d: 0.015,
      material: glassMat,
      cast: false,
    });
    world.cylinder({
      parent: rightLeaf,
      x: -(leafW / 2 - 0.06),
      y: -0.1,
      z: leafThick / 2 + 0.02,
      r: 0.015,
      h: 0.2,
      material: handleMat,
      seg: 12,
    });
  } else if (type === 'sliding_glass') {
    // Sliding patio glass door with top track
    const panelThick = 0.05;
    // Top track
    world.box({ parent: g, x: 0, y: height, z: 0, w: width * 1.5, h: 0.06, d: frameD + 0.04, material: frameMat });
    // Glass sliding pane
    const slab = world.box({
      parent: pivot,
      x: width / 2,
      y: 0.01,
      z: 0.04,
      w: width - 0.04,
      h: height - 0.02,
      d: panelThick,
      material: frameMat,
    });
    world.box({
      parent: slab,
      x: 0,
      y: 0,
      z: 0,
      w: width - 0.24,
      h: height - 0.24,
      d: 0.018,
      material: glassMat,
      cast: false,
    });
  } else if (type === 'arch') {
    // Clean open architectural arch (no door panel, decorative arch trim)
    const archMat = M.solid('#f1f5f9', { rough: 0.8 });
    world.cylinder({
      parent: g,
      x: 0,
      y: height - width / 4,
      z: 0,
      r: width / 2,
      h: frameD,
      rotX: Math.PI / 2,
      material: archMat,
      seg: 24,
    });
  } else if (type === 'barn_wood') {
    // Rustic modern sliding barn door
    const barnMat = M.wood();
    world.box({ parent: g, x: 0, y: height + 0.02, z: 0.12, w: width * 1.6, h: 0.06, d: 0.06, material: frameMat });
    const barnSlab = world.box({
      parent: pivot,
      x: width / 2,
      y: 0.01,
      z: 0.12,
      w: width + 0.08,
      h: height + 0.04,
      d: 0.05,
      material: barnMat,
    });
    // Metal diagonal Z-brace
    world.box({ parent: barnSlab, x: 0, y: 0, z: 0.03, w: width * 0.9, h: 0.08, d: 0.02, rotZ: 0.6, material: frameMat });
  } else {
    // Standard interior hinged door
    const doorSlab = world.box({
      parent: pivot,
      x: width / 2,
      y: 0.01,
      z: 0,
      w: width - 0.02,
      h: height - 0.02,
      d: 0.05,
      material: woodMat,
    });

    // Door handle & backplate
    world.box({ parent: doorSlab, x: width * 0.38, y: -0.1, z: 0.03, w: 0.04, h: 0.16, d: 0.01, material: handleMat });
    world.box({ parent: doorSlab, x: width * 0.38, y: -0.1, z: -0.03, w: 0.04, h: 0.16, d: 0.01, material: handleMat });
    // Lever handle
    world.box({ parent: doorSlab, x: width * 0.34, y: -0.08, z: 0.05, w: 0.12, h: 0.025, d: 0.02, material: handleMat });
    world.box({ parent: doorSlab, x: width * 0.34, y: -0.08, z: -0.05, w: 0.12, h: 0.025, d: 0.02, material: handleMat });
  }

  // Interactive door toggle (open / close)
  let interactItem = null;
  const getPrompt = () => `${isOpen ? 'Close' : 'Open'} ${label}`;

  if (type !== 'arch') {
    const toggleDoor = () => {
      isOpen = !isOpen;
      if (doorCollider) {
        doorCollider.enabled = !isOpen;
      }
      if (interactItem) {
        interactItem.label = getPrompt();
        if (world.ctx?.game?.interactions?.current === interactItem) {
          world.ctx.game.ui.hud.setPrompt(interactItem.label);
        }
      }

      const targetRot = isOpen ? -Math.PI * 0.48 : 0;
      const targetSlide = isOpen ? width * 0.85 : 0;

      // Animate smoothly
      const startRot = pivot.rotation.y;
      const startX = pivot.position.x;
      const startRightRot = pivotRight ? pivotRight.rotation.y : 0;
      const targetRightRot = isOpen ? Math.PI * 0.48 : 0;
      const startTime = performance.now();
      const duration = 350; // ms

      const step = (now) => {
        const progress = Math.min(1, (now - startTime) / duration);
        const ease = 1 - Math.pow(1 - progress, 3);
        if (type === 'sliding_glass' || type === 'barn_wood') {
          pivot.position.x = startX + (targetSlide - startX) * ease;
        } else {
          pivot.rotation.y = startRot + (targetRot - startRot) * ease;
          if (pivotRight) {
            pivotRight.rotation.y = startRightRot + (targetRightRot - startRightRot) * ease;
          }
        }
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    interactItem = world.interact({
      x,
      z,
      radius: 3.2,
      label: getPrompt,
      action: toggleDoor,
    });
  }

  return { group: g, toggle: () => {} };
}

/**
 * Build Architectural Window with glass, inner & outer frames, sill
 */
export function buildArchitecturalWindow(world, {
  x,
  y = 0,
  z,
  rotY = 0,
  width = 1.8,
  height = 1.5,
  sillHeight = 0.8,
  type = 'standard',
  frameColor = '#1e293b',
}) {
  const g = new THREE.Group();
  g.position.set(x, y + sillHeight, z);
  g.rotation.y = rotY;
  world.scene.add(g);

  const frameT = 0.07;
  const frameD = WALL_T + 0.05;
  const frameMat = M.solid(frameColor, { rough: 0.35, metal: 0.6 });
  const glassMat = M.glass('#b8e2f8', 0.42);
  const sillMat = M.marble();

  // 1. Window Sill (bottom ledge extending out)
  world.box({
    parent: g,
    x: 0,
    y: -0.04,
    z: 0,
    w: width + frameT * 2 + 0.12,
    h: 0.05,
    d: frameD + 0.10,
    material: sillMat,
  });

  // 2. Outer Window Frame (Left post, Right post, Top lintel)
  world.box({ parent: g, x: -(width / 2 + frameT / 2), y: 0, z: 0, w: frameT, h: height, d: frameD, material: frameMat });
  world.box({ parent: g, x: (width / 2 + frameT / 2), y: 0, z: 0, w: frameT, h: height, d: frameD, material: frameMat });
  world.box({ parent: g, x: 0, y: height, z: 0, w: width + frameT * 2, h: frameT, d: frameD, material: frameMat });

  // 3. Center Mullion (divider) if width >= 1.6m
  if (width >= 1.6) {
    world.box({ parent: g, x: 0, y: 0, z: 0, w: frameT * 0.7, h: height, d: frameD * 0.8, material: frameMat });
  }

  // 4. Subtle inner sash frame border (top & bottom rails)
  const sashH = 0.035;
  world.box({ parent: g, x: 0, y: 0, z: 0, w: width, h: sashH, d: frameD * 0.6, material: frameMat });
  world.box({ parent: g, x: 0, y: height - sashH, z: 0, w: width, h: sashH, d: frameD * 0.6, material: frameMat });

  // 5. Clear Translucent Double-Glazed Glass Pane (fully fills the opening between sashes)
  world.box({
    parent: g,
    x: 0,
    y: sashH,
    z: 0,
    w: width - 0.01,
    h: height - sashH * 2,
    d: 0.02,
    material: glassMat,
    cast: false,
  });

  return g;
}

/**
 * Builds Room Perimeter Walls with clean precision cutouts for all Doors and Windows!
 */
export function buildRoomWallsWithCutouts(world, {
  rx,
  ry = 0,
  rz,
  w,
  d,
  h,
  doors = [],
  windows = [],
  wallMaterial,
  accentColor = '#3b82f6',
  roomId,
  floorId,
}) {
  const halfW = w / 2;
  const halfD = d / 2;

  // Group doors and windows by wall: north, south, east, west
  const byWall = { north: [], south: [], east: [], west: [] };

  for (const dr of doors) {
    const wallKey = (dr.wall || 'south').toLowerCase();
    if (byWall[wallKey]) {
      byWall[wallKey].push({
        type: 'door',
        c: dr.offset || 0,
        w: Number(dr.width) || 1.2,
        h: Number(dr.height) || 2.2,
        y: 0,
        data: dr,
      });
    }
  }

  for (const win of windows) {
    const wallKey = (win.wall || 'north').toLowerCase();
    if (byWall[wallKey]) {
      byWall[wallKey].push({
        type: 'window',
        c: win.offset || 0,
        w: Number(win.width) || 1.8,
        h: Number(win.height) || 1.5,
        y: Number(win.sill_height) || 0.8,
        data: win,
      });
    }
  }

  // Helper to build a segmented wall along axis with openings
  function buildSegmentedWall({ axis, at, from, to, openings, inwardRot, wallKey }) {
    const sorted = [...openings].sort((a, b) => a.c - b.c);
    let cursor = from;

    const addSolid = (a, b, y = 0, segH = h, coll = true) => {
      const len = b - a;
      if (len < 0.02) return;
      const mid = (a + b) / 2;
      const mesh = world.box(axis === 'z'
        ? { x: at, y: ry + y, z: rz + mid, w: WALL_T, h: segH, d: len, material: wallMaterial, collide: coll }
        : { x: rx + mid, y: ry + y, z: at, w: len, h: segH, d: WALL_T, material: wallMaterial, collide: coll });
      mesh.userData.isWall = true;
      if (roomId) mesh.userData.roomId = roomId;
      if (floorId) mesh.userData.floorId = floorId;
      return mesh;
    };

    for (const op of sorted) {
      const leftEdge = op.c - op.w / 2;
      const rightEdge = op.c + op.w / 2;

      // Solid wall to the left of the opening
      addSolid(cursor, leftEdge);

      // Above the opening (lintel)
      const topOfOpening = op.y + op.h;
      if (h > topOfOpening) {
        addSolid(leftEdge, rightEdge, topOfOpening, h - topOfOpening, false);
      }

      // Below the opening (sill / wall under window)
      if (op.y > 0) {
        addSolid(leftEdge, rightEdge, 0, op.y, true);
      }

      // Instantiate the actual 3D Door or Window in the opening!
      const opX = axis === 'z' ? at : rx + op.c;
      const opZ = axis === 'x' ? at : rz + op.c;

      if (op.type === 'door') {
        const doorRes = buildArchitecturalDoor(world, {
          x: opX,
          y: ry,
          z: opZ,
          rotY: inwardRot,
          type: op.data.type || 'standard',
          width: op.w,
          height: op.h,
          material: op.data.material || 'wood',
          label: op.data.label || 'Door',
          accent: accentColor,
        });
        const doorGroup = doorRes?.group || doorRes;
        if (doorGroup) {
          doorGroup.userData.isDoor = true;
          doorGroup.userData.doorId = op.data.id || `${roomId}-door-${op.c}`;
          if (roomId) doorGroup.userData.roomId = roomId;
          if (floorId) doorGroup.userData.floorId = floorId;
        }
      } else if (op.type === 'window') {
        const winGroup = buildArchitecturalWindow(world, {
          x: opX,
          y: ry,
          z: opZ,
          rotY: inwardRot,
          width: op.w,
          height: op.h,
          sillHeight: op.y,
          type: op.data.type || 'standard',
        });
        if (winGroup) {
          winGroup.userData.isWindow = true;
          winGroup.userData.windowId = op.data.id || `${roomId}-win-${op.c}`;
          if (roomId) winGroup.userData.roomId = roomId;
          if (floorId) winGroup.userData.floorId = floorId;
        }
      }

      cursor = rightEdge;
    }

    // Remaining solid wall to the right of last opening
    addSolid(cursor, to);
  }

  // 1. South Wall (+Z)
  buildSegmentedWall({
    axis: 'x',
    at: rz + halfD,
    from: -halfW,
    to: halfW,
    openings: byWall.south,
    inwardRot: 0,
    wallKey: 'south',
  });

  // 2. North Wall (-Z)
  buildSegmentedWall({
    axis: 'x',
    at: rz - halfD,
    from: -halfW,
    to: halfW,
    openings: byWall.north,
    inwardRot: Math.PI,
    wallKey: 'north',
  });

  // 3. West Wall (-X)
  buildSegmentedWall({
    axis: 'z',
    at: rx - halfW,
    from: -halfD,
    to: halfD,
    openings: byWall.west,
    inwardRot: Math.PI / 2,
    wallKey: 'west',
  });

  // 4. East Wall (+X)
  buildSegmentedWall({
    axis: 'z',
    at: rx + halfW,
    from: -halfD,
    to: halfD,
    openings: byWall.east,
    inwardRot: -Math.PI / 2,
    wallKey: 'east',
  });
}

/**
 * Build Architectural Open-Riser Modern Luxury Stairs
 * Connects two elevations with wooden/marble treads, floating steel stringers,
 * glass balustrade with stainless handrail, and soft step lighting!
 */
export function buildArchitecturalStairs(world, {
  startX,
  startY = 0,
  startZ,
  endX,
  endY,
  endZ,
  width = 1.3,
  steps = 17,
  treadMaterial,
  stringerColor = '#1e293b',
  handrailColor = '#d4af37',
  hasBalustrade = true,
  name = 'Stairs',
}) {
  const g = new THREE.Group();
  world.scene.add(g);

  const riser = (endY - startY) / steps;
  const dx = endX - startX;
  const dz = endZ - startZ;
  const run = Math.hypot(dx, dz);
  const tread = run / steps;
  const angle = Math.atan2(dx, dz); // rotation around Y

  const woodMat = treadMaterial || M.wood();
  const steelMat = M.solid(stringerColor, { rough: 0.35, metal: 0.8 });
  const glassMat = M.glass('#b8e2f8', 0.35);
  const railMat = M.solid(handrailColor, { rough: 0.2, metal: 0.9 });
  const ledGlow = M.emissive('#ffd9a0', 1.2);

  // Position and orient group at bottom of stairs
  g.position.set(startX, startY, startZ);
  g.rotation.y = angle;

  // Build each step tread
  const treadH = 0.045;
  const treadOverhang = 0.03;
  const treadD = tread + treadOverhang;

  for (let i = 0; i < steps; i++) {
    const stepCenterZ = (i + 0.5) * tread;
    const stepBaseY = i * riser;

    // 1. Step Tread
    world.box({
      parent: g,
      x: 0,
      y: stepBaseY + riser - treadH,
      z: stepCenterZ,
      w: width,
      h: treadH,
      d: treadD,
      material: woodMat,
      receive: true,
      cast: true,
    });

    // 2. Hidden LED glow strip under each tread nosing
    world.box({
      parent: g,
      x: 0,
      y: stepBaseY + riser - treadH - 0.012,
      z: stepCenterZ + treadD / 2 - 0.02,
      w: width - 0.1,
      h: 0.01,
      d: 0.015,
      material: ledGlow,
      cast: false,
    });
  }

  // 3. Floating Twin Structural Steel Stringers under treads
  const stringerW = 0.08;
  const stringerH = 0.14;
  const slopeLen = Math.hypot(run, endY - startY);
  const pitchAngle = Math.atan2(endY - startY, run);

  const stringerPositions = [-width / 2 + 0.16, width / 2 - 0.16];
  for (const sx of stringerPositions) {
    const stringerGroup = new THREE.Group();
    stringerGroup.position.set(sx, (endY - startY) / 2, run / 2);
    stringerGroup.rotation.x = -pitchAngle;
    g.add(stringerGroup);

    world.box({
      parent: stringerGroup,
      x: 0,
      y: -stringerH / 2,
      z: 0,
      w: stringerW,
      h: stringerH,
      d: slopeLen,
      material: steelMat,
    });
  }

  // 4. Architectural Glass Balustrade & Handrail on open side
  if (hasBalustrade) {
    const balustradeH = 0.95;
    const railRadius = 0.024;
    const sideX = width / 2 + 0.02;

    // Glass panel running along the slope
    const glassGroup = new THREE.Group();
    glassGroup.position.set(sideX, (endY - startY) / 2 + balustradeH / 2, run / 2);
    glassGroup.rotation.x = -pitchAngle;
    g.add(glassGroup);

    world.box({
      parent: glassGroup,
      x: 0,
      y: 0,
      z: 0,
      w: 0.018,
      h: balustradeH,
      d: slopeLen + 0.2,
      material: glassMat,
      cast: false,
    });

    // Handrail
    const railGroup = new THREE.Group();
    railGroup.position.set(sideX, (endY - startY) / 2 + balustradeH, run / 2);
    railGroup.rotation.x = -pitchAngle;
    g.add(railGroup);

    world.cylinder({
      parent: railGroup,
      x: 0,
      y: 0,
      z: 0,
      r: railRadius,
      h: slopeLen + 0.25,
      rotX: Math.PI / 2,
      material: railMat,
      seg: 16,
    });
  }

  // 5. Register in world.stairs for smooth player climbing!
  world.stairs ||= [];
  world.stairs.push({
    name,
    bottom: { x: startX, y: startY, z: startZ },
    top: { x: endX, y: endY, z: endZ },
    minX: Math.min(startX, endX) - width / 2 - 0.4,
    maxX: Math.max(startX, endX) + width / 2 + 0.4,
    minZ: Math.min(startZ, endZ) - width / 2 - 0.4,
    maxZ: Math.max(startZ, endZ) + width / 2 + 0.4,
    width,
    run,
    startY,
    endY,
    dx,
    dz,
    lenSq: dx * dx + dz * dz,
  });

  return g;
}
