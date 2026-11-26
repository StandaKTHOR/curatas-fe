import {unifiedDictionariesEnabled} from '../scoped/scopedApi';
import {dictionaryLabel,ambiguousDictionaryCaption,type DictionaryCaption} from './dictionaryLabel';
import {useEffect,useMemo,useState} from 'react';
import type {HistoricalVocabularyValue,HistoricalVocabularyPage,ScopedApi} from '../scoped/scopedApi';
export function HistoricalOptions({items,captions={}}:{items:HistoricalVocabularyValue[];captions?:Record<string,DictionaryCaption>}){return items.length?<>{items.map(v=>{const display=captions[v.recordId]??v;const ambiguous=ambiguousDictionaryCaption(display,items.map(r=>captions[r.recordId]??r));return <option key={v.recordId} value={'demus:'+v.recordId} disabled={ambiguous}>{dictionaryLabel(display)}{ambiguous?' — nelze odborně rozlišit; výběr vyžaduje ověření':''}</option>;})}</>:null;}
export function historicalPickerMessage(type:string,state:string|undefined,count:number,query:string){
 if(type==='CUSTODIAN')return 'Vazba kódu správce na adresář vyžaduje odborné ověření.';
 if(state&&state!=='AVAILABLE')return 'Úplnost nabídky nelze ověřit. Nejde o potvrzení prázdného číselníku.';
 if(state!=='AVAILABLE')return 'Výběr není pro tento katalog a oprávnění dostupný.';
 if(count)return 'Pište část názvu nebo kódu pro zúžení nabídky.';
 return query?'Žádná další položka neodpovídá hledání.':'';
}
/** One bounded server page; stale catalog/type/query responses can never supply an authority. */
export function useHistoricalChoices(unstableApi:ScopedApi,signal:AbortSignal,type:string,query:string,enabled:boolean){
 const api=useMemo(()=>unstableApi,[signal]);
 const [cursor,setCursor]=useState(''),[state,setState]=useState<{api:ScopedApi;signal:AbortSignal;type:string;query:string;cursor:string;page:HistoricalVocabularyPage}|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const active=state?.api===api&&state.signal===signal&&state.type===type&&state.query===query&&state.cursor===cursor;
 useEffect(()=>{setCursor('');},[api,signal,type,query]);
 useEffect(()=>{const controller=new AbortController();const abort=()=>controller.abort();signal.addEventListener('abort',abort);if(signal.aborted)controller.abort();setState(null);setError('');
  if(!enabled||!api.historicalVocabulary){setBusy(false);return()=>signal.removeEventListener('abort',abort);}
  const timer=setTimeout(()=>{setBusy(true);void (unifiedDictionariesEnabled()?api.unifiedValues(type,controller.signal,query,cursor).then(p=>({items:p.items.flatMap(v=>v.binding?[v.binding]:[]),nextAfterId:p.nextAfterId,state:'AVAILABLE',sourceSha256:null,captions:Object.fromEntries(p.items.filter(v=>v.binding).map(v=>[v.binding!.recordId,{label:v.label,code:v.code,groupingCode:v.groupingCode}]))} as HistoricalVocabularyPage)):api.historicalVocabulary!(type,controller.signal,query,cursor)).then(page=>{if(!controller.signal.aborted)setState({api,signal,type,query,cursor,page});}).catch(e=>{if(!controller.signal.aborted)setError((e as Error).message);}).finally(()=>{if(!controller.signal.aborted)setBusy(false);});},180);
  return()=>{clearTimeout(timer);controller.abort();signal.removeEventListener('abort',abort);};
 },[api,signal,type,query,cursor,enabled]);
 const items=active?state.page.items:[];
 return {items,captions:active?state.page.captions:undefined,error,busy,state:active?state.page.state:null,find:(id:string)=>items.find(v=>id==='demus:'+v.recordId),next:active?state.page.nextAfterId:null,more:()=>{if(active&&state.page.nextAfterId)setCursor(state.page.nextAfterId);},reset:()=>setCursor('')};
}

/** Exact inclusive lookup built from the existing bounded, strictly-after cursor API. */
export async function historicalChoice(api:ScopedApi,type:string,id:string,signal:AbortSignal){
 if(!/^[a-f0-9]{64}$/.test(id))throw new Error('Neplatná identita položky.');
 const n=BigInt('0x'+id);const before=n===0n?'':(n-1n).toString(16).padStart(64,'0');
 const page=await api.historicalVocabulary!(type,signal,'',before);
 const ref=page.items.find(v=>v.recordId===id);if(!ref)throw new Error('Položka již není dostupná v tomto katalogu.');return ref;
}
