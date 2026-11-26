import {closeTestChrome} from './close-test-chrome.mjs';
let chrome;
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {chromium,expect} from '@playwright/test';
import {startSyntheticHttp} from './synthetic-http-proxy.mjs';
const input=JSON.parse(fs.readFileSync(process.argv[2],'utf8')),base='http://127.0.0.1:18213',checks=[];
let server,browser,page,token;const run=Date.now();
const tab=name=>page.getByRole('navigation',{name:'Karty DEMUS'}).getByRole('button',{name,exact:true});
const photo=async name=>page.screenshot({path:input.output+'/'+name+'.png',mask:[page.locator('.curator-card-location output')],maskColor:'#e5eaf1'});
async function open(){await page.goto(base+'/admin/items/edit/1001?catalog=1&edit=professional');await expect(page.locator('#title')).toBeEnabled();await page.waitForLoadState('networkidle');}
async function api(path,method='GET',data,tag,auth=token){return page.request.fetch(base+'/api/v2/catalogs/'+path,{method,headers:{Authorization:'Bearer '+auth,Origin:base,'X-CURATAS-CSRF':'1',...(tag?{'If-Match':tag}:{})},...(data?{data}:{})});}
try{
 server=await startSyntheticHttp(input);chrome=await chromium.launchServer({channel:'chrome',headless:true});browser=await chromium.connect(chrome.wsEndpoint());const context=await browser.newContext({viewport:{width:1920,height:1080}});
 await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 page=await context.newPage();page.on('response',r=>{if(r.status()>=400)checks.push({path:new URL(r.url()).pathname,status:r.status()});});page.setDefaultTimeout(10000);await page.goto(base+'/login');await page.locator('input[type=text]').fill('gen-reader');await page.locator('input[type=password]').fill(input.password);const login=page.waitForResponse(r=>r.url().endsWith('/api/auth/local/login'));await page.getByRole('button',{name:'Autorizovaný vstup',exact:true}).click();token=(await(await login).json()).token;await page.getByLabel('Katalog',{exact:true}).selectOption('1');
 await page.goto(base+'/admin/items/view/'+Number(process.argv[3]??1001)+'?catalog=1');
await expect(page.locator('.curator-card-main')).toBeVisible();await expect(page.locator('.curator-card-location')).toHaveCount(0);await expect(page.getByRole('button',{name:'Uložit předmět (dole)',exact:true})).toHaveCount(0);checks.push('Reader opens original detail without write controls or storage block');
 fs.writeFileSync(input.output+'/reader-final.json',JSON.stringify({status:'PASS',itemId:Number(process.argv[3]??1001),checks,chrome:browser.version(),apiMocks:false},null,2));
}catch(error){fs.writeFileSync(input.output+'/reader-final.json',JSON.stringify({status:'FAIL',checks,error:error.stack},null,2));await photo('help-context-failure').catch(()=>{});throw error;}finally{await server?.close();await closeTestChrome(chrome);}

process.exit(0); // The connected Playwright client may retain an idle websocket after owned Chrome exits.
