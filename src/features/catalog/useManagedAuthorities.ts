import {useEffect,useRef,useState} from 'react';
import {originalIntegrationEnabled,originalSession} from './originalAdapter';
import {originalCanEdit} from './originalEdit';
import type {DictionaryValue,ManagedDictionaryType} from '../scoped/scopedApi';
export const managedAuthoritiesEnabled=()=>originalIntegrationEnabled()&&import.meta.env.VITE_MANAGED_AUTHORITIES_ENABLED==='true';
const kinds:ManagedDictionaryType[]=['FUND','OBJECT_TYPE','CUSTODIAN','AUTHOR','AUTHOR_ROLE','COUNTRY','COLLECTION','GROUP','LOCALITY','CLASSIFICATION','SUBJECT'];
/** Independent current UUID bindings; no DEMUS strings/IDs enter current form state. */
export function useManagedAuthorities(itemId:number|undefined,etag:string|undefined,blocked:boolean,onSaved:(etag:string)=>void){
 let scope:ReturnType<typeof originalSession>|null=null;try{if(managedAuthoritiesEnabled())scope=originalSession();}catch{/* closed session */}
 const key=scope&&itemId?`${scope.catalog.id}:${itemId}:${etag}`:'';
 const latest=useRef({key,signal:scope?.signal,blocked,onSaved});latest.current={key,signal:scope?.signal,blocked,onSaved};
 const [state,setState]=useState<{key:string;signal:AbortSignal;etag:string;choices:Partial<Record<ManagedDictionaryType,DictionaryValue[]>>;refs:{id:string;type:string;label:string}[];writable:Set<string>}|null>(null);
 const [error,setError]=useState(''),[busy,setBusy]=useState(false),[revision,setRevision]=useState(0);
 const current=state?.key===key&&state.signal===scope?.signal?state:null;
 useEffect(()=>{
  if(!scope||!itemId)return;const {api,signal,catalog}=scope;let alive=true;setState(null);setError('');setBusy(false);
  if(!catalog.capabilities?.includes('dictionary.read')){setError('Výběr současných autorit vyžaduje dictionary.read.');return;}
  async function load(){try{
   const refs=await api.references(itemId!,signal);if(refs.etag!==etag)throw new Error('Verze současných autorit se změnila. Obnovte kartu.');
   const choices:Partial<Record<ManagedDictionaryType,DictionaryValue[]>>={},writable=new Set<string>();
   for(const type of kinds){const meta=await api.dictionaryMetadata(type,signal);if(meta.operations.includes('create'))writable.add(type);let after:string|undefined;choices[type]=[];
    do{const page=await api.dictionaryValues(type,signal,after);choices[type]!.push(...page.items);after=page.nextAfterId??undefined;if(choices[type]!.length>2000)throw new Error('Číselník překračuje limit výběru; vyžaduje stránkované hledání.');}while(after);
   }
   if(alive&&!signal.aborted)setState({key,signal,etag:refs.etag,choices,refs:refs.items,writable});
  }catch(e){if(alive&&!signal.aborted)setError((e as Error).message);}}
  void load();return()=>{alive=false;if(latest.current.key===key&&latest.current.signal===signal)latest.current={...latest.current,key:''};};
 },[key,scope?.signal,revision]);
 const live=()=>!!current&&!!scope&&!scope.signal.aborted&&latest.current.key===key&&latest.current.signal===scope.signal;
 async function select(type:ManagedDictionaryType,id:string){
  if(!live()||!itemId||!id||busy||latest.current.blocked||!originalCanEdit('professional'))throw new Error('Nejprve uložte změny formuláře; přiřazení vyžaduje oprávnění a aktuální verzi.');
  setBusy(true);setError('');try{const result=await scope!.api.assignReference(itemId,type,id,current!.etag,scope!.signal);if(live()){latest.current.onSaved(result.etag);setRevision(v=>v+1);}}catch(e){if(live())setError((e as Error).message);throw e;}finally{if(latest.current.key===key)setBusy(false);}
 }
 async function create(input:{type:string;label:string;code:string}){
  const type=(input.type==='SPRAVCE'?'CUSTODIAN':input.type) as ManagedDictionaryType;
  if(!live()||!current!.writable.has(type)||blocked||busy)throw new Error('Vytvoření vyžaduje dictionary.write a uložený formulář.');
  const created=await scope!.api.saveDictionary(type,{label:input.label,code:input.code,parentId:null,reason:'Vytvoření současné autority z karty předmětu'},scope!.signal);
  if(!live())throw new Error('Položka vznikla v původním katalogu; karta se změnila a přiřazení neproběhlo.');
  setState(old=>old?{...old,choices:{...old.choices,[type]:[...(old.choices[type]??[]),created.value]}}:old);
  // A failed assignment leaves the created UUID selectable; never retry POST automatically.
  try{await select(type,created.value.id);}catch(e){throw new Error(`Číselníková položka byla vytvořena, ale nebyla přiřazena. Vyberte ji po obnovení karty. ${(e as Error).message}`,{cause:e});}
 }
 return {enabled:managedAuthoritiesEnabled(),error,busy,ready:!!current,canCreate:(type:string)=>!!current?.writable.has((type==='SPRAVCE'?'CUSTODIAN':type))&&!blocked&&!busy,
  choices:(type:ManagedDictionaryType)=>current?.choices[type]??[],value:(type:ManagedDictionaryType)=>current?.refs.find(v=>v.type===type)?.id??'',label:(type:ManagedDictionaryType)=>current?.refs.find(v=>v.type===type)?.label,
  select:(type:ManagedDictionaryType,id:string)=>void select(type,id).catch(()=>{}),create};
}
