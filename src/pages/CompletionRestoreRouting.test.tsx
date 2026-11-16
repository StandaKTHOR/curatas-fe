import {render,screen,cleanup} from '@testing-library/react';
import {MemoryRouter,useLocation} from 'react-router-dom';
import {beforeEach,afterEach,expect,it,vi} from 'vitest';
import DemusApp from '../DemusApp';
const state=vi.hoisted(()=>({restoring:true,token:null as string|null}));
vi.mock('../components/AuthContext',()=>({AuthProvider:({children}:any)=>children,useAuth:()=>({...state,logout:vi.fn(),timeLeft:null})}));
vi.mock('../features/catalog/CatalogContext',()=>({CatalogProvider:({children}:any)=>children,useCatalog:()=>({catalogs:[],selectedCatalog:null,selectCatalog:vi.fn(),loading:false,error:null,clearAccess:vi.fn()})}));
vi.mock('./Login',()=>({default:()=> <p>TEST_LOGIN</p>}));
function Path(){return <span aria-label="Test route">{useLocation().pathname}</span>;}
beforeEach(()=>vi.stubGlobal('ResizeObserver',class {observe(){}unobserve(){}disconnect(){}}));
afterEach(()=>{cleanup();vi.unstubAllGlobals();state.restoring=true;state.token=null;});
it('preserves a direct private URL until local session restoration settles',()=>{
 const view=render(<MemoryRouter initialEntries={['/scoped/users?catalog=1']}><Path/><DemusApp/></MemoryRouter>);
 expect(screen.getByRole('status')).toHaveTextContent('Obnovuji přihlášení');expect(screen.getByLabelText('Test route')).toHaveTextContent('/scoped/users');expect(screen.queryByText('TEST_LOGIN')).toBeNull();
 state.restoring=false;state.token='generated-session';view.rerender(<MemoryRouter><Path/><DemusApp/></MemoryRouter>);
 expect(screen.getByLabelText('Test route')).toHaveTextContent('/scoped/users');expect(screen.getByRole('status')).toHaveTextContent('Vyberte katalog');
});
it('redirects anonymous direct access only after session restoration finishes',()=>{
 state.restoring=false;render(<MemoryRouter initialEntries={['/scoped/users']}><Path/><DemusApp/></MemoryRouter>);expect(screen.getByText('TEST_LOGIN')).toBeInTheDocument();expect(screen.getByLabelText('Test route')).toHaveTextContent('/login');
});
