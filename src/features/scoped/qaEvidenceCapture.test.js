import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {afterEach,expect,it,vi} from 'vitest';
import {inventoryColumns,scopedApi} from './scopedApi';
import {curatorCurrentFields} from './curatorContract';
const script=readFileSync('scripts/qa-release/capture-curator-response.js','utf8');
const row=()=>({item:{id:1001,catalogId:1,title:'SENSITIVE GENERATED TITLE',inventoryNumber:'SENSITIVE GENERATED NUMBER',accessionNumber:null,version:'9223372036854775807'},current:Object.fromEntries(curatorCurrentFields.map(k=>[k,null])),currentPresent:false,currentInventory:{quantity:null,otherNumber:null},source:Object.fromEntries(Object.keys(inventoryColumns).map(k=>[k,null])),hasPhoto:false,hasAttachment:null});
const body=(item)=>({catalogId:1,page:0,pageSize:50,sort:'inventoryNumber,asc',semantics:'CURRENT_ASSERTIONS_AND_SEPARATELY_LABELLED_SOURCE_INVENTORY',totalElements:1,totalPages:1,items:[item]});
async function capture(value){
 const logs=[];const headers=new Headers();headers.append('Cache-Control','no-store');headers.append('Cache-Control','no-store');
 const original=vi.fn().mockResolvedValue(new Response(JSON.stringify(value),{headers}));const window={fetch:original};
 runInNewContext(script,{window,Request,URL,location:{href:'https://mes-qa.internal:8444/admin/items',origin:'https://mes-qa.internal:8444'},console:{log:(text)=>logs.push(text)}});
 expect(original).not.toHaveBeenCalled();
 await window.fetch('https://mes-qa.internal:8444/api/v2/catalogs/1/items/curator-page?page=0&size=50&sort=inventoryNumber%2Casc');
 expect(window.fetch).toBe(original);expect(original).toHaveBeenCalledTimes(1);
 const output=logs.find(text=>text.startsWith('{'));expect(output).toBeTruthy();
 expect(logs.join('')).not.toContain('SENSITIVE');
 return JSON.parse(output);
}
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
it('reproduces the operator-confirmed single failed check with 8155/164/50 metadata and 50 GENERATED valid DTOs',async()=>{
 const value={...body(row()),totalElements:8155,totalPages:164,items:Array.from({length:50},(_,index)=>{const r=row();return {...r,item:{...r.item,id:1001+index}};})};
 const report=await capture(value);
 expect(report.failed).toEqual(['Cache-Control exact original check']);
 expect(report.dtoAudit).toEqual({checkedItems:50,valid:true,failures:[]});
});
it('captures the merged browser header and audits DTOs without logging item values or losing bigint versions',async()=>{
 const report=await capture(body(row()));
 expect(report.response.cacheControl).toBe('no-store, no-store');
 expect(report.failed).toEqual(['Cache-Control exact original check']);
 expect(report.dtoAudit).toMatchObject({checkedItems:1,valid:true,failures:[]});
});
it.each([
 ['item nullable text',(r)=>({...r,item:{...r.item,title:{unexpected:'SENSITIVE'}}})],
 ['item.catalogId',(r)=>({...r,item:{...r.item,catalogId:2}})],
 ['source',(r)=>({...r,source:{}})],
 ['media presence',(r)=>({...r,hasPhoto:'yes'})],
])('diagnoses %s and agrees with the production DTO rejection',async(field,change)=>{
 const value=body(change(row()));const report=await capture(value);
 expect(report.dtoAudit.valid).toBe(false);expect(report.dtoAudit.failures).toContainEqual({index:0,field});
 vi.stubEnv('VITE_LOCAL_AUTH_ENABLED','false');
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify(value),{headers:{'Cache-Control':'no-store, no-store'}})));
 await expect(scopedApi(1,'generated-test-session').curatorPage(0,50,'inventoryNumber,asc',{},new AbortController().signal)).rejects.toThrow();
});
