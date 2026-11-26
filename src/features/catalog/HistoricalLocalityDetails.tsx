import TechnicalDemus from './TechnicalDemus';
import {useState} from 'react';
import {useHistoricalRows} from './useHistoricalRows';
import {historicalCuratorText as historicalText,historicalStateLabel} from './historicalContract';
/** Immutable locality evidence through declared relationships, never a name-based match. */
export default function HistoricalLocalityDetails({itemId,etag}:{itemId:number;etag?:string}){
 const [open,setOpen]=useState(false);
 return <details onToggle={e=>setOpen(e.currentTarget.open)}><summary>Historické údaje lokality DEMUS</summary>{open&&<Roots itemId={itemId} etag={etag}/>}</details>;
}
function Roots({itemId,etag}:{itemId:number;etag?:string}){
 const {enabled,page,more}=useHistoricalRows(itemId,'Sbirky',etag);
 if(!enabled)return <p>Historické čtení není v tomto katalogu dostupné.</p>;
 return <section aria-label="Původní lokality DEMUS"><p>Pouze doložené zdrojové vazby. Tyto hodnoty se nekopírují do současné lokality ani do souřadnic předmětu.</p>{!page&&<p role="status">Načítání historické identity…</p>}{page?.error&&<p role="alert">{page.error}</p>}{page&&page.state!=='AVAILABLE'&&<p role="status">{historicalStateLabel(page.state)}</p>}{page?.items.map(row=><Related key={row.recordId} itemId={itemId} etag={etag} recordId={row.recordId}/>)}{page?.nextAfterId&&<button type="button" onClick={more} disabled={page.pending}>Další historické identity lokality</button>}</section>;
}
function Related({itemId,etag,recordId}:{itemId:number;etag?:string;recordId:string}){
 const {page,more}=useHistoricalRows(itemId,'Sbirky',etag,recordId);
 const localities=page?.items.filter(r=>r.relatedTable==='Lokality'&&r.parentRecordId===recordId)??[];
 const ids=new Set(localities.map(r=>r.recordId));
 const rows=page?.items.filter(r=>ids.has(r.recordId)||r.sourcePath?.some(id=>ids.has(id)))??[];
 return <>{!page&&<p role="status">Načítání doložené lokality…</p>}{page?.error&&<p role="alert">{page.error}</p>}{page?.state==='REVIEW_REQUIRED_DEPTH_LIMIT'&&<p role="status">Zdrojová cesta dosáhla bezpečného limitu. Výřez není úplný.</p>}{page?.state==='SOURCE_ROW_UNAVAILABLE'&&<p role="status">Zdrojová vazba nebyla doložena; nejde o důkaz chybějící lokality.</p>}{rows.map(r=><article key={r.relationshipId+':'+r.parentRecordId+':'+r.recordId}><h4>DEMUS — {r.relatedTable}</h4><p>{r.matchingRecords==='1'?'Přesná zdrojová vazba':`Nejednoznačná vazba: ${r.matchingRecords} kandidátů — hodnoty nesloučeny`}</p><dl>{Object.entries(r.fields).map(([field,value])=><div key={field}><dt>{field.replace(/_[A-Z]+$/,'')}</dt><dd data-locality-source-field={field}>{historicalText(value)}</dd></div>)}</dl><TechnicalDemus title="Doklad vazby lokality"><p>Zdroj {r.sourceSha256} · řádek {r.recordId} · hash {r.rowHash} · cesta {r.sourcePath?.join(' → ')}</p></TechnicalDemus></article>)}{page?.state==='AVAILABLE'&&!page.nextAfterId&&!localities.length&&<p>V tomto doloženém výřezu není nalezena vazba na Lokality. Název ani souřadnice nebyly odhadnuty.</p>}{page?.nextAfterId&&<button type="button" disabled={page.pending} onClick={more}>Další zdrojové údaje lokality</button>}</>;
}
