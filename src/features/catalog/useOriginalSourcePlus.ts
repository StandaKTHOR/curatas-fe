import {useEffect,useState} from 'react';
import {originalIntegrationEnabled,originalSession} from './originalAdapter';
/** Nonvisual data bridge for the original Plus panel, with ownership and version-bound pagination. */
export function useOriginalSourcePlus(itemId:number,enabled:boolean){
 let session:ReturnType<typeof originalSession>|null=null;try{if(originalIntegrationEnabled()&&enabled&&Number.isSafeInteger(itemId)&&itemId>0)session=originalSession();}catch{/* Closed scope. */}
 const scope=session?.signal;
 const [state,setState]=useState<{scope:AbortSignal;item:number;data:Record<string,unknown>|null;message:string}|null>(null);
 useEffect(()=>{
  setState(null);if(!session||!scope)return;const life=new AbortController();const signal=AbortSignal.any([scope,life.signal]);
  setState({scope,item:itemId,data:null,message:'Načítání typovaných zdrojových polí Plus/Sluz…'});
  void (async()=>{
   const data:Record<string,unknown>={};let after='',etag='';
   for(let page=0;page<20;page++){
    const result=await session.api.sourcePlus(itemId,signal,after);if(signal.aborted)return;
    if(etag&&result.etag!==etag)throw new Error('Verze předmětu se změnila při čtení zdroje. Obnovte kartu.');etag=result.etag;
    for(const row of result.items)data[row.recordId]={sourceSha256:row.sourceSha256,rowHash:row.rowHash,occurrence:row.occurrence,...row.fields};
    if(result.nextAfterId===null){setState({scope,item:itemId,data,message:Object.keys(data).length?'':'Pro tento předmět nebyl nalezen doložený zdrojový řádek Sbirky.'});return;}
    after=result.nextAfterId;
   }
   throw new Error('Zdrojové varianty překračují limit čtení; neúplný výsledek nebyl zobrazen.');
  })().catch(e=>{if(!signal.aborted)setState({scope,item:itemId,data:null,message:(e as Error).message});});
  return()=>life.abort();
 },[itemId,enabled,scope]);
 return state!==null&&state.scope===scope&&state.item===itemId?{data:state.data,message:state.message}:{data:null,message:''};
}
