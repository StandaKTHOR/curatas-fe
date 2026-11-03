import {useEffect,useState} from 'react';
import type {ScopedApi,SourceMatTech} from './scopedApi';
import {useTask} from './useTask';
const state={EXACT_MATCH:'Přesná vazba',MISSING:'Chybí přesná vazba',AMBIGUOUS:'Nejednoznačná vazba'};
export default function SourceMatTechPanel({api,itemId,onFatal}:{api:ScopedApi;itemId:number;onFatal:(status:number)=>void}){
 const [rows,setRows]=useState<SourceMatTech[]>([]),[next,setNext]=useState<number|null>(null),[etag,setEtag]=useState('');
 const task=useTask(onFatal),{run}=task;
 useEffect(()=>{setRows([]);setNext(null);if(api.sourceMatTech)void run(s=>api.sourceMatTech!(itemId,s),r=>{setRows(r.value.items);setNext(r.value.nextOffset);setEtag(r.etag);});},[api,itemId,run]);
 function load(offset=0){
  if(!api.sourceMatTech)return;
  if(!offset){setRows([]);setNext(null);}
  void run(s=>api.sourceMatTech!(itemId,s,offset),r=>{
   if(offset&&r.etag!==etag){setRows([]);setNext(null);task.setError('Verze předmětu se změnila. Obnovte MatTech.');return;}
   setRows(old=>offset?[...old,...r.value.items]:r.value.items);setNext(r.value.nextOffset);setEtag(r.etag);
  },false,()=>{setRows([]);setNext(null);});
 }
 return <section aria-label="Zdrojový MatTech"><h3>MatTech — materiál a technika ve zdroji</h3>
  <p>REVIEW_REQUIRED — původní texty bez převodu na současné číselníky. Chybějící pořadí není doplněno; při shodném pořadí rozhoduje identita archivu.</p>
  <button type="button" disabled={task.busy} onClick={()=>load()}>Obnovit MatTech</button>
  {task.busy&&<p role="status">Načítání MatTech…</p>}{task.error&&<p role="alert">{task.error}</p>}
  {!task.busy&&!task.error&&!rows.length&&<p>MatTech není dostupný s jednoznačnou zdrojovou vazbou. To nedokládá nepřítomnost materiálu nebo techniky.</p>}
  <div className="table-responsive"><table className="demus-datasheet" aria-label="Zdrojový materiál a technika"><thead><tr><th scope="col">Pořadí zdroje</th><th scope="col">Materiál zdroje</th><th scope="col">Technika zdroje</th><th scope="col">Vazby a doklad</th></tr></thead>
   <tbody>{rows.map(row=><tr key={row.recordId} data-mattech-record={row.recordId}><td title="Původní Poradi_MT; odborný význam pořadí není potvrzen.">{row.sourceOrder??'Neuvedeno'}</td><td className="whitespace-pre-wrap" data-testid="source-material">{row.material??'Neuvedeno'}</td><td className="whitespace-pre-wrap" data-testid="source-technique">{row.technique??'Neuvedeno'}</td><td>Materiál: {state[row.materialState]}; technika: {state[row.techniqueState]}
    {(row.materialState!=='EXACT_MATCH'||row.techniqueState!=='EXACT_MATCH')&&<p className="professional-state" data-testid="mattech-reference-review">REVIEW_REQUIRED — slovníková vazba není jednoznačně doložena.</p>}
    <details><summary>Doklad MatTech</summary><dl><dt>Identita záznamu</dt><dd>{row.recordId}</dd><dt>Výskyt</dt><dd>{row.occurrence}</dd><dt>Hash řádku</dt><dd>{row.rowHash}</dd><dt>Hash zdroje</dt><dd>{row.sourceSha256}</dd></dl></details>
   </td></tr>)}</tbody></table></div>
  {next!==null&&<button type="button" disabled={task.busy} onClick={()=>load(next)}>Další MatTech</button>}
 </section>;
}
