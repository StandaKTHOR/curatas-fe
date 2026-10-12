import type { ItemEditSession } from '../lib/editSession';
import { useEffect, useState, useRef, type MutableRefObject } from 'react';
import AddDictionaryModal from './AddDictionaryModal';
import {
    createMuseumRecord, deleteMuseumRecord, getDictionaryTree, getMuseumItem,
    patchMuseumItem, updateMuseumRecord, deaccessionItem,
    searchParties,
    type MuseumItemDetail, type MuseumRecord, type MuseumRecordKind,
} from '../lib/api';

type TreeNode = { id: number; code: string | null; label: string; children: TreeNode[] };
type Section = 'basic' | 'materials' | 'locality' | 'classification' | 'determination' | 'documentation' | 'deaccession' | 'history' | 'manipulation' | 'action' | 'iso' | 'origin';
type Props = { itemId?: number; section: Section; onSave?: () => void; editSession?: ItemEditSession; readOnly?: boolean; drafts?: MutableRefObject<Record<string, any>>; snapshotRequired?: boolean };

const DICTIONARY_TYPE_LABELS: Record<string, string> = {
    GROUP: 'Skupina',
    LOCALITY: 'Lokalita',
    SUBJECT: 'Námět',
    CLASSIFICATION: 'Klasifikace',
    MATERIAL: 'Materiál',
    TECHNIQUE: 'Technika',
    FUND: 'Fond',
    ACQUISITION_METHOD: 'Způsob nabytí',
    DOCUMENT_TYPE: 'Typ dokumentace',
    DEACCESSION_REASON: 'Důvod vyřazení',
    DETERMINER: 'Určil'
};

const recordKinds: Partial<Record<Section, MuseumRecordKind>> = {
    classification: 'CLASSIFICATION', determination: 'DETERMINATION',
    documentation: 'DOCUMENTATION', deaccession: 'DEACCESSION',
    manipulation: 'MANIPULATION', action: 'ACTION', iso: 'ISO', origin: 'ORIGIN'
};
const recordFields: Record<MuseumRecordKind, [string, string][]> = {
    CLASSIFICATION: [['SysKat_ZS', 'Systematická kategorie'], ['Poradi_ZS', 'Pořadí']],
    DETERMINATION: [['Predmet_UR', 'Určený předmět'], ['Urcil_UR', 'Určil (DEMUS kód)'], ['DatUrc_UR', 'Datum určení'], ['Pozn_UR', 'Poznámka']],
    DOCUMENTATION: [['TypDok_DK', 'Typ dokumentace (DEMUS kód)'], ['CDok_DK', 'Číslo dokumentu'], ['Dokument_DK', 'Dokument / název'], ['MediumDok_DK', 'Médium / cesta'], ['Export_DK', 'Export'], ['Pozn_DK', 'Poznámka'], ['Poradi_DK', 'Pořadí']],
    DEACCESSION: [['DuvVyr_VS', 'Důvod (DEMUS kód)'], ['DatVyr_VS', 'Datum vyřazení'], ['CDoklVyr_VS', 'Číslo dokumentu'], ['CESVyr_VS', 'Číslo CES'], ['SchvalVyr_VS', 'Schválil'], ['ZpUb_VS', 'Způsob úbytku'], ['NovyMaj_VS', 'Nový majitel'], ['Pozn_VS', 'Poznámka']],
    MANIPULATION: [['Typ_MN', 'Typ manipulace'], ['DatMan_MN', 'Datum manipulace'], ['Kdo_MN', 'Kdo provedl'], ['Stav_MN', 'Stav předmětu'], ['Osetreni_MN', 'Ošetření'], ['InvRev_MN', 'Inventární revize'], ['PopisSt_MN', 'Popis stavu']],
    ACTION: [['Poradi_AK','Pořadí'],['Prezentace_AK','Prezentace'],['Revers_AK','Revers'],['CKtlg_AK','Číslo katalogu'],['Pozn_AK','Poznámka']],
    ISO: [['KodISO_SO','Kód ISO'],['CharISO_SO','Charakteristika'],['MatISO_SO','Materiál ISO'],['CenaISO_SO','Cena ISO'],['MenaISO_SO','Měna ISO'],['PovrchISO_SO','Povrch'],['TvarISO_SO','Tvar']],
    ORIGIN: [['OsobaVz_VZ','Osoba vzniku'],['Role_VZ','Role'],['Datace_VZ','Datace'],['RokOd_VZ','Rok od'],['RokDo_VZ','Rok do'],['MistoVz_VZ','Místo vzniku'],['Pozn_VZ','Poznámka'],['Poradi_VZ','Pořadí']]
};
const recordDictionary: Partial<Record<MuseumRecordKind, string>> = {
    CLASSIFICATION: 'CLASSIFICATION', DETERMINATION: 'DETERMINER', DOCUMENTATION: 'DOCUMENT_TYPE', DEACCESSION: 'DEACCESSION_REASON',
};

function flatten(nodes: TreeNode[], prefix = ''): { id: number; label: string; rawLabel: string; code: string | null }[] {
    return nodes.flatMap(node => {
        const label = prefix ? `${prefix} › ${node.label}` : node.label;
        return [{ id: node.id, label, rawLabel: node.label, code: node.code }, ...flatten(node.children || [], label)];
    });
}

export function TreeChoice({ type, value, onChange, label }: {
    type: string; value: number | null;
    onChange: (id: number | null, choice?: { id: number; label: string; rawLabel?: string; code: string | null }) => void; label: string;
}) {
    const [nodes, setNodes] = useState<TreeNode[]>([]);
    const [search, setSearch] = useState('');
    const [error, setError] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    const reloadTree = async (newCode?: string, newLabel?: string) => {
        try {
            const tree = await getDictionaryTree(type);
            setNodes(tree);
            if (newCode || newLabel) {
                const flat = flatten(tree);
                const match = flat.find(x => (newCode && x.code === newCode) || (newLabel && x.label === newLabel));
                if (match) {
                    onChange(match.id, match);
                }
            }
        } catch (e: any) {
            setError(e.message);
        }
    };

    useEffect(() => {
        reloadTree();
    }, [type]);

    const choices = flatten(nodes).filter(x => x.label.toLocaleLowerCase('cs').includes(search.toLocaleLowerCase('cs')) || x.id === value);
    const friendlyTitle = DICTIONARY_TYPE_LABELS[type.toUpperCase()] || label || type;
    return <div className="block space-y-1 text-sm font-semibold text-gray-700">
        <div className="flex justify-between items-center">
            <span>{label}</span>
            <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 underline"
            >
                + Nový
            </button>
        </div>
        <input aria-label={`Hledat: ${label}`} className="w-full rounded border border-gray-300 px-3 py-2 font-normal text-xs" value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                }
            }}
            placeholder="Hledat v hierarchii" />
        <select aria-label={label} className="w-full rounded border border-gray-300 bg-white px-3 py-2 font-normal text-xs"
            value={value ?? ''} onChange={e => {
                const id = e.target.value ? Number(e.target.value) : null;
                onChange(id, choices.find(choice => choice.id === id));
            }}>
            <option value="">— nevybráno —</option>
            {value && !choices.some(x => x.id === value) && <option value={value} disabled>Stávající vazba #{value} (není v načteném číselníku)</option>}
            {choices.map(x => <option key={x.id} value={x.id}>{x.label}</option>)}
        </select>
        {error && <span className="text-red-700 text-xs block">{error}</span>}

        <AddDictionaryModal
            isOpen={isAddModalOpen}
            dictionaryType={type}
            dictionaryTitle={friendlyTitle}
            parentOptions={flatten(nodes)}
            onClose={() => setIsAddModalOpen(false)}
            onSuccess={(newItem) => {
                setIsAddModalOpen(false);
                reloadTree();
                if (newItem.id) onChange(newItem.id, {id: newItem.id, label: newItem.label, code: newItem.code || null});
            }}
        />
    </div>;
}

export default function MuseumSection({ itemId, section, onSave, editSession, readOnly = false, drafts, snapshotRequired = false }: Props) {
    const [detail, setDetail] = useState<MuseumItemDetail | null>(null);
    const [changes, setChanges] = useState<Record<string, unknown>>(drafts?.current[section]?.changes ?? {});
    const [record, setRecord] = useState<MuseumRecord | null>(drafts?.current[section]?.record ?? null);
    const [payload, setPayload] = useState<Record<string, unknown>>(drafts?.current[section]?.payload ?? {});
    const [dictionaryId, setDictionaryId] = useState<number | null>(drafts?.current[section]?.dictionaryId ?? null);
    const [partyId, setPartyId] = useState<number | null>(drafts?.current[section]?.partyId ?? null);
    const [partyQuery, setPartyQuery] = useState('');
    const [partyMatches, setPartyMatches] = useState<{ id: number; firstName: string | null; lastName: string }[]>([]);
    const [message, setMessage] = useState('');
    const [deaccession, setDeaccession] = useState({ reason: '', deaccessionDate: '', documentNumber: '' });
    const editFormRef = useRef<HTMLDivElement>(null);
    const kind = recordKinds[section];
    useEffect(() => {
        if (drafts) drafts.current[section] = {changes, record, payload, dictionaryId, partyId,
            dirty: Object.keys(changes).length > 0 || Object.keys(payload).length > 0};
    }, [changes, record, payload, dictionaryId, partyId, section, drafts]);

    useEffect(() => {
        if (!itemId || (snapshotRequired && !editSession)) return;
        let alive = true;
        Promise.resolve(editSession?.museumSnapshot as MuseumItemDetail | undefined)
            .then(snapshot => snapshot || getMuseumItem(itemId, editSession))
            .then(data => { if (alive) setDetail(data); }).catch((e: Error) => {if (alive) setMessage(e.message);});
        return () => {alive = false;};
    }, [itemId, editSession, snapshotRequired]);

    if (!itemId) return <p className="rounded border bg-gray-50 p-4">Nejprve uložte předmět; pak lze vyplnit tuto sekci.</p>;
    if (snapshotRequired && !editSession) return <p role="status">Čekám na konzistentní verzi předmětu…</p>;
    if (!detail) return <p role="status">{message || 'Načítám muzeální údaje…'}</p>;

    const value = (key: keyof MuseumItemDetail) =>
        (Object.prototype.hasOwnProperty.call(changes, key) ? changes[key] : detail[key]) as string | number | boolean | null;
    const change = (key: keyof MuseumItemDetail, next: unknown) => setChanges(old => ({ ...old, [key]: next }));
    const saveFields = async () => {
        try {
            const fresh = await patchMuseumItem(itemId, changes, editSession);
            if (editSession) editSession.museumSnapshot = fresh;
            setDetail(fresh);
            setChanges({});
            setMessage('Údaje uloženy.');
            if (onSave) onSave();
        } catch (e) { setMessage((e as Error).message); }
    };
    const text = (key: keyof MuseumItemDetail, label: string) => <label className="block space-y-1 text-sm font-semibold text-gray-700" key={key}>
        <span>{label}</span>
        <input className="w-full rounded border border-gray-300 px-3 py-2 font-normal" value={String(value(key) ?? '')}
            onChange={e => change(key, e.target.value)} />
    </label>;
    const bool = (key: keyof MuseumItemDetail, label: string) => <label className="flex items-center gap-2 text-sm" key={key}>
        <input type="checkbox" checked={value(key) === true} onChange={e => change(key, e.target.checked)} />{label}
    </label>;
    const tree = (key: keyof MuseumItemDetail, type: string, label: string) => <TreeChoice key={key} type={type}
        label={label} value={value(key) as number | null} onChange={id => change(key, id)} />;
    const saveButton = <button type="button" onClick={saveFields} disabled={Object.keys(changes).length === 0}
        className="rounded bg-[#00204a] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Uložit sekci</button>;

    let fields: React.ReactNode;
    if (section === 'origin') fields = <>{text('originNote', 'PoznVz — poznámka k místu vzniku')}</>;
    else if (section === 'basic') fields = <>
        {tree('subjectDictionaryId', 'SUBJECT', 'Námět')}
        {text('subjectLegacyCode', 'Původní kód námětu')}
        <div className="col-span-full flex flex-wrap gap-4">{bool('legacyArchived', 'Archiv')}{bool('legacyCard', 'Karta')}
            {bool('legacyCopied', 'Opsáno')}{bool('legacyVerified', 'Ověřeno')}{bool('legacyMarked', 'Označeno')}</div>
    </>;
    else if (section === 'materials') fields = <>
        {tree('materialDictionaryId', 'MATERIAL', 'Materiál – hierarchie')}
        {tree('techniqueDictionaryId', 'TECHNIQUE', 'Technika – hierarchie')}
        <p className="col-span-full text-sm text-gray-600">Původní text materiálu a techniky zůstává zachován v základním záznamu.</p>
    </>;
    else if (section === 'locality') fields = <>
        {tree('localityDictionaryId', 'LOCALITY', 'Lokalita')}{text('localityLegacyCode', 'Původní kód lokality')}
        {tree('fundDictionaryId', 'FUND', 'Fond')}{text('fundLegacyCode', 'Původní kód fondu')}
        {tree('groupDictionaryId', 'GROUP', 'Skupina')}{text('groupLegacyCode', 'Původní kód skupiny')}
    </>;
    else if (section === 'history') fields = <div className="col-span-full space-y-2 text-sm">
        <p><strong>Zapsal v DEMUS:</strong> {detail.legacyCreatedBy || '—'}</p>
        <p><strong>Datum zapsání v DEMUS:</strong> {detail.legacyCreatedAt || '—'}</p>
        <p><strong>Změnil v DEMUS:</strong> {detail.legacyUpdatedBy || '—'}</p>
        <p><strong>Datum změny v DEMUS:</strong> {detail.legacyUpdatedAt || '—'}</p>
    </div>;
    else fields = null;

    const startRecord = (existing: MuseumRecord | null) => {
        setRecord(existing);
        setPayload(existing ? { ...Object.fromEntries(recordFields[existing.kind].filter(([key]) => existing.legacyData?.[key] !== undefined).map(([key]) => [key, existing.legacyData![key]])), ...(existing.payload || {}) } : {});
        setDictionaryId(existing?.dictionaryId ?? null);
        setPartyId(existing?.partyId ?? null);
        setPartyQuery('');
        if (existing) {
            setTimeout(() => {
                if (typeof editFormRef.current?.scrollIntoView === 'function') {
                    editFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }, 50);
        }
    };
    const saveRecord = async () => {
        if (!kind) return;
        const hasPayloadData = Object.values(payload).some(v => v !== null && v !== undefined && v !== '');
        if (!hasPayloadData && !dictionaryId && !partyId) {
            setMessage('Nelze uložit zcela prázdný záznam. Vyplňte alespoň jedno pole.');
            return;
        }
        if (kind === 'CLASSIFICATION') {
            const poradi = payload['Poradi_ZS'];
            if (poradi !== null && poradi !== undefined && poradi !== '' && Number(poradi) < 0) {
                setMessage('Pořadí v klasifikaci nesmí být záporné.');
                return;
            }
        }
        try {
            const changed = record ? Object.fromEntries(Object.entries(payload).filter(([key, value]) =>
                JSON.stringify(value) !== JSON.stringify(record.payload[key] ?? record.legacyData?.[key]))) : payload;
            if (record) await updateMuseumRecord(itemId, kind, record.id, changed, dictionaryId, partyId, editSession);
            else await createMuseumRecord(itemId, kind, payload, dictionaryId, partyId, editSession);
            const fresh = await getMuseumItem(itemId, editSession);
            if (editSession) editSession.museumSnapshot = fresh;
            setDetail(fresh);
            startRecord(null);
            if (onSave) onSave();
            setMessage('Záznam uložen.');
        } catch (e) { setMessage((e as Error).message); }
    };
    const removeRecord = async (row: MuseumRecord) => {
        if (!kind || row.sourceTable || !window.confirm('Odebrat tento záznam?')) return;
        try {
            await deleteMuseumRecord(itemId, kind, row.id, editSession);
            const fresh = await getMuseumItem(itemId, editSession);
            if (editSession) editSession.museumSnapshot = fresh;
            setDetail(fresh);
        } catch (e) { setMessage((e as Error).message); }
    };

    return <fieldset disabled={readOnly} className="space-y-5 demus-section">
        {fields && <div className="grid grid-cols-1 gap-4 rounded border border-gray-200 p-5 md:grid-cols-2">{fields}
            {section !== 'history' && <div className="col-span-full">{saveButton}</div>}</div>}
        {kind && <div className="space-y-4">
            <h3 className="font-bold">{section === 'documentation' ? 'Dokumentace DEMUS (samostatně od příloh)' : 'Záznamy'}</h3>
            <div className="overflow-x-auto"><table className="demus-datasheet" aria-label={`Evidence ${section}`}>
                <thead><tr><th>Záznam / zdroj</th>{recordFields[kind].map(([key,label]) => <th key={key}>{label}</th>)}<th>Akce</th></tr></thead>
                <tbody>{detail.records.filter(x => x.kind === kind).map(row => <tr key={row.id} className={record?.id === row.id ? 'bg-blue-50' : ''}>
                    <td><strong>{row.sourceTable ? `DEMUS ${row.sourceTable}` : 'Nový záznam'} · #{row.id}</strong>
                        {record?.id === row.id && <span className="block">✏️ Právě upravujete</span>}
                        {row.partyId && <p>Vazba na osobu/subjekt #{row.partyId}</p>}
                        {row.sourceTable && <details><summary>Všechna původní pole</summary>
                            <p>Zdroj: {row.sourceTable} · {row.sourceKey || '—'}</p><pre>{JSON.stringify(row.legacyData,null,2)}</pre></details>}
                    </td>
                    {recordFields[kind].map(([key]) => <td key={key}>{String(row.payload[key] ?? row.legacyData?.[key] ?? '—')}</td>)}
                    <td>{kind !== 'DEACCESSION' && <button type="button" className="underline" onClick={() => startRecord(row)}>Upravit</button>}
                        {kind !== 'DEACCESSION' && !row.sourceTable && <button type="button" className="ml-3 text-red-700 underline" onClick={() => removeRecord(row)}>Odebrat</button>}
                    </td>
                </tr>)}</tbody>
            </table></div>
            {kind === 'DEACCESSION' && <div className="rounded border border-gray-200 bg-gray-50 p-4 space-y-3">
                <h4 className="font-semibold">Vyřazení předmětu z evidence</h4>
                <p className="text-sm">Tato akce používá stávající lifecycle a zapíše auditní událost.</p>
                {(['reason', 'deaccessionDate', 'documentNumber'] as const).map(key => <label key={key} className="block text-sm font-semibold">
                    {{ reason: 'Důvod', deaccessionDate: 'Datum vyřazení', documentNumber: 'Číslo dokumentu' }[key]}
                    <input type={key === 'deaccessionDate' ? 'date' : 'text'} value={deaccession[key]}
                        onChange={e => setDeaccession(old => ({ ...old, [key]: e.target.value }))}
                        className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 font-normal" />
                </label>)}
                <button type="button" className="rounded bg-[#00204a] px-4 py-2 text-sm font-semibold text-white"
                    disabled={!deaccession.reason.trim()} onClick={async () => {
                        if (!window.confirm('Opravdu vyřadit předmět z evidence?')) return;
                        try { await deaccessionItem(itemId, { reason: deaccession.reason,
                            deaccessionDate: deaccession.deaccessionDate || undefined,
                            documentNumber: deaccession.documentNumber || undefined });
                            setMessage('Předmět byl vyřazen z evidence.'); }
                        catch (e) { setMessage((e as Error).message); }
                    }}>Vyřadit předmět</button>
            </div>}
            {(kind !== 'DEACCESSION' || record) && <div ref={editFormRef} className={`rounded border p-4 space-y-3 ${record ? 'border-blue-300 bg-blue-50/30' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-gray-900">
                        {record ? `✏️ Úprava záznamu #${record.id}` : 'Nový záznam'}
                    </h4>
                    {record && <button type="button" className="text-xs text-blue-700 hover:underline font-medium" onClick={() => startRecord(null)}>
                        Zrušit úpravu
                    </button>}
                </div>
                {recordDictionary[kind] && <TreeChoice type={recordDictionary[kind]!} label="Číselník"
                    value={dictionaryId} onChange={(id, choice) => {
                        setDictionaryId(id);
                        const codeField = kind === 'CLASSIFICATION' ? 'SysKat_ZS'
                            : kind === 'DOCUMENTATION' ? 'TypDok_DK' : 'DuvVyr_VS';
                        setPayload(old => ({ ...old, [codeField]: choice?.code ?? '' }));
                    }} />}
                {kind === 'DETERMINATION' && <div className="space-y-2 text-sm">
                    <label className="block font-semibold">Určil – vazba na existující osoby/subjekty
                        <input value={partyQuery} onChange={async e => {
                            const query = e.target.value;
                            setPartyQuery(query);
                            setPartyMatches(query.length >= 2 ? await searchParties(query) : []);
                        }} onKeyDown={e => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                e.stopPropagation();
                            }
                        }} placeholder="Hledat osobu nebo instituci"
                            className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 font-normal" />
                    </label>
                    <select aria-label="Vybraná osoba" value={partyId ?? ''}
                        onChange={e => setPartyId(e.target.value ? Number(e.target.value) : null)}
                        className="w-full rounded border border-gray-300 bg-white px-3 py-2">
                        <option value="">— bez vazby —</option>
                        {partyId && !partyMatches.some(p => p.id === partyId) && <option value={partyId}>Stávající osoba #{partyId}</option>}
                        {partyMatches.map(p => <option key={p.id} value={p.id}>{[p.firstName, p.lastName].filter(Boolean).join(' ')}</option>)}
                    </select>
                </div>}
                <div className="grid gap-3 md:grid-cols-2">{recordFields[kind].map(([key, label]) => <label key={key} className="block text-sm font-semibold">
                    {label}{key === 'Export_DK' ? <input type="checkbox" className="ml-3"
                        checked={payload[key] === true} onChange={e => setPayload(old => ({ ...old, [key]: e.target.checked }))} />
                        : <input type={key.startsWith('Poradi_') ? 'number' : (['CKtlg_AK','CenaISO_SO','RokOd_VZ','RokDo_VZ'].includes(key) ? 'number' : 'text')}
                            min={key.startsWith('Poradi_') ? '0' : undefined}
                            className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 font-normal"
                            value={String(payload[key] ?? '')} onChange={e => setPayload(old => ({ ...old,
                                [key]: (key.startsWith('Poradi_') || ['CKtlg_AK','CenaISO_SO','RokOd_VZ','RokDo_VZ'].includes(key)) ? (e.target.value !== '' ? Number(e.target.value) : null) : e.target.value }))} />}
                </label>)}</div>
                <div className="flex items-center gap-3 pt-2">
                    <button type="button" className="rounded bg-[#00204a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#003366]" onClick={saveRecord}>
                        Uložit záznam
                    </button>
                    {record && <button type="button" className="text-sm text-gray-600 underline hover:text-gray-900" onClick={() => startRecord(null)}>Zrušit úpravu</button>}
                </div>
            </div>}
        </div>}
        {message && <p role="status" className="text-sm text-[#00204a]">{message}</p>}
    </fieldset>;
}
