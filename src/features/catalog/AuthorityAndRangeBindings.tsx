import {useEffect,useState} from 'react';
import {originalSession} from './originalAdapter';
import {originalCanEdit} from './originalEdit';
import {validateInventoryRange,type SourceChoice} from '../scoped/scopedApi';

const AUTHOR_ROLES=['Autor','Škola / dílna','Okruh','Následovník','Kopista','Falsifikátor','Připsáno','Rytec','Nakladatel / vydavatel','Jiná role'] as const;
const AUTHORITY_SPECS:[string,string,string][]= [
 ['fundRecordId','fund','Fond (zdrojový číselník Fondy)'],
 ['collectionRecordId','collection','Podsbírka (zdrojový číselník Podsbirky)'],
 ['groupRecordId','group','Skupina / GROUP (zdrojový číselník Skupiny)'],
 ['departmentRecordId','department','Oddělení (zdrojový číselník Oddeleni)'],
 ['objectTypeRecordId','object-type','Předmět / Název (zdrojový číselník Nazvy)'],
];
const EMPTY_RANGE:Record<string,string|null>={lowerNumber:null,upperNumber:null,seriesRecordId:null};
const EMPTY_AUTH:Record<string,string|null>={determinedByText:null,authorRoleText:null,groupRecordId:null,fundRecordId:null,collectionRecordId:null,departmentRecordId:null,objectTypeRecordId:null};

/** Scoped Priority 2 editor for inventory range/series and professional authority bindings.
 * Never merges person records or overwrites historical DEMUS source columns. */
export default function AuthorityAndRangeBindings({itemId,mode='all',readOnly=false,onSave}:{itemId:number;mode?:'all'|'range'|'authorities';readOnly?:boolean;onSave?:(etag:string)=>void}){
 const {api,signal}=originalSession();
 const canEditRange=!readOnly&&originalCanEdit('inventory');
 const canEditAuth=!readOnly&&originalCanEdit('professional');
 const showRange=mode==='all'||mode==='range';
 const showAuth=mode==='all'||mode==='authorities';

 const [etag,setEtag]=useState('');
 const [rangeBase,setRangeBase]=useState<Record<string,string|null>|null>(null);
 const [rangeDraft,setRangeDraft]=useState<Record<string,string|null>>(EMPTY_RANGE);
 const [rangePresent,setRangePresent]=useState(false);
 const [seriesChoices,setSeriesChoices]=useState<SourceChoice[]>([]);

 const [authBase,setAuthBase]=useState<Record<string,string|null>|null>(null);
 const [authDraft,setAuthDraft]=useState<Record<string,string|null>>(EMPTY_AUTH);
 const [authPresent,setAuthPresent]=useState(false);
 const [choicesByKind,setChoicesByKind]=useState<Record<string,SourceChoice[]>>({});

 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [status,setStatus]=useState('');
 const [revision,setRevision]=useState(0);

 useEffect(()=>{
  let alive=true;setError('');
  async function load(){
   try{
    if(showRange){
     const [r,s]=await Promise.all([api.curatorRecord(itemId,'inventory-range',signal),api.sourceChoices('series',signal).catch(()=>({items:[] as SourceChoice[],nextAfterId:null}))]);
     if(!alive||signal.aborted)return;
     setEtag(r.etag);setRangeBase(r.value);setRangeDraft({...r.value});setRangePresent(r.present);setSeriesChoices(s.items);
    }
    if(showAuth){
     const a=await api.curatorRecord(itemId,'authorities',signal);
     const entries=await Promise.all(AUTHORITY_SPECS.map(async([,kind])=>[kind,(await api.sourceChoices(kind,signal).catch(()=>({items:[] as SourceChoice[],nextAfterId:null}))).items] as const));
     if(!alive||signal.aborted)return;
     setEtag(a.etag);setAuthBase(a.value);setAuthDraft({...a.value});setAuthPresent(a.present);setChoicesByKind(Object.fromEntries(entries));
    }
   }catch(e){if(alive&&!signal.aborted)setError((e as Error).message);}
  }
  void load();
  return()=>{alive=false;};
 },[itemId,signal,showRange,showAuth,revision]);

 async function saveRange(){
  if(!canEditRange||busy||!rangeBase)return;
  setError('');setStatus('');
  const invalid=validateInventoryRange(rangeDraft);
  if(invalid){setError(invalid);return;}
  if(Object.keys(EMPTY_RANGE).every(k=>String(rangeDraft[k]??'')===String(rangeBase[k]??''))){setStatus('Rozsah inventárního čísla je beze změn.');return;}
  setBusy(true);
  try{
   await api.saveCuratorRecord(itemId,'inventory-range',etag,rangeDraft,signal);
   const fresh=await api.curatorRecord(itemId,'inventory-range',signal);
   setEtag(fresh.etag);setRangeBase(fresh.value);setRangeDraft({...fresh.value});setRangePresent(fresh.present);
   setStatus('Současný rozsah a inventární řada byly uloženy a znovu načteny.');
   onSave?.(fresh.etag);
  }catch(e){if(!signal.aborted)setError((e as Error).message);}
  finally{if(!signal.aborted)setBusy(false);}
 }

 async function saveAuthorities(){
  if(!canEditAuth||busy||!authBase)return;
  setError('');setStatus('');
  if(Object.keys(EMPTY_AUTH).every(k=>String(authDraft[k]??'')===String(authBase[k]??''))){setStatus('Odborné vazby a role jsou beze změn.');return;}
  for(const k of ['determinedByText','authorRoleText'] as const){
   const v=authDraft[k];
   if(v!==null&&v.length>255){setError('Textové pole může mít nejvýše 255 znaků.');return;}
  }
  setBusy(true);
  try{
   await api.saveCuratorRecord(itemId,'authorities',etag,authDraft,signal);
   const fresh=await api.curatorRecord(itemId,'authorities',signal);
   setEtag(fresh.etag);setAuthBase(fresh.value);setAuthDraft({...fresh.value});setAuthPresent(fresh.present);
   setStatus('Současné odborné vazby a role byly uloženy a znovu načteny.');
   onSave?.(fresh.etag);
  }catch(e){if(!signal.aborted)setError((e as Error).message);}
  finally{if(!signal.aborted)setBusy(false);}
 }

 return <section aria-label="Současné odborné vazby a rozsah inventárního čísla" data-scoped-reference-editor className="space-y-3 border border-gray-200 rounded p-3 bg-gray-50 text-xs">
  {error&&<p role="alert" className="text-red-700 font-bold">{error}</p>}
  {status&&<p role="status" className="text-green-800 font-bold">{status}</p>}
  {showRange&&<div className="space-y-2">
   <h4 className="font-bold text-gray-800">Současný strukturovaný rozsah a inventární řada ({rangePresent?'uloženo':'NULL'})</h4>
   <p className="text-gray-600">Současné kurátorské tvrzení je oddělené od historických složek DEMUS (Rada_S, PorC_S, HPorC_S).</p>
   <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
    <label className="block space-y-1">Dolní pořadové číslo (1–99999999)
     <input aria-label="Dolní pořadové číslo" type="text" disabled={!canEditRange||busy} value={rangeDraft.lowerNumber??''}
      onChange={e=>setRangeDraft(old=>({...old,lowerNumber:e.target.value===''?null:e.target.value}))} className="w-full bg-white border border-gray-300 rounded px-2 py-1"/>
    </label>
    <label className="block space-y-1">Horní pořadové číslo (Až — volitelné)
     <input aria-label="Horní pořadové číslo" type="text" disabled={!canEditRange||busy} value={rangeDraft.upperNumber??''}
      onChange={e=>setRangeDraft(old=>({...old,upperNumber:e.target.value===''?null:e.target.value}))} className="w-full bg-white border border-gray-300 rounded px-2 py-1"/>
    </label>
    <label className="block space-y-1">Inventární řada (číselník InvRady)
     <select aria-label="Inventární řada (číselník InvRady)" disabled={!canEditRange||busy} value={rangeDraft.seriesRecordId??''}
      onChange={e=>setRangeDraft(old=>({...old,seriesRecordId:e.target.value===''?null:e.target.value}))} className="w-full bg-white border border-gray-300 rounded px-2 py-1">
      <option value="">— bez současné vazby (NULL) —</option>
      {rangeDraft.seriesRecordId&&!seriesChoices.some(c=>c.recordId===rangeDraft.seriesRecordId)&&<option value={rangeDraft.seriesRecordId}>Uložená řada ({rangeDraft.seriesRecordId.slice(0,12)}…)</option>}
      {seriesChoices.map(c=><option key={c.recordId} value={c.recordId}>{c.code}{c.label?` — ${c.label}`:''}</option>)}
     </select>
    </label>
   </div>
   <div className="flex items-center gap-2">
    <button type="button" disabled={!canEditRange||busy||!rangeBase} onClick={()=>void saveRange()} className="px-3 py-1 bg-[#00204a] text-white font-semibold rounded disabled:opacity-50">Uložit rozsah a řadu</button>
    <button type="button" disabled={busy} onClick={()=>setRevision(v=>v+1)} className="px-2 py-1 border border-gray-300 bg-white rounded">Obnovit ze serveru</button>
   </div>
  </div>}
  {showAuth&&<div className="space-y-2 pt-2 border-t border-gray-200">
   <h4 className="font-bold text-gray-800">Současné odborné vazby a role ({authPresent?'uloženo':'NULL'})</h4>
   <p className="text-gray-600">Vazby odkazují na ověřené zdrojové záznamy katalogu. Jména osob (Určil, Autor) se nikdy automaticky neslučují a nepřepisují historický zdroj DEMUS.</p>
   <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
    <label className="block space-y-1">Určil (současné kurátorské tvrzení)
     <input aria-label="Určil (současné kurátorské tvrzení)" type="text" disabled={!canEditAuth||busy} value={authDraft.determinedByText??''}
      onChange={e=>setAuthDraft(old=>({...old,determinedByText:e.target.value===''&&old.determinedByText===null?null:e.target.value}))} className="w-full bg-white border border-gray-300 rounded px-2 py-1"/>
    </label>
    <label className="block space-y-1">Role autora (současné kurátorské tvrzení)
     <select aria-label="Role autora (současné kurátorské tvrzení)" disabled={!canEditAuth||busy} value={authDraft.authorRoleText??''}
      onChange={e=>setAuthDraft(old=>({...old,authorRoleText:e.target.value===''?null:e.target.value}))} className="w-full bg-white border border-gray-300 rounded px-2 py-1">
      <option value="">— bez současné role (NULL) —</option>
      {authDraft.authorRoleText&&!AUTHOR_ROLES.includes(authDraft.authorRoleText as typeof AUTHOR_ROLES[number])&&<option value={authDraft.authorRoleText}>{authDraft.authorRoleText}</option>}
      {AUTHOR_ROLES.map(r=><option key={r} value={r}>{r}</option>)}
     </select>
    </label>
    {AUTHORITY_SPECS.map(([field,kind,label])=>{
     const list=choicesByKind[kind]||[];
     const currentVal=authDraft[field]??'';
     return <label key={field} className="block space-y-1">{label}
      <select aria-label={label} disabled={!canEditAuth||busy} value={currentVal}
       onChange={e=>setAuthDraft(old=>({...old,[field]:e.target.value===''?null:e.target.value}))} className="w-full bg-white border border-gray-300 rounded px-2 py-1">
       <option value="">— bez současné vazby (NULL) —</option>
       {currentVal&&!list.some(c=>c.recordId===currentVal)&&<option value={currentVal}>Uložená vazba ({currentVal.slice(0,12)}…)</option>}
       {list.map(c=><option key={c.recordId} value={c.recordId}>{c.code}{c.label?` — ${c.label}`:''}{c.groupingCode?` (${c.groupingCode})`:''}</option>)}
      </select>
     </label>;
    })}
   </div>
   <div className="flex items-center gap-2">
    <button type="button" disabled={!canEditAuth||busy||!authBase} onClick={()=>void saveAuthorities()} className="px-3 py-1 bg-[#00204a] text-white font-semibold rounded disabled:opacity-50">Uložit odborné vazby a role</button>
    {!showRange&&<button type="button" disabled={busy} onClick={()=>setRevision(v=>v+1)} className="px-2 py-1 border border-gray-300 bg-white rounded">Obnovit ze serveru</button>}
   </div>
  </div>}
 </section>;
}
