import { uncertainWrite, uncertainCreateMessage } from '../lib/writeOutcome';
import type { ItemEditSession } from '../lib/editSession';
import YearDateInput from './YearDateInput';
import { useEffect, useState, type MutableRefObject } from 'react';
import {
    createMuseumAcquisition, deleteMuseumAcquisition, listMuseumAcquisitions,
    updateMuseumAcquisition, type MuseumAcquisition, type MuseumAcquisitionInput,
} from '../lib/api';
import { TreeChoice } from './MuseumSection';

const empty: MuseumAcquisitionInput = {
    accessionNumber: '', acquisitionMethod: '', methodDictionaryId: null,
    acquisitionDate: null, acquiredFrom: '', circumstances: '', documentNumber: '', message: '', orderNumber: null,
};

export default function AcquisitionSection({ itemId, editSession, readOnly = false, onSave, drafts, snapshotRequired = false }: { itemId?: number; editSession?: ItemEditSession; readOnly?: boolean; onSave?: () => void; drafts?: MutableRefObject<Record<string, any>>; snapshotRequired?: boolean }) {
    const [rows, setRows] = useState<MuseumAcquisition[]>([]);
    const [editing, setEditing] = useState<MuseumAcquisition | null>(drafts?.current.acquisition?.editing ?? null);
    const [form, setForm] = useState<MuseumAcquisitionInput>(drafts?.current.acquisition?.form ?? empty);
    const [message, setMessage] = useState('');
    const [saving, setSaving] = useState(false);
    const [uncertain, setUncertain] = useState(drafts?.current.acquisition?.uncertain ?? false);
    const [refreshNeeded, setRefreshNeeded] = useState(drafts?.current.acquisition?.refreshNeeded ?? false);
    const baseline = editing ? Object.fromEntries(Object.keys(empty).map(key => [key, (editing as any)[key] ?? (empty as any)[key]])) : empty;
    const dirty = Object.keys(empty).some(key => ((form as any)[key] ?? '') !== ((baseline as any)[key] ?? ''));
    useEffect(() => {if (drafts) drafts.current.acquisition = {editing, form, dirty: dirty || uncertain, uncertain, refreshNeeded};}, [form, editing, drafts, dirty, uncertain, refreshNeeded]);
    useEffect(() => {
        if (!itemId || (snapshotRequired && !editSession)) return;
        let alive = true;
        listMuseumAcquisitions(itemId, editSession).then(data => {if (alive) setRows(data);}).catch((e: Error) => {if (alive) setMessage(e.message);});
        return () => {alive = false;};
    }, [itemId, editSession, snapshotRequired]);
    if (!itemId) return <p className="rounded border p-4">Nejprve uložte předmět; pak lze přidat akvizice.</p>;
    if (snapshotRequired && !editSession) return <p role="status">Čekám na konzistentní verzi předmětu…</p>;

    const select = (row: MuseumAcquisition | null) => {
        if (uncertain) {setMessage(uncertainCreateMessage); return;}
        setEditing(row);
        setForm(row ? {
            accessionNumber: row.accessionNumber, acquisitionMethod: row.acquisitionMethod,
            methodDictionaryId: row.methodDictionaryId, acquisitionDate: row.acquisitionDate,
            acquiredFrom: row.acquiredFrom, circumstances: row.circumstances,
            documentNumber: row.documentNumber, message: row.message, orderNumber: row.orderNumber,
        } : empty);
    };
    const save = async () => {
        if (saving || editSession?.busy) return;
        if (uncertain) {setMessage(uncertainCreateMessage); return;}
        if (!dirty) {setMessage('Akvizice nemá žádné změny k uložení.'); return;}
        setSaving(true);
        let committed = false;
        try {
            const saved = editing
                ? await updateMuseumAcquisition(itemId, editing.id, form, editSession)
                : await createMuseumAcquisition(itemId, form, editSession);
            if (!saved?.id) throw new Error('Server nepotvrdil ID akvizice.');
            committed = true;
            const savedForm = Object.fromEntries(Object.keys(empty).map(key => [key, (saved as any)[key] ?? (empty as any)[key]])) as MuseumAcquisitionInput;
            setEditing(saved); setForm(savedForm); setRefreshNeeded(true);
            if (drafts) drafts.current.acquisition = {editing: saved, form: savedForm, dirty: false, refreshNeeded: true};
            setRows(old => [...old.filter(row => row.id !== saved.id), saved]);
            setRows(await listMuseumAcquisitions(itemId, editSession));
            await onSave?.();
            setRefreshNeeded(false);
            select(null);
            setMessage('Akvizice uložena.');
        } catch (e) {
            if (committed) {
                setMessage('Akvizice byla uložena; obnovení dat selhalo: ' + (e as Error).message);
            } else if (!editing && uncertainWrite(e)) {
                setUncertain(true);
                if (drafts) drafts.current.acquisition = {editing, form, dirty: true, uncertain: true};
                setMessage(uncertainCreateMessage + ' ' + (e as Error).message);
            } else setMessage((e as Error).message);
        }
        finally {setSaving(false);}
    };
    const refresh = async () => {
        setSaving(true);
        try {
            setRows(await listMuseumAcquisitions(itemId, uncertain ? undefined : editSession));
            if (!uncertain) {await onSave?.(); setRefreshNeeded(false);}
            setMessage(uncertain ? uncertainCreateMessage + ' Serverový seznam byl načten.' : 'Akvizice byla uložena; seznam obnoven.');
        } catch (e) {setMessage((e as Error).message);}
        finally {setSaving(false);}
    };
    const remove = async (row: MuseumAcquisition) => {
        if (uncertain) {setMessage(uncertainCreateMessage); return;}
        if (row.legacyData || !window.confirm('Odebrat tuto akvizici?')) return;
        try { await deleteMuseumAcquisition(itemId, row.id, editSession); setRows(await listMuseumAcquisitions(itemId, editSession)); }
        catch (e) { setMessage((e as Error).message); }
    };
    const field = (key: keyof MuseumAcquisitionInput, label: string, type = 'text') => <label key={key} className="block text-sm font-semibold">
        {label}<input type={type} className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 font-normal"
            value={String(form[key] ?? '')} onChange={e => setForm(old => ({ ...old, [key]: key === 'orderNumber'
                ? (e.target.value ? Number(e.target.value) : null) : e.target.value || null }))} />
    </label>;
    return <fieldset disabled={readOnly || saving} className="space-y-4 demus-section">
        <h3 className="font-bold">Akvizice předmětu</h3>
        <p className="text-sm text-gray-600">Jeden předmět může mít více akvizic. Původní hodnoty DEMUS zůstávají uložené u importovaných řádků.</p>
        {rows.map(row => <div key={row.id} className="rounded border border-gray-200 p-3 text-sm">
            <div className="flex justify-between"><strong>{row.accessionNumber || `Akvizice #${row.id}`}</strong><span>
                <button type="button" onClick={() => select(row)} className="text-blue-700 underline">Upravit</button>
                {!row.legacyData && <button type="button" onClick={() => remove(row)} className="ml-3 text-red-700 underline">Odebrat</button>}
            </span></div>
            <p>{row.acquisitionDate || 'Bez data'} · {row.acquisitionMethod || 'Bez způsobu'} · {row.acquiredFrom || 'Bez předchozího vlastníka'}</p>
            {row.legacyData && <details><summary className="cursor-pointer">Všechna původní pole</summary>
                <pre className="overflow-x-auto text-xs">{JSON.stringify(row.legacyData, null, 2)}</pre></details>}
        </div>)}
        <div className="space-y-3 rounded border border-gray-200 bg-gray-50 p-4">
            <h4 className="font-semibold">{editing ? `Úprava akvizice #${editing.id}` : 'Nová akvizice'}</h4>
            <div className="grid gap-3 md:grid-cols-2">
                {field('accessionNumber', 'Přírůstkové číslo')}{field('acquisitionMethod', 'Způsob akvizice / DEMUS kód')}
                <TreeChoice type="ACQUISITION_METHOD" label="Způsob akvizice – číselník"
                    value={form.methodDictionaryId} onChange={(id, choice) => setForm(old => ({ ...old,
                        methodDictionaryId: id, acquisitionMethod: choice?.code ?? old.acquisitionMethod }))} />
                <YearDateInput id="acquisition-record-date" label="Datum akvizice" value={form.acquisitionDate || ''}
                    onChange={value => setForm(old => ({...old, acquisitionDate: value || null}))} />{field('acquiredFrom', 'Předchozí vlastník')}
                {field('circumstances', 'Okolnosti')}{field('documentNumber', 'Číslo dokladu')}
                {field('message', 'Vzkaz')}{field('orderNumber', 'Pořadí', 'number')}
            </div>
            <button type="button" onClick={save} className="rounded bg-[#00204a] px-4 py-2 text-sm font-semibold text-white">Uložit akvizici</button>
            {editing && <button type="button" onClick={() => select(null)} className="ml-3 text-sm underline">Nová akvizice</button>}
        </div>
        {(refreshNeeded || uncertain) && <button type="button" onClick={refresh}>Obnovit serverový seznam</button>}
        {message && <p role="status">{message}</p>}
    </fieldset>;
}
