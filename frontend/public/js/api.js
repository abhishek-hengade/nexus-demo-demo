// ═══════════════════════════════════════════════════════════════
//  NexusOS Pro — Unified API Client v3.0
//  Clean REST wrapper with consistent error handling
// ═══════════════════════════════════════════════════════════════

const api = {
  _userId: localStorage.getItem('nexus_uid') || '',

  async request(method, endpoint, body) {
    const opts = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(this._userId ? { 'x-user-id': this._userId } : {}),
      },
    };
    if (body !== undefined) opts.body = JSON.stringify(body);

    const res = await fetch(`/api${endpoint}`, opts);
    const ct  = res.headers.get('content-type') || '';
    const data = ct.includes('application/json') ? await res.json() : await res.text();

    if (!res.ok) throw new Error((data && data.error) || `HTTP ${res.status}`);
    return data;
  },

  get:    (ep)       => api.request('GET',    ep),
  post:   (ep, body) => api.request('POST',   ep, body),
  put:    (ep, body) => api.request('PUT',    ep, body),
  delete: (ep)       => api.request('DELETE', ep),
};

window.api = api;
