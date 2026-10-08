import { resolveApiUrl } from './api';

export interface DemusIdentity {
    itemId: number;
    inventoryNumber: string | null;
    sourceInventoryNumber: string | null;
    series: string | null;
    ordinal: string | null;
    division: string | null;
    stateCode: string | null;
    custodianCode: string | null;
    departmentCode: string | null;
    originalInventoryNumber: string | null;
    otherNumber: string | null;
    materialNote: string | null;
    fundCode: string | null;
    groupCode: string | null;
    hierarchyOrdinal?: string | null;
    hierarchyDivision?: string | null;
    originNote?: string | null;
    authorRole?: string | null;
    determinedBy?: string | null;
    determinedAtRaw?: string | null;
    sourceLocalId?: string | null;
}

const textFields = ['inventoryNumber', 'sourceInventoryNumber', 'series', 'ordinal', 'division',
    'stateCode', 'custodianCode', 'departmentCode', 'originalInventoryNumber', 'otherNumber',
    'materialNote', 'fundCode', 'groupCode'] as const;

/** Read source evidence without constructing or replacing historical identifiers. */
export async function getDemusIdentity(itemId: number): Promise<DemusIdentity> {
    if (!Number.isSafeInteger(itemId) || itemId <= 0) throw new Error('Invalid item ID');
    const token = localStorage.getItem('token');
    const response = await fetch(resolveApiUrl(`/api/v1/items/${itemId}/demus-identity`), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) throw new Error(`DEMUS identity request failed (${response.status})`);
    const data: unknown = await response.json();
    if (!data || typeof data !== 'object') throw new Error('Invalid DEMUS identity response');
    const record = data as Record<string, unknown>;
    const optionalTextFields = ['hierarchyOrdinal', 'hierarchyDivision', 'originNote', 'authorRole', 'determinedBy', 'determinedAtRaw', 'sourceLocalId'];
    if (optionalTextFields.some(field => record[field] !== undefined && record[field] !== null && typeof record[field] !== 'string')) throw new Error('Invalid DEMUS identity response');
    if (record.itemId !== itemId || textFields.some(field => record[field] !== null && typeof record[field] !== 'string')) {
        throw new Error('Invalid DEMUS identity response');
    }
    return record as unknown as DemusIdentity;
}