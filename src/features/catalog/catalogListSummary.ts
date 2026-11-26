import type {CatalogSummary} from '../scoped/scopedApi';
/** Read-only catalog presentation; never used for edits, exports or authority creation. */
export function catalogCell(item:{catalogSummary?:CatalogSummary;[key:string]:unknown},field:keyof CatalogSummary):string {
 const entries=item.catalogSummary?.[field];
 if(entries!==undefined)return entries.length?entries.map(v=>v.value).join(' · '):'—';
 const current=item[field];return typeof current==='string'&&current?current:'—';
}
