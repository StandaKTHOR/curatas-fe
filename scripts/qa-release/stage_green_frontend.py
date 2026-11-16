"""Operator-only first staging of a NEW green tree. No network, services, blue path or activation."""
import ctypes
import hashlib
import json
import os
from pathlib import Path
import shutil
import stat
import subprocess
import sys
import uuid

TARGET_PATH = '/var/www/mes-green-20261104'
TARGET = Path(TARGET_PATH)
CSS='8aaf645251805d6da8174a0bb0a7d47ba6f0d855cdc3c8c30e91b027d964a5bc'
def require(ok,message):
    if not ok:raise RuntimeError(message)
def sha(path):
    with path.open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()
def payload(bundle):
    metadata=json.loads((bundle/'BUILD.json').read_text(encoding='utf-8'))
    require(metadata['kind']=='MES_GREEN_FRONTEND_STAGED_ONLY' and metadata['target']=={'frontend':TARGET_PATH,'backendPort':8086,'database':'mes_green_20261104','catalogId':1},'Pinned separate green target required')
    expected={}
    for line in (bundle/'FRONTEND.SHA256SUMS').read_text(encoding='utf-8').splitlines():
        digest,name=line.split('  ',1);p=Path(name)
        require(name.startswith('frontend/') and not p.is_absolute() and '..' not in p.parts and '\\' not in name and name not in expected,'Unsafe/duplicate manifest')
        expected[name]=digest
    actual={}
    for p in (bundle/'frontend').rglob('*'):
        require(not p.is_symlink(),'Symlink rejected')
        if p.is_file():actual[p.relative_to(bundle).as_posix()]=sha(p)
        else:require(p.is_dir(),'Special file rejected')
    require(actual==expected and bool(actual),'Exact payload hashes/file set required')
    build=json.loads((bundle/'frontend/qa-build.json').read_text(encoding='utf-8'))
    require(build==metadata['frontendBuild'] and build['sourceDirty'] is False and build['frontendCommit']==metadata['frontendCommit'],'Clean matching build required')
    css=list((bundle/'frontend/assets').glob('*.css'));require(len(css)==1 and sha(css[0])==CSS,'Original CSS byte identity required')
    return metadata
def trusted(path):
    for p in [path,*path.parents]:
        s=p.lstat();require(stat.S_ISDIR(s.st_mode) and not p.is_symlink() and s.st_uid==0 and not s.st_mode&0o022,'Root-owned trusted directory required')
def main():
    require(sys.platform=='linux' and os.geteuid()==0,'Manual root staging on reviewed Linux app server only')
    bundle=Path(__file__).resolve().parents[1];trusted(bundle);metadata=payload(bundle);trusted(TARGET.parent)
    for p in bundle.rglob('*'):
        s=p.lstat();require(not p.is_symlink() and s.st_uid==0 and not s.st_mode&0o022,'Trusted root-owned immutable bundle entries required')
    require(not TARGET.exists() and not TARGET.is_symlink(),'Green destination already exists; never overwrite it or blue')
    stage=TARGET.parent/('.mes-green-stage-'+uuid.uuid4().hex)
    os.umask(0o022);shutil.copytree(bundle/'frontend',stage)
    for p in [stage,*stage.rglob('*')]:
        require(not p.is_symlink(),'Symlink rejected');os.chmod(p,0o755 if p.is_dir() else 0o644)
        require(subprocess.check_output(['stat','--printf=%C','--',str(p)],text=True).split(':')[2:3]==['httpd_sys_content_t'],'Green labels require operator review; no automatic relabel')
    require({p.relative_to(stage).as_posix():sha(p) for p in stage.rglob('*') if p.is_file()}=={p.relative_to(bundle/'frontend').as_posix():sha(p) for p in (bundle/'frontend').rglob('*') if p.is_file()},'Copied green payload hash mismatch')
    library=ctypes.CDLL(None,use_errno=True);rename=library.renameat2;rename.argtypes=[ctypes.c_int,ctypes.c_char_p,ctypes.c_int,ctypes.c_char_p,ctypes.c_uint];rename.restype=ctypes.c_int
    if rename(-100,os.fsencode(stage),-100,os.fsencode(TARGET),1)!=0:raise OSError(ctypes.get_errno(),'Atomic no-replace staging failed; partial stage preserved for review')
    print(json.dumps({'phase':'STAGED_NOT_ACTIVATED','frontendCommit':metadata['frontendCommit'],'path':str(TARGET),'publicBlueModified':False}))
if __name__=='__main__':
    try:main()
    except (RuntimeError,OSError,ValueError,KeyError) as e:sys.exit('STOP: '+str(e))
