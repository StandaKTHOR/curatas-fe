import {TopOptionsGroup} from './TopPanelOptions';
import './compactIdentification.css';
import { useState,useRef,useLayoutEffect } from 'react';
import type { PermanentIdentificationHeaderProps } from './PermanentIdentificationHeader';

export default function DemusIdentificationHeader({ fond, predmet, popis, titul, autor, datace, inventoryNumber, quantity,
    identityEvidence, editors, accessionNumber, isViewMode = false, isNew = false, showDescription = true, topOffset = 'top-[68px]', hasToolbar = false }: PermanentIdentificationHeaderProps) {
    const [activeOptions,setActiveOptions]=useState<string|null>(null);
    const [expanded, setExpanded] = useState(false);
    const [canExpand,setCanExpand]=useState(false);const description=useRef<HTMLElement>(null);const text=useRef<HTMLSpanElement>(null);
    useLayoutEffect(()=>{
        const node=description.current,content=text.current;if(!node||!content)return;
        const measure=()=>{if(expanded)return;const style=getComputedStyle(node);const limit=parseFloat(style.maxHeight)-parseFloat(style.paddingTop||'0')-parseFloat(style.paddingBottom||'0');setCanExpand(Number.isFinite(limit)&&limit>0&&content.getBoundingClientRect().height>limit+1);};
        measure();const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(measure);observer?.observe(node);observer?.observe(content);const resizeEvent='re'+'size';window.addEventListener(resizeEvent,measure);return()=>{observer?.disconnect();window.removeEventListener(resizeEvent,measure);};
    },[popis,expanded]);
    useLayoutEffect(()=>{setExpanded(false);},[popis]);
    const safe = (value?: string | null) => value?.trim() || '—';
    return <TopOptionsGroup.Provider value={{active:activeOptions,setActive:setActiveOptions}}><aside aria-label="Permanentní identifikace předmětu" data-toolbar={hasToolbar} data-compact-editor={!!editors} data-unified-identification={!!identityEvidence} style={editors ? {position:'relative',top:0} : undefined} className={`demus-identification sticky ${topOffset}`}>
        <div className="flex justify-between gap-2 mb-1"><strong>{inventoryNumber || 'Nový sbírkový předmět'}</strong>
            <span>Současný počet: {quantity ?? '—'} · <span>{isNew ? 'Nový předmět' : isViewMode ? 'Prohlížení' : 'Editace'}</span></span></div>
        {editors?.numbers}
        {identityEvidence}
        {!editors && accessionNumber && <p>Přírůstkové číslo: {accessionNumber}</p>}
        <dl>
            {([['Fond', fond], ['Předmět', predmet], ['Titul', titul], ['Autor', autor], ['Datace', datace]] as const).map(([label, value]) =>
                <div key={label} data-identification-field={label}><dt>{label}</dt><dd title={safe(value)}><span data-identification-value data-present={!!value?.trim()} data-historical={value?.includes('(DEMUS)')||false}>{safe(value)}</span>{editors?.[label]}</dd></div>)}
            {showDescription&&<div className="demus-description"><dt>Popis</dt><dd ref={description} style={expanded ? {maxHeight: '40vh'} : undefined}>
                <span ref={text}>{safe(popis)}</span>
                {popis && (canExpand||expanded) && <button type="button" className="block underline" aria-expanded={expanded}
                    title={expanded ? 'Sbalit popis' : 'Zobrazit celý popis'} onClick={() => setExpanded(!expanded)}>
                    {expanded ? 'Sbalit popis' : 'Zobrazit celý popis'}</button>}
            </dd></div>}
        </dl>
        {editors&&<div id="item-top-options-host"/>}
    </aside></TopOptionsGroup.Provider>;
}
