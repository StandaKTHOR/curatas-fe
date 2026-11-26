import fs from 'node:fs';
import {chromium,expect} from '@playwright/test';
import {startSyntheticHttp} from './synthetic-http-proxy.mjs';
import {closeTestChrome} from './close-test-chrome.mjs';
const input=JSON.parse(fs.readFileSync(process.argv[2],'utf8')),base='http://127.0.0.1:18213',results=[];let server,chrome,browser;
try{
 server=await startSyntheticHttp(input);chrome=await chromium.launchServer({channel:'chrome',headless:false,args:['--window-size=1920,1080']});browser=await chromium.connect(chrome.wsEndpoint());const context=await browser.newContext({viewport:null});await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());const page=await context.newPage();
 await page.goto(base+'/login');await page.locator('input[type=text]').fill('gen-root');await page.locator('input[type=password]').fill(input.password);await page.getByRole('button',{name:'Autorizovaný vstup',exact:true}).click();await page.getByLabel('Katalog',{exact:true}).selectOption('1');await page.goto(base+'/admin/items/edit/1001?catalog=1&edit=professional');await expect(page.locator('#description')).toBeEnabled();await page.locator('#description').fill('Skutečný zoom - zachovaný draft');await page.evaluate(()=>{document.title='MES Update4.6 Zoom test';document.activeElement?.blur();});
 const baseDpr=await page.evaluate(()=>devicePixelRatio);fs.writeFileSync(input.output+'/zoom-ui2-ready.json',JSON.stringify({ready:true,geometry:await page.evaluate(()=>({inner:innerWidth,outer:outerWidth,dpr:devicePixelRatio}))}));
 const end=Date.now()+240000;
 for(const zoom of [1.25,1.5,2]){
  const marker=input.output+'/zoom-ui2-'+zoom+'.json';while(!fs.existsSync(marker)&&Date.now()<end)await new Promise(r=>setTimeout(r,300));if(!fs.existsSync(marker))throw Error('Native zoom deadline');
  const geometry=await page.evaluate(()=>({inner:innerWidth,outer:outerWidth,dpr:devicePixelRatio,scale:visualViewport.scale,width:document.documentElement.scrollWidth}));
  expect(geometry.dpr/baseDpr).toBeCloseTo(zoom,2);expect(geometry.scale).toBe(1);expect(geometry.width).toBeLessThanOrEqual(geometry.inner);await expect(page.locator('#description')).toHaveValue('Skutečný zoom - zachovaný draft');await page.screenshot({path:input.output+'/zoom-'+zoom+'.png',mask:[page.locator('.curator-card-location output')]});results.push({zoom,baseDpr,geometry,method:'Native Chrome keyboard zoom through Windows input; no deviceScaleFactor or CSS zoom'});fs.writeFileSync(input.output+'/zoom-progress.json',JSON.stringify(results));
 }
 fs.writeFileSync(input.output+'/zoom.json',JSON.stringify({status:'PASS',results},null,2));
}catch(error){fs.writeFileSync(input.output+'/zoom.json',JSON.stringify({status:'FAIL',results,error:error.stack},null,2));throw error;}finally{await server?.close();await closeTestChrome(chrome);}
process.exit(0);
