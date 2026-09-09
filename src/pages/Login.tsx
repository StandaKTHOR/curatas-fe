import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GovButton, GovFormInput, GovFormLabel } from '@gov-design-system-ce/react';
import { login } from '../lib/api';
import { useAuth } from '../components/AuthContext';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();
    const { setToken } = useAuth();

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await login({ username, password });

            // Nastartujeme stopky pro 60 min limit
            localStorage.setItem('loginTime', Date.now().toString());

            // Uložíme token do kontextu
            const token = response?.token || localStorage.getItem('token');
            setToken(token);

            navigate('/admin/items');
        } catch (err: any) {
            setError(err.message || "Neplatné přihlašovací údaje");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-50 z-[9999]">
            <div className="w-full max-w-[460px] bg-white border border-gray-200 rounded shadow-lg p-10 space-y-8 animate-in fade-in zoom-in duration-500">

                {/* LOGO S NÁZVEM */}
                <div className="text-center border-b border-gray-100 pb-6">
                    <div className="w-16 h-16 bg-[#00204a] text-[#ffbc34] font-black rounded flex items-center justify-center text-3xl mx-auto mb-4 shadow-sm">
                        MZM
                    </div>
                    <h1 className="text-xl font-extrabold text-[#00204a] uppercase tracking-tight">
                        Evidenční systém MES
                    </h1>
                    <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider font-bold">
                        Vstup do neveřejné sekce pro kurátory
                    </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    {/* UŽIVATELSKÉ JMÉNO */}
                    <div className="space-y-2">
                        <GovFormLabel htmlFor="username">
                            Uživatelské jméno
                        </GovFormLabel>
                        <GovFormInput
                            id="username"
                            type="text"
                            placeholder="např. novak_k"
                            value={username}
                            onChange={(e: any) => setUsername(e.target.value)}
                            required
                            disabled={loading}
                        />
                    </div>

                    {/* HESLO */}
                    <div className="space-y-2">
                        <GovFormLabel htmlFor="password">
                            Heslo
                        </GovFormLabel>
                        <GovFormInput
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e: any) => setPassword(e.target.value)}
                            required
                            disabled={loading}
                        />
                    </div>

                    {/* CHYBOVÁ HLÁŠKA */}
                    {error && (
                        <div role="alert" className="p-4 bg-red-50 border border-red-200 text-sm text-red-700 font-bold rounded flex items-center gap-2">
                            <span>✕</span>
                            <span>{error}</span>
                        </div>
                    )}

                    {/* TLAČÍTKO PRO ODESLÁNÍ */}
                    <div className="pt-4">
                        <GovButton
                            type="solid"
                            color="primary"
                            expanded
                            nativeType="submit"
                            disabled={loading}
                        >
                            {loading ? "Ověřování..." : "Autorizovaný vstup"}
                        </GovButton>
                    </div>
                </form>

                {/* PATIČKA FORMULÁŘE */}
                <div className="text-center pt-2 border-t border-gray-100">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                        Moravské zemské muzeum • Brněnský intranet
                    </p>
                </div>
            </div>
        </div>
    );
}
