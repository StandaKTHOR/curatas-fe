import {useSourceCaptions} from '../features/catalog/useSourceCaptions';
import type {DictionaryCaption} from '../features/catalog/dictionaryLabel';
import {useState} from 'react';
import {HistoricalOptions} from '../features/catalog/historicalSelection';
import {originalCanEdit} from '../features/catalog/originalEdit';
import type {HistoricalVocabularyValue} from '../features/scoped/scopedApi';

/** Independent current source decisions. Position is stable: deleting 2 never moves 3. */
export function IndependentHistoricalPositions({type,items,slots,onChange,readOnly,busy,error,captions}:{type:'MATERIAL'|'TECHNIQUE';items:HistoricalVocabularyValue[];slots:Record<string,HistoricalVocabularyValue>;onChange:(position:number,source:HistoricalVocabularyValue|null)=>void;readOnly:boolean;busy:boolean;error:string;captions?:Record<string,DictionaryCaption>}){
 const selectedCaptions=useSourceCaptions(Object.entries(slots).filter(([key])=>key===type||key.startsWith(type+'_')).map(([,v])=>({type,key:'s:'+v.recordId})));
 const [expanded,setExpanded]=useState(3);
 const key=(position:number)=>position===1?type:`${type}_${position}`;
 const occupied=Array.from({length:8},(_,i)=>slots[key(i+1)]?i+1:0);
 const count=Math.max(expanded,...occupied);
 const label=type==='MATERIAL'?'Materiál':'Technika';
 const selected=occupied.filter(Boolean).map(position=>slots[key(position)]);
 return <div>
  <p>Další přiřazení v samostatných pořadových pozicích. Hledání nad seznamem nabízí další hodnoty.</p>
  {Array.from({length:count},(_,i)=>i+1).map(position=>{
   const value=slots[key(position)];
   const used=new Set(selected.filter(v=>v.recordId!==value?.recordId).map(v=>v.recordId));
   const options=[...(value?[value]:[]),...items.filter(v=>v.recordId!==value?.recordId&&!used.has(v.recordId))];
   return <label key={position} className="block text-xs">{label} — přiřazení {position}
    <select data-scoped-read aria-label={`${label} — přiřazení ${position}`} disabled={readOnly||busy||!!error||!originalCanEdit('professional')} value={value?'demus:'+value.recordId:''} onChange={e=>{const next=options.find(v=>'demus:'+v.recordId===e.target.value);if(!e.target.value)onChange(position,null);else if(next)onChange(position,next);}} className="w-full rounded border border-gray-300 bg-white px-3 py-2">
     <option value="">— bez přiřazení —</option><HistoricalOptions items={options} captions={{...captions,...Object.fromEntries(options.flatMap(v=>selectedCaptions[type+':'+v.recordId]?[[v.recordId,selectedCaptions[type+':'+v.recordId]]]:[]))}}/>
    </select>
   </label>;
  })}
  {count<8&&<button type="button" disabled={readOnly||!originalCanEdit('professional')} onClick={()=>setExpanded(count+1)}>Další {type==='MATERIAL'?'materiál':'technika'}</button>}
 </div>;
}
