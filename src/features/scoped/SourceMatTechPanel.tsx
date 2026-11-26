import TechnicalDemus from '../catalog/TechnicalDemus';
import {useEffect,useState} from 'react';
import type {ScopedApi,SourceMatTech} from './scopedApi';
import {useTask} from './useTask';
import type {MuseumRecord} from '../../lib/api';
const state={EXACT_MATCH:'Přesná vazba',MISSING:'Chybí přesná vazba',AMBIGUOUS:'Nejednoznačná vazba'};
export default function SourceMatTechPanel({api,itemId,onFatal,version,currentEnabled=true}:{api:ScopedApi;itemId:number;onFatal:(status:number)=>void;version?:string;currentEnabled?:boolean}){
 const [rows,setRows]=useState<SourceMatTech[]>([]),[next,setNext]=useState<number|null>(null),[etag,setEtag]=useState('');
 const [assigned,setAssigned]=useState<{material:number;technique:number}|null>(null);
 const task=useTask(onFatal),{run}=task;
 const read=async(signal:AbortSignal,offset=0)=>{
  const [source,current]=await Promise.all([api.sourceMatTech!(itemId,signal,offset),currentEnabled&&api.professionalRecords?api.professionalRecords(itemId,signal):Promise.resolve(null)]);
  if(current&&current.etag!==source.etag)throw new Error('Verze údajů MatTech se změnila. Obnovte kartu.');
  const owned:MuseumRecord[]|undefined=current?.items.filter((r:MuseumRecord)=>r.kind==='MATERIAL_TECHNIQUE');
  return {...source,assigned:owned?{material:owned.filter(r=>typeof r.payload.materialAuthorityId==='string'&&r.payload.materialAuthorityId).length,technique:owned.filter(r=>typeof r.payload.techniqueAuthorityId==='string'&&r.payload.techniqueAuthorityId).length}:null};
 };
 useEffect(()=>{setRows([]);setNext(null);setAssigned(null);if(api.sourceMatTech)void run(s=>read(s),r=>{setRows(r.value.items);setNext(r.value.nextOffset);setEtag(r.etag);setAssigned(r.assigned);});},[api,itemId,version,currentEnabled,run]);
 function load(offset=0){
  if(!api.sourceMatTech)return;
  if(!offset){setRows([]);setNext(null);setAssigned(null);}
  void run(s=>read(s,offset),r=>{
   if(offset&&r.etag!==etag){setRows([]);setNext(null);setAssigned(null);task.setError('Verze předmětu se změnila. Obnovte MatTech.');return;}
   setRows(old=>offset?[...old,...r.value.items]:r.value.items);setNext(r.value.nextOffset);setEtag(r.etag);setAssigned(r.assigned);
  },false,()=>{setRows([]);setNext(null);setAssigned(null);});
 }
 return <section aria-label="Zdrojový MatTech"><h3>MatTech — materiál a technika ve zdroji</h3>
  <TechnicalDemus title="Kontext převodu materiálů a technik"><p data-testid="mattech-current-status">{assigned?`Současná přiřazení automaticky načtena: materiály ${assigned.material}, techniky ${assigned.technique}. Hodnoty a úrovně jsou uvedeny v odborných řádcích níže; pro jejich načtení není nutný ruční výběr. `:'Současná přiřazení zatím nejsou ověřena. '}Původní texty DEMUS zůstávají samostatným podkladem. Počet současných vazeb není důkazem úplného převodu všech historických hodnot; nejednoznačné výjimky zůstávají k odbornému ověření. Chybějící pořadí není doplněno; při shodném pořadí rozhoduje identita archivu.</p></TechnicalDemus>
  <button type="button" disabled={task.busy} onClick={()=>load()}>Obnovit MatTech</button>
  {task.busy&&<p role="status">Načítání MatTech…</p>}{task.error&&<p role="alert">{task.error}</p>}
  {!task.busy&&!task.error&&!rows.length&&<p>MatTech není dostupný s jednoznačnou zdrojovou vazbou. To nedokládá nepřítomnost materiálu nebo techniky.</p>}
  <div className="table-responsive"><table className="demus-datasheet" aria-label="Zdrojový materiál a technika"><thead><tr><th scope="col">Pořadí zdroje</th><th scope="col">Materiál zdroje</th><th scope="col">Technika zdroje</th><th scope="col">Vazby a doklad</th></tr></thead>
   <tbody>{rows.map(row=><tr key={row.recordId} data-mattech-record={row.recordId}><td title="Původní Poradi_MT; odborný význam pořadí není potvrzen.">{row.sourceOrder??'Neuvedeno'}</td><td className="whitespace-pre-wrap" data-testid="source-material">{row.material??'Neuvedeno'}</td><td className="whitespace-pre-wrap" data-testid="source-technique">{row.technique??'Neuvedeno'}</td><td>Materiál: {state[row.materialState]}; technika: {state[row.techniqueState]}
    {((!!row.material?.trim()&&row.materialState!=='EXACT_MATCH')||(!!row.technique?.trim()&&row.techniqueState!=='EXACT_MATCH'))&&<p className="professional-state" data-testid="mattech-reference-review">Historické přiřazení vyžaduje odborné ověření. Současná přiřazení jsou uvedena samostatně.</p>}
    <TechnicalDemus title="Doklad MatTech"><dl><dt>Identita záznamu</dt><dd>{row.recordId}</dd><dt>Výskyt</dt><dd>{row.occurrence}</dd><dt>Hash řádku</dt><dd>{row.rowHash}</dd><dt>Hash zdroje</dt><dd>{row.sourceSha256}</dd></dl></TechnicalDemus>
   </td></tr>)}</tbody></table></div>
  {next!==null&&<button type="button" disabled={task.busy} onClick={()=>load(next)}>Další MatTech</button>}
 </section>;
}
