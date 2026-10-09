// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import AdminItemForm from './AdminItemForm';
import Detail from './Detail';
import {
    getAdminItem,
    getItem,
    getDictionaries,
    getDictionaryTree,
    listAttachments,
    updateItem,
    getMuseumItem,
    getNextAvailableNumbers
} from '../lib/api';

vi.mock('../lib/api', () => ({
    getAdminItem: vi.fn(),
    getItem: vi.fn(),
    getDictionaries: vi.fn(),
    getDictionaryTree: vi.fn(),
    listAttachments: vi.fn(),
    updateItem: vi.fn(),
    createItem: vi.fn(),
    getMuseumItem: vi.fn(),
    getNextAvailableNumbers: vi.fn(),
    uploadAttachment: vi.fn(),
    deleteAttachment: vi.fn(),
    deleteItemPhoto: vi.fn(),
    listItemImages: vi.fn().mockResolvedValue([]),
    API_BASE: 'http://localhost:8080/api',
    resolveApiUrl: (url: string) => url
}));

vi.mock('../components/AuthContext', () => ({
    useAuth: () => ({ token: 'mock-token', role: 'ADMIN', user: { username: 'kurator' } })
}));

const mockItemWithFundAndSubCollection = {
    id: 123,
    inventoryNumber: 'ARC-001',
    accessionNumber: 'P-10/2024',
    title: 'Keltská spona z bronzu',
    objectType: 'Archeologický nález',
    description: 'Zachovalá bronzová spona z doby laténské.',
    datingText: 'cca 300 př. n. l.',
    author: 'Neznámý keltský kovolitec',
    parties: [],
    fundDictionaryId: 5,
    fundLegacyCode: 'ARCH-1',
    subCollection: 'Archeologická podsbírka',
    status: 'READY',
    attachments: [],
    dimensions: [],
    imageUrls: []
};

// Pomocná komponenta pro kontrolu navigace
function LocationDisplay() {
    const location = useLocation();
    return <div data-testid="current-location">{location.pathname}{location.search}</div>;
}

describe('CITEM Stage 1: Safe FE Changes Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        sessionStorage.clear();

        vi.mocked(getDictionaries).mockResolvedValue({
            funds: ['Staré fondy', 'Výtvarné umění']
        } as any);

        vi.mocked(getDictionaryTree).mockResolvedValue([
            { id: 5, code: 'ARCH-1', label: 'Archeologie', children: [] },
            { id: 6, code: 'NUM-1', label: 'Numismatika', children: [] }
        ] as any);

        vi.mocked(getAdminItem).mockResolvedValue(mockItemWithFundAndSubCollection as any);
        vi.mocked(getItem).mockResolvedValue(mockItemWithFundAndSubCollection as any);
        vi.mocked(listAttachments).mockResolvedValue([]);
        vi.mocked(getMuseumItem).mockResolvedValue({ itemId: 123, records: [] } as any);
        vi.mocked(getNextAvailableNumbers).mockResolvedValue({ accession: 'P-1', inventory: 'INV-1' } as any);
        vi.mocked(updateItem).mockResolvedValue({ ...mockItemWithFundAndSubCollection } as any);
    });

    it('loads Fund and SubCollection independently and displays them in form and header', async () => {
        render(
            <MemoryRouter initialEntries={['/admin/items/edit/123']}>
                <Routes>
                    <Route path="/admin/items/edit/:id" element={<AdminItemForm />} />
                </Routes>
            </MemoryRouter>
        );

        // Ověření načtení dat
        await waitFor(() => {
            expect(screen.getByDisplayValue('Keltská spona z bronzu')).toBeInTheDocument();
        });

        // 1. Ověření nezávislého Fondu v comboboxu
        const fundSelect = screen.getByRole('combobox', { name: 'Fond' }) as HTMLSelectElement;
        expect(fundSelect.value).toBe('5');

        // 2. Ověření badge původního DEMUS kódu fondu
        expect(screen.getByText('ARCH-1')).toBeInTheDocument();

        // 3. Ověření nezávislé Podsbírky
        const subColInput = screen.getByRole('textbox', { name: 'Podsbírka' }) as HTMLInputElement;
        expect(subColInput.value).toBe('Archeologická podsbírka');

        // 4. Ověření permanentní identifikační hlavičky
        const header = screen.getByRole('complementary', { name: 'Permanentní identifikace předmětu' });
        expect(header).toBeInTheDocument();
        expect(header).toHaveTextContent('ARC-001');
        expect(header).toHaveTextContent('Keltská spona z bronzu');
        expect(header).toHaveTextContent('Archeologický nález');
        expect(header).toHaveTextContent('cca 300 př. n. l.');
    });

    it('never invents Fund IDs when the tree endpoint returns no entries', async () => {
        vi.mocked(getDictionaryTree).mockResolvedValue([]);
        render(<MemoryRouter initialEntries={['/admin/items/edit/123']}>
            <Routes><Route path="/admin/items/edit/:id" element={<AdminItemForm />} /></Routes>
        </MemoryRouter>);
        await screen.findByDisplayValue('Keltská spona z bronzu');
        const select = screen.getByRole('combobox', { name: 'Fond' });
        expect(select).toBeDisabled();
        expect(select).toHaveValue('5');
        expect(screen.queryByRole('option', { name: 'Staré fondy' })).not.toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: /Uložit sbírkový předmět/i }));
        await waitFor(() => expect(updateItem).toHaveBeenCalledWith(123,
            expect.objectContaining({ fundDictionaryId: 5, clearFund: false })));
    });

    it('does not invent professional values or replace unknown and sentinel values on unrelated saves', async () => {
        vi.mocked(getAdminItem).mockResolvedValue({ ...mockItemWithFundAndSubCollection,
            acquisitionMethod: null, objectCondition: null, quantity: 0, insuranceValue: null,
            coordinateSystem: null, datingFrom: '-0300-06-15', dimensions: [], parties: [] } as any);
        render(<MemoryRouter initialEntries={['/admin/items/edit/123']}>
            <Routes><Route path="/admin/items/edit/:id" element={<AdminItemForm />} /></Routes>
        </MemoryRouter>);
        await screen.findByDisplayValue('Keltská spona z bronzu');
        const subCollection = screen.getByRole('textbox', { name: 'Podsbírka' });
        await userEvent.clear(subCollection);
        await userEvent.type(subCollection, 'Pouze změna podsbírky');
        await userEvent.click(screen.getByRole('button', { name: /Uložit sbírkový předmět/i }));
        await waitFor(() => expect(updateItem).toHaveBeenCalled());
        const payload = vi.mocked(updateItem).mock.calls[0][1];
        expect(payload.subCollection).toBe('Pouze změna podsbírky');
        for (const field of ['acquisitionMethod', 'objectCondition', 'quantity', 'insuranceValue',
            'coordinateSystem', 'datingFrom', 'parties', 'dimensions']) {
            expect(payload).not.toHaveProperty(field);
        }
    });
    it('preserves Fund when updating only SubCollection, and saves both independently', async () => {
        render(
            <MemoryRouter initialEntries={['/admin/items/edit/123']}>
                <Routes>
                    <Route path="/admin/items/edit/:id" element={<AdminItemForm />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByDisplayValue('Keltská spona z bronzu')).toBeInTheDocument();
        });

        const subColInput = screen.getByRole('textbox', { name: 'Podsbírka' });
        await userEvent.clear(subColInput);
        await userEvent.type(subColInput, 'Upravená podsbírka');

        const saveButton = screen.getByRole('button', { name: /Uložit sbírkový předmět/i });
        await userEvent.click(saveButton);

        await waitFor(() => {
            expect(updateItem).toHaveBeenCalledWith(123, expect.objectContaining({
                subCollection: 'Upravená podsbírka',
                fundDictionaryId: 5,
                fundLegacyCode: 'ARCH-1',
                clearFund: false
            }));
        });
    });

    it('allows clearing Fund without wiping SubCollection (sends clearFund: true)', async () => {
        render(
            <MemoryRouter initialEntries={['/admin/items/edit/123']}>
                <Routes>
                    <Route path="/admin/items/edit/:id" element={<AdminItemForm />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByDisplayValue('Keltská spona z bronzu')).toBeInTheDocument();
        });

        // Vyčištění fondu výběrem prázdné možnosti
        const fundSelect = screen.getByRole('combobox', { name: 'Fond' });
        await userEvent.selectOptions(fundSelect, '');

        const saveButton = screen.getByRole('button', { name: /Uložit sbírkový předmět/i });
        await userEvent.click(saveButton);

        await waitFor(() => {
            expect(updateItem).toHaveBeenCalledWith(123, expect.objectContaining({
                subCollection: 'Archeologická podsbírka',
                fundDictionaryId: null,
                clearFund: true
            }));
        });
    });

    it('warns about unsaved changes (isDirty) when clicking back button and stops navigation if cancelled', async () => {
        const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

        render(
            <MemoryRouter initialEntries={[{ pathname: '/admin/items/edit/123', state: { fromSearch: '?page=1' } }]}>
                <Routes>
                    <Route path="/admin/items/edit/:id" element={<AdminItemForm />} />
                    <Route path="/admin/items" element={<LocationDisplay />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByDisplayValue('Keltská spona z bronzu')).toBeInTheDocument();
        });

        // Změna v názvu vyvolá isDirty stav
        const titleInput = screen.getByDisplayValue('Keltská spona z bronzu');
        await userEvent.type(titleInput, ' - doplněný text');

        // Klik na tlačítko Zpět na seznam
        const backButton = screen.getAllByRole('button', { name: /Zpět na seznam/i })[0];
        await userEvent.click(backButton);

        // Potvrzovací dialog byl vyvolán
        expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('neuložené změny'));

        // Uživatel zrušil odchod -> zůstáváme na formuláři
        expect(screen.getByDisplayValue(/doplněný text/)).toBeInTheDocument();
        expect(screen.queryByTestId('current-location')).not.toBeInTheDocument();

        confirmSpy.mockRestore();
    });

    it('restores previous search query, page and filters upon navigation back to list', async () => {
        const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

        render(
            <MemoryRouter initialEntries={[{ pathname: '/admin/items/edit/123', state: { fromSearch: '?page=2&q=spona&status=READY' } }]}>
                <Routes>
                    <Route path="/admin/items/edit/:id" element={<AdminItemForm />} />
                    <Route path="/admin/items" element={<LocationDisplay />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByDisplayValue('Keltská spona z bronzu')).toBeInTheDocument();
        });

        // Klik na tlačítko Zpět na seznam (bez změn)
        const backButton = screen.getAllByRole('button', { name: /Zpět na seznam/i })[0];
        await userEvent.click(backButton);

        // Ověření přesměrování se zachovaným dotazem
        await waitFor(() => {
            expect(screen.getByTestId('current-location')).toHaveTextContent('/admin/items?page=2&q=spona&status=READY');
        });

        confirmSpy.mockRestore();
    });

    it('Detail view back button restores catalog search query from state or sessionStorage', async () => {
        sessionStorage.setItem('catalogSearch', '?page=4&material=Zlato');

        render(
            <MemoryRouter initialEntries={['/detail/123']}>
                <Routes>
                    <Route path="/detail/:id" element={<Detail />} />
                    <Route path="/" element={<LocationDisplay />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getAllByText('Keltská spona z bronzu').length).toBeGreaterThanOrEqual(1);
        });

        const backButton = screen.getByRole('button', { name: /Zpět na seznam/i });
        await userEvent.click(backButton);

        await waitFor(() => {
            expect(screen.getByTestId('current-location')).toHaveTextContent('/?page=4&material=Zlato');
        });
    });
});
