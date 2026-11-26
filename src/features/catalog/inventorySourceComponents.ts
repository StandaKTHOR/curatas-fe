// Same native field names as CatalogInventoryService. The raw-aware whitelist is
// already item/catalog/lineage scoped; it is never a current inventory assertion.
const nativeFields:Record<string,string>={series:'Rada_S',ordinal:'PorC_S',division:'Lomeni_S',hierarchyOrdinal:'HPorC_S',hierarchyDivision:'HLomeni_S',stateCode:'StatSpr_S',custodianCode:'Spravce_S',departmentCode:'Odd_S',collectionCode:'Podsb_S'};
export function inventorySourceComponents(projected:Record<string,string|null>,source:Record<string,string|null>|null,root?:Readonly<Record<string,import('./historicalContract').TypedHistorical>>){
 const scalar=(key:string)=>{const value=root?.[key];return value&&(value.kind==='TEXT'||value.kind==='INTEGER')&&typeof value.value==='string'?value.value:null;};
 return Object.fromEntries(Object.entries(projected).map(([key,value])=>[key,value??source?.[nativeFields[key]]??scalar(nativeFields[key])]));
}
