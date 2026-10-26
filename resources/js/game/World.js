import * as THREE from 'three';
import { makeAabb } from './collision.js';

/** Re-maps box UVs to world metres so textures keep one texel density. */
function uvBox(geo, w, h, d, tile) {
  const uv = geo.attributes.uv;
  // BoxGeometry face order: +x, -x, +y, -y, +z, -z (4 vertices each)
  const s = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    for (let i = 0; i < 4; i++) {
      const k = f * 4 + i;
      uv.setXY(k, (uv.getX(k) * s[f][0]) / tile, (uv.getY(k) * s[f][1]) / tile);
    }
  }
  uv.needsUpdate = true;
}

/**
 * A World is one self-contained 3D environment (the mansion, or one room):
 * a scene graph + colliders + interactables + per-frame updaters.
 * Rooms are built lazily and disposed when the player leaves them.
 */
export class World {
  constructor(ctx, { id, name, accent = '#d9a85f', ambient = {} }) {
    this.ctx = ctx;
    this.id = id;
    this.name = name;
    this.accent = accent;
    this.ambient = ambient;            // { base: Hz, bright: 0..1 } for the audio engine
    this.scene = new THREE.Scene();
    this.colliders = [];
    this.interactables = [];
    this.updaters = [];
    this.cleanups = [];
    this.spawn = { x: 0, z: 0, yaw: 0 };
    this.bounds = null;
    this.time = 0;
    this.disposed = false;
    this.currentFloorGroup = null;
  }

  /** Box whose base sits at `y` (centre x/z) or centered at `y` when centerY is true. */
  box({ x = 0, y = 0, z = 0, w = 1, h = 1, d = 1, material, collide = false, cast = true, receive = true, tile = 2, rotX = 0, rotY = 0, rotZ = 0, centerY = false, parent } = {}) {
    const geo = new THREE.BoxGeometry(w, h, d);
    uvBox(geo, w, h, d, tile);
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(x, centerY ? y : y + h / 2, z);
    mesh.rotation.set(rotX, rotY, rotZ);
    mesh.castShadow = cast;
    mesh.receiveShadow = receive;
    (parent ?? this.currentFloorGroup ?? this.scene).add(mesh);
    if (collide) mesh.userData.collider = this.collider(x, z, w, d, rotY, y, y + h);
    return mesh;
  }

  cylinder({ x = 0, y = 0, z = 0, r = 0.5, rTop, h = 1, material, seg = 24, collide = false, cast = true, rotX = 0, rotY = 0, rotZ = 0, centerY = false, parent } = {}) {
    const geo = new THREE.CylinderGeometry(rTop ?? r, r, h, seg);
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(x, centerY ? y : y + h / 2, z);
    mesh.rotation.set(rotX, rotY, rotZ);
    mesh.castShadow = cast; mesh.receiveShadow = true;
    (parent ?? this.currentFloorGroup ?? this.scene).add(mesh);
    if (collide) mesh.userData.collider = this.collider(x, z, r * 1.8, r * 1.8, 0, y, y + h);
    return mesh;
  }

  collider(x, z, w, d, rotY = 0, minY = -Infinity, maxY = Infinity) {
    const c = makeAabb(x, z, w, d, rotY, minY, maxY);
    this.colliders.push(c);
    return c;
  }

  light(light, x, y, z) {
    light.position.set(x, y, z);
    this.scene.add(light);
    return light;
  }

  /**
   * def: { x, z, radius, label, action, card?, cardRadius?, enabled?, onFocus? }
   * `label` is the prompt text ("Enter the ERP System"), `card` a { title, text, accent }.
   */
  interact(def) {
    const it = { radius: 3.2, ...def };
    this.interactables.push(it);
    return it;
  }

  onUpdate(fn) { this.updaters.push(fn); }
  onDispose(fn) { this.cleanups.push(fn); }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.cleanups.forEach((fn) => { try { fn(); } catch { /* ignore */ } });
    this.scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      for (const m of mats) {
        if (m.userData?.shared) continue;
        for (const k in m) {
          const v = m[k];
          if (v && v.isTexture && !v.userData?.shared) v.dispose();
        }
        m.dispose();
      }
    });
    this.scene.clear();
    this.colliders.length = 0;
    this.interactables.length = 0;
    this.updaters.length = 0;
  }
}
