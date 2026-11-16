import {afterEach,beforeEach,expect,it,vi} from 'vitest';import {scopedApi} from './scopedApi';
const id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',signal=()=>new AbortController().signal;
const saved=(payload:unknown)=>({catalogId:1,itemId:3,itemVersion:1,origin:'CURRENT_CURATOR_STATEMENT_NOT_SOURCE',record:{id:8,kind:'MATERIAL_TECHNIQUE',dictionaryId:null,partyId:null,materialDictionaryId:null,techniqueDictionaryId:null,payload}});
const reply=(body:unknown,cache='no-store, no-store')=>new Response(JSON.stringify(body),{headers:{'Cache-Control':cache,ETag:'"1"'}});
beforeEach(()=>vi.stubEnv('VITE_LOCAL_AUTH_ENABLED','false'));afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
it('sends a real per-row UUID delta with If-Match and requires exact UUID acknowledgement',async()=>{
 const f=vi.fn().mockResolvedValue(reply(saved({materialAuthorityId:id,Poradi_MT:0})));vi.stubGlobal('fetch',f);const api=scopedApi(1,'generated');const r=await api.saveProfessional(3,'MATERIAL_TECHNIQUE',8,'"0"',{materialAuthorityId:id,Poradi_MT:0},signal());expect(r.value.payload.materialAuthorityId).toBe(id);expect(f.mock.calls[0][1].headers['If-Match']).toBe('"0"');expect(JSON.parse(f.mock.calls[0][1].body)).toEqual({materialAuthorityId:id,Poradi_MT:0});
 f.mockResolvedValueOnce(reply(saved({materialAuthorityId:null})));await expect(api.saveProfessional(3,'MATERIAL_TECHNIQUE',8,'"0"',{materialAuthorityId:id},signal())).rejects.toThrow(/nepotvrdil/);
});
it('rejects native numeric IDs, technical UUID fields on other kinds and cachable responses',async()=>{
 const f=vi.fn().mockResolvedValue(reply(saved({materialAuthorityId:id}),'public'));vi.stubGlobal('fetch',f);const api=scopedApi(1,'generated');await expect(api.saveProfessional(3,'MATERIAL_TECHNIQUE',8,'"0"',{materialAuthorityId:'123'},signal())).rejects.toThrow();await expect(api.saveProfessional(3,'ORIGIN',8,'"0"',{materialAuthorityId:id},signal())).rejects.toThrow();expect(f).not.toHaveBeenCalled();await expect(api.saveProfessional(3,'MATERIAL_TECHNIQUE',8,'"0"',{materialAuthorityId:id},signal())).rejects.toThrow();
});
it('validates feedback thread root, catalogue, source author IDs and cursor',async()=>{
 const body={catalogId:1,root:{id,message:'Původní připomínka',status:'NEW',createdAt:'2026-11-06T12:00:00Z',actorId:'1'},items:[],nextAfterId:null};const f=vi.fn().mockResolvedValue(reply(body));vi.stubGlobal('fetch',f);expect((await scopedApi(1,'generated').feedbackThread(id,signal())).root.message).toBe('Původní připomínka');f.mockResolvedValueOnce(reply({...body,catalogId:2}));await expect(scopedApi(1,'generated').feedbackThread(id,signal())).rejects.toThrow();f.mockResolvedValueOnce(reply({...body,nextAfterId:id}));await expect(scopedApi(1,'generated').feedbackThread(id,signal())).rejects.toThrow();
});
