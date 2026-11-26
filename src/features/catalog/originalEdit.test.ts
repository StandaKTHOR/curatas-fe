import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {applyOriginalEditBoundary,currentSectionDraft,currentDimensionsDraft,saveOriginalCurrent,additionalFields} from './originalEdit';
import {bindOriginalCatalog} from './originalAdapter';
const p={objectType:null,description:'old',authorText:null,datingText:null,originPlace:null,materialText:null,techniqueText:null,materialNote:null};
const i={quantity:'0',otherNumber:null};
const catalog={id:71,catalogId:71,code:'GEN',name:'Generated',version:0,institution:{id:1,code:'G',name:'Generated'},capabilities:['catalog.read','item.read','item.professional.write','item.inventory.write'],professionalWriteEnabled:true,inventoryWriteEnabled:true};
const session=()=>({itemId:101,etag:'"0"',scopedCurrent:{catalogId:71,etag:'"0"',professional:{...p},inventory:{...i}}});
const form=()=>({objectType:'',description:'old',author:'',datingText:'',originPlace:'',material:'',technique:'',materialNote:'',quantity:0,otherNumber:null});
it('November CITEM: sends comma decimals exactly, including zero, without float conversion',()=>{
 expect(currentDimensionsDraft([], [{dimensionType:'Šířka',value:'4,00',unit:'cm',note:null}])[0].value).toBe('4.00');
 expect(currentDimensionsDraft([], [{dimensionType:'Váha',value:'0,0',unit:null,note:null}])[0].value).toBe('0.0');
 expect(()=>currentDimensionsDraft([], [{dimensionType:'Délka',value:'1,2,3'}])).toThrow();
});
beforeEach(()=>{vi.stubEnv('VITE_LOCAL_AUTH_ENABLED','false');bindOriginalCatalog(catalog,'t');});
afterEach(()=>{bindOriginalCatalog(null,null);vi.unstubAllGlobals();vi.unstubAllEnvs();});
it('allows century text shortcuts only for an enabled current professional editor',()=>{
 const root=document.createElement('form');root.innerHTML='<button data-scoped-dating>19. stol.</button><button>Unsupported action</button>';
 const shortcut=root.querySelector<HTMLButtonElement>('[data-scoped-dating]')!;
 applyOriginalEditBoundary(root,'professional',true,false);expect(shortcut.disabled).toBe(false);expect(root.querySelectorAll('button')[1].disabled).toBe(true);
 applyOriginalEditBoundary(root,'professional',true,true);expect(shortcut.disabled).toBe(true);
 applyOriginalEditBoundary(root,'professional',false,false);expect(shortcut.disabled).toBe(true);
 bindOriginalCatalog({...catalog,capabilities:['catalog.read','item.read','item.inventory.write']},'reader');applyOriginalEditBoundary(root,'inventory',true,false);expect(shortcut.disabled).toBe(true);
});
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
it('saves permitted inventory and professional drafts in one scoped transaction with one original If-Match',async()=>{
 const f=vi.fn().mockResolvedValue(new Response(JSON.stringify({catalogId:71,itemId:101,itemVersion:2,sections:['inventory','professional']}),{headers:{ETag:'"2"','Cache-Control':'no-store, no-store'}}));vi.stubGlobal('fetch',f);
 await expect(saveOriginalCurrent(101,'professional',session(),{...form(),quantity:7,author:'x'})).resolves.toEqual({saved:true});
 expect(f).toHaveBeenCalledTimes(1);expect(f.mock.calls[0][0]).toContain('/items/101/curator-records');expect(f.mock.calls[0][1].headers['If-Match']).toBe('"0"');
 expect(JSON.parse(f.mock.calls[0][1].body)).toEqual({inventory:{quantity:7,otherNumber:null},professional:{...p,authorText:'x'}});
});
it('locks legacy controls and enables only explicitly permitted current fields and existing save control',()=>{
 const root=document.createElement('form');root.innerHTML='<input id="author"><input id="quantity"><input id="inventoryNumber"><input id="latitude"><button data-scoped-save>Save</button><button data-scoped-navigation>Back</button><button id="clone">Clone</button>';
 applyOriginalEditBoundary(root,'professional',true,false);expect((root.querySelector('#author') as HTMLInputElement).disabled).toBe(false);for(const id of ['quantity','inventoryNumber','latitude'])expect((root.querySelector('#'+id) as HTMLInputElement).disabled).toBe(false);for(const id of ['clone'])expect((root.querySelector('#'+id) as HTMLInputElement).disabled).toBe(true);expect((root.querySelector('[data-scoped-save]') as HTMLButtonElement).disabled).toBe(false);expect((root.querySelector('[data-scoped-navigation]') as HTMLButtonElement).disabled).toBe(false);
 applyOriginalEditBoundary(root,'professional',false,false);expect((root.querySelector('#author') as HTMLInputElement).disabled).toBe(true);expect((root.querySelector('[data-scoped-save]') as HTMLButtonElement).disabled).toBe(true);
});
it('rejects incomplete section snapshots instead of filling missing metadata',()=>{expect(()=>currentSectionDraft('professional',{authorText:null},form())).toThrow('snapshot');});
it('maps all eight professional controls as exact current text without date or dictionary inference',()=>{
 const values={objectType:'GEN type',description:' Žluťoučký\ntext ',author:' GEN author ',datingText:'asi 17. stol.',originPlace:' GEN origin ',material:' GEN material ',technique:' GEN technique ',materialNote:' GEN note '};
 expect(currentSectionDraft('professional',p,{...form(),...values}).values).toEqual({objectType:values.objectType,description:values.description,authorText:values.author,datingText:values.datingText,originPlace:values.originPlace,materialText:values.material,techniqueText:values.technique,materialNote:values.materialNote});
});

it('saves current private storage through the original aggregate save with the shared parent ETag',async()=>{
 const snapshot={...session(),scopedCurrent:{...session().scopedCurrent,storage:{locationBuilding:'PRIVATE',locationRoom:null,permanentLocation:''}}};
 const fetch=vi.fn().mockResolvedValue(new Response('{}'));vi.stubGlobal('fetch',fetch);
 await saveOriginalCurrent(101,'inventory',snapshot,{...form(),locationBuilding:'PRIVATE',locationRoom:'ROOM',permanentLocation:''});
 expect(fetch.mock.calls[0][0]).toContain('/curator-record/storage');expect(fetch.mock.calls[0][1].headers['If-Match']).toBe('"0"');expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({locationBuilding:'PRIVATE',locationRoom:'ROOM',permanentLocation:''});
});

it('keeps default display values unasserted and saves exact additional decimal and original text',async()=>{
 const baseline=Object.fromEntries(additionalFields.map(k=>[k,null]));const controls=Object.fromEntries(additionalFields.map(k=>[k,'']));controls.coordinateSystem='WGS-84';
 expect(currentSectionDraft('additional',baseline,controls)).toEqual({values:baseline,changed:false});
 const draft=currentSectionDraft('additional',baseline,{...controls,insuranceValue:'123456789012345678901234567890.01',latitude:'0',findingLocality:' Žluťoučký '});expect(draft.values.insuranceValue).toBe('123456789012345678901234567890.01');expect(draft.values.coordinateSystem).toBeNull();expect(draft.values.findingLocality).toBe(' Žluťoučký ');
 const fetch=vi.fn().mockResolvedValue(new Response('{}'));vi.stubGlobal('fetch',fetch);const snap={...session(),scopedCurrent:{...session().scopedCurrent,additional:baseline}};
 await saveOriginalCurrent(101,'professional',snap,{...form(),...controls,insuranceValue:'0',longitude:'-180'});expect(fetch.mock.calls[0][0]).toContain('/curator-record/additional');expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({...baseline,insuranceValue:'0',longitude:'-180'});
});
it('enables original inventory component aria inputs only with inventory capability',()=>{
 const root=document.createElement('form');root.innerHTML='<input aria-label="Inventární číslo: řada"><input id="sourceLocalId">';applyOriginalEditBoundary(root,'inventory',true,false);expect(root.querySelector('input')!.disabled).toBe(false);expect((root.querySelector('#sourceLocalId') as HTMLInputElement).disabled).toBe(true);
 bindOriginalCatalog({...catalog,capabilities:['item.read','item.professional.write']},'other');applyOriginalEditBoundary(root,'professional',true,false);expect(root.querySelector('input')!.disabled).toBe(true);
});

it('saves flags atomically with current text and preserves NULL, false and source isolation',async()=>{
 vi.stubEnv('VITE_CURRENT_FLAGS_ENABLED','true');const {signal}=await import('./originalAdapter').then(m=>m.originalSession());
 const values={archive:null,card:'true',copied:'false',verified:null,marked:null};
 const draft={itemId:101,scopeSignal:signal,values,dirty:true};
 const f=vi.fn().mockResolvedValue(new Response(JSON.stringify({catalogId:71,itemId:101,itemVersion:2,sections:['flags','professional']}),{headers:{ETag:'"2"','Cache-Control':'no-store'}}));vi.stubGlobal('fetch',f);
 await expect(saveOriginalCurrent(101,'professional',session(),{...form(),description:'Žlutý'},draft)).resolves.toEqual({saved:true});
 expect(f).toHaveBeenCalledTimes(1);expect(f.mock.calls[0][0]).toContain('/curator-records');expect(JSON.parse(f.mock.calls[0][1].body)).toEqual({professional:{...p,description:'Žlutý'},flags:values});expect(draft.dirty).toBe(true);
});
it.each(['scope','item','value','disabled'])('refuses foreign or invalid flags before any write: %s',async which=>{
 vi.stubEnv('VITE_CURRENT_FLAGS_ENABLED',which==='disabled'?'false':'true');const {signal}=await import('./originalAdapter').then(m=>m.originalSession());const f=vi.fn();vi.stubGlobal('fetch',f);
 const draft={itemId:which==='item'?102:101,scopeSignal:which==='scope'?new AbortController().signal:signal,values:{archive:null,card:which==='value'?'DEMUS':'true',copied:null,verified:null,marked:null},dirty:true};
 await expect(saveOriginalCurrent(101,'professional',session(),{...form(),description:'new'},draft)).rejects.toThrow();expect(f).not.toHaveBeenCalled();expect(draft.dirty).toBe(true);
});

import {originalReturnPath} from './originalEdit';
it.each([['/admin/items','/items/101','/admin/items'],['/','/admin/items/view/101','/'],[null,'/items/101','/'],[null,'/admin/items/edit/101','/admin/items'],['https://foreign','/admin/items/view/101','/admin/items']])('preserves explicit list origin %s through %s',(origin,path,expected)=>expect(originalReturnPath(origin,path!)).toBe(expected));

import {originalDetailReturn} from './originalEdit';
it('CITEM T6/T12: edits one field, preserves omitted populated fields and explicit NULL/empty',async()=>{
 const populated={objectType:'typ',description:'popis',authorText:'autor',datingText:'1900',originPlace:'místo',materialText:'papír',techniqueText:'tisk',materialNote:'poznámka'};
 expect(currentSectionDraft('professional',populated,{description:'nový popis'})).toEqual({changed:true,values:{...populated,description:'nový popis'}});
 expect(currentSectionDraft('professional',populated,{})).toEqual({changed:false,values:populated});
 expect(currentSectionDraft('professional',populated,{author:undefined}).changed).toBe(false);
 expect(currentSectionDraft('professional',populated,{author:null}).values.authorText).toBeNull();
 expect(currentSectionDraft('professional',populated,{author:''}).values.authorText).toBe('');
 const original={...session(),scopedCurrent:{...session().scopedCurrent,professional:populated,core:{title:'title',inventoryNumber:'ZV 818'},dimensions:[{id:7,type:'width',value:'2',unit:'cm',note:null,createdInScopedApi:false}],historicalAuthorities:{MATERIAL:{recordId:'source-id'}}}};
 bindOriginalCatalog({...catalog,historicalAssignmentsEnabled:true},'t');
 let persisted={...populated};const fetch=vi.fn().mockImplementation(async(_url,options)=>{persisted=JSON.parse(options.body);return new Response('{}');});vi.stubGlobal('fetch',fetch);
 await saveOriginalCurrent(101,'professional',original,{description:'nový popis'});
 expect(persisted).toEqual({...populated,description:'nový popis'});expect(original.scopedCurrent.core.inventoryNumber).toBe('ZV 818');expect(original.scopedCurrent.historicalAuthorities.MATERIAL.recordId).toBe('source-id');expect(fetch).toHaveBeenCalledTimes(1);
});
it('CITEM T3/T4/T5: detail return preserves catalog and original route; rejects foreign routes',()=>{
 expect(originalDetailReturn(101,'/items/101?catalog=71')).toBe('/items/101?catalog=71');
 expect(originalDetailReturn(101,'/admin/items/view/101?catalog=71&tab=origin')).toBe('/admin/items/view/101?catalog=71&tab=origin');
 for(const path of ['https://foreign/items/101?catalog=71','/items/102?catalog=71','/items/101?catalog=72',null])expect(originalDetailReturn(101,path)).toBe('/admin/items/view/101?catalog=71');
});

it('keeps explicit NULL different from an existing empty text value',()=>{expect(currentSectionDraft('professional',{...p,description:''},{description:null})).toEqual({changed:true,values:{...p,description:null}});});
