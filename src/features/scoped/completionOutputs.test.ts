import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {scopedApi,inventoryColumns} from './scopedApi';
import {curatorPageSemantics} from './curatorPageContract';
const signal=()=>new AbortController().signal;
const row=(id:number)=>({item:{id,catalogId:1,title:'GENERATED Ž',inventoryNumber:'GEN-'+id,accessionNumber:null,version:'0'},current:Object.fromEntries(['authorText','datingText','materialText','techniqueText','objectType','originPlace'].map(k=>[k,null])),currentPresent:false,currentInventory:{quantity:null,otherNumber:null},source:Object.fromEntries(Object.keys(inventoryColumns).map(k=>[k,null])),hasPhoto:false,hasAttachment:false});
beforeEach(()=>vi.stubEnv('VITE_LOCAL_AUTH_ENABLED','false'));
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
it('reads and validates all filtered print rows beyond page 50, preserving exact sort and AST',async()=>{
 const fetch=vi.fn().mockResolvedValue(new Response(JSON.stringify({catalogId:1,page:0,pageSize:10000,totalElements:105,totalPages:1,sort:'createdAt,desc',semantics:curatorPageSemantics,items:Array.from({length:105},(_,i)=>row(i+1))}),{headers:{'Cache-Control':'no-store, no-store'}}));vi.stubGlobal('fetch',fetch);
 const ast=JSON.stringify({id:'g',conjunction:'AND',conditions:[{id:'c',field:'title',operator:'CONTAINS',value:'Ž'}],groups:[]});
 const result=await scopedApi(1,'generated').curatorPrint('createdAt,desc',{advancedFilter:ast},signal());expect(result.items).toHaveLength(105);
 const [url,init]=fetch.mock.calls[0];expect(url).toContain('/curator-print');expect(init.method).toBe('POST');expect(JSON.parse(init.body)).toEqual({sort:'createdAt,desc',advancedFilter:ast});
});
it.each(['foreign','partial','duplicate','cache'])('rejects %s print output without rendering a partial or foreign result',async issue=>{
 const body={catalogId:issue==='foreign'?2:1,page:0,pageSize:10000,totalElements:2,totalPages:1,sort:'title,asc',semantics:curatorPageSemantics,items:issue==='partial'?[row(1)]:[row(1),row(issue==='duplicate'?1:2)]};
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify(body),{headers:{'Cache-Control':issue==='cache'?'private':'no-store'}})));
 await expect(scopedApi(1,'generated').curatorPrint('title,asc',{},signal())).rejects.toThrow();
});
it('requests only selected export columns through authenticated scoped POST',async()=>{
 const fetch=vi.fn().mockResolvedValue(new Response('GENERATED XLSX',{headers:{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Cache-Control':'no-store','X-CURATAS-Catalog-Id':'1'}}));vi.stubGlobal('fetch',fetch);
 expect(await (await scopedApi(1,'generated').curatorExcel('inventoryNumber,asc',{title:'Ž'},signal(),['title','source.Pocet_S'])).text()).toBe('GENERATED XLSX');
 const [url,init]=fetch.mock.calls[0];expect(url).toContain('/curator-export.xlsx');expect(init.headers.Authorization).toBe('Bearer generated');expect(JSON.parse(init.body)).toEqual({sort:'inventoryNumber,asc',title:'Ž',columns:'title,source.Pocet_S'});
});
it.each([{'Cache-Control':'no-cache'},{'X-CURATAS-Catalog-Id':'2'},{'Content-Type':'text/html'}])('rejects invalid export metadata %j',async change=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('GENERATED',{headers:{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Cache-Control':'no-store','X-CURATAS-Catalog-Id':'1',...change}})));
 await expect(scopedApi(1,'generated').curatorExcel('title,asc',{},signal())).rejects.toThrow();
});
