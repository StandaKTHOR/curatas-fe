import {it,expect,vi,afterEach} from 'vitest';import {deleteAttachment} from '../../lib/api';
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
it('never routes scoped UUID media deletion to legacy endpoints',async()=>{vi.stubEnv('VITE_ORIGINAL_SCOPED_TEST','true');const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);await expect(deleteAttachment(101,'00000000-0000-0000-0000-000000000001' as unknown as number)).rejects.toThrow('schválený scoped kontrakt');expect(fetcher).not.toHaveBeenCalled();});
