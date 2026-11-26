import {allCloneGroups} from './cloneGroups';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {explicitBulkNumbers,copyExplicitBulk} from './originalBulk';
const {api,signal}=vi.hoisted(()=>({api:{detail:vi.fn(),cloneItem:vi.fn(),curatorRecord:vi.fn(),references:vi.fn()},signal:new AbortController().signal}));
vi.mock('./originalAdapter',()=>({originalSession:()=>({api,signal,catalog:{id:1}})}));
vi.mock('./originalClone',()=>({originalCanClone:()=>true}));
beforeEach(()=>vi.clearAllMocks());afterEach(()=>vi.restoreAllMocks());
it('requires bounded explicit new identities without an allocation rule',()=>{
 expect(explicitBulkNumbers(' N 3\r\nN 4\n','N 2')).toEqual(['N 3','N 4']);
 for(const text of ['', 'N 2','N 3\nN 3',Array.from({length:21},(_,i)=>`N ${i+3}`).join('\n')])expect(()=>explicitBulkNumbers(text,'N 2')).toThrow();
});
it('verifies every POST by GET and stops on a rejected identity, keeping prior successes',async()=>{
 api.detail.mockResolvedValueOnce({etag:'"7"'}).mockResolvedValueOnce({value:{id:12,catalogId:1,inventoryNumber:'N 3'}});
 api.cloneItem.mockResolvedValueOnce({value:{item:{id:12},clonedFromItemId:10}}).mockRejectedValueOnce(Object.assign(new Error('duplicate'),{status:409}));
 const progress=vi.fn();const rows=await copyExplicitBulk(10,'židle',['N 3','N 4','N 5'],progress);
 expect(rows.map(v=>v.state)).toEqual(['VERIFIED','REJECTED','NOT_STARTED']);expect(rows[0].id).toBe(12);expect(api.cloneItem).toHaveBeenCalledTimes(2);expect(api.detail).toHaveBeenCalledTimes(2);
 expect(api.cloneItem.mock.calls[0][2]).toBe('"7"');expect(api.cloneItem.mock.calls[1][1]).not.toBe(rows[0].requestId);
});
it('never retries an ambiguous POST and retains its request identity',async()=>{
 api.detail.mockResolvedValueOnce({etag:'"7"'});api.cloneItem.mockRejectedValueOnce(new Error('connection lost'));
 const rows=await copyExplicitBulk(10,'židle',['N 3','N 4'],()=>{});expect(rows[0].state).toBe('UNCONFIRMED');expect(rows[0].requestId).toMatch(/^[a-f0-9-]{36}$/);expect(rows[1].state).toBe('NOT_STARTED');expect(api.cloneItem).toHaveBeenCalledTimes(1);
});
it('does not claim success if receipt and GET disagree',async()=>{
 api.detail.mockResolvedValueOnce({etag:'"7"'}).mockResolvedValueOnce({value:{id:12,catalogId:2,inventoryNumber:'N 3'}});
 api.cloneItem.mockResolvedValueOnce({value:{item:{id:12},clonedFromItemId:10}});const rows=await copyExplicitBulk(10,'židle',['N 3'],()=>{});expect(rows[0].state).toBe('UNCONFIRMED');expect(rows[0].id).toBe(12);
});
it('copies type-only records with explicit NULL title without inventing a title',async()=>{
 api.detail.mockResolvedValueOnce({etag:'"1"'}).mockResolvedValueOnce({etag:'"1"',value:{id:19,catalogId:1,title:null,inventoryNumber:'N 7'}});api.curatorRecord.mockResolvedValue({etag:'"1"',value:{objectType:'židle'}});api.cloneItem.mockResolvedValueOnce({value:{item:{id:19,title:null},clonedFromItemId:10}});
 const rows=await copyExplicitBulk(10,null,['N 7'],()=>{});expect(rows[0].state).toBe('VERIFIED');expect(api.cloneItem.mock.calls[0][3]).toEqual({title:null,inventoryNumber:'N 7',copyGroups:[...allCloneGroups].sort()});
});
