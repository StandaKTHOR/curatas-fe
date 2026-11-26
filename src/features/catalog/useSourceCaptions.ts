import {useEffect,useMemo,useState} from 'react';
import {originalSession} from './originalAdapter';
import {unifiedDictionariesEnabled} from '../scoped/scopedApi';
import type {DictionaryCaption} from './dictionaryLabel';
/** Display metadata only. Never attach these fields to the immutable save binding. */
export function useSourceCaptions(requests:{type:string;key:string}[]){
 let scope:ReturnType<typeof originalSession>|null=null;try{scope=originalSession();}catch{/* no active catalog */}
 const identity=JSON.stringify([...new Map(requests.map(r=>[r.type+':'+r.key,r])).values()].sort((a,b)=>(a.type+a.key).localeCompare(b.type+b.key)));
 const [state,setState]=useState<{identity:string;signal:AbortSignal;values:Record<string,DictionaryCaption>}|null>(null);
 const signal=scope?.signal,api=useMemo(()=>scope?.api,[signal]),enabled=unifiedDictionariesEnabled()&&scope?.catalog.capabilities?.includes('dictionary.read')===true;
 useEffect(()=>{setState(null);if(!enabled||!api||!signal||identity==='[]')return;const c=new AbortController(),owned=AbortSignal.any([signal,c.signal]);
  void api.sourceCaptions(JSON.parse(identity),owned).then(values=>{if(!owned.aborted)setState({identity,signal,values});}).catch(()=>{/* Keep the recorded binding caption when display permission is unavailable. */});return()=>c.abort();
 },[api,signal,identity,enabled]);
 return enabled&&state&&state.signal===signal&&state.identity===identity?state.values:{};
}
