import {expect,it} from 'vitest';
import {professionalDraft,professionalDelta,professionalHistoricalLabel} from '../../lib/professional';
it('keeps exact child source identities distinct even when labels coincide; null removes only its own binding',()=>{
 const material={recordId:'a'.repeat(64),label:'sklo'},technique={recordId:'b'.repeat(64),label:'sklo'};
 const record:any={kind:'MATERIAL_TECHNIQUE',payload:{Material_MT:'Original citation',materialHistoricalRef:material,techniqueHistoricalRef:technique,materialAuthorityId:null}};
 const draft=professionalDraft(record);expect(draft.materialHistoricalRef).toBe(material);expect(draft.techniqueHistoricalRef).toBe(technique);expect(professionalDelta(record.kind,draft,record)).toEqual({});
 expect(professionalDelta(record.kind,{...draft,materialHistoricalRef:null},record)).toEqual({materialHistoricalRef:null});
 expect(record.payload.materialHistoricalRef).toBe(material);expect(record.payload.Material_MT).toBe('Original citation');
 expect(professionalHistoricalLabel(record)).toContain('sklo (DEMUS · aaaaaaaaaaaa)');expect(professionalHistoricalLabel(record)).toContain('sklo (DEMUS · bbbbbbbbbbbb)');
});
it('a UUID selection clears only the explicit historical reference; source text is never filled from its label',()=>{
 const record:any={kind:'MATERIAL_TECHNIQUE',payload:{materialHistoricalRef:{recordId:'a'.repeat(64),label:'Dřevo'},Material_MT:null,Technika_MT:'Existing technique'}};
 const delta=professionalDelta(record.kind,{...professionalDraft(record),materialAuthorityId:'new-uuid',materialHistoricalRef:null},record);
 expect(delta).toEqual({materialAuthorityId:'new-uuid',materialHistoricalRef:null});expect(record.payload.Material_MT).toBeNull();expect(record.payload.Technika_MT).toBe('Existing technique');
});
