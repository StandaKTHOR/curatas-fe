import { useEffect, useLayoutEffect, useState } from 'react';
import { resolveApiUrl } from '../lib/api';
import { isBackendImage } from './SafeImage';

export default function PhotoPreview({ src, alt,load }: { src: string; alt: string;load?:(signal:AbortSignal)=>Promise<Blob> }) {
    const [open, setOpen] = useState(false);
    const [url, setUrl] = useState('');
    const [error, setError] = useState('');
    const resolved = load?src:resolveApiUrl(src);
    const privateLoad=!!load||isBackendImage(resolved);
    useLayoutEffect(()=>{setOpen(false);setUrl('');setError('');},[load]);
    useEffect(() => {
        if (!open || !privateLoad) return;
        const controller = new AbortController(); let objectUrl = '';
        setUrl('');setError('');
        const timeout = window.setTimeout(() => {
            setError('Načtení fotografie překročilo 15 sekund. Zkontrolujte spojení a zkuste náhled znovu.');controller.abort();
        },15000);
        const token = localStorage.getItem('token');
        (load?load(controller.signal):fetch(resolved,{headers:token?{Authorization:`Bearer ${token}`}:{},credentials:'omit',redirect:'error',signal:controller.signal})
            .then(async response=>{if(!response.ok)throw new Error(`Fotografii nelze načíst (HTTP ${response.status}).`);return response.blob();}))
            .then(blob=>{if(!['image/png','image/jpeg'].includes(blob.type)&&load)throw new Error('Server nevrátil podporovaný obrázek.');if(!blob.type.startsWith('image/'))throw new Error('Server nevrátil obrázek. Náhled není dostupný.');if(controller.signal.aborted)return;
                objectUrl=URL.createObjectURL(blob);setUrl(objectUrl);
            }).catch(e=>{if(!controller.signal.aborted)setError(e.message || 'Fotografii nelze načíst.');})
            .finally(()=>window.clearTimeout(timeout));
        return ()=>{window.clearTimeout(timeout);controller.abort();if(objectUrl)URL.revokeObjectURL(objectUrl);};
    },[open,resolved,load,privateLoad]);
    return <>
        <button data-scoped-read={load?true:undefined} type="button" onClick={()=>{setUrl('');setError('');setOpen(true);}} className="text-blue-600 font-bold">Náhled</button>
        {open && <div role="dialog" aria-modal="true" aria-label="Náhled fotografie" className="fixed inset-0 z-[1000] bg-black/70 flex items-center justify-center p-4">
            <div className="bg-white p-4 max-w-[95vw] max-h-[95vh] overflow-auto">
                <button data-scoped-read={load?true:undefined} type="button" onClick={()=>setOpen(false)}>Zavřít náhled</button>
                {error ? <p role="alert">{error}</p> : privateLoad && !url ? <p role="status">Načítám fotografii…</p> :
                    <img src={privateLoad?url:resolved} alt={alt} className="max-w-full max-h-[80vh]" onError={()=>setError('Obrázek se nepodařilo zobrazit.')}/>}
            </div>
        </div>}
    </>;
}
