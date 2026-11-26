import {describe,it,expect} from 'vitest';
import {curatorQuery} from '../scoped/curatorContract';
import {originalPrintCardFields} from './originalAdapter';
import {catalogCell} from './catalogListSummary';
describe('Update462 display/search contract',()=>{
 it.each(['ST 1686','ST 1686 16CZE6MM E',' st 1686 16cze6mm e ','ST  1686   16CZE6MM  E','GEN-'+ 'x'.repeat(200)])('passes displayed inventory and existing filters unchanged: %s',q=>{
  const query=curatorQuery(2,50,'title,desc',{q,title:'Generated',series:'ST'});expect(query.get('q')).toBe(q);expect(query.get('page')).toBe('2');expect(query.get('title')).toBe('Generated');expect(query.get('series')).toBe('ST');
 });
 it('uses identical display-only accession and author values in list and safe card print',()=>{
  const entry=(value:string)=>({value,origin:'DEMUS_SOURCE' as const,identity:'generated:'+value});const catalogSummary={accessionNumber:[entry('GEN old acquisition')],author:[entry('Generated author [printer]')],material:[],technique:[]};
  const form={id:7,accessionNumber:null,author:null,catalogSummary,locationRoom:'PRIVATE'};const output=originalPrintCardFields(form);expect(output.accessionNumber).toBe(catalogCell(form,'accessionNumber'));expect(output.author).toBe(catalogCell(form,'author'));expect(output).not.toHaveProperty('locationRoom');expect(form.accessionNumber).toBeNull();
 });
 it('keeps cleared presentation blank in print',()=>{const output=originalPrintCardFields({author:'',accessionNumber:'',catalogSummary:{author:[],accessionNumber:[]}});expect(output.author).toBe('');expect(output.accessionNumber).toBe('');});
});
