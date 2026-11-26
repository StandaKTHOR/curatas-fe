import {closeTestChrome} from './close-test-chrome.mjs';
let chrome;
import fs from 'node:fs';
import {chromium,expect} from '@playwright/test';
import {startSyntheticHttp} from './synthetic-http-proxy.mjs';
const input=JSON.parse(fs.readFileSync(process.argv[2],'utf8')),base='http://127.0.0.1:18213';
let server,browser,page;const checks=[];
try{
 server=await startSyntheticHttp(input);chrome=await chromium.launchServer({channel:'chrome',headless:true});browser=await chromium.connect(chrome.wsEndpoint());const context=await browser.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:1});page=await context.newPage();page.setDefaultTimeout(10000);
 await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 await page.goto(base+'/login');await page.locator('input[type=text]').fill('gen-root');await page.locator('input[type=password]').fill(input.password);await page.getByRole('button',{name:'Autorizovaný vstup',exact:true}).click();await page.getByLabel('Katalog',{exact:true}).selectOption('1');
 for(const mode of ['view','edit'])for(const [width,height] of [[1366,768],[1920,1080]]){
  await page.setViewportSize({width,height});await page.goto(base+`/admin/items/${mode}/1001?catalog=1`+(mode==='edit'?'&edit=professional':''));await expect(page.locator('.curator-card-main')).toBeVisible();await page.waitForLoadState('networkidle');
  for(const state of ['closed','material','technique']){
   const dictionaries=page.locator('.curator-card-material-row > details');
   for(let n=0;n<2;n++){const desired=state===(n?'technique':'material');if(await dictionaries.nth(n).evaluate(el=>el.open)!==desired)await dictionaries.nth(n).locator(':scope > summary').click();}
   await page.evaluate(()=>scrollTo(0,0));const options={animations:'disabled',mask:[page.locator('.curator-card-location output')],maskColor:'#e5eaf1'};
   await page.screenshot({...options,path:`${input.output}/viewport-${mode}-${width}-${state}.png`});
   await page.locator('.curator-card-main').screenshot({...options,path:`${input.output}/card-${mode}-${width}-${state}.png`});
  }
 }
 checks.push('Exact 1366x768 and 1920x1080 viewport screenshots, card screenshots, view/edit and both dictionaries');
 await page.goto(base+'/admin/items/edit/1001?catalog=1&edit=professional');await expect(page.locator('#title')).toBeEnabled();
 await page.getByRole('button',{name:'🖨️ Tisk karty',exact:true}).click();await expect(page.getByText('Náhled muzejní karty k tisku',{exact:true})).toBeVisible();await expect(page.locator('#museum-card-content')).toContainText('ZV 640/1');await page.emulateMedia({media:'print'});await expect(page.locator('#museum-card-content')).toBeVisible();await page.emulateMedia({media:'screen'});await page.getByRole('button',{name:'Zavřít náhled',exact:true}).click();checks.push('Original print preview renders the object in screen and print media');
 const upload=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith('/items/1001/media'));
 await page.locator('#photo-up').setInputFiles({name:'UI45-fixture.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aDaoAAAAASUVORK5CYII=','base64')});
 const uploaded=await upload;expect(uploaded.status(),await uploaded.text()).toBe(201);const saved=(await uploaded.json()).media;expect(saved.name).toBe('UI45-fixture.png');
 await page.reload();await page.getByRole('navigation',{name:'Karty DEMUS'}).getByRole('button',{name:'Foto',exact:true}).click();await expect(page.getByText('UI45-fixture.png',{exact:true}).first()).toBeVisible();checks.push('Original photo upload saved real image bytes and metadata, confirmed in Foto after full reload');
 await expect(page.getByRole('button',{name:/Smazat fotografii/})).toHaveCount(0);
 const deniedPhoto=await page.request.delete(base+'/api/v2/catalogs/1/items/1001/media/'+saved.id,{headers:{Authorization:uploaded.request().headers().authorization,Origin:base,'X-CURATAS-CSRF':'1'},data:{}});expect([403,405]).toContain(deniedPhoto.status());
 const photoRow=page.getByText('UI45-fixture.png',{exact:true}).first().locator('..').locator('..');
 await page.getByRole('button',{name:'Náhled',exact:true}).last().click();const preview=page.getByRole('dialog',{name:'Náhled fotografie'});await expect(preview.locator('img')).toBeVisible();expect(await preview.locator('img').evaluate(e=>e.complete&&e.naturalWidth>0)).toBe(true);await preview.getByRole('button',{name:'Zavřít náhled'}).click();checks.push('P2.2 photo delete unavailable; real direct DELETE denied; generated image authenticated preview renders');
 await page.goto(base+'/admin/items?catalog=1');await page.waitForLoadState('networkidle');
 const row=page.getByRole('table',{name:'Sbírky — tabulkové zobrazení',exact:true}).locator('tbody tr').first();
 await row.getByRole('button').first().click();
 await expect(page.getByRole('button',{name:'Následující předmět',exact:true})).toBeEnabled();
 const origin=new URL(page.url()).pathname.split('/').at(-1);await page.getByRole('button',{name:'Následující předmět',exact:true}).click();await page.waitForURL(url=>url.pathname.split('/').at(-1)!==origin);await expect(page.locator('.curator-card-main')).toBeVisible();
 await page.getByRole('button',{name:'Předchozí předmět',exact:true}).click();await page.waitForURL(url=>url.pathname.split('/').at(-1)===origin);await expect(page.locator('.curator-card-main')).toBeVisible();checks.push('List context preserves next/previous object navigation');
 fs.writeFileSync(input.output+'/capture-actions.json',JSON.stringify({status:'PASS',checks,chrome:browser.version(),apiMocks:false},null,2));
}catch(e){fs.writeFileSync(input.output+'/capture-actions.json',JSON.stringify({status:'FAIL',checks,error:e.stack},null,2));throw e;}finally{await server?.close();await closeTestChrome(chrome);}

process.exit(0);
