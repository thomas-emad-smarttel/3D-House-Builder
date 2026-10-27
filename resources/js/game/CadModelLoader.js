import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { M } from './materials.js';

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
  const matName = (mesh.material?.name || '').toLowerCase();
  const allNames = `${objName} ${parentName} ${matName}`;

  // 1. Transparent Architectural Glass (Windows, Balconies, Sliders)
  if (allNames.includes('glass') || allNames.includes('glaz') || allNames.includes('window')) {
    mesh.material = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#94bcd8'),
      metalness: 0.1,
      roughness: 0.05,
      transmission: 0.88,
      thickness: 0.4,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    return;
  }

  // 2. Swimming Pool & Water
  if (allNames.includes('water') || allNames.includes('pool') || allNames.includes('plane012') || allNames.includes('plane013')) {
    mesh.material = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#0284c7'),
      roughness: 0.08,
      metalness: 0.2,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    return;
  }

  // 3. Ceilings & Underside of Roofs (prevents shadow acne / concentric moire bands)
  if (allNames.includes('ceiling') || allNames.includes('roof') || allNames.includes('object2652')) {
    mesh.material = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#ffffff'),
      roughness: 0.85,
      metalness: 0.02,
      side: THREE.DoubleSide,
    });
    mesh.castShadow = true;
    mesh.receiveShadow = false;
    return;
  }

  // 4. Doors & Entrance Panels
  if (allNames.includes('door') || allNames.includes('cgaxis_door') || allNames.includes('entrance') || allNames.includes('gate')) {
    mesh.material = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#1e293b'),
      metalness: 0.6,
      roughness: 0.35,
      side: THREE.DoubleSide,
    });
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return;
  }

  // 5. Dark Architectural Metal (Window frames, structural beams, railings, columns)
  if (allNames.includes('metal') || allNames.includes('frame') || allNames.includes('rail') || allNames.includes('iron') || allNames.includes('steel') || allNames.includes('black') || allNames.includes('am107_087_black') || allNames.includes('mullion')) {
    mesh.material = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#1e293b'),
      metalness: 0.85,
      roughness: 0.32,
      side: THREE.DoubleSide,
    });
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return;
  }

  // 6. Natural Warm Timber & Wood Louvers
  if (allNames.includes('wood') || allNames.includes('timber') || allNames.includes('deck') || allNames.includes('louver') || allNames.includes('slat') || allNames.includes('pergola') || allNames.includes('parquet')) {
    mesh.material = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#78350f'),
      roughness: 0.65,
      metalness: 0.04,
      side: THREE.DoubleSide,
    });
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return;
  }

  // 7. Crisp White Plaster / Stucco Exterior Walls
  if (allNames.includes('01_wall_white') || allNames.includes('wall_white') || allNames.includes('white') || allNames.includes('stucco') || allNames.includes('plaster')) {
    mesh.material = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#f8fafc'),
      roughness: 0.78,
      metalness: 0.02,
      side: THREE.DoubleSide,
    });
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return;
  }

  // 8. Slate Gray Stone & Architectural Concrete Panels
  if (allNames.includes('02_wall_gray') || allNames.includes('wall_gray') || allNames.includes('03_black_stone') || allNames.includes('stone') || allNames.includes('concrete') || allNames.includes('rock') || allNames.includes('slate') || allNames.includes('gray') || allNames.includes('grey')) {
    mesh.material = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#475569'),
      roughness: 0.82,
      metalness: 0.04,
      side: THREE.DoubleSide,
    });
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return;
  }

  // 9. Streetlamps & Exterior Lighting fixtures
  if (allNames.includes('streetlamp') || allNames.includes('lamp') || allNames.includes('light')) {
    mesh.material = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#0f172a'),
      metalness: 0.9,
      roughness: 0.25,
      emissive: new THREE.Color('#fef08a'),
      emissiveIntensity: 0.6,
      side: THREE.DoubleSide,
    });
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return;
  }

  // 10. Sidewalks, Driveways, Curbs, and Pavers
  if (allNames.includes('sidewalk') || allNames.includes('road') || allNames.includes('curb') || allNames.includes('pavement') || allNames.includes('paving') || allNames.includes('drainage') || allNames.includes('dranaige') || allNames.includes('box047')) {
    mesh.material = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#cbd5e1'),
      roughness: 0.88,
      metalness: 0.02,
      side: THREE.DoubleSide,
    });
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return;
  }

  // 11. Green Foliage & Trees
  if (allNames.includes('plant') || allNames.includes('tree') || allNames.includes('leaf') || allNames.includes('flower') || allNames.includes('bush') || allNames.includes('branch')) {
    mesh.material = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#15803d'),
      roughness: 0.85,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return;
  }

  // 12. Lawn Grass & Ground Terrain
  if (allNames.includes('grass') || allNames.includes('lawn') || allNames.includes('garden') || allNames.includes('box043')) {
    mesh.material = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#2d5a27'),
      roughness: 0.95,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    return;
  }

  // 13. Furniture & Props (Chairs, Tables, Sofas)
  if (allNames.includes('chair') || allNames.includes('table') || allNames.includes('sofa') || allNames.includes('kitchentable') || allNames.includes('ai37_') || allNames.includes('costa_')) {
    mesh.material = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#334155'),
      roughness: 0.7,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return;
  }

  // 14. Polished Chrome / Silver Hardware
  if (allNames.includes('silver') || allNames.includes('chrome') || allNames.includes('handle')) {
    mesh.material = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#e2e8f0'),
      metalness: 0.95,
      roughness: 0.15,
      side: THREE.DoubleSide,
    });
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return;
  }

  // 15. Standard Clean Architectural Stucco (Default fallback)
  mesh.material = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#e2e8f0'),
    roughness: 0.75,
    metalness: 0.04,
    side: THREE.DoubleSide,
  });
  mesh.castShadow = true;
  mesh.receiveShadow = true;
}

/**
 * Decomposes a multi-wall compound mesh BufferGeometry into separate connected box colliders.
 */
function decomposeMeshToBoxes(mesh, worldMatrix) {
  const geo = mesh.geometry;
  if (!geo || !geo.attributes || !geo.attributes.position) return [];
  const pos = geo.attributes.position;
  const count = pos.count;
  if (count > 8000) return []; // avoid extremely dense meshes

  const index = geo.index;
  const numTris = index ? index.count / 3 : count / 3;
  if (numTris > 2500) return [];

  // Group triangles sharing vertices
  const getVertexKey = (idx) => {
    const vx = Math.round(pos.getX(idx) * 40);
    const vy = Math.round(pos.getY(idx) * 40);
    const vz = Math.round(pos.getZ(idx) * 40);
    return `${vx}_${vy}_${vz}`;
  };

  const v2f = new Map();
  for (let f = 0; f < numTris; f++) {
    for (let k = 0; k < 3; k++) {
      const vi = index ? index.getX(f * 3 + k) : f * 3 + k;
      const key = getVertexKey(vi);
      let arr = v2f.get(key);
      if (!arr) {
        arr = [];
        v2f.set(key, arr);
      }
      arr.push(f);
    }
  }

  const parent = new Int32Array(numTris);
  for (let i = 0; i < numTris; i++) parent[i] = i;
  const find = (i) => {
    while (i !== parent[i]) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  };
  const union = (i, j) => {
    const ri = find(i);
    const rj = find(j);
    if (ri !== rj) parent[ri] = rj;
  };

  for (const flist of v2f.values()) {
    const first = flist[0];
    for (let k = 1; k < flist.length; k++) {
      union(first, flist[k]);
    }
  }

  const groups = new Map();
  for (let f = 0; f < numTris; f++) {
    const root = find(f);
    let g = groups.get(root);
    if (!g) {
      g = [];
      groups.set(root, g);
    }
    g.push(f);
  }

  const vLocal = new THREE.Vector3();
  const boxes = [];

  for (const flist of groups.values()) {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    for (const f of flist) {
      for (let k = 0; k < 3; k++) {
        const vi = index ? index.getX(f * 3 + k) : f * 3 + k;
        vLocal.set(pos.getX(vi), pos.getY(vi), pos.getZ(vi));
        vLocal.applyMatrix4(worldMatrix);

        if (vLocal.x < minX) minX = vLocal.x; if (vLocal.x > maxX) maxX = vLocal.x;
        if (vLocal.y < minY) minY = vLocal.y; if (vLocal.y > maxY) maxY = vLocal.y;
        if (vLocal.z < minZ) minZ = vLocal.z; if (vLocal.z > maxZ) maxZ = vLocal.z;
      }
    }

    const w = maxX - minX;
    const d = maxZ - minZ;
    const h = maxY - minY;

    if (minY < 2.5 && h >= 0.4 && minY <= 1.8 && maxY >= 0.3) {
      if (Math.min(w, d) <= 2.2) {
        boxes.push({ minX, maxX, minZ, maxZ, minY, maxY, enabled: true });
      }
    }
  }

  return boxes;
}

/**
 * Builds solid colliders and sets up interactive doors for a CAD architectural model.
 */
function setupCadCollidersAndDoors(world, loadedObject, options = {}) {
  if (!world || !world.colliders || options.isDesigner) return;

  loadedObject.updateMatrixWorld(true);

  const doorMeshes = [];

  loadedObject.traverse((child) => {
    if (!child.isMesh) return;

    const lname = (child.name || '').toLowerCase();
    const parentName = (child.parent?.name || '').toLowerCase();
    const allNames = `${lname} ${parentName}`;

    // Skip walkable ground, grass, water, ceilings, small props
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
      allNames.includes('plane013')
    ) {
      return;
    }

    const box = new THREE.Box3().setFromObject(child);
    const w = box.max.x - box.min.x;
    const d = box.max.z - box.min.z;
    const h = box.max.y - box.min.y;

    if (box.min.y >= 2.5) return; // Ceiling / roof canopy
    if (h < 0.35 && box.max.y <= 0.4) return; // Walkable flat slab / floor
    if (w > 20 && d > 20 && h < 1.0) return; // Overall terrain plinth

    // Check if this is a door
    if (allNames.includes('door') || allNames.includes('cgaxis_door') || allNames.includes('gate')) {
      doorMeshes.push({ mesh: child, box });
    }

    const minDim = Math.min(w, d);

    // Individual wall, column, railing, glass window, table, post
    if (minDim <= 1.8 && h >= 0.4 && box.min.y <= 1.8 && box.max.y >= 0.3) {
      world.colliders.push({
        minX: box.min.x,
        maxX: box.max.x,
        minZ: box.min.z,
        maxZ: box.max.z,
        minY: box.min.y,
        maxY: box.max.y,
        enabled: true,
      });
    } else if (minDim > 1.8) {
      // Compound multi-wall meshes (01_wall_white, 02_wall_gray, 00_glass, etc.)
      const subBoxes = decomposeMeshToBoxes(child, child.matrixWorld);
      for (const sb of subBoxes) {
        world.colliders.push(sb);
      }
    }
  });

  // Setup interactive doors
  for (const { mesh, box } of doorMeshes) {
    const dCenter = new THREE.Vector3();
    box.getCenter(dCenter);

    // Add dedicated door collider
    const doorCollider = {
      minX: box.min.x,
      maxX: box.max.x,
      minZ: box.min.z,
      maxZ: box.max.z,
      minY: box.min.y,
      maxY: box.max.y,
      enabled: true,
    };
    world.colliders.push(doorCollider);

    if (typeof world.interact === 'function') {
      let isOpen = false;
      const initialPosZ = mesh.position.z;
      const initialPosX = mesh.position.x;
      const isWideInX = (box.max.x - box.min.x) > (box.max.z - box.min.z);

      const interactItem = world.interact({
        x: dCenter.x,
        y: dCenter.y,
        z: dCenter.z,
        radius: 3.5,
        cardRadius: 6.0,
        label: 'Press E to open door',
        action: () => {
          isOpen = !isOpen;
          doorCollider.enabled = !isOpen;

          interactItem.label = isOpen ? 'Press E to close door' : 'Press E to open door';
          if (world.ctx?.game?.interactions?.current === interactItem) {
            world.ctx.game.ui.hud.setPrompt(interactItem.label);
          }

          // Smooth sliding/opening animation
          const startTime = performance.now();
          const duration = 400;
          const slideOffset = 1.4;

          const animate = (now) => {
            const t = Math.min(1, (now - startTime) / duration);
            const ease = 1 - Math.pow(1 - t, 3);
            if (isWideInX) {
              mesh.position.x = initialPosX + (isOpen ? slideOffset : 0) * ease;
            } else {
              mesh.position.z = initialPosZ + (isOpen ? slideOffset : 0) * ease;
            }
            if (t < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        },
      });
    }
  }
}

/**
 * Loads a 3D CAD Architectural House Model (OBJ, GLB, GLTF) and integrates it into the 3D World.
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

  let loadedObject = null;

  try {
    if (format === 'glb' || format === 'gltf') {
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

  const wrapper = new THREE.Group();
  wrapper.name = 'cad-house-model';
  wrapper.add(loadedObject);

  if (Math.abs(scale - 1.0) > 0.0001) {
    wrapper.scale.setScalar(scale);
  }

  const modelWidth = size.x * scale;
  const modelDepth = size.z * scale;
  const modelHeight = size.y * scale;

  // Apply intelligent architectural materials to all meshes
  loadedObject.traverse((child) => {
    if (child.isMesh) {
      applySmartArchitecturalMaterial(child, options);
    }
  });

  // Solid floor slab collider for walking physics inside and around the CAD house
  if (world && world.floorSlabs && !options.isDesigner) {
    world.floorSlabs.push({
      minX: -modelWidth / 2 - 8.0,
      maxX: modelWidth / 2 + 8.0,
      minZ: -modelDepth / 2 - 8.0,
      maxZ: modelDepth / 2 + 8.0,
      elevation: 0.0,
      voidZone: null,
    });
  }

  // Setup real solid colliders (walls, glass, columns, railings) and interactive doors
  if (world && !options.isDesigner) {
    setupCadCollidersAndDoors(world, loadedObject, options);
  }

  // Adjust default player spawn location in the front entrance courtyard facing the villa
  if (world && !options.isDesigner) {
    world.spawn = {
      x: 5.0,
      z: 22.0,
      yaw: Math.PI,
    };
  }

  if (world && world.scene) {
    world.scene.add(wrapper);
  }

  if (typeof options.onLoaded === 'function') {
    options.onLoaded(wrapper, { width: modelWidth, height: modelHeight, depth: modelDepth });
  }

  return wrapper;
}
