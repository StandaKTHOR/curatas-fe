import React from 'react';
import { GovButton } from '@gov-design-system-ce/react';

export interface ColumnConfig {
    id: string;
    label: string;
    visible: boolean;
}

export const DEFAULT_COLUMNS: ColumnConfig[] = [
    { id: 'primaryImageUrl', label: 'Fotografie', visible: true },
    { id: 'inventoryNumber', label: 'Inventární č.', visible: true },
    { id: 'accessionNumber', label: 'Přírůstkové č.', visible: true },
    { id: 'title', label: 'Název předmětu', visible: true },
    { id: 'author', label: 'Autor / Původce', visible: true },
    { id: 'datingText', label: 'Datování', visible: true },
    { id: 'material', label: 'Materiál', visible: true },
    { id: 'subCollection', label: 'Podsbírka', visible: true },
    { id: 'locationBuilding', label: 'Umístění', visible: true },
    { id: 'spravce', label: 'Správce fondu', visible: false },
    { id: 'objectCondition', label: 'Stav předmětu', visible: false },
    { id: 'technique', label: 'Technika', visible: false },
    { id: 'weight', label: 'Hmotnost', visible: false },
];

interface ColumnSelectorModalProps {
    isOpen: boolean;
    columns: ColumnConfig[];
    onSave: (newColumns: ColumnConfig[]) => void;
    onClose: () => void;
}

export default function ColumnSelectorModal({
    isOpen,
    columns,
    onSave,
    onClose
}: ColumnSelectorModalProps) {
    const [localCols, setLocalCols] = React.useState<ColumnConfig[]>(columns);

    React.useEffect(() => {
        setLocalCols(columns);
    }, [columns]);

    if (!isOpen) return null;

    const toggleColumn = (id: string) => {
        setLocalCols(prev =>
            prev.map(c => (c.id === id ? { ...c, visible: !c.visible } : c))
        );
    };

    const handleReset = () => {
        setLocalCols(DEFAULT_COLUMNS);
    };

    const handleSave = () => {
        onSave(localCols);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-md w-full overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-200">
                <div className="bg-[#00204a] text-white px-6 py-4 flex justify-between items-center">
                    <div>
                        <h3 className="font-extrabold text-base uppercase tracking-tight">Nastavení sloupců tabulky</h3>
                        <p className="text-xs text-blue-200">Vyberte sloupce, které chcete v katalogu zobrazit</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white/80 hover:text-white text-xl font-bold p-1 focus:outline-none"
                        aria-label="Zavřít"
                    >
                        ✕
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2">
                        {localCols.map(col => (
                            <label
                                key={col.id}
                                className="flex items-center justify-between p-2.5 rounded border border-gray-200 hover:bg-blue-50/50 cursor-pointer select-none transition-colors"
                            >
                                <span className="text-sm font-semibold text-gray-800">{col.label}</span>
                                <input
                                    type="checkbox"
                                    checked={col.visible}
                                    onChange={() => toggleColumn(col.id)}
                                    className="rounded border-gray-300 text-[#00204a] focus:ring-[#00204a] w-4 h-4 cursor-pointer"
                                />
                            </label>
                        ))}
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={handleReset}
                            className="text-xs font-bold text-gray-500 hover:text-gray-800 underline"
                        >
                            Výchozí nastavení
                        </button>
                        <div className="flex gap-2">
                            <GovButton
                                type="outlined"
                                color="neutral"
                                size="s"
                                onClick={onClose}
                            >
                                Zrušit
                            </GovButton>
                            <GovButton
                                type="solid"
                                color="primary"
                                size="s"
                                onClick={handleSave}
                            >
                                Uložit
                            </GovButton>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}