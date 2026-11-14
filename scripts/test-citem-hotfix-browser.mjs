import {startSyntheticHttp} from './synthetic-http-proxy.mjs';
import {chromium,expect} from '@playwright/test';
import fs from 'node:fs';
const input=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
if(input.dataKind!=='GENERATED_SMALL_V70_HOTFIX')throw Error('Owned generated fixture required');
let server,browser,page;const checks=[];
try{
 server=await startSyntheticHttp(input);browser=await chromium.launch({channel:'chrome',headless:true});
 const context=await browser.newContext({viewport:{width:1366,height:1000}});
 await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 page=await context.newPage();page.setDefaultTimeout(12000);const base='http://127.0.0.1:18213';
 await page.goto(base+'/login');await page.locator('input[type="text"]').fill('gen-root');await page.locator('input[type="password"]').fill(input.password);await page.getByRole('button',{name:'Autorizovaný vstup',exact:true}).click();await page.getByLabel('Katalog',{exact:true}).selectOption('1');
 const mattech=()=>page.getByRole('heading',{name:/Přidat záznam materiálu a techniky|Úprava záznamu #/}).locator('../..');
 const table=()=>page.getByRole('table',{name:'Sbírky — tabulkové zobrazení'});
 for(const value of ['ZV 818','ZV818','ZV  818']){await page.goto(base+'/admin/items?catalog=1&q='+encodeURIComponent(value));await expect(table().getByRole('button',{name:'ZV818',exact:true})).toBeVisible();}
 checks.push('T1: actual browser whitespace search variants');
 const ast={conjunction:'AND',conditions:[{field:'inventory.custodianCode',operator:'EQUALS',value:'6MM'}],groups:[]};
 await page.goto(base+'/admin/items?catalog=1&q=ZV&sort=title,desc&page=0&advancedFilter='+encodeURIComponent(JSON.stringify(ast)));await expect(table().getByRole('button',{name:'ZV818',exact:true})).toBeVisible();await expect(table().getByRole('button',{name:'ZV829',exact:true})).toHaveCount(0);
 const listSearch=new URL(page.url()).search;checks.push('T2: actual custodian filter combines with q/sort/page');
 await table().getByRole('button',{name:'ZV818',exact:true}).click();await page.waitForURL('**/admin/items/view/1001?catalog=1');
 await page.getByRole('button',{name:'✏️ Upravit předmět',exact:true}).click();await page.locator('#title').fill('GENERATED changed title');await page.getByRole('button',{name:'Uložit',exact:true}).click();await page.waitForURL('**/admin/items/view/1001?catalog=1');await expect(page.locator('#title')).toHaveValue('GENERATED changed title');
 await expect(page.getByLabel('Současná autorita FUND',{exact:true})).toHaveValue(input.fund);checks.push('T3/T6/T9: title save returns to detail; existing fund remains selected');
 await page.getByRole('button',{name:'✏️ Upravit předmět',exact:true}).click();await page.locator('#title').fill('UNSAVED');page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'← Zrušit a zpět na detail',exact:true}).click();await page.waitForURL('**/admin/items/view/1001?catalog=1');await expect(page.locator('#title')).toHaveValue('GENERATED changed title');checks.push('T4: cancel discards draft and restores detail');
 await page.getByRole('button',{name:'← Zpět na seznam',exact:true}).click();await table().waitFor();const returned=new URL(page.url()).searchParams,original=new URLSearchParams(listSearch);for(const key of ['q','sort','page','advancedFilter'])if(returned.get(key)!==original.get(key))throw Error('Lost list context '+key);checks.push('T5: filtered list context preserved');
 await page.goto(base+'/admin/items/edit/1003?catalog=1');await page.getByRole('navigation',{name:'Karty DEMUS'}).getByRole('button',{name:'MatTech',exact:true}).click();
 for(let i=0;i<3;i++)await expect(mattech().getByLabel('Materiál — úroveň '+(i+1),{exact:true})).toHaveValue(input.uuids[i]);await page.screenshot({path:input.output+'/generated-mattech.png',fullPage:true});
 await page.reload();await page.getByRole('navigation',{name:'Karty DEMUS'}).getByRole('button',{name:'MatTech',exact:true}).click();for(let i=0;i<3;i++)await expect(mattech().getByLabel('Materiál — úroveň '+(i+1),{exact:true})).toHaveValue(input.uuids[i]);checks.push('T11: generated papír/textil/drát positions and UUIDs survive reload');
 await page.goto(base+'/admin/items/new?catalog=1');await page.getByLabel('Inventární číslo: Prefix',{exact:true}).fill('GEN-');await page.getByLabel('Inventární číslo: Hlavní číslo',{exact:true}).fill('00042');await page.getByLabel('Inventární číslo: Postfix',{exact:true}).fill('/Ž');await page.locator('#title').fill('GENERATED new hotfix item');await page.getByLabel('Současná autorita FUND',{exact:true}).selectOption(input.fund);await page.getByRole('button',{name:'Uložit',exact:true}).click();await page.waitForURL(/\/admin\/items\/view\/[0-9]+\?catalog=1/);const created=page.url();await expect(page.locator('#inventoryNumber')).toHaveValue('GEN-00042/Ž');await page.getByRole('button',{name:'✏️ Upravit předmět',exact:true}).click();await page.reload();await expect(page.locator('#title')).toHaveValue('GENERATED new hotfix item');await expect(page.getByLabel('Současná autorita FUND',{exact:true})).toHaveValue(input.fund);checks.push('T7/T10: create/detail/edit/reload preserves full identity and selected fund');
 fs.writeFileSync(input.output+'/browser-result.json',JSON.stringify({status:'PASS',fixture:'GENERATED_SMALL_V70_HOTFIX',checks,created,liveUatVerified:false},null,2));
}catch(error){fs.writeFileSync(input.output+'/browser-result.json',JSON.stringify({status:'FAIL',checks,error:error.message},null,2));if(page)await page.screenshot({path:input.output+'/failure.png',fullPage:true}).catch(()=>{});throw error;}finally{await browser?.close();await server?.close();}
