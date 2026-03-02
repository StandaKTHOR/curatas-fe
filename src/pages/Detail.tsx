import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getItem } from '../lib/api'
import SafeImage from "@/components/SafeImage";

// Pomocná komponenta pro čistší kód
const DataRow = ({ label, value, fallback = 'Nezjištěno', isItalic = false }: any) => (
    <div className="col-md-6">
        <h6 className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">{label}</h6>
        <p className={`text-md text-dark ${isItalic ? 'italic' : 'font-medium'}`}>
            {value && value !== "" ? value : fallback}
        </p>
    </div>
);

const LegacyRow = ({ label, value }: { label: string; value: any }) => {
    if (!value) return null;
    return (
        <div className="flex justify-between py-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 px-2 -mx-2 rounded transition-colors">
            <span className="text-[10px] uppercase text-gray-500 font-bold tracking-wider pt-1">{label}</span>
            <span className="text-sm text-gray-800 font-medium text-right">
                {Array.isArray(value) ? value.join(' | ') : value}
            </span>
        </div>
    );
};

export default function Detail() {
    const { id } = useParams<{ id: string }>();
    const [it, setIt] = useState<any>(null);

    useEffect(() => {
        if (id) getItem(id).then(setIt).catch(console.error);
    }, [id]);

    if (!it) return <div className="p-20 text-center italic text-gray-500">Načítám kompletní kartu předmětu...</div>;

    // Sjednocení dat pro zobrazení
    const authors = it.authors?.length > 0 ? it.authors.join(', ') : it.author;
    const materials = it.materials?.length > 0 ? it.materials.join(', ') : it.material;
    const images = it.imageUrls || it.images || [];

    return (
        <div className="container-fluid pb-20 animate-in fade-in duration-500 bg-white">
            {/* HLAVIČKA */}
            <div className="flex justify-between items-start mb-8 border-b pb-6 pt-10">
                <div className="border-l-4 border-[#ffbc34] pl-4">
                    <h1 className="text-4xl font-bold text-[#1f262d] leading-tight">{it.title}</h1>
                    <p className="text-[#ffbc34] text-xs uppercase font-bold tracking-widest mt-1">
                        {it.subCollection || 'Hlavní sbírka'} • {it.inventoryNumber || it.accessionNumber}
                    </p>
                </div>
                <Link to="/" className="genric-btn default-border small radius uppercase font-bold text-[10px]">Zpět do katalogu</Link>
            </div>

            <div className="row">
                {/* LEVÁ ČÁST: GALERIE */}
                <div className="col-lg-4 mb-6">
                    <div className="bg-gray-50 p-4 rounded border border-gray-100 mb-4 flex justify-center items-center h-[450px]">
                        <SafeImage
                            src={it.primaryImageUrl}
                            alt={it.title}
                            className="max-w-full max-h-full object-contain"
                        />
                    </div>
                    {images.length > 1 && (
                        <div className="flex gap-2 overflow-x-auto pb-2">
                            {images.map((url: string, idx: number) => (
                                <div key={idx} className="min-w-[80px] h-[60px] rounded border overflow-hidden shadow-sm bg-white">
                                    <img src={url} className="w-full h-full object-cover" alt={`Náhled ${idx}`} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* PRAVÁ ČÁST: DATA */}
                <div className="col-lg-8">
                    <div className="card shadow-sm border-0 mb-6">
                        <div className="card-header bg-gray-50 border-0 py-3">
                            <h6 className="m-0 text-[10px] font-bold uppercase text-gray-500 tracking-widest">Odborné informace</h6>
                        </div>
                        <div className="card-body p-6">
                            <div className="row g-4">
                                <DataRow label="Původce / Autor" value={authors} />
                                <DataRow label="Datace" value={it.datingText} />
                                <DataRow label="Materiál" value={materials} isItalic />
                                <DataRow label="Technika" value={it.technique} isItalic />
                                <DataRow label="Země původu" value={it.countryOfOrigin} />
                                <DataRow label="Fyzický stav" value={it.objectCondition} fallback="Neuveden" />
                            </div>
                        </div>
                    </div>

                    <div className="card shadow-sm border-0 mb-6">
                        <div className="card-body p-6">
                            <h6 className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-3">Popis předmětu</h6>
                            <p className="text-gray-700 leading-relaxed">{it.description || 'Popis nebyl dosud zpracován.'}</p>
                        </div>
                    </div>

                    {/* HISTORICKÁ DATA (DEMUS) */}
                    {it.legacyData && Object.keys(it.legacyData).length > 0 && (
                        <div className="card shadow-sm border-0 mb-6 bg-gray-50/50">
                            <div className="card-header bg-white border-b py-3">
                                <h6 className="m-0 text-[10px] font-bold uppercase text-gray-500 tracking-widest text-center">Historická a doplňková data</h6>
                            </div>
                            <div className="card-body p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10">
                                    <div className="space-y-1">
                                        <LegacyRow label="Výška" value={it.legacyData.vyska ? `${it.legacyData.vyska} cm` : null} />
                                        <LegacyRow label="Šířka" value={it.legacyData.sirka ? `${it.legacyData.sirka} cm` : null} />
                                        <LegacyRow label="Hloubka" value={it.legacyData.hloubka ? `${it.legacyData.hloubka} cm` : null} />
                                    </div>
                                    <div className="space-y-1">
                                        <LegacyRow label="Původní majitel" value={it.legacyData.predchozi_majitel} />
                                        <LegacyRow label="Způsob nabytí" value={it.legacyData.zpusob_nabyti} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="row g-4 mb-6">
                        <div className="col-md-6">
                            <div className="card h-100 shadow-sm border-0">
                                <div className="card-header bg-gray-50 py-3"><h6 className="m-0 text-[10px] font-bold uppercase text-gray-500">Fyzické parametry</h6></div>
                                <div className="card-body p-4 flex justify-between items-center">
                                    <span className="text-[10px] uppercase text-gray-400 font-bold">Váha</span>
                                    <span className="text-xl font-bold text-[#1f262d]">{it.weight ? `${it.weight} kg` : '—'}</span>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-6">
                            <div className="card h-100 shadow-sm border-0">
                                <div className="card-header bg-gray-50 py-3"><h6 className="m-0 text-[10px] font-bold uppercase text-gray-500">Evidence</h6></div>
                                <div className="card-body p-4">
                                    <div className="flex justify-between mb-2">
                                        <span className="text-[10px] uppercase text-gray-400 font-bold">Inventární číslo</span>
                                        <span className="font-mono font-bold text-[#ffbc34]">{it.inventoryNumber || '—'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[10px] uppercase text-gray-400 font-bold">Správce</span>
                                        <span className="font-bold text-gray-700">{it.spravce || '—'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* HISTORIE */}
                    <div className="bg-white p-6 shadow-sm rounded border border-gray-100">
                        <h6 className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-6">Historie záznamu</h6>
                        <div className="ml-4 border-l-2 border-gray-100 space-y-6">
                            {it.events?.map((ev: any, i: number) => (
                                <div key={i} className="relative pl-6">
                                    <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white border-2 border-[#ffbc34]" />
                                    <div className="text-xs font-bold text-gray-800">{new Date(ev.eventDate).toLocaleDateString('cs-CZ')}</div>
                                    <div className="text-[9px] uppercase font-black text-[#ffbc34] tracking-tighter">{ev.type}</div>
                                    <p className="text-sm text-gray-600 italic mt-1 leading-snug">"{ev.description}"</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}