import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
    getAdminItem,
    createItem,
    updateItem,
    getDictionaries,
    getNextAvailableNumbers,
    checkUniqueness,
    uploadItemImage,
    listAttachments,
    uploadAttachment,
    deleteAttachment,
    bulkCopyItem,
    ApiError,
    API_BASE
} from '../lib/api';
import { GovButton, GovFormInput, GovFormLabel, GovMessage } from '@gov-design-system-ce/react';
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
import MuseumSection from '../components/MuseumSection';
import AcquisitionSection from '../components/AcquisitionSection';
import MuseumCardPrint from '../components/MuseumCardPrint';

const MAIN_TABS = [
    { id: 'identity', label: '1. Základní údaje & Identifikace' },
    { id: 'description', label: '2. Popis & Rozměry' },
    { id: 'provenance', label: '3. Původ & Nabytí' },
    { id: 'storage', label: '4. Umístění & Uložení' },
    { id: 'museum', label: '5. Odborná evidence & DEMUS' }
];

export default function AdminItemForm() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const [cloneModalOpen, setCloneModalOpen] = useState(false);
    const [showPrintCard, setShowPrintCard] = useState(false);
    const [initialNumbers, setInitialNumbers] = useState({ inventory: '', accession: '' });
    const [isDraggingAtt, setIsDraggingAtt] = useState(false);

    const [activeTab, setActiveTab] = useState('identity');
    const [museumSubTab, setMuseumSubTab] = useState<
        'documentation' | 'classification' | 'determination' | 'deaccession' | 'demus' | 'attachments' | 'audit'
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

    const handleSaveAuditRecord = async () => {
        if (!id || !form.auditComment?.trim()) {
            alert('Prosím vyplňte text auditního zdůvodnění.');
            return;
        }
        setAuditSaving(true);
        setAuditSaveMessage(null);
        try {
            await updateItem(Number(id), {
                ...form,
                auditComment: form.auditComment.trim()
            });
            setAuditSaveMessage('Auditní záznam byl úspěšně uložen.');
            setForm((prev: any) => ({ ...prev, auditComment: '' }));
            const fresh = await getAdminItem(id);
            setForm((prev: any) => ({ ...prev, events: fresh.events || [] }));
        } catch (err: any) {
            alert('Chyba při ukládání auditního záznamu: ' + err.message);
        } finally {
            setAuditSaving(false);
        }
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

    const handleDictCreated = (newItem: { code: string; label: string; type: string }) => {
        const fieldMap: Record<string, string> = {
            OBJECT_TYPE: 'objectTypes',
            MATERIAL: 'materials',
            TECHNIQUE: 'techniques',
            SPRAVCE: 'spravci',
            COUNTRY: 'countries',
            AUTHOR: 'authors'
        };
        const dictKey = fieldMap[newItem.type];
        if (dictKey) {
            setDicts((prev: any) => ({
                ...prev,
                [dictKey]: Array.from(new Set([...(prev[dictKey] || []), newItem.label])).sort()
            }));
        }
        if (dictModal.targetField) {
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
                console.error('Chyba při načítání příloh:', e);
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
        authors: []
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
        subCollection: 'Hlavní sbírka',
        objectType: '',
        catalogingStatus: 'Zapsán',
        author: '',
        description: '',
        extendedDescription: '',
        material: '',
        technique: '',
        datingText: '',
        datingFrom: '',
        datingTo: '',
        countryOfOrigin: '',
        acquisitionMethod: 'Dar',
        acquisitionDate: '',
        acquiredFrom: '',
        locationBuilding: '',
        locationRoom: '',
        permanentLocation: '',
        objectCondition: 'Dobrý',
        spravce: '',
        oddeleni: '',
        insuranceValue: '',
        weight: '',
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

    useEffect(() => {
        getDictionaries().then(data => setDicts(data)).catch(console.error);

        if (id) {
            setLoading(true);
            getAdminItem(id)
                .then(data => {
                    const safeVal = (v: any) => (v === null || v === undefined ? '' : v);
                    const safeYear = (v: any) => {
                        if (!v) return '';
                        const s = String(v);
                        return s.length >= 4 ? s.substring(0, 4) : s;
                    };

                    setInitialNumbers({
                        inventory: safeVal(data.inventoryNumber),
                        accession: safeVal(data.accessionNumber)
                    });

                    setForm({
                        ...data,
                        imageUrls: Array.isArray(data.imageUrls) ? data.imageUrls : [],
                        author: (data.authors && data.authors.length > 0) ? data.authors[0] : (data.author || ''),
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
                        objectCondition: safeVal(data.objectCondition) || 'Dobrý',
                        spravce: safeVal(data.spravce),
                        oddeleni: safeVal(data.oddeleni),
                        permanentLocation: safeVal(data.permanentLocation),
                        locationBuilding: safeVal(data.locationBuilding),
                        locationRoom: safeVal(data.locationRoom),
                        acquisitionMethod: safeVal(data.acquisitionMethod) || 'Dar',
                        acquisitionDate: safeVal(data.acquisitionDate),
                        acquiredFrom: safeVal(data.acquiredFrom),
                        insuranceValue: safeVal(data.insuranceValue),
                        materialNote: safeVal(data.materialNote),
                        originPlace: safeVal(data.originPlace),
                        findingLocality: safeVal(data.findingLocality),
                        quantity: data.quantity ?? 1,
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
                    });
                })
                .catch(console.error)
                .finally(() => setLoading(false));

            loadAttachments();
        } else {
            getNextAvailableNumbers().then((next: { accession?: string; inventory?: string }) => {
                if (next) {
                    setSuggestions({ accession: next.accession || '', inventory: next.inventory || '' });
                    setForm((prev: any) => ({
                        ...prev,
                        accessionNumber: prev.accessionNumber || next.accession || '',
                        inventoryNumber: prev.inventoryNumber || next.inventory || ''
                    }));
                }
            }).catch(console.error);
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

    const handleLegacyChange = (key: string, val: string) => {
        setForm((prev: any) => ({
            ...prev,
            legacyData: {
                ...(prev.legacyData || {}),
                [key]: val
            }
        }));
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !id) return;

        setUploading(true);
        try {
            const res = await uploadItemImage(Number(id), file);
            const fresh = await getAdminItem(id);
            if (fresh) {
                setForm((prev: any) => ({
                    ...prev,
                    ...fresh,
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

    const setCenturyDating = (fromYear: number, toYear: number, text: string) => {
        setForm((prev: any) => ({
            ...prev,
            datingFrom: fromYear,
            datingTo: toYear,
            datingText: prev.datingText ? prev.datingText : text
        }));
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

        if (!currentInv && !currentAcc) {
            setGlobalError('Předmět musí mít vyplněno alespoň inventární číslo nebo přírůstkové číslo.');
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

        if (form.datingFrom !== '' && form.datingFrom !== null && form.datingFrom !== undefined &&
            form.datingTo !== '' && form.datingTo !== null && form.datingTo !== undefined) {
            const fromYear = Number(form.datingFrom);
            const toYear = Number(form.datingTo);
            if (!isNaN(fromYear) && !isNaN(toYear) && fromYear > toYear) {
                setGlobalError('Rok od nesmí být větší než rok do.');
                setActiveTab('description');
                return;
            }
        }

        const formatDatingDate = (val: any) => {
            if (!val && val !== 0) return null;
            const s = String(val).trim();
            if (/^-?\d{1,4}$/.test(s)) {
                const isNeg = s.startsWith('-');
                const numStr = isNeg ? s.substring(1) : s;
                const padded = numStr.padStart(4, '0');
                return `${isNeg ? '-' : ''}${padded}-01-01`;
            }
            return s.length >= 10 ? s.substring(0, 10) : null;
        };

        setLoading(true);

        const payload = {
            title: form.title || '',
            accessionNumber: form.accessionNumber || '',
            inventoryNumber: form.inventoryNumber || '',
            subCollection: form.subCollection || '',
            objectType: form.objectType || '',
            catalogingStatus: form.catalogingStatus || 'Zapsán',
            author: form.author || '',
            description: form.description || '',
            extendedDescription: form.extendedDescription || '',
            material: form.material || '',
            technique: form.technique || '',
            datingText: form.datingText || '',
            datingFrom: formatDatingDate(form.datingFrom),
            datingTo: formatDatingDate(form.datingTo),
            countryOfOrigin: form.countryOfOrigin || '',
            acquisitionMethod: form.acquisitionMethod || 'Dar',
            acquisitionDate: form.acquisitionDate || null,
            acquiredFrom: form.acquiredFrom || '',
            locationBuilding: form.locationBuilding || '',
            locationRoom: form.locationRoom || '',
            permanentLocation: form.permanentLocation || '',
            objectCondition: form.objectCondition || 'Dobrý',
            spravce: form.spravce || '',
            oddeleni: form.oddeleni || '',
            insuranceValue: form.insuranceValue ? parseFloat(form.insuranceValue.toString().replace(/\s/g, '')) : 0,
            weight: form.weight || '',
            published: form.published ?? false,
            auditComment: form.auditComment || '',
            latitude: (form.latitude !== '' && form.latitude !== null && !isNaN(parseFloat(form.latitude))) ? parseFloat(form.latitude) : null,
            longitude: (form.longitude !== '' && form.longitude !== null && !isNaN(parseFloat(form.longitude))) ? parseFloat(form.longitude) : null,
            coordinateSystem: form.coordinateSystem || 'WGS-84',
            markant: form.markant || '',
            signature: form.signature || '',
            dimensions: (form.dimensions || [])
                .filter((d: any) => d.id || (d.value !== '' && d.value !== null && !isNaN(Number(d.value))))
                .map((d: any) => ({
                    id: d.id || null,
                    type: d.dimensionType || 'Rozměr',
                    value: d.value === '' || d.value === null ? null : Number(d.value),
                    unit: d.unit ?? '',
                    note: d.note || null,
                    sortOrder: d.sortOrder ?? null
                })),
            legacyData: form.legacyData || {}
        };

        try {
            if (id) {
                await updateItem(Number(id), payload);
                const updated = await getAdminItem(id);
                if (updated) {
                    const safeVal = (v: any) => (v === null || v === undefined ? '' : v);
                    const safeYear = (v: any) => {
                        if (!v) return '';
                        const s = String(v);
                        return s.length >= 4 ? s.substring(0, 4) : s;
                    };
                    setInitialNumbers({
                        inventory: safeVal(updated.inventoryNumber),
                        accession: safeVal(updated.accessionNumber)
                    });
                    setForm((prev: any) => ({
                        ...prev,
                        ...updated,
                        imageUrls: Array.isArray(updated.imageUrls) ? updated.imageUrls : prev.imageUrls,
                        author: (updated.authors && updated.authors.length > 0) ? updated.authors[0] : (updated.author || prev.author),
                        material: (updated.materials && updated.materials.length > 0) ? updated.materials[0] : (updated.material || prev.material),
                        weight: safeVal(updated.weight),
                        title: safeVal(updated.title),
                        description: safeVal(updated.description),
                        extendedDescription: safeVal(updated.extendedDescription),
                        technique: safeVal(updated.technique),
                        datingText: safeVal(updated.datingText),
                        datingFrom: safeYear(updated.datingFrom),
                        datingTo: safeYear(updated.datingTo),
                        countryOfOrigin: safeVal(updated.countryOfOrigin),
                        objectCondition: safeVal(updated.objectCondition) || 'Dobrý',
                        spravce: safeVal(updated.spravce),
                        oddeleni: safeVal(updated.oddeleni),
                        permanentLocation: safeVal(updated.permanentLocation),
                        locationBuilding: safeVal(updated.locationBuilding),
                        locationRoom: safeVal(updated.locationRoom),
                        acquisitionMethod: safeVal(updated.acquisitionMethod) || 'Dar',
                        acquisitionDate: safeVal(updated.acquisitionDate),
                        acquiredFrom: safeVal(updated.acquiredFrom),
                        insuranceValue: safeVal(updated.insuranceValue),
                        materialNote: safeVal(updated.materialNote),
                        originPlace: safeVal(updated.originPlace),
                        findingLocality: safeVal(updated.findingLocality),
                        quantity: updated.quantity ?? 1,
                        published: updated.published ?? prev.published,
                        latitude: safeVal(updated.latitude),
                        longitude: safeVal(updated.longitude),
                        coordinateSystem: safeVal(updated.coordinateSystem) || 'WGS-84',
                        markant: safeVal(updated.markant),
                        signature: safeVal(updated.signature)
                    }));
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
                } else if (err.status === 409) {
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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden animate-in fade-in duration-300">
            {/* HLAVIČKA FORMULÁŘE */}
            <div className="px-6 py-4 border-b border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-white">
                <div className="min-w-0 max-w-xl">
                    <h3 className="text-lg font-black text-gray-900 tracking-tight truncate">
                        {id
                            ? `Kurátorský detail: ${form.inventoryNumber || form.accessionNumber || `#${id}`}${form.title ? ` | ${form.title}` : ''}`
                            : 'Založení nového sbírkového předmětu'}
                    </h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                        Kurátorská správa sbírek
                    </p>
                </div>
                <div className="flex items-center gap-2.5 flex-wrap">
                    <div className="flex items-center bg-gray-50 border rounded-full px-3 py-1 gap-2">
                        <span className={`text-[10px] font-black uppercase ${form.published ? 'text-green-600' : 'text-gray-400'}`}>
                            {form.published ? '● Zveřejněno' : '○ Neveřejné'}
                        </span>
                        <input
                            type="checkbox"
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
                                disabled={uploading}
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

            {/* KOMPAKTNÍ 5-ZÁLOŽKOVÁ NAVIGACE */}
            <div className="border-b border-gray-200 bg-gray-50 px-6 py-1.5 overflow-x-auto flex gap-2 select-none">
                {MAIN_TABS.map(tab => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`py-2 px-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 rounded-t-sm ${
                            activeTab === tab.id
                                ? 'text-[#00204a] border-[#00204a] bg-white shadow-xs font-black'
                                : 'text-gray-500 border-transparent hover:text-gray-800 hover:bg-gray-100'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

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
                </div>
            )}
            {globalError && (
                <div className="mx-6 mt-4 p-3 bg-red-50 border-l-4 border-red-600 text-xs text-red-700 font-bold rounded">
                    ⚠️ {globalError}
                </div>
            )}

            {/* TĚLO FORMULÁŘE */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* 1. ZÁKLADNÍ ÚDAJE & IDENTIFIKACE */}
                {activeTab === 'identity' && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <GovFormLabel htmlFor="accessionNumber">Přírůstkové číslo *</GovFormLabel>
                                <GovFormInput
                                    id="accessionNumber"
                                    value={form.accessionNumber || ''}
                                    onChange={(e: any) => setForm({ ...form, accessionNumber: e.target.value })}
                                    onBlur={(e: any) => handleNumberBlur('accession', e.target.value)}
                                    required
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
                                <GovFormLabel htmlFor="inventoryNumber">Inventární číslo</GovFormLabel>
                                <GovFormInput
                                    id="inventoryNumber"
                                    value={form.inventoryNumber || ''}
                                    onChange={(e: any) => setForm({ ...form, inventoryNumber: e.target.value })}
                                    onBlur={(e: any) => handleNumberBlur('inventory', e.target.value)}
                                />
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
                            <GovFormLabel htmlFor="title">Název sbírkového předmětu *</GovFormLabel>
                            <GovFormInput
                                id="title"
                                value={form.title || ''}
                                onChange={(e: any) => setForm({ ...form, title: e.target.value })}
                                required
                            />
                            {fieldErrors.title && <p className="text-xs font-bold text-red-600">{fieldErrors.title}</p>}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="space-y-1">
                                <GovFormLabel htmlFor="subCollection">Fond / Podsbírka</GovFormLabel>
                                <GovFormInput
                                    id="subCollection"
                                    value={form.subCollection || ''}
                                    onChange={(e: any) => setForm({ ...form, subCollection: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <GovFormLabel htmlFor="objectType">Typ předmětu</GovFormLabel>
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
                                    <GovFormLabel htmlFor="spravce">Správce sbírky</GovFormLabel>
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
                                <GovFormLabel htmlFor="objectCondition">Fyzický stav</GovFormLabel>
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
                                <GovFormLabel htmlFor="signature">Signatura / Nápis</GovFormLabel>
                                <GovFormInput
                                    id="signature"
                                    value={form.signature || ''}
                                    onChange={(e: any) => setForm({ ...form, signature: e.target.value })}
                                    placeholder="např. J. Mánes 1865 vpravo dole"
                                />
                            </div>
                            <div className="space-y-1">
                                <GovFormLabel htmlFor="markant">Značení / Markant</GovFormLabel>
                                <GovFormInput
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
                                            <GovFormLabel htmlFor="bulkCount">Počet duplikátů</GovFormLabel>
                                            <GovFormInput
                                                id="bulkCount"
                                                type="number"
                                                value={bulkParams.count}
                                                onChange={(e: any) => setBulkParams({ ...bulkParams, count: parseInt(e.target.value, 10) || 1 })}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <GovFormLabel htmlFor="titleSuffix">Přípona názvu</GovFormLabel>
                                            <GovFormInput
                                                id="titleSuffix"
                                                value={bulkParams.titleSuffix}
                                                onChange={(e: any) => setBulkParams({ ...bulkParams, titleSuffix: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <GovFormLabel htmlFor="invNumSuffix">Přípona inv. čísla</GovFormLabel>
                                            <GovFormInput
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
                            <MuseumSection itemId={id ? Number(id) : undefined} section="basic" />
                        </div>
                    </div>
                )}

                {/* 2. POPIS & ROZMĚRY */}
                {activeTab === 'description' && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                        {/* Autor / Původce */}
                        <div className="space-y-1" ref={authorDropdownRef}>
                            <div className="flex items-center justify-between">
                                <GovFormLabel htmlFor="author">Autor / Tvůrce / Původce</GovFormLabel>
                                <button
                                    type="button"
                                    onClick={() => openDictModal('AUTHOR', 'Autor / Původce', 'author')}
                                    className="text-[10px] font-bold text-blue-600 hover:text-blue-800 underline"
                                >
                                    + Nový autor
                                </button>
                            </div>
                            <div className="relative">
                                <input
                                    type="text"
                                    id="author"
                                    className="w-full bg-white border border-gray-300 rounded px-3 py-1.5 text-xs text-gray-700 focus:outline-none focus:border-[#00204a]"
                                    value={form.author || ''}
                                    onFocus={() => setShowAuthors(true)}
                                    onChange={e => {
                                        setForm({ ...form, author: e.target.value });
                                        setAuthorSearch(e.target.value);
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
                                                setForm((prev: any) => ({ ...prev, author: matches[0] }));
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
                                                        setForm({ ...form, author: a });
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
                                    <GovFormLabel htmlFor="datingFrom">Rok od</GovFormLabel>
                                    <input
                                        type="number"
                                        id="datingFrom"
                                        min="-5000"
                                        max="2100"
                                        step="1"
                                        className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-800 font-mono focus:outline-none focus:border-[#00204a]"
                                        value={form.datingFrom !== undefined && form.datingFrom !== null ? form.datingFrom : ''}
                                        onChange={e => setForm({ ...form, datingFrom: e.target.value })}
                                        placeholder="např. 1850"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <GovFormLabel htmlFor="datingTo">Rok do</GovFormLabel>
                                    <input
                                        type="number"
                                        id="datingTo"
                                        min="-5000"
                                        max="2100"
                                        step="1"
                                        className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-800 font-mono focus:outline-none focus:border-[#00204a]"
                                        value={form.datingTo !== undefined && form.datingTo !== null ? form.datingTo : ''}
                                        onChange={e => setForm({ ...form, datingTo: e.target.value })}
                                        placeholder="např. 1870"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <GovFormLabel htmlFor="datingText">Datace textem</GovFormLabel>
                                    <GovFormInput
                                        id="datingText"
                                        value={form.datingText || ''}
                                        onChange={(e: any) => setForm({ ...form, datingText: e.target.value })}
                                        placeholder="např. 60. léta 19. století"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Materiál a Technika */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <GovFormLabel htmlFor="material">Materiál (Číselník)</GovFormLabel>
                                    <button
                                        type="button"
                                        onClick={() => openDictModal('MATERIAL', 'Materiál', 'material')}
                                        className="text-[10px] font-bold text-blue-600 hover:text-blue-800 underline"
                                    >
                                        + Nový materiál
                                    </button>
                                </div>
                                <select
                                    id="material"
                                    className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:border-[#00204a]"
                                    value={form.material || ''}
                                    onChange={e => setForm({ ...form, material: e.target.value })}
                                >
                                    <option value="">-- Vyberte materiál --</option>
                                    {form.material && !dicts.materials?.includes(form.material) && (
                                        <option value={form.material}>{form.material}</option>
                                    )}
                                    {dicts.materials?.map((m: string) => (
                                        <option key={m} value={m}>
                                            {m}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <GovFormLabel htmlFor="technique">Technika (Číselník)</GovFormLabel>
                                    <button
                                        type="button"
                                        onClick={() => openDictModal('TECHNIQUE', 'Technika', 'technique')}
                                        className="text-[10px] font-bold text-blue-600 hover:text-blue-800 underline"
                                    >
                                        + Nová technika
                                    </button>
                                </div>
                                <select
                                    id="technique"
                                    className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:border-[#00204a]"
                                    value={form.technique || ''}
                                    onChange={e => setForm({ ...form, technique: e.target.value })}
                                >
                                    <option value="">-- Vyberte techniku --</option>
                                    {form.technique && !dicts.techniques?.includes(form.technique) && (
                                        <option value={form.technique}>{form.technique}</option>
                                    )}
                                    {dicts.techniques?.map((t: string) => (
                                        <option key={t} value={t}>
                                            {t}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Hierarchické číselníky materiálu a techniky */}
                        <div className="pt-2 border-t border-gray-200">
                            <h4 className="text-xs font-black text-gray-700 uppercase tracking-wider mb-2">
                                Hierarchické vazby materiálů a technik
                            </h4>
                            <MuseumSection itemId={id ? Number(id) : undefined} section="materials" />
                        </div>

                        {/* Popis předmětu */}
                        <div className="space-y-1">
                            <GovFormLabel htmlFor="description">Základní badatelský popis</GovFormLabel>
                            <textarea
                                id="description"
                                rows={3}
                                className="w-full bg-white border border-gray-300 rounded px-3 py-1.5 text-xs text-gray-800 focus:outline-none focus:border-[#00204a]"
                                value={form.description || ''}
                                onChange={e => setForm({ ...form, description: e.target.value })}
                                placeholder="Podrobný popis vizuálního stavu, námětu, barevnosti..."
                            />
                        </div>

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
                                    <GovFormLabel htmlFor="weight">Váha (g / kg)</GovFormLabel>
                                    <GovFormInput id="weight" value={form.weight || ''} onChange={(e: any) => setForm({ ...form, weight: e.target.value })} />
                                </div>
                                <div className="space-y-1">
                                    <GovFormLabel htmlFor="legacyVyska">Rychlá výška (cm)</GovFormLabel>
                                    <GovFormInput id="legacyVyska" value={form.legacyData?.vyska || ''} onChange={(e: any) => handleLegacyChange('vyska', e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                    <GovFormLabel htmlFor="legacySirka">Rychlá šířka (cm)</GovFormLabel>
                                    <GovFormInput id="legacySirka" value={form.legacyData?.sirka || ''} onChange={(e: any) => handleLegacyChange('sirka', e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                    <GovFormLabel htmlFor="legacyHloubka">Rychlá hloubka (cm)</GovFormLabel>
                                    <GovFormInput id="legacyHloubka" value={form.legacyData?.hloubka || ''} onChange={(e: any) => handleLegacyChange('hloubka', e.target.value)} />
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
                                                onClick={() => removeDimensionRow(idx)}
                                                className="p-1.5 text-red-500 hover:text-red-700 rounded"
                                                title="Odebrat rozměr"
                                            >
                                                <FaTrash size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Fotodokumentace */}
                        {form.imageUrls && form.imageUrls.length > 0 && (
                            <div className="space-y-1">
                                <GovFormLabel>Fotodokumentace</GovFormLabel>
                                <div className="flex gap-3 overflow-x-auto pb-2 pt-1">
                                    {form.imageUrls.map((url: string, idx: number) => (
                                        <div key={idx} className="min-w-[120px] h-[90px] bg-gray-50 border rounded overflow-hidden shadow-xs">
                                            <img src={url} className="w-full h-full object-cover" alt="" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 3. PŮVOD & NABYTÍ */}
                {activeTab === 'provenance' && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                        {/* Evidence akvizic */}
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded">
                            <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider mb-2">
                                Akviziční záznamy předmětu (1:N)
                            </h4>
                            <AcquisitionSection itemId={id ? Number(id) : undefined} />
                        </div>

                        {/* Základní způsob nabytí */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="space-y-1">
                                <GovFormLabel htmlFor="acquisitionMethod">Způsob nabytí</GovFormLabel>
                                <select
                                    id="acquisitionMethod"
                                    className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:border-[#00204a]"
                                    value={form.acquisitionMethod || ''}
                                    onChange={e => setForm({ ...form, acquisitionMethod: e.target.value })}
                                >
                                    <option>Dar</option>
                                    <option>Koupě</option>
                                    <option>Vlastní sběr</option>
                                    <option>Archeologický výzkum</option>
                                    <option>Převod</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <GovFormLabel htmlFor="acquisitionDate">Datum nabytí do muzea</GovFormLabel>
                                <GovFormInput
                                    type="date"
                                    id="acquisitionDate"
                                    value={form.acquisitionDate || ''}
                                    onChange={(e: any) => setForm({ ...form, acquisitionDate: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1">
                                <GovFormLabel htmlFor="acquiredFrom">Nabyto od (dárce/původce)</GovFormLabel>
                                <GovFormInput
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
                                <GovFormLabel htmlFor="originPlace">Místo vzniku</GovFormLabel>
                                <GovFormInput
                                    id="originPlace"
                                    value={form.originPlace || ''}
                                    onChange={(e: any) => setForm({ ...form, originPlace: e.target.value })}
                                    placeholder="např. Brno, Vídeň, Čechy"
                                />
                            </div>

                            {/* Země původu s opraveným "+ Nová země" */}
                            <div className="space-y-1" ref={countryDropdownRef}>
                                <div className="flex items-center justify-between">
                                    <GovFormLabel htmlFor="countryOfOrigin">Země původu (Číselník)</GovFormLabel>
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

                        {/* Lokalita a fond */}
                        <div className="pt-2 border-t border-gray-200">
                            <h4 className="text-xs font-black text-gray-700 uppercase tracking-wider mb-2">
                                Lokalita a sbírkový fond
                            </h4>
                            <MuseumSection itemId={id ? Number(id) : undefined} section="locality" />
                        </div>
                    </div>
                )}

                {/* 4. UMÍSTĚNÍ & ULOŽENÍ */}
                {activeTab === 'storage' && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="space-y-1">
                                <GovFormLabel htmlFor="locationBuilding">Depozitář (Budova)</GovFormLabel>
                                <GovFormInput
                                    id="locationBuilding"
                                    value={form.locationBuilding || ''}
                                    onChange={(e: any) => setForm({ ...form, locationBuilding: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1">
                                <GovFormLabel htmlFor="locationRoom">Místnost</GovFormLabel>
                                <GovFormInput
                                    id="locationRoom"
                                    value={form.locationRoom || ''}
                                    onChange={(e: any) => setForm({ ...form, locationRoom: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1">
                                <GovFormLabel htmlFor="permanentLocation">Trvalé uložení / Police</GovFormLabel>
                                <GovFormInput
                                    id="permanentLocation"
                                    value={form.permanentLocation || ''}
                                    onChange={(e: any) => setForm({ ...form, permanentLocation: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <GovFormLabel htmlFor="oddeleni">Oddělení muzea</GovFormLabel>
                                <GovFormInput
                                    id="oddeleni"
                                    value={form.oddeleni || ''}
                                    onChange={(e: any) => setForm({ ...form, oddeleni: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1">
                                <GovFormLabel htmlFor="insuranceValue">Pojistná hodnota (Kč)</GovFormLabel>
                                <GovFormInput
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
                                    <GovFormLabel htmlFor="latitude">Zeměpisná šířka (Lat, -90 až 90)</GovFormLabel>
                                    <GovFormInput
                                        id="latitude"
                                        type="number"
                                        step="any"
                                        value={form.latitude !== null && form.latitude !== undefined ? form.latitude : ''}
                                        onChange={(e: any) => setForm({ ...form, latitude: e.target.value })}
                                        placeholder="např. 49.1951"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <GovFormLabel htmlFor="longitude">Zeměpisná délka (Lon, -180 až 180)</GovFormLabel>
                                    <GovFormInput
                                        id="longitude"
                                        type="number"
                                        step="any"
                                        value={form.longitude !== null && form.longitude !== undefined ? form.longitude : ''}
                                        onChange={(e: any) => setForm({ ...form, longitude: e.target.value })}
                                        placeholder="např. 16.6068"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <GovFormLabel htmlFor="coordinateSystem">Souřadnicový systém</GovFormLabel>
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
                        <div className="flex flex-wrap gap-1.5 p-1 bg-gray-100 rounded-md border border-gray-200">
                            {[
                                { id: 'documentation', label: '📸 Dokumentace' },
                                { id: 'classification', label: '🏷️ Klasifikace' },
                                { id: 'determination', label: '🔬 Určení' },
                                { id: 'deaccession', label: '⚠️ Vyřazení' },
                                { id: 'demus', label: '🏛️ DEMUS trezor' },
                                { id: 'attachments', label: `📎 Přílohy (${attachments.length})` },
                                { id: 'audit', label: '📝 Audit' }
                            ].map(st => (
                                <button
                                    key={st.id}
                                    type="button"
                                    onClick={() => setMuseumSubTab(st.id as any)}
                                    className={`px-3 py-1.5 text-xs font-bold rounded transition-all ${
                                        museumSubTab === st.id
                                            ? 'bg-[#00204a] text-white shadow-xs'
                                            : 'text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    {st.label}
                                </button>
                            ))}
                        </div>

                        {/* Obsah vybrané podzáložky */}
                        <div className="p-4 bg-white rounded border border-gray-200">
                            {museumSubTab === 'documentation' && (
                                <MuseumSection itemId={id ? Number(id) : undefined} section="documentation" />
                            )}
                            {museumSubTab === 'classification' && (
                                <MuseumSection itemId={id ? Number(id) : undefined} section="classification" />
                            )}
                            {museumSubTab === 'determination' && (
                                <MuseumSection itemId={id ? Number(id) : undefined} section="determination" />
                            )}
                            {museumSubTab === 'deaccession' && (
                                <MuseumSection itemId={id ? Number(id) : undefined} section="deaccession" />
                            )}
                            {museumSubTab === 'demus' && (
                                <div className="space-y-4">
                                    <MuseumSection itemId={id ? Number(id) : undefined} section="history" />
                                    <div className="p-4 bg-gray-50 border border-gray-200 rounded grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="sm:col-span-2 pb-1 border-b">
                                            <h5 className="text-xs font-black text-gray-700 uppercase tracking-widest">
                                                Původní DEMUS metadata (Access Parita)
                                            </h5>
                                        </div>
                                        <div className="space-y-1">
                                            <GovFormLabel htmlFor="zpusobNabyti">Původní způsob nabytí</GovFormLabel>
                                            <GovFormInput
                                                id="zpusobNabyti"
                                                value={form.legacyData?.zpusob_nabyti || ''}
                                                onChange={(e: any) => handleLegacyChange('zpusob_nabyti', e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <GovFormLabel htmlFor="predchoziMajitel">Předchozí vlastník</GovFormLabel>
                                            <GovFormInput
                                                id="predchoziMajitel"
                                                value={form.legacyData?.predchozi_majitel || ''}
                                                onChange={(e: any) => handleLegacyChange('predchozi_majitel', e.target.value)}
                                            />
                                        </div>
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
                                                        <GovFormLabel htmlFor="attachmentFile">Soubor</GovFormLabel>
                                                        <input
                                                            id="attachmentFile"
                                                            type="file"
                                                            onChange={e => setAttFile(e.target.files?.[0] || null)}
                                                            className="w-full text-xs text-gray-700 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-[#00204a] file:text-white hover:file:bg-[#003366] cursor-pointer"
                                                        />
                                                        {attFile && <p className="text-[11px] font-bold text-blue-700">Vybrán soubor: {attFile.name}</p>}
                                                    </div>
                                                    <div className="space-y-1">
                                                        <GovFormLabel htmlFor="attachmentCaption">Popis souboru</GovFormLabel>
                                                        <GovFormInput
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
                                                                        <p className="font-bold text-gray-900 truncate">{att.fileName}</p>
                                                                        <p className="text-[11px] text-gray-500">
                                                                            {att.caption && <span className="font-semibold text-gray-700 mr-2">{att.caption}</span>}
                                                                            <span>{(att.fileSize / 1024).toFixed(1)} KB</span>
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-1.5">
                                                                    <a
                                                                        href={`${API_BASE}/api/v1/items/${id}/attachments/${att.id}/file`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="inline-flex items-center gap-1 text-xs font-bold text-[#00204a] hover:underline px-2.5 py-1 bg-gray-100 rounded"
                                                                    >
                                                                        <FaFileDownload /> Stáhnout
                                                                    </a>
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
                                        <GovFormLabel htmlFor="auditComment">Zdůvodnění provedených změn (Auditní stopa) *</GovFormLabel>
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

                {/* SPOLEČNÁ TLAČÍTKA ULOŽENÍ – VIDITELNÁ NA VŠECH TABECH */}
                <div className="pt-4 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex gap-2.5">
                        <GovButton
                            nativeType="submit"
                            disabled={loading || !validity.accession || !validity.inventory}
                            type="solid"
                            color="primary"
                            size="s"
                        >
                            {loading ? 'Ukládám záznam...' : 'Uložit sbírkový předmět'}
                        </GovButton>
                        <GovButton
                            nativeType="button"
                            type="outlined"
                            color="neutral"
                            size="s"
                            onClick={() => {
                                const search = location.state?.fromSearch || sessionStorage.getItem('adminItemsSearch') || '';
                                navigate(`/admin/items${search}`);
                            }}
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
    );
}
