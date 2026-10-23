/** Local test harness only: Vite + a new headless browser, against the Java-owned synthetic PG fixture. */
import { createServer } from 'vite';
import { chromium, expect } from '@playwright/test';
import { readFile, writeFile, access } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import assert from 'node:assert/strict';
const fixture = JSON.parse(await readFile(process.argv[2], 'utf8'));
const evidence = process.argv[3];
process.env.VITE_API_BASE = fixture.backend;
process.env.VITE_SCOPED_WORKSPACE_ENABLED = 'true';
const scenarios = [], requests = [], hashes = {}, scopedRequests = [], externalRequests = [], assetRequests = [];
let scopedPhase=false;
const record = name => { scenarios.push(name); console.log('PASS '+name); };
let vite, browser, page;
const watchdog=setTimeout(async()=>{console.error('Owned smoke deadline exceeded');if(browser)await browser.close();if(vite)await vite.close();process.exit(2);},110000);watchdog.unref();
try {
    vite = await createServer({ root: process.cwd(), server: { host:'127.0.0.1', port:18183, strictPort:true, fs:{allow:[process.cwd(),realpathSync(path.join(process.cwd(),'node_modules'))]} } }); await vite.listen();
    browser = await chromium.launch({ headless:true });
    const context = await browser.newContext({ acceptDownloads:true, viewport:{width:1360,height:980} });
    page = await context.newPage();page.setDefaultTimeout(12000);
    page.on('request',request=>{if(!scopedPhase)return;const url=new URL(request.url());if(url.origin===new URL(fixture.backend).origin)scopedRequests.push({method:request.method(),path:url.pathname});else if(url.protocol.startsWith('http')&&url.origin!=='http://127.0.0.1:18183'){if(request.resourceType()==='stylesheet'&&url.origin==='https://fonts.googleapis.com'&&url.pathname==='/css')assetRequests.push(url.origin+url.pathname);else externalRequests.push(url.origin+url.pathname);}});
    page.on('response',r=>{ if(r.url().startsWith(fixture.backend)) requests.push({method:r.request().method(),path:new URL(r.url()).pathname,status:r.status()}); });
    await page.goto('http://127.0.0.1:18183/login');
    await page.getByPlaceholder('např. novak_k').fill(fixture.username);
    await page.locator('input[type=password]').fill(fixture.password);
    await page.getByRole('button',{name:'Autorizovaný vstup'}).click();
    await page.waitForURL('**/admin/items');record('1 real login with test-only credentials');
    await page.waitForLoadState('networkidle');
    await page.getByRole('link',{name:'Katalogová pracovní plocha',exact:true}).click();scopedPhase=true;
    await page.locator('#catalog-context').selectOption('11');record('2 explicit catalog selection/revalidation');
    await page.getByLabel('Hledat název',{exact:true}).fill('PAGE');await page.getByRole('button',{name:'Vyhledat předměty',exact:true}).click();
    await expect(page.getByRole('button',{name:/PAGE 1000/})).toBeVisible();await expect(page.getByRole('button',{name:/PAGE 1050/})).toHaveCount(0);
    await page.getByRole('button',{name:'Další předměty',exact:true}).click();await expect(page.getByRole('button',{name:/PAGE 1050/})).toBeVisible();record('19 real server cursor pagination51 rows');
    await page.getByLabel('Hledat název',{exact:true}).fill('SYNTHETIC 101');await page.getByLabel('Hledat inventární číslo',{exact:true}).fill('0001');await page.getByRole('button',{name:'Vyhledat předměty',exact:true}).click();
    await expect(page.getByRole('button',{name:/SYNTHETIC 101/})).toBeVisible();await expect(page.getByRole('button',{name:/PAGE 1000/})).toHaveCount(0);record('20 combined title/inventory search');
    await page.getByRole('button',{name:'Vymazat filtry',exact:true}).click();await expect(page.getByLabel('Hledat inventární číslo',{exact:true})).toHaveValue('');await expect(page.getByRole('button',{name:/PAGE 1000/})).toBeVisible();record('21 filter reset resets cursor and selection');
    await page.getByRole('button',{name:/SYNTHETIC 101/}).click();record('3 scoped item list');
    await page.getByRole('button',{name:'Načíst inventární souvislosti',exact:true}).click();await expect(page.getByTestId('source-local-id')).toHaveText('SYNTHETIC-000101');
    assert.equal(await page.getByTestId('inventory-alias').first().textContent(),'  ALIAS0000  ');await expect(page.getByText('0007',{exact:true}).first()).toBeVisible();record('22 read-only exact native identity and aliases');

    await expect(page.getByTestId('item-etag')).toHaveText('"0"');
    assert.equal(await page.getByTestId('current-inventory').textContent(),' 0001 ');record('4 scoped detail with exact native inventory');
    await page.getByRole('button',{name:'Upravit předmět',exact:true}).click();await page.getByLabel('Název předmětu',{exact:true}).fill('SYNTHETIC EDITED');
    await page.getByRole('button',{name:'Uložit předmět',exact:true}).click();await expect(page.getByTestId('item-etag')).toHaveText('"1"');record('5 scalar PATCH with If-Match');
    await page.reload();await page.locator('#catalog-context').selectOption('11');await page.getByRole('button',{name:/SYNTHETIC EDITED/}).click();await expect(page.getByTestId('item-etag')).toHaveText('"1"');record('23 full reload proves item persistence');

    await page.getByRole('button',{name:'Upravit předmět',exact:true}).click();await page.getByLabel('Název předmětu',{exact:true}).fill('SYNTHETIC DRAFT');
    await page.evaluate(async()=>{ const {scopedApi}=await import('/src/features/scoped/scopedApi.ts');const api=scopedApi(11,localStorage.getItem('token'));const s=new AbortController().signal;const current=await api.detail(101,s);await api.patch(101,current.etag,{title:'SYNTHETIC OTHER EDITOR'},s); });
    await page.getByRole('button',{name:'Uložit předmět',exact:true}).click();await expect(page.getByRole('button',{name:'Načíst server pro porovnání'})).toBeVisible();
    await page.getByRole('button',{name:'Načíst server pro porovnání'}).click();await expect(page.getByText('SYNTHETIC OTHER EDITOR',{exact:true})).toBeVisible();await expect(page.getByLabel('Název předmětu',{exact:true})).toHaveValue('SYNTHETIC DRAFT');
    await page.getByRole('button',{name:'Zrušit editaci předmětu',exact:true}).click();record('6 real stale ETag412, reload/compare preserves draft');
    await page.getByRole('button',{name:/historical: 12.30/}).click();await expect(page.getByText('Tento rozměr je pouze pro čtení.')).toBeVisible();record('7 historical dimension list/detail read-only');
    // Refresh child ETag after the independent item PATCH, then create without rounding.
    await page.getByRole('button',{name:'Obnovit rozměry',exact:true}).click();await expect(page.getByRole('button',{name:'Nový rozměr'})).toBeEnabled();
    await page.getByRole('button',{name:'Nový rozměr'}).click();await page.getByLabel('Typ rozměru',{exact:true}).fill('SYNTHETIC height');await page.getByLabel('Hodnota rozměru',{exact:true}).fill('123456789012345678901234567890123456.78');
    await page.getByRole('button',{name:'Uložit rozměr',exact:true}).click();await expect(page.getByRole('button',{name:'Upravit rozměr'})).toBeVisible();record('8 dimension create exact numeric38,2 with parent ETag');
    await page.getByRole('button',{name:'Upravit rozměr'}).click();await page.getByLabel('Hodnota rozměru',{exact:true}).fill('12.30');await page.getByRole('button',{name:'Uložit rozměr',exact:true}).click();await expect(page.getByRole('button',{name:'Upravit rozměr'})).toBeVisible();record('9 scoped dimension PATCH');
    await page.getByRole('button',{name:'original.png',exact:true}).click();await page.getByRole('button',{name:'Náhled obrázku'}).click();await expect(page.getByRole('img',{name:/Soukromý obrázek/})).toBeVisible();
    assert(await page.getByRole('img',{name:/Soukromý obrázek/}).evaluate(img=>img.naturalWidth>0));record('10 actual thumbnail blob decoded by browser');
    await page.getByRole('button',{name:'Otevřít obrázek'}).click();await expect(page.getByRole('img',{name:/Soukromý obrázek/})).toBeVisible();record('11 original private image');
    const byteEvidence=await page.evaluate(async fixture=>{
        const {scopedApi}=await import('/src/features/scoped/scopedApi.ts');const api=scopedApi(11,localStorage.getItem('token'));const s=new AbortController().signal;
        const hash=async b=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await b.arrayBuffer())),x=>x.toString(16).padStart(2,'0')).join('');
        const image=await api.mediaDetail(101,fixture.imageId,s),doc=await api.mediaDetail(101,fixture.documentId,s);
        return {original:await hash(await api.bytes(101,image,'content',s)),thumbnail:await hash(await api.bytes(101,image,'thumbnail',s)),document:await hash(await api.bytes(101,doc,'content',s))};
    },fixture);
    assert.equal(byteEvidence.original,fixture.originalSha256);assert.equal(byteEvidence.thumbnail,fixture.thumbnailSha256);assert.equal(byteEvidence.document,fixture.documentSha256);Object.assign(hashes,byteEvidence);record('12 exact original/thumbnail/document SHA256 via real frontend transport and browser CORS');
    await page.getByRole('button',{name:'local.pdf',exact:true}).click();const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'Stáhnout originál'}).click();const download=await downloaded;
    const stream=await download.createReadStream(),hash=createHash('sha256');for await(const bytes of stream)hash.update(bytes);assert.equal(hash.digest('hex'),fixture.documentSha256);assert.equal(download.suggestedFilename(),'local.pdf');record('13 real browser document download, exact bytes');
    await page.getByRole('link',{name:'Správa materiálů a technik',exact:true}).click();await page.getByRole('button',{name:'Přidat hodnotu',exact:true}).click();
    await page.getByLabel('Název hodnoty',{exact:true}).fill('  Nový Ω  ');await page.getByLabel('Kód hodnoty',{exact:true}).fill('NX');await page.getByLabel('Nadřazená hodnota',{exact:true}).selectOption({label:'SYNTHETIC WOOD'});await page.getByLabel('Důvod změny',{exact:true}).fill('SYNTHETIC create');
    await page.getByRole('button',{name:'Uložit hodnotu',exact:true}).click();await expect(page.getByTestId('dictionary-etag')).toHaveText('"0"');assert.equal(await page.getByTestId('dictionary-server-label').textContent(),'  Nový Ω  ');record('24 create catalog UUID material with explicit parent');
    await page.reload();await page.locator('#catalog-context').selectOption('11');await page.getByRole('button',{name:'Nový Ω',exact:true}).click();await expect(page.getByTestId('dictionary-server-label')).toBeVisible();record('25 reload proves material persistence');
    await page.getByRole('button',{name:'Upravit hodnotu',exact:true}).click();await page.getByLabel('Název hodnoty',{exact:true}).fill('Můj návrh Ω');await page.getByLabel('Důvod změny',{exact:true}).fill('SYNTHETIC edit');
    await page.evaluate(async()=>{const {catalogDictionaries}=await import('/src/features/catalog/dictionaryApi.ts');const api=catalogDictionaries(11,localStorage.getItem('token'));const s=new AbortController().signal;const value=(await api.list('MATERIAL',{q:'NX'},s)).items[0];await api.update('MATERIAL',value.id,'"0"',{label:'Souběžně',code:'NX',parentId:value.parentId,reason:'SYNTHETIC concurrent'},s);});
    await page.getByRole('button',{name:'Uložit hodnotu',exact:true}).click();await expect(page.getByText(/Draft zůstal zachován; zápis se neopakuje/)).toBeVisible();await expect(page.getByLabel('Název hodnoty',{exact:true})).toHaveValue('Můj návrh Ω');
    await page.getByRole('button',{name:'Porovnat hodnotu se serverem',exact:true}).click();await expect(page.getByTestId('dictionary-server-label')).toHaveText('Souběžně');await page.getByRole('button',{name:'Potvrdit porovnání hodnoty',exact:true}).click();await page.getByRole('button',{name:'Uložit hodnotu',exact:true}).click();await expect(page.getByTestId('dictionary-etag')).toHaveText('"2"');record('26 dictionary real412 draft comparison and explicit save');
    await page.reload();await page.locator('#catalog-context').selectOption('11');await page.getByRole('button',{name:'Můj návrh Ω',exact:true}).click();await expect(page.getByTestId('dictionary-server-label')).toHaveText('Můj návrh Ω');record('27 reload proves dictionary conflict resolution persisted');
    await page.getByLabel('Typ číselníku',{exact:true}).selectOption('TECHNIQUE');await page.getByRole('button',{name:'Přidat hodnotu',exact:true}).click();await page.getByLabel('Název hodnoty',{exact:true}).fill('Nová technika Ω');await page.getByLabel('Důvod změny',{exact:true}).fill('SYNTHETIC technique');await page.getByRole('button',{name:'Uložit hodnotu',exact:true}).click();await expect(page.getByTestId('dictionary-server-label')).toHaveText('Nová technika Ω');record('28 technique creation uses separate typed UUID namespace');
    const readonlyContext=await browser.newContext();try{const readonly=await readonlyContext.newPage();await readonly.addInitScript(token=>localStorage.setItem('token',token),fixture.readerToken);await readonly.goto('http://127.0.0.1:18183/scoped/dictionaries');await readonly.locator('#catalog-context').selectOption('11');await expect(readonly.getByRole('button',{name:'SYNTHETIC WOOD',exact:true})).toBeVisible();await expect(readonly.getByRole('button',{name:'Přidat hodnotu',exact:true})).toHaveCount(0);await readonly.getByRole('button',{name:'SYNTHETIC WOOD',exact:true}).click();await expect(readonly.getByTestId('dictionary-server-label')).toBeVisible();await expect(readonly.getByRole('button',{name:'Upravit hodnotu',exact:true})).toHaveCount(0);}finally{await readonlyContext.close();}record('29 read-only principal UI has no dictionary write actions');
    await page.getByRole('link',{name:'Zpět na předměty',exact:true}).click();await page.getByRole('button',{name:/SYNTHETIC OTHER EDITOR/}).click();
    await page.evaluate(()=>window.scrollTo(0,0));
    await page.screenshot({path:path.join(evidence,'scoped-workspace.png'),fullPage:true});
    const negative=await page.evaluate(async fixture=>{
        const {scopedApi}=await import('/src/features/scoped/scopedApi.ts');const api=scopedApi(11,localStorage.getItem('token'));const result=[];const local=await api.mediaDetail(101,fixture.imageId,new AbortController().signal);
        for(const operation of [()=>api.detail(303,new AbortController().signal),()=>api.mediaDetail(101,fixture.foreignId,new AbortController().signal),()=>api.bytes(101,{...local,id:fixture.foreignId},'content',new AbortController().signal)]){try{await operation();result.push('LEAK');}catch(e){result.push(e.status);}}
        const reader=scopedApi(11,fixture.readerToken);try{await reader.patch(101,(await reader.detail(101,new AbortController().signal)).etag,{title:'DENIED'},new AbortController().signal);result.push('WRITE');}catch(e){result.push(e.status);}return result;
    },fixture);assert.deepEqual(negative,[404,404,404,403]);hashes.foreignByteStatus=negative[2];record('14 foreign item/metadata/bytes404 and read-only actor write403 through FE client');
    await page.getByRole('button',{name:'original.png',exact:true}).click();await page.getByRole('button',{name:'Náhled obrázku'}).click();await expect(page.getByRole('img',{name:/Soukromý obrázek/})).toBeVisible();
    await page.locator('#catalog-context').selectOption('12');await expect(page.getByRole('img',{name:/Soukromý obrázek/})).toHaveCount(0);await expect(page.getByRole('button',{name:/SYNTHETIC 202/})).toBeVisible();record('15 catalog switch clears old media/item DOM');
    await page.locator('#catalog-context').selectOption('11');await page.getByRole('button',{name:/SYNTHETIC OTHER EDITOR/}).click();await page.getByRole('button',{name:'original.png',exact:true}).click();await page.getByRole('button',{name:'Náhled obrázku'}).click();
    await expect(page.getByRole('img',{name:/Soukromý obrázek/})).toBeVisible();await writeFile(path.join(evidence,'revoke.request'),'ONLY_OWNED_SYNTHETIC_DB');
    for(let n=0;n<50;n++){try{await access(path.join(evidence,'revoke.done'));break;}catch{await new Promise(r=>setTimeout(r,100));}}
    await access(path.join(evidence,'revoke.done'));await page.getByRole('button',{name:'Otevřít obrázek'}).click();await expect(page.getByText(/Soukromý obsah byl uzavřen/)).toBeVisible();await expect(page.getByRole('img',{name:/Soukromý obrázek/})).toHaveCount(0);record('16 committed grant revocation denies next byte GET and clears UI');
    await page.getByRole('button',{name:'Odhlásit se'}).click();await page.waitForURL('**/login');assert.equal(await page.evaluate(()=>localStorage.getItem('token')),null);record('17 logout clears session and private DOM');
    const unauthorized=await page.evaluate(async()=>{const {scopedApi}=await import('/src/features/scoped/scopedApi.ts');try{await scopedApi(11,'invalid.synthetic.jwt').detail(101,new AbortController().signal);return 'LEAK';}catch(e){return e.status;}});assert.equal(unauthorized,401);record('18 invalid JWT401 and no scoped v1/static/public/external fallback');
    assert(scopedRequests.length>20);assert(scopedRequests.every(r=>r.path.startsWith('/api/v2/')));assert.deepEqual(externalRequests,[]);
    assert(requests.some(r=>r.path.includes('/api/v2/')&&r.status===412));assert(requests.some(r=>r.path.endsWith('/content')&&r.status===403));
    // Legacy navigation after existing login may call v1; the new scoped workspace and transport never use a v1/media fallback.
    await writeFile(path.join(evidence,'result.json'),JSON.stringify({status:'PASS',scenarios,hashes,requests,scopedRequests,externalRequests,assetRequests,browserVersion:browser.version(),backend:fixture.backend,frontend:'http://127.0.0.1:18183',fixture:'OWNED_SYNTHETIC_ONLY'},null,2));
} catch(error) {
    console.error(error);if(page)await writeFile(path.join(evidence,'failure.html'),await page.content()).catch(()=>{});if(page)await page.screenshot({path:path.join(evidence,'failure.png'),fullPage:true}).catch(()=>{});
    await writeFile(path.join(evidence,'result.json'),JSON.stringify({status:'FAIL',scenarios,hashes,requests,error:String(error)},null,2));process.exitCode=1;
} finally {clearTimeout(watchdog);if(browser)await browser.close();if(vite)await vite.close();}
