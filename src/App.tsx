import { Routes, Route, Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import Catalog from './pages/Catalog'
import Detail from './pages/Detail'
import Feedback from './pages/Feedback'
import AdminItems from './pages/AdminItems'
import Login from './pages/Login'
import ProtectedRoute from './components/ProtectedRoute'
import AdminItemForm from "@/pages/AdminItemForm";

export default function App() {
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const isLoginPage = pathname === '/login';

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    return (
        <div className="flex min-h-screen font-sans text-[#3e5569]">
            {/* SIDEBAR - Podle .left-sidebar z tvého template */}
            {!isLoginPage && (
                <aside className="w-[250px] bg-[#1f262d] text-[#a1a8b1] fixed h-full z-[1000] shadow-2xl transition-all">
                    <div className="p-6">
                        {/* LOGO sekce */}
                        <div className="mb-10 flex items-center gap-2">
                            <div className="w-8 h-8 bg-[#ffbc34] rounded-full flex items-center justify-center text-black font-bold">A</div>
                            <h1 className="text-xl font-bold tracking-tight text-white">Zemské <span className="text-[#ffbc34]">MUSEUM</span></h1>
                        </div>

                        <nav className="space-y-1">
                            {/* Sekce pro všechny zaměstnance */}
                            <p className="text-[10px] uppercase text-[#6c757d] tracking-[2px] mb-4 mt-6 font-bold">Katalog a kontakt</p>

                            <Link to="/" className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${pathname === '/' ? 'bg-[#ffbc34] text-black shadow-lg' : 'hover:bg-white/5 hover:text-white'}`}>
                                <span className="text-lg">📁</span>
                                <span className="text-sm font-medium">KATALOG SBÍREK</span>
                            </Link>

                            <Link to="/feedback" className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${pathname === '/feedback' ? 'bg-[#ffbc34] text-black shadow-lg' : 'hover:bg-white/5 hover:text-white'}`}>
                                <span className="text-lg">💬</span>
                                <span className="text-sm font-medium">PŘIPOMÍNKY</span>
                            </Link>

                            {/* Sekce pro Kurátory / Adminy - INTRANET */}
                            <p className="text-[10px] uppercase text-[#6c757d] tracking-[2px] mb-4 mt-10 font-bold">Správa (Intranet)</p>

                            <Link to="/admin/items" className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${pathname.startsWith('/admin') ? 'bg-[#ffbc34] text-black shadow-lg' : 'hover:bg-white/5 hover:text-white'}`}>
                                <span className="text-lg">🛠️</span>
                                <span className="text-sm font-medium">SPRÁVA EXPONÁTŮ</span>
                            </Link>

                            {/* ODHLÁŠENÍ */}
                            {token && (
                                <div className="pt-20">
                                    <button
                                        onClick={handleLogout}
                                        className="w-full text-left flex items-center gap-3 px-4 py-3 text-xs text-red-400 hover:text-red-300 transition-colors uppercase tracking-widest font-bold border border-red-900/30 rounded"
                                    >
                                        <span>🚪</span> ODHLÁSIT SE
                                    </button>
                                </div>
                            )}
                        </nav>
                    </div>
                </aside>
            )}

            {/* HLAVNÍ OBSAH - Podle .page-wrapper */}
            <main className={`flex-1 ${!isLoginPage ? 'ml-[250px]' : ''} bg-[#eef1f5] min-h-screen`}>
                {/* TOP BAR / BREADCRUMBS */}
                {!isLoginPage && (
                    <header className="bg-white shadow-sm px-10 py-4 flex justify-between items-center border-b border-gray-200">
                        <div className="text-xs uppercase tracking-widest text-gray-400 font-bold">
                            Domů / {pathname.split('/')[1] || 'Katalog'}
                        </div>
                        <div className="flex items-center gap-4 text-sm font-medium">
                            <span className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">👤</span>
                            Admin Uživatel
                        </div>
                    </header>
                )}

                {/* OBSAH STRÁNKY */}
                <div className="p-10 animate-in fade-in duration-500">
                    <Routes>
                        <Route path="/" element={<Catalog />} />
                        <Route path="/items/:id" element={<Detail />} />
                        <Route path="/feedback" element={<Feedback />} />
                        <Route path="/login" element={<Login />} />

                        {/* Chráněná admin sekce */}
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
    )
}