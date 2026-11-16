import {afterEach,it,expect} from 'vitest';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {useState} from 'react';
import {dictionaryLabel,ambiguousDictionaryCaption} from './dictionaryLabel';
import {HistoricalOptions} from './historicalSelection';
import {historicalVocabularyTables,type HistoricalVocabularyValue} from '../scoped/scopedApi';
import {professionalHistoricalLabel} from '../../lib/professional';
import type {MuseumRecord} from '../../lib/api';
afterEach(cleanup);
const row=(type:string,change:Partial<HistoricalVocabularyValue>={}):HistoricalVocabularyValue=>({recordId:'a'.repeat(64),sourceSha256:'b'.repeat(64),rowHash:'c'.repeat(64),occurrence:'1',table:historicalVocabularyTables[type]!,typedKey:{key:{kind:'TEXT',value:'K-17'}},code:'K-17',label:'Odborný název',groupingCode:null,...change});
for(const type of ['FUND','SUBJECT','GROUP','LOCALITY','COLLECTION'])it(type+' keeps exact source identity in the value, not the label or tooltip',()=>{
 const value=row(type),before=JSON.stringify(value);render(<select aria-label="Hodnota"><HistoricalOptions items={[value]}/></select>);
 const option=screen.getByRole('option');expect(option.textContent).toBe('DEMUS — Odborný název — K-17');expect(option).toHaveValue('demus:'+value.recordId);expect(option).not.toHaveAttribute('title');
 for(const metadata of [value.recordId.slice(0,12),value.sourceSha256.slice(0,12),value.rowHash.slice(0,12),'NULL'])expect(option.textContent).not.toContain(metadata);
 expect(JSON.stringify(value)).toBe(before);
});
it('preserves legitimate original codes including zero, punctuation and codes resembling IDs; no heuristic data cleaning',()=>{
 for(const code of ['0','6MM','ZV / 26','a'.repeat(64),'123e4567-e89b-12d3-a456-426614174000'])expect(dictionaryLabel({code})).toBe(code);
 expect(dictionaryLabel({label:'K-17',code:'K-17'})).toBe('K-17');expect(dictionaryLabel({})).toBe('Bez textového označení');
});
it('distinguishes equal names by actual code and actual grouping, never by internal identity',()=>{
 const values=[row('GROUP'),row('GROUP',{recordId:'d'.repeat(64),code:'K-18'}),row('GROUP',{recordId:'e'.repeat(64),groupingCode:'0012'})];
 render(<select><HistoricalOptions items={values}/></select>);const options=screen.getAllByRole('option');expect(options.map(o=>o.textContent)).toEqual(['DEMUS — Odborný název — K-17','DEMUS — Odborný název — K-18','DEMUS — Odborný název — K-17 (zařazení 0012)']);for(const option of options)expect(option).toBeEnabled();expect(new Set(options.map(o=>(o as HTMLOptionElement).value)).size).toBe(3);
});
it('never silently merges indistinguishable rows or invents a discriminator',()=>{
 const values=[row('FUND'),row('FUND',{recordId:'d'.repeat(64)})];expect(ambiguousDictionaryCaption(values[0],values)).toBe(true);render(<select><HistoricalOptions items={values}/></select>);for(const option of screen.getAllByRole('option')){expect(option).toBeDisabled();expect(option).toHaveTextContent('nelze odborně rozlišit');}expect(screen.getAllByRole('option')).toHaveLength(2);
});
it('selection and rehydration preserve exact reference even for equal names',()=>{
 const values=[row('COLLECTION'),row('COLLECTION',{recordId:'d'.repeat(64),code:'K-18'})];let stored:HistoricalVocabularyValue|undefined;
 function Picker({loaded}:{loaded?:HistoricalVocabularyValue}){const [id,setId]=useState(loaded?.recordId??'');return <select aria-label="Podsbírka" value={id?'demus:'+id:''} onChange={e=>{stored=values.find(v=>'demus:'+v.recordId===e.target.value);setId(stored!.recordId);}}><option value="">Nevybráno</option><HistoricalOptions items={values}/></select>;}
 const view=render(<Picker/>);fireEvent.change(screen.getByLabelText('Podsbírka'),{target:{value:'demus:'+values[1].recordId}});expect(stored).toEqual(values[1]);view.unmount();render(<Picker loaded={stored}/>);expect(screen.getByLabelText('Podsbírka')).toHaveValue('demus:'+values[1].recordId);expect((screen.getByLabelText('Podsbírka') as HTMLSelectElement).selectedOptions[0]).toHaveTextContent('K-18');
});
it('professional source captions share the formatter without a hash fallback',()=>{
 expect(professionalHistoricalLabel({payload:{materialHistoricalRef:row('MATERIAL')}} as unknown as MuseumRecord)).toBe('Odborný název — K-17 (DEMUS)');
 expect(professionalHistoricalLabel({payload:{materialHistoricalRef:row('MATERIAL',{label:null,code:null})}} as unknown as MuseumRecord)).toBe('Bez textového označení (DEMUS)');
});

it('a temporarily unresolved current fund never falls back to an internal ID',()=>{
 const unresolved={id:'123e4567-e89b-12d3-a456-426614174000',label:null,code:null};expect(dictionaryLabel(unresolved)).toBe('Bez textového označení');expect(dictionaryLabel({...unresolved,code:'F-19'})).toBe('F-19');
});
