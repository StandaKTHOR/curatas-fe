import React, { useState, useEffect } from 'react';
import { GovButton, GovFormInput, GovFormLabel, GovMessage } from '@gov-design-system-ce/react';
import { createDictionaryItem } from '../lib/api';

interface AddDictionaryModalProps {
    isOpen: boolean;
    dictionaryType: string;
    dictionaryTitle: string;
    onClose: () => void;
    onSuccess: (newItem: { code: string; label: string; type: string }) => void;
}

export default function AddDictionaryModal({
    isOpen,
    dictionaryType,
    dictionaryTitle,
    onClose,
    onSuccess
}: AddDictionaryModalProps) {
    const [label, setLabel] = useState('');
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setLabel('');
            setCode('');
            setError(null);
            setLoading(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const getPlaceholders = (type: string) => {
        switch (type.toUpperCase()) {
            case 'COUNTRY':
                return { label: 'např. Francie', code: 'např. FRANCIE' };
            case 'OBJECT_TYPE':
                return { label: 'např. Porcelán malovaný', code: 'např. PORCELAN_MALOVANY' };
            case 'MATERIAL':
                return { label: 'např. Bukové dřevo', code: 'např. BUKOVE_DREVO' };
            case 'TECHNIQUE':
                return { label: 'např. Kresba tuší', code: 'např. KRESBA_TUSI' };
            case 'SPRAVCE':
                return { label: 'např. Mgr. Jan Novák', code: 'např. NOVAK_J' };
            default:
                return { label: 'např. Nová hodnota', code: 'např. NOVA_HODNOTA' };
        }
    };

    const placeholders = getPlaceholders(dictionaryType);

    const handleLabelChange = (val: string) => {
        setLabel(val);
        // Automaticky generovat kód pokud uživatel ještě kód nezadal
        if (!code || code === label.toUpperCase().replace(/\s+/g, '_')) {
            setCode(val.toUpperCase().trim().replace(/[\s-]+/g, '_').replace(/[^A-Z0-9_]/gi, ''));
        }
    };

    const getTitle = () => {
        if (dictionaryType.toUpperCase() === 'SPRAVCE') {
            return 'Správce sbírky';
        }
        return dictionaryTitle || 'Číselník';
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!label.trim()) {
            setError('Název položky číselníku je povinný.');
            return;
        }

        const finalCode = code.trim() || label.trim().toUpperCase().replace(/[\s-]+/g, '_');
        setError(null);
        setLoading(true);

        try {
            await createDictionaryItem({
                type: dictionaryType,
                code: finalCode,
                label: label.trim()
            });

            onSuccess({
                code: finalCode,
                label: label.trim(),
                type: dictionaryType
            });
            onClose();
        } catch (err: any) {
            if (err?.status === 409 || err?.message?.includes('409') || err?.message?.includes('existuje')) {
                setError(`Položka "${label.trim()}" již v tomto číselníku existuje.`);
            } else {
                setError(err.message || 'Uložení do číselníku selhalo');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-sm w-full overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-200">
                <div className="bg-[#00204a] text-white px-5 py-3.5 flex justify-between items-center">
                    <div>
                        <h3 className="font-extrabold text-sm uppercase tracking-tight">Přidat do číselníku</h3>
                        <p className="text-[11px] text-blue-200">{getTitle()}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white/80 hover:text-white text-lg font-bold p-1 focus:outline-none"
                        aria-label="Zavřít"
                    >
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    {error && (
                        <GovMessage color="error" type="bold">
                            <span className="font-bold text-xs">{error}</span>
                        </GovMessage>
                    )}

                    <div className="space-y-1">
                        <GovFormLabel htmlFor="dictLabel">Název položky (zobrazovaný text) *</GovFormLabel>
                        <GovFormInput
                            id="dictLabel"
                            value={label}
                            onChange={(e: any) => handleLabelChange(e.target.value)}
                            placeholder={placeholders.label}
                            required
                        />
                    </div>

                    <div className="space-y-1">
                        <GovFormLabel htmlFor="dictCode">Systémový kód (identifikátor)</GovFormLabel>
                        <GovFormInput
                            id="dictCode"
                            value={code}
                            onChange={(e: any) => setCode(e.target.value)}
                            placeholder={placeholders.code}
                        />
                        <p className="text-[10px] text-gray-400">Generuje se automaticky z názvu.</p>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
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
                            disabled={loading || !label.trim()}
                            onClick={handleSubmit}
                        >
                            {loading ? 'Ukládám...' : 'Přidat a vybrat'}
                        </GovButton>
                    </div>
                </form>
            </div>
        </div>
    );
}