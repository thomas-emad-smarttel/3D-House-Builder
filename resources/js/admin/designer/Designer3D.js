import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { el } from '../../ui/dom.js';
import { M } from '../../game/materials.js';
import {
  getFloorMaterial,
  getWallMaterial,
  buildFloorSlab,
  buildCeiling,
  buildRoomWallsWithCutouts,
} from '../../game/HouseArchitecture.js';
import { BUILDERS } from '../../scenes/custom/builders.js';
import { typeDef } from '../../scenes/custom/catalog.js';
import { World } from '../../game/World.js';
import { loadCadHouseModel } from '../../game/CadModelLoader.js';

export class Designer3D {
  constructor(designer) {
    this.d = designer;
    this.showCeiling = false; // default off so admin can see inside from above
    this.showGrid = true;
    this.nightMode = false;
    this.animationId = null;
    this.disposed = false;
    this.objectMeshes = new Map(); // obj.id -> THREE.Object3D
    this.selectedHelper = null;

    this.buildDom();
  }

  buildDom() {
    this.canvas = el('canvas', {
      class: 'designer-3d-canvas',
      style: {
        width: '100%',
        height: '100%',
        display: 'block',
        outline: 'none',
      },
    });

    this.ceilingBtn = el('button', {
      type: 'button',
      class: 'btn btn-small',
      style: { background: 'rgba(30,41,59,0.85)', backdropFilter: 'blur(4px)', color: '#fff' },
      text: this.showCeiling ? '👁️ Ceiling: On' : '👁️ Ceiling: Off',
      onclick: () => {
        this.showCeiling = !this.showCeiling;
        this.ceilingBtn.textContent = this.showCeiling ? '👁️ Ceiling: On' : '👁️ Ceiling: Off';
        this.rebuildScene();
      },
    });

    const resetCamBtn = el('button', {
      type: 'button',
      class: 'btn btn-small',
      style: { background: 'rgba(30,41,59,0.85)', backdropFilter: 'blur(4px)', color: '#fff' },
      text: '🔄 Reset View',
      onclick: () => this.resetCamera(),
    });

    const topDownBtn = el('button', {
      type: 'button',
      class: 'btn btn-small',
      style: { background: 'rgba(30,41,59,0.85)', backdropFilter: 'blur(4px)', color: '#fff' },
      text: '📐 Top View',
      onclick: () => this.setTopDownView(),
    });

    const isoBtn = el('button', {
      type: 'button',
      class: 'btn btn-small',
      style: { background: 'rgba(30,41,59,0.85)', backdropFilter: 'blur(4px)', color: '#fff' },
      text: '🏠 Isometric 3D',
      onclick: () => this.setIsometricView(),
    });

    this.toolbar = el('div', {
      class: 'designer-3d-toolbar',
      style: {
        position: 'absolute',
        top: '12px',
        left: '12px',
        display: 'flex',
        gap: '8px',
        zIndex: '10',
      },
    }, this.ceilingBtn, topDownBtn, isoBtn, resetCamBtn);

    this.instructions = el('div', {
      style: {
        position: 'absolute',
        bottom: '12px',
        left: '12px',
        background: 'rgba(15,23,42,0.8)',
        backdropFilter: 'blur(4px)',
        padding: '6px 12px',
        borderRadius: '6px',
        fontSize: '0.8rem',
        color: '#94a3b8',
        pointerEvents: 'none',
        zIndex: '10',
      },
      text: '🖱️ Left Drag: Orbit · Right Drag: Pan · Scroll: Zoom · Click Object: Select',
    });

    this.wrap = el('div', {
      class: 'designer-3d-wrap',
      style: {
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: '480px',
        background: '#0b0f19',
        borderRadius: '8px',
        overflow: 'hidden',
      },
    }, this.canvas, this.toolbar, this.instructions);
  }

  mount() {
    this.disposed = false;
    const rect = this.wrap.getBoundingClientRect();
    const w = rect.width || 800;
    const h = rect.height || 600;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(w, h, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 1000);
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.02; // don't go below ground

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // 3D Transform Gizmo
    this.transformControls = new TransformControls(this.camera, this.canvas);
    this.transformControls.setMode('translate');
    this.transformControls.showY = false;
    this.transformControls.size = 0.75;
    this.transformControls.addEventListener('dragging-changed', (e) => {
      this.controls.enabled = !e.value;
      if (!e.value) {
        this.d.record();
        this.d.refreshAnalysis();
      }
    });
    this.transformControls.addEventListener('objectChange', () => {
      this.onGizmoMove();
    });

    this.bindCanvasEvents();
    this.bindKeyboardEvents();
    this.resetCamera();
    this.rebuildScene();

    const loop = () => {
      if (this.disposed) return;
      this.animationId = requestAnimationFrame(loop);
      this.controls.update();

      if (this.world) {
        this.world.time += 0.016;
        for (const u of this.world.updaters) u(0.016, this.world.time);
      }

      this.renderer.render(this.scene, this.camera);
    };
    loop();

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.wrap);
  }

  bindKeyboardEvents() {
    this.onKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      if (!this.d.selected) return;
      const obj = this.d.sel();
      if (!obj) return;
      const step = e.shiftKey ? 1.0 : 0.2;
      let moved = false;
      if (e.key === 'ArrowLeft') { obj.x -= step; moved = true; }
      else if (e.key === 'ArrowRight') { obj.x += step; moved = true; }
      else if (e.key === 'ArrowUp') { obj.z -= step; moved = true; }
      else if (e.key === 'ArrowDown') { obj.z += step; moved = true; }
      else if (e.key.toLowerCase() === 'r') { obj.rot = ((obj.rot || 0) + 90) % 360; moved = true; }
      else if (e.key === 'Delete' || e.key === 'Backspace') {
        this.d.removeSelected();
        e.preventDefault();
        return;
      } else if (e.key === 'Escape') {
        this.d.select(null);
        this.updateSelection();
        return;
      }

      if (moved) {
        e.preventDefault();
        obj.x = Math.round(obj.x * 10) / 10;
        obj.z = Math.round(obj.z * 10) / 10;
        this.d.record();
        this.rebuildScene();
        this.d.renderInspector();
        this.d.drawPlan();
        this.d.refreshAnalysis();
      }
    };
    window.addEventListener('keydown', this.onKeyDown);
  }

  onGizmoMove() {
    const meshGroup = this.transformControls?.object;
    if (!meshGroup || !this.d.selected) return;
    const obj = this.d.sel();
    if (obj) {
      obj.x = Math.round(meshGroup.position.x * 10) / 10;
      obj.z = Math.round(meshGroup.position.z * 10) / 10;
      this.d.renderInspector();
      this.d.drawPlan();
      this.d.refreshAnalysis();
      this.d.ed.markDirty();
    }
    if (this.selectedHelper) {
      const box = new THREE.Box3().setFromObject(meshGroup);
      this.selectedHelper.box.copy(box);
    }
  }

  bindCanvasEvents() {
    this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.dragOffset = new THREE.Vector3();
    this.isDirectDragging = false;

    this.canvas.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      if (this.transformControls?.dragging) return;

      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const meshes = [];
      this.objectMeshes.forEach((mesh, id) => {
        mesh.traverse((c) => {
          if (c.isMesh) {
            c.userData.objectId = id;
            meshes.push(c);
          }
        });
      });

      const hits = this.raycaster.intersectObjects(meshes, true);
      if (hits.length > 0) {
        const objId = hits[0].object.userData.objectId;
        if (objId) {
          this.d.select(objId);
          this.updateSelection();

          const meshGroup = this.objectMeshes.get(objId);
          if (meshGroup) {
            const planeHit = new THREE.Vector3();
            if (this.raycaster.ray.intersectPlane(this.dragPlane, planeHit)) {
              this.dragOffset.subVectors(planeHit, meshGroup.position);
              this.isDirectDragging = true;
              this.controls.enabled = false;
            }
          }
          return;
        }
      }
      this.d.select(null);
      this.updateSelection();
    });

    this.canvas.addEventListener('pointermove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (this.isDirectDragging && this.d.selected) {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const planeHit = new THREE.Vector3();
        if (this.raycaster.ray.intersectPlane(this.dragPlane, planeHit)) {
          const meshGroup = this.objectMeshes.get(this.d.selected);
          if (meshGroup) {
            meshGroup.position.x = planeHit.x - this.dragOffset.x;
            meshGroup.position.z = planeHit.z - this.dragOffset.z;

            const obj = this.d.sel();
            if (obj) {
              obj.x = Math.round(meshGroup.position.x * 10) / 10;
              obj.z = Math.round(meshGroup.position.z * 10) / 10;
              this.d.renderInspector();
              this.d.drawPlan();
            }

            if (this.selectedHelper) {
              const box = new THREE.Box3().setFromObject(meshGroup);
              this.selectedHelper.box.copy(box);
            }
          }
        }
        this.canvas.style.cursor = 'grabbing';
        return;
      }

      // Hover cursor
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const meshes = [];
      this.objectMeshes.forEach((mesh, id) => {
        mesh.traverse((c) => { if (c.isMesh) meshes.push(c); });
      });
      const hits = this.raycaster.intersectObjects(meshes, true);
      this.canvas.style.cursor = hits.length > 0 ? 'pointer' : 'default';
    });

    const stopDragging = () => {
      if (this.isDirectDragging) {
        this.isDirectDragging = false;
        this.controls.enabled = true;
        this.d.record();
        this.d.refreshAnalysis();
        this.d.ed.markDirty();
      }
    };

    this.canvas.addEventListener('pointerup', stopDragging);
    this.canvas.addEventListener('pointercancel', stopDragging);
  }

  resize() {
    if (!this.wrap || !this.renderer) return;
    const rect = this.wrap.getBoundingClientRect();
    const w = rect.width || 800;
    const h = rect.height || 600;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  resetCamera() {
    const layout = this.d.layout || { size: { w: 10, d: 8, h: 3.2 } };
    const maxDim = Math.max(layout.size?.w || 10, layout.size?.d || 8);
    this.camera.position.set(maxDim * 0.9, maxDim * 0.95, maxDim * 1.1);
    this.controls.target.set(0, 1.2, 0);
    this.controls.update();
  }

  setTopDownView() {
    const layout = this.d.layout || { size: { w: 10, d: 8, h: 3.2 } };
    const maxDim = Math.max(layout.size?.w || 10, layout.size?.d || 8);
    this.camera.position.set(0, maxDim * 1.6, 0.01);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  setIsometricView() {
    const layout = this.d.layout || { size: { w: 10, d: 8, h: 3.2 } };
    const maxDim = Math.max(layout.size?.w || 10, layout.size?.d || 8);
    this.camera.position.set(maxDim * 0.85, maxDim * 0.7, maxDim * 0.85);
    this.controls.target.set(0, 1.0, 0);
    this.controls.update();
  }

  rebuildScene() {
    const room = this.d.room;
    if (!room) return;
    const layout = this.d.layout;
    const size = layout.size || { w: 10, d: 8, h: 3.2 };
    const theme = layout.theme || {
      floor: 'parquet',
      wall: 'plaster',
      wall_color: '#f3f4f6',
      ceiling: 'gypsum_led',
      ceiling_color: '#ffffff',
      light: 'warm',
      brightness: 1.2,
    };

    const rw = Number(size.w) || 10;
    const rd = Number(size.d) || 8;
    const rh = Number(size.h) || 3.2;

    if (this.transformControls) this.transformControls.detach();
    if (this.selectedHelper && this.scene) {
      this.scene.remove(this.selectedHelper);
      this.selectedHelper = null;
    }

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0f172a');
    if (this.transformControls) {
      this.scene.add(this.transformControls.getHelper());
    }

    // Create World wrapper for builders
    this.world = new World({}, {
      id: room.id || 'room',
      name: room.name || 'Room',
      accent: room.color || '#3b82f6',
    });
    this.world.scene = this.scene;

    // Lighting
    const skyLight = new THREE.HemisphereLight('#dfe6f2', '#334155', 0.85);
    this.scene.add(skyLight);

    const sun = new THREE.DirectionalLight('#fff4e6', 1.2);
    sun.position.set(rw * 0.8, rh * 2.5, rd * 1.2);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.bias = -0.0005;
    this.scene.add(sun);

    // Warm ambient interior fill light
    const interiorLight = new THREE.PointLight('#ffeacc', (theme.brightness || 1.1) * 16, Math.max(rw, rd) * 1.4, 2);
    interiorLight.position.set(0, rh - 0.4, 0);
    this.scene.add(interiorLight);

    // Exterior Ground Platform
    const groundMat = M.tile();
    this.world.box({
      x: 0,
      y: -0.32,
      z: 0,
      w: rw + 8,
      h: 0.3,
      d: rd + 8,
      material: groundMat,
      tile: 2.5,
      receive: true,
    });

    const hasCadModel = !!(this.d.ed?.house?.environment?.cad_model);

    // 1. Room Floor Slab (standard procedural rooms only)
    if (!hasCadModel) {
      const floorMat = getFloorMaterial(theme.floor);
      buildFloorSlab(this.world, {
        x: 0,
        y: 0,
        z: 0,
        w: rw,
        d: rd,
        material: floorMat,
      });
    }

    // 2. Ceiling ("Clining") - optional toggle in 3D builder (standard rooms only)
    if (this.showCeiling && !hasCadModel) {
      buildCeiling(this.world, {
        x: 0,
        y: rh,
        z: 0,
        w: rw,
        d: rd,
        ceilingType: theme.ceiling,
        ceilingColor: theme.ceiling_color,
      });
    }

    // 3. Walls with cutouts for doors and windows (standard modular houses only)
    if (!hasCadModel) {
      const wallMat = getWallMaterial(theme.wall, theme.wall_color);
      buildRoomWallsWithCutouts(this.world, {
        rx: 0,
        ry: 0,
        rz: 0,
        w: rw,
        d: rd,
        h: rh,
        doors: layout.doors || [],
        windows: layout.windows || [],
        wallMaterial: wallMat,
        accentColor: room.color || '#3b82f6',
      });
    }

    // 3.5. Imported 3D CAD Architectural House Shell (if present)
    const cadModel = this.d.ed?.house?.environment?.cad_model;
    if (cadModel && cadModel.file_path) {
      loadCadHouseModel(this.world, cadModel, { isDesigner: false });
    }

    // 4. Placed Furniture & Objects
    this.objectMeshes.clear();
    const ed = this.d.ed;

    for (const o of layout.objects || []) {
      const group = new THREE.Group();
      this.scene.add(group);
      this.objectMeshes.set(o.id, group);

      const subWorld = {
        scene: group,
        box: (params) => this.world.box({ ...params, parent: group }),
        cylinder: (params) => this.world.cylinder({ ...params, parent: group }),
        light: (l, x, y, z) => {
          l.position.set(x, y, z);
          group.add(l);
          return l;
        },
        collider: () => {},
        interact: () => {},
      };

      let fn = BUILDERS[o.type];
      let def = typeDef(o.library_id || o.type);

      if (!fn && def) {
        if (def.file_type === 'svg') fn = BUILDERS.svg;
        else if (def.file_type === 'dxf' || def.file_type === 'cad') fn = BUILDERS.dxf;
        else if (def.file_type === 'obj') fn = BUILDERS.obj;
      }

      if (fn) {
        try {
          fn(subWorld, room, o, { data: ed?.state || {} }, def);
        } catch (err) {
          console.warn(`[3D Builder] Could not build object ${o.type}:`, err);
        }
      }
    }

    this.updateSelection();
  }

  updateSelection() {
    if (this.selectedHelper && this.scene) {
      this.scene.remove(this.selectedHelper);
      this.selectedHelper = null;
    }

    const selId = this.d.selected;
    if (!selId) {
      if (this.transformControls) this.transformControls.detach();
      return;
    }

    const meshGroup = this.objectMeshes.get(selId);
    if (!meshGroup) {
      if (this.transformControls) this.transformControls.detach();
      return;
    }

    const box = new THREE.Box3().setFromObject(meshGroup);
    if (!box.isEmpty()) {
      this.selectedHelper = new THREE.Box3Helper(box, new THREE.Color('#38bdf8'));
      this.scene.add(this.selectedHelper);
    }
    if (this.transformControls) {
      this.transformControls.attach(meshGroup);
    }
  }

  dispose() {
    this.disposed = true;
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.resizeObserver?.disconnect();
    if (this.onKeyDown) window.removeEventListener('keydown', this.onKeyDown);
    if (this.transformControls) this.transformControls.dispose();
    this.controls?.dispose();
    this.renderer?.dispose();
  }
}
