export interface PermanentIdentificationHeaderProps {
    fond?: string | null;
    predmet?: string | null;
    popis?: string | null;
    titul?: string | null;
    autor?: string | null;
    datace?: string | null;
    inventoryNumber?: string | null;
    isViewMode?: boolean;
    isNew?: boolean;
    topOffset?: string;
    hasToolbar?: boolean;
}

export { default } from './DemusIdentificationHeader';
