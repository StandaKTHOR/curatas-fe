import React, { useState } from 'react';
import { GovButton, GovFormInput, GovFormLabel, GovMessage } from '@gov-design-system-ce/react';
import { deaccessionItem, DeaccessionData } from '../lib/api';

interface DeaccessionModalProps {
    isOpen: boolean;
    itemId: number;
    itemTitle: string;
    inventoryNumber: string;
    onClose: () => void;
    onSuccess: () => void;
}

export default function DeaccessionModal({
    isOpen,
    itemId,
    itemTitle,
    inventoryNumber,
    onClose,
    onSuccess
}: DeaccessionModalProps) {
    const today = new Date().toISOString().split('T')[0];
    const [data, setData] = useState<DeaccessionData>({
        reason: '',
        documentNumber: '',
        deaccessionDate: today
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!data.reason.trim()) {
            setError('Důvod vyřazení z evidence je povinný.');
            return;
        }

        setError(null);
        setLoading(true);

        try {
            await deaccessionItem(itemId, data);
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Vyřazení z evidence selhalo');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full overflow-hidden border border-red-200 animate-in fade-in zoom-in-95 duration-200">
                <div className="bg-red-800 text-white px-6 py-4 flex justify-between items-center">
                    <div>
                        <h3 className="font-extrabold text-base uppercase tracking-tight">Vyřazení předmětu z evidence</h3>
                        <p className="text-xs text-red-200">Předmět: {itemTitle} ({inventoryNumber})</p>
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
                    <div className="bg-red-50 border border-red-200 rounded p-3 text-xs text-red-800 leading-relaxed">
                        <strong>Upozornění pro muzejní evidenci:</strong> Tento krok označí předmět statutem <code>VYŘAZENO</code>. Záznam zůstává trvale zachován v databázi pro auditní účely a zákonnou evidenci, ale je skryt z veřejného katalogu.
                    </div>

                    {error && (
                        <GovMessage color="error" type="bold">
                            <span className="font-bold">{error}</span>
                        </GovMessage>
                    )}

                    <div className="space-y-1">
                        <GovFormLabel htmlFor="deaccReason">Důvod vyřazení z evidence (povinné) *</GovFormLabel>
                        <GovFormInput
                            id="deaccReason"
                            value={data.reason}
                            onChange={(e: any) => setData({ ...data, reason: e.target.value })}
                            placeholder="např. Převod do jiného muzea, fyzický zánik, skartace..."
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <GovFormLabel htmlFor="deaccDoc">Číslo jednací / usnesení komise</GovFormLabel>
                            <GovFormInput
                                id="deaccDoc"
                                value={data.documentNumber || ''}
                                onChange={(e: any) => setData({ ...data, documentNumber: e.target.value })}
                                placeholder="např. KOM-2026/04"
                            />
                        </div>

                        <div className="space-y-1">
                            <GovFormLabel htmlFor="deaccDate">Datum vyřazení</GovFormLabel>
                            <GovFormInput
                                id="deaccDate"
                                type="date"
                                value={data.deaccessionDate || ''}
                                onChange={(e: any) => setData({ ...data, deaccessionDate: e.target.value })}
                            />
                        </div>
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
                            color="error"
                            size="s"
                            disabled={loading || !data.reason.trim()}
                        >
                            {loading ? 'Zpracovávám...' : 'Potvrdit vyřazení z evidence'}
                        </GovButton>
                    </div>
                </form>
            </div>
        </div>
    );
}