import { resolveApiUrl } from './api';

export const inventoryComponentNames = ['series', 'ordinal', 'division', 'hierarchyOrdinal',
    'hierarchyDivision', 'stateCode', 'custodianCode', 'departmentCode', 'collectionCode'] as const;
export type InventoryComponentName = typeof inventoryComponentNames[number];
export type InventoryComponents = Record<InventoryComponentName, string | null>;
export interface InventoryIdentity {
    itemId: number;
    inventoryNumber: string | null;
    rowVersion: number;
    revision: number;
    components: InventoryComponents;
    sourceComponents: InventoryComponents;
    edited: boolean;
    stale: boolean;
    aliases: { inventoryNumber: string | null; scope: Record<string, string | null>; components: InventoryComponents }[];
}
function components(value: unknown): value is InventoryComponents {
    if (!value || typeof value !== 'object') return false;
    const record = value as Record<string, unknown>;
    return inventoryComponentNames.every(name => record[name] === null || typeof record[name] === 'string');
}
function identity(value: unknown, itemId: number): InventoryIdentity {
    if (!value || typeof value !== 'object') throw new Error('Neplatná odpověď evidence inventárního čísla.');
    const record = value as InventoryIdentity;
    if (record.itemId !== itemId || (record.inventoryNumber !== null && typeof record.inventoryNumber !== 'string') ||
        !Number.isSafeInteger(record.rowVersion) || record.rowVersion < 0 ||
        !Number.isSafeInteger(record.revision) || record.revision < 0 ||
        !components(record.components) || !components(record.sourceComponents) ||
        typeof record.edited !== 'boolean' || typeof record.stale !== 'boolean' ||
        !Array.isArray(record.aliases) || record.aliases.some(alias =>
            !alias || !components(alias.components) || !alias.scope || typeof alias.scope !== 'object' ||
            Object.values(alias.scope).some(value => value !== null && typeof value !== 'string') ||
            alias.inventoryNumber !== null && typeof alias.inventoryNumber !== 'string')) {
        throw new Error('Neplatná odpověď evidence inventárního čísla.');
    }
    return record;
}
async function request(itemId: number, update?: object): Promise<InventoryIdentity> {
    if (!Number.isSafeInteger(itemId) || itemId <= 0) throw new Error('Neplatné ID předmětu.');
    const token = localStorage.getItem('token');
    const response = await fetch(resolveApiUrl(`/api/v1/items/${itemId}/inventory-identity`), {
        method: update ? 'PUT' : 'GET', redirect: 'error',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(update ? { 'Content-Type': 'application/json' } : {}) },
        ...(update ? { body: JSON.stringify(update) } : {}),
    });
    if (!response.ok) {
        if (response.status === 409) throw new Error('Inventární údaje se změnily. Načtěte předmět znovu a porovnejte změny.');
        throw new Error(`Evidence inventárního čísla není dostupná (${response.status}).`);
    }
    return identity(await response.json(), itemId);
}
export function getInventoryIdentity(itemId: number): Promise<InventoryIdentity> { return request(itemId); }
export function updateInventoryIdentity(current: InventoryIdentity, inventoryNumber: string | null,
    components: InventoryComponents): Promise<InventoryIdentity> {
    return request(current.itemId, { expectedRowVersion: current.rowVersion, expectedRevision: current.revision,
        expectedInventoryNumber: current.inventoryNumber, inventoryNumber, components });
}
