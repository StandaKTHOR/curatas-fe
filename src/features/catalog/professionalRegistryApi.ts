import {resolveApiUrl} from '../../lib/api';
import {effectiveToken} from '../localAuth/localAuthClient';
export type RegistryKind='PARTY'|'LITERATURE'|'ISO_STATE';
export interface RegistryEntry{id:number;label:string;fields:Record<string,string|null>;version:number}
export interface ProfessionalLink{id:number;entryId:number|null;sourceRecordId?:string|null;context:string;roleId:string|null;roleLabel:string|null;label:string;fields:Record<string,unknown>;sortOrder:number;note:string|null;recordId:number|null}
export class RegistryError extends Error{constructor(public status:number){super(({403:'Nemáte oprávnění k této operaci.',404:'Agenda není dostupná. Vyžaduje samostatné schválení a zapnutí serverem.',412:'Záznam byl mezitím změněn. Obnovte jej a porovnejte údaje.',422:'Neplatná vazba, duplicitní přiřazení nebo nepodporované údaje.',428:'Chybí verze záznamu. Obnovte stránku.'} as Record<number,string>)[status]??`Operace se nezdařila (${status}).`);}}
export async function saveRegistryEntry(
    api:ReturnType<typeof professionalRegistryApi>, kind:RegistryKind, draft:Record<string,string|null>,
    signal:AbortSignal, id?:number, tag?:string,
):Promise<RegistryEntry> {
    const saved=await api<RegistryEntry>(`professional-registers/${kind}${id?'/'+id:''}`,signal,id?'PUT':'POST',draft,tag);
    const verified=await api<RegistryEntry>(`professional-registers/${kind}/${saved.value.id}`,signal);
    if(saved.etag!==verified.etag||saved.value.id!==verified.value.id||JSON.stringify(saved.value.fields)!==JSON.stringify(verified.value.fields))
        throw new Error('Následné načtení nepotvrdilo uložené údaje.');
    return verified.value;
}
export function professionalRegistryApi(catalog:number,token:string){return async function request<T>(path:string,signal:AbortSignal,method='GET',body?:unknown,tag?:string):Promise<{value:T;etag:string|null}>{const headers:Record<string,string>={Authorization:`Bearer ${effectiveToken(token)}`};if(method!=='GET'){headers['Content-Type']='application/json';headers['X-CURATAS-CSRF']='1';if(tag)headers['If-Match']=tag;}
 const response=await fetch(resolveApiUrl(`/api/v2/catalogs/${catalog}/${path}`),{method,headers,signal,cache:'no-store',redirect:'error',credentials:'omit',...(body===undefined?{}:{body:JSON.stringify(body)})});if(!response.ok)throw new RegistryError(response.status);const value:T=await response.json();if(signal.aborted)throw new DOMException('Aborted','AbortError');return {value,etag:response.headers.get('ETag')};};}
export const registryLabels:Record<string,string>={partyType:'Druh subjektu',lastName:'Příjmení / název organizace',firstName:'Jméno',birthDate:'Narození — původní přesnost',deathDate:'Úmrtí — původní přesnost',note:'Poznámka',Ref_LT:'Kód citace',Autor_LT:'Autor publikace',Titul_LT:'Titul publikace',Typ_LT:'Typ literatury',In_LT:'V publikaci',ZkrPer_LT:'Zkratka periodika',MistoVyd_LT:'Místo vydání',Nakl_LT:'Nakladatel',RokVyd_LT:'Rok vydání',Por_LT:'Pořadí vydání',ISBN_LT:'ISBN',Sign_LT:'Signatura',Rozsah_LT:'Rozsah',Dil_LT:'Díl',RocnikPer_LT:'Ročník periodika',CPer_LT:'Číslo periodika',Str_LT:'Strany publikace',Dokument_LT:'Dokument',MediumDok_LT:'Médium dokumentu',Anotace_LT:'Anotace',Zprac_LT:'Zpracování literatury',Pozn_LT:'Poznámka',PlusT_LT:'Doplňující údaj',Stav_SI:'Kód stavu ISO',Slovy_SI:'Název stavu ISO'};
export const partyFields=['partyType','lastName','firstName','birthDate','deathDate','note'];
export const literatureFields=['Ref_LT','Autor_LT','Titul_LT','Typ_LT','In_LT','ZkrPer_LT','MistoVyd_LT','Nakl_LT','RokVyd_LT','Por_LT','ISBN_LT','Sign_LT','Rozsah_LT','Dil_LT','RocnikPer_LT','CPer_LT','Str_LT','Dokument_LT','MediumDok_LT','Anotace_LT','Zprac_LT','Pozn_LT','PlusT_LT'];
