import {useEffect,useRef,useState} from 'react';
import {originalIntegrationEnabled,originalSession} from './originalAdapter';
import type {Dimension} from '../scoped/scopedApi';
/** Existing current repeated dimensions, separate from source FLOAT_BITS and scalar measurement. */
export function useOriginalDimensions(itemId:number,enabled:boolean){
 const active=originalIntegrationEnabled()&&enabled&&itemId>0;
 let session:ReturnType<typeof originalSession>|null=null;try{if(active)session=originalSession();}catch{/* closed scope */}
 const scope=session?.signal;
 const [state,setState]=useState<{scope:AbortSignal;item:number;rows:Dimension[];etag:string;next:number|null}|null>(null);
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);const life=useRef<AbortController|null>(null),pending=useRef(false);
 useEffect(()=>{setState(null);setError('');setBusy(false);pending.current=false;if(!session)return;const c=new AbortController();life.current=c;
  const signal=AbortSignal.any([c.signal,session.signal]);pending.current=true;setBusy(true);
  void session.api.dimensions(itemId,signal).then(r=>{if(!signal.aborted)setState({scope:session.signal,item:itemId,rows:r.value.items,etag:r.etag,next:r.value.nextAfterId});})
   .catch(e=>{if(!signal.aborted)setError(e.message);}).finally(()=>{if(!signal.aborted){pending.current=false;setBusy(false);}});
  const clear=()=>{c.abort();setState(null);setBusy(false);};session.signal.addEventListener('abort',clear,{once:true});
  return()=>{c.abort();session.signal.removeEventListener('abort',clear);};
 },[active,itemId,scope]);
 const valid=active&&state?.scope===scope&&state?.item===itemId;
 async function loadMore(){if(!valid||!state!.next||!session||!life.current||pending.current)return;
  const signal=AbortSignal.any([life.current.signal,session.signal]);pending.current=true;setBusy(true);setError('');
  try{const r=await session.api.dimensions(itemId,signal,state!.next);if(signal.aborted)return;
   if(r.etag!==state!.etag){setState(null);throw new Error('Verze měr se změnila. Obnovte kartu; stránky nebyly sloučeny.');}
   setState({...state!,rows:[...state!.rows,...r.value.items],next:r.value.nextAfterId});
  }catch(e){if(!signal.aborted)setError((e as Error).message);}finally{if(!signal.aborted){pending.current=false;setBusy(false);}}
 }
 return {rows:valid?state!.rows:[],loaded:valid,error,busy,next:valid?state!.next:null,loadMore};
}
