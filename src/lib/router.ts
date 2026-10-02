/**
 * Normalizes the router basename for React Router.
 * React Router v6 expects basename without a trailing slash (e.g. '/uat' rather than '/uat/'),
 * but root path must remain '/'.
 */
export function getRouterBasename(baseUrl: string = import.meta.env.BASE_URL): string {
    if (!baseUrl || baseUrl === '/') {
        return '/';
    }
    const trimmed = baseUrl.trim();
    const withoutTrailing = trimmed.replace(/\/+$/, '');
    if (!withoutTrailing) {
        return '/';
    }
    return withoutTrailing.startsWith('/') ? withoutTrailing : `/${withoutTrailing}`;
}
