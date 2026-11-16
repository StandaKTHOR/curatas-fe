import TechnicalDemus,{useCleanItemCard} from '../features/catalog/TechnicalDemus';
import React from 'react';

type Props = {
    legacyData?: Record<string, any> | null;
    title?: string;
    showRawJson?: boolean;
    unavailableMessage?: string;
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

export default function DemusLegacyDataView(props:Props){const clean=useCleanItemCard();if(!clean)return <LegacyData {...props}/>;const rows=legacyBusinessEntries(props.legacyData);return <><section aria-label="Původní odborné údaje DEMUS"><dl className="demus-evidence-grid">{rows.map((r,i)=><div key={i}><dt>{r.label}</dt><dd style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{r.value}</dd></div>)}</dl></section><TechnicalDemus title="Úplná historická data"><LegacyData {...props}/></TechnicalDemus></>;}
export function legacyBusinessEntries(data:unknown):{label:string;value:string}[]{
 const result:{label:string;value:string}[]=[];const technical=new Set(['recordId','artifactId','sourceSha256','rowHash','occurrence','parentRecordId','parentField','sourcePath','relationshipId','sourceLocalId','id','uuid','record_id','artifact_id','source_id','sha256','sourceKey','sourceTable','sourceRecord']);
 const labels:Record<string,string>={Karta_S:'Karta',Opsana_S:'Opsána',Overena_S:'Ověřena',JineC_S:'Jiné číslo',Fond_S:'Fond',Skupina_S:'Skupina',Zapsal_S:'Zapsal v DEMUS',DatZap_S:'Datum zápisu v DEMUS',DatZm_S:'Datum změny v DEMUS',Titul_S:'Titul',Predmet_S:'Předmět',Autor_S:'Autor',Datace_S:'Datace'};
 const visit=(object:unknown,depth=0)=>{if(!object||typeof object!=='object'||depth>8)return;for(const [key,value] of Object.entries(object)){if(technical.has(key)||/^IdC_/.test(key))continue;if(/^[a-f0-9]{64}$/.test(key)||['fields','raw'].includes(key)){visit(value,depth+1);continue;}if(Array.isArray(value)){for(const [i,entry] of value.entries()){if(entry&&typeof entry==='object')visit(entry,depth+1);else if(entry!==null&&entry!==undefined)result.push({label:formatKey(key)+' '+(i+1),value:String(entry)});}continue;}const typed=value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:null;
 let shown:unknown=value;if(typed){if(typed.kind==='NULL')shown='Neuvedeno';else if(['TEXT','INTEGER','TEMPORAL','BOOLEAN'].includes(String(typed.kind)))shown=typed.value;else if(!('kind' in typed)){visit(typed,depth+1);continue;}else shown='Údaj vyžaduje odborné ověření; původní zápis je v technických údajích.';}
 if(shown===null||shown===undefined||typeof shown==='object')continue;result.push({label:labels[key]??formatKey(key.replace(/_[A-Z]+$/,'')),value:typeof shown==='boolean'?shown?'Ano':'Ne':String(shown)});
 }};visit(data);return result;
}
function LegacyData({ legacyData, title = 'DEMUS – Historická a doplňková data', showRawJson = true, unavailableMessage }: Props) {
    if (!legacyData || typeof legacyData !== 'object') {
        return (
            <div className="rounded border border-gray-200 bg-gray-50 p-4 text-xs text-gray-500 italic">
                {unavailableMessage??'Žádná historická DEMUS data nejsou k dispozici.'}
            </div>
        );
    }

    const entries = Object.entries(legacyData).filter(([_, val]) => !isEmptyValue(val));

    if (entries.length === 0) {
        return (
            <div className="rounded border border-gray-200 bg-gray-50 p-4 text-xs text-gray-500 italic">
                {unavailableMessage??'Žádné vyplněné DEMUS údaje.'}
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
