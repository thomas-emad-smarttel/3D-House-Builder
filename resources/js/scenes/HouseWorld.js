import * as THREE from 'three';
import { World } from '../game/World.js';
import { M } from '../game/materials.js';
import { SETTINGS } from '../config/settings.js';
import {
  getFloorMaterial,
  getWallMaterial,
  buildFloorSlab,
  buildCeiling,
  buildRoomWallsWithCutouts,
  buildArchitecturalStairs,
} from '../game/HouseArchitecture.js';
import { BUILDERS } from './custom/builders.js';
import { syncLibrary, registerLibraryObject, typeDef } from './custom/catalog.js';

/**
 * Builds the 3D House Environment with multi-floor levels, rooms, doors, ceilings, stairs and furniture.
 */
export function buildHouseWorld(ctx, houseData, activeFloorLevel = 'all', options = {}) {
  const floors = houseData.floors || [];
  const isAllFloors = activeFloorLevel === 'all' || options.allFloors === true || activeFloorLevel === undefined;
  const activeFloor = floors.find((f) => f.level === activeFloorLevel) || floors[0] || {
    id: 'floor-0',
    name: 'Ground Floor',
    level: 0,
    height: 3.4,
    elevation: 0,
    rooms: [],
  };

  const targetFloors = isAllFloors ? floors : [activeFloor];

  const plotW = Number(houseData.plot_width) || 30;
  const plotD = Number(houseData.plot_depth) || 30;
  const env = houseData.environment || {};

  const world = new World(ctx, {
    id: isAllFloors ? 'house-all-floors' : `house-floor-${activeFloor.level}`,
    name: isAllFloors ? `${houseData.title} — Full Multi-Story Villa` : `${houseData.title} — ${activeFloor.name}`,
    accent: '#3b82f6',
    ambient: { base: 120, bright: 0.5, floor: 'wood' },
  });

  // Track all floor elevations for smooth stair climbing and multi-floor navigation
  world.floorElevations = floors.map((f) => {
    return f.elevation !== undefined ? Number(f.elevation) : (Number(f.level || 0) * 3.4);
  }).sort((a, b) => a - b);
  if (!world.floorElevations.includes(0)) world.floorElevations.unshift(0);

  const scene = world.scene;
  const skyColor = env.sky_color || '#cfe0ff';
  scene.background = new THREE.Color(skyColor);
  scene.fog = new THREE.Fog(skyColor, plotW * 1.5, plotW * 4.5);

  /* ------------------------------------------------------------- Lighting */
  scene.add(new THREE.HemisphereLight(skyColor, '#3b432e', 0.85));
  const sun = new THREE.DirectionalLight('#fff4e0', env.sun_intensity ?? 1.15);
  sun.position.set(plotW * 0.7, 24, plotD * 0.8);
  sun.castShadow = SETTINGS.render.shadows;
  sun.shadow.mapSize.set(2048, 2048);
  const camR = Math.max(plotW, plotD) * 0.9;
  Object.assign(sun.shadow.camera, {
    left: -camR,
    right: camR,
    top: camR,
    bottom: -camR,
    near: 1,
    far: 80,
  });
  // Smooth shadow bias to completely eliminate shadow acne and pixel jitter
  sun.shadow.bias = -0.0001;
  sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);

  /* ------------------------------------------------ Exterior Ground Lawn */
  const grassMat = M.solid('#3d5a36', { rough: 0.95 });
  const patioPaving = M.tile();

  // Surrounding green lawn
  world.box({
    x: 0,
    y: -0.32,
    z: 0,
    w: plotW * 2.5,
    h: 0.3,
    d: plotD * 2.5,
    material: grassMat,
    tile: 6,
    receive: true,
  });

  // House foundation plinth / terrace patio
  world.box({
    x: 0,
    y: -0.02,
    z: 0,
    w: plotW * 1.05,
    h: 0.04,
    d: plotD * 1.05,
    material: patioPaving,
    tile: 3,
    receive: true,
  });

  world.objects = new Map(); // o.id -> THREE.Object3D

  /* ---------------------------------------------------- Build Floor Rooms */
  let playerSpawned = false;

  for (const floor of targetFloors) {
    const elevation = floor.elevation !== undefined ? Number(floor.elevation) : (Number(floor.level || 0) * 3.4);

    for (const room of floor.rooms || []) {
      const layout = room.layout || {};
      const size = layout.size || { w: 10, d: 8, h: 3.2 };
      const pos = layout.position || { x: 0, z: 0 };
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
      const rx = Number(pos.x) || 0;
      const rz = Number(pos.z) || 0;

      // Default player spawn inside first room
      if (!playerSpawned) {
        world.spawn = { x: rx, z: rz + rd * 0.2, yaw: 0 };
        playerSpawned = true;
      }

      // 1. Floor Slab
      const floorMat = getFloorMaterial(theme.floor);
      buildFloorSlab(world, {
        x: rx,
        y: elevation,
        z: rz,
        w: rw,
        d: rd,
        material: floorMat,
        roomId: room.id,
        floorId: floor.id,
      });

      // 2. Ceiling ("Clining")
      const ceilingGroup = buildCeiling(world, {
        x: rx,
        y: elevation + rh,
        z: rz,
        w: rw,
        d: rd,
        ceilingType: theme.ceiling,
        ceilingColor: theme.ceiling_color,
        roomId: room.id,
        floorId: floor.id,
      });

      if (options.showCeilings === false && ceilingGroup) {
        ceilingGroup.visible = false;
      }

      // 3. Room Interior Ambient Light
      const roomLightColor = theme.light === 'cool' ? '#d8e8ff' : '#ffeacc';
      const roomLightIntensity = (theme.brightness || 1.0) * 18;
      const ptLight = new THREE.PointLight(roomLightColor, roomLightIntensity, Math.max(rw, rd) * 1.2, 2);
      ptLight.position.set(rx, elevation + rh - 0.4, rz);
      scene.add(ptLight);

      // 4. Perimeter Walls with Cutouts for Doors & Windows ("Build doorس")
      const wallMat = getWallMaterial(theme.wall, theme.wall_color);
      buildRoomWallsWithCutouts(world, {
        rx,
        ry: elevation,
        rz,
        w: rw,
        d: rd,
        h: rh,
        doors: layout.doors || [],
        windows: layout.windows || [],
        wallMaterial: wallMat,
        accentColor: room.color || '#3b82f6',
        roomId: room.id,
        floorId: floor.id,
      });

      // 5. Placed Furniture & Custom Objects
      for (const o of layout.objects || []) {
        const objRot = o.rot || 0;
        const ox = rx + (o.x || 0);
        const oz = rz + (o.z || 0);
        const clonedObj = { ...o, x: ox, y: elevation, z: oz };

        let fn = BUILDERS[o.type];
        let def = null;
        if (!fn) {
          def = typeDef(o.library_id || o.type);
          if (!def && Array.isArray(ctx?.data?.library)) {
            const found = ctx.data.library.find((item) => item.id === o.library_id || item.id === o.type);
            if (found) {
              registerLibraryObject(found);
              def = typeDef(o.library_id || o.type);
            }
          }
          if (def?.file_type === 'svg') fn = BUILDERS.svg;
          else if (def?.file_type === 'dxf' || def?.file_type === 'cad') fn = BUILDERS.dxf;
          else if (def?.file_type === 'obj') fn = BUILDERS.obj;
        }

        if (fn) {
          try {
            const beforeCount = world.scene.children.length;
            fn(world, room, clonedObj, ctx, def);
            const afterCount = world.scene.children.length;

            const added = [];
            for (let i = beforeCount; i < afterCount; i++) {
              added.push(world.scene.children[i]);
            }

            let mainObj = null;
            if (added.length === 1) {
              mainObj = added[0];
            } else if (added.length > 1) {
              mainObj = new THREE.Group();
              mainObj.name = `group-${o.id}`;
              world.scene.add(mainObj);
              for (const ch of added) {
                world.scene.remove(ch);
                mainObj.add(ch);
              }
            }

            if (mainObj) {
              mainObj.userData.objectId = o.id;
              mainObj.userData.roomId = room.id;
              mainObj.userData.floorId = floor.id;
              mainObj.userData.isFurniture = true;
              mainObj.traverse((sub) => {
                sub.userData.objectId = o.id;
                sub.userData.roomId = room.id;
                sub.userData.floorId = floor.id;
                sub.userData.isFurniture = true;
              });
              world.objects.set(o.id, mainObj);
            }
          } catch (err) {
            console.warn(`[House] could not build object ${o.type}:`, err);
          }
        }
      }
    }
  }

  // Set world bounds to plot size
  world.bounds = {
    minX: -plotW / 2,
    maxX: plotW / 2,
    minZ: -plotD / 2,
    maxZ: plotD / 2,
  };

  return world;
}
