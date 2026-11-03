import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {applyOriginalEditBoundary,currentSectionDraft,saveOriginalCurrent} from './originalEdit';
import {bindOriginalCatalog} from './originalAdapter';
const p={objectType:null,description:'old',authorText:null,datingText:null,originPlace:null,materialText:null,techniqueText:null,materialNote:null};
const i={quantity:'0',otherNumber:null};
const catalog={id:71,catalogId:71,code:'GEN',name:'Generated',version:0,institution:{id:1,code:'G',name:'Generated'},capabilities:['catalog.read','item.read','item.professional.write','item.inventory.write'],professionalWriteEnabled:true,inventoryWriteEnabled:true};
const session=()=>({itemId:101,etag:'"0"',scopedCurrent:{catalogId:71,etag:'"0"',professional:{...p},inventory:{...i}}});
const form=()=>({objectType:'',description:'old',author:'',datingText:'',originPlace:'',material:'',technique:'',materialNote:'',quantity:0,otherNumber:null});
beforeEach(()=>{vi.stubEnv('VITE_LOCAL_AUTH_ENABLED','false');bindOriginalCatalog(catalog,'t');});
afterEach(()=>{bindOriginalCatalog(null,null);vi.unstubAllGlobals();vi.unstubAllEnvs();});
it('preserves unchanged NULLs, accepts explicit empty text, and never takes source fields',()=>{
 const draft=currentSectionDraft('professional',p,{...form(),description:'',author:'  Žlutý autor ',sourceInventory:{Autor_S:'HISTORICAL'},legacyData:{secret:'PRIVATE'}});
 expect(draft.values.authorText).toBe('  Žlutý autor ');expect(draft.values.description).toBe('');expect(draft.values.materialText).toBeNull();expect(Object.keys(draft.values)).toEqual(Object.keys(p));expect(JSON.stringify(draft.values)).not.toContain('HISTORICAL');
});
it('does not create an assertion when the current inputs are unchanged',async()=>{const f=vi.fn();vi.stubGlobal('fetch',f);expect(await saveOriginalCurrent(101,'professional',session(),form())).toEqual({saved:false});expect(f).not.toHaveBeenCalled();});
it('writes exactly one approved professional section with If-Match and no identity fields',async()=>{
 const f=vi.fn().mockResolvedValue(new Response('{}'));vi.stubGlobal('fetch',f);expect(await saveOriginalCurrent(101,'professional',session(),{...form(),author:'CURATOR',inventoryNumber:'NOT_SENT'})).toEqual({saved:true});
 expect(f).toHaveBeenCalledTimes(1);expect(f.mock.calls[0][0]).toContain('/api/v2/catalogs/71/items/101/curator-record/professional');expect(f.mock.calls[0][1].headers['If-Match']).toBe('"0"');expect(JSON.parse(f.mock.calls[0][1].body)).toEqual({...p,authorText:'CURATOR'});
});
it('writes native NULL quantity and exact other number without rewriting source components',async()=>{
 const f=vi.fn().mockResolvedValue(new Response('{}'));vi.stubGlobal('fetch',f);await saveOriginalCurrent(101,'inventory',session(),{...form(),quantity:null,otherNumber:' 001 '});expect(JSON.parse(f.mock.calls[0][1].body)).toEqual({quantity:null,otherNumber:' 001 '});
});
it.each(['flag','permission'])('refuses a write before transport when %s is missing',async which=>{
 bindOriginalCatalog({...catalog,professionalWriteEnabled:which==='flag'?false:true,capabilities:which==='permission'?['catalog.read','item.read']:catalog.capabilities},'t2');const f=vi.fn();vi.stubGlobal('fetch',f);await expect(saveOriginalCurrent(101,'professional',session(),{...form(),author:'x'})).rejects.toThrow('oprávnění');expect(f).not.toHaveBeenCalled();
});
it('refuses another catalog snapshot and never retries a stale write',async()=>{
 const f=vi.fn().mockResolvedValue(new Response('',{status:412}));vi.stubGlobal('fetch',f);const wrong=session();wrong.scopedCurrent.catalogId=72;await expect(saveOriginalCurrent(101,'professional',wrong,{...form(),author:'x'})).rejects.toThrow();expect(f).not.toHaveBeenCalled();await expect(saveOriginalCurrent(101,'professional',session(),{...form(),author:'x'})).rejects.toMatchObject({status:412});expect(f).toHaveBeenCalledTimes(1);
});
it('refuses combining inventory and professional drafts into an unreviewed aggregate save',async()=>{
 const f=vi.fn();vi.stubGlobal('fetch',f);await expect(saveOriginalCurrent(101,'professional',session(),{...form(),quantity:7,author:'x'})).rejects.toThrow('Jiná');expect(f).not.toHaveBeenCalled();
});
it('locks legacy controls and enables only the selected domain and existing save control',()=>{
 const root=document.createElement('form');root.innerHTML='<input id="author"><input id="quantity"><input id="inventoryNumber"><input id="latitude"><button data-scoped-save>Save</button><button data-scoped-navigation>Back</button><button id="clone">Clone</button>';
 applyOriginalEditBoundary(root,'professional',true,false);expect((root.querySelector('#author') as HTMLInputElement).disabled).toBe(false);for(const id of ['quantity','inventoryNumber','latitude','clone'])expect((root.querySelector('#'+id) as HTMLInputElement).disabled).toBe(true);expect((root.querySelector('[data-scoped-save]') as HTMLButtonElement).disabled).toBe(false);expect((root.querySelector('[data-scoped-navigation]') as HTMLButtonElement).disabled).toBe(false);
 applyOriginalEditBoundary(root,'professional',false,false);expect((root.querySelector('#author') as HTMLInputElement).disabled).toBe(true);expect((root.querySelector('[data-scoped-save]') as HTMLButtonElement).disabled).toBe(true);
});
it('rejects incomplete section snapshots instead of filling missing metadata',()=>{expect(()=>currentSectionDraft('professional',{authorText:null},form())).toThrow('snapshot');});
it('maps all eight professional controls as exact current text without date or dictionary inference',()=>{
 const values={objectType:'GEN type',description:' Žluťoučký\ntext ',author:' GEN author ',datingText:'asi 17. stol.',originPlace:' GEN origin ',material:' GEN material ',technique:' GEN technique ',materialNote:' GEN note '};
 expect(currentSectionDraft('professional',p,{...form(),...values}).values).toEqual({objectType:values.objectType,description:values.description,authorText:values.author,datingText:values.datingText,originPlace:values.originPlace,materialText:values.material,techniqueText:values.technique,materialNote:values.materialNote});
});
