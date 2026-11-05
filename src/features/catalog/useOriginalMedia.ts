import {useEffect,useMemo,useRef,useState} from 'react';
import {originalIntegrationEnabled,originalSession} from './originalAdapter';
import type {Media} from '../scoped/scopedApi';

/** Metadata never becomes a public URL. Bytes are fetched only on display or click. */
export function useOriginalMedia(itemId:number,enabled:boolean){
 const active=originalIntegrationEnabled()&&enabled&&Number.isSafeInteger(itemId)&&itemId>0;
 let session:ReturnType<typeof originalSession>|null=null;try{if(active)session=originalSession();}catch{/* closed scope */}
 const scope=session?.signal;
 const [page,setPage]=useState<{owner:AbortSignal;item:number;items:Media[];next:string|null}|null>(null);
 const [revision,setRevision]=useState(0);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const lifetime=useRef<AbortController|null>(null),pending=useRef(false);
 useEffect(()=>{
  setPage(null);setError('');setBusy(false);pending.current=false;if(!active||!session)return;
  const c=new AbortController();lifetime.current=c;pending.current=true;setBusy(true);
  const signal=AbortSignal.any([c.signal,session.signal]);
  void session.api.media(itemId,signal).then(result=>{if(!signal.aborted)setPage({owner:session.signal,item:itemId,items:result.items,next:result.nextAfterId});})
   .catch(e=>{if(!signal.aborted)setError(e.message);}).finally(()=>{if(!signal.aborted){pending.current=false;setBusy(false);}});
  const clear=()=>{c.abort();setPage(null);setBusy(false);};session.signal.addEventListener('abort',clear,{once:true});
  return()=>{c.abort();session.signal.removeEventListener('abort',clear);};
 // The session signal changes with catalog or authentication; no data survives it.
 },[active,itemId,scope,revision]);
 const valid=active&&page?.owner===scope&&page?.item===itemId;
 const items=valid?page!.items:[];
 const images=useMemo(()=>{
  if(!valid||!session||!lifetime.current)return [];
  const api=session.api,life=lifetime.current.signal,owner=session.signal;
  let turn=0;const lanes=[Promise.resolve(),Promise.resolve()];
  return items.filter(v=>v.kind==='IMAGE').map(entry=>({id:entry.id,url:'',caption:entry.caption??entry.name,primary:false,entry,
   preview:(cancel:AbortSignal)=>api.bytes(itemId,entry,'content',AbortSignal.any([cancel,life,owner])),
   thumbnail:(cancel:AbortSignal)=>{const lane=turn++%2;const operation=lanes[lane].then(()=>api.bytes(itemId,entry,entry.variants.includes('thumbnail')?'thumbnail':'content',AbortSignal.any([cancel,life,owner]),5*1024*1024));lanes[lane]=operation.then(()=>{},()=>{});return operation;}
  }));
 },[items,valid,itemId,scope]);
 async function loadMore(){
  if(!valid||!page!.next||!session||!lifetime.current||pending.current)return;
  const c=lifetime.current,signal=AbortSignal.any([c.signal,session.signal]);pending.current=true;setBusy(true);setError('');
  try{const result=await session.api.media(itemId,signal,page!.next);if(signal.aborted)return;
   if(result.items.some(v=>items.some(old=>old.id===v.id)))throw new Error('Duplicitní identita média.');
   setPage({owner:session.signal,item:itemId,items:[...items,...result.items],next:result.nextAfterId});
  }catch(e){if(!signal.aborted)setError((e as Error).message);}finally{if(!signal.aborted){pending.current=false;setBusy(false);}}
 }
 async function download(entry:Media){
  if(!valid||!session||!lifetime.current||!items.some(v=>v.id===entry.id))throw new Error('Médium není dostupné v aktuálním katalogu a předmětu.');
  const signal=AbortSignal.any([session.signal,lifetime.current.signal]);
  const blob=await session.api.bytes(itemId,entry,'content',signal);if(signal.aborted)return;
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=entry.name;
  try{a.click();}finally{window.setTimeout(()=>URL.revokeObjectURL(url),1000);}
 }
 return {reload:()=>setRevision(v=>v+1),images,attachments:items.filter(v=>v.kind==='ATTACHMENT'),busy,error,next:valid?page!.next:null,loaded:valid,loadMore,download};
}
