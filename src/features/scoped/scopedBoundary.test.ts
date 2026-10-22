import { afterEach, expect, it, vi } from 'vitest';
import { scopedApi, type Media } from './scopedApi';
const media: Media={id:'12345678-1234-1234-1234-123456789abc',catalogId:11,itemId:101,kind:'IMAGE',name:'private.png',mimeType:'image/png',byteSize:3,variants:['content','thumbnail']};
afterEach(()=>vi.unstubAllGlobals());
it.each([401,403,404,412])('every scoped data family rejects %s without any v1/static/public fallback or automatic retry',async status=>{
    const fetcher=vi.fn().mockImplementation(async()=>new Response('{}',{status}));vi.stubGlobal('fetch',fetcher);
    const api=scopedApi(11,'current-session');const signal=new AbortController().signal;
    const operations=[()=>api.inventoryEvidence(101,signal),()=>api.list(signal),()=>api.detail(101,signal),()=>api.patch(101,'"0"',{title:'draft'},signal),
        ()=>api.dimensions(101,signal),()=>api.dimension(101,5,signal),()=>api.createDimension(101,'"0"',{type:'h',value:'12.30',unit:'cm'},signal),
        ()=>api.patchDimension(101,5,'"0"',{type:'h',value:'12.30',unit:'cm'},signal),()=>api.media(101,signal),()=>api.mediaDetail(101,media.id,signal),
        ()=>api.bytes(101,media,'content',signal),()=>api.bytes(101,media,'thumbnail',signal)];
    for(const operation of operations)await expect(operation()).rejects.toMatchObject({status});
    expect(fetcher).toHaveBeenCalledTimes(operations.length);
    for(const [url,init] of fetcher.mock.calls){
        expect(new URL(url,'http://owned-fixture').pathname).toMatch(/^\/api\/v2\/catalogs\/11\/items(?:\/|$)/);
        expect(init).toMatchObject({cache:'no-store',redirect:'error',credentials:'omit',signal,headers:{Authorization:'Bearer current-session'}});
        expect(String(url)).not.toMatch(/\/api\/v1\/|\/public\/|\/media\/items\/|\/media\/attachments\//);
    }
});
