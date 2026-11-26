import ThreeLevelDictionarySelect from './ThreeLevelDictionarySelect';
import type {MuseumRecord} from '../lib/api';
export type MatTechPosition={recordId:number|null;id:string|null;position:number;historicalLabel?:string};
/** API order is source Poradi_MT followed by the existing stable record order. Never sort by label/UUID. */
export function matTechPositionRows(rows:MuseumRecord[],type:'MATERIAL'|'TECHNIQUE'){
 const prefix=type==='MATERIAL'?'material':'technique';return rows.filter(r=>r.kind==='MATERIAL_TECHNIQUE'&&!r.sourceTable&&(Object.prototype.hasOwnProperty.call(r.payload,prefix+'AuthorityId')||r.payload[prefix+'HistoricalRef']));
}
export default function MatTechPositions({rows,record,payload,adding,readOnly,onChange}:{rows:MuseumRecord[];record:MuseumRecord|null;payload:Record<string,unknown>;adding:boolean;readOnly:boolean;onChange:(row:MuseumRecord|null,type:'MATERIAL'|'TECHNIQUE',id:string|null)=>void}){
 return <>{(['MATERIAL','TECHNIQUE'] as const).map(type=>{
  const label=type==='MATERIAL'?'Materiál':'Technika',prefix=type==='MATERIAL'?'material':'technique',ordered=matTechPositionRows(rows,type);
  const values:MatTechPosition[]=ordered.map((row,index)=>{const p=row.id===record?.id?payload:row.payload;return {recordId:row.id,id:typeof p[prefix+'AuthorityId']==='string'?p[prefix+'AuthorityId'] as string:null,position:index+1,historicalLabel:(row as MuseumRecord & {authorityLabels?:Record<string,string>}).authorityLabels?.[prefix+'HistoricalRef']??(p[prefix+'HistoricalRef'] as {label?:string}|undefined)?.label};});
  if(adding)values.push({recordId:null,id:typeof payload[prefix+'AuthorityId']==='string'?payload[prefix+'AuthorityId'] as string:null,position:values.length+1});
  const count=Math.max(3,Math.ceil(values.length/3)*3);while(values.length<count)values.push({recordId:null,id:null,position:values.length+1});
  return <div key={type} className="space-y-3">{Array.from({length:count/3},(_,batch)=>{
   const positions=values.slice(batch*3,batch*3+3);return <ThreeLevelDictionarySelect key={batch} scoped type={type} label={label} value={null} readOnly={readOnly} positions={positions} positionAdding={adding} onPositionChange={(index,id)=>{const slot=positions[index];onChange(slot.recordId===null?null:ordered.find(r=>r.id===slot.recordId)??null,type,id);}} onChange={()=>{}}/>;
  })}</div>;
 })}</>;
}
