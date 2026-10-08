import { useEffect, useState } from 'react';
import { DemusIdentity, getDemusIdentity } from '../lib/demusIdentity';
import { getInventoryIdentity, updateInventoryIdentity, inventoryComponentNames,
    InventoryIdentity, InventoryComponents } from '../lib/inventoryIdentity';

const labels = { series: 'Řada', ordinal: 'Pořadové číslo', division: 'Lomení',
    hierarchyOrdinal: 'Hlavní pořadové číslo', hierarchyDivision: 'Hlavní lomení',
    stateCode: 'Stát správce', custodianCode: 'Instituce', departmentCode: 'Oddělení', collectionCode: 'Podsbírka (kód)' };
const scope = new Set(['stateCode', 'custodianCode', 'departmentCode', 'collectionCode']);

export function InventoryIdentityPanel({ itemId, inventoryNumber, canEdit, onSaved }: {
    itemId: number; inventoryNumber: string; canEdit: boolean; onSaved: () => Promise<void>;
}) {
    const [data, setData] = useState<InventoryIdentity | null>(null);
    const [error, setError] = useState('');
    const [source, setSource] = useState<DemusIdentity | null>(null);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [draft, setDraft] = useState<InventoryComponents | null>(null);
    const [display, setDisplay] = useState<string | null>(null);
    useEffect(() => {
        let active = true;
        setData(null); setEditing(false); setError(''); setSource(null);
        getDemusIdentity(itemId).then(value => { if (active) setSource(value); }).catch(() => { /* Optional source evidence never substitutes for the structured API. */ });
        getInventoryIdentity(itemId).then(value => { if (active) setData(value); })
            .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Nelze načíst inventární údaje.'); });
        return () => { active = false; };
    }, [itemId, inventoryNumber]);
    const save = async () => {
        if (!data || !draft || saving || !canEdit) return;
        setSaving(true); setError('');
        try {
            const updated = await updateInventoryIdentity(data, display, draft);
            setData(updated); setEditing(false);
            await onSaved();
        } catch (reason) { setError(reason instanceof Error ? reason.message : 'Inventární údaje se nepodařilo uložit.'); }
        finally { setSaving(false); }
    };
    return <section aria-label="Strukturované inventární číslo" className="rounded border border-gray-200 bg-white px-3 py-2 text-xs">
        <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">Inventární číslo – složky DEMUS</h2>
            {data && canEdit && !data.stale && !editing && <button type="button" className="underline" onClick={() => {
                setDraft({ ...data.components }); setDisplay(data.inventoryNumber); setEditing(true);
            }}>Upravit složky</button>}
        </div>
        {error && <p role="alert" className="mt-1 text-red-700">{error}</p>}
        {!data && !error && <p role="status">Načítání inventárních údajů…</p>}
        {data?.stale && <p role="alert" className="mt-1 text-amber-800">Zobrazené číslo se změnilo mimo strukturovanou evidenci. Složky je nutné odborně ověřit.</p>}
        {data && <>
            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 md:grid-cols-3">
                {inventoryComponentNames.map(name => <div key={name}>
                    <label htmlFor={`inventory-component-${name}`} className="block text-gray-600">{labels[name]}</label>
                    {editing && draft ? <input id={`inventory-component-${name}`} className="w-full rounded border px-1 py-0.5"
                        value={draft[name] ?? ''} disabled={saving || !canEdit || scope.has(name)}
                        onChange={event => setDraft({ ...draft, [name]: event.target.value })} />
                        : <span id={`inventory-component-${name}`} className="whitespace-pre-wrap font-mono">{data.components[name] ?? '—'}</span>}
                </div>)}
            </div>
            {editing && <div className="mt-2 space-y-1">
                <label htmlFor="structured-inventory-display">Zobrazené inventární číslo</label>
                <input id="structured-inventory-display" value={display ?? ''} disabled={saving || !canEdit}
                    className="w-full rounded border px-2 py-1" onChange={event => setDisplay(event.target.value)} />
                <p className="text-gray-600">Složky se neodvozují ze zobrazeného čísla. Původní hodnoty a historické označení zůstanou zachovány.</p>
                <div className="flex gap-3"><button type="button" disabled={saving || !canEdit} onClick={save}>{saving ? 'Ukládání…' : 'Uložit inventární údaje'}</button>
                    <button type="button" disabled={saving} onClick={() => setEditing(false)}>Zrušit</button></div>
            </div>}
            {source && <details className="mt-2"><summary>Původní identifikace a odborné údaje DEMUS</summary>
                <dl className="grid grid-cols-2 gap-1 mt-1">
                    {([
                        ['Původní inventární číslo', source.originalInventoryNumber], ['Jiné číslo', source.otherNumber],
                        ['Poznámka ke vzniku', source.originNote], ['Role původce (zdroj)', source.authorRole],
                        ['Určil (zdroj)', source.determinedBy], ['Datum určení (původní zápis)', source.determinedAtRaw],
                        ['IdC_S ve zdroji', source.sourceLocalId]
                    ] as const).map(([label, value]) => <div key={label}><dt className="text-gray-600">{label}</dt>
                        <dd className="whitespace-pre-wrap">{value ?? '—'}</dd></div>)}
                </dl>
            </details>}
            {data.aliases.length > 0 && <details className="mt-2"><summary>Historická inventární označení ({data.aliases.length})</summary>
                <ul>{data.aliases.map((alias, index) => <li key={index} className="whitespace-pre-wrap font-mono">{alias.inventoryNumber ?? '—'}</li>)}</ul>
            </details>}
        </>}
    </section>;
}
