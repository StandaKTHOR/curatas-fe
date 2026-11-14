import {useEffect,useMemo,useState} from 'react';
import {originalSession} from '../features/catalog/originalAdapter';
import type {DictionaryValue} from '../features/scoped/scopedApi';
import type {MatTechPosition} from './MatTechPositions';
/** Positional mode of the existing dictionary control. All positions query the same flat scoped API. */
export default function PagedMatTechPositions({type,label,positions,readOnly,onPositionChange,adding}:{type:'MATERIAL'|'TECHNIQUE';label:string;positions:MatTechPosition[];readOnly:boolean;adding:boolean;onPositionChange:(index:number,id:string|null)=>void}){
 const {signal}=originalSession();const api=useMemo(()=>originalSession().api,[signal]);const [items,setItems]=useState<DictionaryValue[]>([]),[selected,setSelected]=useState<DictionaryValue[]>([]),[next,setNext]=useState<string|null>(null),[history,setHistory]=useState<(string|undefined)[]>([]),[after,setAfter]=useState<string|undefined>(),[query,setQuery]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[revision,setRevision]=useState(0);
 const ids=positions.map(p=>p.id??'').join('|');
 useEffect(()=>{let live=true;const c=new AbortController(),s=AbortSignal.any([signal,c.signal]);setBusy(true);setError('');
  void (async()=>{return await Promise.all([api.dictionaryValues(type,s,after,query),Promise.all(positions.filter(p=>p.id).map(p=>api.dictionaryValue(type,p.id!,s).then(r=>r.value)))]);})().then(([page,values])=>{if(live&&!s.aborted){setItems(page.items);setNext(page.nextAfterId);setSelected(values);}}).catch(e=>{if(live&&!s.aborted)setError((e as Error).message);}).finally(()=>{if(live&&!s.aborted)setBusy(false);});return()=>{live=false;c.abort();};
 },[api,signal,type,ids,after,query,revision]);
 const options=[...new Map([...selected,...items].map(v=>[v.id,v])).values()];
 return <fieldset data-scoped-reference-editor className="space-y-2" disabled={readOnly}>
  <legend className="text-sm font-semibold text-gray-700">{label}{positions[0].position>1?` — pokračování ${positions[0].position}–${positions.at(-1)!.position}`:''}</legend>
  <input data-scoped-read aria-label={`Hledat: ${label} pozice ${positions[0].position}`} maxLength={100} value={query} onChange={e=>{setQuery(e.target.value);setAfter(undefined);setHistory([]);}} placeholder="Hledat v číselníku" onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();e.stopPropagation();}}} className="w-full rounded border border-gray-300 px-3 py-2 text-xs"/>
  {busy&&<p role="status">Načítání číselníku…</p>}{error&&<div role="alert">{error} <button type="button" onClick={()=>setRevision(v=>v+1)}>Zkusit znovu</button></div>}
  {positions.map((p,index)=><label key={p.position} data-mattech-position={type} data-position={p.position} data-record-id={p.recordId??'new'} className="block text-xs">Úroveň {p.position}
   <select data-scoped-read aria-label={`${label} — úroveň ${p.position}`} value={p.id??(p.historicalLabel?'historical':'')} disabled={readOnly||busy||!!error||p.recordId===null&&(!adding||p.position!==positions.find(v=>v.recordId===null)?.position)} onChange={e=>{if(!readOnly&&!busy&&!error)onPositionChange(index,e.target.value||null);}} className="w-full rounded border border-gray-300 bg-white px-3 py-2">
    <option value="">— nevybráno —</option>{p.historicalLabel&&!p.id&&<option value="historical" disabled>{p.historicalLabel} (DEMUS)</option>}{p.id&&!options.some(v=>v.id===p.id)&&<option value={p.id}>{p.id}</option>}{options.map(v=><option key={v.id} value={v.id}>{v.label}</option>)}
   </select>{p.recordId!==null&&<span>Odborný záznam #{p.recordId}</span>}
  </label>)}
  {history.length>0&&<button type="button" disabled={busy} onClick={()=>{setAfter(history.at(-1));setHistory(v=>v.slice(0,-1));}}>Předchozí {label}</button>}{next&&<button type="button" disabled={busy} onClick={()=>{setHistory(v=>[...v,after]);setAfter(next);}}>Další {label}</button>}
  <p className="text-xs text-gray-600">Úrovně jsou samostatné pořadové pozice, nikoli rodičovská hierarchie. Změnu jedné pozice potvrďte tlačítkem Uložit záznam.</p>
 </fieldset>;
}
