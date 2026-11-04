import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {bindOriginalCatalog} from './originalAdapter';
import {currentDimensionsDraft,saveOriginalCurrent,applyOriginalEditBoundary} from './originalEdit';
import type {Dimension} from '../scoped/scopedApi';
const p={objectType:null,description:null,authorText:null,datingText:null,originPlace:null,materialText:null,techniqueText:null,materialNote:null};
const original:Dimension={id:2001,catalogId:1,itemId:7,type:'GENERATED SOURCE',value:'1.00',unit:'mm',note:null,createdInScopedApi:false};
const current:Dimension={id:2002,catalogId:1,itemId:7,type:'GENERATED Výška',value:'0.00',unit:null,note:null,createdInScopedApi:true};
const view=(row:Dimension)=>({...row,dimensionType:row.type,unit:row.unit??'',note:row.note??''});
const catalog={id:1,code:'GENERATED',name:'Generated',version:0,institution:{id:1,code:'GEN',name:'Generated'},capabilities:['catalog.read','item.read','item.professional.write'],professionalWriteEnabled:true};
beforeEach(()=>{vi.stubEnv('VITE_LOCAL_AUTH_ENABLED','false');bindOriginalCatalog(catalog,'generated');});afterEach(()=>{bindOriginalCatalog(null,null);vi.unstubAllGlobals();vi.unstubAllEnvs();});
it('retains unchanged NULL note/unit and historical rows without inventing assertions',()=>expect(currentDimensionsDraft([original,current],[view(original),view(current)])).toEqual([]));
it('preserves all decimal digits and sends a changed note with its owned current identity',()=>{const result=currentDimensionsDraft([original,current],[view(original),{...view(current),value:'123456789012345678901234567890123456.12',note:'GENERATED Ž'}]);expect(result).toEqual([{id:2002,type:current.type,value:'123456789012345678901234567890123456.12',unit:null,note:'GENERATED Ž'}]);});
it.each(['edit-source','remove-source','remove-current','duplicate'])('refuses %s without converting source data or implying DELETE',issue=>{
 const rows:any[]=[view(original),view(current)];if(issue==='edit-source')rows[0].value='2';if(issue==='remove-source')rows.shift();if(issue==='remove-current')rows.pop();if(issue==='duplicate')rows.push(view(current));expect(()=>currentDimensionsDraft([original,current],rows)).toThrow();
});
it('saves a new original-form row and approved current fields in one atomic If-Match request',async()=>{
 const fetch=vi.fn().mockResolvedValue(new Response(JSON.stringify({catalogId:1,itemId:7,itemVersion:2,sections:['dimensions','professional']}),{headers:{ETag:'"2"','Cache-Control':'no-store'}}));vi.stubGlobal('fetch',fetch);
 const session={itemId:7,etag:'"0"',scopedCurrent:{catalogId:1,etag:'"0"',professional:p,inventory:{quantity:null,otherNumber:null},dimensions:[current]}};
 const form={objectType:'',description:'GENERATED',author:'',datingText:'',originPlace:'',material:'',technique:'',materialNote:'',quantity:null,otherNumber:null,dimensions:[view(current),{dimensionType:'Délka',value:'0',unit:'mm',note:''}]};
 expect(await saveOriginalCurrent(7,'professional',session,form)).toEqual({saved:true});expect(fetch).toHaveBeenCalledTimes(1);const [url,init]=fetch.mock.calls[0];expect(url).toContain('/curator-records');expect(init.headers['If-Match']).toBe('"0"');expect(JSON.parse(init.body).dimensions.rows).toEqual([{id:null,type:'Délka',value:'0',unit:'mm',note:''}]);
});
it('enables existing row controls only for current editable rows, never source rows or removal of persisted dimensions',()=>{
 const form=document.createElement('form');form.innerHTML='<input data-scoped-dimension="editable"><input data-scoped-dimension="readonly"><button data-scoped-dimension="readonly">Odebrat</button>';applyOriginalEditBoundary(form,'professional',true,false);expect(form.children[0]).not.toBeDisabled();expect(form.children[1]).toBeDisabled();expect(form.children[2]).toBeDisabled();
});
