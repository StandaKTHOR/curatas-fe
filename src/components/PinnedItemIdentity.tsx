import {useLayoutEffect, useRef} from 'react';
import type {PermanentIdentificationHeaderProps} from './PermanentIdentificationHeader';

export default function PinnedItemIdentity(props: PermanentIdentificationHeaderProps) {
    const ref = useRef<HTMLElement>(null);
    useLayoutEffect(() => {
        const row = ref.current;
        const form = row?.closest<HTMLElement>('.curator-item-form');
        if (!row || !form) return;
        const measure = () => form.style.setProperty('--item-identity-height', `${row.getBoundingClientRect().height}px`);
        measure();
        const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
        observer?.observe(row);
        return () => { observer?.disconnect(); form.style.removeProperty('--item-identity-height'); };
    }, []);
    const fields = [
        ['Inventární číslo', 'Inv. č.', props.inventoryNumber, 'number'],
        ['Přírůstkové číslo', 'Přír. č.', props.accessionNumber, 'number'],
        ['Současný katalogový počet', 'Poč.', props.quantity, 'count'],
        ['Fond', 'Fond', props.fond, 'fund'],
        ['Předmět', 'Předm.', props.predmet, 'text'],
        ['Titul', 'Titul', props.titul, 'text'],
        ['Autor', 'Autor', props.autor, 'text'],
        ['Datace', 'Dat.', props.datace, 'date'],
    ] as const;
    return <aside ref={ref} className="item-identity-pin" aria-label="Permanentní identifikace předmětu">
        <dl>{fields.map(([label, short, value, size]) => <div key={label} data-identity-size={size} data-identification-field={label}>
            <dt><abbr title={label} aria-label={label}>{short}</abbr></dt>
            <dd title={value == null ? undefined : String(value)}>{value == null || value === '' ? '—' : value}</dd>
        </div>)}</dl>
    </aside>;
}
