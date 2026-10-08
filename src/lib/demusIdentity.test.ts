import { afterEach, describe, expect, it, vi } from 'vitest';
import { getDemusIdentity } from './demusIdentity';
vi.mock('./api', () => ({ resolveApiUrl: (path: string) => `/uat${path}` }));
afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });
const data = { itemId: 7, inventoryNumber: 'ZV 935', sourceInventoryNumber: '  ZV  00935  ',
    series: 'ZV', ordinal: '00935', division: '_', stateCode: null, custodianCode: null,
    departmentCode: null, originalInventoryNumber: null, otherNumber: null, materialNote: null,
    fundCode: ' 7 ', groupCode: null };
describe('DEMUS identity API contract', () => {
    it('preserves source text and uses authenticated UAT paths', async () => {
        localStorage.setItem('token', 'test-token');
        const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => data });
        vi.stubGlobal('fetch', fetchMock);
        expect(await getDemusIdentity(7)).toEqual(data);
        expect(fetchMock).toHaveBeenCalledWith('/uat/api/v1/items/7/demus-identity', {
            headers: { Authorization: 'Bearer test-token' },
        });
    });
    it('rejects invalid IDs before sending a request', async () => {
        const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
        await expect(getDemusIdentity(0)).rejects.toThrow('Invalid item ID');
        expect(fetchMock).not.toHaveBeenCalled();
    });
    it('rejects incomplete or mismatched responses', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ itemId: 8 }) }));
        await expect(getDemusIdentity(7)).rejects.toThrow('Invalid DEMUS identity response');
    });
    it('reports authorization failures without returning fabricated data', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }));
        await expect(getDemusIdentity(7)).rejects.toThrow('(403)');
    });
});