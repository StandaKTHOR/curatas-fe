import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    getAdminItem,
    updateItem,
    createItem,
    uploadItemImage,
    bulkCopyItem,
    getDictionaries,
    getNextAvailableNumbers,
    checkUniqueness,
    ApiError,
    listAttachments,
    uploadAttachment,
    deleteAttachment,
    API_BASE
} from '../lib/api';
import { useAuth } from '../components/AuthContext';
import { GovButton, GovFormInput, GovFormLabel, GovMessage } from '@gov-design-system-ce/react';
import AddDictionaryModal from '../components/AddDictionaryModal';
import { FaPlus, FaTrash, FaMapMarkerAlt, FaExternalLinkAlt, FaPaperclip, FaFileAlt, FaFileDownload, FaUpload } from 'react-icons/fa';

export default function AdminItemForm() {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();

    // --- STAVY PRO UI ---
    const [activeTab, setActiveTab] = useState('identity');
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [validity, setValidity] = useState({ accession: true, inventory: true });
    const [suggestions, setSuggestions] = useState({ accession: '', inventory: '' });

    // --- STAV PRO CHYBY (KOMPLEXNÍ ERROR STAV) ---
    const [globalError, setGlobalError] = useState<string | null>(null);
    const [unauthorizedError, setUnauthorizedError] = useState(false);
    const [forbiddenError, setForbiddenError] = useState(false);
    const [conflictError, setConflictError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    // --- STAVY PRO PŘÍLOHY ---
    const [attachments, setAttachments] = useState<any[]>([]);
    const [attFile, setAttFile] = useState<File | null>(null);
    const [attCaption, setAttCaption] = useState('');
    const [attUploading, setAttUploading] = useState(false);

    // --- STAV PRO INLINE MODÁL ČÍSELNÍKU ---
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
            'OBJECT_TYPE': 'objectTypes',
            'MATERIAL': 'materials',
            'TECHNIQUE': 'techniques',
            'SPRAVCE': 'spravci',
            'COUNTRY': 'countries',
            'AUTHOR': 'authors'
        };
        const dictKey = fieldMap[newItem.type];
        if (dictKey) {
            setDicts((prev: any) => ({
                ...prev,
                [dictKey]: [...(prev[dictKey] || []), newItem.label]
            }));
        }
        if (dictModal.targetField) {
            setForm((prev: any) => ({
                ...prev,
                [dictModal.targetField]: newItem.label
            }));
        }
        setDictModal({ isOpen: false, type: '', title: '', targetField: '' });
    };

    const loadAttachments = async () => {
        if (id) {
            try {
                const list = await listAttachments(Number(id));
                setAttachments(list);
            } catch (e) {
                console.error('Chyba načítání příloh:', e);
            }
        }
    };

    useEffect(() => {
        if (id) {
            loadAttachments();
        }
    }, [id]);

    const handleUploadAttachment = async () => {
        if (!attFile || !id) return;
        setAttUploading(true);
        try {
            await uploadAttachment(Number(id), attFile, attCaption);
            setAttFile(null);
            setAttCaption('');
            await loadAttachments();
            alert('Příloha byla úspěšně nahrána.');
        } catch (err: any) {
            alert('Chyba při nahrávání přílohy: ' + err.message);
        } finally {
            setAttUploading(false);
        }
    };

    const handleDeleteAttachment = async (attId: number) => {
        if (!id || !window.confirm('Opravdu chcete tuto přílohu smazat?')) return;
        try {
            await deleteAttachment(Number(id), attId);
            await loadAttachments();
        } catch (err: any) {
            alert('Chyba při mazání přílohy: ' + err.message);
        }
    };

    const addDimensionRow = () => {
        setForm((prev: any) => ({
            ...prev,
            dimensions: [...(prev.dimensions || []), { dimensionType: 'Výška', value: '', unit: 'cm' }]
        }));
    };

    const removeDimensionRow = (idx: number) => {
        setForm((prev: any) => ({
            ...prev,
            dimensions: prev.dimensions.filter((_: any, i: number) => i !== idx)
        }));
    };

    const updateDimensionRow = (idx: number, field: string, val: any) => {
        setForm((prev: any) => {
            const updated = [...(prev.dimensions || [])];
            updated[idx] = { ...updated[idx], [field]: val };
            return { ...prev, dimensions: updated };
        });
    };

    // --- STAVY PRO VLASTNÍ DROPDOWNY ČÍSELNÍKŮ ---
    const [showCountries, setShowCountries] = useState(false);
    const [countrySearch, setCountrySearch] = useState('');
    const countryDropdownRef = useRef<HTMLDivElement>(null);

    const [showAuthors, setShowAuthors] = useState(false);
    const [authorSearch, setAuthorSearch] = useState('');
    const authorDropdownRef = useRef<HTMLDivElement>(null);

    // --- STAV PRO ČÍSELNÍKY Z API ---
    const [dicts, setDicts] = useState<any>({
        objectTypes: [],
        materials: [],
        techniques: [],
        spravci: [],
        countries: [],
        authors: []
    });

    // --- STAV PRO HROMADNÉ ZAKLÁDÁNÍ ---
    const [bulkMode, setBulkMode] = useState(false);
    const [bulkParams, setBulkParams] = useState({
        count: 10,
        titleSuffix: ' _',
        invNumSuffix: '/_'
    });

    // --- HLAVNÍ STAV FORMULÁŘE ---
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
        countryOfOrigin: '',
        acquisitionMethod: 'Dar',
        acquisitionDate: '',
        acquiredFrom: '',
        locationBuilding: '',
        locationRoom: '',
        objectCondition: 'Dobrý',
        spravce: '',
        oddeleni: '',
        insuranceValue: '',
        weight: '',
        dimensions: [],
        latitude: '',
        longitude: '',
        coordinateSystem: 'WGS-84',
        published: true,
        auditComment: '',
        imageUrls: [],
        legacyData: {}
    });

    // Načtení dat při startu
    useEffect(() => {
        getDictionaries().then(data => setDicts(data)).catch(console.error);

        if (id) {
            setLoading(true);
            getAdminItem(id)
                .then(data => {
                    const safeVal = (v: any) => (v === null || v === undefined) ? '' : v;
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
                        countryOfOrigin: safeVal(data.countryOfOrigin),
                        objectCondition: safeVal(data.objectCondition),
                        spravce: safeVal(data.spravce),
                        oddeleni: safeVal(data.oddeleni),
                        latitude: safeVal(data.latitude),
                        longitude: safeVal(data.longitude),
                        coordinateSystem: safeVal(data.coordinateSystem) || 'WGS-84',
                        dimensions: Array.isArray(data.dimensions)
                            ? data.dimensions.map((d: any) => ({
                                dimensionType: d.type || d.dimensionType || '',
                                value: d.value !== undefined && d.value !== null ? d.value : '',
                                unit: d.unit || 'cm'
                            }))
                            : [],
                        auditComment: '',
                        legacyData: data.legacyData || {}
                    });
                })
                .catch(err => {
                    setGlobalError("Nepodařilo se načíst detail předmětu: " + err.message);
                })
                .finally(() => setLoading(false));
        } else {
            getNextAvailableNumbers().then(next => {
                setSuggestions({ accession: next.accession, inventory: next.inventory });
                setForm((prev: any) => ({
                    ...prev,
                    accessionNumber: next.accession,
                    inventoryNumber: next.inventory,
                    spravce: user?.name || 'Admin Uživatel',
                    imageUrls: [],
                    legacyData: {},
                    author: '',
                    material: '',
                    technique: '',
                    weight: '',
                    latitude: '',
                    longitude: '',
                    coordinateSystem: 'WGS-84',
                    dimensions: []
                }));
            }).catch(console.error);
        }

        const handleClickOutside = (event: MouseEvent) => {
            if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
                setShowCountries(false);
            }
            if (authorDropdownRef.current && !authorDropdownRef.current.contains(event.target as Node)) {
                setShowAuthors(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [id, user]);

    const handleNumberBlur = async (type: 'accession' | 'inventory', value: string) => {
        if (!value || id) return;
        try {
            const { exists } = await checkUniqueness(type, value);
            setValidity(prev => ({ ...prev, [type]: !exists }));
            if (exists) {
                const next = await getNextAvailableNumbers();
                setSuggestions(prev => ({ ...prev, [type]: next[type] }));
            }
        } catch (err) {
            console.error("Chyba validace čísla:", err);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !id) return;
        setUploading(true);
        try {
            const result = await uploadItemImage(Number(id), file);
            setForm((prev: any) => ({
                ...prev,
                imageUrls: [...(prev.imageUrls || []), result.url]
            }));
            alert("Fotografie byla nahrána.");
        } catch (err: any) {
            alert("Chyba při nahrávání: " + err.message);
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const handleLegacyChange = (key: string, value: string) => {
        setForm((prev: any) => ({
            ...prev,
            legacyData: { ...prev.legacyData, [key]: value }
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Vyčištění předchozích chyb
        setGlobalError(null);
        setUnauthorizedError(false);
        setForbiddenError(false);
        setConflictError(null);
        setFieldErrors({});

        if (!validity.accession || !validity.inventory) {
            setGlobalError("Nelze uložit: Evidenční čísla musí být unikátní!");
            return;
        }

        if (form.latitude !== '' && form.latitude !== null && form.latitude !== undefined) {
            const lat = parseFloat(form.latitude);
            if (isNaN(lat) || lat < -90 || lat > 90) {
                setGlobalError("Zeměpisná šířka (Latitude) musí být v rozsahu od -90 do 90 stupňů.");
                setActiveTab('storage');
                return;
            }
        }

        if (form.longitude !== '' && form.longitude !== null && form.longitude !== undefined) {
            const lon = parseFloat(form.longitude);
            if (isNaN(lon) || lon < -180 || lon > 180) {
                setGlobalError("Zeměpisná délka (Longitude) musí být v rozsahu od -180 do 180 stupňů.");
                setActiveTab('storage');
                return;
            }
        }

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
            countryOfOrigin: form.countryOfOrigin || '',
            acquisitionMethod: form.acquisitionMethod || 'Dar',
            acquisitionDate: form.acquisitionDate || null,
            acquiredFrom: form.acquiredFrom || '',
            locationBuilding: form.locationBuilding || '',
            locationRoom: form.locationRoom || '',
            objectCondition: form.objectCondition || 'Dobrý',
            spravce: form.spravce || '',
            oddeleni: form.oddeleni || '',
            insuranceValue: form.insuranceValue ? parseFloat(form.insuranceValue.toString().replace(/\s/g, '')) : 0,
            weight: form.weight || '',
            published: form.published,
            auditComment: form.auditComment || '',
            latitude: (form.latitude !== '' && form.latitude !== null && !isNaN(parseFloat(form.latitude))) ? parseFloat(form.latitude) : null,
            longitude: (form.longitude !== '' && form.longitude !== null && !isNaN(parseFloat(form.longitude))) ? parseFloat(form.longitude) : null,
            coordinateSystem: form.coordinateSystem || 'WGS-84',
            dimensions: (form.dimensions || [])
                .filter((d: any) => d.value !== '' && d.value !== null && !isNaN(Number(d.value)))
                .map((d: any) => ({
                    type: d.dimensionType || 'Rozměr',
                    value: Number(d.value),
                    unit: d.unit || 'cm'
                })),
            legacyData: form.legacyData || {}
        };

        try {
            if (id) {
                await updateItem(Number(id), payload);
            } else {
                const savedItem = await createItem(payload);
                if (bulkMode && savedItem?.id) {
                    await bulkCopyItem(savedItem.id, bulkParams);
                }
            }
            navigate('/admin/items');
        } catch (err) {
            console.error("Chyba při ukládání záznamu:", err);
            if (err instanceof ApiError) {
                if (err.status === 401) {
                    setUnauthorizedError(true);
                } else if (err.status === 403) {
                    setForbiddenError(true);
                } else if (err.status === 409) {
                    setConflictError(err.message || "Předmět s tímto inventárním číslem již existuje. Zvolte prosím unikátní číslo.");
                } else {
                    setGlobalError(err.message || "Nepodařilo se uložit záznam.");
                }
                if (err.fieldErrors) {
                    setFieldErrors(err.fieldErrors);
                }
            } else if (err instanceof Error) {
                setGlobalError(err.message);
            } else {
                setGlobalError("Došlo k neočekávané chybě.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded border border-gray-200 shadow-sm animate-in fade-in duration-300">

            {/* PANEL PRO GLOBÁLNÍ CHYBOVÉ STAVY */}
            {unauthorizedError && (
                <div className="p-4 bg-red-50 border-b border-red-200">
                    <GovMessage color="error" type="bold">
                        <div>
                            <div className="font-extrabold text-sm mb-1">Přihlášení vypršelo</div>
                            <p className="text-xs">Vaše přihlášení již není platné. Přihlaste se prosím znovu před uložením rozpracované práce.</p>
                        </div>
                    </GovMessage>
                </div>
            )}

            {forbiddenError && (
                <div className="p-4 bg-red-50 border-b border-red-200">
                    <GovMessage color="error" type="bold">
                        <div>
                            <div className="font-extrabold text-sm mb-1">Nedostatečná oprávnění</div>
                            <p className="text-xs">Nemáte potřebná kurátorská oprávnění pro provádění změn v tomto evidenčním fondu.</p>
                        </div>
                    </GovMessage>
                </div>
            )}

            {conflictError && (
                <div className="p-4 bg-red-50 border-b border-red-200">
                    <GovMessage color="error" type="bold">
                        <div>
                            <div className="font-extrabold text-sm mb-1">Konflikt dat</div>
                            <p className="text-xs">{conflictError}</p>
                        </div>
                    </GovMessage>
                </div>
            )}

            {globalError && (
                <div className="p-4 bg-red-50 border-b border-red-200">
                    <GovMessage color="error" type="bold">
                        <div>
                            <div className="font-extrabold text-sm mb-1">Chyba ukládání</div>
                            <p className="text-xs">{globalError}</p>
                        </div>
                    </GovMessage>
                </div>
            )}

            {/* HLAVIČKA FORMULÁŘE */}
            <div className="px-8 py-5 border-b border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h3 className="text-xl font-black text-gray-900 tracking-tight">
                        {id ? `Kurátorský detail: ${form.inventoryNumber || form.accessionNumber}` : 'Založení nového sbírkového předmětu'}
                    </h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">MZM Administrační panel</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-gray-50 border rounded-full px-3 py-1 gap-2">
                        <span className={`text-[9px] font-black uppercase ${form.published ? 'text-green-600' : 'text-gray-400'}`}>
                            {form.published ? '● Zveřejněno' : '○ Neveřejné'}
                        </span>
                        <input
                            type="checkbox"
                            checked={form.published || false}
                            onChange={(e) => setForm({...form, published: e.target.checked})}
                            className="cursor-pointer rounded border-gray-300 text-[#00204a] focus:ring-0"
                            style={{ width: '16px', height: '16px' }}
                        />
                    </div>
                    {id && (
                        <>
                            <input type="file" id="photo-up" hidden onChange={handleFileChange} accept="image/*" />
                            <GovButton
                                type="outlined"
                                color="neutral"
                                size="s"
                                disabled={uploading}
                                onClick={() => document.getElementById('photo-up')?.click()}
                            >
                                {uploading ? 'Nahrávám...' : '📸 Nahrát foto'}
                            </GovButton>
                        </>
                    )}
                </div>
            </div>

            {/* ZÁLOŽKOVÁ NAVIGACE (TABS) */}
            <div className="border-b border-gray-100 bg-gray-50 px-8 py-2 overflow-x-auto flex gap-4 select-none">
                {[
                    { id: 'identity', label: '1. Identita' },
                    { id: 'description', label: '2. Popis & Rozměry' },
                    { id: 'provenance', label: '3. Původ' },
                    { id: 'storage', label: '4. Umístění & GPS' },
                    { id: 'demus', label: '5. Demus' },
                    { id: 'audit', label: '6. Audit' },
                    { id: 'attachments', label: '7. Přílohy' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`py-2 px-1 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${activeTab === tab.id ? 'text-[#00204a] border-[#00204a]' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* TĚLO FORMULÁŘE */}
            <form onSubmit={handleSubmit} className="p-8 space-y-6">

                {/* 1. IDENTITA */}
                {activeTab === 'identity' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-200">
                        <div className="space-y-1">
                            <GovFormLabel htmlFor="accessionNumber">Přírůstkové číslo *</GovFormLabel>
                            <GovFormInput
                                id="accessionNumber"
                                value={form.accessionNumber || ''}
                                onChange={(e: any) => setForm({...form, accessionNumber: e.target.value})}
                                onBlur={(e: any) => handleNumberBlur('accession', e.target.value)}
                                required
                            />
                            {fieldErrors.accessionNumber && <p className="text-xs font-bold text-red-600">{fieldErrors.accessionNumber}</p>}
                            {!validity.accession && (
                                <div className="mt-1.5 p-2 bg-red-50 border border-red-100 rounded text-[10px] text-red-700 flex justify-between items-center font-bold">
                                    <span>⚠️ Číslo je již obsazeno!</span>
                                    <button type="button" className="underline text-red-900" onClick={() => { setForm({...form, accessionNumber: suggestions.accession}); setValidity(v => ({...v, accession: true})); }}>
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
                                onChange={(e: any) => setForm({...form, inventoryNumber: e.target.value})}
                                onBlur={(e: any) => handleNumberBlur('inventory', e.target.value)}
                            />
                            {fieldErrors.inventoryNumber && <p className="text-xs font-bold text-red-600">{fieldErrors.inventoryNumber}</p>}
                            {!validity.inventory && (
                                <div className="mt-1.5 p-2 bg-red-50 border border-red-100 rounded text-[10px] text-red-700 flex justify-between items-center font-bold">
                                    <span>⚠️ Číslo je již obsazeno!</span>
                                    <button type="button" className="underline text-red-900" onClick={() => { setForm({...form, inventoryNumber: suggestions.inventory}); setValidity(v => ({...v, inventory: true})); }}>
                                        Použít volné: {suggestions.inventory}
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="md:col-span-2 space-y-1">
                            <GovFormLabel htmlFor="title">Název sbírkového předmětu *</GovFormLabel>
                            <GovFormInput
                                id="title"
                                value={form.title || ''}
                                onChange={(e: any) => setForm({...form, title: e.target.value})}
                                required
                            />
                            {fieldErrors.title && <p className="text-xs font-bold text-red-600">{fieldErrors.title}</p>}
                        </div>

                        <div className="space-y-1">
                            <GovFormLabel htmlFor="subCollection">Fond / Podsbírka</GovFormLabel>
                            <GovFormInput id="subCollection" value={form.subCollection || ''} onChange={(e: any) => setForm({...form, subCollection: e.target.value})} />
                            {fieldErrors.subCollection && <p className="text-xs font-bold text-red-600">{fieldErrors.subCollection}</p>}
                        </div>

                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <GovFormLabel htmlFor="objectType">Typ předmětu</GovFormLabel>
                                <button
                                    type="button"
                                    onClick={() => openDictModal('OBJECT_TYPE', 'Typ předmětu', 'objectType')}
                                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 underline"
                                >
                                    + Nový typ
                                </button>
                            </div>
                            <select
                                id="objectType"
                                className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-[#00204a]"
                                value={form.objectType || ''}
                                onChange={e => setForm({...form, objectType: e.target.value})}
                            >
                                <option value="">-- Vyberte typ (Číselník) --</option>
                                {dicts.objectTypes?.map((t: string) => <option key={t} value={t}>{t}</option>)}
                            </select>
                            {fieldErrors.objectType && <p className="text-xs font-bold text-red-600">{fieldErrors.objectType}</p>}
                        </div>

                        <div className="space-y-1">
                            <GovFormLabel htmlFor="catalogingStatus">Stav zpracování</GovFormLabel>
                            <select
                                id="catalogingStatus"
                                className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-[#00204a]"
                                value={form.catalogingStatus || ''}
                                onChange={e => setForm({...form, catalogingStatus: e.target.value})}
                            >
                                <option>Zapsán</option>
                                <option>Katalogizován</option>
                                <option>Odborně zpracován</option>
                            </select>
                            {fieldErrors.catalogingStatus && <p className="text-xs font-bold text-red-600">{fieldErrors.catalogingStatus}</p>}
                        </div>

                        {/* VOLBA PRO HROMADNÉ ZAKLÁDÁNÍ */}
                        {!id && (
                            <div className="md:col-span-2 mt-4 p-5 bg-blue-50/50 rounded border border-blue-100 space-y-4">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="bulkMode"
                                        checked={bulkMode}
                                        onChange={e => setBulkMode(e.target.checked)}
                                        className="rounded border-gray-300 text-[#00204a]"
                                    />
                                    <label htmlFor="bulkMode" className="text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer">
                                        Režim hromadného založení duplikátů (MS Access parita)
                                    </label>
                                </div>
                                {bulkMode && (
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-in slide-in-from-top-2 duration-300">
                                        <div className="space-y-1">
                                            <GovFormLabel htmlFor="bulkCount">Počet duplicitních kopií</GovFormLabel>
                                            <GovFormInput id="bulkCount" type="number" value={bulkParams.count} onChange={(e: any) => setBulkParams({...bulkParams, count: parseInt(e.target.value, 10) || 1})} />
                                        </div>
                                        <div className="space-y-1">
                                            <GovFormLabel htmlFor="titleSuffix">Přípona názvu kopií</GovFormLabel>
                                            <GovFormInput id="titleSuffix" value={bulkParams.titleSuffix} onChange={(e: any) => setBulkParams({...bulkParams, titleSuffix: e.target.value})} />
                                        </div>
                                        <div className="space-y-1">
                                            <GovFormLabel htmlFor="invNumSuffix">Přípona inventárního čísla</GovFormLabel>
                                            <GovFormInput id="invNumSuffix" value={bulkParams.invNumSuffix} onChange={(e: any) => setBulkParams({...bulkParams, invNumSuffix: e.target.value})} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* 2. POPIS & ROZMĚRY */}
                {activeTab === 'description' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-200">
                        {/* Autor s Autocomplete vyhledáváním z Dictionaries */}
                        <div className="space-y-1" ref={authorDropdownRef}>
                            <div className="flex items-center justify-between">
                                <GovFormLabel htmlFor="author">Autor / Původce (Číselník)</GovFormLabel>
                                <button
                                    type="button"
                                    onClick={() => openDictModal('AUTHOR', 'Autor / Původce', 'author')}
                                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 underline"
                                >
                                    + Nový autor
                                </button>
                            </div>
                            <div className="relative">
                                <input
                                    type="text"
                                    id="author"
                                    className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-[#00204a]"
                                    value={form.author || ''}
                                    onFocus={() => setShowAuthors(true)}
                                    onChange={(e) => { setForm({...form, author: e.target.value}); setAuthorSearch(e.target.value); setShowAuthors(true); }}
                                    placeholder="Začněte psát jméno autora..."
                                />
                                {showAuthors && (
                                    <div className="absolute left-0 right-0 mt-1 max-h-[180px] overflow-y-auto bg-white border border-gray-200 rounded shadow-lg z-[999]">
                                        {Array.from(new Set(dicts.authors || []))
                                            .filter((a: any) => a.toLowerCase().includes(authorSearch.toLowerCase()))
                                            .sort()
                                            .map((a: any) => (
                                                 <div
                                                    key={a}
                                                    onClick={() => { setForm({...form, author: a}); setAuthorSearch(''); setShowAuthors(false); }}
                                                    className="px-4 py-2 text-xs hover:bg-gray-100 cursor-pointer transition-colors border-b last:border-0"
                                                >
                                                    {a}
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </div>
                            {fieldErrors.author && <p className="text-xs font-bold text-red-600">{fieldErrors.author}</p>}
                        </div>

                        <div className="space-y-1">
                            <GovFormLabel htmlFor="datingText">Datování</GovFormLabel>
                            <GovFormInput
                                id="datingText"
                                value={form.datingText || ''}
                                onChange={(e: any) => setForm({...form, datingText: e.target.value})}
                                placeholder="např. 19. století, léta 1920-1930"
                            />
                            {fieldErrors.datingText && <p className="text-xs font-bold text-red-600">{fieldErrors.datingText}</p>}
                        </div>

                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <GovFormLabel htmlFor="material">Materiál</GovFormLabel>
                                <button
                                    type="button"
                                    onClick={() => openDictModal('MATERIAL', 'Materiál', 'material')}
                                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 underline"
                                >
                                    + Nový materiál
                                </button>
                            </div>
                            <select
                                id="material"
                                className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-[#00204a]"
                                value={form.material || ''}
                                onChange={e => setForm({...form, material: e.target.value})}
                            >
                                <option value="">-- Vyberte materiál (Číselník) --</option>
                                {dicts.materials?.map((m: string) => <option key={m} value={m}>{m}</option>)}
                            </select>
                            {fieldErrors.material && <p className="text-xs font-bold text-red-600">{fieldErrors.material}</p>}
                        </div>

                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <GovFormLabel htmlFor="technique">Technika</GovFormLabel>
                                <button
                                    type="button"
                                    onClick={() => openDictModal('TECHNIQUE', 'Technika', 'technique')}
                                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 underline"
                                >
                                    + Nová technika
                                </button>
                            </div>
                            <select
                                id="technique"
                                className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-[#00204a]"
                                value={form.technique || ''}
                                onChange={e => setForm({...form, technique: e.target.value})}
                            >
                                <option value="">-- Vyberte techniku (Číselník) --</option>
                                {dicts.techniques?.map((t: string) => <option key={t} value={t}>{t}</option>)}
                            </select>
                            {fieldErrors.technique && <p className="text-xs font-bold text-red-600">{fieldErrors.technique}</p>}
                        </div>

                        {/* SEKCE PRO FYZICKÉ ROZMĚRY */}
                        <div className="md:col-span-2 bg-gray-50 p-5 rounded border border-gray-200 space-y-4">
                            <h4 className="text-xs font-black text-gray-800 uppercase tracking-widest">Fyzické rozměry & Hmotnost</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                                <div className="space-y-1">
                                    <GovFormLabel htmlFor="weight">Váha (g / kg)</GovFormLabel>
                                    <GovFormInput id="weight" value={form.weight || ''} onChange={(e: any) => setForm({...form, weight: e.target.value})} />
                                </div>
                                <div className="space-y-1">
                                    <GovFormLabel htmlFor="legacyVyska">Výška (cm)</GovFormLabel>
                                    <GovFormInput id="legacyVyska" value={form.legacyData?.vyska || ''} onChange={(e: any) => handleLegacyChange('vyska', e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                    <GovFormLabel htmlFor="legacySirka">Šířka (cm)</GovFormLabel>
                                    <GovFormInput id="legacySirka" value={form.legacyData?.sirka || ''} onChange={(e: any) => handleLegacyChange('sirka', e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                    <GovFormLabel htmlFor="legacyHloubka">Hloubka (cm)</GovFormLabel>
                                    <GovFormInput id="legacyHloubka" value={form.legacyData?.hloubka || ''} onChange={(e: any) => handleLegacyChange('hloubka', e.target.value)} />
                                </div>
                            </div>

                            {/* OPAKOVATELNÉ DETAILNÍ ROZMĚRY */}
                            <div className="pt-4 border-t border-gray-200">
                                <div className="flex justify-between items-center mb-3">
                                    <div>
                                        <h5 className="text-xs font-black text-gray-700 uppercase tracking-wider">Detailní opakovatelné rozměry</h5>
                                        <p className="text-[11px] text-gray-500">Zadání specifických rozměrů předmětu (výška, šířka, hloubka, průměr, tloušťka...)</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={addDimensionRow}
                                        className="px-3 py-1 bg-[#00204a] text-white text-xs font-bold rounded hover:bg-[#003366] transition-colors flex items-center gap-1.5"
                                    >
                                        <FaPlus className="text-[10px]" /> Přidat rozměr
                                    </button>
                                </div>

                                {(!form.dimensions || form.dimensions.length === 0) ? (
                                    <p className="text-xs italic text-gray-400 py-2">Zatím nebyly zadány žádné detailní rozměry.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {form.dimensions.map((dim: any, idx: number) => (
                                            <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded border border-gray-200">
                                                <div className="w-1/3">
                                                    <select
                                                        value={dim.dimensionType}
                                                        onChange={(e) => updateDimensionRow(idx, 'dimensionType', e.target.value)}
                                                        className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:border-[#00204a]"
                                                    >
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
                                                </div>
                                                <div className="w-1/3">
                                                    <input
                                                        type="number"
                                                        step="any"
                                                        placeholder="Hodnota"
                                                        value={dim.value}
                                                        onChange={(e) => updateDimensionRow(idx, 'value', e.target.value)}
                                                        className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:border-[#00204a]"
                                                    />
                                                </div>
                                                <div className="w-1/4">
                                                    <select
                                                        value={dim.unit}
                                                        onChange={(e) => updateDimensionRow(idx, 'unit', e.target.value)}
                                                        className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:border-[#00204a]"
                                                    >
                                                        <option>cm</option>
                                                        <option>mm</option>
                                                        <option>m</option>
                                                        <option>g</option>
                                                        <option>kg</option>
                                                    </select>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeDimensionRow(idx)}
                                                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                                                    title="Odebrat rozměr"
                                                >
                                                    <FaTrash className="text-xs" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="md:col-span-2 space-y-1">
                            <GovFormLabel htmlFor="description">Základní badatelský popis</GovFormLabel>
                            <textarea
                                id="description"
                                rows={4}
                                className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-[#00204a]"
                                value={form.description || ''}
                                onChange={e => setForm({...form, description: e.target.value})}
                            />
                            {fieldErrors.description && <p className="text-xs font-bold text-red-600">{fieldErrors.description}</p>}
                        </div>

                        <div className="md:col-span-2 space-y-1">
                            <GovFormLabel>Nahraná fotodokumentace</GovFormLabel>
                            <div className="flex gap-4 overflow-x-auto pb-2 pt-2">
                                {form.imageUrls?.map((url: string, idx: number) => (
                                    <div key={idx} className="min-w-[140px] h-[100px] bg-gray-50 border rounded overflow-hidden shadow-sm hover:scale-105 transition-transform">
                                        <img
                                            src={url}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2VlZSIvPjwvc3ZnPg==';
                                            }}
                                        />
                                    </div>
                                ))}
                                {(!form.imageUrls || form.imageUrls.length === 0) && (
                                    <p className="text-xs italic text-gray-400 py-3">Zatím nebyly nahrány žádné doplňující fotografie.</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. PŮVOD */}
                {activeTab === 'provenance' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-200">
                        {/* Vyhledávání země z Dictionaries */}
                        <div className="space-y-1" ref={countryDropdownRef}>
                            <div className="flex items-center justify-between">
                                <GovFormLabel htmlFor="countryOfOrigin">Země původu (Číselník)</GovFormLabel>
                                <button
                                    type="button"
                                    onClick={() => openDictModal('COUNTRY', 'Země původu', 'countryOfOrigin')}
                                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 underline"
                                >
                                    + Nová země
                                </button>
                            </div>
                            <div className="relative">
                                <input
                                    type="text"
                                    id="countryOfOrigin"
                                    className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-[#00204a]"
                                    value={form.countryOfOrigin || ''}
                                    onFocus={() => setShowCountries(true)}
                                    onChange={(e) => { setForm({...form, countryOfOrigin: e.target.value}); setCountrySearch(e.target.value); setShowCountries(true); }}
                                    placeholder="Hledat stát v číselníku..."
                                />
                                {showCountries && (
                                    <div className="absolute left-0 right-0 mt-1 max-h-[180px] overflow-y-auto bg-white border border-gray-200 rounded shadow-lg z-[999]">
                                        {dicts.countries
                                            ?.filter((c: string) => c.toLowerCase().includes(countrySearch.toLowerCase()))
                                            .sort()
                                            .map((c: string) => (
                                                <div
                                                    key={c}
                                                    onClick={() => { setForm({...form, countryOfOrigin: c}); setCountrySearch(''); setShowCountries(false); }}
                                                    className="px-4 py-2 text-xs hover:bg-gray-100 cursor-pointer transition-colors border-b last:border-0"
                                                >
                                                    {c}
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </div>
                            {fieldErrors.countryOfOrigin && <p className="text-xs font-bold text-red-600">{fieldErrors.countryOfOrigin}</p>}
                        </div>

                        <div className="space-y-1">
                            <GovFormLabel htmlFor="acquisitionMethod">Způsob nabytí</GovFormLabel>
                            <select
                                id="acquisitionMethod"
                                className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-[#00204a]"
                                value={form.acquisitionMethod || ''}
                                onChange={e => setForm({...form, acquisitionMethod: e.target.value})}
                            >
                                <option>Dar</option>
                                <option>Koupě</option>
                                <option>Vlastní sběr</option>
                                <option>Archeologický výzkum</option>
                            </select>
                            {fieldErrors.acquisitionMethod && <p className="text-xs font-bold text-red-600">{fieldErrors.acquisitionMethod}</p>}
                        </div>

                        <div className="space-y-1">
                            <GovFormLabel htmlFor="acquisitionDate">Datum nabytí do muzea</GovFormLabel>
                            <GovFormInput type="date" id="acquisitionDate" value={form.acquisitionDate || ''} onChange={(e: any) => setForm({...form, acquisitionDate: e.target.value})} />
                            {fieldErrors.acquisitionDate && <p className="text-xs font-bold text-red-600">{fieldErrors.acquisitionDate}</p>}
                        </div>
                    </div>
                )}

                {/* 4. UMÍSTĚNÍ & GPS */}
                {activeTab === 'storage' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-200">
                        <div className="space-y-1">
                            <GovFormLabel htmlFor="locationBuilding">Depozitář (Budova)</GovFormLabel>
                            <GovFormInput id="locationBuilding" value={form.locationBuilding || ''} onChange={(e: any) => setForm({...form, locationBuilding: e.target.value})} />
                            {fieldErrors.locationBuilding && <p className="text-xs font-bold text-red-600">{fieldErrors.locationBuilding}</p>}
                        </div>

                        <div className="space-y-1">
                            <GovFormLabel htmlFor="locationRoom">Místnost</GovFormLabel>
                            <GovFormInput id="locationRoom" value={form.locationRoom || ''} onChange={(e: any) => setForm({...form, locationRoom: e.target.value})} />
                            {fieldErrors.locationRoom && <p className="text-xs font-bold text-red-600">{fieldErrors.locationRoom}</p>}
                        </div>

                        <div className="space-y-1">
                            <GovFormLabel htmlFor="objectCondition">Fyzický stav předmětu</GovFormLabel>
                            <select
                                id="objectCondition"
                                className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-[#00204a]"
                                value={form.objectCondition || ''}
                                onChange={e => setForm({...form, objectCondition: e.target.value})}
                            >
                                <option>Výborný</option>
                                <option>Dobrý</option>
                                <option>Poškozeno</option>
                                <option>Havarijní</option>
                            </select>
                            {fieldErrors.objectCondition && <p className="text-xs font-bold text-red-600">{fieldErrors.objectCondition}</p>}
                        </div>

                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <GovFormLabel htmlFor="spravce">Zodpovědný správce (Číselník)</GovFormLabel>
                                <button
                                    type="button"
                                    onClick={() => openDictModal('SPRAVCE', 'Správce fondu', 'spravce')}
                                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 underline"
                                >
                                    + Nový správce
                                </button>
                            </div>
                            <select
                                id="spravce"
                                className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-[#00204a]"
                                value={form.spravce || ''}
                                onChange={e => setForm({...form, spravce: e.target.value})}
                            >
                                <option value="">-- Vyberte správce --</option>
                                {dicts.spravci?.map((s: string) => <option key={s} value={s}>{s}</option>)}
                            </select>
                            {fieldErrors.spravce && <p className="text-xs font-bold text-red-600">{fieldErrors.spravce}</p>}
                        </div>

                        <div className="space-y-1">
                            <GovFormLabel htmlFor="insuranceValue">Pojistná hodnota (Kč)</GovFormLabel>
                            <GovFormInput type="number" id="insuranceValue" value={form.insuranceValue || ''} onChange={(e: any) => setForm({...form, insuranceValue: e.target.value})} />
                            {fieldErrors.insuranceValue && <p className="text-xs font-bold text-red-600">{fieldErrors.insuranceValue}</p>}
                        </div>

                        {/* GPS A GEOGRAFICKÁ LOKACE */}
                        <div className="md:col-span-2 bg-gray-50 p-5 rounded border border-gray-200 space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-black text-gray-800 uppercase tracking-widest flex items-center gap-1.5">
                                    <FaMapMarkerAlt className="text-[#00204a]" /> Geografické souřadnice & Naleziště (GPS)
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
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <GovFormLabel htmlFor="latitude">Zeměpisná šířka (Lat, -90 až 90)</GovFormLabel>
                                    <GovFormInput
                                        id="latitude"
                                        type="number"
                                        step="any"
                                        value={form.latitude !== null && form.latitude !== undefined ? form.latitude : ''}
                                        onChange={(e: any) => setForm({...form, latitude: e.target.value})}
                                        placeholder="např. 49.1951"
                                    />
                                    {fieldErrors.latitude && <p className="text-xs font-bold text-red-600">{fieldErrors.latitude}</p>}
                                </div>
                                <div className="space-y-1">
                                    <GovFormLabel htmlFor="longitude">Zeměpisná délka (Lon, -180 až 180)</GovFormLabel>
                                    <GovFormInput
                                        id="longitude"
                                        type="number"
                                        step="any"
                                        value={form.longitude !== null && form.longitude !== undefined ? form.longitude : ''}
                                        onChange={(e: any) => setForm({...form, longitude: e.target.value})}
                                        placeholder="např. 16.6068"
                                    />
                                    {fieldErrors.longitude && <p className="text-xs font-bold text-red-600">{fieldErrors.longitude}</p>}
                                </div>
                                <div className="space-y-1">
                                    <GovFormLabel htmlFor="coordinateSystem">Souřadnicový systém</GovFormLabel>
                                    <select
                                        id="coordinateSystem"
                                        className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-[#00204a]"
                                        value={form.coordinateSystem || 'WGS-84'}
                                        onChange={e => setForm({...form, coordinateSystem: e.target.value})}
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

                {/* 5. DEMUS */}
                {activeTab === 'demus' && (
                    <div className="p-6 bg-gray-50 border border-gray-200 rounded grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-200">
                        <div className="md:col-span-2 pb-2 border-b">
                            <h4 className="text-xs font-black text-gray-800 uppercase tracking-widest">Migrovaná Demus metadata (MS Access Parita)</h4>
                        </div>
                        <div className="space-y-1">
                            <GovFormLabel htmlFor="zpusobNabyti">Původní způsob nabytí (Demus)</GovFormLabel>
                            <GovFormInput id="zpusobNabyti" value={form.legacyData?.zpusob_nabyti || ''} onChange={(e: any) => handleLegacyChange('zpusob_nabyti', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <GovFormLabel htmlFor="predchoziMajitel">Předchozí vlastník (Demus)</GovFormLabel>
                            <GovFormInput id="predchoziMajitel" value={form.legacyData?.predchozi_majitel || ''} onChange={(e: any) => handleLegacyChange('predchozi_majitel', e.target.value)} />
                        </div>
                    </div>
                )}

                {/* 6. AUDITNÍ STOPA */}
                {activeTab === 'audit' && (
                    <div className="p-6 bg-yellow-50 border-l-4 border-[#00204a] space-y-2 animate-in fade-in duration-200">
                        <GovFormLabel htmlFor="auditComment">Zdůvodnění provedených změn (Auditní záznam) *</GovFormLabel>
                        <p className="text-[10px] text-gray-400 italic">Podle interních předpisů Moravského zemského muzea vyžaduje každá editace schváleného záznamu zadání odůvodnění.</p>
                        <textarea
                            id="auditComment"
                            rows={4}
                            className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-[#00204a]"
                            value={form.auditComment || ''}
                            onChange={e => setForm({...form, auditComment: e.target.value})}
                            required={!!id}
                        />
                        {fieldErrors.auditComment && <p className="text-xs font-bold text-red-600">{fieldErrors.auditComment}</p>}
                    </div>
                )}

                {/* 7. PŘÍLOHY & DOKUMENTY */}
                {activeTab === 'attachments' && (
                    <div className="space-y-6 animate-in fade-in duration-200">
                        {!id ? (
                            <div className="p-8 text-center bg-gray-50 border border-gray-200 rounded text-gray-500">
                                <FaPaperclip className="mx-auto text-3xl text-gray-400 mb-2" />
                                <p className="font-bold text-sm">Dokumenty a přílohy lze nahrávat po prvotním uložení předmětu.</p>
                                <p className="text-xs mt-1">Uložte prosím základní identifikační údaje předmětu, poté se zpřístupní nahrávání dokladové přílohy.</p>
                            </div>
                        ) : (
                            <>
                                {/* FORMULÁŘ NAHRÁNÍ PŘÍLOHY */}
                                <div className="p-6 bg-gray-50 border border-gray-200 rounded space-y-4">
                                    <h4 className="text-xs font-black text-gray-800 uppercase tracking-widest flex items-center gap-1.5">
                                        <FaUpload className="text-[#00204a]" /> Nahrát novou přílohu k předmětu
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <GovFormLabel htmlFor="attachmentFile">Soubor (PDF, JPG, PNG, DOCX, ZIP...)</GovFormLabel>
                                            <input
                                                id="attachmentFile"
                                                type="file"
                                                onChange={(e) => setAttFile(e.target.files?.[0] || null)}
                                                className="w-full text-xs text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-[#00204a] file:text-white hover:file:bg-[#003366] cursor-pointer"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <GovFormLabel htmlFor="attachmentCaption">Popisek / Popis dokumentu</GovFormLabel>
                                            <GovFormInput
                                                id="attachmentCaption"
                                                value={attCaption}
                                                onChange={(e: any) => setAttCaption(e.target.value)}
                                                placeholder="např. Restaurátorská zpráva 2024, Nabývací doklad"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <GovButton
                                            type="solid"
                                            color="primary"
                                            size="s"
                                            disabled={!attFile || attUploading}
                                            onClick={handleUploadAttachment}
                                        >
                                            {attUploading ? 'Nahrávám přílohu...' : 'Nahrát přílohu'}
                                        </GovButton>
                                    </div>
                                </div>

                                {/* SEZNAM NAHRANÝCH PŘÍLOH */}
                                <div className="bg-white rounded border border-gray-200 overflow-hidden">
                                    <div className="bg-gray-50 border-b border-gray-200 px-6 py-3 flex items-center justify-between">
                                        <h4 className="text-xs font-black uppercase text-gray-500 flex items-center gap-1.5">
                                            <FaPaperclip /> Evidované přílohy ({attachments.length})
                                        </h4>
                                    </div>
                                    {attachments.length === 0 ? (
                                        <p className="p-6 text-xs italic text-gray-400 text-center">K tomuto předmětu zatím nebyly nahrány žádné soubory ani dokumenty.</p>
                                    ) : (
                                        <div className="divide-y divide-gray-100">
                                            {attachments.map((att: any) => (
                                                <div key={att.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <FaFileAlt className="text-gray-400 text-lg flex-shrink-0" />
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-bold text-gray-900 truncate">{att.fileName}</p>
                                                            <p className="text-xs text-gray-500">
                                                                {att.caption && <span className="font-semibold text-gray-700 mr-2">{att.caption}</span>}
                                                                <span>{(att.fileSize / 1024).toFixed(1)} KB</span>
                                                                {att.createdAt && <span> • {new Date(att.createdAt).toLocaleDateString('cs-CZ')}</span>}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <a
                                                            href={`${API_BASE}/api/v1/items/${id}/attachments/${att.id}/file`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1 text-xs font-bold text-[#00204a] hover:underline px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                                                        >
                                                            <FaFileDownload /> Stáhnout
                                                        </a>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteAttachment(att.id)}
                                                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                                                            title="Smazat přílohu"
                                                        >
                                                            <FaTrash className="text-xs" />
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

                {/* AKČNÍ BUTTTONY */}
                <div className="pt-6 border-t border-gray-200 flex gap-3">
                    <GovButton
                        nativeType="submit"
                        disabled={loading || !validity.accession || !validity.inventory}
                        type="solid"
                        color="primary"
                    >
                        {loading ? 'Ukládám...' : 'Uložit záznam'}
                    </GovButton>
                    <GovButton
                        type="outlined"
                        color="neutral"
                        onClick={() => navigate('/admin/items')}
                    >
                        Zrušit změny
                    </GovButton>
                </div>

            </form>

            {/* INLINE MODÁL PRO ČÍSELNÍK */}
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
