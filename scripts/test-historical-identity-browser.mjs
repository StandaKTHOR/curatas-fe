// Only read-only browser operations on two explicitly supplied archival excerpts.
import {startSyntheticHttp} from './synthetic-http-proxy.mjs';
import {chromium,expect} from '@playwright/test';
import fs from 'node:fs';
const input=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));let browser,server,page;const checks=[],requests=[];
try{
 server=await startSyntheticHttp(input);browser=await chromium.launch({headless:true});page=await browser.newPage({viewport:{width:1366,height:900}});
 page.on('response',r=>{if(new URL(r.url()).pathname.startsWith('/api/'))requests.push({path:new URL(r.url()).pathname,status:r.status()});});await page.goto('http://127.0.0.1:18213/login');await page.locator('input[type="text"]').fill('gen-reader');await page.locator('input[type="password"]').fill(input.password);await page.getByRole('button',{name:'Autorizovaný vstup',exact:true}).click();await page.getByLabel('Katalog',{exact:true}).selectOption('1');await page.getByRole('table',{name:'Sbírky — tabulkové zobrazení'}).waitFor();
 for(const [id,ordinal] of [[1001,'3'],[1002,'4']]){
  await page.goto(`http://127.0.0.1:18213/admin/items/view/${id}?catalog=1`);const panel=page.getByLabel('Historické zdrojové složky',{exact:true});await expect(panel).toContainText('CZE');await expect(panel).toContainText('6MM');
  for(const [label,value] of [['Řada','N'],['Pořadové číslo',ordinal],['Lomení','_'],['Oddělení','E'],['Hlavní pořadové číslo','—']])await expect(panel.locator('div').filter({has:page.getByText(label,{exact:true})}).locator('span')).toHaveText(value);
  await page.screenshot({path:input.output+`/archived-N${ordinal}.png`,fullPage:true});checks.push({reference:`N ${ordinal}_CZE6MM E`,pass:true,targetIsIsolatedFixture:true});
 }
 fs.writeFileSync(input.output+'/browser-result.json',JSON.stringify({status:'PASS',checks,liveQaVerified:false},null,2));
}catch(e){if(page){await page.screenshot({path:input.output+'/failure.png',fullPage:true});fs.writeFileSync(input.output+'/failure.txt',await page.locator('body').innerText());}fs.writeFileSync(input.output+'/browser-result.json',JSON.stringify({status:'FAIL',checks,requests,error:e.message},null,2));process.exitCode=1;}
finally{if(browser)await browser.close();if(server)await server.close();}
