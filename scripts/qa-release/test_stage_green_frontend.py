"""Portable payload validation tests only; Linux labels/rename require the actual operator host."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('stage_green',Path(__file__).with_name('stage_green_frontend.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class GreenStage(unittest.TestCase):
    def fixture(self,root):
        (root/'frontend/assets').mkdir(parents=True);(root/'frontend/index.html').write_text('GENERATED');(root/'frontend/assets/original.css').write_text('GENERATED CSS')
        build={'sourceDirty':False,'frontendCommit':'a'*40};(root/'frontend/qa-build.json').write_text(json.dumps(build))
        metadata={'kind':'MES_GREEN_FRONTEND_STAGED_ONLY','target':{'frontend':m.TARGET_PATH,'backendPort':8086,'database':'mes_green_20261104','catalogId':1},'frontendBuild':build,'frontendCommit':'a'*40};(root/'BUILD.json').write_text(json.dumps(metadata))
        (root/'FRONTEND.SHA256SUMS').write_text(''.join(m.sha(p)+'  '+p.relative_to(root).as_posix()+'\n' for p in sorted((root/'frontend').rglob('*')) if p.is_file()))
        return metadata
    def test_green_only_exact_payload_and_css(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);metadata=self.fixture(root)
            with patch.object(m,'CSS',m.sha(root/'frontend/assets/original.css')):
                self.assertEqual(metadata,m.payload(root))
                (root/'frontend/injected.txt').write_text('GENERATED extra')
                with self.assertRaisesRegex(RuntimeError,'file set'):m.payload(root)
    def test_rejects_blue_target_manifest_traversal_and_dirty_build(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);metadata=self.fixture(root);metadata['target']['frontend']='/var/www/mes-qa';(root/'BUILD.json').write_text(json.dumps(metadata))
            with self.assertRaisesRegex(RuntimeError,'separate green'):m.payload(root)
            metadata['target']['frontend']=m.TARGET_PATH;(root/'BUILD.json').write_text(json.dumps(metadata));(root/'FRONTEND.SHA256SUMS').write_text('a'*64+'  frontend/../../blue\n')
            with self.assertRaisesRegex(RuntimeError,'Unsafe'):m.payload(root)
if __name__=='__main__':unittest.main()
