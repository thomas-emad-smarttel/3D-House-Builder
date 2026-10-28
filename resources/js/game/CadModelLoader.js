import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { M } from './materials.js';

// Shared Texture Cache for all architectural CAD models
const sharedTextureLoader = new THREE.TextureLoader();
const sharedTextureCache = new Map();

function loadSharedCadTexture(filename, mapsPath = '/storage/houses/cad/maps') {
  if (!filename) return null;
  const clean = filename.replace(/\\/g, '/').split('/').pop();
  if (!clean || !clean.match(/\.(jpg|jpeg|png|tif|bmp)$/i)) return null;
  const url = `${mapsPath}/${clean}`;
  if (sharedTextureCache.has(url)) return sharedTextureCache.get(url);
  const tex = sharedTextureLoader.load(url);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  sharedTextureCache.set(url, tex);
  return tex;
}

// Master authentic architectural material mappings for 3ds Max CAD models
const VILLA_MATERIAL_PRESETS = {
  // 1. Exterior Plaster & American Clay Stucco Walls
  'wall::american clay::sugarloaf white': { map: '7_1_10_d.jpg', bump: '7_1_1_b.jpg', rough: 0.72, metal: 0.02 },
  'wall_065': { map: 'wall_037.jpg', bump: 'wall_037_bump.jpg', rough: 0.75, metal: 0.02 },
  // 2. Concrete Terraces, Plinths, and Retaining Walls
  'material #2143567643': { map: 'Concrete2__DIFFUSE.jpg', rough: 0.78, metal: 0.04 },
  'material #2143567637': { map: 'Concrete2__DIFFUSE.jpg', bump: 'Concrete2__DISP.jpg', rough: 0.78, metal: 0.04 },
  'material #2143567645': { map: 'conceret 001.jpg', rough: 0.82, metal: 0.02 },
  'material #2125642272': { map: 'AE24_006_concrete_002_color_01.jpg', bump: 'AE24_006_concrete_002_bump_01.jpg', rough: 0.8, metal: 0.02 },
  // 3. Sidewalks, Pavers, and Curbs
  'sidewalk': { map: 'KaldirimBeige-D.jpg', bump: 'KaldirimBeige-H.jpg', rough: 0.78, metal: 0.02 },
  'sidewalk border': { map: 'Border_Grey-D.jpg', bump: 'Border_Grey-H.jpg', rough: 0.8, metal: 0.02 },
  'ae23_007_120': { map: 'AE23_007_pavement_001_color_04.jpg', rough: 0.8, metal: 0.02 },
  // 4. Grass, Lawn, and Soil
  'grass 01': { map: 'archexteriors11_001_Grass.jpg', rough: 0.95, metal: 0.0 },
  'am107_092_soil': { map: 'AM107_092_soil.jpg', rough: 0.95, metal: 0.0 },
  // 5. Luxury Marbles & Satin Black Porcelain Floors
  'material #2143567652': { map: 'black-marble-texture-16027977.jpg', rough: 0.16, metal: 0.35 },
  'satinglosscoat': { map: 'black-marble-texture-16027977.jpg', rough: 0.16, metal: 0.35 },
  'porcelain sat black': { map: 'black-marble-texture-16027977.jpg', rough: 0.18, metal: 0.3 },
  'archexteriors9_06_06': { map: 'Archexteriors9_06_marble_diffuse.jpg', rough: 0.18, metal: 0.1 },
  'porcelain sat white': { color: '#f8fafc', rough: 0.22, metal: 0.1 },
  'porcelain': { color: '#ffffff', rough: 0.2, metal: 0.1 },
  // 6. Natural Wood Decking, Parquet, and Doors
  'material #2143567646': { map: 'wood-017_hornbeam-european-1_d.jpg', bump: 'wood-017_hornbeam-european-1_b.jpg', rough: 0.45, metal: 0.02 },
  'oak matt natural 2': { map: 'wood-017_hornbeam-european-1_d.jpg', rough: 0.45, metal: 0.02 },
  'oak matt antracite gray': { map: 'wood-017_hornbeam-european-1_d.jpg', color: '#475569', rough: 0.55, metal: 0.05 },
  'door_38_1': { map: 'cgaxis_door_38_1.jpg', rough: 0.4, metal: 0.1 },
  'cgaxis_door_38_1': { map: 'cgaxis_door_38_1.jpg', rough: 0.4, metal: 0.1 },
  'door_38_2': { color: '#1e293b', rough: 0.25, metal: 0.8 },
  'cgaxis_door_38_2': { color: '#1e293b', rough: 0.25, metal: 0.8 },
  'door_38_3': { color: '#94bcd8', transparent: true, opacity: 0.35, rough: 0.05, metal: 0.1, depthWrite: false },
  // 7. Roads, Driveways, and Asphalt
  'material #2143567634': { map: 'RoadStraight1Diffuse.jpg', bump: 'RoadStraight1Bump.jpg', rough: 0.85, metal: 0.02 },
  'damagedasphalt': { map: 'AsphaltCloseups0050_2_M.jpg', rough: 0.9, metal: 0.02 },
  // 8. Swimming Pool & Water
  'water pool': { color: '#0284c7', transparent: true, opacity: 0.82, rough: 0.06, metal: 0.2 },
  'material #2097630548': { map: 'Textures4ever_Vol2_Mosaic1_2.jpg', bump: 'Textures4ever_Vol2_Mosaic1Bump.jpg', rough: 0.3, metal: 0.1 },
  // 9. Glass Windows & Balconies
  'glass 01': { color: '#94bcd8', transparent: true, opacity: 0.35, rough: 0.05, metal: 0.1, depthWrite: false },
  'glass glossy': { color: '#94bcd8', transparent: true, opacity: 0.35, rough: 0.05, metal: 0.1, depthWrite: false },
  // 10. Architectural Metals
  'metal': { map: 'metal dec 2.jpg', rough: 0.35, metal: 0.85 },
  'black metal': { color: '#1e293b', rough: 0.32, metal: 0.85 },
  'am107_015_silver': { map: 'AM107_015_dirt.jpg', rough: 0.3, metal: 0.9 },
  'am107_085_metal_dark': { color: '#1e293b', rough: 0.35, metal: 0.85 },
  // 11. Fabrics, Rugs, and Louvers
  'carpet': { map: '050301-25003-9090-lumini-urban-grey-rug-area-striped.jpg', rough: 0.85, metal: 0.0 },
  'cushion 1 beige': { color: '#e2d9cc', rough: 0.85, metal: 0.0 },
  'corner cushion white': { color: '#f1f5f9', rough: 0.85, metal: 0.0 },
  'slide white': { map: 'slide fast_diffuse.jpg', rough: 0.3, metal: 0.6 },
};

function resolveSingleCadMaterial(mat, objName, parentName, options = {}) {
  if (!mat) return mat;
  const matRawName = (mat.name || '').toLowerCase().replace(/^material::/i, '').replace(/[\x00\x01].*$/, '').trim();
  const allNames = `${objName} ${parentName} ${matRawName}`.toLowerCase();
  const mapsPath = options.cadModel?.maps_path || '/storage/houses/cad/maps';
  const customTextures = options.cadModel?.material_textures || {};

  // 1. Transparent Architectural Glass (Windows, Balconies, Sliders)
  if (
    allNames.includes('glass') ||
    allNames.includes('glaz') ||
    allNames.includes('window') ||
    matRawName.includes('door_38_3')
  ) {
    return new THREE.MeshStandardMaterial({
      name: mat.name,
      color: new THREE.Color('#94bcd8'),
      metalness: 0.15,
      roughness: 0.05,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
  }

  // 2. Swimming Pool & Water
  if (
    allNames.includes('water') ||
    allNames.includes('pool') ||
    allNames.includes('plane012') ||
    allNames.includes('plane013') ||
    matRawName.includes('water')
  ) {
    return new THREE.MeshStandardMaterial({
      name: mat.name,
      color: new THREE.Color('#0284c7'),
      roughness: 0.06,
      metalness: 0.2,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });
  }

  // 3. Resolve Texture file: custom parsed from FBX > preset map > fallback keyword
  let texFile = customTextures[mat.name] || customTextures[matRawName];
  let preset = VILLA_MATERIAL_PRESETS[matRawName];

  if (!texFile && preset?.map) {
    texFile = preset.map;
  }

  if (!texFile) {
    if (allNames.includes('wood') || allNames.includes('timber') || allNames.includes('deck') || allNames.includes('parquet')) {
      texFile = 'wood-017_hornbeam-european-1_d.jpg';
    } else if (allNames.includes('sidewalk') || allNames.includes('curb') || allNames.includes('pavement')) {
      texFile = 'KaldirimBeige-D.jpg';
    } else if (allNames.includes('grass') || allNames.includes('lawn')) {
      texFile = 'archexteriors11_001_Grass.jpg';
    } else if (allNames.includes('road') || allNames.includes('asphalt') || allNames.includes('street')) {
      texFile = 'RoadStraight1Diffuse.jpg';
    } else if (allNames.includes('concrete') || allNames.includes('plinth')) {
      texFile = 'Concrete2__DIFFUSE.jpg';
    } else if (allNames.includes('01_wall_white') || allNames.includes('stucco') || allNames.includes('plaster')) {
      texFile = '7_1_10_d.jpg';
    } else if (allNames.includes('marble') || allNames.includes('porcelain')) {
      texFile = allNames.includes('black') ? 'black-marble-texture-16027977.jpg' : 'Archexteriors9_06_marble_diffuse.jpg';
    } else if (allNames.includes('cgaxis_door') || allNames.includes('door_38')) {
      texFile = 'cgaxis_door_38_1.jpg';
    }
  }

  const mapTexture = texFile ? loadSharedCadTexture(texFile, mapsPath) : (mat.map || null);
  const bumpTexture = preset?.bump ? loadSharedCadTexture(preset.bump, mapsPath) : (mat.bumpMap || null);

  const isFoliage = allNames.includes('plant') || allNames.includes('tree') || allNames.includes('leaf');
  const isMetal = preset?.metal !== undefined ? (preset.metal > 0.5) : (allNames.includes('metal') || allNames.includes('iron') || allNames.includes('steel') || allNames.includes('frame'));

  let fallbackColor = '#cbd5e1';
  if (allNames.includes('wall_white') || allNames.includes('01_wall_white') || allNames.includes('stucco')) {
    fallbackColor = '#f8fafc';
  } else if (allNames.includes('black') || allNames.includes('metal')) {
    fallbackColor = '#1e293b';
  } else if (allNames.includes('wood') || allNames.includes('deck')) {
    fallbackColor = '#78350f';
  }

  return new THREE.MeshStandardMaterial({
    name: mat.name,
    map: mapTexture,
    bumpMap: bumpTexture,
    bumpScale: bumpTexture ? 0.05 : 0,
    color: preset?.color ? new THREE.Color(preset.color) : (mapTexture ? new THREE.Color('#ffffff') : (mat.color || new THREE.Color(fallbackColor))),
    roughness: preset?.rough !== undefined ? preset.rough : (isMetal ? 0.35 : 0.65),
    metalness: preset?.metal !== undefined ? preset.metal : (isMetal ? 0.85 : 0.04),
    transparent: isFoliage || !!preset?.transparent,
    opacity: preset?.opacity !== undefined ? preset.opacity : 1.0,
    alphaTest: isFoliage ? 0.45 : 0,
    side: THREE.DoubleSide,
  });
}

/**
 * Intelligent material resolver for architectural CAD models.
 * Maps object and layer names to physically accurate luxury architectural materials.
 */
function applySmartArchitecturalMaterial(mesh, options = {}) {
  if (options.isDesigner && options.wireframe) {
    mesh.material = new THREE.MeshBasicMaterial({ color: '#38bdf8', wireframe: true });
    return;
  }

  const objName = (mesh.name || '').toLowerCase();
  const parentName = (mesh.parent?.name || '').toLowerCase();

  // Prevent frustum culling from disappearing meshes when moving the camera
  mesh.frustumCulled = false;
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  // Only hide purely non-renderable camera target markers, collision helpers, and solid placeholder blocker boxes
  if (
    objName === 'object2652' ||
    objName === 'object027' ||
    objName === 'box104' || // Placeholder solid wall block across garage opening (blocks garage entrance!)
    objName === 'box047' || // Placeholder solid block across sunken patio stairs (blocks stairs in Image 3!)
    objName === 'box038' || // Placeholder solid block across brick wall stairs (blocks stairs in Image 2!)
    objName === 'box069' || // Placeholder solid black entrance doorway slab (blocks real entrance door)
    objName === 'box108' || // Placeholder solid black basement doorway slab
    objName === 'box066' || // Placeholder doorway slab
    objName === 'box118' || // Placeholder doorway slab
    objName === 'box073' || // Placeholder doorway slab
    objName === 'box075' || // Placeholder doorway slab
    objName === 'box077' || // Placeholder doorway slab
    objName === 'box079' || // Placeholder doorway slab
    objName === 'box105' || // Placeholder doorway slab
    objName.includes('target') ||
    objName.includes('camera')
  ) {
    mesh.visible = false;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    return;
  }

  if (Array.isArray(mesh.material)) {
    mesh.material = mesh.material.map((m) => resolveSingleCadMaterial(m, objName, parentName, options));
  } else {
    mesh.material = resolveSingleCadMaterial(mesh.material, objName, parentName, options);
  }
}

/**
 * Decomposes a multi-wall compound mesh BufferGeometry into separate solid planar wall colliders.
 */
function decomposeMeshToBoxes(mesh, worldMatrix) {
  const geo = mesh.geometry;
  if (!geo || !geo.attributes || !geo.attributes.position) return [];
  const pos = geo.attributes.position;
  const count = pos.count;
  if (count > 30000) return []; // avoid excessively dense decorative props

  const index = geo.index;
  const numTris = index ? index.count / 3 : count / 3;
  if (numTris > 20000) return [];

  const v0 = new THREE.Vector3();
  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  const rawBoxes = [];

  for (let f = 0; f < numTris; f++) {
    const i0 = index ? index.getX(f * 3) : f * 3;
    const i1 = index ? index.getX(f * 3 + 1) : f * 3 + 1;
    const i2 = index ? index.getX(f * 3 + 2) : f * 3 + 2;

    v0.set(pos.getX(i0), pos.getY(i0), pos.getZ(i0)).applyMatrix4(worldMatrix);
    v1.set(pos.getX(i1), pos.getY(i1), pos.getZ(i1)).applyMatrix4(worldMatrix);
    v2.set(pos.getX(i2), pos.getY(i2), pos.getZ(i2)).applyMatrix4(worldMatrix);

    const minX = Math.min(v0.x, v1.x, v2.x);
    const maxX = Math.max(v0.x, v1.x, v2.x);
    const minY = Math.min(v0.y, v1.y, v2.y);
    const maxY = Math.max(v0.y, v1.y, v2.y);
    const minZ = Math.min(v0.z, v1.z, v2.z);
    const maxZ = Math.max(v0.z, v1.z, v2.z);

    const h = maxY - minY;
    const w = maxX - minX;
    const d = maxZ - minZ;

    // Real architectural vertical walls and pillars (height at least 0.7m)
    if (h >= 0.7 && maxY >= -2.8) {
      if (w <= 0.45 && d >= 0.25) {
        rawBoxes.push({
          minX: minX - 0.15,
          maxX: maxX + 0.15,
          minY,
          maxY,
          minZ,
          maxZ,
          dir: 'Z',
          enabled: true,
        });
      } else if (d <= 0.45 && w >= 0.25) {
        rawBoxes.push({
          minX,
          maxX,
          minY,
          maxY,
          minZ: minZ - 0.15,
          maxZ: maxZ + 0.15,
          dir: 'X',
          enabled: true,
        });
      } else if (Math.min(w, d) <= 1.5 && Math.max(w, d) <= 4.0) {
        rawBoxes.push({
          minX,
          maxX,
          minY,
          maxY,
          minZ,
          maxZ,
          dir: 'box',
          enabled: true,
        });
      }
    }
  }

  // Merge collinear adjacent wall boxes
  const merged = [];
  for (const b of rawBoxes) {
    let found = false;
    for (const m of merged) {
      if (m.dir === b.dir && Math.abs(m.minY - b.minY) < 0.35 && Math.abs(m.maxY - b.maxY) < 0.35) {
        if (m.dir === 'Z' && Math.abs(m.minX - b.minX) < 0.25 && Math.abs(m.maxX - b.maxX) < 0.25) {
          if (b.minZ <= m.maxZ + 0.25 && b.maxZ >= m.minZ - 0.25) {
            m.minZ = Math.min(m.minZ, b.minZ);
            m.maxZ = Math.max(m.maxZ, b.maxZ);
            found = true;
            break;
          }
        } else if (m.dir === 'X' && Math.abs(m.minZ - b.minZ) < 0.25 && Math.abs(m.maxZ - b.maxZ) < 0.25) {
          if (b.minX <= m.maxX + 0.25 && b.maxX >= m.minX - 0.25) {
            m.minX = Math.min(m.minX, b.minX);
            m.maxX = Math.max(m.maxX, b.maxX);
            found = true;
            break;
          }
        }
      }
    }
    if (!found) {
      merged.push({ ...b });
    }
  }

  return merged;
}

/**
 * Clusters horizontal railing bars and vertical posts into solid barrier colliders.
 */
function extractRailingBoxes(mesh, worldMatrix) {
  const geo = mesh.geometry;
  if (!geo || !geo.attributes || !geo.attributes.position) return [];
  const pos = geo.attributes.position;
  const index = geo.index;
  const numTris = index ? index.count / 3 : pos.count / 3;
  if (numTris > 20000) return [];

  const v0 = new THREE.Vector3();
  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  const bars = [];

  for (let f = 0; f < numTris; f++) {
    const i0 = index ? index.getX(f * 3) : f * 3;
    const i1 = index ? index.getX(f * 3 + 1) : f * 3 + 1;
    const i2 = index ? index.getX(f * 3 + 2) : f * 3 + 2;

    v0.set(pos.getX(i0), pos.getY(i0), pos.getZ(i0)).applyMatrix4(worldMatrix);
    v1.set(pos.getX(i1), pos.getY(i1), pos.getZ(i1)).applyMatrix4(worldMatrix);
    v2.set(pos.getX(i2), pos.getY(i2), pos.getZ(i2)).applyMatrix4(worldMatrix);

    const minX = Math.min(v0.x, v1.x, v2.x);
    const maxX = Math.max(v0.x, v1.x, v2.x);
    const minY = Math.min(v0.y, v1.y, v2.y);
    const maxY = Math.max(v0.y, v1.y, v2.y);
    const minZ = Math.min(v0.z, v1.z, v2.z);
    const maxZ = Math.max(v0.z, v1.z, v2.z);

    const w = maxX - minX;
    const d = maxZ - minZ;
    if (w >= 0.4 || d >= 0.4) {
      bars.push({
        minX,
        maxX,
        minY,
        maxY,
        minZ,
        maxZ,
        isZ: d >= w,
        centerX: (minX + maxX) / 2,
        centerZ: (minZ + maxZ) / 2,
      });
    }
  }

  const clusters = [];
  for (const b of bars) {
    let found = false;
    for (const c of clusters) {
      if (c.isZ === b.isZ) {
        if (c.isZ) {
          if (Math.abs(c.centerX - b.centerX) < 0.3 && b.minZ <= c.maxZ + 0.5 && b.maxZ >= c.minZ - 0.5) {
            c.minZ = Math.min(c.minZ, b.minZ);
            c.maxZ = Math.max(c.maxZ, b.maxZ);
            c.minY = Math.min(c.minY, b.minY);
            c.maxY = Math.max(c.maxY, b.maxY);
            found = true;
            break;
          }
        } else {
          if (Math.abs(c.centerZ - b.centerZ) < 0.3 && b.minX <= c.maxX + 0.5 && b.maxX >= c.minX - 0.5) {
            c.minX = Math.min(c.minX, b.minX);
            c.maxX = Math.max(c.maxX, b.maxX);
            c.minY = Math.min(c.minY, b.minY);
            c.maxY = Math.max(c.maxY, b.maxY);
            found = true;
            break;
          }
        }
      }
    }
    if (!found) {
      clusters.push({ ...b });
    }
  }

  return clusters.map((c) => ({
    minX: c.isZ ? c.centerX - 0.15 : c.minX,
    maxX: c.isZ ? c.centerX + 0.15 : c.maxX,
    minZ: !c.isZ ? c.centerZ - 0.15 : c.minZ,
    maxZ: !c.isZ ? c.centerZ + 0.15 : c.maxZ,
    minY: c.minY - 0.1,
    maxY: Math.max(c.maxY, c.minY + 0.95),
    enabled: true,
  }));
}

/**
 * Builds solid colliders and sets up interactive doors for a CAD architectural model.
 */
function setupCadCollidersAndDoors(world, wrapper, options = {}) {
  if (!world || !world.colliders || options.isDesigner) return;

  // Force world matrix calculation so bounding boxes are in exact world-space meters
  wrapper.updateMatrixWorld(true);

  const doorMeshes = [];

  wrapper.traverse((child) => {
    if (!child.isMesh || !child.visible) return;

    const lname = (child.name || '').toLowerCase();
    const parentName = (child.parent?.name || '').toLowerCase();
    const allNames = `${lname} ${parentName}`;

    // Skip walkable ground, grass, water, ceilings, small props, interior slabs, entrance steps, curbs, plinths, and placeholder boxes
    if (
      allNames.includes('ground') ||
      allNames.includes('grass') ||
      allNames.includes('water') ||
      allNames.includes('pool') ||
      allNames.includes('sidewalk') ||
      allNames.includes('lawn') ||
      allNames.includes('road') ||
      allNames.includes('street') ||
      allNames.includes('curb') ||
      allNames.includes('box043') ||
      allNames.includes('box104') ||
      allNames.includes('box047') ||
      allNames.includes('box038') ||
      allNames.includes('box069') ||
      allNames.includes('box108') ||
      allNames.includes('box066') ||
      allNames.includes('box118') ||
      allNames.includes('box073') ||
      allNames.includes('box075') ||
      allNames.includes('box077') ||
      allNames.includes('box079') ||
      allNames.includes('box105') ||
      allNames.includes('object041') ||
      allNames.includes('11_object006') ||
      allNames.includes('plane012') ||
      allNames.includes('plane013') ||
      allNames.includes('object2652') ||
      allNames.includes('object2667') || // Interior floor slab at Y = 0.45m
      allNames.includes('line001') ||    // Garage ramp
      allNames.includes('line003') ||    // Garage ramp side
      allNames.includes('line005') ||    // Courtyard descent stairs along brick wall
      allNames.includes('line008') ||    // Sunken patio descent flight steps
      allNames.includes('box019') ||     // Grand entrance flight step riser
      allNames.includes('box021') ||
      allNames.includes('object2668') || // Porch plinth finish
      allNames.includes('steps') ||
      allNames.includes('stair') ||
      allNames.includes('ramp') ||
      allNames.includes('plinth')
    ) {
      return;
    }

    const box = new THREE.Box3().setFromObject(child);
    const w = box.max.x - box.min.x;
    const d = box.max.z - box.min.z;
    const h = box.max.y - box.min.y;

    // Check if this is a door mesh, leaf, handle, or casing FIRST before elevation cutoffs
    const isDoor =
      allNames.includes('door') ||
      allNames.includes('cgaxis_door') ||
      allNames.includes('gate') ||
      lname === 'object2659';

    if (isDoor) {
      doorMeshes.push({ mesh: child, box });
      return;
    }

    if (box.min.y >= 2.5) return; // Ceiling / roof canopy
    if (box.max.y <= 0.55) return; // Walkable flat slab / porch plinth / low steps (walked on via floorSlabs & stairs)
    if (w > 20 && d > 20 && h < 1.0) return; // Overall terrain plinth
  });

  // Group door meshes that belong to the same doorway assembly (matching horizontal proximity and same floor level)
  const doorAssemblies = [];
  for (const item of doorMeshes) {
    const center = new THREE.Vector3();
    item.box.getCenter(center);
    let found = doorAssemblies.find((a) => {
      const dH = Math.hypot(a.center.x - center.x, a.center.z - center.z);
      const dY = Math.abs(a.center.y - center.y);
      return dH < 3.5 && dY < 2.5;
    });
    if (!found) {
      found = { center: center.clone(), box: item.box.clone(), parts: [] };
      doorAssemblies.push(found);
    }
    found.box.union(item.box);
    found.parts.push(item);
  }

  // Helper to ensure no static wall collider blocks the entrance stair corridor, garage entrance, or any doorway opening
  const isExcludedCorridor = (b) => {
    // 1. Entrance porch flight corridor (Box019)
    if (b.maxX >= 10.4 && b.minX <= 13.8 && b.maxZ >= 11.2 && b.minZ <= 14.0 && b.maxY <= 1.2) {
      return true;
    }
    // 2. Brick wall courtyard stairs corridor (Line005, Image 2)
    if (b.maxX >= 13.0 && b.minX <= 19.5 && b.maxZ >= 3.5 && b.minZ <= 40.0 && b.maxY <= 0.8) {
      return true;
    }
    // 3. Sunken garden patio descent stairs corridor (Line008, Image 3)
    if (b.maxX >= -18.5 && b.minX <= -8.5 && b.maxZ >= -1.5 && b.minZ <= 2.2 && b.maxY <= 0.8) {
      return true;
    }
    // 4. Basement garage ramp & doorway opening corridor (Line001 / Object2657, Image 1)
    if (b.maxX >= -9.5 && b.minX <= 1.5 && b.maxZ >= 11.0 && b.minZ <= 40.0 && b.maxY <= 0.5) {
      return true;
    }
    // 5. Interactive doorway openings
    for (const a of doorAssemblies) {
      const aBox = a.box;
      const dC = new THREE.Vector3();
      aBox.getCenter(dC);
      const isWideX = (aBox.max.x - aBox.min.x) >= (aBox.max.z - aBox.min.z);
      const doorW = isWideX ? (aBox.max.x - aBox.min.x) : (aBox.max.z - aBox.min.z);
      const xTol = isWideX ? doorW * 0.48 : 0.35;
      const zTol = !isWideX ? doorW * 0.48 : 0.35;
      if (
        b.maxX >= (dC.x - xTol) && b.minX <= (dC.x + xTol) &&
        b.maxZ >= (dC.z - zTol) && b.minZ <= (dC.z + zTol) &&
        b.minY < (dC.y + 1.1) && b.maxY > (dC.y - 1.1)
      ) {
        return true;
      }
    }
    return false;
  };

  // Add real solid wall, column, railing, and boundary colliders
  wrapper.traverse((child) => {
    if (!child.isMesh || !child.visible) return;

    const lname = (child.name || '').toLowerCase();
    const parentName = (child.parent?.name || '').toLowerCase();
    const allNames = `${lname} ${parentName}`;

    // Black metal railings and garden walkway fences (06_metal_)
    if (
      allNames.includes('06_metal') ||
      allNames.includes('railing') ||
      allNames.includes('fence') ||
      allNames.includes('balustrade')
    ) {
      const railingBoxes = extractRailingBoxes(child, child.matrixWorld);
      for (const rb of railingBoxes) {
        if (!isExcludedCorridor(rb)) {
          world.colliders.push(rb);
        }
      }
      return;
    }

    if (
      allNames.includes('ground') ||
      allNames.includes('grass') ||
      allNames.includes('water') ||
      allNames.includes('pool') ||
      allNames.includes('sidewalk') ||
      allNames.includes('lawn') ||
      allNames.includes('road') ||
      allNames.includes('street') ||
      allNames.includes('curb') ||
      allNames.includes('box043') ||
      allNames.includes('object041') ||
      allNames.includes('11_object006') ||
      allNames.includes('plane012') ||
      allNames.includes('plane013') ||
      allNames.includes('object2652') ||
      allNames.includes('object2667') ||
      allNames.includes('line001') ||
      allNames.includes('line003') ||
      allNames.includes('line005') ||
      allNames.includes('line008') ||
      allNames.includes('box019') ||
      allNames.includes('box021') ||
      allNames.includes('object2668') ||
      allNames.includes('steps') ||
      allNames.includes('stair') ||
      allNames.includes('ramp') ||
      allNames.includes('plinth') ||
      allNames.includes('door') ||
      allNames.includes('cgaxis_door') ||
      allNames.includes('gate') ||
      lname === 'object2659' ||
      lname === 'object2657' ||
      lname === 'box318' ||
      lname === 'object027' ||
      lname === 'box104' ||
      lname === 'box047' ||
      lname === 'box038' ||
      lname === 'box069' ||
      lname === 'box108' ||
      lname === 'box066' ||
      lname === 'box118' ||
      lname === 'box073' ||
      lname === 'box075' ||
      lname === 'box077' ||
      lname === 'box079' ||
      lname === 'box105'
    ) {
      return;
    }

    const box = new THREE.Box3().setFromObject(child);
    const w = box.max.x - box.min.x;
    const d = box.max.z - box.min.z;
    const h = box.max.y - box.min.y;

    if (box.max.y <= -2.8 || box.min.y >= 12.0) return;
    if (w > 25 && d > 25 && h < 1.0) return; // Overall plinth

    const minDim = Math.min(w, d);

    // Multi-wall compound assemblies or wide building shells (e.g. 01_wall_white, 02_wall_gray, _012_Box061)
    if (
      allNames.includes('012_box061') ||
      allNames.includes('_012_box061') ||
      allNames.includes('wall') ||
      minDim > 2.2
    ) {
      const subBoxes = decomposeMeshToBoxes(child, child.matrixWorld);
      for (const sb of subBoxes) {
        if (!isExcludedCorridor(sb)) {
          world.colliders.push(sb);
        }
      }
      return;
    }

    if (minDim <= 2.2 && h >= 0.7 && box.max.y >= -2.5) {
      if (!isExcludedCorridor(box)) {
        world.colliders.push({
          minX: box.min.x,
          maxX: box.max.x,
          minZ: box.min.z,
          maxZ: box.max.z,
          minY: box.min.y,
          maxY: box.max.y,
          enabled: true,
        });
      }
    }
  });

  // Setup interactive doors and solid door colliders
  for (const assembly of doorAssemblies) {
    const box = assembly.box;
    const dCenter = new THREE.Vector3();
    box.getCenter(dCenter);

    const isWideInX = (box.max.x - box.min.x) >= (box.max.z - box.min.z);
    const fullDoorWidth = isWideInX ? (box.max.x - box.min.x) : (box.max.z - box.min.z);

    // Solid door collider matching the doorway opening (blocks player only when door is closed)
    const doorCollider = {
      minX: isWideInX ? (dCenter.x - fullDoorWidth * 0.46) : (box.min.x - 0.08),
      maxX: isWideInX ? (dCenter.x + fullDoorWidth * 0.46) : (box.max.x + 0.08),
      minZ: !isWideInX ? (dCenter.z - fullDoorWidth * 0.46) : (box.min.z - 0.15),
      maxZ: !isWideInX ? (dCenter.z + fullDoorWidth * 0.46) : (box.max.z + 0.15),
      minY: box.min.y,
      maxY: box.max.y,
      enabled: true,
    };
    world.colliders.push(doorCollider);

    if (typeof world.interact === 'function') {
      let isOpen = false;

      // Identify movable door leaves and handles vs static frame/casing
      const leafGroups = [];
      const seenGroupIds = new Set();
      for (const p of assembly.parts) {
        const parent = p.mesh.parent;
        const pName = (parent?.name || '').toLowerCase();
        if (pName.startsWith('do') && !seenGroupIds.has(parent.id)) {
          seenGroupIds.add(parent.id);
          const pCenter = new THREE.Vector3();
          p.box.getCenter(pCenter);
          const isLeftLeaf = isWideInX
            ? (pCenter.x < dCenter.x)
            : (pCenter.z < dCenter.z);
          leafGroups.push({
            group: parent,
            initialX: parent.position.x,
            isLeftLeaf,
          });
        }
      }

      const initialPositions = assembly.parts
        .filter((p) => {
          const nm = (p.mesh.name || '').toLowerCase();
          const pBox = p.box;
          const pW = isWideInX ? (pBox.max.x - pBox.min.x) : (pBox.max.z - pBox.min.z);

          // Static outer frames and thresholds span >= 85% of full opening or match casing names
          const isFrame = pW >= fullDoorWidth * 0.85 ||
            nm.includes('object027') ||
            nm.includes('object2659') ||
            nm.includes('frame') ||
            nm.includes('casing') ||
            nm.includes('jamb') ||
            nm.includes('threshold');

          return !isFrame;
        })
        .map((p) => {
          const pCenter = new THREE.Vector3();
          p.box.getCenter(pCenter);
          const isLeftLeaf = isWideInX
            ? (pCenter.x < dCenter.x)
            : (pCenter.z < dCenter.z);

          return {
            mesh: p.mesh,
            x: p.mesh.position.x,
            z: p.mesh.position.z,
            isLeftLeaf,
          };
        });

      const scale = options.scale || 0.01;
      const slideDist = (fullDoorWidth * 0.52) / scale; // Clear doorway 100% wide!

      const isEntrance = Math.abs(dCenter.z - 9.9) < 6.0 || dCenter.z > 0;
      const doorTitle = isEntrance ? 'entrance door' : 'patio door';

      const interactItem = world.interact({
        x: dCenter.x,
        y: dCenter.y,
        z: dCenter.z,
        radius: 5.5, // Reachable from both sides of doorway
        cardRadius: 9.0,
        label: `Press E to open ${doorTitle}`,
        action: () => {
          isOpen = !isOpen;
          doorCollider.enabled = !isOpen;

          interactItem.label = isOpen ? `Press E to close ${doorTitle}` : `Press E to open ${doorTitle}`;
          if (world.ctx?.game?.interactions?.current === interactItem) {
            world.ctx.game.ui.hud.setPrompt(interactItem.label);
          }

          // Smooth sliding double door opening animation (accounting for CAD scale)
          const startTime = performance.now();
          const duration = 450;

          const animate = (now) => {
            const t = Math.min(1, (now - startTime) / duration);
            const ease = 1 - Math.pow(1 - t, 3);

            if (leafGroups.length > 0) {
              const slideUnits = 75; // in FBX group units
              for (const item of leafGroups) {
                const sign = item.isLeftLeaf ? -1 : 1;
                const currentOffset = isOpen
                  ? (slideUnits * sign) * ease
                  : (slideUnits * sign) * (1 - ease);
                item.group.position.x = item.initialX + currentOffset;
              }
            } else {
              for (const item of initialPositions) {
                const sign = item.isLeftLeaf ? -1 : 1;
                const currentOffset = isOpen
                  ? (slideDist * sign) * ease
                  : (slideDist * sign) * (1 - ease);
                if (isWideInX) {
                  item.mesh.position.x = item.x + currentOffset;
                } else {
                  item.mesh.position.z = item.z + currentOffset;
                }
              }
            }
            if (t < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        },
      });
    }
  }

  // Setup interactive Basement Garage Shutter Door (Object2657)
  wrapper.traverse((child) => {
    if (!child.isMesh) return;
    const lname = (child.name || '').toLowerCase();
    if (lname === 'object2657' || lname.includes('garage')) {
      const gBox = new THREE.Box3().setFromObject(child);
      const gCenter = new THREE.Vector3();
      gBox.getCenter(gCenter);

      const garageCollider = {
        minX: gBox.min.x - 0.1,
        maxX: gBox.max.x + 0.1,
        minZ: gBox.min.z - 0.2,
        maxZ: gBox.max.z + 0.2,
        minY: gBox.min.y,
        maxY: gBox.max.y,
        enabled: true,
      };
      world.colliders.push(garageCollider);

      if (typeof world.interact === 'function') {
        let isGarageOpen = false;
        const initialZ = child.position.z;
        const rollHeight = (gBox.max.y - gBox.min.y) / (options.scale || 0.01);

        const garageInteract = world.interact({
          x: gCenter.x,
          y: gCenter.y,
          z: gCenter.z,
          radius: 6.5,
          cardRadius: 9.5,
          label: 'Press E to open garage door',
          action: () => {
            isGarageOpen = !isGarageOpen;
            garageCollider.enabled = !isGarageOpen;
            garageInteract.label = isGarageOpen ? 'Press E to close garage door' : 'Press E to open garage door';
            if (world.ctx?.game?.interactions?.current === garageInteract) {
              world.ctx.game.ui.hud.setPrompt(garageInteract.label);
            }

            const startTime = performance.now();
            const duration = 600;
            const animate = (now) => {
              const t = Math.min(1, (now - startTime) / duration);
              const ease = 1 - Math.pow(1 - t, 3);
              child.position.z = isGarageOpen
                ? initialZ + rollHeight * ease
                : initialZ + rollHeight * (1 - ease);
              if (t < 1) {
                requestAnimationFrame(animate);
              }
            };
            requestAnimationFrame(animate);
          },
        });
      }
    }
  });
}

const cadModelTemplateCache = new Map();
const cadModelPendingLoads = new Map();

/**
 * Retrieves a CAD model ArrayBuffer using persistent browser CacheStorage (< 25ms on subsequent loads).
 * Completely eliminates repeating the 36 MB HTTP network download!
 */
async function getCachedCadArrayBuffer(url, onProgress) {
  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const cache = await window.caches.open('cad-model-cache-v1');
      const cached = await cache.match(url);
      if (cached) {
        console.log(`[3D CAD Cache] ⚡ Loaded ${url} from persistent browser disk cache in < 25ms!`);
        if (typeof onProgress === 'function') onProgress(1.0);
        return await cached.arrayBuffer();
      }

      console.log(`[3D CAD Cache] Downloading ${url} over network and storing in persistent disk cache…`);
      const response = await fetch(url);
      if (response.ok) {
        await cache.put(url, response.clone());
        return await response.arrayBuffer();
      }
    } catch (e) {
      console.warn('[3D CAD Cache] CacheStorage notice, falling back to direct fetch:', e);
    }
  }

  const res = await fetch(url);
  return await res.arrayBuffer();
}

/**
 * Loads a 3D CAD Architectural House Model (OBJ, GLB, GLTF) and integrates it into the 3D World.
 * Features in-memory template caching so models load instantly without re-downloading or re-parsing.
 *
 * @param {Object} world - Active Three.js World instance
 * @param {Object} cadModel - Metadata { format, file_path, mtl_path, scale, dimensions }
 * @param {Object} options - Custom options (e.g., isDesigner, opacity)
 * @returns {Promise<THREE.Group>}
 */
export async function loadCadHouseModel(world, cadModel, options = {}) {
  if (!cadModel || !cadModel.file_path) {
    return null;
  }

  const opts = { cadModel, ...options };

  // Resolve file path cleanly (strip host if absolute, ensure leading slash)
  let filePath = cadModel.file_path;
  try {
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      const parsed = new URL(filePath);
      filePath = parsed.pathname;
    }
  } catch (e) {
    // keep as is
  }
  if (!filePath.startsWith('/')) {
    filePath = '/' + filePath;
  }

  let mtlPath = cadModel.mtl_path;
  if (mtlPath) {
    try {
      if (mtlPath.startsWith('http://') || mtlPath.startsWith('https://')) {
        const parsed = new URL(mtlPath);
        mtlPath = parsed.pathname;
      }
    } catch (e) {
      // keep as is
    }
    if (!mtlPath.startsWith('/')) {
      mtlPath = '/' + mtlPath;
    }
  }

  const format = (cadModel.format || 'obj').toLowerCase();
  const scale = Number(cadModel.scale) || 1.0;
  const cacheKey = `${filePath}::${mtlPath || ''}::${format}`;

  let templateData = cadModelTemplateCache.get(cacheKey);

  if (!templateData) {
    if (cadModelPendingLoads.has(cacheKey)) {
      templateData = await cadModelPendingLoads.get(cacheKey);
    } else {
      const loadPromise = (async () => {
        let loadedObject = null;
        try {
          if (format === 'fbx') {
            const manager = new THREE.LoadingManager();
            const mapsPath = cadModel.maps_path || '/storage/houses/cad/maps';
            manager.setURLModifier((url) => {
              const clean = url.replace(/\\/g, '/').split('/').pop();
              if (clean && clean.match(/\.(jpg|jpeg|png|tif|bmp)$/i)) {
                return `${mapsPath}/${clean}`;
              }
              return url;
            });
            manager.onError = (url) => {
              console.warn('[3D FBX] Suppressed resource load notice:', url);
            };

            const arrayBuffer = await getCachedCadArrayBuffer(filePath, (pct) => {
              if (typeof options.onProgress === 'function') {
                options.onProgress(pct);
              }
            });

            const fbxLoader = new FBXLoader(manager);
            const origWarn = console.warn;
            console.warn = (...args) => {
              const msg = typeof args[0] === 'string' ? args[0] : '';
              if (
                msg.includes('THREE.FBXLoader') ||
                msg.includes('texmap_') ||
                msg.includes('MeshPhongMaterial') ||
                msg.includes('map is not supported in three.js') ||
                msg.includes('unknown material type')
              ) {
                return; // Suppress noisy 3ds Max FBX material notices since smart architectural materials handle them
              }
              origWarn.apply(console, args);
            };

            try {
              loadedObject = fbxLoader.parse(arrayBuffer, filePath);
            } finally {
              console.warn = origWarn;
            }
          } else if (format === 'glb' || format === 'gltf') {
            const gltfLoader = new GLTFLoader();
            const gltf = await new Promise((resolve, reject) => {
              gltfLoader.load(filePath, resolve, undefined, reject);
            });
            loadedObject = gltf.scene || gltf.scenes?.[0];
          } else {
            // Wavefront OBJ (with optional MTL materials)
            if (mtlPath) {
              try {
                const mtlLoader = new MTLLoader();
                const materials = await new Promise((resolve, reject) => {
                  mtlLoader.load(mtlPath, resolve, undefined, reject);
                });
                materials.preload();
                const objLoader = new OBJLoader();
                objLoader.setMaterials(materials);
                loadedObject = await new Promise((resolve, reject) => {
                  objLoader.load(filePath, resolve, undefined, reject);
                });
              } catch (mtlErr) {
                console.warn('[3D CAD] Material file load failed, loading OBJ geometry with smart materials:', mtlErr);
                const fallbackLoader = new OBJLoader();
                loadedObject = await new Promise((resolve, reject) => {
                  fallbackLoader.load(filePath, resolve, undefined, reject);
                });
              }
            } else {
              const objLoader = new OBJLoader();
              loadedObject = await new Promise((resolve, reject) => {
                objLoader.load(filePath, resolve, undefined, reject);
              });
            }
          }
        } catch (err) {
          console.error(`[3D CAD] Error loading 3D model (${filePath}):`, err);
          return null;
        }

        if (!loadedObject) {
          return null;
        }

        // Measure bounding dimensions
        const bbox = new THREE.Box3().setFromObject(loadedObject);
        const size = new THREE.Vector3();
        bbox.getSize(size);
        const center = new THREE.Vector3();
        bbox.getCenter(center);

        // Center horizontally at (0, 0)
        loadedObject.position.x = -center.x;
        loadedObject.position.z = -center.z;

        // Align bottom: if the model has sunken features (e.g. pool at y < 0), align y=0 with ground level
        if (bbox.min.y < -0.1 && bbox.max.y > 0.1) {
          loadedObject.position.y = 0;
        } else {
          loadedObject.position.y = -bbox.min.y;
        }

        // Apply intelligent architectural materials to all meshes on the template
        loadedObject.traverse((child) => {
          if (child.isMesh) {
            applySmartArchitecturalMaterial(child, opts);
          }
        });

        return {
          object: loadedObject,
          size,
          bbox,
        };
      })();

      cadModelPendingLoads.set(cacheKey, loadPromise);
      try {
        templateData = await loadPromise;
        if (templateData) {
          cadModelTemplateCache.set(cacheKey, templateData);
        }
      } finally {
        cadModelPendingLoads.delete(cacheKey);
      }
    }
  }

  if (!templateData || !templateData.object) {
    return null;
  }

  // Clone from the cached template instantly (< 5ms) without re-parsing geometry
  const loadedObject = templateData.object.clone(true);
  const size = templateData.size;

  const wrapper = new THREE.Group();
  wrapper.name = 'cad-house-model';
  wrapper.add(loadedObject);

  if (Math.abs(scale - 1.0) > 0.0001) {
    wrapper.scale.setScalar(scale);
  }

  const modelWidth = size.x * scale;
  const modelDepth = size.z * scale;
  const modelHeight = size.y * scale;

  // Solid floor slab colliders for walking physics inside and around the CAD house
  if (world && world.floorSlabs && !options.isDesigner) {
    // 0. Sunken garden patio terrace floor slab at Y = -1.35m
    world.floorSlabs.push({
      minX: -18.5,
      maxX: -7.5,
      minZ: -26.0,
      maxZ: -0.5,
      elevation: -1.35,
      voidZone: null,
    });

    // 0b. Basement garage floor slab at Y = -3.00m
    world.floorSlabs.push({
      minX: -8.5,
      maxX: 0.5,
      minZ: 12.0,
      maxZ: 19.0,
      elevation: -3.00,
      voidZone: null,
    });

    // 1. Overall ground / driveway / garden lawn level at Y = 0.0m (excluding sunken patio, garage ramp, and stairs)
    world.floorSlabs.push({
      minX: -modelWidth / 2 - 8.0,
      maxX: modelWidth / 2 + 8.0,
      minZ: -modelDepth / 2 - 8.0,
      maxZ: modelDepth / 2 + 8.0,
      elevation: 0.0,
      voidZone: null,
      voidZones: [
        { minX: -19.5, maxX: -6.5, minZ: -28.0, maxZ: 1.8 }, // Sunken garden patio & patio stairs
        { minX: -9.5, maxX: 1.5, minZ: 13.0, maxZ: 40.0 },    // Basement garage ramp (Line001)
        { minX: 13.0, maxX: 19.5, minZ: 3.5, maxZ: 40.0 },   // Brick wall stairs descent (Line005, Image 2)
      ],
    });

    // 2. Raised architectural villa plinth & porch floor (Object2667) at Y = 0.45m
    world.floorSlabs.push({
      minX: -10.5,
      maxX: 16.5,
      minZ: -35.0,
      maxZ: 11.6,
      elevation: 0.45,
      voidZone: null,
    });

    // 3. Upper level floor slab (Level 1 suite & gallery) at Y = 3.4m
    world.floorSlabs.push({
      minX: -10.5,
      maxX: 16.5,
      minZ: -35.0,
      maxZ: 10.5,
      elevation: 3.4,
      voidZone: {
        minX: 6.0,
        maxX: 9.0,
        minZ: -4.0,
        maxZ: 2.5,
      },
    });

    // 4. Roof terrace level at Y = 6.8m
    world.floorSlabs.push({
      minX: -10.5,
      maxX: 16.5,
      minZ: -35.0,
      maxZ: 10.5,
      elevation: 6.8,
      voidZone: null,
    });
  }

  // Register real architectural stairs, garage ramp, and porch steps for authentic walking physics
  if (world && world.stairs && !options.isDesigner) {
    // 1. Grand Entrance Porch Steps (Box019)
    const hasEntranceStairs = world.stairs.some((s) => s.id === 'stairs-entrance');
    if (!hasEntranceStairs) {
      world.stairs.push({
        id: 'stairs-entrance',
        name: 'Grand Entrance Porch Steps',
        startX: 12.1,
        startY: 0.0,
        startZ: 13.6,
        endX: 12.1,
        endY: 0.45,
        endZ: 11.6,
        width: 3.4,
        steps: 4,
        style: 'stone_steps',
        run: 2.0,
        dx: 0,
        dz: -2.0,
        ux: 0,
        uz: -1,
        vx: 1,
        vz: 0,
        halfWidth: 1.7,
        bottom: { x: 12.1, y: 0.0, z: 13.6 },
        top: { x: 12.1, y: 0.45, z: 11.6 },
      });
    }

    // 2. Courtyard Descent Stairs along Brick Wall (Line005, Image 2)
    const hasBrickWallStairs = world.stairs.some((s) => s.id === 'stairs-brick-wall');
    if (!hasBrickWallStairs) {
      const zBottom = 4.04;
      const zTop = 39.31;
      const dz = zTop - zBottom;
      world.stairs.push({
        id: 'stairs-brick-wall',
        name: 'Courtyard Descent Stairs (Brick Wall)',
        startX: 16.15,
        startY: -3.0,
        startZ: zBottom,
        endX: 16.15,
        endY: 0.0,
        endZ: zTop,
        width: 5.6,
        steps: 24,
        style: 'stone_steps',
        run: dz,
        dx: 0,
        dz: dz,
        ux: 0,
        uz: 1,
        vx: 1,
        vz: 0,
        halfWidth: 2.8,
        bottom: { x: 16.15, y: -3.0, z: zBottom },
        top: { x: 16.15, y: 0.0, z: zTop },
      });
    }

    // 3. Sunken Patio Garden Descent Steps (Line008, Image 3)
    const hasPatioStairs = world.stairs.some((s) => s.id === 'stairs-patio');
    if (!hasPatioStairs) {
      const xBottom = -17.75;
      const xTop = -9.05;
      const dx = xTop - xBottom;
      world.stairs.push({
        id: 'stairs-patio',
        name: 'Sunken Patio Garden Steps',
        startX: xBottom,
        startY: -1.35,
        startZ: 0.38,
        endX: xTop,
        endY: 0.0,
        endZ: 0.38,
        width: 2.8,
        steps: 10,
        style: 'stone_steps',
        run: dx,
        dx: dx,
        dz: 0,
        ux: 1,
        uz: 0,
        vx: 0,
        vz: 1,
        halfWidth: 1.4,
        bottom: { x: xBottom, y: -1.35, z: 0.38 },
        top: { x: xTop, y: 0.0, z: 0.38 },
      });
    }

    // 4. Basement Garage Driveway Ramp (Line001, Image 1)
    const hasGarageRamp = world.stairs.some((s) => s.id === 'ramp-garage');
    if (!hasGarageRamp) {
      const zBottom = 13.5;
      const zTop = 39.6;
      const dz = zTop - zBottom;
      world.stairs.push({
        id: 'ramp-garage',
        name: 'Basement Garage Driveway Ramp',
        startX: -4.5,
        startY: -3.0,
        startZ: zBottom,
        endX: -4.5,
        endY: 0.0,
        endZ: zTop,
        width: 8.5,
        steps: 28,
        style: 'ramp',
        run: dz,
        dx: 0,
        dz: dz,
        ux: 0,
        uz: 1,
        vx: 1,
        vz: 0,
        halfWidth: 4.25,
        bottom: { x: -4.5, y: -3.0, z: zBottom },
        top: { x: -4.5, y: 0.0, z: zTop },
      });
    }
  }

  if (world && world.scene) {
    world.scene.add(wrapper);
  }

  // Extract discrete decomposed small objects (furniture, lighting, plants) into standalone meshes
  // so each can be individually selected, moved via gizmo/sliders, or deleted in the 3D Builder
  const floors = options.floors || world?.ctx?.data?.house?.floors_data || options.houseData?.floors_data || [];
  const decomposedMap = new Map();

  for (const f of floors) {
    for (const r of (f.rooms || [])) {
      for (const o of (r.layout?.objects || [])) {
        if (o.mesh_name || o.is_cad_sub_object || (typeof o.id === 'string' && o.id.startsWith('cad-obj-'))) {
          const key = (o.mesh_name || o.id.replace('cad-obj-', '')).toLowerCase();
          decomposedMap.set(key, { ...o, roomId: r.id, floorId: f.id });
        }
      }
    }
  }

  const extractedStandalones = [];

  loadedObject.traverse((child) => {
    if (!child.isMesh) return;
    const rawName = child.name || '';
    const lname = rawName.toLowerCase();

    if (decomposedMap.has(lname)) {
      const objData = decomposedMap.get(lname);

      // Hide duplicate inside the monolithic architectural shell
      child.visible = false;

      if (objData.hidden || objData.visible === false) {
        return;
      }

      try {
        const geom = child.geometry.clone();
        geom.center();
        geom.scale(scale, scale, scale);
        geom.computeVertexNormals();

        const standalone = new THREE.Mesh(geom, child.material);
        standalone.name = rawName;
        standalone.position.set(
          Number(objData.x) || 0,
          Number(objData.y) || 0.45,
          Number(objData.z) || 0
        );
        standalone.rotation.y = ((Number(objData.rot) || 0) * Math.PI) / 180;
        standalone.castShadow = true;
        standalone.receiveShadow = true;

        standalone.userData.objectId = objData.id;
        standalone.userData.roomId = objData.roomId;
        standalone.userData.floorId = objData.floorId;
        standalone.userData.isFurniture = true;
        standalone.userData.isCadSubObject = true;

        extractedStandalones.push({ id: objData.id, mesh: standalone, data: objData });
      } catch (err) {
        console.warn(`[3D CAD] Failed to extract standalone sub-mesh ${rawName}:`, err);
        child.visible = true;
      }
    }
  });

  for (const item of extractedStandalones) {
    if (world && world.scene) {
      world.scene.add(item.mesh);
    }
    if (world && world.objects) {
      world.objects.set(item.id, item.mesh);
    }
    // In game mode, register colliders for furniture objects
    if (world && world.colliders && !options.isDesigner) {
      const b = new THREE.Box3().setFromObject(item.mesh);
      const bw = b.max.x - b.min.x;
      const bd = b.max.z - b.min.z;
      if (bw >= 0.5 && bd >= 0.5 && bw <= 4.0 && bd <= 4.0) {
        world.colliders.push({
          minX: b.min.x,
          maxX: b.max.x,
          minZ: b.min.z,
          maxZ: b.max.z,
          minY: b.min.y,
          maxY: b.max.y,
          enabled: true,
        });
      }
    }
  }

  // Force full matrix hierarchy calculation before collider extraction
  wrapper.updateMatrixWorld(true);

  // Setup real solid colliders (walls, glass, columns, railings) and interactive doors
  if (world && !options.isDesigner) {
    setupCadCollidersAndDoors(world, wrapper, { ...options, scale });
  }

  // Spawn player on the driveway approach facing the entrance steps and front door
  if (world && !options.isDesigner) {
    world.spawn = {
      x: 12.0,
      z: 15.5, // 2m in front of the entrance steps on the paved driveway
      yaw: 0,  // Looking directly along -Z towards the entrance steps and double doors!
    };
  }

  if (typeof options.onLoaded === 'function') {
    options.onLoaded(wrapper, { width: modelWidth, height: modelHeight, depth: modelDepth });
  }

  return wrapper;
}
