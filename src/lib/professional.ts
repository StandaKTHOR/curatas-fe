import type { MuseumRecord, MuseumRecordKind } from './api';

export const professionalFields: Record<MuseumRecordKind, [string,string][]> = {
    CLASSIFICATION:[['SysKat_ZS','Systematická kategorie'],['Poradi_ZS','Pořadí']],
    DETERMINATION:[['Predmet_UR','Určený předmět'],['Urcil_UR','Určil (historický text)'],['DatUrc_UR','Datum určení — původní přesnost'],['Pozn_UR','Poznámka']],
    DOCUMENTATION:[['TypDok_DK','Typ dokumentace (nativní kód)'],['CDok_DK','Číslo dokumentu'],['Dokument_DK','Dokument / název'],['MediumDok_DK','Médium / historická cesta'],['Export_DK','Export'],['Pozn_DK','Poznámka'],['Poradi_DK','Pořadí']],
    MANIPULATION:[['Typ_MN','Typ manipulace'],['DatMan_MN','Datum manipulace — původní přesnost'],['Kdo_MN','Kdo provedl (historický text)'],['Stav_MN','Stav předmětu'],['Osetreni_MN','Ošetření'],['InvRev_MN','Inventární revize'],['PopisSt_MN','Popis stavu']],
    ACTION:[['Poradi_AK','Pořadí'],['Prezentace_AK','Prezentace'],['Revers_AK','Revers'],['CKtlg_AK','Číslo katalogu'],['Pozn_AK','Poznámka']],
    ISO:[['KodISO_SO','Kód ISO'],['CharISO_SO','Charakteristika'],['MatISO_SO','Materiál ISO'],['CenaISO_SO','Cena ISO'],['MenaISO_SO','Měna ISO'],['PovrchISO_SO','Povrch'],['TvarISO_SO','Tvar']],
    ORIGIN:[['OsobaVz_VZ','Osoba vzniku (historický text)'],['Role_VZ','Role'],['Datace_VZ','Datace'],['RokOd_VZ','Rok od'],['RokDo_VZ','Rok do'],['MistoVz_VZ','Místo vzniku'],['Pozn_VZ','Poznámka'],['Poradi_VZ','Pořadí']],
    MATERIAL_TECHNIQUE:[['Material_MT','Materiál tuple'],['Technika_MT','Technika tuple'],['Pozn_MT','Poznámka MatTech'],['Poradi_MT','Pořadí']],
    BIBLIOGRAPHY:[['Ref_RF','Reference — nativní klíč'],['Str_RF','Strany']],
    DEACCESSION:[['DuvVyr_VS','Důvod (DEMUS kód)'],['DatVyr_VS','Datum vyřazení'],['CDoklVyr_VS','Číslo dokumentu'],['CESVyr_VS','Číslo CES'],['SchvalVyr_VS','Schválil'],['ZpUb_VS','Způsob úbytku'],['NovyMaj_VS','Nový majitel'],['Pozn_VS','Poznámka']],
};

/** Explicit overlay null wins. Fallback never supplies invented _UR fields from _S. */
export function professionalValue(record: MuseumRecord, key: string): unknown {
    return Object.prototype.hasOwnProperty.call(record.payload,key) ? record.payload[key] : record.legacyData?.[key];
}
export function professionalDraft(record: MuseumRecord): Record<string,unknown> {
    return Object.fromEntries(professionalFields[record.kind].map(([key])=>[key,professionalValue(record,key)]));
}
export function professionalDelta(kind: MuseumRecordKind, draft: Record<string,unknown>, record?: MuseumRecord | null) {
    return Object.fromEntries(professionalFields[kind].filter(([key]) => draft[key] !== undefined &&
        (!record || JSON.stringify(draft[key]) !== JSON.stringify(professionalValue(record,key)))).map(([key])=>[key,draft[key]]));
}
