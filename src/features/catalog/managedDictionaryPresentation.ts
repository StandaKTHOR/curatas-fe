import type {ManagedDictionaryType} from '../scoped/scopedApi';
export const managedDictionaryLabels:Record<ManagedDictionaryType,string>={MATERIAL:'Materiál',TECHNIQUE:'Technika',FUND:'Fond',OBJECT_TYPE:'Předmět',CUSTODIAN:'Správce sbírky',AUTHOR:'Autor',AUTHOR_ROLE:'Role autora',COUNTRY:'Stát',COLLECTION:'Podsbírka',GROUP:'Skupina',LOCALITY:'Lokalita',CLASSIFICATION:'Klasifikace',SUBJECT:'Námět'};
export function suggestedDictionaryCode(label:string){return label.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim().replace(/[\s-]+/g,'_').replace(/[^A-Z0-9_]/g,'');}
