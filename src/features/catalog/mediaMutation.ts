import {ScopedError} from '../scoped/scopedApi';
/** A replay may describe an item edited by somebody else. Never rebase a dirty form on that ETag. */
export function confirmedMediaMutationTag(before:string,result:{etag:string;replayed?:boolean}){
 if(result.replayed&&result.etag!==before)throw new ScopedError(412);
 return result.etag;
}
