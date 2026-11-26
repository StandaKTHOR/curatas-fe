import {expect,it,vi} from 'vitest';
import {printImages,printDocument} from './printDocument';
import {scopedApi} from '../scoped/scopedApi';
it('transmits exactly the qualified creation range and rejects malformed claims before transport',async()=>{
 vi.stubEnv('VITE_LOCAL_AUTH_ENABLED','false');const fetch=vi.fn().mockResolvedValue(new Response('{}',{status:503}));vi.stubGlobal('fetch',fetch);
 try{const api=scopedApi(1,'GENERATED'),signal=new AbortController().signal;const fields={title:'Generated',inventoryNumber:'G 10_CZE6MM E',accessionNumber:null,inventoryRange:{prefix:'G ',postfix:'_CZE6MM E',lowerNumber:10,upperNumber:20,seriesRecordId:null}};
 await expect(api.createItem('11111111-1111-4111-8111-111111111111',fields,signal)).rejects.toThrow();expect(fetch).toHaveBeenCalledTimes(1);expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual(fields);
 for(const inventoryRange of [{...fields.inventoryRange,lowerNumber:0},{...fields.inventoryRange,upperNumber:9},{...fields.inventoryRange,prefix:'OTHER '},{...fields.inventoryRange,extra:'unapproved'}])await expect(api.createItem('11111111-1111-4111-8111-111111111111',{...fields,inventoryRange},signal)).rejects.toThrow();
 expect(fetch).toHaveBeenCalledTimes(1);
 }finally{vi.unstubAllGlobals();vi.unstubAllEnvs();}
});
it('prints every authenticated image across pages in every supported variant without losing text',async()=>{
 const a={kind:'IMAGE',id:'a'},b={kind:'IMAGE',id:'b'};
 const load=vi.fn().mockResolvedValueOnce({items:[{kind:'ATTACHMENT'},a],nextAfterId:'first'}).mockResolvedValueOnce({items:[b],nextAfterId:null});
 expect(await printImages(load)).toEqual([a,b]);expect(load.mock.calls).toEqual([[undefined],['first']]);
 for(const variant of ['list','a5','two-a5'] as const){const html=printDocument([{id:1,title:'Židle',description:'ě'.repeat(9000)}],['title','description'],variant,{1:['data:image/png;base64,AA==','data:image/jpeg;base64,BB==']});expect(html.match(/<img /g)).toHaveLength(2);expect(html).toContain('ě'.repeat(9000));expect(html).not.toContain('<script');}
});
it('refuses excess images, invalid photo data, pagination loops and API failure without partial success',async()=>{
 await expect(printImages(async()=>({items:Array.from({length:21},()=>({kind:'IMAGE'})),nextAfterId:null}))).rejects.toThrow('20 fotografií');
 await expect(printImages(async()=>({items:[],nextAfterId:'same'}))).rejects.toThrow('stránkování');
 await expect(printImages(async()=>{throw new Error('403');})).rejects.toThrow('403');
 expect(()=>printDocument([{id:1}],['title'],'a5',{1:['https://untrusted/image']})).toThrow('Neplatné fotografie');
});
