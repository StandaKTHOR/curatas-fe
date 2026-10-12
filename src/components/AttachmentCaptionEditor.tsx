import { useState } from 'react';
import { patchAttachment } from '../lib/api';

export default function AttachmentCaptionEditor({itemId, attachmentId, caption, onSaved}: {
    itemId: number; attachmentId: number; caption?: string | null; onSaved: () => Promise<void>;
}) {
    const [text,setText]=useState(caption || '');
    const [saving,setSaving]=useState(false);
    const [message,setMessage]=useState('');
    const save=async()=>{
        setSaving(true);setMessage('');
        try {await patchAttachment(itemId,attachmentId,{caption:text});await onSaved();setMessage('Popis přílohy uložen.');}
        catch(e){setMessage((e as Error).message);}finally{setSaving(false);}
    };
    return <div className="flex flex-wrap items-center gap-2">
        <input aria-label={`Popis přílohy ${attachmentId}`} maxLength={1000} value={text} onChange={e=>setText(e.target.value)}/>
        <button type="button" disabled={saving || text === (caption || '')} onClick={save}>{saving?'Ukládám…':'Uložit popis přílohy'}</button>
        {message && <span role="status">{message}</span>}
    </div>;
}
