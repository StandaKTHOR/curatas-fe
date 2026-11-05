import {useState} from 'react';
import DemusLegacyDataView from '../../components/DemusLegacyDataView';
import {historicalText,historicalFieldLines,historicalStateLabel,type HistoricalRow,type HistoricalTable} from './historicalContract';
import {useHistoricalRows,historicalEnabled} from './useHistoricalRows';

export function HistoricalLineage({row,table,itemId,etag}:{row:HistoricalRow;table:HistoricalTable;itemId?:number;etag?:string}){
 const [open,setOpen]=useState(false);
 return <details onToggle={e=>setOpen(e.currentTarget.open)}><summary>Všechna původní pole DEMUS</summary><p>Zdroj SHA-256: {row.sourceSha256} · řádek {row.recordId} · hash {row.rowHash} · výskyt {row.occurrence} · rodič {row.parentRecordId} · vazba {row.parentField}</p><pre>{historicalFieldLines(row.fields)+'\n\n'+JSON.stringify(row.fields,null,2)}</pre>{open&&<HistoricalRelations itemId={itemId} table={table} row={row} etag={etag}/>}</details>;
}
function HistoricalRelations({row,table,itemId,etag}:{row:HistoricalRow;table:HistoricalTable;itemId?:number;etag?:string}){
 const {page,more}=useHistoricalRows(itemId,table,etag,row.recordId);
 return <><p>Doložené zdrojové autority a bibliografické vazby DEMUS — nikoli současná číselníková ID.</p>{page?.error&&<p role="alert">{page.error}</p>}{!page&&<p role="status">Načítání zdrojových vazeb…</p>}{page?.state==='REVIEW_REQUIRED_DEPTH_LIMIT'&&<p role="status">Řetězec zdrojových vazeb dosáhl bezpečného limitu. Zobrazený výřez není úplný; vyžaduje další ověření.</p>}{page?.state==='SOURCE_ROW_UNAVAILABLE'&&<p role="status">Zdrojové přiřazení řádku nebylo doloženo. Nejde o důkaz chybějících historických autorit.</p>}
 {page?.items.map(r=><details key={`${r.relationshipId}:${r.parentRecordId}:${r.recordId}`}><summary>DEMUS {r.relatedTable} · {r.matchingRecords==='1'?'Přesná zdrojová vazba':`Nejednoznačná vazba — ${r.matchingRecords} kandidátů`}</summary><p>Vztah {r.relationshipId} · zdroj {r.sourceSha256} · hash {r.rowHash} · výskyt {r.occurrence} · cesta {r.sourcePath?.join(' → ')}</p><pre>{historicalFieldLines(r.fields)+'\n\n'+JSON.stringify(r.fields,null,2)}</pre></details>)}
 {page?.state==='AVAILABLE'&&!page.items.length&&<p>V tomto zdrojovém výřezu nebyla nalezena přesná doložená vazba. Text nebyl automaticky přiřazen k autoritě.</p>}{page?.nextAfterId&&<a href="#demus-relations-next" className="underline" aria-disabled={page.pending} onClick={e=>{e.preventDefault();more();}}>Další zdrojové vazby DEMUS</a>}</>;
}
export function HistoricalTableRows({itemId,table,etag,fields}:{itemId?:number;table:HistoricalTable;etag?:string;fields:readonly [string,string][]}){
 const {enabled,page,more}=useHistoricalRows(itemId,table,etag);if(!enabled)return null;
 return <>{(!page||page.error||page.state!=='AVAILABLE')&&<tr><td colSpan={fields.length+2} role={page?.error?'alert':'status'}>{page?.error||(!page?'Načítání historických řádků DEMUS…':`DEMUS: ${historicalStateLabel(page.state)} Nejde o důkaz prázdné historické evidence.`)}</td></tr>}
 {page?.items.map(row=><tr key={row.recordId}><td><strong>DEMUS {table} · {row.occurrence}</strong><HistoricalLineage row={row} table={table} itemId={itemId} etag={etag}/></td>{fields.map(([field])=><td key={field}>{historicalText(row.fields[field])}</td>)}<td>Pouze čtení DEMUS</td></tr>)}
 {page?.state==='AVAILABLE'&&page.items.length===0&&<tr><td colSpan={fields.length+2}>Pro doloženou zdrojovou vazbu nejsou historické řádky DEMUS.</td></tr>}
 {page?.nextAfterId&&<tr><td colSpan={fields.length+2}><a href="#demus-next" aria-disabled={page.pending} onClick={e=>{e.preventDefault();more();}} className="underline">{page.pending?'Načítání…':'Další historické záznamy DEMUS'}</a></td></tr>}</>;
}
export function HistoricalTable({itemId,table,etag,fields}:{itemId:number;table:HistoricalTable;etag?:string;fields:readonly [string,string][]}){
 if(!historicalEnabled())return null;
 return <div className="overflow-x-auto"><table className="demus-datasheet" aria-label={`Historické záznamy DEMUS ${table}`}><thead><tr><th>Záznam / zdroj</th>{fields.map(([key,label])=><th key={key}>{label}</th>)}<th>Akce</th></tr></thead><tbody><HistoricalTableRows itemId={itemId} table={table} etag={etag} fields={fields}/></tbody></table></div>;
}
export function HistoricalRoot({itemId,etag}:{itemId?:number;etag?:string}){
 const {enabled,page}=useHistoricalRows(itemId,'Sbirky',etag);if(!enabled)return null;
 return <DemusLegacyDataView title="DEMUS — všechna původní pole Sbirky / Plus / Sluz" legacyData={page?.state==='AVAILABLE'&&page.items.length?Object.fromEntries(page.items.map(row=>[row.recordId,{sourceSha256:row.sourceSha256,rowHash:row.rowHash,occurrence:row.occurrence,parentRecordId:row.parentRecordId,fields:row.fields}])):null} unavailableMessage={page?.error||(!page?'Načítání úplných historických polí DEMUS…':`DEMUS: ${historicalStateLabel(page.state)} Prázdná odpověď neprokazuje neexistenci původních údajů.`)}/>;
}
