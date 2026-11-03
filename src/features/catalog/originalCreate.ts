import {originalSession} from './originalAdapter';
import type {NewItemFields} from '../scoped/scopedApi';

export function originalCanCreate(){try{const {catalog}=originalSession();return catalog.creationEnabled===true&&catalog.capabilities?.includes('item.create')===true;}catch{return false;}}
export class CreationValidationError extends Error {constructor(public field:string,message:string){super(message);}}
export function originalCreationFields(form:Record<string,unknown>):NewItemFields{
 const fields:NewItemFields={title:String(form.title??''),inventoryNumber:String(form.inventoryNumber??''),accessionNumber:form.accessionNumber===''||form.accessionNumber==null?null:String(form.accessionNumber)};
 for(const key of ['inventoryNumber','title','accessionNumber'] as const){
  const value=fields[key];if(key==='accessionNumber'&&value===null)continue;
  if(!value?.trim())throw new CreationValidationError(key,key==='inventoryNumber'?'Inventární číslo je povinné.':key==='title'?'Vyplňte název předmětu (nebo typ) na kartě Základ.':'Přírůstkové číslo ponechte prázdné nebo zadejte jeho hodnotu.');
  if(value.includes('\0')||value.length>(key==='title'?4096:255))throw new CreationValidationError(key,'Hodnota obsahuje nepovolený znak nebo je příliš dlouhá.');
 }
 return fields;
}
export async function createOriginalItem(requestId:string,form:Record<string,unknown>){
 if(!originalCanCreate())throw new Error('V tomto katalogu nemáte povolené zakládání předmětů.');
 const {api,signal}=originalSession();return api.createItem(requestId,originalCreationFields(form),signal);
}
export async function originalCreationOutcome(requestId:string){
 if(!originalCanCreate())throw new Error('V tomto katalogu nemáte povolené zakládání předmětů.');
 const {api,signal}=originalSession();return api.creationOutcome(requestId,signal);
}
export function applyOriginalCreationBoundary(root:HTMLElement|null,enabled:boolean){
 root?.querySelectorAll<HTMLElement>('input,textarea,select,button,gov-button,gov-form-input,gov-form-select').forEach(node=>{
  if(node.hasAttribute('data-scoped-navigation'))return;
  const active=enabled&&(['title','accessionNumber'].includes(node.id)||node.getAttribute('aria-label')?.startsWith('Inventární číslo:')||node.hasAttribute('data-scoped-save'));
  (node as HTMLInputElement).disabled=!active;if(active)node.removeAttribute('disabled');else node.setAttribute('disabled','');
 });
}
