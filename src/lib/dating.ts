/** Calendar date edits must retain supplied precision; years never become January 1. */
export function reviewedCalendarDate(value: unknown): string | null {
    if(value==null||value==='')return null;
    const text=String(value);
    if(!/^[+-]?\d{4,6}-\d{2}-\d{2}$/.test(text))throw new Error('Zadejte celé revidované datum ve tvaru RRRR-MM-DD. Pouhý rok nebo text patří do datace, nikoli do kalendářního data.');
    return text;
}
