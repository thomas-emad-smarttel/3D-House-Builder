import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { M } from './materials.js';

/**
 * Intelligent material resolver for architectural CAD models.
 * Automatically colors meshes based on object names and wirecolor materials (e.g. wire_RRRGGGBBB).
 */
function applySmartArchitecturalMaterial(mesh, options = {}) {
  if (options.isDesigner && options.wireframe) {
    mesh.material = new THREE.MeshBasicMaterial({ color: '#38bdf8', wireframe: true });
    return;
  }

  const objName = (mesh.name || '').toLowerCase();
  const matName = (mesh.material?.name || '').toLowerCase();

  // 1. Transparent Architectural Glass (Windows, Balconies, Sliders)
  if (objName.includes('glass') || matName.includes('glass') || objName.includes('glaz') || objName.includes('window')) {
    mesh.material = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#94bcd8'),
      metalness: 0.1,
      roughness: 0.05,
      transmission: 0.88,
      thickness: 0.4,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    return;
  }

  // 2. Swimming Pool & Water
  if (objName.includes('water') || objName.includes('pool') || matName.includes('water') || matName.includes('pool')) {
    mesh.material = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#0284c7'),
      roughness: 0.1,
      metalness: 0.25,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    return;
  }

  // 3. Dark Architectural Metal (Window frames, louvers, railings, structural beams)
  if (objName.includes('metal') || matName.includes('metal') || objName.includes('frame') || objName.includes('rail') || objName.includes('iron') || objName.includes('steel') || objName.includes('black')) {
    mesh.material = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#1e293b'),
      metalness: 0.85,
      roughness: 0.35,
      side: THREE.DoubleSide,
    });
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return;
  }

  // 4. White Plaster / Stucco Exterior Walls
  if (objName.includes('white') || matName.includes('white') || objName.includes('stucco') || objName.includes('plaster')) {
    mesh.material = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#f8fafc'),
      roughness: 0.8,
      metalness: 0.02,
      side: THREE.DoubleSide,
    });
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return;
  }

  // 5. Slate Gray Stone & Architectural Concrete Panels
  if (objName.includes('gray') || objName.includes('grey') || objName.includes('stone') || objName.includes('concrete') || matName.includes('gray') || matName.includes('stone')) {
    mesh.material = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#64748b'),
      roughness: 0.85,
      metalness: 0.04,
      side: THREE.DoubleSide,
    });
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return;
  }

  // 6. Natural Warm Timber & Wood Louvers
  if (objName.includes('wood') || objName.includes('timber') || objName.includes('parquet') || objName.includes('deck') || matName.includes('wood')) {
    mesh.material = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#78350f'),
      roughness: 0.65,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return;
  }

  // 7. Green Foliage / Plants / Trees
  if (objName.includes('plant') || objName.includes('tree') || objName.includes('leaf') || objName.includes('grass') || objName.includes('bush') || matName.includes('green')) {
    mesh.material = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#15803d'),
      roughness: 0.9,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return;
  }

  // 8. 3ds Max Viewport Wirecolors (e.g. "wire_214228153" -> rgb(214, 228, 153))
  const wireMatch = matName.match(/wire_(\d{3})(\d{3})(\d{3})/);
  if (wireMatch) {
    const r = parseInt(wireMatch[1], 10) / 255;
    const g = parseInt(wireMatch[2], 10) / 255;
    const b = parseInt(wireMatch[3], 10) / 255;

    // Adjust pure black wire colors to deep architectural charcoal
    const isPureBlack = r === 0 && g === 0 && b === 0;
    const finalColor = isPureBlack ? new THREE.Color('#1e293b') : new THREE.Color(r, g, b);

    mesh.material = new THREE.MeshStandardMaterial({
      color: finalColor,
      roughness: 0.7,
      metalness: isPureBlack ? 0.7 : 0.08,
      side: THREE.DoubleSide,
    });
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return;
  }

  // 9. Standard Clean Architectural Stucco
  mesh.material = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#e2e8f0'),
    roughness: 0.75,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });
  mesh.castShadow = true;
  mesh.receiveShadow = true;
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

  // Adjust default player spawn location just outside the front facade facing the entrance
  if (world && !options.isDesigner) {
    const frontZ = modelDepth / 2 + 6.0;
    world.spawn = {
      x: 0,
      z: Math.min(frontZ, (world.bounds?.maxZ || 80) - 2),
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
