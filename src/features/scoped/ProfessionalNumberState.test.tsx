import {render,screen} from '@testing-library/react';import {it,expect,vi} from 'vitest';
import SourceDimensionsPanel from './SourceDimensionsPanel';import type {ScopedApi,SourceDimension} from './scopedApi';
const base:SourceDimension={recordId:'a'.repeat(64),sourceSha256:'b'.repeat(64),rowHash:'c'.repeat(64),occurrence:'1',sourceOrder:null,type:null,unit:null,number:{kind:'NULL',value:null,bitPattern:null,scale:null,status:'EXACT'},dictionaryState:'MISSING'};
it('distinguishes a genuine NULL from nonfinite bits without fabricating a numeric value',async()=>{
 const api={sourceDimensions:vi.fn().mockResolvedValue({value:{items:[base,{...base,recordId:'d'.repeat(64),number:{kind:'FLOAT_BITS',value:null,bitPattern:'7fc00001',scale:null,status:'NON_FINITE_REVIEW_REQUIRED'}}],nextOffset:null},etag:'"0"'})} as unknown as ScopedApi;
 render(<SourceDimensionsPanel api={api} itemId={1} onFatal={vi.fn()}/>);
 const states=await screen.findAllByTestId('source-number-state');expect(states[0]).toHaveTextContent('Zdrojová hodnota je NULL.');expect(states[1]).toHaveTextContent('REVIEW_REQUIRED');
 expect(screen.getAllByTestId('source-dimension-bits').map(e=>e.textContent)).toEqual(['Neuvedeno','7fc00001']);expect(screen.getAllByTestId('source-dimension-value').every(e=>e.textContent==='Neuvedeno')).toBe(true);
});
