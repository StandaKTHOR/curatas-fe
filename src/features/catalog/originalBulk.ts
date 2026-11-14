import {originalSession} from './originalAdapter';
import {originalCanClone} from './originalClone';
import {allCloneGroups,checkedCloneGroups,type CloneGroup} from './cloneGroups';
export type BulkCopyResult={inventoryNumber:string;requestId:string;id?:number;state:'VERIFIED'|'REJECTED'|'UNCONFIRMED'|'NOT_STARTED';message?:string};
export function explicitBulkNumbers(input:string,base:string){
 const numbers=input.split(/\r?\n/).map(v=>v.trim()).filter(Boolean);
 if(!numbers.length||numbers.length>20)throw new Error('Zadejte 1 až 20 nových inventárních čísel, každé na samostatný řádek.');
 if(new Set([base.trim(),...numbers]).size!==numbers.length+1)throw new Error('Inventární čísla se nesmějí opakovat ani shodovat s předlohou.');
 if(numbers.some(v=>v.length>255||v.includes('\0')))throw new Error('Neplatné inventární číslo duplikátu.');
 return numbers;
}
/** Each existing clone request is atomic. A batch is explicitly a partial-success operation.
 * Stop on the first rejection/uncertain result; never replay a POST or invent identities. */
export async function copyExplicitBulk(source:number,title:string|null,numbers:string[],progress:(rows:BulkCopyResult[])=>void,copyGroups:CloneGroup[]=[...allCloneGroups]){
 if(!originalCanClone())throw new Error('Klonování není v katalogu povoleno.');
 const {api,signal,catalog}=originalSession();
 const groups=checkedCloneGroups(copyGroups);
 if(!numbers.length||numbers.length>20||new Set(numbers).size!==numbers.length||numbers.some(v=>!v.trim()||v.length>255||v.includes('\0')))throw new Error('Neplatný seznam explicitních inventárních čísel.');
 const rows:BulkCopyResult[]=numbers.map(inventoryNumber=>({inventoryNumber,requestId:crypto.randomUUID(),state:'NOT_STARTED'}));
 const current=await api.detail(source,signal);
 let expectedType:string|null=null,expectedAuthority:string|null=null;
 if(title===null){const professional=await api.curatorRecord(source,'professional',signal);if(professional.etag!==current.etag)throw new Error('Předloha se změnila před založením dávky.');expectedType=professional.value.objectType;
  if(!expectedType?.trim()){const references=await api.references(source,signal);if(references.etag!==current.etag)throw new Error('Typ předlohy se změnil.');const types=references.items.filter(v=>v.type==='OBJECT_TYPE');if(types.length!==1)throw new Error('Předloha bez titulu nemá jednoznačný současný typ.');expectedAuthority=types[0].id;}}
 for(const row of rows){
  try{
   const saved=await api.cloneItem(source,row.requestId,current.etag,{title,inventoryNumber:row.inventoryNumber,copyGroups:groups},signal);row.id=saved.value.item.id;
   const loaded=await api.detail(row.id,signal);
   if(loaded.value.catalogId!==catalog.id||loaded.value.id!==row.id||loaded.value.inventoryNumber!==row.inventoryNumber||saved.value.clonedFromItemId!==source)throw new Error('Následný GET nepotvrdil identitu kopie.');
   if(title===null){if(loaded.value.title!==null)throw new Error('Kopie nemá očekávaný NULL titul.');const professional=await api.curatorRecord(row.id,'professional',signal);if(professional.etag!==loaded.etag||expectedType!==null&&professional.value.objectType!==expectedType)throw new Error('Následný GET nepotvrdil současný typ kopie.');if(expectedAuthority){const references=await api.references(row.id,signal);if(references.etag!==loaded.etag||!references.items.some(v=>v.type==='OBJECT_TYPE'&&v.id===expectedAuthority))throw new Error('Nepotvrzená UUID autorita typu kopie.');}}
   row.state='VERIFIED';progress(rows.map(v=>({...v})));
  }catch(e){const status=(e as {status?:number}).status;row.state=!row.id&&status&&status>=400&&status<500?'REJECTED':'UNCONFIRMED';row.message=(e as Error).message;progress(rows.map(v=>({...v})));break;}
 }
 return rows;
}
