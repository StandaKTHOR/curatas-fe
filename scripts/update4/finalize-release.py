from pathlib import Path
import json,subprocess,hashlib,shutil,zipfile
FE=Path.cwd();ROOT=FE.parent;OUT=ROOT/'release'
def git(*args):return subprocess.check_output(['git',*args]).decode('utf-8').strip()
def write(p,s):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(s,encoding='utf-8',newline='\n')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
head=git('rev-parse','HEAD');assert not git('status','--porcelain'), 'Commit the completed UI unit first'
summary=json.loads((OUT/'evidence/acceptance-summary.json').read_text(encoding='utf-8'));assert summary['status']=='PASS'
receipt={'kind':'MES_UPDATE4_FE_LOCAL_RELEASE_CANDIDATE','frontendCommit':head,'baselineFrontendCommit':'7a1df8f3a00b1a5edf1bc8419a9dcf84bc286283','backendCommit':'aad6cfee53050d0f8cad205b8017899c62373dfd','deploymentPerformed':False,'featureFlags':{'VITE_API_BASE':'/','VITE_APP_BASE':'/','VITE_LOCAL_AUTH_ENABLED':True,'VITE_SCOPED_WORKSPACE_ENABLED':True,'VITE_QA_NO_DELETE':True,'VITE_DEMUS_HISTORY_ENABLED':True,'VITE_MANAGED_AUTHORITIES_ENABLED':True,'VITE_CURRENT_FLAGS_ENABLED':True,'VITE_CURRENT_AUTHORS_ENABLED':True}}
write(FE/'dist/update4-build.json',json.dumps(receipt,ensure_ascii=False,indent=2)+'\n');shutil.copytree(FE/'dist',OUT/'frontend',dirs_exist_ok=True)
shutil.copy2(FE/'docs/UPDATE4-UI-HANDOFF-20261125.md',OUT/'HANDOFF.md');shutil.copytree(FE/'scripts/update4',OUT/'test-support',dirs_exist_ok=True)
write(OUT/'source/frontend.patch',subprocess.check_output(['git','diff','--binary',receipt['baselineFrontendCommit'],head]).decode('utf-8'))
manifest={**receipt,'status':'LOCALLY_VALIDATED_UI_CANDIDATE','unitTestsPassed':86,'postLabelTestsPassed':20,'chromeJavaTestsPassed':4,'screenshots':len(list((OUT/'screenshots').glob('*.png'))),'limitations':['Not deployed or verified on UAT/PROD','Bounded fixtures do not prove complete production preservation','Search regression is a small functional set, not a full-dataset performance test'],'backendApplicationChanges':False,'globalStylesChanged':False,'tabs':20}
write(OUT/'MANIFEST.json',json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
assert not list(OUT.rglob('private-input.json'))
assert not list(OUT.rglob('PRIVATE*'))
files=sorted(p for p in OUT.rglob('*') if p.is_file() and p.name!='SHA256SUMS.txt')
write(OUT/'SHA256SUMS.txt',''.join(sha(p)+'  '+p.relative_to(OUT).as_posix()+'\n' for p in files))
archive=ROOT/('MES-UPDATE4-UI-20261125-'+head[:12]+'.zip');assert not archive.exists(), 'Preserve existing release archives'
with zipfile.ZipFile(archive,'x',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for p in sorted(OUT.rglob('*')):
  if p.is_file():z.write(p,p.relative_to(OUT).as_posix())
with zipfile.ZipFile(archive) as z:
 assert z.testzip() is None
 for line in z.read('SHA256SUMS.txt').decode().splitlines():
  digest,name=line.split('  ',1);assert hashlib.sha256(z.read(name)).hexdigest()==digest,name
write(Path(str(archive)+'.sha256'),sha(archive)+'  '+archive.name+'\n')
write(ROOT/'release-result.json',json.dumps({'frontendCommit':head,'zip':str(archive),'zipSha256':sha(archive),'build':str(OUT/'frontend'),'manifest':str(OUT/'MANIFEST.json'),'hashes':str(OUT/'SHA256SUMS.txt')},ensure_ascii=False,indent=2)+'\n')
print((ROOT/'release-result.json').read_text(encoding='utf-8'))
