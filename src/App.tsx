import { Routes, Route, Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { GovButton } from '@gov-design-system-ce/react';
import { AuthProvider, useAuth } from './components/AuthContext';
import Catalog from './pages/Catalog';
import Detail from './pages/Detail';
import Feedback from './pages/Feedback';
import AdminItems from './pages/AdminItems';
import Login from './pages/Login';
import ProtectedRoute, { getUserRoles } from './components/ProtectedRoute';
import AdminItemForm from "@/pages/AdminItemForm";
import DataImport from '@/pages/DataImport';
import { importTexts } from '@/features/import/texts';

/**
 * POMOCNÁ KOMPONENTA PRO ODPOČET SEZENÍ
 * Zobrazuje zbývající čas a varuje při blížícím se odhlášení
 */
function SessionTimer() {
    const { timeLeft, token } = useAuth();

    // Pokud uživatel není přihlášen nebo čas není dostupný, nic nevykreslujeme
    if (!token || timeLeft === null) return null;

    // Formátování na MM:SS
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    // Kritický stav: méně než 5 minut (300 sekund)
    const isUrgent = timeLeft < 300;

    return (
        <div
            role="timer"
            aria-live="polite"
            className={`flex items-center gap-3 px-4 py-2 rounded border shadow-sm transition-all duration-500 ${
                isUrgent
                    ? 'bg-red-50 border-red-300 text-red-700 animate-pulse'
                    : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}
        >
            <span className="text-xl">{isUrgent ? '⚠️' : '🕒'}</span>
            <div className="flex flex-col items-start leading-none">
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-80 mb-0.5">Odhlášení za</span>
                <span className="text-sm font-mono font-black">{timeString}</span>
            </div>
        </div>
    );
}

/**
 * VNITŘNÍ OBSAH APLIKACE
 */
function AppContent() {
    const { pathname } = useLocation();
    const { token, logout } = useAuth();
    const navigate = useNavigate();
    const isLoginPage = pathname === '/login';

    const roles = getUserRoles(token);
    const isAdmin = roles.includes('ADMIN') || roles.includes('ROLE_ADMIN');
    const isCurator = roles.includes('CURATOR') || roles.includes('ROLE_CURATOR');
    const roleName = token ? (isAdmin ? 'Administrátor' : (isCurator ? 'Kurátor' : 'Uživatel')) : 'Host';
    const roleLetter = token ? (isAdmin ? 'A' : (isCurator ? 'K' : 'U')) : '👤';

    const getBreadcrumb = () => {
        if (pathname === '/') return 'Katalog sbírek';
        if (pathname === '/feedback') return 'Připomínky';
        if (pathname === '/login') return 'Vstup pro kurátory';
        if (pathname === '/admin/import') return 'Import databáze';
        if (pathname === '/admin/items') return 'Správa exponátů';
        if (pathname.includes('/admin/items/new')) return 'Nový sbírkový předmět';
        if (pathname.includes('/admin/items/view')) return 'Prohlížení sbírkového předmětu';
        if (pathname.includes('/admin/items/edit')) return 'Editace sbírkového předmětu';
        if (pathname.includes('/items/')) return 'Detail předmětu';
        return 'Katalog';
    };

    return (
        <div className="flex min-h-screen bg-gray-100 text-gray-800 font-sans">

            {/* SIDEBAR */}
            {!isLoginPage && (
                <aside className="w-[280px] bg-[#00204a] text-white fixed h-full z-[1000] shadow-xl flex flex-col justify-between border-r border-[#00173a]">
                    <div className="p-6 space-y-8 flex-1">
                        {/* LOGO SEKCE */}
                        <div className="flex items-center gap-3 border-b border-white/10 pb-6">
                            <div className="w-10 h-10 bg-[#ffbc34] text-black font-extrabold rounded flex items-center justify-center shadow-md text-lg">
                                MZM
                            </div>
                            <div className="leading-tight">
                                <h1 className="text-sm font-black tracking-tight text-white uppercase">MES</h1>
                                <p className="text-[10px] text-gray-300 font-semibold uppercase tracking-wider">Muzejní Evidence Sbírek</p>
                            </div>
                        </div>

                        <nav className="space-y-6">
                            {/* VEŘEJNÁ SEKCE */}
                            <div>
                                <span className="text-[11px] uppercase text-blue-200 font-black tracking-wider block mb-3">VEŘEJNÁ ČÁST</span>
                                <div className="space-y-1">
                                    <Link
                                        to="/"
                                        className={`flex items-center gap-3 px-4 py-3 rounded text-sm font-bold transition-all focus:outline-none focus:ring-2 focus:ring-[#ffbc34] ${
                                            pathname === '/'
                                                ? 'bg-[#ffbc34] text-black shadow font-black'
                                                : 'text-white hover:bg-white/15 hover:text-white'
                                        }`}
                                    >
                                        <span>📂</span>
                                        <span>Katalog sbírek</span>
                                    </Link>

                                    <Link
                                        to="/feedback"
                                        className={`flex items-center gap-3 px-4 py-3 rounded text-sm font-bold transition-all focus:outline-none focus:ring-2 focus:ring-[#ffbc34] ${
                                            pathname === '/feedback'
                                                ? 'bg-[#ffbc34] text-black shadow font-black'
                                                : 'text-white hover:bg-white/15 hover:text-white'
                                        }`}
                                    >
                                        <span>💬</span>
                                        <span>Připomínky</span>
                                    </Link>
                                </div>
                            </div>

                            {/* ADMIN SEKCE */}
                            <div>
                                <span className="text-[11px] uppercase text-blue-200 font-black tracking-wider block mb-3">KURÁTORSKÁ SPRÁVA</span>
                                <div className="space-y-1">
                                    {token ? (
                                        <>
                                            <Link
                                                to="/admin/items"
                                                className={`flex items-center gap-3 px-4 py-3 rounded text-sm font-bold transition-all focus:outline-none focus:ring-2 focus:ring-[#ffbc34] ${
                                                    pathname.startsWith('/admin/items')
                                                        ? 'bg-[#ffbc34] text-black shadow font-black'
                                                        : 'text-white hover:bg-white/15 hover:text-white'
                                                }`}
                                            >
                                                <span>🛠️</span>
                                                <span>Správa exponátů</span>
                                            </Link>

                                             {isAdmin && (
                                                <Link
                                                    to="/admin/import"
                                                    aria-current={pathname === '/admin/import' ? 'page' : undefined}
                                                    className={`flex items-center gap-3 px-4 py-3 rounded text-sm font-bold transition-all focus:outline-none focus:ring-2 focus:ring-[#ffbc34] ${
                                                        pathname === '/admin/import'
                                                            ? 'bg-[#ffbc34] text-black shadow font-black'
                                                            : 'text-white hover:bg-white/15 hover:text-white'
                                                    }`}
                                                >
                                                    <span>📥</span>
                                                    <span>{importTexts.title}</span>
                                                </Link>
                                             )}
                                        </>
                                    ) : (
                                        <Link
                                            to="/login"
                                            className={`flex items-center gap-3 px-4 py-3 rounded text-sm font-bold transition-all border border-dashed border-white/30 focus:outline-none focus:ring-2 focus:ring-[#ffbc34] ${
                                                pathname === '/login'
                                                    ? 'bg-[#ffbc34] text-black border-none shadow font-black'
                                                    : 'text-white hover:bg-white/15 hover:text-white'
                                            }`}
                                        >
                                            <span>🔐</span>
                                            <span>Vstup pro kurátory</span>
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </nav>
                    </div>

                    {/* SPODNÍ ODHLÁŠENÍ */}
                    {token && (
                        <div className="p-6 border-t border-white/10 bg-[#00173a]">
                            <GovButton
                                type="solid"
                                color="error"
                                expanded
                                size="s"
                                onClick={logout}
                            >
                                odhlásit se
                            </GovButton>
                        </div>
                    )}
                </aside>
            )}

            {/* HLAVNÍ OBSAH APLIKACE */}
            <main className={`flex-1 ${!isLoginPage ? 'ml-[280px]' : ''} min-h-screen flex flex-col`}>

                {/* HEADER */}
                {!isLoginPage && (
                    <header className="bg-white shadow-sm border-b border-gray-200 px-8 py-4 flex justify-between items-center sticky top-0 z-[999]">
                        <nav aria-label="Drobečková navigace" className="text-xs uppercase tracking-widest text-gray-500 font-bold">
                            Domů <span className="mx-2 text-gray-300">/</span> <span className="text-[#00204a]">{getBreadcrumb()}</span>
                        </nav>

                        {/* PRAVÁ ČÁST HEADERU */}
                        <div className="flex items-center gap-6">
                            {/* INTEGROVANÝ ODPOČET ČASU */}
                            <SessionTimer />

                            {/* UŽIVATELSKÉ PROFILOVÉ POLÍČKO */}
                            <div className="flex items-center gap-3 border-l border-gray-100 pl-6 text-sm font-medium">
                                <div className="flex flex-col text-right leading-tight">
                                    <span className="text-[9px] uppercase text-gray-400 font-extrabold tracking-wider">Role</span>
                                    <span className="text-xs font-bold text-gray-700">{roleName}</span>
                                </div>
                                <span className={`w-9 h-10 rounded font-black flex items-center justify-center shadow-inner ${
                                    token ? 'bg-[#ffbc34] text-black' : 'bg-gray-100 text-gray-500'
                                }`}>
                                    {roleLetter}
                                </span>
                            </div>
                        </div>
                    </header>
                )}

                {/* ROUTY */}
                <div className="p-8 flex-1">
                    <Routes>
                        <Route path="/" element={<Catalog />} />
                        <Route path="/items/:id" element={<Detail />} />
                        <Route path="/feedback" element={<Feedback />} />
                        <Route path="/login" element={<Login />} />

                        <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
                            <Route path="/admin/import" element={<DataImport />} />
                        </Route>

                        <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'CURATOR']} />}>
                            <Route path="/admin/items" element={<AdminItems />} />
                            <Route path="/admin/items/new" element={<AdminItemForm />} />
                            <Route path="/admin/items/view/:id" element={<AdminItemForm readOnly={true} />} />
                            <Route path="/admin/items/edit/:id" element={<AdminItemForm />} />
                        </Route>

                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </div>
            </main>
        </div>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
}
