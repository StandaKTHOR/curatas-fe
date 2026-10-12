import {render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter, Route, Routes} from 'react-router-dom';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import AdminItemForm from './AdminItemForm';
import MuseumSection from '../components/MuseumSection';
import AcquisitionSection from '../components/AcquisitionSection';
import YearDateInput from '../components/YearDateInput';
import AttachmentCaptionEditor from '../components/AttachmentCaptionEditor';
import * as api from '../lib/api';

vi.mock('../lib/api',async importOriginal => ({...await importOriginal<typeof import('../lib/api')>(),
    getAdminItem:vi.fn(),getMuseumItem:vi.fn(),getDictionaries:vi.fn(),getDictionaryTree:vi.fn(),
    getNextAvailableNumbers:vi.fn(),listAttachments:vi.fn(),listItemImages:vi.fn(),createItem:vi.fn(),updateItem:vi.fn(),
    checkUniqueness:vi.fn(),createMuseumRecord:vi.fn(),updateMuseumRecord:vi.fn(),patchMuseumItem:vi.fn(),
    listMuseumAcquisitions:vi.fn(),updateMuseumAcquisition:vi.fn(),
    patchAttachment:vi.fn(),saveProfessionalRecord:vi.fn(),listProfessionalRecords:vi.fn(),
}));
const editor={itemId:7,etag:'"3"',museumSnapshot:{itemId:7,records:[]}};
const detail={id:7,inventoryNumber:'TEST-7',title:'Testovací předmět',objectType:'Test',description:'',
    dimensions:[],parties:[],imageUrls:[],legacyData:{},_editSession:editor};
beforeEach(()=>{
    vi.clearAllMocks();
    vi.mocked(api.listProfessionalRecords).mockResolvedValue([]);
    editor.etag='"3"';
    vi.mocked(api.getAdminItem).mockResolvedValue({...detail});
    vi.mocked(api.getMuseumItem).mockResolvedValue({itemId:7,records:[]} as never);
    vi.mocked(api.getDictionaries).mockResolvedValue({objectTypes:[],materials:[],techniques:[],funds:[],authors:[]} as never);
    vi.mocked(api.getDictionaryTree).mockResolvedValue([]);
    vi.mocked(api.getNextAvailableNumbers).mockResolvedValue({inventory:'SUGGESTED',accession:'SUGGESTED'});
    vi.mocked(api.listAttachments).mockResolvedValue([]); vi.mocked(api.listItemImages).mockResolvedValue([]);
    vi.mocked(api.checkUniqueness).mockResolvedValue({exists:false} as never);
    vi.mocked(api.createItem).mockResolvedValue({id:7}); vi.mocked(api.updateItem).mockResolvedValue({id:7});
});
const form=(path='/admin/items/edit/7')=>render(<MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/admin/items/edit/:id" element={<AdminItemForm />} />
    <Route path="/admin/items/new" element={<AdminItemForm />} />
</Routes></MemoryRouter>);

describe('Update2 museum workflows',()=>{
    it('does not open professional editors before the consistent parent snapshot is available',async()=>{
        const view=render(<MuseumSection itemId={7} section="origin" snapshotRequired/>);
        expect(screen.getByRole('status')).toHaveTextContent('Čekám na konzistentní verzi');
        expect(screen.queryByLabelText('Místo vzniku')).not.toBeInTheDocument();
        expect(api.getMuseumItem).not.toHaveBeenCalled();
        view.rerender(<MuseumSection itemId={7} section="origin" snapshotRequired editSession={editor}/>);
        expect(await screen.findByLabelText('Místo vzniku')).toBeInTheDocument();
    });
    it('does not assign a newer post-save token to other unsaved professional drafts',async()=>{
        vi.mocked(api.getAdminItem).mockResolvedValueOnce({...detail})
            .mockResolvedValue({...detail,_editSession:{...editor,etag:'"5"'}});
        vi.mocked(api.updateItem).mockImplementation(async(_id,_payload,session)=>{session!.etag='"4"';return {id:7};});
        form();await screen.findByDisplayValue('Testovací předmět');
        await userEvent.type(screen.getByLabelText(/Název sbírkového předmětu/),' — místní změna');
        await userEvent.click(screen.getByRole('button',{name:'Uložit'}));
        expect(await screen.findByText(/Novější verzi nelze přiřadit/)).toBeInTheDocument();
        expect(editor.etag).toBe('"4"');
        expect(screen.getByLabelText(/Název sbírkového předmětu/)).toHaveValue('Testovací předmět — místní změna');
        expect(screen.getByText(/Hlavní údaje byly uloženy/)).toBeInTheDocument();
    });
    it('keeps attachment caption input when the API rejects its edit',async()=>{
        vi.mocked(api.patchAttachment).mockRejectedValue(new api.ApiError(403,'Zápis odmítnut'));
        const reload=vi.fn();
        render(<AttachmentCaptionEditor itemId={7} attachmentId={12} caption="Původní popis" onSaved={reload}/>);
        await userEvent.clear(screen.getByLabelText('Popis přílohy 12'));
        await userEvent.type(screen.getByLabelText('Popis přílohy 12'),'Nový popis');
        await userEvent.click(screen.getByRole('button',{name:'Uložit popis přílohy'}));
        expect(await screen.findByText('Zápis odmítnut')).toBeInTheDocument();
        expect(screen.getByLabelText('Popis přílohy 12')).toHaveValue('Nový popis');
        expect(reload).not.toHaveBeenCalled();
        expect(screen.queryByText('Popis přílohy uložen.')).not.toBeInTheDocument();
    });
    it('does not submit suggested numbers; creates from explicit three-part identity and title OR type',async()=>{
        form('/admin/items/new');
        const number=await screen.findByRole('textbox',{name:'Inventární číslo: Hlavní číslo'});
        expect(number).toHaveValue('');
        await userEvent.type(number,'123');
        await userEvent.type(screen.getByRole('textbox',{name:'Inventární číslo: Prefix'}),'TEST-');
        await userEvent.type(screen.getByRole('textbox',{name:'Inventární číslo: Postfix'}),'/A');
        await userEvent.type(screen.getByLabelText(/Název sbírkového předmětu/),'Explicitní titul');
        await userEvent.click(screen.getByRole('button',{name:'Uložit'}));
        await waitFor(()=>expect(api.createItem).toHaveBeenCalled());
        expect(vi.mocked(api.createItem).mock.calls[0][0]).toMatchObject({inventoryNumber:'TEST-123/A',title:'Explicitní titul',accessionNumber:''});
        expect(vi.mocked(api.createItem).mock.calls[0][0]).not.toHaveProperty('legacyData');
    });
    it('keeps entered fields and shows stale-write errors with a comparison action',async()=>{
        vi.mocked(api.updateItem).mockRejectedValue(new api.ApiError(412,'Záznam se změnil; zadání zachováno.'));
        form(); await screen.findByDisplayValue('Testovací předmět');
        await userEvent.type(screen.getByLabelText(/Název sbírkového předmětu/),' — moje změna');
        await userEvent.click(screen.getByRole('button',{name:'Uložit'}));
        expect(await screen.findByText(/zadání zachováno/)).toBeInTheDocument();
        expect(screen.getByLabelText(/Název sbírkového předmětu/)).toHaveValue('Testovací předmět — moje změna');
        expect(screen.getByRole('button',{name:'Porovnat s aktuálním záznamem'})).toBeInTheDocument();
        expect(screen.queryByText('Změny byly úspěšně uloženy.')).not.toBeInTheDocument();
        expect(vi.mocked(api.updateItem).mock.calls[0][2]).toBe(editor);
    });
    it('preserves professional drafts when their cards are unmounted',async()=>{
        const drafts={current:{}};
        const first=render(<MuseumSection itemId={7} section="origin" drafts={drafts} editSession={editor}/>);
        await userEvent.type(await screen.findByLabelText('Místo vzniku'),'Brno'); first.unmount();
        render(<MuseumSection itemId={7} section="origin" drafts={drafts} editSession={editor}/>);
        expect(await screen.findByLabelText('Místo vzniku')).toHaveValue('Brno');
    });
    it.each([
        ['documentation','Dokument / název'],['determination','Určený předmět'],['classification','Systematická kategorie'],
        ['manipulation','Inventární revize'],['action','Prezentace'],['iso','Kód ISO'],['origin','Místo vzniku'],
    ] as const)('offers verified fields for %s and disables writes in read-only mode',async(section,label)=>{
        render(<MuseumSection itemId={7} section={section} readOnly editSession={editor}/>);
        expect(await screen.findByLabelText(label)).toBeDisabled();
        expect(screen.getByRole('button',{name:'Uložit záznam'})).toBeDisabled();
    });
    it('preserves source timestamps and sends numeric origin years',async()=>{
        vi.mocked(api.saveProfessionalRecord).mockResolvedValue({} as never);
        render(<MuseumSection itemId={7} section="origin" editSession={editor}/>);
        await userEvent.type(await screen.findByLabelText('Rok od'),'1880');
        await userEvent.click(screen.getByRole('button',{name:'Uložit záznam'}));
        expect(api.saveProfessionalRecord).toHaveBeenCalledWith(7,'ORIGIN',{fields:{kind:'ORIGIN',RokOd_VZ:1880}},editor,undefined);
    });
    it('clears acquisition dates explicitly while preserving other properties',async()=>{
        const row={id:1,accessionNumber:'A1',acquisitionDate:'1900-01-01',acquiredFrom:'Původní vlastník',legacyData:null};
        vi.mocked(api.listMuseumAcquisitions).mockResolvedValue([row] as never);
        render(<AcquisitionSection itemId={7} editSession={editor}/>);
        await userEvent.click(await screen.findByRole('button',{name:'Upravit'}));
        await userEvent.clear(screen.getByLabelText('Datum akvizice'));
        await userEvent.click(screen.getByRole('button',{name:'Uložit akvizici'}));
        expect(api.updateMuseumAcquisition).toHaveBeenCalledWith(7,1,expect.objectContaining({acquisitionDate:null,acquiredFrom:'Původní vlastník'}),editor);
    });
    it('changes the year with keyboard arrows and clamps leap days',async()=>{
        const change=vi.fn();render(<YearDateInput id="date" label="Datum" value="2024-02-29" onChange={change}/>);
        await userEvent.clear(screen.getByRole('spinbutton',{name:'Rok: Datum'}));
        await userEvent.type(screen.getByRole('spinbutton',{name:'Rok: Datum'}),'2023');
        expect(change).toHaveBeenLastCalledWith('2023-02-28');
    });
});
