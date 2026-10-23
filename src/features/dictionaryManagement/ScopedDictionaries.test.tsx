import { fireEvent,render,screen } from '@testing-library/react';
import { beforeEach,afterEach,expect,it,vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ScopedDictionaries from './ScopedDictionaries';
import { CatalogDictionaryApiError,catalogDictionaries } from '../catalog/dictionaryApi';
let api:ReturnType<typeof catalogDictionaries>;let catalog:{id:number;name:string}|null;let token:string|null;
const logout=vi.fn();
vi.mock('../../components/AuthContext',()=>({useAuth:()=>({token,logout,setToken:vi.fn()})}));
vi.mock('../catalog/CatalogContext',()=>({useCatalog:()=>({selectedCatalog:catalog})}));
vi.mock('../catalog/dictionaryApi',async original=>({...await original<typeof import('../catalog/dictionaryApi')>(),catalogDictionaries:()=>api}));
const id='00000000-0000-0000-0000-000000000111';
const row={id,catalogId:11,type:'MATERIAL' as const,label:'Wood',code:null,parentId:null,version:0};
function view(){return render(<MemoryRouter><ScopedDictionaries/></MemoryRouter>);}
async function edit(){fireEvent.click(await screen.findByRole('button',{name:'Wood'}));fireEvent.click(await screen.findByRole('button',{name:'Upravit hodnotu'}));}
beforeEach(()=>{
    token='session';catalog={id:11,name:'A'};logout.mockReset();vi.stubEnv('VITE_SCOPED_WORKSPACE_ENABLED','true');
    api={metadata:vi.fn(),dictionary:vi.fn().mockResolvedValue({type:'MATERIAL',name:'Materiály',ownership:'CATALOG_CREATED_ONLY',parentSupport:'EXPLICIT_SAME_TYPE',operations:['read','create','update']}),
        list:vi.fn().mockResolvedValue({items:[row],nextAfterId:null}),detail:vi.fn().mockResolvedValue({value:row,etag:'"0"'}),
        create:vi.fn().mockResolvedValue({value:{...row,id:'00000000-0000-0000-0000-000000000222',label:'  New Ω  '},etag:'"0"'}),
        update:vi.fn().mockResolvedValue({value:{...row,label:'Changed',version:1},etag:'"1"'})};
});
afterEach(()=>{vi.unstubAllEnvs();vi.restoreAllMocks();});
it('creates with exact text, explicit same-type parent UUID and reason, never a legacy numeric ID',async()=>{
    view();fireEvent.click(await screen.findByRole('button',{name:'Přidat hodnotu'}));
    fireEvent.change(screen.getByLabelText('Název hodnoty'),{target:{value:'  New Ω  '}});fireEvent.change(screen.getByLabelText('Nadřazená hodnota'),{target:{value:id}});fireEvent.change(screen.getByLabelText('Důvod změny'),{target:{value:'Reviewed new entry'}});
    fireEvent.click(screen.getByRole('button',{name:'Uložit hodnotu'}));await screen.findByText('Hodnota byla uložena.');
    expect(api.create).toHaveBeenCalledWith('MATERIAL',{label:'  New Ω  ',code:null,parentId:id,reason:'Reviewed new entry'},expect.anything());expect(api.update).not.toHaveBeenCalled();
});
it('uses original value ETag for update and displays unsaved state',async()=>{
    view();await edit();expect(screen.getByText('Neuložené změny hodnoty.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Název hodnoty'),{target:{value:'Changed'}});fireEvent.change(screen.getByLabelText('Důvod změny'),{target:{value:'Review'}});fireEvent.click(screen.getByRole('button',{name:'Uložit hodnotu'}));await screen.findByText('Hodnota byla uložena.');
    expect(api.update).toHaveBeenCalledWith('MATERIAL',id,'"0"',{label:'Changed',code:null,parentId:null,reason:'Review'},expect.anything());expect(screen.getByTestId('dictionary-etag')).toHaveTextContent('"1"');
});
it('retains draft on412 and requires explicit compare and confirmation before another write',async()=>{
    vi.mocked(api.update).mockRejectedValueOnce(new CatalogDictionaryApiError(412,'STALE','stale'));view();await edit();
    fireEvent.change(screen.getByLabelText('Název hodnoty'),{target:{value:'My draft'}});fireEvent.change(screen.getByLabelText('Důvod změny'),{target:{value:'Review'}});fireEvent.click(screen.getByRole('button',{name:'Uložit hodnotu'}));
    await screen.findByText(/Draft zůstal zachován; zápis se neopakuje/);expect(screen.getByLabelText('Název hodnoty')).toHaveValue('My draft');expect(api.update).toHaveBeenCalledTimes(1);expect(screen.getByRole('button',{name:'Uložit hodnotu'})).toBeDisabled();
    vi.mocked(api.detail).mockResolvedValue({value:{...row,label:'Concurrent',version:1},etag:'"1"'});fireEvent.click(screen.getByRole('button',{name:'Porovnat hodnotu se serverem'}));await screen.findByText('Concurrent');
    expect(screen.getByLabelText('Název hodnoty')).toHaveValue('My draft');fireEvent.click(screen.getByRole('button',{name:'Potvrdit porovnání hodnoty'}));expect(screen.getByRole('button',{name:'Uložit hodnotu'})).toBeEnabled();expect(api.update).toHaveBeenCalledTimes(1);
});
it('read-only metadata hides create and edit controls while retaining readable detail',async()=>{
    vi.mocked(api.dictionary).mockResolvedValue({type:'MATERIAL',name:'Materiály',ownership:'CATALOG_CREATED_ONLY',parentSupport:'EXPLICIT_SAME_TYPE',operations:['read']});view();fireEvent.click(await screen.findByRole('button',{name:'Wood'}));await screen.findByTestId('dictionary-server-label');
    expect(screen.queryByRole('button',{name:'Přidat hodnotu'})).not.toBeInTheDocument();expect(screen.queryByRole('button',{name:'Upravit hodnotu'})).not.toBeInTheDocument();
});
it.each([401,403,404])('clears private dictionary state on%s and logs out only on401',async status=>{
    view();await edit();vi.mocked(api.update).mockRejectedValue(new CatalogDictionaryApiError(status,'DENIED','denied'));
    fireEvent.change(screen.getByLabelText('Důvod změny'),{target:{value:'Review'}});fireEvent.click(screen.getByRole('button',{name:'Uložit hodnotu'}));await screen.findByText(/Soukromý obsah byl uzavřen/);
    expect(screen.queryByTestId('dictionary-server-label')).not.toBeInTheDocument();expect(screen.queryByRole('form',{name:'Editor hodnoty číselníku'})).not.toBeInTheDocument();expect(logout).toHaveBeenCalledTimes(status===401?1:0);expect(api.update).toHaveBeenCalledTimes(1);
});
it('catalog change discards old private draft synchronously',async()=>{
    const current=view();await edit();fireEvent.change(screen.getByLabelText('Název hodnoty'),{target:{value:'Private draft'}});catalog={id:21,name:'B'};vi.mocked(api.list).mockResolvedValue({items:[],nextAfterId:null});
    current.rerender(<MemoryRouter><ScopedDictionaries/></MemoryRouter>);expect(screen.queryByDisplayValue('Private draft')).not.toBeInTheDocument();expect(screen.queryByTestId('dictionary-server-label')).not.toBeInTheDocument();await screen.findByText('Žádné dostupné hodnoty.');
});
