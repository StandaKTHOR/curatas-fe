import {useEffect,useState} from 'react';
import {getDemusIdentity,type DemusIdentity} from '../lib/demusIdentity';
import {evidenceValue,LineageBrowser} from './MuseumSourceEvidence';

export function QuantityEvidence({sourceQuantity,quantity}:{sourceQuantity:number|null|undefined;quantity:number|null|undefined}) {
    const different=sourceQuantity!=null&&quantity!=null&&sourceQuantity!==quantity;
    return <div className="demus-quantity-evidence"><dl className="demus-evidence-grid">
        <div><dt>Současný katalogový počet</dt><dd>{evidenceValue(quantity)}</dd></div>
        <div><dt>Původní počet DEMUS (Pocet_S)</dt><dd>{evidenceValue(sourceQuantity)}</dd></div>
    </dl>{different&&<p role="status">Rozdíl zdroj / katalog: {sourceQuantity} / {quantity}. Hodnoty nejsou automaticky měněny; stav vyžaduje posouzení.</p>}
        <p>Současná hodnota sama o sobě nedokládá schválení kurátorem. Neznámé počty zůstávají neznámé.</p></div>;
}

export default function DemusSourceIdentity({itemId}:{itemId:number}) {
    const [data,setData]=useState<DemusIdentity|null>(null),[error,setError]=useState('');
    useEffect(()=>{let active=true;getDemusIdentity(itemId).then(value=>{if(active)setData(value);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[itemId]);
    if(!data)return <p role={error?'alert':'status'}>{error||'Načítám původní identitu DEMUS…'}</p>;
    return <section className="demus-source-panel" aria-label="Zdrojová identita a počty">
        <h3>Zdrojová identita DEMUS — pouze pro čtení</h3>
        <QuantityEvidence sourceQuantity={data.sourceQuantity} quantity={data.quantity}/>
        <dl className="demus-evidence-grid">{([
            ['Původní inventární číslo','sourceInventoryNumber'],['Řada','series'],['Pořadové číslo','ordinal'],['Lomení','division'],
            ['Stát správce','stateCode'],['Instituce','custodianCode'],['Oddělení','departmentCode'],['Původní lokální ID','sourceLocalId'],
            ['Nativní rok od','sourceDatingFromYear'],['Nativní rok do','sourceDatingToYear'],['Původní určení','determinedBy'],['Původní datum určení','determinedAtRaw'],
        ] as const).map(([label,key])=><div key={key}><dt>{label}</dt><dd>{evidenceValue(data[key])}</dd></div>)}</dl>
        <LineageBrowser category="items" id={itemId}/>
    </section>;
}
