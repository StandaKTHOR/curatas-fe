import {startSyntheticHttp} from './synthetic-http-proxy.mjs';
import {chromium,expect} from '@playwright/test';
import fs from 'node:fs';
const input=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
if(!['GENERATED_SMALL_V70_HOTFIX','GENERATED_8155_V70_SEARCH'].includes(input.dataKind))throw Error('Owned generated fixture required');
let server,browser,page;const checks=[];
try{
 server=await startSyntheticHttp(input);browser=await chromium.launch({channel:'chrome',headless:true});
 const context=await browser.newContext();
 await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 page=await context.newPage();page.setDefaultTimeout(12000);const base='http://127.0.0.1:18213';
 await page.goto(base+'/login');await page.locator('input[type="text"]').fill('gen-root');await page.locator('input[type="password"]').fill(input.password);await page.getByRole('button',{name:'Autorizovaný vstup',exact:true}).click();await page.getByLabel('Katalog',{exact:true}).selectOption('1');
 for(const path of ['/admin/items?catalog=1&sortField=inventoryNumber&sortDirection=desc','/?catalog=1&sort=inventoryNumber,desc']){
  await page.goto(base+path);
  const visible=page.locator('tbody tr').filter({hasText:'GENERATED visible row'});
  await expect(visible).toHaveCount(1);
  const display=await visible.locator('td').filter({hasText:/^ZV[\s\u00a0]*818\s*\/\s*1$/}).innerText();
  if(!display.includes('818'))throw Error('Inventory cell missing');
  for(const q of [display,'ZV 818','ZV818','ZV  818','818','ZV818/1','ZV818/2','ZV8181']){
   const request=page.waitForResponse(r=>{const u=new URL(r.url());return u.pathname==='/api/v2/catalogs/1/items/curator-page'&&u.searchParams.get('q')===q;});
   await page.getByPlaceholder(/Název, autor/).fill(q);
   const response=await request;if(!response.ok())throw Error('Search HTTP '+response.status());
   const body=await response.json(),ids=body.items.map(r=>r.item.id);
   const expected=q==='ZV818/2'?[]:q==='ZV8181'?[1003]:[1001];
   expect(ids).toEqual(expected);
   await expect(page.locator('tbody tr').filter({hasText:'GENERATED visible row'})).toHaveCount(expected.includes(1001)?1:0);
   checks.push({path,q,ids});
  }
  if(input.performance)for(const [q,total,id] of [['ZV 26',1,20026],['ZV 749',1,20749],['AB749/2',1,20749],['ceramic vessel',8153,null],['Karel Novák',8153,null],['glazed surface',8153,null],['NO MATCH',0,null]]){
   const pending=page.waitForResponse(r=>{const u=new URL(r.url());return u.pathname==='/api/v2/catalogs/1/items/curator-page'&&u.searchParams.get('q')===q;});
   const started=Date.now();await page.getByPlaceholder(/Název, autor/).fill(q);const response=await pending;
   expect(response.status()).toBe(200);const body=await response.json();expect(body.totalElements).toBe(total);expect(body.items.length).toBe(Math.min(50,total));if(id)expect(body.items[0].item.id).toBe(id);
   await expect(page.locator('tbody input[type="checkbox"]')).toHaveCount(Math.min(50,total));
   checks.push({path,q,total,items:body.items.length,inputToResponseMillis:Date.now()-started});
  }
 }
 fs.writeFileSync(input.output+'/browser-result.json',JSON.stringify({status:'PASS',checks,liveUatVerified:false},null,2));
}catch(error){fs.writeFileSync(input.output+'/browser-result.json',JSON.stringify({status:'FAIL',checks,error:error.message},null,2));throw error;}finally{await browser?.close();await server?.close();}
