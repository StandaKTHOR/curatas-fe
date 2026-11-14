import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import Detail from './Detail';
import * as api from '../lib/api';
vi.mock('../lib/api',async original=>({...await original<typeof import('../lib/api')>(),getItem:vi.fn(),listAttachments:vi.fn()}));
beforeEach(()=>{vi.resetAllMocks();localStorage.clear();vi.mocked(api.getItem).mockResolvedValue({id:7,title:'Public proof',imageUrls:[],dimensions:[],legacyData:{}});});
it.each([null,'USER','CURATOR','ADMIN'])('public detail remains read-only for token role %s',async role=>{
    if(role)localStorage.setItem('token','header.'+btoa(JSON.stringify({roles:[role]}))+'.signature');
    render(<MemoryRouter initialEntries={['/items/7']}><Routes><Route path="/items/:id" element={<Detail/>}/></Routes></MemoryRouter>);
    await screen.findByRole('heading',{name:'Public proof'});
    expect(screen.queryByRole('button',{name:'Klonovat'})).not.toBeInTheDocument();
    expect(screen.queryByRole('button',{name:'Vyřadit'})).not.toBeInTheDocument();
    expect(api.listAttachments).not.toHaveBeenCalled();
});