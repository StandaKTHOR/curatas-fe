import fs from 'node:fs';
import {chromium,expect} from '@playwright/test';
import {startSyntheticHttp} from './synthetic-http-proxy.mjs';
import {closeTestChrome} from './close-test-chrome.mjs';
const input=JSON.parse(fs.readFileSync(process.argv[2],'utf8')),base='http://127.0.0.1:18213';let server,chrome,browser;
try{
 chrome=await chromium.launchServer({channel:'chrome',headless:true});browser=await chromium.connect(chrome.wsEndpoint());
 for(const version of ['update45','update46']){
  server=await startSyntheticHttp({...input,frontendRoot:version==='update45'?'../../u45/fe/dist':input.frontendRoot});
  const context=await browser.newContext({viewport:{width:1920,height:1080}});await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());const page=await context.newPage();
  await page.goto(base+'/login');await page.locator('input[type=text]').fill('gen-root');await page.locator('input[type=password]').fill(input.password);await page.getByRole('button',{name:'Autorizovaný vstup',exact:true}).click();await page.getByLabel('Katalog',{exact:true}).selectOption('1');
  for(const [width,height] of [[1920,1080],[1366,768]])for(const mode of ['view','edit']){
   await page.setViewportSize({width,height});await page.goto(base+`/admin/items/${mode}/1001?catalog=1`+(mode==='edit'?'&edit=professional':''));await expect(page.locator('.curator-card-main')).toBeVisible();await page.waitForLoadState('networkidle');
   await page.evaluate(()=>scrollTo(0,0));const clip=await page.locator('.curator-card-main').boundingBox();await page.screenshot({clip,path:`${input.output}/desktop-final-${version}-${width}-${mode}.png`,animations:'disabled',mask:[page.locator('.curator-card-location output')],maskColor:'#e5eaf1'});
  }
  await context.close();await server.close();server=null;
 }
 fs.writeFileSync(input.output+'/desktop-capture.json',JSON.stringify({status:'PASS',sameDatabase:true,versions:['ff34ef2','candidate'],viewports:[1920,1366],modes:['view','edit']},null,2));
}finally{await server?.close();await closeTestChrome(chrome);}
process.exit(0);
