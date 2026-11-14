import {useEffect,useMemo,useState} from 'react';
import type {HistoricalVocabularyValue,HistoricalVocabularyPage,ScopedApi} from '../scoped/scopedApi';
export function HistoricalOptions({items}:{items:HistoricalVocabularyValue[]}){return items.length?<optgroup label="DEMUS — historické hodnoty">{items.map(v=><option key={v.recordId} value={'demus:'+v.recordId} title={`${v.table}; ${JSON.stringify(v.typedKey)}; ${v.sourceSha256}; ${v.recordId}`}>DEMUS — {v.label??v.code??'Bez textového označení'} · {v.code??'NULL'} · {v.recordId.slice(0,12)}</option>)}</optgroup>:null;}
export function historicalPickerMessage(type:string,state:string|undefined,count:number,query:string){
 if(type==='CUSTODIAN')return 'Původní kód správce není ověřenou vazbou na Adresář. Historické přiřazení správce je odborně blokováno.';
 if(state&&state!=='AVAILABLE')return ({SOURCE_PARENT_MISSING:'Historický číselník čeká na ověření zdrojové vazby.',AMBIGUOUS_CATALOG_SOURCE:'Zdroj historického číselníku vyžaduje odborné ověření.',SOURCE_TABLE_UNAVAILABLE:'Pro tento číselník není k dispozici ověřený zdrojový výřez.',MAPPING_AMBIGUOUS:'Historické přiřazení vyžaduje odborné ověření.'} as Record<string,string>)[state]??'Historický číselník se nepodařilo ověřit. Nejde o potvrzení prázdné evidence.';
 if(state!=='AVAILABLE')return 'Historický výběr není pro tento katalog a oprávnění dostupný.';
 if(count)return 'MES a DEMUS jsou oddělené nabídky. Pro zúžení historických hodnot napište část názvu nebo kódu do hledání nad seznamem.';
 return query?'Žádná historická hodnota DEMUS neodpovídá hledání.':'Historický číselník DEMUS nemá položky.';
}
/** One bounded server page; stale catalog/type/query responses can never supply an authority. */
export function useHistoricalChoices(unstableApi:ScopedApi,signal:AbortSignal,type:string,query:string,enabled:boolean){
 const api=useMemo(()=>unstableApi,[signal]);
 const [cursor,setCursor]=useState(''),[state,setState]=useState<{api:ScopedApi;signal:AbortSignal;type:string;query:string;cursor:string;page:HistoricalVocabularyPage}|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const active=state?.api===api&&state.signal===signal&&state.type===type&&state.query===query&&state.cursor===cursor;
 useEffect(()=>{setCursor('');},[api,signal,type,query]);
 useEffect(()=>{const controller=new AbortController();const abort=()=>controller.abort();signal.addEventListener('abort',abort);if(signal.aborted)controller.abort();setState(null);setError('');
  if(!enabled||!api.historicalVocabulary){setBusy(false);return()=>signal.removeEventListener('abort',abort);}
  const timer=setTimeout(()=>{setBusy(true);void api.historicalVocabulary!(type,controller.signal,query,cursor).then(page=>{if(!controller.signal.aborted)setState({api,signal,type,query,cursor,page});}).catch(e=>{if(!controller.signal.aborted)setError((e as Error).message);}).finally(()=>{if(!controller.signal.aborted)setBusy(false);});},180);
  return()=>{clearTimeout(timer);controller.abort();signal.removeEventListener('abort',abort);};
 },[api,signal,type,query,cursor,enabled]);
 const items=active?state.page.items:[];
 return {items,error,busy,state:active?state.page.state:null,find:(id:string)=>items.find(v=>id==='demus:'+v.recordId),next:active?state.page.nextAfterId:null,more:()=>{if(active&&state.page.nextAfterId)setCursor(state.page.nextAfterId);},reset:()=>setCursor('')};
}

/** Exact inclusive lookup built from the existing bounded, strictly-after cursor API. */
export async function historicalChoice(api:ScopedApi,type:string,id:string,signal:AbortSignal){
 if(!/^[a-f0-9]{64}$/.test(id))throw new Error('Neplatná identita DEMUS.');
 const n=BigInt('0x'+id);const before=n===0n?'':(n-1n).toString(16).padStart(64,'0');
 const page=await api.historicalVocabulary!(type,signal,'',before);
 const ref=page.items.find(v=>v.recordId===id);if(!ref)throw new Error('Historická autorita již není dostupná v tomto katalogu.');return ref;
}
