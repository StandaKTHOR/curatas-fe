import {useEffect,useRef,useState} from 'react';
import type {ScopedApi,HistoricalVocabularyPage} from '../scoped/scopedApi';
import {managedDictionaryLabels} from './managedDictionaryPresentation';
const states:Record<string,string>={SOURCE_PARENT_MISSING:'Katalog nemá doložený úplný zdroj DEMUS.',AMBIGUOUS_CATALOG_SOURCE:'Katalog obsahuje více zdrojů; hodnoty nebyly sloučeny.',SOURCE_TABLE_UNAVAILABLE:'Zdrojová tabulka není úplně dostupná.',MAPPING_AMBIGUOUS:'Adresář DEMUS není doloženým číselníkem správců sbírky. Převod na CUSTODIAN vyžaduje odborné rozhodnutí.'};
/** Separate read-only source evidence. Never supplies a current UUID or writes an item draft. */
export default function HistoricalVocabularyBrowser({api,type}:{api:ScopedApi;type:string}){
 const [open,setOpen]=useState(false);
 return <details onToggle={e=>setOpen(e.currentTarget.open)}><summary>Historický číselník DEMUS — {managedDictionaryLabels[type as keyof typeof managedDictionaryLabels]??type} — rozbalit hodnoty pouze pro čtení</summary>{open&&<ReadVocabulary key={type} api={api} type={type}/>}</details>;
}
function ReadVocabulary({api,type}:{api:ScopedApi;type:string}){
 const [draft,setDraft]=useState(''),[query,setQuery]=useState(''),[storedPage,setPage]=useState<HistoricalVocabularyPage|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[revision,setRevision]=useState(0);
 const [owner,setOwner]=useState<{api:ScopedApi;type:string;query:string;revision:number}|null>(null);
 const page=owner?.api===api&&owner.type===type&&owner.query===query&&owner.revision===revision?storedPage:null;
 const pageRef=useRef(page);pageRef.current=page;
 const life=useRef<{controller:AbortController;pending:boolean}|null>(null);
 useEffect(()=>{const timer=setTimeout(()=>setQuery(draft),250);return()=>clearTimeout(timer);},[draft]);
 async function load(owned:{controller:AbortController;pending:boolean},after=''){
  if(owned.pending||owned.controller.signal.aborted||life.current!==owned)return;owned.pending=true;setBusy(true);setError('');
  try{if(!api.historicalVocabulary)throw new Error('Historické čtení není dostupné.');const result=await api.historicalVocabulary(type,owned.controller.signal,query,after);
   if(after&&result.sourceSha256!==pageRef.current?.sourceSha256)throw new Error('Zdroj katalogu se změnil. Obnovte historický číselník; stránky nebyly spojeny.');
   if(!owned.controller.signal.aborted&&life.current===owned){setOwner({api,type,query,revision});setPage(old=>({...result,items:after?[...(old?.items??[]),...result.items]:result.items}));}
  }catch(e){if(!owned.controller.signal.aborted&&life.current===owned){setPage(null);setError((e as Error).message);}}
  finally{owned.pending=false;if(!owned.controller.signal.aborted&&life.current===owned)setBusy(false);}
 }
 useEffect(()=>{setPage(null);setError('');const owned={controller:new AbortController(),pending:false};life.current=owned;void load(owned);return()=>{owned.controller.abort();if(life.current===owned)life.current=null;};},[api,type,query,revision]);
 return <section aria-label={`Historické hodnoty DEMUS ${type}`}><p>Historické hodnoty a původní identity DEMUS pouze pro čtení. Nejsou současnými UUID autoritami a nepředvyplňují editaci. Zařazení je původní kód; bez doloženého pravidla z něj nevzniká rodičovská vazba.</p><label>Hledat v historickém číselníku DEMUS<input aria-label={`Hledat DEMUS ${type}`} maxLength={100} value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();setQuery(draft);setRevision(v=>v+1);}}}/></label><button type="button" onClick={()=>{setQuery(draft);setRevision(v=>v+1);}} disabled={busy}>Vyhledat DEMUS</button>{busy&&<p role="status">Načítání historických hodnot DEMUS…</p>}{error&&<p role="alert">{error}</p>}{page?.state!=='AVAILABLE'&&page&&<p role="status">{states[page.state]??'Historický zdroj vyžaduje ověření.'}</p>}{page?.state==='AVAILABLE'&&<><p>Načteno historických řádků: {page.items.length}{page.nextAfterId?' — další jsou dostupné.':'.'} Počet řádků není počtem současných autorit.</p>{!page.items.length&&<p>{query?'Žádné historické hodnoty neodpovídají hledání.':'Doložený historický číselník neobsahuje žádné řádky.'}</p>}<table className="demus-datasheet" aria-label={`Číselník DEMUS ${type}`}><thead><tr><th>Původní označení DEMUS</th><th>Původní kód DEMUS</th><th>Zařazení / okruh DEMUS</th><th>Doklad zdroje</th></tr></thead><tbody>{page.items.map(v=><tr key={`${v.sourceSha256}:${v.recordId}`}><td className="whitespace-pre-wrap">{v.label??v.code??'Označení není textově dostupné'}</td><td className="whitespace-pre-wrap">{v.code??'Viz původní typ v dokladu'}</td><td>{v.groupingCode??'—'}</td><td><details><summary>Identita DEMUS</summary><p>{v.table} · zdroj {v.sourceSha256} · řádek {v.recordId} · hash {v.rowHash} · výskyt {v.occurrence}</p><pre>{JSON.stringify(v.typedKey,null,2)}</pre></details></td></tr>)}</tbody></table>{page.nextAfterId&&<button type="button" disabled={busy} onClick={()=>{if(life.current)void load(life.current,page.nextAfterId!);}}>Další historické hodnoty DEMUS</button>}</>}</section>;
}
