import {startSyntheticHttp} from './synthetic-http-proxy.mjs';
import {chromium,expect as browserExpect} from '@playwright/test';
import fs from 'node:fs';
import {verifyNeighbourNavigation} from './final-citem-navigation.mjs';
const expect=browserExpect.configure({timeout:15000});
const input=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
if(input.dataKind!=='ACTUAL_POLAKOVA_VOCABULARY_FIXTURE'||!input.dating?.code||!input.dating?.value)throw Error('Actual owned dating fixture required');
const checks=[],base='http://127.0.0.1:18213';let server,browser,page;
const isPage=r=>/\/curator-page(?:\/query)?$/.test(new URL(r.url()).pathname);
try{
 server=await startSyntheticHttp(input);browser=await chromium.launch({channel:'chrome',headless:process.env.MES_FINAL_HEADLESS==='1'});page=await browser.newPage({viewport:{width:1366,height:900}});page.setDefaultTimeout(15000);
 await page.goto(base+'/login');await page.locator('input[type="text"]').fill('gen-root');await page.locator('input[type="password"]').fill(input.password);await page.getByRole('button',{name:'Autorizovaný vstup',exact:true}).click();await page.getByLabel('Katalog',{exact:true}).selectOption('1');
 const table=page.getByRole('table',{name:'Sbírky — tabulkové zobrazení'});
 await page.goto(base+'/admin/items?catalog=1&inventoryNumber='+encodeURIComponent(input.dating.code));await expect(table.locator('tbody tr')).toHaveCount(1);await expect(table.locator('tbody')).toContainText(input.dating.value+' (DEMUS)');checks.push('actual historical dating in original catalog');
 await table.locator('tbody tr').first().getByRole('button').first().click();await page.waitForURL(/\/items\/(view|edit)\//);await expect(page.locator('#datingText')).toHaveValue(input.dating.value+' (DEMUS)');await expect(page.getByRole('navigation',{name:'Karty DEMUS'}).getByRole('button')).toHaveCount(20);await page.getByRole('button',{name:'← Zpět na seznam',exact:true}).click();checks.push('same unchanged historical dating in detail;20 original tabs');
 async function apply(conditions,conjunction='AND'){
  await page.goto(base+'/admin/items?catalog=1');await table.waitFor();await page.getByRole('button',{name:'Pokročilý filtr (AND/OR)',exact:true}).click();
  for(let i=0;i<conditions.length;i++){
   if(i)await page.getByRole('button',{name:'Přidat podmínku',exact:true}).click();
   await page.getByLabel('Pole pokročilé podmínky',{exact:true}).nth(i).selectOption(conditions[i].field);
   await page.getByLabel('Operátor pokročilé podmínky',{exact:true}).nth(i).selectOption(conditions[i].operator);
   if(!['IS_EMPTY','IS_NOT_EMPTY'].includes(conditions[i].operator))await page.getByPlaceholder('Hledaný výraz...', {exact:true}).last().fill(conditions[i].value);
  }
  if(conjunction!=='AND')await page.getByRole('button',{name:conjunction==='OR'?'OR (alespoň jedno)':'NOT (žádné)',exact:true}).first().click();
  const response=page.waitForResponse(isPage);await page.getByRole('button',{name:'Filtrovat výsledky',exact:true}).click();const r=await response;if(r.status()!==200)throw Error('Advanced query HTTP '+r.status());const result=await r.json();await expect(table.locator('tbody tr')).toHaveCount(Math.min(50,result.totalElements));return result;
 }
 const date=await apply([{field:'historicalDatingText',operator:'CONTAINS',value:input.dating.value}]);if(date.totalElements<1)throw Error('Historical dating text missing');checks.push('actual advanced historical dating text');
 const present=await apply([{field:'historicalDatingText',operator:'IS_NOT_EMPTY',value:''}]);if(present.totalElements<date.totalElements)throw Error('Dating presence dropped results');checks.push('historical dating presence');
 const and=await apply([{field:'historicalDatingText',operator:'CONTAINS',value:input.dating.value},{field:'inventoryNumber',operator:'EQUALS',value:input.dating.code}]);if(and.totalElements!==1)throw Error('Dating AND inventory mismatch');checks.push('combined AND');
 for(const [number,count] of [['Etn 62/2014',59],['Etn 11/99',86]]){const result=await apply([{field:'historicalAccessionNumber',operator:'EQUALS',value:number}]);if(result.totalElements!==count)throw Error('Accession count differs '+number);await expect(table.locator('tbody tr').first()).toContainText(number+' (DEMUS)');checks.push(number+' exact declared source links '+count);}
 const either=await apply([{field:'historicalAccessionNumber',operator:'EQUALS',value:'Etn 62/2014'},{field:'historicalAccessionNumber',operator:'EQUALS',value:'Etn 11/99'}],'OR');if(either.totalElements<86||either.totalElements>145)throw Error('Accession OR count invalid');checks.push('combined OR preserves multiplicity');
 await expect(table.locator('tbody tr')).toHaveCount(50);const filtered=page.url();await table.locator('tbody tr').first().getByRole('button').first().click();await page.waitForURL(/\/items\/(view|edit)\//);await page.getByRole('button',{name:'← Zpět na seznam',exact:true}).click();await expect(page).toHaveURL(filtered);checks.push('detail return preserves advanced filter');
 for(const sample of input.authorities??[]){
  const exact=await apply([{field:sample.field,operator:'EQUALS',value:sample.uuid},{field:'inventoryNumber',operator:'EQUALS',value:sample.code}]);if(exact.totalElements!==1)throw Error('Exact imported UUID missing');
  const text=await apply([{field:sample.field==='materialAuthorityId'?'material':'technique',operator:'CONTAINS',value:sample.query??sample.label},{field:'inventoryNumber',operator:'EQUALS',value:sample.code}]);if(text.totalElements!==1)throw Error('Current authority text missing');checks.push('current imported child UUID and accent-independent label '+sample.field);
 }
 await page.goto(base+'/admin/items?catalog=1');await expect(table.locator('tbody tr').nth(2)).toBeVisible();await verifyNeighbourNavigation(page,input.output);checks.push('previous/next geometry stable and return URL retained');
 await page.screenshot({path:input.output+'/final-history.png',fullPage:true});fs.writeFileSync(input.output+'/browser-result.json',JSON.stringify({status:'PASS',checks,liveUatVerified:false},null,2));
}catch(e){fs.writeFileSync(input.output+'/browser-result.json',JSON.stringify({status:'FAIL',checks,error:e.message},null,2));if(page)await page.screenshot({path:input.output+'/failure.png',fullPage:true}).catch(()=>{});process.exitCode=1;}finally{if(browser)await browser.close();if(server)await server.close();}
