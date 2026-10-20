import {act, render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {createMemoryRouter, Link, RouterProvider} from 'react-router-dom';
import {beforeEach, afterEach, describe, expect, it, vi} from 'vitest';
import AdminItemForm from './AdminItemForm';
import * as api from '../lib/api';
vi.mock('../lib/api', async original => ({...await original<typeof import('../lib/api')>(),
    getAdminItem:vi.fn(),getMuseumItem:vi.fn(),getDictionaries:vi.fn(),getDictionaryTree:vi.fn(),
    listAttachments:vi.fn(),listItemImages:vi.fn(),checkUniqueness:vi.fn(),getNextAvailableNumbers:vi.fn(),
    updateItem:vi.fn(),patchMuseumItem:vi.fn(),createItem:vi.fn(),listProfessionalRecords:vi.fn(),listMuseumAcquisitions:vi.fn(),createMuseumAcquisition:vi.fn(),
}));
let saved: any;
let version: number;
const museum = () => ({itemId:7,records:[],legacyArchived:saved.legacyArchived});
const snapshot = () => ({...saved,_editSession:{itemId:7,etag:'"'+version+'"',museumSnapshot:museum()}});
beforeEach(() => {
    vi.resetAllMocks(); sessionStorage.clear(); version=3;
    saved={id:7,inventoryNumber:'BATCH-7',accessionNumber:'',title:'Původní název',objectType:'Test',
        description:'',published:false,legacyArchived:false,dimensions:[],parties:[],imageUrls:[],legacyData:{},
        createdByUser:'creator',createdAt:'2026-10-13T10:00:00Z',modifiedByUser:'curator',lastModifiedAt:'2026-10-14T10:00:00Z'};
    vi.mocked(api.getAdminItem).mockImplementation(async () => snapshot());
    vi.mocked(api.getMuseumItem).mockImplementation(async () => museum() as any);
    vi.mocked(api.getDictionaries).mockResolvedValue({} as any);
    vi.mocked(api.getDictionaryTree).mockResolvedValue([]);
    vi.mocked(api.listAttachments).mockResolvedValue([]); vi.mocked(api.listItemImages).mockResolvedValue([]);
    vi.mocked(api.listProfessionalRecords).mockResolvedValue([]); vi.mocked(api.listMuseumAcquisitions).mockResolvedValue([]);
    vi.mocked(api.checkUniqueness).mockResolvedValue({exists:false} as any);
    vi.mocked(api.getNextAvailableNumbers).mockResolvedValue({inventory:'',accession:''});
    vi.mocked(api.updateItem).mockImplementation(async (_id,body,editor) => {
        Object.assign(saved,body); version++; editor!.etag='"'+version+'"'; return {id:7};
    });
    vi.mocked(api.patchMuseumItem).mockImplementation(async (_id,body,editor) => {
        Object.assign(saved,body); version++; editor!.etag='"'+version+'"'; return museum() as any;
    });
    vi.spyOn(window,'confirm').mockReturnValue(false);
});
afterEach(() => vi.restoreAllMocks());
function mount(start='/admin/items/edit/7') {
    const router=createMemoryRouter([
        {path:'/admin/items/edit/:id',element:<><Link to="/other">Jiné menu</Link><AdminItemForm/></>},
        {path:'/admin/items/new',element:<AdminItemForm/>},
        {path:'/admin/items',element:<p>Seznam</p>}, {path:'/other',element:<p>Jiná stránka</p>},
    ],{initialEntries:['/other',start],initialIndex:1});
    render(<RouterProvider router={router}/>);return router;
}
const save = () => userEvent.click(screen.getByRole('button',{name:'Uložit'}));
const back = () => userEvent.click(screen.getAllByRole('button',{name:/Zpět na seznam/})[0]);
const unload = () => {const event=new Event('beforeunload',{cancelable:true});window.dispatchEvent(event);return event.defaultPrevented;};
import AcquisitionSection from '../components/AcquisitionSection';
describe('preflight edge cases',()=>{
    it('does not carry an abandoned basic draft into another item',async()=>{
        vi.mocked(api.getAdminItem).mockImplementation(async id=>({...saved,id:Number(id),inventoryNumber:'BATCH-'+id,
            _editSession:{itemId:Number(id),etag:'"3"',museumSnapshot:{itemId:Number(id),records:[],legacyArchived:false}}}));
        const router=mount();await screen.findByDisplayValue('Původní název');
        await userEvent.click(await screen.findByLabelText('Archiv'));
        vi.mocked(window.confirm).mockReturnValue(true);
        await act(async()=>{await router.navigate('/admin/items/edit/8');});
        await waitFor(()=>expect(screen.getAllByText(/BATCH-8/).length).toBeGreaterThan(0));
        expect(screen.getByLabelText('Archiv')).not.toBeChecked();
        await save();expect(api.updateItem).not.toHaveBeenCalled();
    });
    it('does not create a duplicate acquisition after a committed write and failed refresh',async()=>{
        const session={itemId:7,etag:'"3"'};
        vi.mocked(api.createMuseumAcquisition).mockImplementation(async()=>{session.etag='"4"';return {id:55,message:'Proof'} as any;});
        vi.mocked(api.listMuseumAcquisitions).mockResolvedValueOnce([])
            .mockRejectedValueOnce(new Error('Refresh failed')).mockResolvedValue([]);
        const drafts={current:{}};const view=render(<AcquisitionSection itemId={7} editSession={session} drafts={drafts}/>);
        await userEvent.type(await screen.findByLabelText('Vzkaz'),'Proof');
        await userEvent.click(screen.getByRole('button',{name:'Uložit akvizici'}));
        await screen.findByText(/Akvizice byla uložena; obnovení dat selhalo: Refresh failed/);
        expect(session.etag).toBe('"4"');expect((drafts.current as any).acquisition.editing.id).toBe(55);
        view.unmount();render(<AcquisitionSection itemId={7} editSession={session} drafts={drafts}/>);
        expect(screen.getByLabelText('Vzkaz')).toHaveValue('Proof');
        await userEvent.click(screen.getByRole('button',{name:'Uložit akvizici'}));
        await waitFor(()=>expect(api.createMuseumAcquisition).toHaveBeenCalledTimes(1));
    });
});

import {getRouterBasename} from '../lib/router';
import EditorNavigationGuard from '../components/EditorNavigationGuard';
it('preflight subpath router preserves basename and blocks dirty POP',async()=>{
    const router=createMemoryRouter([
        {path:'/editor',element:<><EditorNavigationGuard isDirty={()=>true} isSaving={()=>false}/><Link to="/other">Subpath menu</Link></>},
        {path:'/other',element:<p>Subpath destination</p>},
    ],{basename:getRouterBasename('/uat/'),initialEntries:['/uat/other','/uat/editor'],initialIndex:1});
    render(<RouterProvider router={router}/>);
    expect(screen.getByRole('link',{name:'Subpath menu'})).toHaveAttribute('href','/uat/other');
    await act(async()=>{await router.navigate(-1);});
    expect(router.state.location.pathname).toBe('/uat/editor');
    vi.mocked(window.confirm).mockReturnValue(true);await userEvent.click(screen.getByRole('link',{name:'Subpath menu'}));
    expect(router.state.location.pathname).toBe('/uat/other');
});

describe('BATCH 1.1 identity and create outcomes',()=>{
    const identity = (id:number) => ({...saved,id,inventoryNumber:'BATCH-'+id,_editSession:{itemId:id,etag:'"3"',museumSnapshot:{itemId:id,records:[],legacyArchived:false}}});
    it('discards A drafts before opening a new item',async()=>{
        const router=mount(); await screen.findByDisplayValue('Původní název');await userEvent.click(await screen.findByLabelText('Archiv'));
        vi.mocked(window.confirm).mockReturnValue(true);await act(async()=>{await router.navigate('/admin/items/new');});
        expect(screen.getByLabelText(/Název sbírkového předmětu/)).toHaveValue('');expect(api.updateItem).not.toHaveBeenCalled();
    });
    it('ignores an older load completed after B and writes only B archive',async()=>{
        let finish!:(value:any)=>void;vi.mocked(api.getAdminItem).mockImplementation(id=>Number(id)===7?new Promise(resolve=>{finish=resolve;}):Promise.resolve(identity(8)));
        const router=mount();await waitFor(()=>expect(api.getAdminItem).toHaveBeenCalledWith('7'));
        await act(async()=>{await router.navigate('/admin/items/edit/8');});await screen.findByDisplayValue('Původní název');
        await act(async()=>finish({...identity(7),title:'Late A'}));expect(screen.queryByDisplayValue('Late A')).not.toBeInTheDocument();
        await userEvent.click(await screen.findByLabelText('Archiv'));await save();
        expect(api.updateItem).toHaveBeenCalledWith(8,expect.objectContaining({legacyArchived:true}),expect.objectContaining({itemId:8}));
    });
    it('retains basic drafts across tabs of the same item',async()=>{
        mount();await screen.findByDisplayValue('Původní název');await userEvent.click(await screen.findByLabelText('Archiv'));
        const buttons=screen.getAllByRole('button');const tab=buttons.find(b=>b.textContent?.trim()==='Akvizice');expect(tab).toBeTruthy();await userEvent.click(tab!);
        await userEvent.click(screen.getByRole('button',{name:'Základ'}));expect(await screen.findByLabelText('Archiv')).toBeChecked();
    });
    it.each(['success','rejected','uncertain'])('handles acquisition create %s',async outcome=>{
        const session={itemId:7,etag:'"3"'};const drafts={current:{}};
        if(outcome==='success')vi.mocked(api.createMuseumAcquisition).mockImplementation(async()=>{session.etag='"4"';return {id:55,message:'Proof'} as any;});
        else vi.mocked(api.createMuseumAcquisition).mockRejectedValue(outcome==='rejected'?new api.ApiError(400,'CREATE rejected'):new TypeError('Connection lost'));
        render(<AcquisitionSection itemId={7} editSession={session} drafts={drafts}/>);await userEvent.type(await screen.findByLabelText('Vzkaz'),'Proof');
        await userEvent.click(screen.getByRole('button',{name:'Uložit akvizici'}));
        if(outcome==='success'){await screen.findByText('Akvizice uložena.');expect(session.etag).toBe('"4"');expect(screen.getByLabelText('Vzkaz')).toHaveValue('');}
        else {await screen.findByText(outcome==='rejected'?'CREATE rejected':/Výsledek vytvoření není potvrzen/);expect(screen.getByLabelText('Vzkaz')).toHaveValue('Proof');
            await userEvent.click(screen.getByRole('button',{name:'Uložit akvizici'}));expect(api.createMuseumAcquisition).toHaveBeenCalledTimes(outcome==='rejected'?2:1);
            if(outcome==='uncertain'){await userEvent.click(screen.getByRole('button',{name:'Obnovit serverový seznam'}));await screen.findByText(/Serverový seznam byl načten/);await userEvent.click(screen.getByRole('button',{name:'Uložit akvizici'}));expect(api.createMuseumAcquisition).toHaveBeenCalledTimes(1);}
        }
    });
    it('uses root router links and configured API origin',async()=>{
        expect(getRouterBasename('/')).toBe('/');expect(api.resolveApiUrl('/api/v1/items/7')).toBe(api.API_BASE+'/api/v1/items/7');
        const router=createMemoryRouter([{path:'/editor',element:<Link to='/admin/items/edit/7'>Detail</Link>},{path:'/admin/items/edit/:id',element:<p>Detail opened</p>}],{basename:getRouterBasename('/'),initialEntries:['/editor']});
        render(<RouterProvider router={router}/>);expect(screen.getByRole('link',{name:'Detail'})).toHaveAttribute('href','/admin/items/edit/7');await userEvent.click(screen.getByRole('link',{name:'Detail'}));await screen.findByText('Detail opened');
    });
});

it('retains A drafts when discarding navigation is rejected',async()=>{
 const router=mount();await screen.findByDisplayValue('Původní název');await userEvent.click(await screen.findByLabelText('Archiv'));
 await act(async()=>{await router.navigate('/admin/items/edit/8');});expect(router.state.location.pathname).toBe('/admin/items/edit/7');expect(screen.getByLabelText('Archiv')).toBeChecked();expect(api.getAdminItem).not.toHaveBeenCalledWith('8');
});
