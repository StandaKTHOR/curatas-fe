# Manual QA-only frontend candidate — 4 November 2026

Codex performs no server operation. This release contains only frontend static assets, evidence and operator helpers. Existing /opt/mes-qa/current, backend8085, DB, V1–V48, credentials, tunnel, TLS, SELinux policy and all vhosts remain unchanged. Public UAT443/8082 and experimental8443/8084 are outside the installer. Existing SELinux labels are checked read-only. No restorecon, relabel, policy or fcontext change is performed. If newly created static files do not inherit the required existing label, preparation stops without changing SELinux.

The operator has confirmed the exact root cause on actual QA: Headers.get= no-store, no-store fails only the original exact equality check; metadata and50 first-page DTOs passed. Candidate60265 already corrects this securely. The final ZIP retains that exact production frontend payload except build metadata, and requires NO Apache change/reload. The earlier optional patch is not included. Actual post-deployment table rendering and full CITEM/visual workflows remain NOT VERIFIED until the operator runs acceptance. Do not collect credentials/HAR or repeat the already completed first-page audit as a prerequisite; retain its sanitized result. See P0-CURATOR-ROOT-CAUSE-20261104.md.

Read-only existing-platform checks (AlmaLinux; no service restart):

```bash
cat /etc/os-release
python3 -c 'import hashlib,ctypes; assert hasattr(hashlib,"file_digest"); assert hasattr(ctypes.CDLL(None),"renameat2")'
systemctl --version
sudo stat -c '%U %G %a %C %n' /var/www/mes-qa /var/www/mes-qa/index.html
sudo readlink -e /var/www/mes-qa
curl --fail --silent --show-error http://127.0.0.1:8085/actuator/health
```

No apachectl wrapper, a2ensite or Debian paths. Health alone is not acceptance. No PostgreSQL command, migration or credential is required. A symlink live root, unexpected ownership/labels, changed content or different filesystem makes the helper STOP; review rather than improvise an overwrite.

Have the human operator copy the ZIP and its .sha256 file to /root/mes-qa-incoming on the QA app server. Become root and use a **new** root-owned directory under /opt/mes-qa/frontend-candidates (never /tmp). Requirements: existing Python3 (hashlib.file_digest available), unzip and coreutils; the server is already installed. No Node/Maven/application rebuild is needed.

```bash
sudo -i
cd /root/mes-qa-incoming
sha256sum -c mes-qa-original-uat-20261104-REPLACE.zip.sha256
install -d -m 0755 /opt/mes-qa/frontend-candidates
# Set this to the literal releaseId in the supplied BUILD.json/ZIP filename.
MES_FE_RELEASE=mes-qa-original-uat-20261104-REPLACE
test ! -e "/opt/mes-qa/frontend-candidates/$MES_FE_RELEASE" || exit 1
install -d -m 0755 "/opt/mes-qa/frontend-candidates/$MES_FE_RELEASE"
unzip "$MES_FE_RELEASE.zip" -d "/opt/mes-qa/frontend-candidates/$MES_FE_RELEASE"
cd "/opt/mes-qa/frontend-candidates/$MES_FE_RELEASE"
sha256sum -c SHA256SUMS
python3 operator/frontend_release.py prepare
python3 operator/frontend_release.py status
```

The final packaged copy of this document substitutes REPLACE with the actual commit prefix, yielding exact commands. Verify ZIP hash against the separately delivered checksum before extraction. Prepare leaves current QA frontend intact. It stages /var/www/mes-qa-releases/RELEASE, verifies every shipped frontend file, carries forward old immutable assets, rejects hash-name collisions/symlinks/untrusted writable roots, and records both complete tree hashes under /opt/mes-qa/frontend-updates. It takes an exclusive local lock. Do not manually edit these trees after preparation. If prepare fails partway, live remains unchanged; inspect the incomplete stage rather than rerunning or deleting original releases.

After reviewing the confirmed audit, original-UAT evidence and staged checksums, the human operator may activate the candidate:

```bash
python3 operator/frontend_release.py activate
python3 operator/frontend_release.py status
curl --fail --silent --show-error --resolve mes-qa.internal:8444:127.0.0.1 \
  https://mes-qa.internal:8444/qa-build.json
curl --fail --silent --show-error --resolve mes-qa.internal:8444:127.0.0.1 \
  https://mes-qa.internal:8444/login -o /dev/null
```

Use the already trusted QA CA; if needed add --cacert pointing at the EXISTING operator CA file. Never use -k. qa-build.json must match BUILD.json commit/QA flags. Directory activation uses one renameat2(RENAME_EXCHANGE) operation on the same filesystem, preserving both directories/inodes. No in-place asset overwrite, Apache configuration/reload or backend restart occurs. Already-open browser sessions can load prior hashed assets; ask testers to reload normally for the new entrypoint. Crash between atomic exchange and receipt update is recognized from complete tree hashes by status/rollback.

Rollback immediately if functional acceptance fails:

```bash
cd "/opt/mes-qa/frontend-candidates/$MES_FE_RELEASE"
python3 operator/frontend_release.py status
python3 operator/frontend_release.py rollback
python3 operator/frontend_release.py status
```

Rollback refuses modified/unknown trees and atomically restores the original frontend. Both trees and receipts remain; nothing is recursively deleted. No application/DB rollback is needed because none was changed. AlmaLinux deployment itself remains operator-only and NOT VERIFIED until these commands run.

Operator acceptance (record PASS/FAIL with browser screenshots and sanitized network metadata):

- Existing qa.admin login; select POLAKOVA catalog1; header reflects actual granted capabilities without elevation.
- Open Sbírky — evidence předmětů; real starting dataset8155 (unless the operator has since added records); actual inventory links and complete original toolbar/table. No Invalid curator page/totals; no blank error frame or fake zero count.
- Search, every supported filter, inventory/title sort, page2, last page163 (5 rows for the unchanged dataset), empty successful search, browser Back/Forward and return from detail retain URL state. Unsupported createdAt/advanced AST/export/worksets remain explicitly unavailable, not silently mapped.
- Open all20 unchanged specialist tabs; verify loaded original current/source values and repeated records. No masked errors. Compare equal viewport/zoom/role/state screenshots to original UAT; dataset/capability differences documented separately.
- If museum authorizes write acceptance, create an operator-approved test item and verify inventory formatting/save accessibility; edit permitted current values, reload, confirm DEMUS identity/lineage unchanged; test independent clone and stale If-Match conflict. Never silently delete test records: QA runtime has no DELETE. This package does not run writes automatically.
- Verify dictionary choices/three-level references, attachment download/photo preview, audit, reader denial and no unauthorized actions. Existing runtime/permissions remain authoritative.
- Record unsupported contracts and incomplete requirements from acceptance matrix. Health/login alone cannot close acceptance.

Optional read-only public source confirmation on its server, performed by human only: sha256sum /var/www/curatas-uat/assets/index-DGZIbTar.js /var/www/curatas-uat/assets/index-DIrNyf1d.css; compare public-assets.json. Branch label requires the actual deployment receipt/BUILD metadata if available. Do not modify public UAT.
