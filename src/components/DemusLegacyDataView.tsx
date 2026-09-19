import React from 'react';

type Props = {
    legacyData?: Record<string, any> | null;
    title?: string;
    showRawJson?: boolean;
};

// Mapa známych DEMUS klíčů na přívětivé české labely
const DEMUS_LABEL_MAP: Record<string, string> = {
    plus1t: 'Plus1T',
    plus2t: 'Plus2T',
    plus3c: 'Plus3č',
    dat_st: 'Datum stavu',
    pozn_vz: 'Poznámka k vzniku / původu',
    dat_od: 'Datace od',
    dat_do: 'Datace do',
    autor: 'Autor / Původce',
    mat: 'Materiál',
    tech: 'Technika',
    misto: 'Místo vzniku',
    predm: 'Předmět / Typ',
    sys_kat: 'Systematická kategorie',
    vyrobce: 'Výrobce / dílna',
    spravce: 'Správce sbírky',
    pozn: 'Poznámka',
    cislo: 'Číslo',
    akvizice: 'Způsob nabytí',
    lokalita: 'Lokalita',
    stav: 'Stav předmětu',
    rozmer: 'Rozměry',
    vystava: 'Výstava / Zapůjčení',
    restr: 'Restaurování',
    dokument: 'Dokumentace',
    poradi: 'Pořadí'
};

function formatKey(key: string): string {
    if (DEMUS_LABEL_MAP[key]) return DEMUS_LABEL_MAP[key];
    if (DEMUS_LABEL_MAP[key.toLowerCase()]) return DEMUS_LABEL_MAP[key.toLowerCase()];
    // Převedení camelCase nebo snake_case na čitelná slova
    return key
        .replace(/_/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/^./, str => str.toUpperCase());
}

function isEmptyValue(val: any): boolean {
    if (val === null || val === undefined) return true;
    if (typeof val === 'string' && val.trim() === '') return true;
    if (Array.isArray(val) && val.length === 0) return true;
    if (typeof val === 'object' && Object.keys(val).length === 0) return true;
    return false;
}

function formatVal(val: any): string {
    if (typeof val === 'boolean') return val ? 'Ano' : 'Ne';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
}

export default function DemusLegacyDataView({ legacyData, title = 'DEMUS – Historická a doplňková data', showRawJson = true }: Props) {
    if (!legacyData || typeof legacyData !== 'object') {
        return (
            <div className="rounded border border-gray-200 bg-gray-50 p-4 text-xs text-gray-500 italic">
                Žádná historická DEMUS data nejsou k dispozici.
            </div>
        );
    }

    const entries = Object.entries(legacyData).filter(([_, val]) => !isEmptyValue(val));

    if (entries.length === 0) {
        return (
            <div className="rounded border border-gray-200 bg-gray-50 p-4 text-xs text-gray-500 italic">
                Žádné vyplněné DEMUS údaje.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                <h3 className="text-sm font-bold text-[#00204a] uppercase tracking-wider flex items-center gap-2">
                    <span>📜</span>
                    <span>{title}</span>
                </h3>
                <span className="text-[10px] font-mono bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded">
                    {entries.length} {entries.length === 1 ? 'položka' : entries.length < 5 ? 'položky' : 'položek'}
                </span>
            </div>

            {/* ČITELNÁ KLÍČ-HODNOTA TABULKA */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {entries.map(([key, val]) => (
                    <div key={key} className="rounded border border-gray-200 bg-white p-3 shadow-sm hover:border-blue-300 transition-colors">
                        <div className="font-bold text-gray-500 uppercase text-[10px] tracking-wider mb-1">
                            {formatKey(key)}
                            <span className="ml-1 text-[9px] font-mono opacity-50 text-gray-400">({key})</span>
                        </div>
                        <div className="font-semibold text-gray-800 break-words whitespace-pre-wrap">
                            {formatVal(val)}
                        </div>
                    </div>
                ))}
            </div>

            {/* VOLITELNÁ COLLAPSED RAW JSON SEKCIE PRO ADMINY */}
            {showRawJson && (
                <details className="mt-4 rounded border border-gray-200 bg-gray-50 text-xs">
                    <summary className="cursor-pointer p-3 font-semibold text-gray-600 hover:text-gray-900 select-none flex items-center justify-between">
                        <span>Technická data DEMUS (RAW JSON)</span>
                        <span className="text-[10px] text-gray-400 font-mono">Stisknutím rozbalíte</span>
                    </summary>
                    <div className="p-3 border-t border-gray-200 bg-slate-900 text-green-400 rounded-b font-mono text-[11px] overflow-x-auto">
                        <pre>{JSON.stringify(legacyData, null, 2)}</pre>
                    </div>
                </details>
            )}
        </div>
    );
}
