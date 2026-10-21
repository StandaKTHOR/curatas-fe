import { useCallback, useEffect, useRef, useState } from 'react';
import { ScopedError, errorText } from './scopedApi';

/** One owned request at a time. An aborted/late response cannot publish state or trigger auth handling. */
export function useTask(onFatal: (status: number) => void) {
    const request = useRef<AbortController | null>(null);
    const fatal = useRef(onFatal); fatal.current = onFatal;
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    useEffect(() => () => request.current?.abort(), []);
    const run = useCallback(async <T,>(operation: (signal: AbortSignal) => Promise<T>, success: (value: T) => void, writing = false, failure?: () => void) => {
        if (writing && request.current && !request.current.signal.aborted) return;
        request.current?.abort(); const controller = new AbortController(); request.current = controller;
        setBusy(true); setError('');
        try { const value = await operation(controller.signal); if (!controller.signal.aborted) success(value); }
        catch (e) {
            if (controller.signal.aborted) return;
            const status = e instanceof ScopedError ? e.status : 0;
            if ([401,403,404].includes(status)) fatal.current(status);
            setError(errorText(status)); failure?.();
        } finally { if (!controller.signal.aborted) { request.current = null; setBusy(false); } }
    }, []);
    const cancel = useCallback(() => { request.current?.abort(); request.current = null; setBusy(false); }, []);
    return { run, busy, error, setError, cancel };
}
