import * as THREE from 'three';
import { SETTINGS, prefersReducedMotion } from '../config/settings.js';
import { Input } from './Input.js';
import { Player } from './Player.js';
import { Interactions } from './Interactions.js';
import { buildMansion } from '../scenes/Mansion.js';
import { buildHouseWorld } from '../scenes/HouseWorld.js';
import { loadRoomBuilder } from '../scenes/index.js';

const ease = (k) => k * k * (3 - 2 * k);
const lerp = (a, b, k) => a + (b - a) * k;

/**
 * States: boot -> welcome -> intro -> play <-> panel | pause, plus transition.
 * Only `play` moves the player. The hub (mansion) stays in memory; rooms are
 * built on demand and disposed when you leave them.
 */
export class Game {
  constructor({ canvas, data, ui, audio, progress }) {
    this.canvas = canvas;
    this.data = data;
    this.ui = ui;
    this.audio = audio;
    this.progress = progress;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, SETTINGS.render.maxPixelRatio));
    this.renderer.shadowMap.enabled = SETTINGS.render.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    // ?exposure=1.4 in the URL brightens/darkens everything without touching code.
    const exposure = parseFloat(new URLSearchParams(location.search).get('exposure'));
    this.renderer.toneMappingExposure = Number.isFinite(exposure) ? exposure : SETTINGS.render.exposure;

    this.camera = new THREE.PerspectiveCamera(SETTINGS.player.fov, 1, 0.05, 180);
    this.input = new Input(canvas);
    this.player = new Player(this.camera);
    this.interactions = new Interactions(ui.hud);
    this.now = () => performance.now(); // own timer: THREE.Clock is deprecated in recent releases
    this.last = this.now();

    this.ctx = { data, audio, progress, game: this, ui };
    this.state = 'boot';
    this.busy = false;
    this.suppressPause = false;
    this.world = null;
    this.hub = null;
    this.currentRoom = null;
    this.intro = null;
    this.reduced = prefersReducedMotion();
    this.pendingRoom = null;   // set from ?room=ID (used by the dashboard's "Test in game")
    this.houseData = data.house || null;
    this.activeFloorLevel = 'all'; // Default to showing all floors with stairs!
    this.isDollhouse = false;
    const plotSize = Math.max(Number(this.houseData?.plot_width) || 30, Number(this.houseData?.plot_depth) || 30);
    this.orbit = { yaw: 0.6, pitch: 0.55, dist: plotSize * 0.95 };
    this.ac = new AbortController();
    this.bind();
    this.resize();
  }

  /* ------------------------------------------------------------- setup */
  async init() {
    if (this.houseData) {
      this.hub = buildHouseWorld(this.ctx, this.houseData, this.activeFloorLevel);
    } else {
      this.hub = buildMansion(this.ctx);
    }
    this.world = this.hub;
    this.renderer.compile(this.hub.scene, this.camera);
    this.setState('welcome');
    this.renderer.setAnimationLoop(() => this.frame());
  }

  bind() {
    const o = { signal: this.ac.signal };
    window.addEventListener('resize', () => this.resize(), o);
    document.addEventListener('pointerlockchange', () => this.onLockChange(), o);
    this.canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.renderer.setAnimationLoop(null);
      this.ui.showFallback('The graphics context was lost. Reload the page to continue, or read the CV page.');
    }, o);

    const click = (id, fn) => document.getElementById(id)?.addEventListener('click', fn, o);
    click('hud-menu', () => this.openPause());
    click('hud-fullscreen', () => this.toggleFullscreen());
    click('btn-return', () => this.returnToMansion());
    click('capture-hint', () => this.capturePointer());
    click('btn-camera-mode', () => this.toggleDollhouse());
    click('hud-controls', () => this.ui.menus?.openControls?.());

    // Dollhouse orbit controls (mouse drag to rotate, wheel to zoom)
    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };
    this.canvas.addEventListener('mousedown', (e) => {
      if (this.isDollhouse && e.button === 0) {
        isDragging = true;
        prevMouse = { x: e.clientX, y: e.clientY };
      }
    }, o);
    window.addEventListener('mousemove', (e) => {
      if (this.isDollhouse && isDragging) {
        const dx = e.clientX - prevMouse.x;
        const dy = e.clientY - prevMouse.y;
        prevMouse = { x: e.clientX, y: e.clientY };
        this.orbit.yaw -= dx * 0.008;
        this.orbit.pitch = Math.max(0.12, Math.min(Math.PI / 2 - 0.05, this.orbit.pitch + dy * 0.008));
      }
    }, o);
    window.addEventListener('mouseup', () => { isDragging = false; }, o);
    this.canvas.addEventListener('wheel', (e) => {
      if (this.isDollhouse) {
        e.preventDefault();
        this.orbit.dist = Math.max(8, Math.min(80, this.orbit.dist + e.deltaY * 0.04));
      }
    }, { ...o, passive: false });

    this.input.on('interact', () => {
      if (this.state === 'intro') this.skipIntro();
      else if (this.state === 'play') this.interactions.trigger();
    });
    this.input.on('escape', () => this.escape());
    this.input.on('fullscreen', () => this.toggleFullscreen());
    this.input.on('mute', () => this.audio.toggle());
    this.input.on('anykey', () => { if (this.state === 'intro') this.skipIntro(); });
    this.input.on('anyclick', () => { if (this.state === 'intro') this.skipIntro(); });
    this.input.on('canvasclick', () => {
      if (this.state === 'play' && !this.input.isTouch && !this.isDollhouse) {
        if (document.pointerLockElement === this.canvas) {
          this.interactions.trigger();
        } else {
          this.capturePointer();
        }
      }
    });
  }

  resize() {
    const w = window.innerWidth; const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = w / h < 0.9 ? 82 : SETTINGS.player.fov; // wider on portrait phones
    this.camera.updateProjectionMatrix();
  }

  setState(s) {
    this.state = s;
    document.body.dataset.state = s;
    document.body.dataset.touch = this.input.isTouch ? 'yes' : 'no';
    this.input.gameplay = s === 'play';
    if (s !== 'play') this.input.reset();
    const hudStates = ['intro', 'play', 'panel', 'pause', 'transition'];
    this.ui.hud.show(hudStates.includes(s));
    $touch(this.input.isTouch && s === 'play');
  }

  /* ------------------------------------------------------ pointer lock */
  capturePointer() {
    if (this.input.isTouch || !this.canvas.requestPointerLock) return;
    if (document.pointerLockElement === this.canvas) return;
    try { this.canvas.requestPointerLock()?.catch?.(() => {}); } catch { /* needs a user gesture */ }
    setTimeout(() => this.syncCaptureHint(), 200);
  }

  releasePointer() {
    this.suppressPause = true;
    if (document.pointerLockElement) document.exitPointerLock?.();
    setTimeout(() => { this.suppressPause = false; }, 400);
  }

  syncCaptureHint() {
    const locked = document.pointerLockElement === this.canvas;
    this.ui.hud.showCapture(this.state === 'play' && !locked && !this.input.isTouch);
  }

  onLockChange() {
    this.syncCaptureHint();
    const locked = document.pointerLockElement === this.canvas;
    if (!locked && this.state === 'play' && !this.suppressPause && !this.busy) this.openPause();
  }

  toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.().catch?.(() => {});
  }

  /* ----------------------------------------------------------- escape */
  escape() {
    if (this.ui.menus.controlsOpen) { this.ui.menus.closeControls(); return; }
    switch (this.state) {
      case 'panel': this.ui.panel.close(); break;
      case 'pause': this.resume(); break;
      case 'play': this.openPause(); break; // pointer was not locked
      case 'intro': this.skipIntro(); break;
      default: break;
    }
  }

  /* ------------------------------------------------------ experience */
  startExperience({ skip = false } = {}) {
    if (this.state !== 'welcome') return;
    this.audio.init();
    this.audio.ambient(this.hub.ambient);
    this.audio.ui();
    this.ui.menus.hideWelcome();
    this.ui.hud.setRoom(this.hub.name, this.hub.accent);
    this.ui.hud.setProgress(this.progress);
    this.capturePointer();

    if (skip || this.reduced) {
      this.player.teleport(this.hub.spawn.x, this.hub.spawn.z, this.hub.spawn.yaw);
      this.setState('play');
      this.afterStart();
      return;
    }
    const s = this.hub.spawn;
    this.intro = {
      t: 0, dur: 7,
      path: new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 5.0, 3.2),
        new THREE.Vector3(1.8, 4.4, -7),
        new THREE.Vector3(-1.6, 3.2, -3),
        new THREE.Vector3(s.x, 1.65, s.z),
      ]),
      look0: new THREE.Vector3(0, 2.4, this.hub.hallEnd),
      look1: new THREE.Vector3(s.x, 1.65, s.z - 10),
    };
    this.setState('intro');
    this.ui.hud.setPrompt('Click or press any key to skip the intro', '');
  }

  skipIntro() {
    if (this.state !== 'intro') return;
    this.intro = null;
    this.ui.hud.setPrompt(null);
    this.player.teleport(this.hub.spawn.x, this.hub.spawn.z, this.hub.spawn.yaw);
    this.setState('play');
    this.capturePointer();
    this.afterStart();
  }

  afterStart() {
    this.updateFloorHud();
    const id = this.pendingRoom;
    this.pendingRoom = null;
    if (id) this.travel(id);
  }

  /* -------------------------------------------------- house builder tools */
  switchFloor(level) {
    if (!this.houseData) return;
    this.activeFloorLevel = level;
    if (this.world && this.world !== this.hub) this.world.dispose();
    this.hub?.dispose();
    this.hub = buildHouseWorld(this.ctx, this.houseData, this.activeFloorLevel);
    this.world = this.hub;
    const targetElev = level === 'all'
      ? (this.world.floorElevations?.[0] || 0)
      : Number(this.houseData.floors.find((f) => f.level === level)?.elevation || 0);
    this.player.teleport(this.world.spawn.x, this.world.spawn.z, this.world.spawn.yaw, 0, targetElev);
    this.updateFloorHud();
  }

  toggleDollhouse() {
    this.isDollhouse = !this.isDollhouse;
    const btn = document.getElementById('btn-camera-mode');
    if (btn) btn.textContent = this.isDollhouse ? '🚶 Walk Inside' : '🏠 Dollhouse View';
    if (this.isDollhouse) {
      this.releasePointer();
    } else {
      this.player.applyCamera();
      this.capturePointer();
    }
  }

  updateFloorHud() {
    const bar = document.getElementById('floor-selector-bar');
    if (!bar || !this.houseData?.floors) return;

    // "All Floors with Stairs" button
    const allBtn = document.createElement('button');
    allBtn.type = 'button';
    allBtn.className = `chip${this.activeFloorLevel === 'all' ? ' chip-active' : ''}`;
    allBtn.style.cssText = this.activeFloorLevel === 'all'
      ? 'background:#3b82f6; color:#ffffff; font-weight:600;'
      : 'background:rgba(30,41,59,0.85); color:#cbd5e1;';
    allBtn.textContent = '🏰 All Floors & Stairs';
    allBtn.onclick = () => this.switchFloor('all');

    const floorButtons = this.houseData.floors.map((fl) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      const isActive = this.activeFloorLevel === fl.level;
      btn.className = `chip${isActive ? ' chip-active' : ''}`;
      btn.style.cssText = isActive
        ? 'background:#3b82f6; color:#ffffff; font-weight:600;'
        : 'background:rgba(30,41,59,0.85); color:#cbd5e1;';
      btn.textContent = fl.name;
      btn.onclick = () => this.switchFloor(fl.level);
      return btn;
    });

    bar.replaceChildren(allBtn, ...floorButtons);

    const hudRoom = document.getElementById('hud-room');
    if (hudRoom) {
      if (this.activeFloorLevel === 'all') {
        hudRoom.textContent = `${this.houseData.title} · All Floors & Stairs`;
      } else {
        const currentFl = this.houseData.floors.find((f) => f.level === this.activeFloorLevel) || this.houseData.floors[0];
        hudRoom.textContent = `${this.houseData.title} · ${currentFl?.name || 'Ground'}`;
      }
    }
  }

  /* ---------------------------------------------------------- pause */
  openPause() {
    if (this.state !== 'play') return;
    this.setState('pause');
    this.releasePointer();
    this.interactions.clear();
    this.ui.menus.openPause();
    this.audio.ui();
  }

  resume() {
    if (this.state !== 'pause') return;
    this.ui.menus.closePause();
    if (this.ui.menus.controlsOpen) this.ui.menus.closeControls();
    this.setState('play');
    this.capturePointer();
  }

  /* --------------------------------------------------------- panels */
  openPanel(fn) {
    if (this.state !== 'play') return;
    this.setState('panel');
    this.releasePointer();
    this.interactions.clear();
    this.audio.open();
    fn(this.ui.panel);
  }

  panelClosed() {
    if (this.state !== 'panel') return;
    this.audio.close();
    this.setState('play');
    this.capturePointer();
  }

  openModule(room, mod) { this.openPanel((p) => p.openModule(room, mod)); }
  openProfile(focus) { this.openPanel((p) => p.openProfile(focus)); }
  openSkills(cat) { this.openPanel((p) => p.openSkills(cat)); }
  openTimeline(entry) { this.openPanel((p) => p.openTimeline(entry)); }
  openContact(focus) { this.openPanel((p) => p.openContact(focus)); }
  openInfo(spec) { this.openPanel((p) => p.openInfo(spec)); }

  downloadCv() {
    window.open(this.data.cv.download_url, '_blank', 'noopener');
    this.audio.ui();
  }

  /* ---------------------------------------------------- transitions */
  tween(ms, fn) {
    return new Promise((resolve) => {
      const t0 = performance.now();
      const step = () => {
        const k = Math.min(1, (performance.now() - t0) / ms);
        fn(ease(k));
        if (k < 1) requestAnimationFrame(step); else resolve();
      };
      requestAnimationFrame(step);
    });
  }

  loadWorld(world, spawn, { resetDoors = false } = {}) {
    const prev = this.world;
    this.world = world;
    this.player.teleport(spawn.x, spawn.z, spawn.yaw);
    if (prev && prev !== this.hub && prev !== world) prev.dispose();
    if (resetDoors && world === this.hub) Object.values(world.doors).forEach((d) => d.setOpenInstant(false));
    this.interactions.clear();
    this.ui.hud.setRoom(world.name, world.accent);
    this.ui.hud.showReturn(world !== this.hub);
    this.audio.ambient(world.ambient);
    this.renderer.compile(world.scene, this.camera); // avoid a hitch on the first visible frame
  }

  async enterRoom(id) {
    if (this.busy || this.state !== 'play') return;
    const room = this.data.roomsById[id];
    const door = this.hub.doors[id];
    const through = this.hub.doorThrough[id];
    if (!room || !door) return;

    this.busy = true;
    this.setState('transition');
    this.interactions.clear();
    door.open();
    this.audio.door();
    if (room.flagship) this.audio.whoosh();

    const loading = loadRoomBuilder(room);          // download the room's code while the door opens
    loading.catch(() => {});
    const sx = this.player.x; const sz = this.player.z;
    await this.tween(through.openMs, (k) => {
      this.player.x = lerp(sx, through.x, k);
      this.player.z = lerp(sz, through.z, k);
      this.player.applyCamera();
    });

    await this.ui.fade.out(room.flagship ? 1100 : 550, { color: room.accent, title: room.flagship ? room.name : null });
    try {
      const builder = await loading;
      const world = builder(this.ctx, room);
      this.currentRoom = room;
      this.loadWorld(world, world.spawn);
      this.progress.visitRoom(id);
    } catch (err) {
      console.error(`Could not build room "${id}"`, err);
      door.close();
      this.player.teleport(this.hub.doorSpawns[id].x, this.hub.doorSpawns[id].z, this.hub.doorSpawns[id].yaw);
      await this.ui.fade.in(500);
      this.busy = false;
      this.setState('play');
      this.ui.hud.setPrompt('That room could not be loaded. Try again.', '');
      setTimeout(() => this.ui.hud.setPrompt(null), 2500);
      return;
    }
    await this.ui.fade.in(room.flagship ? 1200 : 600);
    this.busy = false;
    this.setState('play');
  }

  async returnToMansion() {
    if (this.busy || this.state !== 'play' || !this.currentRoom) return;
    const room = this.currentRoom;
    const w = this.world;
    this.busy = true;
    this.setState('transition');
    this.interactions.clear();
    this.audio.door();
    w.exitDoor?.open();

    const sz = this.player.z; const sx = this.player.x;
    await this.tween(650, (k) => {
      this.player.x = lerp(sx, 0, k);
      this.player.z = lerp(sz, w.size.d / 2 + 1.1, k);
      this.player.applyCamera();
    });
    await this.ui.fade.out(450);
    this.currentRoom = null;
    this.loadWorld(this.hub, this.hub.doorSpawns[room.id]);
    this.hub.doors[room.id]?.close();
    await this.ui.fade.in(550);
    this.busy = false;
    this.setState('play');
  }

  /** Quick travel from the pause menu: 'hub' or a room id. */
  async travel(id) {
    if (this.busy || !['pause', 'play'].includes(this.state)) return;
    if (id !== 'hub' && !this.data.roomsById[id]) return;
    this.busy = true;
    if (this.state === 'pause') this.ui.menus.closePause();
    this.setState('transition');
    const room = id === 'hub' ? null : this.data.roomsById[id];
    const loading = room ? loadRoomBuilder(room) : null;
    const accent = room?.accent ?? '#05070a';
    await this.ui.fade.out(room?.flagship ? 900 : 450, { color: accent, title: room?.flagship ? room.name : null });
    try {
      if (room) {
        const world = (await loading)(this.ctx, room);
        this.currentRoom = room;
        this.loadWorld(world, world.spawn);
        this.progress.visitRoom(id);
      } else {
        this.currentRoom = null;
        this.loadWorld(this.hub, this.hub.spawn, { resetDoors: true });
      }
    } catch (err) {
      console.error(err);
    }
    await this.ui.fade.in(500);
    this.busy = false;
    this.setState('play');
    this.capturePointer();
  }

  /* ------------------------------------------------------- main loop */
  frame() {
    const now = this.now();
    const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    const w = this.world;
    if (!w) return;
    w.time += dt;
    for (const u of w.updaters) u(dt, w.time);

    if (this.state === 'play') {
      if (this.isDollhouse) {
        const cy = (this.activeFloorLevel || 0) * 3.4;
        const y = cy + this.orbit.dist * Math.sin(this.orbit.pitch);
        const r = this.orbit.dist * Math.cos(this.orbit.pitch);
        const x = r * Math.sin(this.orbit.yaw);
        const z = r * Math.cos(this.orbit.yaw);
        this.camera.position.set(x, y, z);
        this.camera.lookAt(0, cy, 0);
      } else {
        this.player.update(dt, this.input, w, this.audio);
        this.interactions.update(this.player, w);
      }
    } else if (this.state === 'welcome') {
      this.backdrop(w.time);
    } else if (this.state === 'intro' && this.intro) {
      this.introStep(dt);
    }
    this.renderer.render(w.scene, this.camera);
  }

  backdrop(t) {
    if (this.houseData) {
      this.camera.position.set(Math.sin(t * 0.15) * 24, 12, Math.cos(t * 0.15) * 24);
      this.camera.lookAt(0, 2.0, 0);
      return;
    }
    const end = this.hub.hallEnd;
    this.camera.position.set(Math.sin(t * 0.12) * 1.6, 3.3, 1.5 + Math.sin(t * 0.07) * 2.5);
    this.camera.lookAt(Math.sin(t * 0.09) * 0.8, 2.2, end);
  }

  introStep(dt) {
    const it = this.intro;
    it.t += dt;
    const k = ease(Math.min(1, it.t / it.dur));
    this.camera.position.copy(it.path.getPoint(k));
    const look = new THREE.Vector3().lerpVectors(it.look0, it.look1, ease(Math.max(0, (k - 0.15) / 0.85)));
    this.camera.lookAt(look);
    if (it.t >= it.dur) this.skipIntro();
  }

  dispose() {
    this.ac.abort();
    this.input.dispose();
    this.renderer.setAnimationLoop(null);
    if (this.world && this.world !== this.hub) this.world.dispose();
    this.hub?.dispose();
    this.renderer.dispose();
  }
}

function $touch(show) {
  const t = document.getElementById('touch-ui');
  if (t) t.hidden = !show;
}
