import {originalSession} from './originalAdapter';
export type OriginalEditDomain='professional'|'inventory';
const professional={objectType:'objectType',description:'description',authorText:'author',datingText:'datingText',originPlace:'originPlace',materialText:'material',techniqueText:'technique',materialNote:'materialNote'};
const inventory={quantity:'quantity',otherNumber:'otherNumber'};
export function originalCanEdit(domain:OriginalEditDomain){
 try{const {catalog}=originalSession();return catalog.capabilities?.includes(domain==='professional'?'item.professional.write':'item.inventory.write')===true&&(domain==='professional'?catalog.professionalWriteEnabled:catalog.inventoryWriteEnabled)===true;}catch{return false;}
}
export const originalEditHref=(id:number,domain:OriginalEditDomain)=>`/admin/items/edit/${id}?catalog=${originalSession().catalog.id}&edit=${domain}`;
export function currentSectionDraft(domain:OriginalEditDomain,baseline:Record<string,string|null>,form:Record<string,unknown>){
 const fields=domain==='professional'?professional:inventory;
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
/** Exactly one native section per save, no legacy aggregate/identity/party writes. */
export async function saveOriginalCurrent(id:number,domain:OriginalEditDomain,session:any,form:Record<string,unknown>){
 const {api,signal,catalog}=originalSession();const snapshot=session?.scopedCurrent;
 if(!originalCanEdit(domain)||session?.itemId!==id||snapshot?.catalogId!==catalog.id||snapshot.etag!==session.etag||session.busy)throw new Error('Chybí oprávnění nebo původní verze této sekce, případně probíhá jiný zápis.');
 const changed:Partial<Record<OriginalEditDomain|'item',Record<string,string|null>>>={};
 for(const section of ['inventory','professional'] as const){const draft=currentSectionDraft(section,snapshot[section],form);if(draft.changed){if(!originalCanEdit(section))throw new Error('Chybí oprávnění pro změněnou současnou sekci.');changed[section]=draft.values;}}
 if(snapshot.core){const core:Record<string,string|null>={};for(const key of ['title','inventoryNumber']){const value=form[key]===null?null:String(form[key]??'');if(String(snapshot.core[key]??'')!==String(value??''))core[key]=value;}if(Object.keys(core).length){if(!originalCanEdit('inventory'))throw new Error('Chybí oprávnění k inventární identitě.');changed.item=core;}}
 const sections=Object.keys(changed) as (OriginalEditDomain|'item')[];if(!sections.length)return {saved:false};
 session.busy=true;
 try{if(sections.length===1&&sections[0]!=='item')await api.saveCuratorRecord!(id,sections[0],session.etag,changed[sections[0]]!,signal);else await api.saveCuratorRecords(id,session.etag,changed,signal);}finally{session.busy=false;}
 return {saved:true};
}
/** A nonvisual bridge for the original aggregate form. Server ACL remains authoritative.
 * Unsupported native/custom controls stay in their original places but are disabled. */
export function applyOriginalEditBoundary(root:HTMLElement|null,_domain:OriginalEditDomain,enabled:boolean,loading:boolean){
 const allowed=new Set([...(originalCanEdit('professional')?['current-object-type','description','author','datingText','originPlace','current-material-text','current-technique-text','materialNote']:[]),...(originalCanEdit('inventory')?['quantity','current-other-number','title','inventoryNumber']:[])]);
 root?.querySelectorAll<HTMLElement>('input,textarea,select,button,gov-button,gov-form-input,gov-form-select').forEach(node=>{
  // This scoped editor owns its capability/read-only/busy boundary and shared item ETag.
  if(node.closest('[data-scoped-reference-editor]'))return;
  if(node.hasAttribute('data-scoped-navigation')||node.hasAttribute('data-scoped-read'))return;
  const active=enabled&&!loading&&(allowed.has(node.id)||node.hasAttribute('data-scoped-save'));
  (node as HTMLInputElement).disabled=!active;
  if(active)node.removeAttribute('disabled');else node.setAttribute('disabled','');
 });
}
