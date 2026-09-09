import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GovButton, GovFormInput, GovFormLabel } from '@gov-design-system-ce/react';
import { listPublicItems } from '../lib/api';

export default function Catalog() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // 1. Čtení stavu z URL vyhledávacích parametrů (synchronizace s URL)
    const page = parseInt(searchParams.get('page') || '0', 10);
    const q = searchParams.get('q') || '';
    const sort = searchParams.get('sort') || 'inventoryNumber,asc';
    const showAdvancedFromUrl = searchParams.get('advanced') === 'true';

    // Seznam všech podporovaných filtrů
    const filterKeys = [
        'accessionNumber', 'inventoryNumber', 'title', 'author', 'material',
        'datingFrom', 'datingTo', 'subCollection', 'objectType', 'originPlace',
        'technique', 'location', 'spravce'
    ];

    // Načteme filtry z URL
    const getFiltersFromUrl = () => {
        const f: Record<string, string> = {};
        filterKeys.forEach(key => {
            f[key] = searchParams.get(key) || '';
        });
        return f;
    };

    // Lokální stavy pro okamžitou odezvu v inputech (pro plynulé psaní)
    const [localSearch, setLocalSearch] = useState(q);
    const [localFilters, setLocalFilters] = useState<Record<string, string>>(getFiltersFromUrl);
    const [showAdvanced, setShowAdvanced] = useState(showAdvancedFromUrl);

    // Stavy pro data z API
    const [items, setItems] = useState<any[]>([]);
    const [totalElements, setTotalElements] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);

    // Abychom se vyhnuli inicializačnímu přepisování lokálních stavů z URL, synchronizujeme je pouze pokud se změní URL zvenčí
    useEffect(() => {
        setLocalSearch(q);
        setLocalFilters(getFiltersFromUrl());
    }, [searchParams]);

    // 2. Debounce efekt pro aktualizaci URL (parametrů vyhledávání)
    // Tímto se zajistí, že URL se zaktualizuje až po domluvené odmlce psaní
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            const nextParams = new URLSearchParams(searchParams);

            // Nastavení vyhledávání
            if (localSearch) nextParams.set('q', localSearch);
            else nextParams.delete('q');

            // Nastavení pokročilých filtrů
            Object.entries(localFilters).forEach(([key, value]) => {
                if (value) nextParams.set(key, value);
                else nextParams.delete(key);
            });

            // Nastavení zobrazení pokročilého panelu
            if (showAdvanced) nextParams.set('advanced', 'true');
            else nextParams.delete('advanced');

            // Při jakékoli změně filtrů nebo vyhledávání skočíme na nultou stránku
            const hasFilterChanged =
                q !== (localSearch || '') ||
                Object.keys(localFilters).some(key => (searchParams.get(key) || '') !== localFilters[key]);

            if (hasFilterChanged) {
                nextParams.set('page', '0');
            }

            // Aktualizujeme URL parametry, pokud se liší od nynějších
            if (nextParams.toString() !== searchParams.toString()) {
                setSearchParams(nextParams, { replace: true });
            }
        }, 400);

        return () => clearTimeout(delayDebounceFn);
    }, [localSearch, localFilters, showAdvanced]);

    // 3. Spuštění samotného dotazu na backend při jakékoli změně v URL (page, q, sort, filtry)
    useEffect(() => {
        setLoading(true);
        const activeFilters = getFiltersFromUrl();

        listPublicItems({
            q: q || undefined,
            page,
            size: 50, // High-density: zobrazení 50 řádků na stránku
            sort: sort || undefined,
            ...activeFilters
        })
        .then(data => {
            setItems(data.content || []);
            setTotalElements(data.totalElements || 0);
            setTotalPages(data.totalPages || 1);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }, [searchParams, page, q, sort]);

    // Změna jednoho pokročilého filtru
    const handleFilterChange = (key: string, value: string) => {
        setLocalFilters(prev => ({ ...prev, [key]: value }));
    };

    // Vynulování všech vyhledávacích parametrů
    const resetFilters = () => {
        setLocalSearch('');
        const emptyFilters: Record<string, string> = {};
        filterKeys.forEach(key => { emptyFilters[key] = ''; });
        setLocalFilters(emptyFilters);
        setShowAdvanced(false);

        const newParams = new URLSearchParams();
        newParams.set('page', '0');
        newParams.set('sort', 'inventoryNumber,asc');
        setSearchParams(newParams, { replace: true });
    };

    // Změna řazení (kliknutím na hlavičku sloupce)
    const handleSort = (field: string) => {
        const nextParams = new URLSearchParams(searchParams);
        const [currentField, currentDir] = sort.split(',');

        let nextDir = 'asc';
        if (currentField === field && currentDir === 'asc') {
            nextDir = 'desc';
        }

        nextParams.set('sort', `${field},${nextDir}`);
        nextParams.set('page', '0'); // Přejít na první stranu při změně řazení
        setSearchParams(nextParams, { replace: true });
    };

    // Navigace na konkrétní stránku
    const handlePageChange = (targetPage: number) => {
        if (targetPage < 0 || targetPage >= totalPages) return;
        const nextParams = new URLSearchParams(searchParams);
        nextParams.set('page', targetPage.toString());
        setSearchParams(nextParams);
    };

    // Pomocná funkce pro zobrazení ikonky řazení v hlavičce sloupce
    const renderSortIndicator = (field: string) => {
        const [currentField, currentDir] = sort.split(',');
        if (currentField !== field) return <span className="text-gray-300 ml-1">⇅</span>;
        return currentDir === 'asc' ? <span className="text-[#00204a] font-bold ml-1">▲</span> : <span className="text-[#00204a] font-bold ml-1">▼</span>;
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300 pb-12">

            {/* HLAVIČKA KATALOGU */}
            <div className="border-b border-gray-200 pb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Katalog sbírek (Host)</h2>
                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mt-1">Moravské zemské muzeum • Badatelský přístup k databázi</p>
                </div>
                <div className="bg-white px-4 py-2 border border-gray-200 rounded text-right shadow-sm">
                    <span className="text-2xl font-black text-gray-800 block leading-none">{totalElements.toLocaleString('cs-CZ')}</span>
                    <span className="text-[9px] text-gray-400 uppercase font-bold tracking-wider block mt-1">Celkem nalezeno</span>
                </div>
            </div>

            {/* VYHLEDÁVÁNÍ & FILTR PANEL */}
            <div className="bg-white p-5 rounded border border-gray-200 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 space-y-1">
                        <GovFormLabel htmlFor="q">Rychlé fulltextové vyhledávání</GovFormLabel>
                        <GovFormInput
                            id="q"
                            placeholder="Název, autor, inventární nebo přírůstkové číslo..."
                            value={localSearch}
                            onChange={(e: any) => setLocalSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                        <GovButton
                            type={showAdvanced ? "solid" : "outlined"}
                            color="primary"
                            onClick={() => setShowAdvanced(!showAdvanced)}
                        >
                            {showAdvanced ? 'Skrýt pokročilé' : 'Pokročilé filtry'}
                        </GovButton>
                        <GovButton
                            type="outlined"
                            color="neutral"
                            onClick={resetFilters}
                        >
                            Vyčistit filtry
                        </GovButton>
                    </div>
                </div>

                {/* ADVANCED FILTER PANEL - Parita s DEMUS / MS Access databází */}
                {showAdvanced && (
                    <div className="pt-5 border-t border-dashed border-gray-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 animate-in slide-in-from-top-4 duration-400">
                        <div className="space-y-1">
                            <GovFormLabel htmlFor="accessionNumber">Přírůstkové číslo</GovFormLabel>
                            <GovFormInput id="accessionNumber" value={localFilters.accessionNumber} onChange={(e: any) => handleFilterChange('accessionNumber', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <GovFormLabel htmlFor="inventoryNumber">Inventární číslo</GovFormLabel>
                            <GovFormInput id="inventoryNumber" value={localFilters.inventoryNumber} onChange={(e: any) => handleFilterChange('inventoryNumber', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <GovFormLabel htmlFor="title">Název předmětu</GovFormLabel>
                            <GovFormInput id="title" value={localFilters.title} onChange={(e: any) => handleFilterChange('title', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <GovFormLabel htmlFor="author">Původce / Autor</GovFormLabel>
                            <GovFormInput id="author" value={localFilters.author} onChange={(e: any) => handleFilterChange('author', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <GovFormLabel htmlFor="material">Materiál</GovFormLabel>
                            <GovFormInput id="material" value={localFilters.material} onChange={(e: any) => handleFilterChange('material', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <GovFormLabel htmlFor="technique">Technika</GovFormLabel>
                            <GovFormInput id="technique" value={localFilters.technique} onChange={(e: any) => handleFilterChange('technique', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <GovFormLabel htmlFor="subCollection">Fond / Podsbírka</GovFormLabel>
                            <GovFormInput id="subCollection" value={localFilters.subCollection} onChange={(e: any) => handleFilterChange('subCollection', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <GovFormLabel htmlFor="objectType">Skupina předmětů</GovFormLabel>
                            <GovFormInput id="objectType" value={localFilters.objectType} onChange={(e: any) => handleFilterChange('objectType', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <GovFormLabel htmlFor="originPlace">Místo vzniku</GovFormLabel>
                            <GovFormInput id="originPlace" value={localFilters.originPlace} onChange={(e: any) => handleFilterChange('originPlace', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <GovFormLabel htmlFor="location">Depozitář (Umístění)</GovFormLabel>
                            <GovFormInput id="location" value={localFilters.location} onChange={(e: any) => handleFilterChange('location', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <GovFormLabel htmlFor="datingFrom">Rok od</GovFormLabel>
                            <GovFormInput id="datingFrom" type="number" value={localFilters.datingFrom} onChange={(e: any) => handleFilterChange('datingFrom', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <GovFormLabel htmlFor="datingTo">Rok do</GovFormLabel>
                            <GovFormInput id="datingTo" type="number" value={localFilters.datingTo} onChange={(e: any) => handleFilterChange('datingTo', e.target.value)} />
                        </div>
                    </div>
                )}
            </div>

            {/* AKTIVNÍ FILTRY INDIKÁTORY */}
            {(q || filterKeys.some(k => localFilters[k])) && (
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-gray-500 bg-gray-50 p-3 rounded border border-gray-200">
                    <span>Aktivní vyhledávací kritéria:</span>
                    {q && <span className="bg-[#00204a]/10 text-[#00204a] px-2 py-0.5 rounded flex items-center gap-1">Fulltext: "{q}"</span>}
                    {filterKeys.map(key => {
                        const val = localFilters[key];
                        if (!val) return null;
                        return (
                            <span key={key} className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded flex items-center gap-1">
                                {key}: "{val}"
                            </span>
                        );
                    })}
                </div>
            )}

            {/* DATATABLE - VYSOKÁ HUSTOTA ZÁZNAMŮ (High-Density Desktop Layout) */}
            <div className="bg-white rounded border border-gray-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-20 text-center flex flex-col items-center justify-center space-y-4">
                        <span className="text-3xl animate-spin">⏳</span>
                        <p className="italic text-gray-500 font-medium">Načítám badatelský sbírkový katalog...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-gray-100 border-b border-gray-200 text-[#00204a] font-extrabold uppercase select-none">
                                    <th scope="col" className="p-3 cursor-pointer hover:bg-gray-200" onClick={() => handleSort('inventoryNumber')}>
                                        Inventární č. {renderSortIndicator('inventoryNumber')}
                                    </th>
                                    <th scope="col" className="p-3 cursor-pointer hover:bg-gray-200" onClick={() => handleSort('accessionNumber')}>
                                        Přírůstkové č. {renderSortIndicator('accessionNumber')}
                                    </th>
                                    <th scope="col" className="p-3 cursor-pointer hover:bg-gray-200" onClick={() => handleSort('title')}>
                                        Název sbírkového předmětu {renderSortIndicator('title')}
                                    </th>
                                    <th scope="col" className="p-3 cursor-pointer hover:bg-gray-200" onClick={() => handleSort('author')}>
                                        Autor / Původce {renderSortIndicator('author')}
                                    </th>
                                    <th scope="col" className="p-3 cursor-pointer hover:bg-gray-200" onClick={() => handleSort('datingText')}>
                                        Datování {renderSortIndicator('datingText')}
                                    </th>
                                    <th scope="col" className="p-3 cursor-pointer hover:bg-gray-200" onClick={() => handleSort('material')}>
                                        Materiál {renderSortIndicator('material')}
                                    </th>
                                    <th scope="col" className="p-3 cursor-pointer hover:bg-gray-200" onClick={() => handleSort('subCollection')}>
                                        Podsbírka {renderSortIndicator('subCollection')}
                                    </th>
                                    <th scope="col" className="p-3 cursor-pointer hover:bg-gray-200" onClick={() => handleSort('locationBuilding')}>
                                        Umístění {renderSortIndicator('locationBuilding')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-gray-700">
                                {items.length > 0 ? items.map((it) => (
                                    <tr
                                        key={it.id}
                                        className="hover:bg-blue-50/50 cursor-pointer border-b last:border-0 transition-colors"
                                        onClick={() => navigate(`/items/${it.id}`)}
                                        tabIndex={0}
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/items/${it.id}`); } }}
                                        role="link"
                                        aria-label={`Otevřít předmět ${it.title}`}
                                    >
                                        <td className="p-3 font-mono font-black text-blue-800 break-all">{it.inventoryNumber || '—'}</td>
                                        <td className="p-3 font-mono font-semibold text-gray-500 break-all">{it.accessionNumber || '—'}</td>
                                        <td className="p-3 font-bold text-gray-900 break-words">{it.title}</td>
                                        <td className="p-3 italic text-gray-600 break-words">{it.author || 'Anonymní'}</td>
                                        <td className="p-3 text-gray-600">{it.datingText || '—'}</td>
                                        <td className="p-3 text-gray-600">{it.material || '—'}</td>
                                        <td className="p-3 text-gray-500">{it.subCollection || '—'}</td>
                                        <td className="p-3 text-gray-500 break-words">
                                            {it.locationBuilding ? `${it.locationBuilding}${it.locationRoom ? `, m. ${it.locationRoom}` : ''}` : '—'}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={8} className="p-16 text-center text-gray-500">
                                            <span className="text-4xl block mb-2">🔍</span>
                                            <p className="italic font-semibold text-sm">Žádný sbírkový předmět neodpovídá zadaným filtrům.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* STRÁNKOVÁNÍ (PAGINATION) - Kompatibilní s Spring Boot Pageable */}
            <div className="flex flex-col sm:flex-row justify-between items-center bg-gray-50 border border-gray-200 p-4 rounded shadow-sm gap-4">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Zobrazeno {(items.length).toLocaleString('cs-CZ')} z {(totalElements).toLocaleString('cs-CZ')} položek (strana {page + 1} z {totalPages})
                </span>
                <div className="flex gap-2">
                    <GovButton
                        type="outlined"
                        color="neutral"
                        size="s"
                        disabled={page === 0 || loading}
                        onClick={() => handlePageChange(page - 1)}
                    >
                        Předchozí
                    </GovButton>
                    <div className="flex items-center px-4">
                        <span className="text-xs font-black text-gray-800 font-mono">
                            {page + 1} / {totalPages}
                        </span>
                    </div>
                    <GovButton
                        type="outlined"
                        color="neutral"
                        size="s"
                        disabled={page + 1 >= totalPages || loading}
                        onClick={() => handlePageChange(page + 1)}
                    >
                        Další
                    </GovButton>
                </div>
            </div>

        </div>
    );
}
