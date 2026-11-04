import AddDictionaryModal from './AddDictionaryModal';
import {managedAuthoritiesEnabled} from '../features/catalog/useManagedAuthorities';
import {originalDictionaryTree} from '../features/catalog/originalDictionary';
import {originalSession} from '../features/catalog/originalAdapter';
import { useEffect, useMemo, useState } from 'react';
import { getDictionaryTree } from '../lib/api';

type Node = { id: number|string; type?: string; code: string | null; label: string; children: Node[] };
type Choice = { id: number; label: string; rawLabel: string; code: string | null };
// Share requests between main fields and tuple editors. Failed requests are never cached.
const trees = new Map<string, { expires: number; promise: Promise<Node[]> }>();
export function invalidateHierarchy(type?: string) {
    if (type) trees.delete(type); else trees.clear();
}
function load(type: string) {
    const cached = trees.get(type);
    if (cached && cached.expires > Date.now()) return cached.promise;
    const promise = getDictionaryTree(type).catch(error => { trees.delete(type); throw error; });
    trees.set(type, { expires: Date.now() + 60000, promise });
    return promise as Promise<Node[]>;
}
function findPath(nodes: Node[], id: number|string | null, path: Node[] = []): Node[] {
    for (const node of nodes) {
        const next = [...path, node];
        if (node.id === id) return next;
        const found = findPath(node.children || [], id, next);
        if (found.length) return found;
    }
    return [];
}
export default function ThreeLevelDictionarySelect({ type, label, value, historicalValue, onChange, readOnly = false, allowEmpty = true, scoped = false, scopedValue, onScopedChange, unavailableReason,historicalSource=false }: {
    type: 'MATERIAL' | 'TECHNIQUE'; label: string; value: number | null; scoped?:boolean; scopedValue?:string|null; onScopedChange?:(id:string|null)=>void;
    historicalValue?: string | null;historicalSource?:boolean; readOnly?: boolean; allowEmpty?: boolean;
    unavailableReason?:string;
    onChange: (id: number | null, choice?: Choice) => void;
}) {
    const [managedModal,setManagedModal]=useState<'create'|'edit'|null>(null);
    const [managedWritable,setManagedWritable]=useState(false);
    const [managedVersion,setManagedVersion]=useState<{id:string;etag:string;label:string;code:string|null;parentId:string|null}|null>(null);
    const [preview,setPreview]=useState<string|null>(null);
    let scopedSignal:AbortSignal|undefined;try{if(scoped)scopedSignal=originalSession().signal;}catch{/* closed scope: loader reports the access state */}
    const selectedValue=scoped?(onScopedChange?scopedValue??null:preview):value;
    const [nodes, setNodes] = useState<Node[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [revision, setRevision] = useState(0);
    const [query, setQuery] = useState('');
    useEffect(() => {
        if(unavailableReason){setNodes([]);setLoading(false);setError('');return;}
        let alive = true;const cancel=new AbortController();setPreview(null);
        const clear=()=>{setNodes([]);setPreview(null);setError('Katalog nebo přihlášení se změnily. Zdrojový výběr byl uzavřen.');};
        scopedSignal?.addEventListener('abort',clear,{once:true});
        setLoading(true); setError(''); setNodes([]);setManagedWritable(false);
        if(scoped&&managedAuthoritiesEnabled()){const {api,signal}=originalSession();void api.dictionaryMetadata(type,AbortSignal.any([signal,cancel.signal])).then(meta=>{if(alive)setManagedWritable(meta.operations.includes('create')&&meta.operations.includes('update'));}).catch(()=>{});}
        (scoped?originalDictionaryTree(type,cancel.signal):load(type)).then(tree => { if (alive) setNodes(tree); })
            .catch(e => { if (alive) setError(e instanceof Error ? e.message : 'Načtení číselníku selhalo'); })
            .finally(() => { if (alive) setLoading(false); });
        return () => { alive = false;cancel.abort();scopedSignal?.removeEventListener('abort',clear); };
    }, [type, revision,scoped,scopedSignal,unavailableReason]);
    useEffect(() => { setQuery(''); }, [type, value]);
    const path = useMemo(() => findPath(nodes, selectedValue), [nodes, selectedValue]);
    const unknown = selectedValue != null && (!path.length || path.length > 3);
    const textMatches = (node: Node): boolean => node.label.toLocaleLowerCase('cs').includes(query.toLocaleLowerCase('cs'))
        || (scoped&&!!node.code?.toLocaleLowerCase('cs').includes(query.toLocaleLowerCase('cs'))) || (node.children || []).some(textMatches);
    const choose = (level: number, selected: string) => {
        const candidates = level === 0 ? nodes : path[level - 1]?.children || [];
        const node = selected ? candidates.find(candidate => String(candidate.id) === selected) : path[level - 1];
        // Changing a parent replaces the selected ID, so all old descendants disappear together.
        if(scoped){const id=node?String(node.id):null;if(onScopedChange)onScopedChange(id);else setPreview(id);return;}
        onChange(node?.id as number ?? null, node ? { id: node.id as number, label: node.label, rawLabel: node.label, code: node.code } : undefined);
    };
    const flat=(list:Node[]):Node[]=>list.flatMap(n=>[n,...flat(n.children)]);
    const manage=async(edit:boolean)=>{try{setError('');if(edit){const {api,signal}=originalSession();const page=await api.dictionaryValues(type,signal);const value=page.items.find(v=>v.id===selectedValue);if(!value)throw new Error('Vybranou položku je potřeba načíst z její aktuální stránky.');setManagedVersion({id:value.id,etag:`"${value.version}"`,label:value.label,code:value.code,parentId:value.parentId});}else setManagedVersion(null);setManagedModal(edit?'edit':'create');}catch(e){setError((e as Error).message);}};
    return <fieldset className="space-y-2" disabled={readOnly||!!unavailableReason}>
        <legend className="text-sm font-semibold text-gray-700">{label}</legend>
        {!loading && !error && !unknown && path.length > 0 && <p aria-label={`Vybraná cesta: ${label}`} className="text-sm font-medium text-[#00204a]">{path.map(node => node.label).join(' › ')}</p>}
        {!loading && !error && !unknown && path.length > 0 && path.length < 3 && !path[path.length - 1].children?.length && <p className="text-xs text-gray-600">Tato položka nemá další úroveň v dostupném číselníku. Chybějící zařazení se nedoplňuje automaticky.</p>}
        {loading && <p role="status">Načítání číselníku…</p>}
        {error && <div role="alert">{error} <button type="button" onClick={() => {
            invalidateHierarchy(type); setRevision(current => current + 1);
        }}>Zkusit znovu</button></div>}
        {unavailableReason&&<p role="status">{unavailableReason}</p>}
        {!unavailableReason && !loading && !error && !nodes.length && <p className="text-xs">Číselník zatím nemá položky. Uložené údaje zůstávají zachované.</p>}
        {historicalValue && <p className="text-xs">{historicalSource?'Původní text DEMUS':scoped?'Současný kurátorský text':'Původní text'}: {historicalValue}{!scoped&&value == null ? ' (zatím nepřiřazeno v číselníku)' : ''}</p>}
        {!historicalValue && value == null && <p className="text-xs">{scoped?'Současný text není vyplněn; vazba předmětu není ověřena.':'Nevyplněno'}</p>}
        {!loading && !error && unknown && <p role="status">Stávající vazba #{value} nemá dostupnou tříúrovňovou cestu. Zůstává zachována.</p>}
        <input data-scoped-read={scoped?true:undefined} aria-label={`Hledat: ${label}`} value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Hledat v číselníku" disabled={loading || !!error}
            onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }}
            className="w-full rounded border border-gray-300 px-3 py-2 text-xs" />
        {[0, 1, 2].map(level => {
            const candidates = level === 0 ? nodes : path[level - 1]?.children || [];
            return <label key={level} className="block text-xs">Úroveň {level + 1}
                <select data-scoped-read={scoped?true:undefined} aria-label={`${label} — úroveň ${level + 1}`} value={unknown ? '' : path[level]?.id ?? ''}
                    disabled={loading || !!error || (level > 0 && (unknown || !path[level - 1] || !candidates.length))}
                    onChange={e => choose(level, e.target.value)} className="w-full rounded border border-gray-300 bg-white px-3 py-2">
                    <option value="" disabled={!allowEmpty && level === 0}>— nevybráno —</option>
                    {candidates.filter(node => node.id === path[level]?.id || textMatches(node)).map(node =>
                        <option key={node.id} value={node.id}>{node.label}</option>)}
                </select>
            </label>;
        })}
        <p className="text-xs text-gray-600">{scoped?(onScopedChange?'Výběr se uloží až tlačítkem Přidat vazbu. Současný text ani historický zdroj se nemění.':'Prohlížení katalogového číselníku: výběr je dočasný. Pro přiřazení použijte část Současné číselníkové vazby. Současný text ani zdroj se nemění.'):'Vyberte dostupné úrovně od kořene. Změna nadřazené úrovně zruší výběr jejích potomků; údaje se uloží až po potvrzení formuláře.'}</p>
        {scoped&&managedAuthoritiesEnabled()&&<><button data-scoped-reference-editor type="button" disabled={readOnly||!managedWritable||loading} title={!managedWritable?'Vyžaduje dictionary.write a zapnutý zapisovatelný kontrakt.':undefined} onClick={()=>void manage(false)}>+ Nová položka číselníku</button><button data-scoped-reference-editor type="button" disabled={readOnly||!managedWritable||!selectedValue||loading} onClick={()=>void manage(true)}>Upravit vybranou položku</button></>}
        {managedModal&&<AddDictionaryModal isOpen dictionaryType={type} dictionaryTitle={label} onClose={()=>setManagedModal(null)} onSuccess={()=>{}} editing={managedModal==='edit'} initialValue={managedVersion??undefined} parentOptions={flat(nodes).filter(n=>n.id!==managedVersion?.id).map(n=>({id:n.id,label:n.label}))} onCreate={async input=>{const {api,signal}=originalSession();const result=await api.saveDictionary(type,{label:input.label,code:input.code,parentId:input.parentId,reason:managedModal==='edit'?'Výslovná úprava současného číselníku':'Vytvoření současné položky číselníku'},signal,managedVersion?.id,managedVersion?.etag);if(signal.aborted)return;invalidateHierarchy(type);setRevision(v=>v+1);onScopedChange?.(result.value.id);}}/>}
        {!allowEmpty && <p className="text-xs text-gray-600">Stávající vazbu lze změnit. Její úplné odebrání tento záznam zatím nepodporuje; úprava jiných polí ji zachová.</p>}
    </fieldset>;
}
