import {startSyntheticHttp} from './synthetic-http-proxy.mjs';
import {chromium,expect} from '@playwright/test';
import fs from 'node:fs';
const input=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
let server,browser,page;const checks=[];const base='http://127.0.0.1:18213';
const manager=()=>page.getByRole('region',{name:'Správa současných číselníků'});
const detail=()=>page.getByRole('region',{name:'Detail současné číselníkové položky'});
const modal=()=>page.locator('form').filter({has:page.locator('#dictLabel')});
async function back(){await detail().getByRole('button',{name:'Zpět na přehled číselníku',exact:true}).click();}
async function create(label,parentId,code){
 await manager().getByRole('button',{name:/^Nová položka$|^Nová lokalita$/}).click();
 await modal().locator('input#dictLabel, #dictLabel input').fill(label);
 if(code)await modal().locator('input#dictCode, #dictCode input').fill(code);
 const parent=modal().getByLabel('Nadřazená položka',{exact:true});await expect(parent).toBeEnabled();
 if(parentId)await parent.selectOption(parentId);
 const pending=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().includes('/dictionaries/'));
 await modal().getByRole('button',{name:'Uložit',exact:true}).click();const r=await pending;expect(r.status()).toBe(201);const id=(await r.json()).id;
 await expect(modal()).toHaveCount(0);await expect(detail()).toBeVisible();return id;
}
try{
 server=await startSyntheticHttp(input);browser=await chromium.launch({channel:'chrome',headless:true});
 const context=await browser.newContext({viewport:{width:1366,height:900}});await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 page=await context.newPage();page.setDefaultTimeout(12000);
 await page.goto(base+'/login');await page.locator('input[type=text]').fill('gen-root');await page.locator('input[type=password]').fill(input.password);
 await page.getByRole('button',{name:'Autorizovaný vstup',exact:true}).click();await page.getByLabel('Katalog',{exact:true}).selectOption('1');
 await page.getByRole('link',{name:'Správa číselníků',exact:true}).click();
 for(const [type,value] of Object.entries(input.expected)){
  await manager().getByLabel('Typ číselníku',{exact:true}).selectOption(type);
  await manager().getByText(/Historický číselník DEMUS —/).click();
  const historical=page.getByRole('region',{name:'Historické hodnoty DEMUS '+type,exact:true});
  const row=historical.getByRole('row').filter({has:page.getByRole('cell',{name:value.code,exact:true})});await expect(row).toHaveCount(1);
  await expect(row).toContainText(value.code);if(value.groupingCode)await expect(row).toContainText(value.groupingCode);
  await expect(historical.getByRole('button',{name:/Upravit/})).toHaveCount(0);
  checks.push(type+' exact archived caption/code/grouping visible; no historical edit');
 }
 await manager().getByLabel('Typ číselníku',{exact:true}).selectOption('CUSTODIAN');await manager().getByText(/Historický číselník DEMUS —/).click();
 await expect(page.getByRole('region',{name:'Historické hodnoty DEMUS CUSTODIAN'})).toContainText('vyžaduje odborné rozhodnutí');
 for(const type of ['MATERIAL','TECHNIQUE']){
  await manager().getByLabel('Typ číselníku',{exact:true}).selectOption(type);
  const root=await create(type==='MATERIAL'?'KOV':'Opracování');await back();
  const child=await create(type==='MATERIAL'?'ŽELEZO':'Tváření',root);await back();
  const leaf=await create(type==='MATERIAL'?'LITINA':'Kování',child);
  await expect(detail()).toContainText(type==='MATERIAL'?'KOV → ŽELEZO → LITINA':'Opracování → Tváření → Kování');
  await expect(detail()).toContainText('Žádné podřazené položky v této větvi.');await expect(detail().getByRole('alert')).toHaveCount(0);
  await page.reload();await expect(detail()).toContainText(type==='MATERIAL'?'KOV → ŽELEZO → LITINA':'Opracování → Tváření → Kování');await back();
  checks.push(type+' explicit current three-level path and empty leaf reload');
  if(type==='MATERIAL'){
   const wood=await create('DŘEVO');await back();await create('EBEN',wood);await expect(detail()).toContainText('DŘEVO → EBEN');await back();
   const a=await create('Stejný název',undefined,'ODBORNY_A');await back();const b=await create('Stejný název',undefined,'ODBORNY_B');expect(a).not.toBe(b);await back();
   const rows=manager().getByRole('row').filter({hasText:'Stejný název'});await expect(rows).toHaveCount(2);await expect(rows.filter({hasText:'ODBORNY_A'})).toHaveCount(1);await expect(rows.filter({hasText:'ODBORNY_B'})).toHaveCount(1);
   await manager().getByLabel('Hledat v současném číselníku').fill('nenalezený materiál');await expect(manager()).toContainText('Žádné současné hodnoty neodpovídají hledání.');
   await manager().getByLabel('Typ číselníku',{exact:true}).selectOption('FUND');await expect(manager().getByLabel('Hledat v současném číselníku')).toHaveValue('');checks.push('same-name identities preserved; dictionary switch clears unrelated search');
  }
 }
 await page.screenshot({path:input.output+'/hierarchy.png',fullPage:true});
 await manager().getByLabel('Typ číselníku',{exact:true}).selectOption('LOCALITY');
 const locality=await create('Testovací lokalita',undefined,'TEST_LOC');
 await expect(detail().getByRole('heading',{name:'Detail číselníkové položky'})).toBeVisible();
 await detail().getByRole('button',{name:'Upravit tuto položku',exact:true}).click();
 await modal().locator('input#dictLabel, #dictLabel input').fill('Upravená testovací lokalita');
 const edit=page.waitForResponse(r=>r.request().method()==='PUT'&&r.url().endsWith('/values/'+locality));
 await modal().getByRole('button',{name:'Uložit',exact:true}).click();expect((await edit).status()).toBe(200);await expect(modal()).toHaveCount(0);
 await page.reload();await expect(detail()).toContainText('Upravená testovací lokalita');checks.push('basic LOCALITY create/edit/detail/reload without optional schema');
 // Actual historical UUID-free selection in the existing item editor.
 await page.goto(base+'/admin/items/edit/1001?catalog=1&edit=professional');
 await page.getByRole('navigation',{name:'Karty DEMUS'}).getByRole('button',{name:'Základ',exact:true}).click();
 const fund=page.getByLabel('Současná autorita FUND',{exact:true});const chosen=input.expected.FUND;
 await expect(fund.locator('option[value="demus:'+chosen.recordId+'"]')).toHaveCount(1);await fund.selectOption('demus:'+chosen.recordId);
 const saved=page.waitForResponse(r=>r.request().method()==='PUT'&&new URL(r.url()).pathname.endsWith('/curator-records'));
 await page.locator('[data-scoped-save]').first().click();expect((await saved).status()).toBe(200);await page.reload();
 await page.getByRole('navigation',{name:'Karty DEMUS'}).getByRole('button',{name:'Základ',exact:true}).click();await expect(fund).toHaveValue('demus:'+chosen.recordId);
 checks.push('actual archived FUND selection saved and reloaded with exact historical identity');
 fs.writeFileSync(input.output+'/browser-result.json',JSON.stringify({status:'PASS',browser:'Chrome',checks,uatVerified:false},null,2));
}catch(e){fs.writeFileSync(input.output+'/browser-result.json',JSON.stringify({status:'FAIL',checks,error:e.message},null,2));await page?.screenshot({path:input.output+'/failure.png'}).catch(()=>{});throw e;}
finally{if(browser)await browser.close();if(server)await server.close();}
