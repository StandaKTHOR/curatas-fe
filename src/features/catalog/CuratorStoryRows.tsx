import {useEffect,useState,type MutableRefObject} from 'react';
import type {ItemEditSession} from '../../lib/editSession';
import type {CuratorStory} from '../scoped/scopedApi';
import {originalSession} from './originalAdapter';

export default function CuratorStoryRows({itemId,session,readOnly,drafts,onSaved,onSettled}:{
    itemId:number; session?:ItemEditSession; readOnly:boolean;
    drafts?:MutableRefObject<Record<string,any>>; onSaved?:()=>Promise<void>|void; onSettled:()=>void;
}) {
    const {api,signal}=originalSession(),etag=session?.etag;
    const [page,setPage]=useState<{items:CuratorStory[];etag:string}>();
    const saved=drafts?.current.storyCorrection;
    const [draft,setDraft]=useState<CuratorStory|null>(saved?.itemId===itemId&&saved.scopeSignal===signal&&saved.dirty?saved.value:null);
    const [busy,setBusy]=useState(false);
    const [error,setError]=useState('');
    useEffect(()=>{
        if(!etag)return;
        const cancel=new AbortController(),request=AbortSignal.any([signal,cancel.signal]);
        setPage(undefined);
        void api.curatorStories(itemId,request).then(result=>{
            if(request.aborted)return;
            if(result.etag!==etag)throw new Error('Historie se mezitím změnila. Obnovte kartu.');
            setPage(result);
        }).catch(error=>{if(!request.aborted)setError(error.message);});
        return ()=>cancel.abort();
    },[itemId,signal,etag]);
    function change(next:CuratorStory,dirty:boolean) {
        setDraft(next);
        if(drafts)drafts.current.storyCorrection={itemId,scopeSignal:signal,dirty,value:next};
        onSettled();
    }
    function clear() {setDraft(null);if(drafts)delete drafts.current.storyCorrection;onSettled();}
    async function save(row:CuratorStory) {
        if(readOnly||busy||!session||session.busy||!page||page.etag!==session.etag||!draft)return;
        const {key,...candidate}=draft;
        const values=Object.fromEntries(Object.entries(candidate).filter(([field,value])=>value!==row[field as keyof CuratorStory]));
        if(!Object.keys(values).length){clear();return;}
        setBusy(true);session.busy=true;setError('');
        try {
            const receipt=await api.curatorStories(itemId,signal,{key,etag:session.etag,values});
            if(signal.aborted)return;
            if(receipt.items.length!==1||receipt.items[0].key!==key)throw new Error('Zápis příběhu nebyl potvrzen.');
            session.etag=receipt.etag;
            if('scopedCurrent' in session)(session.scopedCurrent as {etag:string}).etag=receipt.etag;
            clear();
            await onSaved?.();
        }catch(error){if(!signal.aborted)setError((error as Error).message);}
        finally{session.busy=false;if(!signal.aborted){setBusy(false);onSettled();}}
    }
    return <>
        {error&&<tr><td colSpan={4}><p role="alert">{error}</p></td></tr>}
        {!page&&!error&&<tr><td colSpan={4}><p role="status">Načítám evidované příběhy…</p></td></tr>}
        {page?.items.map(row=><tr key={row.key}>
            <td>Příběh nebo historická souvislost</td>
            <td>{row.date??'—'}{row.year!=null&&<> · {row.year}</>}</td>
            <td>{[row.location,row.person].filter(v=>v!==null).join(' · ')}
                <p className="whitespace-pre-wrap">{row.text??'—'}</p></td>
            <td>{!readOnly&&<button type="button" disabled={busy||!!draft} onClick={()=>change(row,false)}>Upravit evidovaný příběh</button>}
            {!readOnly&&draft?.key===row.key&&<fieldset disabled={busy}><legend>Upravit příběh</legend>
                <label>Kdy<input aria-label="Kdy se příběh odehrál" value={draft.date??''} maxLength={255} onChange={e=>change({...draft,date:e.target.value},true)}/></label>
                <label>Kde<input aria-label="Kde se příběh odehrál" value={draft.location??''} maxLength={255} onChange={e=>change({...draft,location:e.target.value},true)}/></label>
                <label>Kdo<input aria-label="Osoba v příběhu" value={draft.person??''} maxLength={255} onChange={e=>change({...draft,person:e.target.value},true)}/></label>
                <label>Chronologický rok<input type="number" min={-2147483648} max={2147483647} aria-label="Chronologický rok příběhu" value={draft.year??''}
                    onChange={e=>change({...draft,year:e.target.value===''?null:e.target.valueAsNumber},true)}/></label>
                <label>Příběh<textarea aria-label="Text evidovaného příběhu" value={draft.text??''} maxLength={8192} onChange={e=>change({...draft,text:e.target.value},true)}/></label>
                <button type="button" onClick={()=>void save(row)}>Uložit příběh</button><button type="button" onClick={clear}>Zrušit</button>
            </fieldset>}</td>
        </tr>)}
    </>;
}
