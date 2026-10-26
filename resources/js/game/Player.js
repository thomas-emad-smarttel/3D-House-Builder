import { SETTINGS, prefersReducedMotion } from '../config/settings.js';
import { resolveCollisions } from './collision.js';

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
    this.bob = 0;
    this.stepDist = 0;
    this.reduced = prefersReducedMotion();
    this.currentElevation = 0;
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
    this.bob = 0;
    this.stepDist = 0;
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
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.1));
    for (let i = 0; i < steps; i++) {
      this.x += dx / steps; this.z += dz / steps;
      resolveCollisions(this, S.radius, world.colliders, world.bounds);
    }

    // Dynamic Stair & Multi-Floor Elevation Handling
    let targetElevation = null;

    if (world.stairs && world.stairs.length > 0) {
      for (const s of world.stairs) {
        if (this.x >= s.minX && this.x <= s.maxX && this.z >= s.minZ && this.z <= s.maxZ) {
          if (this.y >= s.startY - 0.9 && this.y <= s.endY + 0.9) {
            const px = this.x - s.bottom.x;
            const pz = this.z - s.bottom.z;
            const t = Math.max(0, Math.min(1, (px * s.dx + pz * s.dz) / s.lenSq));
            targetElevation = s.startY + t * (s.endY - s.startY);
            this.currentElevation = targetElevation;
            break;
          }
        }
      }
    }

    if (targetElevation === null) {
      // Find nearest floor elevation underneath the player
      const elevations = world.floorElevations || [0];
      let bestFloor = elevations[0];
      let minDiff = Infinity;
      for (const elev of elevations) {
        if (this.y >= elev - 0.6) {
          const diff = Math.abs(this.y - elev);
          if (diff < minDiff) {
            minDiff = diff;
            bestFloor = elev;
          }
        }
      }
      targetElevation = bestFloor;
      this.currentElevation = bestFloor;
    }

    // Smooth vertical rise / descend
    this.y += (targetElevation - this.y) * Math.min(1, dt * 15);

    const moved = Math.hypot(this.vx, this.vz);
    if (moved > 0.4) {
      this.bob += moved * dt * 2.4;
      this.stepDist += moved * dt;
      const stride = a.sprint ? 2.1 : 1.55;
      if (this.stepDist > stride) { this.stepDist = 0; audio?.footstep(a.sprint, world.ambient?.floor); }
    }
    this.applyCamera(moved / S.walk);
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
