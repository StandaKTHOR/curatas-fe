import {useEffect,useState} from 'react';
import {originalSession} from './originalAdapter';
export default function CloneOrigin({itemId}:{itemId:number}){
 const {api,signal,catalog}=originalSession();const [value,setValue]=useState<Awaited<ReturnType<typeof api.cloneOrigin>>>(null),[error,setError]=useState('');
 useEffect(()=>{let alive=true;setValue(null);setError('');if(catalog.cloneReadEnabled)api.cloneOrigin(itemId,signal).then(v=>{if(alive&&!signal.aborted)setValue(v);}).catch(()=>{if(alive&&!signal.aborted)setError('Původ klonu se nepodařilo ověřit.');});return()=>{alive=false;};},[itemId,signal,catalog.cloneReadEnabled]);
 if(error)return <p role="status">{error}</p>;if(!value)return null;
 return <div aria-label="Původ nezávislého klonu"><p>Nezávislý klon předmětu #{value.clonedFromItemId}. Vytvořil uživatel #{value.createdBy}, <time dateTime={value.createdAt}>{value.createdAt}</time>.</p><p>Historické události originálu se nepřenášejí jako nová aktivita. Kopie zdrojových měr a MatTech je neměnný podklad s původní lineage, nikoli současné kurátorské tvrzení.</p></div>;
}
