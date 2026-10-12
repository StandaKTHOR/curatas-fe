import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import {
    listAdminItems,
    exportItemsToExcel,
    bulkCopyItem,
    fetchLabelData,
    listWorksets,
    searchPrintItems,
    WorksetSummary
} from '../lib/api'
import { FaEdit, FaTrash, FaPrint, FaCopy, FaFileExcel, FaPlus, FaSearch, FaFilter, FaIdCard, FaLayerGroup } from 'react-icons/fa'
import { printLabels } from "@/components/LabelPrinter";
import DeaccessionModal from '@/components/DeaccessionModal';
import SelectiveCloneModal from '@/components/SelectiveCloneModal';
import WorksetModal from '@/components/WorksetModal';
import MuseumCardPrint from '@/components/MuseumCardPrint';
import ItemListPrint from '@/components/ItemListPrint';
import AdvancedFilterBuilder, { FilterGroup, createEmptyGroup } from '@/components/AdvancedFilterBuilder';

export default function AdminItems() {
    const [data, setData] = useState<any>(null);
    const [loadError, setLoadError] = useState('');
    const [exporting, setExporting] = useState(false);
    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();

    const [page, setPage] = useState<number>(() => {
        const p = searchParams.get('page');
        return p !== null ? Math.max(0, parseInt(p, 10)) : 0;
    });
    const [searchTerm, setSearchTerm] = useState<string>(() => searchParams.get('q') || '');
    const [sortField, setSortField] = useState<string>(() => searchParams.get('sortField') || 'createdAt');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(() => (searchParams.get('sortDirection') as 'asc' | 'desc') || 'desc');
    const [selectedWorkset, setSelectedWorkset] = useState<string>(() => searchParams.get('worksetId') || '');

    const [showAdvanced, setShowAdvanced] = useState(false);
    const [showAdvancedBuilder, setShowAdvancedBuilder] = useState(false);
    const [advancedFilterGroup, setAdvancedFilterGroup] = useState<FilterGroup>(() => { try { return JSON.parse(searchParams.get('advancedFilter') || 'null') || createEmptyGroup('AND'); } catch { return createEmptyGroup('AND'); } });
    const [isAdvancedFilterActive, setIsAdvancedFilterActive] = useState(!!searchParams.get('advancedFilter'));
    const [listPrintModal, setListPrintModal] = useState<{
        isOpen: boolean;
        mode: 'list' | 'cards';
        items: any[];
        totalCount?: number;
    }>({
        isOpen: false,
        mode: 'list',
        items: [],
        totalCount: undefined
    });
    const [isPrintLoading, setIsPrintLoading] = useState(false);
    const navigate = useNavigate();

    // --- STAVY PRO PRACOVNÍ SADY & VÝBĚR ---
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [worksets, setWorksets] = useState<WorksetSummary[]>([]);
    const [showWorksetModal, setShowWorksetModal] = useState(false);

    // --- STAVY PRO MUZEJNÍ MODÁLY ---
    const [deaccessionModal, setDeaccessionModal] = useState<{ isOpen: boolean; item: any | null }>({ isOpen: false, item: null });
    const [cloneModal, setCloneModal] = useState<{ isOpen: boolean; item: any | null }>({ isOpen: false, item: null });
    const [cardPrintModal, setCardPrintModal] = useState<{ isOpen: boolean; item: any | null }>({ isOpen: false, item: null });

    // --- STAVY PRO HROMADNÉ KOPÍROVÁNÍ ---
    const [copyModal, setCopyModal] = useState<{show: boolean, itemId: number | null}>({ show: false, itemId: null });
    const [copyParams, setCopyParams] = useState({ count: 10, titleSuffix: ' - kopie _', invNumSuffix: '/_' });
    const [isCopying, setIsCopying] = useState(false);

    const handlePrint = async (id: number) => {
        try {
            const data = await fetchLabelData(id); // Volání BE endpointu
            printLabels(data);
        } catch (error) {
            console.error("Chyba při tisku štítku:", error);
            alert("Nepodařilo se načíst data pro tisk štítku.");
        }
    };

    // KOMPLETNÍ STAV FILTRŮ
    const [filters, setFilters] = useState(() => ({
        accessionNumber: searchParams.get('accessionNumber') || '',
        inventoryNumber: searchParams.get('inventoryNumber') || '',
        subCollection: searchParams.get('subCollection') || '',
        objectType: searchParams.get('objectType') || '',
        author: searchParams.get('author') || '',
        datingFrom: searchParams.get('datingFrom') || '',
        datingTo: searchParams.get('datingTo') || '',
        originPlace: searchParams.get('originPlace') || '',
        material: searchParams.get('material') || '',
        technique: searchParams.get('technique') || '',
        location: searchParams.get('location') || '',
        spravce: searchParams.get('spravce') || ''
    }));

    const loadData = () => {
        const queryParams: any = {
            page,
            size: 50,
            q: searchTerm,
            sortField,
            sortDirection,
            ...filters
        };
        if (selectedWorkset) queryParams.worksetId = selectedWorkset;
        if (isAdvancedFilterActive && (advancedFilterGroup.conditions.length > 0 || advancedFilterGroup.groups.length > 0)) {
            queryParams.advancedFilter = JSON.stringify(advancedFilterGroup);
        }

        const newParams = new URLSearchParams();
        Object.entries(queryParams).forEach(([k, v]) => {
            if (v !== undefined && v !== null && v !== '') {
                newParams.set(k, String(v));
            }
        });
        const searchStr = '?' + newParams.toString();
        if (location.search !== searchStr) {
            setSearchParams(newParams, { replace: true });
        }
        sessionStorage.setItem('adminItemsSearch', searchStr);

        setLoadError('');
        listAdminItems(queryParams)
            .then(setData)
            .catch(err => setLoadError(err.message));
    };

    const handleSort = (field: string) => {
        setPage(0);
        if (sortField === field) {
            setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortField(field);
            setSortDirection(field === 'createdAt' ? 'desc' : 'asc');
        }
    };

    useEffect(() => {
        listWorksets().then(setWorksets).catch(() => {});
    }, []);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            loadData();
        }, 400);
        return () => clearTimeout(delayDebounceFn);
    }, [page, searchTerm, filters, isAdvancedFilterActive, advancedFilterGroup, sortField, sortDirection, selectedWorkset]);

    const handleFilterChange = (key: string, value: string) => {
        setPage(0);
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const resetFilters = () => {
        setFilters({
            accessionNumber: '', inventoryNumber: '', subCollection: '',
            objectType: '', author: '', datingFrom: '', datingTo: '',
            originPlace: '', material: '', technique: '', location: '', spravce: ''
        });
        setAdvancedFilterGroup(createEmptyGroup('AND'));
        setIsAdvancedFilterActive(false);
        setSearchTerm('');
        setPage(0);
    };

    const handlePrintList = async () => {
        setIsPrintLoading(true);
        try {
            const queryParams: any = { q: searchTerm, ...filters };
            if (selectedWorkset) queryParams.worksetId = selectedWorkset;
            if (isAdvancedFilterActive && (advancedFilterGroup.conditions.length > 0 || advancedFilterGroup.groups.length > 0)) {
                queryParams.advancedFilter = JSON.stringify(advancedFilterGroup);
            }
            const printItems = await searchPrintItems(queryParams);
            setListPrintModal({
                isOpen: true,
                mode: 'list',
                items: printItems,
                totalCount: data?.totalElements ?? printItems.length
            });
        } catch (err) {
            console.error("Chyba při načítání tiskové sestavy:", err);
            alert("Nepodařilo se načíst data pro tisk soupisu.");
        } finally {
            setIsPrintLoading(false);
        }
    };

    const handleExportExcel = async () => {
        if (exporting) return;
        setExporting(true);
        try {
            const totalCount = data?.totalElements || 0;
            if (totalCount > 1000) {
                const proceed = window.confirm(`Chystáte se exportovat ${totalCount.toLocaleString('cs-CZ')} předmětů. Operace může chvíli trvat. Chcete pokračovat?`);
                if (!proceed) return;
            }
            const queryParams: any = { q: searchTerm, ...filters };
            if (selectedWorkset) queryParams.worksetId = selectedWorkset;
            if (isAdvancedFilterActive && (advancedFilterGroup.conditions.length > 0 || advancedFilterGroup.groups.length > 0)) {
                queryParams.advancedFilter = JSON.stringify(advancedFilterGroup);
            }
            await exportItemsToExcel(queryParams);
        } catch (error) {
            alert("Export se nezdařil.");
        } finally {setExporting(false);}
    };

    const handleExecuteCopy = async () => {
        if (!copyModal.itemId) return;
        setIsCopying(true);
        try {
            await bulkCopyItem(copyModal.itemId, copyParams);
            setCopyModal({ show: false, itemId: null });
            loadData();
        } catch (err: any) {
            alert('Chyba při kopírování: ' + err.message);
        } finally {
            setIsCopying(false);
        }
    };

    const pagination = <div className="flex flex-wrap items-center gap-2 p-2" aria-label="Stránkování evidence">
        <button type="button" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>Předchozí</button>
        <label>Strana <input type="number" aria-label="Číslo stránky evidence" min="1" max={Math.max(1, data?.totalPages || 1)}
            value={page + 1} onChange={e => { const n = Number(e.target.value); if (Number.isInteger(n)) setPage(Math.max(0, Math.min((data?.totalPages || 1) - 1, n - 1))); }} /></label>
        <span>z {data?.totalPages || 1} · {data?.totalElements || 0} předmětů</span>
        <button type="button" disabled={page + 1 >= (data?.totalPages || 1)} onClick={() => setPage(p => p + 1)}>Další</button>
    </div>;

    if (!data && loadError) return <div role="alert">{loadError}<button type="button" onClick={loadData}>Načíst znovu</button></div>;
    if (!data) return <div className="p-10 text-center italic text-gray-400">Načítám správu sbírek...</div>

    const inputClass = "form-control text-sm border-gray-200 focus:border-[#ffbc34] focus:ring-0 rounded bg-white";
    const labelClass = "text-[9px] uppercase font-bold text-gray-500 tracking-tighter mb-1 block";

    return (
        <div className="card shadow-sm border-0 animate-in fade-in duration-500 bg-white">
            <div className="card-header bg-white py-4 flex flex-col gap-4 border-b">
                <div className="flex justify-between items-center">
                    <h4 className="card-title m-0 font-bold text-[#1f262d] uppercase tracking-tighter">
                        Správa sbírkových předmětů <span className="text-[#ffbc34] ml-2">({data.totalElements})</span>
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={handlePrintList}
                            disabled={isPrintLoading}
                            className="genric-btn info-border radius px-3 py-2 text-[10px] font-bold uppercase flex items-center gap-1.5 hover:bg-blue-50 transition-colors disabled:opacity-50"
                            title="Vytisknout úřední inventární soupis všech vyfiltrovaných položek"
                        >
                            <FaPrint /> {isPrintLoading ? 'Načítám tisk...' : 'Tisk soupisu (A4)'}
                        </button>
                        <button disabled={exporting} aria-busy={exporting} onClick={handleExportExcel} className="genric-btn success-border radius px-4 py-2 text-[10px] font-bold uppercase flex items-center gap-2">
                            <FaFileExcel /> {exporting ? 'Exportuji…' : 'Export .xlsx'}
                        </button>
                        <button onClick={() => navigate('/admin/items/new', { state: { fromSearch: location.search } })} className="genric-btn warning radius px-4 py-2 text-[10px] font-bold uppercase flex items-center gap-2 shadow-sm">
                            <FaPlus /> Nový předmět
                        </button>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3">
                    <div className="flex-grow relative min-w-[240px]">
                        <input
                            className="form-control pl-10 border-gray-200 focus:border-[#ffbc34] focus:ring-0 rounded-pill text-sm py-2 bg-gray-50"
                            placeholder="Rychlé hledání: název, inv. číslo, popis, autor..."
                            value={searchTerm}
                            onChange={e => { setPage(0); setSearchTerm(e.target.value); }}
                        />
                        <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                    </div>
                    {worksets.length > 0 && (
                        <select
                            value={selectedWorkset}
                            onChange={e => { setPage(0); setSelectedWorkset(e.target.value); }}
                            className="form-control text-xs rounded-pill bg-gray-50 border-gray-200 px-3"
                            style={{ maxWidth: '200px' }}
                            aria-label="Filtrovat podle pracovní sady"
                        >
                            <option value="">— Všechny sady —</option>
                            {worksets.map(ws => (
                                <option key={ws.id} value={ws.id}>
                                    {ws.name} ({ws.itemCount})
                                </option>
                            ))}
                        </select>
                    )}
                    <button
                        onClick={() => setShowAdvancedBuilder(!showAdvancedBuilder)}
                        className={`genric-btn ${showAdvancedBuilder || isAdvancedFilterActive ? 'warning' : 'default-border'} radius px-4 text-[10px] uppercase font-black transition-all flex items-center gap-2`}
                        title="Otevřít stavitel pokročilých podmínek (AND/OR/NOT)"
                    >
                        <FaLayerGroup /> {isAdvancedFilterActive ? 'Pokročilý filtr (aktivní)' : 'Pokročilý filtr (AND/OR)'}
                    </button>
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className={`genric-btn ${showAdvanced ? 'warning' : 'default-border'} radius px-4 text-[10px] uppercase font-black transition-all flex items-center gap-2`}
                    >
                        <FaFilter /> {showAdvanced ? 'Skrýt filtry' : 'Rychlé filtry'}
                    </button>
                </div>

                {showAdvancedBuilder && (
                    <AdvancedFilterBuilder
                        filterGroup={advancedFilterGroup}
                        onChange={setAdvancedFilterGroup}
                        onApply={() => {
                            setIsAdvancedFilterActive(true);
                            setPage(0);
                            loadData();
                        }}
                        onReset={() => {
                            setAdvancedFilterGroup(createEmptyGroup('AND'));
                            setIsAdvancedFilterActive(false);
                            setPage(0);
                            loadData();
                        }}
                    />
                )}

                {showAdvanced && (
                    <div className="p-4 bg-gray-50 border border-gray-100 rounded-lg animate-in slide-in-from-top-2 duration-300">
                        <div className="row g-3">
                            <div className="col-md-3">
                                <label className={labelClass}>Přírůstkové č.</label>
                                <input className={inputClass} value={filters.accessionNumber} onChange={e => handleFilterChange('accessionNumber', e.target.value)} />
                            </div>
                            <div className="col-md-3">
                                <label className={labelClass}>Inventární č.</label>
                                <input className={inputClass} value={filters.inventoryNumber} onChange={e => handleFilterChange('inventoryNumber', e.target.value)} />
                            </div>
                            <div className="col-md-3">
                                <label className={labelClass}>Autor / Původce</label>
                                <input className={inputClass} value={filters.author} onChange={e => handleFilterChange('author', e.target.value)} />
                            </div>
                            <div className="col-md-3 flex flex-col justify-end">
                                <button onClick={resetFilters} className="text-[10px] text-red-500 font-black uppercase hover:text-red-700 transition-colors mb-2 text-right">Resetovat vše</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="card-body p-0">
                {loadError && <p role="alert">{loadError}</p>}
                {pagination}
                <div className="table-responsive">
                    <table className="demus-datasheet" aria-label="Sbírky — tabulkové zobrazení">
                        <thead><tr>
                            <th><input type="checkbox" aria-label="Vybrat stránku" checked={data.content.length > 0 && data.content.every((it: any) => selectedIds.includes(it.id))}
                                onChange={() => {const ids = data.content.map((it: any) => it.id); setSelectedIds(prev => ids.every((id: number) => prev.includes(id)) ? prev.filter(id => !ids.includes(id)) : [...new Set([...prev,...ids])]);}} /></th>
                            <th><button type="button" onClick={() => handleSort('inventoryNumber')}>InvČ</button></th>
                            <th><button type="button" onClick={() => handleSort('accessionNumber')}>PřírČ</button></th>
                            <th>Fond</th><th>Podsbírka</th><th>Předmět</th>
                            <th><button type="button" onClick={() => handleSort('title')}>Titul</button></th>
                            <th><button type="button" onClick={() => handleSort('author')}>Autor</button></th>
                            <th>Datace</th><th>Materiál</th><th>Technika</th><th>Stav</th><th>Akce</th>
                        </tr></thead>
                        <tbody>{data.content.map((item: any) => <tr key={item.id}>
                            <td><input type="checkbox" aria-label={`Vybrat ${item.inventoryNumber || item.id}`} checked={selectedIds.includes(item.id)}
                                onChange={() => setSelectedIds(prev => prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev,item.id])}/></td>
                            <td><button type="button" className="underline" onClick={() => navigate(`/admin/items/view/${item.id}`,{state:{fromSearch:location.search}})}>{item.inventoryNumber || '—'}</button></td>
                            <td>{item.accessionNumber || '—'}</td><td>{item.fundLegacyCode || item.fundName || '—'}</td>
                            <td>{item.subCollection || '—'}</td><td>{item.objectType || '—'}</td><td>{item.title || '—'}</td>
                            <td>{item.author || item.authors?.join(', ') || '—'}</td><td>{item.datingText || '—'}</td>
                            <td>{item.material || item.materials?.join(', ') || '—'}</td><td>{item.technique || '—'}</td>
                            <td>{item.published ? 'Zveřejněno' : 'Neveřejné'}</td>
                            <td className="demus-row-actions">
                                <button type="button" aria-label="Upravit předmět" title="Upravit předmět" onClick={() => navigate(`/admin/items/edit/${item.id}`,{state:{fromSearch:location.search}})}><FaEdit/></button>
                                <button type="button" aria-label="Tisk štítku" title="Tisk štítku" onClick={() => handlePrint(item.id)}><FaPrint/></button>
                                <button type="button" aria-label="Tisk muzejní karty" title="Tisk muzejní karty" onClick={() => setCardPrintModal({isOpen:true,item})}><FaIdCard/></button>
                                <button type="button" aria-label="Klonovat předmět" title="Klonovat předmět" onClick={() => setCloneModal({isOpen:true,item})}><FaCopy/></button>
                                <button type="button" aria-label="Vyřadit z evidence" title="Vyřadit z evidence" onClick={() => setDeaccessionModal({isOpen:true,item})}><FaTrash/></button>
                            </td>
                        </tr>)}</tbody>
                    </table>
                </div>
                {pagination}
            </div>

            {/* PLOVOUCÍ LIŠTA PRACOVNÍHO VÝBĚRU */}
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
                            onClick={() => {
                                const selectedItems = data.content.filter((it: any) => selectedIds.includes(it.id));
                                setListPrintModal({ isOpen: true, mode: 'cards', items: selectedItems, totalCount: selectedItems.length });
                            }}
                            className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white font-bold text-xs uppercase rounded transition-colors flex items-center gap-1.5"
                            title="Vytisknout katalogizační karty vybraných předmětů"
                        >
                            <FaIdCard /> Tisk karet ({selectedIds.length})
                        </button>

                        <button
                            onClick={() => {
                                const selectedItems = data.content.filter((it: any) => selectedIds.includes(it.id));
                                setListPrintModal({ isOpen: true, mode: 'list', items: selectedItems, totalCount: selectedItems.length });
                            }}
                            className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white font-bold text-xs uppercase rounded transition-colors flex items-center gap-1.5"
                            title="Vytisknout soupis vybraných předmětů"
                        >
                            <FaPrint /> Tisk soupisu ({selectedIds.length})
                        </button>

                        <button
                            onClick={() => setShowWorksetModal(true)}
                            className="px-3 py-1 bg-[#ffbc34] text-black font-extrabold text-xs uppercase rounded hover:bg-yellow-400 transition-colors shadow flex items-center gap-1.5"
                        >
                            <FaLayerGroup /> Uložit do sady
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

            {/* MODÁL TISKU SOUPISU A HROMADNÝCH KARET */}
            {listPrintModal.isOpen && (
                <ItemListPrint
                    items={listPrintModal.items}
                    mode={listPrintModal.mode}
                    title={listPrintModal.mode === 'cards' ? 'KATALOGIZAČNÍ KARTY SBÍRKOVÝCH PŘEDMĚTŮ' : 'INVENTÁRNÍ SOUPIS SBÍRKOVÝCH PŘEDMĚTŮ'}
                    filterDescription={searchTerm ? `Hledáno: "${searchTerm}"` : undefined}
                    totalCount={listPrintModal.totalCount ?? data?.totalElements}
                    onClose={() => setListPrintModal({ isOpen: false, mode: 'list', items: [], totalCount: undefined })}
                />
            )}

            {/* MODÁL PRO PRACOVNÍ SADU */}
            <WorksetModal
                isOpen={showWorksetModal}
                selectedIds={selectedIds}
                onClose={() => setShowWorksetModal(false)}
                onSuccess={(newWs) => {
                    setWorksets(prev => [newWs, ...prev]);
                    setSelectedIds([]);
                    loadData();
                }}
            />

            {/* MODÁL SELEKTIVNÍHO KLONOVÁNÍ */}
            {cloneModal.isOpen && cloneModal.item && (
                <SelectiveCloneModal
                    isOpen={cloneModal.isOpen}
                    itemId={cloneModal.item.id}
                    itemTitle={cloneModal.item.title}
                    inventoryNumber={cloneModal.item.inventoryNumber || ''}
                    onClose={() => setCloneModal({ isOpen: false, item: null })}
                    onSuccess={(cloned: any) => {
                        setCloneModal({ isOpen: false, item: null });
                        loadData();
                        if (cloned?.id) {
                            navigate(`/admin/items/edit/${cloned.id}`, { state: { fromSearch: location.search } });
                        }
                    }}
                />
            )}

            {/* MODÁL VYŘAZENÍ Z EVIDENCE */}
            {deaccessionModal.isOpen && deaccessionModal.item && (
                <DeaccessionModal
                    isOpen={deaccessionModal.isOpen}
                    itemId={deaccessionModal.item.id}
                    itemTitle={deaccessionModal.item.title}
                    inventoryNumber={deaccessionModal.item.inventoryNumber || ''}
                    onClose={() => setDeaccessionModal({ isOpen: false, item: null })}
                    onSuccess={() => loadData()}
                />
            )}

            {/* MODÁL TISKU KARTY PŘEDMĚTU */}
            {cardPrintModal.isOpen && cardPrintModal.item && (
                <MuseumCardPrint
                    item={cardPrintModal.item}
                    onClose={() => setCardPrintModal({ isOpen: false, item: null })}
                />
            )}

            {/* MODÁL PRO HROMADNÉ KOPÍROVÁNÍ */}
            {copyModal.show && (
                <div className="fixed inset-0 bg-[#1f262d]/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
                    <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-200">
                        <div className="bg-[#ffbc34] p-4 text-[#1f262d] flex justify-between items-center">
                            <h6 className="m-0 font-black uppercase text-[10px] tracking-widest">Hromadné kopírování</h6>
                            <button onClick={() => setCopyModal({show: false, itemId: null})} className="text-[#1f262d]"><FaPlus className="rotate-45" /></button>
                        </div>
                        <div className="p-6">
                            <div className="mb-4">
                                <label className="text-[9px] uppercase font-black text-gray-400 mb-1 block">Počet kusů</label>
                                <input type="number" className="form-control" value={copyParams.count} onChange={e => setCopyParams({...copyParams, count: parseInt(e.target.value) || 1})} />
                            </div>
                            <div className="flex gap-2">
                                <button disabled={isCopying} onClick={() => setCopyModal({show: false, itemId: null})} className="genric-btn gray-border radius flex-grow text-[10px] font-bold uppercase">Zrušit</button>
                                <button disabled={isCopying} onClick={handleExecuteCopy} className="genric-btn warning radius flex-grow text-[10px] font-bold uppercase">
                                    {isCopying ? 'Pracuji...' : 'Potvrdit'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
