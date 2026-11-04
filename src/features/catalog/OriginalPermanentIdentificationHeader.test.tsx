import React from 'react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {cleanup, render, screen, waitFor} from '@testing-library/react';
import OriginalPermanentIdentificationHeader from './OriginalPermanentIdentificationHeader';

const mocks = vi.hoisted(() => ({
    auth: vi.fn(), catalog: vi.fn(), sourceInventory: vi.fn(), curatorRecord: vi.fn(),
}));

vi.mock('../../components/AuthContext', () => ({useAuth: mocks.auth}));
vi.mock('./CatalogContext', () => ({useCatalog: mocks.catalog}));
vi.mock('../scoped/scopedApi', () => ({
    scopedApi: () => ({
        sourceInventory: mocks.sourceInventory,
        curatorRecord: mocks.curatorRecord,
    }),
}));
vi.mock('../../components/PermanentIdentificationHeader', () => ({
    default: ({fond, predmet, titul}: {fond?: string | null; predmet?: string | null; titul?: string | null}) => (
        <div data-testid="original-header" data-fond={fond ?? ''} data-predmet={predmet ?? ''} data-titul={titul ?? ''} />
    ),
}));

const base = {
    hasToolbar: true, fond: null, predmet: '', titul: '', popis: '',
    autor: '', datace: '', inventoryNumber: 'N 3_CZE6MM E',
    quantity: null, isViewMode: true, isNew: false,
};
const show = (override: Record<string, unknown> = {}) =>
    render(<OriginalPermanentIdentificationHeader {...(base as any)} {...override} itemId={3} readHistorical={true}/>);
const header = () => screen.getByTestId('original-header');

beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockReturnValue({token: 'test-token'});
    mocks.catalog.mockReturnValue({selectedCatalog: {id: 1}});
    mocks.sourceInventory.mockResolvedValue({
        itemVersion: 'v1',
        fields: {Fond_S: 'nĂˇbytek', Predmet_S: 'kredenc kuchyĹskĂˇ', Titul_S: 'HistorickĂ˝ titul'},
    });
    mocks.curatorRecord.mockResolvedValue({etag: '"v1"'});
});
afterEach(() => cleanup());

describe('DEMUS read-only detail header fallback', () => {
    it('shows source values explicitly marked DEMUS when current values are absent', async () => {
        show();
        await waitFor(() => expect(header()).toHaveAttribute('data-predmet', 'kredenc kuchyĹskĂˇ (DEMUS)'));
        expect(header()).toHaveAttribute('data-fond', 'nĂˇbytek (DEMUS)');
        expect(header()).toHaveAttribute('data-titul', 'HistorickĂ˝ titul (DEMUS)');
        expect(mocks.sourceInventory).toHaveBeenCalledTimes(1);
        expect(mocks.curatorRecord).toHaveBeenCalledTimes(1);
    });

    it('preserves genuine current assertions when they exist', async () => {
        show({fond: 'SouÄŤasnĂ˝ fond', predmet: 'SouÄŤasnĂ˝ pĹ™edmÄ›t', titul: 'SouÄŤasnĂ˝ titul'});
        await waitFor(() => expect(mocks.sourceInventory).toHaveBeenCalledTimes(1));
        expect(header()).toHaveAttribute('data-fond', 'SouÄŤasnĂ˝ fond');
        expect(header()).toHaveAttribute('data-predmet', 'SouÄŤasnĂ˝ pĹ™edmÄ›t');
        expect(header()).toHaveAttribute('data-titul', 'SouÄŤasnĂ˝ titul');
    });

    it('does not show evidence from a mismatched item revision', async () => {
        mocks.curatorRecord.mockResolvedValue({etag: '"v2"'});
        show();
        await waitFor(() => expect(mocks.curatorRecord).toHaveBeenCalledTimes(1));
        expect(header()).toHaveAttribute('data-predmet', '');
        expect(header()).toHaveAttribute('data-fond', '');
    });

    it('does not invent values when the source fields are NULL or empty', async () => {
        mocks.sourceInventory.mockResolvedValue({
            itemVersion: 'v1', fields: {Fond_S: null, Predmet_S: '', Titul_S: null},
        });
        show();
        await waitFor(() => expect(mocks.sourceInventory).toHaveBeenCalledTimes(1));
        expect(header()).toHaveAttribute('data-fond', '');
        expect(header()).toHaveAttribute('data-predmet', '');
        expect(header()).toHaveAttribute('data-titul', '');
    });

    it('preserves legacy rendering without requiring any auth/catalog provider', () => {
        mocks.auth.mockImplementation(() => {throw new Error('Unexpected useAuth call');});
        mocks.catalog.mockImplementation(() => {throw new Error('Unexpected useCatalog call');});
        render(<OriginalPermanentIdentificationHeader {...(base as any)} readHistorical={false} itemId={3}/>);
        expect(header()).toHaveAttribute('data-predmet', '');
        expect(mocks.auth).not.toHaveBeenCalled();
        expect(mocks.catalog).not.toHaveBeenCalled();
        expect(mocks.sourceInventory).not.toHaveBeenCalled();
    });

    it('does not retain previous record values while a different item is loading', async () => {
        const view = show();
        await waitFor(() => expect(header()).toHaveAttribute('data-predmet', 'kredenc kuchyĹskĂˇ (DEMUS)'));
        mocks.sourceInventory.mockImplementation(() => new Promise(() => {}));
        view.rerender(<OriginalPermanentIdentificationHeader {...(base as any)} itemId={4} readHistorical={true}/>);
        expect(header()).toHaveAttribute('data-predmet', '');
        expect(header()).toHaveAttribute('data-fond', '');
    });
});
