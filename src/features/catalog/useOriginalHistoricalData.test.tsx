import {renderHook,waitFor,cleanup,act} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {bindOriginalCatalog,currentForm} from './originalAdapter';
import {currentSectionDraft,saveOriginalCurrent} from './originalEdit';
import {useOriginalHistoricalData,historicalControl,demusText,currentBinding} from './useOriginalHistoricalData';
const api=vi.hoisted(()=>({sourceInventory:vi.fn(),curatorRecord:vi.fn(),saveCuratorRecord:vi.fn()}));
vi.mock('../scoped/scopedApi',async original=>({...await original<typeof import('../scoped/scopedApi')>(),scopedApi:()=>api}));
const catalog={id:1,code:'POLAKOVA',name:'Generated fixture',version:0,institution:{id:1,code:'GEN',name:'Generated'},capabilities:['catalog.read','item.read','item.professional.write'],professionalWriteEnabled:true};
const p={objectType:null,description:null,authorText:null,datingText:null,originPlace:null,materialText:null,techniqueText:null,materialNote:null};
const i={quantity:null,otherNumber:null};
const source=(name='kredenc kuchyňská',etag='"0"')=>({etag,itemVersion:etag.slice(1,-1),fields:{Predmet_S:name,Titul_S:null,Fond_S:'nábytek',Pocet_S:'0',Zapsal_S:'GENERATED Čeřovský',Urcil_S:'GENERATED Žluťoučký',DatZap_S:'1899-12-30',DatZm_S:null}});
const session=(id=3,cat=1,etag='"0"')=>({itemId:id,etag,scopedCurrent:{catalogId:cat,etag,professional:{...p},inventory:{...i}}});
const deferred=()=>{let resolve!:(v:any)=>void;const promise=new Promise<any>(r=>{resolve=r;});return {promise,resolve};};
beforeEach(()=>{vi.resetAllMocks();bindOriginalCatalog(catalog,'generated-token');api.sourceInventory.mockResolvedValue(source());api.curatorRecord.mockResolvedValue({etag:'"0"',value:{fundRecordId:null,objectTypeRecordId:null}});});
afterEach(()=>{cleanup();bindOriginalCatalog(null,null);});
it.each(['kredenc kuchyňská','židle'])('presents supplied reference name %s and Czech fund without changing current fields',async name=>{
 api.sourceInventory.mockResolvedValue(source(name));const current={title:'',objectType:'',description:'',author:'',datingText:'',originPlace:'',material:'',technique:'',materialNote:'',quantity:null,otherNumber:null,fundDictionaryId:null};Object.freeze(current);
 const v=renderHook(()=>useOriginalHistoricalData(3,session(),true));await waitFor(()=>expect(v.result.current?.fields.Predmet_S).toBe(name));
 expect(historicalControl(current.title,v.result.current?.fields.Predmet_S,true).value).toBe(`${name} (DEMUS)`);
 expect(historicalControl(current.title,v.result.current?.fields.Predmet_S,false)).toEqual({value:'',placeholder:`${name} (DEMUS)`});
 expect(currentSectionDraft('professional',p,current)).toEqual({changed:false,values:p});expect(current.fundDictionaryId).toBeNull();
 expect(await saveOriginalCurrent(3,'professional',session(),current)).toEqual({saved:false});expect(api.saveCuratorRecord).not.toHaveBeenCalled();
 await saveOriginalCurrent(3,'professional',session(),{...current,description:'CURRENT EDIT'});
 expect(api.saveCuratorRecord.mock.calls[0].slice(0,4)).toEqual([3,'professional','"0"',{...p,description:'CURRENT EDIT'}]);expect(JSON.stringify(api.saveCuratorRecord.mock.calls)).not.toContain(name);
});
it.each([['Současný název','kredenc kuchyňská'],['Jiný fond','nábytek'],[0,'7'],['0','5']])('prioritizes existing current %s over conflicting source %s',(current,historical)=>{
 expect(historicalControl(current,historical,true).value).toBe(String(current));expect(historicalControl(current,historical,false).value).toBe(String(current));
});
it('keeps missing, empty, NULL and zero distinct without date reinterpretation',()=>{
 expect(historicalControl(null,null,true).value).toBe('');expect(historicalControl('',undefined,false).value).toBe('');expect(demusText(null)).toBe('—');expect(demusText('')).toBe('Prázdný řetězec (DEMUS)');expect(demusText('0')).toBe('0 (DEMUS)');expect(demusText('00.00.0000')).toBe('00.00.0000 (DEMUS)');expect(currentBinding('VERIFIED_RECORD_ID')).toContain('VERIFIED_RECORD_ID');
 const form=currentForm({etag:'"0"',value:{id:3,catalogId:1,title:null}},{etag:'"0"',present:false,value:p},{etag:'"0"',value:i});expect(form.author).toBeNull();expect(form.datingText).toBeNull();expect(form.description).toBeNull();
});
it('refuses a different source or authority revision',async()=>{
 api.sourceInventory.mockResolvedValue(source('STALE','"1"'));const v=renderHook(()=>useOriginalHistoricalData(3,session(),true));await waitFor(()=>expect(api.curatorRecord).toHaveBeenCalled());expect(v.result.current).toBeNull();
});
it('clears the previous item immediately and ignores late responses',async()=>{
 const late=deferred();api.sourceInventory.mockReturnValueOnce(late.promise).mockResolvedValueOnce(source('židle'));
 const v=renderHook(({id})=>useOriginalHistoricalData(id,session(id),true),{initialProps:{id:3}});v.rerender({id:4});await waitFor(()=>expect(v.result.current?.fields.Predmet_S).toBe('židle'));await act(async()=>late.resolve(source()));expect(v.result.current?.fields.Predmet_S).toBe('židle');
});
it('clears populated data on catalog change and rejects the old session snapshot',async()=>{
 const v=renderHook(({cat})=>useOriginalHistoricalData(3,session(3,cat),true),{initialProps:{cat:1}});await waitFor(()=>expect(v.result.current).not.toBeNull());
 bindOriginalCatalog({...catalog,id:2},'new-token');v.rerender({cat:1});expect(v.result.current).toBeNull();api.sourceInventory.mockResolvedValue(source('OTHER CATALOG'));v.rerender({cat:2});await waitFor(()=>expect(v.result.current?.fields.Predmet_S).toBe('OTHER CATALOG'));
});
it('does not expose old data during authentication or ETag changes',async()=>{
 const v=renderHook(({etag})=>useOriginalHistoricalData(3,session(3,1,etag),true),{initialProps:{etag:'"0"'}});await waitFor(()=>expect(v.result.current).not.toBeNull());api.sourceInventory.mockReturnValue(new Promise(()=>{}));bindOriginalCatalog(catalog,'another-user');v.rerender({etag:'"0"'});expect(v.result.current).toBeNull();v.rerender({etag:'"1"'});expect(v.result.current).toBeNull();
});
it('aborts on unmount and never loads source for creation or disabled legacy mode',async()=>{
 const v=renderHook(()=>useOriginalHistoricalData(3,session(),true));await waitFor(()=>expect(api.sourceInventory).toHaveBeenCalled());const signal=api.sourceInventory.mock.calls[0][1];v.unmount();expect(signal.aborted).toBe(true);api.sourceInventory.mockClear();renderHook(()=>useOriginalHistoricalData(undefined,null,true));renderHook(()=>useOriginalHistoricalData(3,session(),false));expect(api.sourceInventory).not.toHaveBeenCalled();
});
it('does not retry failed source reads or turn them into current assertions',async()=>{
 api.sourceInventory.mockRejectedValue(new Error('API denied'));const v=renderHook(()=>useOriginalHistoricalData(3,session(),true));await waitFor(()=>expect(api.sourceInventory).toHaveBeenCalledTimes(1));expect(v.result.current).toBeNull();expect(api.saveCuratorRecord).not.toHaveBeenCalled();
});
