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
    size?: number,
    sort?: string
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

export class ApiError extends Error {
    constructor(
        public status: number,
        public message: string,
        public fieldErrors?: Record<string, string>
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

export async function createItem(body: any) {
    const r = await fetch(`${API_BASE}/api/v1/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(body)
    });
    if (!r.ok) {
        let fieldErrors: Record<string, string> | undefined = undefined;
        let errMsg = 'Vytvoření selhalo';
        try {
            const data = await r.json();
            if (data.message) errMsg = data.message;
            if (data.fieldErrors) {
                if (Array.isArray(data.fieldErrors)) {
                    fieldErrors = {};
                    data.fieldErrors.forEach((fe: any) => {
                        fieldErrors![fe.field] = fe.message;
                    });
                } else if (typeof data.fieldErrors === 'object') {
                    fieldErrors = data.fieldErrors;
                }
            }
        } catch (e) { /* ignore JSON parse error */ }
        throw new ApiError(r.status, errMsg, fieldErrors);
    }
    return r.json();
}

export async function updateItem(id: number, body: any) {
    const r = await fetch(`${API_BASE}/api/v1/items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(body)
    });
    if (!r.ok) {
        let fieldErrors: Record<string, string> | undefined = undefined;
        let errMsg = 'Aktualizace selhala';
        try {
            const data = await r.json();
            if (data.message) errMsg = data.message;
            if (data.fieldErrors) {
                if (Array.isArray(data.fieldErrors)) {
                    fieldErrors = {};
                    data.fieldErrors.forEach((fe: any) => {
                        fieldErrors![fe.field] = fe.message;
                    });
                } else if (typeof data.fieldErrors === 'object') {
                    fieldErrors = data.fieldErrors;
                }
            }
        } catch (e) { /* ignore JSON parse error */ }
        throw new ApiError(r.status, errMsg, fieldErrors);
    }
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

// ==========================================
// PRACOVNÍ SADY (WORKSETS)
// ==========================================

export interface WorksetSummary {
    id: string;
    name: string;
    description: string;
    itemCount: number;
    createdAt: string;
    updatedAt: string;
}

export async function listWorksets(): Promise<WorksetSummary[]> {
    const r = await fetch(`${API_BASE}/api/v1/worksets`, {
        headers: getAuthHeader()
    });
    if (!r.ok) throw new Error('Načítání pracovních sad selhalo');
    return r.json();
}

export async function createWorkset(data: { name: string; description?: string; itemIds?: number[] }): Promise<WorksetSummary> {
    const r = await fetch(`${API_BASE}/api/v1/worksets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data)
    });
    if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.message || 'Vytvoření pracovní sady selhalo');
    }
    return r.json();
}

export async function createWorksetFromFilter(data: { name: string; description?: string; filter: any }): Promise<WorksetSummary> {
    const r = await fetch(`${API_BASE}/api/v1/worksets/from-filter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data)
    });
    if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.message || 'Vytvoření sady z filtru selhalo');
    }
    return r.json();
}

export async function getWorksetDetail(id: string, page = 0, size = 50) {
    const r = await fetch(`${API_BASE}/api/v1/worksets/${id}?page=${page}&size=${size}`, {
        headers: getAuthHeader()
    });
    if (!r.ok) throw new Error('Načítání detailu pracovní sady selhalo');
    return r.json();
}

export async function addItemsToWorkset(id: string, itemIds: number[]) {
    const r = await fetch(`${API_BASE}/api/v1/worksets/${id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ itemIds })
    });
    if (!r.ok) throw new Error('Přidání položek do sady selhalo');
    return r.json();
}

export async function removeWorksetItem(worksetId: string, itemId: number) {
    const r = await fetch(`${API_BASE}/api/v1/worksets/${worksetId}/items/${itemId}`, {
        method: 'DELETE',
        headers: getAuthHeader()
    });
    if (!r.ok) throw new Error('Odebrání položky ze sady selhalo');
}

export async function deleteWorkset(id: string) {
    const r = await fetch(`${API_BASE}/api/v1/worksets/${id}`, {
        method: 'DELETE',
        headers: getAuthHeader()
    });
    if (!r.ok) throw new Error('Smazání pracovní sady selhalo');
}

// ==========================================
// SELEKTIVNÍ KLONOVÁNÍ PŘEDMĚTU
// ==========================================

export interface CloneItemOptions {
    copyDescription?: boolean;
    copyDating?: boolean;
    copyLocation?: boolean;
    copyAuthors?: boolean;
    copyMaterials?: boolean;
    copyClassification?: boolean;
    copyDimensions?: boolean;
    targetInventoryNumber?: string;
}

export async function cloneItemSelective(id: number, options: CloneItemOptions) {
    const r = await fetch(`${API_BASE}/api/v1/items/${id}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(options)
    });
    if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.message || 'Klonování předmětu selhalo');
    }
    return r.json();
}

// ==========================================
// VYŘAZENÍ Z EVIDENCE (DEACCESSION)
// ==========================================

export interface DeaccessionData {
    reason: string;
    deaccessionDate?: string;
    documentNumber?: string;
}

export async function deaccessionItem(id: number, data: DeaccessionData) {
    const r = await fetch(`${API_BASE}/api/v1/items/${id}/deaccession`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data)
    });
    if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.message || 'Vyřazení z evidence selhalo');
    }
    return r.json();
}

// ==========================================
// TISK KARTY PŘEDMĚTU (PRINT BASIC)
// ==========================================

export async function getPrintBasic(id: number) {
    const r = await fetch(`${API_BASE}/api/v1/items/${id}/print-basic`, {
        headers: getAuthHeader()
    });
    if (!r.ok) throw new Error('Načtení tiskových dat selhalo');
    return r.json();
}

// ==========================================
// ČÍSELNÍKY - INLINE PŘIDÁVÁNÍ A STROM
// ==========================================

export async function createDictionaryItem(data: { type: string; code: string; label: string; parentId?: number; sortOrder?: number }) {
    const r = await fetch(`${API_BASE}/api/v1/dictionaries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data)
    });
    if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.message || 'Uložení do číselníku selhalo');
    }
    return r.json();
}

export async function getDictionaryTree(type: string) {
    const r = await fetch(`${API_BASE}/api/v1/dictionaries/tree?type=${encodeURIComponent(type)}`, {
        headers: getAuthHeader()
    });
    if (!r.ok) throw new Error('Načtení stromu číselníku selhalo');
    return r.json();
}

// ==========================================
// PŘÍLOHY (DOKUMENTY A SOUBORY)
// ==========================================

export async function listAttachments(itemId: number) {
    const r = await fetch(`${API_BASE}/api/v1/items/${itemId}/attachments`, {
        headers: getAuthHeader()
    });
    if (!r.ok) throw new Error('Načtení příloh selhalo');
    return r.json();
}

export async function uploadAttachment(itemId: number, file: File, caption?: string, isPrimary = false) {
    const formData = new FormData();
    formData.append('file', file);
    if (caption) formData.append('caption', caption);
    formData.append('isPrimary', isPrimary.toString());

    const r = await fetch(`${API_BASE}/api/v1/items/${itemId}/attachments`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: formData
    });
    if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.message || 'Nahrání přílohy selhalo');
    }
    return r.json();
}

export async function deleteAttachment(itemId: number, attachmentId: number) {
    const r = await fetch(`${API_BASE}/api/v1/items/${itemId}/attachments/${attachmentId}`, {
        method: 'DELETE',
        headers: getAuthHeader()
    });
    if (!r.ok) throw new Error('Smazání přílohy selhalo');
}

// ==========================================
// REJSTŘÍK SUBJEKTŮ / AUTORŮ (PARTIES)
// ==========================================

export async function searchParties(q: string) {
    const r = await fetch(`${API_BASE}/api/v1/parties?q=${encodeURIComponent(q)}`, {
        headers: getAuthHeader()
    });
    if (!r.ok) throw new Error('Hledání subjektů selhalo');
    return r.json();
}

export async function createParty(data: { type: string; firstName?: string; lastName: string; birthDate?: string; deathDate?: string; note?: string }) {
    const r = await fetch(`${API_BASE}/api/v1/parties`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data)
    });
    if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.message || 'Vytvoření subjektu selhalo');
    }
    return r.json();
}
