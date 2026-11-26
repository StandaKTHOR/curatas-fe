// Actual original React + local-auth + owned PG17. Generated values only; no response mocks.
import {chromium,expect} from '@playwright/test';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const input=JSON.parse(fs.readFileSync(process.argv[2],'utf8')),backend=new URL(input.backend),root=path.resolve(input.frontend);
if(backend.hostname!=='127.0.0.1'||backend.protocol!=='http:'||['8082','8084','5432','5547'].includes(backend.port)||input.port!==18213)throw Error('Owned generated infrastructure required');
const server=http.createServer((req,res)=>{
 if(req.url.startsWith('/api/')){const remote=http.request(new URL(req.url,backend),{method:req.method,headers:{...req.headers,host:backend.host}},r=>{const headers={...r.headers};if(req.url.split('?')[0].endsWith('/curator-page'))headers['cache-control']=[String(r.headers['cache-control']??''),'no-store'];res.writeHead(r.statusCode,headers);r.pipe(res);});remote.on('error',()=>{res.writeHead(502);res.end();});req.pipe(remote);return;}
 const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(400);res.end();return;}
 const target=fs.existsSync(file)&&fs.statSync(file).isFile()?file:path.join(root,'index.html');
 res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.woff2':'font/woff2','.png':'image/png'})[path.extname(target)]??'application/octet-stream');fs.createReadStream(target).pipe(res);
});
let browser,page,legacyMediaDownloadsVerified=false,initialAcquisition=null;const checks=[],errors=[],requests=[];
try{
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(input.port,'127.0.0.1',resolve);});
 browser=await chromium.launch({channel:'chrome',headless:true});const context=await browser.newContext({viewport:{width:1366,height:900}});
 await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 page=await context.newPage();page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{const url=new URL(r.url());if(url.pathname.startsWith('/api/'))requests.push({path:url.pathname,method:r.request().method(),status:r.status(),cacheControl:r.headers()['cache-control']});});
 const base=`http://127.0.0.1:${input.port}`;
 async function login(username){await page.goto(base+'/login');await page.locator('input[type="text"]').fill(username);await page.locator('input[type="password"]').fill(input.password);await page.getByRole('button',{name:'Autorizovaný vstup'}).click();await page.getByLabel('Katalog',{exact:true}).selectOption('1');}
 await login(input.username);
 await page.goto(base+'/admin/items/view/'+input.source+'?catalog=1');
 await expect(page.getByRole('complementary',{name:'Permanentní identifikace předmětu'}).getByText(input.sourceTitle,{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'📋 Klonovat',exact:true}).click();
 await page.locator('input#cloneTitle, #cloneTitle input').fill(input.title);
 await page.locator('input#targetInv, #targetInv input').fill(input.inventory);
 await page.getByRole('button',{name:'Vybrat všechny podporované skupiny',exact:true}).click();
 const boxes=page.getByRole('group',{name:'Skupiny současných údajů pro kopii'}).getByRole('checkbox');
 if(await boxes.count()<18)throw Error('Complete clone profile is missing supported groups');
 for(const box of await boxes.all())await expect(box).toBeChecked();
 await page.screenshot({path:input.output+'/clone-dialog.png',fullPage:true});
 const receiptPromise=page.waitForResponse(r=>r.request().method()==='POST'&&new URL(r.url()).pathname.endsWith('/'+input.source+'/clone'));
 await page.getByRole('button',{name:'Vytvořit klon',exact:true}).dblclick();
 const response=await receiptPromise;const receipt=await response.json();if(response.status()!==201)throw Error('Clone failed: '+JSON.stringify(receipt));
 await page.waitForURL(url=>url.pathname==='/admin/items/view/'+receipt.item.id&&url.searchParams.get('catalog')==='1');
 await expect(page.getByRole('complementary',{name:'Permanentní identifikace předmětu'}).getByText(input.title,{exact:true})).toBeVisible();
 await page.reload();await expect(page.getByRole('complementary',{name:'Permanentní identifikace předmětu'}).getByText(input.title,{exact:true})).toBeVisible();
 await page.screenshot({path:input.output+'/clone-reloaded.png',fullPage:true});
 if(input.completion){
  await page.getByRole('button',{name:'✏️ Upravit předmět',exact:true}).click();const acquisitionLoaded=page.waitForResponse(r=>r.request().method()==='GET'&&new URL(r.url()).pathname.endsWith('/'+receipt.item.id+'/acquisitions'));await page.getByRole('navigation',{name:'Karty DEMUS'}).getByRole('button',{name:'Akvizice',exact:true}).click();const acquisitionPage=await (await acquisitionLoaded).json();expect(acquisitionPage.items).toHaveLength(1);initialAcquisition=acquisitionPage.items[0];
  await page.getByRole('button',{name:'Upravit',exact:true}).click();const conditions=page.getByLabel('Okolnosti',{exact:true});await expect(conditions).toHaveValue('GENERATED circumstances');await conditions.click();await conditions.press('Control+A');await conditions.pressSequentially('GENERATED Chrome native acquisition edit');const save=page.waitForResponse(r=>r.request().method()==='PATCH'&&new URL(r.url()).pathname.includes('/acquisitions/'));await page.getByRole('button',{name:'Uložit akvizici',exact:true}).click();const edited=await save;expect(edited.status()).toBe(200);expect((await edited.json()).acquisition.methodDictionaryId).toBe(97001);await expect(page.getByText('Akvizice uložena.',{exact:true})).toBeVisible();await page.reload();await page.getByRole('navigation',{name:'Karty DEMUS'}).getByRole('button',{name:'Akvizice',exact:true}).click();await page.getByRole('button',{name:'Upravit',exact:true}).click();await expect(conditions).toHaveValue('GENERATED Chrome native acquisition edit');await page.screenshot({path:input.output+'/native-acquisition-reloaded.png',fullPage:true});
 }

 if(input.completion&&input.legacyPhotoSha){
  await page.getByRole('navigation',{name:'Karty DEMUS'}).getByRole('button',{name:'Foto',exact:true}).click();const legacyCard=page.getByTitle('GENERATED legacy source',{exact:true}).locator('..');await legacyCard.getByRole('button',{name:'Náhled',exact:true}).click();const preview=page.getByRole('dialog',{name:'Náhled fotografie'});await expect(preview.locator('img')).toHaveJSProperty('naturalWidth',3);await page.screenshot({path:input.output+'/legacy-photo-preview.png',fullPage:true});await preview.getByRole('button',{name:'Zavřít náhled',exact:true}).click();
  const photoPending=page.waitForEvent('download');await legacyCard.getByTitle('Stáhnout fotografii',{exact:true}).click();const photo=await photoPending;expect(crypto.createHash('sha256').update(fs.readFileSync(await photo.path())).digest('hex')).toBe(input.legacyPhotoSha);
  await page.getByRole('navigation',{name:'Karty DEMUS'}).getByRole('button',{name:/^Přílohy/}).click();const row=page.locator('div.p-3').filter({has:page.getByText(input.legacyAttachmentName,{exact:true})});await expect(row).toHaveCount(1);const [pdf]=await Promise.all([page.waitForEvent('download'),row.getByRole('link',{name:'Stáhnout',exact:true}).click()]);expect(crypto.createHash('sha256').update(fs.readFileSync(await pdf.path())).digest('hex')).toBe(input.legacyPdfSha);legacyMediaDownloadsVerified=true;await page.screenshot({path:input.output+'/legacy-attachment-reloaded.png',fullPage:true});
 }
 if(requests.filter(r=>r.method==='POST'&&r.path.endsWith('/'+input.source+'/clone')).length!==1)throw Error('Double click submitted clone twice');
 if(errors.length)throw Error('JavaScript page errors: '+errors.join(';'));
 fs.writeFileSync(input.output+'/browser-result.json',JSON.stringify({status:'PASS',legacyMediaDownloadsVerified,initialAcquisition,receipt,key:response.request().headers()['idempotency-key'],checks:[{name:'visible-full-clone-modal-double-click-detail-reload',pass:true}],errors,requests},null,2));
}catch(e){if(page){fs.writeFileSync(input.output+'/failure-dom.txt',await page.locator('body').innerText());await page.screenshot({path:input.output+'/failure.png',fullPage:true});}fs.writeFileSync(input.output+'/browser-result.json',JSON.stringify({status:'FAIL',data:'GENERATED_ONLY_NOT_POLAKOVA',checks,errors,requests,failure:e.message},null,2));throw e;}
finally{if(browser?.isConnected()){const gone=new Promise(r=>browser.once('disconnected',r));const cdp=await browser.newBrowserCDPSession();await cdp.send('Browser.close').catch(()=>{});await gone;}server.closeAllConnections();await new Promise(r=>server.close(r));}

process.exit(0);
