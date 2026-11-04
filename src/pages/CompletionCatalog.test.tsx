import {render,screen,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter,useNavigate} from 'react-router-dom';
import {beforeEach,afterEach,expect,it,vi} from 'vitest';
import AdminItems from './AdminItems';
import * as api from '../lib/api';
import {bindOriginalCatalog} from '../features/catalog/originalAdapter';
vi.mock('../lib/api',async original=>({...await original<typeof import('../lib/api')>(),listAdminItems:vi.fn(),listWorksets:vi.fn()}));
function History(){const navigate=useNavigate();return <><button onClick={()=>navigate(-1)}>TestBack</button><button onClick={()=>navigate(1)}>TestForward</button></>;}
beforeEach(()=>{
 vi.resetAllMocks();vi.stubEnv('VITE_ORIGINAL_SCOPED_TEST','true');
 bindOriginalCatalog({id:1,code:'GENERATED',name:'Generated',version:0,institution:{id:1,code:'GEN',name:'Generated'},capabilities:['catalog.read','item.read']},'generated-token');
 vi.mocked(api.listAdminItems).mockResolvedValue({content:[{id:1,title:'GENERATED',inventoryNumber:'GEN-1'}],totalElements:8155,totalPages:164} as any);
});
afterEach(()=>{bindOriginalCatalog(null,null);vi.unstubAllEnvs();});
it('enables the original advanced builder and sends its exact AST without changing the UI classes',async()=>{
 render(<MemoryRouter initialEntries={['/admin/items?catalog=1']}><AdminItems/></MemoryRouter>);
 await screen.findByRole('button',{name:'GEN-1'});
 const button=screen.getByRole('button',{name:'Pokročilý filtr (AND/OR)'});expect(button).toBeEnabled();
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
