// Port of the historical missing harness to the ORIGINAL UAT UI, generated infrastructure only.
// Dimension batch and item identity PATCH are explicitly browser-issued API checks, not UI editor claims.
import {chromium,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
const input=JSON.parse(fs.readFileSync(process.argv[2],'utf8')),output=path.resolve(process.argv[3]),backend=new URL(input.backend),root=path.resolve('dist-generated');
if(backend.hostname!=='127.0.0.1'||backend.protocol!=='http:'||['8082','8084','5432','5547'].includes(backend.port)||!output.includes(path.sep+'evidence'+path.sep))throw Error('Owned generated fixture required');
const server=http.createServer((req,res)=>{
 if(req.url.startsWith('/api/')){const p=http.request(new URL(req.url,backend),{method:req.method,headers:{...req.headers,host:backend.host}},r=>{res.writeHead(r.statusCode,r.headers);r.pipe(res);});p.on('error',()=>{res.writeHead(502);res.end();});req.pipe(p);return;}
 const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(400);res.end();return;}
 const target=fs.existsSync(file)&&fs.statSync(file).isFile()?file:path.join(root,'index.html');res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.woff2':'font/woff2'})[path.extname(target)]??'application/octet-stream');fs.createReadStream(target).pipe(res);
});
let browser,page;const scenarios=[],errors=[];const check=name=>scenarios.push({name,pass:true});
try{
 await new Promise((yes,no)=>{server.once('error',no);server.listen(18183,'127.0.0.1',yes);});browser=await chromium.launch({headless:true});const context=await browser.newContext();await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 page=await context.newPage();page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));const base='http://127.0.0.1:18183';
 await page.goto(base+'/login');await page.locator('input[type=text]').fill(input.username);await page.locator('input[type=password]').fill(input.password);await page.getByRole('button',{name:'Autorizovaný vstup'}).click();await page.getByLabel('Katalog',{exact:true}).selectOption('11');check('original-form-real-generated-login');
 await page.getByRole('button',{name:'Nový předmět',exact:true}).click();await page.waitForURL('**/admin/items/new?catalog=11');check('authorized-original-new-item-control');
 await page.getByRole('button',{name:'Uložit',exact:true}).click();await page.getByText('Inventární číslo je povinné.',{exact:true}).first().waitFor();check('original-required-inventory-validation');
 await page.getByLabel('Inventární číslo: Hlavní číslo',{exact:true}).fill('SYNTH-BROWSER-0001');await page.locator('#title').fill('  MES BROWSER Ω  ');await page.locator('#accessionNumber').fill('SYNTH-BROWSER-CREATE');
 await page.getByRole('button',{name:'Uložit',exact:true}).dblclick();await page.waitForURL(/\/admin\/items\/view\/\d+\?catalog=11/);const id=Number(new URL(page.url()).pathname.split('/').pop());await expect(page.locator('#title')).toHaveValue('  MES BROWSER Ω  ');check('original-form-create-scoped-detail');
 await page.reload();await expect(page.locator('#inventoryNumber')).toHaveValue('SYNTH-BROWSER-0001');check('direct-detail-reload-resolves-catalog-before-render');
 const api=async(method,url,body,tag,token)=>page.evaluate(async x=>{const r=await fetch(x.url,{method:x.method,cache:'no-store',credentials:'omit',headers:{Authorization:'Bearer '+(x.token??localStorage.getItem('token')),...(x.body===undefined?{}:{'Content-Type':'application/json'}),...(x.tag?{'If-Match':x.tag}:{}),...(x.method==='POST'&&x.url.endsWith('/items')?{'Idempotency-Key':crypto.randomUUID()}: {})},...(x.body===undefined?{}:{body:JSON.stringify(x.body)})});const raw=await r.text();let body;try{body=JSON.parse(raw);}catch{body=null;}return {status:r.status,tag:r.headers.get('etag'),body};},{method,url,body,tag,token});
 const item='/api/v2/catalogs/11/items/'+id;
 let r=await api('PATCH',item,{title:'DENIED'},'"99"');if(r.status!==412)throw Error('Stale item PATCH accepted');check('browser-API-stale-CAS-denied');
 r=await api('PATCH',item,{title:'  MES BROWSER EDITED Ω  ',inventoryNumber:'SYNTH-BROWSER-0001'},'"0"');if(r.status!==200)throw Error('Generated API identity PATCH failed');check('browser-API-title-edit-no-claim-of-original-title-editor');
 r=await api('GET',item);if(r.body.title!=='  MES BROWSER EDITED Ω  ')throw Error('Edited title lost');check('API-edit-read-after-write');
 const dimensions=[{type:'GENERATED height',value:1.25,unit:'mm'},{type:'GENERATED width',value:2.5,unit:null}];
 r=await api('POST',item+'/dimensions/batch',{dimensions:[dimensions[0],{type:'INVALID',value:1.234,unit:null}]},'"1"');if(r.status!==422)throw Error('Invalid dimension batch accepted');check('browser-API-dimension-batch-validation');
 r=await api('GET',item+'/dimensions');if(r.body.items.length!==0)throw Error('Partial invalid batch persisted');check('invalid-batch-atomic-no-partial-rows');
 r=await api('POST',item+'/dimensions/batch',{dimensions},'"1"');if(r.status!==201||r.body.dimensions.length!==2)throw Error('Dimension batch failed');check('browser-API-dimension-batch-not-original-form-write');
 r=await api('GET',item+'/dimensions');if(r.body.items.length!==2)throw Error('Dimension batch reload lost rows');check('dimension-read-after-write');
 r=await api('POST','/api/v2/catalogs/11/items',{title:'GENERATED create-only',inventoryNumber:'SYNTH-CREATE-ONLY-BROWSER',accessionNumber:null},null,input.createOnlyToken);if(r.status!==201)throw Error('Create-only failed');const only=r.body.item.id;check('create-only-capability-creates-independent-item');
 r=await api('PATCH','/api/v2/catalogs/11/items/'+only,{title:'DENIED'},'"0"',input.createOnlyToken);if(r.status!==403)throw Error('Creation implied edit permission');check('create-only-never-implies-edit');
 fs.writeFileSync(path.join(output,'revoke.request'),'GENERATED_ONLY');for(let n=0;n<100&&!fs.existsSync(path.join(output,'revoke.done'));n++)await new Promise(r=>setTimeout(r,100));if(!fs.existsSync(path.join(output,'revoke.done')))throw Error('Generated grant revocation not committed');
 r=await api('POST','/api/v2/catalogs/11/items',{title:'DENIED',inventoryNumber:'DENIED',accessionNumber:null},null,input.createOnlyToken);if(r.status!==403)throw Error('Revoked create grant still active');check('committed-capability-revocation-enforced');
 await page.reload();await expect(page.locator('#title')).toHaveValue('  MES BROWSER EDITED Ω  ');await expect(page.getByRole('navigation',{name:'Karty DEMUS'}).getByRole('button')).toHaveCount(20);check('original-detail-reload-and-20-tabs-retained');
 if(errors.length)throw Error('JavaScript error');check('no-JavaScript-page-errors');fs.writeFileSync(path.join(output,'result.json'),JSON.stringify({status:'PASS',data:'GENERATED_ONLY_NOT_POLAKOVA',scenarios,errors},null,2));
}catch(e){if(page){fs.writeFileSync(path.join(output,'failure-dom.txt'),await page.locator('body').innerText());await page.screenshot({path:path.join(output,'failure.png'),fullPage:true});}fs.writeFileSync(path.join(output,'result.json'),JSON.stringify({status:'FAIL',data:'GENERATED_ONLY_NOT_POLAKOVA',scenarios,errors,failure:e.message},null,2));throw e;}
finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
