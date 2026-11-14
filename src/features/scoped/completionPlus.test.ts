import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {scopedApi} from './scopedApi';
const hex=(n:string)=>n.repeat(64);const signal=()=>new AbortController().signal;
const row=()=>({recordId:hex('a'),sourceSha256:hex('b'),rowHash:hex('c'),occurrence:1,fields:{Plus1T_S:{kind:'TEXT',value:'  GENERATED Ž  '},Plus2T_S:{kind:'NULL'},Plus3C_S:{kind:'FLOAT_BITS',value:'80000000'},Sluz2_S:{kind:'DOUBLE_BITS',value:'8000000000000000'},SluzF_S:{kind:'TEXT',value:''},Sluz_S:null}});
const page=(change:Record<string,unknown>={})=>({catalogId:1,itemId:7,itemVersion:0,semantics:'OPAQUE_TYPED_HISTORICAL_PLUS_NOT_CURRENT_ASSERTIONS',items:[row()],nextAfterId:null,...change});
const response=(body:unknown)=>new Response(JSON.stringify(body),{headers:{ETag:'"0"','Cache-Control':'no-store, no-store'}});
beforeEach(()=>vi.stubEnv('VITE_LOCAL_AUTH_ENABLED','false'));afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
it('preserves exact typed values, NULL, whitespace, missing column and negative-zero bits',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue(response(page())));const result=await scopedApi(1,'generated').sourcePlus(7,signal());expect(result.items[0].fields).toEqual(row().fields);expect(result.etag).toBe('"0"');});
it.each(['catalog','field','bits','order','cursor'])('rejects %s mismatch rather than exposing raw or incomplete evidence',async issue=>{
 const value=page();if(issue==='catalog')value.catalogId=2;
 if(issue==='field')(value.items[0].fields as any).legacy_data={kind:'TEXT',value:'RAW'};
 if(issue==='bits')value.items[0].fields.Plus3C_S.value='0.0';
 if(issue==='order')value.items.push(value.items[0]);
 if(issue==='cursor')value.nextAfterId=hex('f') as any;
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(response(value)));await expect(scopedApi(1,'generated').sourcePlus(7,signal())).rejects.toThrow();
});
