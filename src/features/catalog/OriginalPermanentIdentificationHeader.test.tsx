import React from 'react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {cleanup, render, screen, waitFor} from '@testing-library/react';
import OriginalPermanentIdentificationHeader from './OriginalPermanentIdentificationHeader';

const mocks = vi.hoisted(() => ({
    auth: vi.fn(), catalog: vi.fn(), sourceInventory: vi.fn(), curatorRecord: vi.fn(),sourceHistory:vi.fn(),
}));

vi.mock('../../components/AuthContext', () => ({useAuth: mocks.auth}));
vi.mock('./CatalogContext', () => ({useCatalog: mocks.catalog}));
vi.mock('../scoped/scopedApi', () => ({
    scopedApi: () => ({
        sourceInventory: mocks.sourceInventory,sourceHistory:mocks.sourceHistory,
        curatorRecord: mocks.curatorRecord,
    }),
}));
vi.mock('../../components/PermanentIdentificationHeader', () => ({
    default: ({fond, predmet, titul,autor,datace,popis,accessionNumber}: {fond?: string | null; predmet?: string | null; titul?: string | null;autor?:string|null;datace?:string|null;popis?:string|null;accessionNumber?:string|null}) => (
        <div data-accession={accessionNumber??''} data-testid="original-header" data-autor={autor??''} data-datace={datace??''} data-popis={popis??''} data-fond={fond ?? ''} data-predmet={predmet ?? ''} data-titul={titul ?? ''} />
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
afterEach(() => {cleanup();vi.unstubAllEnvs();});

describe('DEMUS read-only detail header fallback', () => {
    it('shows source values explicitly marked DEMUS when current values are absent', async () => {
        show();
        await waitFor(() => expect(header()).toHaveAttribute('data-predmet', 'kredenc kuchyĹskĂˇ'));
        expect(header()).toHaveAttribute('data-fond', 'nĂˇbytek');
        expect(header()).toHaveAttribute('data-titul', 'HistorickĂ˝ titul');
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
        await waitFor(() => expect(header()).toHaveAttribute('data-predmet', 'kredenc kuchyĹskĂˇ'));
        mocks.sourceInventory.mockImplementation(() => new Promise(() => {}));
        view.rerender(<OriginalPermanentIdentificationHeader {...(base as any)} itemId={4} readHistorical={true}/>);
        expect(header()).toHaveAttribute('data-predmet', '');
        expect(header()).toHaveAttribute('data-fond', '');
    });
});

it('uses verified root author/dating/description fields with matching parent ETag and current priority',async()=>{
 vi.stubEnv('VITE_DEMUS_HISTORY_ENABLED','true');vi.stubEnv('VITE_ORIGINAL_SCOPED_TEST','true');
 mocks.sourceHistory.mockResolvedValue({etag:'"v1"',state:'AVAILABLE',items:[{fields:{Autor_S:{kind:'TEXT',value:'Autor DEMUS'},Datace_S:{kind:'TEXT',value:'Datace DEMUS'},Popis_S:{kind:'TEXT',value:'Popis DEMUS'}}}]});
 show({parentEtag:'"v1"',autor:'Současný autor'});await waitFor(()=>expect(header()).toHaveAttribute('data-datace','Datace DEMUS'));expect(header()).toHaveAttribute('data-autor','Současný autor');expect(header()).toHaveAttribute('data-popis','Popis DEMUS');
});

it('retains display-only source fallback in edit mode with the same parent revision',async()=>{
 show({isViewMode:false,parentEtag:'"v1"'});
 await waitFor(()=>expect(header()).toHaveAttribute('data-titul','HistorickĂ˝ titul'));
 expect(header()).toHaveAttribute('data-fond','nĂˇbytek');
});

const summaryValue=(value:string)=>({value,origin:'DEMUS_SOURCE' as const,identity:'generated:'+value});
it('uses the same scoped catalog summary for accession, all authors with roles and dating without changing edit values',async()=>{
 const catalogSummary={author:[summaryValue('Generovaný tiskař [tiskař]'),summaryValue('Generovaný rytec [rytec]')],accessionNumber:[summaryValue('GEN st. sb. f.')],material:[],technique:[],datingText:[summaryValue('19. století')]};
 show({catalogSummary});await waitFor(()=>expect(header()).toHaveAttribute('data-accession','GEN st. sb. f.'));
 expect(header()).toHaveAttribute('data-autor','Generovaný tiskař [tiskař] · Generovaný rytec [rytec]');expect(header()).toHaveAttribute('data-datace','19. století');
});
it('does not revive an explicitly cleared author from root evidence',async()=>{
 vi.stubEnv('VITE_DEMUS_HISTORY_ENABLED','true');vi.stubEnv('VITE_ORIGINAL_SCOPED_TEST','true');
 mocks.sourceHistory.mockResolvedValue({etag:'"v1"',state:'AVAILABLE',items:[{fields:{Autor_S:{kind:'TEXT',value:'MUST NOT REAPPEAR'}}}]});
 show({catalogSummary:{author:[],accessionNumber:[],material:[],technique:[],datingText:[]}});
 await waitFor(()=>expect(mocks.sourceHistory).toHaveBeenCalled());expect(header()).toHaveAttribute('data-autor','');expect(header()).toHaveAttribute('data-accession','');
});
it('does not replace an unsaved current draft with a catalog summary',async()=>{
 show({isViewMode:false,autor:'UNSAVED',accessionNumber:'DRAFT',catalogSummary:{author:[summaryValue('OLD')],accessionNumber:[summaryValue('OLD')],material:[],technique:[]}});
 await waitFor(()=>expect(mocks.sourceInventory).toHaveBeenCalled());expect(header()).toHaveAttribute('data-autor','UNSAVED');expect(header()).toHaveAttribute('data-accession','DRAFT');
});

it('uses the shared summary in an unchanged edit header while the actual input assertions stay separate',async()=>{
 show({isViewMode:false,autor:null,accessionNumber:null,summaryUnchanged:{author:true,accessionNumber:true},catalogSummary:{author:[summaryValue('Source author [printer]')],accessionNumber:[summaryValue('Source accession')],material:[],technique:[]}});
 await waitFor(()=>expect(mocks.sourceInventory).toHaveBeenCalled());expect(header()).toHaveAttribute('data-autor','Source author [printer]');expect(header()).toHaveAttribute('data-accession','Source accession');
});
