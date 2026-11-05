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
 if(['create','all'].includes(input.mode)){
  // Test the reported lower button first; the earlier release only tested the top button.
  for(const label of ['Uložit sbírkový předmět','Uložit']){
   await page.goto(base+'/admin/items/new?catalog=1');const save=page.getByRole('button',{name:label,exact:true});await expect(save).toBeEnabled();check(label+': enabled on a new CURATOR form');
   await save.click();await page.getByText('Inventární číslo je povinné.',{exact:true}).first().waitFor();await expect(page.getByLabel('Inventární číslo: Hlavní číslo',{exact:true})).toBeFocused();check(label+': Czech required inventory validation and focus');
   const number='NEXT-'+(createdIds.length+1);await page.getByLabel('Inventární číslo: Hlavní číslo',{exact:true}).fill(number);await page.locator('#title').fill('GENERATED NEXT '+label);await page.locator('#description').fill('GENERATED současný popis Ž');
   await page.getByRole('button',{name:'19. stol.',exact:true}).click();await expect(page.locator('#datingText')).toHaveValue('19. století');check('Century shortcut writes current textual dating without inventing exact dates');
   const posts=requests.filter(r=>r.method==='POST'&&r.path==='/api/v2/catalogs/1/items').length;
   await save.dblclick();await page.waitForURL(/\/admin\/items\/(view|edit)\/[0-9]+/);const id=Number(new URL(page.url()).pathname.split('/').at(-1));createdIds.push(id);await page.getByText('Předmět byl založen a znovu načten ze scoped katalogu.',{exact:true}).waitFor();
   if(requests.filter(r=>r.method==='POST'&&r.path==='/api/v2/catalogs/1/items').length!==posts+1)throw Error('Duplicate creation POST');
   await page.reload();await expect(page.locator('#description')).toHaveValue('GENERATED současný popis Ž');await expect(page.locator('#inventoryNumber')).toHaveValue(number);await expect(page.getByRole('definition').filter({hasText:'GENERATED 2'})).toHaveCount(2);check(label+': one POST, actual ID, GET, creation/modification actor and reload persistence');
   const n=dialogs.length;await page.getByRole('button',{name:'← Zpět na seznam',exact:true}).click();await page.getByRole('table',{name:'Sbírky — tabulkové zobrazení'}).waitFor();if(dialogs.length!==n)throw Error('False dirty state after saved item reload');check(label+': return without false unsaved warning');
  }
 }
 if(['flags','all'].includes(input.mode)){
  await page.goto(base+'/admin/items/edit/1001?catalog=1&edit=professional');const card=page.getByRole('checkbox',{name:'Současný příznak Karta',exact:true});await expect(card).toBeEnabled();await card.check();
  await page.getByRole('button',{name:'Uložit',exact:true}).click();await page.getByText(/Současná sekce byla uložena přes scoped API a znovu načtena/).waitFor();
  await expect(card).toBeChecked();const n=dialogs.length;await page.getByRole('button',{name:'← Zpět na seznam',exact:true}).click();await page.getByRole('table',{name:'Sbírky — tabulkové zobrazení'}).waitFor();if(dialogs.length!==n)throw Error('Saved flags remain dirty');
  await page.goto(base+'/admin/items/edit/1001?catalog=1&edit=professional');await expect(page.getByRole('checkbox',{name:'Současný příznak Karta',exact:true})).toBeChecked();check('Global save persists current flags and clears only acknowledged draft');
 }
 if(['filters','all'].includes(input.mode)){
  await page.goto(base+'/admin/items?catalog=1&sortField=inventoryNumber&sortDirection=asc');const table=page.getByRole('table',{name:'Sbírky — tabulkové zobrazení'});await table.waitFor();
  await page.getByRole('button',{name:'Pokročilý filtr (AND/OR)',exact:true}).click();const field=page.getByRole('combobox',{name:'Pole pokročilé podmínky'}),value=page.getByPlaceholder('Hledaný výraz...');
  await field.selectOption('inventoryNumber');await value.fill('NEXT-');await page.getByRole('button',{name:'Filtrovat výsledky',exact:true}).click();await expect(table.locator('tbody tr')).toHaveCount(2);
  const applied=new URL(page.url()).searchParams.get('advancedFilter');await value.fill('UNAPPLIED-NO-MATCH');await page.waitForTimeout(650);if(new URL(page.url()).searchParams.get('advancedFilter')!==applied)throw Error('Unapplied draft changed query');await expect(table.locator('tbody tr')).toHaveCount(2);
  await page.getByRole('button',{name:'Pokročilý filtr (aktivní)',exact:true}).click();await page.getByRole('button',{name:'Pokročilý filtr (aktivní)',exact:true}).click();await expect(value).toHaveValue('NEXT-');check('Advanced Apply, unapplied draft and closing cancel preserve persisted list scope');
  await page.getByRole('button',{name:'Přidat podmínku',exact:true}).click();await field.nth(1).selectOption('title');await value.nth(1).fill('sbírkový');await page.getByRole('button',{name:'Filtrovat výsledky',exact:true}).click();await expect(table.locator('tbody tr')).toHaveCount(1);
  await table.getByRole('button',{name:'NEXT-1',exact:true}).click();await page.waitForURL(/\/admin\/items\/view\//);await page.getByRole('button',{name:'← Zpět na seznam',exact:true}).click();await expect(table.locator('tbody tr')).toHaveCount(1);const query=new URL(page.url()).searchParams;if(!query.get('advancedFilter')?.includes('sbírkový')||query.get('sortField')!=='inventoryNumber'||query.get('sortDirection')!=='asc'||query.get('page')!=='0')throw Error('Return lost advanced filter, page or sorting');check('Combined AND filter, actual count and detail-return context');
  await page.getByRole('button',{name:'Pokročilý filtr (aktivní)',exact:true}).click();await page.getByRole('button',{name:'Resetovat pokročilý filtr',exact:true}).click();await expect(table.locator('tbody tr')).not.toHaveCount(1);if(new URL(page.url()).searchParams.has('advancedFilter'))throw Error('Reset retained filter');check('Reset reloads complete generated list, without stale closure request');
  const pageNumber=page.getByRole('textbox',{name:'Číslo stránky evidence'}).first();await pageNumber.fill('');await expect(pageNumber).toHaveValue('');await pageNumber.fill('1');await pageNumber.press('Enter');await expect(pageNumber).toHaveValue('1');check('Page text can be cleared and committed with Enter');
  for(const key of ['legacyCreatedBy','determinedBy','fundLegacyCode','subCollection','inventory.series','inventory.ordinal']){
   await page.getByRole('combobox',{name:'Pole pokročilé podmínky'}).selectOption(key);await page.getByPlaceholder('Hledaný výraz...').fill(key==='inventory.ordinal'?'999999':'GENERATED-NOT-EXIST');const response=page.waitForResponse(r=>r.url().includes('/curator-page/query')&&r.request().method()==='POST');
   await page.getByRole('button',{name:'Filtrovat výsledky',exact:true}).click();const r=await response;if(r.status()!==200)throw Error('Unsupported offered field '+key);const body=await r.json();if(body.totalElements!==0||body.items.length!==0)throw Error('Unexpected filter semantics '+key);check('Real scoped historical filter '+key+' with exact empty result');
  }
 }
 if(input.mode==='sections'){
  await page.goto(base+'/admin/items/edit/1001?catalog=1&edit=professional');const tabs=page.getByRole('navigation',{name:'Karty DEMUS'});
  for(const [tab,section,label] of [['Určení','determination','Určený předmět'],['Vznik','origin','Místo vzniku'],['Zařazení','classification','Systematická kategorie'],['Dokumentace','documentation','Dokument / název']]){
   await tabs.getByRole('button',{name:tab,exact:true}).click();const value='GENERATED '+section+' Ž';const field=page.getByLabel(label,{exact:true});await expect(field).toBeEditable();await field.fill(value);
   // Whole-item Save must not report an unsaved separate record as success or discard it.
   await page.getByRole('button',{name:'Uložit',exact:true}).click();await page.getByText(/Nejprve potvrďte rozepsaný odborný podzáznam/).waitFor();await expect(field).toHaveValue(value);
   await page.getByRole('button',{name:'Uložit záznam',exact:true}).click();const evidence=page.getByRole('table',{name:'Evidence '+section,exact:true});const row=evidence.getByRole('row').filter({hasText:value});await row.waitFor();
   await page.reload();await tabs.getByRole('button',{name:tab,exact:true}).click();await row.waitFor();await row.getByRole('button',{name:'Upravit',exact:true}).click();await field.fill(value+' edited');await page.getByRole('button',{name:'Uložit záznam',exact:true}).click();await page.getByRole('table',{name:'Evidence '+section,exact:true}).getByText(value+' edited',{exact:true}).waitFor();
   await page.reload();await tabs.getByRole('button',{name:tab,exact:true}).click();await page.getByRole('table',{name:'Evidence '+section,exact:true}).getByText(value+' edited',{exact:true}).waitFor();check(tab+': current create, global draft guard, section save, edit and reload persistence');
  }
  await tabs.getByRole('button',{name:'Základ',exact:true}).click();await page.getByRole('button',{name:'Otevřít současné odborné vazby (Fond, Podsbírka, Skupina, Určil, Role autora) a rozsah inv. čísla',exact:true}).click();const lower=page.getByLabel('Dolní pořadové číslo',{exact:true});const upper=page.getByLabel('Horní pořadové číslo',{exact:true});await lower.fill('20');await upper.fill('10');await page.getByRole('button',{name:'Uložit rozsah a řadu',exact:true}).click();await page.getByText(/Dolní.*horní|dolní.*horní/).waitFor();check('Invalid reversed inventory range cannot save');await upper.fill('30');await page.getByRole('button',{name:'Uložit rozsah a řadu',exact:true}).click();await page.getByText('Současný rozsah a inventární řada byly uloženy a znovu načteny.',{exact:true}).waitFor();await page.reload();await tabs.getByRole('button',{name:'Základ',exact:true}).click();await page.getByRole('button',{name:'Otevřít současné odborné vazby (Fond, Podsbírka, Skupina, Určil, Role autora) a rozsah inv. čísla',exact:true}).click();await expect(lower).toHaveValue('20');await expect(upper).toHaveValue('30');check('Valid explicit inventory range persists and reloads without generating inventory identities');
 }
 await page.screenshot({path:input.output+'/workflow.png',fullPage:true});
 fs.writeFileSync(input.output+'/browser-result.json',JSON.stringify({status:'PASS',data:'GENERATED_ONLY',checks,createdIds,requests},null,2),{flag:'wx'});
}catch(e){if(page){await page.screenshot({path:input.output+'/failure.png',fullPage:true});fs.writeFileSync(input.output+'/failure-dom.txt',await page.locator('body').innerText());}fs.writeFileSync(input.output+'/browser-result.json',JSON.stringify({status:'FAIL',checks,createdIds,requests,failure:e.message},null,2),{flag:'wx'});process.exitCode=1;}
finally{if(browser)await browser.close();if(server)await server.close();}
