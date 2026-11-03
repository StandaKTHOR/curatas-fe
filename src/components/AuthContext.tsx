import {useRef} from 'react';
import {localAuthEnabled,acceptLocalToken,localRequest,restoreLocal,effectiveToken} from '../features/localAuth/localAuthClient';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext<any>(null);

const LegacyAuthProvider = ({ children }: { children: React.ReactNode }) => {
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

function LocalProvider({children}:{children:React.ReactNode}){
 const navigate=useNavigate(),epoch=useRef(0);const [token,setToken]=useState<string|null>(null),[restoring,setRestoring]=useState(true),[currentUser,setCurrent]=useState<{issuer:string;subject:string}|null>(null),[error,setError]=useState('');
 const clear=useCallback(()=>{epoch.current++;acceptLocalToken(null);setToken(null);setCurrent(null);localStorage.removeItem('token');localStorage.removeItem('loginTime');},[]);
 const adopt=useCallback(async(reply:{token:string},generation:number)=>{if(generation!==epoch.current)return;acceptLocalToken(reply.token);const me=await localRequest('/api/auth/local/me',undefined,reply.token);if(generation!==epoch.current)return;setCurrent(me);setToken(old=>old??reply.token);},[]);
 const logout=useCallback(()=>{sessionStorage.setItem('curatas.logout-pending','1');clear();setError('');navigate('/login');void localRequest('/api/auth/local/logout',{}).then(()=>sessionStorage.removeItem('curatas.logout-pending')).catch(()=>setError('Odhlášení na serveru se nepotvrdilo; opakujte je po obnovení spojení.'));const channel=typeof window.BroadcastChannel==='undefined'?null:new window.BroadcastChannel('curatas-local-auth');channel?.postMessage('logout');channel?.close();},[clear,navigate]);
 const loginLocal=useCallback(async(username:string,password:string)=>{clear();if(sessionStorage.getItem('curatas.logout-pending')){await localRequest('/api/auth/local/logout',{});sessionStorage.removeItem('curatas.logout-pending');}const generation=epoch.current;const reply=await localRequest('/api/auth/local/login',{username,password});if(generation!==epoch.current){await localRequest('/api/auth/local/logout',{});return;}await adopt(reply,generation);},[clear,adopt]);
 useEffect(()=>{localStorage.removeItem('token');localStorage.removeItem('loginTime');let cancelled=false;const generation=epoch.current;const boot=async()=>{if(sessionStorage.getItem('curatas.logout-pending')){await localRequest('/api/auth/local/logout',{});sessionStorage.removeItem('curatas.logout-pending');return;}const reply=await restoreLocal();if(!cancelled)await adopt(reply,generation);};void boot().catch(()=>{if(!cancelled){clear();if(sessionStorage.getItem('curatas.logout-pending'))setError('Odhlášení na serveru se nepotvrdilo; opakujte je po obnovení spojení.');}}).finally(()=>{if(!cancelled)setRestoring(false);});return()=>{cancelled=true;};},[clear,adopt]);
 useEffect(()=>{if(!token)return;const refresh=setInterval(()=>{const generation=epoch.current;void restoreLocal().then(reply=>adopt(reply,generation)).catch(()=>{clear();navigate('/login');});},240000);const poll=setInterval(()=>{const generation=epoch.current;void localRequest('/api/auth/local/me',undefined,effectiveToken(token)).catch(()=>{if(generation===epoch.current){clear();navigate('/login');}});},30000);return()=>{clearInterval(refresh);clearInterval(poll);};},[token,adopt,clear,navigate]);
 useEffect(()=>{if(typeof window.BroadcastChannel==='undefined')return;const channel=new window.BroadcastChannel('curatas-local-auth');channel.onmessage=e=>{if(e.data==='logout'){sessionStorage.setItem('curatas.logout-pending','1');clear();navigate('/login');}};return()=>channel.close();},[clear,navigate]);
 return <AuthContext.Provider value={{token,setToken:()=>{},logout,timeLeft:null,loginLocal,currentUser,restoring,error}}>{error&&<p role="alert">{error}<button onClick={logout}>Opakovat odhlášení</button></p>}{children}</AuthContext.Provider>;
}
export const AuthProvider=({children}:{children:React.ReactNode})=>localAuthEnabled()?<LocalProvider>{children}</LocalProvider>:<LegacyAuthProvider>{children}</LegacyAuthProvider>;
