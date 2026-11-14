import {useEffect,useState} from 'react';
import type {MuseumRecord} from '../../lib/api';
import {originalIntegrationEnabled,originalSession} from './originalAdapter';
import {authorityKey,currentMatTechPaths,pathKey,type CurrentMatTechPath} from './currentMatTechPaths';

/** Read-only projection in the existing professional row; the add form stays empty. */
export function useCurrentMatTechPaths(rows:MuseumRecord[]|undefined,itemId:number|undefined,enabled:boolean){
 const [state,setState]=useState<{rows:MuseumRecord[]|undefined;itemId:number|undefined;paths:Record<string,CurrentMatTechPath>}>({rows:undefined,itemId:undefined,paths:{}});
 useEffect(()=>{if(!enabled||!rows||!originalIntegrationEnabled())return;const cancel=new AbortController();const {api,signal}=originalSession();const combined=AbortSignal.any([signal,cancel.signal]);
  void currentMatTechPaths(api,rows,combined).then(paths=>{if(!combined.aborted)setState({rows,itemId,paths});});return()=>cancel.abort();
 },[rows,itemId,enabled]);
 return state.rows===rows&&state.itemId===itemId?state.paths:{};
}
export function CurrentMatTechAssignments({row,paths}:{row:MuseumRecord;paths:Record<string,CurrentMatTechPath>}){
 return <>{(['MATERIAL','TECHNIQUE'] as const).map(type=>{const id=row.payload[authorityKey(type)];if(typeof id!=='string'||!id)return null;const path=paths[pathKey(type,id)];return <span key={type} data-current-mattech-path={type}> · {type==='MATERIAL'?'Materiál':'Technika'}: {path?.error?'Cestu nelze ověřit; přiřazení zůstává zachováno':path?path.values.map((value,index)=>`Úroveň ${index+1}: ${value.label}`).join(' → '):'Načítání přiřazené cesty…'}</span>;})}</>;
}
