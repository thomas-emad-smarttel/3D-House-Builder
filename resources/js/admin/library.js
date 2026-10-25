import { el } from '../ui/dom.js';
import { api } from './api.js';
import { fmtBytes, fmtDate } from './util.js';

export function mediaSection(ed) {
  const grid = el('div', { class: 'media-grid' });
  const input = el('input', { type: 'file', multiple: true, hidden: true, accept: 'image/*,video/mp4,video/webm,application/pdf' });

  const load = async () => {
    grid.replaceChildren(el('p', { class: 'empty', text: 'Loading…' }));
    try {
      const files = await ed.library(true);
      grid.replaceChildren(...(files.length ? files.map(card) : [el('p', { class: 'empty', text: 'No files yet. Upload screenshots, demo videos or your CV.' })]));
    } catch (e) { grid.replaceChildren(el('p', { class: 'error', text: e.message })); }
  };

  const card = (f) => el('figure', { class: 'media-card' },
    f.type === 'image' ? el('img', { src: f.url, alt: '', loading: 'lazy' })
      : el('div', { class: 'media-icon', text: f.type === 'video' ? '▶ Video' : 'PDF' }),
    el('figcaption', {},
      el('strong', { text: f.name }),
      el('span', { class: 'hint', text: `${fmtBytes(f.size)} · ${fmtDate(f.modified)}` }),
      el('div', { class: 'row-btns' },
        el('button', { type: 'button', class: 'btn btn-small', onclick: async () => { try { await navigator.clipboard.writeText(f.url); ed.toast('Link copied'); } catch { ed.toast(f.url); } } }, 'Copy link'),
        el('button', {
          type: 'button', class: 'btn btn-small btn-danger',
          onclick: async () => {
            if (!confirm(`Delete ${f.name}? Anything using it will show a broken file.`)) return;
            try { await api('DELETE', ed.urls.media, { name: f.name }); ed.libCache = null; ed.toast('Deleted'); load(); } catch (e) { ed.toast(e.message, 'bad'); }
          },
        }, 'Delete'))));

  input.addEventListener('change', async () => { if (input.files.length) { await ed.upload([...input.files]); input.value = ''; load(); } });
  load();
  return [
    el('p', { class: 'lead', text: 'Screenshots, demo videos and PDFs. Use them from any module (Media) or as your CV (Contact section). Up to 50 MB each; your PHP upload limit may be lower.' }),
    el('div', { class: 'btn-row' }, el('button', { type: 'button', class: 'btn btn-primary', onclick: () => input.click() }, 'Upload files…'), input),
    grid,
  ];
}

export function historySection(ed) {
  const list = el('div', { class: 'history' });
  const load = async () => {
    try {
      const { revisions } = await api('GET', ed.urls.revisions);
      list.replaceChildren(...(revisions.length ? revisions.map((r) => el('div', { class: 'history-row' },
        el('div', {}, el('strong', { text: fmtDate(r.created_at) }), el('span', { class: 'hint', text: r.note || 'Earlier version' })),
        el('button', {
          type: 'button', class: 'btn btn-small',
          onclick: async () => {
            if (!confirm('Restore this version? Your current content is kept in history, but unsaved edits will be lost.')) return;
            try { await ed.replaceContent(await api('POST', `${ed.urls.revisions}/${r.id}/restore`)); ed.toast('Version restored'); } catch (e) { ed.toast(e.message, 'bad'); }
          },
        }, 'Restore'))) : [el('p', { class: 'empty', text: 'No earlier versions yet. One is kept every time you save.' })]));
    } catch (e) { list.replaceChildren(el('p', { class: 'error', text: e.message })); }
  };
  load();
  return [
    el('p', { class: 'lead', text: 'Every save keeps the previous version here (the latest 40). Restoring never destroys anything: it becomes a new version.' }),
    list,
    el('div', { class: 'danger-zone' },
      el('h4', { text: 'Start over' }),
      el('p', { class: 'hint', text: 'Replace everything with the starter content from config/portfolio.php. The current content stays in history.' }),
      el('button', {
        type: 'button', class: 'btn btn-danger',
        onclick: async () => {
          if (!confirm('Reset ALL content to the starter defaults?')) return;
          try { await ed.replaceContent(await api('POST', ed.urls.reset)); ed.toast('Reset to defaults'); } catch (e) { ed.toast(e.message, 'bad'); }
        },
      }, 'Reset to defaults')),
  ];
}
