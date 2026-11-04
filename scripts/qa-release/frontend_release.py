#!/usr/bin/env python3
"""Operator-only, frontend-only QA directory exchange. No network or DB access."""
import argparse
import ctypes
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import stat
import subprocess
import sys

LIVE = Path('/var/www/mes-qa')
VERSIONS = Path('/var/www/mes-qa-releases')
RECEIPTS = Path('/opt/mes-qa/frontend-updates')


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def sha(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def trusted_directory(path):
    require(path.is_absolute(), 'Absolute directory required')
    for part in [path, *path.parents]:
        info = part.lstat()
        require(stat.S_ISDIR(info.st_mode) and not part.is_symlink(), 'Real directory required: '+str(part))
        require(info.st_uid == 0 and info.st_mode & 0o022 == 0, 'Root ownership/no group or other write required: '+str(part))


def tree(path):
    trusted_directory(path)
    result = {}
    for entry in sorted(path.rglob('*')):
        info = entry.lstat()
        require(not entry.is_symlink(), 'Symlink rejected: '+str(entry))
        require(info.st_uid == 0 and info.st_mode & 0o022 == 0, 'Untrusted tree entry: '+str(entry))
        if entry.is_file():
            result[entry.relative_to(path).as_posix()] = sha(entry)
        else:
            require(entry.is_dir(), 'Special file rejected: '+str(entry))
    return result


def exchange(left, right):
    """Single atomic Linux operation; deliberately no non-atomic fallback."""
    require(left.parent.stat().st_dev == right.parent.stat().st_dev, 'Same filesystem required')
    library = ctypes.CDLL(None, use_errno=True)
    function = library.renameat2
    function.argtypes = [ctypes.c_int, ctypes.c_char_p, ctypes.c_int, ctypes.c_char_p, ctypes.c_uint]
    function.restype = ctypes.c_int
    if function(-100, os.fsencode(left), -100, os.fsencode(right), 2) != 0:
        number = ctypes.get_errno()
        raise OSError(number, os.strerror(number))


def context(path):
    value = subprocess.check_output(['stat', '--printf=%C', '--', str(path)], text=True)
    require(len(value.split(':')) >= 4, 'SELinux context unavailable')
    return value.split(':')[2]


def save(receipt, value):
    temporary = receipt.with_suffix('.next')
    with temporary.open('x', encoding='utf-8') as stream:
        json.dump(value, stream, indent=2)
        stream.write('\n')
        stream.flush()
        os.fsync(stream.fileno())
    os.chmod(temporary, 0o600)
    os.replace(temporary, receipt)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['prepare', 'activate', 'rollback', 'status'])
    args = parser.parse_args()
    require(sys.platform == 'linux' and os.geteuid() == 0, 'Run manually as root on the QA application server')
    os.umask(0o022)
    bundle = Path(__file__).resolve().parents[1]
    trusted_directory(bundle)
    metadata = json.loads((bundle/'BUILD.json').read_text(encoding='utf-8'))
    release = metadata['releaseId']
    require(re.fullmatch(r'mes-qa-original-uat-20261104-[0-9a-f]{12}', release), 'Unexpected release identity')
    require(metadata['kind'] == 'MES_QA_FRONTEND_ONLY', 'Frontend-only package required')
    require(metadata['target'] == {'frontend': str(LIVE), 'catalog': 'POLAKOVA', 'catalogId': 1, 'backendPort': 8085, 'httpsPort': 8444}, 'Pinned QA target mismatch')
    trusted_directory(LIVE)
    trusted_directory(RECEIPTS.parent)
    require((LIVE/'index.html').is_file(), 'Existing QA frontend index required')
    expected = {}
    for line in (bundle/'FRONTEND.SHA256SUMS').read_text(encoding='utf-8').splitlines():
        digest, relative = line.split('  ', 1)
        require(re.fullmatch('[0-9a-f]{64}', digest) and relative.startswith('frontend/'), 'Bad frontend manifest')
        path = Path(relative)
        require(not path.is_absolute() and '..' not in path.parts and '\\' not in relative, 'Unsafe manifest path')
        require(relative not in expected, 'Duplicate manifest entry')
        expected[relative.removeprefix('frontend/')] = digest
    require(tree(bundle/'frontend') == expected and bool(expected), 'Frontend checksum/file set mismatch')
    build = json.loads((bundle/'frontend/qa-build.json').read_text(encoding='utf-8'))
    require(build == metadata['frontendBuild'], 'Build metadata mismatch')
    require(build['sourceDirty'] is False and build['frontendCommit'] == metadata['frontendCommit'], 'Committed build required')
    for parent, mode in [(VERSIONS, 0o755), (RECEIPTS, 0o700)]:
        if not parent.exists():
            parent.mkdir(mode=mode)
        trusted_directory(parent)
    staged = VERSIONS/release
    receipt = RECEIPTS/(release+'.json')
    lock_path = RECEIPTS/'.lock'
    require(not lock_path.is_symlink(), 'Lock symlink rejected')
    with lock_path.open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        if args.action == 'prepare':
            require(not staged.exists() and not receipt.exists(), 'Release already prepared; inspect status before changing anything')
            old = tree(LIVE)
            shutil.copytree(bundle/'frontend', staged)
            for entry in [staged, *staged.rglob('*')]:
                os.chmod(entry, 0o755 if entry.is_dir() else 0o644)
            # Retain immutable old chunks so already-open pages survive the switch.
            old_assets = LIVE/'assets'
            if old_assets.exists():
                for entry in old_assets.rglob('*'):
                    relative = entry.relative_to(LIVE)
                    target = staged/relative
                    require(not entry.is_symlink(), 'Old asset symlink rejected')
                    if entry.is_dir():
                        target.mkdir(parents=True, exist_ok=True)
                    elif entry.is_file():
                        if target.exists():
                            require(sha(entry) == sha(target), 'Immutable asset name collision: '+str(relative))
                        else:
                            target.parent.mkdir(parents=True, exist_ok=True)
                            shutil.copyfile(entry, target)
                            os.chmod(target, 0o644)
            # Only label the new static tree according to existing local policy.
            subprocess.run(['restorecon', '-RF', str(staged)], check=True)
            require(context(LIVE/'index.html') == 'httpd_sys_content_t', 'Unexpected existing QA index label; stop for review')
            require(all(context(entry) == 'httpd_sys_content_t' for entry in [staged, *staged.rglob('*')]), 'New static tree labels differ; no policy changes allowed')
            new = tree(staged)
            require(all(new.get(key) == digest for key, digest in expected.items()), 'Staged payload changed')
            save(receipt, {'releaseId': release, 'phase': 'prepared', 'oldTree': old, 'newTree': new})
            print('PREPARED. Existing frontend unchanged. Review evidence/acceptance before activate.')
            return
        require(receipt.is_file() and not receipt.is_symlink(), 'Prepare this release first; real receipt required')
        record = json.loads(receipt.read_text(encoding='utf-8'))
        require(record['releaseId'] == release, 'Receipt identity mismatch')
        live_tree, version_tree = tree(LIVE), tree(staged)
        prepared = live_tree == record['oldTree'] and version_tree == record['newTree']
        active = live_tree == record['newTree'] and version_tree == record['oldTree']
        require(prepared or active, 'Directory contents changed; stop for review. No overwrite performed.')
        if args.action == 'status':
            print('ACTIVE' if active else 'PREPARED / ROLLED BACK')
            return
        require(prepared if args.action == 'activate' else active, 'Requested transition is not applicable')
        # Index/asset inode contents remain intact; no backend/service/vhost mutation.
        exchange(LIVE, staged)
        record['phase'] = 'active' if args.action == 'activate' else 'rolled-back'
        save(receipt, record)
        print(record['phase'].upper()+'. Both directory trees preserved. Run manual HTTPS and functional checks.')


if __name__ == '__main__':
    try:
        main()
    except (RuntimeError, OSError, ValueError, KeyError) as error:
        sys.exit('STOP: '+str(error))
