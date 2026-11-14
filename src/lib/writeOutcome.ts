import { ApiError } from './api';

// Only an explicit client rejection proves that a CREATE was not accepted.
export function uncertainWrite(error: unknown): boolean {
    return !(error instanceof ApiError && error.status >= 400 && error.status < 500);
}
export const uncertainCreateMessage = 'Výsledek vytvoření není potvrzen. Další CREATE je zablokován. Obnovte serverový seznam, ověřte záznam a před načtením celého editoru si uchovejte rozepsaná data. Automatické opakování není bezpečné.';
