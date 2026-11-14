import {useEffect,useState} from 'react';
import {originalSession} from './originalAdapter';
export default function OwnedHistory({itemId}:{itemId:number}){
 const {api,signal,catalog}=originalSession();const [value,setValue]=useState<Awaited<ReturnType<typeof api.professionalHistory>>|null>(null),[error,setError]=useState('');
 useEffect(()=>{let alive=true;setValue(null);setError('');if(catalog.professionalRecordsEnabled)api.professionalHistory(itemId,signal).then(v=>{if(alive&&!signal.aborted)setValue(v);}).catch(()=>{if(alive&&!signal.aborted)setError('Odborné události se nepodařilo ověřit.');});return()=>{alive=false;};},[itemId,signal,catalog.professionalRecordsEnabled]);
 if(!catalog.professionalRecordsEnabled)return null;if(error)return <p role="status">{error}</p>;if(!value)return <p role="status">Načítám odbornou historii…</p>;
 return <section aria-label="Vlastní odborná historie"><h3>Odborné události</h3><p>Revize, restaurování a zápůjčky s doloženým současným kontraktem. Uživatelský audit ani neklasifikované historické zdroje sem nepatří. Klon uchovává datum události, ale má nové identity záznamů.</p>
  <div className="table-responsive"><table className="demus-datasheet"><thead><tr><th>Typ</th><th>Datum události</th><th>Popis</th></tr></thead><tbody>{value.items.map(v=><tr key={v.id}><td>{{REVISION:'Revize',RESTORATION:'Restaurování',LOAN:'Zápůjčka'}[v.eventType]??v.eventType}</td><td>{v.eventDate??'Neuvedeno'}</td><td className="whitespace-pre-wrap">{v.description??'Neuvedeno'}</td></tr>)}</tbody></table></div>
  {!value.items.length&&<p>V tomto ověřeném výřezu nejsou současné odborné události. Nejde o důkaz absence zdrojové historie.</p>}
 </section>;
}
