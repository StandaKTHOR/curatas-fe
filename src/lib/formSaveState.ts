/** Reconcile a confirmed section save without replacing another editor's draft. */
export function reconcileSectionSave<T extends Record<string, any>>(draft:T, baseline:T, confirmed:Record<string,unknown>, keys:readonly string[]){
 const next={...draft}, saved={...baseline};
 for(const key of keys){
  if(!Object.hasOwn(confirmed,key))continue;
  // Only untouched controls may follow a separately saved section. A changed
  // main control keeps both its draft and original comparison baseline.
  if(JSON.stringify(draft[key])!==JSON.stringify(baseline[key]))continue;
  (next as Record<string,unknown>)[key]=confirmed[key];
  (saved as Record<string,unknown>)[key]=confirmed[key];
 }
 return {draft:next,baseline:saved};
}

const fieldNames:Record<string,string>={inventoryNumber:'Inventární číslo',accessionNumber:'Přírůstkové číslo',title:'Titul',quantity:'Počet',datingFrom:'Datace od',datingTo:'Datace do',weight:'Hmotnost',latitude:'Zeměpisná šířka',longitude:'Zeměpisná délka'};
/** API errors never become a misleading success or an untranslated validation. */
export function saveFieldErrors(error:unknown):Record<string,string>{
 const source=(error as {fieldErrors?:unknown})?.fieldErrors;
 if(!source||typeof source!=='object'||Array.isArray(source))return {};
 return Object.fromEntries(Object.entries(source).filter(([,v])=>typeof v==='string').map(([key,value])=>{
  const label=fieldNames[key]??'Údaj';
  const message=/^[\x00-\x7F]+$/.test(value)?`${label}: zkontrolujte vyplněnou hodnotu.`:String(value);
  return [key,message];
 }));
}

export function saveFailureMessage(error:unknown){
 const status=(error as {status?:number})?.status;
 if(status===409)return 'Inventární nebo přírůstkové číslo již může existovat, případně byl požadavek již zpracován. Zkontrolujte čísla a výsledek původního požadavku. Zadání zůstává zachováno.';
 if(status===412)return 'Předmět mezitím změnil jiný uživatel. Vaše zadání zůstává zachováno; porovnejte aktuální záznam a potom kartu znovu načtěte.';
 if(status===400||status===422)return 'Záznam nebyl uložen. Zkontrolujte označená pole a přípustný formát hodnot. Zadání zůstává zachováno.';
 return error instanceof Error?error.message:'Zápis se nepodařilo potvrdit. Zadání zůstává zachováno.';
}

/** Mirrors the existing scoped additional/inventory contract; no historical inference. */
export function currentFormErrors(form:Record<string,unknown>){
 const errors:Record<string,string>={};
 for(const key of ['datingFrom','datingTo']){
  const value=String(form[key]??'');if(!value)continue;
  const date=new Date(value+'T00:00:00Z');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||value.startsWith('0000-')||Number.isNaN(date.getTime())||date.toISOString().slice(0,10)!==value)errors[key]=`${fieldNames[key]}: zadejte platné datum ve tvaru RRRR-MM-DD. Neúplnou dataci zadejte do textové Datace.`;
 }
 if(!errors.datingFrom&&!errors.datingTo&&form.datingFrom&&form.datingTo&&String(form.datingFrom)>String(form.datingTo))errors.datingTo='Datace do nesmí být před datací od.';
 for(const [key,min,max] of [['latitude',-90,90],['longitude',-180,180],['insuranceValue',0,Infinity]] as const){const text=String(form[key]??'');if(text&&(!/^-?(0|[1-9][0-9]{0,35})(\.[0-9]{1,18})?$/.test(text)||Number(text)<min||Number(text)>max))errors[key]=`${fieldNames[key]??'Pojistná hodnota'}: zadejte platné desetinné číslo${max===Infinity?' nejméně 0':` od ${min} do ${max}`} s desetinnou tečkou.`;}
 if(form.quantity!==null&&form.quantity!==undefined&&form.quantity!==''){const n=Number(form.quantity);if(!Number.isInteger(n)||n<0||n>2147483647)errors.quantity='Počet musí být celé nezáporné číslo.';}
 return errors;
}
