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