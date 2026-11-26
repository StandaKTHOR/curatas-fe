import {useEffect, useRef, useState,type ReactNode} from 'react';
import {originalSession} from './originalAdapter';
import {dictionaryLabel} from './dictionaryLabel';
import type {UnifiedDictionaryEntry} from '../scoped/scopedApi';

export function dictionaryField(entry: UnifiedDictionaryEntry, key: string) {
    const field = entry.fields?.[key];
    const value = field && typeof field === 'object' && 'value' in field ? field.value : field;
    return typeof value === 'string' && value.trim() ? value : undefined;
}

export function useDictionaryPage(type: string, enabled: boolean, query = '', cursor = '') {
    let scope: ReturnType<typeof originalSession> | undefined;
    try { if (enabled) scope = originalSession(); } catch { /* closed catalog */ }
    const signal = scope?.signal;
    const [state, setState] = useState<{signal:AbortSignal; type:string; query:string; cursor:string;
        items:UnifiedDictionaryEntry[]; next:string|null; error?:string}>();
    useEffect(() => {
        if (!scope || !signal || !scope.catalog.capabilities?.includes('dictionary.read')) return;
        const stop = new AbortController();
        const request = AbortSignal.any([signal, stop.signal]);
        const timer = window.setTimeout(() => {
            void scope.api.unifiedValues(type, request, query, cursor).then(page => {
                if (!request.aborted) setState({signal,type,query,cursor,items:page.items,next:page.nextAfterId});
            }).catch(error => {
                if (!request.aborted) setState({signal,type,query,cursor,items:[],next:null,error:error.message});
            });
        }, query ? 180 : 0);
        return () => { stop.abort(); window.clearTimeout(timer); };
    }, [signal,type,query,cursor]);
    return state?.signal === signal && state?.type === type && state.query === query && state.cursor === cursor
        ? state : undefined;
}

function caption(type:string, value:UnifiedDictionaryEntry) {
    const qualifiers = type === 'DIRECTORY'
        ? ['Inst_A','Funkce_A','Obec_A'].map(key => dictionaryField(value,key)).filter(Boolean)
        : [];
    return [dictionaryLabel(value), ...qualifiers].join(' · ');
}

export default function CardDictionaryChoice({type,label,onSelect,canClear=false,selectedKey,selectedCaption,children}: {
    type:'DATING'|'DIRECTORY'; label:string; onSelect:(entry:UnifiedDictionaryEntry|null)=>void; canClear?:boolean; selectedKey?:string|null; selectedCaption?:string|null;children?:ReactNode;
}) {
    const [open,setOpen] = useState(false);
    const [query,setQuery] = useState('');
    const [cursors,setCursors] = useState<string[]>(['']);
    const list=useRef<HTMLSelectElement>(null);
    const disclosure=useRef<HTMLDetailsElement>(null);
    const page = useDictionaryPage(type,open,query,cursors.at(-1));
    return <details ref={disclosure} onToggle={e=>setOpen(e.currentTarget.open)} data-scoped-reference-editor onKeyDown={e=>{
        if(e.key==='Escape'&&disclosure.current?.open){
            e.preventDefault();
            e.stopPropagation();
            disclosure.current.open=false;
            disclosure.current.querySelector('summary')?.focus();
        }
    }}>
        <summary>{label}</summary>
        {open&&<>
            <label>Hledat <input aria-label={'Hledat – '+label} maxLength={100} value={query}
                onChange={e=>{setQuery(e.target.value);setCursors(['']);}} onKeyDown={e=>{
                    if(e.key==='ArrowDown'||e.key==='Enter'){e.preventDefault();e.stopPropagation();list.current?.focus();}
                }}/></label>
            <select ref={list} aria-label={label} value={selectedKey??""} onChange={e=>{
                if(e.target.value==='clear') onSelect(null);
                else {
                    const choice=page?.items.find(item=>item.key===e.target.value);
                    if(choice)onSelect(choice);
                }
            }}>
                <option value="">Vyberte položku</option>
                {selectedKey&&!page?.items.some(item=>item.key===selectedKey)&&<option value={selectedKey}>{selectedCaption??'Vybraná položka'}</option>}
                {canClear&&<option value="clear">Bez přiřazení</option>}
                {page?.items.map(item=><option key={item.key} value={item.key}>{caption(type,item)}</option>)}
            </select>
            {!page&&<span role="status">Načítám nabídku…</span>}
            {page&&!page.items.length&&!page.error&&<p>Žádné odpovídající položky.</p>}
            {page?.error&&<p role="alert">{page.error}</p>}
            {cursors.length>1&&<button type="button" onClick={()=>setCursors(old=>old.slice(0,-1))}>Předchozí hodnoty</button>}
            {page?.next&&<button type="button" onClick={()=>setCursors(old=>[...old,page.next!])}>Další hodnoty</button>}
            {children}
        </>}
    </details>;
}
