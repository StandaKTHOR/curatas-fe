import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listAdminItems, deleteAdminItem, exportItemsToExcel, bulkCopyItem } from '../lib/api'

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

    // KOMPLETNÍ STAV FILTRŮ (všech 12 polí)
    const [filters, setFilters] = useState({
        accessionNumber: '',
        inventoryNumber: '',
        subCollection: '',
        objectType: '',
        author: '',
        datingFrom: '',
        datingTo: '',
        originPlace: '',
        material: '',
        technique: '',
        location: '',
        spravce: ''
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
            alert("Export se nezdařil. Zkontrolujte připojení k serveru.");
        }
    };

    const handleExecuteCopy = async () => {
        if (!copyModal.itemId) return;
        setIsCopying(true);
        try {
            await bulkCopyItem(copyModal.itemId, copyParams);
            setCopyModal({ show: false, itemId: null });
            loadData();
            alert(`Úspěšně vytvořeno ${copyParams.count} kopií.`);
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
        <div className="card shadow-sm border-0 animate-in fade-in duration-500">
            {/* HLAVIČKA A TLAČÍTKA */}
            <div className="card-header bg-white py-4 flex flex-col gap-4 border-b">
                <div className="flex justify-between items-center">
                    <h4 className="card-title m-0 font-bold text-[#1f262d]">
                        Správa exponátů <span className="text-[#ffbc34] ml-2">({data.totalElements})</span>
                    </h4>
                    <div className="flex gap-2">
                        <button onClick={handleExportExcel} className="genric-btn success radius px-4 py-2 text-xs font-bold uppercase flex items-center gap-2">
                            <i className="fa fa-file-excel-o"></i> Export (.xlsx)
                        </button>
                        <button onClick={() => navigate('/admin/items/new')} className="btn btn-warning shadow-sm font-bold text-xs uppercase px-4 py-2">
                            + Nový předmět
                        </button>
                    </div>
                </div>

                <div className="flex gap-3">
                    <div className="flex-grow relative">
                        <input
                            className="form-control pl-10 border-gray-200 focus:border-[#ffbc34] focus:ring-0 rounded-pill text-sm py-2"
                            placeholder="Rychlé hledání v názvu a popisu..."
                            value={searchTerm}
                            onChange={e => { setPage(0); setSearchTerm(e.target.value); }}
                        />
                        <i className="fa fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-300"></i>
                    </div>
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className={`genric-btn ${showAdvanced ? 'warning' : 'default-border'} radius px-6 text-xs uppercase font-bold transition-all`}
                    >
                        {showAdvanced ? 'Skrýt filtry' : 'Rozšířené filtry'}
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
                                <label className={labelClass}>Fond / Podsbírka</label>
                                <input className={inputClass} value={filters.subCollection} onChange={e => handleFilterChange('subCollection', e.target.value)} />
                            </div>
                            <div className="col-md-3">
                                <label className={labelClass}>Skupina / Předmět</label>
                                <input className={inputClass} value={filters.objectType} onChange={e => handleFilterChange('objectType', e.target.value)} />
                            </div>
                            <div className="col-md-3">
                                <label className={labelClass}>Autor / Původce</label>
                                <input className={inputClass} value={filters.author} onChange={e => handleFilterChange('author', e.target.value)} />
                            </div>
                            <div className="col-md-3">
                                <label className={labelClass}>Místo vzniku</label>
                                <input className={inputClass} value={filters.originPlace} onChange={e => handleFilterChange('originPlace', e.target.value)} />
                            </div>
                            <div className="col-md-3">
                                <label className={labelClass}>Rok od</label>
                                <input type="number" className={inputClass} value={filters.datingFrom} onChange={e => handleFilterChange('datingFrom', e.target.value)} />
                            </div>
                            <div className="col-md-3">
                                <label className={labelClass}>Rok do</label>
                                <input type="number" className={inputClass} value={filters.datingTo} onChange={e => handleFilterChange('datingTo', e.target.value)} />
                            </div>
                            <div className="col-md-3">
                                <label className={labelClass}>Materiál</label>
                                <input className={inputClass} value={filters.material} onChange={e => handleFilterChange('material', e.target.value)} />
                            </div>
                            <div className="col-md-3">
                                <label className={labelClass}>Technika</label>
                                <input className={inputClass} value={filters.technique} onChange={e => handleFilterChange('technique', e.target.value)} />
                            </div>
                            <div className="col-md-3">
                                <label className={labelClass}>Uložení / Lokace</label>
                                <input className={inputClass} value={filters.location} onChange={e => handleFilterChange('location', e.target.value)} />
                            </div>
                            <div className="col-md-3 flex flex-col justify-end">
                                <label className={labelClass}>Správce</label>
                                <div className="flex gap-2">
                                    <input className={inputClass} value={filters.spravce} onChange={e => handleFilterChange('spravce', e.target.value)} />
                                    <button onClick={resetFilters} className="text-[10px] text-red-400 font-bold uppercase hover:text-red-600">Reset</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="card-body p-0">
                <div className="table-responsive">
                    <table className="table table-hover mb-0">
                        <thead className="bg-[#f8f9fa] text-[10px] uppercase tracking-wider text-gray-500">
                        <tr>
                            <th className="px-6 py-4" style={{ width: '20%' }}>ID / Identifikace</th>
                            <th className="px-6 py-4" style={{ width: '40%' }}>Název předmětu</th>
                            <th className="px-6 py-4 text-center" style={{ width: '10%' }}>Stav</th>
                            <th className="px-6 py-4 text-right" style={{ width: '30%' }}>Akce</th>
                        </tr>
                        </thead>
                        <tbody className="text-sm">
                        {data.content.map((item: any) => ( // Přejmenováno z it na item (oprava TS chyby)
                            <tr key={item.id} className="border-b border-gray-50 align-middle hover:bg-yellow-50/30 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-mono text-[11px] font-bold text-[#ffbc34]">
                                        {item.inventoryNumber || item.accessionNumber || '—'}
                                    </div>
                                    <div className="text-[10px] text-gray-400 uppercase font-medium">
                                        {item.subCollection || 'Bez zařazení'}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="font-bold text-[#3e5569]">{item.title}</div>
                                    <div className="text-[11px] text-gray-400 line-clamp-1 italic">
                                        {/* Zkusíme authors (seznam), pak author (string), pak legacy data */}
                                        { (item.authors && item.authors.length > 0) ? item.authors.join(', ') :
                                            (item.author || item.legacyData?.autor || 'Anonymní autor') }
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`badge ${item.published ? 'bg-success' : 'bg-secondary'} text-[9px] uppercase px-2 py-1 rounded-pill`}>
                                        {item.published ? 'Veřejné' : 'Soukromé'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        {/* OPRAVENÉ TLAČÍTKO PRO KOPII (Puntík -> Ikona) */}
                                        <button
                                            onClick={() => setCopyModal({ show: true, itemId: item.id })}
                                            className="genric-btn warning-border circle small px-3 py-1"
                                            style={{ textTransform: 'none', lineHeight: '20px' }}
                                        >
                                            Kopie
                                        </button>
                                        <button onClick={() => navigate(`/admin/items/edit/${item.id}`)} className="genric-btn info-border circle small px-3 py-1">Upravit</button>
                                        <button onClick={() => handleDelete(item.id)} className="genric-btn danger-border circle small px-3 py-1">Smazat</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="p-4 border-t flex justify-between items-center bg-[#f8f9fa]">
                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                    Zobrazeno {data.content.length} z {data.totalElements} záznamů
                </div>
                <div className="flex gap-2">
                    <button disabled={page === 0} onClick={() => { setPage(page - 1); window.scrollTo(0,0); }} className="genric-btn gray-border radius small">Předchozí</button>
                    <div className="flex items-center px-3"><span className="text-xs font-bold text-[#1f262d]">Strana {page + 1} z {data.totalPages}</span></div>
                    <button disabled={data.last} onClick={() => { setPage(page + 1); window.scrollTo(0,0); }} className="genric-btn gray-border radius small">Další</button>
                </div>
            </div>

            {/* MODÁL PRO KOPÍROVÁNÍ */}
            {copyModal.show && (
                <div className="fixed inset-0 bg-[#1f262d]/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
                        <div className="bg-[#ffbc34] p-4 text-[#1f262d] flex justify-between items-center">
                            <h5 className="m-0 font-bold uppercase text-xs tracking-widest">Hromadné kopírování</h5>
                            <button onClick={() => setCopyModal({show: false, itemId: null})} className="text-[#1f262d] hover:opacity-50"><i className="fa fa-times"></i></button>
                        </div>
                        <div className="p-6 flex flex-col gap-4">
                            <div>
                                <label className="text-[9px] uppercase font-bold text-gray-400 block mb-1">Počet nových kusů</label>
                                <input type="number" className="form-control text-sm" value={copyParams.count} onChange={e => setCopyParams({...copyParams, count: parseInt(e.target.value) || 1})} />
                            </div>
                            <div>
                                <label className="text-[9px] uppercase font-bold text-gray-400 block mb-1">Přípona názvu (použij _ pro číslo)</label>
                                <input className="form-control text-sm" placeholder="např. - jedinec _" value={copyParams.titleSuffix} onChange={e => setCopyParams({...copyParams, titleSuffix: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-[9px] uppercase font-bold text-gray-400 block mb-1">Přípona Inv. čísla (použij _ pro číslo)</label>
                                <input className="form-control text-sm" placeholder="např. /_" value={copyParams.invNumSuffix} onChange={e => setCopyParams({...copyParams, invNumSuffix: e.target.value})} />
                            </div>
                            <div className="flex gap-2 mt-4">
                                <button disabled={isCopying} onClick={() => setCopyModal({show: false, itemId: null})} className="genric-btn gray-border radius flex-grow text-[10px] font-bold uppercase">Zrušit</button>
                                <button disabled={isCopying} onClick={handleExecuteCopy} className="genric-btn warning radius flex-grow text-[10px] font-bold uppercase">
                                    {isCopying ? 'Pracuji...' : `Vytvořit ${copyParams.count} kopií`}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}