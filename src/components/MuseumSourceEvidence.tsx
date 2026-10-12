import {useState} from 'react';
import {getDemusLineage, type MuseumItemDetail, type LineagePage} from '../lib/api';

export const evidenceValue=(value:unknown)=>value==null?'—':typeof value==='boolean'?(value?'Ano':'Ne'):String(value);

export function LineageBrowser({category,id}:{category:'items'|'dictionaries'|'parties';id:number}) {
    const [page,setPage]=useState<LineagePage|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(false);
    const load=async(offset:number)=>{setLoading(true);setError('');try{setPage(await getDemusLineage(category,id,offset,20));}catch(e){setError((e as Error).message);}finally{setLoading(false);}};
    return <div className="demus-lineage">
        {!page && <button type="button" disabled={loading} onClick={()=>load(0)}>Otevřít zdrojovou historii</button>}
        {page && <><p>Zdrojová historie — výřez {page.offset+1} až {page.offset+page.records.length}; {page.hasMore?'další záznamy jsou dostupné':'konec výsledků API'}.</p>
            {page.records.map(row=><details key={row.sourceRecord}><summary>{row.sourceTable} · {row.sourceFiles?.join(', ')} · {row.sourceRecord}</summary>
                <dl><dt>Hash řádku</dt><dd>{row.rowHash}</dd><dt>Výskyt</dt><dd>{row.occurrence}</dd></dl>
                <pre className="overflow-auto">{JSON.stringify({nativePrimaryKey:row.nativePrimaryKey,typedValues:row.typedValues,roles:row.roles,outcomes:row.outcomes},null,2)}</pre>
            </details>)}
            <div className="flex gap-2"><button type="button" disabled={loading||page.offset===0} onClick={()=>load(Math.max(0,page.offset-page.limit))}>Předchozí výřez</button>
                <button type="button" disabled={loading||!page.hasMore} onClick={()=>load(page.offset+page.limit)}>Další výřez</button></div></>}
        {error && <p role="alert">{error}</p>}
    </div>;
}

export function SourceAcquisitionView({data}:{data?:MuseumItemDetail['sourceAcquisition']}) {
    return <section aria-label="Původní akvizice DEMUS" className="demus-source-panel">
        <h3>Původní akvizice — hlavní karta DEMUS</h3>
        <p>Historický kořenový důkaz; je oddělený od současných polí a jednotlivých akvizičních záznamů.</p>
        {data?<dl className="demus-evidence-grid">{([
            ['Způsob nabytí','acquisitionMethod'],['Původní datum nabytí','acquisitionDateRaw'],['Předchozí vlastník','acquiredFrom'],
            ['Číslo dokladu','documentNumber'],['Okolnosti','circumstances'],['Přírůstkový příznak (boolean)','accessionFlag'],
        ] as const).map(([label,key])=><div key={key}><dt>{label}</dt><dd>{evidenceValue(data[key])}</dd></div>)}</dl>
            :<p>API neposkytlo kořenovou akviziční evidenci.</p>}
    </section>;
}

export function VocabularyAssociations({data,itemId}:{data?:MuseumItemDetail['vocabularies'];itemId:number}) {
    return <section aria-label="Uložené číselníkové vazby" className="demus-source-panel">
        <h3>Skutečně uložené číselníkové vazby</h3><p>Zdrojové výřezy nejsou úplná historie. Neověřená vazba neznamená schválení kurátorem.</p>
        <div className="overflow-x-auto"><table className="demus-datasheet"><thead><tr><th>ID / typ</th><th>Kód</th><th>Label</th><th>Role</th><th>Původ vazby</th><th>Zdrojové důkazy</th></tr></thead>
            <tbody>{(data||[]).map((row,index)=><tr key={`${row.dictionaryId}-${index}`}><td>{row.dictionaryId} · {row.type}</td><td>{evidenceValue(row.code)}</td>
                <td>{evidenceValue(row.label)}</td><td>{evidenceValue(row.role)}</td>
                <td>{row.associationOrigin==='SOURCE_PROJECTED'?'Doložená převzatá vazba':row.associationOrigin==='CURRENT_OR_UNVERIFIED'?'Současná / neověřená vazba':row.associationOrigin}</td>
                <td><details><summary>Zdrojový výřez ({row.sourceRecords?.length||0}){row.hasMoreSourceRecords?' — neúplný':''}</summary>
                    <p>Zdroj číselníku: {evidenceValue(row.dictionarySourceRecord)}</p>
                    <ul>{(row.sourceRecords||[]).map(source=><li key={source}>{source}</li>)}</ul>
                    <LineageBrowser category="dictionaries" id={row.dictionaryId}/>
                </details></td></tr>)}</tbody>
        </table></div>
        {!data?.length && <p>Žádné doložené číselníkové vazby nebyly vráceny.</p>}
        <LineageBrowser category="items" id={itemId}/>
    </section>;
}
