import {HistoricalTable,HistoricalRoot} from './HistoricalRows';
import {historicalEnabled} from './useHistoricalRows';
import {professionalFields} from '../../lib/professional';
import {useEffect,useMemo,useState} from 'react';
import {useCatalog} from './CatalogContext';
import {useAuth} from '../../components/AuthContext';
import {scopedApi,type InventoryEvidence} from '../scoped/scopedApi';
import SourceDimensionsPanel from '../scoped/SourceDimensionsPanel';
import SourceMatTechPanel from '../scoped/SourceMatTechPanel';
import SourceSummaryPanel from '../scoped/SourceSummaryPanel';
import CatalogAuditViewer from './CatalogAuditViewer';
import {originalInventorySource} from './originalAdapter';
import {inventoryColumns,inventoryDisplay} from '../scoped/scopedApi';
import CurrentMeasurementRead from './CurrentMeasurementRead';
import {originalCanEdit,originalEditHref} from './originalEdit';
import {useLocation,useNavigate} from 'react-router-dom';

export function denyOriginalAccess(status:number){if([401,403,404].includes(status))window.dispatchEvent(new CustomEvent('curatas:scoped-denied',{detail:{status}}));}
/** Source evidence stays inside the matching original tab, outside the current form. */
export default function OriginalSourceBridge({itemId,section,etag}:{itemId:number;section:string;etag?:string}){
 const {token}=useAuth(),{selectedCatalog}=useCatalog();
 const navigate=useNavigate();
 const location=useLocation();
 const api=useMemo(()=>selectedCatalog&&token?scopedApi(selectedCatalog.id,token):null,[selectedCatalog,token]);
 const [evidence,setEvidence]=useState<InventoryEvidence|null>(null),[error,setError]=useState('');
 const [projection,setProjection]=useState<Record<string,string|null>|null>(null),[projectionState,setProjectionState]=useState('');
 useEffect(()=>{setEvidence(null);setProjection(null);setProjectionState('');setError('');if(!api||section!=='identity')return;const c=new AbortController();
  void api.inventoryEvidence(itemId,c.signal).then(async r=>{if(c.signal.aborted)return;setEvidence(r);
   const p=await originalInventorySource(itemId,r.itemVersion,selectedCatalog!.id);if(!c.signal.aborted){setProjection(p.fields);setProjectionState(p.state);}
  }).catch(e=>{if(!c.signal.aborted)setError(e.message);});return()=>c.abort();
 },[api,itemId,section,selectedCatalog]);
 if(!api)return null;
 if(section==='audit')return selectedCatalog!.capabilities?.includes('catalog.audit.read')?<CatalogAuditViewer catalogId={selectedCatalog!.id} token={token} onDenied={()=>denyOriginalAccess(403)}/>:<p role="status">Tento účet nemá oprávnění catalog.audit.read. Nepřístupný audit není prázdná historie.</p>;
 if(section==='dimensions')return <><CurrentMeasurementRead api={api} itemId={itemId} onFatal={denyOriginalAccess}/><SourceDimensionsPanel api={api} itemId={itemId} onFatal={denyOriginalAccess}/>{historicalEnabled()&&<HistoricalTable itemId={itemId} table="Miry" etag={etag} fields={[["Rozmer_MR","Rozměr"],["Mira_MR","Míra — původní typ"],["Jedn_MR","Jednotka"],["Pozn_MR","Poznámka"],["Poradi_MR","Pořadí"]]}/>}</>;
 if(section==='description')return <><SourceMatTechPanel api={api} itemId={itemId} onFatal={denyOriginalAccess}/>{historicalEnabled()&&<HistoricalTable itemId={itemId} table="MatTech" etag={etag} fields={professionalFields.MATERIAL_TECHNIQUE}/>}</>;
 if(section==='provenance'&&historicalEnabled())return <><HistoricalTable itemId={itemId} table="Sbirky" etag={etag} fields={[["PrirC_S","Původní přírůstkový příznak"],["ZpAkv_S","Způsob akvizice — DEMUS kód"],["DatAkv_S","Datum akvizice DEMUS"],["CDoklAkv_S","Doklad"],["PredMajSlovy_S","Předchozí vlastník"],["Okolnosti_S","Okolnosti"]]}/><HistoricalTable itemId={itemId} table="Akvizice" etag={etag} fields={[["PrirC_AQ","Přírůstkové číslo"],["DatAkv_AQ","Datum akvizice"],["ZpAkv_AQ","Způsob akvizice — DEMUS kód"],["PredMajSlovy_AQ","Předchozí vlastník"],["Okolnosti_AQ","Okolnosti"],["CDoklAkv_AQ","Doklad"],["Vzkaz_AQ","Vzkaz"],["Poradi_AQ","Pořadí"]]}/></>;
 if(section==='storage'&&historicalEnabled())return <HistoricalTable itemId={itemId} table="Sbirky" etag={etag} fields={[["StLokace_S","Původní stálá lokace"],["AktLokace_S","Původní aktuální lokace"]]}/>;
 if(section!=='identity')return null;
 const labels:Record<string,string>={series:'Řada',ordinal:'Pořadové číslo',division:'Lomení',hierarchyOrdinal:'Hlavní pořadové číslo',hierarchyDivision:'Hlavní lomení',stateCode:'Stát správce',custodianCode:'Instituce',departmentCode:'Oddělení',collectionCode:'Podsbírka (kód)'};
 return <section className="demus-inventory-panel border border-gray-200 px-2 py-1 text-xs" aria-label="Původní identifikace DEMUS"><div className="flex items-center justify-between gap-2"><h2 className="font-semibold">Inventární číslo – složky DEMUS</h2>{!location.pathname.includes('/edit/')&&originalCanEdit('inventory')&&<button type="button" className="underline" onClick={()=>navigate(originalEditHref(itemId,'inventory'))}>Upravit současné inventární údaje</button>}</div>
  {error&&<p role="alert">{error}</p>}{!error&&!evidence&&<p role="status">Načítání zdrojové identity…</p>}
  {evidence&&<><div className="demus-inventory-components" aria-label="Historické zdrojové složky">
   {Object.entries(evidence.sourceComponents).map(([key,value])=><div key={key}><label className="block text-gray-600">{labels[key]??key}</label><span className="whitespace-pre-wrap font-mono">{value===null?'—':value===''?'Prázdný řetězec':value}</span></div>)}</div>
   <details className="mt-2"><summary>Původní identifikace a odborné údaje DEMUS</summary><p>Historický zdroj — nikoli současné kurátorské tvrzení. NULL v projekci neprokazuje chybějící raw údaje.</p><SourceSummaryPanel api={api} itemId={itemId} onFatal={denyOriginalAccess}/>
   <dl className="demus-evidence-grid"><div><dt>Původní inventární číslo</dt><dd>{evidence.sourceInventoryNumber??'NULL v projekci'}</dd></div><div><dt>Původní lokální ID</dt><dd>{evidence.sourceLocalId??'NULL v projekci'}</dd></div></dl>
   {projection?<dl className="demus-evidence-grid" aria-label="Původní inventární projekce">{Object.entries(inventoryColumns).map(([key,label])=><div key={key}><dt>{label} ({key})</dt><dd className="whitespace-pre-wrap">{projection[key]===null?'NULL v projekci':projection[key]===''?'Prázdný řetězec':inventoryDisplay(key,projection[key])}</dd></div>)}</dl>:<p role="status">{projectionState?'Zdrojová projekce není dostupná. Nejde o důkaz prázdného zdroje.':'Načítání původní inventární projekce…'}</p>}
   <HistoricalRoot itemId={itemId} etag={etag??`"${evidence.itemVersion}"`}/>
   {historicalEnabled()&&<HistoricalTable itemId={itemId} table="InvCisla" etag={etag??`"${evidence.itemVersion}"`} fields={[["InvC_IC","Inventární číslo DEMUS"],["Prefix_IC","Prefix"],["Sluz_IC","Původní služební údaj"]]}/>}
   <p>Historická označení: {evidence.aliases.length}{evidence.nextAfterId!==null?' (další dostupná)':''}</p>
   <ul>{evidence.aliases.map(a=><li key={a.id}>{a.inventoryNumber??'NULL v projekci'}</li>)}</ul></details>
  </>}
 </section>;
}
