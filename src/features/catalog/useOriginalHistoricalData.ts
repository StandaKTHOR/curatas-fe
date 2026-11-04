import {useEffect,useState} from 'react';
import {originalSession} from './originalAdapter';

export type HistoricalFields=Readonly<Record<string,string|null>>;
export const demusText=(value:string|null|undefined)=>value===null||value===undefined?'—':value===''?'Prázdný řetězec (DEMUS)':`${value} (DEMUS)`;
const populated=(value:unknown):value is string=>typeof value==='string'&&value.trim()!=='';
/** Output only. Never pass the result to a current-value draft or save function. */
export function historicalControl(current:unknown,source:string|null|undefined,readOnly:boolean){
 const present=current!==null&&current!==undefined&&String(current).trim()!=='';
 const hint=populated(source)?demusText(source):undefined;
 return {value:present?String(current):readOnly&&hint?hint:'',placeholder:present?undefined:hint};
}
export const currentBinding=(recordId:string|null|undefined)=>recordId?`Současná číselníková vazba (${recordId})`:null;

/** Independent read-only state, scoped to authentication signal, catalog, item AND parent ETag. */
export function useOriginalHistoricalData(itemId:number|undefined,session:any,enabled:boolean){
 let scope:ReturnType<typeof originalSession>|null=null;
 try{if(enabled&&itemId&&session?.itemId===itemId)scope=originalSession();}catch{/* No readable catalog: never reuse another scope. */}
 const catalogId=scope?.catalog.id;
 const signal=scope?.signal;
 const etag=session?.scopedCurrent?.catalogId===catalogId?session?.etag:undefined;
 const key=itemId&&etag&&/^"(0|[1-9][0-9]*)"$/.test(etag)?`${catalogId}:${itemId}:${etag}`:null;
 type State={key:string;signal:AbortSignal;fields:HistoricalFields;authorities:Readonly<Record<string,string|null>>};
 const [state,setState]=useState<State|null>(null);
 useEffect(()=>{
  setState(null);if(!key||!signal||signal.aborted||!itemId)return;
  const controller=new AbortController();const abort=()=>controller.abort();signal.addEventListener('abort',abort,{once:true});
  const owned=originalSession();
  if(owned.signal!==signal){signal.removeEventListener('abort',abort);return;}
  void Promise.all([owned.api.sourceInventory(itemId,controller.signal),owned.api.curatorRecord(itemId,'authorities',controller.signal)]).then(([source,authorities])=>{
   if(controller.signal.aborted||signal.aborted||source.etag!==etag||authorities.etag!==etag)return;
   setState({key,signal,fields:Object.freeze({...source.fields}),authorities:Object.freeze({...authorities.value})});
  }).catch(()=>{if(!controller.signal.aborted)setState(null);});
  return()=>{controller.abort();signal.removeEventListener('abort',abort);};
 },[key,signal,itemId,etag]);
 return key&&state?.key===key&&state.signal===signal&&!signal?.aborted?state:null;
}
