import '../css/app.css';
import { loadPortfolio } from './data/portfolio.js';
import { Progress } from './state/progress.js';
import { AudioEngine } from './game/Audio.js';
import { createUi } from './ui/index.js';
import { Game } from './game/Game.js';
import { $ } from './ui/dom.js';

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
  const data = loadPortfolio();
  const progress = new Progress(data.rooms.length);
  const audio = new AudioEngine();
  const handlers = {};
  const ui = createUi({ data, audio, progress, handlers });

  try {
    ui.loading.set(0.1, 'Checking graphics support');
    if (!webglSupported()) { ui.showFallback(); return; }

    ui.loading.set(0.3, 'Loading fonts');
    await fontsReady();

    ui.loading.set(0.55, 'Building the mansion');
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
