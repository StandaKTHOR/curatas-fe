import {originalSession} from './originalAdapter';
import {originalCanCreate} from './originalCreate';
export function originalCanClone(){try{return originalCanCreate()&&originalSession().catalog.cloneEnabled===true&&originalSession().catalog.cloneReadEnabled===true;}catch{return false;}}
export async function cloneOriginalItem(id:number,requestId:string,input:{title:string;inventoryNumber:string}){
 if(!originalCanClone())throw new Error('V tomto katalogu nemáte povolené nezávislé klonování.');
 const {api,signal}=originalSession();const current=await api.detail(id,signal);
 return api.cloneItem(id,requestId,current.etag,input,signal);
}
export function originalCloneOutcome(requestId:string){const {api,signal}=originalSession();return api.cloneOutcome(requestId,signal);}
