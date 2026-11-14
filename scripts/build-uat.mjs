// Local artifact preparation only: no deployment, backend call or environment import.
import {spawnSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
const origin=process.env.UAT_API_ORIGIN||'https://uat.mesonline.cz';
const url=new URL(origin);
if(url.protocol!=='https:'||url.pathname!=='/'||url.search||url.hash||url.username||url.password)throw Error('UAT_API_ORIGIN must be a plain HTTPS origin');
const directory='artifacts/update2-uat',out=`${directory}/dist`;
mkdirSync(directory,{recursive:true});
const revision=spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8',windowsHide:true});
if(revision.status!==0)throw Error(revision.stderr);
const result=spawnSync(process.execPath,['node_modules/vite/bin/vite.js','build','--mode','uat','--outDir',out],{
    env:{...process.env,VITE_APP_BASE:'/',VITE_API_BASE:url.origin},encoding:'utf8',windowsHide:true});
writeFileSync(`${directory}/build.log`,`${result.stdout||''}\n${result.stderr||''}`);
process.stdout.write(result.stdout||'');process.stderr.write(result.stderr||'');
if(result.status!==0)process.exit(result.status||1);
const files=[];
function inspect(relative=''){
    for(const entry of readdirSync(path.join(out,relative),{withFileTypes:true})){
        const name=path.join(relative,entry.name);
        if(entry.isDirectory()){inspect(name);continue;}
        const bytes=readFileSync(path.join(out,name));
        if(/\.(js|html|css)$/.test(name)){
            const text=bytes.toString();
            if(/https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/i.test(text))throw Error(`Local endpoint embedded in ${name}`);
            if(text.includes('UPDATE2-MUSEUM-SAFE-SAMPLES-V1'))throw Error(`Test fixture embedded in ${name}`);
        }
        files.push({path:name.replaceAll('\\','/'),bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
    }
}
inspect();
const html=readFileSync(`${out}/index.html`,'utf8');
if(!html.includes('src="/assets/'))throw Error('Root asset paths missing');
const receipt={builtAt:new Date().toISOString(),codeCommit:revision.stdout.trim(),apiOrigin:url.origin,appBase:'/',deploymentPerformed:false,files};
writeFileSync(`${directory}/receipt.json`,JSON.stringify(receipt,null,2)+'\n');
console.log(`Verified root UAT artifact: ${out}; code commit ${receipt.codeCommit}; ${files.length} hashed files.`);
