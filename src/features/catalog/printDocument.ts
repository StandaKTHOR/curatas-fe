export const printColumns:Record<string,string>={inventoryNumber:'Inventární číslo',accessionNumber:'Přírůstkové číslo',title:'Titul / předmět',author:'Autor',fund:'Fond',subCollection:'Podsbírka',objectCondition:'Fyzický stav',datingText:'Datace',material:'Materiál',technique:'Technika',description:'Popis'};
export type PrintVariant='list'|'a5'|'two-a5';
export async function printImages<T extends {kind:string}>(load:(after?:string)=>Promise<{items:T[];nextAfterId:string|null}>):Promise<T[]>{
 let after:string|undefined;const seen=new Set<string>(),images:T[]=[];
 for(let page=0;page<20;page++){
  const value=await load(after);images.push(...value.items.filter(entry=>entry.kind==='IMAGE'));
  if(images.length>20)throw new Error('Více než 20 fotografií na předmět; tisk nebyl zkrácen. Vyberte jednu fotografii nebo tisk bez fotografie.');
  if(value.nextAfterId===null)return images;
  if(!value.nextAfterId||seen.has(value.nextAfterId))throw new Error('Neplatné stránkování fotografií; tisk nebyl dokončen.');
  seen.add(value.nextAfterId);after=value.nextAfterId;
 }
 throw new Error('Hledání fotografií přesahuje 1000 příloh na předmět; tisk nebyl dokončen.');
}
/** Find the first image across bounded metadata pages; never silently ignore later pages. */
export async function firstPrintImage<T extends {kind:string}>(load:(after?:string)=>Promise<{items:T[];nextAfterId:string|null}>):Promise<T|undefined>{
 let after:string|undefined;const seen=new Set<string>();
 for(let page=0;page<20;page++){
  const value=await load(after),image=value.items.find(entry=>entry.kind==='IMAGE');if(image)return image;
  if(value.nextAfterId===null)return undefined;
  if(!value.nextAfterId||seen.has(value.nextAfterId))throw new Error('Neplatné stránkování fotografií; tisk nebyl dokončen.');
  seen.add(value.nextAfterId);after=value.nextAfterId;
 }
 throw new Error('Hledání fotografie přesahuje limit 1000 příloh na předmět; zúžte tisk nebo vyberte variantu bez fotografie.');
}
export const escapePrint=(v:unknown)=>String(v??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
function value(row:Record<string,any>,key:string){
 const current=row[key];if(current!==undefined&&current!==null&&String(current).trim())return current;
 if(key==='title'&&typeof row.objectType==='string'&&row.objectType.trim())return row.objectType;
 const historical:Record<string,string>={title:'Predmet_S',fund:'Fond_S',subCollection:'Podsb_S'};const source=row.sourceInventory?.[historical[key]];return source===null||source===undefined?'—':String(source);
}
/** Private local HTML; values are escaped, no scripts, external requests or public media URLs. */
export function printDocument(rows:Record<string,any>[],columns:string[],variant:PrintVariant,photos:Record<number,string|string[]>={}){
 if(!rows.length||rows.length>10000||!columns.length||new Set(columns).size!==columns.length||columns.some(k=>!Object.hasOwn(printColumns,k))||!['list','a5','two-a5'].includes(variant))throw new Error('Neplatný rozsah nebo varianta tisku.');
 const images=(id:number)=>{const value=photos[id],entries=value===undefined?[]:Array.isArray(value)?value:[value];if(entries.length>20||entries.some(v=>!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(v)))throw new Error('Neplatné fotografie; tisk nebyl dokončen.');return entries.map(v=>`<img alt="Fotografie předmětu" src="${v}">`).join('');};
 const hasPhotos=Object.keys(photos).length>0;
 const table=(items:typeof rows)=>`<table><thead><tr>${columns.map(k=>`<th>${escapePrint(printColumns[k])}</th>`).join('')}${hasPhotos?'<th>Fotografie</th>':''}</tr></thead><tbody>${items.map(r=>`<tr>${columns.map(k=>`<td>${escapePrint(value(r,k))}</td>`).join('')}${hasPhotos?`<td>${images(r.id)}</td>`:''}</tr>`).join('')}</tbody></table>`;
 const body=variant==='list'?table(rows):rows.map(r=>`<article><h2>Technická evidenční karta — odborně neschválený vzor</h2><p>${escapePrint(r.inventoryNumber)}</p>${images(r.id)}<dl>${columns.map(k=>`<dt>${escapePrint(printColumns[k])}</dt><dd>${escapePrint(value(r,k))}</dd>`).join('')}</dl></article>`).join('');
 const result=`<!doctype html><html lang="cs"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'"><title>MES — tiskový výstup</title><style>@page{size:${variant==='a5'?'A5 landscape':variant==='two-a5'?'A4 portrait':'A4 landscape'};margin:${variant==='list'?'10mm':'0'}}*{box-sizing:border-box}body{font:10pt sans-serif;margin:0;color:#000;background:#fff}table{width:100%;border-collapse:collapse}th,td{border:1px solid #444;padding:2mm;text-align:left;white-space:pre-wrap;overflow-wrap:anywhere}thead{display:table-header-group}article{min-height:148mm;width:210mm;padding:6mm;border-bottom:1px solid #888;break-inside:avoid}article:nth-child(${variant==='two-a5'?'2n':'n'}){break-after:page}h2{font-size:11pt}dl{margin:0}dt{font-weight:bold}dd{margin:0 0 2mm;white-space:pre-wrap;overflow-wrap:anywhere}img{float:right;max-width:60mm;max-height:70mm}p{white-space:pre-wrap}</style></head><body>${body}</body></html>`;
 if(result.length>20*1024*1024)throw new Error('Tisk přesahuje bezpečný limit 20 MiB; zúžte výběr.');return result;
}
export function downloadPrint(html:string){const url=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='mes-tisk.html';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
