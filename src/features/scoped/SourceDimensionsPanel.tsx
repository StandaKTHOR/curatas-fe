import {useEffect,useState} from 'react';
import {type ScopedApi,type SourceDimension} from './scopedApi';
import {useTask} from './useTask';
import {DimensionReview} from './ProfessionalReview';

export default function SourceDimensionsPanel({api,itemId,onFatal}:{api:ScopedApi;itemId:number;onFatal:(status:number)=>void}){
 const [rows,setRows]=useState<SourceDimension[]>([]),[next,setNext]=useState<number|null>(null),[tag,setTag]=useState('');
 const task=useTask(onFatal),{run}=task;
 useEffect(()=>{setRows([]);setNext(null);if(api.sourceDimensions)void run(s=>api.sourceDimensions!(itemId,s),r=>{setRows(r.value.items);setNext(r.value.nextOffset);setTag(r.etag);});},[api,itemId,run]);
 function load(offset=0){
  if(!api.sourceDimensions)return;
  if(!offset){setRows([]);setNext(null);}
  void run(s=>api.sourceDimensions!(itemId,s,offset),r=>{
   if(offset&&r.etag!==tag){setRows([]);setNext(null);task.setError('Verze předmětu se změnila. Obnovte zdrojové míry.');return;}
   setRows(old=>offset?[...old,...r.value.items]:r.value.items);setNext(r.value.nextOffset);setTag(r.etag);
  });
 }
 return <section aria-label="Zdrojové míry">
  <h3>Zdrojové míry a rozměry — pouze čtení</h3>
  <p>Zdrojové hodnoty a jednotky bez převodů. Shodné pořadí zachovává samostatné záznamy; vazby se stejným pořadím jsou řazeny podle identity archivu. Odborná interpretace vyžaduje potvrzení.</p>
  <button type="button" disabled={task.busy} onClick={()=>load()}>Obnovit zdrojové míry</button>
  {task.busy&&<p role="status">Načítání zdrojových měr…</p>}{task.error&&<p role="alert">{task.error}</p>}
  {!task.busy&&!task.error&&rows.length===0&&<p>Zdrojové míry nejsou dostupné s jednoznačnou zdrojovou vazbou.</p>}
  <div className="table-responsive"><table className="demus-datasheet" aria-label="Zdrojové míry a rozměry">
   <caption>Míry — původní hodnoty bez zaokrouhlení a změny jednotek</caption>
   <colgroup><col style={{width:'7rem'}}/><col style={{width:'9rem'}}/><col style={{width:'13rem'}}/><col style={{width:'7rem'}}/><col style={{width:'10rem'}}/><col/></colgroup>
   <thead><tr><th scope="col">Pořadí zdroje</th><th scope="col">Typ ve zdroji</th><th scope="col">Hodnota</th><th scope="col">Jednotka zdroje</th><th scope="col">Číselník</th><th scope="col">Přesnost a posouzení</th></tr></thead>
   <tbody>{rows.map(row=><tr key={row.recordId} data-source-record={row.recordId}>
    <td>{row.sourceOrder??'Neuvedeno'}</td><td className="whitespace-pre-wrap">{row.type??'Neuvedeno'}</td>
    <td className="whitespace-pre-wrap" data-testid="source-dimension-value">{row.number.value??'Neuvedeno'}</td><td className="whitespace-pre-wrap">{row.unit??'Neuvedeno'}</td>
    <td>{row.dictionaryState==='EXACT_MATCH'?'Přesná vazba':row.dictionaryState==='MISSING'?'Chybí přesná vazba':'Nejednoznačná vazba'}</td>
    <td><span>{row.number.scale!==null?`Desetinná místa: ${row.number.scale}`:row.number.bitPattern?`Binární zdroj (${row.number.kind}); původní desetinný formát neznámý`:'Neuvedeno'}{row.number.status.includes('REVIEW_REQUIRED')&&' — vyžaduje posouzení'}</span>
     {row.number.kind==='NULL'&&<p data-testid="source-number-state">Zdrojová hodnota je NULL.</p>}
     {row.number.status==='NON_FINITE_REVIEW_REQUIRED'&&<p className="professional-state" data-testid="source-number-state">Nečíselná nebo nekonečná binární reprezentace — REVIEW_REQUIRED.</p>}
     <DimensionReview row={row}/><details><summary>Doklad zdrojové hodnoty</summary><dl>
      <dt>Původní bity</dt><dd data-testid="source-dimension-bits">{row.number.bitPattern??'Neuvedeno'}</dd>
      <dt>Výskyt ve zdroji</dt><dd>{row.occurrence}</dd>
      <dt>Identita záznamu</dt><dd>{row.recordId}</dd><dt>Hash řádku</dt><dd>{row.rowHash}</dd>
      <dt>Hash zdroje</dt><dd>{row.sourceSha256}</dd>
     </dl></details>
    </td>
   </tr>)}</tbody>
  </table></div>
  {next!==null&&<button type="button" disabled={task.busy} onClick={()=>load(next)}>Další zdrojové míry</button>}
 </section>;
}
