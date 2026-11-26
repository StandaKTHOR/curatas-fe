import {startSyntheticHttp} from './synthetic-http-proxy.mjs';
import {chromium,expect as browserExpect} from '@playwright/test';
import fs from 'node:fs';
const expect=browserExpect.configure({timeout:15000});
const input=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
if(input.dataKind!=='ACTUAL_POLAKOVA_VOCABULARY_FIXTURE')throw Error('Owned archival fixture required');
const base='http://127.0.0.1:18213',checks=[],created=[];let server,browser,page;
try{
 server=await startSyntheticHttp(input);browser=await chromium.launch({channel:'chrome',headless:true});page=await browser.newPage({viewport:{width:1366,height:900}});page.setDefaultTimeout(15000);
 await page.goto(base+'/login');await page.locator('input[type="text"]').fill('gen-root');await page.locator('input[type="password"]').fill(input.password);await page.getByRole('button',{name:'Autorizovaný vstup',exact:true}).click();await page.getByLabel('Katalog',{exact:true}).selectOption('1');
 await page.getByRole('link',{name:'Správa číselníků',exact:true}).click();
 const selector=page.getByLabel('Typ číselníku');
 for(const type of ['MATERIAL','TECHNIQUE']){
  const label='GENERATED FINAL authority '+type,code='FINAL_SMOKE_'+type;
  await selector.selectOption(type);await expect(page.getByRole('button',{name:'Nová současná položka',exact:true})).toBeEnabled();
  async function open(name){await page.getByRole('button',{name:'Nová současná položka',exact:true}).click();await page.locator('#dictLabel').fill(name);await page.locator('#dictCode').fill(code);}
  const response=()=>page.waitForResponse(r=>r.request().method()==='POST'&&new URL(r.url()).pathname.endsWith('/dictionaries/'+type+'/values'));
  await open(label);let pending=response();await page.getByRole('button',{name:'Přidat a vybrat',exact:true}).click();let result=await pending;if(result.status()!==201)throw Error(type+' create HTTP '+result.status());const value=await result.json();created.push({type,id:value.id,label});
  await expect(page.locator('#dictLabel')).toHaveCount(0);await expect(page.getByRole('row').filter({has:page.getByRole('cell',{name:label,exact:true})})).toContainText(value.id);
  await page.reload();await selector.selectOption(type);await expect(page.getByRole('row').filter({has:page.getByRole('cell',{name:label,exact:true})})).toContainText(value.id);checks.push(type+' actual current administration create, GET, list and reload');
  const duplicate='generated   final authority '+type.toLowerCase();await open(duplicate);pending=response();await page.getByRole('button',{name:'Přidat a vybrat',exact:true}).click();result=await pending;if(result.status()!==409)throw Error(type+' normalized duplicate HTTP '+result.status());await expect(page.locator('#dictLabel')).toHaveValue(duplicate);await expect(page.locator('#dictCode')).toHaveValue(code);checks.push(type+' normalized duplicate rejected with draft retained');
  await page.goto(base+'/admin/dictionaries?catalog=1');await selector.selectOption(type);await expect(page.getByRole('row').filter({has:page.getByRole('cell',{name:label,exact:true})})).toHaveCount(1);
 }
 await page.screenshot({path:input.output+'/dictionary-admin.png',fullPage:true});fs.writeFileSync(input.output+'/browser-result.json',JSON.stringify({status:'PASS',checks,created,liveUatVerified:false},null,2));
}catch(error){fs.writeFileSync(input.output+'/browser-result.json',JSON.stringify({status:'FAIL',checks,error:error.message},null,2));if(page)await page.screenshot({path:input.output+'/failure.png',fullPage:true}).catch(()=>{});process.exitCode=1;}finally{if(browser)await browser.close();if(server)await server.close();}
