import React, { useState } from 'react';
import { GovButton, GovFormCheckbox, GovFormInput, GovFormLabel, GovMessage } from '@gov-design-system-ce/react';
import { cloneItemSelective, CloneItemOptions } from '../lib/api';

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
    const [options, setOptions] = useState<CloneItemOptions>({
        copyDescription: true,
        copyDating: true,
        copyLocation: true,
        copyAuthors: true,
        copyMaterials: true,
        copyClassification: true,
        copyDimensions: true,
        targetInventoryNumber: `${inventoryNumber || 'INV'}-KLON`
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleToggle = (key: keyof CloneItemOptions) => {
        setOptions(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const cloned = await cloneItemSelective(itemId, options);
            onSuccess(cloned);
            onClose();
        } catch (err: any) {
            setError(err.message || 'Klonování selhalo');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-200">
                <div className="bg-[#00204a] text-white px-6 py-4 flex justify-between items-center">
                    <div>
                        <h3 className="font-extrabold text-base uppercase tracking-tight">Klonovat sbírkový předmět</h3>
                        <p className="text-xs text-blue-200">Předloha: {itemTitle} ({inventoryNumber})</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white/80 hover:text-white text-xl font-bold p-1 focus:outline-none"
                        aria-label="Zavřít"
                    >
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {error && (
                        <GovMessage color="error" type="bold">
                            <span className="font-bold">{error}</span>
                        </GovMessage>
                    )}

                    <div className="space-y-1">
                        <GovFormLabel htmlFor="targetInv">Cílové inventární číslo (nový unikátní kód)</GovFormLabel>
                        <GovFormInput
                            id="targetInv"
                            value={options.targetInventoryNumber || ''}
                            onChange={(e: any) => setOptions({ ...options, targetInventoryNumber: e.target.value })}
                            placeholder="např. 1234/2026"
                            required
                        />
                        <p className="text-[11px] text-gray-500 italic">
                            Přírůstkové číslo se z důvodu muzejní integrity NIKDY neklonuje.
                        </p>
                    </div>

                    <div className="space-y-3 border-t border-b border-gray-100 py-4">
                        <span className="text-xs uppercase font-extrabold text-gray-500 tracking-wider block">
                            Vyberte pole pro přenesení do nového předmětu:
                        </span>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={!!options.copyDescription}
                                    onChange={() => handleToggle('copyDescription')}
                                    className="rounded border-gray-300 text-[#00204a] focus:ring-[#00204a]"
                                />
                                <span className="font-semibold text-gray-800">Název a popis</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={!!options.copyDating}
                                    onChange={() => handleToggle('copyDating')}
                                    className="rounded border-gray-300 text-[#00204a] focus:ring-[#00204a]"
                                />
                                <span className="font-semibold text-gray-800">Datování vzniku</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={!!options.copyMaterials}
                                    onChange={() => handleToggle('copyMaterials')}
                                    className="rounded border-gray-300 text-[#00204a] focus:ring-[#00204a]"
                                />
                                <span className="font-semibold text-gray-800">Materiál a technika</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={!!options.copyClassification}
                                    onChange={() => handleToggle('copyClassification')}
                                    className="rounded border-gray-300 text-[#00204a] focus:ring-[#00204a]"
                                />
                                <span className="font-semibold text-gray-800">Podsbírka a skupina</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={!!options.copyAuthors}
                                    onChange={() => handleToggle('copyAuthors')}
                                    className="rounded border-gray-300 text-[#00204a] focus:ring-[#00204a]"
                                />
                                <span className="font-semibold text-gray-800">Autor / Původce</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={!!options.copyDimensions}
                                    onChange={() => handleToggle('copyDimensions')}
                                    className="rounded border-gray-300 text-[#00204a] focus:ring-[#00204a]"
                                />
                                <span className="font-semibold text-gray-800">Rozměry a váha</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer select-none sm:col-span-2">
                                <input
                                    type="checkbox"
                                    checked={!!options.copyLocation}
                                    onChange={() => handleToggle('copyLocation')}
                                    className="rounded border-gray-300 text-[#00204a] focus:ring-[#00204a]"
                                />
                                <span className="font-semibold text-gray-800">Umístění, depozitář a GPS</span>
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
                            disabled={loading || !options.targetInventoryNumber}
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