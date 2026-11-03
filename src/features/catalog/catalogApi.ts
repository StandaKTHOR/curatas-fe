import { effectiveToken } from '../localAuth/localAuthClient';
import { resolveApiUrl } from '../../lib/api';

export interface AvailableCatalog {
    id: number;
    code: string;
    name: string;
    version: number;
    institution: { id: number; code: string; name: string };
    catalogId?: number;
    accessType?: 'OWN' | 'SHARED' | 'UNCLASSIFIED';
    capabilities?: string[];
    creationEnabled?: boolean;
    cloneEnabled?: boolean;
    cloneReadEnabled?: boolean;
    professionalRecordsEnabled?: boolean;
    inventoryWriteEnabled?: boolean;
    professionalWriteEnabled?: boolean;
}
export interface CatalogPage { items: AvailableCatalog[]; nextAfterId: number | null }
export class CatalogApiError extends Error {
    constructor(public readonly status: number) { super(`Catalog request failed (${status})`); }
}
async function read<T>(path: string, token: string, signal: AbortSignal): Promise<T> {
    const response = await fetch(resolveApiUrl(path), {
        headers: { Authorization: `Bearer ${effectiveToken(token)}` }, signal, cache: 'no-store', redirect: 'error', credentials: 'omit',
    });
    if (!response.ok) throw new CatalogApiError(response.status);
    const body: T = await response.json();
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    return body;
}
const workspaceMode = () => import.meta.env.VITE_SCOPED_WORKSPACE_ENABLED === 'true';
const capabilities = new Set(['catalog.read','item.read','item.write','item.inventory.write','item.professional.write','item.create','dictionary.read','dictionary.write','catalog.grant.manage','catalog.access.delegate','catalog.audit.read','catalog.import']);
function workspace(value: AvailableCatalog): AvailableCatalog {
    if (!value || !Number.isSafeInteger(value.id) || value.id < 1 || value.catalogId !== value.id
        || !Number.isSafeInteger(value.version) || value.version < 0 || typeof value.name !== 'string' || typeof value.code !== 'string'
        || !value.institution || !Number.isSafeInteger(value.institution.id) || value.institution.id < 1
        || typeof value.institution.name !== 'string' || typeof value.institution.code !== 'string'
        || !['OWN','SHARED','UNCLASSIFIED'].includes(value.accessType ?? '') || !Array.isArray(value.capabilities)
        || !value.capabilities.includes('catalog.read') || value.capabilities.some(c => !capabilities.has(c))
        || (value.creationEnabled !== undefined && typeof value.creationEnabled !== 'boolean')) throw new CatalogApiError(502);
    for(const flag of [value.inventoryWriteEnabled,value.professionalWriteEnabled,value.cloneEnabled,value.cloneReadEnabled,value.professionalRecordsEnabled])if(flag!==undefined&&typeof flag!=='boolean')throw new CatalogApiError(502);
    return value;
}
const prefix = () => workspaceMode() ? '/api/v2/workspaces' : '/api/v2/catalogs';
export const listCatalogs = (token: string, signal: AbortSignal, afterId = 0) =>
    read<CatalogPage>(`${prefix()}?limit=100&afterId=${afterId}`, token, signal).then(page => {
        if (workspaceMode()) {
            if (!page || !Array.isArray(page.items) || page.items.length > 100 || (page.nextAfterId !== null && (!Number.isSafeInteger(page.nextAfterId) || page.nextAfterId <= afterId))) throw new CatalogApiError(502);
            page.items.forEach(workspace);
            if (new Set(page.items.map(c=>c.id)).size !== page.items.length || page.items.some(c=>c.id<=afterId)) throw new CatalogApiError(502);
        }
        return page;
    });
export const resolveCatalog = async (id: number, token: string, signal: AbortSignal) => {
    const value = await read<AvailableCatalog>(`${prefix()}/${encodeURIComponent(id)}`, token, signal);
    if (workspaceMode()) workspace(value);
    if (value.id !== id) throw new CatalogApiError(502);
    return value;
};
