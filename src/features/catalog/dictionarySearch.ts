/** Search/comparison key only; never an authority identity or persisted label. */
export const dictionarySearchKey=(value:string)=>value.normalize('NFD').replace(/\p{M}+/gu,'').toLocaleLowerCase('cs');
