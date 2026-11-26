import {describe,it,expect} from 'vitest';
import {originalDictionaryDisplay,originalDictionaryFields} from './originalDictionaryDisplay';
import type {TypedHistorical} from './historicalContract';

describe('original dictionary presentation, separate from UUID and V66 decisions',()=>{
 for(const [type,key] of Object.entries(originalDictionaryFields))it(type+' displays only its evidenced original field',()=>{
  const fields={[key]:{kind:'TEXT',value:'Žluťoučký původní údaj'}} as Record<string,TypedHistorical>;
  const before=JSON.stringify(fields);
  expect(originalDictionaryDisplay(type,fields)).toBe('Žluťoučký původní údaj');
  expect(JSON.stringify(fields)).toBe(before);
  expect(originalDictionaryDisplay(type,undefined)).toBeUndefined();
  expect(originalDictionaryDisplay(type,{[key]:{kind:'NULL'}})).toBeUndefined();
  expect(originalDictionaryDisplay(type,{[key]:{kind:'TEXT',value:''}})).toBeUndefined();
 });
 it('preserves zero and source codes without guessing related authorities',()=>{
  expect(originalDictionaryDisplay('COLLECTION',{Podsb_S:{kind:'INTEGER',value:'0'}})).toBe('0');
  expect(originalDictionaryDisplay('CUSTODIAN',{Spravce_S:{kind:'TEXT',value:'6MM'}})).toBe('6MM');
  expect(originalDictionaryDisplay('COUNTRY',{StatSpr_S:{kind:'TEXT',value:'CZE'}})).toBeUndefined();
  expect(originalDictionaryDisplay('CLASSIFICATION',{SysKat_ZS:{kind:'TEXT',value:'not a Sbirky assertion'}})).toBeUndefined();
 });
});
