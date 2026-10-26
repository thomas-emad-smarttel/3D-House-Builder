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
  const hex = wallColor || '#f3f4f6';
  const colorObj = new THREE.Color(hex);
  const cacheKey = `wall:${s}:${hex}`;

  return getArchMaterial(cacheKey, () => {
    let mat;
    switch (s) {
      case 'brick':
        mat = new THREE.MeshStandardMaterial({
          map: archTextures.brick(),
          color: colorObj,
          roughness: 0.85,
        });
        break;
      case 'stone':
        mat = new THREE.MeshStandardMaterial({
          map: archTextures.stone(),
          color: colorObj,
          roughness: 0.8,
        });
        break;
      case 'tile':
        mat = new THREE.MeshStandardMaterial({
          map: M.tile().map,
          color: colorObj,
          roughness: 0.35,
        });
        break;
      case 'wood_panel':
        mat = new THREE.MeshStandardMaterial({
          map: M.wood().map,
          color: colorObj,
          roughness: 0.55,
        });
        break;
      case 'plaster':
      default:
        mat = new THREE.MeshStandardMaterial({
          map: M.plaster().map,
          color: colorObj,
          roughness: 0.92,
          metalness: 0.02,
        });
        break;
    }
    // Render back-faces to shadow map to completely eliminate self-shadow acne on walls
    mat.shadowSide = THREE.BackSide;
    return mat;
  });
}

/**
 * Build Floor Slab for a room with optional void opening (for stairs/atrium)
 */
export function buildFloorSlab(world, { x, y = 0, z, w, d, material, tile = 2.4, roomId, floorId, voidZone = null }) {
  const slabThickness = 0.28;
  if (!voidZone) {
    const mesh = world.box({
      x,
      y: y - slabThickness,
      z,
      w,
      h: slabThickness,
      d,
      material,
      tile,
      cast: false,
      receive: true,
    });
    mesh.userData.isFloorSlab = true;
    if (roomId) mesh.userData.roomId = roomId;
    if (floorId) mesh.userData.floorId = floorId;
    return mesh;
  }

  // Segment slab around voidZone (e.g. stairwell opening)
  const g = new THREE.Group();
  world.scene.add(g);
  const minX = x - w / 2;
  const maxX = x + w / 2;
  const minZ = z - d / 2;
  const maxZ = z + d / 2;

  const vMinX = Math.max(minX, voidZone.minX);
  const vMaxX = Math.min(maxX, voidZone.maxX);
  const vMinZ = Math.max(minZ, voidZone.minZ);
  const vMaxZ = Math.min(maxZ, voidZone.maxZ);

  // Left of void
  if (vMinX > minX) {
    const leftW = vMinX - minX;
    world.box({
      parent: g,
      x: minX + leftW / 2,
      y: y - slabThickness,
      z,
      w: leftW,
      h: slabThickness,
      d,
      material,
      tile,
      cast: false,
      receive: true,
    });
  }
  // Right of void
  if (maxX > vMaxX) {
    const rightW = maxX - vMaxX;
    world.box({
      parent: g,
      x: vMaxX + rightW / 2,
      y: y - slabThickness,
      z,
      w: rightW,
      h: slabThickness,
      d,
      material,
      tile,
      cast: false,
      receive: true,
    });
  }
  // Top of void
  if (vMinZ > minZ) {
    const topD = vMinZ - minZ;
    world.box({
      parent: g,
      x: (vMinX + vMaxX) / 2,
      y: y - slabThickness,
      z: minZ + topD / 2,
      w: vMaxX - vMinX,
      h: slabThickness,
      d: topD,
      material,
      tile,
      cast: false,
      receive: true,
    });
  }
  // Bottom of void
  if (maxZ > vMaxZ) {
    const bottomD = maxZ - vMaxZ;
    world.box({
      parent: g,
      x: (vMinX + vMaxX) / 2,
      y: y - slabThickness,
      z: vMaxZ + bottomD / 2,
      w: vMaxX - vMinX,
      h: slabThickness,
      d: bottomD,
      material,
      tile,
      cast: false,
      receive: true,
    });
  }
  g.userData.isFloorSlab = true;
  if (roomId) g.userData.roomId = roomId;
  if (floorId) g.userData.floorId = floorId;
  return g;
}

/**
 * Build Ceiling ("Clining") with rich architectural styles
 */
export function buildCeiling(world, { x, y, z, w, d, ceilingType, ceilingColor = '#ffffff', roomId, floorId, voidZone = null }) {
  const type = (ceilingType || 'gypsum_led').toLowerCase();
  if (type === 'open_sky') {
    return null; // Rooftop or open balcony has no ceiling slab
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

  // Ceilings sit below the upper floor structure (floor slabs sit from y - 0.28 to y)
  // Placing the ceiling base at y: -0.32 with height 0.04 means its top is at -0.28 (flush with bottom of floor slab above)
  // and its bottom is at -0.32. It CANNOT touch or Z-fight with upper floor materials.
  const ceilingThick = 0.04;
  const ceilingY = -0.30;

  if (!voidZone) {
    world.box({
      parent: group,
      x: 0,
      y: ceilingY,
      z: 0,
      w,
      h: ceilingThick,
      d,
      material: plasterMat,
      cast: false,
      receive: false,
    });
  } else {
    // Segment base slab around the stairwell opening
    const minX = -w / 2;
    const maxX = w / 2;
    const minZ = -d / 2;
    const maxZ = d / 2;

    const vMinX = Math.max(minX, voidZone.minX - x);
    const vMaxX = Math.min(maxX, voidZone.maxX - x);
    const vMinZ = Math.max(minZ, voidZone.minZ - z);
    const vMaxZ = Math.min(maxZ, voidZone.maxZ - z);

    if (vMinX > minX) {
      const leftW = vMinX - minX;
      world.box({ parent: group, x: minX + leftW / 2, y: ceilingY, z: 0, w: leftW, h: ceilingThick, d, material: plasterMat, cast: false, receive: false });
    }
    if (maxX > vMaxX) {
      const rightW = maxX - vMaxX;
      world.box({ parent: group, x: vMaxX + rightW / 2, y: ceilingY, z: 0, w: rightW, h: ceilingThick, d, material: plasterMat, cast: false, receive: false });
    }
    if (vMinZ > minZ) {
      const topD = vMinZ - minZ;
      world.box({ parent: group, x: (vMinX + vMaxX) / 2, y: ceilingY, z: minZ + topD / 2, w: vMaxX - vMinX, h: ceilingThick, d: topD, material: plasterMat, cast: false, receive: false });
    }
    if (maxZ > vMaxZ) {
      const bottomD = maxZ - vMaxZ;
      world.box({ parent: group, x: (vMinX + vMaxX) / 2, y: ceilingY, z: vMaxZ + bottomD / 2, w: vMaxX - vMinX, h: ceilingThick, d: bottomD, material: plasterMat, cast: false, receive: false });
    }
  }

  if (type === 'gypsum_led' && !voidZone) {
    // Gypsum dropped tray ceiling with hidden cove LED light around perimeter
    const margin = 0.8;
    const trayW = Math.max(1, w - margin * 2);
    const trayD = Math.max(1, d - margin * 2);
    const dropH = 0.12;

    world.box({
      parent: group,
      x: 0,
      y: ceilingY - dropH,
      z: 0,
      w: trayW,
      h: dropH,
      d: trayD,
      material: plasterMat,
      cast: false,
      receive: false,
    });

    world.box({ parent: group, x: 0, y: ceilingY - dropH / 2, z: -(trayD / 2 + 0.05), w: trayW, h: 0.03, d: 0.03, material: emissiveLed, cast: false });
    world.box({ parent: group, x: 0, y: ceilingY - dropH / 2, z: (trayD / 2 + 0.05), w: trayW, h: 0.03, d: 0.03, material: emissiveLed, cast: false });
    world.box({ parent: group, x: -(trayW / 2 + 0.05), y: ceilingY - dropH / 2, z: 0, w: 0.03, h: 0.03, d: trayD, material: emissiveLed, cast: false });
    world.box({ parent: group, x: (trayW / 2 + 0.05), y: ceilingY - dropH / 2, z: 0, w: 0.03, h: 0.03, d: trayD, material: emissiveLed, cast: false });

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
        y: ceilingY - dropH - 0.005,
        z: sz,
        r: 0.09,
        h: 0.02,
        material: emissiveLed,
        seg: 16,
        cast: false,
      });
    }
  } else if (type === 'wood_beams' && !voidZone) {
    // Exposed architectural wooden timber beams across the room depth
    const beamCount = Math.max(3, Math.round(w / 2.2));
    const beamW = 0.22;
    const beamH = 0.22;
    for (let i = 0; i < beamCount; i++) {
      const bx = -w / 2 + (w * (i + 0.5)) / beamCount;
      world.box({
        parent: group,
        x: bx,
        y: ceilingY - beamH,
        z: 0,
        w: beamW,
        h: beamH,
        d: d - 0.1,
        material: woodMat,
        cast: true,
        receive: false,
      });
    }
  } else if (type === 'coffered' && !voidZone) {
    // Luxury coffered grid ceiling
    const cols = Math.max(2, Math.round(w / 3.0));
    const rows = Math.max(2, Math.round(d / 3.0));
    const gridH = 0.16;
    const ribW = 0.24;

    for (let i = 1; i < cols; i++) {
      const gx = -w / 2 + (w * i) / cols;
      world.box({
        parent: group,
        x: gx,
        y: ceilingY - gridH,
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
        y: ceilingY - gridH,
        z: gz,
        w: w - 0.1,
        h: gridH,
        d: ribW,
        material: woodMat,
      });
    }
  } else if (type === 'suspended' && !voidZone) {
    // Suspended commercial grid tiles
    world.box({
      parent: group,
      x: 0,
      y: ceilingY - 0.05,
      z: 0,
      w: w - 0.1,
      h: 0.04,
      d: d - 0.1,
      material: M.tile(),
      tile: 1.5,
    });
  }

  return group;
}

/**
 * Build Architectural Stairs between floors with floating/solid treads, stringers, balustrade, and LED glow
 */
export function buildArchitecturalStairs(world, {
  id = 'stairs-main',
  startX = 0,
  startY = 0,
  startZ = 0,
  endX = 0,
  endY = 3.4,
  endZ = 4.0,
  width = 1.3,
  steps = 18,
  style = 'floating_wood',
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
  const run = Math.hypot(dx, dz) || 0.001;
  const tread = run / steps;
  const angle = Math.atan2(dx, dz); // rotation around Y

  const isMarble = style === 'marble' || style === 'marble_modern';
  const woodMat = isMarble ? M.marble() : M.wood();
  const steelMat = isMarble
    ? M.solid('#d4af37', { rough: 0.25, metal: 0.88 })
    : M.solid(stringerColor, { rough: 0.35, metal: 0.8 });
  const glassMat = M.glass('#b8e2f8', 0.35);
  const railMat = isMarble
    ? M.solid('#d4af37', { rough: 0.15, metal: 0.95 })
    : M.solid(handrailColor, { rough: 0.2, metal: 0.9 });
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
      tile: 1.5,
    });

    // 2. LED glow line under tread
    world.box({
      parent: g,
      x: 0,
      y: stepBaseY + riser - treadH - 0.008,
      z: stepCenterZ + treadD / 2 - 0.015,
      w: width - 0.08,
      h: 0.008,
      d: 0.015,
      material: ledGlow,
      cast: false,
    });

    // 3. Optional solid riser
    if (style === 'solid' || style === 'marble') {
      world.box({
        parent: g,
        x: 0,
        y: stepBaseY + (riser - treadH) / 2,
        z: stepCenterZ - treadD / 2 + 0.015,
        w: width,
        h: riser - treadH,
        d: 0.03,
        material: steelMat,
      });
    }
  }

  // 4. Central Spine Stringer
  const spineW = 0.22;
  const spineH = 0.16;
  const spineSlopeLen = Math.hypot(run, endY - startY);
  const pitchAngle = Math.atan2(endY - startY, run);

  world.box({
    parent: g,
    x: 0,
    y: (endY - startY) / 2 - 0.16,
    z: run / 2,
    w: spineW,
    h: spineH,
    d: spineSlopeLen,
    rotX: -pitchAngle,
    centerY: true,
    material: steelMat,
  });

  // 5. Glass Balustrade & Metallic Handrail
  if (hasBalustrade) {
    const balustradeH = 0.95;
    const glassThick = 0.015;
    const leftRailX = -(width / 2) + 0.03;
    const rightRailX = width / 2 - 0.03;

    // Right Glass Balustrade Panel
    world.box({
      parent: g,
      x: rightRailX,
      y: (endY - startY) / 2 + balustradeH / 2,
      z: run / 2,
      w: glassThick,
      h: balustradeH,
      d: spineSlopeLen,
      rotX: -pitchAngle,
      centerY: true,
      material: glassMat,
      cast: false,
    });

    // Left Glass Balustrade Panel
    world.box({
      parent: g,
      x: leftRailX,
      y: (endY - startY) / 2 + balustradeH / 2,
      z: run / 2,
      w: glassThick,
      h: balustradeH,
      d: spineSlopeLen,
      rotX: -pitchAngle,
      centerY: true,
      material: glassMat,
      cast: false,
    });

    // Right Polished Handrail
    world.box({
      parent: g,
      x: rightRailX,
      y: (endY - startY) / 2 + balustradeH,
      z: run / 2,
      w: 0.045,
      h: 0.045,
      d: spineSlopeLen,
      rotX: -pitchAngle,
      centerY: true,
      material: railMat,
    });

    // Left Polished Handrail
    world.box({
      parent: g,
      x: leftRailX,
      y: (endY - startY) / 2 + balustradeH,
      z: run / 2,
      w: 0.045,
      h: 0.045,
      d: spineSlopeLen,
      rotX: -pitchAngle,
      centerY: true,
      material: railMat,
    });
  }

  // Register with world.stairs for collision and climbing
  if (!world.stairs) world.stairs = [];
  const minX = Math.min(startX, endX) - width;
  const maxX = Math.max(startX, endX) + width;
  const minZ = Math.min(startZ, endZ) - 0.8;
  const maxZ = Math.max(startZ, endZ) + 0.8;
  const stairRun = Math.hypot(dx, dz) || 0.001;
  const ux = dx / stairRun;
  const uz = dz / stairRun;
  const vx = dz / stairRun;
  const vz = -dx / stairRun;

  world.stairs.push({
    id,
    name,
    minX,
    maxX,
    minZ,
    maxZ,
    startY,
    endY,
    bottom: { x: startX, z: startZ },
    top: { x: endX, z: endZ },
    dx,
    dz,
    run: stairRun,
    ux,
    uz,
    vx,
    vz,
    lenSq: dx * dx + dz * dz,
    width,
    halfWidth: width / 2,
  });

  g.userData.isStairs = true;
  g.userData.stairsId = id;
  g.traverse((child) => {
    child.userData.isStairs = true;
    child.userData.stairsId = id;
  });

  return g;
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

  const frameT = 0.06;
  const frameD = WALL_T - 0.004; // Recessed 2mm inside wall opening to eliminate coplanar z-fighting with wall plaster
  const frameMat = material === 'glass' ? M.solid('#1e293b', { rough: 0.3, metal: 0.8 }) : M.solid('#334155', { rough: 0.6 });
  const woodMat = M.wood();
  const glassMat = M.glass('#b8e2f8', 0.42);
  const handleMat = M.solid('#e2e8f0', { rough: 0.2, metal: 0.9 });
  const brassMat = M.solid('#d9a85f', { rough: 0.25, metal: 0.85 });

  // 1. Outer Frame (Left post, Right post, Top lintel)
  // Perfectly seated INSIDE the wall opening cutout (-width/2 to +width/2):
  world.box({ parent: g, x: -(width / 2 - frameT / 2), y: 0, z: 0, w: frameT, h: height, d: frameD, material: frameMat });
  world.box({ parent: g, x: (width / 2 - frameT / 2), y: 0, z: 0, w: frameT, h: height, d: frameD, material: frameMat });
  // Top lintel runs inside cutout from x = -width/2 to +width/2
  world.box({ parent: g, x: 0, y: height - frameT / 2, z: 0, w: width, h: frameT, d: frameD, material: frameMat });

  const innerW = Math.max(0.2, width - frameT * 2);
  const innerH = Math.max(0.2, height - frameT);

  // 2. Door Panel Pivot Group (for smooth opening animation)
  const pivot = new THREE.Group();
  const closedPivotX = -(width / 2 - frameT);
  const openPivotX = closedPivotX + width * 0.82;
  // Pivot placed at left frame hinge (or sliding resting position)
  pivot.position.set(closedPivotX, 0, 0);
  g.add(pivot);

  let pivotRight = null;
  let isOpen = false;

  // Door collider: blocks passage when door is closed, disabled when opened!
  // Inset by 4cm on each side so it never wedges against adjacent wall colliders
  let doorCollider = null;
  if (type !== 'arch') {
    doorCollider = world.collider(x, z, Math.max(0.6, width - 0.08), WALL_T, rotY, y, y + height);
  }

  if (type === 'front_entrance') {
    // Grand front entrance security door
    const panelThick = 0.06;
    const doorSlab = world.box({
      parent: pivot,
      x: innerW / 2,
      y: 0.01,
      z: 0,
      w: innerW - 0.01,
      h: innerH - 0.01,
      d: panelThick,
      material: M.solid('#1e293b', { rough: 0.4, metal: 0.4 }),
      cast: false,
    });

    // Horizontal architectural shadow reveal grooves on door slab
    for (const gy of [-0.6, -0.2, 0.2, 0.6]) {
      world.box({
        parent: doorSlab,
        x: 0,
        y: gy,
        z: 0,
        w: innerW - 0.04,
        h: 0.012,
        d: panelThick + 0.004,
        centerY: true,
        material: M.solid('#0f172a', { rough: 0.8 }),
        cast: false,
      });
    }

    // Modern Luxury Vertical Pull Bar Handle (Both Front & Back of Door)
    const handleH = 0.85;
    const handleX = innerW * 0.35;
    const handleR = 0.018;

    for (const side of [1, -1]) {
      const handleZ = side * (panelThick / 2 + 0.045);
      const standoffZ = side * (panelThick / 2 + 0.022);

      // Vertical Pull Bar
      world.cylinder({
        parent: doorSlab,
        x: handleX,
        y: -0.05,
        z: handleZ,
        r: handleR,
        h: handleH,
        centerY: true,
        material: brassMat,
        seg: 16,
        cast: false,
      });

      // Top & Bottom Standoff Mounts
      for (const my of [-0.05 - handleH * 0.38, -0.05 + handleH * 0.38]) {
        world.cylinder({
          parent: doorSlab,
          x: handleX,
          y: my,
          z: standoffZ,
          r: 0.012,
          h: 0.045,
          rotX: Math.PI / 2,
          centerY: true,
          material: brassMat,
          seg: 12,
          cast: false,
        });
      }

      // Sleek Keyless Smart Lock Escutcheon Plate
      world.box({
        parent: doorSlab,
        x: handleX,
        y: -0.05,
        z: side * (panelThick / 2 + 0.005),
        w: 0.04,
        h: 0.18,
        d: 0.008,
        centerY: true,
        material: M.solid('#0f172a', { rough: 0.3, metal: 0.8 }),
        cast: false,
      });
    }
  } else if (type === 'double_french') {
    // Double French glass doors (two leafs swinging opposite)
    const leafW = innerW / 2;
    const leafThick = 0.05;

    // Left Leaf on left pivot
    const leftLeaf = world.box({
      parent: pivot,
      x: leafW / 2,
      y: 0.01,
      z: 0,
      w: leafW - 0.01,
      h: innerH - 0.01,
      d: leafThick,
      material: frameMat,
      cast: false,
    });
    // Glass pane in left leaf
    world.box({
      parent: leftLeaf,
      x: 0,
      y: 0,
      z: 0,
      w: leafW - 0.14,
      h: innerH - 0.24,
      d: 0.015,
      centerY: true,
      material: glassMat,
      cast: false,
    });
    // Left handles (front and back)
    for (const side of [1, -1]) {
      world.cylinder({
        parent: leftLeaf,
        x: leafW / 2 - 0.05,
        y: -0.1,
        z: side * (leafThick / 2 + 0.02),
        r: 0.015,
        h: 0.2,
        centerY: true,
        material: handleMat,
        seg: 12,
        cast: false,
      });
    }

    // Right Leaf on right pivot
    pivotRight = new THREE.Group();
    pivotRight.position.set(width / 2 - frameT, 0, 0);
    g.add(pivotRight);

    const rightLeaf = world.box({
      parent: pivotRight,
      x: -leafW / 2,
      y: 0.01,
      z: 0,
      w: leafW - 0.01,
      h: innerH - 0.01,
      d: leafThick,
      material: frameMat,
      cast: false,
    });
    world.box({
      parent: rightLeaf,
      x: 0,
      y: 0,
      z: 0,
      w: leafW - 0.14,
      h: innerH - 0.24,
      d: 0.015,
      centerY: true,
      material: glassMat,
      cast: false,
    });
    for (const side of [1, -1]) {
      world.cylinder({
        parent: rightLeaf,
        x: -(leafW / 2 - 0.05),
        y: -0.1,
        z: side * (leafThick / 2 + 0.02),
        r: 0.015,
        h: 0.2,
        centerY: true,
        material: handleMat,
        seg: 12,
        cast: false,
      });
    }
  } else if (type === 'sliding_glass') {
    // Sliding patio glass door with top track and clear glass panel
    const sashT = 0.05;
    const panelThick = 0.04;
    // Top track inside opening
    world.box({ parent: g, x: 0, y: height - frameT / 2, z: 0, w: width - 0.01, h: frameT, d: frameD, material: frameMat, cast: false });

    const slidingGroup = new THREE.Group();
    slidingGroup.position.set(innerW / 2, 0, 0.02);
    pivot.add(slidingGroup);

    // Outer sash frame (perimeter stiles and rails)
    world.box({ parent: slidingGroup, x: -(innerW / 2 - sashT / 2), y: 0, z: 0, w: sashT, h: innerH - 0.01, d: panelThick, material: frameMat, cast: false });
    world.box({ parent: slidingGroup, x: innerW / 2 - sashT / 2, y: 0, z: 0, w: sashT, h: innerH - 0.01, d: panelThick, material: frameMat, cast: false });
    world.box({ parent: slidingGroup, x: 0, y: innerH - sashT - 0.01, z: 0, w: innerW - sashT * 2, h: sashT, d: panelThick, material: frameMat, cast: false });
    world.box({ parent: slidingGroup, x: 0, y: 0.01, z: 0, w: innerW - sashT * 2, h: sashT, d: panelThick, material: frameMat, cast: false });

    // Center clear transparent glass pane
    world.box({
      parent: slidingGroup,
      x: 0,
      y: sashT + 0.01,
      z: 0,
      w: Math.max(0.1, innerW - sashT * 2 - 0.01),
      h: Math.max(0.1, innerH - sashT * 2 - 0.02),
      d: 0.016,
      material: glassMat,
      cast: false,
    });

    // Sleek vertical pull handle
    world.box({ parent: slidingGroup, x: innerW * 0.38, y: innerH * 0.45, z: panelThick / 2 + 0.02, w: 0.03, h: 0.35, d: 0.02, centerY: true, material: handleMat, cast: false });
    world.box({ parent: slidingGroup, x: innerW * 0.38, y: innerH * 0.45, z: -(panelThick / 2 + 0.02), w: 0.03, h: 0.35, d: 0.02, centerY: true, material: handleMat, cast: false });
  } else if (type === 'arch') {
    // Open cased architectural portal / archway between rooms:
    // Completely clear walk-through passage without any door panel or obstructing cylinder.
  } else if (type === 'barn_wood') {
    // Rustic modern sliding barn door
    const barnMat = M.wood();
    world.box({ parent: g, x: 0, y: height + 0.04, z: 0.12, w: width * 1.3, h: 0.05, d: 0.05, material: frameMat, cast: false });
    const barnSlab = world.box({
      parent: pivot,
      x: innerW / 2,
      y: 0.01,
      z: 0.12,
      w: width + 0.06,
      h: height + 0.04,
      d: 0.045,
      material: barnMat,
      cast: false,
    });
    // Metal diagonal Z-brace
    world.box({ parent: barnSlab, x: 0, y: 0, z: 0.025, w: width * 0.85, h: 0.06, d: 0.015, rotZ: 0.6, centerY: true, material: frameMat, cast: false });
  } else {
    // Standard interior hinged door
    const doorSlab = world.box({
      parent: pivot,
      x: innerW / 2,
      y: 0.01,
      z: 0,
      w: innerW - 0.01,
      h: innerH - 0.01,
      d: 0.045,
      material: woodMat,
      cast: false,
    });

    // Door handle & backplate (both sides)
    for (const side of [1, -1]) {
      world.box({ parent: doorSlab, x: innerW * 0.38, y: -0.1, z: side * 0.03, w: 0.04, h: 0.16, d: 0.01, centerY: true, material: handleMat, cast: false });
      world.box({ parent: doorSlab, x: innerW * 0.34, y: -0.08, z: side * 0.05, w: 0.12, h: 0.025, d: 0.02, centerY: true, material: handleMat, cast: false });
    }
  }

  // Interactive door toggle (open / close)
  let interactItem = null;
  const getPrompt = () => `${isOpen ? 'Close' : 'Open'} ${label}`;

  if (type !== 'arch') {
    const toggleDoor = () => {
      // If closing, ensure player is not standing inside doorway to avoid wedging/trapping
      if (isOpen && world.ctx?.game?.player) {
        const pl = world.ctx.game.player;
        const pDist = Math.hypot(pl.x - x, pl.z - z);
        const pElev = pl.y || 0;
        if (pDist < Math.max(0.9, width * 0.45) && Math.abs(pElev - y) < 2.0) {
          return; // Player is inside doorway; safe guard prevents trapping
        }
      }

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
      const targetSlide = isOpen ? openPivotX : closedPivotX;

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
      y,
      z,
      radius: 2.2,
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

  // Solid Window Glass Collider: Blocks player from jumping or walking through glass windows!
  world.collider(x, z, width, WALL_T, rotY, y + sillHeight, y + sillHeight + height);

  const frameT = 0.055;
  const frameD = WALL_T - 0.004; // Recessed 2mm inside wall opening to eliminate coplanar z-fighting with wall plaster
  const frameMat = M.solid(frameColor, { rough: 0.3, metal: 0.65 });
  const glassMat = M.glass('#c8e4f5', 0.32);
  const sillMat = M.marble();

  // 1. Window Sill (bottom marble ledge with exterior & interior overhang)
  world.box({
    parent: g,
    x: 0,
    y: -0.025,
    z: 0,
    w: width + 0.08,
    h: 0.04,
    d: WALL_T + 0.08,
    material: sillMat,
  });

  const innerW = Math.max(0.2, width - frameT * 2);
  const innerH = Math.max(0.2, height - frameT * 2);

  // 2. Outer Window Frame (Left post, Right post, Top lintel, Bottom rail)
  // Perfectly fills the entire wall opening cutout (-width/2 to +width/2, 0 to height):
  world.box({ parent: g, x: -(width / 2 - frameT / 2), y: 0, z: 0, w: frameT, h: height, d: frameD, material: frameMat });
  world.box({ parent: g, x: (width / 2 - frameT / 2), y: 0, z: 0, w: frameT, h: height, d: frameD, material: frameMat });
  world.box({ parent: g, x: 0, y: height - frameT, z: 0, w: innerW, h: frameT, d: frameD, material: frameMat });
  world.box({ parent: g, x: 0, y: 0, z: 0, w: innerW, h: frameT, d: frameD, material: frameMat });

  // 3. Architectural Mullions (Dividers)
  const mullionW = frameT * 0.7;
  const mullionD = frameD * 0.85;

  if (width >= 2.6) {
    // 3-section panorama window with dual vertical mullions
    world.box({ parent: g, x: -innerW / 4, y: frameT, z: 0, w: mullionW, h: innerH, d: mullionD, material: frameMat });
    world.box({ parent: g, x: innerW / 4, y: frameT, z: 0, w: mullionW, h: innerH, d: mullionD, material: frameMat });
  } else if (width >= 1.3) {
    // 2-section window with central vertical mullion
    world.box({ parent: g, x: 0, y: frameT, z: 0, w: mullionW, h: innerH, d: mullionD, material: frameMat });
  }

  // Optional upper transom horizontal bar for tall architectural windows (height >= 2.0m)
  if (height >= 2.0) {
    world.box({ parent: g, x: 0, y: frameT + innerH * 0.7, z: 0, w: innerW, h: frameT * 0.6, d: mullionD, material: frameMat });
  }

  // 4. Double-Glazed Glass Pane (fully spans the inner opening from bottom rail to top lintel)
  world.box({
    parent: g,
    x: 0,
    y: frameT + 0.002,
    z: 0,
    w: innerW - 0.004,
    h: innerH - 0.004,
    d: 0.018,
    material: glassMat,
    cast: false,
  });

  return g;
}

/**
 * Modern Architectural Balcony Railing (Glass panels + Stainless Steel handrail & base plinth)
 */
export function buildBalconyRailing(world, {
  axis = 'x',
  at,
  from,
  to,
  ry = 0,
  rx = 0,
  rz = 0,
  roomId,
  floorId,
  wallKey,
}) {
  const length = Math.abs(to - from);
  if (length < 0.1) return null;
  const mid = (from + to) / 2;
  const railH = 1.05;
  const group = new THREE.Group();
  world.scene.add(group);

  const glassMat = M.glass('#9fd4ff', 0.28);
  const metalMat = M.solid('#1e293b', { rough: 0.25, metal: 0.85 });

  const px = axis === 'z' ? at : rx + mid;
  const pz = axis === 'x' ? at : rz + mid;

  // Base metallic plinth
  world.box({
    parent: group,
    x: px,
    y: ry,
    z: pz,
    w: axis === 'x' ? length : 0.08,
    h: 0.08,
    d: axis === 'z' ? length : 0.08,
    material: metalMat,
  });

  // Full-height safety railing collider (prevents walking or jumping over balcony edges)
  world.collider(
    px,
    pz,
    axis === 'x' ? length : 0.12,
    axis === 'z' ? length : 0.12,
    0,
    ry,
    ry + railH + 0.25
  );

  // Architectural safety glass panel
  world.box({
    parent: group,
    x: px,
    y: ry + 0.08,
    z: pz,
    w: axis === 'x' ? length : 0.02,
    h: railH - 0.14,
    d: axis === 'z' ? length : 0.02,
    material: glassMat,
    cast: false,
    receive: false,
  });

  // Sleek ergonomic handrail
  world.box({
    parent: group,
    x: px,
    y: ry + railH - 0.06,
    z: pz,
    w: axis === 'x' ? length : 0.07,
    h: 0.06,
    d: axis === 'z' ? length : 0.07,
    material: metalMat,
    cast: true,
    collide: true,
  });

  group.userData.isWall = true;
  group.userData.isRailing = true;
  group.userData.wallKey = wallKey;
  if (roomId) group.userData.roomId = roomId;
  if (floorId) group.userData.floorId = floorId;
  return group;
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
  wallMaterialsByWall = {},
  accentColor = '#3b82f6',
  roomId,
  floorId,
  isBalcony = false,
  skipWalls = {},
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
    if (skipWalls && skipWalls[wallKey]) {
      return; // Boundary is shared and built by adjacent room, or skipped for balcony!
    }

    if (isBalcony) {
      // Modern terrace/balcony balustrade instead of high concrete wall
      buildBalconyRailing(world, { axis, at, from, to, ry, rx, rz, roomId, floorId, wallKey });
      return;
    }

    const sorted = [...openings].sort((a, b) => a.c - b.c);
    let cursor = from;
    const currentWallMaterial = wallMaterialsByWall[wallKey] || wallMaterial;

    const addSolid = (a, b, y = 0, segH = h, coll = true) => {
      const len = b - a;
      if (len < 0.02) return;
      const mid = (a + b) / 2;
      const mesh = world.box(axis === 'z'
        ? { x: at, y: ry + y, z: rz + mid, w: WALL_T, h: segH, d: len, material: currentWallMaterial, collide: coll }
        : { x: rx + mid, y: ry + y, z: at, w: len, h: segH, d: WALL_T, material: currentWallMaterial, collide: coll });
      mesh.userData.isWall = true;
      mesh.userData.wallKey = wallKey;
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
        addSolid(leftEdge, rightEdge, topOfOpening, h - topOfOpening, true);
      }

      // Below the opening (sill / wall under window)
      if (op.y > 0) {
        addSolid(leftEdge, rightEdge, 0, op.y, true);
      }

      // Instantiate the actual 3D Door or Window in the opening!
      const opX = axis === 'z' ? at : rx + op.c;
      const opZ = axis === 'x' ? at : rz + op.c;

      if (op.type === 'door') {
        const doorId = op.data.id || `${roomId}-door-${wallKey}-${Math.round(op.c * 10)}`;
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
          doorGroup.userData.doorId = doorId;
          doorGroup.userData.wallKey = wallKey;
          if (roomId) doorGroup.userData.roomId = roomId;
          if (floorId) doorGroup.userData.floorId = floorId;

          doorGroup.traverse((child) => {
            child.userData.isDoor = true;
            child.userData.doorId = doorId;
            child.userData.wallKey = wallKey;
            if (roomId) child.userData.roomId = roomId;
            if (floorId) child.userData.floorId = floorId;
          });

          if (world.doors) {
            world.doors.set(doorId, doorGroup);
          }
        }
      } else if (op.type === 'window') {
        const windowId = op.data.id || `${roomId}-win-${wallKey}-${Math.round(op.c * 10)}`;
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
          winGroup.userData.windowId = windowId;
          winGroup.userData.wallKey = wallKey;
          if (roomId) winGroup.userData.roomId = roomId;
          if (floorId) winGroup.userData.floorId = floorId;

          winGroup.traverse((child) => {
            child.userData.isWindow = true;
            child.userData.windowId = windowId;
            child.userData.wallKey = wallKey;
            if (roomId) child.userData.roomId = roomId;
            if (floorId) child.userData.floorId = floorId;
          });

          if (world.windows) {
            world.windows.set(windowId, winGroup);
          }
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

/* ================================================================ ARCHITECTURAL HIGH-SPEED ELEVATOR */

let activeElevatorModal = null;

export function showElevatorModal(world, elDef, floors, currentLevel, ctx) {
  if (activeElevatorModal) return;

  if (ctx?.game) {
    ctx.game.suppressPause = true;
    ctx.game.busy = true;
    ctx.game.releasePointer?.();
  } else if (document.pointerLockElement) {
    try { document.exitPointerLock(); } catch { /* ignore */ }
  }

  const elX = Number(elDef.x ?? 0);
  const elZ = Number(elDef.z ?? -3.6);
  const depth = Number(elDef.depth ?? 3.6);

  const backdrop = document.createElement('div');
  backdrop.className = 'elevator-modal-backdrop';
  backdrop.style.cssText = `
    position: fixed; inset: 0; z-index: 99999;
    background: rgba(8, 12, 22, 0.88); backdrop-filter: blur(10px);
    display: flex; align-items: center; justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #f8fafc;
  `;

  // Modal Card
  const card = document.createElement('div');
  card.style.cssText = `
    background: linear-gradient(145deg, #182234, #0b1120);
    border: 2px solid #d4af37;
    box-shadow: 0 25px 60px rgba(0,0,0,0.8), 0 0 35px rgba(212,175,55,0.25);
    border-radius: 20px; width: 92%; max-width: 680px; max-height: 88vh;
    display: flex; flex-direction: column; overflow: hidden;
  `;

  // Header
  const head = document.createElement('div');
  head.style.cssText = `
    padding: 20px 24px 16px; border-bottom: 1px solid rgba(212,175,55,0.3);
    display: flex; align-items: center; justify-content: space-between;
    background: linear-gradient(90deg, rgba(212,175,55,0.12), transparent);
  `;
  head.innerHTML = `
    <div>
      <div style="display:flex;align-items:center;gap:10px;">
        <span style="font-size:1.8rem;">🛗</span>
        <div>
          <h2 style="margin:0;font-size:1.25rem;font-weight:700;color:#f8fafc;letter-spacing:1px;">THE GRAND CELESTIAL HOTEL</h2>
          <div style="font-size:0.82rem;color:#d4af37;font-weight:600;letter-spacing:0.5px;">EXPRESS HIGH-SPEED SKYLINE ELEVATOR</div>
        </div>
      </div>
    </div>
    <button type="button" class="close-btn" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);color:#cbd5e1;font-size:1.2rem;width:34px;height:34px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;">✕</button>
  `;

  // Current Floor Status Indicator
  const currentFloorObj = floors.find((f) => f.level === currentLevel) || floors[0];
  const statusBar = document.createElement('div');
  statusBar.style.cssText = `
    padding: 10px 24px; background: rgba(0,0,0,0.35); font-size:0.85rem;
    display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.06);
  `;
  statusBar.innerHTML = `
    <span style="color:#94a3b8;">Current Location:</span>
    <span style="color:#38bdf8;font-weight:600;">Level ${currentLevel} — ${currentFloorObj?.name || 'Floor ' + currentLevel}</span>
  `;

  // Floors Grid
  const list = document.createElement('div');
  list.style.cssText = `
    padding: 16px 20px; overflow-y: auto; flex: 1;
    display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 10px;
  `;

  // Helper to cleanly close modal without pause menu interference
  const closeElevatorModal = () => {
    activeElevatorModal = null;
    backdrop.remove();
    if (ctx?.game) {
      ctx.game.suppressPause = false;
      ctx.game.busy = false;
      if (ctx.game.state === 'pause') {
        ctx.game.ui?.menus?.closePause?.();
        ctx.game.setState('play');
      }
      ctx.game.capturePointer?.();
    }
  };

  // Sort floors descending: Level 19 down to 0 (penthouse on top)
  const sortedFloors = [...floors].sort((a, b) => (b.level ?? 0) - (a.level ?? 0));

  sortedFloors.forEach((fl) => {
    const isCurrent = fl.level === currentLevel;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.style.cssText = `
      display: flex; align-items: center; gap: 12px; padding: 10px 14px;
      border-radius: 12px; cursor: ${isCurrent ? 'default' : 'pointer'};
      border: 1px solid ${isCurrent ? '#10b981' : 'rgba(212,175,55,0.25)'};
      background: ${isCurrent ? 'rgba(16,185,129,0.18)' : 'rgba(255,255,255,0.04)'};
      color: #f8fafc; text-align: left; transition: all 0.15s ease;
    `;

    const badge = document.createElement('span');
    badge.style.cssText = `
      display: inline-flex; align-items: center; justify-content: center;
      width: 38px; height: 38px; border-radius: 8px; font-weight: 700; font-size: 0.95rem;
      background: ${isCurrent ? '#10b981' : 'linear-gradient(135deg, #d4af37, #92400e)'};
      color: #0b1120; flex-shrink: 0; box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    `;
    badge.textContent = fl.level;

    const info = document.createElement('div');
    info.style.cssText = 'flex: 1; min-width: 0;';
    info.innerHTML = `
      <div style="font-weight: 600; font-size: 0.88rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: ${isCurrent ? '#10b981' : '#f1f5f9'};">
        ${fl.name}
      </div>
      <div style="font-size: 0.76rem; color: #94a3b8;">${isCurrent ? '● YOU ARE HERE' : 'Select to travel'}</div>
    `;

    btn.append(badge, info);

    if (!isCurrent) {
      btn.onmouseenter = () => {
        btn.style.borderColor = '#d4af37';
        btn.style.background = 'rgba(212,175,55,0.15)';
        btn.style.transform = 'translateY(-1px)';
      };
      btn.onmouseleave = () => {
        btn.style.borderColor = 'rgba(212,175,55,0.25)';
        btn.style.background = 'rgba(255,255,255,0.04)';
        btn.style.transform = 'none';
      };
      btn.onclick = async () => {
        activeElevatorModal = null;
        backdrop.remove();

        const targetElev = Number(fl.elevation ?? (fl.level * 3.4));

        try {
          ctx?.audio?.door?.();
        } catch { /* ignore */ }

        // Fade wipe transition
        if (ctx?.ui?.fade) {
          await ctx.ui.fade.out(450, {
            color: '#080c16',
            title: `🛗 Traveling to Level ${fl.level} — ${fl.name}…`,
          });
        }

        // Teleport player
        if (ctx?.game?.player) {
          const p = ctx.game.player;
          const isSouth = (elDef.facing || 'south') === 'south';
          p.x = elX;
          p.z = isSouth ? (elZ + depth / 2 + 0.9) : (elZ - depth / 2 - 0.9);
          p.y = targetElev;
          p.currentElevation = targetElev;
          p.targetElevation = targetElev;
          p.vy = 0;
          p.isGrounded = true;
          p.yaw = isSouth ? 0 : Math.PI;
        }

        // Update activeFloorLevel if in editor mode
        if (ctx?.game && ctx.game.activeFloorLevel !== undefined && ctx.game.activeFloorLevel !== 'all') {
          ctx.game.activeFloorLevel = fl.level;
          ctx.game.rebuildWorld?.();
        }

        if (ctx?.ui?.hud) {
          ctx.ui.hud.setRoom(fl.name, '#d4af37');
        }

        if (ctx?.ui?.fade) {
          await ctx.ui.fade.in(400);
        }

        // Restore game state cleanly without pause menu
        if (ctx?.game) {
          ctx.game.suppressPause = false;
          ctx.game.busy = false;
          if (ctx.game.state === 'pause') {
            ctx.game.ui?.menus?.closePause?.();
            ctx.game.setState('play');
          }
          ctx.game.capturePointer?.();
        }
      };
    }

    list.append(btn);
  });

  const closeBtn = head.querySelector('.close-btn');
  closeBtn.onclick = closeElevatorModal;
  backdrop.onclick = (e) => {
    if (e.target === backdrop) {
      closeElevatorModal();
    }
  };

  card.append(head, statusBar, list);
  backdrop.append(card);
  activeElevatorModal = backdrop;
  document.body.append(backdrop);
}

export function buildArchitecturalElevator(world, elDef, floors, ctx, activeLevel = 'all') {
  const elX = Number(elDef.x ?? 0);
  const elZ = Number(elDef.z ?? -3.6);
  const width = Number(elDef.width ?? 3.6);
  const depth = Number(elDef.depth ?? 3.6);
  const height = Number(elDef.height ?? 3.2);
  const facing = elDef.facing || 'south';
  const isSouth = facing === 'south';

  const frameMat = M.solid('#334155', { metal: 0.85, rough: 0.25 });
  const goldTrim = M.solid('#d4af37', { metal: 0.9, rough: 0.2 });
  const doorMat = M.solid('#475569', { metal: 0.8, rough: 0.2 });
  const darkGlass = M.solid('#090d16', { metal: 0.5, rough: 0.1 });
  const cabinFloorMat = getFloorMaterial('marble');

  const doorZ = isSouth ? (elZ + depth / 2) : (elZ - depth / 2);
  const sign = isSouth ? 1 : -1;

  for (const fl of floors) {
    const elev = Number(fl.elevation ?? (fl.level * 3.4));

    if (activeLevel !== 'all' && fl.level !== activeLevel) {
      continue;
    }

    // 1. Elevator Portal on this floor
    // Left & Right Portal Pillars
    world.box({
      x: elX - 1.25, y: elev, z: doorZ,
      w: 0.35, h: 2.7, d: 0.3,
      material: frameMat, collide: true,
    });
    world.box({
      x: elX + 1.25, y: elev, z: doorZ,
      w: 0.35, h: 2.7, d: 0.3,
      material: frameMat, collide: true,
    });
    // Gold Accent Strips on pillars
    world.box({
      x: elX - 1.25, y: elev, z: doorZ + sign * 0.16,
      w: 0.06, h: 2.7, d: 0.02,
      material: goldTrim,
    });
    world.box({
      x: elX + 1.25, y: elev, z: doorZ + sign * 0.16,
      w: 0.06, h: 2.7, d: 0.02,
      material: goldTrim,
    });
    // Header Beam
    world.box({
      x: elX, y: elev + 2.7, z: doorZ,
      w: 2.85, h: 0.45, d: 0.3,
      material: frameMat, collide: true,
    });
    // Digital Floor Indicator Screen
    world.box({
      x: elX, y: elev + 2.78, z: doorZ + sign * 0.16,
      w: 1.5, h: 0.3, d: 0.02,
      material: darkGlass,
    });
    world.box({
      x: elX, y: elev + 2.78, z: doorZ + sign * 0.17,
      w: 0.7, h: 0.15, d: 0.01,
      material: M.emissive('#fbbf24', 2.0),
    });

    // 2. Sliding Elevator Doors (stainless steel hairline panels)
    world.box({
      x: elX - 0.52, y: elev, z: doorZ,
      w: 1.0, h: 2.65, d: 0.08,
      material: doorMat,
    });
    world.box({
      x: elX + 0.52, y: elev, z: doorZ,
      w: 1.0, h: 2.65, d: 0.08,
      material: doorMat,
    });
    // Vertical recessed gold line in door center
    world.box({
      x: elX, y: elev, z: doorZ + sign * 0.03,
      w: 0.04, h: 2.65, d: 0.02,
      material: goldTrim,
    });
    // Door Collider (blocks walking through closed elevator shaft door)
    world.collider(elX, doorZ, 2.1, 0.25, 0, elev, elev + 2.7);

    // 3. Call Button Wall Station
    world.box({
      x: elX + 1.6, y: elev + 1.1, z: doorZ + sign * 0.16,
      w: 0.14, h: 0.32, d: 0.03,
      material: goldTrim,
    });
    world.box({
      x: elX + 1.6, y: elev + 1.18, z: doorZ + sign * 0.18,
      w: 0.04, h: 0.04, d: 0.02,
      material: M.emissive('#fbbf24', 2.5),
    });
    world.box({
      x: elX + 1.6, y: elev + 1.04, z: doorZ + sign * 0.18,
      w: 0.04, h: 0.04, d: 0.02,
      material: M.emissive('#fbbf24', 1.5),
    });
    // Interactive Call Button Trigger
    world.interact({
      x: elX,
      y: elev,
      z: doorZ + sign * 0.85,
      radius: 3.2,
      label: `[E] Call Elevator (${fl.name})`,
      action: () => showElevatorModal(world, elDef, floors, fl.level, ctx),
    });

    // 4. Elevator Cabin Enclosure
    // Cabin Floor
    world.box({
      x: elX, y: elev - 0.02, z: elZ,
      w: width - 0.3, h: 0.1, d: depth - 0.3,
      material: cabinFloorMat,
    });
    world.floorSlabs.push({
      minX: elX - (width - 0.3) / 2,
      maxX: elX + (width - 0.3) / 2,
      minZ: elZ - (depth - 0.3) / 2,
      maxZ: elZ + (depth - 0.3) / 2,
      elevation: elev,
      voidZone: null,
    });

    // Cabin Ceiling (Warm glowing LED panel)
    world.box({
      x: elX, y: elev + height, z: elZ,
      w: width - 0.3, h: 0.08, d: depth - 0.3,
      material: M.emissive('#fff7ed', 1.4),
      cast: false,
    });

    // Cabin Back Wall (Mirrored surface)
    const backZ = isSouth ? (elZ - depth / 2 + 0.1) : (elZ + depth / 2 - 0.1);
    world.box({
      x: elX, y: elev, z: backZ,
      w: width - 0.3, h: height, d: 0.08,
      material: M.solid('#e2e8f0', { metal: 0.95, rough: 0.05 }),
      collide: true,
    });
    // Back handrail
    world.cylinder({
      x: elX, y: elev + 1.0, z: backZ + sign * 0.12,
      r: 0.03, h: width - 0.8,
      material: goldTrim, rotZ: Math.PI / 2,
    });

    // Cabin Left Wall
    world.box({
      x: elX - width / 2 + 0.1, y: elev, z: elZ,
      w: 0.08, h: height, d: depth - 0.3,
      material: frameMat, collide: true,
    });
    // Cabin Right Wall
    world.box({
      x: elX + width / 2 - 0.1, y: elev, z: elZ,
      w: 0.08, h: height, d: depth - 0.3,
      material: frameMat, collide: true,
    });
    // Left & Right handrails
    world.cylinder({
      x: elX - width / 2 + 0.22, y: elev + 1.0, z: elZ,
      r: 0.03, h: depth - 0.8,
      material: goldTrim, rotX: Math.PI / 2,
    });
    world.cylinder({
      x: elX + width / 2 - 0.22, y: elev + 1.0, z: elZ,
      r: 0.03, h: depth - 0.8,
      material: goldTrim, rotX: Math.PI / 2,
    });

    // Interior Control Panel on right wall
    world.box({
      x: elX + width / 2 - 0.18, y: elev + 1.3, z: elZ,
      w: 0.04, h: 0.9, d: 0.25,
      material: goldTrim,
    });
    world.box({
      x: elX + width / 2 - 0.2, y: elev + 1.3, z: elZ,
      w: 0.02, h: 0.8, d: 0.2,
      material: darkGlass,
    });
    world.interact({
      x: elX,
      y: elev,
      z: elZ,
      radius: 2.6,
      label: '[E] Elevator Control Panel — Select Floor (0 - 19)',
      action: () => showElevatorModal(world, elDef, floors, fl.level, ctx),
    });
  }
}
