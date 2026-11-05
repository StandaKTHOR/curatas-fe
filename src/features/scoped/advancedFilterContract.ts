const numeric=new Set(['inventory.ordinal','inventory.hierarchyOrdinal','PorC_S','HPorC_S','Pocet_S','currentQuantity']);
const operators=new Set(['CONTAINS','EQUALS','NOT_EQUALS','NOT_CONTAINS','STARTS_WITH','ENDS_WITH','GREATER_THAN','LESS_THAN','BETWEEN','IS_EMPTY','IS_NOT_EMPTY']);
/** Existing original builder wire format; never silently drops an unsupported condition. */
export function validateAdvancedFilter(raw:string,approvedFields:readonly string[]){
 const fields=new Set<string>([...approvedFields,'historicalInventoryNumber','acquisitionRecordNumber','inventory.hierarchyDivision','description','materialNote','inventory.series','inventory.ordinal','inventory.division','inventory.hierarchyOrdinal','inventory.stateCode','inventory.custodianCode','inventory.departmentCode','inventory.collectionCode','fundLegacyCode','legacyCreatedBy','determinedBy']);
 if(raw.length>16000)throw new Error('Pokročilý filtr překračuje povolenou velikost.');
 let root:any;try{root=JSON.parse(raw);}catch{throw new Error('Neplatný JSON pokročilého filtru.');}
 let nodes=0;
 const group=(value:any,depth:number)=>{
  if(!value||typeof value!=='object'||Array.isArray(value)||depth>6||++nodes>96||!['AND','OR','NOT'].includes(value.conjunction)||!Array.isArray(value.conditions)||!Array.isArray(value.groups)||!value.conditions.length&&!value.groups.length)throw new Error('Neplatná nebo příliš hluboká skupina filtru.');
  if(Object.keys(value).some(k=>!['id','conjunction','conditions','groups'].includes(k)))throw new Error('Nepodporovaná vlastnost skupiny.');
  for(const condition of value.conditions){
   if(++nodes>96||!condition||typeof condition!=='object'||Object.keys(condition).some(k=>!['id','field','operator','value','valueTo'].includes(k)))throw new Error('Neplatná podmínka filtru.');
   if(!fields.has(condition.field))throw new Error(`Pole ${condition.field} nemá schválenou scoped sémantiku. Podmínka nebyla vynechána.`);
   if(!operators.has(condition.operator))throw new Error('Nepodporovaný operátor filtru.');
   if(['IS_EMPTY','IS_NOT_EMPTY'].includes(condition.operator))continue;
   if(typeof condition.value!=='string'||condition.value.length>255)throw new Error('Neplatná hodnota filtru.');
   if(['GREATER_THAN','LESS_THAN','BETWEEN'].includes(condition.operator)){
    if(['datingFrom','datingTo'].includes(condition.field)){
     const valid=(v:unknown)=>typeof v==='string'&&/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(v)&&v.slice(0,4)!=='0000'&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
     if(!valid(condition.value)||condition.operator==='BETWEEN'&&(!valid(condition.valueTo)||condition.value>condition.valueTo))throw new Error('Neplatný rozsah revidovaných ISO dat.');continue;
    }
    if(!numeric.has(condition.field)||! /^-?[0-9]{1,36}$/.test(condition.value))throw new Error('Číselné porovnání není pro pole/hodnotu povolené.');
    if(condition.operator==='BETWEEN'&&(typeof condition.valueTo!=='string'||! /^-?[0-9]{1,36}$/.test(condition.valueTo)||BigInt(condition.value)>BigInt(condition.valueTo)))throw new Error('Neplatný číselný rozsah filtru.');
   }
  }
  for(const child of value.groups)group(child,depth+1);
 };
 group(root,0);return raw;
}
