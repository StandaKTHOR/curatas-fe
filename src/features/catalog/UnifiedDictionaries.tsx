import AuthorityRelatedItems from './AuthorityRelatedItems';
import LocalityCardForm from './LocalityCardForm';
import DictionaryProfessionalFields,{professionalDictionaryLabels} from './DictionaryProfessionalFields';
import {useEffect,useMemo,useRef,useState} from 'react';
import {useCatalog} from './CatalogContext';
import {useAuth} from '../../components/AuthContext';
import {scopedApi,type UnifiedDictionaryEntry,type ManagedDictionaryType} from '../scoped/scopedApi';
import {dictionaryLabel} from './dictionaryLabel';
import {dictionaryField} from './CardDictionaryChoice';
import AddDictionaryModal from '../../components/AddDictionaryModal';
import DictionaryParentPicker from './DictionaryParentPicker';
import DictionaryValueDetail from './DictionaryValueDetail';

/** One catalog list; immutable assignment bindings are never edited by this screen. */
export default function UnifiedDictionaries({initialType,initialValue,onOpenValue,returnTo}:{initialType?:string;initialValue?:string;onOpenValue?:(id:string|null,type:string)=>void;returnTo?:string}){
 const {selectedCatalog}=useCatalog(),{token}=useAuth();
 if(!selectedCatalog||!token||!selectedCatalog.capabilities?.includes('dictionary.read'))return null;
 return <CatalogDictionary key={selectedCatalog.id+':'+token+':'+(initialType??'MATERIAL')} catalog={selectedCatalog.id} token={token} canReadItems={selectedCatalog.capabilities.includes('item.read')} initialType={initialType} initialValue={initialValue} onOpenValue={onOpenValue} returnTo={returnTo}/>;
}
function CatalogDictionary({catalog,token,initialType,initialValue,onOpenValue,returnTo,canReadItems}:{catalog:number;token:string;initialType?:string;initialValue?:string;onOpenValue?:(id:string|null,type:string)=>void;returnTo?:string;canReadItems:boolean}){
 const api=useMemo(()=>scopedApi(catalog,token),[catalog,token]);
 const [kinds,setKinds]=useState<{type:string;name:string;create:boolean;update:boolean;state?:string}[]>([]),[type,setType]=useState(initialType??'MATERIAL'),[q,setQ]=useState(''),[rows,setRows]=useState<UnifiedDictionaryEntry[]>([]),[next,setNext]=useState<string|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[revision,setRevision]=useState(0),[localityCard,setLocalityCard]=useState<boolean|null>(null),[modal,setModal]=useState(false),[editing,setEditing]=useState(false),[detail,setDetail]=useState<UnifiedDictionaryEntry|null>(null),[professionalEdit,setProfessionalEdit]=useState(false),[detailKey,setDetailKey]=useState(initialValue?(initialValue.includes(':')?initialValue:'c:'+initialValue):null);
 const [counts,setCounts]=useState<{total:number;matched:number}|null>(null);
 const latest=useRef({type,q,revision});latest.current={type,q,revision};
 const controller=useMemo(()=>new AbortController(),[api]);useEffect(()=>()=>controller.abort(),[controller]);
 useEffect(()=>{void api.unifiedKinds(controller.signal).then(setKinds).catch(e=>{if(!controller.signal.aborted)setError((e as Error).message);});},[api,controller]);
 useEffect(()=>{const c=new AbortController(),signal=AbortSignal.any([c.signal,controller.signal]);setRows([]);setNext(null);setCounts(null);setBusy(true);setError('');const timer=setTimeout(()=>void api.unifiedValues(type,signal,q).then(p=>{if(!signal.aborted){setRows(p.items);setNext(p.nextAfterId);if(p.totalCount!==undefined&&p.matchCount!==undefined)setCounts({total:p.totalCount,matched:p.matchCount});}}).catch(e=>{if(!signal.aborted)setError((e as Error).message);}).finally(()=>{if(!signal.aborted)setBusy(false);}),200);return()=>{clearTimeout(timer);c.abort();};},[api,controller,type,q,revision]);
 useEffect(()=>{const c=new AbortController(),signal=AbortSignal.any([c.signal,controller.signal]);setDetail(null);setEditing(false);setProfessionalEdit(false);if(detailKey)void api.unifiedValue(type,detailKey,signal).then(v=>{if(!signal.aborted)setDetail(v);}).catch(e=>{if(!signal.aborted)setError((e as Error).message);});return()=>c.abort();},[api,controller,type,detailKey,revision]);
 useEffect(()=>{const c=new AbortController(),signal=AbortSignal.any([c.signal,controller.signal]);setLocalityCard(type==='LOCALITY'?null:false);if(type==='LOCALITY')void api.localityCapabilities(signal).then(v=>{if(!signal.aborted)setLocalityCard(v.enabled);}).catch(e=>{if(signal.aborted)return;if((e as {status?:number}).status===404)setLocalityCard(false);else setError('Možnost úpravy úplné karty lokality se nepodařilo ověřit.');});return()=>c.abort();},[api,controller,type]);
 useEffect(()=>{if(!editing&&!modal&&!professionalEdit)return;const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[editing,modal,professionalEdit]);
 const open=(key:string|null)=>{if(key?.startsWith('p:')){location.href=(type==='DIRECTORY'?'/admin/parties':'/admin/literature')+'?catalog='+catalog+'&entry='+Number(key.slice(2));return;}setDetailKey(key);onOpenValue?.(key,type);};
 const back=()=>{if((editing||modal||professionalEdit)&&!window.confirm('Opustit neuloženou úpravu položky?'))return;setEditing(false);setModal(false);open(null);};
 async function more(){
  if(!next||busy)return;
  const own=controller.signal, current=()=>!own.aborted&&latest.current.type===type&&latest.current.q===q&&latest.current.revision===revision;
  setBusy(true);setError('');
  try{
   const page=await api.unifiedValues(type,own,q,next);
   if(!current())return;
   if(page.items.some(item=>rows.some(prior=>prior.key===item.key))||counts&&(page.totalCount!==counts.total||page.matchCount!==counts.matched)){
    setRevision(value=>value+1);
    return;
   }
   setRows(value=>[...value,...page.items]);setNext(page.nextAfterId);
  }catch(e){
   if(current()){if((e as {status?:number}).status===409)setRevision(value=>value+1);else setError((e as Error).message);}
  }finally{if(current())setBusy(false);}
 }
 const registryPath=type==='DIRECTORY'?'/admin/parties':'/admin/literature';
 const registryType=type==='DIRECTORY'||type==='LITERATURE';
 const name=kinds.find(k=>k.type===type)?.name??'Číselník';
 const create=modal&&(type==='LOCALITY'&&localityCard?<LocalityCardForm api={api} signal={controller.signal} writable={kinds.find(k=>k.type===type)?.create===true} onCancel={()=>setModal(false)} onSaved={id=>{setModal(false);setRevision(v=>v+1);open('c:'+id);}}/>:<AddDictionaryModal isOpen dictionaryType={type} dictionaryTitle={name} submitLabel="Založit položku" renderParentPicker={(value,onChange)=><DictionaryParentPicker api={api} type={type as ManagedDictionaryType} signal={controller.signal} value={value} onChange={onChange}/>} onSuccess={()=>{}} onClose={()=>setModal(false)} onCreate={async input=>{const saved=await api.saveDictionary(type as ManagedDictionaryType,{label:input.label,code:input.code,parentId:input.parentId,reason:'Výslovné založení číselníkové položky'},controller.signal);const verified=await api.unifiedValue(type,'c:'+saved.value.id,controller.signal);if(verified.label!==saved.value.label||verified.version!==saved.value.version)throw new Error('Následné načtení nepotvrdilo zápis');setModal(false);setRevision(v=>v+1);open(verified.key);}}/>);
 const detailedEditor=detail&&((editing&&detail.key.startsWith('s:'))||professionalEdit)
   &&<EntryEditor key={detail.key+detail.version} type={type} value={detail} onCancel={()=>{setEditing(false);setProfessionalEdit(false);}}
       onSave={async(label,code,reason,fields)=>{
          const saved=await api.saveUnifiedValue(type,detail.key,{label,code,reason,fields},'"'+detail.version+'"',controller.signal);
          const loaded=await api.unifiedValue(type,detail.key,controller.signal);
          if(loaded.version!==saved.version||loaded.label!==saved.label||loaded.code!==saved.code
            ||Object.keys(fields??{}).some(key=>loaded.fields?.[key]!==fields?.[key]))
            throw new Error('Následné načtení nepotvrdilo zápis');
          setEditing(false);setProfessionalEdit(false);setRevision(value=>value+1);
       }}/>;
 const currentEditor=detail&&editing&&detail.key.startsWith('c:')?(type==='LOCALITY'&&localityCard?<LocalityCardForm api={api} signal={controller.signal} id={detail.key.slice(2)} writable={detail.writable} onCancel={()=>setEditing(false)} onSaved={()=>{setEditing(false);setRevision(v=>v+1);}}/>:<AddDictionaryModal isOpen editing dictionaryType={type} dictionaryTitle={name} submitLabel="Uložit položku" initialValue={{label:detail.label??'',code:detail.code,parentId:detail.parentKey?.slice(2)??null}} renderParentPicker={(value,onChange)=><DictionaryParentPicker api={api} type={type as ManagedDictionaryType} signal={controller.signal} value={value} exclude={detail.key.slice(2)} onChange={onChange}/>} onSuccess={()=>{}} onClose={()=>setEditing(false)} onCreate={async input=>{const saved=await api.saveDictionary(type as ManagedDictionaryType,{label:input.label,code:input.code,parentId:input.parentId,reason:'Výslovná úprava číselníkové položky'},controller.signal,detail.key.slice(2),'"'+detail.version+'"');const verified=await api.dictionaryValue(type as ManagedDictionaryType,detail.key.slice(2),controller.signal);if(saved.etag!==verified.etag||saved.value.parentId!==verified.value.parentId)throw new Error('Následné načtení nepotvrdilo zápis');setEditing(false);setRevision(v=>v+1);}}/>):null;
 if(type==='LOCALITY'&&localityCard&&(modal||currentEditor))return <section className="demus-section" aria-label="Číselníky">{create}{currentEditor}</section>;
 return <section className="demus-section" aria-label="Číselníky"><h2>Odborné číselníky</h2>{returnTo&&<a href={returnTo}>Zpět na sbírkový předmět</a>}{error&&<p role="alert">{error}</p>}{detailKey?<><button type="button" className="demus-save" onClick={back}>Zpět na přehled číselníku</button>{detail?.key.startsWith('p:')?<><h3>{dictionaryLabel(detail)}</h3><DictionaryProfessionalFields type={type} fields={detail.fields}/><a href={registryPath+'?catalog='+catalog+'&entry='+Number(detail.key.slice(2))}>Otevřít odborný detail</a></>:detail?.key.startsWith('c:')?<><DictionaryValueDetail key={detail.key+detail.version} api={api} type={type as ManagedDictionaryType} localityCard={localityCard===true} id={detail.key.slice(2)} signal={controller.signal} onBack={back} onOpen={id=>open('c:'+id)} onEdit={()=>setEditing(true)} writable={detail.writable&&!(type==='LOCALITY'&&localityCard===null)} canReadItems={canReadItems} catalogId={catalog}/><DictionaryProfessionalFields type={type} fields={detail.fields}/>{!!detail.editableFields?.length&&!editing&&!professionalEdit&&<button type="button" className="demus-save" onClick={()=>setProfessionalEdit(true)}>Upravit odborné údaje</button>}</>:detail&&<><h3>{dictionaryLabel(detail)}</h3><dl><dt>Název</dt><dd>{detail.label??detail.code??'Bez textového označení'}</dd><dt>Kód</dt><dd>{detail.code??'—'}</dd>{detail.groupingCode&&<><dt>Zařazení</dt><dd>{detail.groupingCode}</dd></>}</dl><RecordedNames value={detail}/><DictionaryProfessionalFields type={type} fields={detail.fields}/>{detail.relatedItems&&(type==='AUTHOR'||type==='LOCALITY')&&<AuthorityRelatedItems api={api} type={type} id={detail.key} catalog={catalog} readable={canReadItems}/>}<button type="button" className="demus-save" disabled={!detail.writable} onClick={()=>setEditing(true)}>Upravit tuto položku</button>{!detail.writable&&<p>Zápis pro tento účet nebo typ položky není povolen.</p>}</>}{detailedEditor}</>:<><label>Typ číselníku<select aria-label="Typ číselníku" disabled={!!modal||!kinds.length} value={type} onChange={e=>{setType(e.target.value);setQ('');setRows([]);setDetailKey(null);onOpenValue?.(null,e.target.value);}}>{kinds.map(k=><option key={k.type} value={k.type}>{k.type==='LITERATURE'?'Literatura / Publikace':k.name}</option>)}</select></label><label>Hledat položku<input aria-label="Hledat v číselníku" maxLength={100} value={q} onChange={e=>setQ(e.target.value)}/></label><button type="button" className="demus-save" disabled={busy||!kinds.find(k=>k.type===type)?.create||type==='LOCALITY'&&localityCard===null} onClick={()=>{if(registryType)location.href=registryPath+'?catalog='+catalog+'&new=true';else setModal(true);}}>{type==='LOCALITY'?'Nová lokalita':'Nová položka'}</button>{kinds.find(k=>k.type===type)?.state&&kinds.find(k=>k.type===type)?.state!=='AVAILABLE'&&<p role="status">Úplnost nabídky vyžaduje ověření podkladů. Dostupné položky lze prohlížet.</p>}{!busy&&!kinds.find(k=>k.type===type)?.create&&<p>Založení položky pro tento účet nebo typ není povoleno.</p>}{type==='ISO_STATE'&&<p role="status">BLOCKED: Zápis a přiřazení stavu ISO vyžadují schválený odborný kontrakt.</p>}{busy&&<p role="status">Načítání číselníku…</p>}{!busy&&counts&&<p aria-live="polite">Celkem {counts.total.toLocaleString('cs-CZ')} položek · Výsledky hledání {counts.matched.toLocaleString('cs-CZ')} · Zobrazeno {rows.length.toLocaleString('cs-CZ')}{next?' · jsou k dispozici další položky':''}</p>}{!busy&&!error&&!rows.length&&<p>Žádné dostupné položky{q?' neodpovídají hledání':''}.</p>}<table className="demus-datasheet"><thead><tr><th>Název</th><th>Kód</th><th>Zařazení</th><th>Akce</th></tr></thead><tbody>{rows.map(v=><tr key={v.key}><td>{v.label??v.code??'Bez textového označení'}</td><td>{v.code??'—'}</td><td>{v.groupingCode??'—'}</td><td><button type="button" className="demus-save" aria-label={'Detail '+dictionaryLabel(v)} onClick={()=>open(v.key)}>Detail</button></td></tr>)}</tbody></table>{next&&<button type="button" disabled={busy} onClick={()=>void more()}>Další položky číselníku</button>}</>}{create}{currentEditor}</section>;
}
const multilineField=/^(Medailon_|PlusT_|Pozn_|Anotace_)/;
function EntryEditor({type,value,onCancel,onSave}:{type:string;value:UnifiedDictionaryEntry;onCancel:()=>void;
 onSave:(label:string,code:string|null,reason:string,fields?:Record<string,string|null>)=>Promise<void>}){
 const [label,setLabel]=useState(value.label??value.code??''),[code,setCode]=useState(value.code??''),[reason,setReason]=useState('');
 const [fields,setFields]=useState<Record<string,string|null>>({}),[busy,setBusy]=useState(false),[error,setError]=useState('');
 return <form aria-label="Upravit položku" onSubmit={e=>{
  e.preventDefault();if(busy)return;setBusy(true);setError('');
  void onSave(label,code||null,reason,Object.keys(fields).length?fields:undefined).catch(error=>setError(error.message)).finally(()=>setBusy(false));
 }}><fieldset disabled={busy}><legend>Úprava položky</legend>
 <label>{type==='AUTHOR'?'Jméno':type==='LITERATURE'?'Titul publikace':'Název'}<input aria-label="Název položky" required maxLength={255} value={label} onChange={e=>setLabel(e.target.value)}/></label>
 <label>Kód<input aria-label="Kód položky" maxLength={255} value={code} onChange={e=>setCode(e.target.value)}/></label>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{value.editableFields?.map(key=>{
   const caption=professionalDictionaryLabels[type]?.[key];
   if(!caption)return null;
   const current=Object.hasOwn(fields,key)?fields[key]??'':dictionaryField(value,key)??'';
   const change=(text:string)=>setFields(previous=>({...previous,[key]:text||null}));
   return <label key={key} className="space-y-1">{caption}{multilineField.test(key)
     ?<textarea aria-label={caption} rows={2} maxLength={4096} value={current} onChange={e=>change(e.target.value)}/>
     :<input aria-label={caption} maxLength={255} value={current} onChange={e=>change(e.target.value)}/>}</label>;
 })}</div>
 <label>Důvod úpravy<input aria-label="Důvod úpravy" required maxLength={1000} value={reason} onChange={e=>setReason(e.target.value)}/></label>
 {error&&<p role="alert">{error}</p>}<button type="submit" className="demus-save">Uložit položku</button><button type="button" onClick={onCancel}>Zrušit</button></fieldset></form>;
}

function RecordedNames({value}:{value:UnifiedDictionaryEntry}){const names=[...new Set([value.binding?.label,value.binding?.code])].filter((v):v is string=>typeof v==='string'&&!!v.trim()&&v!==value.label&&v!==value.code);return names.length?<div><p>Další evidovaná označení</p><ul aria-label="Další evidovaná označení">{names.map(name=><li key={name}>{name}</li>)}</ul></div>:null;}
