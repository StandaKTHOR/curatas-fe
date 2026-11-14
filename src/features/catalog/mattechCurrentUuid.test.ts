import {expect,it} from 'vitest';
import {professionalAuthorityId,professionalDraft,professionalDelta} from '../../lib/professional';
const material='fa02a5e4-0e5c-5bb0-a863-f32850e8482f',technique='243f8ea6-482b-5f27-89aa-b2e20cdfb7a8';
it('projects the reported item1001 UUIDs without pretending they are legacy bigint IDs',()=>{
 for(const [id,key,type,uuid] of [[6,'materialAuthorityId','MATERIAL',material],[7,'techniqueAuthorityId','TECHNIQUE',technique]] as const){
  const row:any={id,kind:'MATERIAL_TECHNIQUE',materialDictionaryId:null,techniqueDictionaryId:null,payload:{[key]:uuid,Pozn_MT:'Original DEMUS note'}};
  expect(professionalAuthorityId(row,type)).toBe(uuid);const draft=professionalDraft(row);expect(draft[key]).toBe(uuid);
  expect(professionalDelta(row.kind,draft,row)).toEqual({});expect(row.payload.Pozn_MT).toBe('Original DEMUS note');
 }
});
it('keeps separate legacy ID semantics and changes only the explicitly selected UUID',()=>{
 const row:any={kind:'MATERIAL_TECHNIQUE',materialDictionaryId:99,techniqueDictionaryId:19,payload:{materialAuthorityId:material,techniqueAuthorityId:technique}};
 expect(professionalAuthorityId(row,'MATERIAL')).toBe(material);
 const old:any={...row,payload:{}};expect(professionalAuthorityId(old,'MATERIAL')).toBe(99);
 expect(professionalDelta(row.kind,{...professionalDraft(row),materialAuthorityId:null},row)).toEqual({materialAuthorityId:null});
 expect(row.payload.techniqueAuthorityId).toBe(technique);
});
