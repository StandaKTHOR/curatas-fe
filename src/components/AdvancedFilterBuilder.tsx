import React from 'react';
import { FaPlus, FaTrash, FaTimes, FaFilter, FaLayerGroup } from 'react-icons/fa';

export interface FilterCondition {
    id: string;
    field: string;
    operator: string;
    value: string;
    valueTo?: string;
}

export interface FilterGroup {
    id: string;
    conjunction: 'AND' | 'OR' | 'NOT';
    conditions: FilterCondition[];
    groups: FilterGroup[];
}

interface AdvancedFilterBuilderProps {
    filterGroup: FilterGroup;
    onChange: (updated: FilterGroup) => void;
    onApply: () => void;
    onReset: () => void;
}

export const FILTER_FIELDS = [
    { value: 'inventoryNumber', label: 'Inventární číslo (inv_cislo)' },
    { value: 'accessionNumber', label: 'Přírůstkové číslo (prir_cislo)' },
    { value: 'title', label: 'Název předmětu' },
    { value: 'author', label: 'Autor / Tvůrce (včetně účastníků)' },
    { value: 'subCollection', label: 'Podsbírka / Fond' },
    { value: 'objectType', label: 'Typ předmětu / Obor' },
    { value: 'material', label: 'Materiál' },
    { value: 'technique', label: 'Technika' },
    { value: 'datingText', label: 'Datace (textová)' },
    { value: 'datingFrom', label: 'Datace od (rok)' },
    { value: 'datingTo', label: 'Datace do (rok)' },
    { value: 'originPlace', label: 'Místo vzniku' },
    { value: 'countryOfOrigin', label: 'Země původu' },
    { value: 'locationBuilding', label: 'Budova' },
    { value: 'locationRoom', label: 'Místnost' },
    { value: 'permanentLocation', label: 'Uložení / Police' },
    { value: 'spravce', label: 'Správce / Kurátor' },
    { value: 'oddeleni', label: 'Oddělení' },
    { value: 'objectCondition', label: 'Stav předmětu' },
    { value: 'acquisitionMethod', label: 'Způsob nabytí' },
    { value: 'markant', label: 'Značení / Markant' },
    { value: 'signature', label: 'Signatura' },
    { value: 'description', label: 'Stručný popis' },
    { value: 'extendedDescription', label: 'Podrobný popis' }
];

export const FILTER_OPERATORS = [
    { value: 'CONTAINS', label: 'obsahuje' },
    { value: 'EQUALS', label: 'rovná se' },
    { value: 'NOT_EQUALS', label: 'nerovná se' },
    { value: 'NOT_CONTAINS', label: 'neobsahuje' },
    { value: 'STARTS_WITH', label: 'začíná na' },
    { value: 'ENDS_WITH', label: 'končí na' },
    { value: 'GREATER_THAN', label: 'větší nebo rovno (>=)' },
    { value: 'LESS_THAN', label: 'menší nebo rovno (<=)' },
    { value: 'BETWEEN', label: 'v rozmezí (od - do)' },
    { value: 'IS_EMPTY', label: 'je prázdné / nevyplněné' },
    { value: 'IS_NOT_EMPTY', label: 'je vyplněné' }
];

export function createEmptyCondition(): FilterCondition {
    return {
        id: Math.random().toString(36).substring(2, 9),
        field: 'inventoryNumber',
        operator: 'CONTAINS',
        value: '',
        valueTo: ''
    };
}

export function createEmptyGroup(conjunction: 'AND' | 'OR' | 'NOT' = 'AND'): FilterGroup {
    return {
        id: Math.random().toString(36).substring(2, 9),
        conjunction,
        conditions: [createEmptyCondition()],
        groups: []
    };
}

export default function AdvancedFilterBuilder({
    filterGroup,
    onChange,
    onApply,
    onReset
}: AdvancedFilterBuilderProps) {

    const updateGroupConjunction = (group: FilterGroup, conj: 'AND' | 'OR' | 'NOT'): FilterGroup => ({
        ...group,
        conjunction: conj
    });

    const addCondition = (group: FilterGroup): FilterGroup => ({
        ...group,
        conditions: [...group.conditions, createEmptyCondition()]
    });

    const updateCondition = (
        group: FilterGroup,
        condId: string,
        patch: Partial<FilterCondition>
    ): FilterGroup => ({
        ...group,
        conditions: group.conditions.map(c => (c.id === condId ? { ...c, ...patch } : c))
    });

    const removeCondition = (group: FilterGroup, condId: string): FilterGroup => ({
        ...group,
        conditions: group.conditions.filter(c => c.id !== condId)
    });

    const addSubGroup = (group: FilterGroup): FilterGroup => ({
        ...group,
        groups: [...group.groups, createEmptyGroup('OR')]
    });

    const updateSubGroup = (group: FilterGroup, subId: string, updatedSub: FilterGroup): FilterGroup => ({
        ...group,
        groups: group.groups.map(g => (g.id === subId ? updatedSub : g))
    });

    const removeSubGroup = (group: FilterGroup, subId: string): FilterGroup => ({
        ...group,
        groups: group.groups.filter(g => g.id !== subId)
    });

    const renderGroup = (group: FilterGroup, isRoot = false, onGroupChange: (g: FilterGroup) => void, onRemove?: () => void) => {
        return (
            <div
                key={group.id}
                className={`p-3 rounded-md border ${
                    isRoot
                        ? 'bg-slate-50 border-slate-300'
                        : 'bg-white border-blue-200 mt-2 ml-4 shadow-sm'
                } space-y-2`}
            >
                <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                            {isRoot ? 'Hlavní filtr:' : 'Vnořená skupina:'}
                        </span>
                        <div className="inline-flex rounded-md shadow-sm" role="group">
                            {(['AND', 'OR', 'NOT'] as const).map(conj => (
                                <button
                                    key={conj}
                                    type="button"
                                    onClick={() => onGroupChange(updateGroupConjunction(group, conj))}
                                    className={`px-2.5 py-1 text-[11px] font-bold border first:rounded-l-md last:rounded-r-md transition-colors ${
                                        group.conjunction === conj
                                            ? 'bg-[#00204a] text-white border-[#00204a]'
                                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                                    }`}
                                >
                                    {conj === 'AND' ? 'AND (vše)' : conj === 'OR' ? 'OR (alespoň jedno)' : 'NOT (žádné)'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {!isRoot && onRemove && (
                        <button
                            type="button"
                            onClick={onRemove}
                            className="text-red-500 hover:text-red-700 text-xs font-semibold flex items-center gap-1"
                        >
                            <FaTimes /> Odstranit skupinu
                        </button>
                    )}
                </div>

                {/* Podmínky v této skupině */}
                <div className="space-y-1.5 pt-1">
                    {group.conditions.map(c => {
                        const isBetween = c.operator === 'BETWEEN';
                        const isUnary = c.operator === 'IS_EMPTY' || c.operator === 'IS_NOT_EMPTY';

                        return (
                            <div key={c.id} className="flex flex-wrap items-center gap-2 bg-white p-1.5 rounded border border-gray-200 text-xs">
                                <select
                                    value={c.field}
                                    onChange={e => onGroupChange(updateCondition(group, c.id, { field: e.target.value }))}
                                    className="bg-gray-50 border border-gray-300 rounded px-2 py-1 text-xs font-medium text-gray-800 focus:outline-none focus:border-[#00204a]"
                                >
                                    {FILTER_FIELDS.map(f => (
                                        <option key={f.value} value={f.value}>
                                            {f.label}
                                        </option>
                                    ))}
                                </select>

                                <select
                                    value={c.operator}
                                    onChange={e => onGroupChange(updateCondition(group, c.id, { operator: e.target.value }))}
                                    className="bg-gray-50 border border-gray-300 rounded px-2 py-1 text-xs font-medium text-gray-800 focus:outline-none focus:border-[#00204a]"
                                >
                                    {FILTER_OPERATORS.map(op => (
                                        <option key={op.value} value={op.value}>
                                            {op.label}
                                        </option>
                                    ))}
                                </select>

                                {!isUnary && (
                                    <input
                                        type="text"
                                        placeholder={isBetween ? 'Hodnota od...' : 'Hledaný výraz...'}
                                        value={c.value}
                                        onChange={e => onGroupChange(updateCondition(group, c.id, { value: e.target.value }))}
                                        className="bg-white border border-gray-300 rounded px-2 py-1 text-xs text-gray-800 flex-1 min-w-[140px] focus:outline-none focus:border-[#00204a]"
                                    />
                                )}

                                {isBetween && (
                                    <input
                                        type="text"
                                        placeholder="Hodnota do..."
                                        value={c.valueTo || ''}
                                        onChange={e => onGroupChange(updateCondition(group, c.id, { valueTo: e.target.value }))}
                                        className="bg-white border border-gray-300 rounded px-2 py-1 text-xs text-gray-800 flex-1 min-w-[140px] focus:outline-none focus:border-[#00204a]"
                                    />
                                )}

                                <button
                                    type="button"
                                    onClick={() => onGroupChange(removeCondition(group, c.id))}
                                    title="Smazat podmínku"
                                    className="text-gray-400 hover:text-red-600 p-1 transition-colors"
                                >
                                    <FaTrash size={12} />
                                </button>
                            </div>
                        );
                    })}
                </div>

                {/* Vnořené podskupiny */}
                {group.groups.length > 0 && (
                    <div className="space-y-2 pt-1">
                        {group.groups.map(sub =>
                            renderGroup(
                                sub,
                                false,
                                updatedSub => onGroupChange(updateSubGroup(group, sub.id, updatedSub)),
                                () => onGroupChange(removeSubGroup(group, sub.id))
                            )
                        )}
                    </div>
                )}

                {/* Tlačítka pro přidání */}
                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                    <button
                        type="button"
                        onClick={() => onGroupChange(addCondition(group))}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-white border border-gray-300 rounded text-gray-700 hover:bg-gray-50 shadow-xs"
                    >
                        <FaPlus size={10} /> Přidat podmínku
                    </button>
                    {isRoot && (
                        <button
                            type="button"
                            onClick={() => onGroupChange(addSubGroup(group))}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-blue-50 border border-blue-300 rounded text-blue-800 hover:bg-blue-100 shadow-xs"
                        >
                            <FaLayerGroup size={10} /> Přidat skupinu (AND/OR)
                        </button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="bg-white border border-blue-200 rounded-lg shadow-md p-4 space-y-3 mb-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                <div className="flex items-center gap-2 text-sm font-bold text-[#00204a]">
                    <FaFilter />
                    <span>Pokročilý filtr sbírkových předmětů (AND / OR / NOT)</span>
                </div>
            </div>

            {renderGroup(filterGroup, true, onChange)}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-200">
                <button
                    type="button"
                    onClick={onReset}
                    className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:text-gray-900 border border-gray-300 rounded hover:bg-gray-100"
                >
                    Resetovat pokročilý filtr
                </button>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={onApply}
                        className="px-4 py-1.5 text-xs font-bold text-white bg-[#00204a] hover:bg-[#00173a] rounded shadow transition-colors"
                    >
                        Filtrovat výsledky
                    </button>
                </div>
            </div>
        </div>
    );
}
