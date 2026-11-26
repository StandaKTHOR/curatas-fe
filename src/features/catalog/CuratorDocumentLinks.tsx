import {useEffect,useState,type MutableRefObject} from 'react';
import {originalSession} from './originalAdapter';
import {dictionaryLabel} from './dictionaryLabel';
import {useDictionaryPage} from './CardDictionaryChoice';
import type {CuratorDocument} from '../scoped/scopedApi';
import type {ItemEditSession} from '../../lib/editSession';
import type {DocumentationFile} from './DocumentationFiles';
import PhotoPreview from '../../components/PhotoPreview';

type Draft={itemId:number;signal:AbortSignal;document:number;typeKey:string|null;mediaId:string|null;dirty:boolean};
export default function CuratorDocumentLinks({itemId,session,files,readOnly,drafts,onSaved}:{
    itemId:number;session?:ItemEditSession;files:DocumentationFile[];readOnly:boolean;
    drafts:MutableRefObject<Record<string,any>>;onSaved:()=>void|Promise<void>;
}) {
    const {api,signal}=originalSession(),etag=session?.etag;
    const retained=drafts.current.documentBinding as Draft|undefined;
    const [draft,setDraft]=useState<Draft|null>(retained?.itemId===itemId&&retained.signal===signal?retained:null);
    const [documents,setDocuments]=useState<{id:number;caption:string}[]>([]);
    const [links,setLinks]=useState<CuratorDocument[]>([]);
    const [loaded,setLoaded]=useState<string>();
    const [error,setError]=useState('');
    const [busy,setBusy]=useState(false);
    const [query,setQuery]=useState('');
    const choices=useDictionaryPage('DOCUMENT_TYPE',!!draft&&!readOnly,query)?.items??[];
    const active=links.find(link=>link.id===draft?.document);
    const exactFiles=files.filter(file=>!file.id.startsWith('legacy:'));
    useEffect(()=>{
        if(!etag)return;
        const cancel=new AbortController(),request=AbortSignal.any([cancel.signal,signal]);
        setLoaded(undefined);
        void Promise.all([api.professionalRecords(itemId,request),api.curatorDocuments(itemId,request)]).then(([records,bound])=>{
            if(request.aborted)return;
            if(records.etag!==etag||bound.etag!==etag)throw new Error('Dokumentace byla mezitím změněna. Obnovte kartu.');
            const rows: {id:number;kind:string;payload?:Record<string,unknown>}[]=records.items;
            setDocuments(rows.filter(row=>row.kind==='DOCUMENTATION').map(row=>({
                id:row.id,caption:[row.payload?.CDok_DK,row.payload?.Dokument_DK,row.payload?.Pozn_DK]
                    .find(value=>typeof value==='string'&&value.trim()) as string||'Dokumentační záznam'
            })));
            setLinks(bound.items);setLoaded(etag);setError('');
        }).catch(error=>{if(!request.aborted)setError(error.message);});
        return ()=>cancel.abort();
    },[itemId,signal,etag]);
    function update(next:Draft|null) {
        setDraft(next);
        if(next?.dirty)drafts.current.documentBinding=next;
        else delete drafts.current.documentBinding;
    }
    async function save() {
        if(!draft?.dirty||readOnly||busy||!session||session.busy||loaded!==session.etag)return;
        setBusy(true);session.busy=true;setError('');
        try {
            const {document,typeKey,mediaId}=draft;
            const saved=await api.curatorDocuments(itemId,signal,{document,etag:session.etag,values:{typeKey,mediaId}});
            const verified=await api.curatorDocuments(itemId,signal);
            if(signal.aborted)return;
            const linked=verified.items.find(row=>row.id===document);
            if(saved.etag!==verified.etag||!linked||linked.typeKey!==typeKey||linked.mediaId!==mediaId)
                throw new Error('Opětovné načtení nepotvrdilo vazbu dokumentace.');
            session.etag=verified.etag;
            if('scopedCurrent' in session)(session.scopedCurrent as {etag:string}).etag=verified.etag;
            setLinks(verified.items);update(null);
            await onSaved();
        }catch(error){if(!signal.aborted)setError((error as Error).message);}
        finally{session.busy=false;if(!signal.aborted)setBusy(false);}
    }
    async function download(mediaId:string) {
        try {
            const file=exactFiles.find(value=>value.id===mediaId);
            if(file){await file.download();return;}
            const metadata=await api.mediaDetail(itemId,mediaId,signal);
            const bytes=await api.bytes(itemId,metadata,'content',signal);
            const url=URL.createObjectURL(bytes);
            const link=document.createElement('a');link.href=url;link.download=metadata.name;link.click();
            window.setTimeout(()=>URL.revokeObjectURL(url),1000);
        }catch(error){if(!signal.aborted)setError((error as Error).message);}
    }
    return <section aria-label="Vazby dokumentace" data-scoped-reference-editor>
        <h3>Typy a připojené soubory</h3>
        {error&&<p role="alert">{error}</p>}
        {!loaded&&!error&&<p role="status">Načítám vazby dokumentace…</p>}
        {loaded&&documents.length===0&&<p>Nejprve uložte odborný záznam dokumentace.</p>}
        {documents.map(row=>{
            const bound=links.find(link=>link.id===row.id);
            const file=exactFiles.find(file=>file.id===bound?.mediaId);
            return <div key={row.id}><strong>{row.caption}</strong> · {bound?.typeCaption??'Typ nezadán'}
                {bound?.mediaId&&<>
                    {file?.preview&&<PhotoPreview src="" alt={file.caption||file.name} load={file.preview}/>}
                    <button type="button" data-scoped-read onClick={()=>void download(bound.mediaId!)}>Stáhnout připojený soubor{file?' '+file.name:''}</button>
                </>}
                {!readOnly&&<button type="button" disabled={!!draft||busy||!loaded} onClick={()=>{
                    setQuery('');update({itemId,signal,document:row.id,typeKey:bound?.typeKey??null,mediaId:bound?.mediaId??null,dirty:false});
                }}>Upravit typ a soubor · {row.caption}</button>}
            </div>;
        })}
        {draft&&!readOnly&&<fieldset disabled={busy||!loaded}><legend>Přiřazení dokumentace</legend>
            <label>Hledat typ dokumentu<input aria-label="Hledat typ dokumentu" maxLength={100} value={query} onChange={e=>setQuery(e.target.value)}
                onKeyDown={e=>{if(e.key==='Enter')e.preventDefault();}}/></label>
            <label>Typ dokumentu<select aria-label="Typ dokumentu" value={draft.typeKey??''}
                onChange={e=>update({...draft,typeKey:e.target.value||null,dirty:true})}>
                <option value="">Bez přiřazení</option>
                {draft.typeKey&&!choices.some(choice=>choice.key===draft.typeKey)&&<option value={draft.typeKey}>{active?.typeCaption??'Vybraný typ'}</option>}
                {choices.map(choice=><option key={choice.key} value={choice.key}>{dictionaryLabel(choice)}</option>)}
            </select></label>
            <label>Existující soubor<select aria-label="Existující soubor" value={draft.mediaId??''}
                onChange={e=>update({...draft,mediaId:e.target.value||null,dirty:true})}>
                <option value="">Bez připojeného souboru</option>
                {draft.mediaId&&!exactFiles.some(file=>file.id===draft.mediaId)&&<option value={draft.mediaId}>Připojený soubor</option>}
                {exactFiles.map(file=><option key={file.id} value={file.id}>{file.name}</option>)}
            </select></label>
            <button type="button" disabled={!draft.dirty} onClick={()=>void save()}>Uložit vazbu dokumentace</button>
            <button type="button" onClick={()=>update(null)}>Zrušit</button>
        </fieldset>}
    </section>;
}
