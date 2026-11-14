import {afterEach,expect,it,vi} from 'vitest';
import {curatorQuery} from './curatorContract';
import {scopedApi} from './scopedApi';
const group=(field='title',operator='CONTAINS',value='Ž %_')=>({id:'generated',conjunction:'AND',conditions:[{id:'condition',field,operator,value}],groups:[]});
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
it('preserves the distinct historical accession AST, original spaces and existing sort/pagination',()=>{
 const ast=JSON.stringify(group('historicalAccessionNumber','EQUALS',' Etn 62/2014 '));const q=curatorQuery(1,50,'inventoryNumber,desc',{advancedFilter:ast});expect(q.get('advancedFilter')).toBe(ast);expect(q.get('page')).toBe('1');expect(q.get('sort')).toBe('inventoryNumber,desc');
 expect(()=>curatorQuery(0,50,'title,asc',{advancedFilter:JSON.stringify(group('historicalAccessionNumber','GREATER_THAN','1'))})).toThrow();
});
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
it.each(['legacy_data','unknownCurrentField','unsupportedCountryAuthority','inventedSource'])('rejects specifically unsupported semantics %s rather than dropping a clause',field=>{
 expect(()=>curatorQuery(0,50,'inventoryNumber,asc',{advancedFilter:JSON.stringify(group(field))})).toThrow('nemá schválenou scoped sémantiku');
});
it('rejects invalid operators/depth/ranges and retains explicit NULL/empty operations',()=>{
 expect(()=>curatorQuery(0,50,'title,asc',{advancedFilter:JSON.stringify(group('title','GREATER_THAN','2'))})).toThrow();
 const range={...group('currentQuantity','BETWEEN','2'),conditions:[{field:'currentQuantity',operator:'BETWEEN',value:'2',valueTo:'1'}]};
 expect(()=>curatorQuery(0,50,'title,asc',{advancedFilter:JSON.stringify(range)})).toThrow('rozsah');
 for(const op of ['IS_EMPTY','IS_NOT_EMPTY','NOT_EQUALS'])expect(curatorQuery(0,50,'title,asc',{advancedFilter:JSON.stringify(group('title',op,''))}).has('advancedFilter')).toBe(true);
});

it('accepts current country and reviewed calendar dates without guessing historical chronology',()=>{
 for(const [field,op,value] of [['countryOfOrigin','EQUALS','Česká republika'],['datingFrom','GREATER_THAN','0001-01-01'],['datingTo','LESS_THAN','2026-11-04']])expect(()=>curatorQuery(0,50,'title,asc',{advancedFilter:JSON.stringify(group(field,op,value))})).not.toThrow();
 for(const value of ['2025-02-29','0000-01-01','1500','1e5'])expect(()=>curatorQuery(0,50,'title,asc',{advancedFilter:JSON.stringify(group('datingFrom','GREATER_THAN',value))})).toThrow();
});

it('preserves a separate historical dating filter without converting a year into an ISO date',()=>{
 const ast=JSON.stringify(group('historicalDatingText','CONTAINS','1982'));expect(curatorQuery(0,50,'inventoryNumber,asc',{advancedFilter:ast}).get('advancedFilter')).toBe(ast);
 expect(()=>curatorQuery(0,50,'inventoryNumber,asc',{advancedFilter:JSON.stringify(group('historicalDatingText','GREATER_THAN','1982'))})).toThrow();
});

it('accepts exact MatTech UUID equality and presence but rejects text approximations',()=>{
 const uuid='00000000-0000-0000-0000-000000000123';for(const field of ['materialAuthorityId','techniqueAuthorityId']){
 const ast=JSON.stringify(group(field,'EQUALS',uuid));expect(curatorQuery(0,50,'title,asc',{advancedFilter:ast}).get('advancedFilter')).toBe(ast);
 for(const op of ['CONTAINS','STARTS_WITH'])expect(()=>curatorQuery(0,50,'title,asc',{advancedFilter:JSON.stringify(group(field,op,uuid))})).toThrow();
 expect(()=>curatorQuery(0,50,'title,asc',{advancedFilter:JSON.stringify(group(field,'EQUALS','Papír'))})).toThrow();
 }
});
