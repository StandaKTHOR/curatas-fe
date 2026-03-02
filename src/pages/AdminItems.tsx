import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {listAdminItems, deleteAdminItem, exportItemsToExcel, bulkCopyItem, fetchLabelData} from '../lib/api'
import { FaEdit, FaTrash, FaPrint, FaCopy, FaFileExcel, FaPlus, FaSearch, FaChevronLeft, FaChevronRight, FaFilter } from 'react-icons/fa'
import {printLabels, LabelDto} from "@/components/LabelPrinter";

export default function AdminItems() {
    const [data, setData] = useState<any>(null);
    const [page, setPage] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const navigate = useNavigate();

    // --- STAVY PRO KOPÍROVÁNÍ ---
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
    const [filters, setFilters] = useState({
        accessionNumber: '', inventoryNumber: '', subCollection: '',
        objectType: '', author: '', datingFrom: '', datingTo: '',
        originPlace: '', material: '', technique: '', location: '', spravce: ''
    });

    const loadData = () => {
        listAdminItems({ page, size: 50, q: searchTerm, ...filters })
            .then(setData)
            .catch(err => console.error("Chyba při načítání:", err));
    };

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            loadData();
        }, 400);
        return () => clearTimeout(delayDebounceFn);
    }, [page, searchTerm, filters]);

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
        setSearchTerm('');
        setPage(0);
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('Opravdu chcete tento exponát trvale smazat? Tato akce bude zaznamenána v auditní stopě.')) {
            await deleteAdminItem(id);
            loadData();
        }
    };

    const handleExportExcel = async () => {
        try {
            await exportItemsToExcel({ q: searchTerm, ...filters });
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
                    <div className="flex gap-2">
                        <button onClick={handleExportExcel} className="genric-btn success-border radius px-4 py-2 text-[10px] font-bold uppercase flex items-center gap-2">
                            <FaFileExcel /> Export .xlsx
                        </button>
                        <button onClick={() => navigate('/admin/items/new')} className="genric-btn warning radius px-4 py-2 text-[10px] font-bold uppercase flex items-center gap-2 shadow-sm">
                            <FaPlus /> Nový předmět
                        </button>
                    </div>
                </div>

                <div className="flex gap-3">
                    <div className="flex-grow relative">
                        <input
                            className="form-control pl-10 border-gray-200 focus:border-[#ffbc34] focus:ring-0 rounded-pill text-sm py-2 bg-gray-50"
                            placeholder="Hledat podle názvu, čísla nebo popisu..."
                            value={searchTerm}
                            onChange={e => { setPage(0); setSearchTerm(e.target.value); }}
                        />
                        <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                    </div>
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className={`genric-btn ${showAdvanced ? 'warning' : 'default-border'} radius px-6 text-[10px] uppercase font-black transition-all flex items-center gap-2`}
                    >
                        <FaFilter /> {showAdvanced ? 'Skrýt filtry' : 'Filtrovat'}
                    </button>
                </div>

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
                            {/* ... Další filtry zůstávají stejné jako ve tvém původním kódu ... */}
                        </div>
                    </div>
                )}
            </div>

            <div className="card-body p-0">
                <div className="table-responsive">
                    <table className="table table-hover mb-0">
                        <thead className="bg-[#f8f9fa] text-[10px] uppercase tracking-wider text-gray-400 font-black">
                        <tr>
                            <th className="px-6 py-4" style={{ width: '25%' }}>Identifikace</th>
                            <th className="px-6 py-4" style={{ width: '45%' }}>Název a Původce</th>
                            <th className="px-6 py-4 text-center" style={{ width: '10%' }}>Publikováno</th>
                            <th className="px-6 py-4 text-right" style={{ width: '20%' }}>Akce</th>
                        </tr>
                        </thead>
                        <tbody className="text-sm">
                        {data.content.map((item: any) => {
                            // MAPOVÁNÍ OBRÁZKU
                            const mainPhoto = (item.images && item.images.length > 0)
                                ? item.images[0].url
                                : (item.imageUrls && item.imageUrls.length > 0 ? item.imageUrls[0] : null);

                            return (
                                <tr key={item.id} className="border-b border-gray-50 align-middle transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            {/* NÁHLED FOTKY */}
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
                                    <td className="px-6 py-4 text-center">
                                            <span className={`badge ${item.published ? 'bg-success/10 text-success border border-success/20' : 'bg-gray-100 text-gray-400'} text-[9px] uppercase px-2 py-1 rounded`}>
                                                {item.published ? 'Veřejné' : 'Soukromé'}
                                            </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-1 transition-opacity">
                                            <button
                                                onClick={() => handlePrint(item.id)}
                                                className="p-2 text-gray-400 hover:text-blue-600 rounded"
                                                title="Tisk štítku"><FaPrint /></button>
                                            <button onClick={() => setCopyModal({ show: true, itemId: item.id })} className="p-2 text-gray-400 hover:text-orange-500" title="Kopie"><FaCopy /></button>
                                            <button onClick={() => navigate(`/admin/items/edit/${item.id}`)} className="p-2 text-gray-400 hover:text-[#ffbc34]" title="Upravit"><FaEdit /></button>
                                            <button onClick={() => handleDelete(item.id)} className="p-2 text-gray-400 hover:text-red-500" title="Smazat"><FaTrash /></button>
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

            {/* MODÁL PRO KOPÍROVÁNÍ ZŮSTÁVÁ STEJNÝ... */}
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