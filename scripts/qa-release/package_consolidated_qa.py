"""Immutable, local-only V58 release. Never connects to a server/database or deploys."""
import csv
import importlib.util
import io
from pathlib import Path
import hashlib
import json
import re
import shutil
import subprocess
import zipfile

spec = importlib.util.spec_from_file_location('prior_packager', Path(__file__).with_name('package_completion_qa.py'))
prior = importlib.util.module_from_spec(spec)
spec.loader.exec_module(prior)
FE, BE, EVIDENCE = prior.FE, prior.BE, prior.EVIDENCE
require, git, read, sha, write, copy, manifest = prior.require, prior.git, prior.read, prior.sha, prior.write, prior.copy, prior.manifest
CSS = '8aaf645251805d6da8174a0bb0a7d47ba6f0d855cdc3c8c30e91b027d964a5bc'
BASE_JAR = FE.parent.parent/'qa-v48-origin-hotfix-20261104/evidence/mes-qa-v48-origin-20261104-8c1f976729a7/backend/mes-qa.jar'
NATIVE_LOGS = ['consolidated-final-modules-native.log', 'consolidated-units-final.log', 'consolidated-contracts-a-final.log', 'consolidated-contracts-b-final.log', 'consolidated-history-final.log', 'consolidated-browser-final.log']

def archive(root, destination):
    require(not destination.exists(), 'Never overwrite archive')
    with zipfile.ZipFile(destination, 'x', compression=zipfile.ZIP_DEFLATED, compresslevel=6) as zipped:
        for path in sorted(root.rglob('*')):
            if path.is_file():
                zipped.write(path, path.relative_to(root).as_posix())
    with zipfile.ZipFile(destination) as zipped:
        require(zipped.testzip() is None, 'Archive integrity')
        for member in zipped.namelist():
            require(not member.lower().endswith(('.mdb','.accdb','.har','.pgpass','.key')), 'Forbidden private member')
        for line in (root/'SHA256SUMS').read_text(encoding='utf-8').splitlines():
            digest, name = line.split('  ', 1)
            require(hashlib.sha256(zipped.read(name)).hexdigest() == digest, 'Archive checksum mismatch: '+name)
    digest = sha(destination)
    destination.with_suffix('.zip.sha256').write_text(digest+'  '+destination.name+'\n', encoding='utf-8')
    return {'archive':str(destination),'sha256':digest}

def main():
    for root in [FE, BE]:
        require(not git(root,'status','--porcelain','--untracked-files=normal'), 'Commit owned source before packaging: '+str(root))
    fc, bc = git(FE,'rev-parse','HEAD'), git(BE,'rev-parse','HEAD')
    build = read(FE/'dist/qa-build.json')
    require(build['frontendCommit'] == fc and build['sourceDirty'] is False and build['originalUatCommit'] == prior.BASELINE, 'Rebuild exact clean FE')
    require(all(build['flags'].get(k) is True for k in ['VITE_LOCAL_AUTH_ENABLED','VITE_SCOPED_WORKSPACE_ENABLED','VITE_DEMUS_HISTORY_ENABLED','VITE_MANAGED_AUTHORITIES_ENABLED','VITE_CURRENT_FLAGS_ENABLED','VITE_QA_NO_DELETE']), 'Required paired flags')
    guard = read(FE/'artifacts/uat-design-guard.json')
    require(guard['status']=='PASS' and len(guard['checks'])==75, '75 original UAT guards')
    styles = list((FE/'dist/assets').glob('*.css'))
    require(len(styles)==1 and sha(styles[0])==CSS, 'Original compiled CSS must be byte identical')
    tests = read(EVIDENCE/'consolidated-fe-final.json')
    require(tests['success'] and tests['numFailedTests']==0 and tests['numPassedTests']>=694, 'Current full FE suite')
    groups = {}
    for name in NATIVE_LOGS:
        log = (EVIDENCE/name).read_text(encoding='utf-8')
        require('BUILD SUCCESS' in log, 'Incomplete native group: '+name)
        counts = re.findall(r'Tests run: (\d+), Failures: (\d+), Errors: (\d+), Skipped: (\d+)',log)
        require(counts, 'Missing native totals')
        total, failed, errors, skipped = map(int,counts[-1])
        require(failed==errors==0, 'Native failure')
        groups[name] = dict(total=total,passed=total-skipped,failed=failed,errors=errors,skipped=skipped)
    require('0 errors' in (EVIDENCE/'consolidated-lint-final.log').read_text(encoding='utf-8') or 'error' not in (EVIDENCE/'consolidated-lint-final.log').read_text(encoding='utf-8').lower(), 'Lint errors')
    require(sha(prior.PROTECTED)=='c697d470fd71843c47fe37f265e632b99c52ae8ac4a869babc84187a16edff1d','Protected B9 changed')
    require(sha(BASE_JAR)=='6c9bf786e8ec77e9911736ff7c995c1b93cbf20c1679589d2ed927e77b54855b','Protected V48 JAR changed')
    jars = list((BE/'target').glob('*.jar'))
    require(len(jars)==1, 'Exactly one packaged JAR')
    require(jars[0].stat().st_mtime >= max(p.stat().st_mtime for p in (BE/'src/main').rglob('*') if p.is_file()), 'Stale JAR')
    browsers = sorted(EVIDENCE.glob('auth-generated-*/consolidated-browser-generated/browser-result.json'),key=lambda p:p.stat().st_mtime,reverse=True)
    require(browsers and read(browsers[0])['status']=='PASS','Current actual HTTP/browser proof')
    require(browsers[0].stat().st_mtime >= max(p.stat().st_mtime for p in (FE/'src').rglob('*') if p.is_file()), 'Stale browser evidence')
    release = 'mes-qa-consolidated-20261104-'+bc[:12]+'-'+fc[:12]
    output = EVIDENCE/'releases'/release
    require(not output.exists() and not output.with_suffix('.zip').exists(),'Never overwrite release')
    output.mkdir(parents=True)
    copy(jars[0],output/'backend/mes-qa.jar')
    migration_receipt = []
    with zipfile.ZipFile(jars[0]) as jar, zipfile.ZipFile(BASE_JAR) as base:
        entries = sorted(n for n in jar.namelist() if n.startswith('BOOT-INF/classes/db/migration/V') and n.endswith('.sql'))
        require(len(entries)==58,'Exact V1-V58')
        for key in entries:
            name = Path(key).name
            data = jar.read(key)
            version = int(name.split('__')[0][1:])
            if version<=48:
                require(data==base.read(key),'Existing migration byte drift: '+name)
            target = output/'migrations'/name
            target.parent.mkdir(exist_ok=True)
            target.write_bytes(data)
            migration_receipt.append({'version':version,'name':name,'sha256':sha(target),'originalV48BytesPreserved':version<=48})
        for source in sorted((prior.ORIGINAL/'tools/lib').glob('*.jar')):
            key = 'BOOT-INF/lib/'+source.name
            require(key in jar.namelist(),'Dependency must come from actual JAR: '+source.name)
            dest = output/'tools/lib'/source.name
            dest.parent.mkdir(parents=True,exist_ok=True)
            dest.write_bytes(jar.read(key))
    for directory,names in [('consolidation',['install.sql','flags.sql','feedback.sql','managed-index.sql','runtime-acl-check.sql','runtime-provenance.json','STATUS.md','CITEM-REGRESSION.json']),('history',['objects.sql','relations.sql','admin.sql','audit.sql','fingerprint.py','coverage.py'])]:
        for name in names:
            copy(BE/'ops'/directory/name,output/'ops'/directory/name)
    for name in ['application-consolidation.properties','90-mes-consolidation.conf.in']:
        copy(BE/'ops/consolidation'/name,output/'config'/name)
    copy(BE/'ops/consolidation/QaConsolidatedMigrate.java',output/'tools/QaConsolidatedMigrate.java')
    classes = sorted((EVIDENCE/'consolidation-helper-classes').glob('QaConsolidatedMigrate*.class'))
    require(len(classes)==3 and min(p.stat().st_mtime for p in classes)>=(BE/'ops/consolidation/QaConsolidatedMigrate.java').stat().st_mtime,'Fresh compiled helper')
    require('no DB connection' in (EVIDENCE/'consolidated-helper-selfcheck.log').read_text(encoding='utf-8'),'Helper self-check')
    for path in classes:
        copy(path,output/'tools'/path.name)
    operator = (BE/'ops/consolidation/OPERATOR.md').read_text(encoding='utf-8').replace('@RELEASE_ID@',release)
    (output/'OPERATOR.md').write_text(operator,encoding='utf-8')
    copy(BE/'src/main/resources/demus/history-contract.json',output/'verification/history-contract.json')
    source_root = FE.parent.parent/'demus-history-20261104/evidence'
    for name in ['source-schema-audit.json','source-coverage.json']:
        copy(source_root/name,output/'verification'/name)
    for name in ['archived-reference-result.json','archived-n1-result.json']:
        proofs=sorted(EVIDENCE.glob('auth-generated-*/'+name),key=lambda p:p.stat().st_mtime,reverse=True)
        require(proofs and read(proofs[0]).get('liveQaVerified') is False,'Current bounded archive proof required: '+name)
        copy(proofs[0],output/'verification'/name)
    coverage = read(source_root/'source-coverage.json')
    with (output/'verification/DEMUS-FIELD-MATRIX.csv').open('x',encoding='utf-8-sig',newline='') as f:
        writer=csv.writer(f);writer.writerow(['table','field','type','tab','coverageStatus','proofLimit'])
        for table in coverage['tables']:
            for column in table['columns']:
                writer.writerow([table['table'],column['name'],json.dumps(column,ensure_ascii=False),table['tab'],table['status'],'Archived schema; exact row links and live QA require operator acceptance'])
    sub=output/'frontend-update'
    shutil.copytree(FE/'dist',sub/'frontend')
    for name in ['frontend_release.py','capture-curator-response.js','test_frontend_release.py']:
        copy(FE/'scripts/qa-release'/name,sub/'operator'/name)
    protected_fe=FE.parent.parent/'uat-public-integration-20261104/fe'
    require((FE/'scripts/qa-release/frontend_release.py').read_bytes()==(protected_fe/'scripts/qa-release/frontend_release.py').read_bytes(),'Preserve atomic helper')
    retained=protected_fe.parent/'evidence/frontend-release-helper-tests.log'
    require('Ran 8 tests' in retained.read_text(encoding='utf-8') and '\nOK\n' in retained.read_text(encoding='utf-8'),'Retained unchanged Linux helper tests')
    copy(retained,output/'verification/retained-unchanged-helper-linux-tests.log')
    write(sub/'BUILD.json',{'kind':'MES_QA_FRONTEND_ONLY','releaseId':'mes-qa-original-uat-20261104-'+fc[:12],'frontendCommit':fc,'frontendBuild':build,'target':{'frontend':'/var/www/mes-qa','catalog':'POLAKOVA','catalogId':1,'backendPort':8085,'httpsPort':8444}})
    manifest(sub,[p for p in (sub/'frontend').rglob('*') if p.is_file()],sub/'FRONTEND.SHA256SUMS')
    manifest(sub,[p for p in sub.rglob('*') if p.is_file()],sub/'SHA256SUMS')
    for name in ['consolidated-fe-final.json',*NATIVE_LOGS,'consolidated-typecheck-final.log','consolidated-lint-final.log','consolidated-helper-selfcheck.log','consolidated-fingerprint-tests.log','consolidated-unit-selector.txt']:
        copy(EVIDENCE/name,output/'verification'/name)
    copy(FE/'artifacts/uat-design-guard.json',output/'verification/uat-design-guard.json')
    for path in browsers[0].parent.iterdir():
        if path.name=='browser-result.json' or path.name.startswith('generated-') and path.suffix=='.png':
            copy(path,output/'verification/generated-browser'/path.name)
    write(output/'BUILD.json',{'kind':'MES_QA_CONSOLIDATED_V58_CANDIDATE','releaseId':release,'frontendCommit':fc,'backendCommit':bc,'originalUatCommit':prior.BASELINE,'schemaBefore':48,'schemaAfter':58,'operationalContract':'QA_V58_INTEGRATED','modules':['DEMUS_HISTORY_V1','CURRENT_FLAGS_AND_AUDIT_NOTE','SCOPED_FEEDBACK'],'frontendTests':tests['numPassedTests'],'nativeTestGroups':groups,'testNote':'Native groups may overlap; skips are not passes. Browser uses actual HTTP and isolated generated PG fixtures. Archival excerpts are not live QA proof.','designChecks':75,'cssSha256':CSS,'liveQaVerified':False,'remoteDeploymentPerformed':False,'requiresSeparateMigrationGrantDeploymentApproval':True,'rollback':'Atomic FE restore; V48 backend requires separately approved DB recovery after V58. See OPERATOR.md.','migrations':migration_receipt,'changedFilesFrontend':git(FE,'diff','--name-only',prior.BASELINE,fc).splitlines(),'changedFilesBackend':git(BE,'diff','--name-only','8c1f976729a7a0371b7e0a0447f26912221142e3',bc).splitlines()})
    manifest(output,[p for p in output.rglob('*') if p.is_file()],output/'SHA256SUMS')
    full=archive(output,output.with_suffix('.zip'))
    frontend=archive(sub,output.parent/(release+'-frontend.zip'))
    # Separate backend/operator artifact contains the full coordinated schema plan, no FE assets.
    be_output=output.parent/(release+'-backend')
    require(not be_output.exists(),'Never overwrite backend artifact')
    be_output.mkdir()
    for name in ['backend','tools','migrations','ops','config','verification']:
        shutil.copytree(output/name,be_output/name)
    for name in ['BUILD.json','OPERATOR.md']:
        copy(output/name,be_output/name)
    (be_output/'STANDALONE.txt').write_text('Prefer the coordinated ZIP. This backend artifact requires the exact paired frontend ZIP from the release receipt. On the operator machine, unpack that frontend ZIP into frontend-update/ under this release directory before following OPERATOR.md. Never activate the frontend against an unchanged V48 backend. No operation is automatic.\n',encoding='utf-8')
    manifest(be_output,[p for p in be_output.rglob('*') if p.is_file()],be_output/'SHA256SUMS')
    backend=archive(be_output,be_output.with_suffix('.zip'))
    receipt={'releaseId':release,'coordinated':full,'frontend':frontend,'backend':backend,'jar':{'path':str(output/'backend/mes-qa.jar'),'sha256':sha(output/'backend/mes-qa.jar')},'frontendCommit':fc,'backendCommit':bc,'qaVerified':False}
    write(EVIDENCE/'qa-consolidated-latest.json',receipt)
    print(json.dumps(receipt,indent=2))

if __name__=='__main__':
    main()
