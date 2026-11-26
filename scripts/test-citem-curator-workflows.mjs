import fs from 'node:fs';
import {chromium,expect} from '@playwright/test';
import {startSyntheticHttp} from './synthetic-http-proxy.mjs';
const input=JSON.parse(fs.readFileSync(process.argv[2],'utf8')),base='http://127.0.0.1:'+(process.env.CURATAS_TEST_HTTP_PORT??18213);
let server,browser;const checks=[],errors=[];
try{
 server=await startSyntheticHttp(input);browser=await chromium.launch({channel:'chrome',headless:true});const context=await browser.newContext({viewport:{width:1366,height:768}});
 await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/login');await page.locator('input[type=text]').fill('gen-root');await page.locator('input[type=password]').fill(input.password);await page.getByRole('button',{name:'Autorizovaný vstup',exact:true}).click();await page.getByLabel('Katalog',{exact:true}).selectOption('1');
 for(const type of ['AUTHOR','LOCALITY']){
  await page.goto(base+`/admin/dictionaries?catalog=1&type=${type}&value=${input[type]}`);
  await page.getByText('Skutečně přiřazené předměty',{exact:true}).click();const related=page.getByRole('region',{name:'Předměty podle přesné autority'});
  await expect(related.getByRole('link',{name:'TEST-CURATOR-1',exact:true})).toBeVisible();await expect(related).not.toContainText('TEST-CURATOR-2');await expect(related).toContainText('Ověřený počet: '+(type==='AUTHOR'?2:1));
  if(type==='AUTHOR')await expect(related.getByRole('link',{name:'TEST-CURATOR-3',exact:true})).toBeVisible();
  await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:input.output+`/exact-${type}.png`,fullPage:true});checks.push(type+' exact UUID related items excludes identical labels');
 }
 await page.goto(base+'/admin/items/edit/1001?catalog=1&edit=professional');const author=page.locator('#current-author-authority');await expect(author).toHaveValue(input.AUTHOR);
 await expect(author).toBeEnabled();await author.focus();await author.press('G');const search=page.getByLabel('Hledat autoritu AUTHOR',{exact:true});await expect(search).toBeFocused();await expect(search).toHaveValue('G');await expect(author).toHaveValue(input.AUTHOR);
 await search.press('Control+A');await search.press('Backspace');await expect(search).toHaveValue('');
 const details=page.getByRole('link',{name:'Otevřít odborný detail vybrané položky',exact:true});await expect(details).toHaveAttribute('href',new RegExp('type=AUTHOR&value='+input.AUTHOR));checks.push('type-to-search retains exact author identity and exposes current detail');
 await page.getByText('Údaje o autorovi',{exact:true}).click();await expect(page.getByText('GENERATED original biography',{exact:true})).toBeVisible();await expect(page.getByText('nesprávně 1900??',{exact:true})).toBeVisible();
 await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:input.output+'/historical-person.png',fullPage:true});checks.push('historical biography and invalid date preserved via source relationship');
 await author.locator('xpath=..').locator(':scope > details > summary').click();
 const assigned=page.waitForResponse(r=>r.request().method()==='PUT'&&r.url().includes('/references/AUTHOR/'+input.AUTHOR_OTHER));await author.selectOption(input.AUTHOR_OTHER);expect((await assigned).status()).toBe(200);
 await page.reload();await expect(author).toHaveValue(input.AUTHOR_OTHER);checks.push('explicit different-code author choice saves the exact UUID and survives reload');
 const nav=page.getByRole('navigation',{name:'Karty DEMUS'});await nav.getByRole('button',{name:'Míry',exact:true}).click();await page.getByRole('button',{name:'Přidat rozměr',exact:true}).click();
 await page.getByLabel('Typ rozměru 1',{exact:true}).selectOption('Výška');await page.getByLabel('Jednotka rozměru 1',{exact:true}).selectOption('mm');await page.getByPlaceholder('Hodnota',{exact:true}).fill('12,5');await page.getByPlaceholder('Poznámka k míře...',{exact:true}).fill('GENERATED measurement note');
 await page.getByText('Nápověda k mírám',{exact:true}).click();await expect(page.getByText(/v — výška, s — šířka/)).toBeVisible();await page.getByRole('button',{name:'Uložit',exact:true}).click();await page.waitForURL(/items\/view/);
 await page.goto(base+'/admin/items/edit/1001?catalog=1&edit=professional');await nav.getByRole('button',{name:'Míry',exact:true}).click();await expect(page.getByLabel('Jednotka rozměru 1',{exact:true})).toHaveValue('mm');expect(Number(await page.getByPlaceholder('Hodnota',{exact:true}).inputValue())).toBe(12.5);checks.push('accessible measures and units actual save and reload');
 await nav.getByRole('button',{name:'Dokumentace',exact:true}).click();const files=page.getByRole('table',{name:'Soubory dokumentace'});await expect(files).toContainText('curator.png');await expect(files).toContainText('curator.pdf');await expect(files).toContainText('GENERATED clone media curator.png');await expect(files).toContainText('application/pdf');
 await files.getByRole('button',{name:'Náhled',exact:true}).click();await page.getByRole('dialog',{name:'Náhled fotografie'}).getByRole('img').evaluate(image=>image.decode());await page.getByRole('button',{name:'Zavřít náhled',exact:true}).click();
 const downloadButton=files.getByRole('button',{name:'Stáhnout curator.pdf',exact:true});await expect(downloadButton).toBeEnabled();const [artifact]=await Promise.all([page.waitForEvent('download'),downloadButton.click()]);await artifact.saveAs(input.output+'/generated-document.pdf');expect(fs.readFileSync(input.output+'/generated-document.pdf','utf8')).toBe('%PDF-1.7 GENERATED curator document');
 await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:input.output+'/documentation-overview.png',fullPage:true});checks.push('documentation unifies actual existing photo and attachment metadata, preview and download');
 await page.goto(base+'/admin/items/view/1001?catalog=1');await nav.getByRole('button',{name:'Dokumentace',exact:true}).click();await expect(files.getByRole('button',{name:'Stáhnout curator.pdf',exact:true})).toBeEnabled();await expect(files).toHaveCount(1);checks.push('read-only item mode retains exactly one usable documentation overview');
 expect(errors).toEqual([]);fs.writeFileSync(input.output+'/browser-result.json',JSON.stringify({status:'PASS',checks,pageErrors:errors,apiMocks:false,uatVerified:false},null,2));
}catch(e){fs.writeFileSync(input.output+'/browser-result.json',JSON.stringify({status:'FAIL',checks,error:e.message},null,2));throw e;}
finally{if(browser?.isConnected()){const closed=new Promise(r=>browser.once('disconnected',r));await (await browser.newBrowserCDPSession()).send('Browser.close').catch(()=>{});await closed;}await server?.close();}
