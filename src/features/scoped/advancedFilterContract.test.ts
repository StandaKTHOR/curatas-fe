import {afterEach,expect,it,vi} from 'vitest';
import {curatorQuery} from './curatorContract';
import {scopedApi} from './scopedApi';
const group=(field='title',operator='CONTAINS',value='Ž %_')=>({id:'generated',conjunction:'AND',conditions:[{id:'condition',field,operator,value}],groups:[]});
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
it('preserves original AST JSON and supports explicit createdAt without aliasing',()=>{
 const ast=JSON.stringify(group());const query=curatorQuery(163,50,'createdAt,desc',{advancedFilter:ast});
 expect(query.get('sort')).toBe('createdAt,desc');expect(query.get('advancedFilter')).toBe(ast);
});
it('submits advanced queries through authenticated read-only POST instead of oversized request lines',async()=>{
 vi.stubEnv('VITE_LOCAL_AUTH_ENABLED','false');
 const fetch=vi.fn().mockResolvedValue(new Response(JSON.stringify({catalogId:1,page:0,pageSize:50,sort:'createdAt,desc',totalElements:0,totalPages:0,semantics:'CURRENT_ASSERTIONS_AND_SEPARATELY_LABELLED_SOURCE_INVENTORY',items:[]}),{headers:{'Cache-Control':'no-store, no-store'}}));vi.stubGlobal('fetch',fetch);
 const ast=JSON.stringify(group());const result=await scopedApi(1,'generated-token').curatorPage(0,50,'createdAt,desc',{advancedFilter:ast},new AbortController().signal);
 expect(result.totalElements).toBe(0);expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/catalogs/1/items/curator-page/query'),expect.objectContaining({method:'POST',cache:'no-store',body:JSON.stringify({page:'0',size:'50',sort:'createdAt,desc',advancedFilter:ast})}));
});
it.each(['legacy_data','locationRoom','countryOfOrigin','inventedSource'])('rejects specifically unsupported semantics %s rather than dropping a clause',field=>{
 expect(()=>curatorQuery(0,50,'inventoryNumber,asc',{advancedFilter:JSON.stringify(group(field))})).toThrow('nemá schválenou scoped sémantiku');
});
it('rejects invalid operators/depth/ranges and retains explicit NULL/empty operations',()=>{
 expect(()=>curatorQuery(0,50,'title,asc',{advancedFilter:JSON.stringify(group('title','GREATER_THAN','2'))})).toThrow();
 const range={...group('currentQuantity','BETWEEN','2'),conditions:[{field:'currentQuantity',operator:'BETWEEN',value:'2',valueTo:'1'}]};
 expect(()=>curatorQuery(0,50,'title,asc',{advancedFilter:JSON.stringify(range)})).toThrow('rozsah');
 for(const op of ['IS_EMPTY','IS_NOT_EMPTY','NOT_EQUALS'])expect(curatorQuery(0,50,'title,asc',{advancedFilter:JSON.stringify(group('title',op,''))}).has('advancedFilter')).toBe(true);
});
