"""Local immutable completion release. No network, deployment or database connection."""
from pathlib import Path
import hashlib
import json
import re
import shutil
import subprocess
import zipfile

FE = Path(__file__).resolve().parents[2]
BE = FE.parent/'be'
EVIDENCE = FE.parent/'evidence'
ORIGINAL = FE.parent.parent/'uat-original-functionality-20261103/evidence/mes-qa-20261103-1a8b0c0adc47-f7311d6aa427'
BASELINE = 'db026f32cf3d0f9cf28ea6271e29c9d0443febc3'
PROTECTED = FE.parent.parent/'uat-public-integration-20261104/evidence/releases/mes-qa-original-uat-20261104-b9b76cced16b.zip'

def require(ok, message):
    if not ok:
        raise RuntimeError(message)

def git(root, *args):
    return subprocess.check_output(['git', *args], cwd=root, text=True).strip()

def read(path):
    return json.loads(path.read_text(encoding='utf-8'))

def sha(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()

def write(path, value):
    path.write_text(json.dumps(value, indent=2)+'\n', encoding='utf-8')

def copy(source, target):
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, target)

def manifest(root, paths, destination):
    destination.write_text(''.join(sha(p)+'  '+p.relative_to(root).as_posix()+'\n' for p in sorted(paths)), encoding='utf-8')

def main():
    for root in [FE, BE]:
        require(not git(root, 'status', '--porcelain', '--untracked-files=normal'), 'Commit all owned source before packaging: '+str(root))
    fc, bc = git(FE, 'rev-parse', 'HEAD'), git(BE, 'rev-parse', 'HEAD')
    build = read(FE/'dist/qa-build.json')
    require(build['frontendCommit'] == fc and build['sourceDirty'] is False and build['originalUatCommit'] == BASELINE, 'Rebuild clean committed FE')
    guard = read(FE/'artifacts/uat-design-guard.json')
    require(guard['status'] == 'PASS' and len(guard['checks']) == 75, '75 original UI checks required')
    tests = read(EVIDENCE/'completion-frontend-final.json')
    require(tests['success'] and tests['numFailedTests'] == 0 and tests['numPassedTests'] >= 610, 'Final full FE regression required')
    native_logs = ['completion-auth-edit-final.log', 'completion-qa-runtime-plan-final-v2.log', 'completion-final-contracts.log', 'completion-final-units.log', 'completion-clone-browser-final.log', 'completion-legacy-boundaries-final.log']
    native_groups = {}
    for name in native_logs:
        log = (EVIDENCE/name).read_text(encoding='utf-8')
        require('BUILD SUCCESS' in log, 'Incomplete/failed native evidence: '+name)
        counts = re.findall(r'Tests run: (\d+), Failures: (\d+), Errors: (\d+), Skipped: (\d+)', log)
        require(counts, 'Missing final test counts: '+name)
        total, failed, errors, skipped = map(int, counts[-1])
        require(failed == errors == 0, 'Native test failures: '+name)
        native_groups[name] = {'total':total, 'passed':total-skipped, 'failed':failed, 'errors':errors, 'skipped':skipped}
    require(sha(PROTECTED) == 'c697d470fd71843c47fe37f265e632b99c52ae8ac4a869babc84187a16edff1d', 'Protected b9 release changed')
    # Verify historical migrations byte for byte against protected previous backend Git.
    previous = FE.parent.parent/'uat-public-integration-20261104/be'
    migration_dir = BE/'src/main/resources/db/migration'
    migrations = sorted(migration_dir.glob('V*__*.sql'))
    require(len(migrations) == 57, 'Exact V1-V57 required')
    for path in migrations:
        version = int(path.name.split('__')[0][1:])
        if version <= 48:
            old = subprocess.check_output(['git', 'show', 'e298ff8e4ff277b0c563ed13628eefb908d4e1ba:src/main/resources/db/migration/'+path.name], cwd=previous)
            # Git blob is canonical LF; working checkouts can use CRLF.
            require(path.read_bytes().replace(b'\r\n', b'\n') == old.replace(b'\r\n', b'\n'), 'Historical migration changed: '+path.name)
    browsers = sorted(EVIDENCE.glob('auth-generated-*/completion-original-browser/browser-result.json'), key=lambda p:p.stat().st_mtime, reverse=True)
    require(browsers and read(browsers[0])['status'] == 'PASS', 'Current all20 original browser proof required')
    release = 'mes-qa-citem-20261104-'+bc[:12]+'-'+fc[:12]
    output = EVIDENCE/'releases'/release
    archive = output.with_suffix('.zip')
    require(not output.exists() and not archive.exists(), 'Never overwrite a release')
    jars = [p for p in (BE/'target').glob('*.jar') if not p.name.endswith('.original')]
    require(len(jars) == 1, 'One fresh packaged backend JAR required')
    require(jars[0].stat().st_mtime >= max(p.stat().st_mtime for p in (BE/'src/main').rglob('*') if p.is_file()), 'Stale backend JAR')
    output.mkdir(parents=True)
    copy(jars[0], output/'backend/mes-qa.jar')
    with zipfile.ZipFile(jars[0]) as jar:
        for source in sorted((ORIGINAL/'tools/lib').glob('*.jar')):
            key = 'BOOT-INF/lib/'+source.name
            require(key in jar.namelist(), 'Operator dependency not in actual JAR: '+source.name)
            dest = output/'tools/lib'/source.name
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(jar.read(key))
    for path in migrations:
        copy(path, output/'migrations'/path.name)
    for path in (BE/'ops/completion').glob('*.sql'):
        copy(path, output/'db'/path.name)
    copy(ORIGINAL/'db/runtime-acl-check.sql', output/'db/baseline-v48-runtime-acl-check.sql')
    for name in ['application-completion.properties', '90-citem-completion.conf.in']:
        copy(BE/'ops/completion'/name, output/'config'/name)
    copy(BE/'ops/completion/QaCompletionMigrate.java', output/'tools/QaCompletionMigrate.java')
    classes = sorted((EVIDENCE/'completion-helper-classes').glob('QaCompletionMigrate*.class'))
    require(len(classes) == 3 and all(p.stat().st_mtime >= (BE/'ops/completion/QaCompletionMigrate.java').stat().st_mtime for p in classes), 'Fresh compiled operator helper required')
    require('no DB connection' in (EVIDENCE/'completion-helper-selfcheck.log').read_text(encoding='utf-8'), 'Operator helper self-check required')
    for path in classes:
        copy(path, output/'tools'/path.name)
    copy(BE/'ops/completion/OPERATOR.md', output/'OPERATOR.md')
    operator = output/'OPERATOR.md'
    operator.write_text(operator.read_text(encoding='utf-8').replace('@RELEASE_ID@', release), encoding='utf-8')
    sub = output/'frontend-update'
    shutil.copytree(FE/'dist', sub/'frontend')
    for name in ['frontend_release.py', 'capture-curator-response.js', 'test_frontend_release.py']:
        copy(FE/'scripts/qa-release'/name, sub/'operator'/name)
    protected_fe = FE.parent.parent/'uat-public-integration-20261104/fe'
    require((FE/'scripts/qa-release/frontend_release.py').read_bytes() == (protected_fe/'scripts/qa-release/frontend_release.py').read_bytes(), 'Atomic frontend helper must remain unchanged')
    retained = protected_fe.parent/'evidence/frontend-release-helper-tests.log'
    require('Ran 8 tests' in retained.read_text(encoding='utf-8') and '\nOK\n' in retained.read_text(encoding='utf-8'), 'Retained unchanged Linux helper evidence missing')
    copy(retained, output/'verification/retained-unchanged-helper-linux-tests.log')
    write(sub/'BUILD.json', {'kind':'MES_QA_FRONTEND_ONLY', 'releaseId':'mes-qa-original-uat-20261104-'+fc[:12], 'frontendCommit':fc, 'frontendBuild':build, 'target':{'frontend':'/var/www/mes-qa', 'catalog':'POLAKOVA', 'catalogId':1, 'backendPort':8085, 'httpsPort':8444}})
    manifest(sub, [p for p in (sub/'frontend').rglob('*') if p.is_file()], sub/'FRONTEND.SHA256SUMS')
    for name in ['CITEM-COMPLETION-MATRIX-20261104.md', 'UPDATE2-FE-ACCEPTANCE-MATRIX.md', 'UPDATE2-FE-STATUS.md', 'QA-OPERATOR-METADATA-20261104.json']:
        copy(FE/'docs'/name, output/'docs'/name)
    for name in ['completion-frontend-final.json', *native_logs, 'completion-typecheck-final.log', 'completion-lint-final.log', 'completion-helper-selfcheck.log']:
        copy(EVIDENCE/name, output/'verification'/name)
    copy(FE/'artifacts/uat-design-guard.json', output/'verification/uat-design-guard.json')
    # Explicit safe allowlist: no private-input, generated passwords, TLS keys or HAR.
    for path in browsers[0].parent.iterdir():
        if path.name == 'browser-result.json' or (path.name.startswith('generated-') and path.suffix == '.png'):
            copy(path, output/'verification/generated-browser'/path.name)
    write(output/'BUILD.json', {'kind':'MES_QA_CITEM_BE_FE_COMPLETION_CANDIDATE', 'releaseId':release, 'frontendCommit':fc, 'backendCommit':bc, 'originalUatCommit':BASELINE, 'schemaBefore':48, 'schemaAfter':57, 'historicalItems':8155, 'frontendTests':tests['numPassedTests'], 'nativeTestGroups':native_groups, 'nativeGroupNote':'Groups overlap; do not sum as unique tests. Optional/default-profile skips are reported, not passes.', 'retainedUnchangedLinuxHelperTests':8, 'designChecks':75, 'cssSha256':'8aaf645251805d6da8174a0bb0a7d47ba6f0d855cdc3c8c30e91b027d964a5bc', 'liveQaVerified':False, 'remoteDeploymentPerformed':False, 'requiresSeparateMigrationGrantDeploymentApproval':True, 'rollback':'Frontend atomic rollback; old V48 backend requires separately approved database recovery after V57. Read OPERATOR.md.'})
    manifest(output, [p for p in output.rglob('*') if p.is_file()], output/'SHA256SUMS')
    with zipfile.ZipFile(archive, 'x', compression=zipfile.ZIP_DEFLATED, compresslevel=6) as zipped:
        for path in sorted(output.rglob('*')):
            if path.is_file():
                zipped.write(path, path.relative_to(output).as_posix())
    with zipfile.ZipFile(archive) as zipped:
        require(zipped.testzip() is None, 'ZIP integrity failed')
        for line in (output/'SHA256SUMS').read_text(encoding='utf-8').splitlines():
            digest, name = line.split('  ', 1)
            require(hashlib.sha256(zipped.read(name)).hexdigest() == digest, 'ZIP manifest mismatch: '+name)
    digest = sha(archive)
    archive.with_suffix('.zip.sha256').write_text(digest+'  '+archive.name+'\n', encoding='utf-8')
    receipt = {'releaseId':release, 'archive':str(archive), 'sha256':digest, 'frontendCommit':fc, 'backendCommit':bc, 'qaVerified':False}
    write(EVIDENCE/'qa-completion-latest.json', receipt)
    print(json.dumps(receipt, indent=2))

if __name__ == '__main__':
    main()
