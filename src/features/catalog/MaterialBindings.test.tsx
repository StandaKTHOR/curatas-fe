import {render,screen,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import MaterialBindings from './MaterialBindings';
import {bindOriginalCatalog} from './originalAdapter';
const ids=[1,2,3].map(n=>'10000000-0000-4000-8000-'+String(n).padStart(12,'0'));
const catalog={id:71,catalogId:71,code:'GENERATED',name:'Generated',version:0,institution:{id:1,code:'G',name:'Generated'},capabilities:['catalog.read','item.read','dictionary.read','item.professional.write'],professionalWriteEnabled:true};
const value=(i:number)=>({id:ids[i],catalogId:71,type:'MATERIAL',label:['Root','Child','Leaf'][i],code:null,parentId:i?ids[i-1]:null,version:0});
const reply=(body:unknown,version=0,status=200)=>new Response(JSON.stringify(body),{status,headers:{ETag:`"${version}"`,'Cache-Control':'no-store'}});
beforeEach(()=>{vi.stubEnv('VITE_ORIGINAL_SCOPED_TEST','true');vi.stubEnv('VITE_LOCAL_AUTH_ENABLED','false');bindOriginalCatalog(catalog,'SYNTHETIC_TOKEN');});
afterEach(()=>{bindOriginalCatalog(null,null);vi.unstubAllGlobals();vi.unstubAllEnvs();});
function transport(stale=false){
 let bound=false,version=0;
 const f=vi.fn().mockImplementation((url:string,init:any={})=>{
  if(url.includes('/references/')&&init.method){
   if(stale)return Promise.resolve(reply({},version,412));
   expect(init.headers['If-Match']).toBe(`"${version}"`);bound=init.method==='PUT';version++;
   return Promise.resolve(reply({id:101,catalogId:71,title:null,inventoryNumber:null,accessionNumber:null,version},version));
  }
  if(url.endsWith('/references'))return Promise.resolve(reply({catalogId:71,itemId:101,itemVersion:version,items:bound?[{id:ids[2],type:'MATERIAL',parentId:ids[1],code:null,label:'Leaf'}]:[]},version));
  if(url.includes('/values?'))return Promise.resolve(reply({items:[value(0),value(1),value(2)],nextAfterId:null}));
  return Promise.resolve(reply({type:'MATERIAL',ownership:'CATALOG_CREATED_ONLY',parentSupport:'EXPLICIT_SAME_TYPE',operations:['read']}));
 });vi.stubGlobal('fetch',f);return f;
}
async function selectLeaf(){
 await screen.findByRole('option',{name:'Root'});
 for(let n=0;n<3;n++)await userEvent.selectOptions(screen.getByLabelText(`Materiál — úroveň ${n+1}`),ids[n]);
}
it('keeps a reader without dictionary.read in the item context without an unauthorized association request',async()=>{
 bindOriginalCatalog({...catalog,capabilities:['catalog.read','item.read']},'GENERATED_READER');const f=vi.fn();vi.stubGlobal('fetch',f);render(<MaterialBindings itemId={101}/>);await screen.findByText(/Čtení číselníkových vazeb vyžaduje dictionary.read/);expect(f).not.toHaveBeenCalled();expect(screen.getByRole('button',{name:'Přidat vazbu'})).toBeDisabled();
});
it('saves a UUID leaf, reloads its actual association, propagates ETag and removes with the next version',async()=>{
 const f=transport(),onSave=vi.fn();render(<MaterialBindings itemId={101} onSave={onSave}/>);await selectLeaf();
 await userEvent.click(screen.getByRole('button',{name:'Přidat vazbu'}));
 await screen.findByText('Materiál: Leaf');expect(onSave).toHaveBeenCalledWith('"1"');
 await userEvent.click(screen.getByRole('button',{name:'Odebrat vazbu'}));
 await waitFor(()=>expect(onSave).toHaveBeenCalledWith('"2"'));
 expect(f.mock.calls.filter(([,init])=>['PUT','DELETE'].includes(init?.method)).map(([url])=>new URL(String(url),'https://unit.invalid').pathname)).toEqual([`/api/v2/catalogs/71/items/101/references/MATERIAL/${ids[2]}`,`/api/v2/catalogs/71/items/101/references/MATERIAL/${ids[2]}`]);
});
it('read-only viewing cannot submit any association mutation',async()=>{
 const f=transport();render(<MaterialBindings itemId={101} readOnly/>);await screen.findByRole('option',{name:'Root'});
 expect(screen.getByRole('button',{name:'Přidat vazbu'})).toBeDisabled();expect(screen.getByLabelText('Materiál — úroveň 1')).toBeDisabled();
 expect(f.mock.calls.every(([,init])=>!init?.method)).toBe(true);
});
it('stale ETag preserves the selected leaf and never retries the write',async()=>{
 const f=transport(true);render(<MaterialBindings itemId={101}/>);await selectLeaf();await userEvent.click(screen.getByRole('button',{name:'Přidat vazbu'}));
 await screen.findByRole('alert');expect(screen.getByLabelText('Materiál — úroveň 3')).toHaveValue(ids[2]);
 expect(f.mock.calls.filter(([,init])=>init?.method==='PUT')).toHaveLength(1);
});

it('shows QA no-DELETE restriction without silently removing a current binding',async()=>{
 vi.stubEnv('VITE_QA_NO_DELETE','true');const f=transport();render(<MaterialBindings itemId={101}/>);await selectLeaf();
 await userEvent.click(screen.getByRole('button',{name:'Přidat vazbu'}));await screen.findByText('Materiál: Leaf');
 expect(screen.getByRole('button',{name:'Odebrat vazbu'})).toBeDisabled();
 expect(screen.getByRole('button',{name:'Odebrat vazbu'})).toHaveAttribute('title',expect.stringContaining('QA nepovoluje'));
 expect(f.mock.calls.some(([,init])=>init?.method==='DELETE')).toBe(false);
});

it('refuses a duplicate existing UUID association without a second write',async()=>{
 const f=transport();render(<MaterialBindings itemId={101}/>);await selectLeaf();await userEvent.click(screen.getByRole('button',{name:'Přidat vazbu'}));await screen.findByText('Materiál: Leaf');await selectLeaf();await userEvent.click(screen.getByRole('button',{name:'Přidat vazbu'}));await screen.findByText('Tato číselníková vazba již existuje.');expect(f.mock.calls.filter(([,init])=>init?.method==='PUT')).toHaveLength(1);
});
it('does not display a previous item association or propagate its late save ETag after navigation',async()=>{
 const f=transport(),normal=f.getMockImplementation()!;let finish!:(r:Response)=>void;
 f.mockImplementation((url:string,init:any={})=>{
  if(url.includes('/references/')&&init.method==='PUT')return new Promise<Response>(r=>{finish=r;});
  if(url.endsWith('/102/references'))return Promise.resolve(reply({catalogId:71,itemId:102,itemVersion:0,items:[]}));
  return normal(url,init);
 });
 const onSave=vi.fn(),view=render(<MaterialBindings itemId={101} onSave={onSave}/>);await selectLeaf();await userEvent.click(screen.getByRole('button',{name:'Přidat vazbu'}));view.rerender(<MaterialBindings itemId={102} onSave={onSave}/>);expect(screen.queryByText('Materiál: Leaf')).not.toBeInTheDocument();
 finish(reply({id:101,catalogId:71,title:null,inventoryNumber:null,accessionNumber:null,version:1},1));await screen.findByText(/Žádné současné číselníkové vazby/);expect(onSave).not.toHaveBeenCalled();expect(screen.getByRole('button',{name:'Přidat vazbu'})).toBeDisabled();
});
