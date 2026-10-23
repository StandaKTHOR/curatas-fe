import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CatalogProvider, SessionCatalogProvider, useCatalog } from './CatalogContext';
import CatalogSelector from './CatalogSelector';

let auth: { token: string | null; logout: () => void };
vi.mock('../../components/AuthContext', () => ({ useAuth: () => auth }));
const a = { id: 1, code: 'A', name: 'Katalog A', version: 0, institution: { id: 1, code: 'I', name: 'Instituce' } };
const b = { ...a, id: 2, code: 'B', name: 'Katalog B' };
const response = (body: unknown, status = 200) => ({ ok: status < 400, status, json: async () => body });
function setup(fetcher = vi.fn().mockResolvedValue(response({ items: [a, b], nextAfterId: null }))) {
    vi.stubGlobal('fetch', fetcher);
    const logout = vi.fn();
    auth = { token: 'token-one', logout };
    const rendered = render(<CatalogProvider><CatalogSelector /></CatalogProvider>);
    return { fetcher, logout, ...rendered };
}
beforeEach(() => { vi.stubEnv('VITE_SCOPED_WORKSPACE_ENABLED','false'); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('catalog metadata context', () => {
    it('loads authorized catalogs but never auto-selects the first', async () => {
        const { fetcher } = setup();
        await screen.findByRole('option', { name: /Katalog A/ });
        expect(screen.getByRole('combobox')).toHaveValue('');
        expect(fetcher).toHaveBeenCalledWith(expect.stringContaining('/api/v2/catalogs?limit=100&afterId=0'), expect.objectContaining({
            headers: { Authorization: 'Bearer token-one' }, cache: 'no-store', signal: expect.anything(),
        }));
    });
    it('revalidates selection on the server before exposing the context', async () => {
        const { fetcher } = setup();
        await screen.findByRole('option', { name: /Katalog A/ });
        fetcher.mockResolvedValueOnce(response(a));
        fireEvent.change(screen.getByRole('combobox'), { target: { value: '1' } });
        await screen.findByText('Vybrán katalog Katalog A.');
        expect(fetcher).toHaveBeenLastCalledWith(expect.stringContaining('/api/v2/catalogs/1'), expect.anything());
    });
    it.each([401, 403, 404])('clears previous selection on %s and explains the outcome', async status => {
        const { fetcher, logout } = setup();
        await screen.findByRole('option', { name: /Katalog A/ });
        fetcher.mockResolvedValueOnce(response(a));
        fireEvent.change(screen.getByRole('combobox'), { target: { value: '1' } });
        await screen.findByText('Vybrán katalog Katalog A.');
        fetcher.mockResolvedValueOnce(response({}, status));
        fireEvent.change(screen.getByRole('combobox'), { target: { value: '2' } });
        await screen.findByRole('alert');
        expect(screen.getByRole('combobox')).toHaveValue('');
        expect(screen.queryByText('Vybrán katalog Katalog A.')).not.toBeInTheDocument();
        if (status === 401) expect(logout).toHaveBeenCalledOnce();
        else expect(logout).not.toHaveBeenCalled();
        if (status === 404) expect(screen.queryByRole('option', { name: /Katalog B/ })).not.toBeInTheDocument();
        else expect(screen.queryByRole('option', { name: /Katalog A/ })).not.toBeInTheDocument();
    });
    it('displays an empty grant list without offering a fallback catalog', async () => {
        setup(vi.fn().mockResolvedValue(response({ items: [], nextAfterId: null })));
        await screen.findByText('Nemáte přidělený žádný katalog.');
        expect(screen.getAllByRole('option')).toHaveLength(1);
    });
    it('resets catalogs immediately when authentication changes', async () => {
        const { fetcher, rerender } = setup();
        await screen.findByRole('option', { name: /Katalog A/ });
        fetcher.mockImplementationOnce(() => new Promise(() => {}));
        auth = { ...auth, token: 'token-two' };
        rerender(<CatalogProvider><CatalogSelector /></CatalogProvider>);
        expect(screen.queryByRole('option', { name: /Katalog A/ })).not.toBeInTheDocument();
        expect(screen.getByRole('combobox')).toHaveValue('');
    });
    it('ignores late selection responses after unmount', async () => {
        const { fetcher, unmount } = setup();
        await screen.findByRole('option', { name: /Katalog A/ });
        let finish!: (value: unknown) => void;
        fetcher.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
        fireEvent.change(screen.getByRole('combobox'), { target: { value: '1' } });
        unmount();
        await act(async () => { finish(response(a)); });
        expect(screen.queryByText('Vybrán katalog Katalog A.')).not.toBeInTheDocument();
    });
    it('paginates using the server cursor', async () => {
        const { fetcher } = setup(vi.fn().mockResolvedValueOnce(response({ items: [a], nextAfterId: 1 })));
        await screen.findByRole('option', { name: /Katalog A/ });
        fetcher.mockResolvedValueOnce(response({ items: [b], nextAfterId: null }));
        fireEvent.click(screen.getByRole('button', { name: 'Další katalogy' }));
        await screen.findByRole('option', { name: /Katalog B/ });
        expect(screen.getAllByRole('option')).toHaveLength(3);
        expect(fetcher).toHaveBeenLastCalledWith(expect.stringContaining('/api/v2/catalogs?limit=100&afterId=1'), expect.anything());
    });
    it('a stale response cannot replace the latest explicitly selected catalog', async () => {
        let finish!: (value: unknown) => void;
        const fetcher = vi.fn().mockResolvedValueOnce(response({ items: [a,b], nextAfterId: null }))
            .mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }))
            .mockResolvedValueOnce(response(b));
        vi.stubGlobal('fetch', fetcher);
        function Probe() {
            const { selectCatalog, selectedCatalog, catalogs } = useCatalog();
            return <><span>{catalogs.length} catalogs</span><span>{selectedCatalog?.name}</span>
                <button onClick={() => void selectCatalog(1)}>A</button>
                <button onClick={() => void selectCatalog(2)}>B</button></>;
        }
        render(<SessionCatalogProvider token="one" onUnauthorized={vi.fn()}><Probe /></SessionCatalogProvider>);
        await screen.findByText('2 catalogs');
        fireEvent.click(screen.getByText('A')); fireEvent.click(screen.getByText('B'));
        await screen.findByText('Katalog B');
        await act(async () => { finish(response(a)); });
        expect(screen.queryByText('Katalog A')).not.toBeInTheDocument();
        expect(screen.getByText('Katalog B')).toBeInTheDocument();
    });
    it('offers retry after a network failure', async () => {
        const { fetcher } = setup(vi.fn().mockRejectedValueOnce(new Error('offline')));
        await screen.findByRole('alert');
        fetcher.mockResolvedValueOnce(response({ items: [a], nextAfterId: null }));
        fireEvent.click(screen.getByRole('button', { name: 'Obnovit katalogy' }));
        await screen.findByRole('option', { name: /Katalog A/ });
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
    it('anonymous sessions make no catalog requests', async () => {
        const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
        render(<SessionCatalogProvider token={null} onUnauthorized={vi.fn()}><CatalogSelector /></SessionCatalogProvider>);
        await waitFor(() => expect(fetcher).not.toHaveBeenCalled());
    });
});
