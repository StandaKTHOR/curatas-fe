import { API_BASE } from '@/lib/api';
import type { ImportApi } from './types';

export class ImportApiError extends Error {
  constructor(public readonly status: number) { super(`HTTP ${status}`); }
}

// Proposed HTTP mapping: confirm against the backend controller before deployment.
// DTOs are sourced from the backend; endpoint definitions are not yet available there.
const base = `${API_BASE}/api/v1/imports`;
async function request(path: string, signal: AbortSignal, init: RequestInit = {}) {
  const token = localStorage.getItem('token');
  const response = await fetch(`${base}${path}`, {
    ...init, signal: AbortSignal.any([signal, AbortSignal.timeout(30000)]),
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers },
  });
  if (!response.ok) throw new ImportApiError(response.status);
  return response;
}
const itemPath = (id: string) => `/${encodeURIComponent(id)}`;
export const importApi: ImportApi = {
  create: async signal => (await request('', signal, { method: 'POST' })).json(),
  upload: async (id, file, signal) => {
    const body = new FormData();
    body.append('file', file);
    await request(`${itemPath(id)}/file`, signal, { method: 'POST', body });
  },
  validate: async (id, signal) => { await request(`${itemPath(id)}/validate`, signal, { method: 'POST' }); },
  ready: async (id, body, signal) => {
    await request(`${itemPath(id)}/ready`, signal, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
  },
  start: async (id, signal) => { await request(`${itemPath(id)}/execute`, signal, { method: 'POST' }); },
  status: async (id, signal) => (await request(`${itemPath(id)}`, signal)).json(),
  errors: async (id, page, size, signal) =>
    (await request(`${itemPath(id)}/errors?page=${page}&size=${size}`, signal)).json(),
  delete: async (id, signal) => { await request(`${itemPath(id)}`, signal, { method: 'DELETE' }); },
};
