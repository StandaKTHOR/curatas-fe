export interface CurrentAuditRow {id:string;actorId:string;action:string;fromVersion:string;toVersion:string;occurredAt:string;note:string|null}
export const managedDictionaryTypes=['MATERIAL','TECHNIQUE','FUND','OBJECT_TYPE','CUSTODIAN','AUTHOR','AUTHOR_ROLE','COUNTRY','COLLECTION','GROUP','LOCALITY','CLASSIFICATION','SUBJECT'] as const;
export type ManagedDictionaryType=typeof managedDictionaryTypes[number];
import {professionalFields} from '../../lib/professional';
import {hasPrivateNoStore} from '../../lib/privateResponsePolicy';
import {historicalTables,historicalRelatedTables,historicalStates,typedHistorical,type HistoricalTable,type HistoricalPage,type HistoricalRow} from '../catalog/historicalContract';
import {validateCuratorPage} from './curatorPageContract';
import { effectiveToken, localAuthEnabled } from '../localAuth/localAuthClient';
import { resolveApiUrl } from '../../lib/api';
import {curatorQuery,curatorCurrentFields,curatorCurrentInventoryFields} from './curatorContract';

export interface Item { id: number; catalogId: number; title: string | null; inventoryNumber: string | null; accessionNumber: string | null; version: string; sourceInventory?:Record<string,string|null> }
export interface MuseumHistoryRow {id:number;eventType:'REVISION'|'RESTORATION'|'LOAN';eventDate:string|null;description:string|null}
export type CuratorSection='audit-note'|'flags'|'inventory'|'professional'|'inventory-range'|'authorities'|'reference'|'manipulation'|'action'|'iso'|'storage'|'additional';
export const curatorSectionFields:Record<CuratorSection,readonly string[]>={'audit-note':['note'],flags:['archive','card','copied','verified','marked'],additional:['extendedDescription','datingFrom','datingTo','countryOfOrigin','objectCondition','insuranceValue','weight','latitude','longitude','coordinateSystem','markant','signature','findingLocality'],storage:['locationBuilding','locationRoom','permanentLocation'],inventory:['quantity','otherNumber'],'inventory-range':['lowerNumber','upperNumber','seriesRecordId'],professional:['objectType','description','authorText','datingText','originPlace','materialText','techniqueText','materialNote'],authorities:['determinedByText','authorRoleText','groupRecordId','fundRecordId','collectionRecordId','departmentRecordId','objectTypeRecordId'],reference:['Ref_RF','Str_RF'],manipulation:['Typ_MN','DatMan_MN','Kdo_MN','Stav_MN','Osetreni_MN','InvRev_MN','PopisSt_MN'],action:['Poradi_AK','Prezentace_AK','Revers_AK','CKtlg_AK','Pozn_AK'],iso:['KodISO_SO','CharISO_SO','MatISO_SO','CenaISO_SO','MenaISO_SO','PovrchISO_SO','TvarISO_SO']};
export const inventoryColumns={Predmet_S:'Předmět ve zdroji',Titul_S:'Titul ve zdroji',Rada_S:'Řada',PorC_S:'Poř. č.',Lomeni_S:'Lom',HPorC_S:'Až',StatSpr_S:'Stát',Spravce_S:'Správce',Odd_S:'Oddělení',Podsb_S:'Podsbírka',Pocet_S:'Počet ve zdroji',Ozn_S:'Označeno',JineC_S:'Jiné číslo',Karta_S:'Karta',Opsana_S:'Opsána',Overena_S:'Ověřena',Zapsal_S:'Zapsal',DatZap_S:'Datum zápisu',Skupina_S:'Skupina',Urcil_S:'Určil',DatZm_S:'Datum změny',Fond_S:'Fond'} as const;
export interface SourceChoice {recordId:string;sourceSha256:string;rowHash:string;typedKey:Record<string,unknown>;code:string;label:string|null;groupingCode:string|null}
export function inventoryDisplay(key:string,value:string|null|undefined){if(value===null||value===undefined)return 'Neuvedeno';return ['Ozn_S','Karta_S','Opsana_S','Overena_S'].includes(key)?value==='true'?'Ano':value==='false'?'Ne':value:value;}
export function validateInventoryRange(value:Record<string,string|null>){
    if(value.lowerNumber===null||! /^[1-9][0-9]{0,7}$/.test(value.lowerNumber??'')||value.upperNumber!==null&&! /^[1-9][0-9]{0,7}$/.test(value.upperNumber??''))return 'Zadejte kladné, nejvýše osmimístné pořadové číslo; horní číslo může být NULL.';
    if(value.upperNumber!==null&&BigInt(value.lowerNumber)>BigInt(value.upperNumber))return 'Dolní pořadové číslo musí být menší nebo rovno hornímu.';
    return '';
}
export interface ItemFilters { inventory?:string; title?:string; inventoryExact?:boolean; quantityMin?:string; quantityMax?:string; quantityState?:'ANY'|'PRESENT'|'NULL'; accessionFlag?:'ANY'|'TRUE'|'FALSE'|'NULL'; series?:string; department?:string; collection?:string;recordedBy?:string;determinedBy?:string }
export function itemFilterQuery(filters:ItemFilters):URLSearchParams {
    const query=new URLSearchParams();
    for(const [key,value] of Object.entries(filters)){
        if(['inventory','title','series','department','collection','recordedBy','determinedBy'].includes(key)){
            if(typeof value!=='string'||value.length>100)throw new Error('Invalid search');if(value)query.set(key,value);
        }else if(key==='inventoryExact'){
            if(typeof value!=='boolean')throw new Error('Invalid exact search');if(value)query.set(key,'true');
        }else if(['quantityMin','quantityMax'].includes(key)){
            if(typeof value!=='string'||! /^-?(0|[1-9][0-9]*)$/.test(value)||BigInt(value)<-2147483648n||BigInt(value)>2147483647n)throw new Error('Počet musí být celé číslo v rozsahu zdroje.');query.set(key,value);
        }else if(key==='quantityState'||key==='accessionFlag'){
            if(typeof value!=='string'||!(key==='quantityState'?['ANY','PRESENT','NULL']:['ANY','TRUE','FALSE','NULL']).includes(value))throw new Error('Invalid source state');if(value!=='ANY')query.set(key,value);
        }else throw new Error('Unsupported search field');
    }
    if(filters.quantityMin!==undefined&&filters.quantityMax!==undefined&&BigInt(filters.quantityMin)>BigInt(filters.quantityMax))throw new Error('Dolní mez počtu překračuje horní mez.');
    if(filters.quantityState==='NULL'&&(filters.quantityMin!==undefined||filters.quantityMax!==undefined))throw new Error('Prázdný počet nelze kombinovat s rozsahem.');
    return query;
}
export interface Dimension { id: number; itemId: number; catalogId: number; type: string; value: string | null; unit: string | null; createdInScopedApi: boolean;note?:string|null }
export interface Media { id: string; itemId: number; catalogId: number; kind: 'IMAGE' | 'ATTACHMENT'; name: string; mimeType: string; byteSize: number; variants: ('content' | 'thumbnail')[]; caption?:string|null }
export interface DictionaryValue {id:string;catalogId:number;type:string;label:string;code:string|null;parentId:string|null;version:string}
export interface CurrentAuthorAssignment {id:string;authorId:string;roleId:string|null;sortOrder:number}
export interface CurrentAuthor extends CurrentAuthorAssignment {authorLabel:string;roleLabel:string|null}
export interface Versioned<T> { value: T; etag: string }
export interface CurrentDimensionWrite {id:number|null;type:string;value:string;unit:string|null;note:string|null}
export type CurrentSectionWrites=Partial<Record<'inventory'|'professional'|'storage'|'additional'|'item',Record<string,string|null>>> & {dimensions?:{rows:CurrentDimensionWrite[]}};
export interface LifecycleState {active:boolean|null;published:boolean|null;status:string|null;deaccession:{reason:string;deaccessionDate:string;documentNumber:string|null}|null}
export interface NewItemFields {title:string;inventoryNumber:string;accessionNumber:string|null;professional?:Record<string,string|null>;inventory?:{quantity:number|null;otherNumber:string|null};storage?:Record<string,string|null>;additional?:Record<string,string|null>;references?:Partial<Record<ManagedDictionaryType,string>>}
export interface Creation {item:Item;origin:'MES_CREATED';requestId:string;replayed:boolean}
export interface ItemOrigin {catalogId:number;itemId:number;itemVersion:string;origin:'MES_CREATED'|'UNRECORDED';createdAt:string|null;createdBy?:string|null;createdBySubject?:string|null}
export interface SourceSummary {itemVersion:string;sourceQuantity:string|null;sourceAccessionFlag:boolean|null;sourceSeries?:string|null;sourceDepartmentCode?:string|null;sourceCollectionCode?:string|null;sourceRecordedBy?:string|null;sourceDeterminedBy?:string|null}
export const dimensionReviewReasons=['PROFESSIONAL_SEMANTICS_UNCONFIRMED','SOURCE_ORDER_MISSING','UNIT_MISSING','TYPE_REFERENCE_MISSING','TYPE_REFERENCE_AMBIGUOUS','ORIGINAL_DECIMAL_FORMAT_UNKNOWN','NUMBER_REVIEW_REQUIRED'] as const;
export interface SourceDimension {recordId:string;sourceSha256:string;rowHash:string;occurrence:string;sourceOrder:string|null;type:string|null;unit:string|null;number:{kind:string;value:string|null;bitPattern:string|null;scale:string|null;status:string};dictionaryState:'EXACT_MATCH'|'MISSING'|'AMBIGUOUS';reviewReasons?:string[]}
export interface Page<T, C> { items: T[]; nextAfterId: C | null }
export interface SourceMatTech {recordId:string;sourceSha256:string;rowHash:string;occurrence:string;sourceOrder:string|null;material:string|null;technique:string|null;materialState:'EXACT_MATCH'|'MISSING'|'AMBIGUOUS';techniqueState:'EXACT_MATCH'|'MISSING'|'AMBIGUOUS'}
export interface InventoryEvidence {itemVersion:string;inventoryNumber:string|null;sourceLocalId:string|null;sourceInventoryNumber:string|null;sourceComponents:Record<string,string|null>;aliases:{id:string;inventoryNumber:string|null;components:Record<string,string|null>}[];nextAfterId:string|null}
export class ScopedError extends Error {
    constructor(public readonly status: number) { super(errorText(status)); }
}
export function errorText(status: number) {
    if (status === 401) return 'Přihlášení vypršelo. Přihlaste se znovu.';
    if (status === 403) return 'Přístup byl zamítnut nebo odvolán. Zobrazená soukromá data byla uzavřena.';
    if (status === 404) return 'Záznam, soubor nebo funkce nejsou dostupné v tomto katalogu.';
    if ([409, 412, 428].includes(status)) return 'Verze nebo povolení zápisu se změnily. Draft je zachován; načtěte a porovnejte serverovou verzi.';
    if ([400, 422].includes(status)) return 'Zkontrolujte povolená pole a přesnost hodnot.';
    return 'Požadavek se nezdařil. Čtení lze opakovat; výsledek přerušeného zápisu nejprve ověřte načtením.';
}
const integer = (v: unknown, zero = false): number => {
    if ((typeof v !== 'string' && typeof v !== 'number') || !/^[0-9]+$/.test(String(v))) throw new Error('Invalid identifier');
    const n = Number(v); if (!Number.isSafeInteger(n) || n < (zero ? 0 : 1)) throw new Error('Unsafe identifier'); return n;
};
const version = (v: unknown) => { const s = String(v); if (!/^(0|[1-9][0-9]*)$/.test(s) || BigInt(s) > 9223372036854775807n) throw new Error('Invalid version'); return s; };
const uuid = (s: string) => { if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) throw new Error('Invalid media identity'); return s; };
const text = (v: unknown): string => { if (typeof v !== 'string') throw new Error('Invalid text'); return v; };
const nullable = (v: unknown) => v === null ? null : text(v);
/** Quote JSON numeric tokens without touching string literals. Decimal values and bigint ETags never pass through Number. */
export function exactJson(raw: string): any {
    return JSON.parse(raw.replace(/"(?:[^"\\]|\\.)*"|-?[0-9]+(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/g, token => token.startsWith('"') ? token : JSON.stringify(token)));
}
/** Plain JSON numeric syntax, <=36 integer digits and <=2 significant fractional digits; never round. */
export function decimal(input: string): string {
    if (input.length > 200 || !/^-?(0|[1-9][0-9]*)(\.[0-9]+)?$/.test(input)) throw new Error('Použijte desetinné číslo s tečkou bez exponentu.');
    const [whole, fraction = ''] = input.replace(/^-/, '').split('.');
    const significant = fraction.replace(/0+$/, '');
    if (whole.length > 36 || significant.length > 2) throw new Error('Nejvýše 36 celých a 2 významná desetinná místa; bez zaokrouhlení.');
    return `${input.startsWith('-') ? '-' : ''}${whole}${significant ? '.' + significant : ''}`;
}
export function strongTag(tag: string) {
    if (!/^"(0|[1-9][0-9]*)"$/.test(tag)) throw new Error('Načtěte silný ETag.'); version(tag.slice(1, -1)); return tag;
}
export function scopedApi(catalogId: number, token: string) {
    integer(catalogId); if (!token) throw new Error('Catalog and session required');
    const base = `/api/v2/catalogs/${catalogId}`;
    const root = `${base}/items`;
    const itemPath = (id: number) => `${root}/${integer(id)}`;
    async function request(path: string, signal: AbortSignal, init: RequestInit = {}) {
        if (signal.aborted) throw new Error('Request cancelled');
        const response = await fetch(resolveApiUrl(path), { ...init, signal, cache: 'no-store', redirect: 'error', credentials: 'omit',
            headers: { Authorization: `Bearer ${effectiveToken(token)}`, ...(localAuthEnabled()?{'X-CURATAS-CSRF':'1'}:{}), ...(init.body && !(init.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}), ...init.headers } });
        if (signal.aborted) throw new Error('Request cancelled');
        if (!response.ok) {if([401,403,404].includes(response.status))window.dispatchEvent(new CustomEvent('curatas:scoped-denied',{detail:{status:response.status}})); throw new ScopedError(response.status);} return response;
    }
    async function read(path: string, signal: AbortSignal, init?: RequestInit) {
        const response = await request(path, signal, init); const raw=await response.text();const body=exactJson(raw),wire=JSON.parse(raw);
        if (signal.aborted) throw new Error('Request cancelled'); return { body, response,wire };
    }
    function authorsPage(body:any,response:Response,id:number){
        if(integer(body.catalogId)!==catalogId||integer(body.itemId)!==id||body.semantics!=='CURRENT_AUTHORS_UUID_TUPLES_NOT_DEMUS_V1'||!hasPrivateNoStore(response.headers)||!Array.isArray(body.items)||body.items.length>100)throw new Error('Neplatný kontrakt současných autorů.');
        const items:CurrentAuthor[]=body.items.map((v:any,i:number)=>{if(integer(v.sortOrder,true)!==i)throw new Error('Neplatné pořadí autorů.');return {id:uuid(v.id),authorId:uuid(v.authorId),roleId:v.roleId===null?null:uuid(v.roleId),sortOrder:i,authorLabel:text(v.authorLabel),roleLabel:nullable(v.roleLabel)};});
        if(new Set(items.map(v=>v.id)).size!==items.length||new Set(items.map(v=>`${v.authorId}:${v.roleId}`)).size!==items.length)throw new Error('Duplicitní současní autoři.');
        return {items,etag:tag(response,body.itemVersion)};
    }
    function item(v: any, id?: number): Item {
        if (integer(v.catalogId) !== catalogId || (id !== undefined && integer(v.id) !== id)) throw new Error('Foreign item response');
    return { id: integer(v.id), catalogId, title: nullable(v.title), inventoryNumber: nullable(v.inventoryNumber), accessionNumber: nullable(v.accessionNumber), version: version(v.version) };
    }
    function dimension(v: any, parent: number, id?: number): Dimension {
        if (integer(v.catalogId) !== catalogId || integer(v.itemId) !== parent || (id !== undefined && integer(v.id) !== id) || typeof v.createdInScopedApi !== 'boolean') throw new Error('Foreign dimension response');
        if (v.value !== null) decimal(text(v.value));
        return { id: integer(v.id), catalogId, itemId: parent, type: text(v.type), value: nullable(v.value), unit: nullable(v.unit), createdInScopedApi: v.createdInScopedApi,...(Object.hasOwn(v,'note')?{note:nullable(v.note)}:{}) };
    }
    function media(v: any, parent: number, id?: string): Media {
        if (integer(v.catalogId) !== catalogId || integer(v.itemId) !== parent || (id !== undefined && uuid(v.id) !== id) || !['IMAGE', 'ATTACHMENT'].includes(v.kind)
            || !/^[\p{L}\p{N}][\p{L}\p{N}\p{M}._ -]{0,119}$/u.test(v.name) || !['image/png','image/jpeg','application/pdf','application/octet-stream'].includes(v.mimeType)
            || (v.kind === 'IMAGE' && !['image/png','image/jpeg'].includes(v.mimeType)) || !Array.isArray(v.variants) || !v.variants.includes('content') || v.variants.some((x: string) => !['content','thumbnail'].includes(x))
            || (v.variants.includes('thumbnail') && v.kind !== 'IMAGE')) throw new Error('Invalid media response');
        const size = integer(v.byteSize); if (size > 134217728) throw new Error('Media too large');
        return { id: uuid(v.id), catalogId, itemId: parent, kind: v.kind, name: v.name, mimeType: v.mimeType, byteSize: size, variants: [...v.variants],...(Object.hasOwn(v,'caption')?{caption:nullable(v.caption)}:{}) };
    }
    function tag(response: Response, expected: unknown) { const value = response.headers.get('ETag') || ''; if (strongTag(value) !== `"${version(expected)}"`) throw new Error('Missing or mismatched ETag'); return value; }
    function sourceInventory(input:any):Record<string,string|null>{
        if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length!==Object.keys(inventoryColumns).length||Object.keys(input).some(k=>!Object.hasOwn(inventoryColumns,k)))throw new Error('Invalid source whitelist');
        const result:Record<string,string|null>={};for(const key of Object.keys(inventoryColumns))result[key]=nullable(input[key]);return result;
    }
    function bounds(after: number, limit: number) { integer(after, true); if (integer(limit) > 100) throw new Error('Invalid page size'); return `?limit=${limit}&afterId=${after}`; }
    function patch(input: Partial<Pick<Item, 'title' | 'inventoryNumber'>>) {
        const keys = Object.keys(input); if (!keys.length || keys.some(k => !['title','inventoryNumber'].includes(k))) throw new Error('Unsupported item field');
        for (const key of keys) { const value = input[key as keyof typeof input]; if (value !== null && (typeof value !== 'string' || value.includes('\0') || value.length > (key === 'title' ? 4096 : 255))) throw new Error('Invalid scalar'); }
        return JSON.stringify(input);
    }
    function dimensionBody(input: { type: string; value: string; unit: string | null }) {
        if (Object.keys(input).some(k => !['type','value','unit'].includes(k)) || !input.type.trim() || input.type.length > 255 || (input.unit !== null && (typeof input.unit !== 'string' || input.unit.length > 255))) throw new Error('Invalid dimension fields');
        return `{"type":${JSON.stringify(input.type)},"value":${decimal(input.value)},"unit":${JSON.stringify(input.unit)}}`;
    }
    async function dimensionWrite(parent: number, id: number | null, etag: string, input: { type: string; value: string; unit: string | null }, signal: AbortSignal): Promise<Versioned<Dimension>> {
        const { body, response } = await read(`${itemPath(parent)}/dimensions${id === null ? '' : '/' + integer(id)}`, signal,
            { method: id === null ? 'POST' : 'PATCH', headers: { 'If-Match': strongTag(etag) }, body: dimensionBody(input) });
        return { value: dimension(body.dimension, parent, id ?? undefined), etag: tag(response, body.itemVersion) };
    }
    async function creation(path:string,requestId:string,signal:AbortSignal,init?:RequestInit):Promise<Versioned<Creation>> {
        uuid(requestId);const {body,response}=await read(path,signal,init);const created=item(body.item);
        if(body.origin!=='MES_CREATED'||body.requestId!==requestId.toLowerCase()||typeof body.replayed!=='boolean'
            ||response.headers.get('Location')!==itemPath(created.id))throw new Error('Invalid creation receipt');
        return {value:{item:created,origin:'MES_CREATED',requestId:body.requestId,replayed:body.replayed},etag:tag(response,created.version)};
    }
    async function cloneResult(path:string,requestId:string,signal:AbortSignal,init?:RequestInit){
        const {body,response}=await read(path,signal,init);const created=item(body.item);
        if(body.requestId!==uuid(requestId).toLowerCase()||typeof body.replayed!=='boolean'||!body.copied||typeof body.copied!=='object'
            ||!hasPrivateNoStore(response.headers)||(init&&response.headers.get('Location')!==itemPath(created.id)))throw new Error('Invalid clone receipt');
        return {value:{item:created,clonedFromItemId:integer(body.clonedFromItemId),requestId:body.requestId,replayed:body.replayed,copied:body.copied},etag:tag(response,created.version)};
    }
    function lifecycle(body:any,response:Response,id:number,wire:any){
        if(integer(body.catalogId)!==catalogId||integer(body.itemId)!==id||body.semantics!=='CURRENT_OPERATIONAL_STATE_NOT_SOURCE'||!hasPrivateNoStore(response.headers))throw new Error('Neplatný kontrakt provozního stavu.');
        const text=(value:unknown)=>value===null||typeof value==='string';
        if(!wire?.state||!text(wire.state.status)||wire.state.deaccession!==null&&(!wire.state.deaccession||typeof wire.state.deaccession.reason!=='string'||typeof wire.state.deaccession.deaccessionDate!=='string'||!text(wire.state.deaccession.documentNumber)))throw new Error('Neplatné JSON typy provozního stavu.');
        const state=body.state;if(!state||Object.keys(state).length!==4||!['active','published','status','deaccession'].every(k=>Object.hasOwn(state,k))||![true,false,null].includes(state.active)||![true,false,null].includes(state.published))throw new Error('Neplatný provozní stav.');
        const status=nullable(state.status);let deaccession:LifecycleState['deaccession']=null;
        if(state.deaccession!==null){const v=state.deaccession;if(!v||Object.keys(v).length!==3||!['reason','deaccessionDate','documentNumber'].every(k=>Object.hasOwn(v,k))||typeof v.reason!=='string'||!v.reason.trim()||v.reason.length>4096||typeof v.deaccessionDate!=='string'||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(v.deaccessionDate))throw new Error('Neplatný záznam vyřazení.');deaccession={reason:v.reason,deaccessionDate:v.deaccessionDate,documentNumber:nullable(v.documentNumber)};}
        return {value:{active:state.active as boolean|null,published:state.published as boolean|null,status,deaccession},etag:tag(response,body.itemVersion)};
    }
    function acquisition(v:any):import('../../lib/api').MuseumAcquisition{
        if(typeof v.sourceReadOnly!=='boolean')throw new Error('Chybí stav zdrojové akvizice.');
        const date=nullable(v.acquisitionDate);if(date!==null&&(!v.sourceReadOnly&&!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date)||date.length>64))throw new Error('Neplatné datum akvizice.');
        const order=nullable(v.orderNumber);if(order!==null&&(!/^-?(0|[1-9][0-9]*)$/.test(order)||BigInt(order)<-9223372036854775808n||BigInt(order)>9223372036854775807n))throw new Error('Neplatné pořadí akvizice.');
        return {id:integer(v.id),accessionNumber:nullable(v.accessionNumber),acquisitionMethod:nullable(v.acquisitionMethod),methodDictionaryId:v.methodDictionaryId===null?null:integer(v.methodDictionaryId),acquisitionDate:date,acquiredFrom:nullable(v.acquiredFrom),circumstances:nullable(v.circumstances),documentNumber:nullable(v.documentNumber),message:nullable(v.message),orderNumber:order,sourceReadOnly:v.sourceReadOnly,legacyData:null};
    }
    function workset(body:any){
        if(integer(body.catalogId)!==catalogId||!Number.isFinite(Date.parse(body.createdAt))||!Number.isFinite(Date.parse(body.updatedAt)))throw new Error('Neplatná osobní pracovní sada.');
        integer(body.ownerUserId);const count=integer(body.itemCount,true);if(count>10000)throw new Error('Překročen rozsah pracovní sady.');
        return {id:uuid(body.id),name:text(body.name),description:body.description===null?'':text(body.description),itemCount:count,createdAt:body.createdAt as string,updatedAt:body.updatedAt as string};
    }
    function curatorRows(rows:any[],wireRows:any[]){
        if(!Array.isArray(wireRows)||wireRows.length!==rows.length)throw new Error('Invalid curator wire DTO');
        const scalar=(value:unknown)=>value===null||typeof value==='string';
        for(const row of wireRows){
            if(!row?.item||['title','inventoryNumber','accessionNumber'].some(key=>!scalar(row.item[key]))||!row.current||curatorCurrentFields.some(key=>!scalar(row.current[key]))||!row.source||Object.keys(inventoryColumns).some(key=>!scalar(row.source[key]))||row.currentInventory!==undefined&&row.currentInventory!==null&&curatorCurrentInventoryFields.some(key=>!scalar(row.currentInventory[key])))throw new Error('Invalid curator text JSON type');
        }
        for(const row of wireRows)if(row.currentAuthorityLabels!==undefined&&(!row.currentAuthorityLabels||typeof row.currentAuthorityLabels!=='object'||Object.values(row.currentAuthorityLabels).some(value=>!scalar(value))))throw new Error('Invalid current authority JSON type');
        const items:{item:Item;current:Record<string,string|null>;currentPresent:boolean;currentAuthorityLabels:Record<string,string|null>;currentInventory:Record<string,string|null>;source:Record<string,string|null>;hasPhoto:boolean|null;hasAttachment:boolean|null;lifecycle?:Omit<LifecycleState,'deaccession'>}[]=rows.map((row:any)=>{
                const current:Record<string,string|null>={};
                if(!row.current||Object.keys(row.current).length!==curatorCurrentFields.length||Object.keys(row.current).some(k=>!curatorCurrentFields.includes(k as typeof curatorCurrentFields[number]))||typeof row.currentPresent!=='boolean')throw new Error('Invalid current projection');
                for(const key of curatorCurrentFields)current[key]=nullable(row.current[key]);
                if(!row.currentPresent&&Object.values(current).some(v=>v!==null))throw new Error('Invalid current assertion state');
                const currentAuthorityLabels:Record<string,string|null>={};if(row.currentAuthorityLabels!==undefined){const types=managedDictionaryTypes.filter(t=>t!=='MATERIAL'&&t!=='TECHNIQUE');const labels=row.currentAuthorityLabels;if(!labels||typeof labels!=='object'||Array.isArray(labels)||Object.keys(labels).length!==types.length||Object.keys(labels).some(k=>!(types as readonly string[]).includes(k)))throw new Error('Invalid current authority projection');for(const type of types)currentAuthorityLabels[type]=nullable(labels[type]);}

                if(![true,false,null].includes(row.hasPhoto)||![true,false,null].includes(row.hasAttachment))throw new Error('Invalid media presence');
                let lifecycle:Omit<LifecycleState,'deaccession'>|undefined;
                if(row.lifecycle!==undefined){const state=row.lifecycle;if(!state||Object.keys(state).length!==3||!['active','published','status'].every(k=>Object.hasOwn(state,k))||!['true','false',null].includes(state.active)||!['true','false',null].includes(state.published))throw new Error('Invalid lifecycle flags');lifecycle={active:state.active===null?null:state.active==='true',published:state.published===null?null:state.published==='true',status:nullable(state.status)};}
                const currentInventory:Record<string,string|null>={quantity:null,otherNumber:null};if(row.currentInventory!==undefined&&row.currentInventory!==null){if(typeof row.currentInventory!=='object'||Array.isArray(row.currentInventory)||Object.keys(row.currentInventory).length!==curatorCurrentInventoryFields.length||Object.keys(row.currentInventory).some(k=>!curatorCurrentInventoryFields.includes(k as typeof curatorCurrentInventoryFields[number])))throw new Error('Invalid current inventory projection');for(const key of curatorCurrentInventoryFields)currentInventory[key]=nullable(row.currentInventory[key]);}return {item:item(row.item),lifecycle,current,currentPresent:row.currentPresent,currentAuthorityLabels,currentInventory,source:sourceInventory(row.source),hasPhoto:row.hasPhoto as boolean|null,hasAttachment:row.hasAttachment as boolean|null};
            });
        if(new Set(items.map(row=>row.item.id)).size!==items.length)throw new Error('Duplicate curator identity');
        return items;
    }
    return {
        worksets:async(signal:AbortSignal)=>{
            const {body,response}=await read(`${base}/worksets`,signal);
            if(!Array.isArray(body)||body.length>200||!hasPrivateNoStore(response.headers))throw new Error('Neplatný seznam osobních pracovních sad.');
            const items=body.map(workset);if(new Set(items.map(v=>v.id)).size!==items.length)throw new Error('Duplicitní pracovní sada.');return items;
        },
        createWorkset:async(requestId:string,input:{name:string;description?:string;itemIds?:number[];filter?:Record<string,unknown>},signal:AbortSignal)=>{
            if(typeof input.name!=='string'||!input.name.trim()||input.name.length>255||input.description!==undefined&&(typeof input.description!=='string'||input.description.length>4096))throw new Error('Vyplňte název pracovní sady.');
            const payload:any={name:input.name,description:input.description??null};
            if(input.itemIds!==undefined){if(input.filter!==undefined||input.itemIds.length>10000||new Set(input.itemIds).size!==input.itemIds.length)throw new Error('Neplatný pracovní výběr.');payload.itemIds=input.itemIds.map(id=>integer(id));}
            else if(input.filter!==undefined){const {sort='inventoryNumber,asc',...filters}=input.filter;const query=curatorQuery(0,100,String(sort),filters);query.delete('page');query.delete('size');payload.filter={};query.forEach((v,k)=>{payload.filter[k]=v;});}
            else throw new Error('Chybí pracovní výběr.');
            const {body,response}=await read(`${base}/worksets`,signal,{method:'POST',headers:{'Idempotency-Key':uuid(requestId)},body:JSON.stringify(payload)});
            if(!hasPrivateNoStore(response.headers)||uuid(body.id)!==requestId.toLowerCase())throw new Error('Neplatné potvrzení pracovní sady.');return workset(body);
        },
        professionalHistory:async(id:number,signal:AbortSignal)=>{
            const {body,response}=await read(`${itemPath(id)}/professional-records/history`,signal);
            if(integer(body.catalogId)!==catalogId||integer(body.itemId)!==id||body.semantics!=='CURRENT_OWNED_MUSEUM_HISTORY_NOT_USER_AUDIT'||!Array.isArray(body.items)||body.items.length>1000||!hasPrivateNoStore(response.headers))throw new Error('Invalid museum history contract');
            const items:MuseumHistoryRow[]=body.items.map((v:any)=>{if(!['REVISION','RESTORATION','LOAN'].includes(v.eventType)||(v.eventDate!==null&&!/^\d{4}-\d{2}-\d{2}$/.test(v.eventDate)))throw new Error('Unclassified museum event');return {id:integer(v.id),eventType:v.eventType,eventDate:nullable(v.eventDate),description:nullable(v.description)};});
            if(new Set(items.map((v:{id:number})=>v.id)).size!==items.length)throw new Error('Duplicate history identity');return {items,etag:tag(response,body.itemVersion)};
        },
        cloneItem:async(id:number,requestId:string,etag:string,input:{title:string;inventoryNumber:string},signal:AbortSignal)=>{
            if(Object.keys(input).length!==2||Object.keys(input).some(k=>!['title','inventoryNumber'].includes(k)))throw new Error('Invalid clone fields');
            for(const key of ['title','inventoryNumber'] as const)if(typeof input[key]!=='string'||!input[key].trim()||input[key].includes('\0')||input[key].length>(key==='title'?4096:255))throw new Error('Vyplňte název a nové inventární číslo.');
            return cloneResult(`${itemPath(id)}/clone`,requestId,signal,{method:'POST',headers:{'If-Match':strongTag(etag),'Idempotency-Key':uuid(requestId)},body:JSON.stringify(input)});
        },
        cloneOutcome:(requestId:string,signal:AbortSignal)=>cloneResult(`${root}/clone-requests/${uuid(requestId)}`,requestId,signal),
        cloneOrigin:async(id:number,signal:AbortSignal)=>{
            const response=await request(`${itemPath(id)}/clone-origin`,signal);
            if(!hasPrivateNoStore(response.headers))throw new Error('Invalid cache policy');if(response.status===204)return null;
            const b=exactJson(await response.text());if(integer(b.catalogId)!==catalogId||integer(b.itemId)!==id||typeof b.createdAt!=='string'||Number.isNaN(Date.parse(b.createdAt))||!b.copied||b.sourceEvidence?.semantics!=='CLONED_READ_ONLY_SOURCE_EVIDENCE_NOT_CURRENT_ASSERTIONS')throw new Error('Invalid clone origin');
            return {catalogId,itemId:id,itemVersion:version(b.itemVersion),clonedFromItemId:integer(b.clonedFromItemId),createdBy:integer(b.createdBy),createdAt:b.createdAt,copied:b.copied,etag:tag(response,b.itemVersion)};
        },
        professionalRecords:async(id:number,signal:AbortSignal)=>{
            const {body,response}=await read(`${itemPath(id)}/professional-records`,signal);
            if(integer(body.catalogId)!==catalogId||integer(body.itemId)!==id||body.semantics!=='CURRENT_OWNED_RECORDS_NOT_SOURCE'||!Array.isArray(body.items)||body.items.length>1000||!hasPrivateNoStore(response.headers))throw new Error('Invalid current record contract');
            const items=body.items.map((r:any)=>{if(!['DOCUMENTATION','CLASSIFICATION','DETERMINATION','DEACCESSION','MANIPULATION','ACTION','ISO','ORIGIN','MATERIAL_TECHNIQUE','BIBLIOGRAPHY'].includes(r.kind)||!r.payload||typeof r.payload!=='object'||Array.isArray(r.payload))throw new Error('Invalid professional record');
                return {id:integer(r.id),kind:r.kind as import('../../lib/api').MuseumRecordKind,dictionaryId:r.dictionaryId===null?null:integer(r.dictionaryId),partyId:r.partyId===null?null:integer(r.partyId),payload:r.payload,materialDictionaryId:r.materialDictionaryId===null?null:integer(r.materialDictionaryId),techniqueDictionaryId:r.techniqueDictionaryId===null?null:integer(r.techniqueDictionaryId),sourceTable:null,sourceKey:null,legacyData:null};});
            if(new Set(items.map((r:{id:number})=>r.id)).size!==items.length)throw new Error('Duplicate professional identity');return {items,etag:tag(response,body.itemVersion)};
        },
        saveProfessional:async(id:number,kind:import('../../lib/api').MuseumRecordKind,recordId:number|undefined,etag:string,payload:Record<string,unknown>,signal:AbortSignal)=>{
            const fields=professionalFields[kind];
            if(kind==='DEACCESSION'||!fields||!payload||!Object.keys(payload).length||Object.keys(payload).some(k=>!fields.some(([key])=>key===k)))throw new Error('Nepovolená pole odborného záznamu.');
            for(const value of Object.values(payload))if(value!==null&&typeof value!=='string'&&typeof value!=='boolean'&&!(typeof value==='number'&&Number.isFinite(value)))throw new Error('Neplatná hodnota odborného záznamu.');
            const {body,response}=await read(`${itemPath(id)}/professional-records/${kind}${recordId===undefined?'':'/'+integer(recordId)}`,signal,{method:recordId===undefined?'POST':'PATCH',headers:{'If-Match':strongTag(etag)},body:JSON.stringify(payload)});
            if(integer(body.catalogId)!==catalogId||integer(body.itemId)!==id||body.origin!=='CURRENT_CURATOR_STATEMENT_NOT_SOURCE'||!hasPrivateNoStore(response.headers))throw new Error('Neplatný kontrakt uložené odborné evidence.');
            const r=body.record;
            if(!r||r.kind!==kind||recordId!==undefined&&integer(r.id)!==recordId||!r.payload||typeof r.payload!=='object'||Array.isArray(r.payload)||Object.keys(r.payload).some(k=>!fields.some(([key])=>key===k)))throw new Error('Neplatný uložený odborný záznam.');
            const result={id:integer(r.id),kind,dictionaryId:r.dictionaryId===null?null:integer(r.dictionaryId),partyId:r.partyId===null?null:integer(r.partyId),payload:r.payload,materialDictionaryId:r.materialDictionaryId===null?null:integer(r.materialDictionaryId),techniqueDictionaryId:r.techniqueDictionaryId===null?null:integer(r.techniqueDictionaryId),sourceTable:null,sourceKey:null,legacyData:null};
            return {value:result,etag:tag(response,body.itemVersion)};
        },
        itemAudit:async(id:number,signal:AbortSignal,after?:{afterVersion:string;afterId:string})=>{
            const query=after?'?'+new URLSearchParams({afterVersion:version(after.afterVersion),afterId:uuid(after.afterId)}):'';
            const {body,response}=await read(`${itemPath(id)}/audit${query}`,signal);
            if(integer(body.catalogId)!==catalogId||integer(body.itemId)!==id||!hasPrivateNoStore(response.headers)||!Array.isArray(body.items)||body.items.length>50)throw new Error('Neplatný audit předmětu.');
            const parent=version(body.itemVersion);const items:CurrentAuditRow[]=body.items.map((v:any)=>{const from=version(v.fromVersion),to=version(v.toVersion);if(BigInt(to)!==BigInt(from)+1n||BigInt(to)>BigInt(parent))throw new Error('Neplatná verze auditního záznamu.');return {id:uuid(v.id),actorId:version(v.actorId),action:text(v.action),fromVersion:from,toVersion:to,occurredAt:text(v.occurredAt),note:nullable(v.note)};});
            if(items.some((v:any,i:number)=>BigInt(v.toVersion)<=BigInt(after?.afterVersion??'-1')||i>0&&BigInt(v.toVersion)<=BigInt(items[i-1].toVersion)))throw new Error('Neuspořádaný audit.');
            const next=body.next===null?null:{afterVersion:version(body.next.afterVersion),afterId:uuid(body.next.afterId)};const last=items.at(-1);if(next&&(!last||next.afterVersion!==last.toVersion||next.afterId!==last.id))throw new Error('Neplatný auditní kurzor.');return {items,next,etag:tag(response,parent)};
        },
        submitFeedback:async(requestId:string,message:string,signal:AbortSignal)=>{
            const {body,response}=await read(`${base}/feedback`,signal,{method:'POST',body:JSON.stringify({requestId:uuid(requestId),message})});
            if(integer(body.catalogId)!==catalogId||uuid(body.feedbackId)!==requestId||body.status!=='RECEIVED'||!hasPrivateNoStore(response.headers))throw new Error('Přijetí připomínky nebylo potvrzeno.');return {feedbackId:requestId,status:'RECEIVED'};
        },
        feedbackQueue:async(signal:AbortSignal,after?:{afterTime:string;afterId:string})=>{
            const query=after?'?'+new URLSearchParams({afterTime:after.afterTime,afterId:uuid(after.afterId)}):'';
            const {body,response}=await read(`${base}/feedback${query}`,signal);
            if(integer(body.catalogId)!==catalogId||!hasPrivateNoStore(response.headers)||!Array.isArray(body.items)||body.items.length>50)throw new Error('Neplatná fronta připomínek.');
            const items=body.items.map((v:any)=>({id:uuid(v.id),message:text(v.message),status:text(v.status),createdAt:text(v.created_at)}));
            const next=body.next===null?null:{afterId:uuid(body.next.afterId),afterTime:text(body.next.afterTime)};return {items,next};
        },
        dictionaryValue:async(type:ManagedDictionaryType,id:string,signal:AbortSignal)=>{
            const {body,response}=await read(`${base}/dictionaries/${type}/values/${uuid(id)}`,signal);
            if(integer(body.catalogId)!==catalogId||body.type!==type||uuid(body.id)!==id||!hasPrivateNoStore(response.headers))throw new Error('Neplatná identita číselníku.');
            return {value:{id,catalogId,type,label:text(body.label),code:nullable(body.code),parentId:body.parentId===null?null:uuid(body.parentId),version:version(body.version)},etag:tag(response,body.version)};
        },
        saveDictionary:async(type:ManagedDictionaryType,input:{label:string;code:string|null;parentId:string|null;reason:string},signal:AbortSignal,id?:string,etag?:string):Promise<{value:DictionaryValue;etag:string}>=>{
            if(!managedDictionaryTypes.includes(type)||!input.label.trim()||input.label.length>255||!input.reason.trim()||input.reason.length>1000)throw new Error('Neplatná položka číselníku.');
            const {body,response}=await read(`${base}/dictionaries/${type}/values${id?'/'+uuid(id):''}`,signal,{method:id?'PUT':'POST',headers:id?{'If-Match':strongTag(etag??'')}:undefined,body:JSON.stringify({...input,parentId:input.parentId===null?null:uuid(input.parentId)})});
            if(integer(body.catalogId)!==catalogId||body.type!==type||!hasPrivateNoStore(response.headers))throw new Error('Neplatný kontrakt uložení číselníku.');
            const value={id:uuid(body.id),catalogId,type,label:text(body.label),code:nullable(body.code),parentId:body.parentId===null?null:uuid(body.parentId),version:version(body.version)};
            if(id&&value.id!==id||value.label!==input.label||value.code!==input.code||value.parentId!==input.parentId)throw new Error('Uložení číselníku nebylo potvrzeno.');return {value,etag:tag(response,body.version)};
        },
        dictionaryMetadata:async(type:ManagedDictionaryType,signal:AbortSignal)=>{
            const {body,response}=await read(`${base}/dictionaries/${type}`,signal);
            if(body.type!==type||body.ownership!=='CATALOG_CREATED_ONLY'||body.parentSupport!=='EXPLICIT_SAME_TYPE'||!Array.isArray(body.operations)||!body.operations.includes('read')||!hasPrivateNoStore(response.headers))throw new Error('Unsupported dictionary contract');
            return body;
        },
        dictionaryValues:async(type:ManagedDictionaryType,signal:AbortSignal,after?:string,q='',branch?:{parentId?:string;rootsOnly?:boolean}):Promise<Page<DictionaryValue,string>>=>{
            if(q.length>100||q.includes('\0'))throw new Error('Vyhledávání číselníku má nejvýše100 znaků.');
            const {body,response}=await read(`${base}/dictionaries/${type}/values?limit=100${after?'&afterId='+uuid(after):''}${q?'&q='+encodeURIComponent(q):''}${branch?.parentId?'&parentId='+uuid(branch.parentId):branch?.rootsOnly?'&rootsOnly=true':''}`,signal);
            if(!Array.isArray(body.items)||body.items.length>100||!hasPrivateNoStore(response.headers))throw new Error('Invalid dictionary page');
            const items:DictionaryValue[]=body.items.map((v:any)=>{if(integer(v.catalogId)!==catalogId||v.type!==type)throw new Error('Foreign dictionary value');return {id:uuid(v.id),catalogId,type,label:text(v.label),code:nullable(v.code),parentId:v.parentId===null?null:uuid(v.parentId),version:version(v.version)};});
            if(items.some((v,i)=>v.id<=(after??'')||i>0&&v.id<=items[i-1].id))throw new Error('Unordered dictionary page');
            const next=body.nextAfterId===null?null:uuid(body.nextAfterId);if(next!==null&&(!items.length||next!==items[items.length-1].id))throw new Error('Invalid dictionary cursor');
            return {items,nextAfterId:next};
        },
        curatorPage:async(page:number,size:number,sort:string,filters:Record<string,unknown>,signal:AbortSignal)=>{
            const query=curatorQuery(page,size,sort,filters);
            const bodyParams:Record<string,string>={};query.forEach((value,key)=>{bodyParams[key]=value;});
            const {body,response,wire}=query.has('advancedFilter')
                ?await read(`${root}/curator-page/query`,signal,{method:'POST',body:JSON.stringify(bodyParams)})
                :await read(`${root}/curator-page?${query}`,signal);
            const {totalElements,totalPages}=validateCuratorPage(body,response.headers,{catalogId,page,pageSize:size,sort});
            const items=curatorRows(body.items,wire.items);
            return {items,totalElements,totalPages,page,pageSize:size,hasMore:page+1<totalPages};
        },
        curatorPrint:async(sort:string,filters:Record<string,unknown>,signal:AbortSignal)=>{
            const query=curatorQuery(0,100,sort,filters);query.delete('page');query.delete('size');
            const params:Record<string,string>={};query.forEach((v,k)=>{params[k]=v;});
            const {body,response,wire}=await read(`${root}/curator-print`,signal,{method:'POST',body:JSON.stringify(params)});
            const {totalElements}=validateCuratorPage(body,response.headers,{catalogId,page:0,pageSize:10000,sort});
            if(totalElements>10000)throw new Error('Překročen limit úplného tiskového výstupu.');
            return {items:curatorRows(body.items,wire.items),totalElements};
        },
        curatorExcel:async(sort:string,filters:Record<string,unknown>,signal:AbortSignal,columns?:string[])=>{
            const query=curatorQuery(0,100,sort,filters);query.delete('page');query.delete('size');
            const params:Record<string,string>={};query.forEach((v,k)=>{params[k]=v;});
            if(columns){if(!columns.length||new Set(columns).size!==columns.length||columns.some(k=>typeof k!=='string'||!k||k.includes(',')))throw new Error('Neplatné sloupce exportu.');params.columns=columns.join(',');}
            const response=await request(`${root}/curator-export.xlsx`,signal,{method:'POST',body:JSON.stringify(params)});
            if(!hasPrivateNoStore(response.headers)||response.headers.get('X-CURATAS-Catalog-Id')!==String(catalogId)||response.headers.get('Content-Type')?.split(';')[0]!=='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')throw new Error('Neplatný kontrakt XLSX exportu.');
            const blob=await response.blob();if(signal.aborted)throw new Error('Request cancelled');return blob;
        },
        lifecycle:async(id:number,signal:AbortSignal)=>{const {body,response,wire}=await read(`${itemPath(id)}/lifecycle`,signal);return lifecycle(body,response,id,wire);},
        deaccession:async(id:number,etag:string,input:{reason:string;deaccessionDate?:string|null;documentNumber?:string|null},signal:AbortSignal)=>{
            if(Object.keys(input).some(k=>!['reason','deaccessionDate','documentNumber'].includes(k))||typeof input.reason!=='string'||!input.reason.trim()||input.reason.length>4096)throw new Error('Důvod vyřazení je povinný.');
            for(const key of ['documentNumber','deaccessionDate'] as const){const value=input[key];if(value!==undefined&&value!==null&&(typeof value!=='string'||value.includes('\0')||value.length>(key==='documentNumber'?255:10)||key==='deaccessionDate'&&!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value)))throw new Error('Neplatné datum nebo doklad vyřazení.');}
            const {body,response,wire}=await read(`${itemPath(id)}/deaccession`,signal,{method:'POST',headers:{'If-Match':strongTag(etag)},body:JSON.stringify(input)});const result=lifecycle(body,response,id,wire);
            if(result.etag!==`"${BigInt(etag.slice(1,-1))+1n}"`||result.value.active!==false||result.value.published!==false||result.value.status!=='VYRAZENO'||!result.value.deaccession||result.value.deaccession.reason!==input.reason||input.deaccessionDate&&result.value.deaccession.deaccessionDate!==input.deaccessionDate||result.value.deaccession.documentNumber!==(input.documentNumber??null))throw new Error('Vyřazení nebylo potvrzeno platným stavem a verzí.');return result;
        },
        acquisitions:async(id:number,signal:AbortSignal)=>{
            const {body,response}=await read(`${itemPath(id)}/acquisitions`,signal);
            if(integer(body.catalogId)!==catalogId||integer(body.itemId)!==id||body.semantics!=='CURRENT_AND_READ_ONLY_HISTORICAL_ACQUISITIONS'||!Array.isArray(body.items)||body.items.length>1000||!hasPrivateNoStore(response.headers))throw new Error('Neplatný kontrakt akvizic.');
            const items=body.items.map(acquisition);if(items.some((r:{id:number},i:number)=>i>0&&r.id<=items[i-1].id))throw new Error('Neuspořádané akvizice.');return {value:items,etag:tag(response,body.itemVersion)};
        },
        saveAcquisition:async(id:number,recordId:number|undefined,etag:string,input:import('../../lib/api').MuseumAcquisitionInput,signal:AbortSignal)=>{
            const allowed=['accessionNumber','acquisitionMethod','methodDictionaryId','acquisitionDate','acquiredFrom','circumstances','documentNumber','message','orderNumber'];
            if(!Object.keys(input).length||Object.keys(input).some(k=>!allowed.includes(k)))throw new Error('Nepovolené pole akvizice.');
            const payload:Record<string,unknown>={...input};
            for(const [key,value] of Object.entries(input)){
                if(value===null)continue;
                if(key==='methodDictionaryId'){integer(value);continue;}
                if(key==='orderNumber'){const text=String(value);if(!/^-?(0|[1-9][0-9]*)$/.test(text)||BigInt(text)<-9223372036854775808n||BigInt(text)>9223372036854775807n||typeof value==='number'&&!Number.isSafeInteger(value))throw new Error('Neplatné celé pořadí akvizice.');payload[key]=text;continue;}
                if(typeof value!=='string'||value.includes('\0')||value.length>(key==='circumstances'?4096:255))throw new Error('Neplatná hodnota akvizice.');
            }
            const {body,response}=await read(`${itemPath(id)}/acquisitions${recordId===undefined?'':'/'+integer(recordId)}`,signal,{method:recordId===undefined?'POST':'PATCH',headers:{'If-Match':strongTag(etag)},body:JSON.stringify(payload)});
            if(integer(body.catalogId)!==catalogId||integer(body.itemId)!==id||body.origin!=='CURRENT_CURATOR_STATEMENT_NOT_SOURCE'||!hasPrivateNoStore(response.headers))throw new Error('Neplatné potvrzení akvizice.');
            const value=acquisition(body.acquisition);if(value.sourceReadOnly||recordId!==undefined&&value.id!==recordId)throw new Error('Neplatná identita uložené akvizice.');return {value,etag:tag(response,body.itemVersion)};
        },
        structuredExport:async(sort:string,filters:Record<string,unknown>,signal:AbortSignal,onProgress?:(items:number,bytes:number)=>void)=>{
            const query=curatorQuery(0,100,sort,filters);query.delete('page');query.delete('size');const params:Record<string,string>={};query.forEach((v,k)=>{params[k]=v;});
            const response=await request(`${root}/curator-export.ndjson`,signal,{method:'POST',body:JSON.stringify(params)});
            if(!hasPrivateNoStore(response.headers)||response.headers.get('X-CURATAS-Catalog-Id')!==String(catalogId)||response.headers.get('Content-Type')?.split(';')[0]!=='application/x-ndjson'||!response.body)throw new Error('Neplatný kontrakt strukturovaného exportu.');
            const reader=response.body.getReader(),decoder=new TextDecoder('utf-8',{fatal:true}),chunks:ArrayBuffer[]=[];let pending='',bytes=0,began=false,ended=false,expected=0,review=0;const items=new Set<number>(),finished=new Set<number>(),versions=new Map<number,string>();
            function line(raw:string){if(!raw.trim())throw new Error('Prázdný záznam exportu.');const v=exactJson(raw);if(ended)throw new Error('Data za ukončením exportu.');
             if(!began){if(v.kind!=='BEGIN'||v.format!=='MES_PROFESSIONAL_NDJSON_V1'||integer(v.catalogId)!==catalogId)throw new Error('Chybí začátek exportu.');expected=integer(v.itemsExpected,true);if(expected>10000)throw new Error('Rozsah exportu překročen.');began=true;return;}
             if(v.kind==='END'){if(v.format!=='MES_PROFESSIONAL_NDJSON_V1'||integer(v.catalogId)!==catalogId||v.status!=='COMPLETE_AVAILABLE_EVIDENCE'||integer(v.itemsExported,true)!==expected||items.size!==expected||finished.size!==expected)throw new Error('Export není úplný.');review=integer(v.sourceReviewStates,true);ended=true;return;}
             const source=v.kind==='DEMUS_SOURCE'||v.kind==='DEMUS_RELATIONS',p=source?v.page:v;if(!['CURRENT','ITEM_END','INVENTORY_EVIDENCE','DEMUS_SOURCE','DEMUS_RELATIONS'].includes(v.kind)||integer(p.catalogId)!==catalogId)throw new Error('Cizí nebo neznámý záznam exportu.');const id=integer(p.itemId);if(v.kind==='INVENTORY_EVIDENCE'&&v.semantics!=='SOURCE_INVENTORY_AND_ALIASES_NOT_CURRENT_ASSERTIONS')throw new Error('Neplatný kontrakt inventárních aliasů.');
             if(v.kind==='CURRENT'){if(items.has(id))throw new Error('Duplicitní předmět exportu.');items.add(id);versions.set(id,version(p.itemVersion));}
             else if(!items.has(id)||finished.has(id))throw new Error('Neplatná posloupnost exportu.');
             else if(v.kind==='ITEM_END')finished.add(id);
             else if(versions.get(id)!==version(p.itemVersion))throw new Error('Nesouhlasí verze exportu.');
            }
            try{while(true){const {done,value}=await reader.read();if(done)break;if(signal.aborted)throw new Error('Export byl zrušen.');bytes+=value.byteLength;if(bytes>134217728)throw new Error('Export překročil128MiB. Zužte filtr; neúplný soubor nebyl uložen.');chunks.push(new Uint8Array(value).buffer);pending+=decoder.decode(value,{stream:true});let n;while((n=pending.indexOf('\n'))>=0){line(pending.slice(0,n));pending=pending.slice(n+1);}if(pending.length>8388608)throw new Error('Překročen limit řádku exportu.');onProgress?.(finished.size,bytes);}
             pending+=decoder.decode();if(pending||!began||!ended||signal.aborted)throw new Error('Přenos exportu není úplný; soubor nebyl uložen.');return {blob:new Blob(chunks,{type:'application/x-ndjson'}),items:expected,sourceReviewStates:review};
            }catch(e){await reader.cancel().catch(()=>{});throw e;}finally{reader.releaseLock();}
        },
        currentAuthors:async(id:number,signal:AbortSignal)=>{
            const {body,response}=await read(`${itemPath(id)}/current-authors`,signal);
            return authorsPage(body,response,id);
        },
        saveCurrentAuthors:async(id:number,etag:string,items:CurrentAuthorAssignment[],signal:AbortSignal)=>{
            if(items.length>100||items.some((v,i)=>v.sortOrder!==i)||new Set(items.map(v=>v.id)).size!==items.length||new Set(items.map(v=>`${v.authorId}:${v.roleId}`)).size!==items.length)throw new Error('Neplatná nebo duplicitní přiřazení autorů.');
            items.forEach(v=>{uuid(v.id);uuid(v.authorId);if(v.roleId!==null)uuid(v.roleId);});
            const {body,response}=await read(`${itemPath(id)}/current-authors`,signal,{method:'PUT',headers:{'If-Match':strongTag(etag)},body:JSON.stringify(items)});
            const result=authorsPage(body,response,id);
            if(JSON.stringify(result.items.map(({id,authorId,roleId,sortOrder})=>({id,authorId,roleId,sortOrder})))!==JSON.stringify(items))throw new Error('Server nepotvrdil přesné přiřazení autorů.');return result;
        },
        sourcePlus:async(id:number,signal:AbortSignal,after='')=>{
            if(after&&!/^[a-f0-9]{64}$/.test(after))throw new Error('Neplatná zdrojová stránka.');
            const {body,response}=await read(`${itemPath(id)}/source-plus?limit=50&afterId=${after}`,signal);
            if(integer(body.catalogId)!==catalogId||integer(body.itemId)!==id||body.semantics!=='OPAQUE_TYPED_HISTORICAL_PLUS_NOT_CURRENT_ASSERTIONS'||!Array.isArray(body.items)||body.items.length>50||!hasPrivateNoStore(response.headers))throw new Error('Neplatný kontrakt zdrojových Plus/Sluz polí.');
            const keys=['Plus1T_S','Plus2T_S','Plus3C_S','Sluz2_S','SluzF_S','Sluz_S'];
            const items=body.items.map((v:any)=>{
                for(const key of ['recordId','sourceSha256','rowHash'])if(typeof v[key]!=='string'||!/^[a-f0-9]{64}$/.test(v[key]))throw new Error('Neplatná identita zdroje Plus.');
                if(!v.fields||Object.keys(v.fields).length!==keys.length||Object.keys(v.fields).some(k=>!keys.includes(k)))throw new Error('Nepovolené zdrojové pole.');
                const fields:Record<string,unknown>={};for(const key of keys){const value=v.fields[key];
                    if(value!==null){if(typeof value!=='object'||Array.isArray(value)||!['TEXT','NULL','FLOAT_BITS','DOUBLE_BITS'].includes(value.kind)||Object.keys(value).some(k=>!['kind','value'].includes(k))||value.value!==undefined&&value.value!==null&&typeof value.value!=='string')throw new Error('Neplatná typovaná zdrojová hodnota.');
                        if(value.kind==='FLOAT_BITS'&&!/^[a-f0-9]{8}$/i.test(value.value)||value.kind==='DOUBLE_BITS'&&!/^[a-f0-9]{16}$/i.test(value.value))throw new Error('Neplatný bitový vzor zdroje.');}
                    fields[key]=value;
                }
                return {recordId:v.recordId as string,sourceSha256:v.sourceSha256 as string,rowHash:v.rowHash as string,occurrence:integer(v.occurrence),fields};
            });
            if(items.some((v:{recordId:string},i:number)=>v.recordId<=after||i>0&&v.recordId<=items[i-1].recordId))throw new Error('Neuspořádaná zdrojová stránka.');
            const next=body.nextAfterId;if(next!==null&&(!items.length||next!==items[items.length-1].recordId))throw new Error('Neplatný zdrojový kurzor.');
            return {items,nextAfterId:next as string|null,etag:tag(response,body.itemVersion)};
        },
        sourceRelated:async(id:number,table:HistoricalTable,recordId:string,signal:AbortSignal,after=''):Promise<HistoricalPage>=>{
            const cursorPattern=/^[a-f0-9]{64}:[a-f0-9]{64}:[a-f0-9]{64}$/;
            if(!Object.hasOwn(historicalTables,table)||!/^[a-f0-9]{64}$/.test(recordId)||after!==''&&!cursorPattern.test(after))throw new Error('Invalid related source request');
            const {body,response}=await read(`${itemPath(id)}/source-history/${table}/${recordId}/relations?limit=50&afterId=${after}`,signal);
            if(integer(body.catalogId)!==catalogId||integer(body.itemId)!==id||body.table!==table||body.sourceRecordId!==recordId||body.semantics!=='DECLARED_SOURCE_AUTHORITY_GRAPH_NOT_CURRENT_IDS_V1'||!hasPrivateNoStore(response.headers)||!['AVAILABLE','SOURCE_ROW_UNAVAILABLE','REVIEW_REQUIRED_DEPTH_LIMIT'].includes(body.state)||!Array.isArray(body.items)||body.items.length>50||body.state==='SOURCE_ROW_UNAVAILABLE'&&body.items.length)throw new Error('Foreign related source');
            const items:HistoricalRow[]=body.items.map((v:any)=>{
                for(const k of ['relationshipId','recordId','sourceSha256','rowHash','viaRecordId'])if(typeof v[k]!=='string'||!/^[a-f0-9]{64}$/.test(v[k]))throw new Error('Invalid related lineage');
                if(!historicalRelatedTables.includes(v.table)||version(v.occurrence)==='0'||version(v.matchingRecords)==='0'||!v.fields||typeof v.fields!=='object'||Array.isArray(v.fields)||!Object.values(v.fields).every(typedHistorical)||!Array.isArray(v.sourcePath)||v.sourcePath.length<2||v.sourcePath.length>7||v.sourcePath[0]!==recordId||v.sourcePath.at(-1)!==v.recordId||v.sourcePath.at(-2)!==v.viaRecordId||new Set(v.sourcePath).size!==v.sourcePath.length||v.sourcePath.some((p:unknown)=>typeof p!=='string'||!/^[a-f0-9]{64}$/.test(p)))throw new Error('Invalid related fields');
                return {recordId:v.recordId,sourceSha256:v.sourceSha256,rowHash:v.rowHash,occurrence:version(v.occurrence),parentRecordId:v.viaRecordId,parentField:v.relationshipId,fields:v.fields,relationshipId:v.relationshipId,relatedTable:v.table,matchingRecords:version(v.matchingRecords),sourcePath:v.sourcePath};
            });
            const cursor=(v:HistoricalRow)=>`${v.relationshipId}:${v.parentRecordId}:${v.recordId}`;
            if(items.some((v,i)=>cursor(v)<=after||i>0&&cursor(v)<=cursor(items[i-1])))throw new Error('Unordered related evidence');
            const next=body.nextAfterId;if(next!==null&&(!items.length||next!==cursor(items[items.length-1])||!cursorPattern.test(next)||next<=after))throw new Error('Invalid related cursor');
            return {items,state:body.state,nextAfterId:next,etag:tag(response,body.itemVersion)};
        },
        sourceHistory:async(id:number,table:HistoricalTable,signal:AbortSignal,after=''):Promise<HistoricalPage>=>{
            if(!Object.hasOwn(historicalTables,table)||after!==''&&!/^[a-f0-9]{64}$/.test(after))throw new Error('Invalid historical source request');
            const {body,response}=await read(`${itemPath(id)}/source-history/${table}?limit=50&afterId=${after}`,signal);
            if(integer(body.catalogId)!==catalogId||integer(body.itemId)!==id||body.table!==table||body.semantics!=='TYPED_DEMUS_HISTORY_NOT_CURRENT_ASSERTIONS_V1'||!hasPrivateNoStore(response.headers)||!historicalStates.includes(body.state)||!Array.isArray(body.items)||body.items.length>50||body.state!=='AVAILABLE'&&body.items.length)throw new Error('Foreign historical source');
            const items:HistoricalRow[]=body.items.map((v:any)=>{
                for(const key of ['recordId','sourceSha256','rowHash','parentRecordId'])if(typeof v[key]!=='string'||!/^[a-f0-9]{64}$/.test(v[key]))throw new Error('Invalid historical lineage');
                if((v.parentField!==historicalTables[table]&&!(table==='InvCisla'&&v.parentField==='inventory_alias_lineage.parent_record_id'))||version(v.occurrence)==='0'||!v.fields||typeof v.fields!=='object'||Array.isArray(v.fields)||!Object.values(v.fields).every(typedHistorical))throw new Error('Invalid historical fields');return {recordId:v.recordId,sourceSha256:v.sourceSha256,rowHash:v.rowHash,occurrence:version(v.occurrence),parentRecordId:v.parentRecordId,parentField:v.parentField,fields:v.fields};
            });
            if(items.some((v,i)=>v.recordId<=after||i>0&&v.recordId<=items[i-1].recordId))throw new Error('Unordered historical rows');
            const next=body.nextAfterId;if(next!==null&&(body.state!=='AVAILABLE'||!items.length||next!==items[items.length-1].recordId||next<=after))throw new Error('Invalid historical cursor');
            return {items,state:body.state,nextAfterId:next,etag:tag(response,body.itemVersion)};
        },
        sourceInventory:async(id:number,signal:AbortSignal)=>{
            const {body,response}=await read(`${itemPath(id)}/source-inventory`,signal);
            if(integer(body.catalogId)!==catalogId||integer(body.itemId)!==id||body.semantics!=='WHITELISTED_HISTORICAL_SOURCE_NOT_CURRENT_ASSERTION'||!hasPrivateNoStore(response.headers))throw new Error('Foreign source inventory');
            return {fields:sourceInventory(body.source),itemVersion:version(body.itemVersion),etag:tag(response,body.itemVersion)};
        },
        sourceChoices:async(kind:string,signal:AbortSignal,after=''):Promise<Page<SourceChoice,string>>=>{
            if(!['series','fund','department','collection','group','material','technique','object-type'].includes(kind)||after!==''&&!/^[a-f0-9]{64}$/.test(after))throw new Error('Invalid source choice bounds');
            const {body}=await read(`${base}/source-choices/${kind}?limit=100&afterId=${after}`,signal);
            if(integer(body.catalogId)!==catalogId||body.kind!==kind||!Array.isArray(body.items)||body.items.length>100)throw new Error('Foreign source choices');
            const items=body.items.map((v:any)=>{for(const key of ['recordId','sourceSha256','rowHash'])if(!/^[a-f0-9]{64}$/.test(v[key]))throw new Error('Invalid source identity');if(!v.typedKey||typeof v.typedKey!=='object'||Array.isArray(v.typedKey))throw new Error('Missing typed source key');return {recordId:v.recordId,sourceSha256:v.sourceSha256,rowHash:v.rowHash,typedKey:v.typedKey,code:text(v.code),label:nullable(v.label),groupingCode:nullable(v.groupingCode)};});
            const next=body.nextAfterId;if(next!==null&&(!items.length||next!==items[items.length-1].recordId||next<=after))throw new Error('Invalid source cursor');
            if(items.some((v:SourceChoice,i:number)=>v.recordId<=after||i>0&&v.recordId<=items[i-1].recordId))throw new Error('Unordered source choices');
            return {items,nextAfterId:next};
        },
        inventoryPage:async(page:number,signal:AbortSignal,filters:ItemFilters={},choice?:{kind:string;recordId:string})=>{
            if(!Number.isInteger(page)||page<1||page>401)throw new Error('Neplatné číslo stránky.');
            const q=itemFilterQuery(filters);q.set('page',String(page));q.set('limit','50');if(choice){q.set('choiceKind',choice.kind);q.set('choiceRecordId',choice.recordId);}
            const {body}=await read(`${base}/items/inventory-page?${q}`,signal);
            if(integer(body.catalogId)!==catalogId||integer(body.page)!==page||integer(body.pageSize)!==50||body.sort!=='ID_ASC'||typeof body.hasMore!=='boolean'||!Array.isArray(body.items)||body.items.length>50)throw new Error('Invalid inventory page');
            const items=body.items.map((v:any)=>{if(!v.source||Object.keys(v.source).some(k=>!Object.hasOwn(inventoryColumns,k)))throw new Error('Invalid source whitelist');const source:Record<string,string|null>={};for(const k of Object.keys(inventoryColumns))source[k]=nullable(v.source[k]??null);return {...item(v.item),sourceInventory:source};});
            if(items.some((v:Item,i:number)=>i>0&&v.id<=items[i-1].id))throw new Error('Duplicate or unordered items');
            return {items,hasMore:body.hasMore};
        },
        curatorRecord:async(id:number,section:CuratorSection,signal:AbortSignal)=>{
            const {body,response}=await read(itemPath(id)+'/curator-record/'+section,signal);
            if(integer(body.catalogId)!==catalogId||integer(body.itemId)!==id||body.section!==section||body.origin!=='CURRENT_CURATOR_STATEMENT_NOT_SOURCE')throw new Error('Foreign curator section');
            const fields=curatorSectionFields[section];
            if(!body.values||Object.keys(body.values).length!==fields.length||Object.keys(body.values).some(k=>!fields.includes(k)))throw new Error('Invalid curator fields');
            const values:Record<string,string|null>={};for(const key of fields)values[key]=nullable(body.values[key]);
            if(typeof body.hasCurrentAssertion!=='boolean')throw new Error('Missing current assertion state');
            return {value:values,etag:tag(response,body.itemVersion),present:body.hasCurrentAssertion};
        },
        saveCuratorRecord:async(id:number,section:CuratorSection,etag:string,input:Record<string,string|null>,signal:AbortSignal)=>{
            const value:Record<string,string|number|null>={...input};
            if(section==='inventory-range'){const invalid=validateInventoryRange(input);if(invalid)throw new Error(invalid);value.lowerNumber=Number(input.lowerNumber);value.upperNumber=input.upperNumber===null?null:Number(input.upperNumber);}
            if(section==='inventory'&&value.quantity!==null){if(typeof value.quantity!=='string'||! /^(0|[1-9][0-9]*)$/.test(value.quantity)||BigInt(value.quantity)>2147483647n)throw new Error('Počet musí být celé nezáporné číslo nebo NULL.');value.quantity=Number(value.quantity);}
            if(section==='action'){for(const k of ['Poradi_AK','CKtlg_AK'] as const)if(value[k]!==null&&value[k]!==undefined){const s=String(value[k]);if(!/^-?(0|[1-9][0-9]*)$/.test(s)||BigInt(s)<(k==='Poradi_AK'?0n:-2147483648n)||BigInt(s)>2147483647n)throw new Error(k==='Poradi_AK'?'Pořadí musí být celé nezáporné číslo nebo NULL.':'Číslo katalogu musí být celé číslo nebo NULL.');value[k]=Number(s);}}
            if(section==='iso'&&value.CenaISO_SO!==null&&value.CenaISO_SO!==undefined){const s=String(value.CenaISO_SO);if(!/^-?(0|[1-9][0-9]*)$/.test(s)||BigInt(s)<-2147483648n||BigInt(s)>2147483647n)throw new Error('Cena ISO musí být celé číslo nebo NULL.');value.CenaISO_SO=Number(s);}
            const {body,response}=await read(itemPath(id)+'/curator-record/'+section,signal,{method:'PUT',headers:{'If-Match':strongTag(etag)},body:JSON.stringify(value)});
            return body?.itemVersion!==undefined?tag(response,body.itemVersion):response.headers.get('ETag')||'';
        },
        saveCuratorRecords:async(id:number,etag:string,input:CurrentSectionWrites,signal:AbortSignal)=>{
            const sections=Object.keys(input);if(!sections.length||sections.some(k=>!['inventory','professional','storage','additional','item','dimensions'].includes(k)))throw new Error('Invalid current sections');
            const values:Record<string,any>={};
            for(const section of sections as (keyof CurrentSectionWrites)[]){
                if(section==='dimensions'){const rows=input.dimensions?.rows;if(!rows?.length||rows.length>20)throw new Error('Uložte jednu až dvacet změněných měr.');const ids=new Set<number>();for(const row of rows){if(Object.keys(row).length!==5||!['id','type','value','unit','note'].every(k=>Object.hasOwn(row,k))||row.id!==null&&(ids.has(integer(row.id))||!ids.add(row.id))||typeof row.type!=='string'||!row.type.trim()||row.type.length>255)throw new Error('Neplatná současná míra.');decimal(row.value);for(const key of ['unit','note'] as const)if(row[key]!==null&&(typeof row[key]!=='string'||row[key]!.includes('\0')||row[key]!.length>(key==='note'?50:255)))throw new Error('Poznámka má nejvýše50 znaků; jednotka nejvýše255.');}values.dimensions={rows};continue;}
                const value=input[section]!;if(section==='item'){if(!value||!Object.keys(value).length||Object.keys(value).some(k=>!['title','inventoryNumber'].includes(k))||Object.values(value).some(v=>v!==null&&typeof v!=='string'))throw new Error('Invalid inventory identity patch');values.item={...value};continue;}const fields=curatorSectionFields[section];
                if(!value||Object.keys(value).length!==fields.length||fields.some(k=>!Object.hasOwn(value,k))||Object.values(value).some(v=>v!==null&&typeof v!=='string'))throw new Error('Invalid current section fields');
                values[section]={...value};
                if(section==='inventory'&&value.quantity!==null){if(!/^(0|[1-9][0-9]*)$/.test(value.quantity)||BigInt(value.quantity)>2147483647n)throw new Error('Počet musí být celé nezáporné číslo nebo NULL.');values[section].quantity=Number(value.quantity);}
            }
            const {body,response}=await read(itemPath(id)+'/curator-records',signal,{method:'PUT',headers:{'If-Match':strongTag(etag)},body:JSON.stringify(values)});
            if(integer(body.catalogId)!==catalogId||integer(body.itemId)!==id||!Array.isArray(body.sections)||JSON.stringify([...body.sections].sort())!==JSON.stringify(sections.sort())||!hasPrivateNoStore(response.headers))throw new Error('Invalid current sections receipt');
            return tag(response,body.itemVersion);
        },
        curatorMeasurement:async(id:number,signal:AbortSignal)=>{
            const {body,response}=await read(itemPath(id)+'/curator-measurement',signal);
            if(integer(body.catalogId)!==catalogId||integer(body.itemId)!==id||body.origin!=='CURATOR_STATEMENT_NOT_SOURCE')throw new Error('Foreign curator statement');
            const v=body.curatorValue;return {value:v===null?null:{label:nullable(v.label),decimalText:nullable(v.decimalText),unit:nullable(v.unit)},etag:tag(response,body.itemVersion)};
        },
        saveMeasurement:async(id:number,etag:string,input:{label:string|null;decimalText:string|null;unit:string|null},signal:AbortSignal)=>{
            if(Object.keys(input).length!==3||Object.keys(input).some(k=>!['label','decimalText','unit'].includes(k)))throw new Error('Invalid measurement');
            for(const [k,v] of Object.entries(input))if(v!==null&&(typeof v!=='string'||v.includes('\0')||v.length>(k==='decimalText'?512:255)))throw new Error('Invalid measurement');
            if(input.decimalText!==null&&!/^-?(0|[1-9][0-9]*)(\.[0-9]+)?$/.test(input.decimalText))throw new Error('Invalid exact decimal');
            await read(itemPath(id)+'/curator-measurement',signal,{method:'PUT',headers:{'If-Match':strongTag(etag)},body:JSON.stringify(input)});
        },
        sourceSummary:async(id:number,signal:AbortSignal):Promise<SourceSummary>=>{
            const {body,response}=await read(`${itemPath(id)}/source-summary`,signal);
            if(integer(body.catalogId)!==catalogId||integer(body.itemId)!==id)throw new Error('Foreign source summary');
            const count=body.sourceQuantity;
            if(count!==null && (typeof count!=='string'||!/^-?(0|[1-9][0-9]*)$/.test(count)||BigInt(count)<-2147483648n||BigInt(count)>2147483647n))throw new Error('Invalid native quantity');
            if(body.sourceAccessionFlag!==null&&typeof body.sourceAccessionFlag!=='boolean')throw new Error('Invalid native boolean');
            tag(response,body.itemVersion);
            return {itemVersion:version(body.itemVersion),sourceQuantity:count,sourceAccessionFlag:body.sourceAccessionFlag,
                sourceSeries:nullable(body.sourceSeries??null),sourceDepartmentCode:nullable(body.sourceDepartmentCode??null),sourceCollectionCode:nullable(body.sourceCollectionCode??null),sourceRecordedBy:nullable(body.sourceRecordedBy??null),sourceDeterminedBy:nullable(body.sourceDeterminedBy??null)};
        },
        createItem:async(requestId:string,input:NewItemFields,signal:AbortSignal)=>{
            if(Object.keys(input).length<3||Object.keys(input).some(k=>!['title','inventoryNumber','accessionNumber','professional','inventory','storage','additional','references'].includes(k)))throw new Error('Invalid creation fields');
            if(input.references)for(const [type,id] of Object.entries(input.references)){if(!managedDictionaryTypes.includes(type as ManagedDictionaryType)||['MATERIAL','TECHNIQUE'].includes(type))throw new Error('Invalid creation authority type');uuid(id);}
            for(const key of ['title','inventoryNumber','accessionNumber'] as const){const value=input[key];if(key==='accessionNumber'&&value===null)continue;if(typeof value!=='string'||!value.trim()||value.length>(key==='title'?4096:255)||value.includes('\0'))throw new Error('Invalid creation field');}
            if(input.professional){const keys=curatorSectionFields.professional;if(Object.keys(input.professional).length!==keys.length||keys.some(k=>!Object.hasOwn(input.professional!,k))||Object.values(input.professional).some(v=>v!==null&&typeof v!=='string'))throw new Error('Invalid creation professional fields');}
            if(input.additional){const keys=curatorSectionFields.additional;if(Object.keys(input.additional).length!==keys.length||keys.some(k=>!Object.hasOwn(input.additional!,k))||Object.values(input.additional).some(v=>v!==null&&typeof v!=='string'))throw new Error('Invalid additional fields');}
            if(input.storage){const keys=curatorSectionFields.storage;if(Object.keys(input.storage).length!==keys.length||keys.some(k=>!Object.hasOwn(input.storage!,k))||Object.values(input.storage).some(v=>v!==null&&(typeof v!=='string'||v.includes('\0')||v.length>512)))throw new Error('Invalid private storage fields');}
            if(input.inventory){const v=input.inventory;if(Object.keys(v).length!==2||!Object.hasOwn(v,'quantity')||!Object.hasOwn(v,'otherNumber')||(v.quantity!==null&&(!Number.isInteger(v.quantity)||v.quantity<0||v.quantity>2147483647))||(v.otherNumber!==null&&typeof v.otherNumber!=='string'))throw new Error('Invalid creation inventory fields');}
            return creation(root,requestId,signal,{method:'POST',headers:{'Idempotency-Key':uuid(requestId)},body:JSON.stringify(input)});
        },
        creationOutcome:(requestId:string,signal:AbortSignal)=>creation(`${root}/creation-requests/${uuid(requestId)}`,requestId,signal),
        itemOrigin:async(id:number,signal:AbortSignal):Promise<ItemOrigin>=>{
            const {body,response}=await read(`${itemPath(id)}/origin`,signal);if(integer(body.catalogId)!==catalogId||integer(body.itemId)!==id||!['MES_CREATED','UNRECORDED'].includes(body.origin)
                ||(body.origin==='MES_CREATED'?(typeof body.createdAt!=='string'||Number.isNaN(Date.parse(body.createdAt))):body.createdAt!==null))throw new Error('Invalid item origin');
            tag(response,body.itemVersion);return {catalogId,itemId:id,itemVersion:version(body.itemVersion),origin:body.origin,createdAt:body.createdAt,createdBy:body.createdBy==null?null:version(body.createdBy),createdBySubject:body.createdBySubject==null?null:text(body.createdBySubject)};
        },
        createDimensionsBatch:async(parent:number,etag:string,dimensions:{type:string;value:string;unit:string|null}[],signal:AbortSignal):Promise<Versioned<Dimension[]>>=>{
            if(!dimensions.length||dimensions.length>20)throw new Error('One to twenty dimensions required');
            const {body,response}=await read(`${itemPath(parent)}/dimensions/batch`,signal,{method:'POST',headers:{'If-Match':strongTag(etag)},body:`{"dimensions":[${dimensions.map(dimensionBody).join(',')}]}`});
            if(!Array.isArray(body.dimensions)||body.dimensions.length!==dimensions.length)throw new Error('Invalid batch receipt');
            const values=body.dimensions.map((v:any)=>dimension(v,parent)) as Dimension[];if(new Set(values.map(v=>v.id)).size!==values.length)throw new Error('Duplicate batch identity');
            return {value:values,etag:tag(response,body.itemVersion)};
        },
        list: async (signal: AbortSignal, after = 0, limit = 50, filters?: ItemFilters): Promise<Page<Item, number>> => {
            const query=filters?itemFilterQuery(filters):new URLSearchParams();
            const { body } = await read(root + bounds(after, limit)+(query.size?'&'+query.toString():''), signal);
            return { items: body.items.map((v: any) => item(v)), nextAfterId: body.nextAfterId === null ? null : integer(body.nextAfterId) };
        },
        detail: async (id: number, signal: AbortSignal): Promise<Versioned<Item>> => {
            const { body, response } = await read(itemPath(id), signal); return { value: item(body, id), etag: tag(response, body.version) };
        },
        inventoryEvidence: async (id:number,signal:AbortSignal,after?:string):Promise<InventoryEvidence> => {
            const {body,response}=await read(`${itemPath(id)}/inventory-evidence?limit=50${after?'&afterId='+uuid(after):''}`,signal);
            if(integer(body.catalogId)!==catalogId||integer(body.itemId)!==id||!Array.isArray(body.aliases))throw new Error('Foreign inventory evidence');
            tag(response,body.itemVersion);
            const fields=['series','ordinal','division','hierarchyOrdinal','hierarchyDivision','stateCode','custodianCode','departmentCode','collectionCode'];
            const components=(v:any)=>Object.fromEntries(fields.map(k=>[k,nullable(v[k]??null)]));
            return {itemVersion:version(body.itemVersion),inventoryNumber:nullable(body.inventoryNumber),sourceLocalId:nullable(body.sourceLocalId),sourceInventoryNumber:nullable(body.sourceInventoryNumber),sourceComponents:components(body.sourceComponents),aliases:body.aliases.map((v:any)=>({id:uuid(v.id),inventoryNumber:nullable(v.inventoryNumber),components:components(v.components)})),nextAfterId:body.nextAfterId===null?null:uuid(body.nextAfterId)};
        },
        patch: async (id: number, etag: string, input: Partial<Pick<Item, 'title' | 'inventoryNumber'>>, signal: AbortSignal): Promise<Versioned<Item>> => {
            const { body, response } = await read(itemPath(id), signal, { method: 'PATCH', headers: { 'If-Match': strongTag(etag) }, body: patch(input) });
            return { value: item(body, id), etag: tag(response, body.version) };
        },
        sourceDimensions:async(parent:number,signal:AbortSignal,offset=0,limit=50):Promise<Versioned<{items:SourceDimension[];nextOffset:number|null}>>=>{
            integer(offset,true);if(offset>100000||integer(limit)>100)throw new Error('Invalid page bounds');
            const {body,response}=await read(`${itemPath(parent)}/source-dimensions?offset=${offset}&limit=${limit}`,signal);
            if(integer(body.catalogId)!==catalogId||integer(body.itemId)!==parent||!Array.isArray(body.items)||body.items.length>limit||!hasPrivateNoStore(response.headers))throw new Error('Foreign source dimension page');
            const hash=(v:unknown)=>{const s=text(v);if(!/^[a-f0-9]{64}$/.test(s))throw new Error('Invalid source hash');return s;};
            const items:SourceDimension[]=body.items.map((v:any)=>{
                const n=v.number,value=nullable(n.value),bits=nullable(n.bitPattern),scale=nullable(n.scale),order=nullable(v.sourceOrder);
                if(value!==null&&!/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?$/.test(value))throw new Error('Invalid source number');
                if((bits!==null&&!/^[a-f0-9]{1,16}$/.test(bits))||(scale!==null&&!/^-?[0-9]+$/.test(scale))||(order!==null&&!/^-?[0-9]+$/.test(order)))throw new Error('Invalid source precision');
                if(!['NULL','INTEGER','DECIMAL','FLOAT_BITS','DOUBLE_BITS','UNSUPPORTED','INVALID'].includes(n.kind)||!['EXACT','ROUNDTRIP_FLOAT','NON_FINITE_REVIEW_REQUIRED','REVIEW_REQUIRED'].includes(n.status)||!['EXACT_MATCH','MISSING','AMBIGUOUS'].includes(v.dictionaryState))throw new Error('Invalid source state');
                if(v.reviewReasons!==undefined&&(!Array.isArray(v.reviewReasons)||v.reviewReasons.some((reason:unknown)=>!dimensionReviewReasons.includes(reason as typeof dimensionReviewReasons[number]))))throw new Error('Invalid review state');
                return {recordId:hash(v.recordId),sourceSha256:hash(v.sourceSha256),rowHash:hash(v.rowHash),occurrence:version(v.occurrence),sourceOrder:order,type:nullable(v.type),unit:nullable(v.unit),number:{kind:n.kind,value,bitPattern:bits,scale,status:n.status},dictionaryState:v.dictionaryState,reviewReasons:v.reviewReasons};
            });
            if(new Set(items.map(v=>v.recordId)).size!==items.length)throw new Error('Duplicate source identity');
            const next=body.nextOffset===null?null:integer(body.nextOffset);
            if(next!==null&&next!==offset+limit)throw new Error('Invalid source cursor');
            return {value:{items,nextOffset:next},etag:tag(response,body.itemVersion)};
        },
        sourceMatTech:async(parent:number,signal:AbortSignal,offset=0,limit=50):Promise<Versioned<{items:SourceMatTech[];nextOffset:number|null}>>=>{
            integer(offset,true);if(offset>100000||integer(limit)>100)throw new Error('Invalid page bounds');
            const {body,response}=await read(`${itemPath(parent)}/source-mattech?offset=${offset}&limit=${limit}`,signal);
            if(integer(body.catalogId)!==catalogId||integer(body.itemId)!==parent||!Array.isArray(body.items)||body.items.length>limit||!hasPrivateNoStore(response.headers)||body.semantics!=='TECHNICAL_SOURCE_READ_ONLY_REVIEW_REQUIRED')throw new Error('Foreign source MatTech page');
            const hash=(v:unknown)=>{const s=text(v);if(!/^[a-f0-9]{64}$/.test(s))throw new Error('Invalid source hash');return s;};
            const items:SourceMatTech[]=body.items.map((v:any)=>{
                const order=nullable(v.sourceOrder);if(order!==null&&!/^-?[0-9]+$/.test(order))throw new Error('Invalid source order');
                if(!['EXACT_MATCH','MISSING','AMBIGUOUS'].includes(v.materialState)||!['EXACT_MATCH','MISSING','AMBIGUOUS'].includes(v.techniqueState))throw new Error('Invalid source reference');
                return {recordId:hash(v.recordId),sourceSha256:hash(v.sourceSha256),rowHash:hash(v.rowHash),occurrence:version(v.occurrence),sourceOrder:order,material:nullable(v.material),technique:nullable(v.technique),materialState:v.materialState,techniqueState:v.techniqueState};
            });
            if(new Set(items.map(v=>v.recordId)).size!==items.length)throw new Error('Duplicate source identity');
            const next=body.nextOffset===null?null:integer(body.nextOffset);if(next!==null&&next!==offset+limit)throw new Error('Invalid source cursor');
            return {value:{items,nextOffset:next},etag:tag(response,body.itemVersion)};
        },
        dimensions: async (parent: number, signal: AbortSignal, after = 0, limit = 50) => {
            const { body, response } = await read(itemPath(parent) + '/dimensions' + bounds(after, limit), signal);
            if(!Array.isArray(body.items)||body.items.length>limit)throw new Error('Invalid dimension page');
            const items:Dimension[]=body.items.map((v:any)=>dimension(v,parent)),next=body.nextAfterId===null?null:integer(body.nextAfterId);
            if(items.some((v,i)=>v.id<=after||i>0&&v.id<=items[i-1].id)||next!==null&&(!items.length||next!==items[items.length-1].id))throw new Error('Invalid dimension cursor');
            return { value: { items, nextAfterId:next }, etag: tag(response, body.itemVersion) };
        },
        dimension: async (parent: number, id: number, signal: AbortSignal): Promise<Versioned<Dimension>> => {
            const { body, response } = await read(`${itemPath(parent)}/dimensions/${integer(id)}`, signal);
            return { value: dimension(body.dimension, parent, id), etag: tag(response, body.itemVersion) };
        },
        createDimension: (parent: number, etag: string, input: { type: string; value: string; unit: string | null }, signal: AbortSignal) => dimensionWrite(parent, null, etag, input, signal),
        patchDimension: (parent: number, id: number, etag: string, input: { type: string; value: string; unit: string | null }, signal: AbortSignal) => dimensionWrite(parent, id, etag, input, signal),
        uploadMedia:async(parent:number,etag:string,file:File,kind:'IMAGE'|'ATTACHMENT',caption:string|null,signal:AbortSignal)=>{
            if(!(file instanceof File)||!file.size||file.size>(kind==='IMAGE'?5*1024*1024:134217728)||!/^[\p{L}\p{N}][\p{L}\p{N}\p{M}._ -]{0,119}$/u.test(file.name)||!['IMAGE','ATTACHMENT'].includes(kind)||caption!==null&&(typeof caption!=='string'||caption.length>4096||caption.includes('\\0')))throw new Error('Neplatný soubor, název nebo popis; fotografie nejvýše5MiB, příloha128MiB.');
            const form=new FormData();form.append('file',file);form.append('kind',kind);if(caption!==null)form.append('caption',caption);
            const {body,response,wire}=await read(`${itemPath(parent)}/media`,signal,{method:'POST',headers:{'If-Match':strongTag(etag)},body:form});
            if(!hasPrivateNoStore(response.headers)||integer(body.catalogId)!==catalogId||integer(body.itemId)!==parent||version(body.itemVersion)!==String(BigInt(etag.slice(1,-1))+1n)||wire.media?.caption!==caption)throw new Error('Invalid private upload receipt');
            const saved=media(body.media,parent);if(saved.name!==file.name||saved.byteSize!==file.size||saved.kind!==kind)throw new Error('Invalid media upload metadata');return {value:saved,etag:tag(response,body.itemVersion)};
        },
        saveMediaCaption:async(parent:number,id:string,etag:string,caption:string|null,signal:AbortSignal)=>{
            if(caption!==null&&(typeof caption!=='string'||caption.length>4096||caption.includes('\\0')))throw new Error('Neplatný popis média.');
            const {body,response,wire}=await read(`${itemPath(parent)}/media/${uuid(id)}/caption`,signal,{method:'PATCH',headers:{'If-Match':strongTag(etag)},body:JSON.stringify({caption})});
            if(!hasPrivateNoStore(response.headers)||integer(body.catalogId)!==catalogId||integer(body.itemId)!==parent||version(body.itemVersion)!==String(BigInt(etag.slice(1,-1))+1n)||wire.media?.caption!==caption)throw new Error('Invalid private caption receipt');
            return {value:media(body.media,parent,id),etag:tag(response,body.itemVersion)};
        },
        media: async (parent: number, signal: AbortSignal, after?: string): Promise<Page<Media, string>> => {
            const { body } = await read(`${itemPath(parent)}/media?limit=50${after ? '&afterId=' + uuid(after) : ''}`, signal);
            if(!Array.isArray(body.items)||body.items.length>50)throw new Error('Invalid media page');
            const items:Media[]=body.items.map((v:any)=>media(v,parent)),next=body.nextAfterId===null?null:uuid(body.nextAfterId);
            if(items.some((v,i)=>v.id<=(after??'')||i>0&&v.id<=items[i-1].id)||next!==null&&(!items.length||next!==items[items.length-1].id))throw new Error('Invalid media cursor');
            return { items, nextAfterId:next };
        },
        references: async (parent:number,signal:AbortSignal) => {
            const {body,response}=await read(`${itemPath(parent)}/references`,signal);
            if(integer(body.catalogId)!==catalogId||integer(body.itemId)!==parent||!Array.isArray(body.items)||body.items.length>200)throw new Error('Foreign or incomplete reference list');
            const seen=new Set<string>();
            const items:Array<{id:string;type:ManagedDictionaryType;parentId:string|null;code:string|null;label:string}>=body.items.map((v:any)=>{
                if(!managedDictionaryTypes.includes(v.type)||seen.has(v.id))throw new Error('Invalid reference');seen.add(v.id);
                return {id:uuid(v.id),type:v.type as ManagedDictionaryType,parentId:v.parentId===null?null:uuid(v.parentId),code:nullable(v.code),label:text(v.label)};
            });
            return {items,etag:tag(response,body.itemVersion)};
        },
        assignReference: async (parent:number,type:ManagedDictionaryType,id:string,etag:string,signal:AbortSignal,remove=false) => {
            if(remove&&import.meta.env.VITE_QA_NO_DELETE==='true')throw new Error('Izolované QA nepovoluje mazání číselníkových vazeb. Vazba nebyla změněna.');
            if(!managedDictionaryTypes.includes(type))throw new Error('Invalid reference type');
            const {body,response}=await read(`${itemPath(parent)}/references/${type}/${uuid(id)}`,signal,
                {method:remove?'DELETE':'PUT',headers:{'If-Match':strongTag(etag)},body:'{}'});
            return {value:item(body,parent),etag:tag(response,body.version)};
        },
        mediaDetail: async (parent: number, id: string, signal: AbortSignal): Promise<Media> => media((await read(`${itemPath(parent)}/media/${uuid(id)}`, signal)).body, parent, id),
        bytes: async (parent: number, entry: Media, variant: 'content' | 'thumbnail', signal: AbortSignal, maxBytes=134217728) => {
            if(!Number.isSafeInteger(maxBytes)||maxBytes<1||maxBytes>134217728)throw new Error('Invalid media byte limit');
            const checked = media(entry, parent, entry.id);
            if (!checked.variants.includes(variant) || (variant === 'thumbnail' && checked.kind !== 'IMAGE')) throw new Error('Variant unavailable');
            const response = await request(`${itemPath(parent)}/media/${uuid(entry.id)}/${variant}`, signal);
            const mime = response.headers.get('Content-Type')?.split(';')[0]; const size = integer(response.headers.get('Content-Length'));
            if (!hasPrivateNoStore(response.headers) || response.headers.get('X-Content-Type-Options') !== 'nosniff'
                || !response.headers.get('Content-Disposition')?.startsWith('attachment;') || !mime || !['image/png','image/jpeg','application/pdf','application/octet-stream'].includes(mime)
                || size > maxBytes || (variant === 'content' && (mime !== entry.mimeType || size !== entry.byteSize)) || (variant === 'thumbnail' && !['image/png','image/jpeg'].includes(mime))) throw new Error('Unsafe media headers');
            const blob = await response.blob(); if (signal.aborted) throw new Error('Request cancelled');
            if (blob.size !== size || blob.type !== mime) throw new Error('Incomplete media'); return blob;
        },
    };
}
type AddedCuratorMethods='inventoryPage'|'sourceChoices'|'curatorRecord'|'saveCuratorRecord'|'curatorMeasurement'|'saveMeasurement'|'createItem'|'creationOutcome'|'itemOrigin'|'createDimensionsBatch'|'sourceSummary'|'sourceDimensions'|'sourceMatTech';
export type ScopedApi = Omit<ReturnType<typeof scopedApi>,AddedCuratorMethods> & Partial<Pick<ReturnType<typeof scopedApi>,AddedCuratorMethods>>;
