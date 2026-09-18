import { useEffect, useState } from 'react';
import {
    createMuseumAcquisition, deleteMuseumAcquisition, listMuseumAcquisitions,
    updateMuseumAcquisition, type MuseumAcquisition, type MuseumAcquisitionInput,
} from '../lib/api';
import { TreeChoice } from './MuseumSection';

const empty: MuseumAcquisitionInput = {
    accessionNumber: '', acquisitionMethod: '', methodDictionaryId: null,
    acquisitionDate: null, acquiredFrom: '', circumstances: '', documentNumber: '', message: '', orderNumber: null,
};

export default function AcquisitionSection({ itemId }: { itemId?: number }) {
    const [rows, setRows] = useState<MuseumAcquisition[]>([]);
    const [editing, setEditing] = useState<MuseumAcquisition | null>(null);
    const [form, setForm] = useState<MuseumAcquisitionInput>(empty);
    const [message, setMessage] = useState('');
    useEffect(() => {
        if (itemId) listMuseumAcquisitions(itemId).then(setRows).catch((e: Error) => setMessage(e.message));
    }, [itemId]);
    if (!itemId) return <p className="rounded border p-4">Nejprve uložte předmět; pak lze přidat akvizice.</p>;

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
            if (editing) await updateMuseumAcquisition(itemId, editing.id, form);
            else await createMuseumAcquisition(itemId, form);
            setRows(await listMuseumAcquisitions(itemId));
            select(null);
            setMessage('Akvizice uložena.');
        } catch (e) { setMessage((e as Error).message); }
    };
    const remove = async (row: MuseumAcquisition) => {
        if (row.legacyData || !window.confirm('Odebrat tuto akvizici?')) return;
        try { await deleteMuseumAcquisition(itemId, row.id); setRows(await listMuseumAcquisitions(itemId)); }
        catch (e) { setMessage((e as Error).message); }
    };
    const field = (key: keyof MuseumAcquisitionInput, label: string, type = 'text') => <label key={key} className="block text-sm font-semibold">
        {label}<input type={type} className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 font-normal"
            value={String(form[key] ?? '')} onChange={e => setForm(old => ({ ...old, [key]: key === 'orderNumber'
                ? (e.target.value ? Number(e.target.value) : null) : e.target.value }))} />
    </label>;
    return <div className="space-y-4">
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
                {field('acquisitionDate', 'Datum akvizice', 'date')}{field('acquiredFrom', 'Předchozí vlastník')}
                {field('circumstances', 'Okolnosti')}{field('documentNumber', 'Číslo dokladu')}
                {field('message', 'Vzkaz')}{field('orderNumber', 'Pořadí', 'number')}
            </div>
            <button type="button" onClick={save} className="rounded bg-[#00204a] px-4 py-2 text-sm font-semibold text-white">Uložit akvizici</button>
            {editing && <button type="button" onClick={() => select(null)} className="ml-3 text-sm underline">Nová akvizice</button>}
        </div>
        {message && <p role="status">{message}</p>}
    </div>;
}
