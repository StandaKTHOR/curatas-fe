import {useEffect,useState} from 'react';
import type {ScopedApi} from '../scoped/scopedApi';
import {useTask} from '../scoped/useTask';

/** Existing exact-decimal curator contract, distinct from historical FLOAT_BITS rows. */
export default function CurrentMeasurementRead({api,itemId,onFatal}:{api:ScopedApi;itemId:number;onFatal:(status:number)=>void}){
 const [value,setValue]=useState<{label:string|null;decimalText:string|null;unit:string|null}|null>(null),[loaded,setLoaded]=useState(false);
 const {run,busy,error}=useTask(onFatal);
 useEffect(()=>{setLoaded(false);setValue(null);if(api.curatorMeasurement)void run(s=>api.curatorMeasurement!(itemId,s),r=>{setValue(r.value);setLoaded(true);});},[api,itemId,run]);
 return <section className="demus-source-panel" aria-label="Současné kurátorské měření"><h3>Současné kurátorské měření</h3>
  {busy&&<p role="status">Načítání současného měření…</p>}{error&&<p role="alert">{error}</p>}
  {loaded&&(value?<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">{([['label','Označení'],['decimalText','Přesná desetinná hodnota'],['unit','Jednotka']] as const).map(([key,label])=><label className="space-y-1" key={key}>{label}<input type="text" readOnly value={value[key]??''}/>{value[key]===null&&<span>NULL</span>}</label>)}</div>:<p>V tomto kurátorském kontraktu není současné měření zadáno. Zdrojové míry tím nejsou dotčeny.</p>)}
 </section>;
}
