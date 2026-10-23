import { afterEach, describe, expect, it, vi } from 'vitest';
import { decimal, exactJson, scopedApi } from './scopedApi';
const signal = () => new AbortController().signal;
const item = { id: 101, catalogId: 11, title: '  Native title Ω ', inventoryNumber: ' 0001/02 ', accessionNumber: null, version: 3 };
const dimension = { id: 5, catalogId: 11, itemId: 101, type: ' výška ', value: 12.30, unit: ' cm ', createdInScopedApi: true };
const id = '12345678-1234-1234-1234-123456789abc';
const media = { id, catalogId: 11, itemId: 101, kind: 'IMAGE' as const, name: 'image.png', mimeType: 'image/png', byteSize: 3, variants: ['content','thumbnail'] as ('content'|'thumbnail')[] };
const response = (body: unknown, status = 200, etag = '"3"') => new Response(JSON.stringify(body), { status, headers: { ETag: etag } });
const setup = (value: Response) => { const f = vi.fn().mockResolvedValue(value); vi.stubGlobal('fetch', f); return f; };
afterEach(() => vi.unstubAllGlobals());
describe('explicit scoped transport', () => {
    it('requires a safe catalog/session and refuses path selectors as IDs', async () => {
        const f = setup(response({})); expect(() => scopedApi(0,'t')).toThrow(); expect(() => scopedApi(11,'')).toThrow();
        await expect(scopedApi(11,'t').detail(Number.MAX_SAFE_INTEGER + 1,signal())).rejects.toThrow();
        await expect(scopedApi(11,'t').mediaDetail(101,'../outside',signal())).rejects.toThrow(); expect(f).not.toHaveBeenCalled();
    });
    it('sends exact catalog cursor session abort and private fetch policy', async () => {
        const f = setup(response({ items: [item], nextAfterId: 101 })); const abort = signal();
        expect((await scopedApi(11,'current').list(abort,90,1)).nextAfterId).toBe(101);
        expect(f).toHaveBeenCalledWith(expect.stringContaining('/api/v2/catalogs/11/items?limit=1&afterId=90'), expect.objectContaining({ signal: abort, cache:'no-store', credentials:'omit', redirect:'error', headers:{Authorization:'Bearer current'} }));
    });
    it('preserves inventory text and strong bigint version without precision loss', async () => {
        setup(new Response('{"id":101,"catalogId":11,"title":"x","inventoryNumber":" 0001 ","accessionNumber":null,"version":9223372036854775806}',{ headers:{ETag:'"9223372036854775806"'} }));
        const result=await scopedApi(11,'t').detail(101,signal()); expect(result.etag).toBe('"9223372036854775806"');expect(result.value.inventoryNumber).toBe(' 0001 ');
    });
    it.each(['W/"3"','*','"4"','', '3'])('refuses missing weak or mismatched response ETag %s',async tag=>{
        setup(response(item,200,tag));await expect(scopedApi(11,'t').detail(101,signal())).rejects.toThrow();
    });
    it('PATCH whitelists fields and preserves exact draft with If-Match',async()=>{
        const f=setup(response({...item,version:4},200,'"4"'));const input={title:'  new Ω ',inventoryNumber:' 0002 '};
        await scopedApi(11,'t').patch(101,'"3"',input,signal());expect(f.mock.calls[0][1]).toMatchObject({method:'PATCH',body:JSON.stringify(input),headers:{'If-Match':'"3"'}});expect(input.inventoryNumber).toBe(' 0002 ');
    });
    it('refuses forbidden fields and invalid request tags before fetch',async()=>{
        const f=setup(response(item));await expect(scopedApi(11,'t').patch(101,'W/"3"',{title:'x'},signal())).rejects.toThrow();
        await expect(scopedApi(11,'t').patch(101,'"3"',{title:'x',published:true} as any,signal())).rejects.toThrow();expect(f).not.toHaveBeenCalled();
    });
    it.each([401,403,404,409,412,428,422,500])('returns %s once with no write retry or legacy fallback',async status=>{
        const f=setup(response({},status));const input={title:'draft'};await expect(scopedApi(11,'t').patch(101,'"3"',input,signal())).rejects.toMatchObject({status});expect(f).toHaveBeenCalledTimes(1);expect(input.title).toBe('draft');
    });
    it('network failure is observable and never retries a write',async()=>{
        const f=vi.fn().mockRejectedValue(new TypeError('offline'));vi.stubGlobal('fetch',f);await expect(scopedApi(11,'t').patch(101,'"3"',{title:'draft'},signal())).rejects.toThrow('offline');expect(f).toHaveBeenCalledTimes(1);
    });
    it('drops a response after abort even if fetch ignores the signal',async()=>{
        let resolve!:(v:Response)=>void;vi.stubGlobal('fetch',vi.fn(()=>new Promise<Response>(r=>resolve=r)));const abort=new AbortController();const pending=scopedApi(11,'t').detail(101,abort.signal);abort.abort();resolve(response(item));await expect(pending).rejects.toThrow('cancelled');
    });
    it('rejects foreign response bindings for item dimension and media',async()=>{
        setup(response({...item,catalogId:21}));await expect(scopedApi(11,'t').detail(101,signal())).rejects.toThrow('Foreign');
        setup(response({itemVersion:3,dimension:{...dimension,itemId:202}}));await expect(scopedApi(11,'t').dimension(101,5,signal())).rejects.toThrow('Foreign');
        setup(response({...media,catalogId:21}));await expect(scopedApi(11,'t').mediaDetail(101,id,signal())).rejects.toThrow();
    });
    it('reads exact numeric38,2 and writes raw decimal JSON without IEEE rounding',async()=>{
        const value='123456789012345678901234567890123456.78';
        setup(new Response(`{"itemVersion":3,"dimension":${JSON.stringify(dimension).replace('12.3',value)}}`,{headers:{ETag:'"3"'}}));
        expect((await scopedApi(11,'t').dimension(101,5,signal())).value.value).toBe(value);
        const f=setup(response({itemVersion:4,dimension},201,'"4"'));await scopedApi(11,'t').createDimension(101,'"3"',{type:' h ',value,unit:null},signal());
        expect(f.mock.calls[0][1].body).toBe(`{"type":" h ","value":${value},"unit":null}`);
    });
    it.each(['1.001','1e3','NaN','Infinity','01','1,2','9'.repeat(37)])('rejects unsafe decimal %s without rounding',value=>expect(()=>decimal(value)).toThrow());
    it('accepts signs/zero/trailing zeros without inventing unit rules or altering text strings',()=>{
        expect(decimal('-12.3000')).toBe('-12.3');expect(decimal('0.00')).toBe('0');expect(exactJson('{"value":12.30,"note":"value:12.30 Ω"}')).toEqual({value:'12.30',note:'value:12.30 Ω'});
    });
    it('lists/detains dimensions using parent ETag and PATCH only allowed fields',async()=>{
        const f=setup(response({itemVersion:3,items:[dimension],nextAfterId:null}));expect((await scopedApi(11,'t').dimensions(101,signal())).value.items[0].createdInScopedApi).toBe(true);
        f.mockResolvedValueOnce(response({itemVersion:4,dimension},200,'"4"'));await scopedApi(11,'t').patchDimension(101,5,'"3"',{type:'h',value:'1.20',unit:''},signal());expect(f.mock.calls[1][1]).toMatchObject({method:'PATCH',headers:{'If-Match':'"3"'}});
    });
    it('returns exact private bytes only from a registered variant with checked headers',async()=>{
        const f=setup(new Response(new Uint8Array([1,2,3]),{headers:{'Content-Type':'image/png','Content-Length':'3','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Disposition':'attachment; filename=image.png'}}));
        const blob=await scopedApi(11,'t').bytes(101,media,'content',signal());expect(new Uint8Array(await blob.arrayBuffer())).toEqual(new Uint8Array([1,2,3]));expect(f.mock.calls[0][0]).toContain(`/media/${id}/content`);
    });
    it.each(['text/html','image/svg+xml','application/javascript'])('refuses unsafe media Content-Type %s',async mime=>{
        setup(new Response('bad',{headers:{'Content-Type':mime,'Content-Length':'3'}}));await expect(scopedApi(11,'t').bytes(101,media,'content',signal())).rejects.toThrow();
    });
    it('never uses a metadata URL or a missing thumbnail fallback',async()=>{
        const f=setup(response({...media,url:'/media/secret',variants:['content']}));const found=await scopedApi(11,'t').mediaDetail(101,id,signal());expect(found).not.toHaveProperty('url');
        await expect(scopedApi(11,'t').bytes(101,found,'thumbnail',signal())).rejects.toThrow();expect(f).toHaveBeenCalledTimes(1);
    });
});
