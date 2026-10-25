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

/** Upload multipart/form-data with real-time progress callbacks. */
export function uploadWithProgress(url, formData, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.setRequestHeader('X-CSRF-TOKEN', csrf());

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          onProgress(pct, e.loaded, e.total);
        }
      };
    }

    xhr.onload = () => {
      let data = null;
      try { data = JSON.parse(xhr.responseText); } catch { /* ignore */ }
      if (xhr.status === 401 || xhr.status === 419) {
        reject(new ApiError(xhr.status, 'Your session expired. Reload the page and sign in again.', data));
        return;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data);
      } else {
        const fileErr = data?.errors?.file;
        const fileMsg = Array.isArray(fileErr) ? fileErr[0] : (typeof fileErr === 'string' ? fileErr : null);
        const msg = fileMsg || data?.message || `Request failed (${xhr.status}).`;
        reject(new ApiError(xhr.status, msg, data));
      }
    };

    xhr.onerror = () => reject(new ApiError(0, 'Network error during upload.'));
    xhr.send(formData);
  });
}
