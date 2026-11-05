// Actual original production build, real authenticated HTTP, owned PG17 V59. No response mocks.
import {startSyntheticHttp} from './synthetic-http-proxy.mjs';
import {chromium,expect} from '@playwright/test';
import fs from 'node:fs';
const input=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
if(input.dataKind!=='GENERATED_ONLY')throw Error('Generated fixture only');
let server,browser,page;const checks=[],createdIds=[],requests=[],dialogs=[];
const check=(name)=>checks.push({name,pass:true});
try{
 server=await startSyntheticHttp(input);browser=await chromium.launch({headless:true});
 page=await browser.newPage({viewport:{width:1366,height:900}});page.setDefaultTimeout(12000);
 page.on('dialog',async d=>{dialogs.push(d.message());await d.dismiss();});
 page.on('response',r=>{const u=new URL(r.url());if(u.pathname.startsWith('/api/'))requests.push({path:u.pathname,method:r.request().method(),status:r.status()});});
 const base='http://127.0.0.1:18213';await page.goto(base+'/login');await page.locator('input[type="text"]').fill('gen-reader');await page.locator('input[type="password"]').fill(input.password);await page.getByRole('button',{name:'Autorizovaný vstup',exact:true}).click();await page.getByLabel('Katalog',{exact:true}).selectOption('1');await page.getByRole('table',{name:'Sbírky — tabulkové zobrazení'}).waitFor();
 if(input.mode==='create'){
  // Test the reported lower button first; the earlier release only tested the top button.
  for(const label of ['Uložit sbírkový předmět','Uložit']){
   await page.goto(base+'/admin/items/new?catalog=1');const save=page.getByRole('button',{name:label,exact:true});await expect(save).toBeEnabled();check(label+': enabled on a new CURATOR form');
   await save.click();await page.getByText('Inventární číslo je povinné.',{exact:true}).first().waitFor();await expect(page.getByLabel('Inventární číslo: Hlavní číslo',{exact:true})).toBeFocused();check(label+': Czech required inventory validation and focus');
   const number='NEXT-'+(createdIds.length+1);await page.getByLabel('Inventární číslo: Hlavní číslo',{exact:true}).fill(number);await page.locator('#title').fill('GENERATED NEXT '+label);await page.locator('#description').fill('GENERATED současný popis Ž');
   await page.getByRole('button',{name:'19. stol.',exact:true}).click();await expect(page.locator('#datingText')).toHaveValue('19. století');check('Century shortcut writes current textual dating without inventing exact dates');
   const posts=requests.filter(r=>r.method==='POST'&&r.path==='/api/v2/catalogs/1/items').length;
   await save.dblclick();await page.waitForURL(/\/admin\/items\/(view|edit)\/[0-9]+/);const id=Number(new URL(page.url()).pathname.split('/').at(-1));createdIds.push(id);await page.getByText('Předmět byl založen a znovu načten ze scoped katalogu.',{exact:true}).waitFor();
   if(requests.filter(r=>r.method==='POST'&&r.path==='/api/v2/catalogs/1/items').length!==posts+1)throw Error('Duplicate creation POST');
   await page.reload();await expect(page.locator('#description')).toHaveValue('GENERATED současný popis Ž');await expect(page.locator('#inventoryNumber')).toHaveValue(number);check(label+': one POST, actual ID, GET and reload persistence');
   const n=dialogs.length;await page.getByRole('button',{name:'← Zpět na seznam',exact:true}).click();await page.getByRole('table',{name:'Sbírky — tabulkové zobrazení'}).waitFor();if(dialogs.length!==n)throw Error('False dirty state after saved item reload');check(label+': return without false unsaved warning');
  }
 }
 await page.screenshot({path:input.output+'/workflow.png',fullPage:true});
 fs.writeFileSync(input.output+'/browser-result.json',JSON.stringify({status:'PASS',data:'GENERATED_ONLY',checks,createdIds,requests},null,2),{flag:'wx'});
}catch(e){if(page){await page.screenshot({path:input.output+'/failure.png',fullPage:true});fs.writeFileSync(input.output+'/failure-dom.txt',await page.locator('body').innerText());}fs.writeFileSync(input.output+'/browser-result.json',JSON.stringify({status:'FAIL',checks,createdIds,requests,failure:e.message},null,2),{flag:'wx'});process.exitCode=1;}
finally{if(browser)await browser.close();if(server)await server.close();}
