import fs from 'node:fs';
import {chromium,expect} from '@playwright/test';
import {startSyntheticHttp} from './synthetic-http-proxy.mjs';
const input=JSON.parse(fs.readFileSync(process.argv[2],'utf8')),base='http://127.0.0.1:18213';const results=[];let server,browser;
const versions=[['before','../../u46/fe/dist'],['after',input.frontendRoot]];
try{
 for(const [name,options] of [['Chrome',{channel:'chrome'}],['Brave',{executablePath:'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe'}]]){
  browser=await chromium.launch({...options,headless:true});let reference;
  for(const [stage,root] of versions){
   server=await startSyntheticHttp({...input,frontendRoot:root});const context=await browser.newContext({viewport:{width:1920,height:1080}});await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());const page=await context.newPage();page.setDefaultTimeout(10000);
   await page.goto(base+'/login');await page.locator('input[type=text]').fill('gen-root');await page.locator('input[type=password]').fill(input.password);await page.getByRole('button',{name:'Autorizovaný vstup',exact:true}).click();await page.getByLabel('Katalog',{exact:true}).selectOption('1');await page.goto(base+'/admin/items/view/1001?catalog=1');await expect(page.locator('.curator-card-main')).toBeVisible();await page.waitForLoadState('networkidle');
   const sizes=[];
   for(const [width,height] of [[1920,1080],[1366,768],[1024,768],[768,1024],[390,844],[320,568]]){
    await page.setViewportSize({width,height});await page.evaluate(()=>scrollTo(0,0));const nav=page.getByRole('navigation',{name:'Hlavní menu'});const clip=await nav.boundingBox();const pin=page.locator('.demus-titlebar');const titlebar=await pin.boundingBox();
    const geometry=await page.evaluate(()=>{const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};return {width:innerWidth,pageWidth:document.documentElement.scrollWidth,nav:rect('.demus-menubar'),help:rect('.mes-help-trigger'),catalog:rect('select[aria-label="Katalog"]'),titlebar:rect('.demus-titlebar')};});
    expect(geometry.pageWidth).toBeLessThanOrEqual(width);sizes.push(geometry);
    await page.screenshot({path:`${input.output}/${name}-${stage}-nav-${width}.png`,clip});
    if([1920,390,320].includes(width))await page.screenshot({path:`${input.output}/${name}-${stage}-desktop-mobile-${width}.png`,mask:[page.locator('.curator-card-location output')],maskColor:'#e5eaf1'});
    if([1920,1366].includes(width)){const card=await page.locator('.curator-card-main').boundingBox();await page.screenshot({path:`${input.output}/${name}-${stage}-card-${width}.png`,clip:card,mask:[page.locator('.curator-card-location output')],maskColor:'#e5eaf1'});}
    if(stage==='after'){
     const help=page.getByRole('button',{name:'Nápověda MES',exact:true});await expect(help).toHaveCount(1);await expect(help.locator('svg')).toHaveCount(1);await expect(help).toHaveAttribute('title','Nápověda MES (Alt+H nebo F1 podle prohlížeče)');expect(geometry.help.right).toBeLessThanOrEqual(width);expect(geometry.nav.right-geometry.help.right).toBeLessThanOrEqual(10);
     const c=geometry.catalog,h=geometry.help;expect(h.x<c.right&&h.right>c.x&&h.y<c.bottom&&h.bottom>c.y).toBe(false);
     if(width<=760)expect(h.height).toBeGreaterThanOrEqual(44);if(width<=480)await expect(help.locator('.mes-help-trigger-label')).not.toBeVisible();
     const logout=page.getByRole('button',{name:'Odhlásit se',exact:true});await logout.focus();await page.keyboard.press('Tab');await expect(help).toBeFocused();expect(await help.evaluate(e=>parseFloat(getComputedStyle(e).outlineWidth))).toBeGreaterThanOrEqual(2);
     await page.keyboard.press('Alt+h');await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(help).toBeFocused();
    }
   }
   if(stage==='before')reference=sizes;else for(const w of [1920,1366])expect(sizes.find(s=>s.width===w).nav.height).toBe(reference.find(s=>s.width===w).nav.height);
   if(stage==='after'){
    await page.setViewportSize({width:1920,height:1080});await page.goto(base+'/admin/items/edit/1001?catalog=1&edit=professional');await expect(page.locator('#description')).toBeEnabled();await page.waitForLoadState('networkidle');
    const writes=[];page.on('request',r=>{if(r.url().includes('/api/v2/')&&!['GET','HEAD','OPTIONS'].includes(r.method()))writes.push(r.url());});const draft='Rozepsáno Update4.6.1 '+name;await page.locator('#description').fill(draft);const id=await page.locator('#current-author-authority').inputValue();await page.locator('[data-tab-name="Míry"]').click();await page.locator('#description').focus();
    for(const shortcut of ['F1','Alt+h']){await page.keyboard.press(shortcut);const help=page.getByRole('dialog');await expect(help.getByRole('heading',{name:'Míry a rozměry',exact:true})).toBeVisible();await help.getByRole('searchbox').fill('publikace');await page.keyboard.press('Alt+h');await expect(help.getByRole('searchbox')).toHaveValue('publikace');await expect(page.locator('dialog[open]')).toHaveCount(1);await page.keyboard.press('Escape');await expect(page.locator('#description')).toBeFocused();await expect(page.locator('#description')).toHaveValue(draft);await expect(page.locator('#current-author-authority')).toHaveValue(id);await expect(page.locator('[data-tab-name="Míry"]')).toHaveAttribute('aria-pressed','true');}
    await page.getByRole('button',{name:'Nápověda MES',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');await page.getByRole('button',{name:'Nápověda MES',exact:true}).focus();await page.keyboard.press('Control+Alt+h');await expect(page.locator('dialog[open]')).toHaveCount(0);expect(writes).toEqual([]);
   }
   results.push({browser:name,stage,version:browser.version(),sizes,checks:stage==='after'?['6 widths, single accessible book trigger, right edge, no overlap/overflow, desktop nav height preserved','F1 and Alt+H content events, button, context, Escape/focus, exact identity, active tab, draft, Ctrl+Alt exclusion, zero API writes']:['Update4.6 baseline screenshots']});
   await context.close();await server.close();server=null;
  }
  await browser.close();browser=null;
 }
 fs.writeFileSync(input.output+'/hotfix-browser.json',JSON.stringify({status:'PASS',results},null,2));
}catch(error){fs.writeFileSync(input.output+'/hotfix-browser.json',JSON.stringify({status:'FAIL',results,error:error.stack},null,2));throw error;}finally{await server?.close();await browser?.close();}
process.exit(0);
