import {renderHook,waitFor,act,cleanup} from '@testing-library/react';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {bindOriginalCatalog} from './originalAdapter';import {useManagedAuthorities} from './useManagedAuthorities';
const id='11111111-1111-4111-8111-111111111111';
const catalog={id:71,code:'G',name:'Generated',version:0,institution:{id:1,code:'G',name:'Generated'},capabilities:['catalog.read','item.read','dictionary.read','dictionary.write','item.professional.write'],professionalWriteEnabled:true};
const reply=(v:unknown,tag='"0"',status=200)=>new Response(JSON.stringify(v),{status,headers:{ETag:tag,'Cache-Control':'no-store, no-store'}});
let refs:any[]=[],writes:any[]=[];
beforeEach(()=>{refs=[];writes=[];vi.stubEnv('VITE_MANAGED_AUTHORITIES_ENABLED','true');vi.stubEnv('VITE_ORIGINAL_SCOPED_TEST','true');bindOriginalCatalog(catalog,'generated');vi.stubGlobal('fetch',vi.fn(async(url:string,init:any)=>{
 if(init.method==='POST'&&url.includes('/dictionaries/')){const v=JSON.parse(init.body);writes.push({path:url,value:v});return reply({id,catalogId:71,type:'FUND',version:0,...v});}
 if(init.method==='PUT'){writes.push({path:url,tag:init.headers['If-Match']});refs=[{id,type:'FUND',parentId:null,code:'N',label:'Český nový fond'}];return reply({id:3,catalogId:71,version:1,title:null,inventoryNumber:'G',accessionNumber:null},'"1"');}
 if(url.includes('/references'))return reply({catalogId:71,itemId:Number(url.split('/items/')[1].split('/')[0]),itemVersion:0,items:refs});
 if(url.includes('/values'))return reply({items:refs.map(v=>({...v,catalogId:71,version:0})),nextAfterId:null});
 const type=url.split('/dictionaries/')[1];return reply({type,ownership:'CATALOG_CREATED_ONLY',parentSupport:'EXPLICIT_SAME_TYPE',operations:['read','create','update']});
}));});
afterEach(()=>{cleanup();bindOriginalCatalog(null,null);vi.unstubAllGlobals();vi.unstubAllEnvs();});
it('creates a current UUID, assigns with shared ETag and never sends DEMUS or legacy numeric identity',async()=>{
 const saved=vi.fn();const v=renderHook(()=>useManagedAuthorities(3,'"0"',false,saved));await waitFor(()=>expect(v.result.current.ready).toBe(true));
 await act(()=>v.result.current.create({type:'FUND',label:'Český nový fond',code:'N'}));expect(writes).toHaveLength(2);expect(writes[0].value).toEqual({label:'Český nový fond',code:'N',parentId:null,reason:'Vytvoření současné autority z karty předmětu'});expect(writes[1]).toMatchObject({path:expect.stringContaining('/references/FUND/'+id),tag:'"0"'});expect(saved).toHaveBeenCalledWith('"1"');
});
it('refuses a dirty form and preserves the current binding without a write',async()=>{const v=renderHook(()=>useManagedAuthorities(3,'"0"',true,vi.fn()));await waitFor(()=>expect(v.result.current.ready).toBe(true));await expect(v.result.current.create({type:'FUND',label:'N',code:'N'})).rejects.toThrow();expect(writes).toHaveLength(0);});
it('immediately discards old item or authentication choices before late reads finish',async()=>{refs=[{id,type:'FUND',parentId:null,code:'N',label:'Český nový fond'}];const v=renderHook(({item})=>useManagedAuthorities(item,'"0"',false,vi.fn()),{initialProps:{item:3}});await waitFor(()=>expect(v.result.current.label('FUND')).toBe('Český nový fond'));vi.mocked(fetch).mockReturnValue(new Promise(()=>{}));v.rerender({item:4});expect(v.result.current.value('FUND')).toBe('');expect(v.result.current.ready).toBe(false);bindOriginalCatalog(catalog,'different-user');v.rerender({item:3});expect(v.result.current.label('FUND')).toBeUndefined();});
it('failed assignment reports a created but unassigned authority and never repeats its POST',async()=>{const v=renderHook(()=>useManagedAuthorities(3,'"0"',false,vi.fn()));await waitFor(()=>expect(v.result.current.ready).toBe(true));const original=vi.mocked(fetch).getMockImplementation()!;vi.mocked(fetch).mockImplementation((url,init:any)=>init.method==='PUT'?Promise.resolve(reply({code:'STALE'},'"0"',412)):original(url,init));await expect(v.result.current.create({type:'FUND',label:'Český nový fond',code:'N'})).rejects.toThrow(/byla vytvořena, ale nebyla přiřazena/);expect(writes.filter(v=>v.value)).toHaveLength(1);expect(v.result.current.value('FUND')).toBe('');});
