import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {originalCreationFields,originalCanCreate,createOriginalItem,applyOriginalCreationBoundary} from './originalCreate';
import {bindOriginalCatalog} from './originalAdapter';
const catalog={id:1,code:'GEN',name:'Generated',version:0,institution:{id:1,code:'G',name:'Generated'},capabilities:['catalog.read','item.read','item.create'],creationEnabled:true};
beforeEach(()=>{vi.stubEnv('VITE_LOCAL_AUTH_ENABLED','false');bindOriginalCatalog(catalog,'GENERATED');});
afterEach(()=>{bindOriginalCatalog(null,null);vi.unstubAllGlobals();vi.unstubAllEnvs();});
it('allows century text only with current professional capability and blocks it during creation or permission denial',()=>{
 const root=document.createElement('form');root.innerHTML='<button data-scoped-dating>19. stol.</button>';const button=root.querySelector('button')!;
 applyOriginalCreationBoundary(root,true);expect(button.disabled).toBe(true);
 bindOriginalCatalog({...catalog,professionalWriteEnabled:true,capabilities:[...catalog.capabilities,'item.professional.write']},'writer');applyOriginalCreationBoundary(root,true);expect(button.disabled).toBe(false);applyOriginalCreationBoundary(root,false);expect(button.disabled).toBe(true);
});
it('preserves entered components/Unicode and sends explicit NULL for optional empty accession only',()=>{
 expect(originalCreationFields({title:'  Ω  ',inventoryNumber:'G-0001/Ž',accessionNumber:'',legacyData:{private:true},id:99})).toEqual({title:'  Ω  ',inventoryNumber:'G-0001/Ž',accessionNumber:null});
});
it.each([['inventoryNumber','   ','Inventární číslo'],['title','','Vyplňte název'],['accessionNumber','  ','Přírůstkové číslo'],['inventoryNumber','x'.repeat(256),'příliš dlouhá']])('validates %s before transport',async(field,value,message)=>{
 const fetch=vi.fn();vi.stubGlobal('fetch',fetch);await expect(createOriginalItem(crypto.randomUUID(),{title:'A',inventoryNumber:'001',accessionNumber:'', [field]:value})).rejects.toThrow(message);expect(fetch).not.toHaveBeenCalled();
});
it.each(['flag','permission'])('fails closed without creation %s',async which=>{
 bindOriginalCatalog({...catalog,creationEnabled:which!=='flag',capabilities:which==='permission'?['catalog.read','item.read']:catalog.capabilities},'OTHER');
 const fetch=vi.fn();vi.stubGlobal('fetch',fetch);expect(originalCanCreate()).toBe(false);await expect(createOriginalItem(crypto.randomUUID(),{title:'A',inventoryNumber:'001',accessionNumber:''})).rejects.toThrow('nemáte');expect(fetch).not.toHaveBeenCalled();
});
it('uses an explicit idempotency key, exact scoped location and no historical fields',async()=>{
 const key=crypto.randomUUID(),item={id:42,catalogId:1,title:'A',inventoryNumber:'001',accessionNumber:null,version:0};
 const fetch=vi.fn().mockResolvedValue(new Response(JSON.stringify({item,origin:'MES_CREATED',requestId:key,replayed:false}),{status:201,headers:{ETag:'"0"',Location:'/api/v2/catalogs/1/items/42','Cache-Control':'no-store'}}));vi.stubGlobal('fetch',fetch);
 expect((await createOriginalItem(key,{title:'A',inventoryNumber:'001',accessionNumber:'',raw:'NOT_SENT'})).value.item.id).toBe(42);
 const init=fetch.mock.calls[0][1];expect(init.headers['Idempotency-Key']).toBe(key);expect(JSON.parse(init.body)).toEqual({title:'A',inventoryNumber:'001',accessionNumber:null});
});
it('enables only original creation controls without restyling or exposing unrelated writes',()=>{
 const form=document.createElement('form');form.innerHTML='<input id="title"><input id="accessionNumber"><input aria-label="Inventární číslo: Hlavní číslo"><input id="description"><button>Unsupported save</button>';
 applyOriginalCreationBoundary(form,true);expect(form.querySelector<HTMLInputElement>('#title')!.disabled).toBe(false);expect(form.querySelector<HTMLInputElement>('#description')!.disabled).toBe(true);expect(form.querySelector('button')!.disabled).toBe(true);expect(form.getAttribute('style')).toBeNull();
 applyOriginalCreationBoundary(form,false);expect(form.querySelector<HTMLInputElement>('#title')!.disabled).toBe(true);
});
it('includes approved current sections in one creation payload and preserves explicit zero without source identity',()=>{
 bindOriginalCatalog({...catalog,capabilities:[...catalog.capabilities,'item.professional.write','item.inventory.write'],professionalWriteEnabled:true,inventoryWriteEnabled:true},'GENERATED');
 const value=originalCreationFields({title:'GENERATED',inventoryNumber:'GEN-0',accessionNumber:'',quantity:0,otherNumber:'X',description:'GENERATED Ž',author:'Author',legacyData:{never:'sent'},sourceLocalId:'not-new'});
 expect(value.inventory).toEqual({quantity:0,otherNumber:'X'});expect(value.professional).toMatchObject({description:'GENERATED Ž',authorText:'Author',originPlace:null});
 expect(value).not.toHaveProperty('legacyData');expect(value).not.toHaveProperty('sourceLocalId');
 const form=document.createElement('form');form.innerHTML='<input id="description"><input id="quantity"><input id="fundDictionaryId">';
 applyOriginalCreationBoundary(form,true);expect(form.querySelector<HTMLInputElement>('#description')!.disabled).toBe(false);expect(form.querySelector<HTMLInputElement>('#quantity')!.disabled).toBe(false);expect(form.querySelector<HTMLInputElement>('#fundDictionaryId')!.disabled).toBe(true);
});

it('includes approved private current storage without adopting historical fields',()=>{
 bindOriginalCatalog({...catalog,inventoryWriteEnabled:true,capabilities:[...catalog.capabilities,'item.inventory.write']},'token');
 const fields=originalCreationFields({title:'GENERATED',inventoryNumber:'GEN-STORAGE',locationBuilding:'GENERATED PRIVATE',locationRoom:'',permanentLocation:null,legacy_data:{storage:'SOURCE'}});
 expect(fields.storage).toEqual({locationBuilding:'GENERATED PRIVATE',locationRoom:null,permanentLocation:null});expect(JSON.stringify(fields)).not.toContain('SOURCE');
});

it('does not invent additional defaults but includes explicitly entered original scalars',()=>{
 bindOriginalCatalog({...catalog,professionalWriteEnabled:true,capabilities:[...catalog.capabilities,'item.professional.write']},'GENERATED');
 const base={title:'Generated',inventoryNumber:'GEN-ADD',accessionNumber:'',coordinateSystem:'WGS-84'};
 expect(originalCreationFields(base).additional).toBeUndefined();
 expect(originalCreationFields({...base,insuranceValue:'0',findingLocality:'Místo'}).additional).toMatchObject({insuranceValue:'0',findingLocality:'Místo',coordinateSystem:null});
});
