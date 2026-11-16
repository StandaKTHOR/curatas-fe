import {render,fireEvent,screen,waitFor,cleanup} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import Login from './Login';
const reset=vi.hoisted(()=>vi.fn());const login=vi.hoisted(()=>vi.fn());
vi.mock('../features/localAuth/localAuthClient',()=>({localAuthEnabled:()=>true,resetLocal:reset}));
vi.mock('../components/AuthContext',()=>({useAuth:()=>({loginLocal:login,setToken:vi.fn()})}));
beforeEach(()=>{reset.mockReset();login.mockReset();});afterEach(cleanup);
it('reuses the original login form for private token/password reset without storing credentials or logging in',async()=>{
 reset.mockResolvedValue({});const view=render(<MemoryRouter initialEntries={['/login?reset=1']}><Login/></MemoryRouter>);
 fireEvent.change(view.container.querySelector('input[type="text"]')!,{target:{value:'GENERATED_PRIVATE_TOKEN'}});fireEvent.change(view.container.querySelector('input[type="password"]')!,{target:{value:'GENERATED new password'}});fireEvent.click(screen.getByRole('button',{name:'Nastavit heslo'}));
 await screen.findByRole('status');expect(reset).toHaveBeenCalledWith('GENERATED_PRIVATE_TOKEN','GENERATED new password');expect(login).not.toHaveBeenCalled();expect(view.container.querySelector('input[type="text"]')).toHaveValue('');expect(view.container.querySelector('input[type="password"]')).toHaveValue('');
});
it('retains the private draft and shows rejection without claiming success',async()=>{
 reset.mockRejectedValue(new Error('Token není platný'));const view=render(<MemoryRouter initialEntries={['/login?reset=1']}><Login/></MemoryRouter>);fireEvent.change(view.container.querySelector('input[type="text"]')!,{target:{value:'GENERATED_INVALID'}});fireEvent.change(view.container.querySelector('input[type="password"]')!,{target:{value:'GENERATED new password'}});fireEvent.click(screen.getByRole('button',{name:'Nastavit heslo'}));await waitFor(()=>expect(screen.getByRole('alert')).toHaveTextContent('Token není platný'));expect(screen.queryByRole('status')).toBeNull();expect(view.container.querySelector('input[type="text"]')).toHaveValue('GENERATED_INVALID');
});
it('leaves the normal original login unchanged',()=>{render(<MemoryRouter><Login/></MemoryRouter>);expect(screen.getByRole('button',{name:'Autorizovaný vstup'})).toBeInTheDocument();expect(screen.queryByText('Jednorázový reset token')).toBeNull();});
