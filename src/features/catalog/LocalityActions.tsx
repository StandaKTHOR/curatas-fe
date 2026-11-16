import {useEffect,useMemo,useState} from 'react';
import {useCatalog} from './CatalogContext';
import {useAuth} from '../../components/AuthContext';
import {scopedApi} from '../scoped/scopedApi';
import LocalityCardDialog from './LocalityCardDialog';
export default function LocalityActions({id,disabled,onChanged}:{id:string;disabled:boolean;onChanged:()=>void}){
 const {selectedCatalog}=useCatalog(),{token}=useAuth();
 const readable=!!selectedCatalog?.capabilities?.includes('dictionary.read');
 const api=useMemo(()=>selectedCatalog&&token&&readable?scopedApi(selectedCatalog.id,token):null,[selectedCatalog,token,readable]);
 const [state,setState]=useState<{api:typeof api;id:string;operations:string[];error:string;signal:AbortSignal}|null>(null),[open,setOpen]=useState(false);
 const current=state?.api===api&&state?.id===id?state:null;
 useEffect(()=>{const c=new AbortController();setOpen(false);setState(null);if(api)void api.dictionaryMetadata('LOCALITY',c.signal).then(m=>{if(!c.signal.aborted)setState({api,id,operations:m.operations,error:'',signal:c.signal});}).catch(e=>{if(!c.signal.aborted)setState({api,id,operations:[],error:(e as {status?:number}).status===403?'Pro tento účet není ve vybraném katalogu povoleno čtení lokality.':(e as Error).message,signal:c.signal});});return()=>c.abort();},[api,id]);
 if(!selectedCatalog)return <p role="status">Pro zobrazení lokality nejprve vyberte katalog.</p>;
 if(!token)return <p role="status">Pro zobrazení lokality se přihlaste.</p>;
 if(!readable)return <p role="status">Čtení lokality vyžaduje oprávnění ke čtení číselníků v tomto katalogu (dictionary.read).</p>;
 return <>{!current&&<p role="status">Ověřování oprávnění k lokalitě…</p>}{current?.operations.includes('update')&&<button className="demus-save" type="button" disabled={disabled} onClick={()=>setOpen(true)}>Upravit lokalitu</button>}{current&&!current.error&&!current.operations.includes('update')&&<p role="status">Lokalita je pouze pro čtení. Úprava vyžaduje oprávnění dictionary.write v tomto katalogu.</p>}{current?.error&&<p role="alert">{current.error}</p>}{open&&api&&current&&!current.error&&<LocalityCardDialog api={api} id={id} signal={current.signal} writable={!disabled&&current.operations.includes('update')} onCancel={()=>setOpen(false)} onSaved={()=>{setOpen(false);onChanged();}}/>}</>;
}
