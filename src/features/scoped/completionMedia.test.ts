import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {scopedApi} from './scopedApi';
const signal=()=>new AbortController().signal;
const id='11111111-1111-4111-8111-111111111111';
const metadata=(change:Record<string,unknown>={})=>({id,catalogId:1,itemId:7,kind:'ATTACHMENT',name:'Zpráva Ž.pdf',mimeType:'application/pdf',byteSize:4,variants:['content'],caption:'Popis',...change});
const receipt=(change:Record<string,unknown>={},cache='no-store, no-store')=>new Response(JSON.stringify({catalogId:1,itemId:7,itemVersion:1,media:metadata(),...change}),{headers:{'Cache-Control':cache,ETag:'"1"'},status:201});
beforeEach(()=>vi.stubEnv('VITE_LOCAL_AUTH_ENABLED','false'));afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
it('uploads an authenticated bounded stream with browser multipart boundary and parent If-Match',async()=>{
 const fetch=vi.fn().mockResolvedValue(receipt());vi.stubGlobal('fetch',fetch);
 const file=new File(['DATA'],'Zpráva Ž.pdf',{type:'application/pdf'});const saved=await scopedApi(1,'GENERATED').uploadMedia(7,'"0"',file,'ATTACHMENT','Popis',signal());expect(saved.etag).toBe('"1"');expect(saved.value.name).toBe(file.name);
 const [url,init]=fetch.mock.calls[0];expect(url).toContain('/catalogs/1/items/7/media');expect(init.headers.Authorization).toBe('Bearer GENERATED');expect(init.headers['If-Match']).toBe('"0"');expect(init.headers['Content-Type']).toBeUndefined();expect(init.body).toBeInstanceOf(FormData);expect(init.body.get('caption')).toBe('Popis');expect(init.body.get('file').name).toBe(file.name);
});
it.each([{catalogId:2},{itemId:8},{itemVersion:0},{media:metadata({caption:'DIFFERENT'})},{media:metadata({byteSize:5})},{media:metadata({kind:'IMAGE'})}])('rejects mismatched receipts %j without a second upload',async change=>{
 const fetch=vi.fn().mockResolvedValue(receipt(change));vi.stubGlobal('fetch',fetch);await expect(scopedApi(1,'g').uploadMedia(7,'"0"',new File(['DATA'],'Zpráva Ž.pdf'),'ATTACHMENT','Popis',signal())).rejects.toThrow();expect(fetch).toHaveBeenCalledTimes(1);
});
it.each(['public, no-store','no-cache','max-age=60','no-store="x"'])('rejects caching receipt policy %s',async cache=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue(receipt({},cache)));await expect(scopedApi(1,'g').uploadMedia(7,'"0"',new File(['DATA'],'Zpráva Ž.pdf'),'ATTACHMENT','Popis',signal())).rejects.toThrow();});
it('preserves NULL and empty captions and uses the exact owned UUID route',async()=>{
 const fetch=vi.fn().mockResolvedValue(receipt({media:metadata({caption:null})}));vi.stubGlobal('fetch',fetch);await scopedApi(1,'g').saveMediaCaption(7,id,'"0"',null,signal());expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({caption:null});expect(fetch.mock.calls[0][0]).toContain(`/media/${id}/caption`);
});
it.each([403,412,422])('does not report upload success for HTTP%s',async status=>{const fetch=vi.fn().mockResolvedValue(new Response('',{status}));vi.stubGlobal('fetch',fetch);await expect(scopedApi(1,'g').uploadMedia(7,'"0"',new File(['DATA'],'Zpráva Ž.pdf'),'ATTACHMENT','Popis',signal())).rejects.toMatchObject({status});expect(fetch).toHaveBeenCalledTimes(1);});
it('rejects unsafe or empty streams before transport',async()=>{const fetch=vi.fn();vi.stubGlobal('fetch',fetch);for(const file of [new File([],'empty.pdf'),new File(['DATA'],'../escape.pdf')])await expect(scopedApi(1,'g').uploadMedia(7,'"0"',file,'ATTACHMENT',null,signal())).rejects.toThrow();expect(fetch).not.toHaveBeenCalled();});
