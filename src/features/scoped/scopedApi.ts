import { resolveApiUrl } from '../../lib/api';

export interface Item { id: number; catalogId: number; title: string | null; inventoryNumber: string | null; accessionNumber: string | null; version: string }
export interface Dimension { id: number; itemId: number; catalogId: number; type: string; value: string | null; unit: string | null; createdInScopedApi: boolean }
export interface Media { id: string; itemId: number; catalogId: number; kind: 'IMAGE' | 'ATTACHMENT'; name: string; mimeType: string; byteSize: number; variants: ('content' | 'thumbnail')[] }
export interface Versioned<T> { value: T; etag: string }
export interface Page<T, C> { items: T[]; nextAfterId: C | null }
export class ScopedError extends Error {
    constructor(public readonly status: number) { super(errorText(status)); }
}
export function errorText(status: number) {
    if (status === 401) return 'Přihlášení vypršelo. Přihlaste se znovu.';
    if (status === 403) return 'Přístup byl zamítnut nebo odvolán. Zobrazená soukromá data byla uzavřena.';
    if (status === 404) return 'Záznam, soubor nebo funkce nejsou dostupné v tomto katalogu.';
    if ([409, 412, 428].includes(status)) return 'Verze nebo povolení zápisu se změnily. Draft je zachován; načtěte a porovnejte serverovou verzi.';
    if ([400, 422].includes(status)) return 'Zkontrolujte povolená pole a přesnost hodnot.';
    return 'Požadavek se nezdařil. Čtení lze opakovat; výsledek přerušeného zápisu nejprve ověřte načtením.';
}
const integer = (v: unknown, zero = false): number => {
    if ((typeof v !== 'string' && typeof v !== 'number') || !/^[0-9]+$/.test(String(v))) throw new Error('Invalid identifier');
    const n = Number(v); if (!Number.isSafeInteger(n) || n < (zero ? 0 : 1)) throw new Error('Unsafe identifier'); return n;
};
const version = (v: unknown) => { const s = String(v); if (!/^(0|[1-9][0-9]*)$/.test(s) || BigInt(s) > 9223372036854775807n) throw new Error('Invalid version'); return s; };
const uuid = (s: string) => { if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) throw new Error('Invalid media identity'); return s; };
const text = (v: unknown): string => { if (typeof v !== 'string') throw new Error('Invalid text'); return v; };
const nullable = (v: unknown) => v === null ? null : text(v);
/** Quote JSON numeric tokens without touching string literals. Decimal values and bigint ETags never pass through Number. */
export function exactJson(raw: string): any {
    return JSON.parse(raw.replace(/"(?:[^"\\]|\\.)*"|-?[0-9]+(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/g, token => token.startsWith('"') ? token : JSON.stringify(token)));
}
/** Plain JSON numeric syntax, <=36 integer digits and <=2 significant fractional digits; never round. */
export function decimal(input: string): string {
    if (input.length > 200 || !/^-?(0|[1-9][0-9]*)(\.[0-9]+)?$/.test(input)) throw new Error('Použijte desetinné číslo s tečkou bez exponentu.');
    const [whole, fraction = ''] = input.replace(/^-/, '').split('.');
    const significant = fraction.replace(/0+$/, '');
    if (whole.length > 36 || significant.length > 2) throw new Error('Nejvýše 36 celých a 2 významná desetinná místa; bez zaokrouhlení.');
    return `${input.startsWith('-') ? '-' : ''}${whole}${significant ? '.' + significant : ''}`;
}
export function strongTag(tag: string) {
    if (!/^"(0|[1-9][0-9]*)"$/.test(tag)) throw new Error('Načtěte silný ETag.'); version(tag.slice(1, -1)); return tag;
}
export function scopedApi(catalogId: number, token: string) {
    integer(catalogId); if (!token) throw new Error('Catalog and session required');
    const root = `/api/v2/catalogs/${catalogId}/items`;
    const itemPath = (id: number) => `${root}/${integer(id)}`;
    async function request(path: string, signal: AbortSignal, init: RequestInit = {}) {
        if (signal.aborted) throw new Error('Request cancelled');
        const response = await fetch(resolveApiUrl(path), { ...init, signal, cache: 'no-store', redirect: 'error', credentials: 'omit',
            headers: { Authorization: `Bearer ${token}`, ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers } });
        if (signal.aborted) throw new Error('Request cancelled');
        if (!response.ok) throw new ScopedError(response.status); return response;
    }
    async function read(path: string, signal: AbortSignal, init?: RequestInit) {
        const response = await request(path, signal, init); const body = exactJson(await response.text());
        if (signal.aborted) throw new Error('Request cancelled'); return { body, response };
    }
    function item(v: any, id?: number): Item {
        if (integer(v.catalogId) !== catalogId || (id !== undefined && integer(v.id) !== id)) throw new Error('Foreign item response');
        return { id: integer(v.id), catalogId, title: nullable(v.title), inventoryNumber: nullable(v.inventoryNumber), accessionNumber: nullable(v.accessionNumber), version: version(v.version) };
    }
    function dimension(v: any, parent: number, id?: number): Dimension {
        if (integer(v.catalogId) !== catalogId || integer(v.itemId) !== parent || (id !== undefined && integer(v.id) !== id) || typeof v.createdInScopedApi !== 'boolean') throw new Error('Foreign dimension response');
        if (v.value !== null) decimal(text(v.value));
        return { id: integer(v.id), catalogId, itemId: parent, type: text(v.type), value: nullable(v.value), unit: nullable(v.unit), createdInScopedApi: v.createdInScopedApi };
    }
    function media(v: any, parent: number, id?: string): Media {
        if (integer(v.catalogId) !== catalogId || integer(v.itemId) !== parent || (id !== undefined && uuid(v.id) !== id) || !['IMAGE', 'ATTACHMENT'].includes(v.kind)
            || !/^[A-Za-z0-9][A-Za-z0-9._ -]{0,119}$/.test(v.name) || !['image/png','image/jpeg','application/pdf','application/octet-stream'].includes(v.mimeType)
            || (v.kind === 'IMAGE' && !['image/png','image/jpeg'].includes(v.mimeType)) || !Array.isArray(v.variants) || !v.variants.includes('content') || v.variants.some((x: string) => !['content','thumbnail'].includes(x))
            || (v.variants.includes('thumbnail') && v.kind !== 'IMAGE')) throw new Error('Invalid media response');
        const size = integer(v.byteSize); if (size > 134217728) throw new Error('Media too large');
        return { id: uuid(v.id), catalogId, itemId: parent, kind: v.kind, name: v.name, mimeType: v.mimeType, byteSize: size, variants: [...v.variants] };
    }
    function tag(response: Response, expected: unknown) { const value = response.headers.get('ETag') || ''; if (strongTag(value) !== `"${version(expected)}"`) throw new Error('Missing or mismatched ETag'); return value; }
    function bounds(after: number, limit: number) { integer(after, true); if (integer(limit) > 100) throw new Error('Invalid page size'); return `?limit=${limit}&afterId=${after}`; }
    function patch(input: Partial<Pick<Item, 'title' | 'inventoryNumber'>>) {
        const keys = Object.keys(input); if (!keys.length || keys.some(k => !['title','inventoryNumber'].includes(k))) throw new Error('Unsupported item field');
        for (const key of keys) { const value = input[key as keyof typeof input]; if (typeof value !== 'string' || !value.trim() || value.length > (key === 'title' ? 4096 : 255)) throw new Error('Invalid scalar'); }
        return JSON.stringify(input);
    }
    function dimensionBody(input: { type: string; value: string; unit: string | null }) {
        if (Object.keys(input).some(k => !['type','value','unit'].includes(k)) || !input.type.trim() || input.type.length > 255 || (input.unit !== null && (typeof input.unit !== 'string' || input.unit.length > 255))) throw new Error('Invalid dimension fields');
        return `{"type":${JSON.stringify(input.type)},"value":${decimal(input.value)},"unit":${JSON.stringify(input.unit)}}`;
    }
    async function dimensionWrite(parent: number, id: number | null, etag: string, input: { type: string; value: string; unit: string | null }, signal: AbortSignal): Promise<Versioned<Dimension>> {
        const { body, response } = await read(`${itemPath(parent)}/dimensions${id === null ? '' : '/' + integer(id)}`, signal,
            { method: id === null ? 'POST' : 'PATCH', headers: { 'If-Match': strongTag(etag) }, body: dimensionBody(input) });
        return { value: dimension(body.dimension, parent, id ?? undefined), etag: tag(response, body.itemVersion) };
    }
    return {
        list: async (signal: AbortSignal, after = 0, limit = 50): Promise<Page<Item, number>> => {
            const { body } = await read(root + bounds(after, limit), signal);
            return { items: body.items.map((v: any) => item(v)), nextAfterId: body.nextAfterId === null ? null : integer(body.nextAfterId) };
        },
        detail: async (id: number, signal: AbortSignal): Promise<Versioned<Item>> => {
            const { body, response } = await read(itemPath(id), signal); return { value: item(body, id), etag: tag(response, body.version) };
        },
        patch: async (id: number, etag: string, input: Partial<Pick<Item, 'title' | 'inventoryNumber'>>, signal: AbortSignal): Promise<Versioned<Item>> => {
            const { body, response } = await read(itemPath(id), signal, { method: 'PATCH', headers: { 'If-Match': strongTag(etag) }, body: patch(input) });
            return { value: item(body, id), etag: tag(response, body.version) };
        },
        dimensions: async (parent: number, signal: AbortSignal, after = 0, limit = 50) => {
            const { body, response } = await read(itemPath(parent) + '/dimensions' + bounds(after, limit), signal);
            return { value: { items: body.items.map((v: any) => dimension(v, parent)) as Dimension[], nextAfterId: body.nextAfterId === null ? null : integer(body.nextAfterId) }, etag: tag(response, body.itemVersion) };
        },
        dimension: async (parent: number, id: number, signal: AbortSignal): Promise<Versioned<Dimension>> => {
            const { body, response } = await read(`${itemPath(parent)}/dimensions/${integer(id)}`, signal);
            return { value: dimension(body.dimension, parent, id), etag: tag(response, body.itemVersion) };
        },
        createDimension: (parent: number, etag: string, input: { type: string; value: string; unit: string | null }, signal: AbortSignal) => dimensionWrite(parent, null, etag, input, signal),
        patchDimension: (parent: number, id: number, etag: string, input: { type: string; value: string; unit: string | null }, signal: AbortSignal) => dimensionWrite(parent, id, etag, input, signal),
        media: async (parent: number, signal: AbortSignal, after?: string): Promise<Page<Media, string>> => {
            const { body } = await read(`${itemPath(parent)}/media?limit=50${after ? '&afterId=' + uuid(after) : ''}`, signal);
            return { items: body.items.map((v: any) => media(v, parent)), nextAfterId: body.nextAfterId === null ? null : uuid(body.nextAfterId) };
        },
        mediaDetail: async (parent: number, id: string, signal: AbortSignal): Promise<Media> => media((await read(`${itemPath(parent)}/media/${uuid(id)}`, signal)).body, parent, id),
        bytes: async (parent: number, entry: Media, variant: 'content' | 'thumbnail', signal: AbortSignal) => {
            const checked = media(entry, parent, entry.id);
            if (!checked.variants.includes(variant) || (variant === 'thumbnail' && checked.kind !== 'IMAGE')) throw new Error('Variant unavailable');
            const response = await request(`${itemPath(parent)}/media/${uuid(entry.id)}/${variant}`, signal);
            const mime = response.headers.get('Content-Type')?.split(';')[0]; const size = integer(response.headers.get('Content-Length'));
            if (!response.headers.get('Cache-Control')?.split(',').some(v => v.trim() === 'no-store') || response.headers.get('X-Content-Type-Options') !== 'nosniff'
                || !response.headers.get('Content-Disposition')?.startsWith('attachment;') || !mime || !['image/png','image/jpeg','application/pdf','application/octet-stream'].includes(mime)
                || size > 134217728 || (variant === 'content' && (mime !== entry.mimeType || size !== entry.byteSize)) || (variant === 'thumbnail' && !['image/png','image/jpeg'].includes(mime))) throw new Error('Unsafe media headers');
            const blob = await response.blob(); if (signal.aborted) throw new Error('Request cancelled');
            if (blob.size !== size || blob.type !== mime) throw new Error('Incomplete media'); return blob;
        },
    };
}
export type ScopedApi = ReturnType<typeof scopedApi>;
