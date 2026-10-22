import {act,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {MemoryRouter} from 'react-router-dom';
import NewItemForm from './NewItemForm';
import DimensionBatchForm from './DimensionBatchForm';
import ScopedWorkspace from './ScopedWorkspace';
import {ScopedError,type ScopedApi} from './scopedApi';
let api:ScopedApi;
let auth:{token:string|null;logout:()=>void;setToken:(s:string|null)=>void};
let selected:{id:number;name:string;capabilities:string[];creationEnabled:boolean}|null;
vi.mock('../../components/AuthContext',()=>({useAuth:()=>auth}));
vi.mock('../catalog/CatalogContext',()=>({useCatalog:()=>({selectedCatalog:selected})}));
vi.mock('./scopedApi',async original=>({...await original<typeof import('./scopedApi')>(),scopedApi:()=>api}));
const key='00000000-0000-0000-0000-000000000001';
const item={id:50,catalogId:11,title:'  MES Ω  ',inventoryNumber:' 0001 ',accessionNumber:'ACC-NEW',version:'0'};
const created={value:{item,origin:'MES_CREATED' as const,requestId:key,replayed:false},etag:'"0"'};
function fill(){fireEvent.change(screen.getByLabelText('Název nového předmětu'),{target:{value:'  MES Ω  '}});fireEvent.change(screen.getByLabelText('Inventární číslo nového předmětu'),{target:{value:' 0001 '}});fireEvent.change(screen.getByLabelText('Přírůstkové číslo nového předmětu'),{target:{value:'ACC-NEW'}});}
function form(){const done=vi.fn(),cancel=vi.fn(),fatal=vi.fn();const view=render(<NewItemForm api={api} catalogName="DB-A" onCreated={done} onCancel={cancel} onFatal={fatal}/>);return {...view,done,cancel,fatal};}
beforeEach(()=>{
 vi.stubEnv('VITE_SCOPED_WORKSPACE_ENABLED','true');vi.stubGlobal('crypto',{randomUUID:()=>key});
 auth={token:'one',logout:vi.fn(),setToken:vi.fn()};selected={id:11,name:'DB-A',capabilities:['catalog.read','item.read','item.create','item.write'],creationEnabled:true};
 api={createItem:vi.fn().mockResolvedValue(created),creationOutcome:vi.fn().mockResolvedValue({...created,value:{...created.value,replayed:true}}),
  list:vi.fn().mockResolvedValue({items:[],nextAfterId:null}),detail:vi.fn().mockResolvedValue({value:item,etag:'"0"'}),patch:vi.fn(),inventoryEvidence:vi.fn(),
  dimensions:vi.fn().mockResolvedValue({value:{items:[],nextAfterId:null},etag:'"0"'}),dimension:vi.fn(),createDimension:vi.fn(),patchDimension:vi.fn(),media:vi.fn().mockResolvedValue({items:[],nextAfterId:null}),mediaDetail:vi.fn(),bytes:vi.fn(),
  createDimensionsBatch:vi.fn().mockResolvedValue({value:[],etag:'"1"'})};
});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();vi.unstubAllEnvs();});
describe('new MES-created curator workflow',()=>{
 it('requires explicit real fields and preserves exact values while guarding duplicate submits',async()=>{
  let finish!:(v:typeof created)=>void;vi.mocked(api.createItem!).mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));const view=form();expect(screen.getByRole('button',{name:'Vytvořit předmět'})).toBeDisabled();fill();
  fireEvent.submit(screen.getByRole('form'));fireEvent.submit(screen.getByRole('form'));expect(api.createItem).toHaveBeenCalledTimes(1);expect(api.createItem).toHaveBeenCalledWith(key,{title:'  MES Ω  ',inventoryNumber:' 0001 ',accessionNumber:'ACC-NEW'},expect.any(AbortSignal));
  await act(async()=>{finish(created);});expect(view.done).toHaveBeenCalledWith(created.value);
 });
 it('uncertain result freezes fields and permits GET recovery without repeating POST',async()=>{
  vi.mocked(api.createItem!).mockRejectedValueOnce(new Error('connection lost after commit'));const view=form();fill();fireEvent.submit(screen.getByRole('form'));await screen.findByRole('button',{name:'Ověřit výsledek vytvoření'});
  expect(screen.getByLabelText('Název nového předmětu')).toBeDisabled();fireEvent.submit(screen.getByRole('form'));expect(api.createItem).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button',{name:'Ověřit výsledek vytvoření'}));await waitFor(()=>expect(view.done).toHaveBeenCalled());expect(api.creationOutcome).toHaveBeenCalledWith(key,expect.any(AbortSignal));expect(api.createItem).toHaveBeenCalledTimes(1);
 });
 it('uncommitted recovery404 unlocks only explicit same-key correction and resubmit',async()=>{
  vi.mocked(api.createItem!).mockRejectedValueOnce(new ScopedError(422));vi.mocked(api.creationOutcome!).mockRejectedValueOnce(new ScopedError(404));form();fill();fireEvent.submit(screen.getByRole('form'));fireEvent.click(await screen.findByRole('button',{name:'Ověřit výsledek vytvoření'}));await waitFor(()=>expect(screen.getByLabelText('Název nového předmětu')).toBeEnabled());
  expect(api.createItem).toHaveBeenCalledTimes(1);fireEvent.change(screen.getByLabelText('Přírůstkové číslo nového předmětu'),{target:{value:'ACC-CORRECTED'}});fireEvent.submit(screen.getByRole('form'));await waitFor(()=>expect(api.createItem).toHaveBeenCalledTimes(2));expect(vi.mocked(api.createItem!).mock.calls[1][0]).toBe(key);
 });
 it.each([401,403,404])('create denial%s invokes private-context shutdown with no fallback',async status=>{
  vi.mocked(api.createItem!).mockRejectedValueOnce(new ScopedError(status));const view=form();fill();fireEvent.submit(screen.getByRole('form'));await waitFor(()=>expect(view.fatal).toHaveBeenCalledWith(status));expect(api.createItem).toHaveBeenCalledTimes(1);
 });
 it('warns before discarding dirty draft and removes guard on unmount',()=>{
  const confirm=vi.spyOn(window,'confirm').mockReturnValue(false);const view=form();fill();expect(window.dispatchEvent(new Event('curatas:catalog-discard',{cancelable:true}))).toBe(false);expect(confirm).toHaveBeenCalledOnce();confirm.mockReturnValue(true);expect(window.dispatchEvent(new Event('curatas:catalog-discard',{cancelable:true}))).toBe(true);view.unmount();expect(window.dispatchEvent(new Event('curatas:catalog-discard',{cancelable:true}))).toBe(true);
 });
 it('item.write alone or disabled create policy never renders the create button',async()=>{
  selected={...selected!,capabilities:['catalog.read','item.read','item.write']};const view=render(<MemoryRouter><ScopedWorkspace/></MemoryRouter>);await screen.findByText(/V tomto katalogu nejsou dostupné předměty/);expect(screen.queryByRole('button',{name:'Nový předmět'})).not.toBeInTheDocument();selected={...selected,capabilities:['catalog.read','item.read','item.create'],creationEnabled:false};view.rerender(<MemoryRouter><ScopedWorkspace/></MemoryRouter>);expect(screen.queryByRole('button',{name:'Nový předmět'})).not.toBeInTheDocument();
 });
 it('create-only context opens new detail but does not acquire edit rights',async()=>{
  selected={...selected!,capabilities:['catalog.read','item.read','item.create']};render(<MemoryRouter><ScopedWorkspace/></MemoryRouter>);fireEvent.click(await screen.findByRole('button',{name:'Nový předmět'}));fill();fireEvent.submit(screen.getByRole('form',{name:'Nový MESonline předmět'}));await screen.findByText('Předmět je pouze pro čtení.');expect(api.detail).toHaveBeenCalledWith(50,expect.any(AbortSignal));expect(screen.queryByRole('button',{name:'Upravit předmět'})).not.toBeInTheDocument();expect(screen.queryByRole('button',{name:'Pořídit více rozměrů'})).not.toBeInTheDocument();
 });
 it('workspace and session changes clear draft and abort its pending create response',async()=>{
  vi.mocked(api.createItem!).mockImplementationOnce(()=>new Promise(()=>{}));const view=render(<MemoryRouter><ScopedWorkspace/></MemoryRouter>);fireEvent.click(await screen.findByRole('button',{name:'Nový předmět'}));fill();fireEvent.submit(screen.getByRole('form',{name:'Nový MESonline předmět'}));const signal=vi.mocked(api.createItem!).mock.calls[0][2];selected={...selected!,id:12,name:'DB-B'};view.rerender(<MemoryRouter><ScopedWorkspace/></MemoryRouter>);expect(signal.aborted).toBe(true);expect(screen.queryByRole('form',{name:'Nový MESonline předmět'})).not.toBeInTheDocument();auth={...auth,token:null};view.rerender(<MemoryRouter><ScopedWorkspace/></MemoryRouter>);expect(screen.queryByDisplayValue('  MES Ω  ')).not.toBeInTheDocument();
 });
});
describe('atomic repeated dimensions UI',()=>{
 function panel(){const saved=vi.fn();render(<DimensionBatchForm api={api} itemId={50} etag='"0"' onSaved={saved} onCancel={vi.fn()} onFatal={vi.fn()}/>);return saved;}
 function first(){fireEvent.change(screen.getByLabelText('Typ rozměru 1'),{target:{value:'  výška Ω  '}});fireEvent.change(screen.getByLabelText('Hodnota rozměru 1'),{target:{value:'12.30'}});fireEvent.change(screen.getByLabelText('Jednotka rozměru 1'),{target:{value:' cm '}});}
 it('submits two precise rows under one ETag with null distinct from text',async()=>{
  const done=panel();first();fireEvent.click(screen.getByRole('button',{name:'+ Další rozměr'}));fireEvent.change(screen.getByLabelText('Typ rozměru 2'),{target:{value:'šířka'}});fireEvent.change(screen.getByLabelText('Hodnota rozměru 2'),{target:{value:'123456789012345678901234567890123456.78'}});fireEvent.submit(screen.getByRole('form'));await waitFor(()=>expect(done).toHaveBeenCalledWith('"1"'));expect(api.createDimensionsBatch).toHaveBeenCalledWith(50,'"0"',[{type:'  výška Ω  ',value:'12.30',unit:' cm '},{type:'šířka',value:'123456789012345678901234567890123456.78',unit:null}],expect.any(AbortSignal));
 });
 it('keeps draft after412 and renders actual server comparison before explicit retry',async()=>{
  vi.mocked(api.createDimensionsBatch!).mockRejectedValueOnce(new ScopedError(412));vi.mocked(api.dimensions).mockResolvedValueOnce({value:{items:[{id:10,itemId:50,catalogId:11,type:'SERVER VALUE',value:'9.00',unit:'mm',createdInScopedApi:true}],nextAfterId:null},etag:'"2"'});panel();first();fireEvent.submit(screen.getByRole('form'));fireEvent.click(await screen.findByRole('button',{name:'Načíst rozměry pro porovnání dávky'}));await screen.findByText('SERVER VALUE: 9.00 mm');expect(screen.getByLabelText('Hodnota rozměru 1')).toHaveValue('12.30');expect(api.createDimensionsBatch).toHaveBeenCalledTimes(1);fireEvent.click(screen.getByRole('button',{name:'Potvrdit porovnání dávky'}));fireEvent.submit(screen.getByRole('form'));await waitFor(()=>expect(api.createDimensionsBatch).toHaveBeenCalledTimes(2));expect(vi.mocked(api.createDimensionsBatch!).mock.calls[1][1]).toBe('"2"');
 });
 it('rejects unsafe precision before sending any row',async()=>{
  panel();first();fireEvent.change(screen.getByLabelText('Hodnota rozměru 1'),{target:{value:'1.234'}});fireEvent.submit(screen.getByRole('form'));await screen.findByRole('alert');expect(api.createDimensionsBatch).not.toHaveBeenCalled();
 });
 it('requires every comparison page and rejects a version change between pages',async()=>{
  vi.mocked(api.createDimensionsBatch!).mockRejectedValueOnce(new ScopedError(412));vi.mocked(api.dimensions).mockResolvedValueOnce({value:{items:[],nextAfterId:10},etag:'"2"'}).mockResolvedValueOnce({value:{items:[],nextAfterId:null},etag:'"3"'});
  panel();first();fireEvent.submit(screen.getByRole('form'));fireEvent.click(await screen.findByRole('button',{name:'Načíst rozměry pro porovnání dávky'}));fireEvent.click(await screen.findByRole('button',{name:'Další serverové rozměry pro porovnání'}));await screen.findByText('Verze se při stránkování změnila. Načtěte porovnání znovu.');expect(screen.queryByRole('button',{name:'Potvrdit porovnání dávky'})).not.toBeInTheDocument();expect(api.createDimensionsBatch).toHaveBeenCalledTimes(1);
 });
});
