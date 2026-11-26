import {literatureFields, partyFields, registryLabels, type RegistryKind} from './professionalRegistryApi';

export type RegistryDraft = Record<string, string|null>;

export default function RegistryEditorFields({kind, draft, onChange}: {
    kind: RegistryKind; draft: RegistryDraft; onChange: (draft: RegistryDraft) => void;
}) {
    const fields = kind === 'PARTY' ? partyFields : literatureFields;
    const firstGroup = kind === 'PARTY' ? 6 : 9;
    const field = (key: string) => <label key={key}>{registryLabels[key]}{key === 'partyType'
        ? <select aria-label={registryLabels[key]} value={draft[key]??'PERSON'} onChange={e=>onChange({...draft,partyType:e.target.value,...(e.target.value==='ORGANIZATION'?{firstName:null,birthDate:null,deathDate:null}:{})})}>
            <option value="PERSON">Osoba</option><option value="ORGANIZATION">Organizace</option>
        </select>
        : <input aria-label={registryLabels[key]} maxLength={key==='lastName'||key==='Titul_LT'?255:4096}
            disabled={kind==='PARTY'&&draft.partyType==='ORGANIZATION'&&['firstName','birthDate','deathDate'].includes(key)}
            value={draft[key]??''} onChange={e=>onChange({...draft,[key]:e.target.value||null})}/>}
    </label>;
    return <><div className="grid grid-cols-1 md:grid-cols-2 gap-3">{fields.slice(0,firstGroup).map(field)}</div>
        {kind==='LITERATURE'&&<details><summary>Další bibliografické údaje</summary>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{fields.slice(firstGroup).map(field)}</div>
        </details>}
    </>;
}
