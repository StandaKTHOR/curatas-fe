"""Local packaging only. Never connects to a server or database."""
from pathlib import Path
import hashlib
import json
import shutil
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[2]
EVIDENCE = ROOT.parent/'evidence'


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def read(path):
    return json.loads(path.read_text(encoding='utf-8'))


def sha(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT, text=True).strip()


def main():
    require(git('status', '--porcelain', '--untracked-files=normal') == '', 'Commit source first; no dirty source packaging')
    commit = git('rev-parse', 'HEAD')
    build = read(ROOT/'dist/qa-build.json')
    require(build['frontendCommit'] == commit and build['sourceDirty'] is False, 'Rebuild committed frontend using build:qa')
    require(build['flags'] == {'VITE_API_BASE': '/', 'VITE_APP_BASE': '/', 'VITE_LOCAL_AUTH_ENABLED': True, 'VITE_SCOPED_WORKSPACE_ENABLED': True, 'VITE_QA_NO_DELETE': True}, 'QA production flags required')
    guard = read(ROOT/'artifacts/uat-design-guard.json')
    require(guard['status'] == 'PASS' and len(guard['checks']) == 75, 'Original UAT design guard required')
    tests = read(EVIDENCE/'frontend-tests-final.json')
    require(tests['success'] and tests['numFailedTests'] == 0 and tests['numPassedTests'] >= 483, 'Full final frontend tests required')
    candidates = sorted(EVIDENCE.glob('auth-generated-*/original-form-creation/browser-result.json'), key=lambda path: path.stat().st_mtime, reverse=True)
    require(candidates, 'Native browser evidence missing')
    browser = read(candidates[0])
    require(browser['status'] == 'PASS' and any(check['name'] == 'all20-original-tabs-open-through-real-HTTP' for check in browser['checks']), 'All20 browser run required')
    require(not [request for request in browser['requests'] if request['status'] >= 400 and not (request['path'] == '/api/auth/local/refresh' and request['status'] == 401)], 'Unexpected browser API failures')
    release = 'mes-qa-original-uat-20261104-'+commit[:12]
    output = EVIDENCE/'releases'/release
    require(not output.exists() and not output.with_suffix('.zip').exists(), 'Version already exists; never overwrite a release')
    output.mkdir(parents=True)
    shutil.copytree(ROOT/'dist', output/'frontend')
    (output/'operator').mkdir()
    for name in ['frontend_release.py', 'capture-curator-response.js', 'test_frontend_release.py']:
        shutil.copyfile(ROOT/'scripts/qa-release'/name, output/'operator'/name)
    (output/'docs').mkdir()
    documents = ['P0-UAT-FOUNDATION-20261104.md', 'P0-CURATOR-ROOT-CAUSE-20261104.md', 'UPDATE2-FE-ACCEPTANCE-MATRIX.md', 'UPDATE2-FE-STATUS.md', 'P0-QA-FRONTEND-OPERATOR-20261104.md']
    for name in documents:
        text = (ROOT/'docs'/name).read_text(encoding='utf-8')
        if name == 'P0-QA-FRONTEND-OPERATOR-20261104.md':
            text = text.replace('REPLACE', commit[:12])
        (output/'docs'/name).write_text(text, encoding='utf-8', newline='\n')
    (output/'verification').mkdir()
    for name in ['foundation-proof.json', 'public-assets.json', 'native-test-summary.json', 'frontend-tests-final.json', 'lint.log', 'typecheck.log', 'frontend-release-helper-tests.log']:
        shutil.copyfile(EVIDENCE/name, output/'verification'/name)
    shutil.copyfile(ROOT/'artifacts/uat-design-guard.json', output/'verification/uat-design-guard.json')
    shutil.copyfile(ROOT.parent.parent/'batch23-verification/release/artifact-receipt.json', output/'verification/original-public-UAT-release-receipt.json')
    image_output = output/'verification/generated-browser'
    image_output.mkdir()
    for path in candidates[0].parent.iterdir():
        if path.name.startswith('generated-') and path.suffix in ['.png', '.json'] or path.name == 'browser-result.json':
            shutil.copyfile(path, image_output/path.name)
    comparison = EVIDENCE/'browser-generated-0a90e204-da16-45ee-ba08-fc994b217d6b'
    for name in ['original-login.png', 'integrated-login.png', 'original-login-computed.json', 'integrated-login-computed.json', 'browser-result.json']:
        shutil.copyfile(comparison/name, output/'verification'/('baseline-'+name))
    metadata = {'kind': 'MES_QA_FRONTEND_ONLY', 'releaseId': release, 'frontendCommit': commit, 'originalUatCommit': build['originalUatCommit'], 'previousQaFrontendCommit': 'f7311d6aa42741bdce5b3cc3caf197ef022c73da', 'unchangedBackendApplicationCommit': '1a8b0c0adc477da3e18b98b2056752a7ec29d913', 'frontendBuild': build, 'target': {'frontend': '/var/www/mes-qa', 'catalog': 'POLAKOVA', 'catalogId': 1, 'backendPort': 8085, 'httpsPort': 8444}, 'acceptance': 'CANDIDATE; ACTUAL QA FAILED OPERAND, REAL POLAKOVA AND POPULATED VISUAL ACCEPTANCE NOT VERIFIED', 'tests': {'frontend': tests['numPassedTests'], 'frontendFailed': 0, 'designChecks': 75, 'nativeContractAndBrowserPrior': 9, 'strictAll20ProxyBrowser': 1, 'operatorLinuxHelper': 8}}
    (output/'BUILD.json').write_text(json.dumps(metadata, indent=2)+'\n', encoding='utf-8')
    (output/'README.txt').write_text('QA FRONTEND ONLY CANDIDATE\nRead docs/P0-QA-FRONTEND-OPERATOR-20261104.md before any server action.\nActual QA failing operand/Polakova/pixel acceptance NOT VERIFIED.\nNo backend JAR, DB script, migration, credential or infrastructure change is included.\n', encoding='utf-8')
    def manifest(paths, destination):
        destination.write_text(''.join(sha(path)+'  '+path.relative_to(output).as_posix()+'\n' for path in sorted(paths)), encoding='utf-8', newline='\n')
    manifest([path for path in (output/'frontend').rglob('*') if path.is_file()], output/'FRONTEND.SHA256SUMS')
    manifest([path for path in output.rglob('*') if path.is_file()], output/'SHA256SUMS')
    archive = output.with_suffix('.zip')
    with zipfile.ZipFile(archive, 'x', compression=zipfile.ZIP_DEFLATED, compresslevel=6) as zipped:
        for path in sorted(output.rglob('*')):
            if path.is_file():
                zipped.write(path, path.relative_to(output).as_posix())
    digest = sha(archive)
    archive.with_suffix('.zip.sha256').write_text(digest+'  '+archive.name+'\n', encoding='utf-8')
    receipt = {'releaseId': release, 'zip': str(archive), 'sha256': digest, 'frontendCommit': commit, 'status': metadata['acceptance']}
    (EVIDENCE/'qa-frontend-latest.json').write_text(json.dumps(receipt, indent=2)+'\n', encoding='utf-8')
    print(json.dumps(receipt, indent=2))


if __name__ == '__main__':
    main()
