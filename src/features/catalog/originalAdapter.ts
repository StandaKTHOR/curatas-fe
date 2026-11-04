import {scopedApi} from '../scoped/scopedApi';
import type {AvailableCatalog} from './catalogApi';

let context:{catalog:AvailableCatalog;token:string;controller:AbortController}|null=null;
export const originalIntegrationEnabled=()=>import.meta.env.MODE!=='test'||import.meta.env.VITE_ORIGINAL_SCOPED_TEST==='true';
export function bindOriginalCatalog(catalog:AvailableCatalog|null,token:string|null){
 if(context?.catalog.id===catalog?.id&&context?.token===token&&JSON.stringify(context?.catalog)===JSON.stringify(catalog))return;
 context?.controller.abort();context=catalog&&token?{catalog,token,controller:new AbortController()}:null;
}
export function originalSession(){
 if(!context||!context.catalog.capabilities?.includes('item.read'))throw new Error('Vyberte dostupný katalog s oprávněním číst předměty.');
 const owned=context;return {api:scopedApi(owned.catalog.id,owned.token),signal:owned.controller.signal,catalog:owned.catalog};
}
export const unsupported=()=>{throw new Error('Tato původní operace nemá schválený scoped kontrakt. Historické API nebylo voláno.');};
export const originalItemHref=(id:number)=>`/admin/items/view/${id}?catalog=${originalSession().catalog.id}`;

/** Historical values never enter the original current-value form or its save draft. */
export function currentForm(item:any,professional:any,inventory:any,storage?:any,dimensions?:any){
 if(item.etag!==professional.etag||item.etag!==inventory.etag||storage&&item.etag!==storage.etag||dimensions&&item.etag!==dimensions.etag)throw new Error('Předmět se změnil během čtení. Obnovte kartu.');
 const v=professional.value;
 const storageValues=storage?.value??{locationBuilding:null,locationRoom:null,permanentLocation:null};
 const dimensionValues=dimensions?.value??[];
 const view={...item.value,...storageValues,dimensions:dimensionValues.map((row:any)=>({...row,dimensionType:row.type,value:row.value??'',unit:row.unit??'',note:row.note??''})),author:v.authorText,datingText:v.datingText,material:v.materialText,technique:v.techniqueText,
  objectType:v.objectType,description:v.description,originPlace:v.originPlace,materialNote:v.materialNote,
  quantity:inventory.value.quantity===null?null:Number(inventory.value.quantity),otherNumber:inventory.value.otherNumber,
  currentAssertionState:professional.present?'PRESENT':'ABSENT'};
 Object.defineProperty(view,'_editSession',{value:{itemId:item.value.id,etag:item.etag,scopedCurrent:{catalogId:item.value.catalogId,etag:item.etag,professional:{...professional.value},inventory:{...inventory.value},storage:{...storageValues},dimensions:dimensions?dimensionValues:undefined,core:{title:item.value.title,inventoryNumber:item.value.inventoryNumber}}}});
 return view as typeof view & {_editSession:any};
}
export async function originalDetail(id:string){
 const {api,signal}=originalSession();const n=Number(id);
 if(!Number.isSafeInteger(n)||n<1)throw new Error('Neplatná identita předmětu.');
 const item=await api.detail(n,signal);
 const professional=await api.curatorRecord!(n,'professional',signal);
 const inventory=await api.curatorRecord!(n,'inventory',signal);
 const storage=await api.curatorRecord(n,'storage',signal);
 const rows=[];let after=0,done=false;
 for(let page=0;page<20;page++){const result=await api.dimensions(n,signal,after,100);if(result.etag!==item.etag)throw new Error('Verze měr se změnila během čtení. Obnovte kartu.');rows.push(...result.value.items);if(result.value.nextAfterId===null){done=true;break;}after=result.value.nextAfterId;}
 if(!done)throw new Error('Předmět má více než2000 měr; neúplný formulář nebyl zobrazen.');

 if(signal.aborted)throw new DOMException('Cancelled','AbortError');
 return currentForm(item,professional,inventory,storage,{value:rows,etag:item.etag});
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
/** Existing identity panel, populated only from scoped, whitelisted reads at one item version. */
export async function originalDemusIdentity(id:number):Promise<import('../../lib/demusIdentity').DemusIdentity>{
 const {api,signal}=originalSession();const [evidence,source,summary,current]=await Promise.all([api.inventoryEvidence(id,signal),api.sourceInventory(id,signal),api.sourceSummary(id,signal),api.curatorRecord(id,'inventory',signal)]);
 if(signal.aborted||new Set([evidence.itemVersion,source.itemVersion,summary.itemVersion,current.etag.slice(1,-1)]).size!==1)throw new Error('Verze zdrojové identity se změnila. Obnovte kartu.');
 const c=evidence.sourceComponents,s=source.fields;
 const count=(v:string|null)=>{if(v===null)return null;if(!/^-?(0|[1-9][0-9]*)$/.test(v)||!Number.isSafeInteger(Number(v)))throw new Error('Neplatný počet evidence.');return Number(v);};
 return {itemId:id,inventoryNumber:evidence.inventoryNumber,sourceInventoryNumber:evidence.sourceInventoryNumber,originalInventoryNumber:evidence.sourceInventoryNumber,sourceLocalId:evidence.sourceLocalId,
  series:c.series,ordinal:c.ordinal,division:c.division,hierarchyOrdinal:c.hierarchyOrdinal,hierarchyDivision:c.hierarchyDivision,stateCode:c.stateCode,custodianCode:c.custodianCode,departmentCode:c.departmentCode,
  fundCode:s.Fond_S,groupCode:s.Skupina_S,determinedBy:s.Urcil_S,otherNumber:s.JineC_S,materialNote:null,sourceDatingFromYear:null,sourceDatingToYear:null,determinedAtRaw:null,
  sourceQuantity:count(summary.sourceQuantity),quantity:count(current.value.quantity)};
}
type CuratorRow=Awaited<ReturnType<ReturnType<typeof scopedApi>['curatorPage']>>['items'][number];
const originalRow=(row:CuratorRow)=>({...row.item,author:row.current.authorText,datingText:row.current.datingText,
  material:row.current.materialText,technique:row.current.techniqueText,objectType:row.current.objectType,originPlace:row.current.originPlace,
  currentAssertionState:row.currentPresent?'PRESENT':'ABSENT',quantity:row.currentInventory?.quantity===null||row.currentInventory?.quantity===undefined?null:Number(row.currentInventory.quantity),otherNumber:row.currentInventory?.otherNumber??null,sourceInventory:row.source,
  subCollection:row.source.Podsb_S,fundLegacyCode:row.source.Fond_S,hasPhoto:row.hasPhoto,hasAttachment:row.hasAttachment});
export async function originalList(params:Record<string,unknown>){
 const {api,signal}=originalSession();
 const {page=0,size=50,sortField='inventoryNumber',sortDirection='asc',...filters}=params;
 const result=await api.curatorPage(Number(page),Number(size),String(sortField)+','+String(sortDirection),filters,signal);
 if(signal.aborted)throw new DOMException('Cancelled','AbortError');
 return {content:result.items.map(originalRow),
  hasMore:result.hasMore,totalElements:result.totalElements,totalPages:result.totalPages};
}
/** Preserve the original catalog URL and controls, using the scoped curator contract. */
export function originalCatalogList(params:Record<string,unknown>){
 const {sort='inventoryNumber,asc',...rest}=params;
 const [sortField,sortDirection,...extra]=String(sort).split(',');
 if(extra.length)throw new Error('Neplatné řazení.');
 return originalList({...rest,sortField,sortDirection});
}

function outputParams(params:Record<string,unknown>){
 const {page:_page,size:_size,sortField='inventoryNumber',sortDirection='asc',sort,columns,...filters}=params;
 return {sort:sort===undefined?String(sortField)+','+String(sortDirection):String(sort),filters,columns:columns as string[]|undefined};
}
export async function originalPrint(params:Record<string,unknown>){
 const {api,signal}=originalSession();const query=outputParams(params);const result=await api.curatorPrint(query.sort,query.filters,signal);
 return result.items.map(originalRow);
}
export async function originalExcel(params:Record<string,unknown>){
 const {api,signal}=originalSession();const query=outputParams(params);return api.curatorExcel(query.sort,query.filters,signal,query.columns);
}

export async function originalWorksets(){const {api,signal}=originalSession();return api.worksets(signal);}
export async function originalWorksetCreate(data:{name:string;description?:string;itemIds?:number[];filter?:Record<string,unknown>;requestId?:string}){
 const {api,signal}=originalSession();const {requestId,...input}=data;return api.createWorkset(requestId??crypto.randomUUID(),input,signal);
}
