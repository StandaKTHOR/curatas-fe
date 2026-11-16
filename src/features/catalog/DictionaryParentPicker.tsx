import {dictionaryLabel,ambiguousDictionaryCaption} from './dictionaryLabel';
import {useEffect,useState} from 'react';
import type {ScopedApi,DictionaryValue,ManagedDictionaryType} from '../scoped/scopedApi';
/** Bounded parent search; UUIDs are always confirmed by the scoped API. */
export default function DictionaryParentPicker({api,type,signal,value,exclude,onChange}:{api:ScopedApi;type:ManagedDictionaryType;signal:AbortSignal;value:string;exclude?:string;onChange:(id:string)=>void}){
 const [query,setQuery]=useState(''),[cursor,setCursor]=useState<string|undefined>(),[previous,setPrevious]=useState<(string|undefined)[]>([]),[rows,setRows]=useState<DictionaryValue[]>([]),[next,setNext]=useState<string|null>(null),[selected,setSelected]=useState<DictionaryValue|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{const c=new AbortController(),s=AbortSignal.any([signal,c.signal]);setRows([]);setNext(null);setBusy(true);setError('');
 void api.dictionaryValues(type,s,cursor,query).then(page=>{if(!s.aborted){setRows(page.items);setNext(page.nextAfterId);}}).catch(e=>{if(!s.aborted)setError((e as Error).message);}).finally(()=>{if(!s.aborted)setBusy(false);});return()=>c.abort();
 },[api,type,signal,query,cursor]);
 useEffect(()=>{const c=new AbortController(),s=AbortSignal.any([signal,c.signal]);setSelected(null);if(value)void api.dictionaryValue(type,value,s).then(r=>{if(!s.aborted)setSelected(r.value);}).catch(e=>{if(!s.aborted)setError((e as Error).message);});return()=>c.abort();},[api,type,signal,value]);
 const options=[...new Map([...(selected?[selected]:[]),...rows].filter(v=>v.id!==exclude).map(v=>[v.id,v])).values()];
 return <div><label>Hledat nadřazenou položku<input aria-label="Hledat nadřazenou položku" maxLength={100} value={query} onChange={e=>{setQuery(e.target.value);setCursor(undefined);setPrevious([]);}} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();e.stopPropagation();}}}/></label>
 <label>Nadřazená položka<select aria-label="Nadřazená položka" value={value} disabled={busy||!!error} onChange={e=>onChange(e.target.value)}><option value="">— kořen číselníku —</option>{options.map(v=><option key={v.id} value={v.id} disabled={ambiguousDictionaryCaption(v,options)}>{dictionaryLabel(v)}{ambiguousDictionaryCaption(v,options)?' — nelze odborně rozlišit; výběr vyžaduje ověření':''}</option>)}</select></label>
 {busy&&<p role="status">Načítání nadřazených položek…</p>}{error&&<p role="alert">{error}</p>}
 {!!previous.length&&<button type="button" disabled={busy} onClick={()=>{setCursor(previous.at(-1));setPrevious(v=>v.slice(0,-1));}}>Předchozí nadřazené položky</button>}{next&&<button type="button" disabled={busy} onClick={()=>{setPrevious(v=>[...v,cursor]);setCursor(next);}}>Další nadřazené položky</button>}
 <p>Hledání zahrnuje všechny úrovně aktuálního katalogu. Server ověří typ, cykly a podporovanou hloubku; historické položky nejsou rodiči současných autorit.</p></div>;
}
