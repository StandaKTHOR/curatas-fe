import {startSyntheticHttp} from './synthetic-http-proxy.mjs';
import {chromium,expect} from '@playwright/test';
import fs from 'node:fs';
const input=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));let server,browser,page;const checks=[],writes=[];
try{
 server=await startSyntheticHttp(input);browser=await chromium.launch({channel:'chrome',headless:true});
 const context=await browser.newContext();await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());page=await context.newPage();page.setDefaultTimeout(12000);
 await page.goto('http://127.0.0.1:18213/login');await page.locator('input[type=text]').fill('gen-root');await page.locator('input[type=password]').fill(input.password);await page.getByRole('button',{name:'Autorizovaný vstup',exact:true}).click();await page.getByLabel('Katalog',{exact:true}).selectOption('1');
 page.on('request',r=>{if(['POST','PUT','PATCH','DELETE'].includes(r.method())&&r.url().includes('/professional-registers'))writes.push(r.method());});
 await page.goto('http://127.0.0.1:18213/admin/iso-states?catalog=1');const iso=page.getByRole('region',{name:'Stavy ISO',exact:true});
 await expect(iso).toContainText('BLOCKED');await expect(iso.locator('[data-professional-history]')).toHaveCount(5);
 for(const value of input.iso){await expect(iso).toContainText(value.code);if(value.label)await expect(iso).toContainText(value.label);}
 await iso.getByLabel('Hledat historickou hodnotu',{exact:true}).fill(input.iso[0].label||input.iso[0].code);
 await expect(iso.locator('[data-professional-history]')).toHaveCount(1);await iso.getByText('Detail historické položky',{exact:true}).click();await expect(iso).toContainText(input.iso[0].code);checks.push('five exact archived ISO states; search/detail; current write blocked');
 await page.getByRole('link',{name:'Literatura',exact:true}).click();const literature=page.getByRole('region',{name:'Literatura',exact:true});
 await literature.getByText('Historická Literatura DEMUS — pouze čtení',{exact:true}).click();await expect(literature.getByRole('region',{name:'Historické hodnoty odborné evidence'})).toContainText(input.title);checks.push('exact archived literature title displayed separately from current authorities');
 expect(writes).toHaveLength(0);fs.writeFileSync(input.output+'/browser-result.json',JSON.stringify({status:'PASS',browser:'Chrome',checks,registryWrites:0,uatVerified:false},null,2));
}catch(e){fs.writeFileSync(input.output+'/browser-result.json',JSON.stringify({status:'FAIL',checks,error:e.message},null,2));throw e;}
finally{if(browser)await browser.close();if(server)await server.close();}
