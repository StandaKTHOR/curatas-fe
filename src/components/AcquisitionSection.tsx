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
    useEffect(() => {if (drafts) drafts.current.acquisition = {editing, form, dirty: JSON.stringify(form) !== JSON.stringify(empty)};}, [form, editing, drafts]);
    useEffect(() => {
        if (!itemId || (snapshotRequired && !editSession)) return;
        let alive = true;
        listMuseumAcquisitions(itemId, editSession).then(data => {if (alive) setRows(data);}).catch((e: Error) => {if (alive) setMessage(e.message);});
        return () => {alive = false;};
    }, [itemId, editSession, snapshotRequired]);
    if (!itemId) return <p className="rounded border p-4">Nejprve uložte předmět; pak lze přidat akvizice.</p>;
    if (snapshotRequired && !editSession) return <p role="status">Čekám na konzistentní verzi předmětu…</p>;

    const select = (row: MuseumAcquisition | null) => {
        setEditing(row);
        setForm(row ? {
            accessionNumber: row.accessionNumber, acquisitionMethod: row.acquisitionMethod,
            methodDictionaryId: row.methodDictionaryId, acquisitionDate: row.acquisitionDate,
            acquiredFrom: row.acquiredFrom, circumstances: row.circumstances,
            documentNumber: row.documentNumber, message: row.message, orderNumber: row.orderNumber,
        } : empty);
    };
    const save = async () => {
        try {
            if (editing) await updateMuseumAcquisition(itemId, editing.id, form, editSession);
            else await createMuseumAcquisition(itemId, form, editSession);
            setRows(await listMuseumAcquisitions(itemId, editSession));
            select(null);
            onSave?.();
            setMessage('Akvizice uložena.');
        } catch (e) { setMessage((e as Error).message); }
    };
    const remove = async (row: MuseumAcquisition) => {
        if (row.legacyData || !window.confirm('Odebrat tuto akvizici?')) return;
        try { await deleteMuseumAcquisition(itemId, row.id, editSession); setRows(await listMuseumAcquisitions(itemId, editSession)); }
        catch (e) { setMessage((e as Error).message); }
    };
    const field = (key: keyof MuseumAcquisitionInput, label: string, type = 'text') => <label key={key} className="block text-sm font-semibold">
        {label}<input type={type} className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 font-normal"
            value={String(form[key] ?? '')} onChange={e => setForm(old => ({ ...old, [key]: key === 'orderNumber'
                ? (e.target.value ? Number(e.target.value) : null) : e.target.value || null }))} />
    </label>;
    return <fieldset disabled={readOnly} className="space-y-4 demus-section">
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
        {message && <p role="status">{message}</p>}
    </fieldset>;
}
