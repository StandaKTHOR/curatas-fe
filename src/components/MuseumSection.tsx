import TechnicalDemus from '../features/catalog/TechnicalDemus';
import ProfessionalLinks from '../features/catalog/ProfessionalLinks';
import CurrentDeaccessionProposal from '../features/catalog/CurrentDeaccessionProposal';
import CurrentAuthors from '../features/catalog/CurrentAuthors';
import {matTechPositionRows} from './MatTechPositions';
import MatTechGroups from './MatTechGroups';
import {matTechColumn} from '../lib/matTechColumn';
import type {LifecycleState} from '../features/scoped/scopedApi';
import {HistoricalTableRows,HistoricalTable} from '../features/catalog/HistoricalRows';
import type {HistoricalTable as HistoricalSourceTable} from '../features/catalog/historicalContract';
import ThreeLevelDictionarySelect from './ThreeLevelDictionarySelect';
import {originalIntegrationEnabled,originalSession} from '../features/catalog/originalAdapter';
import {useHistoricalRows} from '../features/catalog/useHistoricalRows';
import {historicalCuratorText} from '../features/catalog/historicalContract';
import {originalCanEdit} from '../features/catalog/originalEdit';
import { uncertainWrite, uncertainCreateMessage } from '../lib/writeOutcome';
import {professionalFields,professionalDraft,professionalValue,professionalDelta,professionalHistoricalLabel,professionalAuthorityId} from '../lib/professional';
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
const sectionLabels:Record<Section,string>={basic:'základních údajů',materials:'materiálu',locality:'lokality',classification:'zařazení',determination:'určení',documentation:'dokumentace',deaccession:'vyřazení',history:'historie',manipulation:'manipulace',action:'akcí',iso:'ISO',origin:'vzniku',materialTuples:'materiálu a techniky',bibliography:'literatury'};
type Props = { itemId?: number; section: Section; onSave?: () => void; editSession?: ItemEditSession; readOnly?: boolean; proposalBlocked?:boolean; drafts?: MutableRefObject<Record<string, any>>; snapshotRequired?: boolean };

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
const scopedSpecialistSections: Partial<Record<Section, 'reference' | 'manipulation' | 'action' | 'iso'>> = {
    bibliography: 'reference', manipulation: 'manipulation', action: 'action', iso: 'iso'
};
const rootHistoricalFields:Partial<Record<Section,[string,string][]>>={
 determination:[['Predmet_S','Původní předmět — Sbirky'],['Urcil_S','Určil — Sbirky'],['DatUrc_S','Datum určení — Sbirky']],
 origin:[['Autor_S','Autor — DEMUS text'],['Role_S','Role — DEMUS kód'],['Datace_S','Datace textem'],['RokOd_S','Rok od'],['RokDo_S','Rok do'],['MistoVz_S','Místo vzniku'],['PoznVz_S','Poznámka ke vzniku']],
 classification:[['Skupina_S','Skupina — kód'],['Fond_S','Fond — DEMUS text'],['Podsb_S','Podsbírka — kód'],['Odd_S','Oddělení — kód']],
 basic:[['Namet_S','Námět — kód'],['Archiv_S','Archiválie DEMUS'],['Karta_S','Karta'],['Opsana_S','Opsáno'],['Overena_S','Ověřeno'],['Ozn_S','Označeno']],
 locality:[['Lokalita_S','Lokalita — kód'],['Fond_S','Fond — DEMUS text'],['Skupina_S','Skupina — kód']],
};
const recordFields = professionalFields;
const historicalKinds:Record<MuseumRecordKind,HistoricalSourceTable>={CLASSIFICATION:'Zarazeni',DETERMINATION:'Urceni',DOCUMENTATION:'Dokumentace',MANIPULATION:'Manipulace',ACTION:'Akce',ISO:'SbirkyISO',ORIGIN:'Vznik',MATERIAL_TECHNIQUE:'MatTech',BIBLIOGRAPHY:'Reference',DEACCESSION:'VyrazeniSb'};
const recordDictionary: Partial<Record<MuseumRecordKind, string>> = {
    BIBLIOGRAPHY:'LITERATURE', CLASSIFICATION: 'CLASSIFICATION', DETERMINATION: 'DETERMINER', DOCUMENTATION: 'DOCUMENT_TYPE', DEACCESSION: 'DEACCESSION_REASON',
};

function flatten(nodes: TreeNode[], prefix = ''): { id: number; label: string; rawLabel: string; code: string | null }[] {
    return nodes.flatMap(node => {
        const label = prefix ? `${prefix} › ${node.label}` : node.label;
        return [{ id: node.id, label, rawLabel: node.label, code: node.code }, ...flatten(node.children || [], label)];
    });
}

export function TreeChoice({ type, value, onChange, label, allowEmpty=true, invalid=false, unavailableReason }: {
    type: string; value: number | null;
    onChange: (id: number | null, choice?: { id: number; label: string; rawLabel?: string; code: string | null }) => void; label: string;
    allowEmpty?:boolean; invalid?:boolean; unavailableReason?:string;
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
        if(originalIntegrationEnabled())return;
        reloadTree();
    }, [type]);

    const choices = flatten(nodes).filter(x => x.label.toLocaleLowerCase('cs').includes(search.toLocaleLowerCase('cs')) || x.id === value);
    const friendlyTitle = DICTIONARY_TYPE_LABELS[type.toUpperCase()] || label || type;
    return <div className="block space-y-1 text-sm font-semibold text-gray-700">
        <div className="flex justify-between items-center">
            <span>{label}</span>
            <button
                type="button"
                disabled={!!unavailableReason} onClick={() => setIsAddModalOpen(true)}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 underline"
            >
                + Nový
            </button>
        </div>
        <input disabled={!!unavailableReason} aria-label={`Hledat: ${label}`} className="w-full rounded border border-gray-300 px-3 py-2 font-normal text-xs" value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                }
            }}
            placeholder="Hledat v hierarchii" />
        <select disabled={!!unavailableReason} aria-label={label} aria-invalid={invalid} className="w-full rounded border border-gray-300 bg-white px-3 py-2 font-normal text-xs"
            value={value ?? ''} onChange={e => {
                const id = e.target.value ? Number(e.target.value) : null;
                onChange(id, choices.find(choice => choice.id === id));
            }}>
            <option value="" disabled={!allowEmpty}>— nevybráno —</option>
            {value && !choices.some(x => x.id === value) && <option value={value} disabled>Stávající vazba — označení není v načteném číselníku</option>}
            {choices.map(x => <option key={x.id} value={x.id}>{x.label}</option>)}
        </select>
        {(error||unavailableReason) && <span className="text-red-700 text-xs block">{error||unavailableReason}</span>}

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

export default function MuseumSection({ itemId, section, onSave, editSession, readOnly = false, proposalBlocked=false, drafts, snapshotRequired = false }: Props) {
    const [registryRecords,setRegistryRecords]=useState<number[]|null>(null);
    useEffect(()=>setRegistryRecords(null),[section,itemId]);
    const [detail, setDetail] = useState<MuseumItemDetail | null>(null);
    const [changes, setChanges] = useState<Record<string, unknown>>(drafts?.current[section]?.changes ?? {});
    const [record, setRecord] = useState<MuseumRecord | null>(drafts?.current[section]?.record ?? null);
    const [matTechNew,setMatTechNew]=useState(drafts?.current[section]?.matTechNew??false);
    const [payload, setPayload] = useState<Record<string, unknown>>(drafts?.current[section]?.payload ?? {});
    const [dictionaryId, setDictionaryId] = useState<number | null>(drafts?.current[section]?.dictionaryId ?? null);
    const [partyId, setPartyId] = useState<number | null>(drafts?.current[section]?.partyId ?? null);
    const [materialId,setMaterialId]=useState<number|null>(drafts?.current[section]?.materialId??null);
    const [techniqueId,setTechniqueId]=useState<number|null>(drafts?.current[section]?.techniqueId??null);
    const [clearParty,setClearParty]=useState(drafts?.current[section]?.clearParty??false);
    const [clearDictionary,setClearDictionary]=useState(drafts?.current[section]?.clearDictionary??false);
    const [nativeCode,setNativeCode]=useState<string|null>(null);
    const [saving,setSaving]=useState(false);
    const [uncertain,setUncertain]=useState(drafts?.current[section]?.uncertain??false);
    const [referenceError,setReferenceError]=useState(false);
    const [partyQuery, setPartyQuery] = useState('');
    const [partyMatches, setPartyMatches] = useState<{ id: number; firstName: string | null; lastName: string }[]>([]);
    const [message, setMessage] = useState('');
    const [deaccession, setDeaccession] = useState<{reason:string;deaccessionDate:string;documentNumber:string}>(drafts?.current[section]?.deaccession??{ reason: '', deaccessionDate: '', documentNumber: '' });
    const [lifecycleState,setLifecycleState]=useState<LifecycleState|null>(null);
    const [scopedEtag, setScopedEtag] = useState('');
    const [scopedValues, setScopedValues] = useState<Record<string, string | null> | null>(null);
    const editFormRef = useRef<HTMLDivElement>(null);
    const kind = recordKinds[section];
    const originSource=useHistoricalRows(section==='origin'?itemId:undefined,'Sbirky',editSession?.etag);
    const originNote=originSource.page?.state==='AVAILABLE'&&originSource.page.items.length===1?historicalCuratorText(originSource.page.items[0].fields.PoznVz_S):originSource.page?.error??'— (zdroj není ověřen)';
    const curatorSection = scopedSpecialistSections[section];
    const canRepeat = originalIntegrationEnabled() && Boolean(kind && kind !== 'DEACCESSION') && originalSession().catalog.professionalRecordsEnabled === true;
    const canScopedWrite = Boolean(curatorSection || canRepeat || kind==='DEACCESSION') && !readOnly && originalIntegrationEnabled() && originalCanEdit('professional');
    const matTechBrowse=kind==='MATERIAL_TECHNIQUE'&&originalIntegrationEnabled()&&!canScopedWrite;
    const selectRecord=(existing:MuseumRecord|null,explicitNew=false)=>{
        setRecord(existing);setMatTechNew(explicitNew);
        setPayload(existing?professionalDraft(existing):{});
        setDictionaryId(existing?.dictionaryId??null);setPartyId(existing?.partyId??null);
        setPartyQuery('');setClearParty(false);setClearDictionary(false);setReferenceError(false);setNativeCode(null);
        setMaterialId(existing?.materialDictionaryId??null);setTechniqueId(existing?.techniqueDictionaryId??null);
    };
    useEffect(() => {
        const lifecycleDirty=originalIntegrationEnabled()&&kind==='DEACCESSION'&&JSON.stringify(deaccession)!==JSON.stringify({reason:lifecycleState?.deaccession?.reason??'',deaccessionDate:lifecycleState?.deaccession?.deaccessionDate??'',documentNumber:lifecycleState?.deaccession?.documentNumber??''});
        const scopedDirty = originalIntegrationEnabled() && curatorSection && record?.id === 0 && scopedValues
            ? Object.keys(scopedValues).some(k => String(payload[k] ?? '') !== String(scopedValues[k] ?? ''))
            : false;
        if (drafts) drafts.current[section] = {itemId,matTechNew,changes, record, payload, dictionaryId, partyId,deaccession,
            materialId,techniqueId,clearParty,clearDictionary,uncertain,
            dirty: uncertain || lifecycleDirty || Object.keys(changes).length > 0 || (originalIntegrationEnabled() && curatorSection && record?.id === 0 ? scopedDirty : Boolean(kind && Object.keys(professionalDelta(kind,payload,record)).length>0)) || clearParty || clearDictionary ||
                (record ? partyId!==record.partyId||dictionaryId!==record.dictionaryId||materialId!==(record.materialDictionaryId??null)||techniqueId!==(record.techniqueDictionaryId??null) : !!partyId||!!dictionaryId||!!materialId||!!techniqueId)};
    }, [itemId,matTechNew,changes, record, payload, dictionaryId, partyId, section, drafts,kind,materialId,techniqueId,clearParty,clearDictionary,uncertain,curatorSection,scopedValues,deaccession,lifecycleState]);

    useEffect(() => {
        if (!itemId || (snapshotRequired && !editSession)) return;
        if(originalIntegrationEnabled()){
            let alive=true;setDetail(null);const {api,signal,catalog}=originalSession();
            if(curatorSection && kind){
                const loadOwned = catalog.professionalRecordsEnabled
                    ? api.professionalRecords(itemId,signal)
                    : Promise.resolve({items:[] as MuseumRecord[],etag:''});
                Promise.all([api.curatorRecord(itemId,curatorSection,signal),loadOwned]).then(([cur,owned])=>{
                    if(!alive||signal.aborted)return;
                    if((editSession as any)?.scopedCurrent&&cur.etag!==(editSession as any).scopedCurrent.etag)throw new Error('Verze odborné sekce se změnila. Obnovte kartu.');
                    setScopedEtag(cur.etag);setScopedValues(cur.value);
                    const currentRow:MuseumRecord|null=cur.present?{id:0,kind,dictionaryId:null,partyId:null,payload:cur.value,sourceTable:null,sourceKey:'CURRENT_CURATOR_STATEMENT',legacyData:null}:null;
                    setDetail({itemId,markant:null,signature:null,legacyArchived:null,legacyCard:null,legacyCopied:null,legacyVerified:null,legacyMarked:null,localityLegacyCode:null,fundLegacyCode:null,groupLegacyCode:null,subjectLegacyCode:null,materialDictionaryId:null,techniqueDictionaryId:null,localityDictionaryId:null,fundDictionaryId:null,groupDictionaryId:null,subjectDictionaryId:null,legacyCreatedBy:null,legacyCreatedAt:null,legacyUpdatedBy:null,legacyUpdatedAt:null,records:[...(currentRow?[currentRow]:[]),...owned.items]});
                    setPayload(drafts?.current[section]?.payload ?? {});
                    setMessage(cur.present?'Současné kurátorské tvrzení v této odborné sekci je načteno ze scoped API (odděleně od historického zdroje DEMUS).':'Současné kurátorské tvrzení v této odborné sekci je zatím prázdné. Historické zdrojové záznamy nejsou vydávány za současná tvrzení.');
                }).catch((e)=>{if(alive&&!signal.aborted)setMessage((e as Error).message||'Současnou odbornou sekci se nepodařilo načíst. Obnovte kartu.');});
                return()=>{alive=false;};
            }
            if(!kind||!catalog.professionalRecordsEnabled){setMessage(`Sekce ${section}: původní zdrojové záznamy ani nepodporované zápisy nejsou součástí tohoto scoped kontraktu. Chybějící přístup neznamená prázdnou evidenci.`);return;}
            Promise.all([api.professionalRecords(itemId,signal),kind==='DEACCESSION'?api.lifecycle(itemId,signal):Promise.resolve(null)]).then(([result,lifecycle])=>{
                if(!alive||signal.aborted)return;
                if((editSession as any)?.scopedCurrent&&result.etag!==(editSession as any).scopedCurrent.etag)throw new Error('Verze podzáznamů se změnila. Obnovte kartu.');
                if(lifecycle){if(lifecycle.etag!==result.etag)throw new Error('Verze provozního stavu se změnila. Obnovte kartu.');setLifecycleState(lifecycle.value);if(!drafts?.current[section]?.dirty&&lifecycle.value.deaccession)setDeaccession({reason:lifecycle.value.deaccession.reason,deaccessionDate:lifecycle.value.deaccession.deaccessionDate,documentNumber:lifecycle.value.deaccession.documentNumber??''});}
                setScopedEtag(result.etag);
                if(kind==='MATERIAL_TECHNIQUE'){
                    const draft=drafts?.current[section];
                    const current=result.items.filter((r:MuseumRecord)=>r.kind===kind&&!r.sourceTable);
                    const selected=draft?.matTechNew?null:current.find((r:MuseumRecord)=>r.id===draft?.record?.id)??current[0]??null;
                    selectRecord(selected,draft?.matTechNew===true);
                    if(draft?.dirty&&(draft.matTechNew||selected?.id===draft.record?.id))setPayload(draft.payload??{});
                }
                setDetail({itemId,markant:null,signature:null,legacyArchived:null,legacyCard:null,legacyCopied:null,legacyVerified:null,legacyMarked:null,localityLegacyCode:null,fundLegacyCode:null,groupLegacyCode:null,subjectLegacyCode:null,materialDictionaryId:null,techniqueDictionaryId:null,localityDictionaryId:null,fundDictionaryId:null,groupDictionaryId:null,subjectDictionaryId:null,legacyCreatedBy:null,legacyCreatedAt:null,legacyUpdatedBy:null,legacyUpdatedAt:null,records:result.items});
                setMessage('Současné vlastní odborné podzáznamy. Historické raw údaje zde nejsou přepsány ani vydávány za současná tvrzení. Zápis současných záznamů vyžaduje oprávnění item.professional.write; původní zdrojové řádky se nemění.');
            }).catch((e)=>{if(alive&&!signal.aborted)setMessage('Současné podzáznamy se nepodařilo ověřit. Obnovte kartu. '+(e as Error).message);});return()=>{alive=false;};
        }
        let alive = true;
        Promise.resolve(editSession?.museumSnapshot as MuseumItemDetail | undefined)
            .then(snapshot => snapshot || getMuseumItem(itemId, editSession))
            .then(async data => {
                if (snapshotRequired && editSession && kind) {
                    const rows=await listProfessionalRecords(itemId,kind,editSession);
                    data={...data,records:[...(data.records||[]).filter(row=>row.kind!==kind),...rows]};
                    if (alive) editSession.museumSnapshot=data;
                }
                if (alive) setDetail(data);
            }).catch((e: Error) => {if (alive) setMessage(e.message);});
        return () => {alive = false;};
    }, [itemId, editSession, snapshotRequired,kind,curatorSection,section]);

    const materialColumn=matTechColumn(detail?.records??[],record,payload,'MATERIAL',originalIntegrationEnabled());
    const techniqueColumn=matTechColumn(detail?.records??[],record,payload,'TECHNIQUE',originalIntegrationEnabled());
    if (!itemId) return <p className="rounded border bg-gray-50 p-4">Nejprve uložte předmět; pak lze vyplnit tuto sekci.</p>;
    if (snapshotRequired && !editSession) return <p role="status">Čekám na konzistentní verzi předmětu…</p>;
    if (!detail) return <p role="status">{message || 'Načítám muzeální údaje…'}</p>;

    const value = (key: keyof MuseumItemDetail) =>
        (Object.prototype.hasOwnProperty.call(changes, key) ? changes[key] : detail[key]) as string | number | boolean | null;
    const change = (key: keyof MuseumItemDetail, next: unknown) => setChanges(old => {
        const updated = {...old};
        if (JSON.stringify(next) === JSON.stringify(detail[key])) delete updated[key];
        else updated[key] = next;
        return updated;
    });
    const saveFields = async () => {
        if (saving || editSession?.busy || !Object.keys(changes).length) return;
        setSaving(true);
        try {
            const fresh = await patchMuseumItem(itemId, changes, editSession);
            if (editSession) editSession.museumSnapshot = fresh;
            setDetail(fresh);
            setChanges({});
            if (drafts?.current[section]) drafts.current[section] = {...drafts.current[section], changes: {}, dirty: false};
            if (onSave) await onSave();
            setMessage('Sekce byla uložena. Ostatní rozpracované údaje zůstávají neuložené.');
        } catch (e) { setMessage((e as Error).message); }
        finally {setSaving(false);}
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
    if (section === 'origin') fields = originalIntegrationEnabled()?<label className="block space-y-1 text-sm font-semibold text-gray-700"><span>PoznVz — původní poznámka DEMUS</span><input readOnly value={originNote} /><span>Současnou poznámku zadejte do pole Poznámka v odborném záznamu níže.</span></label>:<>{text('originNote', 'PoznVz — poznámka k místu vzniku')}</>;
    else if (section === 'basic') fields = <>
        {tree('subjectDictionaryId', 'SUBJECT', 'Námět')}
        {text('subjectLegacyCode', 'Původní kód námětu')}
        <div className="col-span-full flex flex-wrap gap-4">{bool('legacyArchived', 'Archiválie')}{bool('legacyCard', 'Karta')}
            {bool('legacyCopied', 'Opsáno')}{bool('legacyVerified', 'Ověřeno')}{bool('legacyMarked', 'Označeno')}</div>
    </>;
    else if (section === 'materials') fields = <>
        <ThreeLevelDictionarySelect scoped={originalIntegrationEnabled()} type="MATERIAL" label="Materiál" readOnly={readOnly} value={value('materialDictionaryId') as number | null} onChange={id => change('materialDictionaryId', id)}/>
        <ThreeLevelDictionarySelect scoped={originalIntegrationEnabled()} type="TECHNIQUE" label="Technika" readOnly={readOnly} value={value('techniqueDictionaryId') as number | null} onChange={id => change('techniqueDictionaryId', id)}/>
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
        if (uncertain) {setMessage(uncertainCreateMessage); return;}
        selectRecord(existing,kind==='MATERIAL_TECHNIQUE'&&!existing);
        if (existing) {
            setTimeout(() => {
                if (typeof editFormRef.current?.scrollIntoView === 'function') {
                    editFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }, 50);
        }
    };
    const saveRecord = async () => {
        if (!kind || saving || editSession?.busy) return;
        if (uncertain) {setMessage(uncertainCreateMessage); return;}
        if (originalIntegrationEnabled() && curatorSection && record?.id === 0) {
            if (!canScopedWrite) { setMessage('Chybí oprávnění item.professional.write pro zápis odborné sekce.'); return; }
            const nextValues: Record<string, string | null> = {};
            for (const [key] of recordFields[kind]) {
                const raw = payload[key];
                const before = scopedValues ? scopedValues[key] : null;
                if (String(raw ?? '') === String(before ?? '')) nextValues[key] = before ?? null;
                else nextValues[key] = raw === undefined || raw === null ? null : String(raw);
            }
            if (scopedValues && Object.keys(nextValues).every(k => String(nextValues[k] ?? '') === String(scopedValues[k] ?? ''))) {
                setMessage('Záznam nemá žádné změny k uložení.'); return;
            }
            if (Object.values(nextValues).every(v => v === null || v === '') && (!scopedValues || Object.values(scopedValues).every(v => v === null || v === ''))) {
                setMessage('Nelze uložit zcela prázdný záznam. Vyplňte alespoň jedno pole.'); return;
            }
            if (kind === 'ACTION' && nextValues.Poradi_AK !== null && nextValues.Poradi_AK !== '' && Number(nextValues.Poradi_AK) < 0) {
                setMessage('Pořadí v akci nesmí být záporné.'); return;
            }
            setSaving(true); setReferenceError(false); setMessage('');
            try {
                const { api, signal } = originalSession();
                const currentEtag = (editSession as any)?.scopedCurrent?.etag || editSession?.etag || scopedEtag;
                const savedTag=await api.saveCuratorRecord(itemId, curatorSection, currentEtag, nextValues, signal);
                const fresh = await api.curatorRecord(itemId, curatorSection, signal);
                if(fresh.etag!==savedTag)throw new Error('Zápis byl potvrzen, ale verze odborné sekce se změnila při obnovení. Obnovte kartu; zadání zůstává zachováno.');
                setScopedEtag(fresh.etag);
                setScopedValues(fresh.value);
                if (editSession) {
                    editSession.etag = fresh.etag;
                    if ((editSession as any).scopedCurrent) (editSession as any).scopedCurrent.etag = fresh.etag;
                }
                const currentRow: MuseumRecord = { id: 0, kind, dictionaryId: null, partyId: null, payload: fresh.value, sourceTable: null, sourceKey: 'CURRENT_CURATOR_STATEMENT', legacyData: null };
                setDetail(old => old ? { ...old, records: [currentRow, ...old.records.filter(r => r.id !== 0)] } : old);
                startRecord(null);
                if (drafts?.current[section]) drafts.current[section] = { ...drafts.current[section], record: null, payload: {}, dictionaryId:null, partyId:null, materialId:null, techniqueId:null, clearParty:false, clearDictionary:false, dirty: false };
                await onSave?.();
                setMessage('Záznam uložen.');
            } catch (e) {
                setMessage((e as Error).message);
            } finally {
                setSaving(false);
            }
            return;
        }
        if (originalIntegrationEnabled() && canRepeat) {
            if(!canScopedWrite){setMessage('Chybí oprávnění item.professional.write.');return;}
            if(record?.sourceTable || record?.legacyData){setMessage('Historický zdrojový záznam nelze tímto editorem přepsat.');return;}
            const delta=professionalDelta(kind,payload,record);
            if(!Object.keys(delta).length){setMessage('Záznam nemá žádné změny k uložení.');return;}
            setSaving(true);setMessage('');if(editSession)editSession.busy=true;
            let committed=false;
            try{
                const {api,signal}=originalSession();
                const etag=(editSession as any)?.scopedCurrent?.etag || editSession?.etag || scopedEtag;
                const saved=await api.saveProfessional(itemId,kind,record?.id,etag,delta,signal);committed=true;
                if(editSession){editSession.etag=saved.etag;if((editSession as any).scopedCurrent)(editSession as any).scopedCurrent.etag=saved.etag;}
                setScopedEtag(saved.etag);
                const fresh=await api.professionalRecords(itemId,signal);
                if(fresh.etag!==saved.etag)throw new Error('Verze se změnila při obnovení; načtěte kartu znovu.');
                setDetail(old=>old?{...old,records:[...old.records.filter(r=>r.id===0),...fresh.items]}:old);
                const selected=kind==='MATERIAL_TECHNIQUE'?fresh.items.find((r:MuseumRecord)=>r.id===saved.value.id)??null:null;
                selectRecord(selected);
                if(drafts?.current[section])drafts.current[section]={...drafts.current[section],record:selected,matTechNew:false,payload:selected?professionalDraft(selected):{},dictionaryId:selected?.dictionaryId??null,partyId:selected?.partyId??null,materialId:selected?.materialDictionaryId??null,techniqueId:selected?.techniqueDictionaryId??null,clearParty:false,clearDictionary:false,dirty:false};
                await onSave?.();setMessage('Záznam uložen.');
            }catch(e){
                if(committed){if(!record)setUncertain(true);setMessage('Záznam byl uložen; obnovení dat selhalo: '+(e as Error).message);}
                else {if(!record && !(typeof (e as any).status==='number'&&(e as any).status>=400&&(e as any).status<500))setUncertain(true);setMessage((e as Error).message);}
            }finally{setSaving(false);if(editSession)editSession.busy=false;}
            return;
        }
        if (record && Object.keys(professionalDelta(kind,payload,record)).length === 0
            && dictionaryId === record.dictionaryId && partyId === record.partyId
            && materialId === (record.materialDictionaryId ?? null) && techniqueId === (record.techniqueDictionaryId ?? null)
            && !clearParty && !clearDictionary) {setMessage('Záznam nemá žádné změny k uložení.'); return;}
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
        let committed = false;
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
            if (!saved?.id) throw new Error('Server nepotvrdil ID záznamu.');
            committed = true;
            startRecord(saved);
            if (drafts) drafts.current[section] = {...drafts.current[section], record: saved, payload: professionalDraft(saved), dirty: false};
            const fresh = await getMuseumItem(itemId, editSession);
            if (editSession) editSession.museumSnapshot = fresh;
            setDetail(fresh);
            startRecord(null);
            await onSave?.();
            setMessage('Záznam uložen.');
        } catch (e) {
            if (committed) {setMessage('Záznam byl uložen; obnovení dat selhalo: ' + (e as Error).message); return;}
            if (!record && uncertainWrite(e)) {setUncertain(true); setMessage(uncertainCreateMessage + ' ' + (e as Error).message); return;}
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

    return <fieldset data-scoped-reference-editor={originalIntegrationEnabled() && (curatorSection || canRepeat || kind==='DEACCESSION') ? '' : undefined} disabled={(!matTechBrowse&&readOnly) || saving || (originalIntegrationEnabled() && ((!matTechBrowse&&!canScopedWrite)||kind==='DEACCESSION'&&lifecycleState?.status==='VYRAZENO'&&lifecycleState.active===false))} className="space-y-5 demus-section">
        {fields && <div className="grid grid-cols-1 gap-4 rounded border border-gray-200 p-5 md:grid-cols-2">{fields}
            {section !== 'history' && <div className="col-span-full">{saveButton}</div>}</div>}
        {kind && <div className="space-y-4">
            <h3 className="font-bold">{section === 'documentation' ? 'Odborné záznamy dokumentace' : kind === 'MATERIAL_TECHNIQUE' ? 'Materiál a technika' : 'Záznamy'}</h3>
            <div className="overflow-x-auto"><table className="demus-datasheet" aria-label={`Evidence ${sectionLabels[section]}`}>
                <thead><tr><th>Záznam / zdroj</th>{recordFields[kind].map(([key,label]) => <th key={key}>{label}</th>)}<th>Akce</th></tr></thead>
                <tbody>{detail.records.filter(x => x.kind === kind&&!registryRecords?.includes(x.id)).map(row => <tr key={row.id} data-professional-record-id={row.id} className={record?.id === row.id ? 'bg-blue-50' : ''}>
                    <td><strong>{row.sourceKey === 'CURRENT_CURATOR_STATEMENT' ? 'Současné kurátorské tvrzení' : row.sourceTable ? 'Původní záznam DEMUS' : kind==='MATERIAL_TECHNIQUE'?'Současný odborný záznam':'Nový záznam'}</strong>
                        {record?.id === row.id && <span className="block">✏️ Právě upravujete</span>}

                        {row.currentParty&&<p>Současná osoba: {row.currentParty.displayName}</p>}
                        {row.sourceTable==='Sbirky'&&kind==='DETERMINATION'&&<TechnicalDemus title="Původ určení"><p>Kořenové určení — Sbirky</p></TechnicalDemus>}
                        {row.sourceTable==='Urceni'&&<TechnicalDemus title="Původ určení"><p>Podřízený záznam — Urceni</p></TechnicalDemus>}
                        {kind==='MATERIAL_TECHNIQUE'&&<p>Autority: {Object.entries((row as any).authorityLabels??{}).filter(([key])=>key.endsWith('AuthorityId')).map(([,label])=>label).join(' / ')||'—'}{(['MATERIAL','TECHNIQUE'] as const).map(type=>{const index=matTechPositionRows(detail.records,type).findIndex(r=>r.id===row.id);return index>=0?<span key={type}> · {type==='MATERIAL'?'Materiál':'Technika'}: pozice {index+1}</span>:null;})}{professionalHistoricalLabel(row)&&` · ${professionalHistoricalLabel(row)}`}</p>}
                        <TechnicalDemus title="Identita odborného záznamu"><p>Identifikátor záznamu: {row.id} · Osoba: {row.currentParty?.id??'—'}{row.partyId?` · Vazba na osobu/subjekt: ${row.partyId}`:''}</p>{kind==='MATERIAL_TECHNIQUE'&&<p>Materiál ID: {professionalAuthorityId(row,'MATERIAL')??'—'} · Technika ID: {professionalAuthorityId(row,'TECHNIQUE')??'—'}</p>}</TechnicalDemus>
                        {row.sourceTable && <TechnicalDemus title="Všechna původní pole">
                            <p>Zdroj: {row.sourceTable} · {row.sourceKey || '—'}</p><pre>{JSON.stringify(row.legacyData,null,2)}</pre></TechnicalDemus>}
                    </td>
                    {recordFields[kind].map(([key]) => <td key={key} style={String(professionalValue(row,key)??'').length>80||key.startsWith('Pozn')?{maxWidth:kind==='MATERIAL_TECHNIQUE'?'18rem':'24rem',whiteSpace:'pre-wrap',overflowWrap:'anywhere'}:undefined}>{String(professionalValue(row,key) ?? '—')}</td>)}
                    <td style={{whiteSpace:'nowrap'}}>{kind !== 'DEACCESSION' && !registryRecords?.includes(row.id) && <button type="button" className="underline" onClick={() => startRecord(row)}>Upravit</button>}
                        {kind !== 'DEACCESSION' && !row.sourceTable && !originalIntegrationEnabled() && <button type="button" className="ml-3 text-red-700 underline" onClick={() => removeRecord(row)}>Odebrat</button>}
                    </td>
                </tr>)}<HistoricalTableRows itemId={itemId} table={historicalKinds[kind]} etag={editSession?.etag} fields={recordFields[kind]}/></tbody>
            </table></div>
            {originalIntegrationEnabled()&&kind==="ISO"&&<p>Odborná ISO evidence není stav předmětu. StavyISO (Stav_SI / Slovy_SI) nemají v tomto scoped kontraktu ověřenou vazbu; nelze je nahrazovat polem objectCondition ani KodISO_SO. <a className="underline" href={`/admin/iso-states?catalog=${originalSession().catalog.id}`}>Otevřít historické Stavy ISO</a></p>}{originalIntegrationEnabled()&&kind==="BIBLIOGRAPHY"&&registryRecords===null&&<p>Historické reference jsou doloženy níže. Nové přiřazení literatury vyžaduje katalogově ověřený dictionary ID a shodu s Ref_RF; tento write kontrakt zatím není dostupný. Volný text Ref_RF není náhradou vazby. Strany existujícího záznamu lze upravit beze změny klíče.</p>}{originalIntegrationEnabled()&&registryRecords===null&&['DETERMINATION','MANIPULATION'].includes(kind)&&<p>Vazba na osobu z Adresáře vyžaduje scoped party kontrakt; v1 /parties se zde nepoužívá. Historické Určil / Zapsal nejsou auditní uživatelé. Současné autory s rolí lze spravovat na kartě Vznik.</p>}<TechnicalDemus title="Kontext odborných přiřazení"><p>Každé přiřazení materiálu nebo techniky má vlastní odborný záznam. Jedna až tři úrovně tvoří jednu hierarchickou cestu. Historická reference DEMUS je samostatná. Původní texty a identity se nepřevádějí.</p></TechnicalDemus>{kind === 'DEACCESSION' && originalIntegrationEnabled()&&<CurrentDeaccessionProposal itemId={itemId} editSession={editSession} readOnly={readOnly||proposalBlocked} drafts={drafts} onSave={onSave}/>}
            {kind === 'DEACCESSION' && <div className="rounded border border-gray-200 bg-gray-50 p-4 space-y-3">
                <h4 className="font-semibold">Vyřazení předmětu z evidence</h4>
                <p className="text-sm">Tato akce používá stávající lifecycle a zapíše auditní událost.{originalIntegrationEnabled()&&lifecycleState?` Provozní stav: ${lifecycleState.status??'neuveden'}.`:''}</p>
                {(['reason', 'deaccessionDate', 'documentNumber'] as const).map(key => <label key={key} className="block text-sm font-semibold">
                    {{ reason: 'Důvod', deaccessionDate: 'Datum vyřazení', documentNumber: 'Číslo dokumentu' }[key]}
                    <input type={key === 'deaccessionDate' ? 'date' : 'text'} value={deaccession[key]}
                        onChange={e => setDeaccession(old => ({ ...old, [key]: e.target.value }))}
                        className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 font-normal" />
                </label>)}
                <button type="button" className="rounded bg-[#00204a] px-4 py-2 text-sm font-semibold text-white"
                    disabled={!deaccession.reason.trim()||saving||originalIntegrationEnabled()&&lifecycleState?.status==='VYRAZENO'&&lifecycleState.active===false} onClick={async () => {
                        if (!window.confirm('Opravdu vyřadit předmět z evidence?')) return;
                        if(originalIntegrationEnabled()){
                            if(!canScopedWrite||editSession?.busy||saving)return;setSaving(true);if(editSession)editSession.busy=true;let committed=false;
                            try{const {api,signal}=originalSession();const tag=(editSession as any)?.scopedCurrent?.etag||editSession?.etag||scopedEtag;const saved=await api.deaccession(itemId,tag,{reason:deaccession.reason,deaccessionDate:deaccession.deaccessionDate||null,documentNumber:deaccession.documentNumber||null},signal);
                                committed=true;setScopedEtag(saved.etag);setLifecycleState(saved.value);if(saved.value.deaccession){const values={reason:saved.value.deaccession.reason,deaccessionDate:saved.value.deaccession.deaccessionDate,documentNumber:saved.value.deaccession.documentNumber??''};setDeaccession(values);if(drafts?.current[section])drafts.current[section]={...drafts.current[section],deaccession:values,dirty:false};}if(editSession){editSession.etag=saved.etag;if((editSession as any).scopedCurrent)(editSession as any).scopedCurrent.etag=saved.etag;}
                                await onSave?.();setMessage('Předmět byl vyřazen z evidence; záznam a historické údaje zůstávají zachované.');
                            }catch(e){setMessage((committed?'Vyřazení bylo potvrzeno; obnovení karty selhalo: ':'')+(e as Error).message);}finally{setSaving(false);if(editSession)editSession.busy=false;}return;
                        }
                        try { await deaccessionItem(itemId, { reason: deaccession.reason,
                            deaccessionDate: deaccession.deaccessionDate || undefined,
                            documentNumber: deaccession.documentNumber || undefined });
                            setMessage('Předmět byl vyřazen z evidence.'); }
                        catch (e) { setMessage((e as Error).message); }
                    }}>Vyřadit předmět</button>
            </div>}
            {(kind !== 'DEACCESSION' || record) && !(kind==='BIBLIOGRAPHY'&&registryRecords!==null&&(!record||registryRecords.includes(record.id))) && <div ref={editFormRef} className={`rounded border p-4 space-y-3 ${record ? 'border-blue-300 bg-blue-50/30' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-gray-900">
                        {record ? '✏️ Úprava záznamu' : kind === 'MATERIAL_TECHNIQUE' ? originalIntegrationEnabled()?'Přidat záznam materiálu a techniky — pouze nové přiřazení; existující jsou uvedena výše':'Přidat záznam materiálu a techniky' : 'Nový záznam'}
                    </h4>
                    {(record||kind==='MATERIAL_TECHNIQUE'&&originalIntegrationEnabled()&&!matTechNew) && <button type="button" disabled={matTechBrowse} className="text-xs text-blue-700 hover:underline font-medium" onClick={() => startRecord(null)}>
                        {kind==='MATERIAL_TECHNIQUE'&&originalIntegrationEnabled()?'Přidat další materiál / techniku':'Zrušit úpravu'}
                    </button>}
                </div>
                {recordDictionary[kind] && !originalIntegrationEnabled() && <TreeChoice type={recordDictionary[kind]!} label="Číselník" invalid={referenceError}
                    value={dictionaryId} onChange={(id,choice)=>{setDictionaryId(id);setClearDictionary(id==null&&!!record?.dictionaryId);setNativeCode(choice?.code??null);}}/>}
                {recordDictionary[kind]&&!originalIntegrationEnabled()&&<p>Výběr ID nemění původní citaci ani nativní kód. {clearDictionary?'Současná vazba bude výslovně zrušena.':''}</p>}
                {nativeCode!=null&&['BIBLIOGRAPHY','CLASSIFICATION','DOCUMENTATION'].includes(kind)&&<button type="button" onClick={()=>{
                    const key=kind==='BIBLIOGRAPHY'?'Ref_RF':kind==='CLASSIFICATION'?'SysKat_ZS':'TypDok_DK';setPayload(old=>({...old,[key]:nativeCode}));
                }}>Použít nativní kód vybrané položky: {nativeCode}</button>}
                {kind==='MATERIAL_TECHNIQUE'&&<div data-mattech-groups className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {originalIntegrationEnabled()?<MatTechGroups rows={detail.records} record={record} payload={payload} readOnly={readOnly||matTechBrowse} onSelect={row=>{if(record?.id!==row.id&&Object.keys(professionalDelta('MATERIAL_TECHNIQUE',payload,record)).length){setMessage('Nejprve uložte nebo zrušte změnu právě upravovaného přiřazení.');return;}startRecord(row);}} onPayload={update=>{if(!record)setMatTechNew(true);setPayload(update);}}/>:<>

                    <ThreeLevelDictionarySelect scoped={originalIntegrationEnabled()} type="MATERIAL" label="Materiál" historicalValue={String(materialColumn.payload.Material_MT ?? '')} readOnly={readOnly||matTechBrowse||!materialColumn.editable} value={materialColumn.editable?materialId:materialColumn.legacyId} scopedValue={typeof materialColumn.payload.materialAuthorityId==='string'?materialColumn.payload.materialAuthorityId:null} sourceValue={materialColumn.payload.materialHistoricalRef as import('../features/scoped/scopedApi').HistoricalVocabularyValue|null|undefined} onHistoricalChange={source=>setPayload(p=>materialColumn.editable?({...p,materialHistoricalRef:source,...(source?{materialAuthorityId:null}:{})}):p)} onScopedChange={id=>setPayload(p=>materialColumn.editable?({...p,materialAuthorityId:id,materialHistoricalRef:null}):p)} allowEmpty={!record?.materialDictionaryId} onChange={id=>setMaterialId(id)}/>
                    <ThreeLevelDictionarySelect scoped={originalIntegrationEnabled()} type="TECHNIQUE" label="Technika" historicalValue={String(techniqueColumn.payload.Technika_MT ?? '')} readOnly={readOnly||matTechBrowse||!techniqueColumn.editable} value={techniqueColumn.editable?techniqueId:techniqueColumn.legacyId} scopedValue={typeof techniqueColumn.payload.techniqueAuthorityId==='string'?techniqueColumn.payload.techniqueAuthorityId:null} sourceValue={techniqueColumn.payload.techniqueHistoricalRef as import('../features/scoped/scopedApi').HistoricalVocabularyValue|null|undefined} onHistoricalChange={source=>setPayload(p=>techniqueColumn.editable?({...p,techniqueHistoricalRef:source,...(source?{techniqueAuthorityId:null}:{})}):p)} onScopedChange={id=>setPayload(p=>techniqueColumn.editable?({...p,techniqueAuthorityId:id,techniqueHistoricalRef:null}):p)} allowEmpty={!record?.techniqueDictionaryId} onChange={id=>setTechniqueId(id)}/>
                    </>}
                    <p className="md:col-span-2 text-sm text-gray-600">{originalIntegrationEnabled()&&record&&<>Ukládá se pouze právě upravované přiřazení; ostatní pozice zůstávají nezměněné. </>}{originalIntegrationEnabled()?'Každé přiřazení materiálu nebo techniky má vlastní odborný záznam. Jeho jedna až tři úrovně tvoří jednu hierarchickou cestu. Další materiál přidáte jako nový záznam. Historická reference DEMUS je samostatná. Výběr nebo odebrání potvrďte tlačítkem Uložit záznam. Původní texty a identity se nepřevádějí.':'Materiál a technika se vybírají nezávisle a ukládají společně až tlačítkem Uložit záznam. Uložený text se při výběru nemění; při uložení nové vazby se použije kód vybrané položky. Původní údaje DEMUS zůstávají zachované.'}</p>
                </div>}
                {['DETERMINATION','ORIGIN','MANIPULATION'].includes(kind) && !originalIntegrationEnabled() && <div className="space-y-2 text-sm">
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
                    {label}{key === 'Export_DK' ? <input disabled={matTechBrowse} type="checkbox" className="ml-3"
                        checked={payload[key] === true} onChange={e => setPayload(old => ({ ...old, [key]: e.target.checked }))} />
                        : <input disabled={matTechBrowse||originalIntegrationEnabled()&&kind==="BIBLIOGRAPHY"&&key==="Ref_RF"} type={key.startsWith('Poradi_') ? 'number' : (['CKtlg_AK','CenaISO_SO','RokOd_VZ','RokDo_VZ'].includes(key) ? 'number' : 'text')}
                            min={key.startsWith('Poradi_') ? '0' : undefined}
                            className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 font-normal"
                            data-demus-field={key} aria-invalid={referenceError} value={String(payload[key] ?? '')} onChange={e => setPayload(old => ({ ...old,
                                [key]: (key.startsWith('Poradi_') || ['CKtlg_AK','CenaISO_SO','RokOd_VZ','RokDo_VZ'].includes(key)) ? (e.target.value !== '' ? Number(e.target.value) : null) : e.target.value }))} />}
                </label>)}</div>
                <div className="flex items-center gap-3 pt-2">
                    <button type="button" className="rounded bg-[#00204a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#003366]" disabled={saving||matTechBrowse||originalIntegrationEnabled()&&kind==="BIBLIOGRAPHY"&&!record} onClick={saveRecord}>
                        Uložit záznam
                    </button>
                    {record && <button type="button" className="text-sm text-gray-600 underline hover:text-gray-900" onClick={() => kind==='MATERIAL_TECHNIQUE'&&originalIntegrationEnabled()?selectRecord(record):startRecord(null)}>Zrušit úpravu</button>}
                </div>
            </div>}
        </div>}
        {['origin','determination','manipulation','bibliography'].includes(section)&&itemId&&originalIntegrationEnabled()&&<ProfessionalLinks itemId={itemId} section={section} editSession={editSession} readOnly={readOnly} onSave={onSave} onRecords={setRegistryRecords}/>}
        {section==='origin'&&itemId&&originalIntegrationEnabled()&&import.meta.env.VITE_CURRENT_AUTHORS_ENABLED==='true'&&<CurrentAuthors itemId={itemId} editSession={editSession} readOnly={readOnly} onSave={onSave} drafts={drafts}/>}
        {itemId&&rootHistoricalFields[section]&&<HistoricalTable itemId={itemId} table="Sbirky" etag={editSession?.etag} fields={rootHistoricalFields[section]!}/>}
        {section==='history'&&<>{itemId&&<HistoricalTable itemId={itemId} table="Historie" etag={editSession?.etag} fields={[["Kdy_HS","Kdy"],["Kde_HS","Kde"],["Kdo_HS","Kdo"],["Historka_HS","Historie DEMUS"],["RokChr_HS","Chronologický rok"]]}/>}</>}
        {uncertain && <button type="button" onClick={async () => {try {if(originalIntegrationEnabled()){const {api,signal}=originalSession();const fresh=await api.professionalRecords(itemId,signal);setDetail(old=>old?{...old,records:fresh.items}:old);}else setDetail(await getMuseumItem(itemId)); setMessage(uncertainCreateMessage + ' Serverový seznam byl načten.');} catch (e) {setMessage((e as Error).message);}}}>Obnovit serverový seznam</button>}
        {message && <p role="status" className="text-sm text-[#00204a]">{message}</p>}
    </fieldset>;
}
