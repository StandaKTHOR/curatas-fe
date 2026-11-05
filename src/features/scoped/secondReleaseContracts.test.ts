import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {scopedApi} from './scopedApi';
const signal=()=>new AbortController().signal,id=(c:string)=>`${c.repeat(8)}-${c.repeat(4)}-${c.repeat(4)}-${c.repeat(4)}-${c.repeat(12)}`;
const assignment={id:id('a'),authorId:id('b'),roleId:null,sortOrder:0};
const page=(change:Record<string,unknown>={})=>({catalogId:1,itemId:3,itemVersion:0,items:[{...assignment,authorLabel:'Český autor',roleLabel:null}],semantics:'CURRENT_AUTHORS_UUID_TUPLES_NOT_DEMUS_V1',...change});
const response=(body:unknown)=>new Response(JSON.stringify(body),{headers:{'Cache-Control':'no-store, no-store',ETag:'"0"'}});
beforeEach(()=>vi.stubEnv('VITE_LOCAL_AUTH_ENABLED','false'));afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
it('validates author UUID tuples, labels, ETag and exact write confirmation',async()=>{
 const f=vi.fn().mockImplementation(()=>Promise.resolve(response(page())));vi.stubGlobal('fetch',f);expect((await scopedApi(1,'generated').currentAuthors(3,signal())).items[0].authorLabel).toBe('Český autor');await scopedApi(1,'generated').saveCurrentAuthors(3,'"0"',[assignment],signal());expect(f.mock.calls[1][1].method).toBe('PUT');expect(f.mock.calls[1][1].headers['If-Match']).toBe('"0"');expect(JSON.parse(f.mock.calls[1][1].body)).toEqual([assignment]);
});
it.each([{catalogId:2},{itemId:4},{semantics:'DEMUS'},{items:[page().items[0],page().items[0]]},{items:[{...page().items[0],sortOrder:2}]}])('rejects malformed or foreign current author page %j',async change=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue(response(page(change))));await expect(scopedApi(1,'generated').currentAuthors(3,signal())).rejects.toThrow();});
it('does not send duplicate author-role pairs or report changed assignments as saved',async()=>{
 const f=vi.fn().mockResolvedValue(response(page({items:[]})));vi.stubGlobal('fetch',f);await expect(scopedApi(1,'generated').saveCurrentAuthors(3,'"0"',[assignment,{...assignment,id:id('c'),sortOrder:1}],signal())).rejects.toThrow();expect(f).not.toHaveBeenCalled();await expect(scopedApi(1,'generated').saveCurrentAuthors(3,'"0"',[assignment],signal())).rejects.toThrow(/nepotvrdil/);
});
const records=()=>[{kind:'BEGIN',format:'MES_PROFESSIONAL_NDJSON_V1',catalogId:1,itemsExpected:1},{kind:'CURRENT',catalogId:1,itemId:3,itemVersion:0,authors:[{authorId:id('b')},{authorId:id('c')}]},{kind:'DEMUS_SOURCE',page:{catalogId:1,itemId:3,itemVersion:0,table:'Vznik',items:[{fields:{X:{kind:'NULL'},Y:{kind:'INTEGER',value:'0'}}}]}},{kind:'ITEM_END',catalogId:1,itemId:3},{kind:'END',format:'MES_PROFESSIONAL_NDJSON_V1',catalogId:1,itemsExported:1,sourceReviewStates:0,status:'COMPLETE_AVAILABLE_EVIDENCE'}];
function stream(rows:unknown[],cache='no-store'){const text=rows.map(v=>JSON.stringify(v)+'\n').join('');const bytes=new TextEncoder().encode(text);return new Response(new ReadableStream({start(c){for(let n=0;n<bytes.length;n+=13)c.enqueue(bytes.slice(n,n+13));c.close();}}),{headers:{'Content-Type':'application/x-ndjson','X-CURATAS-Catalog-Id':'1','Cache-Control':cache}});}
it('streams full export preserving raw chunks and reports progress only accepting final complete receipt',async()=>{
 const rows=records(),progress=vi.fn();vi.stubGlobal('fetch',vi.fn().mockResolvedValue(stream(rows)));const result=await scopedApi(1,'generated').structuredExport('inventoryNumber,asc',{},signal(),progress);expect(result.items).toBe(1);expect(await result.blob.text()).toBe(rows.map(v=>JSON.stringify(v)+'\n').join(''));expect(progress).toHaveBeenCalled();
});
it.each(['truncated','count','foreign','version','after-end','cache'])('refuses incomplete/unsafe %s export without producing success Blob',async issue=>{
 const rows=records();if(issue==='truncated')rows.pop();if(issue==='count')rows[4].itemsExported=2;if(issue==='foreign')rows[2].page!.catalogId=2;if(issue==='version')rows[2].page!.itemVersion=1;if(issue==='after-end')rows.push(rows[1]);vi.stubGlobal('fetch',vi.fn().mockResolvedValue(stream(rows,issue==='cache'?'public':'no-store')));await expect(scopedApi(1,'generated').structuredExport('inventoryNumber,asc',{},signal())).rejects.toThrow();
});
