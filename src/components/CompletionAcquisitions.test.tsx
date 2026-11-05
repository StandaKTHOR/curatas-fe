import {render,screen,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import AcquisitionSection from './AcquisitionSection';
import {bindOriginalCatalog} from '../features/catalog/originalAdapter';
import {ScopedError} from '../features/scoped/scopedApi';
const api=vi.hoisted(()=>({acquisitions:vi.fn(),saveAcquisition:vi.fn()}));
vi.mock('../features/scoped/scopedApi',async original=>({...await original<typeof import('../features/scoped/scopedApi')>(),scopedApi:()=>api}));
const row={id:41,accessionNumber:'GENERATED saved',acquisitionMethod:null,methodDictionaryId:null,acquisitionDate:'2024-02-29',acquiredFrom:null,circumstances:null,documentNumber:null,message:null,orderNumber:'0',sourceReadOnly:false,legacyData:null};
function bind(write=true){bindOriginalCatalog({id:1,code:'GENERATED',name:'Generated',version:0,institution:{id:1,code:'GEN',name:'Generated'},capabilities:['catalog.read','item.read',...(write?['item.professional.write']:[])],professionalWriteEnabled:true},'generated');}
function session(){return {itemId:7,etag:'"0"',scopedCurrent:{catalogId:1,etag:'"0"'}} as any;}
beforeEach(()=>{vi.resetAllMocks();vi.stubEnv('VITE_ORIGINAL_SCOPED_TEST','true');bind();api.acquisitions.mockResolvedValue({value:[],etag:'"0"'});});afterEach(()=>{bindOriginalCatalog(null,null);vi.unstubAllEnvs();});
it('uses the original acquisition form and year/date control, saves and reloads after confirmed persistence',async()=>{
 const edit=session();api.saveAcquisition.mockImplementation(async()=>{api.acquisitions.mockResolvedValue({value:[row],etag:'"1"'});return {value:row,etag:'"1"'};});
 render(<AcquisitionSection itemId={7} editSession={edit}/>);await waitFor(()=>expect(api.acquisitions).toHaveBeenCalled());await userEvent.type(screen.getByLabelText('Přírůstkové číslo'),'GENERATED');await userEvent.type(screen.getByLabelText('Pořadí'),'0');await userEvent.click(screen.getByRole('button',{name:'Uložit akvizici'}));
 await screen.findByText('Akvizice uložena.');expect(edit.etag).toBe('"1"');expect(api.saveAcquisition).toHaveBeenCalledWith(7,undefined,'"0"',expect.objectContaining({accessionNumber:'GENERATED',orderNumber:'0'}),expect.any(AbortSignal));expect(screen.getByText('GENERATED saved')).toBeInTheDocument();expect(screen.getByRole('button',{name:'Odebrat'})).toBeDisabled();
});
it('shows actual historical values with editing disabled and leaves current text input available',async()=>{api.acquisitions.mockResolvedValue({value:[{...row,sourceReadOnly:true}],etag:'"0"'});render(<AcquisitionSection itemId={7} editSession={session()}/>);await screen.findByText('GENERATED saved');expect(screen.getByRole('button',{name:'Upravit'})).toBeDisabled();expect(screen.getByLabelText('Přírůstkové číslo')).toBeEnabled();expect(screen.getByLabelText('Způsob akvizice – číselník')).toBeDisabled();});
it('retains rejected draft and permits correction after an explicit API validation rejection',async()=>{api.saveAcquisition.mockRejectedValue(new ScopedError(422));render(<AcquisitionSection itemId={7} editSession={session()}/>);const field=screen.getByLabelText('Přírůstkové číslo');await userEvent.type(field,'GENERATED draft');await userEvent.click(screen.getByRole('button',{name:'Uložit akvizici'}));await screen.findByText(/Zkontrolujte povolená pole/);expect(field).toHaveValue('GENERATED draft');expect(screen.queryByText(/Další CREATE je zablokován/)).not.toBeInTheDocument();});
it('keeps all acquisition write controls disabled for a reader',()=>{bind(false);render(<AcquisitionSection itemId={7} editSession={session()}/>);expect(screen.getByLabelText('Přírůstkové číslo')).toBeDisabled();expect(screen.getByRole('button',{name:'Uložit akvizici'})).toBeDisabled();});
