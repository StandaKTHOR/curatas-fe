import {useEffect,useRef,useState,type MutableRefObject} from 'react';
import {originalSession} from './originalAdapter';
import {originalCanEdit} from './originalEdit';
import type {CurrentHistoryEvent} from '../scoped/scopedApi';
import type {ItemEditSession} from '../../lib/editSession';
const names={REVISION:'Revize',RESTORATION:'Restaurování',LOAN:'Zápůjčka'};
export default function CurrentHistory({itemId,editSession,readOnly,onSave,drafts}:{itemId:number;editSession?:ItemEditSession;readOnly:boolean;onSave?:()=>void|Promise<void>;drafts?:MutableRefObject<Record<string,any>>}){
 const {api,signal,catalog}=originalSession(),etag=editSession?.etag;
 const [state,setState]=useState<{item:number;catalog:number;signal:AbortSignal;etag:string;items:CurrentHistoryEvent[]}|null>(null);
 const draft=drafts?.current.currentHistory;const retained=draft?.itemId===itemId&&draft.scopeSignal===signal?draft:null;
 const [type,setType]=useState<CurrentHistoryEvent['eventType']>(retained?.type??'REVISION'),[date,setDate]=useState(retained?.date??''),[description,setDescription]=useState(retained?.description??''),[editing,setEditing]=useState<string|null>(retained?.editing??null);
 const [error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const active=useRef({itemId,catalog:catalog.id,signal});active.current={itemId,catalog:catalog.id,signal};
 const live=()=>active.current.itemId===itemId&&active.current.catalog===catalog.id&&active.current.signal===signal&&!signal.aborted;
 const current=state?.item===itemId&&state.catalog===catalog.id&&state.signal===signal&&state.etag===etag?state:null;
 useEffect(()=>{if(!drafts||!current)return;const before=current.items.find(row=>row.id===editing);const dirty=editing?!!before&&(type!==before.eventType||date!==(before.eventDate??'')||description!==(before.description??'')):!!date||!!description;
  drafts.current.currentHistory={itemId,scopeSignal:signal,dirty,type,date,description,editing};
 },[drafts,itemId,signal,type,date,description,editing,current]);
 useEffect(()=>{let alive=true;setState(null);setError('');setMessage('');const saved=drafts?.current.currentHistory;if(saved?.itemId===itemId&&saved.scopeSignal===signal&&saved.dirty){setType(saved.type);setEditing(saved.editing);setDate(saved.date);setDescription(saved.description);}else{setEditing(null);setDate('');setDescription('');}if(etag)void api.currentHistory(itemId,signal).then(v=>{if(alive&&!signal.aborted){if(v.etag!==etag)throw new Error('Historie má jinou verzi; obnovte kartu.');setState({item:itemId,catalog:catalog.id,signal,...v});}}).catch(e=>{if(alive&&!signal.aborted)setError(e.message);});return()=>{alive=false;};},[itemId,catalog.id,signal,etag]);
 const writable=!readOnly&&originalCanEdit('professional')&&!!current&&!busy&&!editSession?.busy;
 async function save(rows:CurrentHistoryEvent[]){if(!writable||!current||!editSession)return;setBusy(true);editSession.busy=true;setError('');setMessage('');
  try{const result=await api.saveCurrentHistory(itemId,current.etag,rows,signal);if(!live())return;const confirmed=await api.currentHistory(itemId,signal);if(!live())return;if(confirmed.etag!==result.etag||JSON.stringify(confirmed.items)!==JSON.stringify(result.items))throw new Error('Následné načtení historie nepotvrdilo uložený stav.');editSession.etag=result.etag;if('scopedCurrent' in editSession)(editSession.scopedCurrent as {etag:string}).etag=result.etag;setState({item:itemId,catalog:catalog.id,signal,...confirmed});setEditing(null);setDate('');setDescription('');if(drafts)drafts.current.currentHistory={itemId,scopeSignal:signal,dirty:false};await onSave?.();if(live())setMessage('Historie byla uložena a znovu načtena.');}
  catch(e){if(live())setError((e as Error).message);}finally{editSession.busy=false;if(live())setBusy(false);}}
 function submit(){const row={id:editing??crypto.randomUUID(),eventType:type,eventDate:date||null,description:description||null};const rows=[...(current?.items??[])],index=rows.findIndex(v=>v.id===row.id);if(index<0)rows.push(row);else rows[index]=row;void save(rows);}
 return <section data-scoped-reference-editor aria-label="Současná odborná historie"><h3>Současná odborná historie</h3><p>Vlastní současné události. Historické DEMUS záznamy, dosavadní evidované události a uživatelský audit se nemění. Odebrání současné události zůstává v auditu.</p>
 {error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}{!current&&!error&&<p role="status">Načítání historie…</p>}
 <div className="table-responsive"><table className="demus-datasheet"><thead><tr><th>Typ</th><th>Datum události</th><th>Popis</th><th>Akce</th></tr></thead><tbody>{current?.items.map(v=><tr key={v.id}><td>{names[v.eventType]}</td><td>{v.eventDate??'—'}</td><td className="whitespace-pre-wrap">{v.description??'—'}</td><td><button type="button" disabled={!writable} onClick={()=>{setEditing(v.id);setType(v.eventType);setDate(v.eventDate??'');setDescription(v.description??'');}}>Upravit událost</button><button type="button" disabled={!writable} onClick={()=>void save(current.items.filter(row=>row.id!==v.id))}>Odebrat současnou událost</button></td></tr>)}</tbody></table></div>
 {!readOnly&&<fieldset disabled={!writable} className="grid grid-cols-1 sm:grid-cols-2 gap-3"><label>Typ události<select aria-label="Typ současné události" value={type} onChange={e=>setType(e.target.value as CurrentHistoryEvent['eventType'])}>{Object.entries(names).map(([key,name])=><option key={key} value={key}>{name}</option>)}</select></label><label>Datum události<input aria-label="Datum současné události" type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label>Popis<textarea aria-label="Popis současné události" value={description} maxLength={4096} onChange={e=>setDescription(e.target.value)}/></label><button type="button" disabled={!writable} onClick={submit}>Uložit událost historie</button></fieldset>}
 </section>;
}
