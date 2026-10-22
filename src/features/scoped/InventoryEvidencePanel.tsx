import { useState } from 'react';
import { type InventoryEvidence, type ScopedApi } from './scopedApi';
import { useTask } from './useTask';
const labels:Record<string,string>={series:'Řada',ordinal:'Pořadové číslo',division:'Lomení',hierarchyOrdinal:'Hierarchické pořadí',hierarchyDivision:'Hierarchické lomení',stateCode:'Stát',custodianCode:'Správce',departmentCode:'Oddělení',collectionCode:'Podsbírka'};
export default function InventoryEvidencePanel({api,itemId,onFatal}:{api:ScopedApi;itemId:number;onFatal:(status:number)=>void}) {
    const [data,setData]=useState<InventoryEvidence|null>(null);const task=useTask(onFatal);
    const load=(after?:string)=>void task.run(s=>api.inventoryEvidence(itemId,s,after),result=>{
        if(after&&data&&data.itemVersion!==result.itemVersion){setData(null);task.setError('Inventární evidence se změnila. Načtěte ji znovu od začátku.');return;}
        setData(old=>after&&old?{...result,aliases:[...old.aliases,...result.aliases]}:result);
    });
    return <section aria-label="Inventární souvislosti"><h3>Inventární souvislosti</h3>
        <button type="button" disabled={task.busy} onClick={()=>load()}>Načíst inventární souvislosti</button>
        {task.error&&<p role="alert">{task.error}</p>}
        {data&&<><p>Pouze pro čtení. Místní zdrojové ID není globální identita ani potvrzení autoritativního zdroje.</p>
            <dl><dt>Zdrojové místní ID</dt><dd className="scoped-exact" data-testid="source-local-id">{data.sourceLocalId??'Neuvedeno'}</dd>
                <dt>Zdrojové inventární číslo</dt><dd className="scoped-exact">{data.sourceInventoryNumber??'Neuvedeno'}</dd></dl>
            <dl>{Object.entries(data.sourceComponents).map(([key,value])=><div key={key}><dt>{labels[key]}</dt><dd className="scoped-exact">{value??'Neuvedeno'}</dd></div>)}</dl>
            <h4>Historické aliasy</h4>{!data.aliases.length&&<p>Žádné dostupné aliasy.</p>}
            <ul>{data.aliases.map(alias=><li key={alias.id}><span className="scoped-exact" data-testid="inventory-alias">{alias.inventoryNumber??'Neuvedeno'}</span>
                <dl>{Object.entries(alias.components).filter(([,v])=>v!==null).map(([key,value])=><div key={key}><dt>{labels[key]}</dt><dd className="scoped-exact">{value}</dd></div>)}</dl></li>)}</ul>
            {data.nextAfterId&&<button type="button" disabled={task.busy} onClick={()=>load(data.nextAfterId!)}>Další aliasy</button>}</>}
    </section>;
}
