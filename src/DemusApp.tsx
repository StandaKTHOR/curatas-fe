import {catalogHeaderRole} from './features/catalog/catalogPresentation';
import { CatalogProvider, useCatalog } from './features/catalog/CatalogContext';
import { bindOriginalCatalog } from './features/catalog/originalAdapter';
import { Routes, Route, NavLink, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/AuthContext';
import Catalog from './pages/Catalog';
import Feedback from './pages/Feedback';
import Admin from './pages/Admin';
import AdminItems from './pages/AdminItems';
import Login from './pages/Login';
import ProtectedRoute, { getUserRoles } from './components/ProtectedRoute';
import AdminItemForm from './pages/AdminItemForm';
import DataImport from './pages/DataImport';
import { importTexts } from './features/import/texts';
import { useEffect, useLayoutEffect, useRef } from 'react';

function AppContent() {
    const appRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLElement>(null);
    const { pathname, search } = useLocation();
    const navigate=useNavigate();const attempted=useRef('');
    const { token, logout, timeLeft, restoring } = useAuth();
    const { catalogs,selectedCatalog,selectCatalog,loading:catalogLoading,error:catalogError,clearAccess }=useCatalog();
    bindOriginalCatalog(selectedCatalog,token);
    useEffect(()=>{
        const id=new URLSearchParams(search).get('catalog');
        if(!token||catalogLoading||!id||!/^[1-9][0-9]*$/.test(id)||!Number.isSafeInteger(Number(id))||selectedCatalog?.id===Number(id))return;
        if(attempted.current===token+':'+id)return;attempted.current=token+':'+id;void selectCatalog(Number(id));
    },[token,catalogLoading,search,selectedCatalog,selectCatalog]);
    useEffect(()=>{const deny=()=>clearAccess();window.addEventListener('curatas:scoped-denied',deny);return()=>window.removeEventListener('curatas:scoped-denied',deny);},[clearAccess]);
    const roles = getUserRoles(token);
    const admin = roles.includes('ADMIN') || roles.includes('ROLE_ADMIN');
    const login = pathname === '/login';
    useLayoutEffect(() => {
        if (!menuRef.current || !appRef.current) return;
        const update = () => appRef.current?.style.setProperty('--demus-menu-height', `${menuRef.current?.getBoundingClientRect().height || 0}px`);
        const observer = new ResizeObserver(update); observer.observe(menuRef.current); update();
        return () => observer.disconnect();
    }, [login]);
    return <div className="demus-app" ref={appRef}>
        {!login && <header className="demus-app-menu" ref={menuRef}>
            <div className="demus-titlebar"><strong>CURATAS — Katalog sbírek</strong>
                <span>{token ? catalogHeaderRole(roles,selectedCatalog?.capabilities??[]) : 'Veřejný katalog'}</span>
            </div>
            <nav aria-label="Hlavní menu" className="demus-menubar">
                <NavLink end to="/">Katalog sbírek</NavLink>
                {token && <NavLink to="/admin/items">Sbírky — evidence předmětů</NavLink>}
                {token && selectedCatalog?.capabilities?.some(c => ['catalog.grant.manage', 'catalog.access.delegate', 'catalog.audit.read'].includes(c)) && <NavLink to="/admin">Správa uživatelů a přístupů</NavLink>}
                {admin && <NavLink to="/admin/import">{importTexts.title}</NavLink>}
                <NavLink to="/feedback">Připomínky</NavLink>
                {token && <label>Katalog <select aria-label="Katalog" disabled={catalogLoading} value={selectedCatalog?.id??''}
                    onChange={e=>{const id=e.target.value?Number(e.target.value):null;void selectCatalog(id).then(ok=>{if(ok)navigate(id?`/admin/items?catalog=${id}`:'/admin/items');});}}>
                    <option value="">Vyberte katalog</option>{catalogs.map(c=><option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
                </select></label>}
                {catalogError && <span role="alert">{catalogError}</span>}
                <span className="demus-menu-spacer" />
                {token && timeLeft !== null && <span role="timer" aria-live="off">
                    Odhlášení za {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                </span>}
                {token ? <button type="button" onClick={logout}>Odhlásit se</button>
                    : <NavLink to="/login">Vstup pro kurátory</NavLink>}
            </nav>
        </header>}
        <main className="demus-workspace">
            {restoring?<p role="status">Obnovuji přihlášení…</p>:<Routes key={`${token??'anonymous'}:${selectedCatalog?.id??'none'}`}>
                <Route path="/" element={!token?<Navigate to="/login" replace />:selectedCatalog?<Catalog />:<p role="status">Vyberte katalog.</p>} />
                <Route path="/items/:id" element={selectedCatalog?<AdminItemForm readOnly />:<Navigate to="/login" replace />} />
                <Route path="/detail/:id" element={selectedCatalog?<AdminItemForm readOnly />:<Navigate to="/login" replace />} />
                <Route path="/feedback" element={<Feedback />} />
                <Route path="/login" element={<Login />} />
                <Route path="/admin" element={!token?<Navigate to="/login" replace />:selectedCatalog?<Admin />:<p role="status">Vyberte katalog.</p>} />
                <Route path="/scoped/users" element={!token?<Navigate to="/login" replace />:selectedCatalog?<Admin />:<p role="status">Vyberte katalog.</p>} />
                <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
                    <Route path="/admin/import" element={<DataImport />} />
                </Route>
                <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'CURATOR']} />}>
                    <Route path="/admin/items" element={selectedCatalog?<AdminItems />:<p role="status">Vyberte katalog.</p>} />
                    <Route path="/admin/items/new" element={selectedCatalog?<AdminItemForm />:<p role="status">Vyberte katalog.</p>} />
                    <Route path="/admin/items/view/:id" element={selectedCatalog?<AdminItemForm readOnly />:<p role="status">Vyberte katalog.</p>} />
                    <Route path="/admin/items/edit/:id" element={selectedCatalog?<AdminItemForm />:<p role="status">Vyberte katalog.</p>} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>}
        </main>
    </div>;
}

export default function DemusApp() {
    return <AuthProvider><CatalogProvider><AppContent /></CatalogProvider></AuthProvider>;
}
