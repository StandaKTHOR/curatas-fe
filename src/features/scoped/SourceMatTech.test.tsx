import {render,screen,fireEvent} from '@testing-library/react';
import {it,expect,vi,afterEach} from 'vitest';
import SourceMatTechPanel from './SourceMatTechPanel';
import {scopedApi,ScopedError,type ScopedApi,type SourceMatTech} from './scopedApi';
const row:SourceMatTech={recordId:'a'.repeat(64),sourceSha256:'b'.repeat(64),rowHash:'c'.repeat(64),occurrence:'1',sourceOrder:'0',material:' GEN ',technique:null,materialState:'EXACT_MATCH',techniqueState:'MISSING'};
const page=(items=[row])=>({catalogId:71,itemId:1001,itemVersion:'0',items,nextOffset:null,semantics:'TECHNICAL_SOURCE_READ_ONLY_REVIEW_REQUIRED'});
const response=(body:unknown,etag='"0"',cache='no-store')=>new Response(JSON.stringify(body),{headers:{ETag:etag,'Cache-Control':cache}});
afterEach(()=>vi.unstubAllGlobals());
it('whitelists source tuple values and lineage without private notes or numeric order coercion',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(response(page([{...row,sourceOrder:'9007199254740993',private:'SECRET'} as SourceMatTech]))));
 const result=await scopedApi(71,'t').sourceMatTech(1001,new AbortController().signal);
 expect(result.value.items[0].sourceOrder).toBe('9007199254740993');expect(result.value.items[0].material).toBe(' GEN ');expect(JSON.stringify(result)).not.toContain('SECRET');
});
it('rejects wrong catalog parent ETag cache and duplicate identities',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(response({...page(),catalogId:72})).mockResolvedValueOnce(response({...page(),itemId:2})).mockResolvedValueOnce(response(page(),'"1"')).mockResolvedValueOnce(response(page(),'"0"','public')).mockResolvedValueOnce(response(page([row,row]))));
 for(let i=0;i<5;i++)await expect(scopedApi(71,'t').sourceMatTech(1001,new AbortController().signal)).rejects.toThrow();
});
it('renders repeated tuples NULL missing dictionary and original order without editors',async()=>{
 const api={sourceMatTech:vi.fn().mockResolvedValue({value:{items:[row,{...row,recordId:'d'.repeat(64),occurrence:'2',sourceOrder:null}],nextOffset:null},etag:'"0"'})} as unknown as ScopedApi;
 render(<SourceMatTechPanel api={api} itemId={1001} onFatal={vi.fn()}/>);
 expect(await screen.findAllByTestId('source-material')).toHaveLength(2);expect(screen.getAllByTestId('source-material')[0].textContent).toBe(' GEN ');
 expect(screen.getAllByTestId('source-technique')[0]).toHaveTextContent('Neuvedeno');expect(screen.getAllByText(/Chybí přesná vazba/)).toHaveLength(2);expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
 expect(screen.getAllByTestId('mattech-reference-review')).toHaveLength(2);
});
it('discards mixed-version pages rather than appending another source version',async()=>{
 const api={sourceMatTech:vi.fn().mockResolvedValueOnce({value:{items:[row],nextOffset:1},etag:'"0"'}).mockResolvedValueOnce({value:{items:[{...row,recordId:'d'.repeat(64)}],nextOffset:null},etag:'"1"'})} as unknown as ScopedApi;
 render(<SourceMatTechPanel api={api} itemId={1001} onFatal={vi.fn()}/>);fireEvent.click(await screen.findByRole('button',{name:'Další MatTech'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('Verze předmětu se změnila');expect(screen.queryByTestId('source-material')).not.toBeInTheDocument();
});
it.each([401,403,404])('propagates %s without a legacy retry',async status=>{
 const f=vi.fn().mockResolvedValue(new Response('{}',{status}));vi.stubGlobal('fetch',f);
 await expect(scopedApi(71,'t').sourceMatTech(1001,new AbortController().signal)).rejects.toMatchObject({status});expect(f).toHaveBeenCalledOnce();
});
it('closes evidence when a live grant is revoked on refresh',async()=>{
 const fatal=vi.fn(),api={sourceMatTech:vi.fn().mockResolvedValueOnce({value:{items:[row],nextOffset:null},etag:'"0"'}).mockRejectedValueOnce(new ScopedError(403))} as unknown as ScopedApi;
 render(<SourceMatTechPanel api={api} itemId={1001} onFatal={fatal}/>);await screen.findByTestId('source-material');fireEvent.click(screen.getByRole('button',{name:'Obnovit MatTech'}));
 await screen.findByRole('alert');expect(fatal).toHaveBeenCalledWith(403);expect(screen.queryByTestId('source-material')).not.toBeInTheDocument();
});
