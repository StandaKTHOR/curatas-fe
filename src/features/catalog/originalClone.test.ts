import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {bindOriginalCatalog,originalDemusIdentity} from './originalAdapter';
import {cloneOriginalItem,originalCanClone,originalCloneOutcome} from './originalClone';
import {scopedApi,inventoryColumns} from '../scoped/scopedApi';
const catalog={id:1,code:'GEN',name:'Generated',version:0,institution:{id:1,code:'G',name:'Generated'},capabilities:['catalog.read','item.read','item.create'],creationEnabled:true,cloneEnabled:true,cloneReadEnabled:true};
const source={id:10,catalogId:1,title:'GENERATED',inventoryNumber:'G-1',accessionNumber:null,version:3};
const reply=(v:unknown,headers:Record<string,string>={},status=200)=>new Response(JSON.stringify(v),{status,headers:{ETag:'"0"','Cache-Control':'no-store',...headers}});
beforeEach(()=>{vi.stubEnv('VITE_LOCAL_AUTH_ENABLED','false');bindOriginalCatalog(catalog,'GENERATED');});
afterEach(()=>{bindOriginalCatalog(null,null);vi.unstubAllGlobals();vi.unstubAllEnvs();});
it.each(['clone','creation','permission','evidence-read'])('requires explicit %s permission/flag before transport',async missing=>{
 bindOriginalCatalog({...catalog,cloneReadEnabled:missing!=='evidence-read',cloneEnabled:missing!=='clone',creationEnabled:missing!=='creation',capabilities:missing==='permission'?['catalog.read','item.read']:catalog.capabilities},'OTHER');const fetch=vi.fn();vi.stubGlobal('fetch',fetch);expect(originalCanClone()).toBe(false);await expect(cloneOriginalItem(10,crypto.randomUUID(),{title:'A',inventoryNumber:'G-2'})).rejects.toThrow('nemáte');expect(fetch).not.toHaveBeenCalled();
});
it('uses the actual source version and independent request key; never sends old IDs, children or audit',async()=>{
 const key=crypto.randomUUID(),item={...source,id:42,inventoryNumber:'  G-002/Ž  ',version:0};const fetch=vi.fn().mockResolvedValueOnce(reply(source,{ETag:'"3"'})).mockResolvedValueOnce(reply({item,requestId:key,replayed:false,clonedFromItemId:10,copied:{media:2}},{Location:'/api/v2/catalogs/1/items/42'},201));vi.stubGlobal('fetch',fetch);
 expect((await cloneOriginalItem(10,key,{title:'GENERATED',inventoryNumber:'  G-002/Ž  '})).value.item.id).toBe(42);expect(fetch.mock.calls[1][0]).toContain('/catalogs/1/items/10/clone');const init=fetch.mock.calls[1][1];expect(init.headers['If-Match']).toBe('"3"');expect(init.headers['Idempotency-Key']).toBe(key);expect(JSON.parse(init.body)).toEqual({title:'GENERATED',inventoryNumber:'  G-002/Ž  '});
});
it('checks an uncertain result with GET only and accepts no foreign target',async()=>{
 const key=crypto.randomUUID();const fetch=vi.fn().mockResolvedValue(reply({item:{...source,catalogId:2},requestId:key,replayed:true,clonedFromItemId:10,copied:{}}));vi.stubGlobal('fetch',fetch);await expect(originalCloneOutcome(key)).rejects.toThrow('Foreign item');expect(fetch.mock.calls[0][1].method).toBeUndefined();expect(fetch.mock.calls[0][0]).toContain('/clone-requests/'+key);
});
it('rejects invented extra clone input and missing identity before POST',async()=>{
 const fetch=vi.fn();vi.stubGlobal('fetch',fetch);const api=scopedApi(1,'GENERATED'),signal=new AbortController().signal;
 await expect(api.cloneItem(10,crypto.randomUUID(),'"0"',{title:'A',inventoryNumber:'X',copyAudit:true} as any,signal)).rejects.toThrow('Invalid clone fields');await expect(api.cloneItem(10,crypto.randomUUID(),'"0"',{title:'A',inventoryNumber:' '},signal)).rejects.toThrow('Vyplňte');expect(fetch).not.toHaveBeenCalled();
});
it('rejects bad copied receipts and transport cache policies',async()=>{
 const key=crypto.randomUUID(),fetch=vi.fn().mockResolvedValue(reply({item:source,requestId:key,replayed:true,clonedFromItemId:10,copied:{}},{'Cache-Control':'public'}));vi.stubGlobal('fetch',fetch);await expect(originalCloneOutcome(key)).rejects.toThrow('Invalid clone receipt');
});
it('reads explicit absence of clone origin without a false catalog denial',async()=>{
 const listener=vi.fn();window.addEventListener('curatas:scoped-denied',listener);try{vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(null,{status:204,headers:{'Cache-Control':'no-store'}})));expect(await scopedApi(1,'GENERATED').cloneOrigin(10,new AbortController().signal)).toBeNull();expect(listener).not.toHaveBeenCalled();}finally{window.removeEventListener('curatas:scoped-denied',listener);}
});
it('retains current professional payload as current only and rejects duplicate record identities',async()=>{
 const record={id:7,kind:'DETERMINATION',dictionaryId:null,partyId:null,payload:{Urcil_UR:'  GENERATED  ',NULL:null},materialDictionaryId:null,techniqueDictionaryId:null};const body={catalogId:1,itemId:10,itemVersion:0,semantics:'CURRENT_OWNED_RECORDS_NOT_SOURCE',items:[record]};const fetch=vi.fn().mockResolvedValueOnce(reply(body)).mockResolvedValueOnce(reply({...body,items:[record,record]}));vi.stubGlobal('fetch',fetch);const api=scopedApi(1,'GENERATED'),signal=new AbortController().signal;expect((await api.professionalRecords(10,signal)).items[0].payload).toEqual(record.payload);await expect(api.professionalRecords(10,signal)).rejects.toThrow('Duplicate');
});
it('reads museum events without adopting original user activity',async()=>{
 const body={catalogId:1,itemId:10,itemVersion:0,semantics:'CURRENT_OWNED_MUSEUM_HISTORY_NOT_USER_AUDIT',items:[{id:51,eventType:'REVISION',eventDate:'2001-02-03',description:'  GENERATED museum history  '},{id:52,eventType:'RESTORATION',eventDate:null,description:null}]};const fetch=vi.fn().mockResolvedValueOnce(reply(body)).mockResolvedValueOnce(reply({...body,items:[{...body.items[0],eventType:'UPDATE_AUDIT'}]}));vi.stubGlobal('fetch',fetch);const api=scopedApi(1,'GENERATED'),signal=new AbortController().signal;expect((await api.professionalHistory(10,signal)).items).toEqual(body.items);await expect(api.professionalHistory(10,signal)).rejects.toThrow('Unclassified');
});
it.each([false,true])('original identity panel uses scoped reads only and rejects mixed versions=%s',async mixed=>{
 const source=Object.fromEntries(Object.keys(inventoryColumns).map(k=>[k,k==='Fond_S'?'GENERATED fund':null]));const fetch=vi.fn().mockImplementation(async(path:string)=>{
  if(path.includes('/inventory-evidence'))return reply({catalogId:1,itemId:10,itemVersion:0,inventoryNumber:'GEN-NEW',sourceLocalId:'001',sourceInventoryNumber:'GEN-OLD',sourceComponents:{series:'  G  '},aliases:[],nextAfterId:null});
  if(path.endsWith('/source-inventory'))return reply({catalogId:1,itemId:10,itemVersion:0,semantics:'WHITELISTED_HISTORICAL_SOURCE_NOT_CURRENT_ASSERTION',source});
  if(path.endsWith('/source-summary'))return reply({catalogId:1,itemId:10,itemVersion:0,sourceQuantity:'2',sourceAccessionFlag:null});
  if(path.endsWith('/curator-record/inventory'))return reply({catalogId:1,itemId:10,itemVersion:mixed?1:0,section:'inventory',origin:'CURRENT_CURATOR_STATEMENT_NOT_SOURCE',values:{quantity:'3',otherNumber:null},hasCurrentAssertion:true},{ETag:mixed?'"1"':'"0"'});throw Error('Legacy transport forbidden');
 });vi.stubGlobal('fetch',fetch);
 if(mixed)await expect(originalDemusIdentity(10)).rejects.toThrow('Verze');else expect(await originalDemusIdentity(10)).toMatchObject({itemId:10,sourceLocalId:'001',series:'  G  ',sourceQuantity:2,quantity:3,fundCode:'GENERATED fund',sourceDatingFromYear:null});expect(fetch.mock.calls.every(([p])=>new URL(String(p),window.location.origin).pathname.startsWith('/api/v2/catalogs/1/items/10/'))).toBe(true);
});
