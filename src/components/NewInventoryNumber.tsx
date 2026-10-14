import { useState } from 'react';

/** Creation has a composed inventoryNumber contract. Delimiters belong to entered components. */
export default function NewInventoryNumber({value, onChange, error}: {value: string; onChange: (value: string) => void; error?: string}) {
    const [parts, setParts] = useState({prefix:'', number:value, postfix:''});
    const update = (field: keyof typeof parts, value: string) => {
        const next={...parts,[field]:value}; setParts(next);
        onChange(`${next.prefix}${next.number}${next.postfix}`);
    };
    return <fieldset className="grid grid-cols-3 gap-2">
        {([['prefix','Prefix'],['number','Hlavní číslo'],['postfix','Postfix']] as const).map(([field,label]) =>
            <label key={field}>{label}<input aria-label={`Inventární číslo: ${label}`} value={parts[field]}
                style={error && field === 'number' ? {borderColor:'#b91c1c',backgroundColor:'#fef2f2'} : undefined} aria-invalid={!!error && field === 'number'} aria-describedby={error ? 'new-inventory-error' : undefined} onChange={e => update(field,e.target.value)} /></label>)}
        <p id="new-inventory-error" role={error ? "alert" : undefined} className="col-span-3 text-xs">{error && <strong>{error} </strong>}Inventární číslo: {value || '—'}. Oddělovače zadejte jako součást prefixu nebo postfixu.</p>
    </fieldset>;
}
