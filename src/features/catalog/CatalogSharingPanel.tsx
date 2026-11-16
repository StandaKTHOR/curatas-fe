import {useEffect,useRef,useState,type FormEvent} from 'react';
import {sharingRequest,shareInterval,SharingError,type Share} from './sharingApi';
const capabilities=['catalog.read','item.read','item.inventory.write','item.professional.write','dictionary.read','dictionary.write'];
export default function CatalogSharingPanel({catalogId,token,onDenied}:{catalogId:number;token:string;onDenied:()=>void}){
 const [rows,setRows]=useState<Share[]>([]),[subject,setSubject]=useState(''),[capability,setCapability]=useState('catalog.read'),[days,setDays]=useState<'2'|'5'|'custom'>('2'),[custom,setCustom]=useState(''),[reason,setReason]=useState(''),[evidence,setEvidence]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const request=useRef<AbortController|null>(null);
 const denied=useRef(onDenied);denied.current=onDenied;
 useEffect(()=>{const c=new AbortController();request.current=c;void sharingRequest<Share[]>(catalogId,token,'shares',c.signal).then(value=>{if(!c.signal.aborted)setRows(value);}).catch(e=>{if(!c.signal.aborted){setRows([]);setError(e.message);if(e instanceof SharingError&&[401,403,404].includes(e.status))denied.current();}});return()=>c.abort();},[catalogId,token]);
 useEffect(()=>()=>request.current?.abort(),[]);
 async function change(id?:string,event?:FormEvent){
  event?.preventDefault();if(busy)return;setError('');
  if(!reason.trim()||! /^[a-f0-9]{64}$/.test(evidence)){setError('Zadejte důvod a SHA256 schváleného podkladu.');return;}
  if(!id&&(!/^[1-9][0-9]*$/.test(subject)||!Number.isSafeInteger(Number(subject)))){setError('Zadejte číselnou identitu člena instituce.');return;}
  request.current?.abort();const c=new AbortController();request.current=c;setBusy(true);
  try{
   const body=id?{reason,evidenceSha256:evidence}:{subjectId:Number(subject),capability,...shareInterval(days,custom),reason,evidenceSha256:evidence};
   await sharingRequest(catalogId,token,id?`shares/${id}`:'shares',c.signal,id?'DELETE':'POST',body);
   const value=await sharingRequest<Share[]>(catalogId,token,'shares',c.signal);if(!c.signal.aborted){setRows(value);setReason('');setEvidence('');}
  }catch(e){if(!c.signal.aborted){setRows([]);setError(e instanceof Error?e.message:'Operace selhala.');if(e instanceof SharingError&&[401,403,404].includes(e.status))onDenied();}}
  finally{if(!c.signal.aborted)setBusy(false);}
 }
 return <details><summary>Časově omezené sdílení katalogu</summary><p>Každé právo vyžaduje vlastní výslovné pověření. Pro čtení předmětů jsou potřeba catalog.read a item.read. Sdílení nepředává právo dál delegovat.</p>
 <form aria-label="Sdílení katalogu" onSubmit={e=>void change(undefined,e)}>
 <label>Identita příjemce<input value={subject} onChange={e=>setSubject(e.target.value)} inputMode="numeric"/></label>
 <label>Oprávnění<select aria-label="Oprávnění" value={capability} onChange={e=>setCapability(e.target.value)}>{capabilities.map(c=><option key={c}>{c}</option>)}</select></label>
 <label>Platnost<select aria-label="Platnost" value={days} onChange={e=>setDays(e.target.value as typeof days)}><option value="2">2 dny</option><option value="5">5 dní</option><option value="custom">Vlastní konec</option></select></label>
 {days==='custom'&&<label>Konec v místním čase<input type="datetime-local" value={custom} onChange={e=>setCustom(e.target.value)}/></label>}
 <label>Důvod rozhodnutí<input maxLength={1000} value={reason} onChange={e=>setReason(e.target.value)}/></label>
 <label>SHA256 podkladu<input maxLength={64} value={evidence} onChange={e=>setEvidence(e.target.value)}/></label>
 <button disabled={busy}>Udělit omezené právo</button></form>{error&&<p role="alert">{error}</p>}
 <ul>{rows.map(row=><li key={row.id}>{row.subjectId}: {row.capability} — {new Date(row.validFrom).toLocaleString()} až {new Date(row.validUntil).toLocaleString()} {row.revokedAt?'Odvoláno':<button disabled={busy} onClick={()=>void change(row.id)}>Odvolat {row.capability} pro {row.subjectId}</button>}</li>)}</ul></details>;
}
