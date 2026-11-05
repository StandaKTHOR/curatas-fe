import { useState,useRef } from 'react';
import { patchAttachment } from '../lib/api';

export default function AttachmentCaptionEditor({itemId, attachmentId, caption, onSaved,saveCaption,disabled=false}: {
    itemId: number; attachmentId: number|string; caption?: string | null; onSaved: () => Promise<void>;saveCaption?:(caption:string)=>Promise<void>;disabled?:boolean;
}) {
    const [text,setText]=useState(caption || '');
    const [saving,setSaving]=useState(false);
    const [message,setMessage]=useState('');
    const pending=useRef(false);
    const save=async()=>{
        if(disabled||pending.current)return;pending.current=true;
        setSaving(true);setMessage('');
        try {if(saveCaption)await saveCaption(text);else await patchAttachment(itemId,Number(attachmentId),{caption:text});await onSaved();setMessage('Popis přílohy uložen.');}
        catch(e){setMessage((e as Error).message);}finally{pending.current=false;setSaving(false);}
    };
    return <div data-scoped-media className="flex flex-wrap items-center gap-2">
        <input disabled={disabled||saving} aria-label={`Popis přílohy ${attachmentId}`} maxLength={1000} value={text} onChange={e=>setText(e.target.value)}/>
        <button type="button" disabled={disabled||saving || text === (caption || '')} onClick={save}>{saving?'Ukládám…':'Uložit popis přílohy'}</button>
        {message && <span role="status">{message}</span>}
    </div>;
}
