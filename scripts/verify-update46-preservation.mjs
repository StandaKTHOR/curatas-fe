// Compare executable bindings with the user-approved FE commit, ignoring JSX containers.
import ts from 'typescript';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const baseline='ff34ef284ed49f3eefe3fa6cfe2958c88ac6d54e';
const path='src/pages/AdminItemForm.tsx';
const printer=ts.createPrinter({removeComments:true});
function bindings(text){
 const source=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const values=new Map();
 const add=node=>{const value=printer.printNode(ts.EmitHint.Unspecified,node,source);values.set(value,(values.get(value)??0)+1);};
 function visit(node){
  if(ts.isJsxAttribute(node)&&/^(on[A-Z]|value$|readOnly$|disabled$|ref$)/.test(node.name.getText(source)))add(node);
  if(ts.isCallExpression(node)&&/^use[A-Z]/.test(node.expression.getText(source)))add(node);
  ts.forEachChild(node,visit);
 }visit(source);return values;
}
const original=execFileSync('git',['show',baseline+':'+path],{encoding:'utf8'});
const before=bindings(original),after=bindings(fs.readFileSync(path,'utf8'));
const missing=[...before].filter(([value,count])=>(after.get(value)??0)<count).map(([binding,count])=>({binding,count,after:after.get(binding)??0}));
const changed=execFileSync('git',['diff',baseline,'--name-only','--','src'],{encoding:'utf8'}).trim().split('\n');
const allowed=changed.every(p=>p===path||p==='src/pages/AdminItemForm.css'||p==='src/DemusApp.tsx'||p==='src/components/AddDictionaryModal.tsx'||p.startsWith('src/features/help/')||p.endsWith('.test.tsx'));
const read=p=>fs.readFileSync(p,'utf8').replaceAll('\r\n','\n');const old=p=>execFileSync('git',['show',baseline+':'+p],{encoding:'utf8'}).replaceAll('\r\n','\n');
const formUnchanged=read(path).replace('const documentFiles=originalIntegrationEnabled()?[','const documentFiles=[').replace('    ]:[];\n    const documentationFiles=','    ];\n    const documentationFiles=')===old(path);
const navigationUnchanged=read('src/DemusApp.tsx').replace("import Help from './features/help/Help';\n",'').replace('<Help/><span className="demus-menu-spacer" />','<span className="demus-menu-spacer" />').replace('{login&&<Help standalone/>}\n        ','')===old('src/DemusApp.tsx');
const modalUnchanged=read('src/components/AddDictionaryModal.tsx').replace('data-dictionary-value-modal ','')===old('src/components/AddDictionaryModal.tsx');
const desktopCssUnchanged=read('src/pages/AdminItemForm.css').trimEnd()===old('src/pages/AdminItemForm.css').trimEnd();

const result={status:missing.length===0&&allowed&&formUnchanged&&navigationUnchanged&&modalUnchanged&&desktopCssUnchanged?'PASS':'FAIL',baseline,formUnchanged,navigationUnchanged,modalUnchanged,desktopCssUnchanged,bindingsChecked:[...before.values()].reduce((a,b)=>a+b,0),missing,changedSourceFiles:changed};
fs.mkdirSync('artifacts',{recursive:true});fs.writeFileSync('artifacts/update46-preservation.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));if(result.status!=='PASS')process.exitCode=1;
