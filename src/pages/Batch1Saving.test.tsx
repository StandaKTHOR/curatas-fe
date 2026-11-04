import { invalidateHierarchy } from '../components/ThreeLevelDictionarySelect';
import {act, render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {createMemoryRouter, Link, RouterProvider} from 'react-router-dom';
import {beforeEach, afterEach, describe, expect, it, vi} from 'vitest';
import AdminItemForm from './AdminItemForm';
import * as api from '../lib/api';
vi.mock('../lib/api', async original => ({...await original<typeof import('../lib/api')>(),
    getAdminItem:vi.fn(),getMuseumItem:vi.fn(),getDictionaries:vi.fn(),getDictionaryTree:vi.fn(),
    listAttachments:vi.fn(),listItemImages:vi.fn(),checkUniqueness:vi.fn(),getNextAvailableNumbers:vi.fn(),
    updateItem:vi.fn(),patchMuseumItem:vi.fn(),createItem:vi.fn(),listProfessionalRecords:vi.fn(),listMuseumAcquisitions:vi.fn(),
}));
const historical=vi.hoisted(()=>({data:null as any}));
vi.mock('../features/catalog/useOriginalHistoricalData',async original=>({...await original<typeof import('../features/catalog/useOriginalHistoricalData')>(),useOriginalHistoricalData:()=>historical.data}));
const fullHistory=vi.hoisted(()=>({data:null as any}));
vi.mock('../features/catalog/useHistoricalRows',async original=>({...await original<typeof import('../features/catalog/useHistoricalRows')>(),useHistoricalRows:(_id:number,table:string)=>({enabled: table==='Sbirky'&&!!fullHistory.data,page:table==='Sbirky'?fullHistory.data:null,more:()=>{}})}));
let saved: any;
let version: number;
const museum = () => ({itemId:7,records:[],legacyArchived:saved.legacyArchived});
const snapshot = () => ({...saved,_editSession:{itemId:7,etag:'"'+version+'"',museumSnapshot:museum()}});
beforeEach(() => {
    vi.resetAllMocks(); historical.data=null; fullHistory.data=null; invalidateHierarchy(); sessionStorage.clear(); version=3;
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
        {path:'/admin/items/view/:id',element:<AdminItemForm readOnly/>},
        {path:'/admin/items',element:<p>Seznam</p>}, {path:'/other',element:<p>Jiná stránka</p>},
    ],{initialEntries:['/other',start],initialIndex:1});
    render(<RouterProvider router={router}/>);return router;
}
const save = () => userEvent.click(screen.getByRole('button',{name:'Uložit'}));
const back = () => userEvent.click(screen.getAllByRole('button',{name:/Zpět na seznam/})[0]);
const unload = () => {const event=new Event('beforeunload',{cancelable:true});window.dispatchEvent(event);return event.defaultPrevented;};
describe('BATCH 1 saving and navigation', () => {
    it('saves Archiv and publication together, reloads them and leaves without a false warning', async () => {
        const router=mount(); await screen.findByDisplayValue('Původní název');
        await userEvent.click(await screen.findByLabelText('Archiv'));await userEvent.click(screen.getByLabelText('Zveřejněno'));
        expect(unload()).toBe(true);await save(); await screen.findByText(/Změny byly úspěšně uloženy/);
        expect(api.updateItem).toHaveBeenCalledWith(7,expect.objectContaining({legacyArchived:true,published:true}),expect.anything());
        expect(screen.getByLabelText('Archiv')).toBeChecked();expect(screen.getByLabelText('Zveřejněno')).toBeChecked();
        expect(unload()).toBe(false);await back();expect(router.state.location.pathname).toBe('/admin/items');expect(window.confirm).not.toHaveBeenCalled();
    });
    it('saves only the section and retains a dirty main field until its own save', async () => {
        mount();await screen.findByDisplayValue('Původní název');
        await userEvent.type(screen.getByLabelText(/Název sbírkového předmětu/),' lokální');
        await userEvent.click(await screen.findByLabelText('Archiv'));
        await userEvent.click(screen.getByRole('button',{name:'Uložit sekci'}));
        await waitFor(()=>expect(api.patchMuseumItem).toHaveBeenCalled());
        expect(screen.getByLabelText(/Název sbírkového předmětu/)).toHaveValue('Původní název lokální');expect(unload()).toBe(true);
        await save();await screen.findByText(/Změny byly úspěšně uloženy/);expect(unload()).toBe(false);
        expect(vi.mocked(api.updateItem).mock.calls[0][2]?.etag).toBe('"5"');
    });
    it('does not write when there are no changes, including after a successful save', async () => {
        mount();await screen.findByDisplayValue('Původní název');await save();
        expect(api.updateItem).not.toHaveBeenCalled();expect(unload()).toBe(false);
        await userEvent.click(screen.getByLabelText('Zveřejněno'));await save();await screen.findByText(/Změny byly úspěšně uloženy/);
        await save();expect(api.updateItem).toHaveBeenCalledTimes(1);expect(unload()).toBe(false);
    });
    it.each([412,500])('retains main and section drafts on backend error %s', async status => {
        vi.mocked(api.updateItem).mockRejectedValue(new api.ApiError(status,'Odmítnuto serverem'));
        const router=mount();await screen.findByDisplayValue('Původní název');await userEvent.click(await screen.findByLabelText('Archiv'));
        await userEvent.type(screen.getByLabelText(/Název sbírkového předmětu/),' moje');await save();
        await screen.findByText(/Odmítnuto serverem/);expect(screen.getByLabelText('Archiv')).toBeChecked();expect(unload()).toBe(true);
        expect(screen.getByLabelText(/Název sbírkového předmětu/)).toHaveValue('Původní název moje');
        await back();expect(router.state.location.pathname).toBe('/admin/items/edit/7');
        expect(screen.queryByText('Změny byly úspěšně uloženy.')).not.toBeInTheDocument();
    });
    it('blocks menu links and browser history when a draft is dirty', async () => {
        const router=mount();await screen.findByDisplayValue('Původní název');await userEvent.click(await screen.findByLabelText('Archiv'));
        await userEvent.click(screen.getByRole('link',{name:'Jiné menu'}));expect(router.state.location.pathname).toBe('/admin/items/edit/7');
        await act(async()=>{await router.navigate(-1);});expect(router.state.location.pathname).toBe('/admin/items/edit/7');
        expect(window.confirm).toHaveBeenCalledTimes(2);
        vi.mocked(window.confirm).mockReturnValue(true);await userEvent.click(screen.getByRole('link',{name:'Jiné menu'}));
        expect(router.state.location.pathname).toBe('/other');
    });
    it('prevents duplicate writes and navigation while a save is pending', async () => {
        let finish!: () => void;
        vi.mocked(api.updateItem).mockImplementation((_id,body,editor)=>new Promise(resolve=>{finish=()=>{Object.assign(saved,body);version++;editor!.etag='"'+version+'"';resolve({id:7});};}));
        const router=mount();await screen.findByDisplayValue('Původní název');await userEvent.click(screen.getByLabelText('Zveřejněno'));
        await save();expect(screen.getByLabelText('Zveřejněno')).toBeDisabled();await back();expect(router.state.location.pathname).toBe('/admin/items/edit/7');
        expect(api.updateItem).toHaveBeenCalledTimes(1);await act(async()=>finish());await screen.findByText(/Změny byly úspěšně uloženy/);
    });
    it('shows system audit separately from historical DEMUS fields', async () => {
        saved.legacyCreatedBy='Historical DEMUS author'; mount();await screen.findByDisplayValue('Původní název');
        expect(screen.getByText('Založil v MESonline: creator')).toBeInTheDocument();
        expect(screen.getByText('Zapsal v DEMUS: Historical DEMUS author')).toBeInTheDocument();
        expect(screen.getByText(/Poslední změna v MESonline: 2026-10-14/)).toBeInTheDocument();
    });
    it('creates an item and navigates to its saved editor without a dirty warning', async () => {
        vi.mocked(api.createItem).mockResolvedValue({id:7});const router=mount('/admin/items/new');
        await userEvent.type(await screen.findByRole('textbox',{name:'Inventární číslo: Hlavní číslo'}),'7');
        await userEvent.type(screen.getByLabelText(/Název sbírkového předmětu/),'Nový záznam');await save();
        await waitFor(()=>expect(router.state.location.pathname).toBe('/admin/items/edit/7'));
        expect(api.createItem).toHaveBeenCalledTimes(1);expect(window.confirm).not.toHaveBeenCalled();
    });
});

const hierarchyFixture = () => {
    vi.mocked(api.getDictionaryTree).mockImplementation(async type => [{ id: type === 'MATERIAL' ? 10 : 40, code: null, label: 'Synthetic root', children: [
        { id: type === 'MATERIAL' ? 20 : 50, code: null, label: 'Synthetic middle', children: [
            { id: type === 'MATERIAL' ? 30 : 60, code: null, label: 'Synthetic leaf', children: [] } ] } ] }]);
};
it('BATCH 2 saves hierarchy with normal fields, reloads a clean draft and keeps the historical text', async () => {
    hierarchyFixture(); saved.material='Unmapped DEMUS material'; saved.technique='Unmapped DEMUS technique';
    mount(); await screen.findByDisplayValue('Původní název');
    await userEvent.type(screen.getByLabelText(/Název sbírkového předmětu/),' nový');
    await userEvent.click(screen.getByRole('button', { name: 'MatTech' }));
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Materiál (Číselník) — úroveň 1' })).toBeEnabled());
    for (const [label, ids] of [['Materiál', [10,20,30]], ['Technika', [40,50,60]]] as const) {
        for (let level=0;level<3;level++) await userEvent.selectOptions(screen.getByRole('combobox', { name: `${label} (Číselník) — úroveň ${level+1}` }), String(ids[level]));
    }
    expect(unload()).toBe(true); await save(); await screen.findByText(/Změny byly úspěšně uloženy/);
    expect(api.updateItem).toHaveBeenCalledWith(7, expect.objectContaining({title:'Původní název nový', materialDictionaryId:30, techniqueDictionaryId:60}),expect.anything());
    expect(saved.material).toBe('Unmapped DEMUS material');expect(saved.technique).toBe('Unmapped DEMUS technique');
    expect(screen.getByRole('combobox',{name:'Materiál (Číselník) — úroveň 3'})).toHaveValue('30');expect(unload()).toBe(false);
    await save();expect(api.updateItem).toHaveBeenCalledTimes(1);
});
it('BATCH 2 leaves unknown text and binding untouched during an unrelated save',async()=>{
    saved.material='Unmapped DEMUS material'; saved.materialDictionaryId=99;hierarchyFixture();
    mount();await screen.findByDisplayValue('Původní název');await userEvent.click(screen.getByLabelText('Zveřejněno'));
    await save();await screen.findByText(/Změny byly úspěšně uloženy/);
    expect(saved.material).toBe('Unmapped DEMUS material');expect(saved.materialDictionaryId).toBe(99);expect(unload()).toBe(false);
});
it('BATCH 2 retains hierarchy draft on a stale-version conflict',async()=>{
    hierarchyFixture();vi.mocked(api.updateItem).mockRejectedValue(new api.ApiError(412,'Konflikt verzí'));
    mount();await screen.findByDisplayValue('Původní název');await userEvent.click(screen.getByRole('button',{name:'MatTech'}));
    await waitFor(()=>expect(screen.getByRole('combobox',{name:'Materiál (Číselník) — úroveň 1'})).toBeEnabled());
    await userEvent.selectOptions(screen.getByRole('combobox',{name:'Materiál (Číselník) — úroveň 1'}),'10');
    await save();await screen.findByText(/Konflikt verzí/);expect(unload()).toBe(true);
    expect(screen.getByRole('combobox',{name:'Materiál (Číselník) — úroveň 1'})).toHaveValue('10');
});
it('BATCH 2.1 preserves null dictionary IDs after a basic section save',async()=>{
    saved.materialDictionaryId=null;saved.techniqueDictionaryId=null;saved.material='Historical text without FK';
    hierarchyFixture();mount();await screen.findByDisplayValue('Původní název');
    await userEvent.click(screen.getByLabelText('Archiv'));
    await userEvent.click(screen.getByRole('button',{name:'Uložit sekci'}));
    await waitFor(()=>expect(api.getAdminItem).toHaveBeenCalledTimes(2));
    await userEvent.click(screen.getByRole('button',{name:'MatTech'}));
    await waitFor(()=>expect(screen.getByRole('combobox',{name:'Materiál (Číselník) — úroveň 1'})).toBeEnabled());
    expect(screen.queryByText(/Stávající vazba #/)).not.toBeInTheDocument();
    expect(screen.getByText(/Původní text: Historical text without FK/)).toBeInTheDocument();
    expect(unload()).toBe(false);
});
it.each(['Uložit','Uložit sbírkový předmět'])('BATCH 2.2 validates a missing inventory at %s in Czech',async button=>{
    mount('/admin/items/new');await userEvent.type(await screen.findByLabelText(/Název sbírkového předmětu/),'Create proof');
    await userEvent.click(screen.getByRole('button',{name:button}));
    expect(await screen.findByText(/Vyplňte inventární číslo na kartě Základ/)).toBeInTheDocument();
    expect(screen.getByRole('textbox',{name:'Inventární číslo: Hlavní číslo'})).toHaveAttribute('aria-invalid','true');
    expect(api.createItem).not.toHaveBeenCalled();expect(unload()).toBe(true);
});
it('BATCH 2.2 confirms server CREATE after GET and returns without a dirty warning',async()=>{
    vi.mocked(api.createItem).mockImplementation(async body=>{Object.assign(saved,body);return {id:7};});
    const router=mount('/admin/items/new');await userEvent.type(await screen.findByRole('textbox',{name:'Inventární číslo: Hlavní číslo'}),'NEW-7');
    await userEvent.type(screen.getByLabelText(/Název sbírkového předmětu/),'Created title');await save();
    await screen.findByText(/Předmět byl úspěšně založen/);expect(router.state.location.pathname).toBe('/admin/items/edit/7');expect(unload()).toBe(false);
    await back();expect(window.confirm).not.toHaveBeenCalled();expect(api.createItem).toHaveBeenCalledTimes(1);
});
it('BATCH 2.2 blocks duplicate main CREATE after an uncertain server response',async()=>{
    vi.mocked(api.createItem).mockRejectedValue(new TypeError('Connection lost'));
    mount('/admin/items/new');await userEvent.type(await screen.findByRole('textbox',{name:'Inventární číslo: Hlavní číslo'}),'NEW-7');
    await userEvent.type(screen.getByLabelText(/Název sbírkového předmětu/),'Proof');await save();await screen.findByText(/Výsledek vytvoření není potvrzen/);
    await save();expect(api.createItem).toHaveBeenCalledTimes(1);expect(screen.queryByText(/Předmět byl úspěšně založen/)).not.toBeInTheDocument();expect(unload()).toBe(true);
});
it('BATCH 2.2 never repeats CREATE when the saved editor refresh fails',async()=>{
    vi.mocked(api.createItem).mockResolvedValue({id:7});vi.mocked(api.getAdminItem).mockRejectedValue(new api.ApiError(500,'GET failed'));
    const router=mount('/admin/items/new');await userEvent.type(await screen.findByRole('textbox',{name:'Inventární číslo: Hlavní číslo'}),'NEW-7');
    await userEvent.type(screen.getByLabelText(/Název sbírkového předmětu/),'Proof');await save();
    await waitFor(()=>expect(router.state.location.pathname).toBe('/admin/items/edit/7'));await screen.findByText(/GET failed/);
    expect(api.createItem).toHaveBeenCalledTimes(1);expect(screen.queryByText(/Předmět byl úspěšně založen/)).not.toBeInTheDocument();
});
it('renders DEMUS evidence in the actual original read-only form without selecting a current fund ID',async()=>{
 saved.title='';saved.objectType='';saved.subCollection='';saved.quantity=null;
 historical.data={fields:{Predmet_S:'kredenc kuchyňská',Fond_S:'nábytek',Podsb_S:'SOURCE_CODE',Pocet_S:'0',Zapsal_S:'Čeřovský',Urcil_S:'Žluťoučký',DatZap_S:'1899-12-30',DatZm_S:'1900-01-01'},authorities:{}};
 mount('/admin/items/view/7');await waitFor(()=>expect(screen.getByLabelText(/Název sbírkového předmětu/)).toHaveValue('kredenc kuchyňská (DEMUS)'));
 expect(screen.getByLabelText(/Název sbírkového předmětu/)).toHaveValue('kredenc kuchyňská (DEMUS)');
 expect(screen.getByLabelText('Fond',{exact:true})).toHaveValue('');
 expect(screen.getAllByRole('option',{name:'nábytek (DEMUS)'})).toHaveLength(1);
 expect(screen.getByLabelText('Podsbírka')).toHaveValue('SOURCE_CODE (DEMUS)');
 expect(screen.getByLabelText(/Současný katalogový počet/)).toHaveValue(null);
 expect(screen.getByText(/historický počet: 0 \(DEMUS\)/)).toBeInTheDocument();
 expect(screen.getByText(/Zapsal v DEMUS: Čeřovský \(DEMUS\).*Určil v DEMUS: Žluťoučký/)).toBeInTheDocument();
 expect(screen.getByText('Datum zápisu v DEMUS: 1899-12-30 (DEMUS)')).toBeInTheDocument();
 expect(api.updateItem).not.toHaveBeenCalled();
});
it('keeps DEMUS as an edit placeholder, does not dirty a current draft and prioritizes current values',async()=>{
 saved.title='';saved.objectType='';saved.subCollection='';saved.quantity=0;
 historical.data={fields:{Predmet_S:'židle',Fond_S:'nábytek',Podsb_S:'SOURCE_CODE',Pocet_S:'9'},authorities:{}};
 const router=mount();await screen.findByDisplayValue('BATCH-7');
 const name=screen.getByLabelText(/Název sbírkového předmětu/);
 expect(name).toHaveValue('');expect(name).toHaveAttribute('placeholder','židle (DEMUS)');
 expect(screen.getByLabelText('Podsbírka')).toHaveValue('');
 expect(screen.getByLabelText(/Současný katalogový počet/)).toHaveValue(0);
 expect(screen.queryByText(/historický počet: 9/)).not.toBeInTheDocument();
 expect(unload()).toBe(false);await save();expect(api.updateItem).not.toHaveBeenCalled();
 await userEvent.type(name,'Současná židle');expect(name).toHaveValue('Současná židle');expect(name).not.toHaveAttribute('placeholder');
 expect(unload()).toBe(true);expect(router.state.location.pathname).toBe('/admin/items/edit/7');
});

it('shows newly exposed source author/dating/description only as read evidence in the existing controls',async()=>{
 fullHistory.data={state:'AVAILABLE',items:[{fields:{Autor_S:{kind:'TEXT',value:'Historický autor'},Datace_S:{kind:'TEXT',value:'počátek 20. století'},Popis_S:{kind:'TEXT',value:'Původní český popis'},PoznMT_S:{kind:'TEXT',value:'Původní technologie'}}}]};
 mount('/admin/items/view/7');await screen.findByDisplayValue('Původní název');
 expect(document.getElementById('author')).toHaveValue('Historický autor (DEMUS)');expect(document.getElementById('datingText')).toHaveValue('počátek 20. století (DEMUS)');expect(document.getElementById('description')).toHaveValue('Původní český popis (DEMUS)');
 expect(api.updateItem).not.toHaveBeenCalled();expect(unload()).toBe(false);
});
it('never saves root historical fields when editing a different current field',async()=>{
 fullHistory.data={state:'AVAILABLE',items:[{fields:{Autor_S:{kind:'TEXT',value:'HISTORICAL AUTHOR ONLY'},Datace_S:{kind:'TEXT',value:'HISTORICAL DATING ONLY'},Popis_S:{kind:'TEXT',value:'HISTORICAL DESCRIPTION ONLY'}}}]};
 mount();await screen.findByDisplayValue('Původní název');
 expect(document.getElementById('author')).toHaveValue('');expect(document.getElementById('author')).toHaveAttribute('placeholder','HISTORICAL AUTHOR ONLY (DEMUS)');expect(document.getElementById('description')).toHaveValue('');expect(unload()).toBe(false);
 await userEvent.click(screen.getByLabelText('Zveřejněno'));await save();await screen.findByText(/Změny byly úspěšně uloženy/);
 expect(JSON.stringify(vi.mocked(api.updateItem).mock.calls[0][1])).not.toContain('HISTORICAL');expect(vi.mocked(api.updateItem).mock.calls[0][1]).not.toHaveProperty('description');expect(vi.mocked(api.updateItem).mock.calls[0][1]).not.toHaveProperty('author');
});
