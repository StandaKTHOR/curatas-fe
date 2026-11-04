import {useRef,useState} from 'react';import {originalSession} from './originalAdapter';
/** Only the existing catalog steward can read the private feedback queue; API rechecks live ACL. */
export default function ScopedFeedbackQueue(){
 let scope:ReturnType<typeof originalSession>|null=null;try{scope=originalSession();}catch{/* closed session */}
 const key=scope?`${scope.catalog.id}`:'';const latest=useRef(scope);latest.current=scope;
 const [state,setState]=useState<{key:string;signal:AbortSignal;items:{id:string;message:string;status:string;createdAt:string}[];next:{afterTime:string;afterId:string}|null}|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const current=state?.key===key&&state.signal===scope?.signal?state:null;
 if(!scope?.catalog.capabilities?.includes('catalog.grant.manage'))return null;
 async function load(more=false){if(!scope||busy)return;const owned=scope;setBusy(true);setError('');try{const p=await owned.api.feedbackQueue(owned.signal,more?current?.next??undefined:undefined);if(latest.current?.signal===owned.signal&&!owned.signal.aborted)setState({key,signal:owned.signal,items:more?[...(current?.items??[]),...p.items]:p.items,next:p.next});}catch(e){if(!owned.signal.aborted)setError((e as Error).message);}finally{if(latest.current?.signal===owned.signal)setBusy(false);}}
 return <details><summary>Přijaté připomínky katalogu (správce)</summary><p>Připomínky se ukládají do této interní fronty. E-mailové doručení se nepotvrzuje.</p><button type="button" disabled={busy} onClick={()=>void load()}>Načíst připomínky katalogu</button>{error&&<p role="alert">{error}</p>}<ul>{current?.items.map(r=><li key={r.id}>{r.createdAt} — {r.status} — {r.message}</li>)}</ul>{current?.next&&<button type="button" disabled={busy} onClick={()=>void load(true)}>Další připomínky</button>}</details>;
}
