import {professionalFields,professionalDraft,professionalValue,professionalDelta} from '../lib/professional';
import type { ItemEditSession } from '../lib/editSession';
import { useEffect, useState, useRef, type MutableRefObject } from 'react';
import AddDictionaryModal from './AddDictionaryModal';
import {
    deleteMuseumRecord, getDictionaryTree, getMuseumItem,
    patchMuseumItem, deaccessionItem,
    searchParties, saveProfessionalRecord, listProfessionalRecords, ApiError,
    type MuseumItemDetail, type MuseumRecord, type MuseumRecordKind, type ProfessionalWrite,
} from '../lib/api';

type TreeNode = { id: number; code: string | null; label: string; children: TreeNode[] };
type Section = 'basic' | 'materials' | 'locality' | 'classification' | 'determination' | 'documentation' | 'deaccession' | 'history' | 'manipulation' | 'action' | 'iso' | 'origin' | 'materialTuples' | 'bibliography';
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
    manipulation: 'MANIPULATION', action: 'ACTION', iso: 'ISO', origin: 'ORIGIN', materialTuples:'MATERIAL_TECHNIQUE', bibliography:'BIBLIOGRAPHY'
};
const recordFields = professionalFields;
const recordDictionary: Partial<Record<MuseumRecordKind, string>> = {
    BIBLIOGRAPHY:'LITERATURE', CLASSIFICATION: 'CLASSIFICATION', DETERMINATION: 'DETERMINER', DOCUMENTATION: 'DOCUMENT_TYPE', DEACCESSION: 'DEACCESSION_REASON',
};

function flatten(nodes: TreeNode[], prefix = ''): { id: number; label: string; rawLabel: string; code: string | null }[] {
    return nodes.flatMap(node => {
        const label = prefix ? `${prefix} › ${node.label}` : node.label;
        return [{ id: node.id, label, rawLabel: node.label, code: node.code }, ...flatten(node.children || [], label)];
    });
}

export function TreeChoice({ type, value, onChange, label, allowEmpty=true, invalid=false }: {
    type: string; value: number | null;
    onChange: (id: number | null, choice?: { id: number; label: string; rawLabel?: string; code: string | null }) => void; label: string;
    allowEmpty?:boolean; invalid?:boolean;
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
        <select aria-label={label} aria-invalid={invalid} className="w-full rounded border border-gray-300 bg-white px-3 py-2 font-normal text-xs"
            value={value ?? ''} onChange={e => {
                const id = e.target.value ? Number(e.target.value) : null;
                onChange(id, choices.find(choice => choice.id === id));
            }}>
            <option value="" disabled={!allowEmpty}>— nevybráno —</option>
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
    const [materialId,setMaterialId]=useState<number|null>(drafts?.current[section]?.materialId??null);
    const [techniqueId,setTechniqueId]=useState<number|null>(drafts?.current[section]?.techniqueId??null);
    const [clearParty,setClearParty]=useState(drafts?.current[section]?.clearParty??false);
    const [clearDictionary,setClearDictionary]=useState(drafts?.current[section]?.clearDictionary??false);
    const [nativeCode,setNativeCode]=useState<string|null>(null);
    const [saving,setSaving]=useState(false);
    const [referenceError,setReferenceError]=useState(false);
    const [partyQuery, setPartyQuery] = useState('');
    const [partyMatches, setPartyMatches] = useState<{ id: number; firstName: string | null; lastName: string }[]>([]);
    const [message, setMessage] = useState('');
    const [deaccession, setDeaccession] = useState({ reason: '', deaccessionDate: '', documentNumber: '' });
    const editFormRef = useRef<HTMLDivElement>(null);
    const kind = recordKinds[section];
    useEffect(() => {
        if (drafts) drafts.current[section] = {changes, record, payload, dictionaryId, partyId,
            materialId,techniqueId,clearParty,clearDictionary,
            dirty: Object.keys(changes).length > 0 || (kind && Object.keys(professionalDelta(kind,payload,record)).length>0) || clearParty || clearDictionary ||
                (record ? partyId!==record.partyId||dictionaryId!==record.dictionaryId||materialId!==(record.materialDictionaryId??null)||techniqueId!==(record.techniqueDictionaryId??null) : !!partyId||!!dictionaryId||!!materialId||!!techniqueId)};
    }, [changes, record, payload, dictionaryId, partyId, section, drafts,kind,materialId,techniqueId,clearParty,clearDictionary]);

    useEffect(() => {
        if (!itemId || (snapshotRequired && !editSession)) return;
        let alive = true;
        Promise.resolve(editSession?.museumSnapshot as MuseumItemDetail | undefined)
            .then(snapshot => snapshot || getMuseumItem(itemId, editSession))
            .then(async data => {
                if (snapshotRequired && editSession && kind) {
                    const rows=await listProfessionalRecords(itemId,kind,editSession);
                    data={...data,records:[...(data.records||[]).filter(row=>row.kind!==kind),...rows]};
                    editSession.museumSnapshot=data;
                }
                if (alive) setDetail(data);
            }).catch((e: Error) => {if (alive) setMessage(e.message);});
        return () => {alive = false;};
    }, [itemId, editSession, snapshotRequired,kind]);

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
        setPayload(existing ? professionalDraft(existing) : {});
        setDictionaryId(existing?.dictionaryId ?? null);
        setPartyId(existing?.partyId ?? null);
        setPartyQuery('');setClearParty(false);setClearDictionary(false);setReferenceError(false);setNativeCode(null);
        setMaterialId(existing?.materialDictionaryId??null);setTechniqueId(existing?.techniqueDictionaryId??null);
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
        if (!hasPayloadData && !dictionaryId && !partyId && !materialId && !techniqueId && !clearParty && !clearDictionary) {
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
        setSaving(true);setReferenceError(false);setMessage('');
        try {
            const changed=professionalDelta(kind,payload,record);
            const input:ProfessionalWrite=kind==='CLASSIFICATION'?{payload:changed}:{fields:{kind,...changed}};
            if(dictionaryId!=null && (!record||dictionaryId!==record.dictionaryId))input.dictionaryId=dictionaryId;
            if(partyId!=null && (!record||partyId!==record.partyId))input.partyId=partyId;
            if(clearParty)input.clearParty=true;
            if(clearDictionary)input.clearDictionary=true;
            if(kind==='MATERIAL_TECHNIQUE') {
                if(materialId!=null&&materialId!==record?.materialDictionaryId)input.materialDictionaryId=materialId;
                if(techniqueId!=null&&techniqueId!==record?.techniqueDictionaryId)input.techniqueDictionaryId=techniqueId;
            }
            const saved=await saveProfessionalRecord(itemId,kind,input,editSession,record?.id);
            if(saved?.id)setRecord(saved);
            const fresh = await getMuseumItem(itemId, editSession);
            if (editSession) editSession.museumSnapshot = fresh;
            setDetail(fresh);
            startRecord(null);
            if (onSave) onSave();
            setMessage('Záznam uložen.');
        } catch (e) {
            const reference=e instanceof ApiError&&e.status===400;
            setReferenceError(reference);
            setMessage(reference?'Zápis nebyl přijat. Zkontrolujte nativní reference a vybraná ID; zadaná data zůstávají zachována. '+e.message:(e as Error).message);
        } finally {setSaving(false);}
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
                        {row.currentParty&&<p>Současná osoba: {row.currentParty.displayName} · #{row.currentParty.id} ({row.currentParty.type})</p>}
                        {row.sourceTable==='Sbirky'&&kind==='DETERMINATION'&&<p>Kořenové určení — Sbirky</p>}
                        {row.sourceTable==='Urceni'&&<p>Podřízený záznam — Urceni</p>}
                        {kind==='MATERIAL_TECHNIQUE'&&<p>Materiál ID: {row.materialDictionaryId??'—'} · Technika ID: {row.techniqueDictionaryId??'—'}</p>}
                        {row.sourceTable && <details><summary>Všechna původní pole</summary>
                            <p>Zdroj: {row.sourceTable} · {row.sourceKey || '—'}</p><pre>{JSON.stringify(row.legacyData,null,2)}</pre></details>}
                    </td>
                    {recordFields[kind].map(([key]) => <td key={key}>{String(professionalValue(row,key) ?? '—')}</td>)}
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
                {recordDictionary[kind] && <TreeChoice type={recordDictionary[kind]!} label="Číselník" invalid={referenceError}
                    value={dictionaryId} onChange={(id,choice)=>{setDictionaryId(id);setClearDictionary(id==null&&!!record?.dictionaryId);setNativeCode(choice?.code??null);}}/>}
                {recordDictionary[kind]&&<p>Výběr ID nemění původní citaci ani nativní kód. {clearDictionary?'Současná vazba bude výslovně zrušena.':''}</p>}
                {nativeCode!=null&&['BIBLIOGRAPHY','CLASSIFICATION','DOCUMENTATION'].includes(kind)&&<button type="button" onClick={()=>{
                    const key=kind==='BIBLIOGRAPHY'?'Ref_RF':kind==='CLASSIFICATION'?'SysKat_ZS':'TypDok_DK';setPayload(old=>({...old,[key]:nativeCode}));
                }}>Použít nativní kód vybrané položky: {nativeCode}</button>}
                {kind==='MATERIAL_TECHNIQUE'&&<div className="grid grid-cols-2 gap-2">
                    <TreeChoice type="MATERIAL" label="Materiál tuple — číselník" value={materialId} allowEmpty={!record?.materialDictionaryId} onChange={id=>setMaterialId(id)}/>
                    <TreeChoice type="TECHNIQUE" label="Technika tuple — číselník" value={techniqueId} allowEmpty={!record?.techniqueDictionaryId} onChange={id=>setTechniqueId(id)}/>
                    <p className="col-span-2">Párování materiálu/techniky zůstává samostatným záznamem. Generické zrušení vazby na tento tuple se nepoužívá.</p>
                </div>}
                {['DETERMINATION','ORIGIN','MANIPULATION'].includes(kind) && <div className="space-y-2 text-sm">
                    <label className="block font-semibold">Současná osoba — hledat existující osoby/subjekty
                        <input value={partyQuery} onChange={async e => {
                            const query = e.target.value;
                            setPartyQuery(query);
                            try {setPartyMatches(query.length >= 2 ? await searchParties(query) : []);} catch(e) {setMessage((e as Error).message);}
                        }} onKeyDown={e => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                e.stopPropagation();
                            }
                        }} placeholder="Hledat osobu nebo instituci"
                            className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 font-normal" />
                    </label>
                    <select aria-label="Vybraná osoba" value={partyId ?? ''}
                        onChange={e => {const id=e.target.value?Number(e.target.value):null;setPartyId(id);setClearParty(id==null&&!!record?.partyId);}}
                        className="w-full rounded border border-gray-300 bg-white px-3 py-2">
                        <option value="">— bez současné vazby / výslovně zrušit —</option>
                        {partyId && !partyMatches.some(p => p.id === partyId) && <option value={partyId}>{record?.currentParty?.displayName||`Stávající osoba #${partyId}`}</option>}
                        {partyMatches.map(p => <option key={p.id} value={p.id}>{[p.firstName, p.lastName].filter(Boolean).join(' ')}</option>)}
                    </select>
                </div>}
                {clearParty&&<p>Současná vazba bude výslovně zrušena. Historický text osoby zůstává beze změny.</p>}
                <div className="grid gap-3 md:grid-cols-2">{recordFields[kind].map(([key, label]) => <label key={key} className="block text-sm font-semibold">
                    {label}{key === 'Export_DK' ? <input type="checkbox" className="ml-3"
                        checked={payload[key] === true} onChange={e => setPayload(old => ({ ...old, [key]: e.target.checked }))} />
                        : <input type={key.startsWith('Poradi_') ? 'number' : (['CKtlg_AK','CenaISO_SO','RokOd_VZ','RokDo_VZ'].includes(key) ? 'number' : 'text')}
                            min={key.startsWith('Poradi_') ? '0' : undefined}
                            className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 font-normal"
                            aria-invalid={referenceError} value={String(payload[key] ?? '')} onChange={e => setPayload(old => ({ ...old,
                                [key]: (key.startsWith('Poradi_') || ['CKtlg_AK','CenaISO_SO','RokOd_VZ','RokDo_VZ'].includes(key)) ? (e.target.value !== '' ? Number(e.target.value) : null) : e.target.value }))} />}
                </label>)}</div>
                <div className="flex items-center gap-3 pt-2">
                    <button type="button" className="rounded bg-[#00204a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#003366]" disabled={saving} onClick={saveRecord}>
                        Uložit záznam
                    </button>
                    {record && <button type="button" className="text-sm text-gray-600 underline hover:text-gray-900" onClick={() => startRecord(null)}>Zrušit úpravu</button>}
                </div>
            </div>}
        </div>}
        {message && <p role="status" className="text-sm text-[#00204a]">{message}</p>}
    </fieldset>;
}
