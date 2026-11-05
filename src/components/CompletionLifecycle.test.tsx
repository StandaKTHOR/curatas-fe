import {render,screen,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import MuseumSection from './MuseumSection';
import {bindOriginalCatalog} from '../features/catalog/originalAdapter';
const api=vi.hoisted(()=>({professionalRecords:vi.fn(),lifecycle:vi.fn(),deaccession:vi.fn()}));
vi.mock('../features/scoped/scopedApi',async original=>({...await original<typeof import('../features/scoped/scopedApi')>(),scopedApi:()=>api}));
function bind(write=true){bindOriginalCatalog({id:1,code:'GENERATED',name:'Generated',version:0,institution:{id:1,code:'GEN',name:'Generated'},capabilities:['catalog.read','item.read',...(write?['item.professional.write']:[])],professionalWriteEnabled:true,professionalRecordsEnabled:true},'generated');}
beforeEach(()=>{vi.resetAllMocks();vi.stubEnv('VITE_ORIGINAL_SCOPED_TEST','true');bind();vi.spyOn(window,'confirm').mockReturnValue(true);api.professionalRecords.mockResolvedValue({items:[],etag:'"0"'});api.lifecycle.mockResolvedValue({value:{active:true,published:true,status:null,deaccession:null},etag:'"0"'});});afterEach(()=>{bindOriginalCatalog(null,null);vi.unstubAllEnvs();vi.restoreAllMocks();});
it('uses the original three lifecycle fields, confirms operation, updates ETag and preserves rows',async()=>{
 const edit={itemId:7,etag:'"0"',scopedCurrent:{catalogId:1,etag:'"0"'}} as any;const drafts={current:{}} as any;
 api.deaccession.mockResolvedValue({value:{active:false,published:false,status:'VYRAZENO',deaccession:{reason:'GENERATED Ž',deaccessionDate:'2026-11-04',documentNumber:null}},etag:'"1"'});
 render(<MuseumSection itemId={7} section="deaccession" editSession={edit} drafts={drafts}/>);const reason=await screen.findByLabelText('Důvod');await userEvent.type(reason,'GENERATED Ž');await userEvent.click(screen.getByRole('button',{name:'Vyřadit předmět'}));
 await screen.findByText(/Předmět byl vyřazen z evidence; záznam/);expect(api.deaccession).toHaveBeenCalledWith(7,'"0"',{reason:'GENERATED Ž',deaccessionDate:null,documentNumber:null},expect.any(AbortSignal));expect(edit.etag).toBe('"1"');expect(screen.getByRole('button',{name:'Vyřadit předmět'})).toBeDisabled();await waitFor(()=>expect(drafts.current.deaccession.dirty).toBe(false));
});
it('keeps a rejected lifecycle draft and does not report success',async()=>{api.deaccession.mockRejectedValue(new Error('GENERATED rejected'));render(<MuseumSection itemId={7} section="deaccession"/>);const reason=await screen.findByLabelText('Důvod');await userEvent.type(reason,'GENERATED draft');await userEvent.click(screen.getByRole('button',{name:'Vyřadit předmět'}));await screen.findByText('GENERATED rejected');expect(reason).toHaveValue('GENERATED draft');expect(screen.queryByText(/Předmět byl vyřazen/)).not.toBeInTheDocument();});
it('honors reader permissions and does not issue a mutation',async()=>{bind(false);render(<MuseumSection itemId={7} section="deaccession"/>);expect(await screen.findByLabelText('Důvod')).toBeDisabled();expect(screen.getByRole('button',{name:'Vyřadit předmět'})).toBeDisabled();expect(api.deaccession).not.toHaveBeenCalled();});
