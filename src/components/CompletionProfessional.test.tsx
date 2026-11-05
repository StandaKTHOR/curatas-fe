import {render,screen,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import MuseumSection from './MuseumSection';
import {bindOriginalCatalog} from '../features/catalog/originalAdapter';
import {professionalFields} from '../lib/professional';
const api=vi.hoisted(()=>({professionalRecords:vi.fn(),curatorRecord:vi.fn(),saveProfessional:vi.fn(),saveCuratorRecord:vi.fn()}));
vi.mock('../features/scoped/scopedApi',async original=>({...await original<typeof import('../features/scoped/scopedApi')>(),scopedApi:()=>api}));
function bind(write=true){bindOriginalCatalog({id:1,code:'GENERATED',name:'Generated',version:0,institution:{id:1,code:'GEN',name:'Generated'},capabilities:['catalog.read','item.read',...(write?['item.professional.write']:[])],professionalWriteEnabled:true,professionalRecordsEnabled:true},'generated');}
beforeEach(()=>{vi.resetAllMocks();vi.stubEnv('VITE_ORIGINAL_SCOPED_TEST','true');bind();api.professionalRecords.mockResolvedValue({items:[],etag:'"0"'});api.curatorRecord.mockResolvedValue({present:false,value:{},etag:'"0"'});});
afterEach(()=>{bindOriginalCatalog(null,null);vi.unstubAllEnvs();});
const cases=[['classification','CLASSIFICATION','SysKat_ZS'],['determination','DETERMINATION','Predmet_UR'],['documentation','DOCUMENTATION','Dokument_DK'],['origin','ORIGIN','OsobaVz_VZ'],['materialTuples','MATERIAL_TECHNIQUE','Material_MT'],['bibliography','BIBLIOGRAPHY','Ref_RF'],['manipulation','MANIPULATION','Typ_MN'],['action','ACTION','Prezentace_AK'],['iso','ISO','KodISO_SO']] as const;
it.each(cases)('creates and reloads a real repeated %s record using the original form',async(section,kind,key)=>{
 const label=professionalFields[kind].find(([field])=>field===key)![1];const row={id:45,kind,payload:{[key]:'GENERATED Ž'},dictionaryId:null,partyId:null,materialDictionaryId:null,techniqueDictionaryId:null,sourceTable:null,sourceKey:null,legacyData:null};
 api.saveProfessional.mockImplementation(async()=>{api.professionalRecords.mockResolvedValue({items:[row],etag:'"1"'});return {value:row,etag:'"1"'};});
 render(<MuseumSection itemId={7} section={section}/>);
 await userEvent.type(await screen.findByLabelText(label),'GENERATED Ž');await userEvent.click(screen.getByRole('button',{name:'Uložit záznam'}));
 await screen.findByText('Záznam uložen.');expect(api.saveProfessional).toHaveBeenCalledWith(7,kind,undefined,'"0"',{[key]:'GENERATED Ž'},expect.any(AbortSignal));expect(api.professionalRecords).toHaveBeenCalledTimes(2);expect(api.saveCuratorRecord).not.toHaveBeenCalled();
});
it('preserves draft after a rejected write and never reports success',async()=>{
 api.saveProfessional.mockRejectedValue(Object.assign(new Error('GENERATED conflict'),{status:412}));render(<MuseumSection itemId={7} section="origin"/>);
 const field=await screen.findByLabelText('Osoba vzniku (historický text)');await userEvent.type(field,'GENERATED draft');await userEvent.click(screen.getByRole('button',{name:'Uložit záznam'}));
 await screen.findByText('GENERATED conflict');expect(field).toHaveValue('GENERATED draft');expect(screen.queryByText('Záznam uložen.')).not.toBeInTheDocument();expect(api.professionalRecords).toHaveBeenCalledTimes(1);
});
it('keeps repeated forms disabled for a reader',async()=>{bind(false);render(<MuseumSection itemId={7} section="documentation"/>);expect(await screen.findByLabelText('Dokument / název')).toBeDisabled();expect(screen.getByRole('button',{name:'Uložit záznam'})).toBeDisabled();expect(api.saveProfessional).not.toHaveBeenCalled();});
it('updates an existing current record by its ID and current parent version',async()=>{
 const row={id:9,kind:'ORIGIN',payload:{OsobaVz_VZ:'GENERATED old'},dictionaryId:null,partyId:null,materialDictionaryId:null,techniqueDictionaryId:null,sourceTable:null,sourceKey:null,legacyData:null};
 api.professionalRecords.mockResolvedValue({items:[row],etag:'"4"'});api.saveProfessional.mockResolvedValue({value:row,etag:'"4"'});
 render(<MuseumSection itemId={7} section="origin"/>);await userEvent.click(await screen.findByRole('button',{name:'Upravit'}));
 const field=screen.getByLabelText('Osoba vzniku (historický text)');await userEvent.clear(field);await userEvent.type(field,'GENERATED new');await userEvent.click(screen.getByRole('button',{name:'Uložit záznam'}));
 await waitFor(()=>expect(api.saveProfessional).toHaveBeenCalledWith(7,'ORIGIN',9,'"4"',{OsobaVz_VZ:'GENERATED new'},expect.any(AbortSignal)));
});
