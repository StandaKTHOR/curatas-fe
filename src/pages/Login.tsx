import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../lib/api'
import { useAuth } from '../components/AuthContext' // OPRAVENÁ CESTA

import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

export default function Login() {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const navigate = useNavigate()
    const { setToken } = useAuth()

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const response = await login({ username, password })

            // Nastartujeme stopky pro 60 min limit
            localStorage.setItem('loginTime', Date.now().toString());

            // Uložíme token do kontextu
            const token = response?.token || localStorage.getItem('token');
            setToken(token);

            navigate('/admin/items')
        } catch (err: any) {
            setError(err.message || "Neplatné přihlašovací údaje")
        } finally {
            setLoading(false)
        }
    }

    return (
        /* Celostránkové tmavé pozadí */
        <div className="fixed inset-0 flex items-center justify-center bg-[#1f262d] z-[9999]">

            {/* HLAVNÍ KONTEJNER - Žádná bílá, jen tmavé odstíny */}
            <div className="w-full max-w-[420px] bg-[#1a2026] rounded-2xl overflow-hidden border border-white/5 shadow-[0_30px_100px_rgba(0,0,0,0.6)] animate-in fade-in zoom-in duration-500">

                {/* HORNÍ ČÁST S LOGEM */}
                <div className="pt-12 pb-8 text-center bg-[#161b20]">
                    <div className="w-20 h-20 bg-[#ffbc34] rounded-full flex items-center justify-center text-black font-extrabold text-4xl mx-auto mb-6 shadow-[0_0_40px_rgba(255,188,52,0.15)]">
                        A
                    </div>
                    <h1 className="text-2xl font-black tracking-tight text-white uppercase">
                        Zemské <span className="text-[#ffbc34]">MUSEUM</span>
                    </h1>
                    <p className="text-gray-500 text-[9px] uppercase tracking-[4px] mt-2 font-bold opacity-50">
                        Intranetsystém správy
                    </p>
                </div>

                {/* ŽLUTÝ AKCENT */}
                <div className="h-[3px] bg-gradient-to-r from-transparent via-[#ffbc34] to-transparent w-full opacity-80"></div>

                {/* FORMULÁŘ */}
                <div className="p-10 space-y-8">
                    <div className="text-center">
                        <h2 className="text-white text-lg font-bold tracking-tight">Vstup kurátora</h2>
                        <p className="text-gray-500 text-[11px] mt-1 font-medium">Odborná správa kulturního dědictví</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-3">
                            <Label htmlFor="username" className="text-[10px] uppercase font-bold text-gray-400 tracking-[2px] ml-1">
                                Uživatelské jméno
                            </Label>
                            <Input
                                id="username"
                                type="text"
                                placeholder="např. novak_k"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                className="bg-[#1f262d] border-white/5 text-white placeholder:text-gray-700 focus:border-[#ffbc34] focus:ring-[#ffbc34]/10 h-12 rounded-xl transition-all"
                            />
                        </div>

                        <div className="space-y-3">
                            <Label htmlFor="password" className="text-[10px] uppercase font-bold text-gray-400 tracking-[2px] ml-1">
                                Heslo
                            </Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="bg-[#1f262d] border-white/5 text-white focus:border-[#ffbc34] focus:ring-[#ffbc34]/10 h-12 rounded-xl transition-all"
                            />
                        </div>

                        {error && (
                            <div className="p-4 bg-red-900/20 border-l-2 border-red-500 text-[11px] text-red-400 font-bold animate-in slide-in-from-top-1">
                                <span className="mr-2">✕</span> {error}
                            </div>
                        )}

                        <div className="pt-4">
                            <Button
                                className="w-full bg-[#ffbc34] hover:bg-[#ffbc34]/90 text-black font-black uppercase tracking-widest py-8 text-xs shadow-xl transition-all active:scale-[0.97] rounded-xl"
                                type="submit"
                                disabled={loading}
                            >
                                {loading ? "Verifikace..." : "AUTORIZOVANÝ VSTUP"}
                            </Button>
                        </div>
                    </form>
                </div>

                {/* DECENTNÍ PATIČKA */}
                <div className="py-6 text-center bg-[#161b20] border-t border-white/5">
                    <p className="text-[8px] text-gray-600 uppercase font-bold tracking-[3px]">
                        Secure Terminal Access v2.6
                    </p>
                </div>
            </div>
        </div>
    )
}