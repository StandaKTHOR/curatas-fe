import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {afterEach,describe,it,expect,vi} from 'vitest';
import SourceDimensionsPanel from './SourceDimensionsPanel';
import {scopedApi,ScopedError,type ScopedApi,type SourceDimension} from './scopedApi';
const row:SourceDimension={recordId:'a'.repeat(64),sourceSha256:'b'.repeat(64),rowHash:'c'.repeat(64),occurrence:'1',sourceOrder:'0',type:' GEN ',unit:null,number:{kind:'DECIMAL',value:'123456789012345.678900',bitPattern:null,scale:'6',status:'EXACT'},dictionaryState:'MISSING'};
const page=(items=[row],nextOffset:number|null=null)=>({catalogId:71,itemId:1001,itemVersion:'0',items,nextOffset,ordering:'SOURCE_ORDER_NULLS_LAST_THEN_RECORD_ID_OCCURRENCE',semantics:'TECHNICAL_SOURCE_READ_ONLY_REVIEW_REQUIRED'});
const response=(body:unknown,tag='"0"',cache='no-store')=>new Response(JSON.stringify(body),{headers:{ETag:tag,'Cache-Control':cache}});
afterEach(()=>vi.unstubAllGlobals());
describe('source dimensions transport',()=>{
 it('preserves source decimal text and drops unknown private payload properties',async()=>{
  const fetcher=vi.fn().mockResolvedValue(response(page([{...row,legacy_data:'PRIVATE'} as SourceDimension])));vi.stubGlobal('fetch',fetcher);
  const r=await scopedApi(71,'t').sourceDimensions(1001,new AbortController().signal);expect(r.value.items[0].number.value).toBe('123456789012345.678900');expect(JSON.stringify(r)).not.toContain('PRIVATE');expect(fetcher.mock.calls[0][0]).toContain('/api/v2/catalogs/71/items/1001/source-dimensions?offset=0&limit=50');expect(fetcher.mock.calls[0][1].cache).toBe('no-store');
 });
 it('rejects foreign parent catalog identities and missing no-store or mismatched ETag',async()=>{
  const f=vi.fn().mockResolvedValueOnce(response({...page(),catalogId:72})).mockResolvedValueOnce(response({...page(),itemId:999})).mockResolvedValueOnce(response(page(),'"0"','public')).mockResolvedValueOnce(response(page(),'"1"'));vi.stubGlobal('fetch',f);
  for(let i=0;i<4;i++)await expect(scopedApi(71,'t').sourceDimensions(1001,new AbortController().signal)).rejects.toThrow();
 });
 it('rejects corrupt numeric identity and paging contracts',async()=>{
  const f=vi.fn().mockResolvedValueOnce(response(page([{...row,number:{...row.number,value:'PRIVATE'}}]))).mockResolvedValueOnce(response(page([row,row]))).mockResolvedValueOnce(response(page([row],1)));vi.stubGlobal('fetch',f);
  for(let i=0;i<3;i++)await expect(scopedApi(71,'t').sourceDimensions(1001,new AbortController().signal)).rejects.toThrow();
 });
 it.each([401,403,404])('propagates %s without legacy fallback',async status=>{
  const f=vi.fn().mockResolvedValue(new Response('{}',{status}));vi.stubGlobal('fetch',f);await expect(scopedApi(71,'t').sourceDimensions(1001,new AbortController().signal)).rejects.toMatchObject({status});expect(f).toHaveBeenCalledOnce();
 });
});
describe('read-only professional panel',()=>{
 it.each([['80000000','-0.0'],['00000001','1.4E-45'],['3f800001','1.0000001'],['7fc00001',null]])('exposes exact FLOAT_BITS %s with lineage without coercing displayed value',async(bits,value)=>{
  const evidence={...row,occurrence:'2',sourceOrder:null,number:{kind:'FLOAT_BITS',value,bitPattern:bits,scale:null,status:value===null?'NON_FINITE_REVIEW_REQUIRED':'ROUNDTRIP_FLOAT'}};
  const api={sourceDimensions:vi.fn().mockResolvedValue({value:{items:[evidence],nextOffset:null},etag:'"0"'})} as unknown as ScopedApi;
  render(<SourceDimensionsPanel api={api} itemId={1001} onFatal={vi.fn()}/>);
  expect(await screen.findByTestId('source-dimension-bits')).toHaveTextContent(bits);
  expect(screen.getByTestId('source-dimension-value')).toHaveTextContent(value??'Neuvedeno');
  expect(screen.getByText(row.rowHash)).toBeInTheDocument();expect(screen.getByText(row.sourceSha256)).toBeInTheDocument();
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
 });
 it('renders duplicates precision NULL and missing dictionary without editor controls',async()=>{
  const api={sourceDimensions:vi.fn().mockResolvedValue({value:{items:[row,{...row,recordId:'d'.repeat(64),occurrence:'2'},{...row,recordId:'e'.repeat(64),number:{kind:'NULL',value:null,scale:null,bitPattern:null,status:'EXACT'}}],nextOffset:null},etag:'"0"'})} as unknown as ScopedApi;
  render(<SourceDimensionsPanel api={api} itemId={1001} onFatal={vi.fn()}/>);await screen.findAllByText('123456789012345.678900');expect(screen.getAllByText('Desetinná místa: 6')).toHaveLength(2);expect(screen.getAllByText('Chybí přesná vazba')).toHaveLength(3);expect(screen.getAllByTestId('source-dimension-value')[2]).toHaveTextContent('Neuvedeno');expect(screen.queryByRole('textbox')).not.toBeInTheDocument();expect(screen.queryByText('Uložit')).not.toBeInTheDocument();
 });
 it('discards mixed-version pages and requires refresh',async()=>{
  const api={sourceDimensions:vi.fn().mockResolvedValueOnce({value:{items:[row],nextOffset:1},etag:'"0"'}).mockResolvedValueOnce({value:{items:[{...row,recordId:'d'.repeat(64)}],nextOffset:null},etag:'"1"'})} as unknown as ScopedApi;
  render(<SourceDimensionsPanel api={api} itemId={1001} onFatal={vi.fn()}/>);fireEvent.click(await screen.findByRole('button',{name:'Další zdrojové míry'}));await screen.findByText(/Verze předmětu se změnila/);expect(screen.queryByText(row.number.value!)).not.toBeInTheDocument();
 });
 it('passes revoked status to workspace fatal handler',async()=>{
  const fatal=vi.fn(),api={sourceDimensions:vi.fn().mockRejectedValue(new ScopedError(403))} as unknown as ScopedApi;render(<SourceDimensionsPanel api={api} itemId={1001} onFatal={fatal}/>);await waitFor(()=>expect(fatal).toHaveBeenCalledWith(403));
 });
});
