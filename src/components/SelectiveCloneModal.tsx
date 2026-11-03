import React, { useRef, useState } from 'react';
import { GovButton, GovFormCheckbox, GovFormInput, GovFormLabel, GovMessage } from '@gov-design-system-ce/react';
import { cloneItemSelective, CloneItemOptions } from '../lib/api';
import {originalIntegrationEnabled} from '../features/catalog/originalAdapter';
import {cloneOriginalItem,originalCanClone,originalCloneOutcome} from '../features/catalog/originalClone';
import {ScopedError} from '../features/scoped/scopedApi';

interface SelectiveCloneModalProps {
    isOpen: boolean;
    itemId: number;
    itemTitle: string;
    inventoryNumber: string;
    onClose: () => void;
    onSuccess: (clonedItem: any) => void;
}

export default function SelectiveCloneModal({
    isOpen,
    itemId,
    itemTitle,
    inventoryNumber,
    onClose,
    onSuccess
}: SelectiveCloneModalProps) {
    const scoped=originalIntegrationEnabled();
    const [title,setTitle]=useState(itemTitle??'');
    const requestId=useRef(crypto.randomUUID()),busy=useRef(false);
    const [uncertain,setUncertain]=useState(false);
    const [options, setOptions] = useState<CloneItemOptions>({
        copyDescription: true,
        copyDating: true,
        copyLocation: true,
        copyAuthors: true,
        copyMaterials: true,
        copyClassification: true,
        copyDimensions: true,
        targetInventoryNumber: scoped?'':`${inventoryNumber || 'INV'}-KLON`
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleToggle = (key: keyof CloneItemOptions) => {
        setOptions(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if(busy.current||uncertain)return;
        if(scoped&&(!originalCanClone()||!title.trim()||!options.targetInventoryNumber?.trim())){setError('Vyplňte název a nové inventární číslo; klonování musí být povoleno v katalogu.');return;}
        busy.current=true;
        setError(null);
        setLoading(true);

        try {
            const cloned = scoped?(await cloneOriginalItem(itemId,requestId.current,{title,inventoryNumber:options.targetInventoryNumber!})).value.item:await cloneItemSelective(itemId, options);
            onSuccess(cloned);
            onClose();
        } catch (err: any) {
            if(scoped){
                const rejected=err instanceof ScopedError&&err.status>=400&&err.status<500;
                setUncertain(!rejected);
                setError(rejected?(err.status===409?'Klon nebyl vytvořen: inventární číslo je obsazené nebo předloha obsahuje podzáznam či médium bez bezpečného kontraktu kopie.':err.status===412?'Předloha se změnila. Zavřete dialog a načtěte ji znovu.':err.status===403?'Pro klonování chybí oprávnění nebo je vypnuté.':'Požadavek byl odmítnut; klon nebyl vytvořen.'):'Výsledek není potvrzen. Neopakujte zápis; ověřte uložený výsledek tlačítkem níže.');
            }else setError(err.message || 'Klonování selhalo');
        } finally {
            busy.current=false;
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div style={scoped?{maxHeight:'calc(100dvh - 2rem)',overflowY:'auto'}:undefined} className="bg-white rounded-lg shadow-2xl max-w-lg w-full overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-200">
                <div className="bg-[#00204a] text-white px-6 py-4 flex justify-between items-center">
                    <div>
                        <h3 className="font-extrabold text-base uppercase tracking-tight">Klonovat sbírkový předmět</h3>
                        <p className="text-xs text-blue-200">Předloha: {itemTitle} ({inventoryNumber})</p>
                    </div>
                    <button
                        disabled={loading} onClick={onClose}
                        className="text-white/80 hover:text-white text-xl font-bold p-1 focus:outline-none"
                        aria-label="Zavřít"
                    >
                        ✕
                    </button>
                </div>

                <p className="text-sm">{scoped?'Nezávislá kopie současných údajů a podporovaných vlastních podzáznamů včetně fotografií a příloh. Všechna média dostanou vlastní objekty a data. Zdrojové míry a MatTech zůstávají označené jako podklad, nikoli současné tvrzení. Historická aktivita ani původní inventární identita se nekopírují. Neověřený podzáznam celou operaci zastaví.':'Kopírují se vybrané popisné údaje a odborné záznamy. Foto, přílohy, akvizice, původní audit, pohyby a vyřazení se nepřenášejí. Klon má vlastní identitu a audit; historické auditní údaje originálu jsou samostatný podklad.'}</p>
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {error && (
                        <GovMessage color="error" type="bold">
                            <span className="font-bold">{error}</span>
                        </GovMessage>
                    )}
                    {scoped&&<div className="space-y-1"><GovFormLabel htmlFor="cloneTitle">Název nového předmětu</GovFormLabel><GovFormInput id="cloneTitle" value={title} disabled={loading||uncertain} onChange={(e:any)=>{setTitle(e.target.value);requestId.current=crypto.randomUUID();}} required/></div>}
                    {uncertain&&<button type="button" disabled={loading} onClick={async()=>{if(busy.current)return;busy.current=true;setLoading(true);try{const result=await originalCloneOutcome(requestId.current);onSuccess(result.value.item);onClose();}catch{setError('Výsledek zatím není doložen. Zápis zůstává zamčený; zkontrolujte seznam nebo požádejte správce o ověření požadavku '+requestId.current+'.');}finally{busy.current=false;setLoading(false);}}}>Ověřit výsledek bez opakování zápisu</button>}

                    <div className="space-y-1">
                        <GovFormLabel htmlFor="targetInv">Cílové inventární číslo (nový unikátní kód)</GovFormLabel>
                        <GovFormInput
                            id="targetInv"
                            disabled={loading||uncertain}
                            value={options.targetInventoryNumber || ''}
                            onChange={(e: any) => {setOptions({ ...options, targetInventoryNumber: e.target.value });requestId.current=crypto.randomUUID();}}
                            placeholder="např. 1234/2026"
                            required
                        />
                        <p className="text-[11px] text-gray-500 italic">
                            Přírůstkové číslo se z důvodu muzejní integrity NIKDY neklonuje.
                        </p>
                    </div>

                    <div className="space-y-3 border-t border-b border-gray-100 py-4">
                        <span className="text-xs uppercase font-extrabold text-gray-500 tracking-wider block">
                            {scoped?'Nezávisle kopírované současné údaje (všechny podporované části):':'Vyberte pole pro přenesení do nového předmětu:'}
                        </span>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                    type="checkbox" disabled={scoped||loading}
                                    checked={!!options.copyDescription}
                                    onChange={() => handleToggle('copyDescription')}
                                    className="rounded border-gray-300 text-[#00204a] focus:ring-[#00204a]"
                                />
                                <span className="font-semibold text-gray-800">Název, popis, dokumentace a reference</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                    type="checkbox" disabled={scoped||loading}
                                    checked={!!options.copyDating}
                                    onChange={() => handleToggle('copyDating')}
                                    className="rounded border-gray-300 text-[#00204a] focus:ring-[#00204a]"
                                />
                                <span className="font-semibold text-gray-800">Datování vzniku</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                    type="checkbox" disabled={scoped||loading}
                                    checked={!!options.copyMaterials}
                                    onChange={() => handleToggle('copyMaterials')}
                                    className="rounded border-gray-300 text-[#00204a] focus:ring-[#00204a]"
                                />
                                <span className="font-semibold text-gray-800">Materiál a technika</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                    type="checkbox" disabled={scoped||loading}
                                    checked={!!options.copyClassification}
                                    onChange={() => handleToggle('copyClassification')}
                                    className="rounded border-gray-300 text-[#00204a] focus:ring-[#00204a]"
                                />
                                <span className="font-semibold text-gray-800">Zařazení a určení</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                    type="checkbox" disabled={scoped||loading}
                                    checked={!!options.copyAuthors}
                                    onChange={() => handleToggle('copyAuthors')}
                                    className="rounded border-gray-300 text-[#00204a] focus:ring-[#00204a]"
                                />
                                <span className="font-semibold text-gray-800">Autor a údaje vzniku</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                    type="checkbox" disabled={scoped||loading}
                                    checked={!!options.copyDimensions}
                                    onChange={() => handleToggle('copyDimensions')}
                                    className="rounded border-gray-300 text-[#00204a] focus:ring-[#00204a]"
                                />
                                <span className="font-semibold text-gray-800">Rozměry a váha</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer select-none sm:col-span-2">
                                <input
                                    type="checkbox" disabled={scoped||loading}
                                    checked={!!options.copyLocation}
                                    onChange={() => handleToggle('copyLocation')}
                                    className="rounded border-gray-300 text-[#00204a] focus:ring-[#00204a]"
                                />
                                <span className="font-semibold text-gray-800">{scoped?'Místo vzniku (uložení a GPS se nekopírují)':'Umístění, depozitář a GPS'}</span>
                            </label>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            disabled={loading}
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-semibold rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                            Zrušit
                        </button>
                        <button
                            type="submit"
                            disabled={loading || uncertain || !options.targetInventoryNumber || (scoped&&!originalCanClone())}
                            className="px-4 py-2 text-xs font-semibold rounded bg-[#00204a] text-white hover:bg-[#00173a] disabled:opacity-50"
                        >
                            {loading ? 'Klonuji předmět...' : 'Vytvořit klon'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
