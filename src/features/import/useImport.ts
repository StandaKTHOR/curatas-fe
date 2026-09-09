import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ImportApiError } from './api';
import { importTexts as t } from './texts';
import type { ImportApi, ImportStatusResponse } from './types';

export function errorText(error: unknown) {
  if (error instanceof ImportApiError) {
    if (error.status === 401 || error.status === 403) return t.unauthorized;
    return error.status >= 500 ? t.serverUnavailable : t.requestFailed;
  }
  return error instanceof TypeError || (error instanceof DOMException && error.name === 'TimeoutError')
    ? t.serverUnavailable : t.requestFailed;
}
const terminal = new Set(['INVALID', 'COMPLETED', 'COMPLETED_WITH_ERRORS', 'FAILED']);

export function useImport(api: ImportApi, pollInterval: number) {
  const [params, setParams] = useSearchParams();
  const id = params.get('importId');
  const [data, setData] = useState<ImportStatusResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [checking, setChecking] = useState(!!id);
  const action = useRef<AbortController | null>(null);
  const locked = useRef(false);
  const pendingTransition = useRef<'validate' | 'start' | null>(null);
  const [waiting, setWaiting] = useState(false);
  const generation = useRef(0);

  useEffect(() => {
    generation.current++;
    action.current?.abort();
    action.current = null;
    locked.current = false;
    pendingTransition.current = null;
    setWaiting(false);
    setBusy(false);
    setData(null);
    setError(null);
    setChecking(!!id);
    return () => { generation.current++; action.current?.abort(); };
  }, [id]);

  useEffect(() => {
    if (!id || busy) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const result = await api.status(id!, controller.signal);
        if (controller.signal.aborted) return;
        setData(result);
        setChecking(false);
        if ((pendingTransition.current === 'validate' && result.status !== 'UPLOADED') ||
            (pendingTransition.current === 'start' && !['VALID', 'READY'].includes(result.status))) {
          pendingTransition.current = null;
          setWaiting(false);
        }
        setError(null);
        if (!terminal.has(result.status)) timer = setTimeout(poll, pollInterval);
      } catch (e) {
        if (!controller.signal.aborted) setError(errorText(e));
      }
    }
    void poll();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [api, id, busy, refresh, pollInterval]);

  const run = useCallback(async (operation: (signal: AbortSignal) => Promise<void>) => {
    if (locked.current) return;
    locked.current = true;
    const controller = new AbortController();
    action.current = controller;
    const version = generation.current;
    setBusy(true);
    setChecking(true);
    setError(null);
    setActionError(null);
    try { await operation(controller.signal); }
    catch (e) {
      if (!controller.signal.aborted && version === generation.current) {
        pendingTransition.current = null;
        setWaiting(false);
        setActionError(errorText(e));
      }
    }
    finally {
      if (!controller.signal.aborted && version === generation.current) {
        locked.current = false;
        setBusy(false);
      }
    }
  }, []);

  const upload = (file: File) => run(async signal => {
    // Retain the server ID even if upload fails; POSTs are never automatically retried.
    const created = id ? { id } : await api.create(signal);
    try { await api.upload(created.id, file, signal); }
    catch (e) {
      // Store before URL navigation invalidates this action's generation.
      if (!signal.aborted) setActionError(errorText(e));
      throw e;
    }
    finally {
      if (!signal.aborted && !id) setParams({ importId: created.id }, { replace: true });
    }
  });
  const validate = () => run(async signal => {
    if (!id) return;
    pendingTransition.current = 'validate';
    setWaiting(true);
    await api.validate(id, signal);
  });
  const start = (allowErrors = false) => run(async signal => {
    if (!id || !data) return;
    pendingTransition.current = 'start';
    setWaiting(true);
    if (data.status === 'VALID') {
      await api.ready(id, { allowValidationErrors: false }, signal);
    } else if (data.status === 'INVALID' && allowErrors) {
      await api.ready(id, { allowValidationErrors: true }, signal);
    }
    await api.start(id, signal);
  });
  return {
    id, data, busy, checking: checking || waiting, error: error || actionError, upload, validate, start,
    retry: () => { setError(null); setActionError(null); setChecking(!!id); setRefresh(value => value + 1); },
    reset: () => { setActionError(null); setParams({}, { replace: true }); },
  };
}
