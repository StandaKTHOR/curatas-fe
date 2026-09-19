import React, { useState } from 'react';
import { GovButton, GovFormInput, GovFormLabel, GovMessage } from '@gov-design-system-ce/react';
import { createWorkset, createWorksetFromFilter } from '../lib/api';

interface WorksetModalProps {
    isOpen: boolean;
    selectedIds?: number[];
    currentFilter?: any;
    fromFilter?: boolean;
    onClose: () => void;
    onSuccess: (workset: any) => void;
}

export default function WorksetModal({
    isOpen,
    selectedIds = [],
    currentFilter,
    fromFilter = false,
    onClose,
    onSuccess
}: WorksetModalProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (loading) return;
        if (!name.trim()) {
            setError('Název pracovní sady je povinný.');
            return;
        }

        setError(null);
        setLoading(true);

        try {
            let res;
            if (fromFilter && currentFilter) {
                res = await createWorksetFromFilter({
                    name: name.trim(),
                    description: description.trim() || undefined,
                    filter: currentFilter
                });
            } else {
                res = await createWorkset({
                    name: name.trim(),
                    description: description.trim() || undefined,
                    itemIds: selectedIds
                });
            }
            onSuccess(res);
            setName('');
            setDescription('');
            onClose();
        } catch (err: any) {
            setError(err.message || 'Vytvoření sady selhalo');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-md w-full overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-200">
                <div className="bg-[#00204a] text-white px-6 py-4 flex justify-between items-center">
                    <div>
                        <h3 className="font-extrabold text-base uppercase tracking-tight">Uložit jako pracovní sadu</h3>
                        <p className="text-xs text-blue-200">
                            {fromFilter
                                ? 'Všechny položky odpovídající aktuálnímu filtru (max 10 000)'
                                : `Vybrané položky: ${selectedIds.length} ks`}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white/80 hover:text-white text-xl font-bold p-1 focus:outline-none"
                        aria-label="Zavřít"
                    >
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <GovMessage color="error" type="bold">
                            <span className="font-bold">{error}</span>
                        </GovMessage>
                    )}

                    <div className="space-y-1">
                        <GovFormLabel htmlFor="wsName">Název pracovní sady *</GovFormLabel>
                        <GovFormInput
                            id="wsName"
                            value={name}
                            onChange={(e: any) => setName(e.target.value)}
                            placeholder="např. Výběr pro výstavu Baroko 2026"
                            required
                        />
                    </div>

                    <div className="space-y-1">
                        <GovFormLabel htmlFor="wsDesc">Popis sady (nepovinné)</GovFormLabel>
                        <GovFormInput
                            id="wsDesc"
                            value={description}
                            onChange={(e: any) => setDescription(e.target.value)}
                            placeholder="např. Výběr obrazů a plastik k restaurování"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <GovButton
                            type="outlined"
                            color="neutral"
                            size="s"
                            disabled={loading}
                            onClick={onClose}
                        >
                            Zrušit
                        </GovButton>
                        <GovButton
                            type="solid"
                            color="primary"
                            size="s"
                            nativeType="submit"
                            disabled={loading || !name.trim()}
                            onClick={handleSubmit}
                        >
                            {loading ? 'Ukládám...' : 'Vytvořit sadu'}
                        </GovButton>
                    </div>
                </form>
            </div>
        </div>
    );
}