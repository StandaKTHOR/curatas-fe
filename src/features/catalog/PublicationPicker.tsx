import {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {Link} from 'react-router-dom';
import type {ScopedApi, UnifiedDictionaryEntry} from '../scoped/scopedApi';
import RegistryEditorFields, {type RegistryDraft} from './RegistryEditorFields';
import {saveRegistryEntry, type professionalRegistryApi, type RegistryEntry} from './professionalRegistryApi';

type Publication = {key:string; caption:string; historical:boolean};
function text(value:unknown) {
    if (typeof value==='object' && value!==null && 'value' in value) value=value.value;
    return typeof value==='string' && value.trim() ? value : null;
}
function publication(row: UnifiedDictionaryEntry): Publication[] {
    const historical = row.key.startsWith('s:');
    const id = Number(row.key.slice(2));
    if (!historical && (!row.key.startsWith('p:') || !Number.isSafeInteger(id) || id<=0)) return [];
    const title = row.label ?? text(row.fields?.Titul_LT) ?? row.code ?? 'Publikace bez názvu';
    const code = row.code ?? text(row.fields?.Ref_LT);
    return [{key:historical?row.key:String(id),caption:code&&code!==title?`${title} — ${code}`:title,historical}];
}

export default function PublicationPicker({api, registry, signal, catalog, selected, onSelect, savedLabel, canCreate, allowSourceWrite=false}: {
    api: ScopedApi; registry: ReturnType<typeof professionalRegistryApi>; signal: AbortSignal; catalog:number;
    selected:string; onSelect:(key:string)=>void; savedLabel?: string; canCreate:boolean; allowSourceWrite?:boolean;
}) {
    const [query,setQuery] = useState('');
    const [cursor,setCursor] = useState('');
    const [next,setNext] = useState<string|null>(null);
    const [results,setResults] = useState<Publication[]>([]);
    const [pinned,setPinned] = useState<Publication>();
    const [pending,setPending] = useState(false);
    const [error,setError] = useState('');
    const [revision,setRevision] = useState(0);
    const [creating,setCreating] = useState(false);
    useEffect(()=>{
        const controller = new AbortController();
        const request = AbortSignal.any([signal,controller.signal]);
        setPending(true);setError('');
        const timer = window.setTimeout(()=>{
            void api.unifiedValues('LITERATURE',request,query,cursor).then(page=>{
                if(request.aborted)return;
                const found=page.items.flatMap(publication);
                setResults(old=>cursor?[...old,...found]:found);setNext(page.nextAfterId);
            }).catch(error=>{if(!request.aborted)setError(error.message);}).finally(()=>{if(!request.aborted)setPending(false);});
        }, query ? 180 : 0);
        return ()=>{window.clearTimeout(timer);controller.abort();};
    },[api,signal,query,cursor,revision]);

    const available = results.some(x=>x.key===selected) ? results : selected
        ? [pinned?.key===selected?pinned:{key:selected,caption:savedLabel??'Vybraná publikace',historical:selected.startsWith('s:')},...results] : results;
    return <>
        <label>Hledat v literatuře<input aria-label="Hledat publikaci" value={query} maxLength={100} onChange={e=>{
            setQuery(e.target.value);setCursor('');setNext(null);setResults([]);
        }}/></label>
        <label>Publikace<select aria-label="Publikace" value={selected} onChange={e=>{
            setPinned(available.find(x=>x.key===e.target.value));onSelect(e.target.value);
        }}><option value="">Vyberte publikaci</option>{available.map(value=><option key={value.key} value={value.key}>{value.caption}</option>)}</select></label>
        {pending&&<p role="status">Načítání publikací…</p>}{error&&<p role="alert">{error}</p>}
        {next&&<button type="button" disabled={pending} onClick={()=>setCursor(next)}>Další publikace</button>}
        {!allowSourceWrite&&selected.startsWith('s:')&&<p role="status">Tuto publikaci lze prohlédnout. Novou vazbu na její původní identitu současný zápis neumí.{' '}
            <Link target="_blank" rel="noopener noreferrer" to={`/admin/literature?${new URLSearchParams({catalog:String(catalog),type:'LITERATURE',value:selected})}`}>Otevřít detail publikace</Link>
        </p>}
        {canCreate&&<button type="button" onClick={()=>setCreating(true)}>Nová publikace</button>}
        {creating&&canCreate&&<NewPublicationDialog registry={registry} signal={signal} onClose={()=>setCreating(false)} onSaved={entry=>{
            const key=String(entry.id);
            const title=entry.fields.Titul_LT??entry.label,code=entry.fields.Ref_LT;
            setPinned({key,caption:code&&code!==title?`${title} — ${code}`:title,historical:false});
            onSelect(key);setQuery('');setCursor('');setResults([]);setNext(null);setRevision(n=>n+1);setCreating(false);
        }}/>}
    </>;
}

function NewPublicationDialog({registry,signal,onClose,onSaved}: {
    registry:ReturnType<typeof professionalRegistryApi>; signal:AbortSignal;
    onClose:()=>void; onSaved:(entry:RegistryEntry)=>void;
}) {
    const dialog=useRef<HTMLDialogElement>(null);
    const [draft,setDraft] = useState<RegistryDraft>({Titul_LT:null});
    const [saving,setSaving] = useState(false);
    const [error,setError] = useState('');
    useEffect(()=>{
        const node=dialog.current;
        if(!node)return;
        node.showModal();
        return ()=>node.close();
    },[]);
    function cancel() {
        if(!saving && (!Object.values(draft).some(Boolean) || window.confirm('Zahodit rozpracovanou publikaci?')))onClose();
    }
    async function save() {
        if(saving||!draft.Titul_LT?.trim())return;
        setSaving(true);setError('');
        try {
            const saved=await saveRegistryEntry(registry,'LITERATURE',draft,signal);
            if(!signal.aborted)onSaved(saved);
        } catch(e) {if(!signal.aborted)setError((e as Error).message);}
        finally {if(!signal.aborted)setSaving(false);}
    }
    return createPortal(<dialog ref={dialog} aria-label="Nová publikace" className="demus-editor" style={{width:'min(52rem, calc(100vw - 2rem))',maxHeight:'85dvh',position:'fixed',inset:0,margin:'auto',padding:'1rem',border:'1px solid #8c939c',background:'#efefef',color:'#172a40'}}
        onCancel={e=>{e.preventDefault();cancel();}} onKeyDown={e=>{if(e.key==='Enter'&&e.target instanceof HTMLInputElement){e.preventDefault();e.stopPropagation();}}}>
        <h2>Nová publikace</h2>
        {error&&<p role="alert">{error}</p>}
        <fieldset disabled={saving}><RegistryEditorFields kind="LITERATURE" draft={draft} onChange={setDraft}/></fieldset>
        <button type="button" className="demus-save" disabled={saving||!draft.Titul_LT?.trim()} onClick={()=>void save()}>Uložit publikaci</button>{' '}
        <button type="button" disabled={saving} onClick={cancel}>Zrušit</button>
    </dialog>,document.body);
}
