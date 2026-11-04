// HUMAN OPERATOR: paste in DevTools Console on the ALREADY authenticated QA page.
// Then click its existing "Načíst znovu" button. No credentials/tokens are read/logged.
// Captures one existing GET response, restores fetch, logs metadata + DTO types ONLY.
(() => {
 const original=window.fetch;
 const types=value=>value===null?'null':Array.isArray(value)?'array':typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,types(v)])):typeof value;
 const num=v=>(typeof v==='number'||typeof v==='string')&&/^[0-9]+$/.test(String(v))&&Number.isSafeInteger(Number(v))?Number(v):NaN;
 window.fetch=async function(...args){
  const response=await original.apply(this,args);
  const request=args[0] instanceof Request?args[0].url:String(args[0]);
  const url=new URL(request,location.href);
  if(url.origin!==location.origin||!url.pathname.endsWith('/curator-page'))return response;
  window.fetch=original;
  try{
   const b=await response.clone().json(),parts=url.pathname.split('/');
   const expected={catalogId:Number(parts[parts.indexOf('catalogs')+1]),page:Number(url.searchParams.get('page')??0),pageSize:Number(url.searchParams.get('size')??50),sort:url.searchParams.get('sort')??'inventoryNumber,asc'};
   const cache=response.headers.get('Cache-Control');
   const checks={catalogId:num(b.catalogId)===expected.catalogId,page:num(b.page)===expected.page,pageSize:num(b.pageSize)===expected.pageSize,sort:b.sort===expected.sort,semantics:b.semantics==='CURRENT_ASSERTIONS_AND_SEPARATELY_LABELLED_SOURCE_INVENTORY','Cache-Control exact original check':cache==='no-store',items:Array.isArray(b.items),'totalPages':num(b.totalPages)===Math.ceil(num(b.totalElements)/expected.pageSize),'items.length':Array.isArray(b.items)&&b.items.length===Math.min(expected.pageSize,Math.max(0,num(b.totalElements)-expected.page*expected.pageSize))};
   console.log(JSON.stringify({httpStatus:response.status,request:{path:url.pathname,expected,filterNames:[...url.searchParams.keys()].filter(k=>!['page','size','sort'].includes(k))},response:{catalogId:b.catalogId,page:b.page,pageSize:b.pageSize,sort:b.sort,semantics:b.semantics,totalElements:b.totalElements,totalPages:b.totalPages,itemCount:Array.isArray(b.items)?b.items.length:null,cacheControl:cache},checks,failed:Object.entries(checks).filter(([,ok])=>!ok).map(([name])=>name),firstItemSchema:Array.isArray(b.items)&&b.items.length?types(b.items[0]):null},null,2));
  }catch(error){console.log('Curator response is not valid JSON; capture HTTP status and content-type manually.',response.status,response.headers.get('Content-Type'));}
  return response;
 };
 window.stopMesQaCapture=()=>{window.fetch=original;delete window.stopMesQaCapture;};
 console.log('One-response QA metadata capture armed. Click Načíst znovu; do not reload the page. stopMesQaCapture() cancels it.');
})();
