"""Local Linux tests, owned temporary directories only. No deployment or network."""
from pathlib import Path
import os
import json
import tempfile
import unittest
from unittest.mock import patch
import frontend_release as release


class ReleaseTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='mes-qa-frontend-test-', dir=Path.home())
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)

    def test_atomic_exchange_and_rollback_preserve_both_trees(self):
        left, right = self.root/'old', self.root/'new'
        left.mkdir(); right.mkdir()
        (left/'index.html').write_text('old')
        (right/'index.html').write_text('new')
        before = (left/'index.html').stat().st_ino
        release.exchange(left, right)
        self.assertEqual((left/'index.html').read_text(), 'new')
        self.assertEqual((right/'index.html').stat().st_ino, before)
        release.exchange(left, right)
        self.assertEqual((left/'index.html').read_text(), 'old')
        self.assertEqual((right/'index.html').read_text(), 'new')

    def test_trusted_tree_detects_modified_content(self):
        (self.root/'index.html').write_text('old')
        before = release.tree(self.root)
        (self.root/'index.html').write_text('new')
        self.assertNotEqual(before, release.tree(self.root))

    def test_symlink_tree_entry_rejected(self):
        (self.root/'bad').symlink_to('/etc/passwd')
        with self.assertRaisesRegex(RuntimeError, 'Symlink'):
            release.tree(self.root)

    def test_writable_tree_rejected(self):
        path = self.root/'bad'
        path.write_text('bad')
        path.chmod(0o666)
        with self.assertRaisesRegex(RuntimeError, 'Untrusted'):
            release.tree(self.root)

    def test_relative_target_rejected(self):
        with self.assertRaisesRegex(RuntimeError, 'Absolute'):
            release.trusted_directory(Path('relative'))

    def test_special_file_rejected(self):
        os.mkfifo(self.root/'fifo')
        with self.assertRaisesRegex(RuntimeError, 'Special'):
            release.tree(self.root)

    def test_receipt_is_private_and_atomically_updated(self):
        receipt = self.root/'receipt.json'
        release.save(receipt, {'phase': 'prepared'})
        release.save(receipt, {'phase': 'active'})
        self.assertEqual(receipt.stat().st_mode & 0o777, 0o600)
        self.assertEqual(receipt.read_text().count('active'), 1)
        self.assertFalse(receipt.with_suffix('.next').exists())

    def test_complete_prepare_activate_status_and_rollback(self):
        bundle = self.root/'bundle'
        (bundle/'operator').mkdir(parents=True)
        frontend = bundle/'frontend'
        (frontend/'assets').mkdir(parents=True)
        (frontend/'index.html').write_text('new index')
        (frontend/'assets/new.js').write_text('new chunk')
        commit = 'a'*40
        build = {'frontendCommit': commit, 'sourceDirty': False}
        (frontend/'qa-build.json').write_text(json.dumps(build))
        live = self.root/'var/www/mes-qa'
        (live/'assets').mkdir(parents=True)
        (live/'index.html').write_text('old index')
        (live/'assets/old.js').write_text('old chunk')
        old_tree = release.tree(live)
        versions = live.parent/'mes-qa-releases'
        receipts = self.root/'opt/mes-qa/frontend-updates'
        receipts.parent.mkdir(parents=True)
        metadata = {'releaseId': 'mes-qa-original-uat-20261104-'+commit[:12], 'kind': 'MES_QA_FRONTEND_ONLY', 'frontendCommit': commit, 'frontendBuild': build,
                    'target': {'frontend': str(live), 'catalog': 'POLAKOVA', 'catalogId': 1, 'backendPort': 8085, 'httpsPort': 8444}}
        (bundle/'BUILD.json').write_text(json.dumps(metadata))
        (bundle/'FRONTEND.SHA256SUMS').write_text(''.join(release.sha(path)+'  '+path.relative_to(bundle).as_posix()+'\n' for path in sorted(frontend.rglob('*')) if path.is_file()))
        with patch.multiple(release, LIVE=live, VERSIONS=versions, RECEIPTS=receipts, __file__=str(bundle/'operator/frontend_release.py')), patch.object(release, 'context', return_value='httpd_sys_content_t'), patch.object(release.subprocess, 'run') as commands:
            for action in ['prepare', 'activate', 'status', 'rollback', 'status']:
                with patch.object(release.sys, 'argv', ['frontend_release.py', action]):
                    release.main()
                if action == 'prepare':
                    self.assertEqual(release.tree(live), old_tree)
                elif action == 'activate':
                    self.assertEqual((live/'index.html').read_text(), 'new index')
                    self.assertEqual((live/'assets/old.js').read_text(), 'old chunk')
            self.assertEqual(release.tree(live), old_tree)
            commands.assert_not_called()  # No restorecon, Apache reload or other system mutation.


if __name__ == '__main__':
    unittest.main(verbosity=2)
