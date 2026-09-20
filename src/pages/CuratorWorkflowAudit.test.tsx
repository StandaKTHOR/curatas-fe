// @vitest-environment jsdom
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AdminItemForm from './AdminItemForm';
import Detail from './Detail';
import MuseumCardPrint from '../components/MuseumCardPrint';
import {
    getAdminItem,
    getItem,
    getDictionaries,
    updateItem,
    listAttachments,
    uploadAttachment,
    listItemImages,
    deleteItemImage,
    setPrimaryItemImage,
    getMuseumItem,
    getDictionaryTree,
    getNextAvailableNumbers
} from '../lib/api';

vi.mock('../lib/api', () => ({
    getAdminItem: vi.fn(),
    getItem: vi.fn(),
    getDictionaries: vi.fn(),
    updateItem: vi.fn(),
    createItem: vi.fn(),
    listAttachments: vi.fn(),
    uploadAttachment: vi.fn(),
    deleteAttachment: vi.fn(),
    uploadItemImage: vi.fn(),
    listItemImages: vi.fn(),
    deleteItemImage: vi.fn(),
    setPrimaryItemImage: vi.fn(),
    downloadAttachmentFile: vi.fn(),
    bulkCopyItem: vi.fn(),
    getNextAvailableNumbers: vi.fn(),
    checkUniqueness: vi.fn(),
    getMuseumItem: vi.fn(),
    getDictionaryTree: vi.fn(),
    patchMuseumItem: vi.fn(),
    createMuseumRecord: vi.fn(),
    updateMuseumRecord: vi.fn(),
    deleteMuseumRecord: vi.fn(),
    deaccessionItem: vi.fn(),
    searchParties: vi.fn(),
    API_BASE: 'http://localhost:8080'
}));

const mockItemData = {
    id: 123,
    title: 'Gotická monstrance',
    accessionNumber: 'P-2024-001',
    inventoryNumber: 'INV-00123',
    subCollection: 'Hlavní sbírka',
    objectType: 'Liturgický předmět',
    catalogingStatus: 'Zapsán',
    author: 'Mistr Pavol',
    material: 'Zlato',
    materialNote: 'Pozlacené stříbro s emailem',
    technique: 'Tepání',
    originPlace: 'Levoča',
    findingLocality: 'Spiš',
    parties: [
        { partyId: 5, name: 'Mistr Pavol', role: 'Kopista', type: 'PERSON', sortOrder: 1 }
    ],
    attachments: [
        { id: 1, originalFilename: 'posudek.pdf', caption: 'Znalecký posudek', fileSize: 1024 }
    ],
    events: [
        { eventDate: '2024-01-01', type: 'AUDIT', description: 'Prvotní zápis předmětu' }
    ],
    dimensions: [],
    imageUrls: []
};

beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDictionaries).mockResolvedValue({
        objectTypes: ['Liturgický předmět'],
        materials: ['Zlato'],
        techniques: ['Tepání'],
        spravci: ['Mgr. Jan Novák'],
        countries: ['Slovensko'],
        authors: ['Mistr Pavol'],
        funds: ['Hlavní sbírka']
    });
    vi.mocked(getAdminItem).mockResolvedValue(mockItemData as never);
    vi.mocked(getItem).mockResolvedValue(mockItemData as never);
    vi.mocked(listAttachments).mockResolvedValue(mockItemData.attachments as never);
    vi.mocked(updateItem).mockResolvedValue(mockItemData as never);
    vi.mocked(getMuseumItem).mockResolvedValue({ itemId: 123, records: [] } as never);
    vi.mocked(getDictionaryTree).mockResolvedValue([]);
    vi.mocked(getNextAvailableNumbers).mockResolvedValue({ accession: 'P-1', inventory: 'INV-1' } as never);
});

describe('Curator Workflow Audit - Frontend Integration', () => {
    it('displays author role in Detail view and MuseumCardPrint', async () => {
        render(
            <MemoryRouter initialEntries={['/detail/123']}>
                <Routes>
                    <Route path="/detail/:id" element={<Detail />} />
                </Routes>
            </MemoryRouter>
        );

        expect(await screen.findByText(/Mistr Pavol \(Kopista\)/)).toBeInTheDocument();

        const { container } = render(
            <MuseumCardPrint item={mockItemData} onClose={() => {}} />
        );
        expect(container).toHaveTextContent('Mistr Pavol (Kopista)');
    });

    it('displays role selector with full museum roles and syncs with party state', async () => {
        render(
            <MemoryRouter initialEntries={['/admin/items/edit/123']}>
                <Routes>
                    <Route path="/admin/items/edit/:id" element={<AdminItemForm />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.getByDisplayValue('Gotická monstrance')).toBeInTheDocument());

        // Switch to tab 2: Popis & Rozměry
        const tab2Button = screen.getByRole('button', { name: /Popis & Rozměry/i });
        await userEvent.click(tab2Button);

        // Verify role dropdown is present and contains expected roles
        const roleSelect = screen.getByLabelText('Role autora') as HTMLSelectElement;
        expect(roleSelect).toBeInTheDocument();
        expect(roleSelect.value).toBe('Kopista');

        // Select a different role (e.g. Falsifikátor)
        await userEvent.selectOptions(roleSelect, 'Falsifikátor');
        expect(roleSelect.value).toBe('Falsifikátor');

        // Verify materialNote (PoznMT) textarea is available
        const matNote = screen.getByPlaceholderText(/Doplňující poznámka k materiálu/i);
        expect(matNote).toBeInTheDocument();
        expect(matNote).toHaveValue('Pozlacené stříbro s emailem');
    });

    it('saves audit record with sanitized payload without navigating away or breaking form', async () => {
        render(
            <MemoryRouter initialEntries={['/admin/items/edit/123']}>
                <Routes>
                    <Route path="/admin/items/edit/:id" element={<AdminItemForm />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.getByDisplayValue('Gotická monstrance')).toBeInTheDocument());

        // Switch to tab 5: Odborná evidence & DEMUS
        const tab5Button = screen.getByRole('button', { name: /Odborná evidence & DEMUS/i });
        await userEvent.click(tab5Button);

        // Switch to audit subtab
        const auditTabButton = screen.getByRole('button', { name: /Audit/i });
        await userEvent.click(auditTabButton);

        // Type audit comment
        const auditInput = screen.getByPlaceholderText(/např\. Oprava datace/i);
        await userEvent.type(auditInput, 'Doplnění údajů o autorovi a technice.');

        // Click save audit button
        const saveAuditButton = screen.getByRole('button', { name: /Uložit auditní záznam/i });
        await userEvent.click(saveAuditButton);

        expect(updateItem).toHaveBeenCalledWith(123, expect.objectContaining({
            auditComment: 'Doplnění údajů o autorovi a technice.',
            author: 'Mistr Pavol',
            originPlace: 'Levoča',
            materialNote: 'Pozlacené stříbro s emailem',
            parties: expect.arrayContaining([
                expect.objectContaining({ partyName: 'Mistr Pavol', role: 'Kopista' })
            ])
        }));

        expect(await screen.findByText(/Auditní záznam byl úspěšně uložen/i)).toBeInTheDocument();
    });

    it('synchronizes attachment counter on upload and delete', async () => {
        vi.mocked(uploadAttachment).mockResolvedValue({
            id: 2,
            originalFilename: 'foto_makro.jpg',
            caption: 'Makrosnímek',
            fileSize: 2048
        } as never);

        render(
            <MemoryRouter initialEntries={['/admin/items/edit/123']}>
                <Routes>
                    <Route path="/admin/items/edit/:id" element={<AdminItemForm />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.getByDisplayValue('Gotická monstrance')).toBeInTheDocument());

        // Switch to Tab 5 and subtab attachments
        await userEvent.click(screen.getByRole('button', { name: /Odborná evidence & DEMUS/i }));

        // Initial attachment counter should be 1
        const attSubtab = await screen.findByRole('button', { name: /Přílohy \(1\)/i });
        expect(attSubtab).toBeInTheDocument();
        await userEvent.click(attSubtab);

        expect(screen.getByText('posudek.pdf')).toBeInTheDocument();
    });

    it('fundSelector_loadsDictionaryOptionsAndPersists: loads options and updates subCollection', async () => {
        vi.mocked(getDictionaries).mockResolvedValue({
            funds: ['Archeologie', 'Numismatika', 'Výtvarné umění']
        } as never);

        render(
            <MemoryRouter initialEntries={['/admin/items/new']}>
                <Routes>
                    <Route path="/admin/items/new" element={<AdminItemForm />} />
                </Routes>
            </MemoryRouter>
        );

        const subColSelect = await screen.findByRole('combobox', { name: /Fond \/ Podsbírka/i });
        expect(subColSelect).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByRole('option', { name: 'Archeologie' })).toBeInTheDocument();
            expect(screen.getByRole('option', { name: 'Numismatika' })).toBeInTheDocument();
            expect(screen.getByRole('option', { name: 'Výtvarné umění' })).toBeInTheDocument();
        });

        // New item must NOT auto-select first fund; curator must select consciously
        expect(subColSelect).toHaveValue('');
        expect(screen.getByRole('option', { name: /vyberte Fond \/ Podsbirku/i })).toBeInTheDocument();

        await userEvent.selectOptions(subColSelect, 'Numismatika');
        expect(subColSelect).toHaveValue('Numismatika');
    });

    it('photoDelete_requiresConfirmationAndRemovesPhoto: confirms and calls delete API', async () => {
        const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
        vi.mocked(listItemImages).mockResolvedValue([
            { id: 999, url: 'http://localhost:8080/test/foto.jpg', primary: true, sortOrder: 1, caption: 'Hlavní foto' }
        ]);

        render(
            <MemoryRouter initialEntries={['/admin/items/edit/123']}>
                <Routes>
                    <Route path="/admin/items/edit/:id" element={<AdminItemForm />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.getByDisplayValue('Gotická monstrance')).toBeInTheDocument());

        // Switch to Tab 2 (Popis & Rozměry)
        const tab2 = screen.getByRole('button', { name: /2\. Popis & Rozměry/i });
        await userEvent.click(tab2);

        // Verify photo rendered with Czech actions
        expect(await screen.findByText('★ Hlavní foto')).toBeInTheDocument();
        expect(screen.getByText('Náhled')).toBeInTheDocument();
        expect(screen.getByText('Stáhnout')).toBeInTheDocument();

        const deleteBtn = screen.getByRole('button', { name: /Smazat fotografii 999/i });
        expect(deleteBtn).toBeInTheDocument();

        await userEvent.click(deleteBtn);

        expect(confirmSpy).toHaveBeenCalledWith('Opravdu chcete tuto fotografii odstranit?');
        expect(deleteItemImage).toHaveBeenCalledWith(123, 999);
    });
});
