import {useState} from 'react';import {render,screen,fireEvent,cleanup} from '@testing-library/react';import {it,expect,afterEach,vi} from 'vitest';
import {IndependentHistoricalPositions} from './IndependentHistoricalPositions';import {historicalBindings,type HistoricalVocabularyValue} from '../features/scoped/scopedApi';
vi.mock('../features/catalog/originalEdit',()=>({originalCanEdit:()=>true}));afterEach(cleanup);
const refs=Array.from({length:4},(_,i)=>({recordId:String(i+1).repeat(64),sourceSha256:'a'.repeat(64),rowHash:'b'.repeat(64),occurrence:'1',table:'Materialy',typedKey:null,code:i===3?'papírmaš, papír':['sklo','dřevo','textil'][i],label:null,groupingCode:null} satisfies HistoricalVocabularyValue));
function Fixture(){const [slots,setSlots]=useState<Record<string,HistoricalVocabularyValue>>({MATERIAL:refs[0],MATERIAL_2:refs[1],MATERIAL_3:refs[2]});return <IndependentHistoricalPositions type="MATERIAL" items={refs} slots={slots} readOnly={false} busy={false} error="" onChange={(pos,source)=>setSlots(old=>{const next={...old},key=pos===1?'MATERIAL':`MATERIAL_${pos}`;if(source)next[key]=source;else delete next[key];return next;})}/>;}
it('changes and removes the second independent position without compacting the first or third',()=>{
 render(<Fixture/>);const one=screen.getByLabelText('Materiál — přiřazení 1'),two=screen.getByLabelText('Materiál — přiřazení 2'),three=screen.getByLabelText('Materiál — přiřazení 3');
 expect(two.querySelector(`option[value="demus:${refs[0].recordId}"]`)).toBeNull();fireEvent.change(two,{target:{value:'demus:'+refs[3].recordId}});expect(two).toHaveValue('demus:'+refs[3].recordId);expect(two).toHaveTextContent('papírmaš, papír');fireEvent.change(two,{target:{value:''}});expect(one).toHaveValue('demus:'+refs[0].recordId);expect(three).toHaveValue('demus:'+refs[2].recordId);
 fireEvent.click(screen.getByRole('button',{name:'Další materiál'}));expect(screen.getByLabelText('Materiál — přiřazení 4')).toBeEnabled();
});
it('validates exact per-type identities and bounded positions rather than flattening or splitting source text',()=>{
 expect(()=>historicalBindings({MATERIAL:refs[0],MATERIAL_3:refs[3]})).not.toThrow();expect(()=>historicalBindings({MATERIAL:refs[0],MATERIAL_2:refs[0]})).toThrow();expect(()=>historicalBindings({MATERIAL_9:refs[0]})).toThrow();expect(()=>historicalBindings({MATERIAL_2:{...refs[0],table:'Techniky'}})).toThrow();
});
