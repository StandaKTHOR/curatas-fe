import type {TypedHistorical} from './historicalContract';

/** Presentation of the original assertion only; never an assignment or save payload. */
export const originalDictionaryFields:Readonly<Record<string,string>>={
 MATERIAL:'Material_S',TECHNIQUE:'Technika_S',AUTHOR:'Autor_S',AUTHOR_ROLE:'Role_S',
 LOCALITY:'Lokalita_S',OBJECT_TYPE:'Predmet_S',FUND:'Fond_S',GROUP:'Skupina_S',
 COUNTRY:'Zeme_S',SUBJECT:'Namet_S',COLLECTION:'Podsb_S',CUSTODIAN:'Spravce_S',
};
export function originalDictionaryDisplay(type:string,fields:Readonly<Record<string,TypedHistorical>>|undefined):string|undefined{
 const key=originalDictionaryFields[type],value=key?fields?.[key]:undefined;
 if(!value||!['TEXT','INTEGER'].includes(value.kind)||typeof value.value!=='string'||value.value.trim()==='')return undefined;
 return `${value.value} (původní DEMUS: ${key}${type==='CUSTODIAN'?'; kód správce, vazba na Adresář nedoložena':''})`;
}
