import {describe,it,expect} from 'vitest';
import {catalogCell} from './catalogListSummary';
import type {CatalogSummary} from '../scoped/scopedApi';
const summary=():CatalogSummary=>({author:[],material:[],technique:[],accessionNumber:[]});
describe('read-only catalog presentation',()=>{
 it('keeps current values and independently labelled historical identities separate',()=>{
  const s=summary();s.material=[{value:'papírmaš, papír',origin:'DEMUS_SOURCE',identity:'a'},{value:'papírmaš, papír',origin:'DEMUS_SOURCE',identity:'b'}];s.author=[{value:'Autor [malíř]',origin:'CURRENT',identity:'uuid:1'}];
  expect(catalogCell({catalogSummary:s,material:'not used'},'material')).toBe('papírmaš, papír (DEMUS) · papírmaš, papír (DEMUS)');expect(catalogCell({catalogSummary:s},'author')).toBe('Autor [malíř]');expect(catalogCell({catalogSummary:s},'technique')).toBe('—');
 });
 it('preserves compatibility with current-only responses',()=>{expect(catalogCell({material:'Dřevo'},'material')).toBe('Dřevo');expect(catalogCell({},'author')).toBe('—');});
 it('shows original dating as text with provenance without inventing a calendar date',()=>{
  const s=summary();s.datingText=[{value:'1982',origin:'DEMUS_SOURCE',identity:'source:Datace_S'},{value:'kolem roku 1900',origin:'DEMUS_SOURCE',identity:'source:Datace_VZ'}];
  expect(catalogCell({catalogSummary:s},'datingText')).toBe('1982 (DEMUS) · kolem roku 1900 (DEMUS)');
  s.datingText=[{value:'20. století',origin:'CURRENT',identity:'professional:datingText'}];expect(catalogCell({catalogSummary:s},'datingText')).toBe('20. století');
  expect(catalogCell({catalogSummary:summary(),datingText:'současná datace'},'datingText')).toBe('současná datace');
 });
 it('labels the historical year verbatim in the list without turning it into a current value',()=>{
  const s=summary();s.datingText=[{value:'1982',origin:'DEMUS_SOURCE',identity:'artifact:record:Datace_S'}];
  const item={catalogSummary:s,datingText:null};expect(catalogCell(item,'datingText')).toBe('1982 (DEMUS)');expect(item.datingText).toBeNull();
  s.datingText=[{value:'asi konec 19. století',origin:'CURRENT',identity:'record:5:Datace_VZ'}];expect(catalogCell(item,'datingText')).toBe('asi konec 19. století');
 });
});
