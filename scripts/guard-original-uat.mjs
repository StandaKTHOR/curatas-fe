import postcss from 'postcss';
// Build-time design freeze: actual original Git source and public compiled CSS.
import fs from 'node:fs';
import crypto from 'node:crypto';
import cp from 'node:child_process';
const baseline='db026f32cf3d0f9cf28ea6271e29c9d0443febc3';
const cssSha='6f198bc4a8fb3818bac75e6fb8cf6f0238b8a48d90ab58fc5f649a6b5e420f93';
const git=(...args)=>cp.execFileSync('git',args);
const original=git('ls-tree','-r','--name-only',baseline).toString().trim().split('\n');
const checks=[];
for(const file of original.filter(p=>p.startsWith('src/')&&/\.(css|scss|sass)$/.test(p))){
 const expected=git('show',baseline+':'+file);const actual=fs.readFileSync(file);
 checks.push({name:'byte-identical-original-stylesheet:'+file,pass:expected.equals(actual)});
}
const newStyles=git('ls-files','--cached','--others','--exclude-standard','src').toString().trim().split('\n').filter(p=>/\.(css|scss|sass)$/.test(p)&&!original.includes(p));
const compactFile='src/components/compactIdentification.css';
checks.push({name:'only-authorized-compact-editor-stylesheet',pass:newStyles.every(p=>p===compactFile||p==='src/features/catalog/LocalityCardForm.css'||p==='src/features/catalog/LocalityCardForm.css'),newStyles});
const locality=postcss.parse(fs.readFileSync('src/features/catalog/LocalityCardForm.css','utf8'));let localityScoped=true;locality.walkRules(rule=>{if(rule.selectors.some(s=>!s.startsWith('.locality-card')))localityScoped=false;});checks.push({name:'locality-only-authorized-scoped-layout',pass:localityScoped});
const compact=postcss.parse(fs.readFileSync(compactFile,'utf8'));let scoped=true;
compact.walkRules(rule=>{if(rule.selectors.some(selector=>!selector.startsWith('[data-compact-editor="true"]')&&!selector.startsWith('[data-unified-identification="true"]')&&!selector.startsWith('[data-current-audit="true"]')))scoped=false;});
compact.walkAtRules(rule=>{if(rule.name!=='media')scoped=false;});
checks.push({name:'compact-rules-require-edit-panel-attribute',pass:scoped});
const count=(source)=>{const map=new Map();for(const match of source.matchAll(/className\s*=\s*"([^"]*)"/g))map.set(match[1],(map.get(match[1])??0)+1);return map;};
for(const file of original.filter(p=>p.startsWith('src/')&&p.endsWith('.tsx'))){
 if(!fs.existsSync(file)){checks.push({name:'original-component:'+file,pass:false});continue;}
 const expected=count(git('show',baseline+':'+file).toString()),actual=count(fs.readFileSync(file,'utf8'));
 const removed=[...expected].filter(([name,n])=>(actual.get(name)??0)<n);
 checks.push({name:'original-layout-classes:'+file,pass:removed.length===0,removed});
}
const tabs=s=>[...s.split('aria-label="Karty DEMUS"')[1].split('.map(')[0].matchAll(/\['([^']+)'\s*,/g)].map(v=>v[1]);
const before=tabs(git('show',baseline+':src/pages/AdminItemForm.tsx').toString()),after=tabs(fs.readFileSync('src/pages/AdminItemForm.tsx','utf8'));
checks.push({name:'same20tabs-and-order',pass:before.length===20&&JSON.stringify(before)===JSON.stringify(after),tabs:after});
if(!process.argv.includes('--source-only')){
const compiled=fs.readdirSync('dist/assets').filter(p=>p.endsWith('.css'));
checks.push({name:'approved-compact-editor-compiled-CSS-sha256',pass:compiled.length===1&&compiled.some(p=>crypto.createHash('sha256').update(fs.readFileSync('dist/assets/'+p)).digest('hex')===cssSha)});
}
const report={baseline,cssSha,newStyles,checks,status:checks.every(c=>c.pass)?'PASS':'FAIL',limits:'Original stylesheet bytes/layout classes frozen; only attribute-scoped compact edit panel rules authorized. Chrome verifies actual layout.'};
const reportFile=process.argv.slice(2).find(p=>!p.startsWith('--'));
if(reportFile)fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,checks:checks.length,failed:checks.filter(c=>!c.pass)}));
if(report.status!=='PASS')process.exit(1);
