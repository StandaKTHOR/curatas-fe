import {useSourceCaptions} from '../features/catalog/useSourceCaptions';
import {unifiedDictionariesEnabled} from '../features/scoped/scopedApi';
import {dictionaryTypeToSearch} from '../features/catalog/dictionaryKeyboard';
import HistoricalPersonDetails from '../features/catalog/HistoricalPersonDetails';
import CardDictionaryChoice, {dictionaryField, useDictionaryPage} from '../features/catalog/CardDictionaryChoice';
import SourceDimensionCorrections from '../features/catalog/SourceDimensionCorrections';
import DocumentationFiles from '../features/catalog/DocumentationFiles';
import './AdminItemForm.css';
import TechnicalDemus,{TechnicalDemusProvider} from '../features/catalog/TechnicalDemus';
import {dictionaryLabel,ambiguousDictionaryCaption} from '../features/catalog/dictionaryLabel';
import LocalityCardDialog from '../features/catalog/LocalityCardDialog';
import LocalityActions from '../features/catalog/LocalityActions';
import HistoricalMaterialAssertion from '../features/catalog/HistoricalMaterialAssertion';
import TopPanelOptions from '../components/TopPanelOptions';
import HistoricalLocalityDetails from '../features/catalog/HistoricalLocalityDetails';
import {useCurrentAuthorCaption} from '../features/catalog/useCurrentAuthorCaption';
import {dictionarySearchKey} from '../features/catalog/dictionarySearch';
import {HistoricalOptions,historicalPickerMessage} from '../features/catalog/historicalSelection';
import {installFieldHelp} from '../features/catalog/contextHelp';
import {copyExplicitBulk,explicitBulkNumbers,type BulkCopyResult} from '../features/catalog/originalBulk';
import {allCloneGroups,CloneGroupSelection,type CloneGroup} from '../features/catalog/cloneGroups';
import ScopedItemAudit from '../features/catalog/ScopedItemAudit';
import CurrentClassificationFlags from '../features/catalog/CurrentClassificationFlags';
import CuratorDocumentLinks from '../features/catalog/CuratorDocumentLinks';
import {useManagedAuthorities} from '../features/catalog/useManagedAuthorities';
import {originalPrintCardFields} from '../features/catalog/originalAdapter';
import {ScopedError} from '../features/scoped/scopedApi';
import {reconcileSectionSave,saveFieldErrors,saveFailureMessage,currentFormErrors} from '../lib/formSaveState';
import {confirmedMediaMutationTag} from '../features/catalog/mediaMutation';
import {useOriginalSourcePlus} from '../features/catalog/useOriginalSourcePlus';
import {historicalEnabled} from '../features/catalog/useHistoricalRows';
import {useHistoricalRows} from '../features/catalog/useHistoricalRows';
import {HistoricalRoot,HistoricalTable} from '../features/catalog/HistoricalRows';
import {originalDictionaryDisplay} from '../features/catalog/originalDictionaryDisplay';
import {useOriginalHistoricalData,historicalControl,demusText} from '../features/catalog/useOriginalHistoricalData';
import OwnedHistory from '../features/catalog/OwnedHistory';
import CurrentHistory from '../features/catalog/CurrentHistory';
import CloneOrigin from '../features/catalog/CloneOrigin';
import {originalItemHref} from '../features/catalog/originalAdapter';
import {originalCanClone} from '../features/catalog/originalClone';
import MaterialBindings from '../features/catalog/MaterialBindings';
import AuthorityAndRangeBindings from '../features/catalog/AuthorityAndRangeBindings';
import OriginalSourceBridgeIdentity from '../features/catalog/OriginalSourceBridge';
import CreationOrigin from '../features/catalog/CreationOrigin';
import {originalCanCreate,originalCreationFields,createOriginalItem,originalCreationOutcome,applyOriginalCreationBoundary,CreationValidationError} from '../features/catalog/originalCreate';
import {useOriginalMedia} from '../features/catalog/useOriginalMedia';
import {originalDetailReturn,originalReturnPath,originalCanEdit,originalEditHref,saveOriginalCurrent,applyOriginalEditBoundary,additionalFields,type OriginalEditDomain} from '../features/catalog/originalEdit';
import OriginalSourceBridge from '../features/catalog/OriginalSourceBridge';
import {originalIntegrationEnabled,originalSession} from '../features/catalog/originalAdapter';
import { uncertainWrite, uncertainCreateMessage } from '../lib/writeOutcome';
import PhotoPreview from '../components/PhotoPreview';
import ThreeLevelDictionarySelect from '../components/ThreeLevelDictionarySelect';
import EditorNavigationGuard from '../components/EditorNavigationGuard';
import DemusSourceIdentity from '../components/DemusSourceIdentity';
import {SourceAcquisitionView,VocabularyAssociations} from '../components/MuseumSourceEvidence';
import {reviewedCalendarDate} from '../lib/dating';
import AttachmentCaptionEditor from '../components/AttachmentCaptionEditor';
import NewInventoryNumber from '../components/NewInventoryNumber';
import React, { useState, useEffect, useRef, useMemo, useLayoutEffect, useContext } from 'react';
import { useParams, useNavigate, useLocation, UNSAFE_DataRouterContext } from 'react-router-dom';
import {
    getAdminItem,
    createItem,
    updateItem,
    getDictionaries,
    getNextAvailableNumbers,
    checkUniqueness,
    uploadItemImage,
    listItemImages,
    deleteItemImage,
    setPrimaryItemImage,
    ItemImageDto,
    listAttachments,
    listMuseumAcquisitions,
    uploadAttachment,
    deleteAttachment,
    downloadAttachmentFile,
    bulkCopyItem,
    getDictionaryTree,
    ApiError,
    API_BASE,
    resolveApiUrl
} from '../lib/api';
import { InventoryIdentityPanel } from '../components/InventoryIdentityPanel';
import { GovButton } from '@gov-design-system-ce/react';
import {
    FaTrash,
    FaPlus,
    FaMapMarkerAlt,
    FaExternalLinkAlt,
    FaPaperclip,
    FaUpload,
    FaFileAlt,
    FaFileDownload,
    FaLayerGroup
} from 'react-icons/fa';
import AddDictionaryModal from '../components/AddDictionaryModal';
import SelectiveCloneModal from '../components/SelectiveCloneModal';
import AdditionalAuthorsLink from '../features/catalog/AdditionalAuthorsLink';
import MuseumSection, { TreeChoice } from '../components/MuseumSection';
import type { ItemEditSession } from '../lib/editSession';
import YearDateInput from '../components/YearDateInput';
import AcquisitionSection from '../components/AcquisitionSection';
import SafeImage, { isBackendImage } from '../components/SafeImage';
import MuseumCardPrint from '../components/MuseumCardPrint';
import DemusLegacyDataView from '../components/DemusLegacyDataView';
import PermanentIdentificationHeader from '../features/catalog/OriginalPermanentIdentificationHeader';



const AUTHOR_ROLES = [
    'Autor',
    'Škola / dílna',
    'Okruh',
    'Následovník',
    'Kopista',
    'Falsifikátor',
    'Připsáno',
    'Rytec',
    'Nakladatel / vydavatel',
    'Jiná role'
];

const buildItemPayload = (currentForm: any, auditCommentOverride?: string) => {
    const currentAuditComment = auditCommentOverride !== undefined
        ? auditCommentOverride
        : (currentForm.auditComment?.trim() || '');

    let partiesPayload: any[] = [];
    if (Array.isArray(currentForm.parties) && currentForm.parties.length > 0) {
        partiesPayload = currentForm.parties
            .filter((p: any) => p.partyId || (p.partyName && p.partyName.trim()))
            .map((p: any, idx: number) => ({
                partyId: p.partyId || null,
                partyName: p.partyName?.trim() || null,
                role: p.role?.trim() || currentForm.authorRole || 'Autor',
                type: p.type || 'PERSON',
                sortOrder: p.sortOrder ?? (idx + 1)
            }));
    } else if (currentForm.author?.trim()) {
        partiesPayload = [{
            partyId: null,
            partyName: currentForm.author.trim(),
            role: currentForm.authorRole?.trim() || 'Autor',
            type: 'PERSON',
            sortOrder: 1
        }];
    }

    const hasFund = currentForm.fundDictionaryId !== null && currentForm.fundDictionaryId !== undefined && currentForm.fundDictionaryId !== '' && Number(currentForm.fundDictionaryId) > 0;

    return {
        title: currentForm.title || '',
        accessionNumber: currentForm.accessionNumber || '',
        inventoryNumber: currentForm.inventoryNumber || '',
        subCollection: currentForm.subCollection || '',
        fundDictionaryId: hasFund ? Number(currentForm.fundDictionaryId) : null,
        fundLegacyCode: currentForm.fundLegacyCode || null,
        clearFund: !hasFund,
        groupDictionaryId: currentForm.groupDictionaryId ?? null,
        groupLegacyCode: currentForm.groupLegacyCode ?? null,
        localityDictionaryId: currentForm.localityDictionaryId ?? null,
        localityLegacyCode: currentForm.localityLegacyCode ?? null,
        materialDictionaryId: currentForm.materialDictionaryId ?? null,
        techniqueDictionaryId: currentForm.techniqueDictionaryId ?? null,
        subjectDictionaryId: currentForm.subjectDictionaryId ?? null,
        subjectLegacyCode: currentForm.subjectLegacyCode ?? null,
        objectType: currentForm.objectType || '',
        catalogingStatus: currentForm.catalogingStatus || 'Zapsán',
        author: currentForm.author || '',
        description: currentForm.description || '',
        extendedDescription: currentForm.extendedDescription || '',
        material: currentForm.material || '',
        materialNote: currentForm.materialNote || '',
        technique: currentForm.technique || '',
        datingText: currentForm.datingText || '',
        datingFrom: reviewedCalendarDate(currentForm.datingFrom),
        datingTo: reviewedCalendarDate(currentForm.datingTo),
        countryOfOrigin: currentForm.countryOfOrigin || '',
        originPlace: currentForm.originPlace || '',
        findingLocality: currentForm.findingLocality || '',
        acquisitionMethod: currentForm.acquisitionMethod || '',
        acquisitionDate: currentForm.acquisitionDate || null,
        acquiredFrom: currentForm.acquiredFrom || '',
        locationBuilding: currentForm.locationBuilding || '',
        locationRoom: currentForm.locationRoom || '',
        permanentLocation: currentForm.permanentLocation || '',
        objectCondition: currentForm.objectCondition || '',
        spravce: currentForm.spravce || '',
        oddeleni: currentForm.oddeleni || '',
        insuranceValue: currentForm.insuranceValue !== '' && currentForm.insuranceValue != null ? parseFloat(currentForm.insuranceValue.toString().replace(/\s/g, '')) : null,
        weight: currentForm.weight || '',
        quantity: currentForm.quantity ?? null,
        published: currentForm.published ?? false,
        auditComment: currentAuditComment,
        latitude: (currentForm.latitude !== '' && currentForm.latitude !== null && !isNaN(parseFloat(currentForm.latitude))) ? parseFloat(currentForm.latitude) : null,
        longitude: (currentForm.longitude !== '' && currentForm.longitude !== null && !isNaN(parseFloat(currentForm.longitude))) ? parseFloat(currentForm.longitude) : null,
        coordinateSystem: currentForm.coordinateSystem || 'WGS-84',
        markant: currentForm.markant || '',
        signature: currentForm.signature || '',
        dimensions: (currentForm.dimensions || [])
            .filter((d: any) => d.id || (d.value !== '' && d.value !== null && !isNaN(Number(d.value))))
            .map((d: any) => ({
                id: d.id || null,
                type: d.dimensionType || 'Rozměr',
                value: d.value === '' || d.value === null ? null : Number(d.value),
                unit: d.unit ?? '',
                note: d.note || null,
                sortOrder: d.sortOrder ?? null
            })),
        parties: partiesPayload,
        // Source lineage is read-only and must never enter a write payload.
    };
};

function PickerInformation({compact,inline=false,children,exclusive=true,disabled=false}:{compact:boolean;inline?:boolean;exclusive?:boolean;disabled?:boolean;children:import('react').ReactNode}){
    return inline?<details className="curator-inline-options"><summary>Hledání a možnosti</summary>{children}</details>:compact?<TopPanelOptions exclusive={exclusive} disabled={disabled}>{children}</TopPanelOptions>:<>{children}</>;
}

export default function AdminItemForm({ readOnly = false }: { readOnly?: boolean }) {
    useEffect(installFieldHelp,[]);
    const { id } = useParams();
    // Identity owns every form, section draft, snapshot and version token.
    const location=useLocation();
    const mode=readOnly||location.pathname.includes('/admin/items/view/')?'view':'edit';
    return <TechnicalDemusProvider key={`${id??'new'}:${mode}:${new URLSearchParams(location.search).get('catalog')??''}`}><AdminItemEditor readOnly={readOnly}/></TechnicalDemusProvider>;
}

function AdminItemEditor({ readOnly = false }: { readOnly?: boolean }) {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const dataRouter = useContext(UNSAFE_DataRouterContext);
    const location = useLocation();
    const pageIds: number[] = Array.isArray((location.state as any)?.catalogIds)?(location.state as any).catalogIds.filter((n:unknown)=>Number.isSafeInteger(n)&&Number(n)>0).slice(0,50):[];
    const pagePosition=pageIds.indexOf(Number(id));
    const openNeighbour=(offset:number)=>{
        const next=pageIds[pagePosition+offset];if(!next)return;
        navigate(`/items/${next}?catalog=${originalSession().catalog.id}`,{state:location.state});
    };
    const isViewMode = readOnly || location.pathname.includes('/admin/items/view/');
    const persistedSnapshotRef = useRef<any>(null);
    const editSessionRef = useRef<ItemEditSession>();
    const sectionDrafts = useRef<Record<string, any>>({});
    const [comparison, setComparison] = useState<any>(null);
    const [cloneModalOpen, setCloneModalOpen] = useState(false);
    const [showPrintCard, setShowPrintCard] = useState(false);
    const [initialNumbers, setInitialNumbers] = useState({ inventory: '', accession: '' });
    const [isDraggingAtt, setIsDraggingAtt] = useState(false);

    const [activeTab, setActiveTab] = useState(new URLSearchParams(location.search).get('tab')==='deaccession'?'museum':'identity');
    const [museumSubTab, setMuseumSubTab] = useState<
        'documentation' | 'classification' | 'determination' | 'deaccession' | 'manipulation' | 'action' | 'iso' | 'demus' | 'attachments' | 'audit' | 'origin' | 'reference' | 'plus' | 'vocabularies'
    >(new URLSearchParams(location.search).get('tab')==='deaccession'?'deaccession':'documentation');

    const scopedMedia=useOriginalMedia(Number(id),activeTab==='photos'||activeTab==='museum'&&['attachments','documentation'].includes(museumSubTab));
    const sourcePlus=useOriginalSourcePlus(Number(id),activeTab==='museum'&&museumSubTab==='plus');
    const [loading, setLoading] = useState(false);
    const [scopedNeedsReload,setScopedNeedsReload]=useState(false);
    const [showScopedAuthorities,setShowScopedAuthorities]=useState(false);
    const scopedDomain:OriginalEditDomain=new URLSearchParams(location.search).get('edit')==='inventory'?'inventory':'professional';
    useEffect(()=>{if(originalIntegrationEnabled()&&!isViewMode&&scopedDomain==='inventory')setShowScopedAuthorities(true);},[isViewMode,scopedDomain]);
    useLayoutEffect(()=>{if(originalIntegrationEnabled()){document.querySelectorAll<HTMLElement>('#item-editor-body, #item-editor > aside, #item-editor > [data-item-editors], .curator-card-main').forEach(root=>{if(!id)applyOriginalCreationBoundary(root,originalCanCreate()&&!loading&&!createUncertain&&!bulkOutcome);else applyOriginalEditBoundary(root,scopedDomain,!isViewMode&&originalCanEdit(scopedDomain)&&Boolean((editSessionRef.current as any)?.scopedCurrent),loading||scopedNeedsReload);});}});
    const [uploading, setUploading] = useState(false);
    const [conflictError, setConflictError] = useState<string | null>(null);
    const [globalError, setGlobalError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [createUncertain, setCreateUncertain] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const focusInvalidField=(field:string)=>{
        if(formRef.current._completion&&(field==='datingFrom'||field==='datingTo')){setActiveTab('museum');setMuseumSubTab('origin');}
        else setActiveTab(field==='insuranceValue'?'storage':field==='weight'?'dimensions':'identity');
        window.setTimeout(()=>{const control=field==='inventoryNumber'?(document.getElementById('inventoryNumber')??document.querySelector<HTMLInputElement>('input[aria-label="Inventární číslo: Hlavní číslo"]')):document.getElementById(field);control?.focus();control?.scrollIntoView?.({block:'center'});},0);
    };
    useEffect(()=>{for(const key of ['inventoryNumber','accessionNumber','title','quantity','datingFrom','datingTo','insuranceValue','latitude','longitude']){const input=document.getElementById(key);if(input)input.setAttribute('aria-invalid',String(!!fieldErrors[key]));}},[fieldErrors,activeTab]);
    const clearBasicError=(field:string)=>{
        setGlobalError(current=>current===fieldErrors[field]?null:current);
        setFieldErrors(current=>{if(!current[field])return current;const next={...current};delete next[field];return next;});
    };

    const [unauthorizedError, setUnauthorizedError] = useState(false);
    const [forbiddenError, setForbiddenError] = useState(false);
    const [auditSaveMessage, setAuditSaveMessage] = useState<string | null>(null);
    const [auditSaving, setAuditSaving] = useState(false);

    const handleSaveAuditRecord = async (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (mainSaveRef.current || auditSaving || editSessionRef.current?.busy) return;
        if (!id || !form.auditComment?.trim()) {
            alert('Prosím vyplňte text auditního zdůvodnění.');
            return;
        }
        setAuditSaving(true);
        setAuditSaveMessage(null);
        try {
            if(originalIntegrationEnabled()&&import.meta.env.VITE_CURRENT_FLAGS_ENABLED==='true'){
                const originalComment=form.auditComment;const comment=originalComment.trim();const {api,signal}=originalSession();const session=editSessionRef.current as any;
                if(isViewMode||!originalCanEdit('professional')||!session?.scopedCurrent)throw new Error('Chybí oprávnění nebo původní verze pro auditní poznámku.');
                session.busy=true;try{
                const tag=await api.saveCuratorRecord(Number(id),'audit-note',session.etag,{note:comment},signal);const fresh=await api.curatorRecord(Number(id),'audit-note',signal);
                if(fresh.etag!==tag||fresh.value.note!==comment)throw new Error('Zápis auditu proběhl, ale opětovné načtení nepotvrdilo jeho verzi. Obnovte audit před opakováním.');
                if(signal.aborted||editSessionRef.current!==session)return;session.etag=tag;session.scopedCurrent.etag=tag;
                setForm((prev:any)=>({...prev,auditComment:prev.auditComment===originalComment?'':prev.auditComment}));setAuditSaveMessage('Auditní záznam byl úspěšně uložen.');return;}finally{session.busy=false;}
            }
            const comment = form.auditComment.trim();
            const payload = {auditComment: comment};
            await updateItem(Number(id), payload, editSessionRef.current);
            setAuditSaveMessage('Auditní záznam byl úspěšně uložen.');
            setForm((prev: any) => ({ ...prev, auditComment: prev.auditComment === comment ? '' : prev.auditComment }));
            const fresh = await getAdminItem(id);
            if (fresh._editSession?.etag !== editSessionRef.current?.etag) throw new ApiError(412, 'Záznam se změnil po uložení auditu. Vaše zadání zůstává zachováno.');
            setForm((prev: any) => ({...prev, events: fresh.events || [],
                modifiedByUser: fresh.modifiedByUser, lastModifiedAt: fresh.lastModifiedAt}));
        } catch (err: any) {
            alert('Chyba při ukládání auditního záznamu: ' + err.message);
        } finally {
            setAuditSaving(false);
        }
    };

    // Fotografie
    const [itemImages, setItemImages] = useState<ItemImageDto[]>([]);

    const synchronizeMediaVersion = async (fresh: any) => {
        const baseline = persistedSnapshotRef.current;
        if (!baseline || !fresh._editSession) return;
        const before = buildItemPayload(baseline), after = buildItemPayload(fresh);
        const museumUnchanged = JSON.stringify(baseline._editSession?.museumSnapshot) === JSON.stringify(fresh._editSession.museumSnapshot);
        const acquisitionBaseline = editSessionRef.current?.acquisitionSnapshot;
        const acquisitionsUnchanged = acquisitionBaseline === undefined || JSON.stringify(acquisitionBaseline) ===
            JSON.stringify(await listMuseumAcquisitions(Number(id), fresh._editSession));
        if (museumUnchanged && acquisitionsUnchanged && Object.keys(before).every(key => JSON.stringify((before as any)[key]) === JSON.stringify((after as any)[key]))) {
            if (editSessionRef.current) {
                editSessionRef.current.etag = fresh._editSession.etag;
                editSessionRef.current.museumSnapshot = fresh._editSession.museumSnapshot;
            }
            persistedSnapshotRef.current = fresh;
        } else {
            setConflictError('Během práce s médii se změnily také údaje předmětu. Porovnejte je před uložením; rozpracované zadání zůstává zachováno.');
        }
    };

    const loadImages = async (itemId: number | string) => {
        if (!itemId) return;
        try {
            const imgs = await listItemImages(Number(itemId));
            setItemImages(imgs || []);
        } catch (e) {
            console.error('Chyba při načítání fotografií:', e);
        }
    };

    const handleDeletePhoto = async (imageId: number) => {
        if (!id) return;
        if (window.confirm('Opravdu chcete tuto fotografii odstranit?')) {
            try {
                await deleteItemImage(Number(id), imageId);
                await loadImages(id);
                const fresh = await getAdminItem(id);
                await synchronizeMediaVersion(fresh);
            if (fresh) {
                    setForm((prev: any) => ({
                        ...prev,
                        imageUrls: Array.isArray(fresh.imageUrls) ? fresh.imageUrls : [],
                        primaryImageUrl: fresh.primaryImageUrl || null
                    }));
                }
                setSuccessMessage('Fotografie byla úspěšně odstraněna.');
            } catch (err: any) {
                alert('Smazání fotografie selhalo: ' + err.message);
            }
        }
    };

    const handleSetPrimaryPhoto = async (imageId: number) => {
        if (!id) return;
        try {
            await setPrimaryItemImage(Number(id), imageId);
            await loadImages(id);
            const fresh = await getAdminItem(id);
            await synchronizeMediaVersion(fresh);
            if (fresh) {
                setForm((prev: any) => ({
                    ...prev,
                    primaryImageUrl: fresh.primaryImageUrl || null,
                    imageUrls: Array.isArray(fresh.imageUrls) ? fresh.imageUrls : prev.imageUrls
                }));
            }
            setSuccessMessage('Hlavní fotografie byla nastavena.');
        } catch (err: any) {
            alert('Nastavení hlavní fotografie selhalo: ' + err.message);
        }
    };

    const handleDownloadPhoto = async (url: string, caption?: string) => {
        const resolvedUrl = resolveApiUrl(url);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(resolvedUrl, {headers: token && isBackendImage(resolvedUrl) ? {Authorization: `Bearer ${token}`} : {}, redirect: 'error'});
            if (!res.ok) throw new Error('Fetch failed');
            const blob = await res.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            const filename = (caption && caption.trim())
                ? `${caption.trim().replace(/[^a-zA-Z0-9_\u00C0-\u024F-]/g, '_')}.jpg`
                : (url.split('/').pop() || 'fotografie.jpg');
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(blobUrl);
        } catch (e) { setGlobalError('Stažení fotografie selhalo: ' + (e as Error).message); }
    };

    // Přílohy
    const [attachments, setAttachments] = useState<any[]>([]);
    const galleryImages:any[]=originalIntegrationEnabled()?scopedMedia.images:itemImages;
    const galleryAttachments:any[]=originalIntegrationEnabled()?scopedMedia.attachments.map(entry=>({...entry,originalFilename:entry.name,fileSize:entry.byteSize,entry})):attachments;
    const mediaStatus=originalIntegrationEnabled()?<>{scopedMedia.busy&&<p role="status">Načítání médií…</p>}{scopedMedia.error&&<p role="alert">{scopedMedia.error}</p>}{scopedMedia.next&&<button data-scoped-read="true" type="button" disabled={scopedMedia.busy} onClick={()=>void scopedMedia.loadMore()}>Další média</button>}</>:null;
    const [attFile, setAttFile] = useState<File | null>(null);
    const [attCaption, setAttCaption] = useState('');
    const [attUploading, setAttUploading] = useState(false);

    // Validace čísel
    const [validity, setValidity] = useState({ accession: true, inventory: true });
    const [suggestions, setSuggestions] = useState({ accession: '', inventory: '' });

    // Modál pro číselníky
    const [dictModal, setDictModal] = useState<{
        isOpen: boolean;
        type: string;
        title: string;
        targetField: string;
        initialLabel?:string;
        scopeSignal?:AbortSignal;
        itemKey?:string;
    }>({
        isOpen: false,
        type: '',
        title: '',
        targetField: ''
    });

    const openDictModal = (type: string, title: string, targetField: string, initialLabel?:string) => {
        setDictModal({ isOpen: true, type, title, targetField, initialLabel, scopeSignal:originalIntegrationEnabled()?originalSession().signal:undefined,itemKey:id??'new' });
    };

    const handleDictCreated = (newItem: { id?: number; code: string; label: string; type: string }) => {
        const fieldMap: Record<string, string> = {
            OBJECT_TYPE: 'objectTypes',
            MATERIAL: 'materials',
            TECHNIQUE: 'techniques',
            SPRAVCE: 'spravci',
            COUNTRY: 'countries',
            AUTHOR: 'authors',
            FUND: 'funds'
        };
        const dictKey = fieldMap[newItem.type];
        if (dictKey) {
            setDicts((prev: any) => ({
                ...prev,
                [dictKey]: Array.from(new Set([...(prev[dictKey] || []), newItem.label])).sort()
            }));
        }
        if (newItem.type === 'FUND') {
            if (Number.isSafeInteger(newItem.id) && newItem.id! > 0) {
                setFundOptions(prev => [...prev, { id: newItem.id!, label: newItem.label, code: newItem.code || null }]);
                setForm((prev: any) => ({ ...prev, fundDictionaryId: newItem.id }));
            }
        } else if (dictModal.targetField) {
            setForm((prev: any) => ({
                ...prev,
                [dictModal.targetField]: newItem.label
            }));
        }
        if (dictModal.targetField === 'countryOfOrigin') {
            setShowCountries(false);
            setCountrySearch('');
        }
        setDictModal({ isOpen: false, type: '', title: '', targetField: '' });
    };

    const loadAttachments = async () => {
        if (id) {
            try {
                const list = await listAttachments(Number(id));
                setAttachments(list);
            } catch (e) {
                setGlobalError('Nelze načíst přílohy: ' + (e as Error).message);
            }
        }
    };

    const handleUploadAttachment = async () => {
        if (!id || !attFile) return;
        setAttUploading(true);
        try {
            if(originalIntegrationEnabled()){
                await mutateScopedMedia((api,tag,signal)=>api.uploadMedia(Number(id),tag,attFile,'ATTACHMENT',attCaption,signal));setAttFile(null);setAttCaption('');const field=document.getElementById('attachmentFile') as HTMLInputElement|null;if(field)field.value='';setSuccessMessage('Soukromá příloha byla uložena; seznam se znovu načítá.');return;
            }
            await uploadAttachment(Number(id), attFile, attCaption);
            setAttFile(null);
            setAttCaption('');
            const fileInput = document.getElementById('attachmentFile') as HTMLInputElement;
            if (fileInput) fileInput.value = '';
            await loadAttachments();
            await synchronizeMediaVersion(await getAdminItem(id));
        } catch (e: any) {
            alert('Nahrání přílohy selhalo: ' + e.message);
        } finally {
            setAttUploading(false);
        }
    };

    const handleDeleteAttachment = async (attId: number|string) => {
        if (originalIntegrationEnabled()) {
            const owner=editSessionRef.current;
            if(!id||!scopedCanWriteMedia()||originalSession().catalog.mediaArchiveEnabled!==true||!scopedMedia.attachments.some(entry=>entry.id===String(attId))){setGlobalError('Archivace této současné přílohy není dostupná.');return;}
            if(!window.confirm('Odebrat tuto současnou přílohu ze seznamu? Binární data zůstanou archivovaná a změna bude auditovaná.'))return;
            try{await mutateScopedMedia((api,tag,signal)=>api.archiveAttachment(Number(id),String(attId),tag,signal));if(editSessionRef.current===owner)setSuccessMessage('Příloha byla odebrána ze seznamu; binární data zůstávají archivovaná.');}catch(error){if(editSessionRef.current===owner)setGlobalError((error as Error).message);}return;
        }
        if (!id) return;
        if (window.confirm('Opravdu chcete tuto přílohu smazat?')) {
            try {
                await deleteAttachment(Number(id), Number(attId));
                await loadAttachments();
                await synchronizeMediaVersion(await getAdminItem(id));
            } catch (e: any) {
                alert('Smazání přílohy selhalo: ' + e.message);
            }
        }
    };

    const addDimensionRow = () => {
        setForm((prev: any) => ({
            ...prev,
            dimensions: [
                ...(prev.dimensions || []),
                { dimensionType: 'Výška', value: '', unit: originalIntegrationEnabled()?'':'cm', note: '', sortOrder: (prev.dimensions?.length || 0) + 1 }
            ]
        }));
    };

    const removeDimensionRow = (idx: number) => {
        setForm((prev: any) => {
            const updated = [...(prev.dimensions || [])];
            updated.splice(idx, 1);
            return { ...prev, dimensions: updated };
        });
    };

    const updateDimensionRow = (idx: number, field: string, val: any) => {
        setForm((prev: any) => {
            const updated = [...(prev.dimensions || [])];
            updated[idx] = { ...updated[idx], [field]: val };
            return { ...prev, dimensions: updated };
        });
    };

    // Autocomplete státy a autoři
    const [showCountries, setShowCountries] = useState(false);
    const [countrySearch, setCountrySearch] = useState('');
    const countryDropdownRef = useRef<HTMLDivElement>(null);

    const [showAuthors, setShowAuthors] = useState(false);
    const [authorSearch, setAuthorSearch] = useState('');
    const authorDropdownRef = useRef<HTMLDivElement>(null);

    // Číselníky z API
    const [dicts, setDicts] = useState<any>({
        objectTypes: [],
        materials: [],
        techniques: [],
        spravci: [],
        countries: [],
        authors: [],
        funds: []
    });

    // Hromadné zakládání
    const [bulkMode, setBulkMode] = useState(false);
    const [bulkNumbers,setBulkNumbers]=useState('');
    const [bulkCopyGroups,setBulkCopyGroups]=useState<CloneGroup[]>([...allCloneGroups]);
    const [bulkOutcome,setBulkOutcome]=useState<{baseId:number;rows:BulkCopyResult[]}|null>(null);
    const [bulkParams, setBulkParams] = useState({
        count: 10,
        titleSuffix: ' _',
        invNumSuffix: '/_'
    });

    // Hlavní stav formuláře
    const [form, setForm] = useState<any>({
        title: '',
        accessionNumber: '',
        inventoryNumber: '',
        subCollection: '',
        fundDictionaryId: null,
        fundLegacyCode: null,
        objectType: '',
        catalogingStatus: 'Zapsán',
        author: '',
        authorRole: 'Autor',
        parties: [],
        description: '',
        extendedDescription: '',
        material: '',
        materialNote: '',
        technique: '',
        datingText: '',
        datingFrom: '',
        datingTo: '',
        countryOfOrigin: '',
        originPlace: '',
        findingLocality: '',
        acquisitionMethod: '',
        acquisitionDate: '',
        acquiredFrom: '',
        locationBuilding: '',
        locationRoom: '',
        permanentLocation: '',
        objectCondition: '',
        spravce: '',
        oddeleni: '',
        insuranceValue: '',
        weight: '',
        quantity: null,
        dimensions: [],
        latitude: '',
        longitude: '',
        coordinateSystem: 'WGS-84',
        published: false,
        auditComment: '',
        imageUrls: [],
        markant: '',
        signature: '',
        legacyData: {}
    });

    const [fundOptions, setFundOptions] = useState<{ id: number; label: string; code: string | null }[]>([]);

    const fundSelectOptions = useMemo(() => {
        if (fundOptions && fundOptions.length > 0) {
            return fundOptions.filter(f => Number.isSafeInteger(f.id) && f.id > 0).map(f => ({
                id: String(f.id),
                label: f.code ? `[${f.code}] ${f.label}` : f.label,
                rawLabel: f.label
            }));
        }
        return [];
    }, [fundOptions]);

    const getFormSnapshot = (f: any) => {
        if (!f) return '';
        // Compare editable input, including invalid/unfinished values, without running save validation.
        // Scoped current fields use scalar control names, not legacy aggregate payload keys
        // such as authors/materials. The original guard must see those actual edits too.
        const keys=originalIntegrationEnabled()
            ? (!id?['title','inventoryNumber','accessionNumber','objectType','description','author','datingText','originPlace','material','technique','materialNote','quantity','otherNumber']:['title','inventoryNumber','objectType','description','author','datingText','originPlace','material','technique','materialNote','quantity','otherNumber']).concat('_historicalAuthorities','locationBuilding','locationRoom','permanentLocation','dimensions',...additionalFields,'custodianCode','datingKey','recordedByKey','recordedByEdited','cardNote','originNote','determinationDate','yearFrom','yearTo',...(!id?['_managedAuthorities','_inventoryParts']:[]))
            : Object.keys(buildItemPayload({})).filter(key => key !== 'auditComment' && key !== 'clearFund').concat('authorRole');
        const clone = Object.fromEntries(keys.sort().map(key => [key, f[key] ?? '']));
        return JSON.stringify(clone, (_key, value) => value && typeof value === 'object' && !Array.isArray(value)
            ? Object.fromEntries(Object.keys(value).sort().map(key => [key,value[key]])) : value);
    };

    const initialFormSnapshotRef = useRef<string>('');
    const initialFormValuesRef = useRef<any>({});
    const formRef = useRef(form);
    formRef.current = form;
    const mainSaveRef = useRef(false);
    const creationKeyRef=useRef<string|null>(null);
    // Omit untouched values: display defaults must never become historical museum evidence.
    const preserveUnchangedEvidence = (payload: any) => {
        if (!id || !initialFormSnapshotRef.current) return;
        const previous = buildItemPayload(initialFormValuesRef.current);
        for (const field of Object.keys(previous)) {
            if (JSON.stringify(previous[field as keyof typeof previous]) === JSON.stringify(payload[field])) {
                delete payload[field];
            }
        }
    };

    const hasUnsavedChanges = (...exceptDrafts:string[]) => !isViewMode && (
        (!!initialFormSnapshotRef.current && getFormSnapshot(formRef.current) !== initialFormSnapshotRef.current)
        || !!formRef.current.auditComment?.trim()
        || Object.entries(sectionDrafts.current).some(([key,draft]: [string,any]) => !exceptDrafts.includes(key)&&draft.dirty));

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges()) { e.preventDefault(); e.returnValue = ''; }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    });

    useEffect(()=>{
        if(!originalIntegrationEnabled())return;
        const check=(event:Event)=>{if(mainSaveRef.current||auditSaving||editSessionRef.current?.busy){event.preventDefault();return;}if(hasUnsavedChanges()&&!window.confirm('Máte neuložené změny. Opravdu chcete změnit katalog a opustit původní kartu?'))event.preventDefault();};
        window.addEventListener('curatas:catalog-discard',check);return()=>window.removeEventListener('curatas:catalog-discard',check);
    });
    const handleBackToList = () => {
        if (mainSaveRef.current || auditSaving || editSessionRef.current?.busy) {
            setGlobalError('Probíhá ukládání. Vyčkejte na jeho dokončení.'); return;
        }
        if (!dataRouter && hasUnsavedChanges() && !window.confirm('Máte neuložené změny. Opravdu chcete odejít bez uložení?')) return;
        if(originalIntegrationEnabled()&&id&&!isViewMode){navigate(originalDetailReturn(Number(id),(location.state as any)?.detailReturn),{replace:true,state:location.state});return;}
        const returnPath=originalReturnPath((location.state as any)?.returnPath,location.pathname);
        const returnSearch = (location.state as any)?.fromSearch ?? sessionStorage.getItem(returnPath==='/'?'catalogSearch':'adminItemsSearch') ?? '';
        navigate(`${returnPath}${returnSearch}`);
    };

    const managed=useManagedAuthorities(id?Number(id):undefined,editSessionRef.current?.etag,isViewMode||loading||scopedNeedsReload||mainSaveRef.current||!id&&!originalCanCreate(),etag=>{const session=editSessionRef.current as any;if(session?.scopedCurrent){session.etag=etag;session.scopedCurrent.etag=etag;}return handleSectionSave();},!id?{values:form._managedAuthorities??{},onChange:values=>setForm((previous:any)=>({...previous,_managedAuthorities:values}))}:undefined);
    const selectedSourceCaptions=useSourceCaptions(Object.entries(form._historicalAuthorities??{}).map(([type,value])=>({type:type.replace(/_[2-8]$/,''),key:'s:'+(value as import('../features/scoped/scopedApi').HistoricalVocabularyValue).recordId})));
    const managedSelect=(type:import('../features/scoped/scopedApi').ManagedDictionaryType,controlId:string,fallback='— bez přiřazení —',compact=false,tools?:import('react').ReactNode)=>{const search=<input data-dictionary-search={type} aria-label={`Hledat autoritu ${type}`} placeholder="Hledat podle názvu nebo kódu…" title="Vyhledejte a výslovně vyberte položku. Napsaný text sám není přiřazení." disabled={!managed.ready||loading||managed.busy} maxLength={100} value={managed.query(type)} onChange={e=>managed.search(type,e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();e.stopPropagation();}}}/>;return <div data-scoped-reference-editor>
        {!compact&&!!id&&search}

        <select onKeyDown={event=>dictionaryTypeToSearch(event,type,value=>managed.search(type,value))} title="Pište pro vyhledání podle názvu nebo kódu; položku vyberte výslovně." id={controlId} aria-label={`Autorita ${type}`} className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:border-[#00204a]" disabled={isViewMode||loading||scopedNeedsReload||managed.busy||!managed.ready||!originalCanEdit('professional')||!id&&!originalCanCreate()} value={form._historicalAuthorities?.[type]?'demus:'+form._historicalAuthorities[type].recordId:managed.value(type)} onChange={e=>{const source=(managed.historicalChoices?.(type)??[]).find(v=>'demus:'+v.recordId===e.target.value);if(source){if(!originalSession().catalog.historicalAssignmentsEnabled){alert('Výběr vyžaduje schválený kontrakt přiřazení; nic nebylo uloženo.');return;}setForm((p:any)=>({...p,_historicalAuthorities:{...(p._historicalAuthorities??{}),[type]:source}}));return;}if(!e.target.value&&form._historicalAuthorities?.[type]){setForm((p:any)=>{const next={...p._historicalAuthorities};delete next[type];return {...p,_historicalAuthorities:next};});return;}void managed.select(type,e.target.value).then(()=>setForm((p:any)=>{if(!p._historicalAuthorities?.[type])return p;const next={...p._historicalAuthorities};delete next[type];return {...p,_historicalAuthorities:next};})).catch(()=>{});}}><option value="" disabled={!!managed.value(type)&&!form._historicalAuthorities?.[type]}>{form._historicalAuthorities?.[type]?'— zrušit přiřazení —':originalDictionaryDisplay(type,rootFields)??fallback}</option>{managed.value(type)&&!managed.choices(type).some(v=>v.id===managed.value(type))&&<option value={managed.value(type)}>{managed.label(type)}</option>}{unifiedDictionariesEnabled()&&form._historicalAuthorities?.[type]&&!managed.historicalChoices(type).some(v=>v.recordId===form._historicalAuthorities[type].recordId)&&<HistoricalOptions items={[form._historicalAuthorities[type]]} captions={{[form._historicalAuthorities[type].recordId]:selectedSourceCaptions[type+':'+form._historicalAuthorities[type].recordId]??form._historicalAuthorities[type]}}/>}{unifiedDictionariesEnabled()?managed.entries(type).map(v=><option key={v.key} value={v.binding?'demus:'+v.binding.recordId:v.key.slice(2)} disabled={ambiguousDictionaryCaption(v,managed.entries(type))||!!v.binding&&['CUSTODIAN','CLASSIFICATION'].includes(type)}>{dictionaryLabel(v)}{v.binding&&['CUSTODIAN','CLASSIFICATION'].includes(type)?' — přiřazení není povoleno':''}{ambiguousDictionaryCaption(v,managed.entries(type))?' — nutné ověřit rozlišení':''}</option>):<>{managed.choices(type).map(v=><option key={v.id} value={v.id} disabled={ambiguousDictionaryCaption(v,managed.choices(type))}>{dictionaryLabel(v)}{ambiguousDictionaryCaption(v,managed.choices(type))?' — nelze odborně rozlišit; výběr vyžaduje ověření':''}</option>)}<HistoricalOptions items={[...(form._historicalAuthorities?.[type]?[form._historicalAuthorities[type]]:[]),...(managed.historicalChoices?.(type)??[]).filter(v=>v.recordId!==form._historicalAuthorities?.[type]?.recordId)]}/></>}</select>
        {managed.searching(type)&&<p role="status">Hledání v číselníku…</p>}{(managed.fieldError(type)||managed.error)&&<p role="alert">{managed.fieldError(type)||managed.error}</p>}<PickerInformation compact={compact} inline={!id&&!compact} exclusive={type!=='AUTHOR_ROLE'} disabled={loading||isViewMode||scopedNeedsReload||!originalCanEdit('professional')||!id&&!originalCanCreate()}>{(compact||!id)&&search}{tools}{(compact||!id)&&(managed.value(type)||form._historicalAuthorities?.[type])&&<a href={"/admin/dictionaries?catalog="+originalSession().catalog.id+"&type="+type+"&value="+encodeURIComponent(form._historicalAuthorities?.[type]?'s:'+form._historicalAuthorities[type].recordId:managed.value(type))+"&returnTo="+encodeURIComponent(location.pathname+location.search)} onClick={event=>{if(hasUnsavedChanges()&&!window.confirm("Opustit neuložené změny a otevřít odborný detail?"))event.preventDefault();}}>Otevřít odborný detail vybrané položky</a>}{type==='AUTHOR'&&id&&<HistoricalPersonDetails itemId={Number(id)} etag={editSessionRef.current?.etag}/>}{managed.ready&&<p>Načteno položek: {managed.choices(type).length+managed.historicalChoices(type).length}{managed.hasNext(type)||managed.historicalNext(type)?' — seznam pokračuje':''}.</p>}{!isViewMode&&(!id||import.meta.env.VITE_QA_NO_DELETE!=="true")&&managed.value(type)&&<button type="button" disabled={managed.busy||!managed.ready||scopedNeedsReload||!originalCanEdit("professional")} onClick={()=>void managed.clear(type).catch(()=>{})}>Zrušit vazbu {type}</button>}
        {managed.ready&&!managed.busy&&!managed.searching(type)&&!managed.error&&!managed.fieldError(type)&&<p>{!managed.choices(type).length&&!managed.value(type)?'':''}{historicalPickerMessage(type,managed.historicalState(type),managed.historicalChoices(type).length,managed.query(type))}</p>}
        {managed.historicalNext(type)&&<button type="button" disabled={managed.searching(type)} onClick={()=>managed.moreHistorical(type)}>Další položky {type}</button>}
        {managed.canOfferCreate(type)&&<button type="button" disabled={!managed.canCreate(type)} onClick={()=>openDictModal(type,'Nová současná autorita',controlId,managed.query(type).trim())}>Založit novou hodnotu: {managed.query(type).trim()}</button>}
        {managed.hasPrevious(type)&&<button type="button" onClick={()=>managed.previous(type)}>Předchozí autority {type}</button>}{managed.hasNext(type)&&<button type="button" onClick={()=>managed.next(type)}>Další autority {type}</button>}
        </PickerInformation>
    </div>;};
    const managedField=(type:import('../features/scoped/scopedApi').ManagedDictionaryType,label:string)=><div className="space-y-1"><label htmlFor={'current-'+type}>{label}</label><button type="button" className="demus-save" data-scoped-reference-editor disabled={isViewMode||!managed.canCreate(type)} onClick={()=>openDictModal(type,label,'current-'+type)}>{type==='LOCALITY'?'Nová lokalita':'+ Nová autorita '+label}</button>{managedSelect(type,'current-'+type)}</div>;
    const cardManagedField=(type:'GROUP'|'LOCALITY',label:string)=><div className="curator-card-field">
        <label htmlFor={'current-'+type}>{label}</label>
        {managedSelect(type,'current-'+type,'—',true,<button type="button" className="demus-save" data-scoped-reference-editor
            disabled={isViewMode||!managed.canCreate(type)} onClick={()=>openDictModal(type,label,'current-'+type)}>
            {type==='LOCALITY'?'Nová lokalita':'Nová skupina'}
        </button>)}
    </div>;
    const historical = useOriginalHistoricalData(id?Number(id):undefined,editSessionRef.current,originalIntegrationEnabled());
    const historicalFields=historical?.fields;
    const historicalFund=historicalControl(null,historicalFields?.Fond_S,true).value;
    const historicalType=historicalControl(null,historicalFields?.Predmet_S,true).value;
    const sourceControl=(current:unknown,key:string)=>historicalControl(current,historicalFields?.[key],isViewMode);
    const fullHistorical=useHistoricalRows(id?Number(id):undefined,'Sbirky',editSessionRef.current?.etag);
    const rootFields=fullHistorical.page?.state==='AVAILABLE'?fullHistorical.page.items[0]?.fields:undefined;
    const rootText=(key:string)=>rootFields?.[key]&&['TEXT','INTEGER'].includes(rootFields[key].kind)?String(rootFields[key].value):undefined;
    const rootControl=(current:unknown,key:string)=>originalIntegrationEnabled()&&id&&current===''
        ? {value:'',placeholder:undefined}:historicalControl(current,rootText(key),isViewMode);
    const historicalReadout=(current:unknown,key:string)=>!isViewMode&&current==null&&rootText(key)
        ?<p>Evidovaný údaj: <output>{rootText(key)}</output></p>:null;

    const currentFundLabel = useMemo(() => {
        if (form.fundDictionaryId) {
            const found = fundOptions.find(f => f.id === form.fundDictionaryId);
            if (found) return found.code ? `[${found.code}] ${found.label}` : found.label;
            return dictionaryLabel({code:form.fundLegacyCode});
        }
        if (form.fundLegacyCode) return `[${form.fundLegacyCode}]`;
        if (form.fundName) return form.fundName;
        return null;
    }, [form.fundDictionaryId, form.fundLegacyCode, form.fundName, form.subCollection, fundOptions]);

    const assignedAuthorCaption=useCurrentAuthorCaption(id?Number(id):undefined,editSessionRef.current?.etag);
    const currentAuthor = useMemo(() => {
        if(originalIntegrationEnabled())return form.author??'';
        if (form.author) return form.author;
        if (form.parties && Array.isArray(form.parties) && form.parties.length > 0) {
            const names = form.parties.map((p: any) => p.partyName || p.name).filter(Boolean);
            if (names.length > 0) return names.join(', ');
        }
        return '';
    }, [form.author, form.parties]);

    const currentDating = useMemo(() => {
        if (form.datingText) return form.datingText;
        if (form.datingFrom || form.datingTo) {
            return `${form.datingFrom || '?'}${form.datingTo ? `–${form.datingTo}` : ''}`;
        }
        return '';
    }, [form.datingText, form.datingFrom, form.datingTo]);

    useEffect(() => {
        let alive = true;
        if(!originalIntegrationEnabled()){getDictionaries().then(data => {
            setDicts(data);
        }).catch(console.error);

        getDictionaryTree('FUND').then((tree: any) => {
            if (Array.isArray(tree)) {
                const flatten = (nodes: any[]): { id: number; label: string; code: string | null }[] => {
                    let res: { id: number; label: string; code: string | null }[] = [];
                    for (const n of nodes) {
                        res.push({ id: n.id, label: n.label, code: n.code || null });
                        if (n.children && n.children.length > 0) {
                            res = res.concat(flatten(n.children));
                        }
                    }
                    return res;
                };
                setFundOptions(flatten(tree));
            }
        }).catch(console.error);}

        if (id) {
            if(!originalIntegrationEnabled())loadImages(id);
            setLoading(true);
            getAdminItem(id)
                .then(data => {
                    if (!alive) return;
                    editSessionRef.current = data._editSession;
                    persistedSnapshotRef.current = data;
                    const safeVal = (v: any) => (v === null || v === undefined ? '' : v);
                    const safeYear = (v: any) => v == null ? '' : String(v);

                    setInitialNumbers({
                        inventory: safeVal(data.inventoryNumber),
                        accession: safeVal(data.accessionNumber)
                    });

                    if (data.attachments && Array.isArray(data.attachments)) {
                        setAttachments(data.attachments);
                    }

                    const initialParties = Array.isArray(data.parties) && data.parties.length > 0
                        ? data.parties.map((p: any) => ({
                            partyId: p.partyId || p.id || null,
                            partyName: p.name || p.partyName || '',
                            role: p.role || 'Autor',
                            type: p.type || 'PERSON',
                            sortOrder: p.sortOrder ?? null
                        }))
                        : (data.author ? [{ partyId: null, partyName: data.author, role: 'Autor', type: 'PERSON', sortOrder: 1 }] : []);

                    const loadedForm = {
                        ...data,
                        subCollection: safeVal(data.subCollection),
                        fundDictionaryId: data.fundDictionaryId ?? null,
                        fundLegacyCode: data.fundLegacyCode ?? null,
                        primaryImageUrl: safeVal(data.primaryImageUrl),
                        imageUrls: Array.isArray(data.imageUrls) ? data.imageUrls : [],
                        author: originalIntegrationEnabled()?data.author??null:((data.authors && data.authors.length > 0) ? data.authors[0] : (data.author || '')),
                        authorRole: initialParties.length > 0 ? initialParties[0].role : 'Autor',
                        parties: initialParties,
                        material: originalIntegrationEnabled()?data.material??null:(data.material ?? data.materials?.join(', ') ?? ''),
                        weight: safeVal(data.weight),
                        title: safeVal(data.title),
                        description: originalIntegrationEnabled()?data.description??null:(safeVal(data.description)),
                        extendedDescription: safeVal(data.extendedDescription),
                        technique: originalIntegrationEnabled()?data.technique??null:(safeVal(data.technique)),
                        datingText: originalIntegrationEnabled()?data.datingText??null:(safeVal(data.datingText)),
                        datingFrom: safeYear(data.datingFrom),
                        datingTo: safeYear(data.datingTo),
                        countryOfOrigin: safeVal(data.countryOfOrigin),
                        objectCondition: safeVal(data.objectCondition),
                        spravce: safeVal(data.spravce),
                        oddeleni: safeVal(data.oddeleni),
                        permanentLocation: safeVal(data.permanentLocation),
                        locationBuilding: safeVal(data.locationBuilding),
                        locationRoom: safeVal(data.locationRoom),
                        acquisitionMethod: safeVal(data.acquisitionMethod),
                        acquisitionDate: safeVal(data.acquisitionDate),
                        acquiredFrom: safeVal(data.acquiredFrom),
                        insuranceValue: safeVal(data.insuranceValue),
                        materialNote: originalIntegrationEnabled()?data.materialNote??null:(safeVal(data.materialNote)),
                        originPlace: originalIntegrationEnabled()?data.originPlace??null:(safeVal(data.originPlace)),
                        findingLocality: safeVal(data.findingLocality),
                        quantity: data.quantity ?? null,
                        published: data.published ?? false,
                        latitude: safeVal(data.latitude),
                        longitude: safeVal(data.longitude),
                        coordinateSystem: safeVal(data.coordinateSystem) || 'WGS-84',
                        markant: safeVal(data.markant),
                        signature: safeVal(data.signature),
                        dimensions: Array.isArray(data.dimensions)
                            ? data.dimensions.map((d: any) => ({
                                id: d.id,
                                dimensionType: d.type || d.dimensionType || '',
                                value: d.value !== undefined && d.value !== null ? d.value : '',
                                unit: d.unit ?? '',
                                note: d.note || '',
                                sortOrder: d.sortOrder,
                                legacyData: d.legacyData,createdInScopedApi:d.createdInScopedApi
                            }))
                            : [],
                        auditComment: '',
                        legacyData: data.legacyData || {}
                    };
                    if ((location.state as any)?.createdItemId === Number(id)) setSuccessMessage('Předmět byl úspěšně založen.');
                    setForm(loadedForm);
                    initialFormValuesRef.current = loadedForm;
                    initialFormSnapshotRef.current = getFormSnapshot(loadedForm);
                })
                .catch((err: Error) => {if (alive) setGlobalError(!id && uncertainWrite(err) ? uncertainCreateMessage : err.message);})
                .finally(() => {if (alive) setLoading(false);});

            if(!originalIntegrationEnabled())loadAttachments();
        } else if(originalIntegrationEnabled()){
            initialFormSnapshotRef.current=getFormSnapshot(form);
        } else {
            Promise.resolve(getNextAvailableNumbers?.()).then((next: any) => {
                if (!alive) return;
                if (next) {
                    setSuggestions({ accession: next.accession || '', inventory: next.inventory || '' });
                    setForm((prev: any) => {
                        const newF = {
                            ...prev,
                            accessionNumber: prev.accessionNumber || '',
                            inventoryNumber: prev.inventoryNumber || ''
                        };
                        initialFormSnapshotRef.current = getFormSnapshot(newF);
                        return newF;
                    });
                } else {
                    initialFormSnapshotRef.current = getFormSnapshot(form);
                }
            }).catch(() => {
                if (!alive) return;
                initialFormSnapshotRef.current = getFormSnapshot(form);
            });
        }
        return () => {alive = false;};
    }, [id]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
                setShowCountries(false);
            }
            if (authorDropdownRef.current && !authorDropdownRef.current.contains(event.target as Node)) {
                setShowAuthors(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleNumberBlur = async (type: 'accession' | 'inventory', value: string) => {
        if(originalIntegrationEnabled())return; // Scoped creation validates atomically; never ask the legacy endpoint.
        if (!value || id) return;
        try {
            const res = await checkUniqueness(type, value);
            const exists = res?.exists ?? false;
            setValidity(prev => ({ ...prev, [type]: !exists }));
            if (exists) {
                const next = await getNextAvailableNumbers();
                if (next && next[type]) {
                    setSuggestions(prev => ({ ...prev, [type]: next[type] }));
                }
            }
        } catch (err) {
            console.error("Chyba validace čísla:", err);
        }
    };

    const handleSectionSave = async () => {
        if (!id) return;
        try {
            const fresh = await getAdminItem(id);
            if (fresh._editSession?.etag !== editSessionRef.current?.etag) throw new ApiError(412, 'Záznam se změnil po uložení sekce. Vaše ostatní zadání zůstává zachováno.');
            persistedSnapshotRef.current = fresh;
            if (editSessionRef.current && fresh._editSession) (editSessionRef.current as any).scopedCurrent = (fresh._editSession as any).scopedCurrent;
            const reconciled=reconcileSectionSave(formRef.current,initialFormValuesRef.current,fresh,
                ['markant', 'signature', 'subjectDictionaryId', 'subjectLegacyCode', 'fundDictionaryId',
                    'fundLegacyCode', 'groupDictionaryId', 'groupLegacyCode', 'localityDictionaryId', 'localityLegacyCode',
                    'materialDictionaryId', 'techniqueDictionaryId', 'legacyArchived', 'legacyCard', 'legacyCopied',
                    'legacyVerified', 'legacyMarked', 'acquisitionMethod', 'acquisitionDate', 'acquiredFrom',
                    'published', 'createdByUser', 'createdAt', 'modifiedByUser', 'lastModifiedAt']);
            // Update comparison refs before the section-save promise resolves. React
            // may defer a state updater; navigation must already see the saved state.
            initialFormValuesRef.current=reconciled.baseline;
            initialFormSnapshotRef.current=getFormSnapshot(reconciled.baseline);
            formRef.current=reconciled.draft;setForm(reconciled.draft);
        } catch (err) { if((err as {status?:number}).status===412)setScopedNeedsReload(true);setSuccessMessage(null);setGlobalError(saveFailureMessage(err)); throw err; }
    };

    const scopedCanWriteMedia=()=>{
        try{return !isViewMode&&!loading&&!scopedNeedsReload&&!!id&&originalCanEdit('professional')&&originalSession().catalog.mediaUploadEnabled===true&&!!editSessionRef.current&&!editSessionRef.current.busy;}catch{return false;}
    };
    const mutateScopedMedia=async(operation:(api:ReturnType<typeof originalSession>['api'],tag:string,signal:AbortSignal)=>Promise<{etag:string;replayed?:boolean}>)=>{
        if(!scopedCanWriteMedia())throw new Error('Zápis soukromých médií není pro tento předmět dostupný.');
        const session=editSessionRef.current!,{api,signal}=originalSession();session.busy=true;
        try{const saved=await operation(api,session.etag,signal);if(signal.aborted||editSessionRef.current!==session)throw new Error('Katalog nebo předmět se změnil.');if(saved.replayed&&saved.etag!==session.etag)scopedMedia.reload();session.etag=confirmedMediaMutationTag(session.etag,saved);const snapshot=(session as any).scopedCurrent;if(snapshot)snapshot.etag=saved.etag;scopedMedia.reload();}
        catch(error){if(editSessionRef.current===session&&(!(error instanceof ScopedError)||error.status===412))setScopedNeedsReload(true);throw error;}
        finally{session.busy=false;}
    };
    const documentFiles=originalIntegrationEnabled()?[
        ...galleryImages.map(image=>({id:image.entry.id,name:image.entry.name,kind:'IMAGE' as const,caption:image.entry.caption,mimeType:image.entry.mimeType,byteSize:image.entry.byteSize,preview:image.preview,download:()=>scopedMedia.download(image.entry)})),
        ...galleryAttachments.map(file=>({id:file.entry.id,name:file.entry.name,kind:'ATTACHMENT' as const,caption:file.caption,mimeType:file.entry.mimeType,byteSize:file.entry.byteSize,download:()=>scopedMedia.download(file.entry)}))
    ]:[];
    const documentationFiles=originalIntegrationEnabled()&&id&&<DocumentationFiles key={id} files={documentFiles} itemId={Number(id)} onUpload={!isViewMode&&scopedCanWriteMedia()?async(file,kind,caption)=>{
        await mutateScopedMedia((api,tag,signal)=>api.uploadMedia(Number(id),tag,file,kind,caption,signal));
    }:undefined} onCaption={!isViewMode&&scopedCanWriteMedia()?async(mediaId,caption)=>{
        await mutateScopedMedia((api,tag,signal)=>api.saveMediaCaption(Number(id),mediaId,tag,caption,signal));
    }:undefined} loaded={scopedMedia.loaded} busy={scopedMedia.busy} error={scopedMedia.error} more={!!scopedMedia.next} onMore={()=>void scopedMedia.loadMore()} onPhotos={()=>setActiveTab('photos')} onAttachments={()=>{setActiveTab('museum');setMuseumSubTab('attachments');}}/>;
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !id) return;

        setUploading(true);
        try {
            if(originalIntegrationEnabled()){
                await mutateScopedMedia((api,tag,signal)=>api.uploadMedia(Number(id),tag,file,'IMAGE',null,signal));
                setSuccessMessage('Soukromá fotografie byla uložena; seznam se znovu načítá.');e.target.value='';return;
            }
            const res = await uploadItemImage(Number(id), file);
            await loadImages(id);
            const fresh = await getAdminItem(id);
            await synchronizeMediaVersion(fresh);
            if (fresh) {
                setForm((prev: any) => ({
                    ...prev,
                    primaryImageUrl: fresh.primaryImageUrl || null,
                    imageUrls: Array.isArray(fresh.imageUrls) ? fresh.imageUrls : [...(prev.imageUrls || []), res.url]
                }));
            }
            setSuccessMessage('Obrázek byl úspěšně nahrán.');
        } catch (err: any) {
            alert('Nahrání obrázku selhalo: ' + err.message);
        } finally {
            setUploading(false);
        }
    };

    const setCenturyDating = (_from: number, _to: number, text: string) => {
        setForm((prev: any) => ({...prev, datingText:text,...(prev._completion?{datingKey:null}:{})}));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (mainSaveRef.current || editSessionRef.current?.busy) return;
        if (!id && (createUncertain||bulkOutcome)) {setGlobalError(uncertainCreateMessage); return;}
        setConflictError(null);
        setGlobalError(null);
        setSuccessMessage(null);
        setFieldErrors({});

        if(originalIntegrationEnabled()){
            const invalid=currentFormErrors(form);if(Object.keys(invalid).length){setFieldErrors(invalid);setGlobalError('Záznam nebyl uložen. Opravte označené údaje; rozepsané hodnoty zůstávají zachované.');focusInvalidField(Object.keys(invalid)[0]);return;}
            if(!id){
                try{originalCreationFields(form);if(bulkMode){if(!originalCanClone())throw new Error('Klonování není v katalogu povoleno.');explicitBulkNumbers(bulkNumbers,String(form.inventoryNumber??''));}}catch(error){if(error instanceof CreationValidationError){setFieldErrors({[error.field]:error.message});setActiveTab('identity');window.setTimeout(()=>{const control=error.field==='inventoryNumber'?document.querySelector<HTMLInputElement>('input[aria-label="Inventární číslo: Hlavní číslo"]'):document.getElementById(error.field);control?.focus();},0);}setGlobalError((error as Error).message);return;}
                mainSaveRef.current=true;setLoading(true);creationKeyRef.current??=crypto.randomUUID();
                try{if(managed.error)throw new Error('Výběr odborné vazby nebyl potvrzen. Opravte výběr před uložením. '+managed.error);const result=await createOriginalItem(creationKeyRef.current,form);initialFormSnapshotRef.current='';if(bulkMode){const baseId=result.value.item.id;setBulkOutcome({baseId,rows:[]});const rows=await copyExplicitBulk(baseId,String(form.title??'').trim()||null,explicitBulkNumbers(bulkNumbers,String(form.inventoryNumber)),rows=>setBulkOutcome({baseId,rows}),bulkCopyGroups);setBulkOutcome({baseId,rows});setSuccessMessage('Dávka dokončena. Každá kopie má vlastní atomický zápis; při chybě se další kopie nezakládají. Zkontrolujte výsledky níže.');return;}mainSaveRef.current=false;navigate(`/admin/items/view/${result.value.item.id}?catalog=${result.value.item.catalogId}`,{replace:true,state:{...location.state,creationNotice:'Předmět byl založen a znovu načten ze scoped katalogu.'}});}
                catch(error){const status=(error as {status?:number}).status;if(!status||status>=500)setCreateUncertain(true);setFieldErrors(saveFieldErrors(error));setGlobalError(saveFailureMessage(error));}
                finally{mainSaveRef.current=false;setLoading(false);}return;
            }
            if(isViewMode)return;
            mainSaveRef.current=true;setLoading(true);let accepted=false;
            try{
                if(managed.error)throw new Error('Výběr odborné vazby nebyl potvrzen. Opravte výběr před uložením. '+managed.error);
                const pendingSections=Object.entries(sectionDrafts.current).filter(([key,draft]:[string,any])=>key!=='currentFlags'&&draft.dirty);
                if(pendingSections.length||form.auditComment?.trim())throw new Error('Nejprve potvrďte rozepsaný odborný podzáznam, rozsah nebo auditní poznámku jejich vlastním tlačítkem Uložit. Ostatní změny zůstávají rozepsané; žádný zápis nebyl proveden.');
                const flagsDraft=sectionDrafts.current.currentFlags;
                const outcome=await saveOriginalCurrent(Number(id),scopedDomain,editSessionRef.current,form,flagsDraft);
                if(!outcome.saved){initialFormSnapshotRef.current='';mainSaveRef.current=false;navigate(originalDetailReturn(Number(id),(location.state as any)?.detailReturn),{replace:true,state:{...location.state,creationNotice:'Nejsou žádné změny k uložení. Zobrazuje se uložený předmět.'}});return;}
                accepted=true;
                const fresh=await getAdminItem(id);
                if(flagsDraft?.dirty){
                    const {api,signal}=originalSession();const flags=await api.curatorRecord(Number(id),'flags',signal);
                    if(flags.etag!==fresh._editSession.etag)throw new Error('Verze příznaků se změnila během obnovení.');
                    for(const key of Object.keys(flagsDraft.values))if(flags.value[key]!==flagsDraft.values[key])throw new Error('Obnovené příznaky neodpovídají potvrzenému zadání.');
                    if(sectionDrafts.current.currentFlags!==flagsDraft)throw new Error('Rozpracované příznaky se změnily během ukládání.');
                    sectionDrafts.current.currentFlags={itemId:Number(id),scopeSignal:signal,values:flags.value,dirty:false};
                }
                const loaded={...form,...fresh};
                for(const key of ['objectType','description','author','datingText','originPlace','material','technique','materialNote'])loaded[key]=fresh[key]??null;
                editSessionRef.current=fresh._editSession;persistedSnapshotRef.current=fresh;
                initialFormValuesRef.current=loaded;initialFormSnapshotRef.current=getFormSnapshot(loaded);formRef.current=loaded;setForm(loaded);
                mainSaveRef.current=false;
                navigate(originalDetailReturn(Number(id),(location.state as any)?.detailReturn),{replace:true,state:{...location.state,creationNotice:'Změny byly uloženy a znovu načteny ze serveru.'}});
            }catch(error){if(error instanceof ScopedError&&error.status===412){setScopedNeedsReload(true);setConflictError('Předmět se mezitím změnil. Rozpracované zadání zůstalo zachované. Porovnejte aktuální záznam a potom kartu znovu načtěte.');}if(accepted)setScopedNeedsReload(true);setFieldErrors(saveFieldErrors(error));setGlobalError((accepted?'Zápis byl potvrzen, ale obnovení verze selhalo. Před dalším zápisem obnovte stránku. ':'Zápis nebyl potvrzen; zadání zůstává zachováno. ')+saveFailureMessage(error));}
            finally{mainSaveRef.current=false;setLoading(false);}
            return;
        }

        if (!validity.accession || !validity.inventory) {
            setGlobalError('Nelze uložit: Evidenční čísla musí být unikátní!');
            return;
        }

        const currentInv = (form.inventoryNumber || '').trim();
        const currentAcc = (form.accessionNumber || '').trim();

        if (!currentInv) {
            setGlobalError('Vyplňte inventární číslo v horním panelu.');
            setFieldErrors({inventoryNumber:'Inventární číslo je povinné.'});
            window.setTimeout(() => {document.querySelector<HTMLInputElement>('input[aria-label="Inventární číslo: Hlavní číslo"]')?.focus();},0);
            setActiveTab('identity');
            return;
        }

        if (!form.title?.trim() && !form.objectType?.trim() && !(originalIntegrationEnabled()&&form._managedAuthorities?.OBJECT_TYPE)) {
            setGlobalError('Vyplňte alespoň titul nebo typ předmětu na kartě Základ.');
            setFieldErrors({title:'Vyplňte titul nebo typ předmětu.'});
            setActiveTab('identity');
            return;
        }

        if (id) {
            if (initialNumbers.inventory && !currentInv) {
                if (!window.confirm(`Chystáte se odstranit inventární číslo ${initialNumbers.inventory}. Opravdu chcete pokračovat?`)) {
                    return;
                }
            }
            if (initialNumbers.accession && !currentAcc) {
                if (!window.confirm(`Chystáte se odstranit přírůstkové číslo ${initialNumbers.accession}. Opravdu chcete pokračovat?`)) {
                    return;
                }
            }
        }

        if (form.latitude !== '' && form.latitude !== null && form.latitude !== undefined) {
            const lat = parseFloat(form.latitude);
            if (isNaN(lat) || lat < -90 || lat > 90) {
                setGlobalError('Zeměpisná šířka (Latitude) musí být v rozsahu od -90 do 90 stupňů.');
                setActiveTab('storage');
                return;
            }
        }

        if (form.longitude !== '' && form.longitude !== null && form.longitude !== undefined) {
            const lon = parseFloat(form.longitude);
            if (isNaN(lon) || lon < -180 || lon > 180) {
                setGlobalError('Zeměpisná délka (Longitude) musí být v rozsahu od -180 do 180 stupňů.');
                setActiveTab('storage');
                return;
            }
        }

        for (const key of ['datingFrom','datingTo']) {
            try {reviewedCalendarDate(form[key]);} catch(e) {
                setFieldErrors({[key]:(e as Error).message});setGlobalError((e as Error).message);setActiveTab('identity');return;
            }
        }

        const basicChanges = {...(sectionDrafts.current.basic?.changes || {})};
        const originalPayload: any = initialFormSnapshotRef.current ? buildItemPayload(initialFormValuesRef.current) : {};
        const mainPayload = buildItemPayload(form);
        for (const key of Object.keys(basicChanges)) {
            if (key in originalPayload && JSON.stringify(mainPayload[key as keyof typeof mainPayload]) !== JSON.stringify(originalPayload[key])
                && JSON.stringify(mainPayload[key as keyof typeof mainPayload]) !== JSON.stringify(basicChanges[key])) {
                setGlobalError('Stejné pole je změněné v hlavním formuláři i sekci. Nejprve sjednoťte zadání.'); return;
            }
        }
        const payload: any = {...mainPayload, ...basicChanges};
        if (!id) delete (payload as any).clearFund;
        preserveUnchangedEvidence(payload);
        if (id && form.inventoryNumber === initialNumbers.inventory) payload.inventoryNumber = undefined as any;

        if (id && !Object.entries(payload).some(([key, value]) => value !== undefined && (key !== 'auditComment' || !!value))) {
            setSuccessMessage('Nejsou žádné změny hlavních údajů ani příznaků k uložení.'); return;
        }
        mainSaveRef.current = true;
        setLoading(true);
        try {
            if (id) {
                await updateItem(Number(id), payload, editSessionRef.current);
                const updated = await getAdminItem(id);
                if (updated._editSession && editSessionRef.current && updated._editSession.etag !== editSessionRef.current.etag) {
                    setSuccessMessage('Hlavní údaje byly uloženy; při následném načítání se záznam znovu změnil.');
                    throw new ApiError(412, 'Novější verzi nelze přiřadit rozpracovaným odborným sekcím. Porovnejte aktuální záznam.');
                }
                if (updated._editSession && editSessionRef.current) updated._editSession.acquisitionSnapshot = editSessionRef.current.acquisitionSnapshot;
                if (updated) {
                    editSessionRef.current = updated._editSession;
                    persistedSnapshotRef.current = updated;
                    const safeVal = (v: any) => (v === null || v === undefined ? '' : v);
                    const safeYear = (v: any) => v == null ? '' : String(v);
                    setInitialNumbers({
                        inventory: safeVal(updated.inventoryNumber),
                        accession: safeVal(updated.accessionNumber)
                    });
                    const initialParties = Array.isArray(updated.parties) && updated.parties.length > 0
                        ? updated.parties.map((p: any) => ({
                            partyId: p.partyId || p.id || null,
                            partyName: p.name || p.partyName || '',
                            role: p.role || 'Autor',
                            type: p.type || 'PERSON',
                            sortOrder: p.sortOrder ?? null
                        }))
                        : (updated.author ? [{ partyId: null, partyName: updated.author, role: 'Autor', type: 'PERSON', sortOrder: 1 }] : []);

                    const prev = form;
                    const newUpdatedForm = {
                            ...prev,
                            ...updated,
                            subCollection: safeVal(updated.subCollection),
                            fundDictionaryId: updated.fundDictionaryId ?? null,
                            fundLegacyCode: updated.fundLegacyCode ?? null,
                            auditComment: '',
                            imageUrls: Array.isArray(updated.imageUrls) ? updated.imageUrls : prev.imageUrls,
                            author: updated.author ?? updated.authors?.join(', ') ?? '',
                            authorRole: initialParties.length > 0 ? initialParties[0].role : prev.authorRole,
                            parties: initialParties,
                            dimensions: (updated.dimensions || []).map((d: any) => ({...d,
                                dimensionType: d.type || d.dimensionType || '', value: d.value ?? '',
                                unit: d.unit ?? '', note: d.note ?? ''})),
                            material: updated.material ?? updated.materials?.join(', ') ?? '',
                            weight: safeVal(updated.weight),
                            title: safeVal(updated.title),
                            description: safeVal(updated.description),
                            extendedDescription: safeVal(updated.extendedDescription),
                            technique: safeVal(updated.technique),
                            datingText: safeVal(updated.datingText),
                            datingFrom: safeYear(updated.datingFrom),
                            datingTo: safeYear(updated.datingTo),
                            countryOfOrigin: safeVal(updated.countryOfOrigin),
                            objectCondition: safeVal(updated.objectCondition),
                            spravce: safeVal(updated.spravce),
                            oddeleni: safeVal(updated.oddeleni),
                            permanentLocation: safeVal(updated.permanentLocation),
                            locationBuilding: safeVal(updated.locationBuilding),
                            locationRoom: safeVal(updated.locationRoom),
                            acquisitionMethod: safeVal(updated.acquisitionMethod),
                            acquisitionDate: safeVal(updated.acquisitionDate),
                            acquiredFrom: safeVal(updated.acquiredFrom),
                            insuranceValue: safeVal(updated.insuranceValue),
                            materialNote: safeVal(updated.materialNote),
                            originPlace: safeVal(updated.originPlace),
                            findingLocality: safeVal(updated.findingLocality),
                            quantity: updated.quantity ?? null,
                            published: updated.published ?? prev.published,
                            latitude: safeVal(updated.latitude),
                            longitude: safeVal(updated.longitude),
                            coordinateSystem: safeVal(updated.coordinateSystem) || 'WGS-84',
                            markant: safeVal(updated.markant),
                            signature: safeVal(updated.signature)
                        };
                    initialFormValuesRef.current = newUpdatedForm;
                    initialFormSnapshotRef.current = getFormSnapshot(newUpdatedForm);
                    formRef.current = newUpdatedForm;
                    if (sectionDrafts.current.basic) sectionDrafts.current.basic = {...sectionDrafts.current.basic, changes: {}, dirty: false};
                    setForm(newUpdatedForm);
                }
                setSuccessMessage(Object.values(sectionDrafts.current).some((draft: any) => draft.dirty)
                    ? 'Hlavní údaje a příznaky byly uloženy. Zbývající odborné změny uložte v příslušných sekcích.'
                    : 'Změny byly úspěšně uloženy.');
            } else {
                const savedItem = await createItem(payload);
                if (bulkMode && savedItem?.id) {
                    await bulkCopyItem(savedItem.id, bulkParams);
                }
                if (!savedItem?.id) throw new Error('Server nepotvrdil ID nového předmětu. Před dalším založením ověřte katalog.');
                if (savedItem?.id) {
                    initialFormSnapshotRef.current = getFormSnapshot(form);
                    formRef.current = form;
                    mainSaveRef.current = false;
                    navigate(`/admin/items/edit/${savedItem.id}`, { replace: true, state: {...location.state, createdItemId:savedItem.id} });
                }
            }
        } catch (err) {
            if (!id && uncertainWrite(err)) {setCreateUncertain(true);setGlobalError(uncertainCreateMessage);}
            console.error('Chyba při ukládání záznamu:', err);
            if (err instanceof ApiError) {
                if (err.status === 401) {
                    setUnauthorizedError(true);
                } else if (err.status === 403) {
                    setForbiddenError(true);
                } else if (err.status === 409 || err.status === 412 || err.status === 428) {
                    setConflictError(err.message || 'Předmět s tímto inventárním číslem již existuje. Zvolte prosím unikátní číslo.');
                } else {
                    setGlobalError(!id && uncertainWrite(err) ? uncertainCreateMessage : err.message || 'Nepodařilo se uložit záznam.');
                }
                if (err.fieldErrors) {
                    setFieldErrors(saveFieldErrors(err));
                }
            } else if (err instanceof Error) {
                setGlobalError(!id && uncertainWrite(err) ? uncertainCreateMessage : err.message);
            } else {
                setGlobalError('Došlo k neočekávané chybě.');
            }
        } finally {
            mainSaveRef.current = false;
            setLoading(false);
        }
    };

    const [determinerTarget,setDeterminerTarget]=useState<HTMLDivElement|null>(null);
    const [archiveTarget,setArchiveTarget]=useState<HTMLDivElement|null>(null);
    const [recordedFlags,setRecordedFlags]=useState<{etag:string;itemId:number;present:boolean;values:Record<string,string|null>}>();
    const completionItemVersion=editSessionRef.current?.etag;
    const [cardAuthorities,setCardAuthorities]=useState<{etag:string;item:number;values:Record<string,string|null>}>();
    useEffect(()=>{
        if(!id||!form._completion||!completionItemVersion)return;
        const {api,signal}=originalSession();
        const controller=new AbortController(),request=AbortSignal.any([signal,controller.signal]);
        void api.curatorRecord(Number(id),'authorities',request).then(result=>{
            if(!request.aborted&&result.etag===completionItemVersion)setCardAuthorities({etag:result.etag,item:Number(id),values:result.value});
        }).catch(()=>{ /* Existing detail reports failures if opened. */ });
        return ()=>controller.abort();
    },[id,form._completion,completionItemVersion]);
    const [mainMeasures,setMainMeasures]=useState<{etag:string;item:number;summary:string}>();
    useEffect(()=>{
        if(!id||!form._cardStatements||!completionItemVersion)return;
        const {api,signal}=originalSession(),cancel=new AbortController();
        const request=AbortSignal.any([signal,cancel.signal]);
        void Promise.all([api.sourceDimensions(Number(id),request,0,12),api.sourceDimensionCorrections(Number(id),request),
            form._completion?api.curatorMeasures(Number(id),request):null]).then(([source,edits,owned])=>{
            if(request.aborted||source.etag!==completionItemVersion||edits.etag!==completionItemVersion||owned&&owned.etag!==completionItemVersion)return;
            const byId=new Map(edits.items.map(row=>[row.recordId,row]));
            const values=source.value.items.map(row=>{
                const correction=byId.get(row.recordId);
                return [correction?.type??row.type,correction?.valueCleared?null:correction?.value??row.number.value,correction?.unit??row.unit];
            }).concat((owned?.items??[]).map(row=>[row.type,row.value,row.unit]));
            const entries=values.filter(row=>row[1]!=null).map(row=>row.filter(value=>value!==null&&value!=='').join(' '));
            const shown=entries.slice(0,5).join(' · ');
            const more=entries.length>5||source.value.nextOffset!==null;
            setMainMeasures({etag:completionItemVersion,item:Number(id),summary:[shown,more?'…':''].filter(Boolean).join(' ')});
        }).catch(()=>{ /* The dedicated Measurements tab reports any error. */ });
        return ()=>cancel.abort();
    },[id,form._cardStatements,form._completion,completionItemVersion]);

    if (unauthorizedError) {
        return (
            <div className="p-8 max-w-lg mx-auto mt-10 bg-white border border-red-200 rounded-lg shadow-lg text-center space-y-4">
                <div className="text-4xl text-red-500">🔒</div>
                <h2 className="text-lg font-black text-gray-900">Vypršelo přihlášení</h2>
                <p className="text-xs text-gray-600">Pro pokračování v kurátorské práci se musíte znovu přihlásit.</p>
                <GovButton type="solid" color="primary" onClick={() => navigate('/login')}>
                    Přejít na přihlášení
                </GovButton>
            </div>
        );
    }

    if (forbiddenError) {
        return (
            <div className="p-8 max-w-lg mx-auto mt-10 bg-white border border-yellow-200 rounded-lg shadow-lg text-center space-y-4">
                <div className="text-4xl text-yellow-500">⛔</div>
                <h2 className="text-lg font-black text-gray-900">Nedostatečná oprávnění</h2>
                <p className="text-xs text-gray-600">Nemáte oprávnění k úpravě tohoto sbírkového předmětu.</p>
                <GovButton type="solid" color="primary" onClick={() => navigate('/admin/items')}>
                    Zpět do správy
                </GovButton>
            </div>
        );
    }

    const saveDisabled=originalIntegrationEnabled()?loading||auditSaving||scopedNeedsReload||(id?(!originalCanEdit(scopedDomain)||!(editSessionRef.current as any)?.scopedCurrent):!originalCanCreate()||createUncertain||!!bulkOutcome):loading||auditSaving||!validity.accession||!validity.inventory;
    const primaryRoleEditor=                                <div>
                                    {managed.enabled?managedSelect('AUTHOR_ROLE','authorRole','—',true,managed.enabled&&<button type="button" data-scoped-reference-editor disabled={isViewMode||!managed.canCreate('AUTHOR_ROLE')} onClick={()=>openDictModal('AUTHOR_ROLE','Role autora','authorRole')}>+ Nová role</button>):<select
                                        id="authorRole"
                                        aria-label="Role autora"
                                        className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:border-[#00204a]"
                                        value={form.authorRole || 'Autor'}
                                        onChange={e => {
                                            const newRole = e.target.value;
                                            setForm((prev: any) => {
                                                const existing = Array.isArray(prev.parties) && prev.parties.length > 0
                                                    ? prev.parties
                                                    : [{ partyName: prev.author || '', role: newRole }];
                                                const updatedParties = existing.map((p: any, idx: number) =>
                                                    idx === 0 ? { ...p, role: newRole } : p
                                                );
                                                return {
                                                    ...prev,
                                                    authorRole: newRole,
                                                    parties: updatedParties
                                                };
                                            });
                                        }}
                                    >
                                        {AUTHOR_ROLES.map(role => (
                                            <option key={role} value={role}>{role}</option>
                                        ))}
                                    </select>}
                                </div>;
    const authorTools =                         <div className="space-y-1" ref={authorDropdownRef}>
                            <div className="flex items-center justify-between">
                                <label htmlFor="author">Autor / Tvůrce / Původce a role</label>
                                <div className="flex items-center gap-2">
                                    {originalIntegrationEnabled()?<AdditionalAuthorsLink itemId={id?Number(id):undefined} readOnly={isViewMode} blocked={loading||scopedNeedsReload||mainSaveRef.current||!!editSessionRef.current?.busy||hasUnsavedChanges()} onOpen={()=>{setActiveTab('museum');setMuseumSubTab('origin');}}/>:(
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const name = prompt('Jméno dalšího autora / tvůrce:');
                                            if (name && name.trim()) {
                                                setForm((prev: any) => ({
                                                    ...prev,
                                                    parties: [
                                                        ...(prev.parties && prev.parties.length > 0
                                                            ? prev.parties
                                                            : (prev.author ? [{ partyName: prev.author, role: prev.authorRole || 'Autor', type: 'PERSON' }] : [])),
                                                        { partyId: null, partyName: name.trim(), role: 'Autor', type: 'PERSON' }
                                                    ]
                                                }));
                                            }
                                        }}
                                        className="text-[10px] font-bold text-gray-600 hover:text-gray-900 underline"
                                    >
                                        + Další role / tvůrce
                                    </button>)}
                                    <button
                                        type="button"
                                        data-scoped-reference-editor={managed.enabled?true:undefined} disabled={managed.enabled&&(isViewMode||!managed.canCreate('AUTHOR'))} title={managed.enabled&&!managed.canCreate('AUTHOR')?'Vyžaduje dictionary.write, aktuální verzi a uložené změny.':undefined} onClick={() => openDictModal('AUTHOR', 'Autor / Původce', 'author')}
                                        className="text-[10px] font-bold text-blue-600 hover:text-blue-800 underline"
                                    >
                                        + Nový autor
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <div className="sm:col-span-2 relative">
                                    <input
                                        type="text"
                                        id="author"
                                        disabled={originalIntegrationEnabled()&&(isViewMode||loading||scopedNeedsReload||!originalCanEdit('professional')||!id&&!originalCanCreate())}
                                        className="w-full bg-white border border-gray-300 rounded px-3 py-1.5 text-xs text-gray-700 focus:outline-none focus:border-[#00204a]"
                                        value={rootControl(form.author,'Autor_S').value}
                                        onFocus={() => setShowAuthors(true)}
                                        onChange={e => {
                                            const val = e.target.value;
                                            setForm((prev: any) => {
                                                const existing = Array.isArray(prev.parties) && prev.parties.length > 0
                                                    ? prev.parties
                                                    : [{ role: prev.authorRole || 'Autor' }];
                                                const updatedParties = existing.map((p: any, idx: number) =>
                                                    idx === 0 ? { ...p, partyName: val, role: prev.authorRole || 'Autor' } : p
                                                );
                                                return {
                                                    ...prev,
                                                    author: val,
                                                    parties: updatedParties
                                                };
                                            });
                                            setAuthorSearch(val);
                                            setShowAuthors(true);
                                        }}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                const matches = Array.from(new Set(dicts.authors || []))
                                                    .filter((a: any) => dictionarySearchKey(a).includes(dictionarySearchKey(authorSearch)))
                                                    .sort();
                                                if (matches.length > 0 && showAuthors) {
                                                    const chosen = matches[0];
                                                    setForm((prev: any) => {
                                                        const existing = Array.isArray(prev.parties) && prev.parties.length > 0
                                                            ? prev.parties
                                                            : [{ role: prev.authorRole || 'Autor' }];
                                                        const updatedParties = existing.map((p: any, idx: number) =>
                                                            idx === 0 ? { ...p, partyName: chosen, role: prev.authorRole || 'Autor' } : p
                                                        );
                                                        return { ...prev, author: chosen, parties: updatedParties };
                                                    });
                                                }
                                                setShowAuthors(false);
                                            }
                                        }}
                                        placeholder={rootControl(form.author,'Autor_S').placeholder??'Začněte psát jméno autora...'}
                                    />{historicalReadout(form.author,'Autor_S')}
                                    {showAuthors && (
                                        <div className="absolute left-0 right-0 mt-1 max-h-[160px] overflow-y-auto bg-white border border-gray-200 rounded shadow-lg z-[999]">
                                            {Array.from(new Set(dicts.authors || []))
                                                .filter((a: any) => dictionarySearchKey(a).includes(dictionarySearchKey(authorSearch)))
                                                .sort()
                                                .map((a: any) => (
                                                    <div
                                                        key={a}
                                                        onClick={() => {
                                                            setForm((prev: any) => {
                                                                const existing = Array.isArray(prev.parties) && prev.parties.length > 0
                                                                    ? prev.parties
                                                                    : [{ role: prev.authorRole || 'Autor' }];
                                                                const updatedParties = existing.map((p: any, idx: number) =>
                                                                    idx === 0 ? { ...p, partyName: a, role: prev.authorRole || 'Autor' } : p
                                                                );
                                                                return { ...prev, author: a, parties: updatedParties };
                                                            });
                                                            setAuthorSearch('');
                                                            setShowAuthors(false);
                                                        }}
                                                        className="px-3 py-1.5 text-xs hover:bg-gray-100 cursor-pointer transition-colors border-b last:border-0"
                                                    >
                                                        {a}
                                                    </div>
                                                ))}
                                        </div>
                                    )}
                                </div>

                            </div>

                            {/* Seznam přiřazených autorů a rolí */}
                            {(form.parties || []).length > 1 && (
                                <div className="mt-2 space-y-1 bg-gray-50 p-2.5 rounded border border-gray-200">
                                    <div className="text-[11px] font-bold text-gray-700">Přiřazení autoři a role ({form.parties.length}):</div>
                                    {form.parties.map((p: any, idx: number) => (
                                        <div key={idx} className="flex items-center justify-between text-xs py-1 border-b last:border-none">
                                            <span className="font-semibold text-gray-800">{p.partyName}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0.5 rounded font-bold">{p.role || 'Autor'}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setForm((prev: any) => {
                                                            const newParties = prev.parties.filter((_: any, i: number) => i !== idx);
                                                            return {
                                                                ...prev,
                                                                parties: newParties,
                                                                author: newParties.length > 0 ? newParties[0].partyName : '',
                                                                authorRole: newParties.length > 0 ? newParties[0].role : 'Autor'
                                                            };
                                                        });
                                                    }}
                                                    className="text-red-500 hover:text-red-700 p-0.5"
                                                    title="Odebrat původce"
                                                >
                                                    <FaTrash size={10} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>;
    const datingPresets=<details className="curator-card-dating-presets"><summary>Přednastavená období</summary>
                                <div className="flex flex-wrap gap-1 text-[10px]">
                                    <button
                                        type="button"
                                        data-scoped-dating="true" onClick={() => setCenturyDating(1701, 1800, '18. století')}
                                        className="px-2 py-0.5 bg-white border rounded hover:bg-gray-100"
                                    >
                                        18. stol.
                                    </button>
                                    <button
                                        type="button"
                                        data-scoped-dating="true" onClick={() => setCenturyDating(1801, 1900, '19. století')}
                                        className="px-2 py-0.5 bg-white border rounded hover:bg-gray-100"
                                    >
                                        19. stol.
                                    </button>
                                    <button
                                        type="button"
                                        data-scoped-dating="true" onClick={() => setCenturyDating(1901, 1950, '1. polovina 20. století')}
                                        className="px-2 py-0.5 bg-white border rounded hover:bg-gray-100"
                                    >
                                        1. pol. 20. stol.
                                    </button>
                                    <button
                                        type="button"
                                        data-scoped-dating="true" onClick={() => setCenturyDating(1951, 2000, '2. polovina 20. století')}
                                        className="px-2 py-0.5 bg-white border rounded hover:bg-gray-100"
                                    >
                                        2. pol. 20. stol.
                                    </button>
                                </div></details>;
    const topEditors = !isViewMode ? {
        numbers: <fieldset disabled={loading || auditSaving} className="demus-editor">                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label htmlFor="inventoryNumber" style={!id?{display:'none'}:undefined}>Inventární číslo *</label>
                                {!id ? <NewInventoryNumber compact optionsDisabled={loading||auditSaving||originalIntegrationEnabled()&&!originalCanEdit('inventory')} onPartsChange={originalIntegrationEnabled()?parts=>setForm((prev:any)=>({...prev,_inventoryParts:parts})):undefined} error={fieldErrors.inventoryNumber} value={form.inventoryNumber || ''} onChange={value => {clearBasicError('inventoryNumber');setForm((prev: any) => ({...prev,inventoryNumber:value}));}} /> : (<input
                                    id="inventoryNumber" aria-invalid={!!fieldErrors.inventoryNumber}
                                    value={form.inventoryNumber || ''}
                                    onChange={(e: any) => {clearBasicError('inventoryNumber');setForm({ ...form, inventoryNumber: e.target.value });}}
                                    onBlur={(e: any) => handleNumberBlur('inventory', e.target.value)}
                                />)}
                                {fieldErrors.inventoryNumber && <p className="text-xs font-bold text-red-600">{fieldErrors.inventoryNumber}</p>}
                                {!validity.inventory && (
                                    <div className="p-2 bg-red-50 border border-red-100 rounded text-[10px] text-red-700 flex justify-between items-center font-bold">
                                        <span>⚠️ Číslo je již obsazeno!</span>
                                        <button
                                            type="button"
                                            className="underline text-red-900"
                                            onClick={() => {
                                                setForm({ ...form, inventoryNumber: suggestions.inventory });
                                                setValidity(v => ({ ...v, inventory: true }));
                                            }}
                                        >
                                            Použít volné: {suggestions.inventory}
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-1">
                                <label htmlFor="accessionNumber">Přírůstkové číslo</label>
                                <input
                                    id="accessionNumber" aria-invalid={!!fieldErrors.accessionNumber}
                                    value={form.accessionNumber || ''}
                                    onChange={(e: any) => {clearBasicError('accessionNumber');setForm({ ...form, accessionNumber: e.target.value });}}
                                    onBlur={(e: any) => handleNumberBlur('accession', e.target.value)}
                                />
                                {fieldErrors.accessionNumber && <p className="text-xs font-bold text-red-600">{fieldErrors.accessionNumber}</p>}
                                {!validity.accession && (
                                    <div className="p-2 bg-red-50 border border-red-100 rounded text-[10px] text-red-700 flex justify-between items-center font-bold">
                                        <span>⚠️ Číslo je již obsazeno!</span>
                                        <button
                                            type="button"
                                            className="underline text-red-900"
                                            onClick={() => {
                                                setForm({ ...form, accessionNumber: suggestions.accession });
                                                setValidity(v => ({ ...v, accession: true }));
                                            }}
                                        >
                                            Použít volné: {suggestions.accession}
                                        </button>
                                    </div>
                                )}
                            </div>

                        </div>

</fieldset>,
        Fond: <fieldset disabled={loading || auditSaving} className="demus-editor curator-card-entry">                            <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <label htmlFor="fundDictionaryId">Fond</label>

                                </div>
                                {managed.enabled?managedSelect('FUND','fundDictionaryId',historicalFund,true,<button
                                        type="button"
                                        data-scoped-reference-editor={managed.enabled?true:undefined} disabled={managed.enabled&&(isViewMode||!managed.canCreate('FUND'))} title={managed.enabled&&!managed.canCreate('FUND')?'Vyžaduje dictionary.write, aktuální verzi a uložené změny.':undefined} onClick={() => openDictModal('FUND', 'Nový fond', 'fundDictionaryId')}
                                        className="text-[10px] font-bold text-blue-600 hover:text-blue-800 underline"
                                    >
                                        + Nový fond
                                    </button>):<select
                                    id="fundDictionaryId"
                                    aria-label="Fond"
                                    disabled={fundSelectOptions.length === 0}
                                    className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:border-[#00204a]"
                                    value={form.fundDictionaryId !== null && form.fundDictionaryId !== undefined ? String(form.fundDictionaryId) : ''}
                                    onChange={e => {
                                        const val = e.target.value;
                                        setForm({
                                            ...form,
                                            fundDictionaryId: val ? Number(val) : null
                                        });
                                    }}
                                >
                                    <option value="">{historicalFund||'— Bez přiřazeného fondu —'}</option>
                                    {form.fundDictionaryId && !fundSelectOptions.some((o: any) => o.id === String(form.fundDictionaryId)) && (
                                        <option value={String(form.fundDictionaryId)}>
                                            {form.fundLegacyCode ? `[${form.fundLegacyCode}] Fond #${form.fundDictionaryId}` : `Fond #${form.fundDictionaryId}`}
                                        </option>
                                    )}
                                    {fundSelectOptions.map((f: any) => (
                                        <option key={f.id} value={f.id}>
                                            {f.label}
                                        </option>
                                    ))}
                                </select>}
                                {form.fundLegacyCode&&<TechnicalDemus title="Doklad fondu"><p>Kód fondu: {form.fundLegacyCode}</p></TechnicalDemus>}
                            </div>

</fieldset>,
        Titul: <fieldset disabled={loading || auditSaving} className="demus-editor curator-card-entry">                        <div className="space-y-1">
                            <label htmlFor="title">Titul</label>
                            <input
                                id="title" aria-invalid={!!fieldErrors.title}
                                {...sourceControl(form.title,'Titul_S')}
                                onChange={(e: any) => {clearBasicError('title');setForm({ ...form, title: e.target.value });}}
                            />
                            {fieldErrors.title && <p className="text-xs font-bold text-red-600">{fieldErrors.title}</p>}
                        </div>

</fieldset>,
        Předmět: <fieldset disabled={loading || auditSaving} className="demus-editor curator-card-entry">                            <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <label htmlFor="objectType">Typ předmětu</label>

                                </div>
                                {managed.enabled?managedSelect('OBJECT_TYPE','objectType',historicalType,true,<><button
                                        type="button"
                                        data-scoped-reference-editor={managed.enabled?true:undefined} disabled={managed.enabled&&(isViewMode||!managed.canCreate('OBJECT_TYPE'))} title={managed.enabled&&!managed.canCreate('OBJECT_TYPE')?'Vyžaduje dictionary.write, aktuální verzi a uložené změny.':undefined} onClick={() => openDictModal('OBJECT_TYPE', 'Typ předmětu', 'objectType')}
                                        className="text-[10px] font-bold text-blue-600 hover:text-blue-800 underline"
                                    >
                                        + Nový
                                    </button>                        {originalIntegrationEnabled()&&!isViewMode&&scopedDomain==='professional'&&<label className="space-y-1">Současný typ — volný text<input id="current-object-type" disabled={isViewMode||loading||scopedNeedsReload||!originalCanEdit('professional')||!id&&!originalCanCreate()} type="text" value={form.objectType??''} placeholder={historicalType||undefined} onChange={e=>setForm((prev:any)=>({...prev,objectType:e.target.value}))}/></label>}</>):<select
                                    id="objectType"
                                    className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:border-[#00204a]"
                                    value={form.objectType || ''}
                                    onChange={e => setForm({ ...form, objectType: e.target.value })}
                                >
                                    <option value="">{historicalType||'-- Vyberte typ --'}</option>
                                    {form.objectType && !dicts.objectTypes?.includes(form.objectType) && (
                                        <option value={form.objectType}>{form.objectType}</option>
                                    )}
                                    {dicts.objectTypes?.map((t: string) => (
                                        <option key={t} value={t}>
                                            {t}
                                        </option>
                                    ))}
                                </select>}
                            </div>


</fieldset>,
        Autor: <fieldset disabled={loading || auditSaving} className="demus-editor curator-card-entry"><div className="curator-card-field">
           <label htmlFor={managed.enabled?'current-author-authority':'author'}>Autor</label>{managed.enabled?managedSelect('AUTHOR','current-author-authority',(isViewMode&&form.catalogSummary?form.catalogSummary.author.map((v:{value:string})=>v.value).join(' · '):currentAuthor||assignedAuthorCaption||rootControl(form.author,'Autor_S').value)||'— bez autora —',true,authorTools):authorTools}</div></fieldset>,
        Datace: <fieldset disabled={loading || auditSaving} className="demus-editor curator-card-entry">                                <div className="space-y-1">
                                    <label htmlFor="datingText">Datace</label>
                                    <input
                                        id="datingText"
                                        value={rootControl(form.datingText,'Datace_S').value}
                                        onChange={(e: any) => setForm({ ...form, datingText: e.target.value, ...(form._completion?{datingKey:null}:{}) })}
                                        placeholder={rootControl(form.datingText,'Datace_S').placeholder??'např. 60. léta 19. století'}
                                    /><div className="curator-card-dating-menu">
                                      {managed.enabled&&!isViewMode&&(!id?originalCanCreate():originalCanEdit(scopedDomain))&&originalCanEdit('professional')&&<CardDictionaryChoice type="DATING" label="Nabídka datace" selectedKey={form.datingKey} selectedCaption={form.datingText} onSelect={entry=>{if(entry)setForm((previous:any)=>({...previous,datingText:entry.label??entry.code??'',...(previous._completion?{datingKey:entry.key}:{})}));}}>{datingPresets}</CardDictionaryChoice>}
                                      {!managed.enabled&&datingPresets}
                                    </div>
                            </div>
</fieldset>,
    } : undefined;
    const dimensionRows=form.dimensions;
    const measurementTypes=useDictionaryPage('DIMENSION',originalIntegrationEnabled()&&activeTab==='dimensions'&&!isViewMode);
    const dimensionOptions=(measurementTypes?.items??[]).filter(entry=>entry.code!==null);
    const dimensionUnits=[...new Set(['cm','mm','m','g','kg',...dimensionOptions.map(entry=>dictionaryField(entry,'Jedn_RZ')).filter((unit):unit is string=>unit!==undefined)])];
    const cardSnapshot=(editSessionRef.current as any)?.scopedCurrent;
    const allowCardEdit=!!id&&!isViewMode&&!loading&&!scopedNeedsReload&&originalCanEdit(scopedDomain);
    const canChooseDirectory=allowCardEdit&&originalCanEdit('professional')&&originalSession().catalog.capabilities?.includes('dictionary.read');
    const custodianValue=cardSnapshot?.custodian?.present||form.custodianCode!=null?form.custodianCode??'':null;
    const recordedByValue=cardSnapshot?.recordedBy?.present||form.recordedByEdited?form.recordedByName??'':rootText('Zapsal_S');
    const authorityValues=cardAuthorities?.etag===completionItemVersion&&cardAuthorities?.item===Number(id)?cardAuthorities.values:undefined;
    const dateEvidence=(key:string)=>{
        const value=rootFields?.[key];
        return value&&['TEXT','INTEGER','DECIMAL','TEMPORAL','DATE','TIMESTAMP'].includes(value.kind)&&value.value!=null?String(value.value):undefined;
    };
    const itemValue=(label:string,value?:string|null)=> <div className="curator-card-value"><strong>{label}</strong><output>{value===null||value===""||value===undefined?'—':value}</output></div>;
    const goToTab=(tab:string)=>document.querySelector<HTMLButtonElement>(`nav[aria-label="Karty DEMUS"] button[data-tab-name="${tab}"]`);
    const tabEditor=(tab:string,label:string)=> <button type="button" data-scoped-navigation className="underline"
        onClick={()=>{const button=goToTab(tab);button?.click();button?.focus();}}>{label}</button>;
    const visibleLocation=originalCanEdit('inventory');
    const currentDimensionSummary=(dimensionRows??[]).slice(0,5).filter((row:any)=>String(row.value??'')!=='')
        .map((row:any)=>[row.dimensionType,row.value,row.unit].filter(Boolean).join(' ')).join(' · ');
    const subjectEditor=managed.enabled&&managedField('SUBJECT','Námět');
    const sourceMeasureSummary=mainMeasures?.item===Number(id)&&mainMeasures?.etag===completionItemVersion?mainMeasures.summary:undefined;
    const roleText=isViewMode&&form.catalogSummary?.authorRole!==undefined?form.catalogSummary.authorRole.map((v:{value:string})=>v.value).join(' · '):managed.label('AUTHOR_ROLE')||authorityValues?.authorRoleText||rootText('Role_S');
    const cardFlags=recordedFlags?.etag===completionItemVersion&&recordedFlags?.itemId===Number(id)?recordedFlags:undefined;
    const flagLabel=(current:string,source:string)=>{
        if(cardFlags?.present){const value=cardFlags.values[current];return value===null?'—':value==='true'?'Ano':'Ne';}
        return rootFields?.[source]?.kind==='BOOLEAN'?(rootFields[source].value?'Ano':'Ne'):'—';
    };
    const rootArchive=flagLabel('archive','Archiv_S');

    const fullCalendarDating=<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label htmlFor="datingFrom" title="Počáteční datum; editor přijímá úplné kalendářní datum">Od</label>
                                    <input
                                        type="text"
                                        id="datingFrom" aria-label="Datace od"
                                        className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-800 font-mono focus:outline-none focus:border-[#00204a]"
                                        value={form.datingFrom !== undefined && form.datingFrom !== null ? form.datingFrom : ''}
                                        onChange={e => setForm({ ...form, datingFrom: e.target.value })}
                                        placeholder="např. 1850-06-15"
                                    />
                                    {fieldErrors.datingFrom&&<p role="alert">{fieldErrors.datingFrom}</p>}
                                </div>

                                <div className="space-y-1">
                                    <label htmlFor="datingTo" title="Koncové datum; editor přijímá úplné kalendářní datum">Do</label>
                                    <input
                                        type="text"
                                        id="datingTo" aria-label="Datace do"
                                        className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-800 font-mono focus:outline-none focus:border-[#00204a]"
                                        value={form.datingTo !== undefined && form.datingTo !== null ? form.datingTo : ''}
                                        onChange={e => setForm({ ...form, datingTo: e.target.value })}
                                        placeholder="např. 1870-06-15"
                                    />
                                    {fieldErrors.datingTo&&<p role="alert">{fieldErrors.datingTo}</p>}
                                </div>

                            </div>;
    const registration=<div className="curator-card-registration demus-editor" aria-label="Zápis předmětu">
                        {originalIntegrationEnabled()&&<div className="space-y-1"><label htmlFor="current-other-number">Jiné číslo</label><input id="current-other-number" type="text" readOnly={isViewMode||!originalCanEdit('inventory')} value={isViewMode?form.otherNumber??historicalFields?.JineC_S??'':form.otherNumber??''} onChange={e=>setForm((prev:any)=>({...prev,otherNumber:e.target.value}))}/></div>}                            {originalIntegrationEnabled()&&id&&<div className="curator-card-recorded">
                                <div>Zapsal: <output aria-label="Zapsal">{recordedByValue||'—'}</output></div>
                                {form._cardStatements&&canChooseDirectory&&<CardDictionaryChoice type="DIRECTORY" label="Vybrat osobu, která předmět zapsala" selectedKey={form.recordedByKey} selectedCaption={form.recordedByName} canClear onSelect={entry=>setForm((previous:any)=>({
                                    ...previous,recordedByEdited:true,recordedByKey:entry?.key??null,recordedByName:entry?.label??entry?.code??null
                                }))}/>}
                            </div>}                {id&&<span className="curator-card-flag-values" aria-label="Stav karty">
                  Karta {flagLabel('card','Karta_S')} · Opsána {flagLabel('copied','Opsana_S')} · Ověřena {flagLabel('verified','Overena_S')}
                </span>}
                {id&&itemValue('Datum zápisu',dateEvidence('DatZap_S')??historicalFields?.DatZap_S)}
                {id&&import.meta.env.VITE_CURRENT_FLAGS_ENABLED==='true'&&<details className="curator-record-status"><summary>Karta, Opsáno, Ověřeno a další zařazení</summary>
                            {id&&import.meta.env.VITE_CURRENT_FLAGS_ENABLED==='true'?<CurrentClassificationFlags onValues={setRecordedFlags} archiveTarget={isViewMode?null:archiveTarget} itemId={Number(id)} parentEtag={editSessionRef.current?.etag} readOnly={isViewMode} blocked={loading||scopedNeedsReload||!!initialFormSnapshotRef.current&&getFormSnapshot(formRef.current)!==initialFormSnapshotRef.current||Object.entries(sectionDrafts.current).some(([k,v]:[string,any])=>k!=='currentFlags'&&v.dirty)} drafts={sectionDrafts} onSave={etag=>{const session=editSessionRef.current as any;if(session?.scopedCurrent){session.etag=etag;session.scopedCurrent.etag=etag;}return handleSectionSave();}}></CurrentClassificationFlags>:null}
            </details>}
            </div>;
    // UPDATE4.5: existing editors are only regrouped; retain the original disabled boundary.
    const supplementaryLeft=activeTab==='identity'?<fieldset disabled={loading||auditSaving||isViewMode} className="curator-card-supplement"><div className="demus-primary-fields"><section className="curator-card-panel curator-card-dictionary" aria-label="Námět"><h3 className="curator-card-heading">Námět</h3><div className="curator-card-panel-body">                        {subjectEditor}
</div></section><section className="curator-card-panel curator-card-dictionary" aria-label="Podsbírka"><h3 className="curator-card-heading">Podsbírka</h3><div className="curator-card-panel-body">                        {/* FOND A PODSBÍRKA DLE CITEM – NEZÁVISLÁ POLA */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label htmlFor="subCollection">Podsbírka</label>
                                {managed.enabled&&<button type="button" data-scoped-reference-editor disabled={isViewMode||!managed.canCreate('COLLECTION')} onClick={()=>openDictModal('COLLECTION','Podsbírka','subCollection')}>+ Nová podsbírka</button>}
                                {managed.enabled?managedSelect('COLLECTION','subCollection',sourceControl(form.subCollection,'Podsb_S').value||'— bez podsbírky —'):<input
                                    id="subCollection"
                                    aria-label="Podsbírka"
                                    placeholder={sourceControl(form.subCollection,'Podsb_S').placeholder??'např. Výtvarné umění'}
                                    value={sourceControl(form.subCollection,'Podsb_S').value}
                                    onChange={(e: any) => setForm({ ...form, subCollection: e.target.value })}
                                />}
                            </div>
                        </div>

</div></section><div className="curator-card-markings">                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label htmlFor="signature" title="Signatura nebo nápis doložený na předmětu">Signatura / Nápis</label>
                                <input
                                    id="signature"
                                    value={rootControl(form.signature,'Sign_S').value}
                                    onChange={(e: any) => setForm({ ...form, signature: e.target.value })}
                                    placeholder={rootControl(form.signature,'Sign_S').placeholder??'např. J. Mánes 1865 vpravo dole'}
                                />{historicalReadout(form.signature,'Sign_S')}
                            </div>
                            <div className="space-y-1">
                                <label htmlFor="markant" title="Markant: rozpoznávací značky, punc nebo jiné specifické značení">Značení / Markant</label>
                                <input
                                    id="markant"
                                    value={rootControl(form.markant,'Markant_S').value}
                                    onChange={(e: any) => setForm({ ...form, markant: e.target.value })}
                                    placeholder={rootControl(form.markant,'Markant_S').placeholder??'např. ražená značka dílny, puncovní značka'}
                                />{historicalReadout(form.markant,'Markant_S')}
                            </div>
                        </div>

</div><div className="curator-card-panel curator-card-geography">                        <details open={fieldErrors.latitude||fieldErrors.longitude?true:undefined}><summary>Geografické souřadnice naleziště</summary>
                        {/* GPS A GEOGRAFICKÁ LOKACE */}
                        <div className="bg-gray-50 p-4 rounded border border-gray-200 space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                                    <FaMapMarkerAlt className="text-[#00204a]" /> Geografické souřadnice naleziště (GPS)
                                </h4>
                                {form.latitude && form.longitude && (
                                    <div className="flex gap-2">
                                        <a
                                            href={`https://mapy.cz/zakladni?q=${form.latitude},${form.longitude}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline"
                                        >
                                            <FaExternalLinkAlt className="text-[9px]" /> Mapy.cz
                                        </a>
                                        <a
                                            href={`https://www.google.com/maps?q=${form.latitude},${form.longitude}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-600 hover:underline"
                                        >
                                            <FaExternalLinkAlt className="text-[9px]" /> Google Maps
                                        </a>
                                    </div>
                                )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="space-y-1">
                                    <label htmlFor="latitude">Zeměpisná šířka (−90 až 90)</label>
                                    <input
                                        id="latitude"
                                        type="number"
                                        step="any"
                                        value={form.latitude !== null && form.latitude !== undefined ? form.latitude : ''}
                                        onChange={(e: any) => setForm({ ...form, latitude: e.target.value })}
                                        placeholder="např. 49.1951"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label htmlFor="longitude">Zeměpisná délka (−180 až 180)</label>
                                    <input
                                        id="longitude"
                                        type="number"
                                        step="any"
                                        value={form.longitude !== null && form.longitude !== undefined ? form.longitude : ''}
                                        onChange={(e: any) => setForm({ ...form, longitude: e.target.value })}
                                        placeholder="např. 16.6068"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label htmlFor="coordinateSystem">Souřadnicový systém</label>
                                    <select
                                        id="coordinateSystem"
                                        className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:border-[#00204a]"
                                        value={form.coordinateSystem || 'WGS-84'}
                                        onChange={e => setForm({ ...form, coordinateSystem: e.target.value })}
                                    >
                                        <option value="WGS-84">WGS-84 (GPS standard)</option>
                                        <option value="S-JTSK">S-JTSK (Křovák, Česko)</option>
                                        <option value="ETRS89">ETRS89 (Evropský systém)</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        </details>
                        {id&&!isViewMode&&import.meta.env.VITE_CURRENT_FLAGS_ENABLED==='true'
                            ?<div data-scoped-reference-editor ref={setArchiveTarget}/>
                            :itemValue('Archiv',rootArchive)}
</div><section className="curator-card-panel curator-card-additional" aria-label="Další evidenční údaje"><h3 className="curator-card-heading">Další evidenční údaje</h3><div className="curator-card-panel-body">

                        <div className="space-y-1"><label htmlFor="quantity">{form.quantity==null&&historicalFields?.Pocet_S!=null?`Současný katalogový počet · historický počet: ${demusText(historicalFields.Pocet_S)}`:'Současný katalogový počet'}</label>
                            <input id="quantity" type="number" step="1" value={form.quantity??''}
                                onChange={e=>setForm((prev:any)=>({...prev,quantity:e.target.value===''?null:Number(e.target.value)}))}/>
                            {fieldErrors.quantity&&<p role="alert">{fieldErrors.quantity}</p>}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {originalIntegrationEnabled()&&id&&form._cardStatements
                            ?<div className="space-y-1"><label htmlFor="custodianCode">Správce sbírky (kód)</label>
                                <input id="custodianCode" maxLength={255} value={isViewMode?custodianValue??rootText('Spravce_S')??'':form.custodianCode??''}
                                    placeholder={custodianValue==null?rootText('Spravce_S')??undefined:undefined}
                                    onChange={e=>setForm((previous:any)=>({...previous,custodianCode:e.target.value}))}/>
                            </div>
                            :<div className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <label htmlFor="spravce">Správce sbírky</label>
                                    <button
                                        type="button"
                                        data-scoped-reference-editor={managed.enabled?true:undefined} disabled={managed.enabled&&(isViewMode||!managed.canCreate('SPRAVCE'))} title={managed.enabled&&!managed.canCreate('SPRAVCE')?'Vyžaduje dictionary.write, aktuální verzi a uložené změny.':undefined} onClick={() => openDictModal('SPRAVCE', 'Správce fondu', 'spravce')}
                                        className="text-[10px] font-bold text-blue-600 hover:text-blue-800 underline"
                                    >
                                        + Nový
                                    </button>
                                </div>
                                {managed.enabled?managedSelect('CUSTODIAN','spravce','— bez správce —'):<select
                                    id="spravce"
                                    className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:border-[#00204a]"
                                    value={form.spravce || ''}
                                    onChange={e => setForm({ ...form, spravce: e.target.value })}
                                >
                                    <option value="">-- Vyberte správce --</option>
                                    {form.spravce && !dicts.spravci?.includes(form.spravce) && (
                                        <option value={form.spravce}>{form.spravce}</option>
                                    )}
                                    {dicts.spravci?.map((s: string) => (
                                        <option key={s} value={s}>
                                            {s}
                                        </option>
                                    ))}
                                </select>}
                            </div>}




                        </div>

                        {!id && (
                            <div className="pt-2 border-t border-gray-100">
                                <div className="flex items-center gap-2 mb-2">
                                    <input
                                        type="checkbox"
                                        id="bulkMode"
                                        data-scoped-bulk-control disabled={!originalCanClone()} checked={bulkMode}
                                        onChange={e => setBulkMode(e.target.checked)}
                                        className="rounded border-gray-300 text-[#00204a]"
                                    />
                                    <label htmlFor="bulkMode" className="text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer">
                                        Režim hromadného založení duplikátů
                                    </label>
                                </div>
                                {bulkMode && !originalIntegrationEnabled() && (
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-blue-50/50 rounded border border-blue-100">
                                        <div className="space-y-1">
                                            <label htmlFor="bulkCount">Počet duplikátů</label>
                                            <input
                                                id="bulkCount"
                                                type="number"
                                                value={bulkParams.count}
                                                onChange={(e: any) => setBulkParams({ ...bulkParams, count: parseInt(e.target.value, 10) || 1 })}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label htmlFor="titleSuffix">Přípona názvu</label>
                                            <input
                                                id="titleSuffix"
                                                value={bulkParams.titleSuffix}
                                                onChange={(e: any) => setBulkParams({ ...bulkParams, titleSuffix: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label htmlFor="invNumSuffix">Přípona inv. čísla</label>
                                            <input
                                                id="invNumSuffix"
                                                value={bulkParams.invNumSuffix}
                                                onChange={(e: any) => setBulkParams({ ...bulkParams, invNumSuffix: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {!id&&originalIntegrationEnabled()&&bulkMode&&<div className="space-y-1"><label htmlFor="bulkInventoryNumbers">Nová inventární čísla duplikátů — jedno na řádek</label><textarea id="bulkInventoryNumbers" data-scoped-bulk-control value={bulkNumbers} maxLength={5120} onChange={e=>setBulkNumbers(e.target.value)}/><p>Nejvýše 20 kopií navíc k předloze, shodný název a podporované současné údaje. Čísla se negenerují. Každá kopie se uloží samostatně; při chybě se dávka zastaví. Přírůstkové číslo se nekopíruje.</p><CloneGroupSelection value={bulkCopyGroups} onChange={setBulkCopyGroups} disabled={loading||!!bulkOutcome}/></div>}
                        {bulkOutcome&&<section data-scoped-navigation aria-label="Výsledek hromadného založení"><p>Předloha byla uložena: #{bulkOutcome.baseId}. Dávku znovu neodesílejte.</p><ul>{bulkOutcome.rows.map(row=><li key={row.requestId}>{row.inventoryNumber}: {row.state}{row.id?` · #${row.id}`:''}{row.message?` · ${row.message}`:''}{row.state==='UNCONFIRMED'?` · požadavek ${row.requestId}; výsledek musí být ověřen, neodesílejte znovu`:''}</li>)}</ul><button data-scoped-navigation type="button" onClick={()=>navigate(`/admin/items/view/${bulkOutcome.baseId}?catalog=${originalSession().catalog.id}`)}>Otevřít uloženou předlohu</button></section>}

</div></section></div></fieldset>:null;
    const supplementaryRight=activeTab==='identity'?<fieldset disabled={loading||auditSaving||isViewMode} className="curator-card-supplement"><section className="curator-card-panel " aria-label="Číselníkové zařazení předmětu"><h3 className="curator-card-heading">Číselníkové zařazení předmětu</h3><div className="curator-card-panel-body">                        {/* Hierarchické číselníky pro základní zařazení */}
                        <div className="pt-3 border-t border-gray-200" data-classification-intro>
                            <h4 className="text-xs font-black text-gray-700 uppercase tracking-wider mb-2">
                                Číselníkové zařazení předmětu
                            </h4>
                            {!(id&&import.meta.env.VITE_CURRENT_FLAGS_ENABLED==='true')&&<MuseumSection snapshotRequired drafts={sectionDrafts} editSession={editSessionRef.current} readOnly={isViewMode} itemId={id ? Number(id) : undefined} section="basic" key={editSessionRef.current?.etag} onSave={handleSectionSave} />}

                        </div>
                        {form._completion&&!isViewMode?<label className="space-y-1">Poznámka<textarea id="cardNote" rows={2} maxLength={4096}
                           value={form.cardNote??''} placeholder={form.cardNote==null?rootText('Pozn_S'):undefined}
                           onChange={event=>setForm((previous:any)=>({...previous,cardNote:event.target.value}))}/>
                        </label>:itemValue('Poznámka',form.cardNote??rootText('Pozn_S'))}
                        <div className="space-y-1">{itemValue('Plus 1 (text)',rootText('Plus1T_S'))}
                            {itemValue('Plus 2 (text)',rootText('Plus2T_S'))}{itemValue('Plus 3 (číslo)',dateEvidence('Plus3C_S'))}
                            {tabEditor('Plus','Otevřít evidenci Plus')}
                        </div>
                    </div></section></fieldset>:null;
    return (
        <div className="curator-item-form space-y-3 animate-in fade-in duration-300" data-new-item={!id} data-item-layout="flow" data-item-mode={isViewMode ? 'view' : 'edit'}>
                {/* HLAVIČKA FORMULÁŘE */}
                <div className="demus-toolbar flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                    <div className="flex items-center gap-3 min-w-0 max-w-xl">
                        <GovButton
                            nativeType="button"
                            type="outlined"
                            color="neutral"
                            size="s"
                            data-scoped-navigation="true" onClick={handleBackToList}
                            title="Zpět na seznam předmětů se zachováním filtrů a stránkování"
                        >
                            ← {originalIntegrationEnabled()&&id&&!isViewMode?'Zrušit a zpět na detail':'Zpět na seznam'}
                        </GovButton>
                    {originalIntegrationEnabled()&&isViewMode&&pagePosition>=0&&<span className="flex flex-top">
                        <GovButton nativeType="button" type="outlined" color="neutral" size="s" data-scoped-navigation="true" disabled={pagePosition===0} onClick={()=>openNeighbour(-1)} title="Předchozí předmět na načtené stránce seznamu">Předchozí předmět</GovButton>
                        <GovButton nativeType="button" type="outlined" color="neutral" size="s" data-scoped-navigation="true" disabled={pagePosition===pageIds.length-1} onClick={()=>openNeighbour(1)} title="Následující předmět na načtené stránce seznamu">Následující předmět</GovButton>
                    </span>}
                        <div className="min-w-0">
                            <h3 className="text-sm font-bold text-gray-900">
                                {id
                                    ? `Kurátorský detail: ${form.inventoryNumber || form.accessionNumber || `#${id}`}${form.title ? ` | ${form.title}` : ''}`
                                    : `Založení nového sbírkového předmětu${form.inventoryNumber?' · '+form.inventoryNumber:''}`}
                            </h3>
                        </div>
                    </div>
                <div className="flex items-center gap-2.5 flex-wrap">
                    {!isViewMode && <button type="submit" form="item-editor" className="demus-save"
                        data-scoped-save="true" disabled={saveDisabled}>
                        {loading ? 'Ukládám…' : 'Uložit'}
                    </button>}
                    {isViewMode && (
                        <span className="px-3 py-1 bg-blue-100 text-blue-900 border border-blue-300 rounded-full text-xs font-bold flex items-center gap-1.5">
                            <span>👁️</span> Režim prohlížení (pouze pro čtení)
                        </span>
                    )}
                    {isViewMode && id && (
                        <GovButton
                            nativeType="button"
                            type="solid"
                            color="primary"
                            size="s"
                            data-scoped-navigation="true" disabled={originalIntegrationEnabled()&&!originalCanEdit('professional')&&!originalCanEdit('inventory')} title="Upravit předmět podle oprávnění" onClick={() => navigate(originalIntegrationEnabled()?originalEditHref(Number(id),originalCanEdit('professional')?'professional':'inventory'):`/admin/items/edit/${id}`, { state: {...location.state,detailReturn:location.pathname+location.search} })}
                        >
                            ✏️ Upravit předmět
                        </GovButton>
                    )}
                    <div className="flex items-center bg-gray-50 border rounded-full px-3 py-1 gap-2">
                        <span className={`text-[10px] font-black uppercase ${form.published ? 'text-green-600' : 'text-gray-400'}`}>
                            {form.published ? '● Zveřejněno' : '○ Neveřejné'}
                        </span>
                        <input
                            type="checkbox"
                            aria-label="Zveřejněno"
                            disabled={isViewMode||loading||auditSaving||originalIntegrationEnabled()} title={originalIntegrationEnabled()?'Zveřejnění není součástí scoped zapisovatelného kontraktu':undefined}
                            checked={form.published || false}
                            onChange={e => setForm({ ...form, published: e.target.checked })}
                            className="cursor-pointer rounded border-gray-300 text-[#00204a] focus:ring-0"
                            style={{ width: '16px', height: '16px' }}
                        />
                    </div>
                    {id && (
                        <>
                            <GovButton
                                nativeType="button"
                                type="outlined"
                                color="neutral"
                                size="s"
                                onClick={() => setShowPrintCard(true)}
                            >
                                🖨️ Tisk karty
                            </GovButton>
                            <input type="file" id="photo-up" data-scoped-media disabled={isViewMode||originalIntegrationEnabled()&&!scopedCanWriteMedia()} hidden onChange={handleFileChange} accept="image/*" />
                            <GovButton
                                nativeType="button"
                                type="outlined"
                                color="neutral"
                                size="s"
                                data-scoped-media disabled={uploading || isViewMode || originalIntegrationEnabled()&&!scopedCanWriteMedia()}
                                onClick={() => document.getElementById('photo-up')?.click()}
                            >
                                {uploading ? 'Nahrávám...' : '📸 Nahrát foto'}
                            </GovButton>
                            <GovButton
                                nativeType="button"
                                type="outlined"
                                color="primary"
                                size="s"
                                data-scoped-navigation="true" disabled={originalIntegrationEnabled()&&!originalCanClone()} title="Nezávislé klonování podle katalogového oprávnění" onClick={() => setCloneModalOpen(true)}
                            >
                                📋 Klonovat
                            </GovButton>
                        </>
                    )}
                    <div id="item-current-audit" data-current-audit="true"/>
                </div>
            </div>

            <form id="item-editor" noValidate onSubmit={handleSubmit} className="space-y-3">
            {/* Identifikace, příznaky a záložky sdílejí běžný tok formuláře. */}
            <PermanentIdentificationHeader
                pinIdentity
                catalogSummary={form.catalogSummary}
                summaryUnchanged={{accessionNumber:form.accessionNumber===persistedSnapshotRef.current?.accessionNumber,author:form.author===persistedSnapshotRef.current?.author,datingText:form.datingText===persistedSnapshotRef.current?.datingText}}
                itemId={id ? Number(id) : undefined}
                readHistorical={originalIntegrationEnabled() && !!id}
                parentEtag={editSessionRef.current?.etag}
                identityEvidence={id&&originalIntegrationEnabled()?<OriginalSourceBridgeIdentity itemId={Number(id)} section="identity" etag={editSessionRef.current?.etag} compactIdentity/>:undefined}
                editors={topEditors?{numbers:<div className="curator-card-id-pair">{topEditors.numbers}{registration}</div>}:undefined}
                accessionNumber={form.accessionNumber}
                fond={managed.label('FUND')||currentFundLabel||(isViewMode?historicalFund:undefined)}
                predmet={form.objectType?.trim()?form.objectType:managed.label('OBJECT_TYPE')||(isViewMode?historicalType:undefined)}
                popis={form.description}
                showDescription={false}
                titul={isViewMode?sourceControl(form.title,'Titul_S').value:form.title}
                autor={currentAuthor?.trim()?currentAuthor:managed.label('AUTHOR')||assignedAuthorCaption||(isViewMode?rootControl(form.author,'Autor_S').value:undefined)}
                datace={currentDating||(isViewMode?rootControl(form.datingText,'Datace_S').value:undefined)}
                clearedHistoryFields={originalIntegrationEnabled()&&id?['Autor','Datace','Popis'].filter(label=>({Autor:form.author,Datace:form.datingText,Popis:form.description})[label as 'Autor'|'Datace'|'Popis']===''):undefined}
                inventoryNumber={form.inventoryNumber}
                quantity={form.quantity}
                isViewMode={isViewMode}
                isNew={!id}
            />

            {!topEditors&&registration}
            {managed.enabled&&managed.error&&<p role="alert">{managed.error}</p>}
                        {id && <TechnicalDemus title="Zápis a audit změn"><div className="curator-record-history"><div>
                            {!originalIntegrationEnabled()&&<><p>Založil v MESonline: {form.createdByUser || '—'}</p><p>Datum založení v MESonline: {form.createdAt || '—'}</p>
                            <p>Změnil v MESonline: {form.modifiedByUser || '—'}</p><p>Poslední změna v MESonline: {form.lastModifiedAt || '—'}</p></>}
                            <p>Zapsal: {historicalFields?demusText(historicalFields.Zapsal_S):form.legacyCreatedBy || '—'}{historicalFields?` · Určil: ${demusText(historicalFields.Urcil_S)}`:''}</p><p>Datum zápisu: {historicalFields?demusText(historicalFields.DatZap_S):form.legacyCreatedAt || '—'}</p>
                            <p>Změnil: {form.legacyUpdatedBy || '—'}</p><p>Datum změny: {historicalFields?demusText(historicalFields.DatZm_S):form.legacyUpdatedAt || '—'}</p>
                        </div>
                        {originalIntegrationEnabled()&&<CreationOrigin itemId={Number(id)} parentEtag={editSessionRef.current?.etag}/>}
                        </div></TechnicalDemus>}
            {id && !originalIntegrationEnabled() && <InventoryIdentityPanel key={originalIntegrationEnabled()?editSessionRef.current?.etag:undefined} itemId={Number(id)} inventoryNumber={form.inventoryNumber || ''}
                canEdit={!isViewMode && !loading && !auditSaving && form.inventoryNumber === initialNumbers.inventory} onSaved={async () => {
                    const fresh = await getAdminItem(id);
                    if (persistedSnapshotRef.current) persistedSnapshotRef.current = {...persistedSnapshotRef.current, inventoryNumber:fresh.inventoryNumber};
                    await synchronizeMediaVersion(fresh);
                    if (initialFormSnapshotRef.current) {
                        const baseline={...initialFormValuesRef.current};baseline.inventoryNumber=fresh.inventoryNumber ?? '';
                        initialFormValuesRef.current=baseline;
                        initialFormSnapshotRef.current=getFormSnapshot(baseline);
                    }
                    setForm((previous: any) => ({ ...previous, inventoryNumber: fresh.inventoryNumber ?? '' }));
                    setInitialNumbers(previous => ({ ...previous, inventory: fresh.inventoryNumber ?? '' }));
                }} />}
            <div className="curator-card-tab-bar"><nav className="demus-original-tabs" aria-label="Karty DEMUS">
                {[['Základ','identity',''],['Určení','museum','determination'],['Vznik','museum','origin'],
                    ['MatTech','description',''],['Míry','dimensions',''],['Zařazení','museum','classification'],
                    ['Historie','museum','demus'],['Dokumentace','museum','documentation'],['Reference','museum','reference'],
                    ['Manipulace','museum','manipulation'],['Akce','museum','action'],['ISO','museum','iso'],
                    ['Plus','museum','plus'],['Vyřazení','museum','deaccession'],['Akvizice','provenance',''],
                    ['Číselníkové vazby','museum','vocabularies'],['Přílohy','museum','attachments'],['Umístění','storage',''],['Foto','photos',''],['Audit','museum','audit']].map(([label, main, sub]) =>
                    <button key={label} type="button" data-tab-name={label} aria-pressed={activeTab === main && (!sub || museumSubTab === sub)}
                        onClick={() => {setActiveTab(main); if (sub) setMuseumSubTab(sub as any);}}>{label === 'Přílohy' ? `Přílohy (${originalIntegrationEnabled()&&!scopedMedia.loaded?'neověřeno':galleryAttachments.length})` : label}</button>)}
            </nav></div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="curator-card-main demus-editor" aria-label="Hlavní odborné údaje">
                        <section aria-label="Identifikace a vznik" className="curator-card-column">
<section className="curator-card-panel" aria-label="Základní identifikace"><h3 className="curator-card-heading">Základní identifikace</h3><div className="curator-card-panel-body curator-card-identification">
                           <div className="curator-card-pair">
                            {topEditors?.Fond??itemValue('Fond',managed.label('FUND')||currentFundLabel||historicalFund)}
                            {!isViewMode&&managed.enabled?cardManagedField('GROUP','Skupina'):itemValue('Skupina',managed.label('GROUP')||rootText('Skupina_S'))}
                           </div>
                           {topEditors?.Předmět??itemValue('Předmět',form.objectType??(managed.label('OBJECT_TYPE')||historicalType))}
                           <div className="curator-card-pair">
                            {!isViewMode&&id&&originalIntegrationEnabled()
                              ?<div data-scoped-reference-editor ref={setDeterminerTarget}/>
                              :itemValue('Určil',authorityValues?.determinedByText??rootText('Urcil_S'))}
                            {form._completion&&!isViewMode?<label className="curator-card-field" title="DatUrč: datum odborného určení">
                               Datum určení<input type="date" id="determinationDate" value={form.determinationDate??''}
                                 onChange={event=>setForm((previous:any)=>({...previous,determinationDate:event.target.value}))}/>
                            </label>:itemValue('Datum určení',form.determinationDate??dateEvidence('DatUrc_S'))}
                           </div>
                           {topEditors?.Titul??itemValue('Titul',sourceControl(form.title,'Titul_S').value)}
                           <div className="curator-card-pair curator-card-author">
                            {topEditors?.Autor??itemValue('Autor',form.author===''?'':currentAuthor||managed.label('AUTHOR')||assignedAuthorCaption||rootText('Autor_S'))}
                            {isViewMode?itemValue('Role',roleText):<div className="curator-card-field"><label htmlFor="authorRole">Role</label>{primaryRoleEditor}</div>}
                           </div>
                           <div className="curator-card-pair curator-card-dating">
                           {topEditors?.Datace??itemValue('Datace',form.datingText===''?'':currentDating||rootText('Datace_S'))}
                           {isViewMode?<div className="curator-card-pair">
                            {itemValue('Rok od',form.yearFrom??rootText('RokOd_S'))}{itemValue('Rok do',form.yearTo??rootText('RokDo_S'))}
                           </div>:form._completion?<div className="curator-card-pair">
                            <label className="curator-card-field" title="Počáteční rok odborné datace">Rok od
                              <input id="yearFrom" type="number" min="-32768" max="32767" step="1" value={form.yearFrom??''}
                                placeholder={rootText('RokOd_S')} onChange={event=>setForm((previous:any)=>({...previous,yearFrom:event.target.value}))}/>
                            </label>
                            <label className="curator-card-field" title="Koncový rok odborné datace">Rok do
                              <input id="yearTo" type="number" min="-32768" max="32767" step="1" value={form.yearTo??''}
                                placeholder={rootText('RokDo_S')} onChange={event=>setForm((previous:any)=>({...previous,yearTo:event.target.value}))}/>
                            </label>
                           </div>:fullCalendarDating}
                           </div>
                           {isViewMode?itemValue('Místo vzniku',form.originPlace??rootText('MistoVz_S')):<>                            <div className="curator-card-field">
                                <label htmlFor="originPlace">Místo vzniku</label>
                                <input
                                    id="originPlace"
                                    value={rootControl(form.originPlace,'MistoVz_S').value}
                                    onChange={(e: any) => setForm({ ...form, originPlace: e.target.value })}
                                    placeholder={rootControl(form.originPlace,'MistoVz_S').placeholder??'např. Brno, Vídeň, Čechy'}
                                />
                            </div>
</>}
                           {form._completion&&!isViewMode?<label className="curator-card-field" title="PoznVz: odborná poznámka ke vzniku předmětu">
                            Poznámka ke vzniku<textarea id="originNote" rows={1} maxLength={4096} value={form.originNote??''}
                              placeholder={form.originNote==null?rootText('PoznVz_S'):undefined}
                              onChange={event=>setForm((previous:any)=>({...previous,originNote:event.target.value}))}/>
                           </label>:itemValue('Poznámka ke vzniku',form.originNote??rootText('PoznVz_S'))}
                           {isViewMode||!managed.enabled?itemValue('Lokalita',managed.label('LOCALITY')||rootText('Lokalita_S')):<>{cardManagedField('LOCALITY','Lokalita')}</>}
                           {managed.value('LOCALITY')&&<div data-scoped-reference-editor><LocalityActions id={managed.value('LOCALITY')} disabled={isViewMode||loading||managed.busy} onChanged={managed.refresh}/></div>}
                           {managed.value('LOCALITY')&&<a className="underline" href={'/admin/dictionaries?catalog='+originalSession().catalog.id+'&type=LOCALITY&value='+encodeURIComponent(managed.value('LOCALITY'))+(id?'&returnTo='+encodeURIComponent(location.pathname+location.search):'')} target="_blank" rel="noopener">Detail lokality</a>}
                           {id&&<TechnicalDemus title="Doklady lokality"><HistoricalLocalityDetails itemId={Number(id)} etag={editSessionRef.current?.etag}/></TechnicalDemus>}
</div></section>{supplementaryLeft}
                        </section>
                        <section aria-label="Popis a fyzická evidence" className="curator-card-column">
<section className="curator-card-panel curator-card-description" aria-label="Popis"><h3 className="curator-card-heading">Popis</h3><div className="curator-card-panel-body">
                           {isViewMode?itemValue('Popis',form.description??rootText('Popis_S')):<>                        {/* Popis předmětu */}
                        <div className="space-y-1">
                            <label htmlFor="description">Popis předmětu</label>
                            <textarea
                                id="description"
                                rows={3}
                                className="w-full bg-white border border-gray-300 rounded px-3 py-1.5 text-xs text-gray-800 focus:outline-none focus:border-[#00204a]"
                                value={rootControl(form.description,'Popis_S').value}
                                onChange={e => setForm({ ...form, description: e.target.value })}
                                placeholder={rootControl(form.description,'Popis_S').placeholder??'Podrobný popis vizuálního stavu, námětu, barevnosti...'}
                            />
                        </div>

</>}
</div></section>
<section className="curator-card-panel" aria-label="Materiál a technika"><h3 className="curator-card-heading">Materiál a technika</h3><div className="curator-card-panel-body">
                           <div className="curator-card-material">
<div className="curator-card-material-row">{itemValue('Materiál',form.catalogSummary&&(isViewMode||form.material===persistedSnapshotRef.current?.material)?form.catalogSummary.material.map((v:{value:string})=>v.value).join(' · '):form.material??rootText('Material_S'))}
                            <details><summary>Číselník materiálů</summary>
                             <ThreeLevelDictionarySelect type="MATERIAL" historicalSlots={form._historicalAuthorities} onHistoricalSlotChange={(position,source)=>setForm((p:any)=>{const key=position===1?"MATERIAL":"MATERIAL_"+position;const bindings={...(p._historicalAuthorities??{})};if(source)bindings[key]=source;else delete bindings[key];return {...p,_historicalAuthorities:bindings};})} sourceValue={form._historicalAuthorities?.MATERIAL} onHistoricalChange={source=>setForm((p:any)=>{const bindings={...(p._historicalAuthorities??{})};if(source)bindings.MATERIAL=source;else delete bindings.MATERIAL;return {...p,_historicalAuthorities:bindings};})} label="Materiál (Číselník)" scoped={originalIntegrationEnabled()} readOnly={isViewMode} historicalValue={historicalControl(form.material,rootText('Material_S'),true).value} historicalSource={(!form.material||!String(form.material).trim())&&!!rootText('Material_S')} value={form.materialDictionaryId ?? null}
                                onChange={dictionaryId => setForm((prev: any) => ({ ...prev, materialDictionaryId: dictionaryId }))} />
                            </details>
</div><div className="curator-card-material-row">{itemValue('Technika',form.catalogSummary&&(isViewMode||form.technique===persistedSnapshotRef.current?.technique)?form.catalogSummary.technique.map((v:{value:string})=>v.value).join(' · '):form.technique??rootText('Technika_S'))}
                            <details><summary>Číselník technik</summary>
                             <ThreeLevelDictionarySelect type="TECHNIQUE" historicalSlots={form._historicalAuthorities} onHistoricalSlotChange={(position,source)=>setForm((p:any)=>{const key=position===1?"TECHNIQUE":"TECHNIQUE_"+position;const bindings={...(p._historicalAuthorities??{})};if(source)bindings[key]=source;else delete bindings[key];return {...p,_historicalAuthorities:bindings};})} sourceValue={form._historicalAuthorities?.TECHNIQUE} onHistoricalChange={source=>setForm((p:any)=>{const bindings={...(p._historicalAuthorities??{})};if(source)bindings.TECHNIQUE=source;else delete bindings.TECHNIQUE;return {...p,_historicalAuthorities:bindings};})} label="Technika (Číselník)" scoped={originalIntegrationEnabled()} readOnly={isViewMode} historicalValue={historicalControl(form.technique,rootText('Technika_S'),true).value} historicalSource={(!form.technique||!String(form.technique).trim())&&!!rootText('Technika_S')} value={form.techniqueDictionaryId ?? null}
                                onChange={dictionaryId => setForm((prev: any) => ({ ...prev, techniqueDictionaryId: dictionaryId }))} />
                            </details>
</div>
                           {!isViewMode&&scopedDomain==='professional'&&<details><summary>Doplnit volný text materiálu a techniky</summary>
                    {originalIntegrationEnabled()&&!isViewMode&&scopedDomain==='professional'&&<div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><label className="space-y-1">Materiál — volný text<input id="current-material-text" value={rootControl(form.material,'Material_S').value} placeholder={rootControl(form.material,'Material_S').placeholder} onChange={e=>setForm((prev:any)=>({...prev,material:e.target.value}))}/>{historicalReadout(form.material,'Material_S')}</label><label className="space-y-1">Technika — volný text<input id="current-technique-text" value={rootControl(form.technique,'Technika_S').value} placeholder={rootControl(form.technique,'Technika_S').placeholder} onChange={e=>setForm((prev:any)=>({...prev,technique:e.target.value}))}/>{historicalReadout(form.technique,'Technika_S')}</label></div>}
                           </details>}
                           {isViewMode?itemValue('Poznámka k materiálu a technice',form.materialNote??rootText('PoznMT_S')):<>                        {/* Poznámka k materiálu a technice (DEMUS: PoznMT) */}
                        <div className="space-y-1">
                            <label htmlFor="materialNote" title="PoznMT: doplňující odborná poznámka k materiálu a technice">Poznámka k materiálu a technice</label>
                            <textarea
                                id="materialNote"
                                rows={2}
                                className="w-full bg-white border border-gray-300 rounded px-3 py-1.5 text-xs text-gray-800 focus:outline-none focus:border-[#00204a]"
                                value={rootControl(form.materialNote,'PoznMT_S').value}
                                onChange={e => setForm({ ...form, materialNote: e.target.value })}
                                placeholder={rootControl(form.materialNote,'PoznMT_S').placeholder}
                            />{historicalReadout(form.materialNote,'PoznMT_S')}
                        </div></>}
                           <div className="curator-card-actions">
                            {itemValue('Souhrn měr',[currentDimensionSummary,sourceMeasureSummary].filter(Boolean).join(' · ')||null)}
                            {tabEditor('Míry','Otevřít míry')}
                           </div>
</div></div></section>
<section className="curator-card-panel" aria-label="Umístění a stav"><h3 className="curator-card-heading">Umístění a stav</h3><div className="curator-card-panel-body">
                           {visibleLocation&&<div className="curator-card-pair curator-card-location">
                            {itemValue('Stálá lokace',form.permanentLocation??rootText('StLokace_S'))}
                            <div className="curator-card-actions">
                             {itemValue('Aktuální lokace',[form.locationBuilding,form.locationRoom].filter(Boolean).join(' · ')||rootText('AktLokace_S'))}
                             {tabEditor('Umístění','Otevřít umístění')}
                            </div>
                           </div>}
                           <div className="curator-card-pair curator-card-state">
                           {isViewMode?itemValue('Stav předmětu',form.objectCondition):<>                            <div className="space-y-1">
                                <label htmlFor="objectCondition">Stav předmětu</label>
                                <select
                                    id="objectCondition"
                                    className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:border-[#00204a]"
                                    value={form.objectCondition ?? ''}
                                    onChange={e => setForm({ ...form, objectCondition: e.target.value })}
                                >
                                    <option value="">—</option>
                                    {form.objectCondition&&!['Výborný','Dobrý','Poškozeno','Havarijní'].includes(form.objectCondition)&&<option value={form.objectCondition}>{form.objectCondition}</option>}
                                    <option>Výborný</option>
                                    <option>Dobrý</option>
                                    <option>Poškozeno</option>
                                    <option>Havarijní</option>
                                </select>
                            </div></>}
                           {<div className="curator-card-value" title="Datum z evidence stavu. U předmětu bez doložené vazby se nezobrazuje."><strong>Datum stavu</strong><output>—</output></div>}
                           {itemValue('Datum změny',dateEvidence('DatZm_S')??historicalFields?.DatZm_S)}
                           </div>
</div></section>{supplementaryRight}
                        </section>
                    </div>



            {id&&originalIntegrationEnabled()&&!isViewMode&&<div className="curator-card-secondary">
              <button type="button" data-scoped-navigation="true" aria-expanded={showScopedAuthorities}
                onClick={()=>setShowScopedAuthorities(value=>!value)} className="underline">
                {showScopedAuthorities?'Skrýt související odborné vazby':'Otevřít současné odborné vazby (Fond, Podsbírka, Skupina, Určil, Role autora) a rozsah inv. čísla'}
              </button>
              <AuthorityAndRangeBindings exact={form._completion===true} itemId={Number(id)} drafts={sectionDrafts}
                determinerTarget={determinerTarget} detailsOpen={showScopedAuthorities||activeTab==='museum'&&museumSubTab==='vocabularies'} recordedDeterminer={rootText('Urcil_S')} parentEtag={completionItemVersion}
                readOnly={hasUnsavedChanges('rangeBindings')||scopedNeedsReload||loading}
                onSave={etag=>{const session=editSessionRef.current as any;if(session?.scopedCurrent){session.etag=etag;session.scopedCurrent.etag=etag;}return handleSectionSave();}}/>
            </div>}
            {originalIntegrationEnabled() && activeTab!=='identity' && id && <OriginalSourceBridge key={`${id}:${editSessionRef.current?.etag}`} itemId={Number(id)} etag={editSessionRef.current?.etag} section={activeTab === 'museum' ? museumSubTab : activeTab} showDimensionEvidence={form._cardStatements===true}/>}
            {/* CHYBOVÉ A ÚSPĚŠNÉ HLÁŠKY */}
            {successMessage && (
                <div className="mx-6 mt-4 p-3 bg-green-50 border-l-4 border-green-600 text-xs text-green-800 font-bold rounded flex justify-between items-center animate-in fade-in duration-200">
                    <span>✓ {successMessage}</span>
                    <button type="button" onClick={() => setSuccessMessage(null)} className="text-green-700 hover:text-green-900 font-bold ml-2">✕</button>
                </div>
            )}
            {conflictError && (
                <div className="mx-6 mt-4 p-3 bg-red-50 border-l-4 border-red-600 text-xs text-red-700 font-bold rounded">
                    ⚠️ {conflictError}
                    {id && <button type="button" className="block underline mt-2" onClick={async () => {
                        try { setComparison(await getAdminItem(id)); } catch (e) {setGlobalError((e as Error).message);}
                    }}>Porovnat s aktuálním záznamem</button>}
                    {comparison && <div className="overflow-auto mt-2">
                        <table><thead><tr><th>Pole</th><th>Moje zadání</th><th>Aktuální záznam</th></tr></thead>
                            <tbody>{Object.keys(originalIntegrationEnabled()?JSON.parse(getFormSnapshot(form)):buildItemPayload(form)).filter(key => JSON.stringify(form[key]) !== JSON.stringify(comparison[key])).map(key =>
                                <tr key={key}><td>{key}</td><td>{JSON.stringify(form[key])}</td><td>{JSON.stringify(comparison[key])}</td></tr>)}</tbody></table>
                        <p>Rozpracované odborné sekce zůstávají zachovány. Pro jejich změny obnovte záznam a porovnejte původní evidenci.</p>
                    </div>}
                </div>
            )}
            {globalError && (
                <div role="alert" className="mx-6 mt-4 p-3 bg-red-50 border-l-4 border-red-600 text-xs text-red-700 font-bold rounded">
                    ⚠️ {globalError}
                    {Object.entries(fieldErrors).length>0&&<ul>{Object.entries(fieldErrors).map(([key,message])=><li key={key}><button type="button" data-scoped-navigation="true" className="underline" onClick={()=>focusInvalidField(key)}>{message}</button></li>)}</ul>}
                </div>
            )}

            {/* TĚLO FORMULÁŘE */}
            {isViewMode && id && activeTab === 'museum' && museumSubTab === 'demus' && <DemusSourceIdentity itemId={Number(id)}/>}
            {isViewMode && id && activeTab === 'museum' && museumSubTab === 'vocabularies' && <>{originalIntegrationEnabled()&&<AuthorityAndRangeBindings exact={form._completion===true} itemId={Number(id)} readOnly/>}<VocabularyAssociations itemId={Number(id)} data={(editSessionRef.current?.museumSnapshot as any)?.vocabularies}/></>}
            {isViewMode && id && activeTab === 'museum' && museumSubTab === 'attachments' && <section className="demus-source-panel" aria-label="Přílohy pro čtení">
                <h3>Přílohy ({galleryAttachments.length})</h3>{mediaStatus}
                {!galleryAttachments.length && <p>{originalIntegrationEnabled()?'Přílohy na načtené scoped stránce: žádné. Úplnost závisí na dokončeném čtení všech stran.':'Žádné přílohy nebyly vráceny.'}</p>}
                <ul>{galleryAttachments.map((att:any)=><li key={att.id} className="flex items-center justify-between gap-2">
                    <span>{att.originalFilename||att.filename||att.fileName||'Příloha'} {att.caption}</span>
                    <button type="button" onClick={async()=>{try{if(originalIntegrationEnabled())await scopedMedia.download(att.entry);else await downloadAttachmentFile(Number(id),att.id,att.originalFilename||att.filename||'priloha');}catch(e){setGlobalError('Stažení přílohy selhalo: '+(e as Error).message);}}}>Stáhnout</button>
                </li>)}</ul>
            </section>}
            <EditorNavigationGuard isDirty={hasUnsavedChanges} isSaving={() => mainSaveRef.current || auditSaving || !!editSessionRef.current?.busy}/>
            {!id&&originalIntegrationEnabled()&&createUncertain&&<p role="alert">Výsledek založení nebyl potvrzen. Nevytvářejte další požadavek. <button type="button" disabled={loading} onClick={async()=>{if(!creationKeyRef.current)return;setLoading(true);try{const result=await originalCreationOutcome(creationKeyRef.current);initialFormSnapshotRef.current='';navigate(`/admin/items/view/${result.value.item.id}?catalog=${result.value.item.catalogId}`,{replace:true});}catch{setGlobalError('Založení zatím nebylo potvrzeno. Uchovejte draft a ověřte výsledek znovu; další záznam nebyl automaticky odeslán.');}finally{setLoading(false);}}}>Ověřit výsledek založení</button></p>}
            {(location.state as any)?.creationNotice&&<p role="status">{(location.state as any).creationNotice}</p>}
            {isViewMode&&activeTab==='museum'&&museumSubTab==='documentation'&&documentationFiles}
            <p className="sr-only">{originalIntegrationEnabled()?(!id?'Nový předmět: základní údaje vyplňte v horním panelu. Přírůstkové číslo je nepovinné. Současné odborné údaje lze doplnit také před uložením podle oprávnění.':'Změny se ukládají podle oprávnění. Původní záznamy a jejich doklady zůstávají zachované.'):'Uložit: hlavní údaje a základní příznaky včetně Archivu. Odborné záznamy a akvizice ukládejte v příslušné sekci.'}</p>
            <div id="item-editor-body" className="p-6 space-y-4 demus-editor">
                <fieldset disabled={loading || auditSaving || (isViewMode && activeTab !== 'photos')}>
                {/* 1. ZÁKLADNÍ ÚDAJE & IDENTIFIKACE */}
                {/* 2. POPIS & ROZMĚRY */}
                {activeTab === 'description' && (<div className="space-y-4">{originalIntegrationEnabled()&&id&&<HistoricalMaterialAssertion itemId={Number(id)} etag={editSessionRef.current?.etag}/>}<h3>Současná odborná přiřazení materiálů a technik</h3>
                    {originalIntegrationEnabled()&&<div className="space-y-1"><label htmlFor="extendedDescription">Doplňující popis</label><textarea id="extendedDescription" value={form.extendedDescription??''} onChange={e=>setForm((previous:any)=>({...previous,extendedDescription:e.target.value}))}/></div>}
                    <MuseumSection snapshotRequired drafts={sectionDrafts} editSession={editSessionRef.current} readOnly={isViewMode}
                        itemId={id?Number(id):undefined} section="materialTuples" onSave={handleSectionSave}/>
                    {originalIntegrationEnabled()&&id&&<MaterialBindings itemId={Number(id)} readOnly={isViewMode||hasUnsavedChanges()||scopedNeedsReload||loading} onSave={etag=>{
                        const session=editSessionRef.current as any;if(session?.scopedCurrent){session.etag=etag;session.scopedCurrent.etag=etag;}return handleSectionSave();
                    }}/>}


                </div>)}

                {activeTab === 'dimensions' && (<div className="space-y-4">
                        {id&&form._cardStatements&&<SourceDimensionCorrections completion={form._completion===true} key={id} itemId={Number(id)} session={editSessionRef.current}
                            writable={allowCardEdit&&originalCanEdit('professional')&&!hasUnsavedChanges('sourceDimension')}
                            onSaved={handleSectionSave} drafts={sectionDrafts}/>}

                        {originalIntegrationEnabled()&&<p>{form._completion?'Nové a opravované míry ukládejte přímo u řádku.':'Nové míry se ukládají hlavním tlačítkem Uložit. Oprava evidované míry má vlastní tlačítko.'}</p>}{/* FYZICKÉ ROZMĚRY & MÍRY */}
                        <div className="bg-gray-50 p-4 rounded border border-gray-200 space-y-3">
                            <div className="flex justify-between items-center">
                                <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider">
                                    Fyzické rozměry & Hmotnost
                                </h4>
                                {!form._completion&&<button
                                    type="button"
                                    data-scoped-dimension="editable" onClick={addDimensionRow}
                                    className="px-2.5 py-1 bg-[#00204a] text-white text-xs font-bold rounded hover:bg-[#003366] transition-colors flex items-center gap-1"
                                >
                                    <FaPlus size={10} /> Přidat rozměr
                                </button>}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                                <div className="space-y-1">
                                    <label htmlFor="weight">Váha (g / kg)</label>
                                    <input id="weight" value={form.weight || ''} onChange={(e: any) => setForm({ ...form, weight: e.target.value })} />
                                </div>
                                <div className="space-y-1">
                                    <label htmlFor="legacyVyska">Původní výška</label>
                                    <input id="legacyVyska" value={form.legacyData?.vyska || ''} readOnly />
                                </div>
                                <div className="space-y-1">
                                    <label htmlFor="legacySirka">Původní šířka</label>
                                    <input id="legacySirka" value={form.legacyData?.sirka || ''} readOnly />
                                </div>
                                <div className="space-y-1">
                                    <label htmlFor="legacyHloubka">Původní hloubka</label>
                                    <input id="legacyHloubka" value={form.legacyData?.hloubka || ''} readOnly />
                                </div>
                            </div>

                            {dimensionRows && dimensionRows.length > 0 && (
                                <div className="space-y-2 pt-2 border-t border-gray-200">
                                    <p className="text-[11px] font-bold text-gray-600 uppercase">Jednotlivé míry</p><details><summary>Nápověda k mírám</summary><p>Rozměr označuje měřenou veličinu, míra její číselnou hodnotu a jednotka způsob vyjádření. Doložená nápověda DEMUS používá v — výška, s — šířka, h — hloubka či tloušťka, p — průměr. Zkratky ani historické jednotky se automaticky nemění a nepřepočítávají. Typy z číselníku obsahují zkratku, slovní význam a doporučenou jednotku.</p></details>
                                    {dimensionRows.map((dim: any, idx: number) => (
                                        <div key={dim.id??'draft-'+idx} className="flex items-center gap-2 bg-white p-2 rounded border border-gray-200 text-xs">
                                            <select aria-label={"Typ rozměru "+(idx+1)} title="Označení měřené veličiny. Původní zkratka se nepřevádí na jiný význam." data-scoped-dimension={!dim.id||dim.createdInScopedApi?'editable':'readonly'}
                                                value={dim.dimensionType}
                                                onChange={e => {
                                                    const type=e.target.value;
                                                    const match=dimensionOptions.find(entry=>entry.code===type);
                                                    const unit=match&&dictionaryField(match,'Jedn_RZ');
                                                    setForm((previous:any)=>({...previous,dimensions:previous.dimensions.map((row:any,index:number)=>
                                                        index===idx?{...row,dimensionType:type,...(unit&&!row.unit?{unit}:{})}:row)}));
                                                }}
                                                className="w-1/4 bg-white border border-gray-300 rounded px-2 py-1 text-xs text-gray-700"
                                            >
                                                {!dimensionOptions.some(entry=>entry.code===dim.dimensionType)&&<option value={dim.dimensionType}>{dim.dimensionType}</option>}
                                                {dimensionOptions.map(entry=><option key={entry.key} value={entry.code!}>{[entry.code,entry.label!==entry.code?entry.label:null,dictionaryField(entry,'Jedn_RZ')].filter(Boolean).join(' — ')}</option>)}
                                                {(!originalIntegrationEnabled()||!dimensionOptions.length)&&['Výška','Šířka','Hloubka','Průměr','Tloušťka','Délka','Rozpětí','Hmotnost','Jiné'].filter(type=>type!==dim.dimensionType).map(type=><option key={type}>{type}</option>)}
                                            </select>
                                            <input data-scoped-dimension={!dim.id||dim.createdInScopedApi?'editable':'readonly'}
                                                type={originalIntegrationEnabled()?'text':'number'}
                                                inputMode="decimal" step="any"
                                                placeholder="Hodnota"
                                                value={dim.value}
                                                onChange={e => updateDimensionRow(idx, 'value', e.target.value)}
                                                className="w-1/4 bg-white border border-gray-300 rounded px-2 py-1 text-xs text-gray-700"
                                            />
                                            <select aria-label={"Jednotka rozměru "+(idx+1)} title="Jednotka uvedené číselné míry; historické jednotky se nepřepočítávají." data-scoped-dimension={!dim.id||dim.createdInScopedApi?'editable':'readonly'}
                                                value={dim.unit}
                                                onChange={e => updateDimensionRow(idx, 'unit', e.target.value)}
                                                className="w-1/6 bg-white border border-gray-300 rounded px-2 py-1 text-xs text-gray-700"
                                            >
                                                <option value="">— bez jednotky —</option>
                                                {dim.unit&&!dimensionUnits.includes(dim.unit)&&<option value={dim.unit}>{dim.unit}</option>}
                                                {dimensionUnits.map(unit=><option key={unit}>{unit}</option>)}
                                            </select>
                                            <input data-scoped-dimension={!dim.id||dim.createdInScopedApi?'editable':'readonly'}
                                                placeholder="Poznámka k míře..."
                                                value={dim.note || ''}
                                                onChange={e => updateDimensionRow(idx, 'note', e.target.value)}
                                                className="flex-1 bg-white border border-gray-300 rounded px-2 py-1 text-xs text-gray-700"
                                            />
                                            <button
                                                type="button"
                                                data-scoped-dimension={!dim.id?'editable':'readonly'} disabled={originalIntegrationEnabled()?!!dim.id:!!dim.legacyData} title={dim.legacyData ? 'Importovaný rozměr nelze odstranit' : 'Odebrat rozměr'} onClick={() => removeDimensionRow(idx)}
                                                className="p-1.5 text-red-500 hover:text-red-700 rounded"
                                            >
                                                <FaTrash size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>


                </div>)}

                {activeTab === 'photos' && (<div className="space-y-4">{mediaStatus}
                        {/* Fotodokumentace */}
                        <div className="space-y-3 bg-slate-50 border border-slate-200 rounded p-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                    <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider">
                                        Fotodokumentace ({originalIntegrationEnabled()&&!scopedMedia.loaded?'neověřeno':galleryImages.length > 0 ? galleryImages.length : (form.imageUrls?.length || 0)})
                                    </h4>
                                    <p className="text-[11px] text-gray-500">
                                        Správa fotografií předmětu, nastavení hlavní fotografie, stahování a náhledy.
                                    </p>
                                </div>
                                {!isViewMode && id && (
                                    <GovButton
                                        nativeType="button"
                                        type="outlined"
                                        color="neutral"
                                        size="s"
                                        data-scoped-media disabled={uploading||originalIntegrationEnabled()&&!scopedCanWriteMedia()}
                                        onClick={() => document.getElementById('photo-up')?.click()}
                                    >
                                        {uploading ? 'Nahrávám...' : '📸 + Nahrát fotografii'}
                                    </GovButton>
                                )}
                            </div>

                            {galleryImages.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pt-2">
                                    {galleryImages.map((img) => (
                                        <div
                                            key={img.id}
                                            className={`relative bg-white border rounded shadow-xs overflow-hidden flex flex-col group ${
                                                img.primary ? 'ring-2 ring-blue-600 border-blue-600' : 'border-gray-200'
                                            }`}
                                        >
                                            <div className="relative h-32 w-full bg-gray-100 flex items-center justify-center overflow-hidden">
                                                <SafeImage
                                                    load={img.thumbnail} src={img.thumbUrl || img.url}
                                                    alt={img.caption || form.title || 'Fotografie'}
                                                    className="w-full h-full object-contain"
                                                />
                                                {img.primary && (
                                                    <span className="absolute top-1.5 left-1.5 bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
                                                        ★ Hlavní foto
                                                    </span>
                                                )}
                                            </div>
                                            {img.caption && (
                                                <div className="px-2 py-1 text-[11px] text-gray-600 truncate border-t border-gray-100" title={img.caption}>
                                                    {img.caption}
                                                </div>
                                            )}
                                            <div className="p-1.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-1 text-[11px]">
                                                <PhotoPreview load={img.preview} src={img.url} alt={img.caption || form.title || "Fotografie"} />
                                                <a
                                                    href="#"
                                                    onClick={event => {event.preventDefault();if(originalIntegrationEnabled())void scopedMedia.download(img.entry).catch(e=>setGlobalError(e.message));else handleDownloadPhoto(img.url, img.caption);}}
                                                    className="text-gray-700 hover:text-gray-900 font-bold px-1 py-0.5"
                                                    title="Stáhnout fotografii"
                                                >
                                                    Stáhnout
                                                </a>
                                                {!isViewMode && !originalIntegrationEnabled() && !img.primary && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {if(!originalIntegrationEnabled())handleSetPrimaryPhoto(img.id);}}
                                                        className="text-amber-700 hover:text-amber-900 font-bold px-1 py-0.5 text-[10px]"
                                                        title="Nastavit jako hlavní fotografii"
                                                    >
                                                        Hlavní
                                                    </button>
                                                )}
                                                {!isViewMode && !originalIntegrationEnabled() && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeletePhoto(img.id)}
                                                        className="text-red-600 hover:text-red-800 font-bold px-1 py-0.5"
                                                        title="Smazat fotografii"
                                                        aria-label={`Smazat fotografii ${img.id}`}
                                                    >
                                                        Smazat
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (form.imageUrls && form.imageUrls.length > 0) ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pt-2">
                                    {form.imageUrls.map((url: string, idx: number) => (
                                        <div key={idx} className="relative bg-white border border-gray-200 rounded shadow-xs overflow-hidden flex flex-col">
                                            <div className="h-32 w-full bg-gray-100 flex items-center justify-center overflow-hidden">
                                                <SafeImage src={url} alt={`Fotografie ${idx + 1}`} className="w-full h-full object-contain" />
                                            </div>
                                            <div className="p-1.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-1 text-[11px]">
                                                <PhotoPreview src={url} alt="Fotografie" />
                                                <a href={resolveApiUrl(url)} download target="_blank" rel="noopener noreferrer" className="text-gray-700 hover:text-gray-900 font-bold px-1 py-0.5">
                                                    Stáhnout
                                                </a>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs italic text-gray-500 py-2">
                                    {originalIntegrationEnabled()?'Fotografie na načtené scoped stránce: žádné. Nejde o důkaz absence v původním DEMUS.':'Zatím nebyly nahrány žádné fotografie sbírkového předmětu.'}
                                </p>
                            )}
                        </div>

                </div>)}

                {/* 3. PŮVOD & NABYTÍ */}
                {activeTab === 'provenance' && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                        <SourceAcquisitionView data={(editSessionRef.current?.museumSnapshot as any)?.sourceAcquisition}/>
                                                {/* Evidence akvizic */}
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded">
                            <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider mb-2">
                                Akviziční záznamy předmětu (1:N)
                            </h4>
                            <AcquisitionSection snapshotRequired drafts={sectionDrafts} editSession={editSessionRef.current} readOnly={isViewMode} onSave={handleSectionSave} itemId={id ? Number(id) : undefined} />
                        </div>

                        {/* Základní způsob nabytí */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="space-y-1">
                                <label htmlFor="acquisitionMethod">Způsob nabytí</label>
                                <TreeChoice type="ACQUISITION_METHOD" label="Způsob nabytí – číselník" value={null}
                                    onChange={(_id, choice) => setForm((prev: any) => ({...prev, acquisitionMethod: choice?.code ?? choice?.label ?? ''}))} />
                                <p className="text-xs">Současná hodnota: {form.acquisitionMethod || '—'}</p>
                            </div>

                            <div className="space-y-1">
                                <label htmlFor="acquisitionDate">Datum nabytí do muzea</label>
                                <YearDateInput id="acquisitionDate" label="Datum nabytí do muzea" value={form.acquisitionDate || ''}
                                    onChange={value => setForm((prev: any) => ({...prev, acquisitionDate: value}))} />
                            </div>

                            <div className="space-y-1">
                                <label htmlFor="acquiredFrom">Nabyto od (dárce/původce)</label>
                                <input
                                    id="acquiredFrom"
                                    value={form.acquiredFrom || ''}
                                    onChange={(e: any) => setForm({ ...form, acquiredFrom: e.target.value })}
                                    placeholder="Jméno dárce nebo instituce"
                                />
                            </div>
                        </div>

                        {/* Místo a Země původu */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                            {/* Země původu s opraveným "+ Nová země" */}
                            <div className="space-y-1" ref={countryDropdownRef}>
                                <div className="flex items-center justify-between">
                                    <label htmlFor="countryOfOrigin">Země původu (Číselník)</label>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => managed.enabled?managed.search('COUNTRY','Česká republika'):setForm({ ...form, countryOfOrigin: 'Česká republika' })}
                                            className="text-[10px] font-bold text-[#00204a] bg-blue-50 hover:bg-blue-100 px-1.5 py-0.5 rounded border border-blue-200 transition-colors"
                                            title="Rychlý výběr: Česká republika"
                                        >
                                            🇨🇿 ČR
                                        </button>
                                        <button
                                            type="button"
                                            data-scoped-reference-editor={managed.enabled?true:undefined} disabled={managed.enabled&&(isViewMode||!managed.canCreate('COUNTRY'))} title={managed.enabled&&!managed.canCreate('COUNTRY')?'Vyžaduje dictionary.write, aktuální verzi a uložené změny.':undefined} onClick={() => openDictModal('COUNTRY', 'Země původu', 'countryOfOrigin')}
                                            className="text-[10px] font-bold text-blue-600 hover:text-blue-800 underline"
                                        >
                                            + Nová země
                                        </button>
                                    </div>
                                </div>
                                <div className="relative">
                                    <input
                                        type="text"
                                        id="countryOfOrigin"
                                        className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:border-[#00204a]"
                                        value={form.countryOfOrigin || ''}
                                        onFocus={() => setShowCountries(true)}
                                        onChange={e => {
                                            setForm({ ...form, countryOfOrigin: e.target.value });
                                            setCountrySearch(e.target.value);
                                            setShowCountries(true);
                                        }}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                const matches = (dicts.countries || [])
                                                    .filter((c: string) => dictionarySearchKey(c).includes(dictionarySearchKey(countrySearch)))
                                                    .sort();
                                                if (matches.length > 0 && showCountries) {
                                                    setForm((prev: any) => ({ ...prev, countryOfOrigin: matches[0] }));
                                                }
                                                setShowCountries(false);
                                            }
                                        }}
                                        placeholder="Hledat stát v číselníku..."
                                    />
                                    {showCountries && (
                                        <div className="absolute left-0 right-0 mt-1 max-h-[160px] overflow-y-auto bg-white border border-gray-200 rounded shadow-lg z-[999]">
                                            {dicts.countries
                                                ?.filter((c: string) => dictionarySearchKey(c).includes(dictionarySearchKey(countrySearch)))
                                                .sort()
                                                .map((c: string) => (
                                                    <div
                                                        key={c}
                                                        onClick={() => {
                                                            setForm({ ...form, countryOfOrigin: c });
                                                            setCountrySearch('');
                                                            setShowCountries(false);
                                                        }}
                                                        className="px-3 py-1.5 text-xs hover:bg-gray-100 cursor-pointer transition-colors border-b last:border-0"
                                                    >
                                                        {c}
                                                    </div>
                                                ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {managed.enabled&&managedField('COUNTRY','Země původu')}
                        {/* Nálezová lokalita (DEMUS: Nalez) */}
                        <div className="space-y-1">
                            <label htmlFor="findingLocality">Místo nálezu / nálezová lokalita (Nalez)</label>
                            <input
                                id="findingLocality"
                                value={form.findingLocality || ''}
                                onChange={(e: any) => setForm({ ...form, findingLocality: e.target.value })}
                                placeholder="např. Brno-střed, Býčí skála..."
                            />
                        </div>

                        {originalIntegrationEnabled()&&rootText('Lokalita_S')&&<p>Lokalita — původní údaj (pouze čtení): <output>{rootText('Lokalita_S')}</output></p>}
                        <p>Lokalitu přiřazenou k předmětu najdete na záložce Základ. Aktuální umístění se eviduje samostatně.</p>
                        {/* Lokalita a fond */}
                        <div className="pt-2 border-t border-gray-200">
                            <h4 className="text-xs font-black text-gray-700 uppercase tracking-wider mb-2">
                                Lokalita a sbírkový fond
                            </h4>
                            <MuseumSection snapshotRequired drafts={sectionDrafts} editSession={editSessionRef.current} readOnly={isViewMode} itemId={id ? Number(id) : undefined} section="locality" onSave={handleSectionSave} />
                        </div>
                    </div>
                )}

                {/* 4. UMÍSTĚNÍ & ULOŽENÍ */}
                {activeTab === 'storage' && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="space-y-1">
                                <label htmlFor="locationBuilding">Depozitář (Budova)</label>
                                <input
                                    id="locationBuilding"
                                    value={form.locationBuilding || ''}
                                    onChange={(e: any) => setForm({ ...form, locationBuilding: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1">
                                <label htmlFor="locationRoom">Místnost</label>
                                <input
                                    id="locationRoom"
                                    value={form.locationRoom || ''}
                                    onChange={(e: any) => setForm({ ...form, locationRoom: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1">
                                <label htmlFor="permanentLocation">Trvalé uložení / Police</label>
                                <input
                                    id="permanentLocation"
                                    value={form.permanentLocation || ''}
                                    onChange={(e: any) => setForm({ ...form, permanentLocation: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label htmlFor="oddeleni">Oddělení muzea</label>
                                <input
                                    id="oddeleni"
                                    value={form.oddeleni || ''}
                                    onChange={(e: any) => setForm({ ...form, oddeleni: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1">
                                <label htmlFor="insuranceValue">Pojistná hodnota (Kč)</label>
                                <input
                                    type="number"
                                    id="insuranceValue"
                                    value={form.insuranceValue || ''}
                                    onChange={(e: any) => setForm({ ...form, insuranceValue: e.target.value })}
                                />
                            </div>
                        </div>


                    </div>
                )}

                {/* 5. ODBORNÁ EVIDENCE & DEMUS */}
                {activeTab === 'museum' && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                        {/* Sub-navigace odborné evidence */}


                        {/* Obsah vybrané podzáložky */}
                        <div className="p-4 bg-white rounded border border-gray-200">
                            {museumSubTab === 'documentation' && (
                                <><MuseumSection snapshotRequired drafts={sectionDrafts} editSession={editSessionRef.current} readOnly={isViewMode} itemId={id ? Number(id) : undefined} section="documentation" onSave={handleSectionSave} />
                                {id&&form._completion&&<CuratorDocumentLinks key={id} itemId={Number(id)} session={editSessionRef.current} files={documentFiles}
                                    readOnly={isViewMode||loading||scopedNeedsReload||!originalCanEdit('professional')||hasUnsavedChanges('documentBinding')}
                                    drafts={sectionDrafts} onSaved={handleSectionSave}/>}
                                {!isViewMode&&documentationFiles}</>
                            )}
                            {museumSubTab === 'classification' && <>{managed.enabled&&<>{managedField('CLASSIFICATION','Klasifikace')}</>}</>}
                            {museumSubTab === 'classification' && (
                                <MuseumSection snapshotRequired drafts={sectionDrafts} editSession={editSessionRef.current} readOnly={isViewMode} itemId={id ? Number(id) : undefined} section="classification" onSave={handleSectionSave} />
                            )}
                            {museumSubTab === 'determination' && (
                                <MuseumSection snapshotRequired drafts={sectionDrafts} editSession={editSessionRef.current} readOnly={isViewMode} itemId={id ? Number(id) : undefined} section="determination" onSave={handleSectionSave} />
                            )}
                            {museumSubTab === 'deaccession' && (
                                <MuseumSection snapshotRequired drafts={sectionDrafts} editSession={editSessionRef.current} readOnly={isViewMode} proposalBlocked={hasUnsavedChanges('proposal')} itemId={id ? Number(id) : undefined} section="deaccession" onSave={handleSectionSave} />
                            )}
                            {museumSubTab === 'manipulation' && (
                                <MuseumSection snapshotRequired drafts={sectionDrafts} editSession={editSessionRef.current} readOnly={isViewMode} itemId={id ? Number(id) : undefined} section="manipulation" onSave={handleSectionSave} />
                            )}
                            {museumSubTab === 'action' && (
                                <MuseumSection snapshotRequired drafts={sectionDrafts} editSession={editSessionRef.current} readOnly={isViewMode} itemId={id ? Number(id) : undefined} section="action" onSave={handleSectionSave} />
                            )}
                            {museumSubTab === 'origin'&&managed.enabled&&managedField('COUNTRY','Země původu')}
                            {museumSubTab==='origin'&&<p>Lokalita předmětu je na záložce Základ; místo vzniku zde zůstává oddělené.</p>}
                            {museumSubTab === 'origin'&&originalIntegrationEnabled()&&id&&<HistoricalLocalityDetails itemId={Number(id)} etag={editSessionRef.current?.etag}/>}
                            {museumSubTab==='origin'&&form._completion&&<details open={fieldErrors.datingFrom||fieldErrors.datingTo?true:undefined}>
                                <summary>Upřesnit plná kalendářní data</summary>{fullCalendarDating}
                            </details>}
                            {museumSubTab === 'origin' && <MuseumSection snapshotRequired drafts={sectionDrafts} editSession={editSessionRef.current} readOnly={isViewMode}
                                itemId={id ? Number(id) : undefined} section="origin" onSave={handleSectionSave} />}
                            {museumSubTab === 'reference' && <MuseumSection snapshotRequired drafts={sectionDrafts} editSession={editSessionRef.current}
                                readOnly={isViewMode} itemId={id?Number(id):undefined} section="bibliography" onSave={handleSectionSave}/>}
                            {museumSubTab === 'plus' && <div><p>Plus: význam a zapisovatelný kontrakt polí Plus*/Sluz* čekají na ověření. Původní evidence zůstává pouze pro čtení:</p>{form.legacyData?._cloneSourceHistory && <div className="text-sm" aria-label="Historické údaje originálu">
    <p>Historické údaje originálu (současný klon má vlastní audit):</p>
    <p>Zapsal v DEMUS: {form.legacyData._cloneSourceHistory.legacyCreatedBy || '—'}</p>
    <p>Datum zápisu: {form.legacyData._cloneSourceHistory.legacyCreatedAt || '—'}</p>
    <p>Změnil v DEMUS: {form.legacyData._cloneSourceHistory.legacyUpdatedBy || '—'}</p>
    <p>Datum změny: {form.legacyData._cloneSourceHistory.legacyUpdatedAt || '—'}</p>
</div>}
<HistoricalRoot itemId={id?Number(id):undefined} etag={editSessionRef.current?.etag}/>{id&&<HistoricalTable itemId={Number(id)} table="SbirkyPlus" etag={editSessionRef.current?.etag} fields={[["Sluz_SP","Původní služební údaj SbirkyPlus"]]}/>}<DemusLegacyDataView unavailableMessage={originalIntegrationEnabled()?sourcePlus.message:undefined} legacyData={originalIntegrationEnabled()?sourcePlus.data:form.legacyData} /></div>}
                            {museumSubTab === 'iso' && (
                                <MuseumSection snapshotRequired drafts={sectionDrafts} editSession={editSessionRef.current} readOnly={isViewMode} itemId={id ? Number(id) : undefined} section="iso" onSave={handleSectionSave} />
                            )}
                            {museumSubTab === 'vocabularies' && id && !isViewMode && <><VocabularyAssociations itemId={Number(id)} data={(editSessionRef.current?.museumSnapshot as any)?.vocabularies}/></>}
                            {museumSubTab === 'demus' && (
                                <div className="space-y-4">
                                    {id && !isViewMode && <DemusSourceIdentity itemId={Number(id)}/>}
                                    {originalIntegrationEnabled()&&id&&<><CloneOrigin itemId={Number(id)}/><OwnedHistory itemId={Number(id)}/><CurrentHistory sourceStories={form._completion===true} stories={form._cardStatements===true} itemId={Number(id)} editSession={editSessionRef.current} readOnly={isViewMode||loading||scopedNeedsReload||hasUnsavedChanges('currentHistory','storyCorrection')} drafts={sectionDrafts} onSave={handleSectionSave}/></>}{form._completion?<TechnicalDemus title="Doklad převzatých příběhů"><MuseumSection snapshotRequired drafts={sectionDrafts} editSession={editSessionRef.current} readOnly={isViewMode} itemId={id ? Number(id) : undefined} section="history" onSave={handleSectionSave} /></TechnicalDemus>:<MuseumSection snapshotRequired drafts={sectionDrafts} editSession={editSessionRef.current} readOnly={isViewMode} itemId={id ? Number(id) : undefined} section="history" onSave={handleSectionSave} />}
                                    <div className="p-4 bg-gray-50 border border-gray-200 rounded space-y-4">
                                        {form.legacyData?._cloneSourceHistory && <div className="text-sm" aria-label="Historické údaje originálu">
    <p>Historické údaje originálu (současný klon má vlastní audit):</p>
    <p>Zapsal v DEMUS: {form.legacyData._cloneSourceHistory.legacyCreatedBy || '—'}</p>
    <p>Datum zápisu: {form.legacyData._cloneSourceHistory.legacyCreatedAt || '—'}</p>
    <p>Změnil v DEMUS: {form.legacyData._cloneSourceHistory.legacyUpdatedBy || '—'}</p>
    <p>Datum změny: {form.legacyData._cloneSourceHistory.legacyUpdatedAt || '—'}</p>
</div>}
<HistoricalRoot itemId={id?Number(id):undefined} etag={editSessionRef.current?.etag}/>{(!historicalEnabled()||form.legacyData&&Object.keys(form.legacyData).length>0)&&<DemusLegacyDataView unavailableMessage={originalIntegrationEnabled()?'Soukromý raw archiv není součástí tohoto pohledu. Dostupné zdrojové hodnoty a lineage jsou v příslušných oddělených sekcích; nejde o tvrzení, že historie neexistuje.':undefined} legacyData={form.legacyData} />}
                                    </div>
                                </div>
                            )}
                            {museumSubTab === 'attachments' && !isViewMode && (
                                <div className="space-y-4">
                                    {mediaStatus}{originalIntegrationEnabled()&&<p>Přílohy jsou soukromé a dostupné podle oprávnění katalogu. Nahrávání, úprava popisu a odebrání současných příloh vyžadují povolený režim úprav. Při archivaci se binární data zachovávají; historické DEMUS soubory se nemění.</p>}
                                    {!id ? (
                                        <div className="p-6 text-center bg-gray-50 border border-gray-200 rounded text-gray-500">
                                            <FaPaperclip className="mx-auto text-2xl text-gray-400 mb-2" />
                                            <p className="font-bold text-xs">Přílohy lze nahrávat po prvotním uložení předmětu.</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div
                                                onDragOver={e => { e.preventDefault(); e.stopPropagation(); setIsDraggingAtt(true); }}
                                                onDragLeave={e => { e.preventDefault(); e.stopPropagation(); setIsDraggingAtt(false); }}
                                                onDrop={e => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setIsDraggingAtt(false);
                                                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                                                        setAttFile(e.dataTransfer.files[0]);
                                                    }
                                                }}
                                                className={`p-4 rounded space-y-3 transition-colors ${
                                                    isDraggingAtt
                                                        ? 'bg-blue-50 border-2 border-dashed border-blue-600'
                                                        : 'bg-gray-50 border border-gray-200'
                                                }`}
                                            >
                                                <h5 className="text-xs font-black text-gray-700 uppercase tracking-widest flex items-center gap-1.5">
                                                    <FaUpload className="text-[#00204a]" /> Nahrát novou přílohu (přetáhněte soubor sem)
                                                </h5>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    <div className="space-y-1">
                                                        <label htmlFor="attachmentFile">Soubor</label>
                                                        <input
                                                            id="attachmentFile" data-scoped-media disabled={attUploading||originalIntegrationEnabled()&&!scopedCanWriteMedia()}
                                                            type="file"
                                                            onChange={e => setAttFile(e.target.files?.[0] || null)}
                                                            className="w-full text-xs text-gray-700 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-[#00204a] file:text-white hover:file:bg-[#003366] cursor-pointer"
                                                        />
                                                        {attFile && <p className="text-[11px] font-bold text-blue-700">Vybrán soubor: {attFile.name}</p>}
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label htmlFor="attachmentCaption">Popis souboru</label>
                                                        <input
                                                            id="attachmentCaption" data-scoped-media disabled={attUploading||originalIntegrationEnabled()&&!scopedCanWriteMedia()}
                                                            value={attCaption}
                                                            onChange={(e: any) => setAttCaption(e.target.value)}
                                                            placeholder="např. Restaurátorská zpráva 2024"
                                                        />
                                                    </div>
                                                </div>
                                                <GovButton
                                                    nativeType="button"
                                                    type="solid"
                                                    color="primary"
                                                    size="s"
                                                    data-scoped-media disabled={!attFile || attUploading||originalIntegrationEnabled()&&!scopedCanWriteMedia()}
                                                    onClick={handleUploadAttachment}
                                                >
                                                    {attUploading ? 'Nahrávám přílohu...' : 'Nahrát přílohu'}
                                                </GovButton>
                                            </div>

                                            <div className="bg-white rounded border border-gray-200 overflow-hidden">
                                                <div className="bg-gray-50 border-b px-4 py-2 flex items-center justify-between">
                                                    <h5 className="text-xs font-black uppercase text-gray-600 flex items-center gap-1.5">
                                                        <FaPaperclip /> Evidované přílohy ({galleryAttachments.length})
                                                    </h5>
                                                </div>
                                                {originalIntegrationEnabled()&&<p role="note">Odstranění příloh není podporováno. Nahrané soubory zůstávají zachované; popis lze upravit podle oprávnění.</p>}
                                                {galleryAttachments.length === 0 ? (
                                                    <p className="p-4 text-xs italic text-gray-400 text-center">{originalIntegrationEnabled()?(scopedMedia.loaded?'V načtené části seznamu nejsou přílohy.':'Přílohy zatím nejsou ověřeny.'):'Zatím nebyly nahrány žádné přílohy.'}</p>
                                                ) : (
                                                    <div className="divide-y divide-gray-100">
                                                        {galleryAttachments.map((att: any) => (
                                                            <div key={att.id} className="p-3 flex items-center justify-between hover:bg-gray-50 text-xs">
                                                                <div className="flex items-center gap-2.5 min-w-0">
                                                                    <FaFileAlt className="text-gray-400 text-base flex-shrink-0" />
                                                                    <div className="min-w-0">
                                                                        <p className="font-bold text-gray-900 truncate">{att.originalFilename || att.filename || att.fileName || 'Příloha'}</p>
                                                                        <p className="text-[11px] text-gray-500">
                                                                            {att.caption && <span className="font-semibold text-gray-700 mr-2">{att.caption}</span>}

                                                                            <span>{att.fileSize ? (att.fileSize / 1024).toFixed(1) : 0} KB</span>
                                                                        </p>
                                                                        {!isViewMode && id && <AttachmentCaptionEditor itemId={Number(id)} attachmentId={att.id}
                                                                                caption={att.caption} disabled={originalIntegrationEnabled()&&!scopedCanWriteMedia()}
                                                                                saveCaption={originalIntegrationEnabled()?async text=>{await mutateScopedMedia((api,tag,signal)=>api.saveMediaCaption(Number(id),att.id,tag,text,signal));}:undefined}
                                                                                onSaved={async () => {if(originalIntegrationEnabled())scopedMedia.reload();else{await loadAttachments();await synchronizeMediaVersion(await getAdminItem(id));}}}/>}
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-1.5">
                                                                    <a
                                                                        href="#"
                                                                        onClick={async event => {
                                                                            event.preventDefault();
                                                                            try {
                                                                                if(originalIntegrationEnabled())await scopedMedia.download(att.entry);else await downloadAttachmentFile(Number(id), att.id, att.originalFilename || att.filename || 'priloha');
                                                                            } catch (e: any) {
                                                                                alert('Stažení přílohy selhalo: ' + e.message);
                                                                            }
                                                                        }}
                                                                        className="inline-flex items-center gap-1 text-xs font-bold text-[#00204a] hover:underline px-2.5 py-1 bg-gray-100 rounded cursor-pointer"
                                                                    >
                                                                        <FaFileDownload /> Stáhnout
                                                                    </a>
                                                                    <button
                                                                        type="button"
                                                                        data-scoped-media
                                                                        onClick={() => handleDeleteAttachment(att.id)}
                                                                        aria-label={`Odebrat přílohu ${att.originalFilename || att.fileName || 'Příloha'}`}
                                                                        className="p-1 text-red-500 hover:text-red-700 rounded"
                                                                        disabled={originalIntegrationEnabled()&&(!scopedCanWriteMedia()||originalSession().catalog.mediaArchiveEnabled!==true)} title={originalIntegrationEnabled()?'Odebrat současnou přílohu; binární data budou zachována.':'Smazat přílohu'}
                                                                    >
                                                                        <FaTrash size={12} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                            {museumSubTab === 'audit' && (
                                <div className="space-y-4">
                                    <div data-scoped-reference-editor={originalIntegrationEnabled()&&import.meta.env.VITE_CURRENT_FLAGS_ENABLED==='true'?true:undefined} className="p-4 bg-yellow-50/70 border-l-4 border-[#00204a] rounded space-y-3">
                                        <label htmlFor="auditComment">Zdůvodnění provedených změn (Auditní stopa) *</label>
                                        <p className="text-[11px] text-gray-500 italic">
                                            Při editaci sbírkového předmětu zadejte stručné zdůvodnění změny pro zachování auditní stopy.
                                        </p>
                                        <textarea
                                            id="auditComment" readOnly={isViewMode||originalIntegrationEnabled()&&(!originalCanEdit('professional')||import.meta.env.VITE_CURRENT_FLAGS_ENABLED!=='true')}
                                            rows={3}
                                            className="w-full bg-white border border-gray-300 rounded px-3 py-1.5 text-xs text-gray-800 focus:outline-none focus:border-[#00204a]"
                                            value={form.auditComment || ''}
                                            onChange={e => setForm({ ...form, auditComment: e.target.value })}
                                            required={!!id}
                                            placeholder="např. Oprava datace na základě nového restaurátorského průzkumu..."
                                        />
                                        {fieldErrors.auditComment && <p className="text-xs font-bold text-red-600">{fieldErrors.auditComment}</p>}

                                        {auditSaveMessage && (
                                            <div className="p-2 bg-green-100 border border-green-300 text-green-800 rounded text-xs font-bold">
                                                ✓ {auditSaveMessage}
                                            </div>
                                        )}

                                        {id && (
                                            <div className="flex justify-end">
                                                <GovButton
                                                    nativeType="button"
                                                    type="solid"
                                                    color="primary"
                                                    size="s"
                                                    disabled={auditSaving || isViewMode || !form.auditComment?.trim()||originalIntegrationEnabled()&&!originalCanEdit('professional')}
                                                    onClick={handleSaveAuditRecord}
                                                >
                                                    {auditSaving ? 'Ukládám audit...' : 'Uložit auditní záznam'}
                                                </GovButton>
                                            </div>
                                        )}
                                    </div>

                                    {id&&originalIntegrationEnabled()&&import.meta.env.VITE_CURRENT_FLAGS_ENABLED==='true'&&<ScopedItemAudit key={`${id}:${editSessionRef.current?.etag}`} itemId={Number(id)}/>}
                                    {/* Historie auditních událostí */}
                                    <div className="bg-white rounded border border-gray-200 overflow-hidden">
                                        <div className="bg-gray-50 border-b px-4 py-2">
                                            <h5 className="text-xs font-black uppercase text-gray-600">
                                                📝 Historie auditních záznamů ({originalIntegrationEnabled()?'globální historie nedostupná':form.events?.length || 0})
                                            </h5>
                                        </div>
                                        {!form.events || form.events.length === 0 ? (
                                            <p className="p-4 text-xs italic text-gray-400 text-center">{originalIntegrationEnabled()?'Původní globální události nejsou součástí scoped kontraktu. Forenzní audit katalogu je oddělený a vyžaduje vlastní oprávnění.':'Zatím nebyly zaznamenány žádné auditní události.'}</p>
                                        ) : (
                                            <div className="divide-y divide-gray-100">
                                                {form.events.map((ev: any, idx: number) => (
                                                    <div key={idx} className="p-3 text-xs space-y-1">
                                                        <div className="flex justify-between text-gray-500 font-mono text-[11px]">
                                                            <span>{ev.eventDate || '—'}</span>
                                                            <span className="font-bold text-gray-700">{ev.type || 'AUDIT'}</span>
                                                        </div>
                                                        <p className="text-gray-900 font-semibold">{ev.description}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                </fieldset>
                {/* SPOLEČNÁ TLAČÍTKA ULOŽENÍ – VIDITELNÁ NA VŠECH TABECH */}
                <div className="pt-4 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3" data-form-actions>
                    <div className="flex gap-2.5">
                        {isViewMode ? (
                            <GovButton
                                nativeType="button"
                                type="solid"
                                color="primary"
                                size="s"
                                data-scoped-navigation="true" disabled={originalIntegrationEnabled()&&!originalCanEdit('professional')&&!originalCanEdit('inventory')} title="Upravit předmět podle oprávnění" onClick={() => navigate(originalIntegrationEnabled()?originalEditHref(Number(id),originalCanEdit('professional')?'professional':'inventory'):`/admin/items/edit/${id}`, { state: {...location.state,detailReturn:location.pathname+location.search} })}
                            >
                                ✏️ Upravit tento předmět
                            </GovButton>
                        ) : <button type="submit" form="item-editor" aria-label="Uložit předmět (dole)" data-scoped-save="true" className="demus-save" disabled={saveDisabled}>{loading?'Ukládám…':'Uložit'}</button>}
                        <GovButton
                            nativeType="button"
                            type="outlined"
                            color="neutral"
                            size="s"
                            data-scoped-navigation="true" onClick={handleBackToList}
                        >
                            {originalIntegrationEnabled()&&id&&!isViewMode?'Zrušit a zpět na detail':'Zpět na seznam'}
                        </GovButton>
                    </div>
                    {id && (
                        <TechnicalDemus title="Identita předmětu"><span className="text-[11px] text-gray-400 font-mono">ID předmětu: #{id}</span></TechnicalDemus>
                    )}
                </div>
            </div>

            </div>
            </form>
            {showPrintCard && (
                <MuseumCardPrint
                    item={originalIntegrationEnabled()?originalPrintCardFields(form):form}
                    onClose={() => setShowPrintCard(false)}
                />
            )}

            {id && cloneModalOpen && (
                <SelectiveCloneModal
                    isOpen={cloneModalOpen}
                    itemId={Number(id)}
                    itemTitle={form.title || ''}
                    inventoryNumber={form.inventoryNumber || ''}
                    onClose={() => setCloneModalOpen(false)}
                    onSuccess={(cloned: any) => {
                        setCloneModalOpen(false);
                        if (cloned?.id) {
                            navigate(originalIntegrationEnabled()?originalItemHref(cloned.id):`/admin/items/edit/${cloned.id}`, { state: { fromSearch: location.state?.fromSearch } });
                        }
                    }}
                />
            )}

            {/* INLINE MODÁL PRO ČÍSELNÍK (+ Nová země, + Nový materiál...) */}
            {managed.enabled&&dictModal.isOpen&&dictModal.type==='LOCALITY'?<LocalityCardDialog api={originalSession().api} signal={dictModal.scopeSignal??originalSession().signal} writable={managed.canCreate('LOCALITY')} onCancel={()=>setDictModal({isOpen:false,type:'',title:'',targetField:''})} onSaved={async valueId=>{if(dictModal.scopeSignal!==originalSession().signal||dictModal.scopeSignal?.aborted||dictModal.itemKey!==(id??'new'))throw new Error('Lokalita byla uložena, ale kontext předmětu se změnil. Přiřazení neproběhlo.');await managed.adopt('LOCALITY',valueId);setDictModal({isOpen:false,type:'',title:'',targetField:''});}}/>:(
            <AddDictionaryModal
                key={`${dictModal.type}:${dictModal.itemKey??''}`}
                onCreate={managed.enabled?async input=>{if(input.type!==dictModal.type||dictModal.scopeSignal!==originalSession().signal||dictModal.scopeSignal?.aborted||dictModal.itemKey!==(id??'new'))throw new Error('Kontext dialogu se změnil. Zavřete jej a otevřete u správného předmětu a číselníku.');await managed.create(input);}:undefined}
                isOpen={dictModal.isOpen}
                dictionaryType={dictModal.type}
                dictionaryTitle={dictModal.title}
                initialValue={dictModal.initialLabel?{label:dictModal.initialLabel,code:null,parentId:null}:undefined}
                parentOptions={managed.enabled?managed.choices(dictModal.type==='SPRAVCE'?'CUSTODIAN':dictModal.type as import('../features/scoped/scopedApi').ManagedDictionaryType).map(v=>({id:v.id,label:dictionaryLabel(v),disabled:ambiguousDictionaryCaption(v,managed.choices(dictModal.type==='SPRAVCE'?'CUSTODIAN':dictModal.type as import('../features/scoped/scopedApi').ManagedDictionaryType))})):undefined}
                onClose={() => setDictModal({ isOpen: false, type: '', title: '', targetField: '' })}
                onSuccess={handleDictCreated}
            />
            )}


        </div>
    );
}
