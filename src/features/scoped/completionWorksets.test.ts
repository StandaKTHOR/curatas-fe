import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {scopedApi} from './scopedApi';
const id='00000000-0000-4000-8000-000000000001';const signal=()=>new AbortController().signal;
const summary=(change:Record<string,unknown>={})=>({id,catalogId:1,ownerUserId:7,name:'GENERATED Ž',description:null,itemCount:2,createdAt:'2026-11-04T00:00:00Z',updatedAt:'2026-11-04T00:00:00Z',...change});
const response=(body:unknown)=>new Response(JSON.stringify(body),{headers:{'Cache-Control':'no-store, no-store'}});
beforeEach(()=>vi.stubEnv('VITE_LOCAL_AUTH_ENABLED','false'));
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
it('lists private catalog worksets and validates stable UUIDs, owner IDs and counts',async()=>{const fetch=vi.fn().mockResolvedValue(response([summary()]));vi.stubGlobal('fetch',fetch);expect(await scopedApi(1,'generated').worksets(signal())).toEqual([{id,name:'GENERATED Ž',description:'',itemCount:2,createdAt:'2026-11-04T00:00:00Z',updatedAt:'2026-11-04T00:00:00Z'}]);expect(fetch.mock.calls[0][0]).toContain('/catalogs/1/worksets');});
it('creates an immutable selected snapshot with a stable idempotency key',async()=>{const fetch=vi.fn().mockResolvedValue(response(summary()));vi.stubGlobal('fetch',fetch);await scopedApi(1,'generated').createWorkset(id,{name:'GENERATED Ž',itemIds:[3,7]},signal());const [,init]=fetch.mock.calls[0];expect(init.headers['Idempotency-Key']).toBe(id);expect(JSON.parse(init.body)).toEqual({name:'GENERATED Ž',description:null,itemIds:[3,7]});});
it('creates a filtered snapshot preserving advanced AST and current sort without paging',async()=>{
 const fetch=vi.fn().mockResolvedValue(response(summary()));vi.stubGlobal('fetch',fetch);
 const ast=JSON.stringify({id:'g',conjunction:'AND',conditions:[{id:'c',field:'title',operator:'CONTAINS',value:'Ž'}],groups:[]});
 await scopedApi(1,'generated').createWorkset(id,{name:'GENERATED',filter:{sort:'createdAt,desc',advancedFilter:ast,q:'Ž'}},signal());expect(JSON.parse(fetch.mock.calls[0][1].body).filter).toEqual({sort:'createdAt,desc',advancedFilter:ast,q:'Ž'});
});
it.each([{catalogId:2},{ownerUserId:0},{id:'bad'},{itemCount:10001},{createdAt:'invalid'}])('rejects malformed/foreign workset DTO %j',async change=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue(response([summary(change)])));await expect(scopedApi(1,'generated').worksets(signal())).rejects.toThrow();});
it('keeps workset filter in original scoped query',async()=>{const fetch=vi.fn().mockResolvedValue(new Response('',{status:500}));vi.stubGlobal('fetch',fetch);await expect(scopedApi(1,'generated').curatorPage(0,50,'createdAt,desc',{worksetId:id},signal())).rejects.toThrow();expect(fetch.mock.calls[0][0]).toContain('worksetId='+id);});
