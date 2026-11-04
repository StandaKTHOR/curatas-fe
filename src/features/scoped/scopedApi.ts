import {hasPrivateNoStore} from '../../lib/privateResponsePolicy';
import {validateCuratorPage} from './curatorPageContract';
import { effectiveToken, localAuthEnabled } from '../localAuth/localAuthClient';
import { resolveApiUrl } from '../../lib/api';
import {curatorQuery,curatorCurrentFields,curatorCurrentInventoryFields} from './curatorContract';

export interface Item { id: number; catalogId: number; title: string | null; inventoryNumber: string | null; accessionNumber: string | null; version: string; sourceInventory?:Record<string,string|null> }
export interface MuseumHistoryRow {id:number;eventType:'REVISION'|'RESTORATION'|'LOAN';eventDate:string|null;description:string|null}
export type CuratorSection='inventory'|'professional'|'inventory-range'|'authorities'|'reference'|'manipulation'|'action'|'iso';
export const curatorSectionFields:Record<CuratorSection,readonly string[]>={inventory:['quantity','otherNumber'],'inventory-range':['lowerNumber','upperNumber','seriesRecordId'],professional:['objectType','description','authorText','datingText','originPlace','materialText','techniqueText','materialNote'],authorities:['determinedByText','authorRoleText','groupRecordId','fundRecordId','collectionRecordId','departmentRecordId','objectTypeRecordId'],reference:['Ref_RF','Str_RF'],manipulation:['Typ_MN','DatMan_MN','Kdo_MN','Stav_MN','Osetreni_MN','InvRev_MN','PopisSt_MN'],action:['Poradi_AK','Prezentace_AK','Revers_AK','CKtlg_AK','Pozn_AK'],iso:['KodISO_SO','CharISO_SO','MatISO_SO','CenaISO_SO','MenaISO_SO','PovrchISO_SO','TvarISO_SO']};
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
export interface Dimension { id: number; itemId: number; catalogId: number; type: string; value: string | null; unit: string | null; createdInScopedApi: boolean }
export interface Media { id: string; itemId: number; catalogId: number; kind: 'IMAGE' | 'ATTACHMENT'; name: string; mimeType: string; byteSize: number; variants: ('content' | 'thumbnail')[] }
export interface DictionaryValue {id:string;catalogId:number;type:string;label:string;code:string|null;parentId:string|null;version:string}
export interface Versioned<T> { value: T; etag: string }
export interface NewItemFields {title:string;inventoryNumber:string;accessionNumber:string|null}
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
            headers: { Authorization: `Bearer ${effectiveToken(token)}`, ...(localAuthEnabled()?{'X-CURATAS-CSRF':'1'}:{}), ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers } });
        if (signal.aborted) throw new Error('Request cancelled');
        if (!response.ok) {if([401,403,404].includes(response.status))window.dispatchEvent(new CustomEvent('curatas:scoped-denied',{detail:{status:response.status}})); throw new ScopedError(response.status);} return response;
    }
    async function read(path: string, signal: AbortSignal, init?: RequestInit) {
        const response = await request(path, signal, init); const body = exactJson(await response.text());
        if (signal.aborted) throw new Error('Request cancelled'); return { body, response };
    }
    function item(v: any, id?: number): Item {
        if (integer(v.catalogId) !== catalogId || (id !== undefined && integer(v.id) !== id)) throw new Error('Foreign item response');
        return { id: integer(v.id), catalogId, title: nullable(v.title), inventoryNumber: nullable(v.inventoryNumber), accessionNumber: nullable(v.accessionNumber), version: version(v.version) };
    }
    function dimension(v: any, parent: number, id?: number): Dimension {
        if (integer(v.catalogId) !== catalogId || integer(v.itemId) !== parent || (id !== undefined && integer(v.id) !== id) || typeof v.createdInScopedApi !== 'boolean') throw new Error('Foreign dimension response');
        if (v.value !== null) decimal(text(v.value));
        return { id: integer(v.id), catalogId, itemId: parent, type: text(v.type), value: nullable(v.value), unit: nullable(v.unit), createdInScopedApi: v.createdInScopedApi };
    }
    function media(v: any, parent: number, id?: string): Media {
        if (integer(v.catalogId) !== catalogId || integer(v.itemId) !== parent || (id !== undefined && uuid(v.id) !== id) || !['IMAGE', 'ATTACHMENT'].includes(v.kind)
            || !/^[A-Za-z0-9][A-Za-z0-9._ -]{0,119}$/.test(v.name) || !['image/png','image/jpeg','application/pdf','application/octet-stream'].includes(v.mimeType)
            || (v.kind === 'IMAGE' && !['image/png','image/jpeg'].includes(v.mimeType)) || !Array.isArray(v.variants) || !v.variants.includes('content') || v.variants.some((x: string) => !['content','thumbnail'].includes(x))
            || (v.variants.includes('thumbnail') && v.kind !== 'IMAGE')) throw new Error('Invalid media response');
        const size = integer(v.byteSize); if (size > 134217728) throw new Error('Media too large');
        return { id: uuid(v.id), catalogId, itemId: parent, kind: v.kind, name: v.name, mimeType: v.mimeType, byteSize: size, variants: [...v.variants] };
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
    return {
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
        dictionaryMetadata:async(type:'MATERIAL'|'TECHNIQUE',signal:AbortSignal)=>{
            const {body,response}=await read(`${base}/dictionaries/${type}`,signal);
            if(body.type!==type||body.ownership!=='CATALOG_CREATED_ONLY'||body.parentSupport!=='EXPLICIT_SAME_TYPE'||!Array.isArray(body.operations)||!body.operations.includes('read')||!hasPrivateNoStore(response.headers))throw new Error('Unsupported dictionary contract');
            return body;
        },
        dictionaryValues:async(type:'MATERIAL'|'TECHNIQUE',signal:AbortSignal,after?:string):Promise<Page<DictionaryValue,string>>=>{
            const {body,response}=await read(`${base}/dictionaries/${type}/values?limit=100${after?'&afterId='+uuid(after):''}`,signal);
            if(!Array.isArray(body.items)||body.items.length>100||!hasPrivateNoStore(response.headers))throw new Error('Invalid dictionary page');
            const items:DictionaryValue[]=body.items.map((v:any)=>{if(integer(v.catalogId)!==catalogId||v.type!==type)throw new Error('Foreign dictionary value');return {id:uuid(v.id),catalogId,type,label:text(v.label),code:nullable(v.code),parentId:v.parentId===null?null:uuid(v.parentId),version:version(v.version)};});
            if(items.some((v,i)=>v.id<=(after??'')||i>0&&v.id<=items[i-1].id))throw new Error('Unordered dictionary page');
            const next=body.nextAfterId===null?null:uuid(body.nextAfterId);if(next!==null&&(!items.length||next!==items[items.length-1].id))throw new Error('Invalid dictionary cursor');
            return {items,nextAfterId:next};
        },
        curatorPage:async(page:number,size:number,sort:string,filters:Record<string,unknown>,signal:AbortSignal)=>{
            const query=curatorQuery(page,size,sort,filters);
            const {body,response}=await read(`${root}/curator-page?${query}`,signal);
            const {totalElements,totalPages}=validateCuratorPage(body,response.headers,{catalogId,page,pageSize:size,sort});
            const items:{item:Item;current:Record<string,string|null>;currentPresent:boolean;currentInventory:Record<string,string|null>;source:Record<string,string|null>;hasPhoto:boolean|null;hasAttachment:boolean|null}[]=body.items.map((row:any)=>{
                const current:Record<string,string|null>={};
                if(!row.current||Object.keys(row.current).length!==curatorCurrentFields.length||Object.keys(row.current).some(k=>!curatorCurrentFields.includes(k as typeof curatorCurrentFields[number]))||typeof row.currentPresent!=='boolean')throw new Error('Invalid current projection');
                for(const key of curatorCurrentFields)current[key]=nullable(row.current[key]);
                if(!row.currentPresent&&Object.values(current).some(v=>v!==null))throw new Error('Invalid current assertion state');
                if(![true,false,null].includes(row.hasPhoto)||![true,false,null].includes(row.hasAttachment))throw new Error('Invalid media presence');
                const currentInventory:Record<string,string|null>={quantity:null,otherNumber:null};if(row.currentInventory!==undefined&&row.currentInventory!==null){if(typeof row.currentInventory!=='object'||Array.isArray(row.currentInventory)||Object.keys(row.currentInventory).length!==curatorCurrentInventoryFields.length||Object.keys(row.currentInventory).some(k=>!curatorCurrentInventoryFields.includes(k as typeof curatorCurrentInventoryFields[number])))throw new Error('Invalid current inventory projection');for(const key of curatorCurrentInventoryFields)currentInventory[key]=nullable(row.currentInventory[key]);}return {item:item(row.item),current,currentPresent:row.currentPresent,currentInventory,source:sourceInventory(row.source),hasPhoto:row.hasPhoto as boolean|null,hasAttachment:row.hasAttachment as boolean|null};
            });
            if(new Set(items.map(row=>row.item.id)).size!==items.length)throw new Error('Duplicate curator identity');
            return {items,totalElements,totalPages,page,pageSize:size,hasMore:page+1<totalPages};
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
            if(Object.keys(input).length!==3||Object.keys(input).some(k=>!['title','inventoryNumber','accessionNumber'].includes(k)))throw new Error('Invalid creation fields');
            for(const key of ['title','inventoryNumber','accessionNumber'] as const){const value=input[key];if(key==='accessionNumber'&&value===null)continue;if(typeof value!=='string'||!value.trim()||value.length>(key==='title'?4096:255)||value.includes('\0'))throw new Error('Invalid creation field');}
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
            const items:Array<{id:string;type:'MATERIAL'|'TECHNIQUE';parentId:string|null;code:string|null;label:string}>=body.items.map((v:any)=>{
                if(!['MATERIAL','TECHNIQUE'].includes(v.type)||seen.has(v.id))throw new Error('Invalid reference');seen.add(v.id);
                return {id:uuid(v.id),type:v.type as 'MATERIAL'|'TECHNIQUE',parentId:v.parentId===null?null:uuid(v.parentId),code:nullable(v.code),label:text(v.label)};
            });
            return {items,etag:tag(response,body.itemVersion)};
        },
        assignReference: async (parent:number,type:'MATERIAL'|'TECHNIQUE',id:string,etag:string,signal:AbortSignal,remove=false) => {
            if(remove&&import.meta.env.VITE_QA_NO_DELETE==='true')throw new Error('Izolované QA nepovoluje mazání číselníkových vazeb. Vazba nebyla změněna.');
            if(!['MATERIAL','TECHNIQUE'].includes(type))throw new Error('Invalid reference type');
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
