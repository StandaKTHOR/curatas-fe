import type {ReactNode} from 'react';
export interface PermanentIdentificationHeaderProps {
    identityEvidence?: ReactNode;
    editors?: Partial<Record<'Fond'|'Titul'|'Předmět'|'Autor'|'Datace'|'numbers', ReactNode>>;
    accessionNumber?: string | null;
    fond?: string | null;
    predmet?: string | null;
    popis?: string | null;
    showDescription?: boolean;
    titul?: string | null;
    autor?: string | null;
    datace?: string | null;
    inventoryNumber?: string | null;
    quantity?: number | null;
    isViewMode?: boolean;
    isNew?: boolean;
    topOffset?: string;
    hasToolbar?: boolean;
    pinIdentity?: boolean;
    sourceFallbackFields?: ReadonlySet<string>;
}

export { default } from './DemusIdentificationHeader';
