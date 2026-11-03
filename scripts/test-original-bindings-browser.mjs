// Generated PG17 application only. No mocked API responses, live credentials or remote hosts.
import {chromium} from '@playwright/test';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const input=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const backend=new URL(input.backend);if(backend.hostname!=='127.0.0.1'||backend.protocol!=='http:'||['5432','5547','8082','8084'].includes(backend.port))throw Error('Generated target required');
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'};
function server(root,port,proxy=false){
 root=path.resolve(root);
 const s=http.createServer((req,res)=>{
  if(req.url.startsWith('/api/')&&proxy){
   const remote=http.request(new URL(req.url,backend),{method:req.method,headers:{...req.headers,host:backend.host}},r=>{res.writeHead(r.statusCode,r.headers);r.pipe(res);});
   remote.on('error',()=>{res.writeHead(502);res.end();});req.pipe(remote);return;
  }
  const candidate=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
  if(!candidate.startsWith(root+path.sep)&&candidate!==root){res.writeHead(400);res.end();return;}
  const file=fs.existsSync(candidate)&&fs.statSync(candidate).isFile()?candidate:path.join(root,'index.html');
  res.setHeader('Content-Type',mime[path.extname(file)]??'application/octet-stream');fs.createReadStream(file).pipe(res);
 });
 return new Promise((resolve,reject)=>{s.once('error',reject);s.listen(port,'127.0.0.1',()=>resolve(s));});
}
let modern,old,browser,p;const checks=[],errors=[],requests=[],frames=[];
async function stableScreenshot(page,label){
 let previous=null;
 for(let n=0;n<6;n++){
  const current=await page.screenshot({animations:'disabled',caret:'hide'});
  frames.push({label,frame:n,sha256:crypto.createHash('sha256').update(current).digest('hex')});
  fs.writeFileSync(`${input.output}/${label}-frame-${n}.png`,current);
  if(previous?.equals(current))return current;
  previous=current;await page.waitForTimeout(150);
 }
 throw Error('Screenshot did not settle to two byte-identical frames: '+label);
}
async function loginStyles(page){return page.evaluate(()=>{
 const result=[];
 function visit(root){for(const n of root.children){
  const style=getComputedStyle(n),rect=n.getBoundingClientRect();
  result.push({tag:n.tagName,id:n.id,classes:String(n.className),rect:[rect.x,rect.y,rect.width,rect.height],styles:Object.fromEntries(Array.from(style).filter(k=>!k.startsWith('--')).sort().map(k=>[k,style.getPropertyValue(k)]))});
  visit(n);if(n.shadowRoot)visit(n.shadowRoot);
 }}visit(document.body);return result;
});}
async function rasterDifference(page,a,b){return page.evaluate(async([left,right])=>{
 const decode=async text=>createImageBitmap(new Blob([Uint8Array.from(atob(text),c=>c.charCodeAt(0))],{type:'image/png'}));
 const x=await decode(left),y=await decode(right);if(x.width!==y.width||x.height!==y.height)return {sameSize:false};
 const canvas=new OffscreenCanvas(x.width,x.height),context=canvas.getContext('2d');
 context.drawImage(x,0,0);const p=context.getImageData(0,0,x.width,x.height).data;
 context.clearRect(0,0,x.width,x.height);context.drawImage(y,0,0);const q=context.getImageData(0,0,x.width,x.height).data;
 let pixels=0,maxChannelDelta=0;for(let i=0;i<p.length;i+=4){let changed=false;for(let k=0;k<4;k++){const delta=Math.abs(p[i+k]-q[i+k]);maxChannelDelta=Math.max(delta,maxChannelDelta);changed ||= delta!==0;}if(changed)pixels++;}
 x.close();y.close();return {sameSize:true,pixels,maxChannelDelta};
},[a.toString('base64'),b.toString('base64')]);}
try{
 modern=await server(input.frontend,input.port,true);old=await server(input.baseline,0);
 browser=await chromium.launch({headless:true,args:['--disable-gpu']});
 const context=await browser.newContext({viewport:{width:1366,height:900},reducedMotion:'reduce'});
 await context.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
 p=await context.newPage();p.setDefaultTimeout(12000);p.on('pageerror',e=>errors.push(e.message));
 p.on('response',r=>{if(new URL(r.url()).pathname.startsWith('/api/'))requests.push({path:new URL(r.url()).pathname,status:r.status(),method:r.request().method()});});
 await p.goto(`http://127.0.0.1:${old.address().port}/login`);await p.getByRole('heading',{name:'Evidenční systém MES'}).waitFor();await p.evaluate(()=>document.fonts.ready);
 await p.waitForLoadState('networkidle');const before=await stableScreenshot(p,'original-login');fs.writeFileSync(input.output+'/original-login.png',before);
 const originalStyles=await loginStyles(p);fs.writeFileSync(input.output+'/original-login-computed.json',JSON.stringify(originalStyles,null,2));
 const base=`http://127.0.0.1:${input.port}`;
 await p.goto(base+'/login');await p.getByRole('heading',{name:'Evidenční systém MES'}).waitFor();await p.evaluate(()=>document.fonts.ready);
 await p.waitForLoadState('networkidle');const after=await stableScreenshot(p,'integrated-login');fs.writeFileSync(input.output+'/integrated-login.png',after);
 const integratedStyles=await loginStyles(p);fs.writeFileSync(input.output+'/integrated-login-computed.json',JSON.stringify(integratedStyles,null,2));
 const stylesEqual=JSON.stringify(originalStyles)===JSON.stringify(integratedStyles),raster=await rasterDifference(p,before,after);
 // Explicit raster allowance ONLY with every computed property/rectangle equal, including shadow DOM.
 // Preserve/report raw screenshot hashes. This does not alter source/CSS byte checks or claim pixel identity.
 const equivalent=stylesEqual&&raster.sameSize&&raster.pixels<=32&&raster.maxChannelDelta<=1;
 checks.push({name:'original-login-computed-style-and-raster-comparison',pass:equivalent,stylesEqual,pixelIdentical:raster.pixels===0,raster,
  rasterContract:'All DOM/shadow styles and rectangles exact; at most 32 edge pixels differing by one channel unit. Human visual acceptance remains required.',
  originalSha256:crypto.createHash('sha256').update(before).digest('hex'),integratedSha256:crypto.createHash('sha256').update(after).digest('hex')});
 if(!equivalent)throw Error('Original login visual regression');
 await p.evaluate(token=>{localStorage.setItem('token',token);localStorage.setItem('loginTime',String(Date.now()));},input.token);
 await p.goto(base+'/admin/items?catalog=11');await p.getByLabel('Katalog',{exact:true}).selectOption('11');
 await p.getByRole('button',{name:'SYNTH 0001',exact:false}).first().waitFor();checks.push({name:'real-scoped-list',pass:true});
 await p.goto(base+'/admin/items/edit/101?catalog=11&edit=professional');
 await p.getByRole('navigation',{name:'Karty DEMUS'}).waitFor();
 const tabs=p.getByRole('navigation',{name:'Karty DEMUS'}).getByRole('button');if(await tabs.count()!==20)throw Error('Original 20 tabs changed');checks.push({name:'20-original-tabs',pass:true});
 await p.getByRole('button',{name:'MatTech',exact:true}).click();
 const refs=p.getByRole('region',{name:'Současné číselníkové vazby'});
 await refs.getByLabel('Materiál — úroveň 1').selectOption(input.root);
 await refs.getByLabel('Materiál — úroveň 2').selectOption(input.child);
 await refs.getByLabel('Materiál — úroveň 3').selectOption(input.leaf);
 await refs.getByRole('button',{name:'Přidat vazbu'}).click();await refs.getByText('Materiál: GENERATED leaf',{exact:false}).waitFor();
 checks.push({name:'three-level-selection-real-PG-save',pass:true});
 await p.reload();await p.getByRole('button',{name:'MatTech',exact:true}).click();
 await p.getByText('Materiál: GENERATED leaf',{exact:false}).waitFor();checks.push({name:'reload-persisted-association',pass:true});
 await p.getByRole('region',{name:'Současné číselníkové vazby'}).getByRole('button',{name:'Odebrat vazbu'}).click();
 await p.getByText('Žádné současné číselníkové vazby.',{exact:false}).waitFor();checks.push({name:'remove-persisted-association',pass:true});
 await p.screenshot({path:input.output+'/generated-mattech.png',fullPage:true});
 await p.getByRole('button',{name:'Foto',exact:true}).click();
 await p.getByRole('button',{name:'Náhled',exact:true}).first().click();
 const dialog=p.getByRole('dialog',{name:'Náhled fotografie'});
 await dialog.getByRole('img').waitFor();
 await dialog.getByRole('img').evaluate(image=>image.decode());
 if(!await dialog.getByRole('img').evaluate(image=>image.naturalWidth===1&&image.naturalHeight===1))throw Error('Generated private image was not decoded');
 await dialog.getByRole('button',{name:'Zavřít náhled'}).click();
 checks.push({name:'private-photo-real-PG-API-browser-decode',pass:true});
 if(errors.length)throw Error('JavaScript page error');checks.push({name:'no-JavaScript-page-errors',pass:true});
 fs.writeFileSync(input.output+'/browser-result.json',JSON.stringify({status:'PASS',data:'GENERATED_ONLY_NOT_POLAKOVA',checks,errors,requests,frames},null,2));
}catch(e){if(p){fs.writeFileSync(input.output+'/generated-failure.txt',await p.locator('body').innerText());await p.screenshot({path:input.output+'/generated-failure.png',fullPage:true});}fs.writeFileSync(input.output+'/browser-result.json',JSON.stringify({status:'FAIL',data:'GENERATED_ONLY_NOT_POLAKOVA',checks,errors,requests,frames,failure:e.message},null,2));throw e;}
finally{await browser?.close();if(modern)await new Promise(r=>modern.close(r));if(old)await new Promise(r=>old.close(r));}
