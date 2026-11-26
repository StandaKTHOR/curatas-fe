import {createPortal} from 'react-dom';
import CardDictionaryChoice from './CardDictionaryChoice';
import {unifiedDictionariesEnabled} from '../scoped/scopedApi';
import {dictionaryLabel} from './dictionaryLabel';
import {useEffect,useState,useRef,type MutableRefObject} from 'react';
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
export default function AuthorityAndRangeBindings({itemId,mode='all',readOnly=false,onSave,drafts,exact=false,determinerTarget,detailsOpen=true,recordedDeterminer,parentEtag}:{itemId:number;drafts?:MutableRefObject<Record<string,any>>;mode?:'all'|'range'|'authorities';readOnly?:boolean;onSave?:(etag:string)=>void|Promise<void>;exact?:boolean;determinerTarget?:HTMLElement|null;detailsOpen?:boolean;recordedDeterminer?:string;parentEtag?:string}){
 const {api,signal}=originalSession();const root=useRef<HTMLElement>(null);
 const canEditRange=!readOnly&&originalCanEdit('inventory');
 const canEditAuth=!readOnly&&originalCanEdit('professional');
 const showRange=detailsOpen&&(mode==='all'||mode==='range');
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

 const [ready,setReady]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [status,setStatus]=useState('');
 const [revision,setRevision]=useState(0);

 useEffect(()=>{
  let alive=true;setError('');setReady(false);
  async function load(){
   try{
    const range=showRange?await api.curatorRecord(itemId,'inventory-range',signal):null;
    const series=showRange?await api.sourceChoices('series',signal):null;
    const auth=showAuth?await api.curatorRecord(itemId,'authorities',signal):null;
    const bindings=auth&&exact?await api.exactItemBindings(itemId,signal):null;
    if(bindings&&bindings.etag!==auth?.etag)throw new Error('Verze výběru v Adresáři se během čtení změnila.');
    const entries=showAuth&&detailsOpen?await Promise.all(AUTHORITY_SPECS.map(async([,kind])=>[kind,(await api.sourceChoices(kind,signal)).items] as const)):[];
    if(!alive||signal.aborted)return;
    if(range&&auth&&range.etag!==auth.etag)throw new Error('Verze odborných vazeb se během čtení změnila. Obnovte kartu.');
    const etag=range?.etag??auth!.etag;
    const stored=drafts?.current.rangeBindings;
    if(stored?.dirty&&stored.itemId===itemId&&stored.scopeSignal===signal&&stored.etag!==etag){
     setRangeDraft(stored.rangeDraft);setAuthDraft(stored.authDraft);
     throw new Error('Předmět se mezitím změnil. Rozepsaný rozsah a vazby zůstávají zachované; porovnejte je před obnovením ze serveru.');
    }
    const keep=stored?.dirty&&stored.itemId===itemId&&stored.scopeSignal===signal?stored:null;
    setEtag(etag);
    if(range){setRangeBase(range.value);setRangeDraft(keep?.rangeDraft??{...range.value});setRangePresent(range.present);setSeriesChoices(series!.items);}
    if(auth){const values=bindings?{...auth.value,determinedByKey:bindings.items.DETERMINER?.key??null}:auth.value;setAuthBase(values);setAuthDraft(keep?.authDraft??values);setAuthPresent(auth.present);setChoicesByKind(Object.fromEntries(entries));}
    setReady(true);
   }catch(e){if(alive&&!signal.aborted)setError((e as Error).message);}
  }
  void load();return()=>{alive=false;};
 },[itemId,signal,showRange,showAuth,exact,revision,detailsOpen,parentEtag]);

 useEffect(()=>{
  if(!ready||!drafts)return;
  const dirty=(showRange&&rangeBase&&[...Object.keys(EMPTY_RANGE),'prefix','postfix'].some(k=>rangeDraft[k]!==rangeBase[k]))||(showAuth&&authBase&&Object.keys(authBase).some(k=>authDraft[k]!==authBase[k]));
  drafts.current.rangeBindings={itemId,scopeSignal:signal,etag,rangeDraft,authDraft,dirty:!!dirty};
 },[ready,drafts,itemId,signal,etag,showRange,showAuth,rangeDraft,rangeBase,authDraft,authBase]);
 function reload(){if(drafts?.current.rangeBindings?.dirty&&!window.confirm('Zahodit rozepsaný rozsah a vazby a načíst aktuální serverové hodnoty?'))return;if(drafts)delete drafts.current.rangeBindings;setRevision(v=>v+1);}
 async function saveRange(){
  if(!canEditRange||busy||!ready||!rangeBase)return;
  setError('');setStatus('');
  const invalid=validateInventoryRange(rangeDraft);
  if(invalid){setError(invalid);root.current?.querySelector<HTMLInputElement>('input[aria-label="Dolní pořadové číslo"]')?.focus();return;}
  if(rangeDraft.prefix===undefined||rangeDraft.postfix===undefined){setError('Pro nový zápis rozsahu nejprve výslovně upřesněte prefix a postfix; starý neúplný rozsah se automaticky nedoplňuje.');return;}
  if([...Object.keys(EMPTY_RANGE),'prefix','postfix'].every(k=>rangeDraft[k]===rangeBase[k])){setStatus('Rozsah inventárního čísla je beze změn.');return;}
  setBusy(true);
  try{
   await api.saveCuratorRecord(itemId,'inventory-range',etag,rangeDraft,signal);
   const fresh=await api.curatorRecord(itemId,'inventory-range',signal);
   setEtag(fresh.etag);setRangeBase(fresh.value);setRangeDraft({...fresh.value});setRangePresent(fresh.present);
   setStatus('Současný rozsah a inventární řada byly uloženy a znovu načteny.');
   await onSave?.(fresh.etag);
  }catch(e){if(!signal.aborted)setError((e as Error).message);}
  finally{if(!signal.aborted)setBusy(false);}
 }

 async function saveAuthorities(){
  if(!canEditAuth||busy||!ready||!authBase)return;
  setError('');setStatus('');
  if(Object.keys(authBase).every(k=>authDraft[k]===authBase[k])){setStatus('Odborné vazby a role jsou beze změn.');return;}
  for(const k of ['determinedByText','authorRoleText'] as const){
   const v=authDraft[k];
   if(v!==null&&v.length>255){setError('Textové pole může mít nejvýše 255 znaků.');return;}
  }
  setBusy(true);
  try{
   await api.saveCuratorRecord(itemId,'authorities',etag,authDraft,signal);
   const fresh=await api.curatorRecord(itemId,'authorities',signal);
   const bindings=exact?await api.exactItemBindings(itemId,signal):null;
   if(bindings&&bindings.etag!==fresh.etag)throw new Error('Uložená volba v Adresáři má jinou verzi.');
   const values=bindings?{...fresh.value,determinedByKey:bindings.items.DETERMINER?.key??null}:fresh.value;
   setEtag(fresh.etag);setAuthBase(values);setAuthDraft(values);setAuthPresent(fresh.present);
   setStatus('Současné odborné vazby a role byly uloženy a znovu načteny.');
   await onSave?.(fresh.etag);
  }catch(e){if(!signal.aborted)setError((e as Error).message);}
  finally{if(!signal.aborted)setBusy(false);}
 }

 const determiner=<div className="curator-card-determiner">
    <label className="block space-y-1">Určil
     <input aria-label="Určil (současné kurátorské tvrzení)" type="text" disabled={!canEditAuth||busy||!ready} title="Kdo předmět odborně určil" placeholder={recordedDeterminer} value={authDraft.determinedByText??''}
      onChange={e=>setAuthDraft(old=>({...old,determinedByText:e.target.value===''&&old.determinedByText===null?null:e.target.value,...(exact?{determinedByKey:null}:{})}))} className="w-full bg-white border border-gray-300 rounded px-2 py-1"/>
    </label>
    {unifiedDictionariesEnabled()&&canEditAuth&&!busy&&ready&&<CardDictionaryChoice type="DIRECTORY" label="Nabídka osob pro údaj Určil" selectedKey={authDraft.determinedByKey} selectedCaption={authDraft.determinedByText}
     onSelect={entry=>{if(entry)setAuthDraft(old=>({...old,determinedByText:entry.label??entry.code??null,...(exact?{determinedByKey:entry.key}:{})}));}}/>}
  {determinerTarget&&!detailsOpen&&canEditAuth&&authBase&&Object.keys(authBase).some(key=>authBase[key]!==authDraft[key])&&
   <button type="button" className="demus-save" disabled={busy||!ready} onClick={()=>void saveAuthorities()}>Uložit údaj Určil</button>}
 </div>;
 return <section ref={root} aria-label="Současné odborné vazby a rozsah inventárního čísla" data-scoped-reference-editor className={detailsOpen?"space-y-3 border border-gray-200 rounded p-3 bg-gray-50 text-xs":undefined}>
  {determinerTarget&&createPortal(determiner,determinerTarget)}
  {error&&<p role="alert" className="text-red-700 font-bold">{error}</p>}
  {status&&<p role="status" className="text-green-800 font-bold">{status}</p>}
  {showRange&&<div className="space-y-2">
   <h4 className="font-bold text-gray-800">Současný strukturovaný rozsah a inventární řada ({rangePresent?'uloženo':'Prázdné'})</h4>
   <p className="text-gray-600">Současné kurátorské tvrzení je oddělené od historických složek DEMUS (Rada_S, PorC_S, HPorC_S).</p>
   <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
    <label className="block space-y-1">Dolní pořadové číslo (1–99999999)
     <input aria-label="Dolní pořadové číslo" type="text" disabled={!canEditRange||busy||!ready} value={rangeDraft.lowerNumber??''}
      onChange={e=>setRangeDraft(old=>({...old,lowerNumber:e.target.value===''?null:e.target.value}))} className="w-full bg-white border border-gray-300 rounded px-2 py-1"/>
    </label>
    <label className="block space-y-1">Horní pořadové číslo (Až — volitelné)
     <input aria-label="Horní pořadové číslo" type="text" disabled={!canEditRange||busy||!ready} value={rangeDraft.upperNumber??''}
      onChange={e=>setRangeDraft(old=>({...old,upperNumber:e.target.value===''?null:e.target.value}))} className="w-full bg-white border border-gray-300 rounded px-2 py-1"/>
    </label>
    <label className="block space-y-1">Inventární řada (číselník InvRady)
     <select aria-label="Inventární řada (číselník InvRady)" disabled={!canEditRange||busy||!ready} value={rangeDraft.seriesRecordId??''}
      onChange={e=>setRangeDraft(old=>({...old,seriesRecordId:e.target.value===''?null:e.target.value}))} className="w-full bg-white border border-gray-300 rounded px-2 py-1">
      <option value="">Prázdné</option>
      {rangeDraft.seriesRecordId&&!seriesChoices.some(c=>c.recordId===rangeDraft.seriesRecordId)&&<option value={rangeDraft.seriesRecordId}>Uložená řada — označení není v načtené stránce; ověřte zdroj</option>}
      {seriesChoices.map(c=><option key={c.recordId} value={c.recordId}>{c.code}{c.label?` — ${c.label}`:''}</option>)}
     </select>
    </label>
   </div>
   <p>Rozsah rezervuje čísla pouze při výslovném přesném prefixu a postfixu. Stát, správce, oddělení a lomení zadejte v postfixu podle úplného čísla; historické složky se automaticky nepřebírají. HPorC_S není horní mez.</p>
   {rangeDraft.prefix===undefined?<button type="button" disabled={!canEditRange||busy||!ready} onClick={()=>setRangeDraft(v=>({...v,prefix:'',postfix:''}))}>Upřesnit prefix a postfix pro kontrolu překryvů</button>:<fieldset><legend>Přesný textový rozsah</legend>{(['prefix','postfix'] as const).map(key=><label key={key}>{key==='prefix'?'Část před pořadovým číslem':'Část za pořadovým číslem (například lomení)'}<input aria-label={`Rozsah: ${key}`} disabled={!canEditRange||busy||!ready} value={rangeDraft[key]??''} onChange={e=>setRangeDraft(v=>({...v,[key]:e.target.value}))}/></label>)}<output>{rangeDraft.prefix}{rangeDraft.lowerNumber??'—'}{rangeDraft.postfix}</output></fieldset>}
   <div className="flex items-center gap-2">
    <button type="button" disabled={!canEditRange||busy||!ready||!rangeBase} onClick={()=>void saveRange()} className="px-3 py-1 bg-[#00204a] text-white font-semibold rounded disabled:opacity-50">Uložit rozsah a řadu</button>
    <button type="button" disabled={busy} onClick={reload} className="px-2 py-1 border border-gray-300 bg-white rounded">Obnovit ze serveru</button>
   </div>
  </div>}
  {showAuth&&detailsOpen&&<div className="space-y-2 pt-2 border-t border-gray-200">
   <h4 className="font-bold text-gray-800">Současné odborné vazby a role ({authPresent?'uloženo':'Prázdné'})</h4>
   <p className="text-gray-600">Vazba ukládá identitu položky z katalogu. Vyberte hodnotu a potvrďte „Uložit odborné vazby a role“. Předmět pak zobrazuje název této položky. Historický zápis se tím nemění.</p>
   <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
    {!determinerTarget&&determiner}
    <label className="block space-y-1">Role autora (současné kurátorské tvrzení)
     <select aria-label="Role autora (současné kurátorské tvrzení)" disabled={!canEditAuth||busy||!ready} value={authDraft.authorRoleText??''}
      onChange={e=>setAuthDraft(old=>({...old,authorRoleText:e.target.value===''?null:e.target.value}))} className="w-full bg-white border border-gray-300 rounded px-2 py-1">
      <option value="">Prázdné</option>
      {authDraft.authorRoleText&&!AUTHOR_ROLES.includes(authDraft.authorRoleText as typeof AUTHOR_ROLES[number])&&<option value={authDraft.authorRoleText}>{authDraft.authorRoleText}</option>}
      {AUTHOR_ROLES.map(r=><option key={r} value={r}>{r}</option>)}
     </select>
    </label>
    {AUTHORITY_SPECS.map(([field,kind,label])=>{
     const list=choicesByKind[kind]||[];
     const currentVal=authDraft[field]??'';
     return <label key={field} className="block space-y-1">{label}
      <select aria-label={label} disabled={!canEditAuth||busy||!ready} value={currentVal}
       onChange={e=>setAuthDraft(old=>({...old,[field]:e.target.value===''?null:e.target.value}))} className="w-full bg-white border border-gray-300 rounded px-2 py-1">
       <option value="">Prázdné</option>
       {currentVal&&!list.some(c=>c.recordId===currentVal)&&<option value={currentVal}>Uložená vazba — označení není v načtené stránce; ověřte zdroj</option>}
       {list.map(c=><option key={c.recordId} value={c.recordId}>{dictionaryLabel(c)}</option>)}
      </select>
     </label>;
    })}
   </div>
   <div className="flex items-center gap-2">
    <button type="button" disabled={!canEditAuth||busy||!ready||!authBase} onClick={()=>void saveAuthorities()} className="px-3 py-1 bg-[#00204a] text-white font-semibold rounded disabled:opacity-50">Uložit odborné vazby a role</button>
    {!showRange&&<button type="button" disabled={busy} onClick={reload} className="px-2 py-1 border border-gray-300 bg-white rounded">Obnovit ze serveru</button>}
   </div>
  </div>}
 </section>;
}
