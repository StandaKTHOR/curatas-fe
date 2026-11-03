// Actual original React + local-auth + owned PG17. Generated values only; no response mocks.
import {chromium,expect} from '@playwright/test';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const input=JSON.parse(fs.readFileSync(process.argv[2],'utf8')),backend=new URL(input.backend),root=path.resolve(input.frontend);
if(backend.hostname!=='127.0.0.1'||backend.protocol!=='http:'||['8082','8084','5432','5547'].includes(backend.port)||input.port!==18213)throw Error('Owned generated infrastructure required');
const server=http.createServer((req,res)=>{
 if(req.url.startsWith('/api/')){const remote=http.request(new URL(req.url,backend),{method:req.method,headers:{...req.headers,host:backend.host}},r=>{res.writeHead(r.statusCode,r.headers);r.pipe(res);});remote.on('error',()=>{res.writeHead(502);res.end();});req.pipe(remote);return;}
 const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(400);res.end();return;}
 const target=fs.existsSync(file)&&fs.statSync(file).isFile()?file:path.join(root,'index.html');
 res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.woff2':'font/woff2','.png':'image/png'})[path.extname(target)]??'application/octet-stream');fs.createReadStream(target).pipe(res);
});
let browser,page;const checks=[],errors=[],requests=[];
try{
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(input.port,'127.0.0.1',resolve);});
 browser=await chromium.launch({headless:true});const context=await browser.newContext({viewport:{width:1366,height:900}});
 await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 page=await context.newPage();page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{const url=new URL(r.url());if(url.pathname.startsWith('/api/'))requests.push({path:url.pathname,method:r.request().method(),status:r.status()});});
 const base=`http://127.0.0.1:${input.port}`;
 async function login(username){await page.goto(base+'/login');await page.locator('input[type="text"]').fill(username);await page.locator('input[type="password"]').fill(input.password);await page.getByRole('button',{name:'Autorizovaný vstup'}).click();await page.getByLabel('Katalog',{exact:true}).selectOption('1');}
 await login(input.username);checks.push({name:'actual-local-auth-login-and-catalog',pass:true});
 await page.getByRole('button',{name:'Nový předmět',exact:true}).click();await page.waitForURL('**/admin/items/new?catalog=1');
 await page.getByRole('button',{name:'Uložit',exact:true}).click();await page.getByText('Inventární číslo je povinné.',{exact:true}).first().waitFor();
 await page.getByLabel('Inventární číslo: Prefix',{exact:true}).fill('GEN-');await page.getByLabel('Inventární číslo: Hlavní číslo',{exact:true}).fill('00042');await page.getByLabel('Inventární číslo: Postfix',{exact:true}).fill('/Ž');
 await page.locator('#title').fill('GENERATED original-form item');
 let refused=false;page.once('dialog',async d=>{refused=true;await d.dismiss();});await page.getByRole('button',{name:'← Zpět na seznam',exact:true}).click();
 await page.waitForTimeout(150);if(!refused||!page.url().includes('/new?'))throw Error('Unsaved create draft was not protected');checks.push({name:'unsaved-original-form-draft-preserved',pass:true});
 await page.getByRole('button',{name:'Uložit',exact:true}).dblclick();await page.waitForURL(/\/admin\/items\/view\/[0-9]+\?catalog=1/);
 await page.getByRole('status').filter({hasText:'Předmět byl založen'}).waitFor();
 const id=Number(new URL(page.url()).pathname.split('/').pop());if(!Number.isSafeInteger(id))throw Error('New scoped item identity absent');
 await expect(page.locator('#title')).toHaveValue('GENERATED original-form item');
 await page.getByRole('definition').filter({hasText:'local:GEN_1'}).waitFor();
 if(!await page.locator('time[datetime]').first().getAttribute('datetime'))throw Error('Creation timestamp absent');
 checks.push({name:'original-form-scoped-create-detail-author-time',pass:true});
 await page.reload();await expect(page.locator('#title')).toHaveValue('GENERATED original-form item');
 if(await page.locator('#inventoryNumber').inputValue()!=='GEN-00042/Ž'||await page.locator('#accessionNumber').inputValue()!=='')throw Error('Inventory or optional accession changed');checks.push({name:'reload-inventory-and-null-accession',pass:true});
 if(requests.filter(r=>r.method==='POST'&&r.path==='/api/v2/catalogs/1/items').length!==1)throw Error('Duplicate browser creation submission');checks.push({name:'double-click-one-submit',pass:true});
 if(await page.getByRole('navigation',{name:'Karty DEMUS'}).getByRole('button').count()!==20)throw Error('Original tabs changed');
 await page.screenshot({path:input.output+'/generated-created-card.png',fullPage:true});
 await page.getByRole('button',{name:'Odhlásit se',exact:true}).click();await login('gen-reader');
 if(await page.getByRole('button',{name:'Nový předmět',exact:true}).isEnabled())throw Error('Reader can create');
 await page.goto(base+'/admin/items/new?catalog=1');if(await page.getByRole('button',{name:'Uložit',exact:true}).isEnabled())throw Error('Direct route bypasses create permission');checks.push({name:'reader-and-direct-route-read-only',pass:true});
 if(errors.length)throw Error('JavaScript page errors');
 fs.writeFileSync(input.output+'/browser-result.json',JSON.stringify({status:'PASS',data:'GENERATED_ONLY_NOT_POLAKOVA',itemId:id,checks,errors,requests},null,2));
}catch(e){if(page){fs.writeFileSync(input.output+'/failure-dom.txt',await page.locator('body').innerText());await page.screenshot({path:input.output+'/failure.png',fullPage:true});}fs.writeFileSync(input.output+'/browser-result.json',JSON.stringify({status:'FAIL',data:'GENERATED_ONLY_NOT_POLAKOVA',checks,errors,requests,failure:e.message},null,2));throw e;}
finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
