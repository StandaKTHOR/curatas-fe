import {useState} from 'react';
import {decimal,type Dimension,type ScopedApi} from './scopedApi';
import {useTask} from './useTask';
import {useDraftWarning} from './useDraftWarning';
export default function DimensionBatchForm({api,itemId,etag,onSaved,onCancel,onFatal}:{api:ScopedApi;itemId:number;etag:string;onSaved:(tag:string)=>void;onCancel:()=>void;onFatal:(s:number)=>void}){
 const [rows,setRows]=useState([{type:'',value:'',unit:null as string|null}]);const [tag,setTag]=useState(etag);const [conflict,setConflict]=useState(false);const [compared,setCompared]=useState(false);
 const [serverRows,setServerRows]=useState<Dimension[]>([]);const [more,setMore]=useState(false);
 const [cursor,setCursor]=useState<number|null>(null);
 const task=useTask(onFatal);useDraftWarning(rows.some(r=>r.type||r.value||r.unit!==null));
 const change=(n:number,key:'type'|'value'|'unit',value:string|null)=>setRows(old=>old.map((r,i)=>i===n?{...r,[key]:value}:r));
 function save(){try{rows.forEach(r=>{if(!r.type.trim()||r.type.length>255)throw new Error('Vyplňte typ každého rozměru.');decimal(r.value);});}
  catch(e){task.setError(e instanceof Error?e.message:'Neplatné rozměry.');return;}
  if(!api.createDimensionsBatch)return;
  void task.run(s=>api.createDimensionsBatch!(itemId,tag,rows,s),result=>onSaved(result.etag),true,()=>{setConflict(true);setCompared(false);});
 }
 return <form aria-label="Hromadné pořízení rozměrů" onSubmit={e=>{e.preventDefault();save();}}>
  <h4>Pořídit více rozměrů současně</h4><p>Jeden až dvacet nových rozměrů v jedné transakci. Historické rozměry se nemění; jednotky se nepřevádějí.</p>
  {rows.map((row,n)=><fieldset key={n} disabled={task.busy}><legend>Rozměr {n+1}</legend>
   <label>Typ rozměru {n+1}<input required maxLength={255} value={row.type} onChange={e=>change(n,'type',e.target.value)}/></label>
   <label>Hodnota rozměru {n+1}<input required inputMode="decimal" value={row.value} onChange={e=>change(n,'value',e.target.value)}/></label>
   <label>Jednotka rozměru {n+1}<input maxLength={255} value={row.unit??''} onChange={e=>change(n,'unit',e.target.value)}/></label>
   <label><input type="checkbox" checked={row.unit===null} onChange={e=>change(n,'unit',e.target.checked?null:'')}/>Jednotka neuvedena u rozměru {n+1}</label>
   {rows.length>1&&<button type="button" onClick={()=>setRows(old=>old.filter((_,i)=>i!==n))}>Odebrat řádek {n+1}</button>}
  </fieldset>)}
  <button type="button" disabled={task.busy||rows.length>=20} onClick={()=>setRows(old=>[...old,{type:'',value:'',unit:null}])}>+ Další rozměr</button>
  <button disabled={task.busy||conflict}>Uložit všechny rozměry</button>
  <button type="button" disabled={task.busy} onClick={()=>{if(window.confirm('Zahodit nové neuložené rozměry?'))onCancel();}}>Zrušit více rozměrů</button>
  {task.error&&<p role="alert">{task.error}</p>}
  {conflict&&<div role="status"><p>Řádky zůstaly zachovány. Zápis se neopakuje automaticky. Porovnejte celý seznam, zda se předchozí pokus již neuložil.</p>
   <button type="button" disabled={task.busy} onClick={()=>void task.run(s=>api.dimensions(itemId,s),result=>{setTag(result.etag);setServerRows(result.value.items);setCursor(result.value.nextAfterId);setMore(result.value.nextAfterId!==null);setCompared(true);})}>Načíst rozměry pro porovnání dávky</button>
   {compared&&<><ul aria-label="Serverové rozměry pro porovnání">{serverRows.map(row=><li key={row.id}>{row.type}: {row.value} {row.unit}</li>)}</ul>
    {more&&<><p>Další stránku je nutné ověřit před potvrzením porovnání.</p><button type="button" disabled={task.busy} onClick={()=>void task.run(s=>api.dimensions(itemId,s,cursor??0),result=>{
     if(result.etag!==tag){setCompared(false);setServerRows([]);task.setError('Verze se při stránkování změnila. Načtěte porovnání znovu.');return;}
     setServerRows(old=>[...old,...result.value.items]);setCursor(result.value.nextAfterId);setMore(result.value.nextAfterId!==null);
    })}>Další serverové rozměry pro porovnání</button></>}
    {!more&&<button type="button" onClick={()=>{setConflict(false);setCompared(false);}}>Potvrdit porovnání dávky</button>}</>}
  </div>}
 </form>;
}
