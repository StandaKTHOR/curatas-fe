import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InventoryIdentityPanel } from './InventoryIdentityPanel';
import { getInventoryIdentity, updateInventoryIdentity, InventoryIdentity } from '../lib/inventoryIdentity';
vi.mock('../lib/inventoryIdentity', async importOriginal => ({
    ...await importOriginal<typeof import('../lib/inventoryIdentity')>(), getInventoryIdentity: vi.fn(), updateInventoryIdentity: vi.fn()
}));
vi.mock('../lib/demusIdentity', () => ({ getDemusIdentity: vi.fn().mockResolvedValue({
    originalInventoryNumber: ' OLD 0001 ', otherNumber: null, originNote: 'Původní poznámka', authorRole: 'Kopista',
    determinedBy: 'TEST_CURATOR', determinedAtRaw: 'SOURCE_DATE', sourceLocalId: '7'
}) }));
const fixture: InventoryIdentity = { itemId: 7, inventoryNumber: '  ZV 00935  ', rowVersion: 2, revision: 0,
    components: { series: ' ZV ', ordinal: '00935', division: '_', hierarchyOrdinal: null, hierarchyDivision: null,
        stateCode: 'CZE', custodianCode: '6MM', departmentCode: 'E', collectionCode: '2' },
    sourceComponents: { series: ' ZV ', ordinal: '00935', division: '_', hierarchyOrdinal: null, hierarchyDivision: null,
        stateCode: 'CZE', custodianCode: '6MM', departmentCode: 'E', collectionCode: '2' },
    edited: false, stale: false, aliases: [] };
beforeEach(() => { vi.clearAllMocks(); vi.mocked(getInventoryIdentity).mockResolvedValue(fixture); });
describe('inventory evidence form', () => {
    it('shows verified raw components and read-only professional evidence', async () => {
        render(<InventoryIdentityPanel itemId={7} inventoryNumber={fixture.inventoryNumber!} canEdit={false} onSaved={vi.fn()} />);
        expect(await screen.findByText('00935')).toBeInTheDocument();
        expect(screen.getByText('Původní poznámka')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Upravit složky' })).not.toBeInTheDocument();
    });
    it('sends explicit component edits without reconstructing display or changing institution', async () => {
        const onSaved = vi.fn().mockResolvedValue(undefined);
        vi.mocked(updateInventoryIdentity).mockResolvedValue({ ...fixture, revision: 1, rowVersion: 3 });
        render(<InventoryIdentityPanel itemId={7} inventoryNumber={fixture.inventoryNumber!} canEdit onSaved={onSaved} />);
        await userEvent.click(await screen.findByRole('button', { name: 'Upravit složky' }));
        expect(screen.getByLabelText('Instituce')).toBeDisabled();
        await userEvent.clear(screen.getByLabelText('Lomení'));
        await userEvent.type(screen.getByLabelText('Lomení'), '0002');
        await userEvent.click(screen.getByRole('button', { name: 'Uložit inventární údaje' }));
        await waitFor(() => expect(updateInventoryIdentity).toHaveBeenCalledWith(fixture, fixture.inventoryNumber,
            { ...fixture.components, division: '0002' }));
        expect(onSaved).toHaveBeenCalledOnce();
    });
    it('retains unsaved edits after a server conflict', async () => {
        vi.mocked(updateInventoryIdentity).mockRejectedValue(new Error('Načtěte předmět znovu.'));
        render(<InventoryIdentityPanel itemId={7} inventoryNumber={fixture.inventoryNumber!} canEdit onSaved={vi.fn()} />);
        await userEvent.click(await screen.findByRole('button', { name: 'Upravit složky' }));
        await userEvent.click(screen.getByRole('button', { name: 'Uložit inventární údaje' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('Načtěte');
        expect(screen.getByLabelText('Pořadové číslo')).toHaveValue('00935');
    });
});
