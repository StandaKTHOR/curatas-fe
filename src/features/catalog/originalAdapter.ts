import {scopedApi} from '../scoped/scopedApi';
import type {AvailableCatalog} from './catalogApi';

let context:{catalog:AvailableCatalog;token:string;controller:AbortController}|null=null;
export const originalIntegrationEnabled=()=>import.meta.env.MODE!=='test'||import.meta.env.VITE_ORIGINAL_SCOPED_TEST==='true';
export function bindOriginalCatalog(catalog:AvailableCatalog|null,token:string|null){
 if(context?.catalog.id===catalog?.id&&context?.token===token)return;
 context?.controller.abort();context=catalog&&token?{catalog,token,controller:new AbortController()}:null;
}
export function originalSession(){
 if(!context||!context.catalog.capabilities?.includes('item.read'))throw new Error('Vyberte dostupný katalog s oprávněním číst předměty.');
 const owned=context;return {api:scopedApi(owned.catalog.id,owned.token),signal:owned.controller.signal,catalog:owned.catalog};
}
export const unsupported=()=>{throw new Error('Tato původní operace nemá schválený scoped kontrakt. Historické API nebylo voláno.');};
export const originalItemHref=(id:number)=>`/admin/items/view/${id}?catalog=${originalSession().catalog.id}`;

/** Historical values never enter the original current-value form or its save draft. */
export function currentForm(item:any,professional:any,inventory:any){
 if(item.etag!==professional.etag||item.etag!==inventory.etag)throw new Error('Předmět se změnil během čtení. Obnovte kartu.');
 const v=professional.value;
 const view={...item.value,author:v.authorText,datingText:v.datingText,material:v.materialText,technique:v.techniqueText,
  objectType:v.objectType,description:v.description,originPlace:v.originPlace,materialNote:v.materialNote,
  quantity:inventory.value.quantity===null?null:Number(inventory.value.quantity),otherNumber:inventory.value.otherNumber,
  currentAssertionState:professional.present?'PRESENT':'ABSENT'};
 Object.defineProperty(view,'_editSession',{value:{itemId:item.value.id,etag:item.etag,scopedCurrent:{catalogId:item.value.catalogId,etag:item.etag,professional:{...professional.value},inventory:{...inventory.value}}}});
 return view as typeof view & {_editSession:any};
}
export async function originalDetail(id:string){
 const {api,signal}=originalSession();const n=Number(id);
 if(!Number.isSafeInteger(n)||n<1)throw new Error('Neplatná identita předmětu.');
 const item=await api.detail(n,signal);
 const professional=await api.curatorRecord!(n,'professional',signal);
 const inventory=await api.curatorRecord!(n,'inventory',signal);
 if(signal.aborted)throw new DOMException('Cancelled','AbortError');
 return currentForm(item,professional,inventory);
}
/** Read historical evidence by actual scoped item ID, never by inventory text. */
export async function originalInventorySource(id:number,expectedVersion:string,expectedCatalog:number){
 const {api,signal,catalog}=originalSession();
 if(catalog.id!==expectedCatalog)throw new Error('Katalog zdrojového pohledu se změnil.');
 const result=await api.sourceInventory(id,signal);
 if(signal.aborted)throw new DOMException('Cancelled','AbortError');
 if(result.itemVersion!==expectedVersion)throw new Error('Verze zdrojového pohledu se změnila. Obnovte kartu.');
 return {fields:result.fields,state:'VERIFIED_ITEM_PROJECTION' as const};
}
export async function originalList(params:Record<string,unknown>){
 const {api,signal}=originalSession();
 const {page=0,size=50,sortField='inventoryNumber',sortDirection='asc',...filters}=params;
 const result=await api.curatorPage(Number(page),Number(size),String(sortField)+','+String(sortDirection),filters,signal);
 if(signal.aborted)throw new DOMException('Cancelled','AbortError');
 return {content:result.items.map(row=>({...row.item,author:row.current.authorText,datingText:row.current.datingText,
  material:row.current.materialText,technique:row.current.techniqueText,objectType:row.current.objectType,originPlace:row.current.originPlace,
  currentAssertionState:row.currentPresent?'PRESENT':'ABSENT',sourceInventory:row.source,
  subCollection:row.source.Podsb_S,fundLegacyCode:row.source.Fond_S,hasPhoto:row.hasPhoto,hasAttachment:row.hasAttachment})),
  hasMore:result.hasMore,totalElements:result.totalElements,totalPages:result.totalPages};
}
/** Preserve the original catalog URL and controls, using the scoped curator contract. */
export function originalCatalogList(params:Record<string,unknown>){
 const {sort='inventoryNumber,asc',...rest}=params;
 const [sortField,sortDirection,...extra]=String(sort).split(',');
 if(extra.length)throw new Error('Neplatné řazení.');
 return originalList({...rest,sortField,sortDirection});
}
