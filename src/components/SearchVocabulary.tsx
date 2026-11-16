import {useEffect,useRef,useState} from 'react';
import {originalSession} from '../features/catalog/originalAdapter';
import type {ManagedDictionaryType} from '../features/scoped/scopedApi';
type Choice={id:string;label:string};
const captions=new WeakMap<AbortSignal,Map<string,string>>();
function cache(signal:AbortSignal){let values=captions.get(signal);if(!values){values=new Map();captions.set(signal,values);}return values;}
export function SelectionCaption({field,value}:{field:string;value:string}){
 let scope:ReturnType<typeof originalSession>|undefined;try{scope=originalSession();}catch{/* no scope */}
 const type=field.replace(/(Authority|Historical)Id$/,'').toUpperCase() as ManagedDictionaryType,historical=field.endsWith('HistoricalId'),key=`${type}:${historical}:${value}`;
 const [label,setLabel]=useState('Vybraná položka');
 useEffect(()=>{let alive=true;setLabel('Vybraná položka');if(!scope)return;const {signal,api}=scope;const cached=cache(signal).get(key);if(cached){setLabel(cached);return;}
  async function load(){try{let caption:string|undefined;if(historical){if(!/^[a-f0-9]{64}$/.test(value))return;const number=BigInt('0x'+value);const page=await api.historicalVocabulary(type,signal,'',number===0n?'':(number-1n).toString(16).padStart(64,'0'));const found=page.items.find(v=>v.recordId===value);caption=found?.label??found?.code??undefined;}else caption=(await api.dictionaryValue(type,value,signal)).value.label;
   if(caption&&alive&&!signal.aborted){cache(signal).set(key,caption);setLabel(caption);}
  }catch{/* keep the condition, even when its caption cannot be read */}}
  void load();return()=>{alive=false;};
 },[scope?.signal,key]);return <span>{label}</span>;
}

export default function SearchVocabulary({type,label,value,onSelect,historical=false}:{type:ManagedDictionaryType;label:string;value:string;onSelect:(value:string)=>void;historical?:boolean}){
 const [q,setQ]=useState(''),[rows,setRows]=useState<Choice[]>([]),[next,setNext]=useState<string|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[opened,setOpened]=useState(false);
 const selected=useRef<Choice|null>(null);
 const revision=useRef(0),source=useRef<string|null>(null);
 let session:ReturnType<typeof originalSession>|undefined;try{session=originalSession();}catch{/* closed */}
 const signal=session?.signal,catalog=session?.catalog.id;
 useEffect(()=>{selected.current=null;setRows([]);setOpened(false);setBusy(false);setError('');setQ('');setNext(null);source.current=null;revision.current++;},[signal]);
 async function load(after?:string){if(!session)return;const request=++revision.current;setBusy(true);setError('');try{
  const result=historical?await session.api.historicalVocabulary(type,session.signal,q,after):await session.api.dictionaryValues(type,session.signal,after,q);
  if(request!==revision.current||session.signal.aborted)return;
  if('state' in result){if(result.state!=='AVAILABLE')throw Error('Historický seznam není pro tento katalog dostupný.');if(after&&source.current!==result.sourceSha256)throw Error('Zdroj se změnil. Spusťte hledání znovu.');source.current=result.sourceSha256;}
  const choices=result.items.map(v=>'recordId' in v?{id:v.recordId,label:v.label??v.code??'Nepojmenovaná historická položka'}:{id:v.id,label:v.label});
  for(const choice of choices)cache(session.signal).set(`${type}:${historical}:${choice.id}`,choice.label);
  if(value){const found=choices.find(v=>v.id===value);if(found)selected.current=found;}
  setRows(old=>after?[...new Map([...old,...choices].map(v=>[v.id,v])).values()]:choices);setNext(result.nextAfterId);setOpened(true);
 }catch(e){if(request===revision.current&&!session.signal.aborted){setError((e as Error).message);setNext(null);}}finally{if(request===revision.current)setBusy(false);}}
 useEffect(()=>{if(!opened)return;const timer=setTimeout(()=>void load(),300);return()=>{clearTimeout(timer);revision.current++;};},[q,catalog,signal]);
 useEffect(()=>{let alive=true;if(value&&!historical&&session?.catalog.capabilities?.includes('dictionary.read'))void session.api.dictionaryValue(type,value,session.signal).then(r=>{if(alive&&!session!.signal.aborted){selected.current={id:value,label:r.value.label};setRows(old=>old.some(v=>v.id===value)?old:[{id:value,label:r.value.label},...old]);}}).catch(()=>{});return()=>{alive=false;};},[value,type,historical,signal]);
 useEffect(()=>{return()=>{revision.current++;};},[]);
 return <fieldset className="col-md-4"><legend className="text-sm">{label}</legend>
 <input className="form-control" aria-label={`Hledat v seznamu ${label}`} placeholder="Najít položku v seznamu" value={q} maxLength={100} onFocus={()=>{if(!opened&&!busy)void load();}} onChange={e=>{revision.current++;setQ(e.target.value);setRows([]);setNext(null);setOpened(true);}}/>
 <select className="form-control" aria-label={label} value={value} disabled={busy} onChange={e=>{selected.current=rows.find(v=>v.id===e.target.value)??null;onSelect(e.target.value);}}><option value="">Všechny hodnoty</option>{value&&!rows.some(v=>v.id===value)&&<option value={value}>{selected.current?.id===value?selected.current.label:'Uložená vybraná položka'}</option>}{rows.map(v=><option key={v.id} value={v.id}>{v.label}</option>)}</select>
 {!opened&&<button type="button" disabled={busy||!session?.catalog.capabilities?.includes('dictionary.read')} onClick={()=>void load()}>Načíst seznam {label}</button>}
 {busy&&<span role="status">Načítám seznam…</span>}{next&&<button type="button" disabled={busy} onClick={()=>void load(next)}>Další hodnoty: {label}</button>}{opened&&!busy&&!error&&!rows.length&&<small>Žádná dostupná hodnota pro tento výběr.</small>}{error&&<p role="alert">Seznam se nepodařilo načíst. <button type="button" onClick={()=>void load()}>Zkusit znovu: {label}</button></p>}
 </fieldset>;
}

