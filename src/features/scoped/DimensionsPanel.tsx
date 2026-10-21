import { useCallback, useEffect, useState } from 'react';
import { decimal, type Dimension, type ScopedApi, type Versioned } from './scopedApi';
import { useTask } from './useTask';

export default function DimensionsPanel({ api, itemId, onFatal, onChanged }: { api: ScopedApi; itemId: number; onFatal: (status: number) => void; onChanged: () => void }) {
    const [rows, setRows] = useState<Dimension[]>([]); const [next, setNext] = useState<number | null>(null);
    const [selected, setSelected] = useState<Versioned<Dimension> | null>(null);
    const [etag, setTag] = useState(''); const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState({ type: '', value: '', unit: null as string | null });
    const [conflict, setConflict] = useState(false); const [compared, setCompared] = useState(false);
    const task = useTask(onFatal); const { run } = task;
    const load = useCallback((after = 0) => {
        if (!after) { setRows([]); setNext(null); }
        void run(s => api.dimensions(itemId, s, after), result => {
            setRows(old => after ? [...old, ...result.value.items] : result.value.items); setNext(result.value.nextAfterId);
            if (!editing) setTag(result.etag);
        });
    }, [api, itemId, run, editing]);
    // Initial load belongs to this item mount, never to draft changes.
    useEffect(() => { void run(s => api.dimensions(itemId, s), result => { setRows(result.value.items); setNext(result.value.nextAfterId); setTag(result.etag); }); }, [api, itemId, run]);
    function open(row: Dimension) {
        setSelected(null); setEditing(false); setConflict(false); setCompared(false);
        void run(s => api.dimension(itemId, row.id, s), result => {
            setSelected(result); setTag(result.etag); setDraft({ type: result.value.type, value: result.value.value ?? '', unit: result.value.unit });
        });
    }
    function reloadVersion() {
        if (selected) void run(s => api.dimension(itemId, selected.value.id, s), result => { setSelected(result); setTag(result.etag); setCompared(true); });
        else void run(s => api.dimensions(itemId, s), result => { setRows(result.value.items); setNext(result.value.nextAfterId); setTag(result.etag); setCompared(true); });
    }
    function save() {
        try { decimal(draft.value); } catch (e) { task.setError((e as Error).message); return; }
        void run(s => selected ? api.patchDimension(itemId, selected.value.id, etag, draft, s) : api.createDimension(itemId, etag, draft, s), result => {
            setSelected(result); setTag(result.etag); setEditing(false); setConflict(false); onChanged();
            setRows(old => [...old.filter(x => x.id !== result.value.id), result.value].sort((a,b) => a.id-b.id));
        }, true, () => { setConflict(true); setCompared(false); });
    }
    return <section aria-label="Rozměry">
        <h3>Rozměry</h3>
        <button type="button" disabled={task.busy || editing} onClick={() => load()}>Obnovit rozměry</button>
        <button type="button" disabled={task.busy || !etag || editing} onClick={() => { setSelected(null); setDraft({ type: '', value: '', unit: null }); setEditing(true); setConflict(false); }}>Nový rozměr</button>
        {task.busy && <p role="status">Načítání rozměrů…</p>}{task.error && <p role="alert">{task.error}</p>}
        {!task.busy && !task.error && rows.length === 0 && <p>Žádné rozměry.</p>}
        <ul>{rows.map(row => <li key={row.id}><button type="button" disabled={task.busy || editing} onClick={() => open(row)}>{row.type}: {row.value ?? 'neuvedeno'} {row.unit}</button> — {row.createdInScopedApi ? 'nový scoped záznam' : 'historický, pouze čtení'}</li>)}</ul>
        {next !== null && <button type="button" disabled={task.busy || editing} onClick={() => load(next)}>Další rozměry</button>}
        {selected && !editing && <div aria-label="Detail rozměru"><p>{selected.value.type}: {selected.value.value} {selected.value.unit}</p><p>ETag předmětu: {selected.etag}</p>
            {selected.value.createdInScopedApi && <button type="button" onClick={() => setEditing(true)}>Upravit rozměr</button>}
            {!selected.value.createdInScopedApi && <p>Tento rozměr je pouze pro čtení.</p>}</div>}
        {editing && <form aria-label="Editor rozměru" onSubmit={e => { e.preventDefault(); save(); }}>
            <label>Typ rozměru<input value={draft.type} maxLength={255} required onChange={e => setDraft({ ...draft, type: e.target.value })} /></label>
            <label>Hodnota rozměru<input inputMode="decimal" value={draft.value} required onChange={e => setDraft({ ...draft, value: e.target.value })} /></label>
            <label>Jednotka<input value={draft.unit ?? ''} maxLength={255} onChange={e => setDraft({ ...draft, unit: e.target.value })} /></label>
            <label><input type="checkbox" checked={draft.unit === null} onChange={e => setDraft({ ...draft, unit: e.target.checked ? null : '' })} />Jednotka neuvedena (NULL)</label>
            <p>Bez zaokrouhlení a převodu jednotek. Zápis vyžaduje item.write a aktuální verzi předmětu.</p>
            <button disabled={task.busy || conflict}>Uložit rozměr</button>
            <button type="button" disabled={task.busy} onClick={() => { setEditing(false); setConflict(false); }}>Zrušit editaci rozměru</button>
            {conflict && <div role="status"><p>Draft zůstal zachován. Porovnejte serverovou verzi.</p>{compared && selected && <p>Server: {selected.value.type}, {selected.value.value}, {selected.value.unit}; ETag {etag}</p>}
                <button type="button" disabled={task.busy} onClick={reloadVersion}>Načíst verzi pro porovnání rozměru</button>
                {compared && <button type="button" onClick={() => setConflict(false)}>Potvrdit porovnání rozměru a použít nový ETag</button>}</div>}
        </form>}
    </section>;
}
