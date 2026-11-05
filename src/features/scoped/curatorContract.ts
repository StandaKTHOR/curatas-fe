import {validateAdvancedFilter} from './advancedFilterContract';
/** Exact read contract in backend CuratorCatalogService; no legacy field aliases. */
export const demusListFields=['Rada_S','PorC_S','Lomeni_S','HPorC_S','StatSpr_S','Spravce_S','Odd_S','Podsb_S','Pocet_S','Ozn_S','JineC_S','Karta_S','Opsana_S','Overena_S','Zapsal_S','DatZap_S','Skupina_S','Urcil_S','Fond_S','Predmet_S','Titul_S','DatZm_S'] as const;
export const curatorInventoryFields=['currentQuantity','currentOtherNumber'] as const;
export const curatorSourceFilterKeys=['inventoryExact','quantityMin','quantityMax','quantityState','accessionFlag','series','department','collection','recordedBy','determinedBy','choiceKind','choiceRecordId'] as const;
export const curatorFields=['inventoryNumber','accessionNumber','title','author','datingText','material','technique','objectType','originPlace','subCollection','locationBuilding','locationRoom','permanentLocation','countryOfOrigin','objectCondition','datingFrom','datingTo','findingLocality','signature','markant',...demusListFields,...curatorInventoryFields] as const;
export const curatorCurrentFields=['authorText','datingText','materialText','techniqueText','objectType','originPlace'] as const;
export const curatorCurrentInventoryFields=['quantity','otherNumber'] as const;

export interface DemusTableColumn {
 id:typeof demusListFields[number];
 label:string;
 kind:'text'|'number'|'boolean';
 currentField?:'quantity'|'otherNumber';
 currentFilter?:'currentQuantity'|'currentOtherNumber';
}

export const demusTableColumns:readonly DemusTableColumn[]=[
 {id:'Rada_S',label:'Řada',kind:'text'},
 {id:'PorC_S',label:'PořČ',kind:'number'},
 {id:'Lomeni_S',label:'Lom',kind:'text'},
 {id:'HPorC_S',label:'Až',kind:'number'},
 {id:'StatSpr_S',label:'Stát',kind:'text'},
 {id:'Spravce_S',label:'Spr',kind:'text'},
 {id:'Odd_S',label:'Odd',kind:'text'},
 {id:'Podsb_S',label:'Podsb',kind:'text'},
 {id:'Pocet_S',label:'Počet',kind:'number',currentField:'quantity',currentFilter:'currentQuantity'},
 {id:'Ozn_S',label:'Ozn',kind:'boolean'},
 {id:'JineC_S',label:'JinéČ',kind:'text',currentField:'otherNumber',currentFilter:'currentOtherNumber'},
 {id:'Karta_S',label:'Karta',kind:'boolean'},
 {id:'Opsana_S',label:'Opsa',kind:'boolean'},
 {id:'Overena_S',label:'Ověřena',kind:'boolean'},
 {id:'Zapsal_S',label:'Zapsal',kind:'text'},
 {id:'DatZap_S',label:'DatZap',kind:'text'},
 {id:'Skupina_S',label:'Skupi',kind:'text'},
 {id:'Urcil_S',label:'Určil',kind:'text'},
];

export function formatDemusSourceValue(key:string,value:string|null|undefined):string{
 if(value===null||value===undefined)return '—';
 if(value==='')return 'Prázdný řetězec';
 if(['Ozn_S','Karta_S','Opsana_S','Overena_S'].includes(key))return value==='true'?'Ano':value==='false'?'Ne':value;
 return value;
}

export function formatDemusCell(item:any,col:DemusTableColumn){
 const srcVal=item?.sourceInventory?item.sourceInventory[col.id]:null;
 const srcText=formatDemusSourceValue(col.id,srcVal);
 const curVal=col.currentField?item?.[col.currentField]:null;
 const hasCurrent=curVal!==null&&curVal!==undefined;
 if(hasCurrent){
  const curText=String(curVal)===''?'Prázdný řetězec':String(curVal);
  return {
   text:`Současné: ${curText} (Zdroj: ${srcText})`,
   title:`Současné kurátorské tvrzení (${col.currentField}): ${curText}; původní DEMUS ${col.id}: ${srcText}`,
   state:(String(curVal)===''?'empty':'value') as 'null'|'empty'|'value',
   hasCurrent:true,
  };
 }
 return {
  text:srcText,
  title:`Původní DEMUS ${col.id}; není současným kurátorským tvrzením`,
  state:(srcVal===null||srcVal===undefined?'null':srcVal===''?'empty':'value') as 'null'|'empty'|'value',
  hasCurrent:false,
 };
}

export function curatorQuery(page:number,size:number,sort:string,filters:Record<string,unknown>={}){
 if(!Number.isSafeInteger(page)||page<0||!Number.isSafeInteger(size)||size<1||size>100||page*size>20000)throw new Error('Neplatná stránka katalogu.');
 const [field,direction,...extra]=sort.split(',');
 if(extra.length||!(field==='createdAt'||curatorFields.includes(field as typeof curatorFields[number]))||!['asc','desc'].includes(direction))throw new Error('Řazení není dostupné v existujícím scoped kontraktu.');
 const q=new URLSearchParams({page:String(page),size:String(size),sort});
 for(const [key,value] of Object.entries(filters)){
  if(value===undefined||value===null||value==='')continue;
  if(key==='advancedFilter'){if(typeof value!=='string')throw new Error('Neplatný AST filtr.');q.set(key,validateAdvancedFilter(value,curatorFields));continue;}
  if(key==='worksetId'){if(typeof value!=='string'||!/^([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i.test(value))throw new Error('Neplatná identita osobní pracovní sady.');q.set(key,value);continue;}
  const allowed=key==='q'||curatorFields.includes(key as typeof curatorFields[number])||curatorSourceFilterKeys.includes(key as typeof curatorSourceFilterKeys[number]);
  if(!allowed)throw new Error(`Filtr ${key} není dostupný v existujícím scoped kontraktu.`);
  if(typeof value!=='string'||value.length>100)throw new Error('Neplatný filtr katalogu.');
  if(['Ozn_S','Karta_S','Opsana_S','Overena_S'].includes(key)&&!['true','false','TRUE','FALSE','Ano','Ne','__NULL__','__NOT_NULL__'].includes(value))throw new Error('Neplatný logický filtr DEMUS.');
  q.set(key,value);
 }
 return q;
}
