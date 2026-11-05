import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {hasPrivateNoStore} from '../../lib/privateResponsePolicy';
import {CuratorPageContractError,curatorPageSemantics,validateCuratorPage} from './curatorPageContract';
import {inventoryColumns,scopedApi} from './scopedApi';
const expected={catalogId:71,page:0,pageSize:50,sort:'inventoryNumber,asc'};
const metadata=(change:Record<string,unknown>={})=>({...expected,totalElements:0,totalPages:0,semantics:curatorPageSemantics,items:[],...change});
const headers=(value='no-store')=>new Headers({'Cache-Control':value});
describe('private HTTP cache policy',()=>{
 it.each(['no-store',' no-store ','No-Store','no-store, no-store','no-cache, no-store, max-age=0, must-revalidate','private, no-store','extension="a,b", no-store'])('accepts %s without allowing storage',value=>expect(hasPrivateNoStore(headers(value))).toBe(true));
 it.each(['','no-cache','private','public','max-age=600','no-store, no-store, public, max-age=600','no-store, public','not-no-store','extension="no-store"','no-store="field"','no-store=true','no-store,','no-store, extension="open','nostore'])('rejects absent/invalid/weaker policy %s',value=>expect(hasPrivateNoStore(headers(value))).toBe(false));
 it('requires a cache header',()=>expect(hasPrivateNoStore(new Headers())).toBe(false));
});
describe('exact curator-page metadata',()=>{
 it('accepts an empty result',()=>expect(validateCuratorPage(metadata(),headers(),expected)).toEqual({totalElements:0,totalPages:0}));
 it('accepts an out-of-range empty page without falsifying the total',()=>expect(validateCuratorPage(metadata({page:3,totalElements:1,totalPages:1}),headers(),{...expected,page:3})).toEqual({totalElements:1,totalPages:1}));
 it.each([
  ['catalogId',{catalogId:72}],['page',{page:1}],['pageSize',{pageSize:10}],['sort',{sort:'title,asc'}],['semantics',{semantics:'OTHER'}],['items',{items:{}}],['totalElements',{totalElements:-1}],['totalElements',{totalElements:'9007199254740993'}],['totalPages',{totalElements:1,totalPages:0}],['items.length',{totalElements:1,totalPages:1}],
 ] as const)('identifies failed field %s',(field,change)=>{
  try {validateCuratorPage(metadata(change),headers(),expected);throw new Error('expected rejection');} catch(error) {expect(error).toBeInstanceOf(CuratorPageContractError);expect(error).toMatchObject({field});}
 });
 it('identifies missing cache policy without exposing item data',()=>{
  try {validateCuratorPage(metadata(),new Headers(),expected);} catch(error) {expect(error).toMatchObject({field:'Cache-Control',received:null});expect(String(error)).not.toContain('Authorization');}
 });
});
const item={id:101,catalogId:71,title:'Generated contract fixture',inventoryNumber:'GEN-1',accessionNumber:null,version:'0'};
const row=()=>({item,current:Object.fromEntries(['authorText','datingText','materialText','techniqueText','objectType','originPlace'].map(k=>[k,null])),currentPresent:false,currentInventory:{quantity:null,otherNumber:null},source:Object.fromEntries(Object.keys(inventoryColumns).map(k=>[k,null])),hasPhoto:false,hasAttachment:false});
beforeEach(()=>{vi.stubEnv('VITE_LOCAL_AUTH_ENABLED','false');});
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
describe('API transport and item schema',()=>{
 it('accepts the operator-reported QA metadata and duplicate headers with 50 distinct GENERATED DTOs',async()=>{
  const items=Array.from({length:50},(_,index)=>({...row(),item:{...item,id:1000+index,catalogId:1}}));
  const fetch=vi.fn().mockResolvedValue(response({catalogId:1,page:0,pageSize:50,sort:'inventoryNumber,asc',semantics:curatorPageSemantics,totalElements:8155,totalPages:164,items},'no-store, no-store'));
  vi.stubGlobal('fetch',fetch);
  const page=await scopedApi(1,'generated-test-session').curatorPage(0,50,'inventoryNumber,asc',{},new AbortController().signal);
  expect(page).toMatchObject({page:0,pageSize:50,totalElements:8155,totalPages:164,hasMore:true});
  expect(page.items).toHaveLength(50);
  expect(fetch.mock.calls[0][0]).toContain('catalogs/1/items/curator-page?page=0&size=50&sort=inventoryNumber%2Casc');
 });
 const load=()=>scopedApi(71,'generated-test-session').curatorPage(0,50,'inventoryNumber,asc',{},new AbortController().signal);
 const response=(body:unknown,cache='no-store')=>new Response(JSON.stringify(body),{headers:headers(cache)});
 it('validates actual DTOs through numeric-token parsing and combined cache fields',async()=>{
  const fetch=vi.fn().mockResolvedValue(response(metadata({items:[row()],totalElements:1,totalPages:1}),'no-store, no-store'));vi.stubGlobal('fetch',fetch);
  expect((await load()).items[0].item).toEqual(item);expect(fetch.mock.calls[0][0]).toContain('/api/v2/catalogs/71/items/curator-page?page=0&size=50&sort=inventoryNumber%2Casc');
 });
 it.each([{...item,catalogId:72},{...item,version:'-1'},{...item,id:'9007199254740993'},{...item,title:{raw:'bad'}}])('rejects invalid/foreign item DTO %j',async bad=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(response(metadata({items:[{...row(),item:bad}],totalElements:1,totalPages:1}))));await expect(load()).rejects.toThrow();
 });
 it('rejects duplicate item identities',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue(response(metadata({items:[row(),row()],totalElements:2,totalPages:1}))));await expect(load()).rejects.toThrow('Duplicate curator identity');});
 it.each([401,403,404,500])('preserves HTTP %s without retry/fake empty page',async status=>{const fetch=vi.fn().mockResolvedValue(new Response('',{status}));vi.stubGlobal('fetch',fetch);await expect(load()).rejects.toMatchObject({status});expect(fetch).toHaveBeenCalledTimes(1);});
 it.each([0,-1,1.5,Number.MAX_SAFE_INTEGER+1])('rejects invalid catalog selection %s before transport',catalog=>{const fetch=vi.fn();vi.stubGlobal('fetch',fetch);expect(()=>scopedApi(catalog,'generated-test-session')).toThrow();expect(fetch).not.toHaveBeenCalled();});
 it.each([{page:-1},{size:101},{sort:'privateField,desc'},{sort:'inventoryNumber,sideways'}])('rejects unsupported query inputs %j',async change=>{const fetch=vi.fn();vi.stubGlobal('fetch',fetch);await expect(scopedApi(71,'generated-test-session').curatorPage(change.page??0,change.size??50,change.sort??'inventoryNumber,asc',{},new AbortController().signal)).rejects.toThrow();expect(fetch).not.toHaveBeenCalled();});
});

it('refuses a direct reference DELETE in the QA artifact before transport',async()=>{
 vi.stubEnv('VITE_QA_NO_DELETE','true');const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 await expect(scopedApi(71,'generated-test-session').assignReference(101,'MATERIAL','00000000-0000-4000-8000-000000000001','"0"',new AbortController().signal,true)).rejects.toThrow('QA nepovoluje');
 expect(fetch).not.toHaveBeenCalled();
});

it.each(['title','current','source','inventory'])('rejects a JSON number masquerading as curator text in %s while retaining lossless numeric identities',async key=>{
 const value=row();if(key==='title')(value.item as any).title=123;
 if(key==='current')value.current.authorText=123 as any;
 if(key==='source')(value.source as any).Rada_S=123;
 if(key==='inventory')value.currentInventory.otherNumber=123 as any;
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({...expected,totalElements:1,totalPages:1,semantics:curatorPageSemantics,items:[value]}),{headers:{'Cache-Control':'no-store, no-store'}})));
 await expect(scopedApi(71,'generated').curatorPage(0,50,'inventoryNumber,asc',{},new AbortController().signal)).rejects.toThrow('JSON type');
});

it.each([123,{AUTHOR:'only incomplete'},null])('rejects malformed current authority labels %j',async bad=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({...expected,totalElements:1,totalPages:1,semantics:curatorPageSemantics,items:[{...row(),currentAuthorityLabels:bad}]}),{headers:headers()})));
 await expect(scopedApi(71,'generated').curatorPage(0,50,'inventoryNumber,asc',{},new AbortController().signal)).rejects.toThrow();
});
