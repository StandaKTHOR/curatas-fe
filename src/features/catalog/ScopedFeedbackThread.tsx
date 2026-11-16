import {useEffect,useRef,useState} from 'react';
import {originalSession} from './originalAdapter';
type Message={id:string;message:string;status:string;createdAt:string;actorId:number};
export default function ScopedFeedbackThread({rootId}:{rootId:string}){
 let scope;try{scope=originalSession();}catch{return <p role="status">Vlákno vyžaduje přihlášení a dostupný katalog.</p>;}
 return <ThreadBody key={`${scope.catalog.id}:${rootId}`} rootId={rootId} scope={scope}/>;
}
function ThreadBody({rootId,scope}:{rootId:string;scope:ReturnType<typeof originalSession>}){
 const owner=scope.signal;const [items,setItems]=useState<Message[]>([]),[next,setNext]=useState<string|null>(null),[text,setText]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const loadedOwner=useRef<AbortSignal|null>(null);
 const latest=useRef({rootId,owner});latest.current={rootId,owner};const pending=useRef<{id:string;text:string}|null>(null);
 useEffect(()=>{setItems([]);setNext(null);setText('');setError('');pending.current=null;setBusy(false);},[rootId,owner]);
 const current=()=>latest.current.rootId===rootId&&latest.current.owner===owner&&!owner.aborted;
 async function load(more=false){if(busy)return;setBusy(true);setError('');try{const page=await scope.api.feedbackThread(rootId,owner,more?next??undefined:undefined);if(current()){loadedOwner.current=owner;setItems(previous=>more?[...previous,...page.items]:[page.root,...page.items]);setNext(page.nextAfterId);}}catch(e){if(current())setError((e as Error).message);}finally{if(current())setBusy(false);}}
 async function reply(){if(busy)return;pending.current??={id:crypto.randomUUID(),text};if(pending.current.text!==text){setError('Nejprve ověřte výsledek předchozí odpovědi; zachovejte původní text.');return;}setBusy(true);setError('');try{
  const id=await scope.api.replyFeedback(rootId,pending.current.id,text,owner);let after:string|undefined;const rows:Message[]=[];
  for(let page=0;page<200;page++){const result=await scope.api.feedbackThread(rootId,owner,after);if(!page)rows.push(result.root);rows.push(...result.items);if(rows.some(r=>r.id===id)){if(current()){loadedOwner.current=owner;setItems(rows);setNext(result.nextAfterId);setText('');pending.current=null;}return;}if(!result.nextAfterId)break;after=result.nextAfterId;}
  throw new Error('Zápis byl potvrzen, ale následné čtení odpověď nepotvrdilo. Neopakujte nový požadavek.');
 }catch(e){if(current())setError((e as Error).message);}finally{if(current())setBusy(false);}}
 return <details><summary>Celé vlákno připomínky</summary><button type="button" disabled={busy} onClick={()=>void load()}>Načíst vlákno</button><ol>{(loadedOwner.current===owner?items:[]).map(r=><li key={r.id}><p>Uživatel #{r.actorId} · <time>{r.createdAt}</time> · {r.status}</p><p>{r.message}</p></li>)}</ol>{next&&<button type="button" disabled={busy} onClick={()=>void load(true)}>Další odpovědi</button>}<label>Odpověď<textarea value={text} onChange={e=>setText(e.target.value)} disabled={busy}/></label><button type="button" disabled={busy||text.trim().length<10} onClick={()=>void reply()}>Uložit odpověď a ověřit</button>{error&&<p role="alert">{error}</p>}</details>;
}
