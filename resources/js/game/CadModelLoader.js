import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { M } from './materials.js';

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

  const rawPath = cadModel.file_path;
  const filePath = rawPath.startsWith('/') ? rawPath : '/' + rawPath;
  const rawMtl = cadModel.mtl_path;
  const mtlPath = rawMtl ? (rawMtl.startsWith('/') ? rawMtl : '/' + rawMtl) : null;
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
          console.warn('[3D CAD] Material file load failed, loading OBJ geometry without MTL:', mtlErr);
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

  // Center horizontally at (0, 0) and position bottom flush with ground (y = 0)
  loadedObject.position.x = -center.x;
  loadedObject.position.y = -bbox.min.y;
  loadedObject.position.z = -center.z;

  const wrapper = new THREE.Group();
  wrapper.name = 'cad-house-model';
  wrapper.add(loadedObject);

  if (Math.abs(scale - 1.0) > 0.0001) {
    wrapper.scale.setScalar(scale);
  }

  const modelWidth = size.x * scale;
  const modelDepth = size.z * scale;
  const modelHeight = size.y * scale;

  // Material setup & shadow configuration
  const defaultMat = M.solid('#f1f5f9', { rough: 0.65, metal: 0.05 });

  loadedObject.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;

      if (!child.material) {
        child.material = defaultMat;
      } else if (Array.isArray(child.material)) {
        child.material.forEach((mat) => {
          mat.side = THREE.DoubleSide;
        });
      } else {
        child.material.side = THREE.DoubleSide;
      }

      if (options.isDesigner && options.wireframe) {
        if (child.material) {
          child.material.wireframe = true;
        }
      }
    }
  });

  // Solid floor slab collider for walking physics inside and around the CAD house
  if (world && world.floorSlabs && !options.isDesigner) {
    world.floorSlabs.push({
      minX: -modelWidth / 2 - 4.0,
      maxX: modelWidth / 2 + 4.0,
      minZ: -modelDepth / 2 - 4.0,
      maxZ: modelDepth / 2 + 4.0,
      elevation: 0.0,
      voidZone: null,
    });
  }

  // Adjust default player spawn location just outside the front facade facing the entrance
  if (world && !options.isDesigner) {
    const frontZ = modelDepth / 2 + 3.5;
    world.spawn = {
      x: 0,
      z: Math.min(frontZ, (world.bounds?.maxZ || 40) - 2),
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
