import TechnicalDemus from './TechnicalDemus';
export const cloneGroups = [
 ['professional','Základní odborné údaje: typ, popis, text autora, datace, původ, materiál a technika'],
 ['inventory','Současný počet (bez původních evidenčních čísel)'],
 ['reference','Současné reference'],['manipulation','Současná manipulace'],['action','Současné akce'],['iso','Současné ISO'],
 ['storage','Současné uložení'],['additional','Doplňující současné údaje'],['flags','Současné evidenční příznaky'],
 ['authors','Současní autoři, role a pořadí přiřazení'],['history','Současná odborná historie (bez uživatelského auditu)'],
 ['dimensions','Současné míry a hmotnost'],['dictionary-references','Současné číselníkové vazby'],
 ['authorities','Současné určení a odborné zařazení'],['acquisitions','Současné akvizice bez původního přírůstkového čísla'],['professional-links','Adresář, role a literární reference'],
 ['professional-records','Opakované současné odborné záznamy (bez vyřazení)'],['media','Fotografie a přílohy — nezávislé kopie dat'],
] as const;
export type CloneGroup=typeof cloneGroups[number][0];
export const allCloneGroups:CloneGroup[]=cloneGroups.map(([name])=>name);
export function checkedCloneGroups(value:readonly string[]):CloneGroup[]{
 if(value.length>allCloneGroups.length||new Set(value).size!==value.length||value.some(v=>!allCloneGroups.includes(v as CloneGroup)))throw new Error('Neplatné skupiny kopie.');
 return [...value].sort() as CloneGroup[];
}
export function CloneGroupSelection({value,onChange,disabled=false}:{value:CloneGroup[];onChange:(value:CloneGroup[])=>void;disabled?:boolean}){
 return <fieldset disabled={disabled} aria-label="Skupiny současných údajů pro kopii"><legend>Vyberte kopírované skupiny</legend><button data-scoped-bulk-control type="button" onClick={()=>onChange([...allCloneGroups])}>Vybrat všechny podporované skupiny</button><button data-scoped-bulk-control type="button" onClick={()=>onChange([])}>Nevybrat žádnou skupinu</button><div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">{cloneGroups.map(([id,label])=><label key={id} className="flex items-center gap-2 cursor-pointer select-none"><input data-scoped-bulk-control type="checkbox" aria-label={label} checked={value.includes(id)} onChange={e=>onChange(e.target.checked?[...value,id]:value.filter(v=>v!==id))}/>{label}</label>)}</div><p>Nové inventární číslo a titul zadáváte výslovně. Neověřená vybraná skupina celou kopii zastaví. Přírůstkové číslo originálu se nekopíruje.</p><TechnicalDemus title="Pravidla původu klonovaných údajů"><p>Nové inventární číslo a titul zadáváte výslovně. Historické DEMUS identifikátory, zdrojové klíče, lineage a audit se nepřenášejí. Současné akvizice se kopírují bez původního přírůstkového čísla. Historické akvizice, vyřazení a návrhy na vyřazení se nekopírují. Neověřená vybraná skupina celou kopii zastaví. Prázdný výběr založí pouze novou identitu; bez titulu musí být vybrán doložený současný typ.</p></TechnicalDemus></fieldset>;
}
