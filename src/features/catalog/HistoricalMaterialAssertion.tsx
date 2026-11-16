import TechnicalDemus from './TechnicalDemus';
import {useHistoricalRows} from './useHistoricalRows';
import HistoricalMatTechAssertion from './HistoricalMatTechAssertion';
import {historicalStateLabel} from './historicalContract';
/** One assertion per exact source row. Never split, trim, concatenate or promote to UUIDs. */
export default function HistoricalMaterialAssertion({itemId,etag}:{itemId:number;etag?:string}){
 const {enabled,page,more}=useHistoricalRows(itemId,'Sbirky',etag);if(!enabled)return null;
 return <><HistoricalMatTechAssertion itemId={itemId} etag={etag}/><section className="demus-source-panel" aria-label="Původní kombinovaný materiál DEMUS"><h3>Původní materiál DEMUS — zachovaný celý údaj</h3>{!page&&<p role="status">Načítání původního údaje…</p>}{page?.error&&<p role="alert">{page.error}</p>}{page&&page.state!=='AVAILABLE'&&<p role="status">{historicalStateLabel(page.state)}</p>}{page?.items.map(r=>{const value=r.fields.Material_S;return <article key={r.recordId} data-original-material-record={r.recordId}>{value?.kind==='TEXT'&&typeof value.value==='string'?<output style={{whiteSpace:'pre-wrap'}} aria-label="Původní text materiálu DEMUS">{value.value}</output>:<p>V tomto zdrojovém záznamu není text hlavního materiálu doložen. Samostatné záznamy MatTech nejsou slučovány.</p>}<TechnicalDemus title="Originální zdroj materiálu"><p>Sbirky · Material_S · {r.recordId} · zdroj {r.sourceSha256} · hash {r.rowHash} · výskyt {r.occurrence}</p></TechnicalDemus></article>;})}{page?.nextAfterId&&<button type="button" onClick={more} disabled={page.pending}>Další původní záznam materiálu</button>}<p>Současná odborná přiřazení jsou samostatně uvedená níže. Změna jednoho přiřazení nemění tento původní text.</p></section></>;
}
