import React, { useState } from 'react';

export interface PermanentIdentificationHeaderProps {
    fond?: string | null;
    predmet?: string | null;
    popis?: string | null;
    titul?: string | null;
    autor?: string | null;
    datace?: string | null;
    inventoryNumber?: string | null;
    isViewMode?: boolean;
    isNew?: boolean;
    topOffset?: string;
}

/**
 * Permanentní identifikační hlavička sbírkového předmětu.
 * Zůstává viditelná (sticky) během procházení formuláře a scrollování bez překrytí navigace.
 * Zobrazuje povinná identifikační pole dle závěrů CITEM 24. 9. 2026:
 * Fond, Předmět, Popis, Titul, Autor, Datace.
 */
export default function PermanentIdentificationHeader({
    fond,
    predmet,
    popis,
    titul,
    autor,
    datace,
    inventoryNumber,
    isViewMode = false,
    isNew = false,
    topOffset = 'top-[68px]'
}: PermanentIdentificationHeaderProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    const safe = (val?: string | null) => (val && val.trim() ? val.trim() : '—');

    return (
        <aside
            aria-label="Permanentní identifikace předmětu"
            className={`sticky ${topOffset} z-30 bg-[#001b3a] text-white border-b-2 border-[#ffbc34] shadow-md px-4 py-2 transition-all duration-150 select-text`}
        >
            <div className="flex flex-wrap items-center justify-between gap-2">
                {/* STATUS PŘEDMĚTU & INVENTÁRNÍ ČÍSLO */}
                <div className="flex items-center gap-2">
                    <span
                        className={`text-[10px] uppercase font-black px-2 py-0.5 rounded tracking-wider ${
                            isNew
                                ? 'bg-amber-400 text-black'
                                : isViewMode
                                ? 'bg-blue-300 text-blue-950'
                                : 'bg-[#ffbc34] text-black'
                        }`}
                    >
                        {isNew ? 'Nový předmět' : isViewMode ? 'Prohlížení' : 'Editace'}
                    </span>
                    {inventoryNumber && (
                        <span className="font-mono font-bold text-xs bg-white/10 px-2 py-0.5 rounded text-yellow-300" title="Inventární číslo">
                            {inventoryNumber}
                        </span>
                    )}
                </div>

                {/* HLAVNÍCH 6 POVINNÝCH IDENTIFIKAČNÍCH POLÍ DLE CITEM */}
                <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-3 gap-y-1 text-xs">
                    {/* 1. FOND */}
                    <div className="min-w-0" title={`Fond: ${safe(fond)}`}>
                        <span className="text-[9px] uppercase tracking-wider text-gray-400 font-extrabold block leading-none">Fond</span>
                        <span className="font-bold text-gray-100 truncate block">{safe(fond)}</span>
                    </div>

                    {/* 2. PŘEDMĚT (TYP) */}
                    <div className="min-w-0" title={`Předmět: ${safe(predmet)}`}>
                        <span className="text-[9px] uppercase tracking-wider text-gray-400 font-extrabold block leading-none">Předmět</span>
                        <span className="font-bold text-gray-100 truncate block">{safe(predmet)}</span>
                    </div>

                    {/* 3. TITUL (NÁZEV) */}
                    <div className="min-w-0" title={`Titul: ${safe(titul)}`}>
                        <span className="text-[9px] uppercase tracking-wider text-gray-400 font-extrabold block leading-none">Titul</span>
                        <span className="font-bold text-yellow-300 truncate block">{safe(titul)}</span>
                    </div>

                    {/* 4. AUTOR */}
                    <div className="min-w-0" title={`Autor: ${safe(autor)}`}>
                        <span className="text-[9px] uppercase tracking-wider text-gray-400 font-extrabold block leading-none">Autor</span>
                        <span className="font-bold text-gray-100 truncate block">{safe(autor)}</span>
                    </div>

                    {/* 5. DATACE */}
                    <div className="min-w-0" title={`Datace: ${safe(datace)}`}>
                        <span className="text-[9px] uppercase tracking-wider text-gray-400 font-extrabold block leading-none">Datace</span>
                        <span className="font-bold text-gray-100 truncate block">{safe(datace)}</span>
                    </div>

                    {/* 6. POPIS (s možností rozbalení při delším textu) */}
                    <div className="min-w-0 flex items-center justify-between gap-1" title={`Popis: ${safe(popis)}`}>
                        <div className="min-w-0 flex-1">
                            <span className="text-[9px] uppercase tracking-wider text-gray-400 font-extrabold block leading-none">Popis</span>
                            <span className="font-normal text-gray-200 truncate block italic">{safe(popis)}</span>
                        </div>
                        {popis && popis.length > 50 && (
                            <button
                                type="button"
                                onClick={() => setIsExpanded(!isExpanded)}
                                className="text-[10px] text-yellow-300 hover:text-white px-1 font-bold underline"
                                title={isExpanded ? 'Sbalit popis' : 'Zobrazit celý popis'}
                            >
                                {isExpanded ? '▲' : '▼'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ROZBALENÝ CELÝ POPIS POKUD UŽIVATEL ZVOLÍ NÁHLED */}
            {isExpanded && popis && (
                <div className="mt-2 pt-2 border-t border-white/10 text-xs text-gray-200 bg-black/30 p-2 rounded max-h-32 overflow-y-auto">
                    <span className="text-[10px] font-bold uppercase text-gray-400 block mb-0.5">Úplný popis předmětu:</span>
                    <p className="whitespace-pre-wrap">{popis}</p>
                </div>
            )}
        </aside>
    );
}
