import React from 'react';

interface MuseumCardPrintProps {
    item: any;
    onClose: () => void;
}

export default function MuseumCardPrint({ item, onClose }: MuseumCardPrintProps) {
    const handlePrint = () => {
        window.print();
    };

    const primaryImg = item.primaryImageUrl || (item.imageUrls && item.imageUrls[0]) || (item.images && item.images[0]);
    const today = new Date().toLocaleDateString('cs-CZ');

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] overflow-y-auto p-4 flex flex-col items-center">
            {/* OVLÁDACÍ LIŠTA PRO OBRAZOVKU (skryje se při tisku) */}
            <div className="no-print bg-white rounded-lg shadow-lg p-4 mb-4 max-w-4xl w-full flex justify-between items-center border border-gray-200">
                <div className="flex items-center gap-3">
                    <span className="text-xl">🖨️</span>
                    <div>
                        <h4 className="font-extrabold text-gray-900 text-sm">Náhled muzejní karty k tisku</h4>
                        <p className="text-xs text-gray-500">Formát A4 optimalizovaný pro archivní tisk</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded text-xs font-bold uppercase hover:bg-gray-50"
                    >
                        Zavřít náhled
                    </button>
                    <button
                        onClick={handlePrint}
                        className="px-5 py-2 bg-[#00204a] text-white rounded text-xs font-bold uppercase hover:bg-[#00173a] shadow"
                    >
                        Vytisknout kartu (Ctrl+P)
                    </button>
                </div>
            </div>

            {/* SAMOTNÁ MUZEJNÍ KARTA PRO TISK */}
            <div
                id="museum-card-content"
                className="bg-white text-black p-8 rounded shadow-2xl max-w-4xl w-full border border-gray-300 print:border-none print:shadow-none print:p-0 print:m-0"
                style={{ minHeight: '297mm' }}
            >
                <style>{`
                    @media print {
                        body * {
                            visibility: hidden;
                        }
                        #museum-card-content, #museum-card-content * {
                            visibility: visible;
                        }
                        #museum-card-content {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                            padding: 15mm;
                        }
                        .no-print {
                            display: none !important;
                        }
                    }
                `}</style>

                {/* HLAVIČKA INSTITUCE */}
                <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-start">
                    <div>
                        <h1 className="text-xl font-black uppercase tracking-wider text-gray-900">Moravské zemské muzeum</h1>
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-600">Muzejní evidence sbírek • Karta sbírkového předmětu</p>
                    </div>
                    <div className="text-right text-xs">
                        <div className="font-mono font-bold">Tisk dne: {today}</div>
                        <div className="text-gray-500 uppercase text-[10px]">Systém CURATAS</div>
                    </div>
                </div>

                {/* ZÁKLADNÍ IDENTIFIKACE */}
                <div className="grid grid-cols-3 gap-6 mb-6">
                    <div className="col-span-2 space-y-3">
                        <div className="bg-gray-100 p-3 rounded border border-gray-300">
                            <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Inventární číslo</div>
                            <div className="text-2xl font-mono font-black text-black">{item.inventoryNumber || '—'}</div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="border border-gray-200 p-2.5 rounded">
                                <div className="text-[9px] uppercase font-bold text-gray-400">Přírůstkové číslo</div>
                                <div className="font-mono font-bold text-sm">{item.accessionNumber || '—'}</div>
                            </div>
                            <div className="border border-gray-200 p-2.5 rounded">
                                <div className="text-[9px] uppercase font-bold text-gray-400">Podsbírka / Fond</div>
                                <div className="font-bold text-sm">{item.subCollection || 'Hlavní sbírka'}</div>
                            </div>
                        </div>

                        <div>
                            <div className="text-[10px] uppercase font-bold text-gray-400">Název předmětu</div>
                            <div className="text-lg font-bold text-gray-900">{item.title}</div>
                        </div>
                    </div>

                    {/* FOTOGRAFIE PŘEDMĚTU */}
                    <div className="border-2 border-gray-300 rounded p-2 flex items-center justify-center bg-gray-50 h-[190px]">
                        {primaryImg ? (
                            <img src={primaryImg} alt={item.title} className="max-h-full max-w-full object-contain" />
                        ) : (
                            <span className="text-xs text-gray-400 italic">Bez fotografie</span>
                        )}
                    </div>
                </div>

                {/* ODBORNÝ POPIS A DATA */}
                <div className="border-t border-gray-200 pt-4 mb-6">
                    <table className="w-full text-xs border-collapse">
                        <tbody>
                            <tr className="border-b border-gray-200">
                                <td className="py-2 pr-4 font-bold uppercase text-gray-500 w-1/4">Autor / Původce:</td>
                                <td className="py-2 text-gray-900 font-semibold">{item.author || 'Anonymní'}</td>
                                <td className="py-2 pr-4 font-bold uppercase text-gray-500 w-1/4">Datace vzniku:</td>
                                <td className="py-2 text-gray-900 font-semibold">{item.datingText || '—'}</td>
                            </tr>
                            <tr className="border-b border-gray-200">
                                <td className="py-2 pr-4 font-bold uppercase text-gray-500">Materiál:</td>
                                <td className="py-2 text-gray-900">{item.material || '—'}</td>
                                <td className="py-2 pr-4 font-bold uppercase text-gray-500">Technika:</td>
                                <td className="py-2 text-gray-900">{item.technique || '—'}</td>
                            </tr>
                            <tr className="border-b border-gray-200">
                                <td className="py-2 pr-4 font-bold uppercase text-gray-500">Země původu:</td>
                                <td className="py-2 text-gray-900">{item.countryOfOrigin || '—'}</td>
                                <td className="py-2 pr-4 font-bold uppercase text-gray-500">Místo nálezu / vzniku:</td>
                                <td className="py-2 text-gray-900">{item.originPlace || item.findingLocality || '—'}</td>
                            </tr>
                            <tr className="border-b border-gray-200">
                                <td className="py-2 pr-4 font-bold uppercase text-gray-500">Fyzický stav:</td>
                                <td className="py-2 text-gray-900 font-bold">{item.objectCondition || 'Dobrý'}</td>
                                <td className="py-2 pr-4 font-bold uppercase text-gray-500">Hmotnost:</td>
                                <td className="py-2 text-gray-900">{item.weight ? `${item.weight} kg` : '—'}</td>
                            </tr>
                            <tr className="border-b border-gray-200">
                                <td className="py-2 pr-4 font-bold uppercase text-gray-500">Umístění (budova / místnost):</td>
                                <td className="py-2 text-gray-900 font-semibold">
                                    {item.locationBuilding || '—'}{item.locationRoom ? `, m. ${item.locationRoom}` : ''}
                                </td>
                                <td className="py-2 pr-4 font-bold uppercase text-gray-500">Správce fondu:</td>
                                <td className="py-2 text-gray-900">{item.spravce || '—'}</td>
                            </tr>
                            {item.latitude && item.longitude && (
                                <tr className="border-b border-gray-200">
                                    <td className="py-2 pr-4 font-bold uppercase text-gray-500">GPS souřadnice:</td>
                                    <td colSpan={3} className="py-2 text-gray-900 font-mono">
                                        {item.latitude}° N, {item.longitude}° E ({item.coordinateSystem || 'WGS84'})
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* PODROBNÝ POPIS */}
                <div className="mb-6">
                    <div className="text-[10px] uppercase font-bold text-gray-400 mb-1">Odborný popis předmětu</div>
                    <p className="text-xs text-gray-800 leading-relaxed border border-gray-200 rounded p-3 bg-gray-50/50">
                        {item.description || 'Popis dosud nebyl odborně zpracován.'}
                    </p>
                </div>

                {/* ROZMĚRY */}
                {item.dimensions && item.dimensions.length > 0 && (
                    <div className="mb-6">
                        <div className="text-[10px] uppercase font-bold text-gray-400 mb-1">Fyzické rozměry</div>
                        <div className="flex flex-wrap gap-4 text-xs font-semibold">
                            {item.dimensions.map((d: any, idx: number) => (
                                <span key={idx} className="bg-gray-100 px-2.5 py-1 rounded border border-gray-300">
                                    {d.type}: <strong>{d.value} {d.unit || 'cm'}</strong>
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* PATIČKA KARTY S PODPISOVÝM POLEM */}
                <div className="border-t-2 border-black pt-8 mt-12 grid grid-cols-2 gap-12 text-xs">
                    <div>
                        <div className="text-gray-500 uppercase text-[10px] mb-8">Zpracoval / vytiskl:</div>
                        <div className="border-b border-dashed border-gray-400 pb-1 font-semibold">
                            {item.modifiedByUser || item.createdByUser || 'Kurátor sbírky'}
                        </div>
                    </div>
                    <div>
                        <div className="text-gray-500 uppercase text-[10px] mb-8">Podpis správce sbírky:</div>
                        <div className="border-b border-dashed border-gray-400 pb-1 text-center text-gray-400 italic">
                            (podpis a razítko)
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}