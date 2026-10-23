import {useState} from 'react';
import {type ItemOrigin,type ScopedApi} from './scopedApi';
import {useTask} from './useTask';
export default function ItemOriginPanel({api,itemId,onFatal}:{api:ScopedApi;itemId:number;onFatal:(s:number)=>void}){
 const [origin,setOrigin]=useState<ItemOrigin|null>(null);const task=useTask(onFatal);
 if(!api.itemOrigin)return null;
 return <section aria-label="Původ předmětu"><button type="button" disabled={task.busy} onClick={()=>void task.run(s=>api.itemOrigin!(itemId,s),setOrigin)}>Zjistit původ záznamu</button>
  {origin&&<p data-testid="item-origin">{origin.origin==='MES_CREATED'?`Nový MESonline záznam, vytvořen ${origin.createdAt}.`:'Původ vytvoření není zaznamenán. Nelze z toho odvodit historický DEMUS import.'}</p>}
  {task.error&&<p role="alert">{task.error}</p>}
 </section>;
}
