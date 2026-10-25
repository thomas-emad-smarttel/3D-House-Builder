import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { M, makeCanvas, FONT_DISPLAY, FONT_BODY } from '../../game/materials.js';
import { desk, chair, sofa, table, plant, bookshelf, floorLamp, deskMonitor, sign, canvasPlane } from '../../game/props.js';
import { moduleScreen } from '../../game/props.js';
import { overviewPodium, textBoard, totem, hologram } from '../roomKit.js';
import { RADIANS, typeDef } from './catalog.js';

/*
 * One builder per catalog object type. Each receives (world, room, o, ctx) with
 * o = { x, z, rot (degrees), p (params) }. Rotations are quarter turns only, so
 * colliders stay exact (see game/collision.js).
 */

const matFor = (name, color) => {
  switch (name) {
    case 'solid': return M.solid(color, { rough: 0.7 });
    case 'emissive': return M.emissive(color, 1.3);
    case 'glass': return M.glass(color, 0.28);
    default: return typeof M[name] === 'function' ? M[name]() : M.solid(color);
  }
};

/** Local (lx, lz) offset rotated into world space around the object's origin. */
const at = (o, lx, lz) => {
  const a = RADIANS(o.rot);
  return { x: o.x + lx * Math.cos(a) + lz * Math.sin(a), z: o.z - lx * Math.sin(a) + lz * Math.cos(a) };
};

const normal = (o) => { const a = RADIANS(o.rot); return { nx: Math.sin(a), nz: Math.cos(a) }; };

function pictureCard(w, h, label, caption) {
  const { canvas, g } = makeCanvas(640, Math.round((640 * h) / w));
  g.fillStyle = '#15191f'; g.fillRect(0, 0, canvas.width, canvas.height);
  g.fillStyle = '#6b7280'; g.font = `700 ${canvas.height * 0.2}px ${FONT_DISPLAY}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(label, canvas.width / 2, canvas.height * 0.45);
  if (caption) { g.font = `400 ${canvas.height * 0.08}px ${FONT_BODY}`; g.fillText(caption, canvas.width / 2, canvas.height * 0.72, canvas.width - 40); }
  const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const objModelCache = new Map();

function loadObjTemplate(filePath, mtlPath) {
  const cacheKey = `${filePath}::${mtlPath || 'nomtl'}`;
  if (objModelCache.has(cacheKey)) {
    return objModelCache.get(cacheKey);
  }

  const promise = new Promise((resolve, reject) => {
    if (mtlPath) {
      try {
        const mtlLoader = new MTLLoader();
        mtlLoader.load(mtlPath, (materials) => {
          materials.preload();
          const objLoader = new OBJLoader();
          objLoader.setMaterials(materials);
          objLoader.load(filePath, (loaded) => resolve(loaded), undefined, (err) => {
            console.warn(`[3D] Error loading OBJ with MTL (${filePath}), retrying without MTL:`, err);
            const fallbackLoader = new OBJLoader();
            fallbackLoader.load(filePath, (loaded) => resolve(loaded), undefined, reject);
          });
        }, undefined, () => {
          const fallbackLoader = new OBJLoader();
          fallbackLoader.load(filePath, (loaded) => resolve(loaded), undefined, reject);
        });
      } catch (err) {
        const fallbackLoader = new OBJLoader();
        fallbackLoader.load(filePath, (loaded) => resolve(loaded), undefined, reject);
      }
    } else {
      const objLoader = new OBJLoader();
      objLoader.load(filePath, (loaded) => resolve(loaded), undefined, reject);
    }
  });

  objModelCache.set(cacheKey, promise);
  return promise;
}

export const BUILDERS = {
  block(world, room, o) {
    const p = o.p;
    world.box({ x: o.x, y: p.y, z: o.z, w: p.w, h: p.h, d: p.d, rotY: RADIANS(o.rot), material: matFor(p.material, p.color), collide: !!p.collide && p.y < 2.2, cast: p.material !== 'glass' });
  },

  cylinder(world, room, o) {
    const p = o.p;
    world.cylinder({ x: o.x, y: p.y, z: o.z, r: p.r, h: p.h, material: matFor(p.material, p.color), collide: !!p.collide && p.y < 2.2, seg: 32 });
  },

  rug(world, room, o) {
    const p = o.p;
    world.box({ x: o.x, y: 0.012, z: o.z, w: p.w, h: 0.02, d: p.d, rotY: RADIANS(o.rot), material: matFor(p.material, p.color), cast: false, tile: 2.5 });
  },

  desk(world, room, o) { desk(world, { x: o.x, z: o.z, rotY: RADIANS(o.rot), w: o.p.w, d: o.p.d, top: matFor(o.p.material, '#a07a52') }); },

  workstation(world, room, o) {
    const p = o.p; const rotY = RADIANS(o.rot);
    desk(world, { x: o.x, z: o.z, rotY, w: p.w, d: 0.9, top: M.wood() });
    const n = Math.max(1, Math.min(3, p.monitors));
    for (let i = 0; i < n; i++) {
      const c = at(o, (i - (n - 1) / 2) * 0.78, 0.05);
      deskMonitor(world, { x: c.x, y: 0.76, z: c.z, rotY, accent: room.accent, w: 0.72, h: 0.42 });
    }
    const c = at(o, 0, 0.95);
    chair(world, { x: c.x, z: c.z, rotY });
  },

  chair(world, room, o) { chair(world, { x: o.x, z: o.z, rotY: RADIANS(o.rot), color: o.p.color }); },
  sofa(world, room, o) { sofa(world, { x: o.x, z: o.z, rotY: RADIANS(o.rot), w: o.p.w, color: o.p.color }); },
  table(world, room, o) { table(world, { x: o.x, z: o.z, rotY: RADIANS(o.rot), w: o.p.w, d: o.p.d, top: matFor(o.p.material, '#cbd5e1') }); },
  plant(world, room, o) { plant(world, { x: o.x, z: o.z, s: o.p.s }); },
  bookshelf(world, room, o) { bookshelf(world, { x: o.x, z: o.z, rotY: RADIANS(o.rot), w: o.p.w, h: o.p.h, accent: room.accent }); },
  lamp(world, room, o) { floorLamp(world, { x: o.x, z: o.z, color: o.p.color }); },

  module(world, room, o) {
    const mod = room.modules.find((m) => m.id === o.p.module);
    if (!mod) throw new Error(`module "${o.p.module}" does not exist in this room`);
    moduleScreen(world, room, mod, { x: o.x, y: o.p.y, z: o.z, rotY: RADIANS(o.rot), w: o.p.w, h: o.p.h, radius: 4.4 });
  },

  sign(world, room, o) {
    const p = o.p;
    sign(world, { title: p.title, sub: p.sub, accent: room.accent, x: o.x, y: p.y, z: o.z, rotY: RADIANS(o.rot), w: p.w, h: p.h, dark: p.dark });
  },

  board(world, room, o, ctx) {
    const p = o.p;
    textBoard(world, {
      x: o.x, y: p.y, z: o.z, rotY: RADIANS(o.rot), w: p.w, h: p.h, title: p.title, body: p.body, accent: room.accent,
      label: `Read: ${p.title}`,
      action: p.opens ? () => ctx.game.openInfo({ title: p.title, body: p.body }) : undefined,
    });
  },

  picture(world, room, o, ctx) {
    const p = o.p; const rotY = RADIANS(o.rot); const { nx, nz } = normal(o);
    const halo = M.emissive(room.accent, 0.25);
    world.box({ x: o.x - nx * 0.035, y: p.y - 0.1, z: o.z - nz * 0.035, w: p.w + 0.2, h: p.h + 0.2, d: 0.05, material: halo, rotY, cast: false });
    world.box({ x: o.x, y: p.y - 0.06, z: o.z, w: p.w + 0.12, h: p.h + 0.12, d: 0.1, material: M.solid('#1c2026', { rough: 0.4, metal: 0.7 }), rotY });

    const isVideo = p.media === 'video';
    const mat = new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false });
    mat.map = pictureCard(p.w, p.h, isVideo ? '▶ Video' : 'Picture', p.caption);
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(p.w, p.h), mat);
    plane.position.set(o.x + nx * 0.056, p.y + p.h / 2, o.z + nz * 0.056);
    plane.rotation.y = rotY;
    world.scene.add(plane);

    if (!isVideo && p.src) {
      try {
        new THREE.TextureLoader().load(p.src, (tex) => {
          if (world.disposed) { tex.dispose(); return; }
          tex.colorSpace = THREE.SRGBColorSpace;
          mat.map?.dispose(); mat.map = tex; mat.needsUpdate = true;
        }, undefined, () => { /* keep the placeholder card if the file is missing */ });
      } catch { /* no image loading available */ }
    }

    if (p.opens || isVideo) {
      let focus = 0; let target = 0;
      world.onUpdate((dt) => { focus += (target - focus) * Math.min(1, dt * 8); halo.emissiveIntensity = 0.25 + focus * 1.8; });
      world.interact({
        x: o.x, z: o.z, radius: 4.4,
        label: `${isVideo ? 'Play' : 'View'}: ${p.caption || (isVideo ? 'video' : 'picture')}`,
        onFocus: (v) => { target = v ? 1 : 0; },
        action: () => ctx.game.openInfo({ title: p.caption || (isVideo ? 'Video' : 'Picture'), media: p.src ? { type: p.media, src: p.src, caption: p.caption } : null }),
      });
    }
  },

  dashboard(world, room, o) {
    const p = o.p; const rotY = RADIANS(o.rot); const { nx, nz } = normal(o);
    const board = canvasPlane(world, {
      w: p.w, h: p.h, x: o.x + nx * 0.03, y: p.y + p.h / 2, z: o.z + nz * 0.03, rotY, px: 640,
      draw: (g, w, h, t) => {
        g.fillStyle = 'rgba(8,12,20,0.9)'; g.fillRect(0, 0, w, h);
        g.strokeStyle = p.color; g.lineWidth = 3; g.strokeRect(3, 3, w - 6, h - 6);
        g.fillStyle = '#8f98a6'; g.font = `500 ${h * 0.06}px ${FONT_BODY}`; g.textBaseline = 'top'; g.textAlign = 'left';
        g.fillText('Illustrative visualisation, not real data', 16, 12);
        const n = 14; const bw = (w - 60) / n;
        for (let i = 0; i < n; i++) {
          const v = 0.4 + 0.28 * Math.sin(t * 1.2 + i * 0.7) + 0.14 * Math.sin(t * 0.6 + i * 1.9);
          g.fillStyle = i % 4 === 0 ? '#ffffff' : p.color; g.globalAlpha = 0.85;
          g.fillRect(30 + i * bw, h * 0.92 - v * h * 0.55, bw * 0.7, v * h * 0.55);
        }
        g.globalAlpha = 1;
      },
    });
    let acc = 0;
    world.onUpdate((dt, t) => { acc += dt; if (acc > 0.12) { acc = 0; board.redraw(t); } });
  },

  overview(world, room, o) { overviewPodium(world, room, { x: o.x, z: o.z, title: o.p.title, label: o.p.label }); },

  info(world, room, o, ctx) {
    const p = o.p;
    totem(world, {
      x: o.x, z: o.z, title: p.title, sub: p.sub, accent: room.accent,
      label: `Read: ${p.title}`,
      action: () => ctx.game.openInfo({ title: p.title, body: p.body, link: p.link, link_label: p.link_label }),
    });
  },

  hologram(world, room, o) { hologram(world, { x: o.x, y: o.p.y, z: o.z, radius: o.p.radius, color: o.p.color }); },

  light(world, room, o) {
    world.light(new THREE.PointLight(o.p.color, o.p.intensity, o.p.distance, 2), o.x, o.p.y, o.z);
  },

  svg(world, room, o, ctx, passedDef) {
    const def = passedDef || typeDef(o.library_id || o.type);
    const p = o.p || {};
    const w = Number(p.w || 2);
    const d = Number(p.d || 2);
    const h = Number(p.h || 1.2);
    const y = Number(p.y || 0);
    const rotY = RADIANS(o.rot || 0);
    const color = p.color || def?.color || '#38bdf8';

    // Base pedestal
    world.box({
      x: o.x, y: y + 0.02, z: o.z,
      w, h: 0.04, d,
      rotY,
      material: M.solid('#1e293b', { rough: 0.7 }),
      cast: true,
      collide: !!p.collide && y < 2.2,
    });

    let builtVisual = false;
    if (def?.thumbnail_path && typeof globalThis.DOMParser !== 'undefined') {
      try {
        const loader = new SVGLoader();
        const svgRes = loader.parse(def.thumbnail_path);
        if (svgRes && svgRes.paths && svgRes.paths.length > 0) {
          const group = new THREE.Group();
          const vb = def.metadata?.view_box || { width: 100, height: 100 };
          const scaleX = w / (vb.width || 100);
          const scaleY = h / (vb.height || 100);

          for (const path of svgRes.paths) {
            const mat = new THREE.MeshStandardMaterial({
              color: path.color ? `#${path.color.getHexString()}` : color,
              roughness: 0.5,
              metalness: 0.2,
              side: THREE.DoubleSide,
            });
            const shapes = SVGLoader.createShapes(path);
            for (const shape of shapes) {
              const geom = new THREE.ExtrudeGeometry(shape, { depth: 0.04, bevelEnabled: false });
              const mesh = new THREE.Mesh(geom, mat);
              mesh.castShadow = true;
              group.add(mesh);
            }
          }

          group.scale.set(scaleX, -scaleY, scaleX);
          group.rotation.y = rotY;
          group.position.set(o.x - (w / 2) * Math.cos(rotY), y + 0.04 + h, o.z + (w / 2) * Math.sin(rotY));
          world.scene.add(group);
          builtVisual = true;
        }
      } catch {
        builtVisual = false;
      }
    }

    if (!builtVisual) {
      // Solid stylized panel fallback
      world.box({
        x: o.x, y: y + 0.04 + h / 2, z: o.z,
        w, h, d: 0.06,
        rotY,
        material: M.solid(color, { rough: 0.5, metal: 0.3 }),
        cast: true,
      });
    }
  },

  dxf(world, room, o, ctx, passedDef) {
    const def = passedDef || typeDef(o.library_id || o.type);
    const p = o.p || {};
    const w = Number(p.w || 2);
    const d = Number(p.d || 2);
    const h = Number(p.h || 1.0);
    const y = Number(p.y || 0);
    const rotY = RADIANS(o.rot || 0);
    const color = p.color || def?.color || '#38bdf8';

    // CAD Drafting Table / Plinth
    world.box({
      x: o.x, y: y + 0.03, z: o.z,
      w, h: 0.06, d,
      rotY,
      material: M.solid('#0f172a', { rough: 0.4, metal: 0.8 }),
      cast: true,
      collide: !!p.collide && y < 2.2,
    });

    const entities = def?.metadata?.entities || [];
    const bbox = def?.metadata?.bbox || { min_x: 0, min_y: 0, max_x: w, max_y: d };
    const bw = Math.max(0.001, (bbox.max_x - bbox.min_x));
    const bd = Math.max(0.001, (bbox.max_y - bbox.min_y));

    const linePoints = [];
    for (const ent of entities) {
      if (ent.type === 'LINE') {
        const x1 = ((ent.x - bbox.min_x) / bw - 0.5) * (w * 0.9);
        const z1 = ((ent.y - bbox.min_y) / bd - 0.5) * (d * 0.9);
        const x2 = ((ent.x2 - bbox.min_x) / bw - 0.5) * (w * 0.9);
        const z2 = ((ent.y2 - bbox.min_y) / bd - 0.5) * (d * 0.9);
        linePoints.push(new THREE.Vector3(x1, 0.07, z1), new THREE.Vector3(x2, 0.07, z2));
      } else if (ent.type === 'LWPOLYLINE' && ent.vertices && ent.vertices.length > 1) {
        for (let i = 0; i < ent.vertices.length - 1; i++) {
          const p1 = ent.vertices[i];
          const p2 = ent.vertices[i + 1];
          const x1 = ((p1[0] - bbox.min_x) / bw - 0.5) * (w * 0.9);
          const z1 = ((p1[1] - bbox.min_y) / bd - 0.5) * (d * 0.9);
          const x2 = ((p2[0] - bbox.min_x) / bw - 0.5) * (w * 0.9);
          const z2 = ((p2[1] - bbox.min_y) / bd - 0.5) * (d * 0.9);
          linePoints.push(new THREE.Vector3(x1, 0.07, z1), new THREE.Vector3(x2, 0.07, z2));
        }
      }
    }

    if (linePoints.length > 0) {
      const geom = new THREE.BufferGeometry().setFromPoints(linePoints);
      const mat = new THREE.LineBasicMaterial({ color: new THREE.Color(color), linewidth: 2 });
      const lineMesh = new THREE.LineSegments(geom, mat);
      lineMesh.rotation.y = rotY;
      lineMesh.position.set(o.x, y, o.z);
      world.scene.add(lineMesh);
    } else {
      // Stylized CAD blueprint grid frame
      world.box({
        x: o.x, y: y + 0.065, z: o.z,
        w: w * 0.85, h: 0.01, d: d * 0.85,
        rotY,
        material: M.solid(color, { rough: 0.3, metal: 0.5 }),
      });
    }
  },

  obj(world, room, o, ctx, passedDef) {
    const def = passedDef || typeDef(o.library_id || o.type);
    const p = o.p || {};
    const w = Number(p.w || 2);
    const d = Number(p.d || 1);
    const h = Number(p.h || 0.9);
    const y = Number(p.y || 0);
    const rotY = RADIANS(o.rot || 0);
    const color = p.color || def?.color || '#8b5cf6';
    const solid = !!p.collide && y < 2.2;

    if (solid) {
      world.collider(o.x, o.z, w, d, rotY);
    }

    const container = new THREE.Group();
    container.position.set(o.x, y, o.z);
    container.rotation.y = rotY;
    world.scene.add(container);

    // Initial placeholder mesh: visible immediately so the room is never empty
    const geom = new THREE.BoxGeometry(w, h, d);
    const mat = M.solid(color, { rough: 0.5, metal: 0.1 });
    const placeholder = new THREE.Mesh(geom, mat);
    placeholder.position.y = h / 2;
    placeholder.castShadow = true;
    placeholder.receiveShadow = true;
    container.add(placeholder);

    const rawPath = def?.file_path || def?.definition?.file_path;
    const filePath = rawPath ? (rawPath.startsWith('/') ? rawPath : '/' + rawPath) : null;
    const rawMtl = def?.mtl_path || def?.definition?.mtl_path;
    const mtlPath = rawMtl ? (rawMtl.startsWith('/') ? rawMtl : '/' + rawMtl) : null;

    if (typeof window === 'undefined' || !filePath) {
      return;
    }

    const attachObj = (template) => {
      try {
        const loaded = template.clone(true);
        const box = new THREE.Box3().setFromObject(loaded);
        const size = new THREE.Vector3();
        box.getSize(size);
        const center = new THREE.Vector3();
        box.getCenter(center);

        // Center mesh horizontally and place bottom at y=0
        loaded.position.x = -center.x;
        loaded.position.y = -box.min.y;
        loaded.position.z = -center.z;

        const sx = size.x > 0.0001 ? w / size.x : 1;
        const sy = size.y > 0.0001 ? h / size.y : 1;
        const sz = size.z > 0.0001 ? d / size.z : 1;

        const wrapper = new THREE.Group();
        wrapper.add(loaded);
        wrapper.scale.set(sx, sy, sz);

        const fixMat = (mat) => {
          if (!mat) return M.solid(color, { rough: 0.6, metal: 0.1 });
          const isPureBlack = !mat.map && mat.color && mat.color.r === 0 && mat.color.g === 0 && mat.color.b === 0;
          if (isPureBlack) {
            return M.solid(color, { rough: 0.6, metal: 0.1 });
          }
          mat.side = THREE.DoubleSide;
          return mat;
        };

        loaded.traverse((child) => {
          if (child.isMesh) {
            const faceCount = child.geometry?.index
              ? (child.geometry.index.count / 3)
              : (child.geometry?.attributes?.position?.count / 3 || 0);
            child.castShadow = faceCount < 50000;
            child.receiveShadow = true;
            if (!mtlPath || !child.material) {
              child.material = fixMat(null);
            } else if (Array.isArray(child.material)) {
              child.material = child.material.map(fixMat);
            } else {
              child.material = fixMat(child.material);
            }
          }
        });

        // Swap placeholder with the loaded high-detail mesh
        container.remove(placeholder);
        placeholder.geometry?.dispose();
        container.add(wrapper);
      } catch (err) {
        console.warn(`[3D] Failed to attach mesh for ${o.id}:`, err);
      }
    };

    loadObjTemplate(filePath, mtlPath)
      .then((template) => attachObj(template))
      .catch((err) => {
        console.warn(`[3D] Failed to load OBJ ${filePath}:`, err);
      });
  },
};

