import { SETTINGS, prefersReducedMotion } from '../config/settings.js';
import { resolveCollisions, resolveStairCollisions } from './collision.js';

/** First-person controller: smooth acceleration, sub-stepped collisions, head bob, footsteps. */
export class Player {
  constructor(camera) {
    this.camera = camera;
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.yaw = 0;
    this.pitch = 0;
    this.vx = 0;
    this.vz = 0;
    this.vy = 0;
    this.isGrounded = true;
    this.bob = 0;
    this.stepDist = 0;
    this.reduced = prefersReducedMotion();
    this.currentElevation = 0;
    this.onStairId = null;
  }

  teleport(x, z, yaw = 0, pitch = 0, y = null) {
    this.x = x;
    this.z = z;
    this.yaw = yaw;
    this.pitch = pitch;
    if (y !== null) {
      this.y = y;
      this.currentElevation = y;
    }
    this.vx = 0;
    this.vz = 0;
    this.vy = 0;
    this.isGrounded = true;
    this.bob = 0;
    this.stepDist = 0;
    this.onStairId = null;
    this.applyCamera();
  }

  forward() { return { x: -Math.sin(this.yaw), z: -Math.cos(this.yaw) }; }

  update(dt, input, world, audio) {
    const S = SETTINGS.player;
    const look = input.consumeLook();
    const a = input.axes();

    this.yaw -= look.x * S.mouseSensitivity;
    this.pitch -= look.y * S.mouseSensitivity;
    this.pitch = Math.max(-1.3, Math.min(1.3, this.pitch));
    this.yaw += a.turn * S.turnSpeed * dt;

    const speed = a.sprint ? S.sprint : S.walk;
    const sin = Math.sin(this.yaw); const cos = Math.cos(this.yaw);
    // forward = (-sin, -cos), right = (cos, -sin)
    const tx = (-sin * a.z + cos * a.x) * speed;
    const tz = (-cos * a.z - sin * a.x) * speed;
    const k = 1 - Math.exp(-S.accel * dt);
    this.vx += (tx - this.vx) * k;
    this.vz += (tz - this.vz) * k;

    const dx = this.vx * dt; const dz = this.vz * dt;
    const steps = Math.max(1, Math.min(4, Math.ceil(Math.hypot(dx, dz) / 0.25)));
    const playerY = this.y || 0;
    const px = this.x;
    const pz = this.z;
    const colliders = (world.colliders && world.colliders.length > 25)
      ? world.colliders.filter((c) =>
          c.enabled !== false &&
          (c.minY === undefined || (playerY + 1.8 > c.minY && playerY - 0.2 < c.maxY)) &&
          (c.minX === undefined || (px >= c.minX - 6.0 && px <= c.maxX + 6.0 && pz >= c.minZ - 6.0 && pz <= c.maxZ + 6.0))
        )
      : world.colliders;

    for (let i = 0; i < steps; i++) {
      this.x += dx / steps; this.z += dz / steps;
      resolveCollisions(this, S.radius, colliders, world.bounds);
      resolveStairCollisions(this, S.radius, world.stairs);
    }

    // Dynamic Stair & Multi-Floor Elevation Handling
    let targetElevation = null;
    let activeStairId = null;

    if (world.stairs && world.stairs.length > 0) {
      let bestCandidate = null;
      let bestScore = -Infinity;

      for (const s of world.stairs) {
        const run = s.run || Math.hypot(s.dx, s.dz) || 0.001;
        const ux = s.ux ?? (s.dx / run);
        const uz = s.uz ?? (s.dz / run);
        const vx = s.vx ?? (s.dz / run);
        const vz = s.vz ?? (-s.dx / run);
        const hw = s.halfWidth ?? ((s.width || 1.3) / 2);

        const rx = this.x - s.bottom.x;
        const rz = this.z - s.bottom.z;
        const lz = rx * ux + rz * uz;
        const lx = rx * vx + rz * vz;

        // Player must be laterally within this flight
        if (Math.abs(lx) > hw + 0.12) continue;

        const t = Math.max(0, Math.min(1, lz / run));
        const stairY = s.startY + t * (s.endY - s.startY);

        // If walking underneath floating stairs with ample headroom, keep lower floor elevation
        if (this.y + 1.75 < stairY - 0.15) {
          continue;
        }

        // Step onto stairs from bottom entrance, top landing, or while descending
        const atBottomEntrance = (lz >= -0.65 && lz <= 0.85 && Math.abs(this.y - s.startY) <= 0.85);
        const atTopLanding = (lz >= run - 0.85 && lz <= run + 0.65 && Math.abs(this.y - s.endY) <= 0.85);
        const alreadyClimbing = (this.onStairId === s.id && lz >= -0.45 && lz <= run + 0.45);
        const landingOnStairs = (lz >= -0.2 && lz <= run + 0.2 && Math.abs(this.y - stairY) <= 0.85);

        if (atBottomEntrance || atTopLanding || alreadyClimbing || landingOnStairs) {
          let score = 100 - Math.abs(lx) * 15 - Math.abs(this.y - stairY) * 6;
          if (this.onStairId === s.id) score += 60;

          // Forward motion alignment bonus (ascending vs descending)
          const speedAlong = (this.vx || 0) * ux + (this.vz || 0) * uz;
          if (atBottomEntrance && speedAlong > 0.1) score += 35;
          if (atTopLanding && speedAlong < -0.1) score += 35;

          if (score > bestScore) {
            bestScore = score;
            bestCandidate = { stair: s, stairY };
          }
        }
      }

      if (bestCandidate) {
        targetElevation = bestCandidate.stairY;
        activeStairId = bestCandidate.stair.id;
        this.currentElevation = targetElevation;
      }
    }

    this.onStairId = activeStairId;

    if (targetElevation === null) {
      // Find floor slab physically underneath the player's (x, z) horizontal footprint
      let foundElev = null;
      let highestElev = -Infinity;

      if (world.floorSlabs && world.floorSlabs.length > 0) {
        for (const slab of world.floorSlabs) {
          // Check if player (x, z) is inside this room or balcony floor slab footprint
          if (this.x >= slab.minX && this.x <= slab.maxX && this.z >= slab.minZ && this.z <= slab.maxZ) {
            // Check if standing directly over an open stairwell cutout or sunken area void
            if (slab.voidZone) {
              const vz = slab.voidZone;
              if (this.x >= vz.minX && this.x <= vz.maxX && this.z >= vz.minZ && this.z <= vz.maxZ) {
                continue; // Void hole: player falls through
              }
            }
            if (Array.isArray(slab.voidZones)) {
              let inVoid = false;
              for (const vz of slab.voidZones) {
                if (this.x >= vz.minX && this.x <= vz.maxX && this.z >= vz.minZ && this.z <= vz.maxZ) {
                  inVoid = true;
                  break;
                }
              }
              if (inVoid) continue;
            }
            // Candidate slab must be at or below player feet
            if (this.y >= slab.elevation - 0.6) {
              if (slab.elevation > highestElev) {
                highestElev = slab.elevation;
                foundElev = slab.elevation;
              }
            }
          }
        }
      }

      // If standing on an upper floor slab, use that elevation; otherwise ground level is always 0.0!
      // In mid-air outside buildings, targetElevation is 0.0, causing gravity to realistically drop player to the ground
      targetElevation = foundElev !== null ? foundElev : 0.0;
      this.currentElevation = targetElevation;
    }

    // Jumping physics & gravity
    const jumpForce = S.jumpForce || 6.2;
    const gravity = S.gravity || 18.0;

    if (a.jump && this.isGrounded) {
      this.vy = jumpForce;
      this.isGrounded = false;
      audio?.jump();
    }

    if (this.isGrounded && this.y > targetElevation + 0.25) {
      this.isGrounded = false;
    }

    if (this.onStairId) {
      // When walking on stairs, lock elevation directly to prevent any fall-through or desync
      this.vy = 0;
      this.y = targetElevation;
      this.isGrounded = true;
    } else if (!this.isGrounded) {
      this.vy -= gravity * dt;
      this.y += this.vy * dt;

      // Landing check on current floor elevation or stair slope
      if (this.y <= targetElevation) {
        this.y = targetElevation;
        this.vy = 0;
        this.isGrounded = true;
        audio?.footstep(a.sprint, world.ambient?.floor);
      }
    } else {
      this.vy = 0;
      this.y += (targetElevation - this.y) * Math.min(1, dt * 18);
    }

    const moved = Math.hypot(this.vx, this.vz);
    if (moved > 0.4 && this.isGrounded) {
      this.bob += moved * dt * 2.4;
      this.stepDist += moved * dt;
      const stride = a.sprint ? 2.1 : 1.55;
      if (this.stepDist > stride) { this.stepDist = 0; audio?.footstep(a.sprint, world.ambient?.floor); }
    }
    this.applyCamera(this.isGrounded ? (moved / S.walk) : 0);
  }

  applyCamera(moveAmt = 0) {
    if (!Number.isFinite(this.x)) this.x = 0;
    if (!Number.isFinite(this.y)) this.y = 0;
    if (!Number.isFinite(this.z)) this.z = 0;
    const bobY = this.reduced ? 0 : Math.sin(this.bob) * 0.028 * Math.min(1.4, moveAmt);
    this.camera.position.set(this.x, this.y + SETTINGS.player.eye + bobY, this.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }
}
