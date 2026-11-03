import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import AdminItems from './AdminItems';
import * as api from '../lib/api';
vi.mock('../lib/api',async original=>({...await original<typeof import('../lib/api')>(),listAdminItems:vi.fn(),listWorksets:vi.fn()}));
const row=(title:string)=>({content:[{id:7,title,inventoryNumber:title}],totalPages:1,totalElements:1});
beforeEach(()=>{vi.resetAllMocks();sessionStorage.clear();vi.mocked(api.listWorksets).mockResolvedValue([]);});
it.each(['success','error'])('BATCH 2.1 ignores an older search %s after the newest result is shown',async outcome=>{
    let complete!:(data:any)=>void;let fail!:(error:Error)=>void;
    vi.mocked(api.listAdminItems).mockResolvedValueOnce(row('Initial') as any)
        .mockImplementationOnce(()=>new Promise((resolve,reject)=>{complete=resolve;fail=reject;}))
        .mockResolvedValue(row('Current') as any);
    render(<MemoryRouter><AdminItems/></MemoryRouter>);
    await screen.findByRole('button',{name:'Initial'});
    const search=screen.getByPlaceholderText(/Rychlé hledání/);
    await userEvent.type(search,'older');await waitFor(()=>expect(api.listAdminItems).toHaveBeenCalledTimes(2));
    await userEvent.clear(search);await userEvent.type(search,'newer');await screen.findByRole('button',{name:'Current'});
    await act(async()=>{if(outcome==='success')complete(row('Stale'));else fail(new Error('Stale error'));});
    expect(screen.getByRole('button',{name:'Current'})).toBeInTheDocument();
    expect(screen.queryByRole('button',{name:'Stale'})).not.toBeInTheDocument();
    expect(screen.queryByText('Stale error')).not.toBeInTheDocument();
});
it('BATCH 2.1 invalidates the old search during the debounce of the next query',async()=>{
    let complete!:(data:any)=>void;
    vi.mocked(api.listAdminItems).mockResolvedValueOnce(row('Initial') as any)
        .mockImplementationOnce(()=>new Promise(resolve=>{complete=resolve;})).mockResolvedValue(row('Current') as any);
    render(<MemoryRouter><AdminItems/></MemoryRouter>);await screen.findByRole('button',{name:'Initial'});
    const search=screen.getByPlaceholderText(/Rychlé hledání/);
    await userEvent.type(search,'old');await waitFor(()=>expect(api.listAdminItems).toHaveBeenCalledTimes(2));
    await userEvent.type(search,'x');await act(async()=>complete(row('Stale')));
    expect(screen.queryByRole('button',{name:'Stale'})).not.toBeInTheDocument();
    await screen.findByRole('button',{name:'Current'});
});
it('BATCH 2.2 permits empty page text, paste/replace 21, and preserves filters until Enter',async()=>{
    vi.mocked(api.listAdminItems).mockResolvedValue({...row('Paging'),totalPages:30,totalElements:1500} as any);
    render(<MemoryRouter initialEntries={['/admin/items?q=kept']}><AdminItems/></MemoryRouter>);await screen.findByRole('button',{name:'Paging'});
    const input=screen.getAllByRole('textbox',{name:'Číslo stránky evidence'})[0];
    await userEvent.clear(input);expect(input).toHaveValue('');
    await userEvent.click(input);await userEvent.paste('21');expect(input).toHaveValue('21');
    await userEvent.keyboard('{Enter}');await waitFor(()=>expect(api.listAdminItems).toHaveBeenLastCalledWith(expect.objectContaining({page:20,q:'kept'})));
    await userEvent.click(input);await userEvent.keyboard('{Control>}a{/Control}3');expect(input).toHaveValue('3');await userEvent.keyboard('{Enter}');
    await waitFor(()=>expect(api.listAdminItems).toHaveBeenLastCalledWith(expect.objectContaining({page:2,q:'kept'})));
});
it.each(['','abc','31'])('BATCH 2.2 rejects invalid page %s without replacing the current page',async text=>{
    vi.mocked(api.listAdminItems).mockResolvedValue({...row('Paging'),totalPages:30,totalElements:1500} as any);
    render(<MemoryRouter><AdminItems/></MemoryRouter>);await screen.findByRole('button',{name:'Paging'});
    const input=screen.getAllByRole('textbox',{name:'Číslo stránky evidence'})[0];await userEvent.clear(input);if(text)await userEvent.type(input,text);await userEvent.keyboard('{Enter}');
    expect(screen.getAllByRole('alert')[0]).toHaveTextContent('od 1 do 30');expect(api.listAdminItems).toHaveBeenCalledTimes(1);
});
it('renders all 18 confirmed DEMUS columns and preserves NULL vs empty-string vs current assertion semantics',async()=>{
    vi.mocked(api.listAdminItems).mockResolvedValue({content:[{id:7,title:'Item',inventoryNumber:'GEN-7',quantity:5,otherNumber:null,sourceInventory:{Rada_S:'R-1',PorC_S:'42',Lomeni_S:'A',HPorC_S:null,StatSpr_S:'CZ',Spravce_S:'MZM',Odd_S:'ODD',Podsb_S:'POD',Pocet_S:'2',Ozn_S:'true',JineC_S:'',Karta_S:'false',Opsana_S:'true',Overena_S:null,Zapsal_S:'ZAP',DatZap_S:'2001',Skupina_S:'SK',Urcil_S:'URC'}}],totalPages:1,totalElements:1} as any);
    render(<MemoryRouter><AdminItems/></MemoryRouter>);await screen.findByRole('button',{name:'GEN-7'});
    for(const label of ['Řada','PořČ','Lom','Až','Stát','Spr','Odd','Podsb','Počet','Ozn','JinéČ','Karta','Opsa','Ověřena','Zapsal','DatZap','Skupi','Určil'])expect(screen.getByRole('button',{name:label})).toBeInTheDocument();
    expect(screen.getByText('Současné: 5 (Zdroj: 2)')).toBeInTheDocument();
    expect(screen.getByText('Prázdný řetězec')).toHaveAttribute('data-value-state','empty');
    expect(document.querySelector('[data-source-field="HPorC_S"]')).toHaveAttribute('data-value-state','null');
    expect(document.querySelector('[data-source-field="Ozn_S"]')).toHaveTextContent('Ano');
    expect(document.querySelector('[data-source-field="Karta_S"]')).toHaveTextContent('Ne');
});
it('retains the previous test closing',()=>{
});