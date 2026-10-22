import {useEffect,useRef,useState} from 'react';
import {ScopedError,errorText,type Creation,type NewItemFields,type ScopedApi} from './scopedApi';
import {useDraftWarning} from './useDraftWarning';

export default function NewItemForm({api,catalogName,onCreated,onCancel,onFatal}:{api:ScopedApi;catalogName:string;onCreated:(item:Creation)=>void;onCancel:()=>void;onFatal:(status:number)=>void}){
 const [draft,setDraft]=useState<NewItemFields>({title:'',inventoryNumber:'',accessionNumber:''});
 const [requestId]=useState(()=>crypto.randomUUID());const [busy,setBusy]=useState(false);const [locked,setLocked]=useState(false);const [error,setError]=useState('');
 const running=useRef(false);const request=useRef<AbortController|null>(null);
 const dirty=Object.values(draft).some(Boolean);useDraftWarning(dirty);
 useEffect(()=>()=>request.current?.abort(),[]);
 const valid=Object.entries(draft).every(([k,v])=>v.trim()&&v.length<=(k==='title'?4096:255));
 async function submit(recover=false){
  if(running.current||(!recover&&(!valid||locked))||!api.createItem||!api.creationOutcome)return;
  running.current=true;setBusy(true);setError('');setLocked(true);const controller=new AbortController();request.current=controller;
  try{const result=recover?await api.creationOutcome(requestId,controller.signal):await api.createItem(requestId,draft,controller.signal);
   if(!controller.signal.aborted)onCreated(result.value);
  }catch(e){if(controller.signal.aborted)return;const status=e instanceof ScopedError?e.status:0;
   if(recover&&status===404){setLocked(false);setError('Pro tento klíč zatím není potvrzené vytvoření. Můžete opravit pole a ručně odeslat tentýž požadavek.');}
   else{setError(errorText(status)+' Výsledek ověřte tlačítkem níže; POST se neopakuje automaticky.');if([401,403,404].includes(status))onFatal(status);}
  }finally{if(!controller.signal.aborted){running.current=false;setBusy(false);}}
 }
 return <form aria-label="Nový MESonline předmět" onSubmit={e=>{e.preventDefault();void submit();}}>
  <h2>Nový předmět — {catalogName}</h2><p>Nový záznam MESonline bez historického DEMUS ID. Zadejte skutečná čísla; nic se negeneruje. Přírůstkové číslo musí splnit stávající globální unikátnost.</p>
  <label>Název nového předmětu<input required maxLength={4096} disabled={busy||locked} value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})}/></label>
  <label>Inventární číslo nového předmětu<input required maxLength={255} disabled={busy||locked} value={draft.inventoryNumber} onChange={e=>setDraft({...draft,inventoryNumber:e.target.value})}/></label>
  <label>Přírůstkové číslo nového předmětu<input required maxLength={255} disabled={busy||locked} value={draft.accessionNumber} onChange={e=>setDraft({...draft,accessionNumber:e.target.value})}/></label>
  <p>Rozpracovaný formulář není uložený serverový draft. Text včetně mezer a nul zůstane přesný.</p>
  <button disabled={busy||locked||!valid}>Vytvořit předmět</button>
  {locked&&!busy&&<button type="button" onClick={()=>void submit(true)}>Ověřit výsledek vytvoření</button>}
  <button type="button" disabled={busy} onClick={()=>{if(!dirty||window.confirm('Zahodit formulář? Nejistý výsledek nejprve ověřte podle klíče požadavku.'))onCancel();}}>Zrušit nový předmět</button>
  <p>Klíč požadavku: <code data-testid="creation-request-key">{requestId}</code></p>
  {busy&&<p role="status">Ověřování nebo zakládání předmětu…</p>}{error&&<p role="alert">{error}</p>}
 </form>;
}
