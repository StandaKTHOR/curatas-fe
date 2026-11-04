// Local FE-only production build. No server, database or infrastructure actions.
import fs from 'node:fs';
import {spawnSync,execFileSync} from 'node:child_process';
const env={...process.env,VITE_API_BASE:'/',VITE_APP_BASE:'/',VITE_LOCAL_AUTH_ENABLED:'true',VITE_SCOPED_WORKSPACE_ENABLED:'true',VITE_QA_NO_DELETE:'true'};
const build=spawnSync(process.execPath,['node_modules/vite/bin/vite.js','build','--configLoader','runner'],{env,stdio:'inherit'});
if(build.status!==0)process.exit(build.status??1);
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
fs.writeFileSync('dist/qa-build.json',JSON.stringify({kind:'MES_QA_FRONTEND_ONLY',frontendCommit:git('rev-parse','HEAD'),sourceDirty:git('status','--porcelain','--untracked-files=normal')!=='',originalUatCommit:'db026f32cf3d0f9cf28ea6271e29c9d0443febc3',flags:{VITE_API_BASE:'/',VITE_APP_BASE:'/',VITE_LOCAL_AUTH_ENABLED:true,VITE_SCOPED_WORKSPACE_ENABLED:true,VITE_QA_NO_DELETE:true}},null,2)+'\n');
fs.mkdirSync('artifacts',{recursive:true});
const guard=spawnSync(process.execPath,['scripts/guard-original-uat.mjs','artifacts/uat-design-guard.json'],{stdio:'inherit'});
process.exit(guard.status??1);
