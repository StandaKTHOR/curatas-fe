import {afterEach,expect,it,vi} from 'vitest';
import {scopedApi} from './scopedApi';
afterEach(()=>vi.unstubAllGlobals());
it('keeps basic dictionary access on missing optional locality card but closes it on authorization denial',async()=>{
 const denied=vi.fn();window.addEventListener('curatas:scoped-denied',denied);
 try{
  const api=scopedApi(1,'GENERATED'),signal=new AbortController().signal;
  for(const status of [404,403,401]){
   denied.mockClear();vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('{}',{status})));
   await expect(api.localityCapabilities(signal)).rejects.toMatchObject({status});
   expect(denied).toHaveBeenCalledTimes(status===404?0:1);
  }
  denied.mockClear();vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('{}',{status:404})));
  await expect(api.dictionaryMetadata('LOCALITY',signal)).rejects.toMatchObject({status:404});
  expect(denied).toHaveBeenCalledTimes(1);
 }finally{window.removeEventListener('curatas:scoped-denied',denied);}
});
