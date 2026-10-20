import { resolveApiUrl } from '../../lib/api';

export type CatalogDictionaryType = 'MATERIAL' | 'TECHNIQUE';
/** UUID in the new managed namespace; never pass a legacy numeric dictionary ID here. */
export type CatalogDictionaryValueId = string;
export interface CatalogDictionaryMetadata {
    type: CatalogDictionaryType;
    name: string;
    ownership: 'CATALOG_CREATED_ONLY';
    parentSupport: 'EXPLICIT_SAME_TYPE';
    operations: ('read' | 'create' | 'update')[];
}
export interface CatalogDictionaryValue {
    id: CatalogDictionaryValueId;
    catalogId: number;
    type: CatalogDictionaryType;
    label: string;
    code: string | null;
    parentId: CatalogDictionaryValueId | null;
    version: number;
}
export interface CatalogDictionaryWrite {
    label: string;
    code: string | null;
    parentId: CatalogDictionaryValueId | null;
    reason: string;
}
export interface CatalogDictionaryPage { items: CatalogDictionaryValue[]; nextAfterId: string | null }
export interface VersionedDictionaryValue { value: CatalogDictionaryValue; etag: string }
export interface CatalogDictionaryQuery {
    limit?: number; afterId?: string; q?: string; parentId?: string; rootsOnly?: boolean;
}
export class CatalogDictionaryApiError extends Error {
    constructor(public readonly status: number, public readonly code: string, message: string,
        public readonly fieldErrors?: { field: string; message: string }[]) { super(message); }
}

/** Bind this transport to one explicit catalog and authentication session, then discard it on context change. */
export function catalogDictionaries(catalogId: number, token: string) {
    if (!Number.isSafeInteger(catalogId) || catalogId < 1 || !token) throw new Error('An explicit catalog and session are required');
    const root = `/api/v2/catalogs/${catalogId}/dictionaries`;
    function typePath(type: CatalogDictionaryType) {
        if (type !== 'MATERIAL' && type !== 'TECHNIQUE') throw new Error('Unsupported catalog dictionary');
        return `${root}/${type}`;
    }
    async function request<T>(path: string, signal: AbortSignal, init: RequestInit = {}) {
        const response = await fetch(resolveApiUrl(path), { ...init, signal, cache: 'no-store',
            headers: { Authorization: `Bearer ${token}`, ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers } });
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new CatalogDictionaryApiError(response.status, error.code || `HTTP_${response.status}`,
                error.message || `Požadavek selhal (${response.status}).`, error.fieldErrors);
        }
        return { body: await response.json() as T, response };
    }
    async function versioned(type: CatalogDictionaryType, path: string, signal: AbortSignal, init?: RequestInit): Promise<VersionedDictionaryValue> {
        const { body: value, response } = await request<CatalogDictionaryValue>(path, signal, init);
        const etag = response.headers.get('ETag');
        if (!etag || !/^"[0-9]+"$/.test(etag) || !Number.isSafeInteger(value.version) || etag !== `"${value.version}"`
            || value.catalogId !== catalogId || value.type !== type)
            throw new Error('Invalid catalog dictionary response or missing version; reload before editing');
        return { value, etag };
    }
    return {
        metadata: async (signal: AbortSignal) => (await request<CatalogDictionaryMetadata[]>(root, signal)).body,
        dictionary: async (type: CatalogDictionaryType, signal: AbortSignal) =>
            (await request<CatalogDictionaryMetadata>(typePath(type), signal)).body,
        list: async (type: CatalogDictionaryType, query: CatalogDictionaryQuery, signal: AbortSignal) => {
            const params = new URLSearchParams({ limit: String(query.limit ?? 50) });
            if (query.afterId) params.set('afterId', query.afterId);
            if (query.q !== undefined) params.set('q', query.q);
            if (query.parentId) params.set('parentId', query.parentId);
            if (query.rootsOnly !== undefined) params.set('rootsOnly', String(query.rootsOnly));
            return (await request<CatalogDictionaryPage>(`${typePath(type)}/values?${params}`, signal)).body;
        },
        detail: (type: CatalogDictionaryType, id: CatalogDictionaryValueId, signal: AbortSignal) =>
            versioned(type, `${typePath(type)}/values/${encodeURIComponent(id)}`, signal),
        create: (type: CatalogDictionaryType, input: CatalogDictionaryWrite, signal: AbortSignal) =>
            versioned(type, `${typePath(type)}/values`, signal, { method: 'POST', body: JSON.stringify(input) }),
        update: (type: CatalogDictionaryType, id: CatalogDictionaryValueId, etag: string, input: CatalogDictionaryWrite, signal: AbortSignal) => {
            if (!/^"[0-9]+"$/.test(etag)) throw new Error('A strong dictionary ETag is required');
            return versioned(type, `${typePath(type)}/values/${encodeURIComponent(id)}`, signal,
                { method: 'PUT', headers: { 'If-Match': etag }, body: JSON.stringify(input) });
        },
    };
}
