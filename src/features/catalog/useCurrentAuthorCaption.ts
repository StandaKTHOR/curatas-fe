import {useEffect,useState} from 'react';
import {originalIntegrationEnabled,originalSession} from './originalAdapter';
/** Display only: current assignments never become a text-field draft. */
export function useCurrentAuthorCaption(itemId:number|undefined,etag:string|undefined){
 let scope:ReturnType<typeof originalSession>|null=null;try{if(originalIntegrationEnabled())scope=originalSession();}catch{/* closed scope */}
 const [state,setState]=useState<{id:number;etag:string;signal:AbortSignal;label:string}|null>(null);
 const signal=scope?.signal;
 useEffect(()=>{let alive=true;setState(null);if(!itemId||!etag||typeof scope?.api.currentAuthors!=='function'||!scope?.catalog.capabilities?.includes('dictionary.read')||import.meta.env.VITE_CURRENT_AUTHORS_ENABLED!=='true')return;
  void scope.api.currentAuthors(itemId,scope.signal).then(page=>{if(alive&&!scope!.signal.aborted&&page.etag===etag)setState({id:itemId,etag,signal:scope!.signal,label:page.items.map(v=>v.authorLabel+(v.roleLabel?` (${v.roleLabel})`:'')).join(', ')});}).catch(()=>{});
  return()=>{alive=false;};
 },[itemId,etag,signal]);
 return state&&state.id===itemId&&state.etag===etag&&state.signal===signal?state.label:null;
}
