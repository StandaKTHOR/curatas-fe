import {expect,it} from 'vitest';
import {reconcileSectionSave,saveFieldErrors,saveFailureMessage,currentFormErrors} from './formSaveState';
it('acknowledges a saved archive flag but preserves independent text edits and their baseline',()=>{
 const original={title:'Původní',legacyArchived:false,legacyCard:null},draft={...original,title:'Rozepsaný'};
 const result=reconcileSectionSave(draft,original,{title:'Nový serverový',legacyArchived:true,legacyCard:true},Object.keys(original));
 expect(result.draft).toEqual({title:'Rozepsaný',legacyArchived:true,legacyCard:true});
 expect(result.baseline).toEqual({title:'Původní',legacyArchived:true,legacyCard:true});
 expect(original.legacyArchived).toBe(false);
});
it('points to exact scoped date, coordinate and quantity fields without inventing date precision',()=>{
 expect(currentFormErrors({datingFrom:'1900',datingTo:'2026-02-30',latitude:'91',quantity:'-1'})).toHaveProperty('datingFrom');
 expect(Object.keys(currentFormErrors({datingFrom:'1900',datingTo:'2026-02-30',latitude:'91',quantity:'-1'}))).toEqual(['datingFrom','datingTo','latitude','quantity']);
 expect(currentFormErrors({datingFrom:'2026-11-14',datingTo:'2026-11-13'}).datingTo).toContain('nesmí');
 expect(currentFormErrors({datingFrom:'1900-01-01',datingTo:'1900-12-31',latitude:'90',longitude:'-180',insuranceValue:'0',quantity:0,datingText:'19. století'})).toEqual({});
});
it('an unchanged saved form no longer looks dirty and omitted fields are preserved',()=>{
 const original={published:false,title:'Titul'},result=reconcileSectionSave(original,original,{published:true},['published','title']);
 expect(result.draft).toEqual(result.baseline);expect(result.draft).toEqual({published:true,title:'Titul'});
});
it('translates field errors and distinguishes validation, duplicates and concurrent edits',()=>{
 expect(saveFieldErrors({fieldErrors:{inventoryNumber:'must not be blank',title:'Titul je příliš dlouhý.',discard:42}})).toEqual({inventoryNumber:'Inventární číslo: zkontrolujte vyplněnou hodnotu.',title:'Titul je příliš dlouhý.'});
 expect(saveFailureMessage({status:409})).toContain('číslo');expect(saveFailureMessage({status:412})).toContain('jiný uživatel');
 expect(saveFailureMessage({status:422})).toContain('nebyl uložen');expect(saveFieldErrors(null)).toEqual({});
});
