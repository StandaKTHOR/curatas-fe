import { afterEach, describe, expect, it, vi } from 'vitest';
import { getInventoryIdentity, updateInventoryIdentity, InventoryIdentity } from './inventoryIdentity';
vi.mock('./api', () => ({ resolveApiUrl: (path: string) => `/uat${path}` }));
afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });
const components = { series: ' ZV ', ordinal: '00935', division: '_', hierarchyOrdinal: '0001', hierarchyDivision: null,
    stateCode: 'CZE', custodianCode: '6MM', departmentCode: 'E', collectionCode: '2' };
const fixture: InventoryIdentity = { itemId: 7, inventoryNumber: '  ZV 00935  ', rowVersion: 3, revision: 1,
    components, sourceComponents: { ...components }, edited: true, stale: false, aliases: [] };
describe('structured inventory API', () => {
    it('preserves raw text and uses protected /uat URLs without redirecting tokens', async () => {
        localStorage.setItem('token', 'TEST_TOKEN');
        const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => fixture });
        vi.stubGlobal('fetch', fetchMock);
        expect(await getInventoryIdentity(7)).toEqual(fixture);
        expect(fetchMock).toHaveBeenCalledWith('/uat/api/v1/items/7/inventory-identity',
            expect.objectContaining({ method: 'GET', redirect: 'error', headers: { Authorization: 'Bearer TEST_TOKEN' } }));
    });
    it('writes exact values with expected old versions and display', async () => {
        const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => fixture });
        vi.stubGlobal('fetch', fetchMock);
        await updateInventoryIdentity(fixture, fixture.inventoryNumber, fixture.components);
        expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ expectedRowVersion: 3, expectedRevision: 1,
            expectedInventoryNumber: fixture.inventoryNumber, inventoryNumber: fixture.inventoryNumber, components });
    });
    it('rejects incomplete or mismatched contracts rather than inventing components', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ...fixture, components: { series: 'ZV' } }) }));
        await expect(getInventoryIdentity(7)).rejects.toThrow('Neplatná odpověď');
    });
    it('retains a conflict as an error and does not retry an overwrite', async () => {
        const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 409 });
        vi.stubGlobal('fetch', fetchMock);
        await expect(updateInventoryIdentity(fixture, 'NEW', fixture.components)).rejects.toThrow('Načtěte');
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });
});
