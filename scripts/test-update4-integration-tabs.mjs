// Real Chrome, production FE, loopback backend and owned PG17. No API mocks.
import fs from 'node:fs';
import {chromium,expect} from '@playwright/test';
import {startSyntheticHttp} from './synthetic-http-proxy.mjs';
const input=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const base=`http://127.0.0.1:${process.env.CURATAS_TEST_HTTP_PORT??18213}`;
const expected=['Základ','Určení','Vznik','MatTech','Míry','Zařazení','Historie','Dokumentace','Reference','Manipulace','Akce','ISO','Plus','Vyřazení','Akvizice','Číselníkové vazby','Přílohy','Umístění','Foto','Audit'];
let server,browser;const checks=[],errors=[],serverErrors=[];
try {
 server=await startSyntheticHttp(input);browser=await chromium.launch({channel:'chrome',headless:true});
 const context=await browser.newContext({viewport:{width:1366,height:768}});
 await context.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
 const page=await context.newPage();page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.status()>=500)serverErrors.push({status:r.status(),path:new URL(r.url()).pathname});});
 await page.goto(base+'/login');await page.locator('input[type=text]').fill('gen-root');await page.locator('input[type=password]').fill(input.password);await page.getByRole('button',{name:'Autorizovaný vstup',exact:true}).click();
 await page.getByLabel('Katalog',{exact:true}).selectOption('1');
 await page.goto(base+'/admin/items/edit/1001?catalog=1&edit=professional');await expect(page.locator('#title')).toBeEnabled();
 const nav=page.getByRole('navigation',{name:'Karty DEMUS'});
 for(const phase of ['initial','reload']) {
  if(phase==='reload'){await page.reload();await expect(page.locator('#title')).toBeEnabled();}
  await expect(nav.getByRole('button')).toHaveCount(20);
  const labels=await nav.getByRole('button').allTextContents();expect(labels.map(s=>s.replace(/ \(.+\)$/,''))).toEqual(expected);
  for(let i=0;i<expected.length;i++) {
   const button=nav.getByRole('button').nth(i);await button.click();await expect(button).toHaveAttribute('aria-pressed','true');
   await expect(nav.locator('button[aria-pressed=true]')).toHaveCount(1);
   await page.waitForLoadState('networkidle');
   expect((await page.getByRole('alert').allTextContents()).filter(s=>/Failed to fetch|Invalid |Internal Server Error/.test(s))).toEqual([]);
   await expect(page.locator('#item-editor-body')).toBeVisible();checks.push({phase,tab:expected[i],status:'PASS'});
  }
 }
 expect(errors).toEqual([]);expect(serverErrors).toEqual([]);
 fs.writeFileSync(input.output+'/browser-result.json',JSON.stringify({status:'PASS',checks,pageErrors:errors,serverErrors,apiMocks:false,liveUatVerified:false},null,2));
} finally {
 if(browser?.isConnected()){const closed=new Promise(r=>browser.once('disconnected',r));await (await browser.newBrowserCDPSession()).send('Browser.close').catch(()=>{});await closed;}
 await server?.close();
}
