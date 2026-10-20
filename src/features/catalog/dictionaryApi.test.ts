import { afterEach, describe, expect, it, vi } from 'vitest';
import { catalogDictionaries, CatalogDictionaryApiError } from './dictionaryApi';

const id = '00000000-0000-0000-0000-000000000011';
const value = { id, catalogId: 11, type: 'MATERIAL', label: '  Dřevo  ', code: null, parentId: null, version: 0 };
const input = { label: '  Dřevo  ', code: null, parentId: null, reason: 'Explicit reason' };
const signal = () => new AbortController().signal;
const response = (body: unknown, status = 200, etag: string | null = '"0"') => ({
    ok: status >= 200 && status < 300, status, json: async () => body, headers: new Headers(etag ? { ETag: etag } : {}),
});
afterEach(() => vi.unstubAllGlobals());
describe('catalog dictionary typed transport', () => {
    it('requires an explicit catalog/session before making any request', () => {
        const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
        expect(() => catalogDictionaries(0, 'token')).toThrow();
        expect(() => catalogDictionaries(11, '')).toThrow(); expect(fetcher).not.toHaveBeenCalled();
    });
    it('keeps catalog, query text, parent, cursor and session in the request', async () => {
        const fetcher = vi.fn().mockResolvedValue(response({ items: [value], nextAfterId: null })); vi.stubGlobal('fetch', fetcher);
        const abort = signal();
        await catalogDictionaries(11, 'session').list('MATERIAL', { q: '  100%_  ', parentId: id, afterId: id, limit: 3 }, abort);
        const url = new URL(fetcher.mock.calls[0][0], 'http://fixture');
        expect(url.pathname).toMatch(/\/api\/v2\/catalogs\/11\/dictionaries\/MATERIAL\/values$/);
        expect(url.searchParams.get('q')).toBe('  100%_  '); expect(url.searchParams.get('parentId')).toBe(id);
        expect(url.searchParams.get('afterId')).toBe(id); expect(url.searchParams.get('limit')).toBe('3');
        expect(fetcher.mock.calls[0][1]).toMatchObject({ signal: abort, cache: 'no-store', headers: { Authorization: 'Bearer session' } });
    });
    it('POST preserves exact text and returns the server ID and ETag for immediate selection', async () => {
        const fetcher = vi.fn().mockResolvedValue(response(value, 201)); vi.stubGlobal('fetch', fetcher);
        const result = await catalogDictionaries(11, 'session').create('MATERIAL', input, signal());
        expect(result).toEqual({ value, etag: '"0"' });
        expect(fetcher.mock.calls[0][1]).toMatchObject({ method: 'POST', body: JSON.stringify(input) });
    });
    it('PUT sends the original strong ETag and explicit nulls without rewriting the draft', async () => {
        const fetcher = vi.fn().mockResolvedValue(response({ ...value, version: 1 }, 200, '"1"')); vi.stubGlobal('fetch', fetcher);
        const result = await catalogDictionaries(11, 'session').update('MATERIAL', id, '"0"', input, signal());
        expect(fetcher.mock.calls[0][1]).toMatchObject({ method: 'PUT', headers: { 'If-Match': '"0"' }, body: JSON.stringify(input) });
        expect(result.etag).toBe('"1"'); expect(input.label).toBe('  Dřevo  ');
    });
    it.each([401, 403, 404, 409, 412, 422])('exposes %s without retrying or falling back to legacy APIs', async status => {
        const fetcher = vi.fn().mockResolvedValue(response({ code: 'FIXTURE_ERROR', message: 'Fixture rejection' }, status)); vi.stubGlobal('fetch', fetcher);
        await expect(catalogDictionaries(11, 'session').create('MATERIAL', input, signal())).rejects.toMatchObject({ status, code: 'FIXTURE_ERROR' });
        expect(fetcher).toHaveBeenCalledTimes(1); expect(input.label).toBe('  Dřevo  ');
    });
    it('preserves server field errors for the editor', async () => {
        const fields = [{ field: 'label', message: 'Required' }];
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ code: 'VALIDATION_FAILED', fieldErrors: fields }, 400)));
        try { await catalogDictionaries(11, 'session').create('MATERIAL', input, signal()); throw new Error('Expected error'); }
        catch (error) { expect(error).toBeInstanceOf(CatalogDictionaryApiError); expect(error).toMatchObject({ status: 400, fieldErrors: fields }); }
    });
    it('rejects missing response versions and cross-catalog response data before it can be edited', async () => {
        const fetcher = vi.fn().mockResolvedValueOnce(response(value, 200, null)).mockResolvedValueOnce(response({ ...value, catalogId: 21 }));
        vi.stubGlobal('fetch', fetcher);
        const api = catalogDictionaries(11, 'session');
        await expect(api.detail('MATERIAL', id, signal())).rejects.toThrow(/missing version/);
        await expect(api.detail('MATERIAL', id, signal())).rejects.toThrow(/Invalid catalog/);
    });
    it('refuses weak or missing update ETags before sending a request', () => {
        const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
        expect(() => catalogDictionaries(11, 'session').update('MATERIAL', id, 'W/"0"', input, signal())).toThrow();
        expect(fetcher).not.toHaveBeenCalled();
    });
});
