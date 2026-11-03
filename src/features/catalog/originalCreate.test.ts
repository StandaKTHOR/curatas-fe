import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {originalCreationFields,originalCanCreate,createOriginalItem,applyOriginalCreationBoundary} from './originalCreate';
import {bindOriginalCatalog} from './originalAdapter';
const catalog={id:1,code:'GEN',name:'Generated',version:0,institution:{id:1,code:'G',name:'Generated'},capabilities:['catalog.read','item.read','item.create'],creationEnabled:true};
beforeEach(()=>{vi.stubEnv('VITE_LOCAL_AUTH_ENABLED','false');bindOriginalCatalog(catalog,'GENERATED');});
afterEach(()=>{bindOriginalCatalog(null,null);vi.unstubAllGlobals();vi.unstubAllEnvs();});
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
