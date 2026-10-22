import { afterEach,expect,it,vi } from 'vitest';
import { scopedApi } from './scopedApi';
import { catalogDictionaries } from '../catalog/dictionaryApi';
const id='00000000-0000-0000-0000-000000000111';const signal=()=>new AbortController().signal;
const input={label:'  Exact Ω  ',code:null,parentId:null,reason:'Review'};
afterEach(()=>vi.unstubAllGlobals());
it('search sends literal separate parameters without wildcard conversion or legacy fallback',async()=>{
    const fetcher=vi.fn().mockResolvedValue(new Response(JSON.stringify({items:[],nextAfterId:null})));vi.stubGlobal('fetch',fetcher);
    await scopedApi(11,'session').list(signal(),42,2,{inventory:' 00%_ ',title:'Ω'});
    const url=new URL(fetcher.mock.calls[0][0],'http://fixture');expect(url.searchParams.get('inventory')).toBe(' 00%_ ');expect(url.searchParams.get('title')).toBe('Ω');expect(url.searchParams.get('afterId')).toBe('42');expect(url.pathname).toBe('/api/v2/catalogs/11/items');
});
it('inventory response identity and source whitelist are checked before presentation',async()=>{
    const result={catalogId:11,itemId:101,itemVersion:0,inventoryNumber:' 0001 ',sourceLocalId:'000101',sourceInventoryNumber:' OLD ',sourceComponents:{ordinal:'0007',GPS:'SECRET'},aliases:[],nextAfterId:null};
    const fetcher=vi.fn().mockImplementation(()=>new Response(JSON.stringify(result),{headers:{ETag:'"0"'}}));vi.stubGlobal('fetch',fetcher);
    const data=await scopedApi(11,'session').inventoryEvidence(101,signal());expect(data.sourceLocalId).toBe('000101');expect(data.sourceComponents.ordinal).toBe('0007');expect(JSON.stringify(data)).not.toContain('SECRET');
    result.itemId=303;await expect(scopedApi(11,'session').inventoryEvidence(101,signal())).rejects.toThrow('Foreign inventory');
});
it.each([401,403,404,412])('all dictionary operations fail%s exactly once with no v1/static/redirect fallback',async status=>{
    const fetcher=vi.fn().mockImplementation(()=>new Response('{}',{status}));vi.stubGlobal('fetch',fetcher);const api=catalogDictionaries(11,'session');const s=signal();
    const operations=[()=>api.metadata(s),()=>api.dictionary('MATERIAL',s),()=>api.list('MATERIAL',{},s),()=>api.detail('MATERIAL',id,s),()=>api.create('MATERIAL',input,s),()=>api.update('MATERIAL',id,'"0"',input,s)];
    for(const op of operations)await expect(op()).rejects.toMatchObject({status});expect(fetcher).toHaveBeenCalledTimes(6);
    for(const [url,init] of fetcher.mock.calls){expect(String(url)).toContain('/api/v2/catalogs/11/dictionaries');expect(init).toMatchObject({signal:s,cache:'no-store',redirect:'error',credentials:'omit',headers:{Authorization:'Bearer session'}});}
});
it('legacy numeric IDs and parents are refused before a request',()=>{
    const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);const api=catalogDictionaries(11,'session');
    expect(()=>api.detail('MATERIAL','42',signal())).toThrow('UUID');expect(()=>api.create('MATERIAL',{...input,parentId:'42'},signal())).toThrow('UUID');expect(fetcher).not.toHaveBeenCalled();
});
it('same-catalog wrong UUID detail response is rejected',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({id:'00000000-0000-0000-0000-000000000222',catalogId:11,type:'MATERIAL',label:'Foreign response',code:null,parentId:null,version:0}),{headers:{ETag:'"0"'}})));
    await expect(catalogDictionaries(11,'session').detail('MATERIAL',id,signal())).rejects.toThrow('Invalid catalog');
});
