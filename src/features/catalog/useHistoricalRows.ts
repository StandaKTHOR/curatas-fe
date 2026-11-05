import {useEffect,useRef,useState} from 'react';
import {originalIntegrationEnabled,originalSession} from './originalAdapter';
import type {HistoricalPage,HistoricalTable} from './historicalContract';
export const historicalEnabled=()=>import.meta.env.VITE_DEMUS_HISTORY_ENABLED==='true'&&originalIntegrationEnabled();
export function useHistoricalRows(itemId:number|undefined,table:HistoricalTable|undefined,etag:string|undefined,relatedFor?:string){
 let scope:ReturnType<typeof originalSession>|null=null;try{if(historicalEnabled()&&itemId&&table&&etag)scope=originalSession();}catch{/* Closed catalog/authentication scope. */}
 const signal=scope?.signal,key=scope&&table&&itemId&&etag?`${scope.catalog.id}:${itemId}:${table}:${etag}:${relatedFor??''}`:null;
 type State=HistoricalPage&{key:string;scope:AbortSignal;pending:boolean;error:string};
 const [state,setState]=useState<State|null>(null);
 const life=useRef<{key:string;controller:AbortController;pending:boolean}|null>(null);
 async function load(after=''){
  const owned=life.current;if(!scope||!key||! table||!itemId||!owned||owned.key!==key||owned.pending||signal?.aborted)return;
  owned.pending=true;setState(old=>old?.key===key?{...old,pending:true}:old);
  try{
   const requestSignal=AbortSignal.any([scope.signal,owned.controller.signal]);
   const result=relatedFor?await scope.api.sourceRelated(itemId,table,relatedFor,requestSignal,after):await scope.api.sourceHistory(itemId,table,requestSignal,after);
   if(owned.controller.signal.aborted||scope.signal.aborted||life.current!==owned)return;
   if(result.etag!==etag)throw new Error('Verze předmětu se změnila. Obnovte kartu; historická data nebyla spojena s jinou verzí.');
   setState(old=>({key,scope:scope!.signal,...result,items:after&&old?.key===key?[...old.items,...result.items]:result.items,pending:false,error:''}));
  }catch(e){if(!owned.controller.signal.aborted&&!scope.signal.aborted&&life.current===owned){
   // Only a transport failure may retain the already validated page for retry. A contract,
   // revision or permission failure closes the whole view rather than mixing evidence.
   const retryable=e instanceof TypeError;
   setState(old=>retryable&&after&&old?.key===key&&old.scope===scope.signal
    ?{...old,pending:false,error:'Další stránku DEMUS se nepodařilo načíst. Již ověřené řádky zůstávají zobrazené; načítání lze opakovat.'}
    :{key,scope:scope.signal,items:[],state:'ERROR',nextAfterId:null,etag:etag!,pending:false,error:(e as Error).message});
  }}
  finally{owned.pending=false;}
 }
 useEffect(()=>{
  setState(null);if(!key||!signal||signal.aborted)return;
  const owned={key,controller:new AbortController(),pending:false};life.current=owned;void load();
  return()=>{owned.controller.abort();if(life.current===owned)life.current=null;};
  // Scope key contains catalog, item, table and parent ETag; auth replacement aborts signal.
 },[key,signal]);
 const shown=state?.key===key&&state.scope===signal&&!signal?.aborted?state:null;
 return {enabled:Boolean(key),page:shown,more:()=>{if(shown?.nextAfterId&&!shown.pending)void load(shown.nextAfterId);}};
}
