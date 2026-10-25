import { el } from '../ui/dom.js';
import { getIn, setIn, pkey } from './util.js';

let uid = 0;

/** Form-control builders bound to one Editor (state, errors, re-render). */
export function makeFields(ed) {
  const arrayAt = (path) => {
    let a = getIn(ed.state, path);
    if (!Array.isArray(a)) { a = []; setIn(ed.state, path, a); }
    return a;
  };

  const wrap = (path, label, control, { hint, id } = {}) => {
    const err = ed.errors[pkey(path)];
    return el('div', { class: `field${err ? ' has-error' : ''}` },
      label ? el('label', { for: id, text: label }) : null,
      control,
      hint ? el('p', { class: 'hint', text: hint }) : null,
      err ? el('p', { class: 'error', role: 'alert', text: err }) : null);
  };

  const text = ({ path, label, hint, max, placeholder, type = 'text', onInput }) => {
    const id = `f${++uid}`;
    const input = el('input', { id, type, maxlength: max, placeholder, 'aria-invalid': ed.errors[pkey(path)] ? 'true' : null });
    input.value = getIn(ed.state, path) ?? '';
    input.addEventListener('input', () => { ed.set(path, input.value); onInput?.(input.value); });
    return wrap(path, label, input, { hint, id });
  };

  const area = ({ path, label, hint, rows = 4, max }) => {
    const id = `f${++uid}`;
    const ta = el('textarea', { id, rows, maxlength: max, 'aria-invalid': ed.errors[pkey(path)] ? 'true' : null });
    ta.value = getIn(ed.state, path) ?? '';
    ta.addEventListener('input', () => ed.set(path, ta.value));
    return wrap(path, label, ta, { hint, id });
  };

  const check = ({ path, label, hint, onChange }) => {
    const id = `f${++uid}`;
    const box = el('input', { id, type: 'checkbox' });
    box.checked = !!getIn(ed.state, path);
    box.addEventListener('change', () => { ed.set(path, box.checked); onChange?.(box.checked); });
    const err = ed.errors[pkey(path)];
    return el('div', { class: `field field-check${err ? ' has-error' : ''}` },
      el('label', { for: id }, box, el('span', { text: label })),
      hint ? el('p', { class: 'hint', text: hint }) : null,
      err ? el('p', { class: 'error', role: 'alert', text: err }) : null);
  };

  const select = ({ path, label, hint, options, onChange }) => {
    const id = `f${++uid}`;
    const sel = el('select', { id }, options.map(([v, l]) => el('option', { value: v, text: l })));
    sel.value = getIn(ed.state, path) ?? options[0][0];
    sel.addEventListener('change', () => { ed.set(path, sel.value); onChange?.(sel.value); });
    return wrap(path, label, sel, { hint, id });
  };

  const number = ({ path, label, hint, min, max, step = 'any' }) => {
    const id = `f${++uid}`;
    const input = el('input', { id, type: 'number', min, max, step });
    input.value = getIn(ed.state, path) ?? '';
    input.addEventListener('input', () => ed.set(path, input.value === '' ? '' : Number(input.value)));
    return wrap(path, label, input, { hint, id });
  };

  const color = ({ path, label, hint }) => {
    const id = `f${++uid}`;
    const picker = el('input', { id, type: 'color', class: 'color-input' });
    const code = el('input', { type: 'text', class: 'color-code', maxlength: 7, 'aria-label': `${label} (hex code)` });
    picker.value = code.value = getIn(ed.state, path) || '#d9a85f';
    picker.addEventListener('input', () => { code.value = picker.value; ed.set(path, picker.value); });
    code.addEventListener('input', () => { ed.set(path, code.value); if (/^#[0-9a-f]{6}$/i.test(code.value)) picker.value = code.value; });
    return wrap(path, label, el('div', { class: 'color-row' }, picker, code), { hint, id });
  };

  /** Row controls shared by lists: move up / down / remove. */
  const rowButtons = (arr, i, { onChange } = {}) => {
    const mk = (label, aria, fn, disabled) => el('button', {
      type: 'button', class: 'icon-btn', 'aria-label': aria, title: aria, disabled,
      onclick: (e) => { e.preventDefault(); e.stopPropagation(); fn(); ed.markDirty(); onChange?.(); ed.render(); },
    }, label);
    return el('span', { class: 'row-btns' },
      mk('↑', 'Move up', () => { [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; }, i === 0),
      mk('↓', 'Move down', () => { [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]]; }, i === arr.length - 1),
      mk('✕', 'Remove', () => { arr.splice(i, 1); }));
  };

  /** List of plain text lines. */
  const strings = ({ path, label, hint, addLabel = 'Add line', max = 20, placeholder, maxLen = 200 }) => {
    const arr = arrayAt(path);
    const box = el('div', { class: 'strings', 'data-key': pkey(path) });
    arr.forEach((_, i) => {
      const p = [...path, i];
      const input = el('input', { type: 'text', maxlength: maxLen, placeholder, 'aria-label': `${label} ${i + 1}` });
      input.value = arr[i] ?? '';
      input.addEventListener('input', () => ed.set(p, input.value));
      const err = ed.errors[pkey(p)];
      box.append(el('div', { class: `string-row${err ? ' has-error' : ''}` }, input, rowButtons(arr, i), err ? el('p', { class: 'error', text: err }) : null));
    });
    const add = el('button', {
      type: 'button', class: 'btn btn-small', disabled: arr.length >= max,
      onclick: () => { arr.push(''); ed.markDirty(); ed.render({ focusKey: pkey(path) }); },
    }, `+ ${addLabel}`);
    const groupErr = ed.errors[pkey(path)];
    return el('div', { class: 'field' },
      el('span', { class: 'label', text: label }), box, add,
      hint ? el('p', { class: 'hint', text: hint }) : null,
      groupErr ? el('p', { class: 'error', role: 'alert', text: groupErr }) : null);
  };

  /**
   * Collapsible cards for a list of objects.
   * body(item, path, index, refreshTitle) builds the card content.
   */
  const repeater = ({ path, label, addLabel, max, create, title, body, empty, hint }) => {
    const arr = arrayAt(path);
    const box = el('div', { class: 'repeater' });
    arr.forEach((item, i) => {
      const p = [...path, i]; const k = pkey(p);
      const bad = ed.hasErrorUnder(k);
      const titleEl = el('span', { class: 'card-title' });
      const refresh = () => { titleEl.textContent = title(item, i) || '(untitled)'; };
      refresh();
      const card = el('details', {
        class: `card${bad ? ' has-error' : ''}`,
        open: ed.openSet.has(k) || bad ? true : null,
        ontoggle: (e) => { if (e.target.open) ed.openSet.add(k); else ed.openSet.delete(k); },
      },
      el('summary', {}, titleEl, bad ? el('span', { class: 'badge-err', text: 'needs attention' }) : null, rowButtons(arr, i)),
      el('div', { class: 'card-body' }, body(item, p, i, refresh)));
      box.append(card);
    });
    if (!arr.length && empty) box.append(el('p', { class: 'empty', text: empty }));
    const add = el('button', {
      type: 'button', class: 'btn btn-small', disabled: max != null && arr.length >= max,
      onclick: () => {
        const item = create(arr);
        arr.push(item);
        ed.openSet.add(pkey([...path, arr.length - 1]));
        ed.markDirty(); ed.render();
      },
    }, `+ ${addLabel}`);
    const groupErr = ed.errors[pkey(path)];
    return el('div', { class: 'field' },
      label ? el('span', { class: 'label', text: label }) : null,
      hint ? el('p', { class: 'hint', text: hint }) : null,
      box, add,
      max != null ? el('span', { class: 'hint inline', text: ` ${arr.length}/${max}` }) : null,
      groupErr ? el('p', { class: 'error', role: 'alert', text: groupErr }) : null);
  };

  /** Text input for a file URL/path with "pick from library" and "upload" helpers. */
  const file = ({ path, label, hint, kinds, valueKey = 'url', placeholder }) => {
    const id = `f${++uid}`; const listId = `${id}-list`;
    const input = el('input', { id, type: 'text', placeholder, list: listId, maxlength: 500 });
    input.value = getIn(ed.state, path) ?? '';
    input.addEventListener('input', () => ed.set(path, input.value));
    const list = el('datalist', { id: listId });
    ed.library().then((files) => {
      files.filter((f) => kinds.includes(f.type)).forEach((f) => list.append(el('option', { value: f[valueKey], label: f.name })));
    }).catch(() => {});
    const pick = el('input', { type: 'file', hidden: true, accept: kinds.map((k) => ({ image: 'image/*', video: 'video/*', pdf: 'application/pdf' })[k]).join(',') });
    pick.addEventListener('change', async () => {
      if (!pick.files.length) return;
      const saved = await ed.upload([pick.files[0]]);
      if (saved[0]) { input.value = saved[0][valueKey]; ed.set(path, input.value); ed.toast(`Uploaded ${saved[0].name}`); }
    });
    const up = el('button', { type: 'button', class: 'btn btn-small', onclick: () => pick.click() }, 'Upload…');
    return wrap(path, label, el('div', { class: 'file-row' }, input, up, pick, list), { hint, id });
  };

  return { text, area, check, select, number, color, strings, repeater, file, rowButtons };
}
