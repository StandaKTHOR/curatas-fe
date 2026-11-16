import {resolveApiUrl} from '../../lib/api';
import {effectiveToken,localAuthEnabled} from '../localAuth/localAuthClient';
export interface Share {id:string;authorityId:string;actorId:number;subjectId:number;capability:string;validFrom:string;validUntil:string;revokedAt:string|null}
export interface ShareInput {subjectId:number;capability:string;validFrom:string;validUntil:string;reason:string;evidenceSha256:string}
export class SharingError extends Error {constructor(public status:number){super(`Sdílení odmítnuto (${status}). Obnovte oprávnění a katalog.`);}}
export async function sharingRequest<T>(catalog:number,token:string,path:string,signal:AbortSignal,method='GET',body?:unknown):Promise<T>{
 const response=await fetch(resolveApiUrl(`/api/v2/catalogs/${catalog}/access/${path}`),{method,signal,cache:'no-store',redirect:'error',credentials:'omit',headers:{Authorization:`Bearer ${effectiveToken(token)}`,...(method==='GET'?{}:{'Content-Type':'application/json',...(localAuthEnabled()?{'X-CURATAS-CSRF':'1'}:{})})},...(body===undefined?{}:{body:JSON.stringify(body)})});
 if(!response.ok)throw new SharingError(response.status);
 const text=await response.text();if(signal.aborted)throw new DOMException('Aborted','AbortError');return (text?JSON.parse(text):null) as T;
}
export function shareInterval(days:'2'|'5'|'custom',custom:string,now=new Date()){
 const end=days==='custom'?new Date(custom):new Date(now.getTime()+Number(days)*86400000);
 if(!Number.isFinite(end.getTime())||end<=now)throw new Error('Konec platnosti musí být v budoucnosti.');
 return {validFrom:now.toISOString(),validUntil:end.toISOString()};
}
