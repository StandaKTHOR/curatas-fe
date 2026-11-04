export const historicalRelatedTables=["Adresar", "Osobnosti", "Materialy", "Techniky", "Lokality", "Fondy", "Podsbirky", "Oddeleni", "Skupiny", "NametyISO", "TypyDok", "System", "DuvVyrazeni", "ZpAkvizice", "Datace", "Nazvy", "Role", "KodyISO", "CharISO", "MatISO", "Meny", "PovrchyISO", "TvaryISO", "StavyISO", "TypyMan", "Rozmery", "TypyLit", "ZpUbytku", "InvRady", "Literatura", "PrirKniha", "Prezentace", "Reversy", "Periodika", "AutoriLit", "Katastry", "Okresy", "Oblasti", "Staty", "CESobory", "Osetreni", "Platnost", "OkruhyAdr", "OkruhyOs", "ZpracLit", "ZpOsetreni"] as const;
export const historicalTables={Sbirky:'IdC_S',Historie:'IdC_HS',SbirkyPlus:'IdC_SP',InvCisla:'IdC_IC',Urceni:'IdC_UR',Vznik:'IdC_VZ',Dokumentace:'IdC_DK',Zarazeni:'IdC_ZS',Manipulace:'IdC_MN',Akce:'IdC_AK',Reference:'IdC_RF',SbirkyISO:'IdC_SO',VyrazeniSb:'IdC_VS',Akvizice:'IdC_AQ',MatTech:'IdC_MT',Miry:'IdC_MR'} as const;
export type HistoricalTable=keyof typeof historicalTables;
export interface TypedHistorical {kind:string;[key:string]:unknown}
export interface HistoricalRow {recordId:string;sourceSha256:string;rowHash:string;occurrence:string;parentRecordId:string;parentField:string;fields:Record<string,TypedHistorical>;relationshipId?:string;relatedTable?:string;matchingRecords?:string;sourcePath?:string[]}
export interface HistoricalPage {items:HistoricalRow[];state:string;nextAfterId:string|null;etag:string}
export const historicalStates=['AVAILABLE','SOURCE_PARENT_MISSING','AMBIGUOUS_PARENT_LINEAGE','SOURCE_TABLE_UNAVAILABLE','SOURCE_PARENT_UNAVAILABLE','AMBIGUOUS_SOURCE_PARENT','SOURCE_RELATIONSHIP_UNVERIFIED','SOURCE_ROW_UNAVAILABLE','REVIEW_REQUIRED_DEPTH_LIMIT'];
const exactInteger=(v:unknown)=>typeof v==='string'&&/^-?(0|[1-9][0-9]*)$/.test(v)||typeof v==='number'&&Number.isSafeInteger(v);
export function typedHistorical(value:unknown):value is TypedHistorical{
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const v=value as TypedHistorical;
 switch(v.kind){
  case 'NULL':return !Object.hasOwn(v,'value');
  case 'TEXT':case 'TEMPORAL':return typeof v.value==='string';
  case 'INTEGER':return typeof v.value==='string'&&/^-?(0|[1-9][0-9]*)$/.test(v.value);
  case 'FLOAT_BITS':case 'DOUBLE_BITS':return typeof v.value==='string'&&new RegExp(`^[a-f0-9]{1,${v.kind==='FLOAT_BITS'?8:16}}$`).test(v.value);
  case 'DECIMAL':return typeof v.unscaled==='string'&&/^-?[0-9]+$/.test(v.unscaled)&&exactInteger(v.scale);
  case 'BOOLEAN':return typeof v.value==='boolean';
  case 'DATE':return exactInteger(v.epochMillis);
  case 'TIMESTAMP':return exactInteger(v.epochMillis)&&exactInteger(v.nanos);
  case 'BINARY':case 'TEXT_UTF16_BE':return typeof v.sha256==='string'&&/^[a-f0-9]{64}$/.test(v.sha256)&&exactInteger(v.length)&&!String(v.length).startsWith('-');
  default:return false;
 }
}
/** Exact representation; no rounding, timezone inference, binary fetch or authority conversion. */
export function historicalText(value:TypedHistorical|undefined){
 if(!value)return '— (pole není ve zdroji)';
 if(value.kind==='NULL')return 'NULL (DEMUS)';
 if(value.kind==='TEXT')return `${value.value===''?'Prázdný řetězec':value.value} (DEMUS)`;
 if(['INTEGER','TEMPORAL','BOOLEAN'].includes(value.kind))return `${value.value} (DEMUS)`;
 return `${value.kind}: ${JSON.stringify(value)} (DEMUS)`;
}

export const historicalStateLabel=(state:string)=>({SOURCE_PARENT_MISSING:'Zdrojové přiřazení předmětu nebylo doloženo.',AMBIGUOUS_PARENT_LINEAGE:'Více zdrojových přiřazení předmětu — vyžaduje ověření.',SOURCE_TABLE_UNAVAILABLE:'Zdrojová tabulka není úplně dostupná.',SOURCE_PARENT_UNAVAILABLE:'Zdrojový záznam předmětu není úplně dostupný.',AMBIGUOUS_SOURCE_PARENT:'Původní identifikátor předmětu není ve zdroji jednoznačný.',SOURCE_RELATIONSHIP_UNVERIFIED:'Historická vazba na předmět nebyla doložena.',AVAILABLE:'Pro tuto doloženou vazbu nejsou řádky ve zdrojovém výřezu.'}[state]??'Zdrojový výřez vyžaduje další ověření.');
