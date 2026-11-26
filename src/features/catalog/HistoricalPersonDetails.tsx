import DictionaryProfessionalFields from './DictionaryProfessionalFields';
import {useState} from 'react';
import {useHistoricalRows} from './useHistoricalRows';
import {historicalStateLabel,historicalText,type HistoricalTable} from './historicalContract';
/** Original person fields only through the item's recorded source relationships. */
export default function HistoricalPersonDetails({itemId,etag}:{itemId:number;etag?:string}){
 const [open,setOpen]=useState(false);
 return <details onToggle={e=>setOpen(e.currentTarget.open)}><summary>Údaje o autorovi</summary>{open&&<><p>Osobnosti doložené u předmětu a na kartě Vznik. Údaje včetně nepřesných dat zůstávají doslovné. Shoda jména není dokladem vazby.</p><Roots itemId={itemId} etag={etag} table="Sbirky"/><Roots itemId={itemId} etag={etag} table="Vznik"/></>}</details>;
}
function Roots({itemId,etag,table}:{itemId:number;etag?:string;table:HistoricalTable}){
 const {enabled,page,more}=useHistoricalRows(itemId,table,etag);
 if(!enabled)return <p>Podrobnosti osobnosti nejsou dostupné pro aktuální verzi předmětu.</p>;
 return <section aria-label={table==='Sbirky'?'Hlavní autor':'Osobnosti na kartě Vznik'}>{page?.error&&<p role="alert">{page.error}</p>}{page&&page.state!=='AVAILABLE'&&<p role="status">{historicalStateLabel(page.state)}</p>}{page?.items.map(row=><Related key={row.recordId} itemId={itemId} etag={etag} table={table} recordId={row.recordId}/>)}{page?.nextAfterId&&<button data-scoped-read type="button" disabled={page.pending} onClick={more}>Další záznamy osob</button>}</section>;
}
function Related({itemId,etag,table,recordId}:{itemId:number;etag?:string;table:HistoricalTable;recordId:string}){
 const {page,more}=useHistoricalRows(itemId,table,etag,recordId);
 const people=page?.items.filter(row=>row.relatedTable==='Osobnosti'&&row.parentRecordId===recordId)??[];
 return <>{page?.error&&<p role="alert">{page.error}</p>}{page&&page.state!=='AVAILABLE'&&<p role="status">{historicalStateLabel(page.state)}</p>}{people.map(person=><article key={`${person.relationshipId}:${person.recordId}`}><h4>{String((person.fields.Jmeno_OS as {value?:unknown}|undefined)?.value??'Osobnost')}</h4><p>{person.matchingRecords==='1'?'Doložená zdrojová vazba':`Nejednoznačná zdrojová vazba (${person.matchingRecords} kandidátů); osoby nebyly sloučeny.`}</p><DictionaryProfessionalFields type="AUTHOR" fields={person.fields}/></article>)}{page?.state==='AVAILABLE'&&!page.nextAfterId&&!people.length&&<p>V tomto výřezu nebyla doložena přímá vazba na Osobnosti. Shoda jména ji nenahrazuje.</p>}{page?.nextAfterId&&<button data-scoped-read type="button" disabled={page.pending} onClick={more}>Další doložené osobnosti</button>}</>;
}
