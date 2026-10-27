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
  buildArchitecturalElevator,
} from '../game/HouseArchitecture.js';
import { BUILDERS } from './custom/builders.js';
import { syncLibrary, registerLibraryObject, typeDef } from './custom/catalog.js';
import { loadCadHouseModel } from '../game/CadModelLoader.js';

/**
 * Builds the 3D House Environment with multi-floor levels, rooms, doors, ceilings, stairs and furniture.
 */
export function buildHouseWorld(ctx, houseData, activeFloorLevel = 'all', options = {}) {
  const floors = (houseData.floors && Array.isArray(houseData.floors) && houseData.floors.length)
    ? houseData.floors
    : (houseData.floors_data && Array.isArray(houseData.floors_data) ? houseData.floors_data : (houseData.floors || []));
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
  world.floorSlabs = [];

  // Stairs definition list (connects floors)
  const stairsList = (houseData.stairs && Array.isArray(houseData.stairs) && houseData.stairs.length)
    ? [...houseData.stairs]
    : (env.stairs && Array.isArray(env.stairs) && env.stairs.length
      ? [...env.stairs]
      : []);

  const hasCadModel = !!(env.cad_model || houseData.cad_model);

  if (hasCadModel && !stairsList.length) {
    // Grand foyer floating staircase inside the entrance gallery connecting to the upper level
    stairsList.push({
      id: 'stairs-foyer',
      name: 'Grand Foyer Floating Stairs',
      style: 'floating_wood',
      startX: 7.5,
      startY: 0.45,
      startZ: 1.5,
      endX: 7.5,
      endY: 3.4,
      endZ: -3.5,
      width: 1.6,
      steps: 18,
    });
  } else if (!stairsList.length && floors.length > 1 && !hasCadModel) {
    const fl0 = floors.find((f) => f.level === 0) || floors[0];
    const fl1 = floors.find((f) => f.level === 1) || floors[1];
    if (fl0 && fl1) {
      const e0 = Number(fl0.elevation ?? 0);
      const e1 = Number(fl1.elevation ?? (e0 + 3.4));
      stairsList.push({
        id: 'stairs-fl0-fl1',
        startX: -9,
        startY: e0,
        startZ: 2.2,
        endX: -9,
        endY: e1,
        endZ: -2.2,
        width: 1.4,
        steps: 18,
        style: 'floating_wood',
        name: 'Grand Foyer Stairs (Level 0 ➔ Level 1)',
      });
    }
  }

  const scene = world.scene;
  const skyColor = env.sky_color || '#cfe0ff';
  scene.background = new THREE.Color(skyColor);
  scene.fog = new THREE.Fog(skyColor, plotW * 1.5, plotW * 4.5);

  /* ------------------------------------------------------------- Lighting */
  const hemiSky = hasCadModel ? '#cfe8fc' : skyColor;
  const hemiGround = hasCadModel ? '#334155' : '#3b432e';
  const hemiIntensity = hasCadModel ? 0.65 : 0.85;
  scene.add(new THREE.HemisphereLight(hemiSky, hemiGround, hemiIntensity));

  const sun = new THREE.DirectionalLight('#fff4e0', env.sun_intensity ?? (hasCadModel ? 0.85 : 1.15));
  if (hasCadModel) {
    sun.position.set(plotW * 0.45, 65, plotD * 0.45);
  } else {
    sun.position.set(plotW * 0.7, 24, plotD * 0.8);
  }
  // For massive 1.34M triangle CAD models, disable heavy shadow pass to guarantee 60+ FPS
  sun.castShadow = hasCadModel ? false : SETTINGS.render.shadows;
  sun.shadow.mapSize.set(1024, 1024);
  const camR = Math.max(plotW, plotD) * (hasCadModel ? 0.8 : 0.9);
  Object.assign(sun.shadow.camera, {
    left: -camR,
    right: camR,
    top: camR,
    bottom: -camR,
    near: 1,
    far: hasCadModel ? 220 : 80,
  });
  // Precision shadow bias and normal offset without shadow acne
  sun.shadow.bias = hasCadModel ? -0.0003 : -0.0001;
  sun.shadow.normalBias = hasCadModel ? 0.04 : 0.02;
  sun.shadow.radius = 1.0;
  scene.add(sun, sun.target);

  if (hasCadModel) {
    // Pure GPU ambient fill light for balanced contrast without bleached overexposure
    scene.add(new THREE.AmbientLight('#ffffff', 0.28));
  }

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

  // House foundation plinth / terrace patio (for standard procedural houses)
  if (!hasCadModel) {
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
  }

  world.objects = new Map(); // o.id -> THREE.Object3D
  world.doors = new Map();   // doorId -> THREE.Object3D
  world.windows = new Map(); // windowId -> THREE.Object3D
  world.stairs = [];         // Array of stair colliders for Player physics
  world.stairsMeshes = new Map(); // stairsId -> THREE.Object3D
  world.stairs.get = (id) => world.stairsMeshes.get(id);
  world.stairs.set = (id, mesh) => world.stairsMeshes.set(id, mesh);

  // Set world bounds to plot dimensions
  world.bounds = {
    minX: -plotW / 2,
    maxX: plotW / 2,
    minZ: -plotD / 2,
    maxZ: plotD / 2,
  };

  // 0. Load Imported 3D CAD Architectural House Model (if present)
  const cadModel = env.cad_model || houseData.cad_model;
  if (cadModel && cadModel.file_path) {
    loadCadHouseModel(world, cadModel, {
      isDesigner: false,
      houseData,
      floors,
    });
  }

/**
 * Deduplicate shared partition walls between adjacent rooms on the same floor.
 * Eliminates overlapping duplicate wall meshes, coplanar z-fighting, and doorway blockage.
 */
function computeFloorWallDeduplication(rooms = []) {
  const result = new Map();
  for (const r of rooms) {
    result.set(r.id, {
      skipWalls: { south: false, north: false, east: false, west: false },
      extraDoors: [],
    });
  }

  const roomBoxes = rooms.map((r, idx) => {
    const layout = r.layout || {};
    const size = layout.size || { w: 10, d: 8, h: 3.2 };
    const pos = layout.position || { x: 0, z: 0 };
    const isBalcony = r.type === 'balcony' || layout.theme?.ceiling === 'open_sky';
    const rw = Number(size.w) || 10;
    const rd = Number(size.d) || 8;
    const rx = Number(pos.x) || 0;
    const rz = Number(pos.z) || 0;
    return {
      id: r.id,
      idx,
      room: r,
      isBalcony,
      rx,
      rz,
      minX: rx - rw / 2,
      maxX: rx + rw / 2,
      minZ: rz - rd / 2,
      maxZ: rz + rd / 2,
    };
  });

  const EPS = 0.08;

  for (let i = 0; i < roomBoxes.length; i++) {
    for (let j = 0; j < roomBoxes.length; j++) {
      if (i === j) continue;
      const A = roomBoxes[i];
      const B = roomBoxes[j];

      // A is south of B: touching along Z = A.minZ == B.maxZ
      if (Math.abs(A.minZ - B.maxZ) < EPS) {
        const overlapMinX = Math.max(A.minX, B.minX);
        const overlapMaxX = Math.min(A.maxX, B.maxX);
        if (overlapMaxX - overlapMinX > 0.3) {
          if (B.isBalcony) {
            result.get(B.id).skipWalls.south = true;
          } else if (A.isBalcony) {
            result.get(A.id).skipWalls.north = true;
          } else if (A.idx < B.idx) {
            result.get(B.id).skipWalls.south = true;
            const bDoors = (B.room.layout?.doors || []).filter((d) => (d.wall || 'south').toLowerCase() === 'south');
            for (const bd of bDoors) {
              const worldDoorX = B.rx + (bd.offset || 0);
              const aOffset = worldDoorX - A.rx;
              result.get(A.id).extraDoors.push({ ...bd, wall: 'north', offset: aOffset });
            }
          } else {
            result.get(A.id).skipWalls.north = true;
            const aDoors = (A.room.layout?.doors || []).filter((d) => (d.wall || 'north').toLowerCase() === 'north');
            for (const ad of aDoors) {
              const worldDoorX = A.rx + (ad.offset || 0);
              const bOffset = worldDoorX - B.rx;
              result.get(B.id).extraDoors.push({ ...ad, wall: 'south', offset: bOffset });
            }
          }
        }
      }

      // A is west of B: touching along X = A.maxX == B.minX
      if (Math.abs(A.maxX - B.minX) < EPS) {
        const overlapMinZ = Math.max(A.minZ, B.minZ);
        const overlapMaxZ = Math.min(A.maxZ, B.maxZ);
        if (overlapMaxZ - overlapMinZ > 0.3) {
          if (B.isBalcony) {
            result.get(B.id).skipWalls.west = true;
          } else if (A.isBalcony) {
            result.get(A.id).skipWalls.east = true;
          } else if (A.idx < B.idx) {
            result.get(B.id).skipWalls.west = true;
            const bDoors = (B.room.layout?.doors || []).filter((d) => (d.wall || 'west').toLowerCase() === 'west');
            for (const bd of bDoors) {
              const worldDoorZ = B.rz + (bd.offset || 0);
              const aOffset = worldDoorZ - A.rz;
              result.get(A.id).extraDoors.push({ ...bd, wall: 'east', offset: aOffset });
            }
          } else {
            result.get(A.id).skipWalls.east = true;
            const aDoors = (A.room.layout?.doors || []).filter((d) => (d.wall || 'east').toLowerCase() === 'east');
            for (const ad of aDoors) {
              const worldDoorZ = A.rz + (ad.offset || 0);
              const bOffset = worldDoorZ - B.rz;
              result.get(B.id).extraDoors.push({ ...ad, wall: 'west', offset: bOffset });
            }
          }
        }
      }
    }
  }

  return result;
}

  /* ---------------------------------------------------- Build Floor Rooms */
  let playerSpawned = false;

  for (const floor of targetFloors) {
    const elevation = floor.elevation !== undefined ? Number(floor.elevation) : (Number(floor.level || 0) * 3.4);
    const floorDedup = computeFloorWallDeduplication(floor.rooms || []);

    const floorGroup = new THREE.Group();
    floorGroup.name = `floor-${floor.level}-group`;
    floorGroup.userData = { level: floor.level, elevation };
    scene.add(floorGroup);
    world.currentFloorGroup = floorGroup;
    if (!world.floorGroups) world.floorGroups = new Map();
    world.floorGroups.set(floor.level, floorGroup);

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

      // 1. Floor Slab & Ceiling Slab Stairwell Void Openings
      let floorVoidZone = null;
      let ceilingVoidZone = null;

      for (const st of stairsList) {
        const sw = st.width || 1.3;
        const hw = sw / 2;
        const runX = st.endX - st.startX;
        const runZ = st.endZ - st.startZ;
        const runDist = Math.hypot(runX, runZ);
        const dirX = runDist > 0.001 ? runX / runDist : 0;
        const dirZ = runDist > 0.001 ? runZ / runDist : 0;

        // Top cut terminates slightly before landing step so the upper floor landing is solid floor
        const topCutX = st.endX - dirX * 0.25;
        const topCutZ = st.endZ - dirZ * 0.25;

        const sMinX = Math.min(st.startX, st.endX) - hw;
        const sMaxX = Math.max(st.startX, st.endX) + hw;
        const sMinZ = Math.min(st.startZ, st.endZ) - hw;
        const sMaxZ = Math.max(st.startZ, st.endZ) + hw;
        const inRoomBounds = rx - rw / 2 <= sMaxX && rx + rw / 2 >= sMinX && rz - rd / 2 <= sMaxZ && rz + rd / 2 >= sMinZ;

        if (inRoomBounds) {
          // Arriving staircase lands on this floor: cut void in floor slab, preserving top landing step & corridor
          if (Math.abs(st.endY - elevation) < 0.4) {
            floorVoidZone = {
              minX: Math.min(st.startX, topCutX) - hw,
              maxX: Math.max(st.startX, topCutX) + hw,
              minZ: Math.min(st.startZ, topCutZ) - (Math.abs(dirZ) < 0.001 ? hw : 0),
              maxZ: Math.max(st.startZ, topCutZ) + (Math.abs(dirZ) < 0.001 ? hw : 0),
            };
          }
          // Ascending staircase climbs through this ceiling: cut void in ceiling slab
          if (st.startY < (elevation + rh) && st.endY >= (elevation + rh - 0.4)) {
            ceilingVoidZone = { minX: sMinX, maxX: sMaxX, minZ: sMinZ, maxZ: sMaxZ };
          }
        }
      }

      if (!hasCadModel) {
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
          voidZone: floorVoidZone,
        });

        // Register spatial boundaries of this floor slab for realistic gravity & mid-air drop detection
        if (!world.floorSlabs) world.floorSlabs = [];
        world.floorSlabs.push({
          minX: rx - rw / 2 - 0.1,
          maxX: rx + rw / 2 + 0.1,
          minZ: rz - rd / 2 - 0.1,
          maxZ: rz + rd / 2 + 0.1,
          elevation: Number(elevation),
          voidZone: floorVoidZone ? { ...floorVoidZone } : null,
        });
      }

      // 2. Ceiling ("Clining") - skipped for imported 3D CAD architecture
      if (!hasCadModel) {
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
          voidZone: ceilingVoidZone,
        });

        if (options.showCeilings === false && ceilingGroup) {
          ceilingGroup.visible = false;
        }
      }

      // 3. Room Interior Ambient Light (indoor rooms only; balconies are naturally lit by sun/sky)
      const isOutdoor = theme.ceiling === 'open_sky' || room.type === 'balcony';
      if (!isOutdoor) {
        const roomLightColor = theme.light === 'cool' ? '#d8e8ff' : '#ffeacc';
        const roomLightIntensity = (theme.brightness || 1.0) * 12;
        const ptLight = new THREE.PointLight(roomLightColor, roomLightIntensity, Math.max(rw, rd) * 1.2, 2);
        ptLight.position.set(rx, elevation + rh - 0.4, rz);
        ptLight.userData = { level: floor.level, elevation };
        floorGroup.add(ptLight);
        if (!world.roomLights) world.roomLights = [];
        world.roomLights.push(ptLight);
      }

      // 4. Perimeter Walls with Cutouts for Doors & Windows ("Build doorس")
      const wallMat = getWallMaterial(theme.wall, theme.wall_color);
      const wallColors = theme.wall_colors || {};
      const wallMaterialsByWall = {
        south: wallColors.south ? getWallMaterial(theme.wall, wallColors.south) : wallMat,
        north: wallColors.north ? getWallMaterial(theme.wall, wallColors.north) : wallMat,
        east: wallColors.east ? getWallMaterial(theme.wall, wallColors.east) : wallMat,
        west: wallColors.west ? getWallMaterial(theme.wall, wallColors.west) : wallMat,
      };

      const dedup = floorDedup.get(room.id) || { skipWalls: {}, extraDoors: [] };
      const baseDoors = layout.doors || [];
      const combinedDoors = [...baseDoors];
      for (const ed of dedup.extraDoors) {
        const alreadyHas = combinedDoors.some(
          (d) => (d.wall || '').toLowerCase() === (ed.wall || '').toLowerCase() && Math.abs((d.offset || 0) - (ed.offset || 0)) < 0.3
        );
        if (!alreadyHas) {
          combinedDoors.push(ed);
        }
      }

      const isBalconyRoom = room.type === 'balcony' || theme.ceiling === 'open_sky';

      if (!hasCadModel) {
        buildRoomWallsWithCutouts(world, {
          rx,
          ry: elevation,
          rz,
          w: rw,
          d: rd,
          h: rh,
          doors: combinedDoors,
          windows: layout.windows || [],
          wallMaterial: wallMat,
          wallMaterialsByWall,
          accentColor: room.color || '#3b82f6',
          roomId: room.id,
          floorId: floor.id,
          isBalcony: isBalconyRoom,
          skipWalls: dedup.skipWalls,
        });
      }

      // 5. Placed Furniture & Custom Objects
      for (const o of layout.objects || []) {
        const objRot = o.rot || 0;
        const ox = rx + (o.x || 0);
        const oz = rz + (o.z || 0);
        const clonedObj = { ...o, x: ox, y: elevation, z: oz };

        // Decomposed CAD sub-objects are rendered directly with authentic geometry in CadModelLoader
        if (o.is_cad_sub_object) {
          continue;
        }

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
            const container = world.currentFloorGroup ?? world.scene;
            const beforeCount = container.children.length;
            fn(world, room, clonedObj, ctx, def);
            const afterCount = container.children.length;

            const added = [];
            for (let i = beforeCount; i < afterCount; i++) {
              added.push(container.children[i]);
            }

            let mainObj = null;
            if (added.length === 1) {
              mainObj = added[0];
            } else if (added.length > 1) {
              mainObj = new THREE.Group();
              mainObj.name = `group-${o.id}`;
              container.add(mainObj);
              for (const ch of added) {
                container.remove(ch);
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
    world.currentFloorGroup = null;
  }

  // 6. Build Architectural Stairs between floors
  for (const st of stairsList) {
    const sStartY = Number(st.startY ?? 0);
    const sEndY = Number(st.endY ?? (sStartY + 3.4));
    const sStartX = Number(st.startX ?? 0);
    const sEndX = Number(st.endX ?? sStartX);
    const sStartZ = Number(st.startZ ?? 0);
    const sEndZ = Number(st.endZ ?? (sStartZ + 4.0));
    const normalizedStair = {
      ...st,
      startX: sStartX,
      startY: sStartY,
      startZ: sStartZ,
      endX: sEndX,
      endY: sEndY,
      endZ: sEndZ,
      width: Number(st.width ?? 1.4),
      steps: Number(st.steps ?? 18),
    };

    if (isAllFloors) {
      const stairGroup = buildArchitecturalStairs(world, normalizedStair);
      if (stairGroup && normalizedStair.id) world.stairs.set(normalizedStair.id, stairGroup);
    } else {
      // Single floor view: only build staircases connecting to the active floor
      const activeElev = Number(activeFloor.elevation ?? (activeFloor.level * 3.4));
      if (Math.abs(sStartY - activeElev) < 0.5 || Math.abs(sEndY - activeElev) < 0.5) {
        const stairGroup = buildArchitecturalStairs(world, normalizedStair);
        if (stairGroup && normalizedStair.id) world.stairs.set(normalizedStair.id, stairGroup);
      }
    }
  }

  // 7. Build Architectural Elevators connecting floors
  const elevatorsList = (houseData.elevators && Array.isArray(houseData.elevators) && houseData.elevators.length)
    ? houseData.elevators
    : ((env && Array.isArray(env.elevators)) ? env.elevators : []);

  for (const elDef of elevatorsList) {
    buildArchitecturalElevator(world, elDef, floors, ctx, isAllFloors ? 'all' : activeFloor.level);
  }

  // Set world bounds to plot size
  world.bounds = {
    minX: -plotW / 2,
    maxX: plotW / 2,
    minZ: -plotD / 2,
    maxZ: plotD / 2,
  };

  // 8. High-Performance Dynamic Lighting for Multi-Story Buildings & Skyscraper Hotels
  // Culls distant room point lights to eliminate GPU fragment shader overhead while keeping all 20 floors' walls visible
  if (isAllFloors && floors.length > 3) {
    const spawnElev = Number(targetFloors[0]?.elevation ?? 0);

    // Initial light cull on spawn: keep only lights on active floor (+-1 level)
    if (world.roomLights) {
      for (const l of world.roomLights) {
        l.visible = Math.abs(l.userData.elevation - spawnElev) <= 6.0;
      }
    }

    // Continuous lightweight updater when player elevation shifts (elevator / stairs)
    let lastCullElevation = spawnElev;
    world.updaters.push(() => {
      const playerY = ctx?.player?.y ?? ctx?.game?.player?.y ?? (ctx?.camera?.position?.y || 0);
      if (Math.abs(playerY - lastCullElevation) < 1.0) return;
      lastCullElevation = playerY;

      // PointLight Culling: only active floor (+-1 level) lights are processed by GPU (2-3 lights instead of 60+)
      if (world.roomLights) {
        for (const l of world.roomLights) {
          l.visible = Math.abs(l.userData.elevation - playerY) <= 6.0;
        }
      }
    });
  }

  return world;
}
