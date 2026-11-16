import {expect,it} from 'vitest';
import {inventorySourceComponents} from './inventorySourceComponents';
it('uses exact verified historical fields, preserving NULL, empty text and zero',()=>{
 const source={Rada_S:' N ',PorC_S:'0',Lomeni_S:null,HPorC_S:'3',StatSpr_S:'CZE',Spravce_S:'6MM',Odd_S:'E',Podsb_S:'žluťoučká'};
 const projected={series:null,ordinal:null,division:null,hierarchyOrdinal:null,hierarchyDivision:null,stateCode:null,custodianCode:null,departmentCode:null,collectionCode:null};
 expect(inventorySourceComponents(projected,source)).toEqual({series:' N ',ordinal:'0',division:null,hierarchyOrdinal:'3',hierarchyDivision:null,stateCode:'CZE',custodianCode:'6MM',departmentCode:'E',collectionCode:'žluťoučká'});
 expect(inventorySourceComponents({series:'',ordinal:'4'},source)).toEqual({series:'',ordinal:'4'});
 expect(inventorySourceComponents(projected,null)).toEqual(projected);expect(projected.ordinal).toBeNull();
});
it('reads an exact typed hierarchy division from the verified full root without coercing unknown types',()=>{
 expect(inventorySourceComponents({hierarchyDivision:null},null,{HLomeni_S:{kind:'TEXT',value:'ž/0'}})).toEqual({hierarchyDivision:'ž/0'});
 expect(inventorySourceComponents({hierarchyDivision:null},null,{HLomeni_S:{kind:'NULL'}})).toEqual({hierarchyDivision:null});
 expect(inventorySourceComponents({hierarchyDivision:''},null,{HLomeni_S:{kind:'TEXT',value:'other'}})).toEqual({hierarchyDivision:''});
 expect(inventorySourceComponents({hierarchyDivision:null},null,{HLomeni_S:{kind:'FLOAT_BITS',value:'3dcccccd'}})).toEqual({hierarchyDivision:null});
});
