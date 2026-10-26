/*
 * 2D collision on the floor plane: the player is a circle, obstacles are
 * axis-aligned boxes ({minX,maxX,minZ,maxZ,enabled}).
 */
export function makeAabb(x, z, w, d, rotY = 0, minY = -Infinity, maxY = Infinity) {
  // Rooms only use quarter-turn rotations, so swapping w/d is exact.
  const swap = Math.abs(Math.sin(rotY)) > 0.5;
  const hw = (swap ? d : w) / 2;
  const hd = (swap ? w : d) / 2;
  return { minX: x - hw, maxX: x + hw, minZ: z - hd, maxZ: z + hd, minY, maxY, enabled: true };
}

export function resolveCollisions(p, radius, colliders, bounds) {
  if (!Number.isFinite(p.x) || !Number.isFinite(p.z)) return;
  const playerY = p.y || 0;

  for (let pass = 0; pass < 3; pass++) {
    let moved = false;
    for (const c of colliders) {
      if (c.enabled === false) continue;
      // Multi-floor height check: ignore walls on other floors
      if (c.minY !== undefined && c.maxY !== undefined) {
        if (playerY + 1.7 <= c.minY || playerY >= c.maxY) continue;
      }
      if (!Number.isFinite(c.minX) || !Number.isFinite(c.maxX) || !Number.isFinite(c.minZ) || !Number.isFinite(c.maxZ)) continue;
      const cx = Math.max(c.minX, Math.min(p.x, c.maxX));
      const cz = Math.max(c.minZ, Math.min(p.z, c.maxZ));
      let dx = p.x - cx; let dz = p.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= radius * radius) continue;
      if (d2 > 1e-9) {
        const d = Math.sqrt(d2); const push = radius - d;
        p.x += (dx / d) * push; p.z += (dz / d) * push;
      } else {
        // centre is inside the box: leave through the nearest face
        const left = p.x - c.minX, right = c.maxX - p.x, up = p.z - c.minZ, down = c.maxZ - p.z;
        const m = Math.min(left, right, up, down);
        if (m === left) p.x = c.minX - radius;
        else if (m === right) p.x = c.maxX + radius;
        else if (m === up) p.z = c.minZ - radius;
        else p.z = c.maxZ + radius;
      }
      moved = true;
    }
    if (!moved) break;
  }
  if (bounds) {
    p.x = Math.max(bounds.minX + radius, Math.min(bounds.maxX - radius, p.x));
    p.z = Math.max(bounds.minZ + radius, Math.min(bounds.maxZ - radius, p.z));
  }
}

/** True when a circle at (x,z) would touch an enabled collider. */
export function blocked(x, z, radius, colliders, y = 0) {
  for (const c of colliders) {
    if (c.enabled === false) continue;
    if (c.minY !== undefined && c.maxY !== undefined) {
      if (y + 1.7 <= c.minY || y >= c.maxY) continue;
    }
    if (!Number.isFinite(c.minX) || !Number.isFinite(c.maxX) || !Number.isFinite(c.minZ) || !Number.isFinite(c.maxZ)) continue;
    const cx = Math.max(c.minX, Math.min(x, c.maxX));
    const cz = Math.max(c.minZ, Math.min(z, c.maxZ));
    if ((x - cx) ** 2 + (z - cz) ** 2 < radius * radius) return true;
  }
  return false;
}
