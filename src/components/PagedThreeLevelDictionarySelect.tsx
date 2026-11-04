import {useEffect,useRef,useState} from 'react';
import AddDictionaryModal from './AddDictionaryModal';
import {originalSession} from '../features/catalog/originalAdapter';
import type {DictionaryValue} from '../features/scoped/scopedApi';
type Props={type:'MATERIAL'|'TECHNIQUE';label:string;value:number|null;scopedValue?:string|null;onScopedChange?:(id:string|null)=>void;historicalValue?:string|null;historicalSource?:boolean;readOnly?:boolean;allowEmpty?:boolean;unavailableReason?:string};
type Branch={items:DictionaryValue[];next:string|null;after?:string;previous:(string|undefined)[]};
/** Three current UUID levels, each read in bounded server pages; search may resolve any matching leaf. */
export default function PagedThreeLevelDictionarySelect({type,label,scopedValue,onScopedChange,historicalValue,historicalSource,readOnly=false,allowEmpty=true,unavailableReason}:Props){
 const {api,signal}=originalSession();const alive=useRef(true),requests=useRef(0),searchRequests=useRef(0);
 const [preview,setPreview]=useState<string|null>(null),[path,setPath]=useState<DictionaryValue[]>([]),[branches,setBranches]=useState<Branch[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true),[writable,setWritable]=useState(false),[revision,setRevision]=useState(0);
 const [query,setQuery]=useState(''),[matches,setMatches]=useState<Branch|null>(null),[modal,setModal]=useState<{edit:boolean;value?:DictionaryValue;etag?:string;signal:AbortSignal;type:string}|null>(null);
 const selected=onScopedChange?scopedValue??null:preview;
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 const live=()=>alive.current&&!signal.aborted;
 const choose=(id:string|null)=>{if(onScopedChange)onScopedChange(id);else setPreview(id);};
 useEffect(()=>{const request=++requests.current;setLoading(true);setError('');setBranches([]);setPath([]);let active=true;
  void(async()=>{try{
   const meta=await api.dictionaryMetadata(type,signal);const owned:DictionaryValue[]=[];let id=selected;const seen=new Set<string>();
   while(id){if(seen.has(id)||owned.length>=3)throw new Error('Neplatná tříúrovňová cesta současné autority.');seen.add(id);const r=await api.dictionaryValue(type,id,signal);owned.unshift(r.value);id=r.value.parentId;}
   const pages:Branch[]=[];for(let level=0;level<3;level++){if(level>0&&!owned[level-1])break;const p=await api.dictionaryValues(type,signal,undefined,'',level===0?{rootsOnly:true}:{parentId:owned[level-1].id});pages.push({items:p.items,next:p.nextAfterId,previous:[]});}
   if(active&&live()&&request===requests.current){setPath(owned);setBranches(pages);setWritable(meta.operations.includes('create')&&meta.operations.includes('update'));}
  }catch(e){if(active&&live())setError((e as Error).message);}finally{if(active&&live()&&request===requests.current)setLoading(false);}})();return()=>{active=false;};
 },[type,signal,selected,revision]);
 async function branchPage(level:number,after?:string,previous:(string|undefined)[]=[]){const request=++requests.current;setLoading(true);try{const p=await api.dictionaryValues(type,signal,after,'',level===0?{rootsOnly:true}:{parentId:path[level-1].id});if(live()&&request===requests.current)setBranches(old=>old.map((b,i)=>i===level?{items:p.items,next:p.nextAfterId,after,previous}:b));}catch(e){if(live())setError((e as Error).message);}finally{if(live()&&request===requests.current)setLoading(false);}}
 async function search(q:string,after?:string,previous:(string|undefined)[]=[]){setQuery(q);const request=++searchRequests.current;setMatches(null);if(!q)return;try{const p=await api.dictionaryValues(type,signal,after,q);if(live()&&request===searchRequests.current)setMatches({items:p.items,next:p.nextAfterId,after,previous});}catch(e){if(live()&&request===searchRequests.current)setError((e as Error).message);}}
 async function manage(edit:boolean){try{setError('');if(edit&&selected){const r=await api.dictionaryValue(type,selected,signal);if(live())setModal({edit,value:r.value,etag:r.etag,signal,type});}else setModal({edit:false,signal,type});}catch(e){if(live())setError((e as Error).message);}}
 const options=[...new Map([...path,...branches.flatMap(p=>p.items)].map(v=>[v.id,v])).values()];
 return <fieldset className="space-y-2" disabled={readOnly||!!unavailableReason}>
  <legend className="text-sm font-semibold text-gray-700">{label}</legend>
  {loading&&<p role="status">Načítání číselníku…</p>}{error&&<div role="alert">{error} <button type="button" onClick={()=>setRevision(v=>v+1)}>Zkusit znovu</button></div>}
  {unavailableReason&&<p role="status">{unavailableReason}</p>}
  {!loading&&path.length>0&&<p aria-label={`Vybraná cesta: ${label}`} className="text-sm font-medium text-[#00204a]">{path.map(v=>v.label).join(' › ')}</p>}
  {historicalValue&&<p className="text-xs">{historicalSource?'Původní text DEMUS':'Současný kurátorský text'}: {historicalValue}</p>}
  <input data-scoped-read aria-label={`Hledat: ${label}`} maxLength={100} value={query} onChange={e=>void search(e.target.value)} placeholder="Hledat v číselníku" onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();e.stopPropagation();}}} className="w-full rounded border border-gray-300 px-3 py-2 text-xs"/>
  {query&&matches&&<><label className="block text-xs">Výsledky hledání<select data-scoped-read aria-label={`Výsledky hledání: ${label}`} value="" onChange={e=>{choose(e.target.value||null);setQuery('');setMatches(null);}} className="w-full rounded border border-gray-300 bg-white px-3 py-2"><option value="">— vyberte výsledek —</option>{matches.items.map(v=><option key={v.id} value={v.id}>{v.label}</option>)}</select></label>{matches.previous.length>0&&<button type="button" onClick={()=>void search(query,matches.previous.at(-1),matches.previous.slice(0,-1))}>Předchozí výsledky {label}</button>}{matches.next&&<button type="button" onClick={()=>void search(query,matches.next!,[...matches.previous,matches.after])}>Další výsledky {label}</button>}</>}
  {[0,1,2].map(level=>{const b=branches[level];const selectedAt=path[level];const values=selectedAt&&!b?.items.some(v=>v.id===selectedAt.id)?[selectedAt,...(b?.items??[])]:b?.items??[];return <label key={level} className="block text-xs">Úroveň {level+1}<select data-scoped-read aria-label={`${label} — úroveň ${level+1}`} value={selectedAt?.id??''} disabled={loading||!!error||level>0&&!path[level-1]} onChange={e=>choose(e.target.value||(level?path[level-1].id:null))} className="w-full rounded border border-gray-300 bg-white px-3 py-2"><option value="" disabled={!allowEmpty&&level===0}>— nevybráno —</option>{values.map(v=><option key={v.id} value={v.id}>{v.label}</option>)}</select>{b?.previous.length>0&&<button type="button" onClick={()=>void branchPage(level,b.previous.at(-1),b.previous.slice(0,-1))}>Předchozí úroveň {level+1}</button>}{b?.next&&<button type="button" onClick={()=>void branchPage(level,b.next!,[...b.previous,b.after])}>Další úroveň {level+1}</button>}</label>;})}
  <p className="text-xs text-gray-600">Výběr se uloží až tlačítkem Přidat vazbu. Současný text ani historický zdroj se nemění.</p>
  <button data-scoped-reference-editor type="button" disabled={readOnly||!writable||loading} onClick={()=>void manage(false)}>+ Nová položka číselníku</button><button data-scoped-reference-editor type="button" disabled={readOnly||!writable||!selected||loading} onClick={()=>void manage(true)}>Upravit vybranou položku</button>
  {modal&&<AddDictionaryModal isOpen dictionaryType={type} dictionaryTitle={label} editing={modal.edit} initialValue={modal.value} parentOptions={options.filter(v=>v.id!==modal.value?.id).map(v=>({id:v.id,label:v.label}))} onSuccess={()=>{}} onClose={()=>setModal(null)} onCreate={async input=>{if(!live()||modal.signal!==signal||modal.type!==type||input.type!==type)throw new Error('Kontext číselníku se změnil.');const r=await api.saveDictionary(type,{label:input.label,code:input.code,parentId:input.parentId,reason:modal.edit?'Výslovná úprava současného číselníku':'Vytvoření současné položky číselníku'},signal,modal.value?.id,modal.etag);if(live()){choose(r.value.id);setRevision(v=>v+1);}}}/> }
 </fieldset>;
}
