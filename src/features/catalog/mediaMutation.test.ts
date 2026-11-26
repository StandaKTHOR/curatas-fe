import {it,expect} from 'vitest';import {confirmedMediaMutationTag} from './mediaMutation';
it('accepts a fresh confirmed CAS or an unchanged replay',()=>{expect(confirmedMediaMutationTag('"2"',{etag:'"3"'})).toBe('"3"');expect(confirmedMediaMutationTag('"3"',{etag:'"3"',replayed:true})).toBe('"3"');});
it('refuses to rebase a dirty current form on a replay with a different parent version',()=>{expect(()=>confirmedMediaMutationTag('"2"',{etag:'"3"',replayed:true})).toThrow();expect(()=>confirmedMediaMutationTag('"2"',{etag:'"8"',replayed:true})).toThrow();});
