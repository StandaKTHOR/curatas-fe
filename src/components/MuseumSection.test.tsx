// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MuseumSection from './MuseumSection';
import AcquisitionSection from './AcquisitionSection';
import {
    getMuseumItem, getDictionaryTree, patchMuseumItem, updateMuseumRecord, createMuseumRecord,
    listMuseumAcquisitions, updateMuseumAcquisition,
} from '../lib/api';

vi.mock('../lib/api', () => ({
    getMuseumItem: vi.fn(), getDictionaryTree: vi.fn(), patchMuseumItem: vi.fn(),
    createMuseumRecord: vi.fn(), updateMuseumRecord: vi.fn(), deleteMuseumRecord: vi.fn(),
    deaccessionItem: vi.fn(), searchParties: vi.fn(), listMuseumAcquisitions: vi.fn(), createMuseumAcquisition: vi.fn(),
    updateMuseumAcquisition: vi.fn(), deleteMuseumAcquisition: vi.fn(),
}));

const detail = {
    itemId: 7, markant: 'mark', signature: null, legacyArchived: true, legacyCard: null,
    legacyCopied: null, legacyVerified: null, legacyMarked: null,
    localityLegacyCode: 'L1', fundLegacyCode: null, groupLegacyCode: null, subjectLegacyCode: null,
    materialDictionaryId: null, techniqueDictionaryId: null, localityDictionaryId: null,
    fundDictionaryId: null, groupDictionaryId: null, subjectDictionaryId: null,
    legacyCreatedBy: 'DE-USER', legacyCreatedAt: '2001-02-03T00:00:00',
    legacyUpdatedBy: null, legacyUpdatedAt: null, records: [],
};

beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getMuseumItem).mockResolvedValue(detail);
    vi.mocked(getDictionaryTree).mockResolvedValue([
        { id: 1, label: 'Kovy', children: [{ id: 2, label: 'Železo', children: [{ id: 3, label: 'Litina', children: [] }] }] },
    ]);
    vi.mocked(patchMuseumItem).mockResolvedValue(detail);
});

describe('muzeální sekce předmětu', () => {
    it('allows choosing an arbitrary depth in the material hierarchy', async () => {
        render(<MuseumSection itemId={7} section="materials" />);
        await waitFor(() => expect(screen.getAllByRole('combobox')[0].querySelector('option[value="3"]'))
            .toHaveTextContent('Kovy › Železo › Litina'));
        const choice = screen.getAllByRole('combobox')[0];
        await userEvent.selectOptions(choice, '3');
        await userEvent.click(screen.getByRole('button', { name: 'Uložit sekci' }));
        expect(patchMuseumItem).toHaveBeenCalledWith(7, { materialDictionaryId: 3 });
    });

    it('can clear an existing dictionary reference without restoring the old selection', async () => {
        vi.mocked(getMuseumItem).mockResolvedValue({ ...detail, materialDictionaryId: 3 });
        render(<MuseumSection itemId={7} section="materials" />);
        await waitFor(() => expect(screen.getAllByRole('combobox')[0]).toHaveValue('3'));
        await userEvent.selectOptions(screen.getAllByRole('combobox')[0], '');
        expect(screen.getAllByRole('combobox')[0]).toHaveValue('');
        await userEvent.click(screen.getByRole('button', { name: 'Uložit sekci' }));
        expect(patchMuseumItem).toHaveBeenCalledWith(7, { materialDictionaryId: null });
    });

    it('shows legacy audit read only', async () => {
        render(<MuseumSection itemId={7} section="history" />);
        expect(await screen.findByText(/DE-USER/)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Uložit sekci' })).not.toBeInTheDocument();
    });

    it('preserves unmodelled source fields when editing imported documentation', async () => {
        const imported = { id: 9, kind: 'DOCUMENTATION', dictionaryId: null,
            payload: { Dokument_DK: 'old', extra: 'keep' }, sourceTable: 'Dokumentace', sourceKey: '7:1',
            legacyData: { Dokument_DK: 'old', unknown: 'original' } };
        vi.mocked(getMuseumItem).mockResolvedValue({ ...detail, records: [imported] } as never);
        vi.mocked(updateMuseumRecord).mockResolvedValue(imported as never);
        render(<MuseumSection itemId={7} section="documentation" />);
        await userEvent.click(await screen.findByRole('button', { name: 'Upravit' }));
        const field = screen.getByLabelText('Dokument / název');
        await userEvent.clear(field);
        await userEvent.type(field, 'new');
        await userEvent.click(screen.getByRole('button', { name: 'Uložit záznam' }));
        expect(updateMuseumRecord).toHaveBeenCalledWith(7, 'DOCUMENTATION', 9,
            expect.objectContaining({ Dokument_DK: 'new', extra: 'keep' }), null, null);
    });

    it('stores documentation type code when selecting its dictionary entry', async () => {
        vi.mocked(getDictionaryTree).mockResolvedValue([{ id: 5, code: 'FO', label: 'Fotografie', children: [] }]);
        vi.mocked(createMuseumRecord).mockResolvedValue({} as never);
        render(<MuseumSection itemId={7} section="documentation" />);
        await waitFor(() => expect(screen.getByRole('combobox', { name: 'Číselník' }).querySelector('option[value="5"]')).toBeTruthy());
        await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Číselník' }), '5');
        await userEvent.click(screen.getByRole('button', { name: 'Uložit záznam' }));
        expect(createMuseumRecord).toHaveBeenCalledWith(7, 'DOCUMENTATION',
            expect.objectContaining({ TypDok_DK: 'FO' }), 5, null);
    });

    it('prevents default form submit on Enter key in TreeChoice search box', async () => {
        const onSubmit = vi.fn(e => e.preventDefault());
        render(
            <form onSubmit={onSubmit}>
                <MuseumSection itemId={7} section="materials" />
            </form>
        );
        await waitFor(() => expect(screen.getAllByPlaceholderText('Hledat v hierarchii')[0]).toBeInTheDocument());
        const searchInput = screen.getAllByPlaceholderText('Hledat v hierarchii')[0];
        await userEvent.type(searchInput, 'paličkovaná{enter}');
        expect(onSubmit).not.toHaveBeenCalled();
    });

    it('highlights record being edited and merges legacyData into edit form', async () => {
        const imported = {
            id: 42,
            kind: 'CLASSIFICATION',
            dictionaryId: null,
            payload: { SysKat_ZS: 'SK-1' },
            sourceTable: 'ZarazeniSbirky',
            legacyData: { Poradi_ZS: '3', extra_legacy: 'preserved' }
        };
        vi.mocked(getMuseumItem).mockResolvedValue({ ...detail, records: [imported] } as never);
        render(<MuseumSection itemId={7} section="classification" />);

        expect(await screen.findByText(/DEMUS ZarazeniSbirky/)).toBeInTheDocument();
        const editButton = screen.getByRole('button', { name: 'Upravit' });
        await userEvent.click(editButton);

        expect(screen.getByText('✏️ Právě upravujete')).toBeInTheDocument();
        expect(screen.getByText('✏️ Úprava záznamu #42')).toBeInTheDocument();
        expect(screen.getByDisplayValue('3')).toBeInTheDocument();
    });

    it('determination binds to party and sends partyId on save', async () => {
        const detRecord = {
            id: 11,
            kind: 'DETERMINATION',
            dictionaryId: null,
            partyId: 99,
            payload: { Predmet_UR: 'Fosilie trilobita' },
            sourceTable: null,
            legacyData: {}
        };
        vi.mocked(getMuseumItem).mockResolvedValue({ ...detail, records: [detRecord] } as never);
        render(<MuseumSection itemId={7} section="determination" />);

        expect(await screen.findByText('Fosilie trilobita')).toBeInTheDocument();
        expect(screen.getByText('Vazba na osobu/subjekt #99')).toBeInTheDocument();
    });
});

describe('akvizice', () => {
    it('shows multiple rows and edits the existing acquisition', async () => {
        const rows = [1, 2].map(id => ({ id, accessionNumber: `A${id}`, acquisitionMethod: 'dar',
            methodDictionaryId: null, acquisitionDate: null, acquiredFrom: null, circumstances: null,
            documentNumber: null, message: null, orderNumber: null, legacyData: { source: id } }));
        vi.mocked(listMuseumAcquisitions).mockResolvedValue(rows);
        vi.mocked(updateMuseumAcquisition).mockResolvedValue(rows[0]);
        render(<AcquisitionSection itemId={7} />);
        expect(await screen.findByText('A1')).toBeInTheDocument();
        expect(screen.getByText('A2')).toBeInTheDocument();
        await userEvent.click(screen.getAllByRole('button', { name: 'Upravit' })[0]);
        await userEvent.click(screen.getByRole('button', { name: 'Uložit akvizici' }));
        expect(updateMuseumAcquisition).toHaveBeenCalledWith(7, 1, expect.objectContaining({ accessionNumber: 'A1' }));
    });
});
