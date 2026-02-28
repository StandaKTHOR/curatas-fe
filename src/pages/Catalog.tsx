import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listPublicItems } from '../lib/api';
import SafeImage from "@/components/SafeImage";

export default function Catalog() {
    const [items, setItems] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Rozšířený stav filtrů podle screenu z Demusu
    const [filters, setFilters] = useState({
        accessionNumber: '',  // PřírČ
        inventoryNumber: '',  // InvČ
        subCollection: '',    // Fond / Podsbírka
        objectType: '',       // Skupina / Předmět
        author: '',           // Autor
        datingFrom: '',       // RokOd
        datingTo: '',         // RokDo
        originPlace: '',      // MístoVz
        material: '',         // Materiál
        technique: '',        // Technika
        location: '',         // Lokalita / Uložení
        spravce: ''           // Správce (Spr)
    });

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            // Posíláme všechna aktivní data na API
            listPublicItems({ q: searchTerm, ...filters })
                .then(data => setItems(data.content || []))
                .catch(console.error);
        }, 500); // 0.5s je ideální balance pro psaní více polí

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, filters]);

    const handleFilterChange = (key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const resetFilters = () => {
        setFilters({
            accessionNumber: '', inventoryNumber: '', subCollection: '',
            objectType: '', author: '', datingFrom: '', datingTo: '',
            originPlace: '', material: '', technique: '', location: '', spravce: ''
        });
        setSearchTerm('');
    };

    const inputClass = "form-control text-sm border-gray-200 focus:border-[#ffbc34] focus:ring-0 rounded bg-gray-50/50";
    const labelClass = "text-[9px] uppercase font-bold text-gray-500 tracking-tighter mb-1 block";

    return (
        <div className="container-fluid animate-in fade-in duration-500 pb-10">
            <div className="mb-8 border-l-4 border-[#ffbc34] pl-4 flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-serif font-bold text-[#1f262d]">Sbírkový fond</h2>
                    <p className="text-gray-500 text-sm uppercase tracking-widest">Muzejní informační systém</p>
                </div>
                <div className="text-right">
                    <span className="text-2xl font-bold text-[#ffbc34]">{items.length}</span>
                    <p className="text-[10px] text-gray-400 uppercase font-bold">Zobrazených položek</p>
                </div>
            </div>

            <div className="bg-white p-6 shadow-sm mb-8 border border-gray-100 rounded-lg">
                <div className="flex gap-3">
                    <div className="input-group-icon flex-grow">
                        <div className="icon"><i className="fa fa-search" aria-hidden="true"></i></div>
                        <input
                            className="single-input border"
                            placeholder="Rychlé hledání v názvu nebo popisu..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className={`genric-btn ${showAdvanced ? 'warning' : 'info-border'} radius px-6 text-xs uppercase font-bold transition-all flex items-center gap-2`}
                    >
                        <i className={`fa ${showAdvanced ? 'fa-angle-up' : 'fa-sliders'}`}></i>
                        {showAdvanced ? 'Méně filtrů' : 'Rozšířené filtry'}
                    </button>
                </div>

                {/* ROZŠÍŘENÝ PANEL (Podle Demusu) */}
                {showAdvanced && (
                    <div className="mt-6 pt-6 border-t border-dashed border-gray-200 animate-in slide-in-from-top-4 duration-500">
                        <div className="row g-4">
                            {/* SEKCE: IDENTIFIKACE */}
                            <div className="col-md-3 border-r border-gray-50">
                                <h6 className="text-[10px] font-black text-[#3e5569] mb-3 border-b pb-1">IDENTIFIKACE</h6>
                                <div className="mb-3">
                                    <label className={labelClass}>Přírůstkové číslo (PřírČ)</label>
                                    <input className={inputClass} value={filters.accessionNumber} onChange={e => handleFilterChange('accessionNumber', e.target.value)} />
                                </div>
                                <div className="mb-3">
                                    <label className={labelClass}>Inventární číslo (InvČ)</label>
                                    <input className={inputClass} value={filters.inventoryNumber} onChange={e => handleFilterChange('inventoryNumber', e.target.value)} />
                                </div>
                                <div className="">
                                    <label className={labelClass}>Fond / Podsbírka</label>
                                    <input className={inputClass} value={filters.subCollection} onChange={e => handleFilterChange('subCollection', e.target.value)} />
                                </div>
                            </div>

                            {/* SEKCE: PŮVOD A AUTOR */}
                            <div className="col-md-3 border-r border-gray-50">
                                <h6 className="text-[10px] font-black text-[#3e5569] mb-3 border-b pb-1">VZNIK A AUTORSTVÍ</h6>
                                <div className="mb-3">
                                    <label className={labelClass}>Autor / Původce</label>
                                    <input className={inputClass} value={filters.author} onChange={e => handleFilterChange('author', e.target.value)} />
                                </div>
                                <div className="row g-2 mb-3">
                                    <div className="col-6">
                                        <label className={labelClass}>Rok od</label>
                                        <input type="number" className={inputClass} value={filters.datingFrom} onChange={e => handleFilterChange('datingFrom', e.target.value)} />
                                    </div>
                                    <div className="col-6">
                                        <label className={labelClass}>Rok do</label>
                                        <input type="number" className={inputClass} value={filters.datingTo} onChange={e => handleFilterChange('datingTo', e.target.value)} />
                                    </div>
                                </div>
                                <div className="">
                                    <label className={labelClass}>Místo vzniku / Naleziště</label>
                                    <input className={inputClass} value={filters.originPlace} onChange={e => handleFilterChange('originPlace', e.target.value)} />
                                </div>
                            </div>

                            {/* SEKCE: MATERIÁL A TECHNIKA */}
                            <div className="col-md-3 border-r border-gray-50">
                                <h6 className="text-[10px] font-black text-[#3e5569] mb-3 border-b pb-1">FYZICKÉ VLASTNOSTI</h6>
                                <div className="mb-3">
                                    <label className={labelClass}>Skupina / Typ předmětu</label>
                                    <input className={inputClass} value={filters.objectType} onChange={e => handleFilterChange('objectType', e.target.value)} />
                                </div>
                                <div className="mb-3">
                                    <label className={labelClass}>Materiál</label>
                                    <input className={inputClass} value={filters.material} onChange={e => handleFilterChange('material', e.target.value)} />
                                </div>
                                <div className="">
                                    <label className={labelClass}>Technika</label>
                                    <input className={inputClass} value={filters.technique} onChange={e => handleFilterChange('technique', e.target.value)} />
                                </div>
                            </div>

                            {/* SEKCE: SPRÁVA */}
                            <div className="col-md-3">
                                <h6 className="text-[10px] font-black text-[#3e5569] mb-3 border-b pb-1">ULOŽENÍ A SPRÁVA</h6>
                                <div className="mb-3">
                                    <label className={labelClass}>Aktuální lokace (Depozitář)</label>
                                    <input className={inputClass} value={filters.location} onChange={e => handleFilterChange('location', e.target.value)} />
                                </div>
                                <div className="mb-4">
                                    <label className={labelClass}>Odpovědný správce (Spr)</label>
                                    <input className={inputClass} value={filters.spravce} onChange={e => handleFilterChange('spravce', e.target.value)} />
                                </div>
                                <button
                                    onClick={resetFilters}
                                    className="genric-btn danger-border radius small w-full font-bold"
                                >
                                    Vynulovat vše
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* VÝPIS KARET (Zůstává stejný) */}
            <div className="row">
                {items.length > 0 ? items.map(it => (
                    <div key={it.id} className="col-lg-3 col-md-6 mb-8">
                        <div className="card h-100 shadow-sm border-0 transition-all hover:shadow-md group">
                            <div className="aspect-[4/3] overflow-hidden bg-gray-50 shadow-inner">
                                <SafeImage
                                    src={it.primaryImageUrl}
                                    alt={it.title}
                                    className="card-img-top object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
                                />
                            </div>
                            <div className="card-body p-4 flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-start mb-1">
                                        <p className="text-[9px] font-bold text-[#ffbc34] uppercase tracking-wider">
                                            {it.inventoryNumber || it.accessionNumber || 'Bez ID'}
                                        </p>
                                        <span className="text-[8px] bg-gray-100 px-1 rounded text-gray-400 uppercase font-bold">{it.subCollection?.substring(0,10)}</span>
                                    </div>
                                    <h5 className="card-title font-bold text-sm mb-3 line-clamp-2 leading-snug" style={{minHeight: '2.5rem'}}>
                                        {it.title}
                                    </h5>
                                </div>
                                <Link to={`/items/${it.id}`} className="genric-btn primary-border small radius w-full text-center mt-2 font-bold tracking-tighter">
                                    Otevřít kartu
                                </Link>
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="col-12 text-center py-20">
                        <i className="fa fa-search text-gray-200 text-5xl mb-4"></i>
                        <p className="italic text-gray-400 font-serif">Žádný předmět neodpovídá nastaveným filtrům.</p>
                    </div>
                )}
            </div>
        </div>
    );
}