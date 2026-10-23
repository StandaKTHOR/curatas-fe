import {afterEach,describe,expect,it,vi} from 'vitest';
import {scopedApi} from './scopedApi';
const key='00000000-0000-0000-0000-000000000001';const signal=()=>new AbortController().signal;
const input={title:'  MES Ω  ',inventoryNumber:' 0001 ',accessionNumber:'ACC'};
const item={id:50,catalogId:11,...input,version:0};
const receipt={item,origin:'MES_CREATED',requestId:key,replayed:false};
function response(body:unknown,status=201,tag='"0"',location='/api/v2/catalogs/11/items/50'){return new Response(JSON.stringify(body),{status,headers:{ETag:tag,Location:location,'Content-Type':'application/json'}});}
afterEach(()=>vi.unstubAllGlobals());
describe('creation and dimension batch transport boundaries',()=>{
 it('sends exact allowlisted strings and explicit idempotency key with safe fetch options',async()=>{
  const fetcher=vi.fn().mockResolvedValue(response(receipt));vi.stubGlobal('fetch',fetcher);const result=await scopedApi(11,'token').createItem(key,input,signal());expect(result.value.item.inventoryNumber).toBe(' 0001 ');expect(fetcher).toHaveBeenCalledWith(expect.stringContaining('/api/v2/catalogs/11/items'),expect.objectContaining({method:'POST',cache:'no-store',redirect:'error',credentials:'omit',headers:expect.objectContaining({'Idempotency-Key':key}),body:JSON.stringify(input)}));
 });
 it('recovery uses only actor-scoped GET without reposting',async()=>{
  const fetcher=vi.fn().mockResolvedValue(response({...receipt,replayed:true},200));vi.stubGlobal('fetch',fetcher);await scopedApi(11,'token').creationOutcome(key,signal());expect(fetcher).toHaveBeenCalledOnce();expect(fetcher.mock.calls[0][0]).toContain('/creation-requests/'+key);expect(fetcher.mock.calls[0][1].method).toBeUndefined();
 });
 it.each([401,403,404])('propagates status%s for every new operation without fallback',async status=>{
  const fetcher=vi.fn().mockResolvedValue(new Response('{}',{status}));vi.stubGlobal('fetch',fetcher);const api=scopedApi(11,'token');for(const action of [()=>api.createItem(key,input,signal()),()=>api.creationOutcome(key,signal()),()=>api.itemOrigin(50,signal()),()=>api.createDimensionsBatch(50,'"0"',[{type:'height',value:'1.00',unit:null}],signal())])await expect(action()).rejects.toMatchObject({status});expect(fetcher).toHaveBeenCalledTimes(4);
 });
 it.each([{...receipt,item:{...item,catalogId:21}},{...receipt,requestId:'00000000-0000-0000-0000-000000000002'},{...receipt,origin:'DEMUS_INVENTED'}])('rejects mismatched creation receipt',async body=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(response(body)));await expect(scopedApi(11,'token').createItem(key,input,signal())).rejects.toThrow();
 });
 it('rejects foreign Location or mismatched ETag even after201',async()=>{
  const fetcher=vi.fn().mockResolvedValueOnce(response(receipt,201,'"0"','/api/v2/catalogs/21/items/50')).mockResolvedValueOnce(response(receipt,201,'W/"0"'));vi.stubGlobal('fetch',fetcher);for(let n=0;n<2;n++)await expect(scopedApi(11,'token').createItem(key,input,signal())).rejects.toThrow();
 });
 it('batch preserves exact numeric tokens and validates the shared parent ETag',async()=>{
  const dim={id:1,itemId:50,catalogId:11,type:'height',value:'123456789012345678901234567890123456.78',unit:null,createdInScopedApi:true};const fetcher=vi.fn().mockResolvedValue(response({itemVersion:1,dimensions:[dim]},201,'"1"'));vi.stubGlobal('fetch',fetcher);const result=await scopedApi(11,'token').createDimensionsBatch(50,'"0"',[{type:'height',value:dim.value,unit:null}],signal());expect(result.value[0].value).toBe(dim.value);expect(fetcher.mock.calls[0][1].body).toBe('{"dimensions":[{"type":"height","value":123456789012345678901234567890123456.78,"unit":null}]}');
 });
 it('rejects duplicate dimension identities and unsafe input precision',async()=>{
  const dim={id:1,itemId:50,catalogId:11,type:'height',value:1,unit:null,createdInScopedApi:true};const fetcher=vi.fn().mockResolvedValue(response({itemVersion:1,dimensions:[dim,dim]},201,'"1"'));vi.stubGlobal('fetch',fetcher);const api=scopedApi(11,'token');await expect(api.createDimensionsBatch(50,'"0"',[{type:'height',value:'1',unit:null},{type:'width',value:'1',unit:null}],signal())).rejects.toThrow();await expect(api.createDimensionsBatch(50,'"0"',[{type:'height',value:'1.234',unit:null}],signal())).rejects.toThrow();expect(fetcher).toHaveBeenCalledOnce();
 });
 it('origin is scoped and unrecorded does not imply historical import',async()=>{
  const fetcher=vi.fn().mockResolvedValueOnce(response({catalogId:11,itemId:50,itemVersion:0,origin:'UNRECORDED',createdAt:null},200)).mockResolvedValueOnce(response({catalogId:21,itemId:50,itemVersion:0,origin:'MES_CREATED',createdAt:'2026-10-22T10:00:00Z'},200));vi.stubGlobal('fetch',fetcher);expect((await scopedApi(11,'token').itemOrigin(50,signal())).origin).toBe('UNRECORDED');await expect(scopedApi(11,'token').itemOrigin(50,signal())).rejects.toThrow();
 });
});
