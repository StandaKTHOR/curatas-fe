// Real Chrome + production assets + owned Update4.4 JAR. No API response mocks.
import fs from 'node:fs';
import {chromium,expect} from '@playwright/test';
import {startSyntheticHttp} from './synthetic-http-proxy.mjs';
const input=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const base='http://127.0.0.1:18213';
const geometries=[],checks=[];let app,browser;
try{
 app=await startSyntheticHttp(input);
 browser=await chromium.launch({channel:'chrome',headless:true});
 const context=await browser.newContext({viewport:{width:1920,height:1080}});
 await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 const page=await context.newPage();page.setDefaultTimeout(8000);
 await page.goto(base+'/login');
 await page.locator('input[type=text]').fill('gen-root');await page.locator('input[type=password]').fill(input.password);
 await page.getByRole('button',{name:'Autorizovaný vstup',exact:true}).click();
 await page.getByLabel('Katalog',{exact:true}).selectOption('1');
 async function geometry(label){
  const value=await page.evaluate(()=>{
   const box=s=>{const el=document.querySelector(s);const {x,y,width,height,bottom,right}=el.getBoundingClientRect();return {x,y,width,height,bottom,right};};
   const select=document.querySelector('.curator-card-material select');const style=select&&getComputedStyle(select);
   return {viewport:innerWidth,pageWidth:document.documentElement.scrollWidth,left:box('.curator-card-column'),right:box('.curator-card-column + .curator-card-column'),selectStyle:style?{height:style.height,minHeight:style.minHeight,padding:style.padding,margin:style.margin,lineHeight:style.lineHeight,fontSize:style.fontSize}:null,panels:[...document.querySelectorAll('.curator-card-column > .curator-card-panel')].map(el=>{const {x,y,width,height,bottom}=el.getBoundingClientRect();return {label:el.getAttribute('aria-label'),x,y,width,height,bottom};})};
  });geometries.push({label,...value});return value;
 }
 async function photo(name){await page.screenshot({path:input.output+'/'+name+'.png',fullPage:true,animations:'disabled',mask:[page.locator('.curator-card-location output')],maskColor:'#e5eaf1'});}
 for(const mode of ['view','edit']){
  await page.goto(base+'/admin/items/'+mode+'/1001?catalog=1'+(mode==='edit'?'&edit=professional':''));
  await expect(page.locator('.item-identity-pin')).toBeVisible();
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('navigation',{name:'Karty DEMUS'}).getByRole('button')).toHaveCount(20);
  for(const [width,height] of [[2560,1440],[1920,1080],[1366,768],[1024,768],[640,768]]){
   await page.setViewportSize({width,height});await page.evaluate(()=>scrollTo(0,0));
   const start=await geometry(mode+'-'+width+'-closed');
   expect(start.pageWidth).toBeLessThanOrEqual(width);
   if(mode==='edit'){
    const editorWidths=await page.locator('.curator-card-identification select:visible').evaluateAll(list=>list.map(el=>({label:el.getAttribute('aria-label')||el.id,width:el.getBoundingClientRect().width})));
    for(const field of editorWidths)expect(field.width,field.label).toBeGreaterThanOrEqual(100);
   }
   if(width>760){expect(Math.abs(start.left.y-start.right.y)).toBeLessThan(1);expect(Math.abs(start.left.width/start.right.width-42/58)).toBeLessThan(0.02);}
   const material=page.locator('.curator-card-material-row > details').nth(0);
   const technique=page.locator('.curator-card-material-row > details').nth(1);
   if(width===1920||width===1366)await photo('layout-'+mode+'-'+width+'-closed');
   for(let cycle=0;cycle<10;cycle++){
    for(const [kind,details] of [['material',material],['technique',technique]]){
     await details.locator(':scope > summary').click();
     await expect(details).toHaveAttribute('open','');
     const open=await geometry(mode+'-'+width+'-'+kind+'-open-'+cycle);
     expect(open.left.width).toBeCloseTo(start.left.width,0);expect(open.left.x).toBeCloseTo(start.left.x,0);
     expect(open.right.width).toBeCloseTo(start.right.width,0);expect(open.pageWidth).toBeLessThanOrEqual(width);
     if(cycle===0&&(width===1920||width===1366))await photo('layout-'+mode+'-'+width+'-'+kind);
     await details.locator(':scope > summary').click();
     const closed=await geometry(mode+'-'+width+'-'+kind+'-closed-'+cycle);
     expect(closed.right.height).toBeCloseTo(start.right.height,0);
    }
   }
   await material.locator(':scope > summary').click();await technique.locator(':scope > summary').click();
   const both=await geometry(mode+'-'+width+'-both');expect(both.pageWidth).toBeLessThanOrEqual(width);
   await material.locator(':scope > summary').click();await technique.locator(':scope > summary').click();
   await page.evaluate(()=>scrollTo(0,600));
   const pin=await page.locator('.item-identity-pin').evaluate(el=>({top:el.getBoundingClientRect().top,position:getComputedStyle(el).position}));
   expect(pin.position).toBe('sticky');expect(pin.top).toBeGreaterThanOrEqual(0);
  }
  checks.push(mode+': five viewports; 10 cycles per dictionary per viewport, simultaneous disclosure, restored height, stable widths, sticky identity');
 }
 await page.goto(base+'/admin/items/new?catalog=1');
 await expect(page.getByLabel('Inventární číslo: Hlavní číslo',{exact:true})).toBeVisible();
 await photo('layout-new-item');checks.push('New item uses the same panels and original editors');
 fs.writeFileSync(input.output+'/layout.json',JSON.stringify({status:'PASS',chrome:browser.version(),apiResponsesMocked:false,checks,geometries},null,2));
}catch(error){fs.writeFileSync(input.output+'/layout.json',JSON.stringify({status:'FAIL',error:error.stack,checks,geometries},null,2));throw error;}
finally{await browser?.close();await app?.close();}
