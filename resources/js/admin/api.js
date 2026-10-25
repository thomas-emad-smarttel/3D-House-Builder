export class ApiError extends Error {
  constructor(status, message, data) { super(message); this.status = status; this.data = data; }
}

const csrf = () => document.querySelector('meta[name="csrf-token"]')?.content ?? '';

/** JSON (or FormData) request with CSRF; throws ApiError with the server's field errors attached. */
export async function api(method, url, body) {
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  const res = await fetch(url, {
    method,
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      'X-CSRF-TOKEN': csrf(),
      ...(body !== undefined && !isForm ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body === undefined ? undefined : (isForm ? body : JSON.stringify(body)),
  });
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  if (res.status === 401 || res.status === 419) throw new ApiError(res.status, 'Your session expired. Reload the page and sign in again.', data);
  if (!res.ok) throw new ApiError(res.status, data?.message || `Request failed (${res.status}).`, data);
  return data;
}
