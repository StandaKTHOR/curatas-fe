/** HTTP field values can combine repeated proxy/origin Cache-Control fields.
 * Require an unqualified no-store directive, never mere no-cache or public caching.
 */
export function hasPrivateNoStore(headers: Headers): boolean {
    const value = headers.get('Cache-Control');
    if (!value) return false;
    const parts: string[] = []; let part = '', quoted = false, escaped = false;
    for (const char of value) {
        if (escaped) { part += char; escaped = false; continue; }
        if (quoted && char === '\\') { part += char; escaped = true; continue; }
        if (char === '"') quoted = !quoted;
        if (char === ',' && !quoted) { parts.push(part.trim()); part = ''; } else part += char;
    }
    if (quoted || escaped) return false;
    parts.push(part.trim());
    let noStore = false;
    for (const directive of parts) {
        const match = /^([!#$%&'*+.^_`|~0-9A-Za-z-]+)(?:\s*=\s*(?:"(?:[^"\\]|\\.)*"|[!#$%&'*+.^_`|~0-9A-Za-z-]+))?$/.exec(directive);
        if (!match) return false;
        const name = match[1].toLowerCase();
        if (name === 'public') return false;
        if (name === 'no-store') { if (directive.toLowerCase() !== 'no-store') return false; noStore = true; }
    }
    return noStore;
}
