import fs from 'node:fs';
import path from 'node:path';

/**
 * Fast vertex-clustering mesh decimation for massive 3D models (>50,000 faces).
 * Reduces multi-million polygon offline models (like 3ds Max couch models)
 * into lightweight web-ready 3D models (~30,000 - 45,000 triangles) in ~2 seconds.
 */
export function optimizeObjFile(inputPath, outputPath = inputPath, targetFaces = 15000) {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  const content = fs.readFileSync(inputPath, 'utf8');
  const lines = content.split('\n');

  let mtllib = null;
  let usemtl = null;
  const vertices = [];
  const faces = [];

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#')) continue;

    if (line.startsWith('mtllib ')) {
      mtllib = line.substring(7).trim();
    } else if (line.startsWith('usemtl ')) {
      usemtl = line.substring(7).trim();
    } else if (line.startsWith('v ')) {
      const parts = line.substring(2).trim().split(/\s+/);
      const x = parseFloat(parts[0]);
      const y = parseFloat(parts[1]);
      const z = parseFloat(parts[2]);
      vertices.push(x, y, z);
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
    } else if (line.startsWith('f ')) {
      const parts = line.substring(2).trim().split(/\s+/);
      if (parts.length >= 3) {
        // Parse indices (support v, v/vt, v/vt/vn, v//vn)
        const parseIdx = (str) => {
          const slash = str.indexOf('/');
          return parseInt(slash === -1 ? str : str.substring(0, slash), 10) - 1;
        };

        const i0 = parseIdx(parts[0]);
        const i1 = parseIdx(parts[1]);
        const i2 = parseIdx(parts[2]);
        faces.push(i0, i1, i2);

        // Triangulate quads if needed
        for (let j = 3; j < parts.length; j++) {
          faces.push(i0, parseIdx(parts[j - 1]), parseIdx(parts[j]));
        }
      }
    }
  }

  const originalFaceCount = faces.length / 3;
  const originalVertexCount = vertices.length / 3;

  // If already under targetFaces, no decimation needed
  if (originalFaceCount <= targetFaces) {
    return {
      decimated: false,
      vertices: originalVertexCount,
      faces: originalFaceCount,
      bytes: fs.statSync(inputPath).size,
    };
  }

  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const spanZ = maxZ - minZ || 1;
  const maxSpan = Math.max(spanX, spanY, spanZ);

  // Resolution heuristic to reach desired target faces
  const resolution = Math.round(Math.cbrt(targetFaces * 32));
  const cellSize = maxSpan / Math.max(20, resolution);

  const cellMap = new Map();
  const newVertices = [];
  const vertexMap = new Int32Array(originalVertexCount);

  // Group vertices into grid cells and compute average center for smooth silhouette
  const cellAccum = new Map();
  for (let i = 0; i < vertices.length; i += 3) {
    const vIdx = i / 3;
    const x = vertices[i];
    const y = vertices[i + 1];
    const z = vertices[i + 2];

    const cx = Math.floor((x - minX) / cellSize);
    const cy = Math.floor((y - minY) / cellSize);
    const cz = Math.floor((z - minZ) / cellSize);
    const key = `${cx},${cy},${cz}`;

    let acc = cellAccum.get(key);
    if (!acc) {
      acc = { id: cellAccum.size, sumX: 0, sumY: 0, sumZ: 0, count: 0 };
      cellAccum.set(key, acc);
    }
    acc.sumX += x;
    acc.sumY += y;
    acc.sumZ += z;
    acc.count++;
    vertexMap[vIdx] = acc.id;
  }

  for (const acc of cellAccum.values()) {
    newVertices.push(acc.sumX / acc.count, acc.sumY / acc.count, acc.sumZ / acc.count);
  }

  // Filter degenerate and duplicate faces
  const newFaces = [];
  const seen = new Set();
  for (let i = 0; i < faces.length; i += 3) {
    const a = vertexMap[faces[i]];
    const b = vertexMap[faces[i + 1]];
    const c = vertexMap[faces[i + 2]];

    if (a !== b && b !== c && c !== a) {
      // Sort for unique key regardless of winding order for duplicate elimination
      const min = Math.min(a, b, c);
      const max = Math.max(a, b, c);
      const mid = a + b + c - min - max;
      const key = `${min}-${mid}-${max}`;

      if (!seen.has(key)) {
        seen.add(key);
        newFaces.push(a, b, c);
      }
    }
  }

  // Compute smooth vertex normals
  const normals = new Float32Array(newVertices.length);
  for (let i = 0; i < newFaces.length; i += 3) {
    const ia = newFaces[i] * 3;
    const ib = newFaces[i + 1] * 3;
    const ic = newFaces[i + 2] * 3;

    const ax = newVertices[ia], ay = newVertices[ia + 1], az = newVertices[ia + 2];
    const bx = newVertices[ib], by = newVertices[ib + 1], bz = newVertices[ib + 2];
    const cx = newVertices[ic], cy = newVertices[ic + 1], cz = newVertices[ic + 2];

    const abx = bx - ax, aby = by - ay, abz = bz - az;
    const acx = cx - ax, acy = cy - ay, acz = cz - az;

    const nx = aby * acz - abz * acy;
    const ny = abz * acx - abx * acz;
    const nz = abx * acy - aby * acx;

    normals[ia] += nx; normals[ia + 1] += ny; normals[ia + 2] += nz;
    normals[ib] += nx; normals[ib + 1] += ny; normals[ib + 2] += nz;
    normals[ic] += nx; normals[ic + 1] += ny; normals[ic + 2] += nz;
  }

  for (let i = 0; i < normals.length; i += 3) {
    const len = Math.hypot(normals[i], normals[i + 1], normals[i + 2]) || 1;
    normals[i] /= len;
    normals[i + 1] /= len;
    normals[i + 2] /= len;
  }

  // Build optimized OBJ text
  const outLines = [
    `# Optimized Web-Ready 3D Mesh (${newFaces.length / 3} faces, downsampled from ${originalFaceCount})`,
  ];
  if (mtllib) outLines.push(`mtllib ${mtllib}`);
  if (usemtl) outLines.push(`usemtl ${usemtl}`);

  for (let i = 0; i < newVertices.length; i += 3) {
    outLines.push(`v ${newVertices[i].toFixed(4)} ${newVertices[i + 1].toFixed(4)} ${newVertices[i + 2].toFixed(4)}`);
  }

  for (let i = 0; i < normals.length; i += 3) {
    outLines.push(`vn ${normals[i].toFixed(4)} ${normals[i + 1].toFixed(4)} ${normals[i + 2].toFixed(4)}`);
  }

  outLines.push('s 1');
  for (let i = 0; i < newFaces.length; i += 3) {
    const a = newFaces[i] + 1;
    const b = newFaces[i + 1] + 1;
    const c = newFaces[i + 2] + 1;
    outLines.push(`f ${a}//${a} ${b}//${b} ${c}//${c}`);
  }

  fs.writeFileSync(outputPath, outLines.join('\n'), 'utf8');

  return {
    decimated: true,
    originalFaces: originalFaceCount,
    originalVertices: originalVertexCount,
    vertices: newVertices.length / 3,
    faces: newFaces.length / 3,
    bytes: fs.statSync(outputPath).size,
  };
}

if (process.argv[1] && process.argv[1].endsWith('optimize-obj.mjs')) {
  const file = process.argv[2];
  const target = process.argv[3] ? parseInt(process.argv[3], 10) : 15000;
  if (file) {
    console.log(`Optimizing ${file} to target ~${target} faces...`);
    const res = optimizeObjFile(file, file, target);
    console.log('Result:', res);
  }
}
