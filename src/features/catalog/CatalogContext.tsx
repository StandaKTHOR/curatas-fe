import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useAuth } from '../../components/AuthContext';
import { CatalogApiError, listCatalogs, resolveCatalog, type AvailableCatalog } from './catalogApi';

interface CatalogContextValue {
    catalogs: AvailableCatalog[];
    selectedCatalog: AvailableCatalog | null;
    loading: boolean;
    error: string | null;
    hasMore: boolean;
    selectCatalog: (id: number | null) => Promise<void>;
    reload: () => Promise<void>;
    loadMore: () => Promise<void>;
}
const CatalogContext = createContext<CatalogContextValue | null>(null);

/** Session-local metadata context. It never scopes or authorizes legacy v1 data. */
export function CatalogProvider({ children }: { children: ReactNode }) {
    const { token, logout } = useAuth();
    // A new authentication session cannot see the previous session's context, even for one render.
    return <SessionCatalogProvider key={token || 'anonymous'} token={token} onUnauthorized={logout}>
        {children}
    </SessionCatalogProvider>;
}
export function SessionCatalogProvider({ token, onUnauthorized, children }: {
    token: string | null; onUnauthorized: () => void; children: ReactNode;
}) {
    const [catalogs, setCatalogs] = useState<AvailableCatalog[]>([]);
    const [selectedCatalog, setSelected] = useState<AvailableCatalog | null>(null);
    const [loading, setLoading] = useState(Boolean(token));
    const [error, setError] = useState<string | null>(null);
    const [nextAfterId, setNext] = useState<number | null>(null);
    const request = useRef<AbortController | null>(null);
    const unauthorized = useRef(onUnauthorized);
    unauthorized.current = onUnauthorized;
    const start = useCallback(() => {
        request.current?.abort();
        const controller = new AbortController(); request.current = controller;
        setLoading(true); setError(null); return controller;
    }, []);
    const fail = useCallback((failure: unknown, controller: AbortController) => {
        if (controller.signal.aborted) return;
        setSelected(null);
        const status = failure instanceof CatalogApiError ? failure.status : 0;
        if (status === 401 || status === 403) { setCatalogs([]); setNext(null); }
        if (status === 401) { setError('Přihlášení vypršelo. Přihlaste se znovu.'); unauthorized.current(); }
        else if (status === 403) setError('Katalogový přístup není pro tento účet povolen.');
        else if (status === 404) setError('Katalog již není dostupný. Vyberte jiný katalog.');
        else setError('Katalogy se nepodařilo načíst. Zkuste načtení znovu.');
    }, []);
    const load = useCallback(async (afterId = 0) => {
        if (!token) return;
        const controller = start();
        if (afterId === 0) { setSelected(null); setCatalogs([]); setNext(null); }
        try {
            const page = await listCatalogs(token, controller.signal, afterId);
            if (!controller.signal.aborted) {
                setCatalogs(previous => afterId === 0 ? page.items : [...previous, ...page.items]);
                setNext(page.nextAfterId);
            }
        } catch (failure) { fail(failure, controller); }
        finally { if (!controller.signal.aborted) setLoading(false); }
    }, [token, start, fail]);
    useEffect(() => {
        void load();
        return () => { request.current?.abort(); };
    }, [load]);
    const selectCatalog = useCallback(async (id: number | null) => {
        const controller = start(); setSelected(null);
        if (id === null || !token) { setLoading(false); return; }
        try {
            // Revalidate on every explicit choice, including choices from an earlier list response.
            const catalog = await resolveCatalog(id, token, controller.signal);
            if (!controller.signal.aborted) setSelected(catalog);
        } catch (failure) {
            if (!controller.signal.aborted && failure instanceof CatalogApiError && failure.status === 404)
                setCatalogs(previous => previous.filter(c => c.id !== id));
            fail(failure, controller);
        } finally { if (!controller.signal.aborted) setLoading(false); }
    }, [token, start, fail]);
    return <CatalogContext.Provider value={{ catalogs, selectedCatalog, loading, error,
        hasMore: nextAfterId !== null, selectCatalog, reload: () => load(),
        loadMore: () => nextAfterId === null ? Promise.resolve() : load(nextAfterId) }}>
        {children}
    </CatalogContext.Provider>;
}
export function useCatalog() {
    const context = useContext(CatalogContext);
    if (!context) throw new Error('useCatalog requires CatalogProvider');
    return context;
}
