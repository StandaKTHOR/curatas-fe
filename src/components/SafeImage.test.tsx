import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SafeImage, { isBackendImage } from './SafeImage';

vi.mock('../lib/api', () => ({
    API_BASE: 'https://api.example.invalid/uat',
    resolveApiUrl: (path: string) => 'https://api.example.invalid/uat' + path
}));

afterEach(() => { localStorage.clear(); vi.unstubAllGlobals(); });

describe('Protected backend media', () => {
    it('only recognizes the configured backend origin and media prefix', () => {
        expect(isBackendImage('https://api.example.invalid/uat/api/v1/media/items/7/photo.jpg')).toBe(true);
        expect(isBackendImage('https://evil.invalid/uat/api/v1/media/items/7/photo.jpg')).toBe(false);
        expect(isBackendImage('https://api.example.invalid/public/photo.jpg')).toBe(false);
        expect(isBackendImage('https://api.example.invalid.evil.invalid/uat/media/items/7/photo.jpg')).toBe(false);
    });
    it('loads internal images with a bearer token without allowing redirects', async () => {
        localStorage.setItem('token', 'TEST_ONLY_TOKEN');
        const fetchMock = vi.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(['image']) });
        vi.stubGlobal('fetch', fetchMock);
        Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:test-image') });
        Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
        const { unmount } = render(<SafeImage src="/api/v1/media/items/7/photo.jpg" alt="Internal" />);
        await waitFor(() => expect(screen.getByAltText('Internal')).toHaveAttribute('src', 'blob:test-image'));
        expect(fetchMock).toHaveBeenCalledWith(
            'https://api.example.invalid/uat/api/v1/media/items/7/photo.jpg',
            expect.objectContaining({ headers: { Authorization: 'Bearer TEST_ONLY_TOKEN' }, redirect: 'error', credentials: 'omit' }));
        unmount();
        expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-image');
    });
    it('does not send credentials to external images', () => {
        localStorage.setItem('token', 'TEST_ONLY_TOKEN');
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);
        render(<SafeImage src="https://images.example.org/photo.jpg" alt="External" />);
        expect(fetchMock).not.toHaveBeenCalled();
        expect(screen.getByAltText('External')).toHaveAttribute('src', 'https://images.example.org/photo.jpg');
    });
});