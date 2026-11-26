import {useEffect,useState} from 'react';
import type {ScopedApi} from '../scoped/scopedApi';
/** Existing exact-UUID search contract. Never search a name or infer a party identity. */
export default function AuthorityRelatedItems({api,type,id,catalog,readable}:{api:ScopedApi;type:'AUTHOR'|'LOCALITY';id:string;catalog:number;readable:boolean}){
 const [open,setOpen]=useState(false);
 if(!readable)return <p>Soupis předmětů vyžaduje samostatné oprávnění ke čtení předmětů katalogu.</p>;
 return <details onToggle={e=>setOpen(e.currentTarget.open)}><summary>Skutečně přiřazené předměty</summary>{open&&(id.startsWith('s:')
  ?<SourceItems key={`${catalog}:${type}:${id}`} api={api} type={type} id={id} catalog={catalog}/>
  :<Items key={`${catalog}:${type}:${id}`} api={api} type={type} id={id} catalog={catalog}/>)}</details>;
}
function SourceItems({api,type,id,catalog}:{api:ScopedApi;type:'AUTHOR'|'LOCALITY';id:string;catalog:number}){
 const [trail,setTrail]=useState([0]);
 const [data,setData]=useState<Awaited<ReturnType<ScopedApi['sourceAuthorityItems']>>>();
 const [error,setError]=useState('');
 const after=trail.at(-1)??0;
 useEffect(()=>{
  const cancel=new AbortController();
  setData(undefined);setError('');
  void api.sourceAuthorityItems(type,id,after,cancel.signal).then(value=>{
   if(!cancel.signal.aborted)setData(value);
  }).catch(error=>{if(!cancel.signal.aborted)setError(error.message);});
  return ()=>cancel.abort();
 },[api,type,id,after]);
 return <section aria-label="Předměty podle přesné autority">
  {error?<p role="alert">{error}</p>:!data?<p role="status">Načítám přiřazené předměty…</p>:<>
   {data.items.length===0?<p>Žádná doložená vazba.</p>:<table className="demus-datasheet">
    <thead><tr><th>Inventární číslo</th><th>Titul</th><th>Vazba</th></tr></thead>
    <tbody>{data.items.map(row=><tr key={row.id}><td><a target="_blank" rel="noopener"
     href={`/admin/items/view/${row.id}?catalog=${catalog}`}>{row.inventoryNumber||'Bez inventárního čísla'}</a></td>
     <td>{row.title??'—'}</td><td>{[row.primary&&(type==='AUTHOR'?'Hlavní autor':'Lokalita'),row.collaborator&&'Další tvůrce',row.assigned&&'Přiřazení v kartě'].filter(Boolean).join(' · ')}</td></tr>)}</tbody>
   </table>}
   <button type="button" disabled={trail.length===1} onClick={()=>setTrail(value=>value.slice(0,-1))}>Předchozí předměty</button>
   {data.nextAfterId!==null&&<button type="button" onClick={()=>setTrail(value=>[...value,data.nextAfterId!])}>Další předměty</button>}
  </>}
 </section>;
}
function Items({api,type,id,catalog}:{api:ScopedApi;type:'AUTHOR'|'LOCALITY';id:string;catalog:number}){
 const [page,setPage]=useState(0),[result,setResult]=useState<Awaited<ReturnType<ScopedApi['curatorPage']>>|null>(null),[error,setError]=useState('');
 useEffect(()=>{const c=new AbortController();setResult(null);setError('');
  const advancedFilter=JSON.stringify({conjunction:'AND',conditions:[{field:type==='AUTHOR'?'authorAuthorityId':'localityAuthorityId',operator:'EQUALS',value:id}],groups:[]});
  api.curatorPage(page,25,'inventoryNumber,asc',{advancedFilter},c.signal).then(value=>{if(!c.signal.aborted)setResult(value);}).catch(e=>{if(!c.signal.aborted)setError((e as Error).message);});return()=>c.abort();
 },[api,type,id,catalog,page]);
 return <section aria-label="Předměty podle přesné autority"><p>{type==='AUTHOR'?'Hlavní a další současní autoři podle totožné autority.':'Současná lokalita podle totožné autority.'} Shoda textu ani původní údaje DEMUS nejsou do tohoto soupisu přimíchány.</p>{error?<p role="alert">Soupis nelze ověřit: {error}</p>:!result?<p role="status">Načítání přiřazených předmětů…</p>:<><p>Ověřený počet: {result.totalElements}</p>{!result.items.length?<p>Žádný předmět neodpovídá této současné vazbě.</p>:<table className="demus-datasheet"><thead><tr><th>Inventární číslo</th><th>Titul</th></tr></thead><tbody>{result.items.map(row=><tr key={row.item.id}><td><a href={`/admin/items/view/${row.item.id}?catalog=${catalog}`}>{row.item.inventoryNumber||'Bez inventárního čísla'}</a></td><td>{row.item.title??'—'}</td></tr>)}</tbody></table>}<div style={{display:'flex',gap:8,flexWrap:'wrap'}}><button className="demus-save" type="button" disabled={!page} onClick={()=>setPage(v=>v-1)}>Předchozí předměty</button><button className="demus-save" type="button" disabled={!result.hasMore} onClick={()=>setPage(v=>v+1)}>Další předměty</button></div></>}</section>;
}
