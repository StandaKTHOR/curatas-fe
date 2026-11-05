import {useEffect,useState,useRef} from 'react';
import ThreeLevelDictionarySelect from '../../components/ThreeLevelDictionarySelect';
import {originalSession} from './originalAdapter';
import {originalCanEdit} from './originalEdit';

let scopeSequence=0;const scopeIds=new WeakMap<AbortSignal,number>();
/** Current UUID associations; never reinterpret historical text as an authority ID. */
type Props={itemId:number;onSave?:(etag:string)=>void;readOnly?:boolean};
export default function MaterialBindings(props:Props){const {signal}=originalSession();if(!scopeIds.has(signal))scopeIds.set(signal,++scopeSequence);return <Bindings key={`${scopeIds.get(signal)}:${props.itemId}`} {...props}/>;}
function Bindings({itemId,onSave,readOnly=false}:Props){
 const {api,signal,catalog}=originalSession();const mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);const dictionaryReadable=catalog.capabilities?.includes('dictionary.read')===true;
 type Snapshot=Awaited<ReturnType<typeof api.references>>;
 const [snapshot,setSnapshot]=useState<Snapshot|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[revision,setRevision]=useState(0);
 const [type,setType]=useState<'MATERIAL'|'TECHNIQUE'>('MATERIAL'),[selected,setSelected]=useState<string|null>(null);
 const noDelete=import.meta.env.VITE_QA_NO_DELETE==='true';
 const enabled=dictionaryReadable&&!readOnly&&originalCanEdit('professional');
 useEffect(()=>{
  let alive=true;setSnapshot(null);setSelected(null);setError('');
  if(!dictionaryReadable){setError('Čtení číselníkových vazeb vyžaduje dictionary.read. Současné texty a zdrojové údaje jsou dostupné odděleně.');return;}
  api.references(itemId,signal).then(value=>{if(alive&&!signal.aborted)setSnapshot(value);}).catch(e=>{if(alive&&!signal.aborted)setError(e.message);});
  return()=>{alive=false;};
 },[itemId,signal,revision,dictionaryReadable]);
 async function save(id:string,kind:'MATERIAL'|'TECHNIQUE',remove=false){
  if(!snapshot||busy||!enabled||signal.aborted)return;
  if(!remove&&snapshot.items.some(v=>v.id===id&&v.type===kind)){setError('Tato číselníková vazba již existuje.');return;}
  setBusy(true);setError('');
  try{
   const result=await api.assignReference(itemId,kind,id,snapshot.etag,signal,remove);
   if(!signal.aborted&&mounted.current){setSelected(null);setRevision(v=>v+1);onSave?.(result.etag);}
  }catch(e){if(!signal.aborted)setError((e as Error).message+' Neuložený výběr je zachován; před opakováním načtěte aktuální verzi.');}
  finally{if(!signal.aborted)setBusy(false);}
 }
 return <section aria-label="Současné číselníkové vazby" data-scoped-reference-editor>
  <h3>Současné číselníkové vazby</h3>
  <p>Kurátorské přiřazení. Historické texty DEMUS se nemění a nejsou automaticky přiřazeny k číselníku.</p>
  {error&&<p role="alert">{error}</p>}
  {!snapshot&&!error&&<p role="status">Načítání vazeb…</p>}
  {snapshot&&<ul>{snapshot.items.filter(v=>v.type==='MATERIAL'||v.type==='TECHNIQUE').map(v=><li key={v.id}>{v.type==='MATERIAL'?'Materiál':'Technika'}: {v.label}
   {enabled&&<button type="button" disabled={busy||noDelete} title={noDelete?'Izolované QA nepovoluje mazání vazeb; aktuální vazba zůstává zachována.':undefined} onClick={()=>void save(v.id,v.type as 'MATERIAL'|'TECHNIQUE',true)}>Odebrat vazbu</button>}
  </li>)}</ul>}
  {snapshot&&!snapshot.items.length&&<p>Žádné současné číselníkové vazby. Není to tvrzení o původních hodnotách DEMUS.</p>}
  <label>Číselník <select aria-label="Číselník vazby" disabled={busy} value={type} onChange={e=>{setType(e.target.value as typeof type);setSelected(null);}}><option value="MATERIAL">Materiál</option><option value="TECHNIQUE">Technika</option></select></label>
  <ThreeLevelDictionarySelect key={type} type={type} label={type==='MATERIAL'?'Materiál':'Technika'} value={null} onChange={()=>{}}
   scoped scopedValue={selected} onScopedChange={setSelected} readOnly={!enabled||busy}/>
  <button type="button" disabled={!enabled||busy||!snapshot||!selected} onClick={()=>selected&&void save(selected,type)}>Přidat vazbu</button>
  <button type="button" disabled={busy} onClick={()=>setRevision(v=>v+1)}>Načíst aktuální vazby</button>
 </section>;
}
