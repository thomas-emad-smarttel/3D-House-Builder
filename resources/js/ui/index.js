import { $ } from './dom.js';
import { Hud } from './Hud.js';
import { Fade } from './Fade.js';
import { Loading } from './Loading.js';
import { Menus } from './Menus.js';
import { Panel } from './Panels.js';

/** Builds every UI controller. `handlers` connects them to the game. */
export function createUi({ data, audio, progress, handlers }) {
  const hud = new Hud(data.rooms.length);
  progress.onChange((p) => hud.setProgress(p));

  const menus = new Menus({
    audio, progress, data,
    onStart: (o) => handlers.start(o),
    onResume: () => handlers.resume(),
    onTravel: (id) => handlers.travel(id),
  });
  const panel = new Panel({ data, audio, onClose: () => handlers.panelClosed() });

  return {
    hud, menus, panel,
    fade: new Fade(),
    loading: new Loading(),
    showFallback(reason) {
      $('loading').hidden = true;
      if (reason) $('fallback-reason').textContent = reason;
      $('fallback').hidden = false;
      document.body.dataset.state = 'fallback';
    },
  };
}
