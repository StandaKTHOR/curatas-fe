import {afterEach,expect,it,vi} from 'vitest';
import {render,screen} from '@testing-library/react';
import {scopedApi} from '../scoped/scopedApi';
import {HistoricalOptions} from './historicalSelection';
import {professionalHistoricalLabel} from '../../lib/professional';
const source={recordId:'a'.repeat(64),sourceSha256:'b'.repeat(64),rowHash:'c'.repeat(64),occurrence:'1',table:'Materialy',typedKey:null,code:'D',label:'Dřevo',groupingCode:null};
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
it('displays an overlay without adding any display metadata to an immutable binding',()=>{const before=JSON.stringify(source);render(<select><HistoricalOptions items={[source]} captions={{[source.recordId]:{label:'Jasan',code:'J'}}}/></select>);expect(screen.getByRole('option')).toHaveTextContent('Jasan — J');expect(screen.getByRole('option')).toHaveValue('demus:'+source.recordId);expect(JSON.stringify(source)).toBe(before);});
it('resolves professional-row captions in a bounded request and keeps the exact saved identity',async()=>{
 vi.stubEnv('VITE_UNIFIED_DICTIONARIES_ENABLED','true');const before=JSON.stringify(source);
 const fetcher=vi.fn(async(url:string,init?:RequestInit)=>new Response(JSON.stringify(url.includes('/captions')?{catalogId:1,items:[{type:'MATERIAL',key:'s:'+source.recordId,label:'Jasan',code:'J',groupingCode:null}]}:{catalogId:1,itemId:42,itemVersion:'0',semantics:'CURRENT_OWNED_RECORDS_NOT_SOURCE',items:[{id:7,kind:'MATERIAL_TECHNIQUE',payload:{materialHistoricalRef:source},dictionaryId:null,partyId:null,materialDictionaryId:null,techniqueDictionaryId:null,authorityLabels:{}}]}),{headers:{'Cache-Control':'no-store',ETag:'"0"'}}));
 vi.stubGlobal('fetch',fetcher);const response=await scopedApi(1,'token').professionalRecords(42,new AbortController().signal);expect(fetcher).toHaveBeenCalledTimes(2);const batch=fetcher.mock.calls.find(([url])=>url.includes('/captions'))!;expect(batch[1]?.method).toBe('POST');expect(JSON.parse(String(batch[1]?.body))).toEqual([{type:'MATERIAL',key:'s:'+source.recordId}]);expect(response.items[0].payload.materialHistoricalRef).toEqual(source);expect(JSON.stringify(source)).toBe(before);expect(professionalHistoricalLabel(response.items[0])).toBe('Jasan — J');
});
it('rejects a caption from another catalog instead of using its equally named value',async()=>{vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({catalogId:2,items:[]}),{headers:{'Cache-Control':'no-store'}})));await expect(scopedApi(1,'token').sourceCaptions([{type:'MATERIAL',key:'s:'+source.recordId}],new AbortController().signal)).rejects.toThrow('Neplatné popisky');});
