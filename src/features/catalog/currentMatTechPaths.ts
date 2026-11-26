import type {DictionaryValue,ScopedApi} from '../scoped/scopedApi';
import type {MuseumRecord} from '../../lib/api';

export type MatTechType='MATERIAL'|'TECHNIQUE';
export type CurrentMatTechPath={values:DictionaryValue[];error?:string};
export const authorityKey=(type:MatTechType)=>type==='MATERIAL'?'materialAuthorityId':'techniqueAuthorityId';
export const pathKey=(type:MatTechType,id:string)=>type+':'+id;

/** Exact current UUID ancestry only. No label matching, inference or write request. */
export async function currentMatTechPaths(api:ScopedApi,rows:MuseumRecord[],signal:AbortSignal):Promise<Record<string,CurrentMatTechPath>>{
 const requests=new Map<string,{type:MatTechType;id:string}>();
 for(const row of rows.filter(r=>r.kind==='MATERIAL_TECHNIQUE'))for(const type of ['MATERIAL','TECHNIQUE'] as const){
  const id=row.payload[authorityKey(type)];if(typeof id==='string'&&id)requests.set(pathKey(type,id),{type,id});
 }
 return currentDictionaryPaths(api,[...requests.values()],signal);
}
export async function currentDictionaryPaths(api:ScopedApi,requests:{type:MatTechType;id:string}[],signal:AbortSignal):Promise<Record<string,CurrentMatTechPath>>{
 const cache=new Map<string,Promise<DictionaryValue>>();
 const result:Record<string,CurrentMatTechPath>={},queue=requests;let next=0;
 const read=(type:MatTechType,id:string)=>{const key=pathKey(type,id);if(!cache.has(key))cache.set(key,api.dictionaryValue(type,id,signal).then(r=>{if(r.value.id!==id||r.value.type!==type)throw new Error('Cizí autorita v cestě číselníku.');return r.value;}));return cache.get(key)!;};
 async function worker(){while(next<queue.length&&!signal.aborted){const {type,id}=queue[next++];try{
  const values:DictionaryValue[]=[];let current:string|null=id;const seen=new Set<string>();let catalog:number|undefined;
  while(current){if(values.length===3||seen.has(current))throw new Error('Neúplná nebo cyklická cesta číselníku.');seen.add(current);const value=await read(type,current);if(catalog!==undefined&&catalog!==value.catalogId)throw new Error('Cizí katalog v cestě číselníku.');catalog=value.catalogId;values.unshift(value);current=value.parentId;}
  result[pathKey(type,id)]={values};
 }catch(e){result[pathKey(type,id)]={values:[],error:(e as Error).message};}}}
 await Promise.all(Array.from({length:Math.min(4,queue.length)},worker));return result;
}
