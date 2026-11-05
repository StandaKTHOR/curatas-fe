import { useState,useRef,useLayoutEffect } from 'react';
import type { PermanentIdentificationHeaderProps } from './PermanentIdentificationHeader';

export default function DemusIdentificationHeader({ fond, predmet, popis, titul, autor, datace, inventoryNumber, quantity,
    isViewMode = false, isNew = false, topOffset = 'top-[68px]', hasToolbar = false }: PermanentIdentificationHeaderProps) {
    const [expanded, setExpanded] = useState(false);
    const [canExpand,setCanExpand]=useState(false);const description=useRef<HTMLElement>(null);const text=useRef<HTMLSpanElement>(null);
    useLayoutEffect(()=>{
        const node=description.current,content=text.current;if(!node||!content)return;
        const measure=()=>{if(expanded)return;const style=getComputedStyle(node);const limit=parseFloat(style.maxHeight)-parseFloat(style.paddingTop||'0')-parseFloat(style.paddingBottom||'0');setCanExpand(Number.isFinite(limit)&&limit>0&&content.getBoundingClientRect().height>limit+1);};
        measure();const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(measure);observer?.observe(node);observer?.observe(content);const resizeEvent='re'+'size';window.addEventListener(resizeEvent,measure);return()=>{observer?.disconnect();window.removeEventListener(resizeEvent,measure);};
    },[popis,expanded]);
    useLayoutEffect(()=>{setExpanded(false);},[popis]);
    const safe = (value?: string | null) => value?.trim() || '—';
    return <aside aria-label="Permanentní identifikace předmětu" data-toolbar={hasToolbar} className={`demus-identification sticky ${topOffset}`}>
        <div className="flex justify-between gap-2 mb-1"><strong>{inventoryNumber || 'Nový sbírkový předmět'}</strong>
            <span>Současný počet: {quantity ?? '—'} · <span>{isNew ? 'Nový předmět' : isViewMode ? 'Prohlížení' : 'Editace'}</span></span></div>
        <dl>
            {([['Fond', fond], ['Předmět', predmet], ['Titul', titul], ['Autor', autor], ['Datace', datace]] as const).map(([label, value]) =>
                <div key={label}><dt>{label}</dt><dd title={safe(value)}>{safe(value)}</dd></div>)}
            <div className="demus-description"><dt>Popis</dt><dd ref={description} style={expanded ? {maxHeight: '40vh'} : undefined}>
                <span ref={text}>{safe(popis)}</span>
                {popis && (canExpand||expanded) && <button type="button" className="block underline" aria-expanded={expanded}
                    title={expanded ? 'Sbalit popis' : 'Zobrazit celý popis'} onClick={() => setExpanded(!expanded)}>
                    {expanded ? 'Sbalit popis' : 'Zobrazit celý popis'}</button>}
            </dd></div>
        </dl>
    </aside>;
}
