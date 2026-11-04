import {fireEvent,render,screen,waitFor,cleanup} from '@testing-library/react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {MemoryRouter} from 'react-router-dom';
import LocalUsers from './LocalUsers';
import UserProfiles from './UserProfiles';
import {shareInterval} from '../catalog/sharingApi';
import {acceptLocalToken} from './localAuthClient';
import Admin from '../../pages/Admin';

const auth=vi.hoisted(()=>({token:'present' as string|null,loginLocal:vi.fn(),logout:vi.fn(),restoring:false}));
const scope=vi.hoisted(()=>({selectedCatalog:{id:1,capabilities:['catalog.read','catalog.grant.manage','catalog.access.delegate','catalog.audit.read']} as any,clearAccess:vi.fn()}));
vi.mock('../../components/AuthContext',()=>({useAuth:()=>auth}));
vi.mock('../catalog/CatalogContext',()=>({useCatalog:()=>scope}));

beforeEach(()=>{
 vi.stubEnv('VITE_LOCAL_AUTH_ENABLED','true');
 auth.token='present';
 auth.restoring=false;
 auth.loginLocal.mockReset();
 auth.logout.mockReset();
 scope.selectedCatalog={id:1,capabilities:['catalog.read','catalog.grant.manage']};
 scope.clearAccess.mockReset();
 acceptLocalToken('access');
 localStorage.clear();
});
afterEach(()=>{
 cleanup();
 vi.unstubAllGlobals();
 vi.unstubAllEnvs();
 vi.restoreAllMocks();
 acceptLocalToken(null);
});

describe('Priority 4: Scoped User, Role, Catalog Access, and Audit Administration',()=>{
 it('admin route does not load identities without explicit catalog.grant.manage capability',()=>{
  const f=vi.fn();
  vi.stubGlobal('fetch',f);
  scope.selectedCatalog.capabilities=['catalog.read'];
  render(<LocalUsers/>);
  expect(screen.getByText(/Správa vyžaduje explicitní/)).toBeInTheDocument();
  expect(f).not.toHaveBeenCalled();
 });

 it('dangerous admin action requires confirmation and sensitive detail is removed on logout',async()=>{
  const user={id:2,login:'gen-reader',displayName:'GENERATED',active:true,enabled:true,validFrom:'2026-01-01T00:00:00Z',validUntil:null,lockedUntil:null};
  const f=vi.fn().mockImplementation((url:string)=>Promise.resolve(new Response(JSON.stringify(
   url.endsWith('/profiles')?{version:'mes-profiles-v2',profiles:[]}:
   url.includes('/audit?')?[{id:9,actor_id:1,target_id:2,event:'GRANT_CHANGED',occurred_at:'2026-01-02T00:00:00Z',capability:'item.read',grant_active:true}]:
   url.endsWith('/2')?{user,membership:[{active:true,valid_from:'2026-01-01T00:00:00Z',valid_until:null}],grants:[{capability:'item.read',active:true,valid_from:'2026-01-01T00:00:00Z',valid_until:null},{capability:'item.professional.write',active:true,valid_from:'2026-01-01T00:00:00Z',valid_until:null}],effectiveCapabilities:['catalog.read','item.read']}:
   [user]
  ))));
  vi.stubGlobal('fetch',f);
  vi.spyOn(window,'confirm').mockReturnValue(false);
  const view=render(<LocalUsers/>);
  fireEvent.click(await screen.findByRole('button',{name:'gen-reader — GENERATED'}));
  await screen.findByRole('heading',{name:'gen-reader'});
  expect(screen.getByText(/item\.professional\.write: Povoleno \(aktivace pouze offline\)/)).toBeInTheDocument();
  const count=f.mock.calls.length;
  fireEvent.click(screen.getByRole('button',{name:'Vydat jednorázový reset'}));
  expect(window.confirm).toHaveBeenCalledOnce();
  expect(f).toHaveBeenCalledTimes(count);

  fireEvent.click(screen.getByRole('button',{name:'Načíst administrativní audit'}));
  await screen.findByText(/aktér #1 → cíl #2 — GRANT_CHANGED/);

  auth.token=null;
  view.rerender(<LocalUsers/>);
  expect(screen.queryByRole('heading',{name:'gen-reader'})).not.toBeInTheDocument();
  await waitFor(()=>expect(screen.getByText('Přihlaste se pro správu uživatelů.')).toBeInTheDocument());
 });

 it('profile preview shows planned inactive writes, never mutates grants on preview, and applies with expectedState',async()=>{
  const profile={id:'PROFILE_CURATOR',name:'Kurátor',description:'Čtení a oddělený zápis',capabilities:['catalog.read','item.read','dictionary.read'],plannedInactive:['item.inventory.write','item.professional.write'],restrictions:['Bez správy účtů'],delegable:true};
  const props={catalog:1,userId:2,token:'memory',from:'2026-01-01T00:00:00Z',until:'',effective:['catalog.read'],onChanged:vi.fn(),onFatal:vi.fn()};
  vi.spyOn(window,'confirm').mockReturnValue(true);
  const fetched=vi.fn(async(url:string,_options:RequestInit)=>new Response(JSON.stringify(
   url.endsWith('/profiles')?{version:'mes-profiles-v2',profiles:[profile]}:
   url.includes('/audit?')?[]:
   {profile,effectiveCapabilities:[],additions:['item.read','dictionary.read'],blockers:[],expectedState:'frozen-state',applicable:true}
  ),{status:200}));
  vi.stubGlobal('fetch',fetched);

  render(<UserProfiles {...props}/>);
  await screen.findByRole('option',{name:'Kurátor'});
  fireEvent.change(screen.getByLabelText('Profilová šablona'),{target:{value:'PROFILE_CURATOR'}});
  fireEvent.click(screen.getByRole('button',{name:'Zobrazit náhled oprávnění'}));
  const applyBtn=await screen.findByRole('button',{name:'Potvrdit čtecí šablonu'});
  expect(screen.getByText(/Plánované \/ neaktivní:/)).toHaveTextContent('Inventární editace předmětů, Odborná kurátorská editace');
  expect(fetched.mock.calls.filter(c=>c[1].method==='PUT')).toHaveLength(0);

  fireEvent.click(applyBtn);
  await waitFor(()=>expect(props.onChanged).toHaveBeenCalledOnce());
  const putReq=fetched.mock.calls.find(c=>c[1].method==='PUT');
  expect(JSON.parse(putReq![1].body as string)).toMatchObject({version:'mes-profiles-v2',profileId:'PROFILE_CURATOR',expectedState:'frozen-state'});
 });

 it('posts explicit finite capability share decision with SHA256 evidence and renders forensic audit in Admin page',async()=>{
  scope.selectedCatalog={id:1,capabilities:['catalog.read','catalog.grant.manage','catalog.access.delegate','catalog.audit.read']};
  const fetcher=vi.fn().mockImplementation((url:string)=>Promise.resolve(new Response(JSON.stringify(
   url.includes('/users')?[]:url.includes('/shares')?[]:[{id:5,area:'GRANT',actor_id:1,subject_id:2,item_id:null,operation:'GRANT',occurred_at:'2026-01-01T00:00:00Z',digest:'d1',previous_digest:'d0'}]
  ),{status:200})));
  vi.stubGlobal('fetch',fetcher);

  render(<MemoryRouter><Admin/></MemoryRouter>);
  await waitFor(()=>expect(fetcher).toHaveBeenCalled());

  fireEvent.change(screen.getByLabelText('Identita příjemce'),{target:{value:'2'}});
  fireEvent.change(screen.getByLabelText('Důvod rozhodnutí'),{target:{value:'Synthetic collaboration'}});
  fireEvent.change(screen.getByLabelText('SHA256 podkladu'),{target:{value:'a'.repeat(64)}});
  fireEvent.click(screen.getByText('Udělit omezené právo'));

  await waitFor(()=>{
   const postShare=fetcher.mock.calls.find(c=>String(c[0]).endsWith('/access/shares')&&c[1]?.method==='POST');
   expect(postShare).toBeDefined();
   const body=JSON.parse(postShare![1].body);
   expect(body.subjectId).toBe(2);
   expect(body.capability).toBe('catalog.read');
  });

  fireEvent.click(screen.getByRole('button',{name:'Vyhledat audit'}));
  await screen.findByText('d1');
 });

 it('computes UTC share intervals and rejects invalid custom end',()=>{
  const now=new Date('2026-10-24T12:00:00+02:00');
  const interval=shareInterval('2','',now);
  expect(Date.parse(interval.validUntil)-Date.parse(interval.validFrom)).toBe(2*86400000);
  for(const end of ['','invalid','2020-01-01T00:00'])expect(()=>shareInterval('custom',end)).toThrow();
 });
});

it('updates only the selected user display name with expected current identity and existing authorization',async()=>{
 let user={id:2,login:'gen-reader',displayName:'GENERATED',active:true,enabled:true,validFrom:'2026-01-01T00:00:00Z',validUntil:null,lockedUntil:null};
 const f=vi.fn().mockImplementation((url:string,init:any={})=>{
  if(url.endsWith('/identity')){expect(init.method).toBe('PUT');expect(JSON.parse(init.body)).toEqual({displayName:'Kurátor Čeřovský',expectedDisplayName:'GENERATED'});user={...user,displayName:'Kurátor Čeřovský'};return Promise.resolve(new Response(JSON.stringify(user)));}
  const body=url.endsWith('/profiles')?{version:'mes-profiles-v2',profiles:[]}:url.endsWith('/2')?{user,membership:[],grants:[],effectiveCapabilities:[]}:[user];return Promise.resolve(new Response(JSON.stringify(body)));
 });vi.stubGlobal('fetch',f);vi.spyOn(window,'confirm').mockReturnValue(true);render(<LocalUsers/>);fireEvent.click(await screen.findByRole('button',{name:'gen-reader — GENERATED'}));await screen.findByRole('heading',{name:'gen-reader'});fireEvent.change(screen.getByLabelText('Zobrazované jméno uživatele'),{target:{value:'Kurátor Čeřovský'}});fireEvent.click(screen.getByRole('button',{name:'Uložit zobrazované jméno'}));await screen.findByRole('button',{name:'gen-reader — Kurátor Čeřovský'});expect(f.mock.calls.filter(([url])=>String(url).endsWith('/identity'))).toHaveLength(1);
});
