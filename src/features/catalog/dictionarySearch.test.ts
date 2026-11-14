import {it,expect} from 'vitest';import {dictionarySearchKey} from './dictionarySearch';
it.each([['drevo','dřevo'],['zakladni','základní'],['Satov','Šatov'],['Cesko','Česko'],['kraslice','Kraslice']])('finds %s in %s without changing the original', (query,label)=>{
 expect(dictionarySearchKey(label)).toContain(dictionarySearchKey(query));expect(dictionarySearchKey(label.toUpperCase())).toBe(dictionarySearchKey(label));
});
