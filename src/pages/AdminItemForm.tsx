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
    ApiError
} from '../lib/api';
import { useAuth } from '../components/AuthContext';
import { GovButton, GovFormInput, GovFormLabel, GovMessage } from '@gov-design-system-ce/react';

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
                    weight: ''
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
                    setConflictError(err.message || "Střet verzí nebo duplicitní unikátní identifikátor.");
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
                    { id: 'storage', label: '4. Umístění' },
                    { id: 'demus', label: '5. Demus' },
                    { id: 'audit', label: '6. Audit' }
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
                            <GovFormLabel htmlFor="objectType">Typ předmětu</GovFormLabel>
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
                            <GovFormLabel htmlFor="author">Autor / Původce (Číselník)</GovFormLabel>
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
                            <GovFormLabel htmlFor="material">Materiál</GovFormLabel>
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
                            <GovFormLabel htmlFor="technique">Technika</GovFormLabel>
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
                        <div className="md:col-span-2 bg-gray-50 p-5 rounded border border-gray-200">
                            <h4 className="text-xs font-black text-gray-800 uppercase tracking-widest mb-3">Fyzické rozměry & Hmotnost</h4>
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
                            <GovFormLabel htmlFor="countryOfOrigin">Země původu (Číselník)</GovFormLabel>
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

                {/* 4. UMÍSTĚNÍ */}
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
                            <GovFormLabel htmlFor="spravce">Zodpovědný správce (Číselník)</GovFormLabel>
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
        </div>
    );
}
