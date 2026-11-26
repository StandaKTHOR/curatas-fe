import {expect,it,vi} from 'vitest';
import {currentMatTechPaths,pathKey} from './currentMatTechPaths';
const row=(id:string)=>({kind:'MATERIAL_TECHNIQUE',payload:{materialAuthorityId:id}} as any);
const value=(id:string,parentId:string|null=null,type='MATERIAL',catalogId=1)=>({id,parentId,type,catalogId,label:id,version:'0',code:null});
it('automatically resolves all five independent assignments and exact 3-level ancestry with read calls only',async()=>{
 const dictionaryValue=vi.fn(async(_type:string,id:string)=>({value:id==='leaf'?value(id,'middle'):id==='middle'?value(id,'root'):value(id)}));
 const api={dictionaryValue} as any;const result=await currentMatTechPaths(api,['one','two','three','four','leaf'].map(row),new AbortController().signal);
 expect(Object.keys(result)).toHaveLength(5);expect(result[pathKey('MATERIAL','leaf')].values.map(v=>v.id)).toEqual(['root','middle','leaf']);
 expect(result[pathKey('MATERIAL','one')].values).toHaveLength(1);expect(dictionaryValue).toHaveBeenCalledTimes(7);
});
it('keeps duplicate authorities in distinct professional rows while sharing their read, never merging rows',async()=>{
 const rows=[row('same'),row('same')],api={dictionaryValue:vi.fn(async()=>({value:value('same')}))} as any;
 const r=await currentMatTechPaths(api,rows,new AbortController().signal);expect(r['MATERIAL:same'].values[0].id).toBe('same');expect(api.dictionaryValue).toHaveBeenCalledTimes(1);expect(rows).toHaveLength(2);
});
it.each(['cycle','depth','foreign','wrongType'])('preserves an unresolved UUID without inventing a path: %s',async scenario=>{
 const api={dictionaryValue:vi.fn(async(_type:string,id:string)=>({value:scenario==='cycle'?value(id,id):scenario==='depth'?value(id,id+'x'):scenario==='wrongType'?value(id,null,'TECHNIQUE'):id==='id'?value(id,'parent'):value(id,null,'MATERIAL',2)}))} as any;
 const r=await currentMatTechPaths(api,[row('id')],new AbortController().signal);expect(r['MATERIAL:id'].values).toEqual([]);expect(r['MATERIAL:id'].error).toBeTruthy();
});
