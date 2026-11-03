import {resolveApiUrl} from '../../lib/api';
export const localAuthEnabled=()=>import.meta.env.VITE_LOCAL_AUTH_ENABLED==='true';
let accessToken:string|null=null;
export const effectiveToken=(legacy:string)=>localAuthEnabled()?accessToken??'':legacy;
export const acceptLocalToken=(token:string|null)=>{accessToken=token;};
export class LocalAuthError extends Error {constructor(public status:number){super(status===429?'Příliš mnoho pokusů. Zkuste to později.':status===401?'Přihlášení není platné nebo vypršelo.':'Požadavek nebyl povolen.');}}
export async function localRequest(path:string,body?:unknown,token?:string,method=body===undefined?'GET':'POST',signal?:AbortSignal){
 const r=await fetch(resolveApiUrl(path),{method,signal:signal??window.AbortSignal.timeout(15000),credentials:path.startsWith('/api/auth/local')?'include':'omit',cache:'no-store',redirect:'error',headers:{...(body===undefined?{}:{'Content-Type':'application/json','X-CURATAS-CSRF':'1'}),...(token?{Authorization:`Bearer ${token}`}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
 if(!r.ok)throw new LocalAuthError(r.status);const text=await r.text();return text?JSON.parse(text):null;
}
let restore:Promise<{token:string;expiresIn:number}>|null=null;
/** Finish an already-started refresh before a new login can set the shared session cookie. Never starts a refresh. */
export async function settleLocalRestore(){if(restore)try{await restore;}catch{/* Anonymous/expired initial refresh is expected; login is a new authentication request. */}}
export function restoreLocal(){
 if(!restore){const request=()=>localRequest('/api/auth/local/refresh',{});restore=(navigator.locks?navigator.locks.request('curatas-local-refresh',request):request()).finally(()=>{restore=null;});}return restore;
}
export function resetLocal(token:string,password:string){return localRequest('/api/auth/local/reset',{token,password});}
