import {useHistoricalRows} from './useHistoricalRows';
import {historicalStateLabel,historicalText} from './historicalContract';
import {HistoricalLineage} from './HistoricalRows';
/** Each row is an original assertion, including compound text, order and note. No dictionary expansion. */
export default function HistoricalMatTechAssertion({itemId,etag}:{itemId:number;etag?:string}){
 const {enabled,page,more}=useHistoricalRows(itemId,'MatTech',etag);if(!enabled)return null;
 return <section className="demus-source-panel" aria-label="Původní společné záznamy MatTech"><h3>Původní materiál a technika DEMUS</h3>
 {!page&&<p role="status">Načítání původních záznamů…</p>}{page?.error&&<p role="alert">{page.error}</p>}{page&&page.state!=='AVAILABLE'&&<p role="status">{historicalStateLabel(page.state)}</p>}
 <div className="table-responsive"><table className="demus-datasheet" aria-label="Původní společný zápis MatTech"><thead><tr><th>Pořadí</th><th>Materiál</th><th>Technika</th><th>Poznámka</th><th>Zdroj</th></tr></thead><tbody>
 {page?.items.map(row=><tr key={row.recordId} data-original-mattech-record={row.recordId}>{['Poradi_MT','Material_MT','Technika_MT','Pozn_MT'].map(field=><td key={field} data-original-mattech-field={field} style={{whiteSpace:'pre-wrap'}}>{(['TEXT','INTEGER'].includes(row.fields[field]?.kind)?String(row.fields[field].value):historicalText(row.fields[field]))}</td>)}<td><HistoricalLineage row={row} table="MatTech" itemId={itemId} etag={etag}/></td></tr>)}
 </tbody></table></div>{page?.state==='AVAILABLE'&&!page.items.length&&<p>Pro doloženou zdrojovou vazbu nejsou samostatné záznamy MatTech.</p>}
 {page?.nextAfterId&&<button type="button" onClick={more} disabled={page.pending}>Další původní záznamy MatTech</button>}</section>;
}
