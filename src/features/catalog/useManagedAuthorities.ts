import {useEffect,useRef,useState} from 'react';
import {originalIntegrationEnabled,originalSession} from './originalAdapter';
import {originalCanEdit} from './originalEdit';
import type {DictionaryValue,ManagedDictionaryType} from '../scoped/scopedApi';
export const managedAuthoritiesEnabled=()=>originalIntegrationEnabled()&&import.meta.env.VITE_MANAGED_AUTHORITIES_ENABLED==='true';
const kinds:ManagedDictionaryType[]=['FUND','OBJECT_TYPE','CUSTODIAN','AUTHOR','AUTHOR_ROLE','COUNTRY','COLLECTION','GROUP','LOCALITY','CLASSIFICATION','SUBJECT'];
const normalized=(type:string)=>(type==='SPRAVCE'?'CUSTODIAN':type) as ManagedDictionaryType;
type Ref={id:string;type:string;label:string};
type Draft={values:Partial<Record<ManagedDictionaryType,string>>;onChange:(values:Partial<Record<ManagedDictionaryType,string>>)=>void};
type Picker={q:string;after?:string;previous:(string|undefined)[];next:string|null;items:DictionaryValue[]};
/** Bounded server search/paging. New-item UUID selections are explicit drafts, committed atomically with creation. */
export function useManagedAuthorities(itemId:number|undefined,etag:string|undefined,blocked:boolean,onSaved:(etag:string)=>void,draft?:Draft){
 let scope:ReturnType<typeof originalSession>|null=null;try{if(managedAuthoritiesEnabled())scope=originalSession();}catch{/* closed session */}
 const key=scope&&(itemId||draft)?`${scope.catalog.id}:${itemId??'new'}:${etag??''}`:'';
 const latest=useRef({key,signal:scope?.signal,blocked,onSaved,draft});latest.current={key,signal:scope?.signal,blocked,onSaved,draft};
 const [state,setState]=useState<{key:string;signal:AbortSignal;etag:string;pages:Partial<Record<ManagedDictionaryType,Picker>>;refs:Ref[];writable:Set<string>}|null>(null);
 const [error,setError]=useState(''),[busy,setBusy]=useState(false),[revision,setRevision]=useState(0);
 const mutation=useRef(false),queries=useRef<Partial<Record<ManagedDictionaryType,number>>>({});
 const created=useRef(new Map<string,DictionaryValue>());
 const cacheScope=useRef(scope?.signal);if(cacheScope.current!==scope?.signal){created.current.clear();cacheScope.current=scope?.signal;}
 const current=state?.key===key&&state.signal===scope?.signal?state:null;
 useEffect(()=>{
  if(!scope||!key)return;const {api,signal,catalog}=scope;let alive=true;setState(null);setError('');setBusy(false);queries.current={};
  if(!catalog.capabilities?.includes('dictionary.read')){setError('Výběr současných autorit vyžaduje dictionary.read.');return;}
  async function load(){try{
   const refs=itemId?await api.references(itemId,signal):{etag:'',items:[] as Ref[]};if(itemId&&refs.etag!==etag)throw new Error('Verze současných autorit se změnila. Obnovte kartu.');
   const pages:Partial<Record<ManagedDictionaryType,Picker>>={},writable=new Set<string>();
   for(const type of kinds){const meta=await api.dictionaryMetadata(type,signal);if(meta.operations.includes('create'))writable.add(type);const page=await api.dictionaryValues(type,signal);pages[type]={q:'',previous:[],next:page.nextAfterId,items:page.items};}
   if(!itemId)for(const [type,id] of Object.entries(latest.current.draft?.values??{})){const value=await api.dictionaryValue(type as ManagedDictionaryType,id!,signal);refs.items.push(value.value);}
   if(alive&&!signal.aborted)setState({key,signal,etag:refs.etag,pages,refs:refs.items,writable});
  }catch(e){if(alive&&!signal.aborted)setError((e as Error).message);}}
  void load();return()=>{alive=false;if(latest.current.key===key&&latest.current.signal===signal)latest.current={...latest.current,key:''};};
 },[key,scope?.signal,revision]);
 const live=()=>!!current&&!!scope&&!scope.signal.aborted&&latest.current.key===key&&latest.current.signal===scope.signal;
 async function page(type:ManagedDictionaryType,q:string,after?:string,previous:(string|undefined)[]=[]){
  if(!live())return;const request=(queries.current[type]??0)+1;queries.current[type]=request;setError('');
  setState(old=>old?{...old,pages:{...old.pages,[type]:{...old.pages[type]!,q,next:null}}}:old);
  try{const result=await scope!.api.dictionaryValues(type,scope!.signal,after,q);if(live()&&queries.current[type]===request)setState(old=>old?{...old,pages:{...old.pages,[type]:{q,after,previous,next:result.nextAfterId,items:result.items}}}:old);}catch(e){if(live()&&queries.current[type]===request)setError((e as Error).message);}
 }
 async function assign(type:ManagedDictionaryType,id:string,value?:DictionaryValue){
  if(!live()||!id||latest.current.blocked||!originalCanEdit('professional'))throw new Error('Nejprve uložte změny formuláře; přiřazení vyžaduje oprávnění a aktuální verzi.');
  if(!itemId){
   const selected=value??current!.pages[type]?.items.find(v=>v.id===id);if(!selected||selected.type!==type)throw new Error('Vyberte ověřenou současnou autoritu správného typu.');
   const values={...latest.current.draft?.values,[type]:id};latest.current.draft?.onChange(values);
   setState(old=>old?{...old,refs:[...old.refs.filter(r=>r.type!==type),selected]}:old);return;
  }
  const result=await scope!.api.assignReference(itemId,type,id,current!.etag,scope!.signal);if(live()){latest.current.onSaved(result.etag);setRevision(v=>v+1);}
 }
 async function select(type:ManagedDictionaryType,id:string){
  if(mutation.current)throw new Error('Probíhá jiné přiřazení.');mutation.current=true;setBusy(true);setError('');
  try{await assign(type,id);}catch(e){if(live())setError((e as Error).message);throw e;}finally{mutation.current=false;if(latest.current.key===key)setBusy(false);}
 }
 async function create(input:{type:string;label:string;code:string}){
  const type=normalized(input.type);
  if(!live()||!kinds.includes(type)||!current!.writable.has(type)||latest.current.blocked||mutation.current)throw new Error('Vytvoření vyžaduje dictionary.write a správný aktivní kontext.');
  mutation.current=true;setBusy(true);setError('');const cacheKey=`${key}:${type}:${JSON.stringify([input.label,input.code])}`;
  try{
   let value=created.current.get(cacheKey);
   if(!value){value=(await scope!.api.saveDictionary(type,{label:input.label,code:input.code,parentId:null,reason:'Vytvoření současné autority z karty předmětu'},scope!.signal)).value;created.current.set(cacheKey,value);}
   if(!live())throw new Error('Položka vznikla v původním katalogu; karta se změnila a přiřazení neproběhlo.');
   setState(old=>{if(!old)return old;const prior=old.pages[type]!;return {...old,pages:{...old.pages,[type]:{...prior,items:[value!,...prior.items.filter(r=>r.id!==value!.id)].slice(0,100)}}};});
   try{await assign(type,value.id,value);created.current.delete(cacheKey);}catch(e){throw new Error(`Číselníková položka byla vytvořena, ale nebyla přiřazena. Vyberte ji po obnovení karty. ${(e as Error).message}`,{cause:e});}
  }finally{mutation.current=false;if(latest.current.key===key)setBusy(false);}
 }
 return {enabled:managedAuthoritiesEnabled(),error,busy,ready:!!current,canCreate:(type:string)=>!!current?.writable.has(normalized(type))&&!blocked&&!busy,
  choices:(type:ManagedDictionaryType)=>current?.pages[type]?.items??[],value:(type:ManagedDictionaryType)=>current?.refs.find(v=>v.type===type)?.id??'',label:(type:ManagedDictionaryType)=>current?.refs.find(v=>v.type===type)?.label,
  query:(type:ManagedDictionaryType)=>current?.pages[type]?.q??'',hasNext:(type:ManagedDictionaryType)=>!!current?.pages[type]?.next,hasPrevious:(type:ManagedDictionaryType)=>!!current?.pages[type]?.previous.length,
  search:(type:ManagedDictionaryType,q:string)=>void page(type,q),
  next:(type:ManagedDictionaryType)=>{const p=current?.pages[type];if(p?.next)void page(type,p.q,p.next,[...p.previous,p.after]);},
  previous:(type:ManagedDictionaryType)=>{const p=current?.pages[type];if(p?.previous.length)void page(type,p.q,p.previous.at(-1),p.previous.slice(0,-1));},
  select:(type:ManagedDictionaryType,id:string)=>void select(type,id).catch(()=>{}),create};
}
