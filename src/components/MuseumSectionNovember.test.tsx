import {render,screen,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach,afterEach,expect,it,vi} from 'vitest';
import MuseumSection from './MuseumSection';
const mocks=vi.hoisted(()=>({api:{curatorRecord:vi.fn(),professionalRecords:vi.fn(),saveCuratorRecord:vi.fn()},signal:new AbortController().signal}));
vi.mock('../features/catalog/originalAdapter',()=>({originalIntegrationEnabled:()=>true,originalSession:()=>({api:mocks.api,signal:mocks.signal,catalog:{professionalRecordsEnabled:true}})}));
vi.mock('../features/catalog/originalEdit',()=>({originalCanEdit:()=>true}));
vi.mock('../features/catalog/CurrentAuthors',()=>({default:()=>null}));
vi.mock('../features/catalog/CatalogContext',()=>({useCatalog:()=>({selectedCatalog:{id:71,professionalRecordsEnabled:true,capabilities:['catalog.read','item.read','item.professional.write']}})}));
vi.mock('./AuthContext',()=>({useAuth:()=>({token:'GENERATED_SCOPED_UNIT_TOKEN'})}));
beforeEach(()=>{vi.clearAllMocks();vi.stubGlobal('fetch',vi.fn(async()=>new Response('{}',{status:404}))); mocks.api.professionalRecords.mockResolvedValue({items:[],etag:'"1"'});mocks.api.saveCuratorRecord.mockResolvedValue('"2"');mocks.api.curatorRecord.mockResolvedValue({etag:'"1"',present:true,value:{Typ_MN:'before',DatMan_MN:null,Kdo_MN:null,Stav_MN:null,Osetreni_MN:null,InvRev_MN:null,PopisSt_MN:null}});});
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
it('clears only the acknowledged specialist draft after POST and matching GET',async()=>{
 const session:any={itemId:7,etag:'"1"',scopedCurrent:{etag:'"1"'}},drafts={current:{} as Record<string,any>},onSave=vi.fn();
 render(<MuseumSection section="manipulation" itemId={7} editSession={session} drafts={drafts} onSave={onSave}/>);
 await userEvent.click(await screen.findByRole('button',{name:'Upravit'}));
 await userEvent.clear(screen.getByLabelText('Typ manipulace'));await userEvent.type(screen.getByLabelText('Typ manipulace'),'Žluťoučký');
 await waitFor(()=>expect(drafts.current.manipulation.dirty).toBe(true));
 mocks.api.curatorRecord.mockResolvedValue({etag:'"2"',present:true,value:{Typ_MN:'Žluťoučký',DatMan_MN:null,Kdo_MN:null,Stav_MN:null,Osetreni_MN:null,InvRev_MN:null,PopisSt_MN:null}});
 await userEvent.click(screen.getByRole('button',{name:'Uložit záznam'}));await screen.findByText('Záznam uložen.',{exact:true});
 await waitFor(()=>expect(drafts.current.manipulation.dirty).toBe(false));expect(drafts.current.manipulation.payload).toEqual({});expect(session.etag).toBe('"2"');expect(onSave).toHaveBeenCalledOnce();
 expect(mocks.api.saveCuratorRecord.mock.calls[0][2]).toBe('"1"');
});
it('keeps an unacknowledged draft on 412 and never reports success',async()=>{
 const session:any={itemId:7,etag:'"1"',scopedCurrent:{etag:'"1"'}},drafts={current:{} as Record<string,any>};
 render(<MuseumSection section="manipulation" itemId={7} editSession={session} drafts={drafts}/>);await userEvent.click(await screen.findByRole('button',{name:'Upravit'}));await userEvent.type(screen.getByLabelText('Typ manipulace'),' changed');
 mocks.api.saveCuratorRecord.mockRejectedValue(Object.assign(new Error('412 conflict'),{status:412}));await userEvent.click(screen.getByRole('button',{name:'Uložit záznam'}));await screen.findByText('412 conflict');expect(drafts.current.manipulation.dirty).toBe(true);expect(session.etag).toBe('"1"');expect(screen.queryByText('Záznam uložen.')).toBeNull();
});
