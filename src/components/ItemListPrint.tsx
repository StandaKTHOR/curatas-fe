import {useState} from 'react';
import {printDocument,printColumns,downloadPrint,firstPrintImage,printImages,type PrintVariant} from '../features/catalog/printDocument';
import {originalIntegrationEnabled,originalSession} from '../features/catalog/originalAdapter';
import React from 'react';
import { resolveApiUrl } from '@/lib/api';

export interface PrintItemRow {
    id: number;
    inventoryNumber?: string;
    accessionNumber?: string;
    title: string;
    author?: string;
    datingText?: string;
    datingFrom?: string | number;
    datingTo?: string | number;
    material?: string;
    technique?: string;
    subCollection?: string;
    locationBuilding?: string;
    locationRoom?: string;
    permanentLocation?: string;
    objectCondition?: string;
    spravce?: string;
    primaryImageUrl?: string;
    description?: string;
}

interface ItemListPrintProps {
    items: PrintItemRow[];
    title?: string;
    subCollection?: string;
    filterDescription?: string;
    totalCount?: number;
    mode?: 'list' | 'cards';
    onClose: () => void;
}

export default function ItemListPrint({
    items,
    title = 'INVENTÁRNÍ SOUPIS SBÍRKOVÝCH PŘEDMĚTŮ',
    subCollection,
    filterDescription,
    totalCount,
    mode = 'list',
    onClose
}: ItemListPrintProps) {
    const [variant,setVariant]=useState<PrintVariant>('list'),[columns,setColumns]=useState(Object.keys(printColumns)),[photos,setPhotos]=useState(false),[photoMode,setPhotoMode]=useState<'one'|'all'>('one'),[busy,setBusy]=useState(false),[error,setError]=useState('');
    async function documentOutput(download=false){
        if(busy)return;const preview=download?null:window.open('','_blank');if(!download&&!preview){setError('Povolte otevření tiskového náhledu.');return;}
        if(preview)preview.opener=null;setBusy(true);setError('');
        try{const images:Record<number,string[]>={};if(photos&&originalIntegrationEnabled()){
            if(items.length>50)throw new Error('Tisk s fotografiemi je omezen na 50 předmětů; zúžte výběr.');
            const {api,signal}=originalSession();for(const row of items){const load=(after?:string)=>api.media(row.id,signal,after);const first=photoMode==='one'?await firstPrintImage(load):undefined;const entries=photoMode==='all'?await printImages(load):first?[first]:[];images[row.id]=[];for(const image of entries){const blob=await api.bytes(row.id,image,image.variants.includes('thumbnail')?'thumbnail':'content',signal,5*1024*1024);images[row.id].push(await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=reject;reader.readAsDataURL(blob);}));}}
        }const html=printDocument(items,columns,variant,images);if(download)downloadPrint(html);else if(preview){preview.document.open();preview.document.write(html);preview.document.close();preview.focus();}}
        catch(e){preview?.close();setError((e as Error).message);}finally{setBusy(false);}
    }
    const handlePrint = () => {
        window.print();
    };

    const today = new Date().toLocaleDateString('cs-CZ');

    return (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[9999] overflow-y-auto p-4 flex flex-col items-center">
            {/* OVLÁDACÍ LIŠTA PRO OBRAZOVKU */}
            <div className="no-print bg-white rounded-lg shadow-xl p-4 mb-4 max-w-5xl w-full flex flex-col gap-3 border border-gray-300">
                <div className="flex flex-wrap justify-between items-center gap-3">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">🖨️</span>
                        <div>
                            <h4 className="font-extrabold text-gray-900 text-sm">
                                {mode === 'cards' ? 'Tisk katalogizačních karet' : 'Tisk inventárního soupisu'}
                            </h4>
                            <p className="text-xs text-gray-500">
                                Počet položek k tisku: <span className="font-bold text-[#00204a]">{items.length}</span>
                                {totalCount && totalCount > items.length ? ` (z celkových ${totalCount})` : ''}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded text-xs font-bold uppercase hover:bg-gray-100 transition-colors"
                        >
                            Zavřít náhled
                        </button>
                        <button
                            onClick={handlePrint}
                            className="px-5 py-2 bg-[#00204a] text-white rounded text-xs font-bold uppercase hover:bg-[#00173a] shadow transition-colors"
                        >
                            Vytisknout (Ctrl+P)
                        </button>
                    </div>
                </div>

                <fieldset disabled={busy}><legend>Podporované tiskové varianty</legend><select aria-label="Tisková varianta" value={variant} onChange={e=>setVariant(e.target.value as PrintVariant)}><option value="list">Soupis</option><option value="a5">Technická karta A5 na šířku</option><option value="two-a5">Technické karty 2× A5 na A4</option></select><label><input type="checkbox" checked={photos} onChange={e=>setPhotos(e.target.checked)}/>S fotografií (nejvýše 50 položek)</label>{photos&&<label>Počet fotografií<select aria-label="Počet fotografií v tisku" value={photoMode} onChange={e=>setPhotoMode(e.target.value as 'one'|'all')}><option value="one">Jedna fotografie</option><option value="all">Všechny fotografie (nejvýše 20 na předmět)</option></select></label>}<details><summary>Sloupce / pole tisku</summary>{Object.entries(printColumns).map(([key,label])=><label key={key}><input type="checkbox" checked={columns.includes(key)} onChange={e=>setColumns(v=>e.target.checked?[...v,key]:v.filter(k=>k!==key))}/>{label}</label>)}</details><button type="button" disabled={!columns.length} onClick={()=>void documentOutput()}>Otevřít tiskový náhled</button><button type="button" disabled={!columns.length} onClick={()=>void documentOutput(true)}>Stáhnout tiskový dokument</button></fieldset><p>Technická A5 šablona není schválený vzor DEMUS. Dlouhý obsah může pokračovat na další stránce; žádný údaj se neořezává. Náhled vytiskněte přes Ctrl+P.</p>{busy&&<p role="status">Generuji tiskový dokument…</p>}{error&&<p role="alert">{error}</p>}
                {totalCount && totalCount > items.length && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3 py-2 rounded flex items-center gap-2">
                        <span>⚠️</span>
                        <span>
                            <strong>Bezpečnostní limit tisku:</strong> Tisková sestava byla z důvodu stability a výkonu omezena na prvních {items.length} z celkových {totalCount} nalezených položek. Pro kompletní export takto rozsáhlého datasetu využijte export do Excelu.
                        </span>
                    </div>
                )}

                {items.length > 1000 && (
                    <div className="bg-blue-50 border border-blue-200 text-blue-800 text-xs px-3 py-2 rounded flex items-center gap-2">
                        <span>💡</span>
                        <span>
                            Tisková sestava obsahuje velký počet položek ({items.length}). Příprava tiskového náhledu v prohlížeči může trvat několik sekund.
                        </span>
                    </div>
                )}

                {mode === 'cards' && items.length > 50 && items.length <= 1000 && (
                    <div className="bg-blue-50 border border-blue-200 text-blue-800 text-xs px-3 py-2 rounded flex items-center gap-2">
                        <span>💡</span>
                        <span>
                            Při tisku velkého počtu katalogizačních karet ({items.length}) s fotografiemi může generování tiskového náhledu v prohlížeči trvat několik sekund.
                        </span>
                    </div>
                )}
            </div>

            {/* TISKOVÝ DOKUMENT */}
            <div
                id="printable-document"
                className="bg-white text-black p-8 rounded shadow-2xl max-w-5xl w-full print:border-none print:shadow-none print:p-0 print:m-0"
            >
                <style>{`
                    @media print {
                        body * {
                            visibility: hidden;
                        }
                        #printable-document, #printable-document * {
                            visibility: visible;
                        }
                        #printable-document {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                            padding: 0;
                            margin: 0;
                        }
                        .no-print {
                            display: none !important;
                        }
                        .page-break {
                            page-break-after: always;
                            break-after: page;
                        }
                        @page {
                            size: ${mode === 'cards' ? 'A4 portrait' : 'A4 landscape'};
                            margin: 12mm 10mm 15mm 10mm;
                        }
                    }
                `}</style>

                {mode === 'list' ? (
                    // 1. REŽIM INVENTÁRNÍ SOUPIS (TABULKA)
                    <div>
                        {/* ZÁHLAVÍ SOUPISU */}
                        <div className="border-b-2 border-black pb-3 mb-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h1 className="text-lg font-black tracking-tight uppercase text-black">{title}</h1>
                                    <p className="text-xs font-bold text-gray-700 mt-0.5">
                                        Fond / Podsbírka: {subCollection || 'Celý sbírkový fond'}
                                    </p>
                                    {filterDescription && (
                                        <p className="text-[11px] text-gray-600 mt-0.5 italic">
                                            Filtr: {filterDescription}
                                        </p>
                                    )}
                                </div>
                                <div className="text-right text-xs">
                                    <p className="font-bold">Datum vyhotovení: {today}</p>
                                    <p className="text-gray-600">Počet záznamů: {items.length}</p>
                                </div>
                            </div>
                        </div>

                        {/* TABULKA PŘEDMĚTŮ */}
                        <table className="w-full border-collapse text-[11px] leading-tight">
                            <thead>
                                <tr className="border-b-2 border-black bg-gray-100 font-bold text-left">
                                    <th className="p-1.5 border border-gray-400 w-8 text-center">Poř.</th>
                                    <th className="p-1.5 border border-gray-400 w-28">Přír. číslo</th>
                                    <th className="p-1.5 border border-gray-400 w-28">Inv. číslo</th>
                                    <th className="p-1.5 border border-gray-400">Název předmětu</th>
                                    <th className="p-1.5 border border-gray-400 w-32">Autor / Původce</th>
                                    <th className="p-1.5 border border-gray-400 w-24">Datace</th>
                                    <th className="p-1.5 border border-gray-400 w-32">Materiál / Technika</th>
                                    <th className="p-1.5 border border-gray-400 w-28">Umístění</th>
                                    <th className="p-1.5 border border-gray-400 w-20">Stav</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((it, idx) => {
                                    const materialTech = [it.material, it.technique].filter(Boolean).join(' / ') || '–';
                                    const location = [it.locationBuilding, it.locationRoom, it.permanentLocation].filter(Boolean).join(' / ') || '–';
                                    const dating = it.datingText || (it.datingFrom ? `${it.datingFrom}–${it.datingTo || ''}` : '–');

                                    return (
                                        <tr key={it.id || idx} className="border-b border-gray-300 hover:bg-gray-50">
                                            <td className="p-1.5 border border-gray-300 text-center font-mono">{idx + 1}</td>
                                            <td className="p-1.5 border border-gray-300 font-bold">{it.accessionNumber || '–'}</td>
                                            <td className="p-1.5 border border-gray-300 font-bold font-mono">{it.inventoryNumber || '–'}</td>
                                            <td className="p-1.5 border border-gray-300 font-semibold">{it.title}</td>
                                            <td className="p-1.5 border border-gray-300">{it.author || '–'}</td>
                                            <td className="p-1.5 border border-gray-300">{dating}</td>
                                            <td className="p-1.5 border border-gray-300">{materialTech}</td>
                                            <td className="p-1.5 border border-gray-300">{location}</td>
                                            <td className="p-1.5 border border-gray-300">{it.objectCondition || '–'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {/* ZÁPIS A PODPISY */}
                        <div className="mt-8 pt-4 border-t-2 border-black grid grid-cols-3 gap-6 text-xs text-center">
                            <div>
                                <p className="font-bold mb-8">Vyhotovil / Kurátor:</p>
                                <div className="border-b border-black w-4/5 mx-auto"></div>
                                <p className="text-[10px] text-gray-500 mt-1">podpis kurátora sbírky</p>
                            </div>
                            <div>
                                <p className="font-bold mb-8">Správce sbírky / Depozitář:</p>
                                <div className="border-b border-black w-4/5 mx-auto"></div>
                                <p className="text-[10px] text-gray-500 mt-1">podpis správce</p>
                            </div>
                            <div>
                                <p className="font-bold mb-8">Předseda inventarizační komise:</p>
                                <div className="border-b border-black w-4/5 mx-auto"></div>
                                <p className="text-[10px] text-gray-500 mt-1">datum a úřední razítko</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    // 2. REŽIM HROMADNÝ TISK KARET PŘEDMĚTŮ (A4 NA VÝŠKU, 1 PŘEDMĚT = 1 STRANA)
                    <div className="space-y-6">
                        {items.map((item, idx) => (
                            <div
                                key={item.id || idx}
                                className={`border border-gray-300 p-6 rounded bg-white print:border-none print:p-0 ${
                                    idx < items.length - 1 ? 'page-break' : ''
                                }`}
                                style={{ minHeight: '270mm' }}
                            >
                                <div className="border-b-2 border-black pb-2 mb-4 flex justify-between items-center">
                                    <div>
                                        <h2 className="text-base font-black uppercase tracking-tight">KATALOGIZAČNÍ KARTA SBÍRKOVÉHO PŘEDMĚTU</h2>
                                        <p className="text-xs text-gray-600">Moravské zemské muzeum – MESonline evidence</p>
                                    </div>
                                    <div className="text-right text-xs">
                                        <p className="font-bold">Strana {idx + 1} z {items.length}</p>
                                        <p className="text-gray-500">Tisk: {today}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-4 text-xs">
                                    <div className="space-y-1.5">
                                        <div className="flex border-b border-gray-200 py-1">
                                            <span className="w-36 font-bold text-gray-700">Inventární číslo:</span>
                                            <span className="font-bold font-mono text-sm">{item.inventoryNumber || '–'}</span>
                                        </div>
                                        <div className="flex border-b border-gray-200 py-1">
                                            <span className="w-36 font-bold text-gray-700">Přírůstkové číslo:</span>
                                            <span className="font-bold">{item.accessionNumber || '–'}</span>
                                        </div>
                                        <div className="flex border-b border-gray-200 py-1">
                                            <span className="w-36 font-bold text-gray-700">Název:</span>
                                            <span className="font-bold text-sm">{item.title}</span>
                                        </div>
                                        <div className="flex border-b border-gray-200 py-1">
                                            <span className="w-36 font-bold text-gray-700">Autor / Tvůrce:</span>
                                            <span>{item.author || '–'}</span>
                                        </div>
                                        <div className="flex border-b border-gray-200 py-1">
                                            <span className="w-36 font-bold text-gray-700">Datace:</span>
                                            <span>{item.datingText || (item.datingFrom ? `${item.datingFrom}–${item.datingTo || ''}` : '–')}</span>
                                        </div>
                                        <div className="flex border-b border-gray-200 py-1">
                                            <span className="w-36 font-bold text-gray-700">Materiál a technika:</span>
                                            <span>{[item.material, item.technique].filter(Boolean).join(', ') || '–'}</span>
                                        </div>
                                        <div className="flex border-b border-gray-200 py-1">
                                            <span className="w-36 font-bold text-gray-700">Podsbírka:</span>
                                            <span>{item.subCollection || '–'}</span>
                                        </div>
                                        <div className="flex border-b border-gray-200 py-1">
                                            <span className="w-36 font-bold text-gray-700">Umístění:</span>
                                            <span>{[item.locationBuilding, item.locationRoom, item.permanentLocation].filter(Boolean).join(' / ') || '–'}</span>
                                        </div>
                                        <div className="flex border-b border-gray-200 py-1">
                                            <span className="w-36 font-bold text-gray-700">Stav předmětu:</span>
                                            <span>{item.objectCondition || '–'}</span>
                                        </div>
                                    </div>

                                    {/* OBRÁZEK PŘEDMĚTU POKUD EXISTUJE */}
                                    <div className="flex flex-col items-center justify-center border border-gray-200 rounded p-2 bg-gray-50 min-h-[220px]">
                                        {item.primaryImageUrl ? (
                                            <img
                                                src={resolveApiUrl(item.primaryImageUrl)}
                                                alt={item.title}
                                                className="max-h-56 max-w-full object-contain rounded"
                                            />
                                        ) : (
                                            <div className="text-gray-400 text-xs text-center italic">
                                                Fotodokumentace není k dispozici
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {item.description && (
                                    <div className="mb-4 text-xs">
                                        <h3 className="font-bold border-b border-gray-200 pb-1 mb-1 text-gray-700">Popis předmětu:</h3>
                                        <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{item.description}</p>
                                    </div>
                                )}

                                <div className="mt-8 pt-4 border-t border-gray-300 grid grid-cols-2 gap-8 text-xs text-center">
                                    <div>
                                        <p className="font-bold mb-8">Kurátor sbírky:</p>
                                        <div className="border-b border-black w-3/4 mx-auto"></div>
                                    </div>
                                    <div>
                                        <p className="font-bold mb-8">Datum ověření záznamu:</p>
                                        <p className="font-mono">{today}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
