import '../css/app.css';
import { loadPortfolio } from './data/portfolio.js';
import { syncLibrary } from './scenes/custom/library.js';
import { Progress } from './state/progress.js';
import { AudioEngine } from './game/Audio.js';
import { createUi } from './ui/index.js';
import { Game } from './game/Game.js';
import { $ } from './ui/dom.js';
import { SETTINGS } from './config/settings.js';

function webglSupported() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch { return false; }
}

/** Wait (briefly) for the web fonts so canvas textures are drawn with them. */
async function fontsReady() {
  if (!document.fonts?.load) return;
  const timeout = new Promise((r) => setTimeout(r, 2500));
  const load = Promise.all([
    document.fonts.load('700 40px Syne'),
    document.fonts.load('400 20px "Hanken Grotesk"'),
  ]).catch(() => {});
  await Promise.race([load, timeout]);
}

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

async function main() {
  let data;
  const houseEl = document.getElementById('house-data');
  if (houseEl) {
    try {
      const payload = JSON.parse(houseEl.textContent || '{}');
      const house = payload.house || {};
      const allRooms = [];
      for (const fl of (house.floors || [])) {
        for (const rm of (fl.rooms || [])) {
          allRooms.push({
            id: rm.id,
            name: rm.name,
            accent: rm.color || '#3b82f6',
            floorLevel: fl.level,
            floorName: fl.name,
          });
        }
      }
      const roomsById = Object.fromEntries(allRooms.map((r) => [r.id, r]));
      data = {
        house,
        all_houses: payload.all_houses || [],
        library: payload.library || [],
        rooms: allRooms,
        roomsById,
        owner: { name: house.title || '3D House' },
        settings: {
          welcome_lead: house.description || 'Explore every room, floor, ceiling, and doors in 3D.',
          shadows: true,
          exposure: 1.1,
        },
      };
    } catch (err) {
      console.warn('Could not parse house-data JSON:', err);
      data = loadPortfolio();
    }
  } else {
    data = loadPortfolio();
  }

  if (Array.isArray(data.library)) {
    syncLibrary(data.library);
  }

  // Dashboard settings override the defaults before anything is built.
  const st = data.settings ?? {};
  Object.assign(SETTINGS.render, {
    shadows: st.shadows ?? SETTINGS.render.shadows,
    maxPixelRatio: st.max_pixel_ratio ?? SETTINGS.render.maxPixelRatio,
    exposure: st.exposure ?? SETTINGS.render.exposure,
  });

  const progress = new Progress(data.rooms.length);
  progress.prune(data.rooms.map((r) => r.id));
  const audio = new AudioEngine();
  const handlers = {};
  const ui = createUi({ data, audio, progress, handlers });

  try {
    ui.loading.set(0.1, 'Checking graphics support');
    if (!webglSupported()) { ui.showFallback(); return; }

    ui.loading.set(0.3, 'Loading fonts');
    await fontsReady();

    ui.loading.set(0.55, 'Generating 3D House Architecture');
    await nextFrame();
    const game = new Game({ canvas: $('game-canvas'), data, ui, audio, progress });
    handlers.start = (o) => game.startExperience(o);
    handlers.resume = () => game.resume();
    handlers.travel = (id) => game.travel(id);
    handlers.panelClosed = () => game.panelClosed();
    await game.init();

    ui.loading.set(1, 'Ready');
    ui.loading.hide();
    ui.menus.showWelcome();
    window.__game = game; // handy for debugging in the console
  } catch (err) {
    console.error(err);
    ui.showFallback('Something went wrong while starting the 3D scene.');
  }
}

main().catch((err) => {
  console.error(err);
  document.getElementById('fallback')?.removeAttribute('hidden');
});
