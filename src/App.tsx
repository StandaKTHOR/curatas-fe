import { Routes, Route, Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './components/AuthContext'
import Catalog from './pages/Catalog'
import Detail from './pages/Detail'
import Feedback from './pages/Feedback'
import AdminItems from './pages/AdminItems'
import Login from './pages/Login'
import ProtectedRoute from './components/ProtectedRoute'
import AdminItemForm from "@/pages/AdminItemForm"

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
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-500 border shadow-sm ${
            isUrgent
                ? 'bg-red-50 border-red-200 text-red-600 animate-pulse'
                : 'bg-gray-50 border-gray-100 text-gray-500'
        }`}>
            <div className="flex flex-col items-end leading-none">
                <span className="text-[9px] uppercase font-bold opacity-70 mb-1">Odhlášení za</span>
                <span className="text-sm font-mono font-black">{timeString}</span>
            </div>
            <span className="text-xl">{isUrgent ? '⚠️' : '🕒'}</span>
        </div>
    );
}

/**
 * VNITŘNÍ OBSAH APLIKACE
 */
function AppContent() {
    const { pathname } = useLocation();
    const { token, logout } = useAuth();
    const isLoginPage = pathname === '/login';

    return (
        <div className="flex min-h-screen font-sans text-[#3e5569]">

            {/* SIDEBAR */}
            {!isLoginPage && (
                <aside className="w-[250px] bg-[#1f262d] text-[#a1a8b1] fixed h-full z-[1000] shadow-2xl transition-all">
                    <div className="p-6">

                        {/* LOGO SEKCE */}
                        <div className="mb-10 flex items-center gap-2">
                            <div className="w-8 h-8 bg-[#ffbc34] rounded-full flex items-center justify-center text-black font-bold shadow-sm">A</div>
                            <h1 className="text-xl font-bold tracking-tight text-white">
                                Zemské <span className="text-[#ffbc34]">MUSEUM</span>
                            </h1>
                        </div>

                        <nav className="space-y-1">
                            {/* VEŘEJNÁ SEKCE */}
                            <p className="text-[10px] uppercase text-[#6c757d] tracking-[2px] mb-4 mt-6 font-bold">Katalog a kontakt</p>

                            <Link to="/" className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all ${pathname === '/' ? 'bg-[#ffbc34] text-black shadow-lg translate-x-1' : 'hover:bg-white/5 hover:text-white'}`}>
                                <span className="text-lg">📁</span>
                                <span className="text-sm font-medium">KATALOG SBÍREK</span>
                            </Link>

                            <Link to="/feedback" className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all ${pathname === '/feedback' ? 'bg-[#ffbc34] text-black shadow-lg translate-x-1' : 'hover:bg-white/5 hover:text-white'}`}>
                                <span className="text-lg">💬</span>
                                <span className="text-sm font-medium">PŘIPOMÍNKY</span>
                            </Link>

                            {/* TLAČÍTKO PRO VSTUP (Jen nepřihlášení) */}
                            {!token && (
                                <Link to="/login" className="flex items-center gap-3 px-4 py-3 mt-2 rounded-md transition-colors hover:bg-white/5 group border border-transparent hover:border-white/10">
                                    <span className="text-lg opacity-70 group-hover:opacity-100 transition-opacity">🔐</span>
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 group-hover:text-white">Vstup pro kurátory</span>
                                </Link>
                            )}

                            {/* ADMIN SEKCE */}
                            {token && (
                                <div className="animate-in fade-in slide-in-from-left duration-500">
                                    <p className="text-[10px] uppercase text-[#6c757d] tracking-[2px] mb-4 mt-10 font-bold border-t border-white/5 pt-6">Správa (Intranet)</p>

                                    <Link to="/admin/items" className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all ${pathname.startsWith('/admin') ? 'bg-[#ffbc34] text-black shadow-lg translate-x-1' : 'hover:bg-white/5 hover:text-white'}`}>
                                        <span className="text-lg">🛠️</span>
                                        <span className="text-sm font-medium">SPRÁVA EXPONÁTŮ</span>
                                    </Link>

                                    <div className="pt-20">
                                        <button
                                            onClick={logout}
                                            className="w-full text-left flex items-center gap-3 px-4 py-3 text-xs text-red-400 hover:text-red-300 transition-all uppercase tracking-widest font-bold border border-red-900/30 rounded hover:bg-red-900/10"
                                        >
                                            <span className="text-base">🚪</span> ODHLÁSIT SE
                                        </button>
                                    </div>
                                </div>
                            )}
                        </nav>
                    </div>
                </aside>
            )}

            {/* HLAVNÍ OBSAH APLIKACE */}
            <main className={`flex-1 ${!isLoginPage ? 'ml-[250px]' : ''} bg-[#eef1f5] min-h-screen`}>

                {/* HEADER S ODPOČTEM SEZENÍ */}
                {!isLoginPage && (
                    <header className="bg-white shadow-sm px-10 py-4 flex justify-between items-center border-b border-gray-200 sticky top-0 z-[999]">
                        <div className="text-xs uppercase tracking-widest text-gray-400 font-bold">
                            Domů / <span className="text-[#3e5569]">{pathname.split('/')[1] || 'Katalog'}</span>
                        </div>

                        {/* PRAVÁ ČÁST HEADERU */}
                        <div className="flex items-center gap-8">

                            {/* INTEGROVANÝ ODPOČET ČASU */}
                            <SessionTimer />

                            <div className="flex items-center gap-4 text-sm font-medium">
                                <div className="flex flex-col text-right">
                                    <span className="text-[10px] uppercase text-gray-400 font-bold leading-none mb-1">Status</span>
                                    <span className="text-xs">{token ? 'Admin Uživatel' : 'Návštěvník (Host)'}</span>
                                </div>
                                <span className={`w-8 h-8 ${token ? 'bg-[#ffbc34] text-black' : 'bg-gray-100 text-gray-400'} rounded-full flex items-center justify-center font-bold transition-colors`}>
                                    {token ? 'A' : '👤'}
                                </span>
                            </div>
                        </div>
                    </header>
                )}

                {/* ROUTES */}
                <div className="p-10">
                    <Routes>
                        <Route path="/" element={<Catalog />} />
                        <Route path="/items/:id" element={<Detail />} />
                        <Route path="/feedback" element={<Feedback />} />
                        <Route path="/login" element={<Login />} />

                        <Route element={<ProtectedRoute />}>
                            <Route path="/admin/items" element={<AdminItems />} />
                            <Route path="/admin/items/new" element={<AdminItemForm />} />
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