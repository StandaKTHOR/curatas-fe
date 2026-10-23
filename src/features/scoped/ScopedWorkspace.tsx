import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../components/AuthContext';
import { useCatalog } from '../catalog/CatalogContext';
import { errorText, scopedApi, type Item, type ScopedApi, type Versioned } from './scopedApi';
import { useTask } from './useTask';
import DimensionsPanel from './DimensionsPanel';
import MediaPanel from './MediaPanel';
import InventoryEvidencePanel from './InventoryEvidencePanel';
import NewItemForm from './NewItemForm';
import ItemOriginPanel from './ItemOriginPanel';
import './scoped.css';

export default function ScopedWorkspace() {
    const { token, logout, setToken } = useAuth(); const { selectedCatalog } = useCatalog();
    useEffect(() => {
        if (import.meta.env.VITE_SCOPED_WORKSPACE_ENABLED !== 'true') return;
        const changed = (event: StorageEvent) => { if (event.key === 'token') setToken(event.newValue); };
        window.addEventListener('storage', changed);
        return () => window.removeEventListener('storage', changed);
    }, [setToken]);
    if (import.meta.env.VITE_SCOPED_WORKSPACE_ENABLED !== 'true') return <p>Katalogová pracovní plocha není zapnuta.</p>;
    if (!token) return <p>Pro katalogovou pracovní plochu se <Link to="/login">přihlaste</Link>.</p>;
    if (!selectedCatalog) return <p>Vyberte katalog v horní nabídce.</p>;
    // Identity change removes old DOM/state synchronously; effect cleanup aborts requests and revokes blobs.
    return <CatalogItems key={`${token}:${selectedCatalog.id}:${selectedCatalog.capabilities?.join(',') ?? ''}`} catalogId={selectedCatalog.id} catalogName={selectedCatalog.name} token={token} onUnauthorized={logout}
        allowWrite={selectedCatalog.capabilities ? selectedCatalog.capabilities.includes('item.read') && selectedCatalog.capabilities.includes('item.write') : true}
        allowCreate={selectedCatalog.creationEnabled===true&&['catalog.read','item.read','item.create'].every(c=>selectedCatalog.capabilities?.includes(c))} />;
}
export function CatalogItems({ catalogId, catalogName, token, onUnauthorized, allowWrite=true, allowCreate=false }: { catalogId: number; catalogName: string; token: string; onUnauthorized: () => void; allowWrite?: boolean; allowCreate?: boolean }) {
    const api = useMemo(() => scopedApi(catalogId, token), [catalogId, token]);
    const [denied, setDenied] = useState(false); const [deniedStatus, setDeniedStatus] = useState(0); const [selected, setSelected] = useState<number | null>(null);
    const [rows, setRows] = useState<Item[]>([]); const [next, setNext] = useState<number | null>(null);
    const [creating,setCreating]=useState(false);
    const [query,setQuery]=useState({inventory:'',title:''});const [applied,setApplied]=useState({inventory:'',title:''});
    const fatal = useCallback((status: number) => { setDenied(true); setDeniedStatus(status); setRows([]); setNext(null); setSelected(null);setCreating(false); if (status === 401) onUnauthorized(); }, [onUnauthorized]);
    const task = useTask(fatal); const { run } = task;
    const load = useCallback((after = 0) => {
        setSelected(null); if (!after) { setRows([]); setNext(null); }
        void run(s => applied.inventory||applied.title?api.list(s,after,50,applied):api.list(s, after), page => { setDenied(false); setRows(old => after ? [...old, ...page.items] : page.items); setNext(page.nextAfterId); });
    }, [api, run,applied]);
    useEffect(() => { load(); }, [load]);
    return <article className="scoped-workspace" aria-label="Katalogová pracovní plocha">
        <h1>Katalogová pracovní plocha — {catalogName}</h1>
        <p>Samostatná práce s katalogově vlastněnými předměty. Historická globální evidence a její média sem nejsou převáděny.</p>
        <Link to="/scoped/dictionaries">Správa materiálů a technik</Link>
        {allowCreate&&!denied&&!creating&&<button type="button" onClick={()=>{setSelected(null);setCreating(true);}}>Nový předmět</button>}
        {allowCreate&&creating&&!denied&&<NewItemForm api={api} catalogName={catalogName} onFatal={fatal} onCancel={()=>setCreating(false)} onCreated={result=>{setCreating(false);setSelected(result.item.id);}}/>}
        <form aria-label="Vyhledání předmětů" onSubmit={e=>{e.preventDefault();setApplied({...query});}}>
            <label>Hledat inventární číslo<input maxLength={100} value={query.inventory} onChange={e=>setQuery({...query,inventory:e.target.value})}/></label>
            <label>Hledat název<input maxLength={100} value={query.title} onChange={e=>setQuery({...query,title:e.target.value})}/></label>
            <button disabled={task.busy}>Vyhledat předměty</button>
            <button type="button" disabled={task.busy} onClick={()=>{setQuery({inventory:'',title:''});setApplied({inventory:'',title:''});}}>Vymazat filtry</button>
            <p>Doslovná část aktuálního čísla a názvu; obě podmínky platí současně. Historické aliasy tímto filtrem neprohledáváte.</p>
        </form>
        <button type="button" disabled={task.busy} onClick={() => load()}>Obnovit předměty</button>
        {task.busy && <p role="status">Načítání předmětů…</p>}{task.error && <p role="alert">{task.error}</p>}
        {!task.busy && !task.error && rows.length === 0 && <p>V tomto katalogu nejsou dostupné předměty.</p>}
        {!denied && <><ul>{rows.map(row => <li key={row.id}><button type="button" onClick={() => setSelected(row.id)}>{row.title ?? 'Bez názvu'} — <span className="scoped-exact">{row.inventoryNumber}</span></button></li>)}</ul>
            {next !== null && <button type="button" disabled={task.busy} onClick={() => load(next)}>Další předměty</button>}
            {selected !== null && !creating && <ItemDetail key={selected} api={api} itemId={selected} onFatal={fatal} allowWrite={allowWrite} />}</>}
        {denied && <p role="alert">{errorText(deniedStatus)} Soukromý obsah byl uzavřen. Nový pokus vyžaduje obnovení předmětů.</p>}
    </article>;
}
function ItemDetail({ api, itemId, onFatal, allowWrite }: { api: ScopedApi; itemId: number; onFatal: (status: number) => void; allowWrite: boolean }) {
    const [server, setServer] = useState<Versioned<Item> | null>(null); const [unavailable, setUnavailable] = useState(false);
    const [editing, setEditing] = useState(false); const [editTag, setEditTag] = useState(''); const [draft, setDraft] = useState({ title: '', inventoryNumber: '' });
    const [conflict, setConflict] = useState(false); const [compared, setCompared] = useState(false);
    const task = useTask(onFatal); const { run } = task;
    const load = useCallback(() => {
        void run(s => api.detail(itemId, s), result => { setServer(result); setUnavailable(false); }, false, () => { setServer(null); setUnavailable(true); });
    }, [api, itemId, run]);
    useEffect(() => { load(); }, [load]);
    function save() {
        if (!server) return;
        void run(s => api.patch(itemId, editTag, draft, s), result => { setServer(result); setEditing(false); setConflict(false); }, true,
            () => { setConflict(true); setCompared(false); });
    }
    function compare() {
        void run(s => api.detail(itemId, s), result => { setServer(result); setCompared(true); }, false, () => { setUnavailable(true); setServer(null); });
    }
    return <section aria-label="Detail předmětu">
        <h2>Detail předmětu</h2>
        <button type="button" disabled={task.busy || editing} onClick={load}>Obnovit detail</button>
        {task.busy && <p role="status">Načítání detailu…</p>}{task.error && <p role="alert">{task.error}</p>}
        {unavailable && <p>Záznam není dostupný. Pro nový pokus obnovte detail.</p>}
        {server && !unavailable && <>
            <ItemOriginPanel key={`origin:${server.etag}`} api={api} itemId={itemId} onFatal={onFatal}/>
            <dl><dt>Název na serveru</dt><dd>{server.value.title}</dd><dt>Inventární číslo na serveru</dt><dd className="scoped-exact" data-testid="current-inventory">{server.value.inventoryNumber}</dd>
                <dt>Přírůstkové číslo</dt><dd className="scoped-exact">{server.value.accessionNumber}</dd><dt>ETag</dt><dd data-testid="item-etag">{server.etag}</dd></dl>
            <p>Dostupné: scalar detail, rozměry a nová soukromá média podle zapnutých funkcí. Zápis vyžaduje explicitní item.write; výběr katalogu jej neuděluje.</p>
            {!allowWrite && <p>Předmět je pouze pro čtení.</p>}
            {allowWrite && !editing && <button type="button" disabled={task.busy} onClick={() => { setDraft({ title: server.value.title ?? '', inventoryNumber: server.value.inventoryNumber ?? '' }); setEditTag(server.etag); setEditing(true); setConflict(false); setCompared(false); }}>Upravit předmět</button>}
            {editing && <form aria-label="Editor předmětu" onSubmit={e => { e.preventDefault(); save(); }}>
                <label>Název předmětu<input value={draft.title} maxLength={4096} required onChange={e => setDraft({ ...draft, title: e.target.value })} /></label>
                <label>Inventární číslo<input value={draft.inventoryNumber} maxLength={255} required onChange={e => setDraft({ ...draft, inventoryNumber: e.target.value })} /></label>
                <p>Text včetně mezer a úvodních nul se zachová beze změny.</p>
                <button disabled={task.busy || conflict}>Uložit předmět</button>
                <button type="button" disabled={task.busy} onClick={() => { setEditing(false); setConflict(false); }}>Zrušit editaci předmětu</button>
                {conflict && <div role="status"><p>Draft je zachován. Zápis se neopakuje automaticky.</p>
                    <button type="button" disabled={task.busy} onClick={compare}>Načíst server pro porovnání</button>
                    {compared && <button type="button" onClick={() => { setEditTag(server.etag); setConflict(false); }}>Potvrdit porovnání a použít nový ETag</button>}</div>}
            </form>}
            <DimensionsPanel api={api} itemId={itemId} onFatal={onFatal} onChanged={load} allowWrite={allowWrite} />
            <InventoryEvidencePanel key={server.etag} api={api} itemId={itemId} onFatal={onFatal} />
            <MediaPanel api={api} itemId={itemId} onFatal={onFatal} />
        </>}
    </section>;
}
