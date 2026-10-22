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
        if(signal.aborted)throw new Error('Cancelled');
        const response = await fetch(resolveApiUrl(path), { ...init, signal, cache: 'no-store',redirect:'error',credentials:'omit',
            headers: { Authorization: `Bearer ${token}`, ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers } });
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new CatalogDictionaryApiError(response.status, error.code || `HTTP_${response.status}`,
                error.message || `Požadavek selhal (${response.status}).`, error.fieldErrors);
        }
        const body=await response.json() as T;if(signal.aborted)throw new Error('Cancelled');return { body, response };
    }
    const uuid=(id:string)=>{if(typeof id!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id))throw new Error('Catalog UUID required');return id;};
    function validValue(v:CatalogDictionaryValue,type:CatalogDictionaryType){
        if(v.catalogId!==catalogId||v.type!==type||!Number.isSafeInteger(v.version)||v.version<0||typeof v.label!=='string'||(v.code!==null&&typeof v.code!=='string'))throw new Error('Invalid catalog dictionary response or missing version');
        uuid(v.id);if(v.parentId!==null)uuid(v.parentId);return v;
    }
    function write(input:CatalogDictionaryWrite){
        if(Object.keys(input).some(k=>!['label','code','parentId','reason'].includes(k))||typeof input.label!=='string'||!input.label.trim()||input.label.length>255
            ||typeof input.reason!=='string'||!input.reason.trim()||input.reason.length>1000||(input.code!==null&&(typeof input.code!=='string'||input.code.length>255)))throw new Error('Invalid dictionary fields');
        if(input.parentId!==null)uuid(input.parentId);return JSON.stringify(input);
    }
    async function versioned(type: CatalogDictionaryType, path: string, signal: AbortSignal, init?: RequestInit,expectedId?:string): Promise<VersionedDictionaryValue> {
        const { body: value, response } = await request<CatalogDictionaryValue>(path, signal, init);
        const etag = response.headers.get('ETag');
        if (!etag || !/^"[0-9]+"$/.test(etag) || !Number.isSafeInteger(value.version) || etag !== `"${value.version}"`
            || value.catalogId !== catalogId || value.type !== type || (expectedId!==undefined&&value.id.toLowerCase()!==expectedId.toLowerCase()))
            throw new Error('Invalid catalog dictionary response or missing version; reload before editing');
        validValue(value,type);return { value, etag };
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
            const page=(await request<CatalogDictionaryPage>(`${typePath(type)}/values?${params}`, signal)).body;
            if(!Array.isArray(page.items))throw new Error('Invalid dictionary page');page.items.forEach(v=>validValue(v,type));if(page.nextAfterId!==null)uuid(page.nextAfterId);return page;
        },
        detail: (type: CatalogDictionaryType, id: CatalogDictionaryValueId, signal: AbortSignal) =>
            versioned(type, `${typePath(type)}/values/${uuid(id)}`, signal,undefined,id),
        create: (type: CatalogDictionaryType, input: CatalogDictionaryWrite, signal: AbortSignal) =>
            versioned(type, `${typePath(type)}/values`, signal, { method: 'POST', body: write(input) }),
        update: (type: CatalogDictionaryType, id: CatalogDictionaryValueId, etag: string, input: CatalogDictionaryWrite, signal: AbortSignal) => {
            if (!/^"[0-9]+"$/.test(etag)) throw new Error('A strong dictionary ETag is required');
            return versioned(type, `${typePath(type)}/values/${uuid(id)}`, signal,
                { method: 'PUT', headers: { 'If-Match': etag }, body: write(input) },id);
        },
    };
}
