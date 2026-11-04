// @vitest-environment node
import {execFileSync} from 'node:child_process';
import {fileURLToPath, URL} from 'node:url';
import process from 'node:process';
import {expect,it} from 'vitest';
it('freezes original UAT stylesheet bytes, component classes and20-tab order on every test run',()=>{
 const output=execFileSync(process.execPath,['scripts/guard-original-uat.mjs','--source-only'],{cwd:fileURLToPath(new URL('../../',import.meta.url)),encoding:'utf8',timeout:30000});
 expect(JSON.parse(output)).toMatchObject({status:'PASS',failed:[]});
},35000);
