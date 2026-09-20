import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GovButton, GovFormInput, GovFormLabel } from '@gov-design-system-ce/react';
import { listPublicItems, listWorksets, WorksetSummary } from '../lib/api';
import { useAuth } from '../components/AuthContext';
import ColumnSelectorModal, { DEFAULT_COLUMNS, ColumnConfig } from '../components/ColumnSelectorModal';
import WorksetModal from '../components/WorksetModal';
import SafeImage from '../components/SafeImage';

export default function Catalog() {
    const navigate = useNavigate();
    const auth = useAuth();
    const token = auth?.token || null;
    const [searchParams, setSearchParams] = useSearchParams();

    // 1. Čtení stavu z URL vyhledávacích parametrů (synchronizace s URL)
    const page = parseInt(searchParams.get('page') || '0', 10);
    const q = searchParams.get('q') || '';
    const sort = searchParams.get('sort') || 'inventoryNumber,asc';
    const showAdvancedFromUrl = searchParams.get('advanced') === 'true';
    const worksetIdFromUrl = searchParams.get('worksetId') || '';

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

    // Konfigurace sloupců (uložena v localStorage)
    const [columns, setColumns] = useState<ColumnConfig[]>(() => {
        try {
            const saved = localStorage.getItem('curatas_catalog_columns');
            if (saved) return JSON.parse(saved);
        } catch (e) { /* ignore */ }
        return DEFAULT_COLUMNS;
    });
    const [showColModal, setShowColModal] = useState(false);
    const [compactView, setCompactView] = useState(true);

    // Výběr položek a pracovní sady
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [allFilteredSelected, setAllFilteredSelected] = useState(false);
    const [showWorksetModal, setShowWorksetModal] = useState(false);
    const [worksets, setWorksets] = useState<WorksetSummary[]>([]);
    const [selectedWorkset, setSelectedWorkset] = useState(worksetIdFromUrl);

    // Načtení pracovních sad uživatele (pokud je přihlášen)
    useEffect(() => {
        if (token) {
            listWorksets().then(setWorksets).catch(() => {});
        }
    }, [token]);

    // Abychom se vyhnuli inicializačnímu přepisování lokálních stavů z URL, synchronizujeme je pouze pokud se změní URL zvenčí
    useEffect(() => {
        setLocalSearch(q);
        setLocalFilters(getFiltersFromUrl());
        setSelectedWorkset(searchParams.get('worksetId') || '');
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

        const queryParams: any = {
            q: q || undefined,
            page,
            size: 50, // High-density: zobrazení 50 řádků na stránku
            sort: sort || undefined,
            ...activeFilters
        };

        const activeWorkset = searchParams.get('worksetId');
        if (activeWorkset) {
            queryParams.worksetId = activeWorkset;
        }

        listPublicItems(queryParams)
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
        setSelectedWorkset('');
        setSelectedIds([]);
        setAllFilteredSelected(false);

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

    const handleSaveColumns = (newCols: ColumnConfig[]) => {
        setColumns(newCols);
        try {
            localStorage.setItem('curatas_catalog_columns', JSON.stringify(newCols));
        } catch (e) {}
    };

    // Výběr řádků
    const toggleSelectItem = (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const toggleSelectAllPage = () => {
        const pageIds = items.map(it => Number(it.id));
        const allOnPageSelected = pageIds.every(id => selectedIds.includes(id));

        if (allOnPageSelected) {
            setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
            setAllFilteredSelected(false);
        } else {
            setSelectedIds(prev => Array.from(new Set([...prev, ...pageIds])));
        }
    };

    const isColVisible = (colId: string) => {
        const c = columns.find(x => x.id === colId);
        return c ? c.visible : false;
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300 pb-20">

            {/* HLAVIČKA KATALOGU */}
            <div className="border-b border-gray-200 pb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Katalog sbírek (Host)</h2>
                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mt-1">
                        Moravské zemské muzeum • Badatelský přístup k databázi
                    </p>
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

            {/* LIŠTA POHLEDU & PRACOVNÍ SADY */}
            <div className="flex flex-wrap justify-between items-center gap-3 bg-gray-50 p-3 rounded border border-gray-200">
                <div className="flex items-center gap-3">
                    {/* FILTROVÁNÍ PODLE PRACOVNÍ SADY */}
                    {token && worksets.length > 0 && (
                        <div className="flex items-center gap-2 text-xs">
                            <span className="font-bold text-gray-500 uppercase tracking-wider">Pracovní sada:</span>
                            <select
                                value={selectedWorkset}
                                onChange={e => setSelectedWorkset(e.target.value)}
                                className="text-xs font-semibold bg-white border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-[#00204a]"
                            >
                                <option value="">— Celá sbírka —</option>
                                {worksets.map(ws => (
                                    <option key={ws.id} value={ws.id}>
                                        {ws.name} ({ws.itemCount} položek)
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {/* PŘEPÍNAČ KOMPAKTNÍHO ZOBRAZENÍ */}
                    <button
                        type="button"
                        onClick={() => setCompactView(!compactView)}
                        className={`text-xs font-bold px-2.5 py-1 rounded border transition-colors ${
                            compactView ? 'bg-gray-200 text-gray-800 border-gray-300' : 'bg-white text-gray-600 border-gray-200'
                        }`}
                        title="Přepnout hustotu tabulky (kompaktní / pohodlné)"
                    >
                        {compactView ? '☰ Kompaktní' : '☲ Pohodlné'}
                    </button>

                    {/* TLAČÍTKO NASTAVENÍ SLOUPCŮ */}
                    <button
                        type="button"
                        onClick={() => setShowColModal(true)}
                        className="text-xs font-bold px-3 py-1 bg-white hover:bg-gray-100 text-[#00204a] border border-gray-300 rounded flex items-center gap-1.5 shadow-sm"
                        title="Vybrat a uspořádat sloupce tabulky"
                        aria-label="Nastavení sloupců"
                    >
                        <span>⚙️</span>
                        <span>Sloupce</span>
                    </button>
                </div>
            </div>

            {/* AKTIVNÍ FILTRY INDIKÁTORY */}
            {(q || selectedWorkset || filterKeys.some(k => localFilters[k])) && (
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-gray-500 bg-gray-50 p-3 rounded border border-gray-200">
                    <span>Aktivní vyhledávací kritéria:</span>
                    {q && <span className="bg-[#00204a]/10 text-[#00204a] px-2 py-0.5 rounded flex items-center gap-1">Fulltext: "{q}"</span>}
                    {selectedWorkset && (
                        <span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded flex items-center gap-1">
                            Sada: {worksets.find(w => w.id === selectedWorkset)?.name || selectedWorkset}
                        </span>
                    )}
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
                                    <th scope="col" className="p-3 w-10 text-center">
                                        <input
                                            type="checkbox"
                                            checked={items.length > 0 && items.every(it => selectedIds.includes(Number(it.id)))}
                                            onChange={toggleSelectAllPage}
                                            className="rounded border-gray-300 text-[#00204a] focus:ring-[#00204a] cursor-pointer"
                                            aria-label="Označit všechny položky na stránce"
                                        />
                                    </th>

                                    {isColVisible('primaryImageUrl') && (
                                        <th scope="col" className="p-3 w-14 text-center">Foto</th>
                                    )}
                                    {isColVisible('inventoryNumber') && (
                                        <th scope="col" className="p-3 cursor-pointer hover:bg-gray-200" onClick={() => handleSort('inventoryNumber')}>
                                            Inventární č. {renderSortIndicator('inventoryNumber')}
                                        </th>
                                    )}
                                    {isColVisible('accessionNumber') && (
                                        <th scope="col" className="p-3 cursor-pointer hover:bg-gray-200" onClick={() => handleSort('accessionNumber')}>
                                            Přírůstkové č. {renderSortIndicator('accessionNumber')}
                                        </th>
                                    )}
                                    {isColVisible('title') && (
                                        <th scope="col" className="p-3 cursor-pointer hover:bg-gray-200" onClick={() => handleSort('title')}>
                                            Název sbírkového předmětu {renderSortIndicator('title')}
                                        </th>
                                    )}
                                    {isColVisible('author') && (
                                        <th scope="col" className="p-3 cursor-pointer hover:bg-gray-200" onClick={() => handleSort('author')}>
                                            Autor / Původce {renderSortIndicator('author')}
                                        </th>
                                    )}
                                    {isColVisible('datingText') && (
                                        <th scope="col" className="p-3 cursor-pointer hover:bg-gray-200" onClick={() => handleSort('datingText')}>
                                            Datování {renderSortIndicator('datingText')}
                                        </th>
                                    )}
                                    {isColVisible('material') && (
                                        <th scope="col" className="p-3 cursor-pointer hover:bg-gray-200" onClick={() => handleSort('material')}>
                                            Materiál {renderSortIndicator('material')}
                                        </th>
                                    )}
                                    {isColVisible('technique') && (
                                        <th scope="col" className="p-3 cursor-pointer hover:bg-gray-200" onClick={() => handleSort('technique')}>
                                            Technika {renderSortIndicator('technique')}
                                        </th>
                                    )}
                                    {isColVisible('subCollection') && (
                                        <th scope="col" className="p-3 cursor-pointer hover:bg-gray-200" onClick={() => handleSort('subCollection')}>
                                            Podsbírka {renderSortIndicator('subCollection')}
                                        </th>
                                    )}
                                    {isColVisible('locationBuilding') && (
                                        <th scope="col" className="p-3 cursor-pointer hover:bg-gray-200" onClick={() => handleSort('locationBuilding')}>
                                            Umístění {renderSortIndicator('locationBuilding')}
                                        </th>
                                    )}
                                    {isColVisible('spravce') && (
                                        <th scope="col" className="p-3 cursor-pointer hover:bg-gray-200" onClick={() => handleSort('spravce')}>
                                            Správce {renderSortIndicator('spravce')}
                                        </th>
                                    )}
                                    {isColVisible('objectCondition') && (
                                        <th scope="col" className="p-3 cursor-pointer hover:bg-gray-200" onClick={() => handleSort('objectCondition')}>
                                            Stav {renderSortIndicator('objectCondition')}
                                        </th>
                                    )}
                                    {isColVisible('weight') && (
                                        <th scope="col" className="p-3">Hmotnost</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-gray-700">
                                {items.length > 0 ? items.map((it) => {
                                    const isSelected = selectedIds.includes(Number(it.id));
                                    const rowPad = compactView ? 'py-1.5 px-3' : 'py-3 px-3';

                                    return (
                                        <tr
                                            key={it.id}
                                            className={`hover:bg-blue-50/50 cursor-pointer border-b last:border-0 transition-colors ${
                                                isSelected ? 'bg-blue-50/70 font-semibold' : ''
                                            }`}
                                            onClick={() => navigate(`/items/${it.id}`)}
                                            tabIndex={0}
                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/items/${it.id}`); } }}
                                            role="link"
                                            aria-label={`Otevřít předmět ${it.title}`}
                                        >
                                            <td className={`${rowPad} text-center`} onClick={e => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={e => toggleSelectItem(Number(it.id), e as any)}
                                                    className="rounded border-gray-300 text-[#00204a] focus:ring-[#00204a] cursor-pointer"
                                                    aria-label={`Vybrat položku ${it.inventoryNumber || it.id}`}
                                                />
                                            </td>

                                            {isColVisible('primaryImageUrl') && (
                                                <td className={`${rowPad} text-center`}>
                                                    <div className="w-9 h-9 rounded border bg-gray-50 overflow-hidden mx-auto flex items-center justify-center">
                                                        <SafeImage src={it.primaryImageUrl} alt={it.title} className="w-full h-full object-cover" />
                                                    </div>
                                                </td>
                                            )}

                                            {isColVisible('inventoryNumber') && (
                                                <td className={`${rowPad} font-mono font-black text-blue-800 break-all`}>{it.inventoryNumber || '—'}</td>
                                            )}
                                            {isColVisible('accessionNumber') && (
                                                <td className={`${rowPad} font-mono font-semibold text-gray-500 break-all`}>{it.accessionNumber || '—'}</td>
                                            )}
                                            {isColVisible('title') && (
                                                <td className={`${rowPad} font-bold text-gray-900 break-words`}>{it.title}</td>
                                            )}
                                            {isColVisible('author') && (
                                                <td className={`${rowPad} italic text-gray-600 break-words`}>{it.author || 'Anonymní'}</td>
                                            )}
                                            {isColVisible('datingText') && (
                                                <td className={`${rowPad} text-gray-600`}>{it.datingText || '—'}</td>
                                            )}
                                            {isColVisible('material') && (
                                                <td className={`${rowPad} text-gray-600`}>{it.material || '—'}</td>
                                            )}
                                            {isColVisible('technique') && (
                                                <td className={`${rowPad} text-gray-600`}>{it.technique || '—'}</td>
                                            )}
                                            {isColVisible('subCollection') && (
                                                <td className={`${rowPad} text-gray-500`}>{it.subCollection || '—'}</td>
                                            )}
                                            {isColVisible('locationBuilding') && (
                                                <td className={`${rowPad} text-gray-500 break-words`}>
                                                    {it.locationBuilding ? `${it.locationBuilding}${it.locationRoom ? `, m. ${it.locationRoom}` : ''}` : '—'}
                                                </td>
                                            )}
                                            {isColVisible('spravce') && (
                                                <td className={`${rowPad} text-gray-500`}>{it.spravce || '—'}</td>
                                            )}
                                            {isColVisible('objectCondition') && (
                                                <td className={`${rowPad} text-gray-500`}>
                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                                        it.objectCondition === 'Výborný' ? 'bg-green-100 text-green-800' :
                                                        it.objectCondition === 'Špatný' ? 'bg-red-100 text-red-800' :
                                                        'bg-gray-100 text-gray-700'
                                                    }`}>
                                                        {it.objectCondition || '—'}
                                                    </span>
                                                </td>
                                            )}
                                            {isColVisible('weight') && (
                                                <td className={`${rowPad} text-gray-500`}>{it.weight ? `${it.weight} kg` : '—'}</td>
                                            )}
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan={columns.filter(c => c.visible).length + 1} className="p-16 text-center text-gray-500">
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

            {/* PLOVOUCÍ LIŠTA PRACOVNÍHO VÝBĚRU (SELECTION TOOLBAR) */}
            {selectedIds.length > 0 && (
                <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-[#00204a] text-white px-6 py-3 rounded-full shadow-2xl z-[9000] flex items-center gap-4 border border-blue-400/30 animate-in slide-in-from-bottom-5 duration-300">
                    <div className="flex items-center gap-2 text-xs font-bold">
                        <span className="bg-[#ffbc34] text-black w-6 h-6 rounded-full flex items-center justify-center font-black">
                            {selectedIds.length}
                        </span>
                        <span>vybráno položek</span>
                    </div>

                    <div className="h-4 w-px bg-white/20" />

                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleSelectAllPage}
                            className="text-xs text-blue-200 hover:text-white underline font-semibold"
                        >
                            Vše na stránce
                        </button>

                        <button
                            onClick={() => {
                                setAllFilteredSelected(true);
                                setShowWorksetModal(true);
                            }}
                            className="text-xs text-blue-200 hover:text-white underline font-semibold"
                        >
                            Vše z filtru ({totalElements})
                        </button>
                    </div>

                    <div className="h-4 w-px bg-white/20" />

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                setAllFilteredSelected(false);
                                setShowWorksetModal(true);
                            }}
                            className="px-3 py-1 bg-[#ffbc34] text-black font-extrabold text-xs uppercase rounded hover:bg-yellow-400 transition-colors shadow"
                        >
                            Uložit do sady
                        </button>

                        <button
                            onClick={() => setSelectedIds([])}
                            className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase rounded transition-colors"
                        >
                            Zrušit
                        </button>
                    </div>
                </div>
            )}

            {/* MODÁL NASTAVENÍ SLOUPCŮ */}
            <ColumnSelectorModal
                isOpen={showColModal}
                columns={columns}
                onSave={handleSaveColumns}
                onClose={() => setShowColModal(false)}
            />

            {/* MODÁL PRO PRACOVNÍ SADU */}
            <WorksetModal
                isOpen={showWorksetModal}
                selectedIds={selectedIds}
                currentFilter={allFilteredSelected ? getFiltersFromUrl() : undefined}
                fromFilter={allFilteredSelected}
                onClose={() => setShowWorksetModal(false)}
                onSuccess={(newWs) => {
                    setWorksets(prev => [newWs, ...prev]);
                    setSelectedIds([]);
                    setAllFilteredSelected(false);
                }}
            />

        </div>
    );
}
