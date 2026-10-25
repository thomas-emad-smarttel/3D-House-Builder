import { SETTINGS } from '../config/settings.js';

// Remembers which rooms were entered and which displays were opened,
// so returning to the mansion (or reloading) never loses progress.
export class Progress {
  constructor(totalRooms) {
    this.total = totalRooms;
    this.rooms = new Set();
    this.modules = new Set();
    this.listeners = new Set();
    this.load();
  }

  load() {
    try {
      const raw = localStorage.getItem(SETTINGS.storageKey);
      if (!raw) return;
      const saved = JSON.parse(raw);
      (saved.rooms || []).forEach((r) => this.rooms.add(r));
      (saved.modules || []).forEach((m) => this.modules.add(m));
    } catch { /* storage unavailable or corrupt: start fresh */ }
  }

  save() {
    try {
      localStorage.setItem(SETTINGS.storageKey, JSON.stringify({
        rooms: [...this.rooms], modules: [...this.modules],
      }));
    } catch { /* ignore */ }
  }

  /** Forget rooms that were renamed or deleted in the dashboard, so counts never exceed the total. */
  prune(validRoomIds) {
    const ok = new Set(validRoomIds);
    let changed = false;
    for (const r of [...this.rooms]) if (!ok.has(r)) { this.rooms.delete(r); changed = true; }
    for (const m of [...this.modules]) if (!ok.has(m.split(':')[0])) { this.modules.delete(m); changed = true; }
    if (changed) this.save();
  }

  onChange(fn) { this.listeners.add(fn); fn(this); return () => this.listeners.delete(fn); }
  emit() { this.listeners.forEach((fn) => fn(this)); }

  visitRoom(id) {
    if (this.rooms.has(id)) return;
    this.rooms.add(id); this.save(); this.emit();
  }

  viewModule(roomId, moduleId) {
    const key = `${roomId}:${moduleId}`;
    if (this.modules.has(key)) return;
    this.modules.add(key); this.save(); this.emit();
  }

  hasRoom(id) { return this.rooms.has(id); }
  hasModule(roomId, moduleId) { return this.modules.has(`${roomId}:${moduleId}`); }
  get visitedCount() { return this.rooms.size; }

  reset() { this.rooms.clear(); this.modules.clear(); this.save(); this.emit(); }
}
