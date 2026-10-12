import {describe,it,expect} from 'vitest';
import samples from '../test/fixtures/museum-samples.json';
import {professionalDraft,professionalDelta,professionalValue} from './professional';
import {reviewedCalendarDate} from './dating';
import type {MuseumRecord} from './api';

describe('accepted source excerpts (isolated identifiers, never UAT seeds)',()=>{
    it.each(samples.items)('preserves native fields for $inventory_number',item=>{
        for(const section of item.sections){
            const record={id:Number(section.recordId),kind:section.kind,payload:{},legacyData:section.native} as MuseumRecord;
            const draft=professionalDraft(record);
            for(const [key,value] of Object.entries(draft)) expect(value).toEqual((section.native as Record<string,unknown>)[key]);
            expect(professionalDelta(record.kind,draft,record)).toEqual({});
        }
    });
    it('keeps MatTech order 1406 and native reference code distinct from dictionary label',()=>{
        const tuple=samples.items.find(item=>Number(item.id)===1018)!.sections[0];
        expect(tuple.native).toMatchObject({Poradi_MT:1406,Material_MT:'hedvábí',Technika_MT:null});
        const bibliography=samples.items.find(item=>Number(item.id)===24261)!.sections[0];
        expect(bibliography.native).toMatchObject({Ref_RF:'Kurfurst',Str_RF:'553'});
        expect(samples.dictionaries.find(row=>Number(row.id)===21117)?.label).not.toBe('Kurfurst');
    });
});
describe('synthetic current overlay and date contracts',()=>{
    it('explicit null wins and patches exclude immutable source keys',()=>{
        const record: MuseumRecord={id:1,kind:'DETERMINATION',payload:{Urcil_UR:null},legacyData:{Urcil_UR:'Historical actor',Predmet_S:'Root object'},dictionaryId:null,partyId:null,sourceTable:'Sbirky',sourceKey:'contract-fixture'};
        expect(professionalValue(record,'Urcil_UR')).toBeNull();
        expect(professionalDraft(record).Predmet_UR).toBeUndefined();
        expect(professionalDelta(record.kind,{Urcil_UR:'Reviewed actor',Predmet_S:'Must not write'},record)).toEqual({Urcil_UR:'Reviewed actor'});
    });
    it('never expands a source year or text to January 1',()=>{
        expect(()=>reviewedCalendarDate('1776')).toThrow();
        expect(()=>reviewedCalendarDate('kolem 1776')).toThrow();
        expect(reviewedCalendarDate('')).toBeNull();
        expect(reviewedCalendarDate('-0300-06-15')).toBe('-0300-06-15');
    });
});
