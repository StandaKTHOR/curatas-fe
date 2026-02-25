export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080';

const getAuthHeader = (): HeadersInit => {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
};

// VEŘEJNÉ FUNKCE
// src/lib/api.ts

export async function listPublicItems(params: { q?: string, material?: string, authorName?: string, page?: number, size?: number }) {
    const u = new URL(`${API_BASE}/public/v1/catalog/items`);
    if (params.q) u.searchParams.set('q', params.q);
    if (params.material) u.searchParams.set('material', params.material);
    if (params.authorName) u.searchParams.set('authorName', params.authorName);
    if (params.page) u.searchParams.set('page', params.page.toString());

    // Vynutíme velikost 1000 pro demo
    u.searchParams.set('size', (params.size || 1000).toString());

    const r = await fetch(u);
    if (!r.ok) throw new Error('Načítání katalogu selhalo');
    return r.json();
}

export async function getItem(id: string) {
    const r = await fetch(`${API_BASE}/public/v1/catalog/items/${id}`);
    if (!r.ok) throw new Error('Předmět nebyl nalezen');
    return r.json();
}

export async function sendFeedback(body: any) {
    const r = await fetch(`${API_BASE}/public/v1/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    if (!r.ok) throw new Error('Odeslání připomínky selhalo');
    return r.json();
}

// ADMIN FUNKCE
export async function login(credentials: { username: string; password: string }) {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
    });
    if (!response.ok) throw new Error('Neplatné jméno nebo heslo');
    const data = await response.json();
    localStorage.setItem('token', data.token);
    return data;
}

// src/lib/api.ts

export async function listAdminItems(page: number = 0, size: number = 1000, q: string = '') {
    const query = new URLSearchParams({
        page: page.toString(),
        size: size.toString(),
        q: q
    });

    const r = await fetch(`${API_BASE}/api/v1/items?${query}`, {
        headers: getAuthHeader()
    });

    if (r.status === 401 || r.status === 403) {
        throw new Error('Přístup odepřen – nemáte dostatečná oprávnění (Admin/Curator)');
    }

    if (!r.ok) {
        const errorData = await r.json().catch(() => ({}));
        throw new Error(`Chyba serveru (${r.status}): ${errorData.message || 'Špatný požadavek'}`);
    }

    return r.json();
}

export async function createItem(body: any) {
    const r = await fetch(`${API_BASE}/api/v1/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(body)
    });
    if (!r.ok) throw new Error('Vytvoření selhalo');
    return r.json();
}

export async function updateItem(id: number, body: any) {
    const r = await fetch(`${API_BASE}/api/v1/items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(body)
    });
    if (!r.ok) throw new Error('Aktualizace selhala');
    return r.json();
}

export async function getAdminItem(id: string) {
    const r = await fetch(`${API_BASE}/api/v1/items/${id}`, {
        headers: getAuthHeader()
    });
    if (!r.ok) throw new Error('Nepodařilo se načíst data pro editaci');
    return r.json(); // Vrací AdminItemDetail
}

// Funkce pro smazání (audit se děje na pozadí)
export async function deleteAdminItem(id: number) {
    const r = await fetch(`${API_BASE}/api/v1/items/${id}`, {
        method: 'DELETE',
        headers: getAuthHeader()
    });
    if (!r.ok) throw new Error('Smazání selhalo');
}

export async function uploadItemImage(itemId: number, file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const r = await fetch(`${API_BASE}/api/v1/items/${itemId}/images`, {
        method: 'POST',
        headers: {
            // POZOR: U FormData se Content-Type v fetch nenastavuje, prohlížeč ho doplní sám vč. boundary
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
    });
    if (!r.ok) throw new Error('Nahrávání obrázku selhalo');
    return r.json();
}