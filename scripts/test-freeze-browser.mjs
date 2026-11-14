import {startSyntheticHttp} from './synthetic-http-proxy.mjs';
import {chromium,expect} from '@playwright/test';
import fs from 'node:fs';
const input=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
if(input.dataKind!=='GENERATED_ONLY')throw Error('Owned generated fixture only');
let server,browser;const checks=[];
try{
 server=await startSyntheticHttp(input);browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1366,height:900}});page.setDefaultTimeout(10000);page.on('dialog',d=>d.accept());
 const base='http://127.0.0.1:18213';await page.goto(base+'/login');await page.locator('input[type="text"]').fill('gen-root');await page.locator('input[type="password"]').fill(input.password);await page.getByRole('button',{name:'Autorizovaný vstup',exact:true}).click();await page.getByLabel('Katalog',{exact:true}).selectOption('1');await page.getByRole('table',{name:'Sbírky — tabulkové zobrazení'}).waitFor();
 await page.goto(base+'/admin/items/new?catalog=1');await page.getByLabel('Inventární číslo: Hlavní číslo',{exact:true}).fill('FREEZE-BROWSER-TYPE');await page.locator('#current-object-type').fill('GENERATED židle');await expect(page.locator('#title')).toHaveValue('');
 await page.getByRole('button',{name:'Uložit',exact:true}).click();await page.waitForURL(/\/admin\/items\/view\/\d+/);await page.reload();await expect(page.locator('#inventoryNumber')).toHaveValue('FREEZE-BROWSER-TYPE');checks.push({name:'type-only-create-confirmed-reload',pass:true});
 await page.goto(base+'/admin/items/edit/1001?catalog=1&edit=professional');await expect(page.locator('#description')).toBeEditable();const tabs=page.getByRole('navigation',{name:'Karty DEMUS'});await expect(tabs.getByRole('button')).toHaveCount(20);await tabs.getByRole('button',{name:'Historie',exact:true}).click();
 const region=page.getByRole('region',{name:'Současná odborná historie',exact:true});await region.getByLabel('Popis současné události').fill('GENERATED Žluťoučká revize');await region.getByLabel('Datum současné události').fill('2026-11-06');await region.getByRole('button',{name:'Uložit událost historie',exact:true}).click();await region.getByText('Historie byla uložena a znovu načtena.',{exact:true}).waitFor();
 await page.reload();await tabs.getByRole('button',{name:'Historie',exact:true}).click();await expect(region.locator('tbody')).toContainText('GENERATED Žluťoučká revize');checks.push({name:'history-save-and-reload',pass:true});
 await region.getByRole('button',{name:'Upravit událost',exact:true}).click();await region.getByLabel('Popis současné události').fill('GENERATED upravená historie');await region.getByRole('button',{name:'Uložit událost historie',exact:true}).click();await region.getByText('Historie byla uložena a znovu načtena.',{exact:true}).waitFor();await page.reload();await tabs.getByRole('button',{name:'Historie',exact:true}).click();await expect(region.locator('tbody')).toContainText('GENERATED upravená historie');checks.push({name:'history-edit-and-reload',pass:true});
 await page.screenshot({path:input.output+'/history.png',fullPage:true});await region.getByRole('button',{name:'Odebrat současnou událost',exact:true}).click();await expect(region.locator('tbody tr')).toHaveCount(0);checks.push({name:'history-remove-current-assignment',pass:true});
 for(const button of await tabs.getByRole('button').all())await button.click();checks.push({name:'all-20-original-tabs',pass:true});
 fs.writeFileSync(input.output+'/browser-result.json',JSON.stringify({status:'PASS',dataKind:'GENERATED_ONLY',checks},null,2),{flag:'wx'});
}catch(e){fs.writeFileSync(input.output+'/browser-result.json',JSON.stringify({status:'FAIL',checks,error:e.message},null,2));process.exitCode=1;}
finally{if(browser)await browser.close();if(server)await server.close();}
