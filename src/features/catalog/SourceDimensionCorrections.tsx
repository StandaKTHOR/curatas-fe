import {useEffect, useState, type MutableRefObject} from 'react';
import type {ItemEditSession} from '../../lib/editSession';
import {originalSession} from './originalAdapter';
import {dictionaryField, useDictionaryPage} from './CardDictionaryChoice';
import {type SourceDimension, type SourceDimensionCorrection, type CuratorMeasure} from '../scoped/scopedApi';

type Values = {type:string; value:string; unit:string};
type Draft = {itemId:number; scopeSignal:AbortSignal; dirty:boolean; recordId:string; values:Values};
type Props = {itemId:number; session?:ItemEditSession; writable:boolean;
    completion?:boolean;drafts:MutableRefObject<Record<string,any>>; onSaved:()=>Promise<void>|void};
export default function SourceDimensionCorrections({itemId,session,writable,drafts,onSaved,completion=false}:Props) {
    const {api,signal} = originalSession();
    const etag = session?.etag;
    const [page,setPage] = useState<{etag:string; rows:SourceDimension[]; corrections:SourceDimensionCorrection[]; owned:CuratorMeasure[]; next:number|null}>();
    const [error,setError] = useState('');
    const [saving,setSaving] = useState(false);
    const saved = drafts.current.sourceDimension as Draft | undefined;
    const retained = saved?.itemId===itemId && saved.scopeSignal===signal && saved.dirty ? saved : null;
    const [form,setForm] = useState<Draft|null>(retained);
    const options = useDictionaryPage('DIMENSION',writable&&!!form)?.items ?? [];

    useEffect(()=>{
        if(!etag)return;
        const cancel=new AbortController();
        const request=AbortSignal.any([cancel.signal,signal]);
        setPage(undefined);
        setError('');
        Promise.all([api.sourceDimensions(itemId,request),api.sourceDimensionCorrections(itemId,request),
            completion?api.curatorMeasures(itemId,request):null]).then(([source,corrections,owned])=>{
            if(request.aborted)return;
            if(source.etag!==etag||corrections.etag!==etag||owned&&owned.etag!==etag)throw new Error('Míry se změnily. Obnovte kartu předmětu.');
            setPage({etag,rows:source.value.items,corrections:corrections.items,owned:owned?.items??[],next:source.value.nextOffset});
        }).catch(error=>{if(!request.aborted)setError(error.message);});
        return ()=>cancel.abort();
    },[itemId,signal,etag,completion]);

    function edit(recordId:string,values:Values) {
        const draft={itemId,scopeSignal:signal,dirty:false,recordId,values};
        drafts.current.sourceDimension=draft;
        setForm(draft);
    }
    function update(key:keyof Values,value:string) {
        if(!form)return;
        const draft={...form,dirty:true,values:{...form.values,[key]:value}};
        drafts.current.sourceDimension=draft;
        setForm(draft);
    }
    function chooseNewType(key:string) {
        if(!form)return;
        const option=options.find(row=>row.key===key);
        const draft={...form,dirty:true,values:{...form.values,type:key,unit:form.values.unit||(option?dictionaryField(option,'Jedn_RZ')??'':'')}};
        drafts.current.sourceDimension=draft;setForm(draft);
    }
    function clear() { delete drafts.current.sourceDimension; setForm(null); }
    async function commit(recordId:string,prior:Values) {
        if(!form||!session||!writable||saving||!page||page.etag!==session.etag||session.busy)return;
        const values:Partial<Values>={};
        for (const key of ['value','unit','type'] as const) {
            if(form.values[key]!==prior[key])values[key]=key==='value'?form.values[key].replace(',','.'):form.values[key];
        }
        if(!Object.keys(values).length){clear();return;}
        setSaving(true);session.busy=true;setError('');
        try {
            const own=page.owned.some(row=>row.id===recordId);
            const changes={...values,...((own||completion)&&values.value===''?{value:null}:{})};
            const response=own
                ?await api.curatorMeasures(itemId,signal,{id:recordId,etag:session.etag,values:changes})
                :await api.sourceDimensionCorrections(itemId,signal,{recordId,etag:session.etag,values:changes});
            if(signal.aborted)return;
            session.etag=response.etag;
            if('scopedCurrent' in session)(session.scopedCurrent as {etag:string}).etag=response.etag;

            clear();
            await onSaved();
        }catch(error){if(!signal.aborted)setError((error as Error).message);}
        finally{session.busy=false;if(!signal.aborted)setSaving(false);}
    }
    async function more() {
        if(!page||page.next===null||saving)return;
        setSaving(true);
        try {
            const source=await api.sourceDimensions(itemId,signal,page.next);
            if(signal.aborted)return;
            if(source.etag!==page.etag)throw new Error('Míry se změnily. Obnovte kartu předmětu.');
            setPage({...page,rows:[...page.rows,...source.value.items],next:source.value.nextOffset});
        }catch(error){if(!signal.aborted)setError((error as Error).message);}
        finally{if(!signal.aborted)setSaving(false);}
    }
    async function create() {
        if(!form?.values.type||!page||!session||!writable||saving||session.busy||page.etag!==session.etag)return;
        setSaving(true);session.busy=true;setError('');
        try {
            const {type,value,unit}=form.values;
            const saved=await api.createCuratorMeasure(itemId,session.etag,{typeKey:type,value:value.replace(',','.')||null,unit:unit||null},signal);
            const confirmed=await api.curatorMeasures(itemId,signal);
            if(signal.aborted)return;
            if(confirmed.etag!==saved.etag||saved.items.length!==1||!confirmed.items.some(row=>row.id===saved.items[0].id))
                throw new Error('Míra nebyla potvrzena opětovným načtením.');
            session.etag=saved.etag;
            if('scopedCurrent' in session)(session.scopedCurrent as {etag:string}).etag=saved.etag;
            clear();await onSaved();
        }catch(error){if(!signal.aborted)setError((error as Error).message);}
        finally{session.busy=false;if(!signal.aborted)setSaving(false);}
    }
    const rows=page?[...page.rows.map(row=>{
        const current=page.corrections.find(value=>value.recordId===row.recordId);
        return {id:row.recordId,order:row.sourceOrder,
            type:current?.type??row.type,value:current?.valueCleared?null:current?.value??row.number.value,unit:current?.unit??row.unit};
    }),...page.owned]:[];
    return <section className="demus-section" aria-label="Evidované míry" data-scoped-reference-editor>
        <h3>Evidované míry</h3>
        {completion&&writable&&page&&<button type="button" className="demus-save" disabled={saving||!!form}
            onClick={()=>edit('new',{type:'',value:'',unit:''})}>Přidat rozměr</button>}
        {completion&&writable&&form?.recordId==='new'&&<fieldset disabled={saving}>
            <legend>Nový rozměr</legend>
            <label>Typ rozměru<select aria-label="Typ nového rozměru" value={form.values.type} onChange={e=>chooseNewType(e.target.value)}>
                <option value="">Vyberte typ</option>
                {options.filter(row=>row.key.startsWith('s:')&&row.code).map(row=><option key={row.key} value={row.key}>
                    {[row.code,row.label,dictionaryField(row,'Jedn_RZ')].filter(Boolean).join(' — ')}
                </option>)}
            </select></label>
            <label>Míra<input aria-label="Hodnota nového rozměru" inputMode="decimal" maxLength={1000} value={form.values.value}
                onChange={e=>update('value',e.target.value)}/></label>
            <label>Jednotka<input aria-label="Jednotka nového rozměru" maxLength={255} value={form.values.unit}
                onChange={e=>update('unit',e.target.value)}/></label>
            <button type="button" disabled={!form.values.type} onClick={()=>void create()}>Uložit nový rozměr</button>
            <button type="button" onClick={clear}>Zrušit</button>
        </fieldset>}
        {error&&<p role="alert">{error}</p>}
        {!page&&!error&&<p role="status">Načítám evidované míry…</p>}
        {page&&rows.length===0&&<p>Pro předmět nejsou k dispozici žádné evidované míry.</p>}
        {page&&rows.length>0&&<div className="table-responsive"><table className="demus-datasheet">
            <thead><tr><th>Pořadí</th><th>Rozměr</th><th>Míra</th><th>Jednotka</th>{writable&&<th>Akce</th>}</tr></thead>
            <tbody>{rows.map(row=>{
                const values={type:row.type??'',value:row.value??'',unit:row.unit??''};
                const inputLabel=row.order==null?'':' '+row.order;
                return <tr key={row.id}>
                    <td>{row.order??'—'}</td>
                    {writable&&form?.recordId===row.id?<>
                        <td><select aria-label={'Evidovaný typ rozměru'+inputLabel} value={form.values.type} disabled={saving}
                            onChange={e=>update('type',e.target.value)}>
                            {!options.some(value=>value.code===form.values.type)&&<option value={form.values.type}>{form.values.type||'—'}</option>}
                            {options.filter(value=>value.code).map(value=><option key={value.key} value={value.code!}>
                                {[value.code,value.label,dictionaryField(value,'Jedn_RZ')].filter(Boolean).join(' — ')}
                            </option>)}
                        </select></td>
                        <td><input aria-label={'Evidovaná míra'+inputLabel} inputMode="decimal" maxLength={page.owned.some(value=>value.id===row.id)?1000:100} value={form.values.value} disabled={saving}
                            onChange={e=>update('value',e.target.value)}/></td>
                        <td><input aria-label={'Evidovaná jednotka'+inputLabel} maxLength={255} value={form.values.unit} disabled={saving}
                            onChange={e=>update('unit',e.target.value)}/></td>
                        <td><button type="button" disabled={saving||!form.dirty} onClick={()=>void commit(row.id,values)}>Uložit míru</button>
                            <button type="button" disabled={saving} onClick={clear}>Zrušit</button></td>
                    </>:<>
                        <td>{values.type||'—'}</td><td>{values.value||'—'}</td><td>{values.unit||'—'}</td>
                        {writable&&<td><button type="button" disabled={saving||!!form} aria-label={'Upravit míru'+inputLabel} onClick={()=>edit(row.id,values)}>Upravit míru</button></td>}
                    </>}
                </tr>;
            })}</tbody>
        </table></div>}
        {page?.next!=null&&<button type="button" disabled={saving} onClick={()=>void more()}>Další evidované míry</button>}
    </section>;
}
