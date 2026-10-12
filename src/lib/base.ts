/**
 * Normalizes the base path for Vite build and deployment.
 * Defaults to '/' if not provided or empty.
 * Ensures leading and trailing slashes for subpaths (e.g. 'uat' -> '/uat/').
 */
export function normalizeAppBase(appBase?: string): string {
    if (!appBase || !appBase.trim()) {
        return "/";
    }
    const trimmed = appBase.trim();
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
        return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
    }
    const withLeading = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    return withLeading.endsWith("/") ? withLeading : `${withLeading}/`;
}
