import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { GovButton } from '@gov-design-system-ce/react';
import { getItem } from '../lib/api';
import SafeImage from "@/components/SafeImage";

// Pomocná komponenta pro čistší kód
const DataRow = ({ label, value, fallback = 'Nezjištěno', isItalic = false }: any) => (
    <div className="space-y-1">
        <h4 className="text-xs uppercase font-extrabold text-gray-400 tracking-wider">{label}</h4>
        <p className={`text-base text-gray-900 ${isItalic ? 'italic' : 'font-semibold'}`}>
            {value && value !== "" ? value : fallback}
        </p>
    </div>
);

const LegacyRow = ({ label, value }: { label: string; value: any }) => {
    if (!value) return null;
    return (
        <div className="flex justify-between py-2.5 border-b border-gray-100 last:border-0 hover:bg-gray-50 px-2 -mx-2 rounded transition-colors">
            <span className="text-xs uppercase text-gray-500 font-extrabold tracking-wider">{label}</span>
            <span className="text-sm text-gray-800 font-semibold text-right">
                {Array.isArray(value) ? value.join(' | ') : value}
            </span>
        </div>
    );
};

export default function Detail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [it, setIt] = useState<any>(null);

    useEffect(() => {
        if (id) getItem(id).then(setIt).catch(console.error);
    }, [id]);

    if (!it) {
        return (
            <div className="p-20 text-center flex flex-col items-center justify-center space-y-3">
                <span className="text-3xl animate-spin">⏳</span>
                <p className="italic text-gray-500 font-medium">Načítám kompletní kartu předmětu...</p>
            </div>
        );
    }

    // Sjednocení dat pro zobrazení
    const authors = it.authors?.length > 0 ? it.authors.join(', ') : it.author;
    const materials = it.materials?.length > 0 ? it.materials.join(', ') : it.material;
    const images = it.imageUrls || it.images || [];

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12">

            {/* HLAVIČKA */}
            <div className="border-b border-gray-200 pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div className="space-y-2">
                    <h1 className="text-3xl font-extrabold text-[#00204a] tracking-tight leading-tight">{it.title}</h1>
                    <p className="text-[#ffbc34] text-xs uppercase font-extrabold tracking-widest flex items-center gap-2">
                        <span className="bg-[#ffbc34]/10 text-black px-2 py-0.5 rounded font-black">
                            {it.subCollection || 'Hlavní sbírka'}
                        </span>
                        <span>•</span>
                        <span>{it.inventoryNumber || it.accessionNumber}</span>
                    </p>
                </div>
                <GovButton
                    type="outlined"
                    color="primary"
                    size="s"
                    onClick={() => navigate('/')}
                >
                    Zpět do katalogu
                </GovButton>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* LEVÁ ČÁST: GALERIE S OBRÁZKY */}
                <div className="space-y-4">
                    <div className="bg-white p-4 rounded border border-gray-200 shadow-sm flex justify-center items-center h-[420px]">
                        <SafeImage
                            src={it.primaryImageUrl}
                            alt={it.title}
                            className="max-w-full max-h-full object-contain rounded"
                        />
                    </div>
                    {images.length > 1 && (
                        <div className="flex gap-2 overflow-x-auto pb-2">
                            {images.map((url: string, idx: number) => (
                                <div key={idx} className="min-w-[80px] h-[60px] rounded border border-gray-200 overflow-hidden shadow-sm bg-white hover:border-gray-400 transition-colors cursor-pointer">
                                    <img src={url} className="w-full h-full object-cover" alt={`Náhled ${idx}`} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* PRAVÁ ČÁST: ODBORNÁ DATA A POPIS */}
                <div className="lg:col-span-2 space-y-6">

                    {/* ODBORNÉ INFORMACE */}
                    <div className="bg-white rounded border border-gray-200 shadow-sm overflow-hidden">
                        <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
                            <h2 className="text-sm font-black uppercase text-gray-500 tracking-wider">Odborné informace o předmětu</h2>
                        </div>
                        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                            <DataRow label="Původce / Autor" value={authors} />
                            <DataRow label="Datace" value={it.datingText} />
                            <DataRow label="Materiál" value={materials} isItalic />
                            <DataRow label="Technika" value={it.technique} isItalic />
                            <DataRow label="Země původu" value={it.countryOfOrigin} />
                            <DataRow label="Fyzický stav" value={it.objectCondition} fallback="Neuveden" />
                        </div>
                    </div>

                    {/* POPIS PŘEDMĚTU */}
                    <div className="bg-white rounded border border-gray-200 shadow-sm p-6 space-y-3">
                        <h3 className="text-xs uppercase font-extrabold text-gray-400 tracking-wider">Odborný popis předmětu</h3>
                        <p className="text-gray-700 leading-relaxed text-sm whitespace-pre-line">
                            {it.description || 'Popis nebyl dosud odborně zpracován.'}
                        </p>
                    </div>

                    {/* HISTORICKÁ DATA (DEMUS) */}
                    {it.legacyData && Object.keys(it.legacyData).length > 0 && (
                        <div className="bg-white rounded border border-gray-200 shadow-sm overflow-hidden">
                            <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
                                <h3 className="text-sm font-black uppercase text-gray-500 tracking-wider">Historická a doplňková data (DEMUS)</h3>
                            </div>
                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-12">
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
                    )}

                    {/* PARAMETRY EVIDENCE */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="bg-white rounded border border-gray-200 shadow-sm overflow-hidden">
                            <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
                                <h4 className="text-xs font-black uppercase text-gray-500">Fyzické parametry</h4>
                            </div>
                            <div className="p-5 flex justify-between items-center">
                                <span className="text-xs uppercase text-gray-400 font-extrabold tracking-wider">Hmotnost předmětu</span>
                                <span className="text-xl font-bold text-gray-900">{it.weight ? `${it.weight} kg` : '—'}</span>
                            </div>
                        </div>
                        <div className="bg-white rounded border border-gray-200 shadow-sm overflow-hidden">
                            <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
                                <h4 className="text-xs font-black uppercase text-gray-500">Administrativní evidence</h4>
                            </div>
                            <div className="p-4 space-y-3 text-sm">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs uppercase text-gray-400 font-extrabold tracking-wider">Inventární číslo</span>
                                    <span className="font-mono font-black text-[#ffbc34]">{it.inventoryNumber || '—'}</span>
                                </div>
                                <div className="flex justify-between items-center border-t border-gray-100 pt-2">
                                    <span className="text-xs uppercase text-gray-400 font-extrabold tracking-wider">Správce fondu</span>
                                    <span className="font-bold text-gray-700">{it.spravce || '—'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* HISTORIE AKTIVIT */}
                    {it.events && it.events.length > 0 && (
                        <div className="bg-white p-6 rounded border border-gray-200 shadow-sm space-y-6">
                            <h3 className="text-xs uppercase font-extrabold text-gray-400 tracking-wider">Historie záznamu a revize</h3>
                            <div className="ml-4 border-l-2 border-gray-100 space-y-6">
                                {it.events.map((ev: any, i: number) => (
                                    <div key={i} className="relative pl-6">
                                        <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-white border-2 border-[#ffbc34]" />
                                        <div className="text-xs font-black text-gray-800">{new Date(ev.eventDate).toLocaleDateString('cs-CZ')}</div>
                                        <div className="text-[10px] uppercase font-black text-[#ffbc34] tracking-wider mt-0.5">{ev.type}</div>
                                        <p className="text-sm text-gray-600 italic mt-1 leading-snug">"{ev.description}"</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
