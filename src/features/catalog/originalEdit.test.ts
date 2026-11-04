import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {applyOriginalEditBoundary,currentSectionDraft,saveOriginalCurrent,additionalFields} from './originalEdit';
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
