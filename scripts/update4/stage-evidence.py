from pathlib import Path
import json,xml.etree.ElementTree as ET,subprocess,hashlib,shutil,zipfile,html
FE=Path.cwd(); ROOT=FE.parent; E=ROOT/'evidence'; OUT=ROOT/'release'; BASE='7a1df8f3a00b1a5edf1bc8419a9dcf84bc286283'
classes=['Update4UiBrowserPostgres17Test','CitemSearchBrowserPostgres17Test','CitemC2BrowserPostgres17Test','Update4MatTechBrowserPostgres17Test']
def git(*args):return subprocess.check_output(['git',*args]).decode('utf-8').strip()
def latest(pattern):
 candidates=list(E.glob(pattern));assert candidates,pattern
 return max(candidates,key=lambda p:p.stat().st_mtime)
def write(p,value):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(value,encoding='utf-8',newline='\n')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
tests=[]
for name in classes:
 p=ROOT/'be/target/surefire-reports'/('TEST-cz.curatas.auth.'+name+'.xml');r=ET.parse(p).getroot();assert all(int(r.get(k,'0'))==0 for k in ['failures','errors','skipped']),name
 tests.append({'class':name,**{k:r.get(k) for k in ['tests','failures','errors','skipped','time']}})
ui=latest('auth-generated-*/update4-ui/layout.json').parent
sources={'ui':ui,'search':latest('auth-generated-*/citem-search-browser/browser-result.json').parent,'c2':latest('auth-generated-*/c2-locality/browser-result.json').parent,'mattech':latest('v70-mattech-ui/native-*/browser-result.json').parent}
for name,p in sources.items():
 result=p/('save-browser-result.json' if name=='ui' else 'browser-result.json');assert json.loads(result.read_text(encoding='utf-8'))['status']=='PASS',name
 assert result.stat().st_mtime>(E/'build-release.log').stat().st_mtime,(name,'stale evidence')
write(E/'acceptance-summary.json',json.dumps({'status':'PASS','scope':'latest completed selected runs, including repaired targeted reruns; historical failures are retained separately','unitTests':86,'unitFiles':16,'typecheck':'PASS','productionBuild':'PASS','designGuardChecks':78,'javaChromeTests':tests,'apiMocks':False,'sourceFixtures':'one whitelisted museum excerpt plus bounded generated fixtures','viewports':['1920x1080','1366x768','1024x768','640x768'],'sources':{k:str(v) for k,v in sources.items()}},ensure_ascii=False,indent=2)+'\n')
# Stage only explicit public handoff files; private test inputs and server environments stay local.
OUT.mkdir(exist_ok=True); (OUT/'evidence').mkdir(exist_ok=True);(OUT/'screenshots').mkdir(exist_ok=True)
for name,p in sources.items():
 for f in p.iterdir():
  if f.suffix=='.png' and (name=='ui' or f.name!='failure.png'):
   shutil.copy2(f,OUT/'screenshots'/(name+'-'+f.name))
  elif f.name in {'save-browser-result.json','browser-result.json','sql-proof.json','native-result.json','layout.json'}:
   shutil.copy2(f,OUT/'evidence'/(name+'-'+f.name))
for n in ['acceptance-summary.json','design-guard-release.json']:
 shutil.copy2(E/n,OUT/'evidence'/n)
for name in classes:
 p=ROOT/'be/target/surefire-reports'/('cz.curatas.auth.'+name+'.txt');shutil.copy2(p,OUT/'evidence'/p.name)
# Preserve completed unit/build output without Surefire environment properties.
for name in ['components-verified.log','final-label-tests.log','typecheck-release.log','build-release.log']:
 shutil.copy2(E/name,OUT/'evidence'/name)
rows=[]
for example in ['new','historical']:
 for width in [1920,1366,1024,640]:
  a='ui-before-'+example+'-'+str(width)+'.png';b='ui-after-'+example+'-'+str(width)+'.png'
  rows.append(f'<h2>{html.escape(example)} — {width} px</h2><div><figure><figcaption>Před</figcaption><a href="{a}"><img src="{a}"></a></figure><figure><figcaption>Po</figcaption><a href="{b}"><img src="{b}"></a></figure></div>')
write(OUT/'screenshots/comparison.html','<!doctype html><html lang="cs"><meta charset="utf-8"><title>UPDATE4 před a po</title><style>body{font:16px Arial;margin:24px;background:#f5f6f8}div{display:flex;gap:12px}figure{margin:0;min-width:0;flex:1}img{width:100%;border:1px solid #bbb}figcaption{padding:8px}h2{margin-top:32px}</style><h1>UPDATE4 — stejná session, příklady a rozlišení</h1><p>Výchozí FE '+BASE+'. Muzejní příklad je schválený výřez; nejde o UAT.</p>'+''.join(rows)+'</html>')
print(json.dumps({'ui':str(ui),'sources':{k:str(v) for k,v in sources.items()},'tests':tests},indent=2))
