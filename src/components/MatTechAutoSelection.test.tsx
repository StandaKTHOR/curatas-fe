import {render,screen,waitFor,fireEvent,within} from '@testing-library/react';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import MuseumSection from './MuseumSection';
import {bindOriginalCatalog} from '../features/catalog/originalAdapter';
const api=vi.hoisted(()=>({professionalRecords:vi.fn(),saveProfessional:vi.fn()}));
vi.mock('../features/scoped/scopedApi',async original=>({...await original<typeof import('../features/scoped/scopedApi')>(),scopedApi:()=>api}));
vi.mock('./ThreeLevelDictionarySelect',()=>({default:(p:any)=>p.positions?<div>{p.positions.map((slot:any,i:number)=><label key={i} data-mattech-position={p.type} data-record-id={slot.recordId??'new'}><select aria-label={i===0?p.label:p.label+' '+(i+1)} disabled={p.readOnly||slot.recordId===null&&!p.positionAdding} value={slot.id??''} onChange={e=>p.onPositionChange(i,e.target.value||null)}><option value=""/><option value="material">dřevo</option><option value="technique">technika</option></select></label>)}</div>:<select aria-label={p.label} disabled={p.readOnly} value={p.scopedValue??''} onChange={e=>p.onScopedChange(e.target.value||null)}><option value=""/><option value="material">dřevo</option><option value="technique">technika</option></select>}));
const rows=[{id:19,kind:'MATERIAL_TECHNIQUE',dictionaryId:null,partyId:null,materialDictionaryId:null,techniqueDictionaryId:null,payload:{materialAuthorityId:'material'},sourceTable:null},{id:20,kind:'MATERIAL_TECHNIQUE',dictionaryId:null,partyId:null,materialDictionaryId:null,techniqueDictionaryId:null,payload:{techniqueAuthorityId:'technique'},sourceTable:null}];
beforeEach(()=>{vi.resetAllMocks();vi.stubEnv('VITE_ORIGINAL_SCOPED_TEST','true');bindOriginalCatalog({id:1,code:'GENERATED',name:'Generated',version:0,institution:{id:1,code:'GEN',name:'Generated'},capabilities:['catalog.read','item.read','item.professional.write'],professionalWriteEnabled:true,professionalRecordsEnabled:true},'generated');api.professionalRecords.mockResolvedValue({items:rows,etag:'"0"'});});
afterEach(()=>{bindOriginalCatalog(null,null);vi.unstubAllEnvs();});
it('opens the first current row without edit click, switches independent rows and does not write',async()=>{
 render(<MuseumSection itemId={7} section="materialTuples"/>);await waitFor(()=>expect(screen.getByLabelText('Materiál')).toHaveValue('material'));expect(screen.getByLabelText('Technika')).toHaveValue('technique');expect(screen.getByLabelText('Technika')).toBeEnabled();
 fireEvent.click(screen.getAllByRole('button',{name:'Upravit'})[1]);expect(screen.getByLabelText('Materiál')).toHaveValue('material');expect(screen.getByLabelText('Materiál')).toBeEnabled();expect(screen.getByLabelText('Technika')).toHaveValue('technique');expect(api.saveProfessional).not.toHaveBeenCalled();
});
it.each([[0,'Materiál','materialAuthorityId','material'],[1,'Technika','techniqueAuthorityId','technique']] as const)('saves only selected row %s and never sends the displayed opposite assignment',async(index,label,key,id)=>{
 render(<MuseumSection itemId={7} section="materialTuples"/>);await waitFor(()=>expect(screen.getByLabelText('Materiál')).toHaveValue('material'));fireEvent.click(screen.getAllByRole('button',{name:'Upravit'})[index]);
 api.saveProfessional.mockRejectedValue(Object.assign(new Error('test rejection retains draft'),{status:412}));
 fireEvent.change(screen.getByLabelText(label),{target:{value:''}});fireEvent.click(screen.getByRole('button',{name:'Uložit záznam'}));
 await waitFor(()=>expect(api.saveProfessional).toHaveBeenCalledWith(7,'MATERIAL_TECHNIQUE',rows[index].id,'"0"',{[key]:null,[key.replace('AuthorityId','HistoricalRef')]:null},expect.any(AbortSignal)));expect(rows[index].payload[key as keyof typeof rows[0]['payload']]).toBe(id);
});
it('only explicit Add clears the selected record, creates once and keeps the saved selection',async()=>{
 render(<MuseumSection itemId={7} section="materialTuples"/>);await waitFor(()=>expect(screen.getByLabelText('Materiál')).toHaveValue('material'));
 fireEvent.click(screen.getByRole('button',{name:'Přidat nový záznam'}));const newMaterial=within(document.querySelector('[data-mattech-position="MATERIAL"][data-record-id="new"]') as HTMLElement).getByRole('combobox');expect(newMaterial).toHaveValue('');expect(api.saveProfessional).not.toHaveBeenCalled();
 const saved={...rows[0],id:21};api.saveProfessional.mockImplementation(async()=>{api.professionalRecords.mockResolvedValue({items:[...rows,saved],etag:'"1"'});return {value:saved,etag:'"1"'};});
 fireEvent.change(newMaterial,{target:{value:'material'}});fireEvent.click(screen.getByRole('button',{name:'Uložit záznam'}));await screen.findByText('Záznam uložen.');expect(api.saveProfessional).toHaveBeenCalledWith(7,'MATERIAL_TECHNIQUE',undefined,'"0"',{materialAuthorityId:'material',materialHistoricalRef:null},expect.any(AbortSignal));expect(screen.getByRole('heading',{name:'✏️ Úprava záznamu #21'})).toBeInTheDocument();
});
it('prefills a reader and allows switching while all write controls stay disabled',async()=>{
 render(<MuseumSection itemId={7} section="materialTuples" readOnly/>);await waitFor(()=>expect(screen.getByLabelText('Materiál')).toHaveValue('material'));expect(screen.getByLabelText('Materiál')).toBeDisabled();fireEvent.click(screen.getAllByRole('button',{name:'Upravit'})[1]);expect(screen.getByLabelText('Technika')).toHaveValue('technique');expect(screen.getByRole('button',{name:'Uložit záznam'})).toBeDisabled();expect(screen.getByRole('button',{name:'Přidat nový záznam'})).toBeDisabled();expect(api.saveProfessional).not.toHaveBeenCalled();
});
