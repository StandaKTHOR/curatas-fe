import {hasPrivateNoStore} from '../../lib/privateResponsePolicy';
export const curatorPageSemantics = 'CURRENT_ASSERTIONS_AND_SEPARATELY_LABELLED_SOURCE_INVENTORY';
export class CuratorPageContractError extends Error {
    constructor(public field:string, public expected:unknown, public received:unknown, totals=false) {
        super(`${totals?'Invalid curator totals':'Invalid curator page'}: ${field}. Odpověď API neodpovídá požadavku; data nebyla nahrazena prázdným seznamem.`);
        this.name='CuratorPageContractError';
    }
}
const number = (value:unknown) => (typeof value==='number'||typeof value==='string')&&/^[0-9]+$/.test(String(value))&&Number.isSafeInteger(Number(value)) ? Number(value) : NaN;
/** Metadata only in diagnostics: never include item data, credentials or tokens. */
export function validateCuratorPage(body:any,headers:Headers,expected:{catalogId:number;page:number;pageSize:number;sort:string}) {
    if (!body || typeof body!=='object' || Array.isArray(body)) throw new CuratorPageContractError('body','object',typeof body);
    for(const field of ['catalogId','page','pageSize'] as const) {
        if(number(body[field])!==expected[field]) throw new CuratorPageContractError(field,expected[field],body[field]);
    }
    if(body.sort!==expected.sort) throw new CuratorPageContractError('sort',expected.sort,body.sort);
    if(body.semantics!==curatorPageSemantics) throw new CuratorPageContractError('semantics',curatorPageSemantics,body.semantics);
    if(!hasPrivateNoStore(headers)) throw new CuratorPageContractError('Cache-Control','no-store directive without public caching',headers.get('Cache-Control'));
    if(!Array.isArray(body.items)) throw new CuratorPageContractError('items','array',typeof body.items);
    const totalElements=number(body.totalElements),totalPages=number(body.totalPages);
    if(!Number.isSafeInteger(totalElements)||totalElements<0) throw new CuratorPageContractError('totalElements','nonnegative safe integer',body.totalElements,true);
    if(!Number.isSafeInteger(totalPages)||totalPages!==Math.ceil(totalElements/expected.pageSize)) throw new CuratorPageContractError('totalPages',Math.ceil(totalElements/expected.pageSize),body.totalPages,true);
    const length=Math.min(expected.pageSize,Math.max(0,totalElements-expected.page*expected.pageSize));
    if(body.items.length!==length) throw new CuratorPageContractError('items.length',length,body.items.length,true);
    return {totalElements,totalPages};
}
