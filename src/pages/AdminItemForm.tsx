import DemusSourceIdentity from '../components/DemusSourceIdentity';
import {SourceAcquisitionView,VocabularyAssociations} from '../components/MuseumSourceEvidence';
import {reviewedCalendarDate} from '../lib/dating';
import AttachmentCaptionEditor from '../components/AttachmentCaptionEditor';
import NewInventoryNumber from '../components/NewInventoryNumber';
import React, { useState, useEffect, useRef, useMemo, useLayoutEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
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
    FaCalendarAlt,
    FaLayerGroup
} from 'react-icons/fa';
import AddDictionaryModal from '../components/AddDictionaryModal';
import SelectiveCloneModal from '../components/SelectiveCloneModal';
import MuseumSection, { TreeChoice } from '../components/MuseumSection';
import type { ItemEditSession } from '../lib/editSession';
import YearDateInput from '../components/YearDateInput';
import AcquisitionSection from '../components/AcquisitionSection';
import SafeImage, { isBackendImage } from '../components/SafeImage';
import MuseumCardPrint from '../components/MuseumCardPrint';
import DemusLegacyDataView from '../components/DemusLegacyDataView';
import PermanentIdentificationHeader from '../components/PermanentIdentificationHeader';



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

export default function AdminItemForm({ readOnly = false }: { readOnly?: boolean }) {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const isViewMode = readOnly || location.pathname.includes('/admin/items/view/');
    const persistedSnapshotRef = useRef<any>(null);
    const editSessionRef = useRef<ItemEditSession>();
    const toolbarRef = useRef<HTMLDivElement>(null);
    const sectionDrafts = useRef<Record<string, any>>({});
    const [comparison, setComparison] = useState<any>(null);
    useLayoutEffect(() => {
        if (!toolbarRef.current || typeof ResizeObserver === 'undefined') return;
        const toolbar = toolbarRef.current;
        const update = () => toolbar.closest<HTMLElement>('.demus-app')?.style.setProperty('--demus-toolbar-height', `${toolbar.getBoundingClientRect().height}px`);
        const observer = new ResizeObserver(update); observer.observe(toolbar); update();
        return () => observer.disconnect();
    }, []);
    const [cloneModalOpen, setCloneModalOpen] = useState(false);
    const [showPrintCard, setShowPrintCard] = useState(false);
    const [initialNumbers, setInitialNumbers] = useState({ inventory: '', accession: '' });
    const [isDraggingAtt, setIsDraggingAtt] = useState(false);

    const [activeTab, setActiveTab] = useState('identity');
    const [museumSubTab, setMuseumSubTab] = useState<
        'documentation' | 'classification' | 'determination' | 'deaccession' | 'manipulation' | 'action' | 'iso' | 'demus' | 'attachments' | 'audit' | 'origin' | 'reference' | 'plus' | 'vocabularies'
    >('documentation');

    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [conflictError, setConflictError] = useState<string | null>(null);
    const [globalError, setGlobalError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [unauthorizedError, setUnauthorizedError] = useState(false);
    const [forbiddenError, setForbiddenError] = useState(false);
    const [auditSaveMessage, setAuditSaveMessage] = useState<string | null>(null);
    const [auditSaving, setAuditSaving] = useState(false);

    const handleSaveAuditRecord = async (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (!id || !form.auditComment?.trim()) {
            alert('Prosím vyplňte text auditního zdůvodnění.');
            return;
        }
        setAuditSaving(true);
        setAuditSaveMessage(null);
        try {
            const comment = form.auditComment.trim();
            const payload = {auditComment: comment};
            await updateItem(Number(id), payload, editSessionRef.current);
            setAuditSaveMessage('Auditní záznam byl úspěšně uložen.');
            setForm((prev: any) => ({ ...prev, auditComment: '' }));
            const fresh = await getAdminItem(id);
            setForm((prev: any) => ({...prev, events: fresh.events || []}));
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
    }>({
        isOpen: false,
        type: '',
        title: '',
        targetField: ''
    });

    const openDictModal = (type: string, title: string, targetField: string) => {
        setDictModal({ isOpen: true, type, title, targetField });
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

    const handleDeleteAttachment = async (attId: number) => {
        if (!id) return;
        if (window.confirm('Opravdu chcete tuto přílohu smazat?')) {
            try {
                await deleteAttachment(Number(id), attId);
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
                { dimensionType: 'Výška', value: '', unit: 'cm', note: '', sortOrder: (prev.dimensions?.length || 0) + 1 }
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
        const clone = { ...f, auditComment: '' };
        return JSON.stringify(clone);
    };

    const initialFormSnapshotRef = useRef<string>('');
    // Omit untouched values: display defaults must never become historical museum evidence.
    const preserveUnchangedEvidence = (payload: any) => {
        if (!id || !initialFormSnapshotRef.current) return;
        const previous = buildItemPayload(JSON.parse(initialFormSnapshotRef.current));
        for (const field of Object.keys(previous)) {
            if (JSON.stringify(previous[field as keyof typeof previous]) === JSON.stringify(payload[field])) {
                delete payload[field];
            }
        }
    };

    const isDirty = useMemo(() => {
        if (isViewMode) return false;
        if (!initialFormSnapshotRef.current) return false;
        return getFormSnapshot(form) !== initialFormSnapshotRef.current;
    }, [form, isViewMode]);

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if ((isDirty || Object.values(sectionDrafts.current).some((draft: any) => draft.dirty)) && !isViewMode) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty, isViewMode]);

    const handleBackToList = () => {
        if ((isDirty || Object.values(sectionDrafts.current).some((draft: any) => draft.dirty)) && !isViewMode) {
            const confirmed = window.confirm('Máte neuložené změny. Opravdu chcete odejít bez uložení?');
            if (!confirmed) return;
        }
        const returnSearch = (location.state as any)?.fromSearch || sessionStorage.getItem('adminItemsSearch') || '';
        navigate(`/admin/items${returnSearch}`);
    };

    const currentFundLabel = useMemo(() => {
        if (form.fundDictionaryId) {
            const found = fundOptions.find(f => f.id === form.fundDictionaryId);
            if (found) return found.code ? `[${found.code}] ${found.label}` : found.label;
            return form.fundLegacyCode ? `[${form.fundLegacyCode}] Fond #${form.fundDictionaryId}` : `Fond #${form.fundDictionaryId}`;
        }
        if (form.fundLegacyCode) return `[${form.fundLegacyCode}]`;
        if (form.fundName) return form.fundName;
        return null;
    }, [form.fundDictionaryId, form.fundLegacyCode, form.fundName, form.subCollection, fundOptions]);

    const currentAuthor = useMemo(() => {
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
        getDictionaries().then(data => {
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
        }).catch(console.error);

        if (id) {
            loadImages(id);
            setLoading(true);
            getAdminItem(id)
                .then(data => {
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
                        author: (data.authors && data.authors.length > 0) ? data.authors[0] : (data.author || ''),
                        authorRole: initialParties.length > 0 ? initialParties[0].role : 'Autor',
                        parties: initialParties,
                        material: (data.materials && data.materials.length > 0) ? data.materials[0] : (data.material || ''),
                        weight: safeVal(data.weight),
                        title: safeVal(data.title),
                        description: safeVal(data.description),
                        extendedDescription: safeVal(data.extendedDescription),
                        technique: safeVal(data.technique),
                        datingText: safeVal(data.datingText),
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
                        materialNote: safeVal(data.materialNote),
                        originPlace: safeVal(data.originPlace),
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
                                legacyData: d.legacyData
                            }))
                            : [],
                        auditComment: '',
                        legacyData: data.legacyData || {}
                    };
                    setForm(loadedForm);
                    initialFormSnapshotRef.current = getFormSnapshot(loadedForm);
                })
                .catch((err: Error) => setGlobalError(err.message))
                .finally(() => setLoading(false));

            loadAttachments();
        } else {
            Promise.resolve(getNextAvailableNumbers?.()).then((next: any) => {
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
                initialFormSnapshotRef.current = getFormSnapshot(form);
            });
        }
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
            if (fresh._editSession?.etag === editSessionRef.current?.etag) persistedSnapshotRef.current = fresh;
            const baseline = initialFormSnapshotRef.current ? JSON.parse(initialFormSnapshotRef.current) : {};
            setForm((prev: any) => {
                const next = {...prev};
                for (const key of ['markant', 'signature', 'subjectDictionaryId', 'subjectLegacyCode', 'fundDictionaryId',
                    'fundLegacyCode', 'groupDictionaryId', 'groupLegacyCode', 'localityDictionaryId', 'localityLegacyCode',
                    'materialDictionaryId', 'techniqueDictionaryId', 'legacyArchived', 'legacyCard', 'legacyCopied',
                    'legacyVerified', 'legacyMarked', 'acquisitionMethod', 'acquisitionDate', 'acquiredFrom']) {
                    if (JSON.stringify(prev[key]) === JSON.stringify(baseline[key])) {
                        next[key] = fresh[key] ?? '';
                        baseline[key] = next[key];
                    }
                }
                initialFormSnapshotRef.current = getFormSnapshot(baseline);
                return next;
            });
        } catch (err) { setGlobalError((err as Error).message); }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !id) return;

        setUploading(true);
        try {
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
        setForm((prev: any) => ({...prev, datingText:text}));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setConflictError(null);
        setGlobalError(null);
        setSuccessMessage(null);
        setFieldErrors({});

        if (!validity.accession || !validity.inventory) {
            setGlobalError('Nelze uložit: Evidenční čísla musí být unikátní!');
            return;
        }

        const currentInv = (form.inventoryNumber || '').trim();
        const currentAcc = (form.accessionNumber || '').trim();

        if (!currentInv) {
            setGlobalError('Inventární číslo je povinné.');
            setActiveTab('identity');
            return;
        }

        if (!form.title?.trim() && !form.objectType?.trim()) {
            setGlobalError('Vyplňte alespoň titul nebo typ předmětu.');
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

        setLoading(true);

        const payload = buildItemPayload(form);
        if (!id) delete (payload as any).clearFund;
        preserveUnchangedEvidence(payload);
        if (id && form.inventoryNumber === initialNumbers.inventory) payload.inventoryNumber = undefined as any;

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

                    setForm((prev: any) => {
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
                        initialFormSnapshotRef.current = getFormSnapshot(newUpdatedForm);
                        return newUpdatedForm;
                    });
                }
                setSuccessMessage('Změny byly úspěšně uloženy.');
            } else {
                const savedItem = await createItem(payload);
                if (bulkMode && savedItem?.id) {
                    await bulkCopyItem(savedItem.id, bulkParams);
                }
                if (savedItem?.id) {
                    navigate(`/admin/items/edit/${savedItem.id}`, { replace: true });
                }
            }
        } catch (err) {
            console.error('Chyba při ukládání záznamu:', err);
            if (err instanceof ApiError) {
                if (err.status === 401) {
                    setUnauthorizedError(true);
                } else if (err.status === 403) {
                    setForbiddenError(true);
                } else if (err.status === 409 || err.status === 412 || err.status === 428) {
                    setConflictError(err.message || 'Předmět s tímto inventárním číslem již existuje. Zvolte prosím unikátní číslo.');
                } else {
                    setGlobalError(err.message || 'Nepodařilo se uložit záznam.');
                }
                if (err.fieldErrors) {
                    setFieldErrors(err.fieldErrors);
                }
            } else if (err instanceof Error) {
                setGlobalError(err.message);
            } else {
                setGlobalError('Došlo k neočekávané chybě.');
            }
        } finally {
            setLoading(false);
        }
    };

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

    return (
        <div className="space-y-3 animate-in fade-in duration-300">
                {/* HLAVIČKA FORMULÁŘE */}
                <div ref={toolbarRef} className="demus-toolbar flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                    <div className="flex items-center gap-3 min-w-0 max-w-xl">
                        <GovButton
                            nativeType="button"
                            type="outlined"
                            color="neutral"
                            size="s"
                            onClick={handleBackToList}
                            title="Zpět na seznam předmětů se zachováním filtrů a stránkování"
                        >
                            ← Zpět na seznam
                        </GovButton>
                        <div className="min-w-0">
                            <h3 className="text-sm font-bold text-gray-900">
                                {id
                                    ? `Kurátorský detail: ${form.inventoryNumber || form.accessionNumber || `#${id}`}${form.title ? ` | ${form.title}` : ''}`
                                    : 'Založení nového sbírkového předmětu'}
                            </h3>
                        </div>
                    </div>
                <div className="flex items-center gap-2.5 flex-wrap">
                    {!isViewMode && <button type="submit" form="item-editor" className="demus-save"
                        disabled={loading || !validity.accession || !validity.inventory}>
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
                            onClick={() => navigate(`/admin/items/edit/${id}`, { state: location.state })}
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
                            disabled={isViewMode}
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
                            <input type="file" id="photo-up" hidden onChange={handleFileChange} accept="image/*" />
                            <GovButton
                                nativeType="button"
                                type="outlined"
                                color="neutral"
                                size="s"
                                disabled={uploading || isViewMode}
                                onClick={() => document.getElementById('photo-up')?.click()}
                            >
                                {uploading ? 'Nahrávám...' : '📸 Nahrát foto'}
                            </GovButton>
                            <GovButton
                                nativeType="button"
                                type="outlined"
                                color="primary"
                                size="s"
                                onClick={() => setCloneModalOpen(true)}
                            >
                                📋 Klonovat
                            </GovButton>
                        </>
                    )}
                </div>
            </div>

            {/* PERMANENTNÍ IDENTIFIKAČNÍ HLAVIČKA DLE CITEM (STICKY) */}
            <PermanentIdentificationHeader
                hasToolbar
                fond={currentFundLabel}
                predmet={form.objectType}
                popis={form.description}
                titul={form.title}
                autor={currentAuthor}
                datace={currentDating}
                inventoryNumber={form.inventoryNumber || form.accessionNumber}
                quantity={form.quantity}
                isViewMode={isViewMode}
                isNew={!id}
            />

            {id && <InventoryIdentityPanel itemId={Number(id)} inventoryNumber={form.inventoryNumber || ''}
                canEdit={!isViewMode && form.inventoryNumber === initialNumbers.inventory} onSaved={async () => {
                    const fresh = await getAdminItem(id);
                    if (persistedSnapshotRef.current) persistedSnapshotRef.current = {...persistedSnapshotRef.current, inventoryNumber:fresh.inventoryNumber};
                    await synchronizeMediaVersion(fresh);
                    if (initialFormSnapshotRef.current) {
                        const baseline=JSON.parse(initialFormSnapshotRef.current);baseline.inventoryNumber=fresh.inventoryNumber ?? '';
                        initialFormSnapshotRef.current=getFormSnapshot(baseline);
                    }
                    setForm((previous: any) => ({ ...previous, inventoryNumber: fresh.inventoryNumber ?? '' }));
                    setInitialNumbers(previous => ({ ...previous, inventory: fresh.inventoryNumber ?? '' }));
                }} />}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <nav className="demus-original-tabs" aria-label="Karty DEMUS">
                {[['Základ','identity',''],['Určení','museum','determination'],['Vznik','museum','origin'],
                    ['MatTech','description',''],['Míry','dimensions',''],['Zařazení','museum','classification'],
                    ['Historie','museum','demus'],['Dokumentace','museum','documentation'],['Reference','museum','reference'],
                    ['Manipulace','museum','manipulation'],['Akce','museum','action'],['ISO','museum','iso'],
                    ['Plus','museum','plus'],['Vyřazení','museum','deaccession'],['Akvizice','provenance',''],
                    ['Číselníkové vazby','museum','vocabularies'],['Přílohy','museum','attachments'],['Umístění','storage',''],['Foto','photos',''],['Audit','museum','audit']].map(([label, main, sub]) =>
                    <button key={label} type="button" aria-pressed={activeTab === main && (!sub || museumSubTab === sub)}
                        onClick={() => {setActiveTab(main); if (sub) setMuseumSubTab(sub as any);}}>{label === 'Přílohy' ? `Přílohy (${attachments.length})` : label}</button>)}
            </nav>

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
                            <tbody>{Object.keys(buildItemPayload(form)).filter(key => JSON.stringify(form[key]) !== JSON.stringify(comparison[key])).map(key =>
                                <tr key={key}><td>{key}</td><td>{JSON.stringify(form[key])}</td><td>{JSON.stringify(comparison[key])}</td></tr>)}</tbody></table>
                        <p>Rozpracované odborné sekce zůstávají zachovány. Pro jejich změny obnovte záznam a porovnejte původní evidenci.</p>
                    </div>}
                </div>
            )}
            {globalError && (
                <div className="mx-6 mt-4 p-3 bg-red-50 border-l-4 border-red-600 text-xs text-red-700 font-bold rounded">
                    ⚠️ {globalError}
                </div>
            )}

            {/* TĚLO FORMULÁŘE */}
            {isViewMode && id && activeTab === 'museum' && museumSubTab === 'demus' && <DemusSourceIdentity itemId={Number(id)}/>}
            {isViewMode && id && activeTab === 'museum' && museumSubTab === 'vocabularies' && <VocabularyAssociations itemId={Number(id)} data={(editSessionRef.current?.museumSnapshot as any)?.vocabularies}/>}
            <form id="item-editor" onSubmit={handleSubmit} className="p-6 space-y-4 demus-editor">
                <fieldset disabled={isViewMode || loading}>
                {/* 1. ZÁKLADNÍ ÚDAJE & IDENTIFIKACE */}
                {activeTab === 'identity' && (
                    <div className="demus-primary-fields">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label htmlFor="accessionNumber">Přírůstkové číslo</label>
                                <input
                                    id="accessionNumber"
                                    value={form.accessionNumber || ''}
                                    onChange={(e: any) => setForm({ ...form, accessionNumber: e.target.value })}
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

                            <div className="space-y-1">
                                <label htmlFor="inventoryNumber">Inventární číslo *</label>
                                {!id ? <NewInventoryNumber value={form.inventoryNumber || ''} onChange={value => setForm((prev: any) => ({...prev,inventoryNumber:value}))} /> : (<input
                                    id="inventoryNumber"
                                    value={form.inventoryNumber || ''}
                                    onChange={(e: any) => setForm({ ...form, inventoryNumber: e.target.value })}
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
                        </div>

                        <div className="space-y-1">
                            <label htmlFor="title">Název sbírkového předmětu (nebo typ)</label>
                            <input
                                id="title"
                                value={form.title || ''}
                                onChange={(e: any) => setForm({ ...form, title: e.target.value })}
                            />
                            {fieldErrors.title && <p className="text-xs font-bold text-red-600">{fieldErrors.title}</p>}
                        </div>

                        {id && <div className="grid grid-cols-2 gap-2 text-xs border p-2">
                            <p>Zapsal: {form.legacyCreatedBy || '—'}</p><p>Datum zápisu: {form.legacyCreatedAt || '—'}</p>
                            <p>Změnil: {form.legacyUpdatedBy || '—'}</p><p>Datum změny: {form.legacyUpdatedAt || '—'}</p>
                        </div>}
                        <div className="space-y-1"><label htmlFor="quantity">Současný katalogový počet</label>
                            <input id="quantity" type="number" step="1" value={form.quantity??''}
                                onChange={e=>setForm((prev:any)=>({...prev,quantity:e.target.value===''?null:Number(e.target.value)}))}/>
                            {fieldErrors.quantity&&<p role="alert">{fieldErrors.quantity}</p>}
                        </div>
                        {/* FOND A PODSBÍRKA DLE CITEM – NEZÁVISLÁ POLA */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <label htmlFor="fundDictionaryId">Fond</label>
                                    <button
                                        type="button"
                                        onClick={() => openDictModal('FUND', 'Nový fond', 'fundDictionaryId')}
                                        className="text-[10px] font-bold text-blue-600 hover:text-blue-800 underline"
                                    >
                                        + Nový fond
                                    </button>
                                </div>
                                <select
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
                                    <option value="">— Bez přiřazeného fondu —</option>
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
                                </select>
                                {form.fundLegacyCode && (
                                    <div className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded flex items-center justify-between">
                                        <span>Původní kód DEMUS:</span>
                                        <span className="font-mono font-bold">{form.fundLegacyCode}</span>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-1">
                                <label htmlFor="subCollection">Podsbírka</label>
                                <input
                                    id="subCollection"
                                    aria-label="Podsbírka"
                                    placeholder="např. Výtvarné umění"
                                    value={form.subCollection || ''}
                                    onChange={(e: any) => setForm({ ...form, subCollection: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <label htmlFor="objectType">Typ předmětu</label>
                                    <button
                                        type="button"
                                        onClick={() => openDictModal('OBJECT_TYPE', 'Typ předmětu', 'objectType')}
                                        className="text-[10px] font-bold text-blue-600 hover:text-blue-800 underline"
                                    >
                                        + Nový
                                    </button>
                                </div>
                                <select
                                    id="objectType"
                                    className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:border-[#00204a]"
                                    value={form.objectType || ''}
                                    onChange={e => setForm({ ...form, objectType: e.target.value })}
                                >
                                    <option value="">-- Vyberte typ --</option>
                                    {form.objectType && !dicts.objectTypes?.includes(form.objectType) && (
                                        <option value={form.objectType}>{form.objectType}</option>
                                    )}
                                    {dicts.objectTypes?.map((t: string) => (
                                        <option key={t} value={t}>
                                            {t}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <label htmlFor="spravce">Správce sbírky</label>
                                    <button
                                        type="button"
                                        onClick={() => openDictModal('SPRAVCE', 'Správce fondu', 'spravce')}
                                        className="text-[10px] font-bold text-blue-600 hover:text-blue-800 underline"
                                    >
                                        + Nový
                                    </button>
                                </div>
                                <select
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
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label htmlFor="objectCondition">Fyzický stav</label>
                                <select
                                    id="objectCondition"
                                    className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:border-[#00204a]"
                                    value={form.objectCondition || 'Dobrý'}
                                    onChange={e => setForm({ ...form, objectCondition: e.target.value })}
                                >
                                    <option>Výborný</option>
                                    <option>Dobrý</option>
                                    <option>Poškozeno</option>
                                    <option>Havarijní</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label htmlFor="signature">Signatura / Nápis</label>
                                <input
                                    id="signature"
                                    value={form.signature || ''}
                                    onChange={(e: any) => setForm({ ...form, signature: e.target.value })}
                                    placeholder="např. J. Mánes 1865 vpravo dole"
                                />
                            </div>
                            <div className="space-y-1">
                                <label htmlFor="markant">Značení / Markant</label>
                                <input
                                    id="markant"
                                    value={form.markant || ''}
                                    onChange={(e: any) => setForm({ ...form, markant: e.target.value })}
                                    placeholder="např. ražená značka dílny, puncovní značka"
                                />
                            </div>
                        </div>

                        {!id && (
                            <div className="pt-2 border-t border-gray-100">
                                <div className="flex items-center gap-2 mb-2">
                                    <input
                                        type="checkbox"
                                        id="bulkMode"
                                        checked={bulkMode}
                                        onChange={e => setBulkMode(e.target.checked)}
                                        className="rounded border-gray-300 text-[#00204a]"
                                    />
                                    <label htmlFor="bulkMode" className="text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer">
                                        Režim hromadného založení duplikátů (DEMUS parita)
                                    </label>
                                </div>
                                {bulkMode && (
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

                        {/* Hierarchické číselníky pro základní zařazení */}
                        <div className="pt-3 border-t border-gray-200">
                            <h4 className="text-xs font-black text-gray-700 uppercase tracking-wider mb-2">
                                Číselníkové zařazení předmětu
                            </h4>
                            <MuseumSection snapshotRequired drafts={sectionDrafts} editSession={editSessionRef.current} readOnly={isViewMode} itemId={id ? Number(id) : undefined} section="basic" onSave={handleSectionSave} />
                        </div>
                        {/* Autor / Původce & Role */}
                        <div className="space-y-1" ref={authorDropdownRef}>
                            <div className="flex items-center justify-between">
                                <label htmlFor="author">Autor / Tvůrce / Původce a role</label>
                                <div className="flex items-center gap-2">
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
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => openDictModal('AUTHOR', 'Autor / Původce', 'author')}
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
                                        className="w-full bg-white border border-gray-300 rounded px-3 py-1.5 text-xs text-gray-700 focus:outline-none focus:border-[#00204a]"
                                        value={form.author || ''}
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
                                                    .filter((a: any) => a.toLowerCase().includes(authorSearch.toLowerCase()))
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
                                        placeholder="Začněte psát jméno autora..."
                                    />
                                    {showAuthors && (
                                        <div className="absolute left-0 right-0 mt-1 max-h-[160px] overflow-y-auto bg-white border border-gray-200 rounded shadow-lg z-[999]">
                                            {Array.from(new Set(dicts.authors || []))
                                                .filter((a: any) => a.toLowerCase().includes(authorSearch.toLowerCase()))
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
                                <div>
                                    <select
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
                                    </select>
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
                        </div>

                        {/* DATACE S ČÍSELNÝMI SPINNERY (P2) */}
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-2">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                                    <FaCalendarAlt className="text-[#00204a]" /> Datace a časové určení
                                </h4>
                                <div className="flex flex-wrap gap-1 text-[10px]">
                                    <button
                                        type="button"
                                        onClick={() => setCenturyDating(1701, 1800, '18. století')}
                                        className="px-2 py-0.5 bg-white border rounded hover:bg-gray-100"
                                    >
                                        18. stol.
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCenturyDating(1801, 1900, '19. století')}
                                        className="px-2 py-0.5 bg-white border rounded hover:bg-gray-100"
                                    >
                                        19. stol.
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCenturyDating(1901, 1950, '1. polovina 20. století')}
                                        className="px-2 py-0.5 bg-white border rounded hover:bg-gray-100"
                                    >
                                        1. pol. 20. stol.
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCenturyDating(1951, 2000, '2. polovina 20. století')}
                                        className="px-2 py-0.5 bg-white border rounded hover:bg-gray-100"
                                    >
                                        2. pol. 20. stol.
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="space-y-1">
                                    <label htmlFor="datingFrom">Revidované datum od (ISO)</label>
                                    <input
                                        type="text"
                                        id="datingFrom"
                                        className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-800 font-mono focus:outline-none focus:border-[#00204a]"
                                        value={form.datingFrom !== undefined && form.datingFrom !== null ? form.datingFrom : ''}
                                        onChange={e => setForm({ ...form, datingFrom: e.target.value })}
                                        placeholder="např. 1850-06-15"
                                    />
                                    {fieldErrors.datingFrom&&<p role="alert">{fieldErrors.datingFrom}</p>}
                                </div>

                                <div className="space-y-1">
                                    <label htmlFor="datingTo">Revidované datum do (ISO)</label>
                                    <input
                                        type="text"
                                        id="datingTo"
                                        className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-800 font-mono focus:outline-none focus:border-[#00204a]"
                                        value={form.datingTo !== undefined && form.datingTo !== null ? form.datingTo : ''}
                                        onChange={e => setForm({ ...form, datingTo: e.target.value })}
                                        placeholder="např. 1870-06-15"
                                    />
                                    {fieldErrors.datingTo&&<p role="alert">{fieldErrors.datingTo}</p>}
                                </div>

                                <div className="space-y-1">
                                    <label htmlFor="datingText">Datace textem</label>
                                    <input
                                        id="datingText"
                                        value={form.datingText || ''}
                                        onChange={(e: any) => setForm({ ...form, datingText: e.target.value })}
                                        placeholder="např. 60. léta 19. století"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Popis předmětu */}
                        <div className="space-y-1">
                            <label htmlFor="description">Základní badatelský popis</label>
                            <textarea
                                id="description"
                                rows={3}
                                className="w-full bg-white border border-gray-300 rounded px-3 py-1.5 text-xs text-gray-800 focus:outline-none focus:border-[#00204a]"
                                value={form.description || ''}
                                onChange={e => setForm({ ...form, description: e.target.value })}
                                placeholder="Podrobný popis vizuálního stavu, námětu, barevnosti..."
                            />
                        </div>

                    </div>
                )}

                {/* 2. POPIS & ROZMĚRY */}
                {activeTab === 'description' && (<div className="space-y-4">
                    <MuseumSection snapshotRequired drafts={sectionDrafts} editSession={editSessionRef.current} readOnly={isViewMode}
                        itemId={id?Number(id):undefined} section="materialTuples" onSave={handleSectionSave}/>
                    <h3>Současná hlavní pole materiálu a techniky</h3>
                        {/* Materiál a Technika */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <TreeChoice type="MATERIAL" label="Materiál (Číselník)" value={form.materialDictionaryId ?? null}
                                onChange={(dictionaryId, choice) => setForm((prev: any) => ({ ...prev, materialDictionaryId: dictionaryId, material: choice?.rawLabel ?? choice?.label ?? '' }))} />

                            <TreeChoice type="TECHNIQUE" label="Technika (Číselník)" value={form.techniqueDictionaryId ?? null}
                                onChange={(dictionaryId, choice) => setForm((prev: any) => ({ ...prev, techniqueDictionaryId: dictionaryId, technique: choice?.rawLabel ?? choice?.label ?? '' }))} />
                        </div>
                        <p>Text materiálu: {form.material || '—'} · Text techniky: {form.technique || '—'}</p>

                        {/* Poznámka k materiálu a technice (DEMUS: PoznMT) */}
                        <div className="space-y-1">
                            <label htmlFor="materialNote">Poznámka k materiálu a technice (PoznMT)</label>
                            <textarea
                                id="materialNote"
                                rows={2}
                                className="w-full bg-white border border-gray-300 rounded px-3 py-1.5 text-xs text-gray-800 focus:outline-none focus:border-[#00204a]"
                                value={form.materialNote || ''}
                                onChange={e => setForm({ ...form, materialNote: e.target.value })}
                                placeholder="Doplňující poznámka k materiálu nebo technice (např. technologie zpracování, povrchové úpravy)..."
                            />
                        </div>

                        {/* Hierarchické číselníky materiálu a techniky */}
                        <div className="pt-2 border-t border-gray-200">
                            <h4 className="text-xs font-black text-gray-700 uppercase tracking-wider mb-2">
                                Hierarchické vazby materiálů a technik
                            </h4>
                            <p className="text-xs">Materiál a technika používají skutečné ID a celou hierarchii číselníku; původní hodnoty jsou zachovány v evidenci DEMUS.</p>
                        </div>


                </div>)}

                {activeTab === 'dimensions' && (<div className="space-y-4">
                        {/* FYZICKÉ ROZMĚRY & MÍRY */}
                        <div className="bg-gray-50 p-4 rounded border border-gray-200 space-y-3">
                            <div className="flex justify-between items-center">
                                <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider">
                                    Fyzické rozměry & Hmotnost
                                </h4>
                                <button
                                    type="button"
                                    onClick={addDimensionRow}
                                    className="px-2.5 py-1 bg-[#00204a] text-white text-xs font-bold rounded hover:bg-[#003366] transition-colors flex items-center gap-1"
                                >
                                    <FaPlus size={10} /> Přidat rozměr
                                </button>
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

                            {form.dimensions && form.dimensions.length > 0 && (
                                <div className="space-y-2 pt-2 border-t border-gray-200">
                                    <p className="text-[11px] font-bold text-gray-600 uppercase">Opakovatelné rozměry (DEMUS Parita):</p>
                                    {form.dimensions.map((dim: any, idx: number) => (
                                        <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded border border-gray-200 text-xs">
                                            <select
                                                value={dim.dimensionType}
                                                onChange={e => updateDimensionRow(idx, 'dimensionType', e.target.value)}
                                                className="w-1/4 bg-white border border-gray-300 rounded px-2 py-1 text-xs text-gray-700"
                                            >
                                                <option value={dim.dimensionType}>{dim.dimensionType}</option>
                                                <option>Výška</option>
                                                <option>Šířka</option>
                                                <option>Hloubka</option>
                                                <option>Průměr</option>
                                                <option>Tloušťka</option>
                                                <option>Délka</option>
                                                <option>Rozpětí</option>
                                                <option>Hmotnost</option>
                                                <option>Jiné</option>
                                            </select>
                                            <input
                                                type="number"
                                                step="any"
                                                placeholder="Hodnota"
                                                value={dim.value}
                                                onChange={e => updateDimensionRow(idx, 'value', e.target.value)}
                                                className="w-1/4 bg-white border border-gray-300 rounded px-2 py-1 text-xs text-gray-700"
                                            />
                                            <select
                                                value={dim.unit}
                                                onChange={e => updateDimensionRow(idx, 'unit', e.target.value)}
                                                className="w-1/6 bg-white border border-gray-300 rounded px-2 py-1 text-xs text-gray-700"
                                            >
                                                <option value={dim.unit}>{dim.unit || 'cm'}</option>
                                                <option>cm</option>
                                                <option>mm</option>
                                                <option>m</option>
                                                <option>g</option>
                                                <option>kg</option>
                                            </select>
                                            <input
                                                placeholder="Poznámka k míře..."
                                                value={dim.note || ''}
                                                onChange={e => updateDimensionRow(idx, 'note', e.target.value)}
                                                className="flex-1 bg-white border border-gray-300 rounded px-2 py-1 text-xs text-gray-700"
                                            />
                                            <button
                                                type="button"
                                                disabled={!!dim.legacyData} title={dim.legacyData ? 'Importovaný rozměr nelze odstranit' : 'Odebrat rozměr'} onClick={() => removeDimensionRow(idx)}
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

                {activeTab === 'photos' && (<div className="space-y-4">
                        {/* Fotodokumentace */}
                        <div className="space-y-3 bg-slate-50 border border-slate-200 rounded p-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                    <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider">
                                        Fotodokumentace ({itemImages.length > 0 ? itemImages.length : (form.imageUrls?.length || 0)})
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
                                        disabled={uploading}
                                        onClick={() => document.getElementById('photo-up')?.click()}
                                    >
                                        {uploading ? 'Nahrávám...' : '📸 + Nahrát fotografii'}
                                    </GovButton>
                                )}
                            </div>

                            {itemImages.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pt-2">
                                    {itemImages.map((img) => (
                                        <div
                                            key={img.id}
                                            className={`relative bg-white border rounded shadow-xs overflow-hidden flex flex-col group ${
                                                img.primary ? 'ring-2 ring-blue-600 border-blue-600' : 'border-gray-200'
                                            }`}
                                        >
                                            <div className="relative h-32 w-full bg-gray-100 flex items-center justify-center overflow-hidden">
                                                <SafeImage
                                                    src={img.thumbUrl || img.url}
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
                                                <a
                                                    href={resolveApiUrl(img.url)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 hover:text-blue-800 font-bold px-1 py-0.5"
                                                    title="Otevřít plný náhled v novém okně"
                                                >
                                                    Náhled
                                                </a>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDownloadPhoto(img.url, img.caption)}
                                                    className="text-gray-700 hover:text-gray-900 font-bold px-1 py-0.5"
                                                    title="Stáhnout fotografii"
                                                >
                                                    Stáhnout
                                                </button>
                                                {!isViewMode && !img.primary && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSetPrimaryPhoto(img.id)}
                                                        className="text-amber-700 hover:text-amber-900 font-bold px-1 py-0.5 text-[10px]"
                                                        title="Nastavit jako hlavní fotografii"
                                                    >
                                                        Hlavní
                                                    </button>
                                                )}
                                                {!isViewMode && (
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
                                                <a href={resolveApiUrl(url)} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 font-bold px-1 py-0.5">
                                                    Náhled
                                                </a>
                                                <a href={resolveApiUrl(url)} download target="_blank" rel="noopener noreferrer" className="text-gray-700 hover:text-gray-900 font-bold px-1 py-0.5">
                                                    Stáhnout
                                                </a>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs italic text-gray-500 py-2">
                                    Zatím nebyly nahrány žádné fotografie sbírkového předmětu.
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
                            <div className="space-y-1">
                                <label htmlFor="originPlace">Místo vzniku</label>
                                <input
                                    id="originPlace"
                                    value={form.originPlace || ''}
                                    onChange={(e: any) => setForm({ ...form, originPlace: e.target.value })}
                                    placeholder="např. Brno, Vídeň, Čechy"
                                />
                            </div>

                            {/* Země původu s opraveným "+ Nová země" */}
                            <div className="space-y-1" ref={countryDropdownRef}>
                                <div className="flex items-center justify-between">
                                    <label htmlFor="countryOfOrigin">Země původu (Číselník)</label>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setForm({ ...form, countryOfOrigin: 'Česká republika' })}
                                            className="text-[10px] font-bold text-[#00204a] bg-blue-50 hover:bg-blue-100 px-1.5 py-0.5 rounded border border-blue-200 transition-colors"
                                            title="Rychlý výběr: Česká republika"
                                        >
                                            🇨🇿 ČR
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => openDictModal('COUNTRY', 'Země původu', 'countryOfOrigin')}
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
                                                    .filter((c: string) => c.toLowerCase().includes(countrySearch.toLowerCase()))
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
                                                ?.filter((c: string) => c.toLowerCase().includes(countrySearch.toLowerCase()))
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
                                    <label htmlFor="latitude">Zeměpisná šířka (Lat, -90 až 90)</label>
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
                                    <label htmlFor="longitude">Zeměpisná délka (Lon, -180 až 180)</label>
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
                    </div>
                )}

                {/* 5. ODBORNÁ EVIDENCE & DEMUS */}
                {activeTab === 'museum' && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                        {/* Sub-navigace odborné evidence */}


                        {/* Obsah vybrané podzáložky */}
                        <div className="p-4 bg-white rounded border border-gray-200">
                            {museumSubTab === 'documentation' && (
                                <MuseumSection snapshotRequired drafts={sectionDrafts} editSession={editSessionRef.current} readOnly={isViewMode} itemId={id ? Number(id) : undefined} section="documentation" onSave={handleSectionSave} />
                            )}
                            {museumSubTab === 'classification' && (
                                <MuseumSection snapshotRequired drafts={sectionDrafts} editSession={editSessionRef.current} readOnly={isViewMode} itemId={id ? Number(id) : undefined} section="classification" onSave={handleSectionSave} />
                            )}
                            {museumSubTab === 'determination' && (
                                <MuseumSection snapshotRequired drafts={sectionDrafts} editSession={editSessionRef.current} readOnly={isViewMode} itemId={id ? Number(id) : undefined} section="determination" onSave={handleSectionSave} />
                            )}
                            {museumSubTab === 'deaccession' && (
                                <MuseumSection snapshotRequired drafts={sectionDrafts} editSession={editSessionRef.current} readOnly={isViewMode} itemId={id ? Number(id) : undefined} section="deaccession" onSave={handleSectionSave} />
                            )}
                            {museumSubTab === 'manipulation' && (
                                <MuseumSection snapshotRequired drafts={sectionDrafts} editSession={editSessionRef.current} readOnly={isViewMode} itemId={id ? Number(id) : undefined} section="manipulation" onSave={handleSectionSave} />
                            )}
                            {museumSubTab === 'action' && (
                                <MuseumSection snapshotRequired drafts={sectionDrafts} editSession={editSessionRef.current} readOnly={isViewMode} itemId={id ? Number(id) : undefined} section="action" onSave={handleSectionSave} />
                            )}
                            {museumSubTab === 'origin' && <MuseumSection snapshotRequired drafts={sectionDrafts} editSession={editSessionRef.current} readOnly={isViewMode}
                                itemId={id ? Number(id) : undefined} section="origin" onSave={handleSectionSave} />}
                            {museumSubTab === 'reference' && <MuseumSection snapshotRequired drafts={sectionDrafts} editSession={editSessionRef.current}
                                readOnly={isViewMode} itemId={id?Number(id):undefined} section="bibliography" onSave={handleSectionSave}/>}
                            {museumSubTab === 'plus' && <div><p>Plus: význam a zapisovatelný kontrakt polí Plus*/Sluz* čekají na ověření. Původní evidence zůstává pouze pro čtení:</p><DemusLegacyDataView legacyData={form.legacyData} /></div>}
                            {museumSubTab === 'iso' && (
                                <MuseumSection snapshotRequired drafts={sectionDrafts} editSession={editSessionRef.current} readOnly={isViewMode} itemId={id ? Number(id) : undefined} section="iso" onSave={handleSectionSave} />
                            )}
                            {museumSubTab === 'vocabularies' && id && !isViewMode && <VocabularyAssociations itemId={Number(id)} data={(editSessionRef.current?.museumSnapshot as any)?.vocabularies}/>}
                            {museumSubTab === 'demus' && (
                                <div className="space-y-4">
                                    {id && !isViewMode && <DemusSourceIdentity itemId={Number(id)}/>}
                                    <MuseumSection snapshotRequired drafts={sectionDrafts} editSession={editSessionRef.current} readOnly={isViewMode} itemId={id ? Number(id) : undefined} section="history" onSave={handleSectionSave} />
                                    <div className="p-4 bg-gray-50 border border-gray-200 rounded space-y-4">
                                        <DemusLegacyDataView legacyData={form.legacyData} />
                                    </div>
                                </div>
                            )}
                            {museumSubTab === 'attachments' && (
                                <div className="space-y-4">
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
                                                            id="attachmentFile"
                                                            type="file"
                                                            onChange={e => setAttFile(e.target.files?.[0] || null)}
                                                            className="w-full text-xs text-gray-700 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-[#00204a] file:text-white hover:file:bg-[#003366] cursor-pointer"
                                                        />
                                                        {attFile && <p className="text-[11px] font-bold text-blue-700">Vybrán soubor: {attFile.name}</p>}
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label htmlFor="attachmentCaption">Popis souboru</label>
                                                        <input
                                                            id="attachmentCaption"
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
                                                    disabled={!attFile || attUploading}
                                                    onClick={handleUploadAttachment}
                                                >
                                                    {attUploading ? 'Nahrávám přílohu...' : 'Nahrát přílohu'}
                                                </GovButton>
                                            </div>

                                            <div className="bg-white rounded border border-gray-200 overflow-hidden">
                                                <div className="bg-gray-50 border-b px-4 py-2 flex items-center justify-between">
                                                    <h5 className="text-xs font-black uppercase text-gray-600 flex items-center gap-1.5">
                                                        <FaPaperclip /> Evidované přílohy ({attachments.length})
                                                    </h5>
                                                </div>
                                                {attachments.length === 0 ? (
                                                    <p className="p-4 text-xs italic text-gray-400 text-center">Zatím nebyly nahrány žádné přílohy.</p>
                                                ) : (
                                                    <div className="divide-y divide-gray-100">
                                                        {attachments.map((att: any) => (
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
                                                                                caption={att.caption} onSaved={async () => {await loadAttachments();await synchronizeMediaVersion(await getAdminItem(id));}}/>}
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-1.5">
                                                                    <button
                                                                        type="button"
                                                                        onClick={async () => {
                                                                            try {
                                                                                await downloadAttachmentFile(Number(id), att.id, att.originalFilename || att.filename || 'priloha');
                                                                            } catch (e: any) {
                                                                                alert('Stažení přílohy selhalo: ' + e.message);
                                                                            }
                                                                        }}
                                                                        className="inline-flex items-center gap-1 text-xs font-bold text-[#00204a] hover:underline px-2.5 py-1 bg-gray-100 rounded cursor-pointer"
                                                                    >
                                                                        <FaFileDownload /> Stáhnout
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleDeleteAttachment(att.id)}
                                                                        className="p-1 text-red-500 hover:text-red-700 rounded"
                                                                        title="Smazat přílohu"
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
                                    <div className="p-4 bg-yellow-50/70 border-l-4 border-[#00204a] rounded space-y-3">
                                        <label htmlFor="auditComment">Zdůvodnění provedených změn (Auditní stopa) *</label>
                                        <p className="text-[11px] text-gray-500 italic">
                                            Při editaci sbírkového předmětu zadejte stručné zdůvodnění změny pro zachování auditní stopy.
                                        </p>
                                        <textarea
                                            id="auditComment"
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
                                                    disabled={auditSaving || !form.auditComment?.trim()}
                                                    onClick={handleSaveAuditRecord}
                                                >
                                                    {auditSaving ? 'Ukládám audit...' : 'Uložit auditní záznam'}
                                                </GovButton>
                                            </div>
                                        )}
                                    </div>

                                    {/* Historie auditních událostí */}
                                    <div className="bg-white rounded border border-gray-200 overflow-hidden">
                                        <div className="bg-gray-50 border-b px-4 py-2">
                                            <h5 className="text-xs font-black uppercase text-gray-600">
                                                📝 Historie auditních záznamů ({form.events?.length || 0})
                                            </h5>
                                        </div>
                                        {!form.events || form.events.length === 0 ? (
                                            <p className="p-4 text-xs italic text-gray-400 text-center">Zatím nebyly zaznamenány žádné auditní události.</p>
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
                <div className="pt-4 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex gap-2.5">
                        {isViewMode ? (
                            <GovButton
                                nativeType="button"
                                type="solid"
                                color="primary"
                                size="s"
                                onClick={() => navigate(`/admin/items/edit/${id}`, { state: location.state })}
                            >
                                ✏️ Upravit tento předmět
                            </GovButton>
                        ) : (
                            <GovButton
                                nativeType="submit"
                                disabled={loading || !validity.accession || !validity.inventory}
                                type="solid"
                                color="primary"
                                size="s"
                            >
                                {loading ? 'Ukládám záznam...' : 'Uložit sbírkový předmět'}
                            </GovButton>
                        )}
                        <GovButton
                            nativeType="button"
                            type="outlined"
                            color="neutral"
                            size="s"
                            onClick={handleBackToList}
                        >
                            Zpět na seznam
                        </GovButton>
                    </div>
                    {id && (
                        <span className="text-[11px] text-gray-400 font-mono">
                            ID předmětu: #{id}
                        </span>
                    )}
                </div>
            </form>

            {showPrintCard && (
                <MuseumCardPrint
                    item={form}
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
                            navigate(`/admin/items/edit/${cloned.id}`, { state: { fromSearch: location.state?.fromSearch } });
                        }
                    }}
                />
            )}

            {/* INLINE MODÁL PRO ČÍSELNÍK (+ Nová země, + Nový materiál...) */}
            <AddDictionaryModal
                isOpen={dictModal.isOpen}
                dictionaryType={dictModal.type}
                dictionaryTitle={dictModal.title}
                onClose={() => setDictModal({ isOpen: false, type: '', title: '', targetField: '' })}
                onSuccess={handleDictCreated}
            />
            </div>
        </div>
    );
}
