import { useState } from 'react';

/** Creation has a composed inventoryNumber contract. Delimiters belong to entered components. */
export default function NewInventoryNumber({value, onChange}: {value: string; onChange: (value: string) => void}) {
    const [parts, setParts] = useState({prefix:'', number:value, postfix:''});
    const update = (field: keyof typeof parts, value: string) => {
        const next={...parts,[field]:value}; setParts(next);
        onChange(`${next.prefix}${next.number}${next.postfix}`);
    };
    return <fieldset className="grid grid-cols-3 gap-2">
        {([['prefix','Prefix'],['number','Hlavní číslo'],['postfix','Postfix']] as const).map(([field,label]) =>
            <label key={field}>{label}<input aria-label={`Inventární číslo: ${label}`} value={parts[field]}
                required={field === 'number'} onChange={e => update(field,e.target.value)} /></label>)}
        <p className="col-span-3 text-xs">Inventární číslo: {value || '—'}. Oddělovače zadejte jako součást prefixu nebo postfixu.</p>
    </fieldset>;
}
