import {render,screen,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,expect,it,vi} from 'vitest';
import {AuthProvider,useAuth} from '../../components/AuthContext';

afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
it('settles the old refresh before login and does not let its 401 clear the newly authenticated session',async()=>{
 vi.stubEnv('VITE_LOCAL_AUTH_ENABLED','true');
 let finish!:(r:Response)=>void;const oldRefresh=new Promise<Response>(resolve=>{finish=resolve;});
 const fetch=vi.fn().mockImplementation((url:string)=>{
  const p=new URL(url,'https://unit.invalid').pathname;
  if(p.endsWith('/refresh'))return oldRefresh;
  if(p.endsWith('/login'))return Promise.resolve(new Response(JSON.stringify({token:'GENERATED NEW SESSION'})));
  if(p.endsWith('/me'))return Promise.resolve(new Response(JSON.stringify({issuer:'curatas',subject:'local:GENERATED'})));
  throw new Error('Unexpected authentication action: '+p);
 });vi.stubGlobal('fetch',fetch);
 function Consumer(){const auth=useAuth();return <><button onClick={()=>void auth.loginLocal('generated','GENERATED PASSWORD')}>Login</button><p>{auth.token??'ANONYMOUS'}</p></>;}
 const view=render(<MemoryRouter><AuthProvider><Consumer/></AuthProvider></MemoryRouter>);
 await waitFor(()=>expect(fetch).toHaveBeenCalledTimes(1));await userEvent.click(screen.getByRole('button',{name:'Login'}));
 expect(fetch.mock.calls.some(([url])=>String(url).endsWith('/login'))).toBe(false);
 finish(new Response('{}',{status:401}));await screen.findByText('GENERATED NEW SESSION');
 expect(fetch.mock.calls.filter(([url])=>String(url).endsWith('/login'))).toHaveLength(1);
 expect(fetch.mock.calls.some(([url])=>String(url).endsWith('/logout'))).toBe(false);view.unmount();
});
