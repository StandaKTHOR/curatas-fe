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
 page=await context.newPage();page.setDefaultTimeout(10000);await page.goto(base+'/login');await page.locator('input[type=text]').fill('gen-root');await page.locator('input[type=password]').fill(input.password);const login=page.waitForResponse(r=>r.url().endsWith('/api/auth/local/login'));await page.getByRole('button',{name:'Autorizovaný vstup',exact:true}).click();token=(await(await login).json()).token;await page.getByLabel('Katalog',{exact:true}).selectOption('1');
 await open();
 const titles={'Základ':'Evidence a vyhledávání předmětů','Určení':'Autoři, osobnosti a Adresář','Vznik':'Autoři, osobnosti a Adresář','MatTech':'Materiály a techniky','Míry':'Míry a rozměry','Zařazení':'Odborné číselníky','Historie':'Historie předmětu','Dokumentace':'Dokumentace, fotografie a přílohy','Reference':'Literatura, publikace a reference','Manipulace':'Manipulace','Akce':'Akce','ISO':'ISO','Plus':'Plus','Vyřazení':'Editace, ukládání a řešení problémů','Akvizice':'Evidence a vyhledávání předmětů','Číselníkové vazby':'Odborné číselníky','Přílohy':'Dokumentace, fotografie a přílohy','Umístění':'Umístění','Foto':'Dokumentace, fotografie a přílohy','Audit':'Audit a auditní poznámka'};
 for(const [name,title] of Object.entries(titles)){
  const target=page.locator('[data-tab-name="'+name+'"]');await target.click();await target.focus();await page.keyboard.press('F1');const help=page.getByRole('dialog');await expect(help.getByRole('heading',{level:2,name:title,exact:true})).toBeVisible();await page.keyboard.press('Escape');await expect(target).toBeFocused();await expect(target).toHaveAttribute('aria-pressed','true');checks.push(name+' → '+title);
 }
 fs.writeFileSync(input.output+'/help-contexts.json',JSON.stringify({status:'PASS',checks,chrome:browser.version(),apiMocks:false},null,2));
}catch(error){fs.writeFileSync(input.output+'/help-contexts.json',JSON.stringify({status:'FAIL',checks,error:error.stack},null,2));await photo('help-context-failure').catch(()=>{});throw error;}finally{await server?.close();await closeTestChrome(chrome);}

process.exit(0); // The connected Playwright client may retain an idle websocket after owned Chrome exits.
