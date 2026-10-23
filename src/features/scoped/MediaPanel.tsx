import { useCallback, useEffect, useRef, useState } from 'react';
import { type Media, type ScopedApi } from './scopedApi';
import { useTask } from './useTask';

export default function MediaPanel({ api, itemId, onFatal }: { api: ScopedApi; itemId: number; onFatal: (status: number) => void }) {
    const [rows, setRows] = useState<Media[]>([]);
    const [next, setNext] = useState<string | null>(null);
    const [selected, setSelected] = useState<Media | null>(null);
    const [image, setImage] = useState<string | null>(null);
    const object = useRef<string | null>(null);
    const downloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const task = useTask(onFatal); const { run, cancel } = task;
    const clear = useCallback(() => { cancel(); if (downloadTimer.current) clearTimeout(downloadTimer.current); downloadTimer.current = null; if (object.current) URL.revokeObjectURL(object.current); object.current = null; setImage(null); }, [cancel]);
    useEffect(() => () => { if (downloadTimer.current) clearTimeout(downloadTimer.current); if (object.current) URL.revokeObjectURL(object.current); }, []);
    const load = useCallback((after?: string) => {
        clear(); setSelected(null); if (!after) { setRows([]); setNext(null); }
        void run(s => api.media(itemId, s, after), page => { setRows(old => after ? [...old, ...page.items] : page.items); setNext(page.nextAfterId); });
    }, [api, itemId, clear, run]);
    useEffect(() => { load(); }, [load]);
    function select(row: Media) {
        clear(); setSelected(null);
        void run(s => api.mediaDetail(itemId, row.id, s), setSelected, false, () => setRows([]));
    }
    function fetchBytes(variant: 'content' | 'thumbnail', download = false) {
        if (!selected) return; clear(); const entry = selected;
        void run(s => api.bytes(itemId, entry, variant, s), blob => {
            const url = URL.createObjectURL(blob); object.current = url;
            if (download) {
                const anchor = document.createElement('a'); anchor.href = url; anchor.download = entry.name;
                document.body.appendChild(anchor); anchor.click(); anchor.remove();
                // Allow browser acquisition, then release the temporary download URL. Context changes release it sooner.
                downloadTimer.current = setTimeout(() => { if (object.current === url) { URL.revokeObjectURL(url); object.current = null; } downloadTimer.current = null; }, 1000);
            } else setImage(url);
        }, false, () => { clear(); setSelected(null); setRows([]); });
    }
    return <section aria-label="Soukromá média">
        <h3>Soukromá média</h3>
        <button type="button" disabled={task.busy} onClick={() => load()}>Obnovit média</button>
        {task.busy && <p role="status">Načítání médií…</p>}
        {task.error && <p role="alert">{task.error} Soubor nebyl zobrazen. Obnovte seznam pro nový pokus.</p>}
        {!task.busy && !task.error && rows.length === 0 && <p>Žádná nová soukromá média.</p>}
        <ul>{rows.map(row => <li key={row.id}><button type="button" disabled={task.busy} onClick={() => select(row)}>{row.name}</button> — {row.mimeType}, {row.byteSize} B</li>)}</ul>
        {next && <button type="button" disabled={task.busy} onClick={() => load(next)}>Další média</button>}
        {selected && <div aria-label="Detail média">
            <p>{selected.name} — {selected.mimeType}, {selected.byteSize} B</p>
            {selected.kind === 'IMAGE' && selected.variants.includes('thumbnail') && <button type="button" disabled={task.busy} onClick={() => fetchBytes('thumbnail')}>Náhled obrázku</button>}
            {selected.kind === 'IMAGE' && ['image/png','image/jpeg'].includes(selected.mimeType) && <button type="button" disabled={task.busy} onClick={() => fetchBytes('content')}>Otevřít obrázek</button>}
            <button type="button" disabled={task.busy} onClick={() => fetchBytes('content', true)}>Stáhnout originál</button>
            <button type="button" onClick={() => { clear(); setSelected(null); }}>Zavřít médium</button>
            {image && <img src={image} alt={`Soukromý obrázek ${selected.name}`} style={{ maxWidth: '100%', maxHeight: 500 }} />}
        </div>}
        <p>Dokumenty se zobrazují pouze stažením. Uložené kopie nelze zpětně odvolat.</p>
    </section>;
}
