import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import {
    listAdminItems,
    deleteAdminItem,
    exportItemsToExcel,
    bulkCopyItem,
    fetchLabelData,
    listWorksets,
    searchPrintItems,
    WorksetSummary
} from '../lib/api'
import { FaEdit, FaTrash, FaPrint, FaCopy, FaFileExcel, FaPlus, FaSearch, FaChevronLeft, FaChevronRight, FaFilter, FaIdCard, FaLayerGroup } from 'react-icons/fa'
import { printLabels } from "@/components/LabelPrinter";
import DeaccessionModal from '@/components/DeaccessionModal';
import SelectiveCloneModal from '@/components/SelectiveCloneModal';
import WorksetModal from '@/components/WorksetModal';
import MuseumCardPrint from '@/components/MuseumCardPrint';
import ItemListPrint from '@/components/ItemListPrint';
import AdvancedFilterBuilder, { FilterGroup, createEmptyGroup } from '@/components/AdvancedFilterBuilder';

export default function AdminItems() {
    const [data, setData] = useState<any>(null);
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
    const [advancedFilterGroup, setAdvancedFilterGroup] = useState<FilterGroup>(createEmptyGroup('AND'));
    const [isAdvancedFilterActive, setIsAdvancedFilterActive] = useState(false);
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

        listAdminItems(queryParams)
            .then(setData)
            .catch(err => console.error("Chyba při načítání:", err));
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

    const handleDelete = async (id: number) => {
        if (window.confirm('Opravdu chcete tento exponát trvale smazat? Tato akce bude zaznamenána v auditní stopě.')) {
            await deleteAdminItem(id);
            loadData();
        }
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
        }
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

    if (!data) return <div className="p-10 text-center italic text-gray-400">Načítám správu sbírek...</div>

    const inputClass = "form-control text-sm border-gray-200 focus:border-[#ffbc34] focus:ring-0 rounded bg-white";
    const labelClass = "text-[9px] uppercase font-bold text-gray-500 tracking-tighter mb-1 block";

    return (
        <div className="card shadow-sm border-0 animate-in fade-in duration-500 bg-white">
            <div className="card-header bg-white py-4 flex flex-col gap-4 border-b">
                <div className="flex justify-between items-center">
                    <h4 className="card-title m-0 font-bold text-[#1f262d] uppercase tracking-tighter">
                        Správa exponátů <span className="text-[#ffbc34] ml-2">({data.totalElements})</span>
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
                        <button onClick={handleExportExcel} className="genric-btn success-border radius px-4 py-2 text-[10px] font-bold uppercase flex items-center gap-2">
                            <FaFileExcel /> Export .xlsx
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
                <div className="table-responsive">
                    <table className="table table-hover mb-0">
                        <thead className="bg-[#f8f9fa] text-[10px] uppercase tracking-wider text-gray-400 font-black">
                        <tr>
                            <th className="px-4 py-4 w-10 text-center">
                                <input
                                    type="checkbox"
                                    checked={data.content.length > 0 && data.content.every((it: any) => selectedIds.includes(it.id))}
                                    onChange={() => {
                                        const pageIds = data.content.map((it: any) => it.id);
                                        const allSel = pageIds.every((id: number) => selectedIds.includes(id));
                                        if (allSel) {
                                            setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
                                        } else {
                                            setSelectedIds(prev => Array.from(new Set([...prev, ...pageIds])));
                                        }
                                    }}
                                    className="rounded border-gray-300 text-[#00204a] cursor-pointer"
                                    aria-label="Vybrat vše na stránce"
                                />
                            </th>
                            <th className="px-4 py-4 cursor-pointer hover:text-[#00204a]" style={{ width: '22%' }} onClick={() => handleSort('inventoryNumber')}>
                                Identifikace {sortField === 'inventoryNumber' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                            </th>
                            <th className="px-6 py-4 cursor-pointer hover:text-[#00204a]" style={{ width: '38%' }} onClick={() => handleSort('title')}>
                                Název a Původce {sortField === 'title' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                            </th>
                            <th className="px-4 py-4 cursor-pointer text-center hover:text-[#00204a]" style={{ width: '13%' }} onClick={() => handleSort('createdAt')}>
                                Vytvořeno {sortField === 'createdAt' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                            </th>
                            <th className="px-4 py-4 text-center" style={{ width: '10%' }}>Stav</th>
                            <th className="px-6 py-4 text-right" style={{ width: '13%' }}>Akce</th>
                        </tr>
                        </thead>
                        <tbody className="text-sm">
                        {data.content.map((item: any) => {
                            const isSelected = selectedIds.includes(item.id);
                            const mainPhoto = item.primaryImageUrl
                                || (item.images && item.images.length > 0 ? item.images[0].url : null)
                                || (item.imageUrls && item.imageUrls.length > 0 ? item.imageUrls[0] : null);

                            return (
                                <tr key={item.id} className={`border-b border-gray-50 align-middle transition-colors group ${isSelected ? 'bg-blue-50/60' : ''}`}>
                                    <td className="px-4 py-4 text-center" onClick={e => e.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => {
                                                setSelectedIds(prev =>
                                                    prev.includes(item.id) ? prev.filter(x => x !== item.id) : [...prev, item.id]
                                                );
                                            }}
                                            className="rounded border-gray-300 text-[#00204a] cursor-pointer"
                                            aria-label={`Vybrat položku ${item.inventoryNumber || item.id}`}
                                        />
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded border bg-gray-50 overflow-hidden flex-shrink-0 shadow-sm">
                                                {mainPhoto ? (
                                                    <img src={mainPhoto} className="w-full h-full object-cover" alt="" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-[8px] text-gray-300 uppercase font-bold text-center p-1">Bez foto</div>
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-mono text-[11px] font-bold text-[#ffbc34]">
                                                    {item.inventoryNumber || item.accessionNumber || '—'}
                                                </div>
                                                <div className="text-[9px] text-gray-400 uppercase font-bold tracking-tighter">
                                                    {item.subCollection || 'Bez zařazení'}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-[#3e5569] text-base">{item.title}</div>
                                        <div className="text-[11px] text-gray-400 italic">
                                            {item.author || item.legacyData?.autor || 'Anonymní autor'}
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-center text-xs text-gray-500 font-mono">
                                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString('cs-CZ') : '—'}
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        <div className="flex flex-col gap-1 items-center">
                                            <span className={`badge ${item.published ? 'bg-success/10 text-success border border-success/20' : 'bg-gray-100 text-gray-400'} text-[9px] uppercase px-2 py-0.5 rounded`}>
                                                {item.published ? 'Veřejné' : 'Soukromé'}
                                            </span>
                                            {item.objectCondition && (
                                                <span className="text-[9px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                                    {item.objectCondition}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-1 transition-opacity">
                                            <button
                                                onClick={() => handlePrint(item.id)}
                                                className="p-2 text-gray-400 hover:text-blue-600 rounded"
                                                title="Tisk štítku"
                                                aria-label="Tisk štítku"
                                            ><FaPrint /></button>
                                            <button
                                                onClick={() => setCardPrintModal({ isOpen: true, item })}
                                                className="p-2 text-gray-400 hover:text-indigo-600 rounded"
                                                title="Tisk muzejní karty předmětu (A4)"
                                                aria-label="Tisk muzejní karty"
                                            ><FaIdCard /></button>
                                            <button
                                                onClick={() => setCloneModal({ isOpen: true, item })}
                                                className="p-2 text-gray-400 hover:text-orange-500 rounded"
                                                title="Selektivní klonování"
                                                aria-label="Klonovat předmět"
                                            ><FaCopy /></button>
                                            <button
                                                onClick={() => navigate(`/admin/items/edit/${item.id}`, { state: { fromSearch: location.search } })}
                                                className="p-2 text-gray-400 hover:text-[#ffbc34] rounded"
                                                title="Upravit předmět"
                                                aria-label="Upravit předmět"
                                            ><FaEdit /></button>
                                            <button
                                                onClick={() => setDeaccessionModal({ isOpen: true, item })}
                                                className="p-2 text-gray-400 hover:text-red-600 rounded"
                                                title="Vyřadit z evidence (skartace / převod)"
                                                aria-label="Vyřadit z evidence"
                                            ><FaTrash /></button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* PATIČKA S PAGINACÍ */}
            <div className="p-4 border-t flex justify-between items-center bg-[#f8f9fa]">
                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                    Zobrazeno {data.content.length} z {data.totalElements} záznamů
                </div>
                <div className="flex gap-2">
                    <button disabled={page === 0} onClick={() => setPage(page - 1)} className="genric-btn gray-border radius px-3 py-1 flex items-center gap-1 text-[10px]"><FaChevronLeft /> Zpět</button>
                    <div className="flex items-center px-4"><span className="text-xs font-black text-[#1f262d]">{page + 1} / {data.totalPages}</span></div>
                    <button disabled={data.last} onClick={() => setPage(page + 1)} className="genric-btn gray-border radius px-3 py-1 flex items-center gap-1 text-[10px]">Dále <FaChevronRight /></button>
                </div>
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
