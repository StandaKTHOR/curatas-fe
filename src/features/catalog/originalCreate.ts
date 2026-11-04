import {originalSession} from './originalAdapter';
import type {NewItemFields} from '../scoped/scopedApi';
import {originalCanEdit} from './originalEdit';

export function originalCanCreate(){try{const {catalog}=originalSession();return catalog.creationEnabled===true&&catalog.capabilities?.includes('item.create')===true;}catch{return false;}}
export class CreationValidationError extends Error {constructor(public field:string,message:string){super(message);}}
export function originalCreationFields(form:Record<string,unknown>):NewItemFields{
 const fields:NewItemFields={title:String(form.title??''),inventoryNumber:String(form.inventoryNumber??''),accessionNumber:form.accessionNumber===''||form.accessionNumber==null?null:String(form.accessionNumber)};
 for(const key of ['inventoryNumber','title','accessionNumber'] as const){
  const value=fields[key];if(key==='accessionNumber'&&value===null)continue;
  if(!value?.trim())throw new CreationValidationError(key,key==='inventoryNumber'?'Inventární číslo je povinné.':key==='title'?'Vyplňte název předmětu (nebo typ) na kartě Základ.':'Přírůstkové číslo ponechte prázdné nebo zadejte jeho hodnotu.');
  if(value.includes('\0')||value.length>(key==='title'?4096:255))throw new CreationValidationError(key,'Hodnota obsahuje nepovolený znak nebo je příliš dlouhá.');
 }
 const professional={objectType:'objectType',description:'description',authorText:'author',datingText:'datingText',originPlace:'originPlace',materialText:'material',techniqueText:'technique',materialNote:'materialNote'};
 if(originalCanEdit('professional')&&Object.values(professional).some(key=>form[key]!==null&&form[key]!==undefined&&form[key]!=='')){
  fields.professional=Object.fromEntries(Object.entries(professional).map(([field,key])=>[field,form[key]===null||form[key]===undefined||form[key]===''?null:String(form[key])]));
 }
 if(originalCanEdit('inventory')&&(form.quantity!==null&&form.quantity!==undefined&&form.quantity!==''||form.otherNumber!==null&&form.otherNumber!==undefined&&form.otherNumber!=='')){
  const raw=form.quantity;const quantity=raw===null||raw===undefined||raw===''?null:Number(raw);
  if(quantity!==null&&(!Number.isInteger(quantity)||quantity<0||quantity>2147483647))throw new CreationValidationError('quantity','Počet musí být celé nezáporné číslo nebo NULL.');
  fields.inventory={quantity,otherNumber:form.otherNumber===null||form.otherNumber===undefined||form.otherNumber===''?null:String(form.otherNumber)};
 }
 if(originalCanEdit('inventory')&&['locationBuilding','locationRoom','permanentLocation'].some(key=>form[key]!==null&&form[key]!==undefined&&form[key]!==''))fields.storage=Object.fromEntries(['locationBuilding','locationRoom','permanentLocation'].map(key=>[key,form[key]===null||form[key]===undefined||form[key]===''?null:String(form[key])]));
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
  const approvedProfessional=originalCanEdit('professional')&&['current-object-type','description','author','datingText','originPlace','current-material-text','current-technique-text','materialNote'].includes(node.id);
  const approvedInventory=originalCanEdit('inventory')&&['quantity','current-other-number','locationBuilding','locationRoom','permanentLocation'].includes(node.id);
  const active=enabled&&(['title','accessionNumber'].includes(node.id)||node.getAttribute('aria-label')?.startsWith('Inventární číslo:')||node.hasAttribute('data-scoped-save')||approvedProfessional||approvedInventory);
  (node as HTMLInputElement).disabled=!active;if(active)node.removeAttribute('disabled');else node.setAttribute('disabled','');
 });
}
