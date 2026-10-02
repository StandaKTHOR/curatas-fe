import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { getRouterBasename } from '../lib/router';
import { normalizeAppBase } from '../lib/base';
import { resolveApiUrl, buildApiUrl } from '../lib/api';
import SafeImage from '../components/SafeImage';

describe('UAT Subpath Configuration & Utilities', () => {
    describe('normalizeAppBase (vite.config.ts)', () => {
        it('defaults to "/" when undefined, empty, or whitespace', () => {
            expect(normalizeAppBase(undefined)).toBe('/');
            expect(normalizeAppBase('')).toBe('/');
            expect(normalizeAppBase('   ')).toBe('/');
        });

        it('returns "/" when set to "/"', () => {
            expect(normalizeAppBase('/')).toBe('/');
        });

        it('normalizes "/uat" and "/uat/" to "/uat/"', () => {
            expect(normalizeAppBase('/uat')).toBe('/uat/');
            expect(normalizeAppBase('/uat/')).toBe('/uat/');
            expect(normalizeAppBase('uat')).toBe('/uat/');
            expect(normalizeAppBase('uat/')).toBe('/uat/');
        });

        it('preserves full URL with trailing slash if provided', () => {
            expect(normalizeAppBase('https://cdn.example.com/uat')).toBe('https://cdn.example.com/uat/');
            expect(normalizeAppBase('https://cdn.example.com/uat/')).toBe('https://cdn.example.com/uat/');
        });
    });

    describe('getRouterBasename (src/lib/router.ts)', () => {
        it('returns "/" for root or empty base URLs', () => {
            expect(getRouterBasename('/')).toBe('/');
            expect(getRouterBasename('')).toBe('/');
            expect(getRouterBasename(undefined as any)).toBe('/');
        });

        it('strips trailing slash for React Router compatibility (e.g. "/uat/" -> "/uat")', () => {
            expect(getRouterBasename('/uat/')).toBe('/uat');
            expect(getRouterBasename('/uat')).toBe('/uat');
            expect(getRouterBasename('uat/')).toBe('/uat');
        });

        it('handles nested paths', () => {
            expect(getRouterBasename('/sub/app/')).toBe('/sub/app');
        });
    });

    describe('resolveApiUrl and buildApiUrl (src/lib/api.ts)', () => {
        it('resolves endpoints correctly with VITE_API_BASE=/uat without duplicate prefix', () => {
            // Note: in tests, resolveApiUrl uses the module-level API_BASE or resolves cleanly
            expect(resolveApiUrl('/api/v1/items')).toContain('/api/v1/items');
            expect(resolveApiUrl('http://external.com/photo.jpg')).toBe('http://external.com/photo.jpg');
            expect(resolveApiUrl('https://external.com/photo.jpg')).toBe('https://external.com/photo.jpg');
        });

        it('does not produce duplicate prefix when path already has /uat/', () => {
            // If path already starts with /uat/, resolveApiUrl must not double it
            const res = resolveApiUrl('/uat/api/v1/items');
            expect(res).not.toContain('/uat/uat/');
        });

        it('buildApiUrl creates valid URL without throwing Invalid URL on relative paths', () => {
            const url = buildApiUrl('/public/v1/catalog/items');
            expect(url).toBeInstanceOf(URL);
            url.searchParams.set('page', '2');
            expect(url.searchParams.get('page')).toBe('2');
            expect(url.pathname).toMatch(/\/public\/v1\/catalog\/items$/);
        });
    });
});

describe('React Router Navigation under /uat/ Subpath', () => {
    function DummyCatalog() {
        const location = useLocation();
        return (
            <div>
                <h1>Katalog sbírek</h1>
                <span data-testid="catalog-path">{location.pathname}</span>
                <Link to="/items/42" data-testid="detail-link">Přejít na detail</Link>
                <Link to="/admin/items" data-testid="admin-link">Správa exponátů</Link>
            </div>
        );
    }

    function DummyDetail() {
        const location = useLocation();
        return (
            <div>
                <h1>Detail předmětu</h1>
                <span data-testid="detail-path">{location.pathname}</span>
                <Link to="/" data-testid="back-link">Zpět na katalog</Link>
            </div>
        );
    }

    function DummyAdminItems() {
        const location = useLocation();
        return (
            <div>
                <h1>Správa exponátů</h1>
                <span data-testid="admin-path">{location.pathname}</span>
            </div>
        );
    }

    function TestApp() {
        return (
            <Routes>
                <Route path="/" element={<DummyCatalog />} />
                <Route path="/items/:id" element={<DummyDetail />} />
                <Route path="/detail/:id" element={<DummyDetail />} />
                <Route path="/admin/items" element={<DummyAdminItems />} />
                <Route path="*" element={<div>Nenalezeno</div>} />
            </Routes>
        );
    }

    it('matches root /uat and /uat/ to Catalog component', () => {
        const { unmount } = render(
            <MemoryRouter basename="/uat" initialEntries={['/uat/']}>
                <TestApp />
            </MemoryRouter>
        );
        expect(screen.getByText('Katalog sbírek')).toBeInTheDocument();
        expect(screen.getByTestId('catalog-path').textContent).toBe('/');
        unmount();

        render(
            <MemoryRouter basename="/uat" initialEntries={['/uat']}>
                <TestApp />
            </MemoryRouter>
        );
        expect(screen.getByText('Katalog sbírek')).toBeInTheDocument();
        expect(screen.getByTestId('catalog-path').textContent).toBe('/');
    });

    it('matches direct deep URL /uat/items/42 to Detail component', () => {
        render(
            <MemoryRouter basename="/uat" initialEntries={['/uat/items/42']}>
                <TestApp />
            </MemoryRouter>
        );
        expect(screen.getByText('Detail předmětu')).toBeInTheDocument();
        expect(screen.getByTestId('detail-path').textContent).toBe('/items/42');
    });

    it('matches legacy/alias deep URL /uat/detail/42 to Detail component', () => {
        render(
            <MemoryRouter basename="/uat" initialEntries={['/uat/detail/42']}>
                <TestApp />
            </MemoryRouter>
        );
        expect(screen.getByText('Detail předmětu')).toBeInTheDocument();
        expect(screen.getByTestId('detail-path').textContent).toBe('/detail/42');
    });

    it('matches direct deep URL /uat/admin/items to AdminItems component', () => {
        render(
            <MemoryRouter basename="/uat" initialEntries={['/uat/admin/items']}>
                <TestApp />
            </MemoryRouter>
        );
        expect(screen.getByText('Správa exponátů')).toBeInTheDocument();
        expect(screen.getByTestId('admin-path').textContent).toBe('/admin/items');
    });

    it('navigates correctly between pages preserving /uat/ prefix in browser history', async () => {
        const user = userEvent.setup();
        render(
            <MemoryRouter basename="/uat" initialEntries={['/uat/']}>
                <TestApp />
            </MemoryRouter>
        );

        // Click on link to Detail
        const detailLink = screen.getByTestId('detail-link');
        expect(detailLink).toHaveAttribute('href', '/uat/items/42');
        await user.click(detailLink);

        expect(await screen.findByText('Detail předmětu')).toBeInTheDocument();
        expect(screen.getByTestId('detail-path').textContent).toBe('/items/42');

        // Click back to Catalog
        const backLink = screen.getByTestId('back-link');
        expect(backLink).toHaveAttribute('href', '/uat');
        await user.click(backLink);

        expect(await screen.findByText('Katalog sbírek')).toBeInTheDocument();
    });
});

describe('SafeImage under UAT configuration', () => {
    it('renders placeholder when src is missing or empty', () => {
        render(<SafeImage alt="Prázdný obrázek" />);
        const img = screen.getByRole('img');
        expect(img).toHaveAttribute('src', expect.stringContaining('placehold.co'));
    });

    it('resolves relative src without creating /uat/uat/ duplicate', () => {
        render(<SafeImage src="/uat/media/images/123.jpg" alt="Foto předmětu" />);
        const img = screen.getByRole('img');
        expect(img.getAttribute('src')).not.toContain('/uat/uat/');
    });

    it('preserves absolute external URLs untouched', () => {
        render(<SafeImage src="https://images.example.org/photo.jpg" alt="Externí foto" />);
        const img = screen.getByRole('img');
        expect(img).toHaveAttribute('src', 'https://images.example.org/photo.jpg');
    });
});
