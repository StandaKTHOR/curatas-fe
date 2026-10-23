import {act,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {MemoryRouter} from 'react-router-dom';
import {CatalogProvider,useCatalog} from './CatalogContext';
import CatalogSelector from './CatalogSelector';
import {CatalogApiError,listCatalogs,resolveCatalog,type AvailableCatalog} from './catalogApi';
import ScopedWorkspace from '../scoped/ScopedWorkspace';
import type {ScopedApi} from '../scoped/scopedApi';
let auth:{token:string|null;logout:()=>void;setToken:(s:string|null)=>void};
vi.mock('../../components/AuthContext',()=>({useAuth:()=>auth}));
const apis=new Map<number,ScopedApi>();
vi.mock('../scoped/scopedApi',async original=>({...await original<typeof import('../scoped/scopedApi')>(),scopedApi:(id:number)=>apis.get(id)}));
const catalog=(id:number,accessType:AvailableCatalog['accessType']='OWN',write=true):AvailableCatalog=>({id,catalogId:id,code:`DB-${id}`,name:`Evidence ${id}`,version:0,institution:{id:1,code:'MZM-SYNTHETIC',name:'MZM synthetic'},accessType,capabilities:['catalog.read','item.read','dictionary.read',...(write?['item.write','dictionary.write']:[])]});
const rows=[catalog(11),catalog(12),catalog(13),catalog(21,'SHARED',false)];
const response=(body:unknown,status=200)=>({ok:status<400,status,json:async()=>body});
let fetcher:ReturnType<typeof vi.fn>;
function api(id:number):ScopedApi{
 const item={id:id*10,catalogId:id,title:`PRIVATE ${id}`,inventoryNumber:' 0001 ',accessionNumber:null,version:'0'};
 const media={id:'00000000-0000-0000-0000-000000000001',catalogId:id,itemId:item.id,kind:'IMAGE' as const,name:`private-${id}.png`,mimeType:'image/png',byteSize:1,variants:['content','thumbnail'] as ('content'|'thumbnail')[]};
 return {list:vi.fn().mockResolvedValue({items:[item],nextAfterId:null}),detail:vi.fn().mockResolvedValue({value:item,etag:'"0"'}),patch:vi.fn(),inventoryEvidence:vi.fn(),dimensions:vi.fn().mockResolvedValue({value:{items:[],nextAfterId:null},etag:'"0"'}),dimension:vi.fn(),createDimension:vi.fn(),patchDimension:vi.fn(),media:vi.fn().mockResolvedValue({items:[media],nextAfterId:null}),mediaDetail:vi.fn().mockResolvedValue(media),bytes:vi.fn().mockResolvedValue(new Blob(['a'],{type:'image/png'}))};
}
function View(){return <MemoryRouter><CatalogProvider><CatalogSelector/><ScopedWorkspace/></CatalogProvider></MemoryRouter>;}
async function choose(id:number){fireEvent.change(await screen.findByRole('combobox'),{target:{value:String(id)}});await screen.findByText(`Vybrán katalog Evidence ${id}.`);}
beforeEach(()=>{
 vi.stubEnv('VITE_SCOPED_WORKSPACE_ENABLED','true');auth={token:'synthetic',logout:vi.fn(),setToken:vi.fn()};apis.clear();rows.forEach(c=>apis.set(c.id,api(c.id)));
 fetcher=vi.fn().mockImplementation((url:string)=>Promise.resolve(response(url.includes('?')?{items:rows,nextAfterId:null}:rows.find(c=>String(c.id)===url.split('/').at(-1)))));vi.stubGlobal('fetch',fetcher);
 vi.stubGlobal('URL',class extends URL{static createObjectURL=vi.fn(()=>'blob:owned-private');static revokeObjectURL=vi.fn();});
});
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();vi.restoreAllMocks();});
describe('single CatalogProvider workspace context',()=>{
 it('shows three owned and one shared scopes with no automatic selection and no v1 fallback',async()=>{
  render(<View/>);await screen.findByRole('option',{name:/Evidence 21/});expect(screen.getByRole('combobox')).toHaveValue('');
  expect(screen.getByRole('group',{name:'Vlastní evidence'}).querySelectorAll('option')).toHaveLength(3);expect(screen.getByRole('group',{name:'Sdílená evidence'}).querySelectorAll('option')).toHaveLength(1);
  expect(fetcher).toHaveBeenCalledWith(expect.stringContaining('/api/v2/workspaces?'),expect.objectContaining({cache:'no-store',redirect:'error',credentials:'omit'}));expect(apis.get(11)?.list).not.toHaveBeenCalled();
 });
 it('clears private detail requests blob filters and pagination before resolving a different workspace',async()=>{
  render(<View/>);await screen.findByRole('option',{name:/Evidence 11/});await choose(11);fireEvent.click(await screen.findByRole('button',{name:/PRIVATE 11/}));
  fireEvent.click(await screen.findByRole('button',{name:'private-11.png'}));fireEvent.click(await screen.findByRole('button',{name:'Náhled obrázku'}));await screen.findByRole('img');
  fireEvent.change(screen.getByLabelText('Hledat název'),{target:{value:'PRIVATE FILTER'}});
  let finish!:(v:unknown)=>void;fetcher.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));fireEvent.change(screen.getByRole('combobox'),{target:{value:'12'}});
  expect(screen.queryByRole('img')).not.toBeInTheDocument();expect(screen.queryByText(/PRIVATE 11/)).not.toBeInTheDocument();expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:owned-private');
  await act(async()=>{finish(response(rows[1]));});await screen.findByRole('button',{name:/PRIVATE 12/});expect(screen.getByLabelText('Hledat název')).toHaveValue('');
 });
 it('read-only shared workspace exposes reads but no item or dimension writes',async()=>{
  render(<View/>);await screen.findByRole('option',{name:/Evidence 21/});await choose(21);fireEvent.click(await screen.findByRole('button',{name:/PRIVATE 21/}));await screen.findByText('Předmět je pouze pro čtení.');
  expect(screen.queryByRole('button',{name:'Upravit předmět'})).not.toBeInTheDocument();expect(screen.queryByRole('button',{name:'Nový rozměr'})).not.toBeInTheDocument();expect(screen.getByTestId('workspace-access')).toHaveTextContent('Sdílená evidence');
 });
 it.each([401,403,404])('selection failure %s clears previous private workspace and requires explicit recovery',async status=>{
  render(<View/>);await screen.findByRole('option',{name:/Evidence 11/});await choose(11);await screen.findByRole('button',{name:/PRIVATE 11/});fetcher.mockResolvedValueOnce(response({},status));
  fireEvent.change(screen.getByRole('combobox'),{target:{value:'21'}});await screen.findByRole('alert');expect(screen.queryByText(/PRIVATE 11/)).not.toBeInTheDocument();expect(screen.getByRole('combobox')).toHaveValue('');if(status===401)expect(auth.logout).toHaveBeenCalledOnce();
 });
 it('same-session refresh removes revoked shared scopes and clears old selection',async()=>{
  render(<View/>);await screen.findByRole('option',{name:/Evidence 21/});await choose(21);await screen.findByRole('button',{name:/PRIVATE 21/});fetcher.mockResolvedValueOnce(response({items:rows.slice(0,3),nextAfterId:null}));fireEvent.click(screen.getByRole('button',{name:'Obnovit katalogy'}));
  await waitFor(()=>expect(screen.queryByRole('option',{name:/Evidence 21/})).not.toBeInTheDocument());expect(screen.queryByText(/PRIVATE 21/)).not.toBeInTheDocument();expect(screen.getByRole('combobox')).toHaveValue('');
 });
 it('a new auth session synchronously removes old workspace metadata and data',async()=>{
  const view=render(<View/>);await screen.findByRole('option',{name:/Evidence 11/});await choose(11);await screen.findByRole('button',{name:/PRIVATE 11/});auth={...auth,token:null};view.rerender(<View/>);
  expect(screen.queryByRole('option',{name:/Evidence 11/})).not.toBeInTheDocument();expect(screen.queryByText(/PRIVATE 11/)).not.toBeInTheDocument();
 });
 it('late workspace resolution cannot replace a newer choice even if transport ignores abort',async()=>{
  function Probe(){const c=useCatalog();return <><button onClick={()=>void c.selectCatalog(11)}>Choose A</button><button onClick={()=>void c.selectCatalog(12)}>Choose B</button><span>{c.selectedCatalog?.name}</span></>;}
  render(<CatalogProvider><CatalogSelector/><Probe/></CatalogProvider>);await screen.findByRole('option',{name:/Evidence 11/});let finish!:(v:unknown)=>void;fetcher.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));fireEvent.click(screen.getByText('Choose A'));fireEvent.click(screen.getByText('Choose B'));await screen.findByText('Vybrán katalog Evidence 12.');await act(async()=>{finish(response(rows[0]));});expect(screen.queryByText('Vybrán katalog Evidence 11.')).not.toBeInTheDocument();
 });
 it.each([{...rows[0],catalogId:12},{...rows[0],capabilities:['ADMIN']},{...rows[0],accessType:'OWN_BY_FILENAME'}])('rejects inconsistent workspace metadata without falling back to catalog or v1',async value=>{
  fetcher.mockResolvedValueOnce(response(value));await expect(resolveCatalog(11,'synthetic',new AbortController().signal)).rejects.toBeInstanceOf(CatalogApiError);expect(fetcher).toHaveBeenCalledTimes(1);
 });
 it('rejects duplicate workspace page identities rather than merging unrelated contexts',async()=>{
  fetcher.mockResolvedValueOnce(response({items:[rows[0],rows[0]],nextAfterId:null}));await expect(listCatalogs('synthetic',new AbortController().signal)).rejects.toMatchObject({status:502});
 });
});
