import * as THREE from 'three';

/*
 * Every texture is drawn procedurally on a canvas, so the project ships with
 * no image downloads and the first load stays fast.
 *
 * Shared materials (M.wood(), M.solid(...) ...) are cached and flagged
 * `userData.shared`, so a room's dispose() never frees them.
 * Materials that animate (M.emissive) are unique per call and freed with the room.
 */

export const FONT_DISPLAY = 'Syne, "Segoe UI", system-ui, sans-serif';
export const FONT_BODY = '"Hanken Grotesk", "Segoe UI", system-ui, sans-serif';

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeCanvas(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  return { canvas, g: canvas.getContext('2d') };
}

export function canvasTexture(w, h, draw, { repeat = false, srgb = true, aniso = 16 } = {}) {
  const { canvas, g } = makeCanvas(w, h);
  draw(g, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  if (repeat) tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = aniso;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

function noise(g, w, h, r, count, alpha, colors) {
  // Soft, velvety multi-pixel micro-texture that avoids harsh single-pixel sparkling
  const nColors = colors.length;
  for (let i = 0; i < count; i++) {
    g.fillStyle = colors[(r() * nColors) | 0];
    g.globalAlpha = alpha * 0.35 * r();
    const size = 2 + r() * 4;
    g.fillRect(r() * w, r() * h, size, size);
  }
  g.globalAlpha = 1;
}

/* ------------------------------------------------------------- textures */
const texFactories = {
  wood: () => canvasTexture(1024, 1024, (g, w, h) => {
    const r = rng(11); const planks = 8; const pw = w / planks;
    for (let i = 0; i < planks; i++) {
      const base = 98 + r() * 26;
      g.fillStyle = `rgb(${base + 30}, ${base - 6}, ${base - 38})`;
      g.fillRect(i * pw, 0, pw, h);
      for (let k = 0; k < 40; k++) {
        g.strokeStyle = `rgba(40,22,10,${0.04 + r() * 0.08})`;
        g.lineWidth = 1 + r() * 2;
        g.beginPath();
        const x = i * pw + r() * pw;
        g.moveTo(x, 0); g.bezierCurveTo(x + (r() - 0.5) * 14, h * 0.3, x + (r() - 0.5) * 14, h * 0.7, x + (r() - 0.5) * 10, h);
        g.stroke();
      }
      g.fillStyle = 'rgba(20,10,4,0.45)'; g.fillRect(i * pw, 0, 1.5, h);
      const cut = r() * h; g.fillRect(i * pw, cut, pw, 1.5);
    }
  }, { repeat: true }),

  marble: () => canvasTexture(1024, 1024, (g, w, h) => {
    const r = rng(23);
    g.fillStyle = '#f3f1ec'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 24; i++) {
      g.strokeStyle = `rgba(100,108,120,${0.04 + r() * 0.12})`;
      g.lineWidth = 0.8 + r() * 2.2;
      g.beginPath();
      let x = r() * w, y = 0; g.moveTo(x, y);
      while (y < h) { x += (r() - 0.5) * 70; y += 40 + r() * 60; g.lineTo(x, y); }
      g.stroke();
    }
    noise(g, w, h, r, 600, 0.04, ['#ffffff', '#cbd5e1']);
  }, { repeat: true }),

  plaster: () => canvasTexture(512, 512, (g, w, h) => {
    const r = rng(5);
    g.fillStyle = '#f8fafc'; g.fillRect(0, 0, w, h);
    // Smooth isotropic plaster micro-texture without any diagonal or directional banding
    noise(g, w, h, r, 1200, 0.025, ['#ffffff', '#f1f5f9', '#e2e8f0']);
  }, { repeat: true }),

  graphite: () => canvasTexture(512, 512, (g, w, h) => {
    const r = rng(7);
    g.fillStyle = '#2a2e35'; g.fillRect(0, 0, w, h);
    noise(g, w, h, r, 1200, 0.08, ['#1a1c20', '#3e434d', '#4b525c']);
  }, { repeat: true }),

  ink: () => canvasTexture(512, 512, (g, w, h) => {
    const r = rng(31);
    g.fillStyle = '#141a26'; g.fillRect(0, 0, w, h);
    noise(g, w, h, r, 1000, 0.08, ['#0d111a', '#242c3d']);
    g.strokeStyle = 'rgba(255,179,64,0.07)'; g.lineWidth = 1;
    for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * w / 8, 0); g.lineTo(i * w / 8, h); g.stroke(); g.beginPath(); g.moveTo(0, i * h / 8); g.lineTo(w, i * h / 8); g.stroke(); }
  }, { repeat: true }),

  rubber: () => canvasTexture(512, 512, (g, w, h) => {
    const r = rng(41);
    g.fillStyle = '#1e2126'; g.fillRect(0, 0, w, h);
    noise(g, w, h, r, 1000, 0.1, ['#14161a', '#323740']);
  }, { repeat: true }),

  carpet: () => canvasTexture(512, 512, (g, w, h) => {
    const r = rng(53);
    g.fillStyle = '#2c3340'; g.fillRect(0, 0, w, h);
    noise(g, w, h, r, 1500, 0.1, ['#212630', '#384152']);
  }, { repeat: true }),

  tile: () => canvasTexture(512, 512, (g, w, h) => {
    const r = rng(61);
    g.fillStyle = '#dedcd6'; g.fillRect(0, 0, w, h);
    noise(g, w, h, r, 400, 0.03, ['#ffffff', '#c5c2bb']);
    g.strokeStyle = 'rgba(60,64,72,0.4)'; g.lineWidth = 2.5;
    g.strokeRect(0, 0, w, h);
    g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke();
  }, { repeat: true }),
};

const texCache = new Map();
function texture(name) {
  if (!texCache.has(name)) {
    const t = texFactories[name]();
    t.userData.shared = true;
    texCache.set(name, t);
  }
  return texCache.get(name);
}

/* ------------------------------------------------------------ materials */
const matCache = new Map();
function memo(key, make) {
  if (!matCache.has(key)) {
    const m = make();
    m.userData.shared = true;
    matCache.set(key, m);
  }
  return matCache.get(key);
}
const std = (o) => new THREE.MeshStandardMaterial(o);

export const M = {
  wood: () => memo('wood', () => std({ map: texture('wood'), roughness: 0.42, metalness: 0.04 })),
  marble: () => memo('marble', () => std({ map: texture('marble'), roughness: 0.18, metalness: 0.05 })),
  plaster: () => memo('plaster', () => std({ map: texture('plaster'), roughness: 0.92 })),
  graphite: () => memo('graphite', () => std({ map: texture('graphite'), roughness: 0.6, metalness: 0.2 })),
  ink: () => memo('ink', () => std({ map: texture('ink'), roughness: 0.35, metalness: 0.35 })),
  rubber: () => memo('rubber', () => std({ map: texture('rubber'), roughness: 0.95 })),
  carpet: () => memo('carpet', () => std({ map: texture('carpet'), roughness: 1 })),
  tile: () => memo('tile', () => std({ map: texture('tile'), roughness: 0.3 })),

  solid: (color, { rough = 0.7, metal = 0 } = {}) =>
    memo(`solid:${color}:${rough}:${metal}`, () => std({ color, roughness: rough, metalness: metal })),

  basic: (color) => memo(`basic:${color}`, () => new THREE.MeshBasicMaterial({ color })),

  glass: (color = '#9fd4ff', opacity = 0.18) =>
    memo(`glass:${color}:${opacity}`, () => std({
      color, transparent: true, opacity, roughness: 0.05, metalness: 0.2, depthWrite: false, side: THREE.DoubleSide,
    })),

  /** Unique (animatable) emissive material. Freed with the room. */
  emissive: (color, intensity = 1) =>
    std({ color: '#101114', emissive: color, emissiveIntensity: intensity, roughness: 0.4 }),

  /** Unique unlit material, safe to tint per frame. */
  unlit: (color, opacity = 1, additive = false) =>
    new THREE.MeshBasicMaterial({
      color, transparent: opacity < 1 || additive, opacity, depthWrite: !additive,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    }),
};

/** Soft radial glow used for floor light-spill and halos. */
export function glowTexture(color = '#ffffff') {
  return canvasTexture(128, 128, (g, w, h) => {
    const grd = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    grd.addColorStop(0, color); grd.addColorStop(0.4, color + '55'); grd.addColorStop(1, color + '00');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
  }, { srgb: true });
}

/** Word-wrapped text on a canvas; returns the y of the next free line. */
export function wrapText(g, text, x, y, maxW, lineH, maxLines = 99) {
  const words = String(text ?? '').split(/\s+/);
  let line = ''; let lines = 0;
  for (let i = 0; i < words.length; i++) {
    const test = line ? `${line} ${words[i]}` : words[i];
    if (g.measureText(test).width > maxW && line) {
      lines++;
      if (lines === maxLines) { g.fillText(`${line}…`, x, y); return y + lineH; }
      g.fillText(line, x, y); y += lineH; line = words[i];
    } else line = test;
  }
  if (line) { g.fillText(line, x, y); y += lineH; }
  return y;
}
