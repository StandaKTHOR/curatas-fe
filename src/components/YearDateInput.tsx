import { useEffect, useState } from 'react';

/** Native calendar plus a keyboard/spinner year control, without assuming today's date. */
export default function YearDateInput({ id, label, value, onChange }: {
    id: string; label: string; value: string; onChange: (value: string) => void;
}) {
    const [year, setYear] = useState(value.slice(0, 4));
    useEffect(() => setYear(value.slice(0, 4)), [value]);
    const changeYear = (next: string) => {
        setYear(next);
        if (!/^\d{4}$/.test(next) || Number(next) < 1 || !value) return;
        const month = Number(value.slice(5, 7));
        const day = Math.min(Number(value.slice(8, 10)), new Date(Number(next), month, 0).getDate());
        onChange(`${next}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
    };
    return <div className="demus-date">
        <input id={id} aria-label={label} type="date" value={value} onChange={e => onChange(e.target.value)} />
        <label>Rok <input aria-label={`Rok: ${label}`} className="demus-year" type="number" min="1" max="9999"
            value={year} onChange={e => changeYear(e.target.value)} disabled={!value} /></label>
    </div>;
}
