import { SETTINGS } from '../config/settings.js';

/**
 * Finds the best interactable in front of the player each frame.
 * Score favours what you are looking at, then what is closest.
 */
export class Interactions {
  constructor(hud) {
    this.hud = hud;
    this.current = null;
    this.cardTarget = null;
    this.highlighted = new Set();
  }

  update(player, world) {
    const f = player.forward();
    let best = null; let bestScore = -Infinity;
    let card = null; let cardScore = -Infinity;

    for (const it of world.interactables) {
      if (it.enabled && !it.enabled()) continue;
      const dx = it.x - player.x; const dz = it.z - player.z;
      const dist = Math.hypot(dx, dz);
      const dot = dist > 0.001 ? (dx * f.x + dz * f.z) / dist : 1;

      if (dist <= it.radius && (dist < 1 || dot >= SETTINGS.interact.facing)) {
        const s = dot * 2 - dist * 0.35;
        if (s > bestScore) { bestScore = s; best = it; }
      }
      if (it.card && dist <= (it.cardRadius ?? 7) && (dist < 1.5 || dot >= 0.55)) {
        const s = dot * 2 - dist * 0.25;
        if (s > cardScore) { cardScore = s; card = it; }
      }
    }

    if (best !== this.current) {
      this.current = best;
      this.hud.setPrompt(best ? best.label : null);
    }
    if (card !== this.cardTarget) {
      this.cardTarget = card;
      this.hud.setCard(card ? card.card : null);
    }

    // Highlight whatever is focused (door card target or action target)
    const want = new Set([best, card].filter(Boolean));
    for (const it of this.highlighted) if (!want.has(it)) { it.onFocus?.(false); this.highlighted.delete(it); }
    for (const it of want) if (!this.highlighted.has(it)) { it.onFocus?.(true); this.highlighted.add(it); }
  }

  trigger() {
    const it = this.current;
    if (it && (!it.enabled || it.enabled())) it.action?.();
  }

  clear() {
    for (const it of this.highlighted) it.onFocus?.(false);
    this.highlighted.clear();
    this.current = null; this.cardTarget = null;
    this.hud.setPrompt(null); this.hud.setCard(null);
  }
}
