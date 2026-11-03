/** Exact read contract in backend CuratorCatalogService; no legacy field aliases. */
export const curatorFields=['inventoryNumber','accessionNumber','title','author','datingText','material','technique','objectType','originPlace','subCollection'] as const;
export const curatorCurrentFields=['authorText','datingText','materialText','techniqueText','objectType','originPlace'] as const;
export function curatorQuery(page:number,size:number,sort:string,filters:Record<string,unknown>={}){
 if(!Number.isSafeInteger(page)||page<0||!Number.isSafeInteger(size)||size<1||size>100||page*size>20000)throw new Error('Neplatná stránka katalogu.');
 const [field,direction,...extra]=sort.split(',');
 if(extra.length||!curatorFields.includes(field as typeof curatorFields[number])||!['asc','desc'].includes(direction))throw new Error('Řazení není dostupné v existujícím scoped kontraktu.');
 const q=new URLSearchParams({page:String(page),size:String(size),sort});
 // These are the existing original controls. Source-specific filters remain in the
 // dedicated inventory workspace; unsupported original controls fail before transport.
 for(const [key,value] of Object.entries(filters)){
  if(value===undefined||value===null||value==='')continue;
  if(key!=='q'&&!curatorFields.includes(key as typeof curatorFields[number]))throw new Error(`Filtr ${key} není dostupný v existujícím scoped kontraktu.`);
  if(typeof value!=='string'||value.length>100)throw new Error('Neplatný filtr katalogu.');
  q.set(key,value);
 }
 return q;
}
