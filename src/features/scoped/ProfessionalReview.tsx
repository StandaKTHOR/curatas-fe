import type {SourceDimension} from './scopedApi';

const labels:Record<string,string>={
 PROFESSIONAL_SEMANTICS_UNCONFIRMED:'Odborný význam čeká na potvrzení CITEM.',
 SOURCE_ORDER_MISSING:'Pořadí nebylo uvedeno; není doplněno odhadem.',
 UNIT_MISSING:'Jednotka nebyla uvedena; není doplněna výchozí jednotka.',
 TYPE_REFERENCE_MISSING:'Chybí přesná vazba na zdrojový číselník.',
 TYPE_REFERENCE_AMBIGUOUS:'Zdrojový číselník nemá jednoznačnou vazbu.',
 ORIGINAL_DECIMAL_FORMAT_UNKNOWN:'Bity jsou zachovány; původní desetinný formát není doložen.',
 NUMBER_REVIEW_REQUIRED:'Číselná reprezentace vyžaduje posouzení.',
};
export function DimensionReview({row}:{row:SourceDimension}){
 // Older compatible servers need the same conservative review state, never silent approval.
 const reasons=row.reviewReasons??[
  'PROFESSIONAL_SEMANTICS_UNCONFIRMED',
  ...(row.sourceOrder===null?['SOURCE_ORDER_MISSING']:[]),
  ...(row.unit===null?['UNIT_MISSING']:[]),
  ...(row.dictionaryState!=='EXACT_MATCH'?[`TYPE_REFERENCE_${row.dictionaryState}`]:[]),
  ...(row.number.bitPattern!==null?['ORIGINAL_DECIMAL_FORMAT_UNKNOWN']:[]),
  ...(row.number.status.includes('REVIEW_REQUIRED')?['NUMBER_REVIEW_REQUIRED']:[]),
 ];
 return <details className="professional-review"><summary>REVIEW_REQUIRED — odborné posouzení</summary><ul>{reasons.map(reason=><li key={reason}>{labels[reason]}</li>)}</ul></details>;
}

/** Honest independent panel boundary until a source-qualified MatTech contract is approved. */
export function MatTechReadiness(){
 return <section aria-label="MatTech — stav odborné evidence"><h3>MatTech — materiál a technika</h3>
  <p role="status">REVIEW_REQUIRED — odborná interpretace čeká na potvrzení CITEM.</p>
  <p>Zdrojové čtení materiálu a techniky není v tomto zobrazení zpřístupněno. Převod na potvrzené muzejní číselníky čeká na schválení.</p>
  <p>Prázdný panel neznamená, že předmět nemá materiál nebo techniku.</p>
 </section>;
}
