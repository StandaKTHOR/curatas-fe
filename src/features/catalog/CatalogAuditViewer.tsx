import {useEffect,useRef,useState} from 'react';
import {sharingRequest,SharingError} from './sharingApi';
interface Event {id:number;area:string;actor_id:number;subject_id:number|null;item_id:number|null;operation:string;occurred_at:string;digest:string;previous_digest:string}
export default function CatalogAuditViewer({catalogId,token,onDenied}:{catalogId:number;token:string;onDenied:()=>void}){
 const [item,setItem]=useState(''),[user,setUser]=useState(''),[from,setFrom]=useState(''),[until,setUntil]=useState(''),[rows,setRows]=useState<Event[]>([]),[error,setError]=useState('');const request=useRef<AbortController|null>(null);
 useEffect(()=>()=>request.current?.abort(),[]);
 async function load(after=0){request.current?.abort();const c=new AbortController();request.current=c;setRows([]);setError('');
  try{const query=new URLSearchParams({afterId:String(after),limit:'100'});for(const [key,value] of [['itemId',item],['userId',user]]){if(value){if(!/^[1-9][0-9]*$/.test(value))throw new Error('Identita musí být kladné celé číslo.');query.set(key,value);}}
   for(const [key,value] of [['from',from],['until',until]])if(value)query.set(key,new Date(value).toISOString());
   const result=await sharingRequest<Event[]>(catalogId,token,`audit?${query}`,c.signal);if(!c.signal.aborted)setRows(result);
  }catch(e){if(!c.signal.aborted){setError(e instanceof Error?e.message:'Audit není dostupný.');if(e instanceof SharingError&&[401,403,404].includes(e.status))onDenied();}}
 }
 return <details><summary>Forenzní audit katalogu</summary><form onSubmit={e=>{e.preventDefault();void load();}}><label>Předmět ID<input value={item} onChange={e=>setItem(e.target.value)}/></label><label>Uživatel ID<input value={user} onChange={e=>setUser(e.target.value)}/></label><label>Od v místním čase<input type="datetime-local" value={from} onChange={e=>setFrom(e.target.value)}/></label><label>Do v místním čase<input type="datetime-local" value={until} onChange={e=>setUntil(e.target.value)}/></label><button>Vyhledat audit</button></form>{error&&<p role="alert">{error}</p>}
 <table><caption>Audit katalogu {catalogId}; soukromé hodnoty jsou redigované</caption><thead><tr><th>Čas</th><th>Oblast</th><th>Aktér</th><th>Operace</th><th>Digest</th></tr></thead><tbody>{rows.map(e=><tr key={e.id}><td>{new Date(e.occurred_at).toLocaleString()}</td><td>{e.area}</td><td>{e.actor_id}</td><td>{e.operation}</td><td>{e.digest}</td></tr>)}</tbody></table>{rows.length===100&&<button onClick={()=>void load(rows[rows.length-1].id)}>Další auditní události</button>}</details>;
}
