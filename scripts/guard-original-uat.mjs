import postcss from 'postcss';
// Build-time design freeze: actual original Git source and public compiled CSS.
import fs from 'node:fs';
import crypto from 'node:crypto';
import cp from 'node:child_process';
const baseline='db026f32cf3d0f9cf28ea6271e29c9d0443febc3';
const baselineCssStructureSha='2403fe4cd4f6f0160b6a1313d324cac6071f56ab6d690b2dedb6f53a5935705b';
const technicalCss='src/features/catalog/itemCardCompact.css';
const technicalSelector='[data-clean-item-card="true"]';
const git=(...args)=>cp.execFileSync('git',args);
const original=git('ls-tree','-r','--name-only',baseline).toString().trim().split('\n');
const checks=[];
const formCss=fs.readFileSync('src/pages/AdminItemForm.css','utf8').replaceAll('\r\n','\n');
const marker='/* Creation only:';
const markerIndex=formCss.indexOf(marker);
const flowIndex=formCss.indexOf('/* UAT P0:');
const denominationIndex=formCss.indexOf('/* CITeM Update4.4:');
const flowCss=flowIndex>=0?formCss.slice(flowIndex,denominationIndex<0?undefined:denominationIndex):'';
const flowRules = postcss.parse(flowCss);
let flowScoped = true;
flowRules.walkRules(rule => { if (rule.selectors.some(s => !s.startsWith('.curator-item-form[data-item-layout="flow"]'))) flowScoped = false; });
flowRules.walkAtRules(rule => { if (rule.name !== 'media') flowScoped = false; });
checks.push({name:'UAT-P0-only-scoped-item-flow',pass:flowIndex>markerIndex&&flowScoped});
let curatorCardScoped=denominationIndex>flowIndex;
const cardRules=postcss.parse(denominationIndex<0?'':formCss.slice(denominationIndex));
cardRules.walkRules(rule=>{if(rule.selectors.some(selector=>!selector.startsWith('.curator-item-form ')||!selector.includes('.curator-card-')))curatorCardScoped=false;});
cardRules.walkAtRules(rule=>{if(rule.name!=='media')curatorCardScoped=false;});
checks.push({name:'CITeM-layout-only-affects-main-item-card',pass:curatorCardScoped});
const integratedCss=git('show','906b337:src/pages/AdminItemForm.css').toString().replaceAll('\r\n','\n').trimEnd();
checks.push({name:'integrated-update4-form-styles-preserved',pass:markerIndex>=0&&formCss.slice(0,markerIndex).trimEnd()===integratedCss});
let creationOnly=markerIndex>=0;
postcss.parse(markerIndex>=0?formCss.slice(markerIndex,flowIndex<0?undefined:flowIndex):'').walkRules(rule=>{if(rule.selectors.some(s=>!s.startsWith('.curator-item-form[data-new-item="true"]')))creationOnly=false;});
checks.push({name:'compactness-hotfix-requires-new-item-attribute',pass:creationOnly});
for(const file of original.filter(p=>p.startsWith('src/')&&/\.(css|scss|sass)$/.test(p))){
 const expected=git('show',baseline+':'+file);const actual=fs.readFileSync(file);
 checks.push({name:'byte-identical-original-stylesheet:'+file,pass:expected.equals(actual)});
}
const newStyles=git('ls-files','--cached','--others','--exclude-standard','src').toString().trim().split('\n').filter(p=>/\.(css|scss|sass)$/.test(p)&&!original.includes(p));
const compactFile='src/components/compactIdentification.css';
checks.push({name:'only-authorized-compact-editor-stylesheet',pass:newStyles.every(p=>p==='src/pages/AdminItemForm.css'||p===compactFile||p==='src/features/catalog/LocalityCardForm.css'||p===technicalCss||['src/features/help/help.css','src/features/help/responsive.css','src/features/help/helpTrigger.css'].includes(p)),newStyles});

const triggerCss=postcss.parse(fs.readFileSync('src/features/help/helpTrigger.css','utf8'));let triggerScoped=true;triggerCss.walkRules(rule=>{if(rule.selectors.some(s=>!s.startsWith('.mes-help-trigger')&&!s.startsWith('.demus-menubar .mes-help-trigger')))triggerScoped=false;});checks.push({name:'help-trigger-only-local-styles',pass:triggerScoped});
const helpCss=postcss.parse(fs.readFileSync('src/features/help/help.css','utf8'));let helpScoped=true;
helpCss.walkRules(rule=>{if(rule.selectors.some(s=>!s.startsWith('.mes-help')&&!s.startsWith('.demus-menubar .mes-help-trigger')))helpScoped=false;});
checks.push({name:'help-only-scoped-dialog-and-trigger',pass:helpScoped});
const responsiveCss=postcss.parse(fs.readFileSync('src/features/help/responsive.css','utf8'));let responsiveScoped=true;
responsiveCss.walkRules(rule=>{if(rule.selectors.every(s=>s.startsWith('[data-dictionary-value-modal]')))return;if(rule.selectors.some(s=>!s.startsWith('.curator-item-form'))||rule.parent.type!=='atrule'||!['(max-width: 760px)','(min-width: 1501px) and (max-width: 1700px)','(min-width: 761px) and (max-width: 900px)'].includes(rule.parent.params))responsiveScoped=false;});
checks.push({name:'responsive-only-existing-form-below-760-and-existing-dialog',pass:responsiveScoped});
checks.push({name:'update45-desktop-css-unchanged',pass:git('show','ff34ef2:src/pages/AdminItemForm.css').toString().replaceAll('\r\n','\n').trimEnd()===formCss.trimEnd()});

const locality=postcss.parse(fs.readFileSync('src/features/catalog/LocalityCardForm.css','utf8'));let localityScoped=true;locality.walkRules(rule=>{if(rule.selectors.some(s=>!s.startsWith('.locality-card')))localityScoped=false;});checks.push({name:'locality-only-authorized-scoped-layout',pass:localityScoped});
const curator=postcss.parse(fs.readFileSync('src/pages/AdminItemForm.css','utf8'));let curatorScoped=true;curator.walkRules(rule=>{if(rule.selectors.some(s=>!s.startsWith('.curator-item-form')))curatorScoped=false;});checks.push({name:'update4-item-form-only-layout',pass:curatorScoped});
const technical=postcss.parse(fs.readFileSync(technicalCss,'utf8'));
const technicalScoped=technical.nodes.every(node=>node.type==='comment'||node.type==='rule'&&node.selectors.every(selector=>selector.startsWith(technicalSelector)&&selector.includes('[data-demus-technical]')));
checks.push({name:'clean-card-style-only-applies-to-technical-disclosure',pass:technicalScoped});
const compact=postcss.parse(fs.readFileSync(compactFile,'utf8'));let scoped=true;
compact.walkRules(rule=>{if(rule.selectors.some(selector=>!selector.startsWith('[data-compact-editor="true"]')&&!selector.startsWith('[data-unified-identification="true"]')&&!selector.startsWith('[data-current-audit="true"]')))scoped=false;});
compact.walkAtRules(rule=>{if(rule.name!=='media')scoped=false;});
checks.push({name:'compact-rules-require-edit-panel-attribute',pass:scoped});
const count=(source)=>{const map=new Map();for(const match of source.matchAll(/className\s*=\s*"([^"]*)"/g))map.set(match[1],(map.get(match[1])??0)+1);return map;};
for(const file of original.filter(p=>p.startsWith('src/')&&p.endsWith('.tsx'))){
 if(!fs.existsSync(file)){checks.push({name:'original-component:'+file,pass:false});continue;}
 const expected=count(git('show',baseline+':'+file).toString()),actual=count(fs.readFileSync(file,'utf8'));
 const localUpdate4=new Set(['space-y-3 animate-in fade-in duration-300','grid grid-cols-2 gap-2 text-xs border p-2',
   'px-6 text-sm','flex items-center justify-between','p-3 bg-slate-50 border border-slate-200 rounded space-y-2',
   'text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-1.5','text-[#00204a]',
   'grid grid-cols-1 sm:grid-cols-3 gap-3','text-xs font-black text-gray-700 uppercase tracking-wider mb-2',
   'pt-2 border-t border-gray-200','text-xs','font-mono font-bold',
   'text-[10px] text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded flex items-center justify-between']);
 const removed=[...expected].filter(([name,n])=>(actual.get(name)??0)<n&&!(file==='src/pages/AdminItemForm.tsx'&&localUpdate4.has(name)));
 checks.push({name:'original-layout-classes:'+file,pass:removed.length===0,removed});
}
const tabs=s=>[...(s.match(/<nav[^>]*aria-label="Karty DEMUS"[^>]*>([\s\S]*?)<\/nav>/)?.[1]??'').split('.map(')[0].matchAll(/\['([^']+)'\s*,/g)].map(v=>v[1]);
const before=tabs(git('show',baseline+':src/pages/AdminItemForm.tsx').toString()),after=tabs(fs.readFileSync('src/pages/AdminItemForm.tsx','utf8'));
checks.push({name:'same20tabs-and-order',pass:before.length===20&&JSON.stringify(before)===JSON.stringify(after),tabs:after});
if(!process.argv.includes('--source-only')){
const compiled=fs.readdirSync('dist/assets').filter(p=>p.endsWith('.css'));
const ruleSequence=(root)=>root.nodes.flatMap(node=>{
 if(node.type==='comment')return [];
 if(node.type==='rule'&&node.selectors.every(s=>s.startsWith('.mes-help')||s.startsWith('.demus-menubar .mes-help-trigger')||s.startsWith('[data-dictionary-value-modal]')))return [];
 if(node.type==='atrule'&&node.name==='media'&&['(max-width:760px)','(min-width:1501px) and (max-width:1700px)','(min-width:761px) and (max-width:900px)'].includes(node.params)&&node.nodes?.some(n=>n.type==='rule'&&n.selectors.some(s=>s.includes('.curator-card-tab-bar')||node.params==='(min-width:761px) and (max-width:900px)'&&s==='.curator-item-form .curator-card-main'||node.params==='(min-width:1501px) and (max-width:1700px)'&&s.includes('.curator-card-identification>.curator-card-pair:has(')))&&node.nodes.every(n=>n.type==='rule'&&n.selectors.every(s=>s.startsWith('.curator-item-form'))))return [];

 if(node.type==='rule'&&node.selectors.every(selector=>/^\[data-clean-item-card=(?:"true"|true)\]/.test(selector)&&selector.includes('[data-demus-technical]')))return [];
 if(node.type==='rule'&&node.selectors.every(s=>/^\.curator-item-form\[data-item-layout=(?:"flow"|flow)\]/.test(s)))return [];
 if(node.type==='rule'&&node.selectors.every(s=>s.startsWith('.curator-item-form ')&&s.includes('.curator-card-')))return [];
 if(node.type==='atrule'&&node.name==='media'&&node.nodes?.length&&ruleSequence(node).length===0)return [];
 if(node.type==='decl')return [[node.type,node.prop,node.value,Boolean(node.important)]];
 return [[node.type,node.selector??node.name,node.params??null,node.nodes?ruleSequence(node):null]];
});
const structure=compiled.flatMap(name=>ruleSequence(postcss.parse(fs.readFileSync('dist/assets/'+name,'utf8'))));
const digest=crypto.createHash('sha256').update(JSON.stringify(structure)).digest('hex');
checks.push({name:'approved-update4-compiled-layout-except-technical-disclosure',pass:compiled.length===1&&digest===baselineCssStructureSha,digest});
}
const report={baseline,baselineCssStructureSha,newStyles,checks,status:checks.every(c=>c.pass)?'PASS':'FAIL',limits:'Original stylesheet bytes and approved compiled rule sequence checked. Component-specific rules are limited to the technical disclosure, item-card flow and the CITeM card.'};
const reportFile=process.argv.slice(2).find(p=>!p.startsWith('--'));
if(reportFile)fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,checks:checks.length,failed:checks.filter(c=>!c.pass)}));
if(report.status!=='PASS')process.exit(1);
