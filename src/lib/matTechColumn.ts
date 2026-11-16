import type {MuseumRecord} from './api';
/** Display may reference a different row; editable payload always belongs to record alone. */
export function matTechColumn(rows:MuseumRecord[],record:MuseumRecord|null,payload:Record<string,unknown>,type:'MATERIAL'|'TECHNIQUE',enabled=true){
 const prefix=type==='MATERIAL'?'material':'technique',text=type==='MATERIAL'?'Material_MT':'Technika_MT';
 const belongs=(r:MuseumRecord)=>Boolean(r.payload[prefix+'AuthorityId']||r.payload[prefix+'HistoricalRef']||r.payload[text]||(type==='MATERIAL'?r.materialDictionaryId:r.techniqueDictionaryId));
 const editable=!enabled||!record||belongs(record);
 const source=editable?record:rows.find(r=>r.kind==='MATERIAL_TECHNIQUE'&&!r.sourceTable&&belongs(r))??null;
 return {editable,source,payload:editable?payload:source?.payload??{},legacyId:source?(type==='MATERIAL'?source.materialDictionaryId:source.techniqueDictionaryId)??null:null};
}
