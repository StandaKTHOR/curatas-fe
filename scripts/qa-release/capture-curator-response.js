// HUMAN OPERATOR: paste in DevTools Console on the ALREADY authenticated QA page.
// Then click its existing "Načíst znovu" button. No credentials/tokens are read/logged.
// Captures one existing GET response, restores fetch, logs metadata + DTO types ONLY.
(() => {
 const original=window.fetch;
 const types=value=>value===null?'null':Array.isArray(value)?'array':typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,types(v)])):typeof value;
 const num=v=>(typeof v==='number'||typeof v==='string')&&/^[0-9]+$/.test(String(v))&&Number.isSafeInteger(Number(v))?Number(v):NaN;
 const exactJson=raw=>JSON.parse(raw.replace(/"(?:[^"\\]|\\.)*"|-?[0-9]+(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/g,token=>token.startsWith('"')?token:JSON.stringify(token)));
 function auditRows(rows,catalogId){
  if(!Array.isArray(rows))return {checkedItems:0,valid:false,failures:[{field:'items'}]};
  const failures=[],ids=new Set();
  const currentKeys=['authorText','datingText','materialText','techniqueText','objectType','originPlace'];
  const inventoryKeys=['quantity','otherNumber'];
  const sourceKeys=['Predmet_S','Titul_S','Rada_S','PorC_S','Lomeni_S','HPorC_S','StatSpr_S','Spravce_S','Odd_S','Podsb_S','Pocet_S','Ozn_S','JineC_S','Karta_S','Opsana_S','Overena_S','Zapsal_S','DatZap_S','Skupina_S','Urcil_S','DatZm_S','Fond_S'];
  const text=v=>v===null||typeof v==='string';
  const record=(v,keys)=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k)&&text(v[k]));
  rows.forEach((row,index)=>{
   const bad=field=>failures.push({index,field});
   if(!row||typeof row!=='object'){bad('row');return;}
   const item=row.item;
   if(!item||typeof item!=='object'){bad('item');return;}
   const id=num(item.id);
   if(!(id>0))bad('item.id');else if(ids.has(id))bad('duplicate item.id');else ids.add(id);
   if(num(item.catalogId)!==catalogId)bad('item.catalogId');
   if(!['title','inventoryNumber','accessionNumber'].every(k=>text(item[k])))bad('item nullable text');
   const version=String(item.version);
   if(!/^(0|[1-9][0-9]*)$/.test(version)||BigInt(version)>9223372036854775807n)bad('item.version');
   if(!record(row.current,currentKeys)||typeof row.currentPresent!=='boolean')bad('current');
   else if(!row.currentPresent&&Object.values(row.current).some(v=>v!==null))bad('currentPresent');
   if(row.currentInventory!==undefined&&row.currentInventory!==null&&!record(row.currentInventory,inventoryKeys))bad('currentInventory');
   if(!record(row.source,sourceKeys))bad('source');
   if(![true,false,null].includes(row.hasPhoto)||![true,false,null].includes(row.hasAttachment))bad('media presence');
  });
  return {checkedItems:rows.length,valid:failures.length===0,failures};
 }
 window.fetch=async function(...args){
  const response=await original.apply(this,args);
  const request=args[0] instanceof Request?args[0].url:String(args[0]);
  const url=new URL(request,location.href);
  if(url.origin!==location.origin||!url.pathname.endsWith('/curator-page'))return response;
  window.fetch=original;
  try{
   const raw=await response.clone().text(),b=exactJson(raw),parts=url.pathname.split('/');
   const expected={catalogId:Number(parts[parts.indexOf('catalogs')+1]),page:Number(url.searchParams.get('page')??0),pageSize:Number(url.searchParams.get('size')??50),sort:url.searchParams.get('sort')??'inventoryNumber,asc'};
   const cache=response.headers.get('Cache-Control');
   const checks={catalogId:num(b.catalogId)===expected.catalogId,page:num(b.page)===expected.page,pageSize:num(b.pageSize)===expected.pageSize,sort:b.sort===expected.sort,semantics:b.semantics==='CURRENT_ASSERTIONS_AND_SEPARATELY_LABELLED_SOURCE_INVENTORY','Cache-Control exact original check':cache==='no-store',items:Array.isArray(b.items),'totalPages':num(b.totalPages)===Math.ceil(num(b.totalElements)/expected.pageSize),'items.length':Array.isArray(b.items)&&b.items.length===Math.min(expected.pageSize,Math.max(0,num(b.totalElements)-expected.page*expected.pageSize))};
   const wire=JSON.parse(raw);
   console.log(JSON.stringify({httpStatus:response.status,request:{path:url.pathname,expected,filterNames:[...url.searchParams.keys()].filter(k=>!['page','size','sort'].includes(k))},response:{catalogId:b.catalogId,page:b.page,pageSize:b.pageSize,sort:b.sort,semantics:b.semantics,totalElements:b.totalElements,totalPages:b.totalPages,itemCount:Array.isArray(b.items)?b.items.length:null,cacheControl:cache},checks,failed:Object.entries(checks).filter(([,ok])=>!ok).map(([name])=>name),dtoAudit:auditRows(b.items,expected.catalogId),firstItemSchema:Array.isArray(wire.items)&&wire.items.length?types(wire.items[0]):null},null,2));
  }catch(error){console.log('Curator response is not valid JSON; capture HTTP status and content-type manually.',response.status,response.headers.get('Content-Type'));}
  return response;
 };
 window.stopMesQaCapture=()=>{window.fetch=original;delete window.stopMesQaCapture;};
 console.log('One-response QA metadata capture armed. Click Načíst znovu; do not reload the page. stopMesQaCapture() cancels it.');
})();
