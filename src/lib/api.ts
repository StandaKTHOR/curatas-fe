import {useEffect, useState} from "react";
import {LabelDto} from "@/components/LabelPrinter";

// export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080';
export const API_BASE = import.meta.env.VITE_API_BASE || 'https://curatas-be-production.up.railway.app';

const getAuthHeader = (): HeadersInit => {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export async function listPublicItems(params: {
    q?: string,
    accessionNumber?: string,
    inventoryNumber?: string,
    subCollection?: string,
    objectType?: string,
    author?: string,
    datingFrom?: string | number,
    datingTo?: string | number,
    originPlace?: string,
    material?: string,
    technique?: string,
    location?: string,
    spravce?: string,
    page?: number,
    size?: number
}) {
    const u = new URL(`${API_BASE}/public/v1/catalog/items`);

    // Projdeme všechny klíče v objektu params
    Object.entries(params).forEach(([key, value]) => {
        // Přidáme do URL pouze pokud má hodnota smysl (není null, undefined nebo prázdný string)
        if (value !== undefined && value !== null && value !== '') {
            u.searchParams.set(key, value.toString());
        }
    });
    // Zajištění výchozí velikosti stránky, pokud není v params
    if (!u.searchParams.has('size')) {
        u.searchParams.set('size', '20');
    }
    const r = await fetch(u.toString());
    if (!r.ok) throw new Error('Načítání katalogu selhalo');
    return r.json();
}

export async function listAdminItems(params: {
    page?: number,
    size?: number,
    q?: string,
    accessionNumber?: string,
    inventoryNumber?: string,
    author?: string,
    originPlace?: string, // PŘIDAT SEM
    subCollection?: string,
    material?: string,
    location?: string,
    spravce?: string
}) {
    const u = new URL(`${API_BASE}/api/v1/items`);

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            u.searchParams.set(key, value.toString());
        }
    });

    const r = await fetch(u.toString(), {
        headers: getAuthHeader() // Nezapomeň na token, v adminu je povinný!
    });

    if (!r.ok) throw new Error('Načítání administrace selhalo');
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

    const response = await fetch(`${API_BASE}/api/v1/items/${itemId}/images`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
    });

    const rawResponse = await response.text(); // Přečteme odpověď jako čistý text
    console.log("Raw response ze serveru:", rawResponse);

    if (!response.ok) {
        throw new Error(`Nahrávání selhalo: ${rawResponse}`);
    }

    try {
        return JSON.parse(rawResponse); // Teprve teď zkusíme JSON
    } catch (e) {
        console.error("Chyba při parsování JSONu. Server poslal tohle:", rawResponse);
        throw new Error("Server neposlal platný JSON. Podívej se do konzole.");
    }
}

export async function exportItemsToExcel(params: any) {
    const u = new URL(`${API_BASE}/api/v1/items/export/excel`);

    // Přidáme filtry do URL
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            u.searchParams.set(key, value.toString());
        }
    });

    const r = await fetch(u.toString(), {
        headers: getAuthHeader() // Použije tvou existující funkci pro token
    });

    if (!r.ok) throw new Error('Export selhal');

    // Zpracování binárních dat (blob)
    const blob = await r.blob();
    const downloadUrl = window.URL.createObjectURL(blob);

    // Vytvoření a kliknutí na skrytý odkaz
    const link = document.createElement('a');
    link.href = downloadUrl;

    // Pojmenování souboru s aktuálním datem
    const date = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `export_sbirky_${date}.xlsx`);

    document.body.appendChild(link);
    link.click();

    // Úklid v paměti prohlížeče
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
}

// Přidat do lib/api.ts
export async function bulkCopyItem(id: number, data: {
    count: number,
    titleSuffix: string,
    invNumSuffix: string
}) {
    const r = await fetch(`${API_BASE}/api/v1/items/${id}/bulk-copy`, {
        method: 'POST',
        headers: {
            ...getAuthHeader(),
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });

    if (!r.ok) {
        const error = await r.json().catch(() => ({}));
        throw new Error(error.message || 'Hromadné kopírování selhalo');
    }
    return true;
}

export async function getDictionaries() {
    const response = await fetch(`${API_BASE}/api/v1/dictionaries`, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
        }
    });
    if (!response.ok) throw new Error('Nepodařilo se načíst číselníky');
    return response.json();
}

export async function getNextAvailableNumbers() {
    const response = await fetch(`${API_BASE}/api/v1/items/next-numbers`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    return response.json();
}

export async function checkUniqueness(type: 'accession' | 'inventory', value: string) {
    // Ujisti se, že URL je správná (včetně lomítek)
    const response = await fetch(`${API_BASE}/api/v1/items/check?type=${type}&value=${encodeURIComponent(value)}`, {
        headers: getAuthHeader()
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Server vrátil chybu:", errorData);
        throw new Error('Chyba při validaci unikátnosti');
    }
    return response.json();
}

export const fetchLabelData = async (id: number): Promise<LabelDto> => {
    // Získání tokenu pro autorizaci (předpokládáme uložení v localStorage)
    const token = localStorage.getItem('token');

    const response = await fetch(`${API_BASE}/api/v1/items/${id}/label`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        // Pokud backend vrátí chybu (např. 404 nebo 403), vyhodíme výjimku
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Nepodařilo se načíst data pro štítek');
    }

    // Vracíme zformátovaný JSON, který odpovídá struktuře LabelDto
    return await response.json();
};