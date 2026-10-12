import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/AuthContext';
import Catalog from './pages/Catalog';
import Detail from './pages/Detail';
import Feedback from './pages/Feedback';
import AdminItems from './pages/AdminItems';
import Login from './pages/Login';
import ProtectedRoute, { getUserRoles } from './components/ProtectedRoute';
import AdminItemForm from './pages/AdminItemForm';
import DataImport from './pages/DataImport';
import { importTexts } from './features/import/texts';
import { useLayoutEffect, useRef } from 'react';

function AppContent() {
    const appRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLElement>(null);
    const { pathname } = useLocation();
    const { token, logout, timeLeft } = useAuth();
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
                <span>{token ? (admin ? 'Administrátor' : 'Kurátor') : 'Veřejný katalog'}</span>
            </div>
            <nav aria-label="Hlavní menu" className="demus-menubar">
                <NavLink end to="/">Katalog sbírek</NavLink>
                {token && <NavLink to="/admin/items">Sbírky — evidence předmětů</NavLink>}
                {admin && <NavLink to="/admin/import">{importTexts.title}</NavLink>}
                <NavLink to="/feedback">Připomínky</NavLink>
                <span className="demus-menu-spacer" />
                {token && timeLeft !== null && <span role="timer" aria-live="off">
                    Odhlášení za {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                </span>}
                {token ? <button type="button" onClick={logout}>Odhlásit se</button>
                    : <NavLink to="/login">Vstup pro kurátory</NavLink>}
            </nav>
        </header>}
        <main className="demus-workspace">
            <Routes>
                <Route path="/" element={<Catalog />} />
                <Route path="/items/:id" element={<Detail />} />
                <Route path="/detail/:id" element={<Detail />} />
                <Route path="/feedback" element={<Feedback />} />
                <Route path="/login" element={<Login />} />
                <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
                    <Route path="/admin/import" element={<DataImport />} />
                </Route>
                <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'CURATOR']} />}>
                    <Route path="/admin/items" element={<AdminItems />} />
                    <Route path="/admin/items/new" element={<AdminItemForm />} />
                    <Route path="/admin/items/view/:id" element={<AdminItemForm readOnly />} />
                    <Route path="/admin/items/edit/:id" element={<AdminItemForm />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </main>
    </div>;
}

export default function DemusApp() {
    return <AuthProvider><AppContent /></AuthProvider>;
}
