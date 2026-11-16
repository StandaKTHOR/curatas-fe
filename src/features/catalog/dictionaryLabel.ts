/** Presentation only: identity fields are deliberately not accepted or interpolated.
 * code/groupingCode are declared domain values, never inferred from IDs or names. */
export type DictionaryCaption = {label?:string|null;code?:string|null;groupingCode?:string|null};
export function dictionaryLabel(value:DictionaryCaption):string {
 const label=value.label?.trim()?value.label:undefined,code=value.code?.trim()?value.code:undefined;
 const name=label??code??'Bez textového označení';
 return name+(label&&code&&label!==code?' — '+code:'')+(value.groupingCode?.trim()?' (zařazení '+value.groupingCode+')':'');
}
/** Indistinguishable source rows are not silently merged or arbitrarily picked.
 * Distinct real codes/assignment groups remain selectable with their exact identity. */
export function ambiguousDictionaryCaption(value:DictionaryCaption,values:readonly DictionaryCaption[]):boolean {
 return values.filter(v=>dictionaryLabel(v)===dictionaryLabel(value)).length>1;
}
