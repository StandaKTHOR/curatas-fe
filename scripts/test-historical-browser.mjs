// Actual original React + local-auth + owned PG17. Generated values only; no response mocks.
import {chromium,expect} from '@playwright/test';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const input=JSON.parse(fs.readFileSync(process.argv[2],'utf8')),backend=new URL(input.backend),root=path.resolve(input.frontend);
if(backend.hostname!=='127.0.0.1'||backend.protocol!=='http:'||['8082','8084','5432','5547'].includes(backend.port)||input.port!==18213)throw Error('Owned generated infrastructure required');
const server=http.createServer((req,res)=>{
 if(req.url.startsWith('/api/')){const remote=http.request(new URL(req.url,backend),{method:req.method,headers:{...req.headers,host:backend.host}},r=>{const headers={...r.headers};if(req.url.split('?')[0].endsWith('/curator-page'))headers['cache-control']=[String(r.headers['cache-control']??''),'no-store'];res.writeHead(r.statusCode,headers);r.pipe(res);});remote.on('error',()=>{res.writeHead(502);res.end();});req.pipe(remote);return;}
 const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(400);res.end();return;}
 const target=fs.existsSync(file)&&fs.statSync(file).isFile()?file:path.join(root,'index.html');
 res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.woff2':'font/woff2','.png':'image/png'})[path.extname(target)]??'application/octet-stream');fs.createReadStream(target).pipe(res);
});
let browser,page;const checks=[],errors=[],requests=[];
try{
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(input.port,'127.0.0.1',resolve);});
 const chrome=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(p=>fs.existsSync(p));
 browser=await chromium.launch({...(chrome&&!fs.existsSync((process.env.LOCALAPPDATA||'')+'/ms-playwright')?{executablePath:chrome}:{}),headless:true});const context=await browser.newContext({viewport:{width:1366,height:900}});
 await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 page=await context.newPage();page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{const url=new URL(r.url());if(url.pathname.startsWith('/api/'))requests.push({path:url.pathname,method:r.request().method(),status:r.status(),cacheControl:r.headers()['cache-control']});});
 const base=`http://127.0.0.1:${input.port}`;
 async function login(username){await page.goto(base+'/login');await page.locator('input[type="text"]').fill(username);await page.locator('input[type="password"]').fill(input.password);await page.getByRole('button',{name:'Autorizovaný vstup'}).click();await page.getByLabel('Katalog',{exact:true}).selectOption('1');}
 await login(input.username);checks.push({name:'real-local-auth-and-catalog',pass:true});
 await page.goto(base+'/admin/items/view/1001?catalog=1');await expect(page.locator('#description')).toHaveValue('GENERATED český popis (DEMUS)');
 if(await page.locator('#description').isEditable())throw Error('Historical view became editable');checks.push({name:'real-API-root-description-fallback-read-only',pass:true});
 const tabs=page.getByRole('navigation',{name:'Karty DEMUS'}),labels=await tabs.getByRole('button').allTextContents();if(labels.length!==20)throw Error('Expected original20 tabs');
 for(let i=0;i<labels.length;i++){
  await tabs.getByRole('button',{name:labels[i],exact:true}).click();await page.waitForLoadState('networkidle');
  const errors=await page.getByRole('alert').allTextContents();if(errors.some(s=>/Invalid |Failed to fetch|Foreign |500/.test(s)))throw Error('Tab data error: '+labels[i]);
  if(['Určení','Vznik','Dokumentace','Reference','Manipulace','Akce','ISO','Vyřazení','Zařazení'].includes(labels[i])&&!await page.getByText('Pouze čtení DEMUS',{exact:true}).count())throw Error('Missing historical row: '+labels[i]);
  await page.screenshot({path:input.output+'/generated-history-tab-'+String(i+1).padStart(2,'0')+'.png',fullPage:true});
 }
 checks.push({name:'all20-original-tabs-through-real-API-with-source-rows',pass:true,tabs:labels});
 await tabs.getByRole('button',{name:'Určení',exact:true}).click();const details=page.locator('details').filter({has:page.getByText('Všechna původní pole DEMUS',{exact:true})});await details.first().locator('summary').first().click();await page.waitForLoadState('networkidle');
 if(!requests.some(r=>r.path.includes('/source-history/')&&r.path.endsWith('/relations')&&r.status===200))throw Error('Related source API not exercised');checks.push({name:'source-lineage-and-authority-relations-readable-inside-disabled-original-fieldset',pass:true});
 if(requests.some(r=>['POST','PUT','PATCH','DELETE'].includes(r.method)&&r.path.startsWith('/api/v2/')))throw Error('Read-only browser emitted a current-domain write');
 const id=1001;
 const failed=requests.filter(r=>r.status>=400&&!(r.path==='/api/auth/local/refresh'&&r.status===401));
 if(failed.length)throw Error('Unexpected API failures: '+JSON.stringify(failed));
 if(errors.length)throw Error('JavaScript page errors');
 fs.writeFileSync(input.output+'/browser-result.json',JSON.stringify({status:'PASS',data:'GENERATED_ONLY_NOT_POLAKOVA',itemId:id,checks,errors,requests},null,2));
}catch(e){if(page){fs.writeFileSync(input.output+'/failure-dom.txt',await page.locator('body').innerText());await page.screenshot({path:input.output+'/failure.png',fullPage:true});}fs.writeFileSync(input.output+'/browser-result.json',JSON.stringify({status:'FAIL',data:'GENERATED_ONLY_NOT_POLAKOVA',checks,errors,requests,failure:e.message},null,2));throw e;}
finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
