import {afterEach,expect,it,vi} from 'vitest';

afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();vi.resetModules();});

it('loads the original import component dependency without invoking a forbidden legacy endpoint',async()=>{
 vi.stubEnv('VITE_ORIGINAL_SCOPED_TEST','true');
 const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 const {importApi}=await import('./api');
 expect(fetch).not.toHaveBeenCalled();
 expect(importApi.capabilities).toBeTypeOf('function');
 await expect(importApi.capabilities!(new AbortController().signal)).rejects.toThrow('Historické API nebylo voláno');
 expect(fetch).not.toHaveBeenCalled();
});
