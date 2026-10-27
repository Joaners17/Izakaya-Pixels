const BASE = 'http://localhost:3000/api';

export async function api(path, body) {
  try {
    const opts = body === undefined ? {} : {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    };
    return await (await fetch(BASE + path, opts)).json();
  } catch {
    return { success: false, error: 'Sin conexión con el servidor' };
  }
}

export const esc = (t) => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
