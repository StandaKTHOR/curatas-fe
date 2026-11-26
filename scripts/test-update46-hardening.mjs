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
 // Real keyboard: typing redirects to existing search and retains the selected identity.
 const select=page.locator('#current-SUBJECT'),before=await select.inputValue();await select.focus();await page.keyboard.press('z');
 const search=page.getByLabel('Hledat autoritu SUBJECT',{exact:true});await expect(search).toBeFocused();await expect(select).toHaveValue(before);
 await search.fill('zkusebni');await page.waitForLoadState('networkidle');await expect(select.locator('option')).not.toHaveCount(1);await select.focus();await page.keyboard.press('Space');await page.keyboard.press('End');await page.keyboard.press('Enter');await expect(select).not.toHaveValue('');const picked=await select.inputValue();expect(picked).not.toBe('');await page.keyboard.press('Escape');await expect(select).toHaveValue(picked);await page.keyboard.press('Tab');expect(await select.evaluate(e=>e!==document.activeElement)).toBe(true);
 checks.push('P1.1 real Chrome typing focus, unchanged identity while searching, accent-free query, native arrows/Enter/Escape/Tab');
 await page.locator('#description').fill('Draft resizing '+run);const element=await page.locator('#description').evaluate(e=>{e.dataset.resizeWitness='same';return e.value;});
 const material=page.locator('.curator-card-material-row > details').nth(0);await material.locator(':scope > summary').click();
 for(const width of [1366,1024,768,640,390,320]){await page.setViewportSize({width,height:844});await expect(page.locator('#description')).toHaveValue(element);await expect(select).toHaveValue(picked);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 const technique=page.locator('.curator-card-material-row > details').nth(1);await technique.locator(':scope > summary').click();
 await search.fill('Nova hodnota '+run);await page.getByRole('button',{name:'+ Nová autorita Námět',exact:true}).click();
 await expect(page.locator('#dictLabel')).toBeVisible();await page.setViewportSize({width:1920,height:1080});await expect(page.locator('#dictLabel')).toBeVisible();await page.getByRole('button',{name:'Zrušit',exact:true}).click();
 await expect(page.locator('#description')).toHaveValue(element);await expect(page.locator('#description')).toHaveAttribute('data-resize-witness','same');
 checks.push('Dynamic 1920→320→1920 with same editor node, draft, exact selected identity, both disclosures and new-value dialog');
 // Native dialog: F1, context, keyboard focus, search and chapter navigation at five widths.
 await tab('Míry').click();
 for(const width of [1920,1366,768,390,320]){
  await page.setViewportSize({width,height:844});const origin=tab('Míry');await origin.focus();await page.keyboard.press('F1');const help=page.getByRole('dialog');await expect(help).toBeVisible();await expect(help.getByRole('heading',{name:'Míry a rozměry',exact:true})).toBeVisible();await expect(help.locator('article > p').first()).toBeInViewport();
  await help.getByRole('searchbox').fill('soubezna');await help.getByRole('navigation',{name:'Obsah nápovědy'}).getByRole('button',{name:'Editace, ukládání a řešení problémů'}).click();await expect(help.getByRole('heading',{name:'Souběžná editace'})).toBeVisible();
  const dimensions=await help.evaluate(el=>({width:el.getBoundingClientRect().width,scroll:el.scrollWidth,viewport:innerWidth}));expect(dimensions.width).toBeLessThanOrEqual(width);expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width);
  await photo('help-'+width);await page.keyboard.press('Escape');await expect(help).not.toBeVisible();await expect(origin).toBeFocused();await expect(origin).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'Nápověda',exact:true}).click();await expect(help).toBeVisible();await help.getByRole('button',{name:'Zavřít nápovědu'}).click();
 }
 await tab('Základ').click();await expect(page.locator('#description')).toHaveValue(element);await expect(select).toHaveValue(picked);checks.push('Help F1/button, contextual measures, accent-free global search, chapters, Escape, focus return, draft/tab/identity retained, five widths');
 // Save an audit note while a different main-form field remains dirty.
 await tab('Audit').click();const note='Audit note '+run;await page.getByPlaceholder(/např\. Oprava datace/i).fill('  '+note+'  ');const pending=page.waitForResponse(r=>r.request().method()==='PUT'&&r.url().includes('/curator-record/audit-note'));
 await page.getByRole('button',{name:/Uložit auditní záznam/i}).click();const audit=await pending;expect(audit.status()).toBe(200);expect(audit.request().postDataJSON()).toEqual({note});
 await tab('Základ').click();await expect(page.locator('#description')).toHaveValue(element);const record=await api('1/items/1001/curator-record/audit-note');expect((await record.json()).values.note).toBe(note);checks.push('P1.4 sanitized audit-note real request and persisted GET; unsaved main form retained');
 page.once('dialog',d=>d.accept());await open();
 // Generate and upload a PDF and image. Download bytes through the browser in view mode.
 await page.getByRole('navigation',{name:'Karty DEMUS'}).getByRole('button',{name:/^Přílohy/}).click();
 const pdf=Buffer.from('%PDF-1.4\n% generated local Update4.6 fixture\n%%EOF\n');const filename='update46-'+run+'.pdf';const beforeCount=Number((await page.getByRole('heading',{name:/Evidované přílohy/}).textContent()).match(/\((\d+)\)/)[1]);
 await page.locator('#attachmentFile').setInputFiles({name:filename,mimeType:'application/pdf',buffer:pdf});const uploaded=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith('/items/1001/media'));await page.getByRole('button',{name:'Nahrát přílohu',exact:true}).click();const response=await uploaded;expect(response.status()).toBe(201);const media=(await response.json()).media;
 await expect(page.getByRole('heading',{name:/Evidované přílohy/})).toHaveText('Evidované přílohy ('+(beforeCount+1)+')');
 const remove=page.getByRole('button',{name:'Odebrat přílohu '+filename});const canArchive=await remove.isEnabled();if(canArchive){page.once('dialog',d=>d.dismiss());await remove.click();await expect(page.getByRole('heading',{name:/Evidované přílohy/})).toHaveText('Evidované přílohy ('+(beforeCount+1)+')');}
 await page.goto(base+'/admin/items/view/1001?catalog=1');await page.getByRole('navigation',{name:'Karty DEMUS'}).getByRole('button',{name:/^Přílohy/}).click();const row=page.getByRole('region',{name:'Přílohy pro čtení'}).getByRole('listitem').filter({hasText:filename});
 const download=page.waitForEvent('download');await row.getByRole('button',{name:'Stáhnout'}).click();const downloaded=await download;const downloadPath=input.output+'/generated-download.pdf';await downloaded.saveAs(downloadPath);const bytes=fs.readFileSync(downloadPath);expect(downloaded.suggestedFilename()).toBe(filename);expect(bytes.equals(pdf)).toBe(true);await expect(page.getByRole('button',{name:'Uložit předmět (dole)',exact:true})).toHaveCount(0);
 const content=await api('1/items/1001/media/'+media.id+'/content');expect(content.headers()['content-type']).toContain('application/pdf');expect((await content.body()).equals(pdf)).toBe(true);
 for(const path of ['2/items/1001/media/'+media.id+'/content','1/items/1001/media/'+media.id+'/content']){const denied=await api(path,'GET',undefined,undefined,path.startsWith('2/')?token:'invalid');expect([401,403,404]).toContain(denied.status());}
 const denied=await api('1/items/1001/media/'+media.id,'DELETE',{},response.headers().etag);expect([403,405]).toContain(denied.status());
 if(canArchive){await open();await page.getByRole('navigation',{name:'Karty DEMUS'}).getByRole('button',{name:/^Přílohy/}).click();page.once('dialog',d=>d.accept());const archived=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith('/media/'+media.id+'/archive'));await page.getByRole('button',{name:'Odebrat přílohu '+filename}).click();expect((await archived).status()).toBe(200);await expect(page.getByRole('heading',{name:/Evidované přílohy/})).toHaveText('Evidované přílohy ('+beforeCount+')');await page.reload();await page.getByRole('navigation',{name:'Karty DEMUS'}).getByRole('button',{name:/^Přílohy/}).click();await expect(page.getByRole('heading',{name:/Evidované přílohy/})).toHaveText('Evidované přílohy ('+beforeCount+')');}
 checks.push('P1.2/P2.1/P2.2 real PDF upload/count/reload/read-only downloaded bytes+name+MIME; catalog/auth denied; direct DELETE denied; archive policy '+canArchive+' with cancel/confirm/count/reload');
 await open();const author=page.locator('#current-author-authority'),role=page.locator('#authorRole');const person=await author.inputValue();await expect(role.locator('option')).not.toHaveCount(1);const roleValue=await role.locator('option:not([value=""]):not([disabled])').first().getAttribute('value');await role.selectOption(roleValue);await page.getByRole('button',{name:'Uložit předmět (dole)',exact:true}).click();await page.waitForURL(/items\/view/);await open();await expect(role).toHaveValue(roleValue);await expect(author).toHaveValue(person);checks.push('P1.3 server-provided professional role selected, saved and reloaded with exact unchanged author identity');
 fs.writeFileSync(input.output+'/hardening.json',JSON.stringify({status:'PASS',checks,generatedMedia:{id:media.id,name:filename,sha256:createHash('sha256').update(pdf).digest('hex'),mime:content.headers()['content-type'],archived:canArchive,deleteStatus:denied.status()},chrome:browser.version(),apiMocks:false},null,2));
}catch(error){fs.writeFileSync(input.output+'/hardening.json',JSON.stringify({status:'FAIL',checks,error:error.stack},null,2));await photo('hardening-failure').catch(()=>{});throw error;}finally{await server?.close();await closeTestChrome(chrome);}

process.exit(0); // The connected Playwright client may retain an idle websocket after owned Chrome exits.
