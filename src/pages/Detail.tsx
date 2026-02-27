import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getItem } from '../lib/api'

// POMOCNÁ KOMPONENTA PRO VÝPIS JEDNOHO ŘÁDKU Z DEMUSU
const LegacyRow = ({ label, value }: { label: string; value: any }) => {
    if (!value) return null; // Pokud údaj chybí, řádek nevykreslíme

    return (
        <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 px-2 -mx-2 rounded transition-colors">
            <span className="text-[10px] uppercase text-gray-500 font-bold tracking-wider sm:w-1/3 pt-1">{label}</span>
            <span className="text-sm text-gray-800 font-medium sm:w-2/3 sm:text-right">
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

    return (
        <div className="container-fluid pb-20 animate-in fade-in duration-500">
            {/* HLAVIČKA KARTY */}
            <div className="flex justify-between items-start mb-8 border-b pb-6">
                <div className="border-l-4 border-[#ffbc34] pl-4">
                    <h1 className="text-4xl font-bold text-[#1f262d]">{it.title}</h1>
                    <p className="text-[#ffbc34] text-xs uppercase font-bold tracking-widest mt-1">
                        {it.subCollection || 'Hlavní sbírka'} • {it.accessionNumber || 'Bez přírůstkového čísla'}
                    </p>
                </div>
                <Link to="/" className="genric-btn default-border small radius">Zpět do katalogu</Link>
            </div>

            <div className="row">
                {/* LEVÝ SLOUPEC: OBRÁZKY */}
                <div className="col-lg-4 mb-6">
                    <div className="bg-white p-4 shadow-sm rounded border border-gray-100 mb-4">
                        <img
                            src={it.primaryImageUrl || 'https://via.placeholder.com/800x600?text=Bez+fotografie'}
                            className="img-fluid w-full rounded object-cover"
                            alt={it.title}
                        />
                    </div>

                    {/* Zobrazení dalších fotek (příprava pro nahrávání) */}
                    {it.images && it.images.length > 1 && (
                        <div className="flex gap-2 overflow-x-auto pb-2">
                            {it.images.map((url: string, idx: number) => (
                                <img key={idx} src={url} className="w-20 h-20 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity" alt={`Náhled ${idx+1}`} />
                            ))}
                        </div>
                    )}
                </div>

                {/* PRAVÝ SLOUPEC: KOMPLETNÍ DATA */}
                <div className="col-lg-8">

                    {/* BLOK 1: ZÁKLADNÍ ÚDAJE & PROVENIENCE */}
                    <div className="card shadow-sm border-0 mb-6">
                        <div className="card-header bg-[#f8f9fa] border-0 py-3">
                            <h6 className="m-0 text-xs font-bold uppercase text-[#3e5569]">Základní údaje a Původ</h6>
                        </div>
                        <div className="card-body p-6">
                            <div className="row g-4">
                                <div className="col-md-6">
                                    <h6 className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">Původce / Autor</h6>
                                    <p className="text-lg text-dark font-serif">{it.authors?.length > 0 ? it.authors.join(', ') : 'Nezjištěno'}</p>
                                </div>
                                <div className="col-md-6">
                                    <h6 className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">Datace</h6>
                                    <p className="text-lg text-dark">{it.datingText || 'Nezjištěno'}</p>
                                </div>
                                <div className="col-md-6">
                                    <h6 className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">Země původu / Naleziště</h6>
                                    <p className="text-md text-dark font-medium">{it.countryOfOrigin || 'Nezjištěno'}</p>
                                </div>
                                <div className="col-md-6">
                                    <h6 className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">Fyzický stav</h6>
                                    <p className="text-md text-dark font-medium">{it.objectCondition || 'Neuveden'}</p>
                                </div>
                                <div className="col-md-6">
                                    <h6 className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">Materiál</h6>
                                    <p className="text-md text-dark italic">{it.materials?.join(', ') || it.material || 'Neuveden'}</p>
                                </div>
                                <div className="col-md-6">
                                    <h6 className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">Technika</h6>
                                    <p className="text-md text-dark italic">{it.technique || 'Neuvedena'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* BLOK 2: TEXTOVÝ POPIS */}
                    <div className="card shadow-sm border-0 mb-6">
                        <div className="card-body p-6">
                            <h6 className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-2">Základní popis</h6>
                            <p className="text-gray-700 leading-relaxed mb-0">{it.description || 'Předmět nemá vyplněný stručný popis.'}</p>

                            {/* Zobrazí se pouze, pokud je vyplněn v DB */}
                            {it.extendedDescription && (
                                <div className="mt-6 border-t pt-4">
                                    <h6 className="text-[10px] uppercase font-bold text-[#ffbc34] tracking-widest mb-2">Kurátorský / Odborný popis</h6>
                                    <p className="text-gray-600 leading-relaxed text-sm bg-gray-50 p-4 rounded border-l-2 border-gray-200">
                                        {it.extendedDescription}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* BLOK 2.5: HISTORICKÁ DATA Z DEMUSU (Zobrazí se jen pokud nějaká jsou) */}
                    {it.legacyData && Object.keys(it.legacyData).length > 0 && (
                        <div className="card shadow-sm border-0 mb-6 border-l-4 border-[#3e5569]">
                            <div className="card-header bg-white border-b border-gray-100 py-4 flex justify-between items-center">
                                <h6 className="m-0 text-xs font-bold uppercase text-[#3e5569] tracking-widest">
                                    <i className="fa fa-archive mr-2"></i> Původní evidence z Demusu
                                </h6>
                                <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-1 rounded">Historická data</span>
                            </div>
                            <div className="card-body p-6">
                                <LegacyRow label="Způsob nabytí" value={it.legacyData.zpusob_nabyti} />
                                <LegacyRow label="Předchozí majitel" value={it.legacyData.predchozi_majitel} />
                                <LegacyRow label="Okolnosti nabytí" value={it.legacyData.okolnosti_nabyti} />
                                <LegacyRow label="Fond / Sbírka" value={it.legacyData.fond} />
                                <LegacyRow label="Původní Autor" value={it.legacyData.autor} />
                                <LegacyRow label="Místo vzniku" value={it.legacyData.misto_vzniku} />
                                <LegacyRow label="Původní lokace" value={it.legacyData.aktualni_lokace} />
                                <LegacyRow label="Strukturované rozměry" value={it.legacyData.rozmery_strukturovane} />
                                <LegacyRow label="Historická poznámka" value={it.legacyData.poznamka} />
                                <LegacyRow label="Zapsal (Kurátor)" value={it.legacyData.zapsal} />
                                <LegacyRow label="Datum zápisu" value={it.legacyData.datum_zapisu} />
                                <LegacyRow label="Identifikátor v Demusu" value={it.legacyData.demus_id} />
                            </div>
                        </div>
                    )}

                    {/* BLOK 3: ROZMĚRY & ADMINISTRACE */}
                    <div className="row">
                        <div className="col-md-6 mb-6">
                            <div className="card h-100 shadow-sm border-0">
                                <div className="card-header bg-[#f8f9fa] border-0 py-3">
                                    <h6 className="m-0 text-xs font-bold uppercase text-[#3e5569]">Rozměry a váha</h6>
                                </div>
                                <div className="card-body p-0">
                                    <table className="table table-hover mb-0 border-0">
                                        <tbody>
                                        {it.dimensions && it.dimensions.length > 0 ? it.dimensions.map((d: any, i: number) => (
                                            <tr key={i}>
                                                <td className="text-muted border-0 text-xs uppercase px-4 align-middle">{d.type}</td>
                                                <td className="text-right border-0 font-mono font-bold px-4 align-middle">{d.value} {d.unit}</td>
                                            </tr>
                                        )) : <tr><td className="p-4 text-xs italic text-gray-400">Údaje o rozměrech chybí.</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <div className="col-md-6 mb-6">
                            <div className="card h-100 shadow-sm border-0">
                                <div className="card-header bg-[#f8f9fa] border-0 py-3">
                                    <h6 className="m-0 text-xs font-bold uppercase text-[#3e5569]">Administrativní údaje</h6>
                                </div>
                                <div className="card-body p-4 text-sm">
                                    <div className="flex justify-between border-b pb-2 mb-2">
                                        <span className="text-[10px] uppercase text-gray-400 font-bold">Inventární číslo</span>
                                        <span className="font-mono font-bold text-[#ffbc34]">{it.inventoryNumber || '—'}</span>
                                    </div>
                                    <div className="flex justify-between border-b pb-2 mb-2">
                                        <span className="text-[10px] uppercase text-gray-400 font-bold">Odpovědný správce</span>
                                        <span className="font-bold text-blue-600">{it.spravce || '—'}</span>
                                    </div>
                                    {it.statSpr && (
                                        <div className="flex justify-between pt-1">
                                            <span className="text-[10px] uppercase text-gray-400 font-bold">Státní správa (CES)</span>
                                            <span className="font-bold">{it.statSpr === 'A' ? 'Ano' : 'Ne'}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* BLOK 4: HISTORIE ZÁZNAMU */}
                    <div className="mt-4 bg-white p-6 shadow-sm rounded border border-gray-100">
                        <h6 className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-6">
                            <i className="fa fa-history mr-2"></i>Historie záznamu a revizí
                        </h6>
                        <div className="ml-4 border-l-2 border-gray-100 space-y-6 pb-2">
                            {it.events && it.events.length > 0 ? it.events.map((ev: any, i: number) => (
                                <div key={i} className="relative pl-6 hover:bg-gray-50 p-2 -ml-2 rounded transition-colors">
                                    <div className="absolute -left-[11px] top-3 w-4 h-4 rounded-full bg-white border-2 border-[#ffbc34]" />
                                    <div className="text-xs font-bold text-dark">{new Date(ev.eventDate).toLocaleDateString('cs-CZ')}</div>
                                    <div className="text-[10px] uppercase font-bold text-[#ffbc34] tracking-wider mb-1">{ev.type}</div>
                                    <p className="text-sm text-gray-600 italic mb-0 leading-snug">"{ev.description}"</p>
                                </div>
                            )) : <p className="text-gray-400 text-sm italic pl-6">Historie záznamu je zatím prázdná.</p>}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    )
}