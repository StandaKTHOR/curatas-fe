import { useEffect, useState } from 'react';
import {
    createMuseumRecord, deleteMuseumRecord, getDictionaryTree, getMuseumItem,
    patchMuseumItem, updateMuseumRecord, deaccessionItem,
    searchParties,
    type MuseumItemDetail, type MuseumRecord, type MuseumRecordKind,
} from '../lib/api';

type TreeNode = { id: number; code: string | null; label: string; children: TreeNode[] };
type Section = 'basic' | 'materials' | 'locality' | 'classification' | 'determination' | 'documentation' | 'deaccession' | 'history';
type Props = { itemId?: number; section: Section };

const recordKinds: Partial<Record<Section, MuseumRecordKind>> = {
    classification: 'CLASSIFICATION', determination: 'DETERMINATION',
    documentation: 'DOCUMENTATION', deaccession: 'DEACCESSION',
};
const recordFields: Record<MuseumRecordKind, [string, string][]> = {
    CLASSIFICATION: [['SysKat_ZS', 'Systematická kategorie'], ['Poradi_ZS', 'Pořadí']],
    DETERMINATION: [['Predmet_UR', 'Určený předmět'], ['Urcil_UR', 'Určil (DEMUS kód)'], ['DatUrc_UR', 'Datum určení'], ['Pozn_UR', 'Poznámka']],
    DOCUMENTATION: [['TypDok_DK', 'Typ dokumentace (DEMUS kód)'], ['CDok_DK', 'Číslo dokumentu'], ['Dokument_DK', 'Dokument / název'], ['MediumDok_DK', 'Médium / cesta'], ['Export_DK', 'Export'], ['Pozn_DK', 'Poznámka'], ['Poradi_DK', 'Pořadí']],
    DEACCESSION: [['DuvVyr_VS', 'Důvod (DEMUS kód)'], ['DatVyr_VS', 'Datum vyřazení'], ['CDoklVyr_VS', 'Číslo dokumentu'], ['CESVyr_VS', 'Číslo CES'], ['SchvalVyr_VS', 'Schválil'], ['ZpUb_VS', 'Způsob úbytku'], ['NovyMaj_VS', 'Nový majitel'], ['Pozn_VS', 'Poznámka']],
};
const recordDictionary: Partial<Record<MuseumRecordKind, string>> = {
    CLASSIFICATION: 'CLASSIFICATION', DOCUMENTATION: 'DOCUMENT_TYPE', DEACCESSION: 'DEACCESSION_REASON',
};

function flatten(nodes: TreeNode[], prefix = ''): { id: number; label: string; code: string | null }[] {
    return nodes.flatMap(node => {
        const label = prefix ? `${prefix} › ${node.label}` : node.label;
        return [{ id: node.id, label, code: node.code }, ...flatten(node.children || [], label)];
    });
}

export function TreeChoice({ type, value, onChange, label }: {
    type: string; value: number | null;
    onChange: (id: number | null, choice?: { id: number; label: string; code: string | null }) => void; label: string;
}) {
    const [nodes, setNodes] = useState<TreeNode[]>([]);
    const [search, setSearch] = useState('');
    const [error, setError] = useState('');
    useEffect(() => {
        getDictionaryTree(type).then(setNodes).catch((e: Error) => setError(e.message));
    }, [type]);
    const choices = flatten(nodes).filter(x => x.label.toLocaleLowerCase('cs').includes(search.toLocaleLowerCase('cs')) || x.id === value);
    return <div className="block space-y-1 text-sm font-semibold text-gray-700">
        <span>{label}</span>
        <input aria-label={`Hledat: ${label}`} className="w-full rounded border border-gray-300 px-3 py-2 font-normal" value={search}
            onChange={e => setSearch(e.target.value)} placeholder="Hledat v hierarchii" />
        <select aria-label={label} className="w-full rounded border border-gray-300 bg-white px-3 py-2 font-normal"
            value={value ?? ''} onChange={e => {
                const id = e.target.value ? Number(e.target.value) : null;
                onChange(id, choices.find(choice => choice.id === id));
            }}>
            <option value="">— nevybráno —</option>
            {choices.map(x => <option key={x.id} value={x.id}>{x.label}</option>)}
        </select>
        {error && <span className="text-red-700">{error}</span>}
    </div>;
}

export default function MuseumSection({ itemId, section }: Props) {
    const [detail, setDetail] = useState<MuseumItemDetail | null>(null);
    const [changes, setChanges] = useState<Record<string, unknown>>({});
    const [record, setRecord] = useState<MuseumRecord | null>(null);
    const [payload, setPayload] = useState<Record<string, unknown>>({});
    const [dictionaryId, setDictionaryId] = useState<number | null>(null);
    const [partyId, setPartyId] = useState<number | null>(null);
    const [partyQuery, setPartyQuery] = useState('');
    const [partyMatches, setPartyMatches] = useState<{ id: number; firstName: string | null; lastName: string }[]>([]);
    const [message, setMessage] = useState('');
    const [deaccession, setDeaccession] = useState({ reason: '', deaccessionDate: '', documentNumber: '' });
    const kind = recordKinds[section];

    useEffect(() => {
        if (!itemId) return;
        getMuseumItem(itemId).then(setDetail).catch((e: Error) => setMessage(e.message));
    }, [itemId]);

    if (!itemId) return <p className="rounded border bg-gray-50 p-4">Nejprve uložte předmět; pak lze vyplnit tuto sekci.</p>;
    if (!detail) return <p role="status">{message || 'Načítám muzeální údaje…'}</p>;

    const value = (key: keyof MuseumItemDetail) =>
        (Object.prototype.hasOwnProperty.call(changes, key) ? changes[key] : detail[key]) as string | number | boolean | null;
    const change = (key: keyof MuseumItemDetail, next: unknown) => setChanges(old => ({ ...old, [key]: next }));
    const saveFields = async () => {
        try {
            setDetail(await patchMuseumItem(itemId, changes));
            setChanges({});
            setMessage('Údaje uloženy.');
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
    if (section === 'basic') fields = <>
        {text('markant', 'Markant')}{text('signature', 'Signatura')}{tree('subjectDictionaryId', 'SUBJECT', 'Námět')}
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
        setPayload(existing ? { ...existing.payload } : {});
        setDictionaryId(existing?.dictionaryId ?? null);
        setPartyId(existing?.partyId ?? null);
        setPartyQuery('');
    };
    const saveRecord = async () => {
        if (!kind) return;
        try {
            if (record) await updateMuseumRecord(itemId, kind, record.id, payload, dictionaryId, partyId);
            else await createMuseumRecord(itemId, kind, payload, dictionaryId, partyId);
            setDetail(await getMuseumItem(itemId));
            startRecord(null);
            setMessage('Záznam uložen.');
        } catch (e) { setMessage((e as Error).message); }
    };
    const removeRecord = async (row: MuseumRecord) => {
        if (!kind || row.sourceTable || !window.confirm('Odebrat tento záznam?')) return;
        try {
            await deleteMuseumRecord(itemId, kind, row.id);
            setDetail(await getMuseumItem(itemId));
        } catch (e) { setMessage((e as Error).message); }
    };

    return <div className="space-y-5">
        {fields && <div className="grid grid-cols-1 gap-4 rounded border border-gray-200 p-5 md:grid-cols-2">{fields}
            {section !== 'history' && <div className="col-span-full">{saveButton}</div>}</div>}
        {kind && <div className="space-y-4">
            <h3 className="font-bold">{section === 'documentation' ? 'Dokumentace DEMUS (samostatně od příloh)' : 'Záznamy'}</h3>
            <div className="space-y-2">{detail.records.filter(x => x.kind === kind).map(row => <div key={row.id} className="rounded border border-gray-200 p-3 text-sm">
                <div className="flex justify-between gap-2"><strong>{row.sourceTable ? `DEMUS ${row.sourceTable}` : 'Nový záznam'} · #{row.id}</strong>
                    <span><button type="button" className="text-blue-700 underline" onClick={() => startRecord(row)}>Upravit</button>
                        {!row.sourceTable && <button type="button" className="ml-3 text-red-700 underline" onClick={() => removeRecord(row)}>Odebrat</button>}</span></div>
                <div className="mt-2 grid gap-1 md:grid-cols-2">{recordFields[kind].map(([key, label]) => <p key={key}><strong>{label}:</strong> {String(row.payload[key] ?? '—')}</p>)}</div>
                {row.partyId && <p>Vazba na osobu/subjekt #{row.partyId}</p>}
                {row.sourceTable && <details className="mt-2"><summary className="cursor-pointer">Všechna původní pole</summary><pre className="overflow-x-auto text-xs">{JSON.stringify(row.legacyData, null, 2)}</pre></details>}
            </div>)}</div>
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
            {(kind !== 'DEACCESSION' || record) && <div className="rounded border border-gray-200 bg-gray-50 p-4 space-y-3">
                <h4 className="font-semibold">{record ? `Úprava záznamu #${record.id}` : 'Nový záznam'}</h4>
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
                        : <input type={key.startsWith('Poradi_') ? 'number' : 'text'}
                            className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 font-normal"
                            value={String(payload[key] ?? '')} onChange={e => setPayload(old => ({ ...old,
                                [key]: key.startsWith('Poradi_') ? (e.target.value ? Number(e.target.value) : null) : e.target.value }))} />}
                </label>)}</div>
                <button type="button" className="rounded bg-[#00204a] px-4 py-2 text-sm font-semibold text-white" onClick={saveRecord}>Uložit záznam</button>
                {record && <button type="button" className="ml-3 text-sm underline" onClick={() => startRecord(null)}>Nový záznam</button>}
            </div>}
        </div>}
        {message && <p role="status" className="text-sm text-[#00204a]">{message}</p>}
    </div>;
}
