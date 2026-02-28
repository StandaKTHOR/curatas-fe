import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getAdminItem, updateItem, createItem, uploadItemImage, bulkCopyItem } from '../lib/api';

export default function AdminItemForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('identity');
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    // --- PŘIDÁNO: Stavy pro hromadné zakládání ---
    const [bulkMode, setBulkMode] = useState(false);
    const [bulkParams, setBulkParams] = useState({
        count: 10,
        titleSuffix: ' _',
        invNumSuffix: '/_'
    });

    // Kompletní stav pro všechna muzejní pole
    const [form, setForm] = useState<any>({
        title: '',
        accessionNumber: '',
        inventoryNumber: '',
        subCollection: 'Hlavní sbírka',
        objectType: 'Artefakt',
        catalogingStatus: 'Zapsán',
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
        objectCondition: 'Dobrý',
        spravce: '',
        oddeleni: '',
        cesId: '',
        insuranceValue: '',
        published: true,
        auditComment: '', // Povinné pro auditní stopu při editaci
        imageUrls: [], // Pro zobrazení nahraných fotek
        legacyData: {} // Batoh pro historická data z Demusu
    });

    // Načtení dat při editaci
    useEffect(() => {
        if (id) {
            getAdminItem(id).then(data => {
                setForm({ ...data, auditComment: '', legacyData: data.legacyData || {} });
            }).catch(err => alert("Chyba při načítání: " + err));
        }
    }, [id]);

    // Reálné nahrávání fotky na backend
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        if (!id) {
            alert("Před nahráváním fotografií musíte předmět nejdříve uložit.");
            return;
        }

        setUploading(true);
        try {
            const result = await uploadItemImage(Number(id), e.target.files[0]);
            setForm((prev: any) => ({
                ...prev,
                imageUrls: [...(prev.imageUrls || []), result.url]
            }));
            alert("Fotografie byla úspěšně nahrána.");
        } catch (err) {
            alert("Nahrávání selhalo: " + err);
        } finally {
            setUploading(false);
        }
    };

    const handleLegacyChange = (key: string, value: string) => {
        setForm((prev: any) => ({
            ...prev,
            legacyData: { ...prev.legacyData, [key]: value }
        }));
    };

    // --- UPRAVENO: HandleSubmit s podporou Bulk Copy ---
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (id) {
                await updateItem(Number(id), form);
            } else {
                // Uložíme základní předmět a získáme jeho ID
                const savedItem = await createItem(form);

                // Pokud je bulk mode aktivní, spustíme rozkopírování
                if (bulkMode && savedItem?.id) {
                    try {
                        await bulkCopyItem(savedItem.id, bulkParams);
                    } catch (bulkErr) {
                        console.error("Hromadné kopírování selhalo:", bulkErr);
                        alert("Hlavní předmět byl uložen, ale nepodařilo se vytvořit kopie.");
                    }
                }
            }
            navigate('/admin/items');
        } catch (err) {
            alert("Chyba při ukládání: " + err);
        } finally {
            setLoading(false);
        }
    };

    const inputClass = "form-control mt-1 text-sm border-gray-200 focus:border-[#ffbc34] focus:ring-0";
    const labelClass = "text-[10px] uppercase font-bold text-gray-400 tracking-wider";

    return (
        <div className="card shadow-sm border-0 animate-in fade-in duration-500">
            <div className="card-header bg-white py-4 border-b">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-[#1f262d] m-0">
                        {id ? `Editace: ${form.accessionNumber || form.title}` : 'Nový sbírkový předmět'}
                    </h4>
                    <div className="flex gap-2">
                        <input type="file" id="photo-up" hidden onChange={handleFileChange} accept="image/*" />
                        <button
                            type="button"
                            onClick={() => document.getElementById('photo-up')?.click()}
                            disabled={uploading || !id}
                            className={`genric-btn info-border circle small ${!id ? 'opacity-50' : ''}`}
                        >
                            {uploading ? 'Nahrávám...' : '📸 Přidat foto'}
                        </button>
                    </div>
                </div>

                <ul className="nav nav-tabs border-0 gap-4 flex-wrap">
                    {[
                        { id: 'identity', label: '1. Identita' },
                        { id: 'description', label: '2. Popis & Foto' },
                        { id: 'provenance', label: '3. Původ' },
                        { id: 'storage', label: '4. Správa & Umístění' },
                        { id: 'demus', label: '5. Demus (Historie)' },
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
                            <label className={labelClass}>Přírůstkové číslo (Právní ID) *</label>
                            <input className={inputClass} value={form.accessionNumber || ''} onChange={e => setForm({...form, accessionNumber: e.target.value})} required />
                        </div>
                        <div className="col-md-6">
                            <label className={labelClass}>Inventární číslo</label>
                            <input className={inputClass} value={form.inventoryNumber || ''} onChange={e => setForm({...form, inventoryNumber: e.target.value})} />
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
                            <input className={inputClass} value={form.objectType || ''} onChange={e => setForm({...form, objectType: e.target.value})} />
                        </div>
                        <div className="col-md-4">
                            <label className={labelClass}>Stav zpracování</label>
                            <select className={inputClass} value={form.catalogingStatus || ''} onChange={e => setForm({...form, catalogingStatus: e.target.value})}>
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
                            <label className={labelClass}>Materiál</label>
                            <input className={inputClass} value={form.material || ''} onChange={e => setForm({...form, material: e.target.value})} />
                        </div>
                        <div className="col-md-6">
                            <label className={labelClass}>Technika</label>
                            <input className={inputClass} value={form.technique || ''} onChange={e => setForm({...form, technique: e.target.value})} />
                        </div>
                        <div className="col-md-12">
                            <label className={labelClass}>Základní popis</label>
                            <textarea className={inputClass} rows={3} value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} />
                        </div>
                        <div className="col-md-12">
                            <label className={labelClass}>Rozšířený kurátorský popis</label>
                            <textarea className={inputClass} rows={5} value={form.extendedDescription || ''} onChange={e => setForm({...form, extendedDescription: e.target.value})} />
                        </div>

                        <div className="col-md-12 mt-4">
                            <label className={labelClass}>Fotodokumentace</label>
                            <div className="flex gap-4 mt-2 overflow-x-auto pb-2">
                                {form.imageUrls?.map((url: string, idx: number) => (
                                    <div key={idx} className="min-w-[150px] h-[100px] rounded border overflow-hidden bg-gray-50">
                                        <img src={url} className="w-full h-full object-cover" alt="Náhled" />
                                    </div>
                                ))}
                                {(!form.imageUrls || form.imageUrls.length === 0) && (
                                    <p className="text-xs text-gray-400 italic">Žádné fotografie nebyly nahrány.</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'provenance' && (
                    <div className="row g-4 animate-in fade-in duration-300">
                        <div className="col-md-6">
                            <label className={labelClass}>Země původu</label>
                            <input className={inputClass} value={form.countryOfOrigin || ''} onChange={e => setForm({...form, countryOfOrigin: e.target.value})} />
                        </div>
                        <div className="col-md-6">
                            <label className={labelClass}>Způsob nabytí</label>
                            <select className={inputClass} value={form.acquisitionMethod || ''} onChange={e => setForm({...form, acquisitionMethod: e.target.value})}>
                                <option>Dar</option>
                                <option>Koupě</option>
                                <option>Vlastní sběr</option>
                                <option>Archeologický výzkum</option>
                            </select>
                        </div>
                        <div className="col-md-6">
                            <label className={labelClass}>Datum nabytí</label>
                            <input type="date" className={inputClass} value={form.acquisitionDate || ''} onChange={e => setForm({...form, acquisitionDate: e.target.value})} />
                        </div>
                        <div className="col-md-6">
                            <label className={labelClass}>Získáno od (Původce)</label>
                            <input className={inputClass} value={form.acquiredFrom || ''} onChange={e => setForm({...form, acquiredFrom: e.target.value})} />
                        </div>
                    </div>
                )}

                {activeTab === 'storage' && (
                    <div className="row g-4 animate-in fade-in duration-300">
                        <div className="col-md-4">
                            <label className={labelClass}>Budova</label>
                            <input className={inputClass} value={form.locationBuilding || ''} onChange={e => setForm({...form, locationBuilding: e.target.value})} />
                        </div>
                        <div className="col-md-4">
                            <label className={labelClass}>Místnost / Depozitář</label>
                            <input className={inputClass} value={form.locationRoom || ''} onChange={e => setForm({...form, locationRoom: e.target.value})} />
                        </div>
                        <div className="col-md-4">
                            <label className={labelClass}>Stav předmětu</label>
                            <select className={inputClass} value={form.objectCondition || ''} onChange={e => setForm({...form, objectCondition: e.target.value})}>
                                <option>Výborný</option>
                                <option>Dobrý</option>
                                <option>Poškozeno</option>
                                <option>Havarijní</option>
                            </select>
                        </div>
                        <div className="col-md-6">
                            <label className={labelClass}>Odpovědný správce</label>
                            <input className={inputClass} value={form.spravce || ''} onChange={e => setForm({...form, spravce: e.target.value})} />
                        </div>
                        <div className="col-md-6">
                            <label className={labelClass}>Pojistná hodnota (Kč)</label>
                            <input type="number" className={inputClass} value={form.insuranceValue || ''} onChange={e => setForm({...form, insuranceValue: e.target.value})} />
                        </div>
                    </div>
                )}

                {activeTab === 'demus' && (
                    <div className="row g-4 bg-gray-50 p-4 border border-gray-200 rounded animate-in fade-in duration-300">
                        <div className="col-md-12 mb-2">
                            <h6 className="font-bold text-[#3e5569] flex items-center gap-2 m-0">
                                <i className="fa fa-archive"></i> Původní evidence zapsaná v systému Demus
                            </h6>
                            <p className="text-xs text-gray-500 italic mt-1">Tyto údaje jsou uchovány pro historický kontext.</p>
                        </div>

                        <div className="col-md-6">
                            <label className={labelClass}>Způsob nabytí (Původní)</label>
                            <input className={inputClass} value={form.legacyData?.zpusob_nabyti || ''} onChange={e => handleLegacyChange('zpusob_nabyti', e.target.value)} />
                        </div>
                        <div className="col-md-6">
                            <label className={labelClass}>Předchozí majitel</label>
                            <input className={inputClass} value={form.legacyData?.predchozi_majitel || ''} onChange={e => handleLegacyChange('predchozi_majitel', e.target.value)} />
                        </div>
                        <div className="col-md-6">
                            <label className={labelClass}>Autor (Historický)</label>
                            <input className={inputClass} value={form.legacyData?.autor || ''} onChange={e => handleLegacyChange('autor', e.target.value)} />
                        </div>
                        <div className="col-md-6">
                            <label className={labelClass}>Místo vzniku</label>
                            <input className={inputClass} value={form.legacyData?.misto_vzniku || ''} onChange={e => handleLegacyChange('misto_vzniku', e.target.value)} />
                        </div>
                        <div className="col-md-12">
                            <label className={labelClass}>Historická poznámka</label>
                            <textarea className={inputClass} rows={3} value={form.legacyData?.poznamka || ''} onChange={e => handleLegacyChange('poznamka', e.target.value)} />
                        </div>
                    </div>
                )}

                {activeTab === 'audit' && (
                    <div className="bg-yellow-50 p-6 border-l-4 border-[#ffbc34] animate-in slide-in-from-left duration-300">
                        <h6 className="font-bold text-[#1f262d] mb-2 flex items-center gap-2">
                            <i className="fa fa-history text-[#ffbc34]"></i> Právní auditní stopa
                        </h6>
                        <label className={labelClass}>Důvod nebo popis provedené změny *</label>
                        <textarea
                            className="form-control mt-2 border-yellow-200 focus:border-[#ffbc34] focus:ring-0"
                            rows={4}
                            value={form.auditComment || ''}
                            onChange={e => setForm({...form, auditComment: e.target.value})}
                            required={!!id}
                        />
                    </div>
                )}

                {/* --- PŘIDÁNO: SEKCE PRO HROMADNÉ ZAKLÁDÁNÍ (Zobrazí se jen při vytváření nového) --- */}
                {!id && (
                    <div className="mt-8 p-4 bg-gray-50 border border-dashed border-gray-300 rounded-lg shadow-sm animate-in fade-in duration-500">
                        <div className="flex items-center gap-3 mb-3">
                            <input
                                type="checkbox"
                                id="bulkCreate"
                                className="w-4 h-4 text-warning border-gray-300 rounded focus:ring-warning"
                                checked={bulkMode}
                                onChange={e => setBulkMode(e.target.checked)}
                            />
                            <label htmlFor="bulkCreate" className="text-sm font-bold text-gray-700 cursor-pointer m-0">
                                Založit jako sérii (vytvořit hromadně kopie podle tohoto vzoru)
                            </label>
                        </div>

                        {bulkMode && (
                            <div className="row g-3 animate-in slide-in-from-top-2 duration-300">
                                <div className="col-md-4">
                                    <label className={labelClass}>Počet kusů v sérii</label>
                                    <input
                                        type="number"
                                        className={inputClass}
                                        value={bulkParams.count}
                                        onChange={e => setBulkParams({...bulkParams, count: parseInt(e.target.value) || 1})}
                                    />
                                </div>
                                <div className="col-md-4">
                                    <label className={labelClass}>Přípona názvu (použij _ pro číslo)</label>
                                    <input
                                        className={inputClass}
                                        value={bulkParams.titleSuffix}
                                        onChange={e => setBulkParams({...bulkParams, titleSuffix: e.target.value})}
                                        placeholder="např. - jedinec _"
                                    />
                                </div>
                                <div className="col-md-4">
                                    <label className={labelClass}>Přípona Inv. č. (použij _ pro číslo)</label>
                                    <input
                                        className={inputClass}
                                        value={bulkParams.invNumSuffix}
                                        onChange={e => setBulkParams({...bulkParams, invNumSuffix: e.target.value})}
                                        placeholder="např. /_"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="mt-10 pt-6 border-t flex gap-3">
                    <button
                        type="submit"
                        disabled={loading}
                        className="genric-btn warning radius px-8 font-bold shadow-md hover:shadow-lg transition-all"
                    >
                        {loading ? 'Ukládám...' : 'Uložit záznam do databáze'}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/admin/items')}
                        className="genric-btn default-border radius px-8"
                    >
                        Zrušit
                    </button>
                </div>
            </form>
        </div>
    );
}