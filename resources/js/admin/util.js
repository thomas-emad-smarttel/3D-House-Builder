export const getIn = (obj, path) => path.reduce((a, k) => (a == null ? undefined : a[k]), obj);
export function setIn(obj, path, value) {
  let a = obj;
  for (let i = 0; i < path.length - 1; i++) a = a[path[i]];
  a[path[path.length - 1]] = value;
}
export const pkey = (path) => path.join('.');

/** Lowercase, hyphenated and valid for the server's id rule (a-z, 0-9, - and _). */
export function slugify(s) {
  return String(s ?? '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'item';
}

export function uniqueId(base, taken) {
  const set = new Set(taken);
  const id = slugify(base);
  let candidate = id; let n = 2;
  while (set.has(candidate) || candidate === 'hub') candidate = `${id}-${n++}`;
  return candidate;
}

export function fmtBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
}

export const fmtDate = (v) => {
  const d = new Date(typeof v === 'number' ? v * 1000 : String(v).replace(' ', 'T') + (String(v).includes('Z') || String(v).includes('+') ? '' : 'Z'));
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString();
};
