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
    checkUniqueness
} from '../lib/api';
import { useAuth } from '../components/AuthContext';

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

    // --- STAVY PRO VLASTNÍ DROPDOWN ZEMÍ ---
    const [showCountries, setShowCountries] = useState(false);
    const [countrySearch, setCountrySearch] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    // --- STAV PRO ČÍSELNÍKY ---
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
        weight: '', // Přidáno pole pro váhu
        dimensions: [], // Pole pro komplexní rozměry z DB
        published: true,
        auditComment: '',
        imageUrls: [],
        legacyData: {}
    });

    // Načtení dat při startu
    useEffect(() => {
        // Načtení číselníků pro selecty (Materiál, Technika, atd.)
        getDictionaries().then(data => setDicts(data)).catch(console.error);

        if (id) {
            getAdminItem(id).then(data => {
                console.log("Data z API dorazila do formuláře:", data);

                // Pomocná funkce, aby null nebo undefined hodnoty z API nezpůsobily pád inputů
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
            }).catch(err => alert("Chyba při načítání detailu: " + err));
        } else {
            // Logika pro nový předmět (není ID v URL)
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
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowCountries(false);
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
            const newUrl = result.url;
            setForm((prev: any) => ({
                ...prev,
                imageUrls: [...(prev.imageUrls || []), newUrl]
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

        if (!validity.accession || !validity.inventory) {
            alert("Nelze uložit: Evidenční čísla musí být unikátní!");
            return;
        }

        setLoading(true);

        // Vytvoříme čistý payload jen s poli, která chceme odeslat
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
            alert("Chyba při ukládání: " + err);
        } finally {
            setLoading(false);
        }
    };

    const inputClass = "form-control mt-1 text-sm border-gray-200 focus:border-[#ffbc34] focus:ring-0 text-[#1f262d]";
    const selectClass = "form-select mt-1 text-sm border-gray-200 focus:border-[#ffbc34] focus:ring-0 text-[#1f262d] w-full";
    const labelClass = "text-[10px] uppercase font-bold text-gray-500 tracking-wider";

    return (
        <div className="card shadow-sm border-0 animate-in fade-in duration-500 bg-white">
            <div className="card-header bg-white py-4 border-b">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-[#1f262d] m-0 uppercase tracking-tighter text-xl">
                        {id ? `Editace: ${form.inventoryNumber || form.accessionNumber}` : 'Nový sbírkový předmět'}
                    </h4>
                    <div className="flex gap-2 items-center">
                        {!id && <span className="text-[10px] text-gray-400 italic mr-2">Foto lze přidat po uložení</span>}
                        <input type="file" id="photo-up" hidden onChange={handleFileChange} accept="image/*" />
                        <button
                            type="button"
                            onClick={() => document.getElementById('photo-up')?.click()}
                            disabled={uploading || !id}
                            className={`genric-btn info-border circle small ${!id ? 'opacity-30 cursor-not-allowed' : ''}`}
                        >
                            {uploading ? 'Nahrávám...' : '📸 Přidat foto'}
                        </button>
                    </div>
                    <div className="flex items-center bg-gray-50 border rounded-full px-3 py-1 gap-2 mr-4">
                            <span className={`text-[9px] font-black uppercase ${form.published ? 'text-green-600' : 'text-gray-400'}`}>
                                {form.published ? '● VEŘEJNÉ' : '○ SOUKROMÉ'}
                            </span>
                        <div className="form-check form-switch m-0 p-0 flex items-center">
                            <input
                                className="form-check-input cursor-pointer"
                                type="checkbox"
                                role="switch"
                                id="publishedSwitch"
                                checked={form.published || false}
                                onChange={(e) => setForm({...form, published: e.target.checked})}
                                style={{ width: '30px', height: '16px', marginTop: '0' }}
                            />
                        </div>
                    </div>
                </div>


                <ul className="nav nav-tabs border-0 gap-4 flex-wrap">
                    {[
                        { id: 'identity', label: '1. Identita' },
                        { id: 'description', label: '2. Popis & Rozměry' },
                        { id: 'provenance', label: '3. Původ' },
                        { id: 'storage', label: '4. Umístění' },
                        { id: 'demus', label: '5. Demus' },
                        { id: 'audit', label: '6. Audit' }
                    ].map(tab => (
                        <li key={tab.id} className="nav-item">
                            <button
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={`pb-2 text-[11px] font-bold uppercase tracking-widest transition-all ${activeTab === tab.id ? 'text-[#ffbc34] border-b-2 border-[#ffbc34]' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                {tab.label}
                            </button>
                        </li>
                    ))}
                </ul>
            </div>

            <form onSubmit={handleSubmit} className="card-body p-8">
                {activeTab === 'identity' && (
                    <div className="row g-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="col-md-6">
                            <label className={labelClass}>Přírůstkové číslo *</label>
                            <input
                                className={`${inputClass} ${!validity.accession ? 'border-red-500 bg-red-50' : ''}`}
                                value={form.accessionNumber || ''}
                                onChange={e => setForm({...form, accessionNumber: e.target.value})}
                                onBlur={e => handleNumberBlur('accession', e.target.value)}
                                required
                            />
                            {!validity.accession && (
                                <div className="mt-2 p-2 bg-red-100 text-red-700 text-[10px] rounded border border-red-200 flex justify-between items-center">
                                    <span>⚠️ Číslo již existuje!</span>
                                    <button type="button" className="underline font-black" onClick={() => { setForm({...form, accessionNumber: suggestions.accession}); setValidity(v => ({...v, accession: true})); }}>
                                        Použít volné: {suggestions.accession}
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="col-md-6">
                            <label className={labelClass}>Inventární číslo</label>
                            <input
                                className={`${inputClass} ${!validity.inventory ? 'border-red-500 bg-red-50' : ''}`}
                                value={form.inventoryNumber || ''}
                                onChange={e => setForm({...form, inventoryNumber: e.target.value})}
                                onBlur={e => handleNumberBlur('inventory', e.target.value)}
                            />
                            {!validity.inventory && (
                                <div className="mt-2 p-2 bg-red-100 text-red-700 text-[10px] rounded border border-red-200 flex justify-between items-center">
                                    <span>⚠️ Číslo již existuje!</span>
                                    <button type="button" className="underline font-black" onClick={() => { setForm({...form, inventoryNumber: suggestions.inventory}); setValidity(v => ({...v, inventory: true})); }}>
                                        Použít volné: {suggestions.inventory}
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="col-md-12">
                            <label className={labelClass}>Název předmětu *</label>
                            <input className={`${inputClass} text-lg font-bold`} value={form.title || ''} onChange={e => setForm({...form, title: e.target.value})} required />
                        </div>
                        <div className="col-md-4">
                            <label className={labelClass}>Podsbírka</label>
                            <input className={inputClass} value={form.subCollection || ''} onChange={e => setForm({...form, subCollection: e.target.value})} />
                        </div>
                        <div className="col-md-4">
                            <label className={labelClass}>Typ předmětu</label>
                            <select className={selectClass} value={form.objectType || ''} onChange={e => setForm({...form, objectType: e.target.value})}>
                                <option value="">-- Vyberte typ --</option>
                                {dicts.objectTypes?.map((t: string) => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div className="col-md-4">
                            <label className={labelClass}>Stav zpracování</label>
                            <select className={selectClass} value={form.catalogingStatus || ''} onChange={e => setForm({...form, catalogingStatus: e.target.value})}>
                                <option>Zapsán</option>
                                <option>Katalogizován</option>
                                <option>Odborně zpracován</option>
                            </select>
                        </div>
                    </div>
                )}

                {activeTab === 'description' && (
                    <div className="row g-4 animate-in fade-in duration-300">
                        <div className="col-md-6">
                            <label className={labelClass}>Autor / Původce</label>
                            <select
                                className={selectClass}
                                value={form.author || ''}
                                onChange={e => setForm({...form, author: e.target.value})}
                            >
                                <option value="">-- Vyberte autora --</option>
                                {Array.from(new Set(dicts.authors || [])).sort().map((a: any) => (
                                    <option key={a} value={a}>{a}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-md-6">
                            <label className={labelClass}>Datování</label>
                            <input
                                className={inputClass}
                                value={form.datingText || ''}
                                onChange={e => setForm({...form, datingText: e.target.value})}
                                placeholder="např. 19. století, léta 1920-1930"
                            />
                        </div>
                        <div className="col-md-6">
                            <label className={labelClass}>Materiál</label>
                            <select className={selectClass} value={form.material || ''} onChange={e => setForm({...form, material: e.target.value})}>
                                <option value="">-- Vyberte materiál --</option>
                                {dicts.materials?.map((m: string) => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                        <div className="col-md-6">
                            <label className={labelClass}>Technika</label>
                            <select className={selectClass} value={form.technique || ''} onChange={e => setForm({...form, technique: e.target.value})}>
                                <option value="">-- Vyberte techniku --</option>
                                {dicts.techniques?.map((t: string) => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>

                        {/* SEKCE ROZMĚRY A VÁHA */}
                        <div className="col-md-12 mt-2 bg-gray-50 p-4 rounded-lg border border-dashed border-gray-200">
                            <label className={labelClass}>Fyzické parametry</label>
                            <div className="row g-3 mt-1">
                                <div className="col-md-3">
                                    <div className="input-group input-group-sm">
                                        <span className="input-group-text bg-white text-[9px] font-bold border-gray-200">VÁHA</span>
                                        <input type="text" className="form-control" placeholder="kg" value={form.weight || ''} onChange={e => setForm({...form, weight: e.target.value})} />
                                    </div>
                                 </div>
                                <div className="col-md-3">
                                    <div className="input-group input-group-sm">
                                        <span className="input-group-text bg-white text-[9px] font-bold border-gray-200">VÝŠKA</span>
                                        <input type="text" className="form-control" placeholder="cm" value={form.legacyData?.vyska || ''} onChange={e => handleLegacyChange('vyska', e.target.value)} />
                                    </div>
                                </div>
                                <div className="col-md-3">
                                    <div className="input-group input-group-sm">
                                        <span className="input-group-text bg-white text-[9px] font-bold border-gray-200">ŠÍŘKA</span>
                                        <input type="text" className="form-control" placeholder="cm" value={form.legacyData?.sirka || ''} onChange={e => handleLegacyChange('sirka', e.target.value)} />
                                    </div>
                                </div>
                                <div className="col-md-3">
                                    <div className="input-group input-group-sm">
                                        <span className="input-group-text bg-white text-[9px] font-bold border-gray-200">HLOUBKA</span>
                                        <input type="text" className="form-control" placeholder="cm" value={form.legacyData?.hloubka || ''} onChange={e => handleLegacyChange('hloubka', e.target.value)} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="col-md-12">
                            <label className={labelClass}>Základní popis</label>
                            <textarea className={inputClass} rows={3} value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} />
                        </div>
                        <div className="col-md-12">
                            <label className={labelClass}>Fotodokumentace</label>
                            <div className="flex gap-4 mt-2 overflow-x-auto pb-2">
                                {form.imageUrls?.map((url: string, idx: number) => (
                                    <div key={idx} className="min-w-[150px] h-[100px] rounded border overflow-hidden bg-white shadow-sm transition-transform hover:scale-105">
                                        <img
                                            src={url}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2VlZSIvPjwvc3ZnPg==';
                                            }}
                                        />
                                    </div>
                                ))}
                                {(!form.imageUrls || form.imageUrls.length === 0) && <p className="text-xs text-gray-400 italic py-4">Žádné fotografie nejsou k dispozici.</p>}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'provenance' && (
                    <div className="row g-4 animate-in fade-in duration-300">
                        <div className="col-md-6" ref={dropdownRef}>
                            <label className={labelClass}>Země původu</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    className={inputClass}
                                    value={form.countryOfOrigin || ''}
                                    onFocus={() => setShowCountries(true)}
                                    onChange={(e) => { setForm({...form, countryOfOrigin: e.target.value}); setCountrySearch(e.target.value); setShowCountries(true); }}
                                    placeholder="Hledat zemi..."
                                />
                                {showCountries && (
                                    <div className="absolute left-0 right-0 mt-1 max-h-[220px] overflow-y-auto bg-[#1a2026] border border-white/10 rounded-lg shadow-2xl z-[9999]">
                                        {dicts.countries?.filter((c: string) => c.toLowerCase().includes(countrySearch.toLowerCase())).map((c: string) => (
                                            <div key={c} onClick={() => { setForm({...form, countryOfOrigin: c}); setCountrySearch(''); setShowCountries(false); }} className="px-4 py-2 text-sm text-gray-300 hover:bg-[#ffbc34] hover:text-black cursor-pointer transition-colors border-b border-white/5 last:border-0">
                                                {c}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="col-md-6">
                            <label className={labelClass}>Způsob nabytí</label>
                            <select className={selectClass} value={form.acquisitionMethod || ''} onChange={e => setForm({...form, acquisitionMethod: e.target.value})}>
                                <option>Dar</option><option>Koupě</option><option>Vlastní sběr</option><option>Archeologický výzkum</option>
                            </select>
                        </div>
                        <div className="col-md-6">
                            <label className={labelClass}>Datum nabytí</label>
                            <input type="date" className={inputClass} value={form.acquisitionDate || ''} onChange={e => setForm({...form, acquisitionDate: e.target.value})} />
                        </div>
                    </div>
                )}

                {activeTab === 'storage' && (
                    <div className="row g-4 animate-in fade-in duration-300">
                        <div className="col-md-4"><label className={labelClass}>Budova</label><input className={inputClass} value={form.locationBuilding || ''} onChange={e => setForm({...form, locationBuilding: e.target.value})} /></div>
                        <div className="col-md-4"><label className={labelClass}>Místnost</label><input className={inputClass} value={form.locationRoom || ''} onChange={e => setForm({...form, locationRoom: e.target.value})} /></div>
                        <div className="col-md-4">
                            <label className={labelClass}>Stav předmětu</label>
                            <select className={selectClass} value={form.objectCondition || ''} onChange={e => setForm({...form, objectCondition: e.target.value})}>
                                <option>Výborný</option><option>Dobrý</option><option>Poškozeno</option><option>Havarijní</option>
                            </select>
                        </div>
                        <div className="col-md-6">
                            <label className={labelClass}>Správce</label>
                            <select className={selectClass} value={form.spravce || ''} onChange={e => setForm({...form, spravce: e.target.value})}>
                                <option value="">-- Vyberte správce --</option>
                                {dicts.spravci?.map((s: string) => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="col-md-6">
                            <label className={labelClass}>Pojistná hodnota (Kč)</label>
                            <input type="number" className={inputClass} value={form.insuranceValue || ''} onChange={e => setForm({...form, insuranceValue: e.target.value})} />
                        </div>
                    </div>
                )}

                {activeTab === 'demus' && (
                    <div className="row g-4 bg-gray-50 p-4 border rounded animate-in fade-in duration-300">
                        <div className="col-md-12 mb-2"><h6 className="font-bold text-[#3e5569] m-0">Historická evidence Demus</h6></div>
                        <div className="col-md-6"><label className={labelClass}>Původní způsob nabytí</label><input className={inputClass} value={form.legacyData?.zpusob_nabyti || ''} onChange={e => handleLegacyChange('zpusob_nabyti', e.target.value)} /></div>
                        <div className="col-md-6"><label className={labelClass}>Předchozí majitel</label><input className={inputClass} value={form.legacyData?.predchozi_majitel || ''} onChange={e => handleLegacyChange('predchozi_majitel', e.target.value)} /></div>
                    </div>
                )}

                {activeTab === 'audit' && (
                    <div className="bg-yellow-50 p-6 border-l-4 border-[#ffbc34]">
                        <label className={labelClass}>Důvod provedené změny (Auditní stopa) *</label>
                        <textarea className={`${inputClass} mt-2 bg-white`} rows={4} value={form.auditComment || ''} onChange={e => setForm({...form, auditComment: e.target.value})} required={!!id} />
                    </div>
                )}

                <div className="mt-10 pt-6 border-t flex gap-3">
                    <button
                        type="submit"
                        disabled={loading || !validity.accession || !validity.inventory}
                        className="genric-btn warning radius px-8 font-black text-[#1f262d] shadow-md hover:shadow-lg transition-all"
                    >
                        {loading ? 'Pracuji...' : 'ULOŽIT ZÁZNAM'}
                    </button>
                    <button type="button" onClick={() => navigate('/admin/items')} className="genric-btn default-border radius px-8 text-xs font-bold uppercase">Zrušit</button>
                </div>
            </form>
        </div>
    );
}