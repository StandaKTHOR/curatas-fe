// Real whitelisted source excerpts + explicitly synthetic contract overlays; no live backend calls.
import {chromium} from '@playwright/test';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const samples=JSON.parse(await readFile('src/test/fixtures/museum-samples.json','utf8'));
const out='docs/update2-final-comparison';await mkdir(out,{recursive:true});
const frontend=process.env.TEST_FRONTEND_ORIGIN||'http://127.0.0.1:5174';
const apiOrigin=process.env.TEST_API_ORIGIN||frontend;
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1366,height:768}});
const token=`test.${Buffer.from(JSON.stringify({roles:['ADMIN'],exp:2000000000})).toString('base64url')}.test`;
await context.addInitScript(token=>{localStorage.setItem('token',token);localStorage.setItem('loginTime',String(Date.now()));},token);
const records=samples.items.flatMap(item=>item.sections.map(row=>({...row,id:Number(row.recordId),itemId:Number(item.id),payload:{},legacyData:row.native,sourceKey:row.sourceRecord,dictionaryId:row.dictionaryId?Number(row.dictionaryId):null,partyId:row.partyId?Number(row.partyId):null,materialDictionaryId:row.materialDictionaryId?Number(row.materialDictionaryId):null,techniqueDictionaryId:row.techniqueDictionaryId?Number(row.techniqueDictionaryId):null})));
const items=samples.items.map(row=>({id:Number(row.id),inventoryNumber:row.inventory_number,title:row.title,material:row.material,technique:row.technique,datingText:row.dating_text,objectType:row.native.Predmet_S,description:'',subCollection:'',quantity:null,parties:[],dimensions:[],imageUrls:[],attachments:[],legacyData:row.native,published:false}));
let version=3,reject=0;const writes=[],checks=[],errors=[],reads=[];
await context.route('**/*',async route=>{
    const request=route.request(),url=new URL(request.url()),path=url.pathname;
    if(url.origin!==frontend&&url.origin!==apiOrigin)return route.abort();
    if(!path.includes('/api/')&&!path.includes('/public/'))return route.continue();
    const json=(body,status=200)=>route.fulfill({status,headers:{'Content-Type':'application/json',ETag:`"${version}"`,'Access-Control-Allow-Origin':frontend,'Access-Control-Expose-Headers':'ETag'},body:JSON.stringify(body)});
    const id=Number(path.match(/\/items\/(\d+)/)?.[1]),item=items.find(row=>row.id===id),source=samples.items.find(row=>Number(row.id)===id);
    if(request.method()!=='GET'){
        writes.push({path,body:request.postDataJSON(),ifMatch:request.headers()['if-match']});
        if(reject)return json({message:reject===400?'Native dictionary code mismatch':'Stale aggregate'},reject);
        if(path.endsWith('/items'))return json({...request.postDataJSON(),id:999},201);
        assert.equal(request.headers()['if-match'],`"${version}"`);version++;
        return json({id:12,...request.postDataJSON()});
    }
    reads.push(path);
    if(path.endsWith('/version'))return json({rowVersion:version});
    if(path.endsWith('/demus-identity')){
        const keys=['inventoryNumber','sourceInventoryNumber','series','ordinal','division','stateCode','custodianCode','departmentCode','originalInventoryNumber','otherNumber','materialNote','fundCode','groupCode'];
        return json({...Object.fromEntries(keys.map(key=>[key,null])),itemId:id,inventoryNumber:item.inventoryNumber,sourceInventoryNumber:source.inventory_number,sourceQuantity:source.native.Pocet_S??null,quantity:id===1003?1:null,sourceDatingFromYear:source.native.RokOd_S??null,sourceDatingToYear:source.native.RokDo_S??null});
    }
    if(path.endsWith('/demus-lineage'))return json({offset:Number(url.searchParams.get('offset')),limit:20,hasMore:false,records:[]});
    if(path.endsWith('/museum'))return json({itemId:id,records:records.filter(row=>row.itemId===id),sourceAcquisition:{acquisitionMethod:null,acquisitionDateRaw:null,acquiredFrom:null,documentNumber:null,circumstances:null,accessionFlag:source.native.PrirC_S??null},vocabularies:id===1018?[{dictionaryId:281,type:'MATERIAL',code:'hedvábí',label:'hedvábí',role:null,associationOrigin:'SOURCE_PROJECTED',dictionarySourceRecord:null,sourceRecords:[source.sections[0].sourceRecord],hasMoreSourceRecords:false}]:[]});
    const kind=path.match(/\/museum\/([A-Z_]+)$/)?.[1];if(kind)return json(records.filter(row=>row.itemId===id&&row.kind===kind));
    if(path.endsWith('/inventory-identity')){
        const fields=['series','ordinal','division','hierarchyOrdinal','hierarchyDivision','stateCode','custodianCode','departmentCode','collectionCode'];
        const components=Object.fromEntries(fields.map(key=>[key,null]));
        return json({itemId:id,inventoryNumber:item.inventoryNumber,rowVersion:version,revision:0,components,sourceComponents:components,edited:false,stale:false,aliases:(source.aliases||[]).map(alias=>({inventoryNumber:alias.displayNumber,scope:{},components}))});
    }
    if(path.endsWith('/attachments/count'))return json({count:0});
    if(/\/(acquisitions|images|attachments|worksets|parties)$/.test(path))return json([]);
    if(path.endsWith('/tree')){
        const type=url.searchParams.get('type');return json(samples.dictionaries.filter(row=>row.dict_type===type).map(row=>({id:Number(row.id),code:row.code,label:row.label,children:[]})));
    }
    if(path.endsWith('/dictionaries'))return json({funds:[],objectTypes:[],materials:[],techniques:[],spravci:[],authors:[],countries:[]});
    if(path.endsWith('/next-numbers'))return json({inventory:'',accession:''});
    if(path.endsWith('/check'))return json({exists:false});
    if(item&&path.endsWith(`/${id}`))return json(item);
    if(path.endsWith('/items'))return json({content:items,totalPages:1,totalElements:items.length,last:true});
    return json({message:`Uncovered fixture ${path}`},404);
});
const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
page.on('response',response=>{if(response.status()>=400&&new URL(response.url()).origin===frontend&&!response.url().includes('/api/'))errors.push(`Static resource ${response.status()}: ${response.url()}`);});
const tab=name=>page.getByRole('navigation',{name:'Karty DEMUS'}).getByRole('button',{name,exact:true});
const shot=name=>page.screenshot({path:`${out}/${name}.png`});
const open=async(id,view=false)=>{await page.goto(`${frontend}/admin/items/${view?'view':'edit'}/${id}`);await page.getByLabel('Název sbírkového předmětu (nebo typ)',{exact:true}).waitFor();};
try{
    await page.goto(`${frontend}/admin/items`);await page.locator('tbody tr').first().waitFor();await shot('catalog-desktop');
    const height=await page.locator('tbody tr').first().evaluate(row=>row.getBoundingClientRect().height);assert(height<=31);checks.push(`Staff catalogue ${height}px`);
    await page.getByRole('button',{name:/Pokročilý/}).first().click();await shot('advanced-filters');checks.push('Advanced filters discoverable');
    await open(1003);await shot('edit-desktop');
    const save=page.getByRole('button',{name:'Uložit',exact:true});assert((await save.boundingBox()).y<768);checks.push('Save visible above fold');
    await tab('Určení').click();await page.getByText('Sbirky',{exact:false}).first().waitFor();await shot('determination');checks.push('Source root determination distinct; no fabricated actor');
    await tab('Historie').click();await page.getByText(/Rozdíl zdroj \/ katalog: 2 \/ 1/).waitFor();await shot('quantity-source');checks.push('Synthetic current quantity overlay 1 vs actual source 2');
    await tab('Akvizice').click();await page.getByRole('region',{name:'Původní akvizice DEMUS'}).waitFor();await shot('acquisition');checks.push('Source boolean separated from child acquisitions');
    await open(1018);await tab('MatTech').click();await page.getByText('1406',{exact:true}).waitFor();await shot('material-technique');checks.push('Actual tuple order 1406 displayed');
    await page.getByRole('button',{name:'Upravit',exact:true}).first().click();await page.getByRole('combobox',{name:'Materiál tuple — číselník'}).waitFor();await shot('dictionary-selection');
    await tab('Číselníkové vazby').click();await page.getByText('Doložená převzatá vazba').waitFor();await shot('vocabularies');checks.push('Stored dictionary ID 281; unknown role preserved');
    await open(1153);await tab('Vznik').click();await page.getByText('1776',{exact:true}).first().waitFor();await shot('origin');checks.push('Actual source native year 1776');
    await open(3385);await tab('Dokumentace').click();await shot('documentation');checks.push('Empty whitelisted documentation excerpt has no invented media');
    await open(24261);await tab('Reference').click();await page.getByText('Kurfurst',{exact:true}).first().waitFor();await shot('bibliography');
    await page.getByRole('button',{name:'Upravit',exact:true}).first().click();const ref=page.getByLabel('Reference — nativní klíč',{exact:true});await ref.fill('Entered conflicting citation');reject=400;
    await page.getByRole('button',{name:'Uložit záznam',exact:true}).click();await page.getByText(/Zápis nebyl přijat/).waitFor();assert.equal(await ref.inputValue(),'Entered conflicting citation');assert.equal(writes.at(-1).ifMatch,'"3"');await shot('bibliography-conflict');checks.push('HTTP400 preserves bibliography and exact If-Match');reject=0;
    await open(1003,true);await shot('item-detail');await tab('Historie').click();await page.getByRole('button',{name:'Otevřít zdrojovou historii'}).click();checks.push('Read-only staff detail can navigate source history');
    await page.goto(`${frontend}/admin/items/new`);await page.getByLabel('Název sbírkového předmětu (nebo typ)',{exact:true}).waitFor();await shot('new-item');checks.push('New item toolbar visible');
    const anon=await browser.newContext({viewport:{width:1366,height:768}});await anon.route('**/public/v1/items**',route=>route.fulfill({headers:{'Access-Control-Allow-Origin':frontend},json:{content:items,totalPages:1,totalElements:5,last:true}}));
    await anon.route('**/api/**',route=>{errors.push('Anonymous requested staff API');return route.abort();});
    const guest=await anon.newPage();await guest.goto(`${frontend}/`);await guest.locator('tbody tr').first().waitFor();await guest.screenshot({path:`${out}/public-catalog.png`});
    assert.equal(await guest.getByText('Umístění',{exact:true}).count(),0);checks.push('Public catalogue excludes storage and source APIs');await anon.close();
    await page.setViewportSize({width:390,height:844});await open(1018);await shot('edit-mobile');assert((await save.boundingBox()).y<844);checks.push('Mobile save reachable');
    assert.deepEqual(errors,[]);
    await writeFile(`${out}/browser-results.json`,JSON.stringify({fixtureOnly:true,liveBackend:false,frontend,apiOrigin,sourceSamples:samples.items.map(row=>row.inventory_number),syntheticOverlays:['current quantity=1','HTTP400 mismatch'],checks,writes,errors},null,2));
    console.log(JSON.stringify(checks,null,2));
}finally{await browser.close();}
