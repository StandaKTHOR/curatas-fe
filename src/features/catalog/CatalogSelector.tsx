import { useCatalog } from './CatalogContext';

export default function CatalogSelector() {
    const { catalogs, selectedCatalog, loading, error, hasMore, selectCatalog, reload, loadMore } = useCatalog();
    return <section aria-label="Dostupné katalogy" className="demus-catalog-context">
        <label htmlFor="catalog-context">Katalog: </label>
        <select id="catalog-context" value={selectedCatalog?.id ?? ''} disabled={loading}
            onChange={event => void selectCatalog(event.target.value ? Number(event.target.value) : null)}>
            <option value="">Vyberte katalog</option>
            {catalogs.map(c => <option key={c.id} value={c.id}>{c.institution.name} — {c.name} ({c.code})</option>)}
        </select>
        <button type="button" disabled={loading} onClick={() => void reload()}>Obnovit katalogy</button>
        {hasMore && <button type="button" disabled={loading} onClick={() => void loadMore()}>Další katalogy</button>}
        {loading && <span role="status">Načítání katalogů…</span>}
        {!loading && !error && catalogs.length === 0 && <span>Nemáte přidělený žádný katalog.</span>}
        {error && <p role="alert">{error}</p>}
        {selectedCatalog && <p role="status">Vybrán katalog {selectedCatalog.name}.</p>}
        <p>Výběr katalogu je připraven pro nové katalogové funkce. Stávající evidence předmětů pracuje samostatně.</p>
    </section>;
}
