const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3333';

// Content-Type só é enviado quando há corpo: o Fastify rejeita (400)
// DELETE/GET com "application/json" e body vazio.
async function request(path, { body, ...opts } = {}) {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Não foi possível concluir a requisição.');
  }
  return res.status === 204 ? null : res.json();
}

export const api = {
  list: (search, signal) =>
    request(`/api/tasks?search=${encodeURIComponent(search)}&status=all`, { signal }),
  create: (data) => request('/api/tasks', { method: 'POST', body: data }),
  update: (id, data) => request(`/api/tasks/${id}`, { method: 'PATCH', body: data }),
  remove: (id) => request(`/api/tasks/${id}`, { method: 'DELETE' }),
};
