import { useCatalog } from './CatalogContext';

export default function CatalogSelector() {
    const { catalogs, selectedCatalog, loading, error, hasMore, selectCatalog, reload, loadMore } = useCatalog();
    const workspaceMode = import.meta.env.VITE_SCOPED_WORKSPACE_ENABLED === 'true';
    const accessName = (type: string | undefined) => type === 'OWN' ? 'Vlastní evidence' : type === 'SHARED' ? 'Sdílená evidence' : 'Správce nedoložen';
    return <section aria-label="Dostupné katalogy" className="demus-catalog-context">
        <label htmlFor="catalog-context">{workspaceMode ? 'Pracovní databáze: ' : 'Katalog: '}</label>
        <select id="catalog-context" value={selectedCatalog?.id ?? ''} disabled={loading}
            onChange={event => void selectCatalog(event.target.value ? Number(event.target.value) : null)}>
            <option value="">Vyberte katalog</option>
            {workspaceMode ? ['OWN','SHARED','UNCLASSIFIED'].map(type=><optgroup key={type} label={accessName(type)}>
                {catalogs.filter(c=>(c.accessType ?? 'UNCLASSIFIED')===type).map(c=><option key={c.id} value={c.id}>{c.institution.name} — {c.name} ({c.code})</option>)}
            </optgroup>) : catalogs.map(c => <option key={c.id} value={c.id}>{c.institution.name} — {c.name} ({c.code})</option>)}
        </select>
        <button type="button" disabled={loading} onClick={() => void reload()}>Obnovit katalogy</button>
        {hasMore && <button type="button" disabled={loading} onClick={() => void loadMore()}>Další katalogy</button>}
        {loading && <span role="status">Načítání katalogů…</span>}
        {!loading && !error && catalogs.length === 0 && <span>Nemáte přidělený žádný katalog.</span>}
        {error && <p role="alert">{error}</p>}
        {selectedCatalog && <p role="status">Vybrán katalog {selectedCatalog.name}.</p>}
        {workspaceMode && selectedCatalog && <p data-testid="workspace-access">{accessName(selectedCatalog.accessType)} — {selectedCatalog.capabilities?.includes('item.read') ? selectedCatalog.capabilities.includes('item.write') ? 'Čtení a editace předmětů' : 'Předměty pouze pro čtení' : 'Bez čtení předmětů'}; číselníky: {selectedCatalog.capabilities?.includes('dictionary.read') ? selectedCatalog.capabilities.includes('dictionary.write') ? 'čtení a editace' : 'pouze čtení' : 'nepřístupné'}.</p>}
        <p>Výběr platí pro katalogovou pracovní plochu. Globální historická evidence pracuje samostatně.</p>
    </section>;
}
