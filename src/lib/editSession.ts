/** A token belongs to one editor snapshot, never to a global item cache. */
export interface ItemEditSession {
    itemId: number;
    etag: string;
    busy?: boolean;
    museumSnapshot?: unknown;
    acquisitionSnapshot?: unknown;
}

export function requireEditSession(itemId: number, session?: ItemEditSession): ItemEditSession {
    if (!session || session.itemId !== itemId || !session.etag) {
        throw new Error('Chybí verze načteného předmětu. Obnovte záznam před uložením.');
    }
    if (session.busy) throw new Error('Probíhá ukládání jiné sekce. Vyčkejte na jeho dokončení.');
    return session;
}
