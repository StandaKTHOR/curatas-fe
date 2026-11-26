import {render,screen,waitFor,fireEvent} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter,useNavigate,Routes,Route,useLocation} from 'react-router-dom';
import {beforeEach,afterEach,expect,it,vi} from 'vitest';
import AdminItems from './AdminItems';
import * as api from '../lib/api';
import {bindOriginalCatalog} from '../features/catalog/originalAdapter';
vi.mock('../lib/api',async original=>({...await original<typeof import('../lib/api')>(),listAdminItems:vi.fn(),listWorksets:vi.fn()}));
function History(){const navigate=useNavigate();return <><button onClick={()=>navigate(-1)}>TestBack</button><button onClick={()=>navigate(1)}>TestForward</button></>;}
beforeEach(()=>{
 vi.resetAllMocks();vi.stubEnv('VITE_ORIGINAL_SCOPED_TEST','true');
 bindOriginalCatalog({id:1,code:'GENERATED',name:'Generated',version:0,institution:{id:1,code:'GEN',name:'Generated'},capabilities:['catalog.read','item.read']},'generated-token');
 vi.mocked(api.listWorksets).mockResolvedValue([]);
 vi.mocked(api.listAdminItems).mockResolvedValue({content:[{id:1,title:'GENERATED',inventoryNumber:'GEN-1'}],totalElements:8155,totalPages:164} as any);
});
afterEach(()=>{bindOriginalCatalog(null,null);vi.unstubAllEnvs();});
it('enables the original advanced builder and sends its exact AST without changing the UI classes',async()=>{
 render(<MemoryRouter initialEntries={['/admin/items?catalog=1']}><AdminItems/></MemoryRouter>);
 await screen.findByRole('button',{name:'GEN-1'});
 const button=screen.getByRole('button',{name:'Složitější kombinace podmínek'});expect(button).toBeEnabled();
 await userEvent.click(button);await userEvent.type(screen.getByPlaceholderText('Hledaný výraz...'),'Železo');
 await userEvent.click(screen.getByRole('button',{name:'Filtrovat výsledky'}));
 await waitFor(()=>expect(api.listAdminItems).toHaveBeenLastCalledWith(expect.objectContaining({advancedFilter:expect.stringContaining('Železo'),sortField:'createdAt',sortDirection:'desc'})));
});
it('restores search and paging through browser Back/Forward and reaches the real last page',async()=>{
 render(<MemoryRouter initialEntries={['/admin/items?catalog=1&q=first&page=0']}><History/><AdminItems/></MemoryRouter>);
 await screen.findByRole('button',{name:'GEN-1'});
 const search=screen.getByPlaceholderText(/Název, autor/);await userEvent.clear(search);await userEvent.type(search,'second');
 await waitFor(()=>expect(api.listAdminItems).toHaveBeenLastCalledWith(expect.objectContaining({q:'second'})));
 const page=screen.getAllByRole('textbox',{name:'Číslo stránky evidence'})[0];await userEvent.clear(page);await userEvent.type(page,'164');await userEvent.keyboard('{Enter}');
 await waitFor(()=>expect(api.listAdminItems).toHaveBeenLastCalledWith(expect.objectContaining({q:'second',page:163})));
 await userEvent.click(screen.getByRole('button',{name:'TestBack'}));
 await waitFor(()=>expect(api.listAdminItems).toHaveBeenLastCalledWith(expect.objectContaining({q:'second',page:0})));
 await userEvent.click(screen.getByRole('button',{name:'TestForward'}));
 await waitFor(()=>expect(api.listAdminItems).toHaveBeenLastCalledWith(expect.objectContaining({q:'second',page:163})));
});

it('reuses the original workset selector and enables save only for authorized editors',async()=>{
 const id='00000000-0000-4000-8000-000000000001';vi.mocked(api.listWorksets).mockResolvedValue([{id,name:'GENERATED set',description:'',itemCount:1,createdAt:'2026-11-04T00:00:00Z',updatedAt:'2026-11-04T00:00:00Z'}]);
 bindOriginalCatalog({id:1,code:'GENERATED',name:'Generated',version:0,institution:{id:1,code:'GEN',name:'Generated'},capabilities:['catalog.read','item.read','item.professional.write'],professionalWriteEnabled:true},'generated-token');
 render(<MemoryRouter initialEntries={['/admin/items?catalog=1']}><AdminItems/></MemoryRouter>);await screen.findByRole('option',{name:/GENERATED set/});
 await userEvent.selectOptions(screen.getByRole('combobox',{name:'Filtrovat podle pracovní sady'}),id);await waitFor(()=>expect(api.listAdminItems).toHaveBeenLastCalledWith(expect.objectContaining({worksetId:id})));
 await userEvent.click(screen.getByRole('checkbox',{name:'Vybrat GEN-1'}));expect(screen.getByRole('button',{name:'Uložit do sady'})).toBeEnabled();
});

it('keeps the newest search when opening a row before the debounce and when going Back',async()=>{
 function Detail(){const here=useLocation();return <output data-testid="return-query">{here.state?.fromSearch}</output>;}
 render(<MemoryRouter initialEntries={['/admin/items?catalog=1']}><History/><Routes><Route path="/admin/items" element={<AdminItems/>}/><Route path="/admin/items/view/:id" element={<Detail/>}/></Routes></MemoryRouter>);
 await screen.findByRole('button',{name:'GEN-1'});fireEvent.change(screen.getByPlaceholderText(/Název, autor/),{target:{value:'latest'}});fireEvent.click(screen.getByRole('button',{name:'GEN-1'}));expect(screen.getByTestId('return-query')).toHaveTextContent('q=latest');await userEvent.click(screen.getByRole('button',{name:'TestBack'}));await waitFor(()=>expect(screen.getByPlaceholderText(/Název, autor/)).toHaveValue('latest'));
});

it('keeps edits to an active advanced filter as a draft until Apply; close cancels and reset removes it',async()=>{
 render(<MemoryRouter initialEntries={['/admin/items?catalog=1']}><AdminItems/></MemoryRouter>);await screen.findByRole('button',{name:'GEN-1'});
 await userEvent.click(screen.getByRole('button',{name:'Složitější kombinace podmínek'}));
 await userEvent.type(screen.getByPlaceholderText('Hledaný výraz...'),'first');await userEvent.click(screen.getByRole('button',{name:'Filtrovat výsledky'}));
 await waitFor(()=>expect(api.listAdminItems).toHaveBeenLastCalledWith(expect.objectContaining({advancedFilter:expect.stringContaining('first')})));
 const calls=vi.mocked(api.listAdminItems).mock.calls.length;await userEvent.clear(screen.getByPlaceholderText('Hledaný výraz...'));await userEvent.type(screen.getByPlaceholderText('Hledaný výraz...'),'unapplied');await new Promise(r=>setTimeout(r,550));expect(api.listAdminItems).toHaveBeenCalledTimes(calls);
 await userEvent.click(screen.getByRole('button',{name:'Další podmínky (aktivní)'}));await userEvent.click(screen.getByRole('button',{name:'Další podmínky (aktivní)'}));expect(screen.getByPlaceholderText('Hledaný výraz...')).toHaveValue('first');
 await userEvent.click(screen.getByRole('button',{name:'Resetovat pokročilý filtr'}));await waitFor(()=>expect(api.listAdminItems).toHaveBeenLastCalledWith(expect.not.objectContaining({advancedFilter:expect.anything()})));
});

it('lets the curator explicitly choose DEMUS columns and restore the complete table without CSS hiding',async()=>{
 localStorage.removeItem('mes:demus-columns:1');const view=render(<MemoryRouter initialEntries={['/admin/items?catalog=1']}><AdminItems/></MemoryRouter>);await screen.findByRole('button',{name:'GEN-1'});
 await userEvent.click(screen.getByText('Sloupce DEMUS',{exact:true}));const toggle=screen.getByRole('checkbox',{name:'Zobrazit sloupec DEMUS Zapsal'});expect(toggle).toBeChecked();await userEvent.click(toggle);expect(screen.queryByRole('columnheader',{name:'Zapsal'})).not.toBeInTheDocument();expect(screen.getByRole('button',{name:'GEN-1'})).toBeInTheDocument();
 view.unmount();render(<MemoryRouter initialEntries={['/admin/items?catalog=1']}><AdminItems/></MemoryRouter>);await screen.findByRole('button',{name:'GEN-1'});expect(screen.queryByRole('columnheader',{name:'Zapsal'})).not.toBeInTheDocument();await userEvent.click(screen.getByText('Sloupce DEMUS',{exact:true}));await userEvent.click(screen.getByRole('button',{name:'Zobrazit všechny sloupce DEMUS'}));expect(screen.getByRole('columnheader',{name:'Zapsal'})).toBeInTheDocument();localStorage.removeItem('mes:demus-columns:1');
});
it('selects only the explicit Shift range on the visible page and can deselect it without duplicating identities',async()=>{
 vi.mocked(api.listAdminItems).mockResolvedValue({content:[1,2,3,4].map(id=>({id,title:'GENERATED',inventoryNumber:'SHIFT-'+id})),totalElements:4,totalPages:1} as any);
 render(<MemoryRouter><AdminItems/></MemoryRouter>);await screen.findByRole('button',{name:'SHIFT-1'});fireEvent.click(screen.getByRole('checkbox',{name:'Vybrat SHIFT-1'}));fireEvent.click(screen.getByRole('checkbox',{name:'Vybrat SHIFT-3'}),{shiftKey:true});
 for(const id of [1,2,3])expect(screen.getByRole('checkbox',{name:'Vybrat SHIFT-'+id})).toBeChecked();expect(screen.getByRole('checkbox',{name:'Vybrat SHIFT-4'})).not.toBeChecked();fireEvent.click(screen.getByRole('checkbox',{name:'Vybrat SHIFT-1'}),{shiftKey:true});for(const id of [1,2,3])expect(screen.getByRole('checkbox',{name:'Vybrat SHIFT-'+id})).not.toBeChecked();
});

it('applies the custodian with full text, removes one chip and clears all filters',async()=>{
 render(<MemoryRouter initialEntries={['/admin/items?catalog=1&q=ZV+818&Fond_S=F1']}><AdminItems/></MemoryRouter>);await screen.findByRole('button',{name:'GEN-1'});fireEvent.change(screen.getByRole('textbox',{name:'Správce sbírky'}),{target:{value:'6MM'}});
 await waitFor(()=>expect(api.listAdminItems).toHaveBeenLastCalledWith(expect.objectContaining({q:'ZV 818',Fond_S:'F1',advancedFilter:expect.stringContaining('6MM')})));
 await userEvent.click(screen.getByRole('button',{name:'Zrušit filtr Fond (původní kód)'}));await waitFor(()=>expect(api.listAdminItems).toHaveBeenLastCalledWith(expect.objectContaining({Fond_S:'',q:'ZV 818',advancedFilter:expect.stringContaining('6MM')})));
 await userEvent.click(screen.getByRole('button',{name:'Vymazat filtry'}));await waitFor(()=>expect(api.listAdminItems).toHaveBeenLastCalledWith(expect.objectContaining({q:'',Fond_S:''})));expect(screen.getByRole('textbox',{name:'Správce sbírky'})).toHaveValue('');
});
it('shows an actual zero separately from server failure and never silently clears malformed URL filters',async()=>{
 vi.mocked(api.listAdminItems).mockResolvedValue({content:[],totalElements:0,totalPages:0} as any);const view=render(<MemoryRouter><AdminItems/></MemoryRouter>);await screen.findByText(/Žádné předměty neodpovídají/);view.unmount();
 vi.mocked(api.listAdminItems).mockRejectedValue(Error('Server nedostupný'));const failed=render(<MemoryRouter><AdminItems/></MemoryRouter>);await screen.findByRole('alert');expect(screen.queryByText(/Žádné předměty neodpovídají/)).not.toBeInTheDocument();failed.unmount();vi.mocked(api.listAdminItems).mockClear();render(<MemoryRouter initialEntries={['/admin/items?advancedFilter=%7Binvalid']}><AdminItems/></MemoryRouter>);await screen.findByRole('alert');expect(api.listAdminItems).not.toHaveBeenCalled();
});
