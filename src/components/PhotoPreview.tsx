import { useEffect, useState } from 'react';
import { resolveApiUrl } from '../lib/api';
import { isBackendImage } from './SafeImage';

export default function PhotoPreview({ src, alt }: { src: string; alt: string }) {
    const [open, setOpen] = useState(false);
    const [url, setUrl] = useState('');
    const [error, setError] = useState('');
    const resolved = resolveApiUrl(src);
    useEffect(() => {
        if (!open || !isBackendImage(resolved)) return;
        const controller = new AbortController(); let objectUrl = '';
        setUrl('');setError('');
        const timeout = window.setTimeout(() => {
            setError('Načtení fotografie překročilo 15 sekund. Zkontrolujte spojení a zkuste náhled znovu.');controller.abort();
        },15000);
        const token = localStorage.getItem('token');
        fetch(resolved,{headers:token?{Authorization:`Bearer ${token}`}:{},credentials:'omit',redirect:'error',signal:controller.signal})
            .then(async response => {
                if(!response.ok) throw new Error(`Fotografii nelze načíst (HTTP ${response.status}).`);
                const blob=await response.blob();
                if(!blob.type.startsWith('image/'))throw new Error('Server nevrátil obrázek. Náhled není dostupný.');
                if(controller.signal.aborted)return;
                objectUrl=URL.createObjectURL(blob);setUrl(objectUrl);
            }).catch(e=>{if(!controller.signal.aborted)setError(e.message || 'Fotografii nelze načíst.');})
            .finally(()=>window.clearTimeout(timeout));
        return ()=>{window.clearTimeout(timeout);controller.abort();if(objectUrl)URL.revokeObjectURL(objectUrl);};
    },[open,resolved]);
    return <>
        <button type="button" onClick={()=>{setUrl('');setError('');setOpen(true);}} className="text-blue-600 font-bold">Náhled</button>
        {open && <div role="dialog" aria-modal="true" aria-label="Náhled fotografie" className="fixed inset-0 z-[1000] bg-black/70 flex items-center justify-center p-4">
            <div className="bg-white p-4 max-w-[95vw] max-h-[95vh] overflow-auto">
                <button type="button" onClick={()=>setOpen(false)}>Zavřít náhled</button>
                {error ? <p role="alert">{error}</p> : isBackendImage(resolved) && !url ? <p role="status">Načítám fotografii…</p> :
                    <img src={isBackendImage(resolved)?url:resolved} alt={alt} className="max-w-full max-h-[80vh]" onError={()=>setError('Obrázek se nepodařilo zobrazit.')}/>}
            </div>
        </div>}
    </>;
}