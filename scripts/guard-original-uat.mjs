// Build-time design freeze: actual original Git source and public compiled CSS.
import fs from 'node:fs';
import crypto from 'node:crypto';
import cp from 'node:child_process';
const baseline='db026f32cf3d0f9cf28ea6271e29c9d0443febc3';
const cssSha='8aaf645251805d6da8174a0bb0a7d47ba6f0d855cdc3c8c30e91b027d964a5bc';
const git=(...args)=>cp.execFileSync('git',args);
const original=git('ls-tree','-r','--name-only',baseline).toString().trim().split('\n');
const checks=[];
for(const file of original.filter(p=>p.startsWith('src/')&&/\.(css|scss|sass)$/.test(p))){
 const expected=git('show',baseline+':'+file);const actual=fs.readFileSync(file);
 checks.push({name:'byte-identical-original-stylesheet:'+file,pass:expected.equals(actual)});
}
const newStyles=git('ls-files','--cached','--others','--exclude-standard','src').toString().trim().split('\n').filter(p=>/\.(css|scss|sass)$/.test(p)&&!original.includes(p));
checks.push({name:'no-competing-stylesheets',pass:newStyles.length===0,newStyles});
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
checks.push({name:'public-UAT-compiled-CSS-byte-identical',pass:compiled.length===1&&compiled.some(p=>crypto.createHash('sha256').update(fs.readFileSync('dist/assets/'+p)).digest('hex')===cssSha)});
}
const report={baseline,cssSha,newStyles,checks,status:checks.every(c=>c.pass)?'PASS':'FAIL',limits:'Source/layout class and exact CSS freeze; not populated real-data pixel acceptance.'};
const reportFile=process.argv.slice(2).find(p=>!p.startsWith('--'));
if(reportFile)fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,checks:checks.length,failed:checks.filter(c=>!c.pass)}));
if(report.status!=='PASS')process.exit(1);
