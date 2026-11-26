import {render,screen,waitFor,act,fireEvent} from '@testing-library/react';
import {MemoryRouter,useLocation} from 'react-router-dom';
import {beforeEach,expect,it,vi} from 'vitest';
import OriginalSourceBridge from './OriginalSourceBridge';
const mock=vi.hoisted(()=>({canEdit:false,catalog:{id:1} as any,api:{inventoryEvidence:vi.fn()},projection:vi.fn(),root:null as any}));
vi.mock('./useHistoricalRows',()=>({historicalEnabled:()=>false,useHistoricalRows:()=>({page:mock.root})}));
vi.mock('../../components/AuthContext',()=>({useAuth:()=>({token:'generated'})}));
vi.mock('./CatalogContext',()=>({useCatalog:()=>({selectedCatalog:mock.catalog})}));
vi.mock('../scoped/scopedApi',()=>({scopedApi:()=>mock.api,inventoryColumns:{Rada_S:'Řada'},inventoryDisplay:(_key:string,value:string)=>value}));
vi.mock('./originalAdapter',()=>({originalInventorySource:(...args:any[])=>mock.projection(...args)}));
vi.mock('./originalEdit',()=>({originalCanEdit:()=>mock.canEdit,originalEditHref:(id:number)=>`/admin/items/edit/${id}?catalog=1&edit=inventory`}));
vi.mock('./HistoricalRows',()=>({HistoricalTable:()=>null,HistoricalRoot:()=>null}));
vi.mock('../scoped/SourceSummaryPanel',()=>({default:()=>null}));
const evidence=(id:number)=>({itemVersion:String(id),sourceComponents:{series:null,ordinal:null},sourceInventoryNumber:null,sourceLocalId:null,aliases:[],nextAfterId:null});
beforeEach(()=>{vi.clearAllMocks();mock.canEdit=false;mock.root=null;mock.catalog={id:1};mock.api.inventoryEvidence.mockImplementation(async(id:number)=>evidence(id));mock.projection.mockImplementation(async(id:number)=>({fields:{Rada_S:`DEMUS-${id}`,PorC_S:'0'},state:'VERIFIED_ITEM_PROJECTION'}));});
const card=(id:number)=><MemoryRouter><OriginalSourceBridge itemId={id} section="identity" etag={`"${id}"`}/></MemoryRouter>;
it('discards a late source projection when changing item and preserves explicit zero',async()=>{
 let release:(v:any)=>void=()=>{};mock.projection.mockImplementationOnce(()=>new Promise(resolve=>{release=resolve;}));const view=render(card(1));await waitFor(()=>expect(mock.projection).toHaveBeenCalledOnce());view.rerender(card(2));await waitFor(()=>expect(screen.getByLabelText('Historické zdrojové složky')).toHaveTextContent('DEMUS-2'));await act(async()=>release({fields:{Rada_S:'OLD ITEM'},state:'VERIFIED_ITEM_PROJECTION'}));expect(screen.queryByText('OLD ITEM')).toBeNull();expect(screen.getByLabelText('Historické zdrojové složky')).toHaveTextContent('0');
});
it('shows a verified full-root field absent from the limited inventory whitelist',async()=>{
 mock.api.inventoryEvidence.mockResolvedValue({...evidence(1),sourceComponents:{hierarchyDivision:null}});mock.root={state:'AVAILABLE',nextAfterId:null,items:[{fields:{HLomeni_S:{kind:'TEXT',value:'ž/0'}}}]};render(card(1));await waitFor(()=>expect(screen.getByLabelText('Historické zdrojové složky')).toHaveTextContent('ž/0'));
});
it('closes the prior catalog projection before the new read resolves',async()=>{
 const view=render(card(1));await waitFor(()=>expect(screen.getByLabelText('Historické zdrojové složky')).toHaveTextContent('DEMUS-1'));mock.catalog={id:2};mock.api.inventoryEvidence.mockReturnValue(new Promise(()=>{}));view.rerender(card(1));expect(screen.queryByText('DEMUS-1')).toBeNull();expect(screen.getByRole('status')).toHaveTextContent('Načítání zdrojové identity');
});

it('preserves list filters when opening current inventory, keeping historical evidence read-only',async()=>{
 mock.canEdit=true;function Route(){const location=useLocation();return <output aria-label="route">{JSON.stringify({path:location.pathname,state:location.state})}</output>;}
 render(<MemoryRouter initialEntries={[{pathname:'/admin/items/view/1',state:{fromSearch:'?catalog=1&q=V003',catalogIds:[1,2]}}]}><OriginalSourceBridge itemId={1} section="identity"/><Route/></MemoryRouter>);
 fireEvent.click(screen.getByRole('button',{name:'Upravit současné inventární údaje'}));expect(screen.getByLabelText('route')).toHaveTextContent('/admin/items/edit/1');expect(screen.getByLabelText('route')).toHaveTextContent('?catalog=1&q=V003');const context=await screen.findByText(/Tyto složky DEMUS jsou historický podklad/);expect(context).not.toBeVisible();fireEvent.click(context.closest('[data-demus-technical]')!.querySelector('summary')!);fireEvent.click(screen.getByText('Kontext inventární identity'));expect(context).toBeVisible();
});
