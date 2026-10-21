import { resolveApiUrl } from '../../lib/api';

export interface AvailableCatalog {
    id: number;
    code: string;
    name: string;
    version: number;
    institution: { id: number; code: string; name: string };
}
export interface CatalogPage { items: AvailableCatalog[]; nextAfterId: number | null }
export class CatalogApiError extends Error {
    constructor(public readonly status: number) { super(`Catalog request failed (${status})`); }
}
async function read<T>(path: string, token: string, signal: AbortSignal): Promise<T> {
    const response = await fetch(resolveApiUrl(path), {
        headers: { Authorization: `Bearer ${token}` }, signal, cache: 'no-store', redirect: 'error', credentials: 'omit',
    });
    if (!response.ok) throw new CatalogApiError(response.status);
    return response.json() as Promise<T>;
}
export const listCatalogs = (token: string, signal: AbortSignal, afterId = 0) =>
    read<CatalogPage>(`/api/v2/catalogs?limit=100&afterId=${afterId}`, token, signal);
export const resolveCatalog = (id: number, token: string, signal: AbortSignal) =>
    read<AvailableCatalog>(`/api/v2/catalogs/${encodeURIComponent(id)}`, token, signal);
