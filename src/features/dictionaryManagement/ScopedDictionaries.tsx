import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../components/AuthContext';
import { useCatalog } from '../catalog/CatalogContext';
import { catalogDictionaries, CatalogDictionaryApiError, type CatalogDictionaryMetadata, type CatalogDictionaryType, type CatalogDictionaryValue, type CatalogDictionaryWrite, type VersionedDictionaryValue } from '../catalog/dictionaryApi';
import { ScopedError,errorText } from '../scoped/scopedApi';
import { useTask } from '../scoped/useTask';
import '../scoped/scoped.css';
type Api=ReturnType<typeof catalogDictionaries>;
const blank=():CatalogDictionaryWrite=>({label:'',code:null,parentId:null,reason:''});
export default function ScopedDictionaries(){
    const {token,logout,setToken}=useAuth();const {selectedCatalog}=useCatalog();
    useEffect(()=>{const changed=(e:StorageEvent)=>{if(e.key==='token')setToken(e.newValue);};window.addEventListener('storage',changed);return()=>window.removeEventListener('storage',changed);},[setToken]);
    if(import.meta.env.VITE_SCOPED_WORKSPACE_ENABLED!=='true')return <p>Katalogová pracovní plocha není zapnuta.</p>;
    if(!token)return <p>Pro správu číselníků se <Link to="/login">přihlaste</Link>.</p>;
    if(!selectedCatalog)return <p>Vyberte katalog v horní nabídce.</p>;
    return <DictionaryManager key={`${token}:${selectedCatalog.id}`} catalogId={selectedCatalog.id} token={token} onUnauthorized={logout}/>;
}
export function DictionaryManager({catalogId,token,onUnauthorized}:{catalogId:number;token:string;onUnauthorized:()=>void}){
    const api=useMemo(()=>catalogDictionaries(catalogId,token),[catalogId,token]);
    const [type,setType]=useState<CatalogDictionaryType>('MATERIAL');const [editing,setEditing]=useState(false);const [denied,setDenied]=useState(0);
    const fatal=useCallback((s:number)=>{setDenied(s);if(s===401)onUnauthorized();},[onUnauthorized]);
    return <article className="scoped-workspace" aria-label="Správa číselníků"><h1>Správa materiálů a technik</h1>
        <Link to="/scoped/items" onClick={e=>{if(editing&&!window.confirm('Zahodit neuložené změny hodnoty?'))e.preventDefault();}}>Zpět na předměty</Link>
        <p>Katalogové hodnoty jsou samostatné od historických číselníků. Úprava hodnoty nepřiřazuje materiál předmětu.</p>
        <label>Typ číselníku<select aria-label="Typ číselníku" disabled={editing} value={type} onChange={e=>setType(e.target.value as CatalogDictionaryType)}><option value="MATERIAL">Materiály</option><option value="TECHNIQUE">Techniky</option></select></label>
        {denied?<><p role="alert">{errorText(denied)} Soukromý obsah byl uzavřen.</p><button onClick={()=>{setDenied(0);setEditing(false);}}>Obnovit číselník</button></>:<DictionaryEditor key={type} api={api} type={type} onFatal={fatal} onEditing={setEditing}/>}
    </article>;
}
export function DictionaryEditor({api,type,onFatal,onEditing}:{api:Api;type:CatalogDictionaryType;onFatal:(s:number)=>void;onEditing:(v:boolean)=>void}){
    const [meta,setMeta]=useState<CatalogDictionaryMetadata|null>(null);const [rows,setRows]=useState<CatalogDictionaryValue[]>([]);const [next,setNext]=useState<string|null>(null);
    const [query,setQuery]=useState('');const [filter,setFilter]=useState({q:'',parent:null as string|null});
    const [server,setServer]=useState<VersionedDictionaryValue|null>(null);const [editing,setEditing]=useState(false);const [draft,setDraft]=useState(blank);
    const [tag,setTag]=useState('');const [conflict,setConflict]=useState(false);const [compared,setCompared]=useState(false);const [notice,setNotice]=useState('');
    const task=useTask(onFatal);const {run}=task;
    const operation=async<T,>(signal:AbortSignal,call:()=>Promise<T>)=>{try{return await call();}catch(e){if(e instanceof CatalogDictionaryApiError){if(e.status===412&&!signal.aborted){setConflict(true);setCompared(false);}throw new ScopedError(e.status);}throw e;}};
    const load=useCallback((after?:string)=>{
        void run(async s=>{try{return await Promise.all([api.dictionary(type,s),api.list(type,{q:filter.q,parentId:filter.parent??undefined,afterId:after,limit:50},s)]);}catch(e){if(e instanceof CatalogDictionaryApiError)throw new ScopedError(e.status);throw e;}},([metadata,page])=>{
            if(metadata.type!==type||metadata.ownership!=='CATALOG_CREATED_ONLY'||metadata.parentSupport!=='EXPLICIT_SAME_TYPE'||metadata.operations.some(o=>!['read','create','update'].includes(o)))throw new Error('Invalid dictionary metadata');
            setMeta(metadata);setRows(old=>after?[...old,...page.items]:page.items);setNext(page.nextAfterId);
        });
    },[api,type,filter,run]);
    useEffect(()=>{load();},[load]);
    useEffect(()=>{onEditing(editing);const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';};if(editing)window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[editing,onEditing]);
    const detail=(id:string)=>void run(s=>operation(s,()=>api.detail(type,id,s)),value=>{setServer(value);setNotice('');});
    const begin=(value:VersionedDictionaryValue|null)=>{setServer(value);setDraft(value?{label:value.value.label,code:value.value.code,parentId:value.value.parentId,reason:''}:blank());setTag(value?.etag??'');setConflict(false);setCompared(false);setEditing(true);setNotice('');};
    function save(){void run(s=>operation(s,()=>server?api.update(type,server.value.id,tag,draft,s):api.create(type,draft,s)),value=>{setServer(value);setRows(old=>[value.value,...old.filter(v=>v.id!==value.value.id)]);setEditing(false);setConflict(false);setQuery('');setFilter({q:'',parent:null});setNotice('Hodnota byla uložena.');},true);}
    const compare=()=>{if(server)void run(s=>operation(s,()=>api.detail(type,server.value.id,s)),value=>{setServer(value);setCompared(true);});};
    return <section aria-label="Hodnoty číselníku"><h2>{type==='MATERIAL'?'Materiály':'Techniky'}</h2>
        <form onSubmit={e=>{e.preventDefault();setFilter({...filter,q:query});setServer(null);}}><label>Hledat hodnotu<input maxLength={100} disabled={editing} value={query} onChange={e=>setQuery(e.target.value)}/></label><button disabled={task.busy||editing}>Hledat hodnoty</button></form>
        <button disabled={task.busy||editing} onClick={()=>{setQuery('');setFilter({q:'',parent:null});setServer(null);}}>Zobrazit všechny hodnoty</button>
        {filter.parent&&<p>Nadřazená hodnota: {filter.parent}</p>}
        {meta?.operations.includes('create')&&<button aria-label="Přidat hodnotu" disabled={task.busy||editing} onClick={()=>begin(null)}>+ Přidat hodnotu</button>}
        {task.busy&&<p role="status">Načítání…</p>}{task.error&&<p role="alert">{task.error}</p>}{notice&&<p role="status">{notice}</p>}
        {!task.busy&&!rows.length&&<p>Žádné dostupné hodnoty.</p>}
        <ul>{rows.map(value=><li key={value.id}><button disabled={task.busy||editing} onClick={()=>detail(value.id)}>{value.label}</button><button disabled={task.busy||editing} onClick={()=>{setFilter({...filter,parent:value.id});setServer(null);}}>Potomci: {value.label}</button></li>)}</ul>
        {next&&<button disabled={task.busy||editing} onClick={()=>load(next)}>Další hodnoty</button>}
        {server&&<dl><dt>Název hodnoty na serveru</dt><dd className="scoped-exact" data-testid="dictionary-server-label">{server.value.label}</dd><dt>Kód</dt><dd>{server.value.code??'Neuveden'}</dd><dt>Rodič</dt><dd>{server.value.parentId??'Bez rodiče'}</dd><dt>Verze hodnoty</dt><dd data-testid="dictionary-etag">{server.etag}</dd></dl>}
        {server&&!editing&&meta?.operations.includes('update')&&<button disabled={task.busy} onClick={()=>begin(server)}>Upravit hodnotu</button>}
        {editing&&<form aria-label="Editor hodnoty číselníku" onSubmit={e=>{e.preventDefault();save();}}>
            <p role="status">Neuložené změny hodnoty.</p>
            <label>Název hodnoty<input required maxLength={255} value={draft.label} onChange={e=>setDraft({...draft,label:e.target.value})}/></label>
            <label>Kód hodnoty<input maxLength={255} value={draft.code??''} onChange={e=>setDraft({...draft,code:e.target.value||null})}/></label>
            <label>Nadřazená hodnota<select aria-label="Nadřazená hodnota" value={draft.parentId??''} onChange={e=>setDraft({...draft,parentId:e.target.value||null})}><option value="">Bez rodiče</option>
                {draft.parentId&&!rows.some(r=>r.id===draft.parentId)&&<option value={draft.parentId}>{draft.parentId} — současný rodič</option>}
                {rows.filter(v=>v.id!==server?.value.id).map(v=><option key={v.id} value={v.id}>{v.label}</option>)}</select></label>
            <label>Důvod změny<input required maxLength={1000} value={draft.reason} onChange={e=>setDraft({...draft,reason:e.target.value})}/></label>
            <button disabled={task.busy||conflict}>Uložit hodnotu</button><button type="button" disabled={task.busy} onClick={()=>{setEditing(false);setConflict(false);}}>Zrušit změny hodnoty</button>
            {conflict&&<><p>Hodnota se změnila. Draft zůstal zachován; zápis se neopakuje.</p><button type="button" disabled={task.busy} onClick={compare}>Porovnat hodnotu se serverem</button>
                {compared&&<button type="button" onClick={()=>{setTag(server!.etag);setConflict(false);}}>Potvrdit porovnání hodnoty</button>}</>}
        </form>}
    </section>;
}
