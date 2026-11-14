import {useEffect,useState} from 'react';
import {type ScopedApi,type SourceSummary} from './scopedApi';
import {useTask} from './useTask';

export default function SourceSummaryPanel({api,itemId,onFatal}:{api:ScopedApi;itemId:number;onFatal:(status:number)=>void}){
    const [value,setValue]=useState<SourceSummary|null>(null);const {run,busy,error}=useTask(onFatal);
    useEffect(()=>{if(api.sourceSummary)void run(signal=>api.sourceSummary!(itemId,signal),setValue);},[api,itemId,run]);
    if(!api.sourceSummary)return null;
    return <section aria-label="Doložené údaje zdroje"><h3>Doložené údaje zdroje</h3>
        {busy&&<p role="status">Načítání údajů zdroje…</p>}{error&&<p role="alert">{error}</p>}
        {value&&<><dl><dt>Počet ve zdroji (Pocet_S)</dt><dd data-testid="source-quantity">{value.sourceQuantity??'Neuvedeno'}</dd>
            <dt>Přírůstkový příznak zdroje (PrirC_S)</dt><dd data-testid="source-accession-flag">{value.sourceAccessionFlag===null?'Neuvedeno':value.sourceAccessionFlag?'Ano':'Ne'}</dd></dl>
            <section aria-label="Identifikační kódy zdroje"><h4>Identifikační kódy zdroje — pouze čtení</h4><dl>
                <dt>Řada (Rada_S)</dt><dd className="whitespace-pre-wrap" data-testid="source-series">{value.sourceSeries??'Neuvedeno'}</dd>
                <dt>Kód oddělení (Odd_S)</dt><dd className="whitespace-pre-wrap" data-testid="source-department">{value.sourceDepartmentCode??'Neuvedeno'}</dd>
                <dt>Kód podsbírky (Podsb_S)</dt><dd className="whitespace-pre-wrap" data-testid="source-collection">{value.sourceCollectionCode??'Neuvedeno'}</dd>
                <dt>Zapsal (Zapsal_S) — původní text</dt><dd className="whitespace-pre-wrap" data-testid="source-recorded-by">{value.sourceRecordedBy??'Neuvedeno'}</dd>
                <dt>Určil (Urcil_S) — původní text</dt><dd className="whitespace-pre-wrap" data-testid="source-determined-by">{value.sourceDeterminedBy??'Neuvedeno'}</dd>
            </dl><p>Původní kódy bez automatického převodu na číselník nebo přiřazení vlastníka.</p></section></>}
        <p>Údaje jsou pouze ke čtení. Příznak není přírůstkové číslo.</p>
    </section>;
}
