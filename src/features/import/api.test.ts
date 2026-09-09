import { afterEach, describe, expect, it, vi } from 'vitest';
import { importApi, ImportApiError } from './api';

afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });
describe('import HTTP adapter (proposed endpoint mapping)', () => {
  it('uploads multipart file with auth without forcing JSON Content-Type', async () => {
    localStorage.setItem('token', 'test-token');
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));
    vi.stubGlobal('fetch', fetcher);
    const file = new File(['data'], 'data.csv');
    await importApi.upload('id/1', file, new AbortController().signal);
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toMatch(/\/api\/v1\/imports\/id%2F1\/file$/);
    expect(init.headers.Authorization).toBe('Bearer test-token');
    expect(init.headers['Content-Type']).toBeUndefined();
    expect(init.body.get('file')).toBe(file);
  });
  it('uses paginated GET and returns the DTO wrapper', async () => {
    const dto = { page: { content: [], totalPages: 2, totalElements: 51, currentPage: 1 } };
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(dto)));
    vi.stubGlobal('fetch', fetcher);
    expect(await importApi.errors('id', 1, 50, new AbortController().signal)).toEqual(dto);
    expect(fetcher.mock.calls[0][0]).toMatch(/\/id\/errors\?page=1&size=50$/);
  });
  it('does not replay a failed mutation', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 503 }));
    vi.stubGlobal('fetch', fetcher);
    await expect(importApi.start('id', new AbortController().signal)).rejects.toEqual(new ImportApiError(503));
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
