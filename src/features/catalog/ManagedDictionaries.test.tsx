import {StrictMode} from 'react';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';import {it,expect,vi,afterEach,beforeEach} from 'vitest';
const mocks=vi.hoisted(()=>({api:{dictionaryMetadata:vi.fn(),dictionaryValues:vi.fn(),saveDictionary:vi.fn(),dictionaryValue:vi.fn()}}));
vi.mock('./CatalogContext',()=>({useCatalog:()=>({selectedCatalog:{id:1,capabilities:['dictionary.read']}})}));
vi.mock('../../components/AuthContext',()=>({useAuth:()=>({token:'GENERATED'})}));
vi.mock('../scoped/scopedApi',()=>({scopedApi:()=>mocks.api,managedDictionaryTypes:['MATERIAL','FUND','COLLECTION']}));
vi.mock('../../components/AddDictionaryModal',()=>({default:(p:any)=><button onClick={()=>void p.onCreate({label:'Nový fond',code:'NF',parentId:null})}>Potvrdit nové údaje</button>}));
import ManagedDictionaries from './ManagedDictionaries';
import {managedDictionaryLabels} from './managedDictionaryPresentation';
const value={id:'a',catalogId:1,type:'MATERIAL',label:'Dřevo',code:'D',parentId:null,version:'0'};
beforeEach(()=>{vi.stubEnv('VITE_MANAGED_AUTHORITIES_ENABLED','true');vi.resetAllMocks();mocks.api.dictionaryMetadata.mockResolvedValue({operations:['read','create','update']});mocks.api.dictionaryValues.mockResolvedValue({items:[value],nextAfterId:null});});
afterEach(()=>{cleanup();vi.unstubAllEnvs();});
it('searches on typing and ignores a late answer from an earlier query',async()=>{
 let stale!:(v:any)=>void;mocks.api.dictionaryValues.mockImplementation((_t:any,_s:any,_a:any,q:string)=>q==='old'?new Promise(r=>stale=r):Promise.resolve({items:q==='new'?[{...value,label:'Nový výsledek'}]:[value],nextAfterId:null}));
 render(<ManagedDictionaries/>);await screen.findByText('Dřevo');const input=screen.getByLabelText('Hledat v současném číselníku');fireEvent.change(input,{target:{value:'old'}});await waitFor(()=>expect(stale).toBeDefined());fireEvent.change(input,{target:{value:'new'}});await screen.findByText('Nový výsledek');stale({items:[{...value,label:'STARÝ'}],nextAfterId:null});await waitFor(()=>expect(screen.queryByText('STARÝ')).toBeNull());
});
it('loads complete parent choices and confirms saved authority by GET before refreshing the list',async()=>{
 mocks.api.saveDictionary.mockResolvedValue({value,etag:'"0"'});mocks.api.dictionaryValue.mockResolvedValue({value,etag:'"0"'});
 render(<ManagedDictionaries/>);await screen.findByText('Dřevo');fireEvent.click(screen.getByRole('button',{name:'Nová současná položka'}));fireEvent.click(await screen.findByRole('button',{name:'Potvrdit nové údaje'}));await waitFor(()=>expect(mocks.api.dictionaryValue).toHaveBeenCalledWith('MATERIAL','a',expect.any(AbortSignal)));expect(mocks.api.saveDictionary).toHaveBeenCalledWith('MATERIAL',expect.objectContaining({label:'Nový fond',code:'NF',parentId:null}),expect.any(AbortSignal),undefined,undefined);
});
it('provides all13 Czech labels and explains current-only empty results',async()=>{
 expect(Object.keys(managedDictionaryLabels)).toHaveLength(13);expect(Object.values(managedDictionaryLabels)).toContain('Technika');
 mocks.api.dictionaryValues.mockResolvedValue({items:[],nextAfterId:null});render(<ManagedDictionaries/>);
 await screen.findByText(/Žádné současné hodnoty tohoto číselníku/);expect(screen.getByRole('option',{name:'Materiál'})).toHaveValue('MATERIAL');expect(screen.getByRole('option',{name:'Fond'})).toHaveValue('FUND');expect(screen.getByText(/historický číselník DEMUS je prázdný/)).toBeInTheDocument();
});
it('loads further pages including children and resolves a parent absent from the search result',async()=>{
 const child={...value,id:'b',parentId:'a',label:'Textil starý',code:'TEXTIL_STARY'};
 mocks.api.dictionaryValues.mockImplementation((_t:any,_s:any,after?:string)=>Promise.resolve(after?{items:[child],nextAfterId:null}:{items:[value],nextAfterId:'a'}));
 mocks.api.dictionaryValue.mockResolvedValue({value,etag:'"0"'});render(<ManagedDictionaries/>);await screen.findByText('Dřevo');fireEvent.click(screen.getByRole('button',{name:'Další položky číselníku'}));await screen.findByText('Textil starý');expect(screen.getByRole('columnheader',{name:'UUID položky'})).toBeInTheDocument();
 mocks.api.dictionaryValues.mockResolvedValue({items:[child],nextAfterId:null});fireEvent.change(screen.getByLabelText('Hledat v současném číselníku'),{target:{value:'starý'}});await waitFor(()=>expect(mocks.api.dictionaryValue).toHaveBeenCalledWith('MATERIAL','a',expect.any(AbortSignal)));expect(await screen.findByText(/Dřevo — kód: D — UUID rodiče: a/)).toBeInTheDocument();
});

it('recreates an aborted lifetime on StrictMode setup replay so the existing create workflow remains enabled',async()=>{
 mocks.api.dictionaryMetadata.mockImplementation((_t:any,signal:AbortSignal)=>signal.aborted?Promise.reject(new Error('aborted')):Promise.resolve({operations:['read','create','update']}));
 mocks.api.dictionaryValues.mockImplementation((_t:any,signal:AbortSignal)=>signal.aborted?Promise.reject(new Error('aborted')):Promise.resolve({items:[value],nextAfterId:null}));
 render(<StrictMode><ManagedDictionaries/></StrictMode>);await screen.findByText('Dřevo');expect(screen.getByRole('button',{name:'Nová současná položka'})).toBeEnabled();
});
it('explains why a read-only account cannot create without widening its permissions',async()=>{
 mocks.api.dictionaryMetadata.mockResolvedValue({operations:['read']});render(<ManagedDictionaries/>);await screen.findByText('Dřevo');expect(screen.getByRole('button',{name:'Nová současná položka'})).toBeDisabled();expect(screen.getByRole('status')).toHaveTextContent('není pro tento účet a katalog povoleno serverem');expect(mocks.api.saveDictionary).not.toHaveBeenCalled();
});
it('reports metadata failure rather than presenting a disabled button as a working editor',async()=>{
 mocks.api.dictionaryMetadata.mockRejectedValue(new Error('403'));render(<ManagedDictionaries/>);expect(await screen.findByRole('alert')).toHaveTextContent('403');expect(screen.getByRole('button',{name:'Nová současná položka'})).toBeDisabled();
});

it('never resolves a previous dictionary parent through the newly selected type',async()=>{
 const child={...value,id:'child',parentId:'parent'};
 mocks.api.dictionaryValues.mockImplementation((type:string)=>Promise.resolve({items:type==='MATERIAL'?[child]:[],nextAfterId:null}));mocks.api.dictionaryValue.mockResolvedValue({value:{...value,id:'parent'},etag:'"0"'});
 render(<ManagedDictionaries/>);await screen.findByText('Dřevo');await waitFor(()=>expect(mocks.api.dictionaryValue).toHaveBeenCalledWith('MATERIAL','parent',expect.any(AbortSignal)));
 fireEvent.change(screen.getByLabelText('Typ číselníku',{exact:false}),{target:{value:'FUND'}});await screen.findByText(/Žádné současné hodnoty tohoto číselníku/);expect(mocks.api.dictionaryValue.mock.calls.some(([type])=>type==='FUND')).toBe(false);
});
