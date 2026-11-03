"""Read-only source/build checks against the observed deployed UAT source commit.
Not a substitute for human visual acceptance of all populated tabs.
"""
import collections, hashlib, json, pathlib, re, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
BASE = 'db026f32cf3d0f9cf28ea6271e29c9d0443febc3'
CSS_SHA = '8aaf645251805d6da8174a0bb0a7d47ba6f0d855cdc3c8c30e91b027d964a5bc'

def git(*args):
    return subprocess.check_output(['git', '-C', str(ROOT), *args])

files = git('ls-tree', '-r', '--name-only', BASE).decode().splitlines()
checks = []
for name in files:
    if name.startswith('src/') and name.endswith(('.css', '.scss', '.sass')):
        expected = git('rev-parse', BASE + ':' + name).decode().strip()
        actual = git('hash-object', '--path=' + name, str(ROOT / name)).decode().strip()
        checks.append({'name': 'unchanged-source-style:' + name,
                       'pass': expected == actual, 'gitBlobExpected': expected, 'gitBlobActual': actual,
                       'rawCheckoutEqualsGitBlobBytes': (ROOT / name).read_bytes() == git('show', BASE + ':' + name),
                       'comparison': 'Git clean filters account explicitly for Windows CRLF checkout; no style file is edited.'})
for name in files:
    if name.startswith('src/') and name.endswith('.tsx'):
        target = ROOT / name
        if not target.exists():
            checks.append({'name': 'original-component-retained:' + name, 'pass': False})
            continue
        old = git('show', BASE + ':' + name).decode('utf-8')
        new = target.read_text(encoding='utf-8')
        literal = r'className\s*=\s*"([^"]*)"'
        removed = collections.Counter(re.findall(literal, old)) - collections.Counter(re.findall(literal, new))
        checks.append({'name': 'original-class-literals-retained:' + name, 'pass': not removed,
                       'removed': dict(removed)})
name = 'src/pages/AdminItemForm.tsx'
def tabs(text):
    section = text.split('aria-label="Karty DEMUS"', 1)[1].split('.map(', 1)[0]
    return re.findall(r"\['([^']+)'\s*,", section)
before = tabs(git('show', BASE + ':' + name).decode('utf-8'))
after = tabs((ROOT / name).read_text(encoding='utf-8'))
checks.append({'name': 'same-20-tabs-in-same-order', 'pass': len(before) == 20 and before == after})
css = ROOT / 'dist/assets/index-DIrNyf1d.css'
checks.append({'name': 'compiled-css-identical-to-public-UAT',
               'pass': css.is_file() and hashlib.sha256(css.read_bytes()).hexdigest() == CSS_SHA})
report = {'baseline': BASE, 'cssSha256': CSS_SHA, 'checks': checks,
          'status': 'PASS' if all(c['pass'] for c in checks) else 'FAIL',
          'limit': 'Source/class and exact CSS checks; populated catalog/detail need human visual acceptance.'}
pathlib.Path(sys.argv[1]).write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({'status': report['status'], 'checks': len(checks), 'failed': [c for c in checks if not c['pass']]}))
sys.exit(0 if report['status'] == 'PASS' else 1)
