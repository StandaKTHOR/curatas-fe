import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext<any>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [timeLeft, setTimeLeft] = useState<number | null>(null); // Zbývající čas v sekundách
    const navigate = useNavigate();

    const timeoutMs = (Number(import.meta.env.VITE_AUTH_SESSION_TIMEOUT) || 60) * 60 * 1000;

    const logout = useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('loginTime');
        setToken(null);
        setTimeLeft(null);
        navigate('/login');
    }, [navigate]);

    const resetTimer = useCallback(() => {
        if (token) {
            localStorage.setItem('loginTime', Date.now().toString());
        }
    }, [token]);

    useEffect(() => {
        if (!token) return;

        // HLAVNÍ TICKER - Běží každou sekundu pro plynulý odpočet
        const ticker = setInterval(() => {
            const loginTime = localStorage.getItem('loginTime');
            if (loginTime) {
                const now = Date.now();
                const remaining = Math.max(0, Math.floor((Number(loginTime) + timeoutMs - now) / 1000));
                setTimeLeft(remaining);

                if (remaining <= 0) {
                    logout();
                }
            }
        }, 1000);

        // Sledování aktivity
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
        events.forEach(e => window.addEventListener(e, resetTimer));

        return () => {
            clearInterval(ticker);
            events.forEach(e => window.removeEventListener(e, resetTimer));
        };
    }, [token, logout, timeoutMs, resetTimer]);

    return (
        <AuthContext.Provider value={{ token, setToken, logout, timeLeft }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);