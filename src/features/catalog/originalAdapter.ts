import {inventorySourceComponents} from './inventorySourceComponents';
import {ScopedError,scopedApi} from '../scoped/scopedApi';
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
export function currentForm(item:any,professional:any,inventory:any,storage?:any,dimensions?:any,additional?:any){
 if(additional&&item.etag!==additional.etag||item.etag!==professional.etag||item.etag!==inventory.etag||storage&&item.etag!==storage.etag||dimensions&&item.etag!==dimensions.etag)throw new Error('Předmět se změnil během čtení. Obnovte kartu.');
 const v=professional.value;
 const storageValues=storage?.value??{locationBuilding:null,locationRoom:null,permanentLocation:null};
 const dimensionValues=dimensions?.value??[];
 const view={...item.value,...(additional?.value??{}),...storageValues,dimensions:dimensionValues.map((row:any)=>({...row,dimensionType:row.type,value:row.value??'',unit:row.unit??'',note:row.note??''})),author:v.authorText,datingText:v.datingText,material:v.materialText,technique:v.techniqueText,
  objectType:v.objectType,description:v.description,originPlace:v.originPlace,materialNote:v.materialNote,
  quantity:inventory.value.quantity===null?null:Number(inventory.value.quantity),otherNumber:inventory.value.otherNumber,
  currentAssertionState:professional.present?'PRESENT':'ABSENT'};
 Object.defineProperty(view,'_editSession',{value:{itemId:item.value.id,etag:item.etag,scopedCurrent:{catalogId:item.value.catalogId,etag:item.etag,professional:{...professional.value},inventory:{...inventory.value},storage:{...storageValues},additional:additional?{...additional.value}:undefined,dimensions:dimensions?dimensionValues:undefined,core:{title:item.value.title,inventoryNumber:item.value.inventoryNumber}}}});
 return view as typeof view & {_editSession:any};
}
export async function originalDetail(id:string){
 const {api,signal,catalog}=originalSession();const n=Number(id);
 if(!Number.isSafeInteger(n)||n<1)throw new Error('Neplatná identita předmětu.');
 const item=await api.detail(n,signal);
 const professional=await api.curatorRecord!(n,'professional',signal);
 const inventory=await api.curatorRecord!(n,'inventory',signal);
 const storage=await api.curatorRecord(n,'storage',signal);
 const additional=await api.curatorRecord(n,'additional',signal);
 const rows=[];let after=0,done=false;
 for(let page=0;page<20;page++){const result=await api.dimensions(n,signal,after,100);if(result.etag!==item.etag)throw new Error('Verze měr se změnila během čtení. Obnovte kartu.');rows.push(...result.value.items);if(result.value.nextAfterId===null){done=true;break;}after=result.value.nextAfterId;}
 if(!done)throw new Error('Předmět má více než2000 měr; neúplný formulář nebyl zobrazen.');

 if(signal.aborted)throw new DOMException('Cancelled','AbortError');
 const result=currentForm(item,professional,inventory,storage,{value:rows,etag:item.etag},additional);
 if(import.meta.env.MODE!=='test'||import.meta.env.VITE_CURATOR_CARD_TEST==='true'){
  try{
   const [custodian,recordedBy]=await Promise.all([api.curatorRecord(n,'custodian',signal),api.curatorRecord(n,'recorded-by',signal)]);
   if(custodian.etag!==item.etag||recordedBy.etag!==item.etag)throw new Error('Základní evidence se změnila během čtení. Obnovte kartu.');
   Object.assign(result,custodian.value,recordedBy.value,{_cardStatements:true});
   Object.assign(result._editSession.scopedCurrent,{custodian,recordedBy});
  }catch(error){if(!(error instanceof ScopedError&&error.status===404))throw error;}
 }
 if((result as any)._cardStatements){
  try{
   const bindings=await api.exactItemBindings(n,signal);
   const notes=await api.curatorRecord(n,'card-notes',signal);
   if(notes.etag!==item.etag)throw new Error('Poznámky se během čtení změnily.');
   if(bindings.etag!==item.etag)throw new Error('Odborné vazby se změnily během čtení.');
   Object.assign(result,notes.value,{_completion:true,datingKey:bindings.items.DATING?.key??null});
   result._editSession.scopedCurrent.cardNotes=notes.value;
   result._editSession.scopedCurrent.exactBindings=bindings.items;
  }catch(error){if(!(error instanceof ScopedError&&error.status===404))throw error;}
 }
 if(catalog.historicalAssignmentsEnabled){const refs=await api.historicalAssignments(n,signal);if(refs.etag!==item.etag)throw new Error('Historická přiřazení se změnila během čtení.');(result as any)._historicalAuthorities=refs.value;result._editSession.scopedCurrent.historicalAuthorities=refs.value;}
 if(catalog.historicalMatTechMultipleEnabled){
  (result as any).catalogSummary=await api.catalogSummary(n,item.value.version,signal);
 }
 return result;
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
 const s=source.fields;let c=inventorySourceComponents(evidence.sourceComponents,s);
 if(import.meta.env.VITE_DEMUS_HISTORY_ENABLED==='true'&&c.hierarchyDivision===null){
  const root=await api.sourceHistory(id,'Sbirky',signal);
  if(signal.aborted||root.etag!==current.etag)throw new Error('Verze úplné zdrojové identity se změnila. Obnovte kartu.');
  if(root.state==='AVAILABLE'&&root.items.length===1&&root.nextAfterId===null)c=inventorySourceComponents(evidence.sourceComponents,s,root.items[0].fields);
 }
 const count=(v:string|null)=>{if(v===null)return null;if(!/^-?(0|[1-9][0-9]*)$/.test(v)||!Number.isSafeInteger(Number(v)))throw new Error('Neplatný počet evidence.');return Number(v);};
 return {itemId:id,inventoryNumber:evidence.inventoryNumber,sourceInventoryNumber:evidence.sourceInventoryNumber,originalInventoryNumber:evidence.sourceInventoryNumber,sourceLocalId:evidence.sourceLocalId,
  series:c.series,ordinal:c.ordinal,division:c.division,hierarchyOrdinal:c.hierarchyOrdinal,hierarchyDivision:c.hierarchyDivision,stateCode:c.stateCode,custodianCode:c.custodianCode,departmentCode:c.departmentCode,
  fundCode:s.Fond_S,groupCode:s.Skupina_S,determinedBy:s.Urcil_S,otherNumber:s.JineC_S,materialNote:null,sourceDatingFromYear:null,sourceDatingToYear:null,determinedAtRaw:null,
  sourceQuantity:count(summary.sourceQuantity),quantity:count(current.value.quantity)};
}
type CuratorRow=Awaited<ReturnType<ReturnType<typeof scopedApi>['curatorPage']>>['items'][number];
const originalRow=(row:CuratorRow)=>({...row.item,...(row.lifecycle?{isActive:row.lifecycle.active,published:row.lifecycle.published,catalogingStatus:row.lifecycle.status}:{}),author:row.current.authorText?.trim()?row.current.authorText:row.currentAuthorityLabels.AUTHOR??null,datingText:row.current.datingText,
  material:row.current.materialText,technique:row.current.techniqueText,objectType:row.current.objectType?.trim()?row.current.objectType:row.currentAuthorityLabels.OBJECT_TYPE??null,originPlace:row.current.originPlace,
  currentAssertionState:row.currentPresent?'PRESENT':'ABSENT',quantity:row.currentInventory?.quantity===null||row.currentInventory?.quantity===undefined?null:Number(row.currentInventory.quantity),otherNumber:row.currentInventory?.otherNumber??null,sourceInventory:row.source,catalogSummary:row.catalogSummary,objectCondition:row.currentOutput.objectCondition,description:row.currentOutput.description,fund:row.currentAuthorityLabels.FUND??null,
  subCollection:row.currentAuthorityLabels.COLLECTION??row.source.Podsb_S,currentAuthorityLabels:row.currentAuthorityLabels,fundLegacyCode:row.source.Fond_S,hasPhoto:row.hasPhoto,hasAttachment:row.hasAttachment});
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
 const {api,signal}=originalSession();const query=outputParams(params);let result;try{result=await api.curatorPrint(query.sort,query.filters,signal);}catch(e){if((e as {status?:number}).status===413)throw new Error('Úplný tisk přesahuje limit 10 000 předmětů. Zužte filtr nebo pracovní sadu.',{cause:e});throw e;}
 return result.items.map(originalRow);
}
export async function originalSelectedPrint(ids:number[]){
 if(!ids.length||ids.length>200||new Set(ids).size!==ids.length)throw new Error('Vyberte 1 až 200 různých předmětů; výstup se nesmí tiše krátit.');
 const {api,signal}=originalSession();const result=[];for(const id of ids){const item=await originalDetail(String(id));if(item.id!==id)throw new Error('Neověřená identita výběru.');const source=await api.sourceInventory(id,signal),refs=await api.references(id,signal);if(source.etag!==item._editSession.etag||refs.etag!==item._editSession.etag)throw new Error('Předmět se změnil během přípravy tisku.');const labels=Object.fromEntries(refs.items.map(v=>[v.type,v.label]));result.push({...item,sourceInventory:source.fields,fund:labels.FUND??null,subCollection:labels.COLLECTION??null,author:item.author?.trim()?item.author:labels.AUTHOR??null,objectType:item.objectType?.trim()?item.objectType:labels.OBJECT_TYPE??null});}return result;
}
export async function originalExcel(params:Record<string,unknown>){
 const {api,signal}=originalSession();const query=outputParams(params);return api.curatorExcel(query.sort,query.filters,signal,query.columns);
}

export async function originalWorksets(){const {api,signal}=originalSession();return api.worksets(signal);}
export async function originalWorksetCreate(data:{name:string;description?:string;itemIds?:number[];filter?:Record<string,unknown>;requestId?:string}){
 const {api,signal}=originalSession();const {requestId,...input}=data;return api.createWorkset(requestId??crypto.randomUUID(),input,signal);
}

export async function originalAcquisitions(itemId:number,session?:import('../../lib/editSession').ItemEditSession){
 const {api,signal}=originalSession();const result=await api.acquisitions(itemId,signal);
 if(session&&result.etag!==session.etag)throw new Error('Verze akvizic se změnila. Obnovte kartu.');
 if(session)session.acquisitionSnapshot=result.value;return result.value;
}
export async function originalAcquisitionSave(itemId:number,recordId:number|undefined,input:import('../../lib/api').MuseumAcquisitionInput,session?:import('../../lib/editSession').ItemEditSession){
 const {api,signal,catalog}=originalSession();
 if(!session||session.itemId!==itemId||session.busy||!catalog.professionalWriteEnabled||!catalog.capabilities?.includes('item.professional.write'))throw new Error('Chybí oprávnění nebo aktuální verze akvizice.');
 session.busy=true;try{const result=await api.saveAcquisition(itemId,recordId,session.etag,input,signal);session.etag=result.etag;if((session as any).scopedCurrent)(session as any).scopedCurrent.etag=result.etag;return result.value;}finally{session.busy=false;}
}

/** Original card template, explicit current values only; private physical storage never enters print. */
export function originalPrintCardFields(form:Record<string,any>){
 const keys=['id','title','inventoryNumber','accessionNumber','description','datingText','material','technique','countryOfOrigin','originPlace','findingLocality','weight'];
 const value:Record<string,any>=Object.fromEntries(keys.map(k=>[k,form[k]??null]));
 for(const key of ['accessionNumber','author','material','technique','datingText'] as const){const entries=form.catalogSummary?.[key];if(entries!==undefined)value[key]=entries.map((entry:{value:string})=>entry.value).join(' · ');}
 value.subCollection=form.subCollection||'Neuvedeno';value.author=value.author??form.author??'Neuvedeno';value.objectCondition=form.objectCondition||'Neuvedeno';value.modifiedByUser='Neuvedeno';
 value.dimensions=Array.isArray(form.dimensions)?form.dimensions.map((d:any)=>({type:d.type??d.dimensionType,value:d.value,unit:d.unit})):[];return value;
}
