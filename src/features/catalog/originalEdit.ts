import type {CurrentSectionWrites,CurrentDimensionWrite,Dimension} from '../scoped/scopedApi';
import {originalSession} from './originalAdapter';
export type OriginalEditDomain='professional'|'inventory';
const professional={objectType:'objectType',description:'description',authorText:'author',datingText:'datingText',originPlace:'originPlace',materialText:'material',techniqueText:'technique',materialNote:'materialNote'};
const inventory={quantity:'quantity',otherNumber:'otherNumber'};
const storage={locationBuilding:'locationBuilding',locationRoom:'locationRoom',permanentLocation:'permanentLocation'};
export function originalCanEdit(domain:OriginalEditDomain){
 try{const {catalog}=originalSession();return catalog.capabilities?.includes(domain==='professional'?'item.professional.write':'item.inventory.write')===true&&(domain==='professional'?catalog.professionalWriteEnabled:catalog.inventoryWriteEnabled)===true;}catch{return false;}
}
export const originalEditHref=(id:number,domain:OriginalEditDomain)=>`/admin/items/edit/${id}?catalog=${originalSession().catalog.id}&edit=${domain}`;
export function currentSectionDraft(domain:OriginalEditDomain|'storage',baseline:Record<string,string|null>,form:Record<string,unknown>){
 const fields=domain==='professional'?professional:domain==='storage'?storage:inventory;
 if(!baseline||Object.keys(baseline).length!==Object.keys(fields).length||Object.keys(baseline).some(key=>!Object.hasOwn(fields,key))||Object.values(baseline).some(v=>v!==null&&typeof v!=='string'))throw new Error('Chybí úplný původní snapshot současné sekce.');
 const result={...baseline};let changed=false;
 for(const [field,key] of Object.entries(fields)){
  const before=baseline[field],input=form[key];
  if(String(input??'')===String(before??''))continue; // unchanged NULL stays NULL
  if(input!==null&&typeof input!=='string'&&!(domain==='inventory'&&field==='quantity'&&typeof input==='number'))throw new Error('Neplatný typ současného údaje.');
  result[field]=input===null?null:String(input);changed=true;
 }
 return {values:result,changed};
}
export function currentDimensionsDraft(baseline:Dimension[],draft:any[]):CurrentDimensionWrite[]{
 if(!Array.isArray(draft))throw new Error('Chybí úplný snapshot měr.');
 const found=new Set<number>();const rows:CurrentDimensionWrite[]=[];
 for(const row of draft){
  const before=row.id?baseline.find(v=>v.id===row.id):undefined;
  if(row.id&&(!before||found.has(row.id)))throw new Error('Neplatná nebo duplicitní identita míry.');if(row.id)found.add(row.id);
  const next:CurrentDimensionWrite={id:before?.id??null,type:String(row.dimensionType??row.type??''),value:String(row.value??''),unit:row.unit===null?null:String(row.unit??''),note:row.note===null?null:String(row.note??'')};
  const changed=!before||next.type!==before.type||next.value!==String(before.value??'')||String(next.unit??'')!==String(before.unit??'')||String(next.note??'')!==String(before.note??'');
  if(!changed)continue;if(before&&!before.createdInScopedApi)throw new Error('Historickou míru nelze přepsat.');
  if(before&&String(next.unit??'')===String(before.unit??''))next.unit=before.unit;
  if(before&&String(next.note??'')===String(before.note??''))next.note=before.note??null;
  rows.push(next);
 }
 if(baseline.some(row=>!found.has(row.id)))throw new Error('Existující míry nelze odebrat tímto formulářem.');return rows;
}
/** Exactly one native section per save, no legacy aggregate/identity/party writes. */
export async function saveOriginalCurrent(id:number,domain:OriginalEditDomain,session:any,form:Record<string,unknown>){
 const {api,signal,catalog}=originalSession();const snapshot=session?.scopedCurrent;
 if(!originalCanEdit(domain)||session?.itemId!==id||snapshot?.catalogId!==catalog.id||snapshot.etag!==session.etag||session.busy)throw new Error('Chybí oprávnění nebo původní verze této sekce, případně probíhá jiný zápis.');
 const changed:CurrentSectionWrites={};
 for(const section of ['inventory','professional',...(snapshot.storage?['storage'] as const:[])] as const){const draft=currentSectionDraft(section,snapshot[section],form);if(draft.changed){if(!originalCanEdit(section==='storage'?'inventory':section))throw new Error('Chybí oprávnění pro změněnou současnou sekci.');changed[section]=draft.values;}}
 if(snapshot.core){const core:Record<string,string|null>={};for(const key of ['title','inventoryNumber']){const value=form[key]===null?null:String(form[key]??'');if(String(snapshot.core[key]??'')!==String(value??''))core[key]=value;}if(Object.keys(core).length){if(!originalCanEdit('inventory'))throw new Error('Chybí oprávnění k inventární identitě.');changed.item=core;}}
 if(snapshot.dimensions){const rows=currentDimensionsDraft(snapshot.dimensions,form.dimensions as any[]);if(rows.length){if(!originalCanEdit('professional'))throw new Error('Chybí oprávnění k současným mírám.');changed.dimensions={rows};}}
 const sections=Object.keys(changed) as (keyof CurrentSectionWrites)[];if(!sections.length)return {saved:false};
 session.busy=true;
 try{if(sections.length===1&&sections[0]!=='item'&&sections[0]!=='dimensions')await api.saveCuratorRecord!(id,sections[0],session.etag,changed[sections[0]]!,signal);else await api.saveCuratorRecords(id,session.etag,changed,signal);}finally{session.busy=false;}
 return {saved:true};
}
/** A nonvisual bridge for the original aggregate form. Server ACL remains authoritative.
 * Unsupported native/custom controls stay in their original places but are disabled. */
export function applyOriginalEditBoundary(root:HTMLElement|null,_domain:OriginalEditDomain,enabled:boolean,loading:boolean){
 const allowed=new Set([...(originalCanEdit('professional')?['current-object-type','description','author','datingText','originPlace','current-material-text','current-technique-text','materialNote']:[]),...(originalCanEdit('inventory')?['quantity','current-other-number','title','inventoryNumber','locationBuilding','locationRoom','permanentLocation']:[])]);
 root?.querySelectorAll<HTMLElement>('input,textarea,select,button,gov-button,gov-form-input,gov-form-select').forEach(node=>{
  // This scoped editor owns its capability/read-only/busy boundary and shared item ETag.
  if(node.closest('[data-scoped-reference-editor]'))return;
  if(node.hasAttribute('data-scoped-navigation')||node.hasAttribute('data-scoped-read'))return;
  const active=enabled&&!loading&&(allowed.has(node.id)||node.hasAttribute('data-scoped-save')||originalCanEdit('professional')&&node.getAttribute('data-scoped-dimension')==='editable');
  (node as HTMLInputElement).disabled=!active;
  if(active)node.removeAttribute('disabled');else node.setAttribute('disabled','');
 });
}
