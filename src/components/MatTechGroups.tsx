import ThreeLevelDictionarySelect from './ThreeLevelDictionarySelect';
import type {MuseumRecord} from '../lib/api';
import type {HistoricalVocabularyValue} from '../features/scoped/scopedApi';
export function matTechRows(rows:MuseumRecord[],type:'MATERIAL'|'TECHNIQUE'){
 const key=type==='MATERIAL'?'material':'technique',text=type==='MATERIAL'?'Material_MT':'Technika_MT';
 return rows.filter(r=>r.kind==='MATERIAL_TECHNIQUE'&&!r.sourceTable&&(r.payload[key+'AuthorityId']||r.payload[key+'HistoricalRef']||r.payload[text]||(type==='MATERIAL'?r.materialDictionaryId:r.techniqueDictionaryId)));
}
/** Every current professional record owns a hierarchy selector group; only the selected row owns the edit draft. */
export default function MatTechGroups({rows,record,payload,readOnly,onSelect,onPayload}:{rows:MuseumRecord[];record:MuseumRecord|null;payload:Record<string,unknown>;readOnly:boolean;onSelect:(row:MuseumRecord)=>void;onPayload:(update:(p:Record<string,unknown>)=>Record<string,unknown>)=>void}){
 return <>{(['MATERIAL','TECHNIQUE'] as const).map(type=>{
  const label=type==='MATERIAL'?'Materiál':'Technika',prefix=type==='MATERIAL'?'material':'technique',text=type==='MATERIAL'?'Material_MT':'Technika_MT';
  const groups:(MuseumRecord|null)[]=matTechRows(rows,type);if(!record||!groups.length)groups.push(null);
  return <div key={type} className="space-y-3">{groups.map(row=>{
   const active=row?record?.id===row.id:!record,fields=active?payload:row?.payload??{},editable=active&&!readOnly;
   const uuid=fields[prefix+'AuthorityId'],historical=fields[prefix+'HistoricalRef'] as HistoricalVocabularyValue|null|undefined;
   return <div key={row?.id??'new'} data-mattech-group={type} data-record-id={row?.id??'new'} aria-label={`${label} záznam ${row?'#'+row.id:'nový'}`}>
    <p>{label} — {row?`odborný záznam #${row.id}`:'nové přiřazení'}{row&&!active?' (pouze čtení)':''}</p>
    <ThreeLevelDictionarySelect scoped type={type} label={label} historicalValue={String(fields[text]??'')} readOnly={!editable} value={row?(type==='MATERIAL'?row.materialDictionaryId:row.techniqueDictionaryId)??null:null} scopedValue={typeof uuid==='string'?uuid:null} sourceValue={historical}
     onScopedChange={id=>{if(editable)onPayload(p=>({...p,[prefix+'AuthorityId']:id,[prefix+'HistoricalRef']:null}));}}
     onHistoricalChange={source=>{if(editable)onPayload(p=>({...p,[prefix+'HistoricalRef']:source,...(source?{[prefix+'AuthorityId']:null}:{})}));}} onChange={()=>{}}/>
    {row&&<button type="button" className="underline" onClick={()=>onSelect(row)}>{readOnly?'Zobrazit':'Upravit'} {label.toLocaleLowerCase('cs')} #{row.id}</button>}
   </div>;
  })}</div>;
 })}</>;
}
