import { useState } from 'react';
import type { PermanentIdentificationHeaderProps } from './PermanentIdentificationHeader';

export default function DemusIdentificationHeader({ fond, predmet, popis, titul, autor, datace, inventoryNumber, quantity,
    isViewMode = false, isNew = false, topOffset = 'top-[68px]', hasToolbar = false }: PermanentIdentificationHeaderProps) {
    const [expanded, setExpanded] = useState(false);
    const safe = (value?: string | null) => value?.trim() || '—';
    return <aside aria-label="Permanentní identifikace předmětu" data-toolbar={hasToolbar} className={`demus-identification sticky ${topOffset}`}>
        <div className="flex justify-between gap-2 mb-1"><strong>{inventoryNumber || 'Nový sbírkový předmět'}</strong>
            <span>Současný počet: {quantity ?? '—'} · <span>{isNew ? 'Nový předmět' : isViewMode ? 'Prohlížení' : 'Editace'}</span></span></div>
        <dl>
            {([['Fond', fond], ['Předmět', predmet], ['Titul', titul], ['Autor', autor], ['Datace', datace]] as const).map(([label, value]) =>
                <div key={label}><dt>{label}</dt><dd title={safe(value)}>{safe(value)}</dd></div>)}
            <div className="demus-description"><dt>Popis</dt><dd style={expanded ? {maxHeight: '40vh'} : undefined}>
                {safe(popis)}
                {popis && popis.length > 50 && <button type="button" className="block underline" aria-expanded={expanded}
                    title={expanded ? 'Sbalit popis' : 'Zobrazit celý popis'} onClick={() => setExpanded(!expanded)}>
                    {expanded ? 'Sbalit popis' : 'Zobrazit celý popis'}</button>}
            </dd></div>
        </dl>
    </aside>;
}
