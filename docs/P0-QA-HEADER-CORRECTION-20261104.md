# Confirmed QA header duplication — 4 November 2026

Operator evidence: authenticated Brave, HTTPS through the operator's existing local SSH forwarding. HTTP200; catalogId1; page0; pageSize50; sort inventoryNumber,asc; semantics CURRENT_ASSERTIONS_AND_SEPARATELY_LABELLED_SOURCE_INVENTORY; totalElements8155; totalPages164; items.length50. Two separate response fields Cache-Control: no-store were observed. This is an operator report, not a raw HAR/body independently obtained by Codex. The workstation's private DNS/forwarding access is intentionally unavailable to Codex; its connection failure is not a QA service defect.

All supplied metadata match the exact frontend contract: ceil(8155/50)=164 and min(50,max(0,8155-0*50))=50. The complete request sort is now reported as inventoryNumber,asc; it is not being guessed from the sort field alone. The item's actual DTO schema, every row's catalog/identity/version/current/source values, Array.isArray on the actual body, and real UI workflows still require operator validation.

The original byte-exact Cache-Control predicate rejects no-store, no-store. A prior real Chromium/HTTP/native-PG browser regression already observed this merged value when an actual origin no-store and proxy no-store were emitted as separate fields. Its browser-result.json records cacheControl=no-store, no-store and successful loading after the candidate fix. Brave's own Headers.get output can additionally be recorded by the included capture script. This establishes the header incompatibility; it does not assert that no later DTO error remains.

Candidate60265e38f6dc already fixes this precise incompatibility by requiring a valid unqualified no-store directive, rejecting missing/weaker/public/malformed policies and preserving every catalog/query/pagination/DTO/authorization/ETag check. No further production React/CSS/API-validator modification is needed on the supplied evidence. This release keeps the production frontend payload identical to60265 (except source/build metadata), adds the reported-metadata regression, a private all-row DTO audit helper, updated evidence and an optional QA Apache patch. Full payload equality is enforced during packaging.

## Optional minimal QA Apache normalization

Inside the existing QA-only VirtualHost127.0.0.1:8444 / Location /api/, add the single line:

```apache
Header onsuccess unset Cache-Control
Header always set Cache-Control "no-store"
```

The second line already exists and must remain. The first clears the other internal response-header table; the always table is still set for success and error responses. Apache documents this exact normalization pattern for duplicated response fields in [mod_headers](https://httpd.apache.org/docs/2.4/mod/mod_headers.html#header). Do not merely remove Apache's no-store guarantee or weaken frontend validation. operator/qa-api-cache-control.patch adds only the first line to the preserved QA config. It is not applied by the frontend deployment helper. If the candidate FE alone is installed, it already accepts the valid duplicate fields; Apache normalization is independent cleanup of the proven duplicate.

No local Apache/httpd binary is installed in the isolated test environment. Patch scope/application/reversal are verified locally against the preserved QA config; actual AlmaLinux configuration syntax, reload and resulting response fields remain operator-only NOT VERIFIED.

## Exact manual sequence, performed by the operator only

Run on the QA app server, from the extracted release directory. No token/password is needed for config preparation. Determine the actual QA configuration filename from httpd -S; it is intentionally not guessed. The following input must name its dedicated QA-only config, not a combined UAT/shared file or symlink into the immutable installed release.

```bash
sudo -i
httpd -V
httpd -S
httpd -M
read -r -p 'Dedicated QA config filename shown by httpd -S: ' MES_QA_CONF
test -f "$MES_QA_CONF" && test ! -L "$MES_QA_CONF" || exit 1
python3 - "$MES_QA_CONF" <<'PY'
import pathlib,re,sys
p=pathlib.Path(sys.argv[1]); s=p.read_text()
assert str(p).startswith('/etc/httpd/'), 'Review nonstandard config path; do not alter original release files'
assert len(re.findall(r'<VirtualHost\b',s,re.I))==1
assert re.search(r'<VirtualHost\s+127\.0\.0\.1:8444\s*>',s,re.I)
assert re.search(r'^\s*ServerName\s+mes-qa\.internal\s*$',s,re.M)
assert re.search(r'^\s*DocumentRoot\s+/var/www/mes-qa\s*$',s,re.M)
assert 'http://127.0.0.1:8085/api/' in s
assert len(re.findall(r'^\s*Header\s+.*Cache-Control',s,re.M|re.I))==1
assert 'Header always set Cache-Control "no-store"' in s
print('Dedicated QA vhost and existing no-store confirmed; no edit performed.')
PY
test "$?" -eq 0 || exit 1
MES_HDR_BACKUP=$(mktemp -d /opt/mes-qa/header-backup-20261104.XXXXXX)
cp --preserve=all -- "$MES_QA_CONF" "$MES_HDR_BACKUP/original.conf"
patch --dry-run -- "$MES_QA_CONF" operator/qa-api-cache-control.patch
# Stop if dry-run is not clean. Add ONLY the first Header line shown above:
sudoedit "$MES_QA_CONF"
diff -u -- "$MES_HDR_BACKUP/original.conf" "$MES_QA_CONF"
httpd -t
```

Review that the diff contains exactly one added Header onsuccess unset Cache-Control line under the QA /api/ block. If syntax fails or any other change appears, restore the original file before any reload. Never use apachectl -S/a2ensite, edit global headers, or modify another virtual host. The existing QA frontend/BE/tunnel/DB/certificates remain unchanged by this config edit.

Only after Syntax OK and reviewing that one-line diff, the human operator may run:

```bash
systemctl reload httpd
systemctl is-active httpd
```

A shared httpd service gracefully reloads its full configuration; this does not change UAT configuration, but its timing must be coordinated by the operator. No reload is performed by Codex or any package script. The frontend-only fix can be used independently if this reload is deferred.

In the already authenticated Brave session, reissue the existing curator-page GET. Confirm one effective Cache-Control:no-store field (Headers.get returns exactly no-store), HTTP200, unchanged metadata, dtoAudit.valid=true for all50 rows, actual table and operator acceptance below. The no-store requirement must also remain on naturally encountered API error responses; do not induce failures or expose tokens to test it.

Apache-only rollback (use the same preserved MES_QA_CONF and MES_HDR_BACKUP variables):

```bash
cp --preserve=all -- "$MES_HDR_BACKUP/original.conf" "$MES_QA_CONF"
httpd -t
# Only after Syntax OK:
systemctl reload httpd
```

Keep the backup; do not remove previous releases. Frontend deployment/rollback is separate and remains the atomic directory procedure in P0-QA-FRONTEND-OPERATOR-20261104.md.

## Required real-data acceptance

Use operator/capture-curator-response.js on the already authenticated page, then click the existing retry button. It initiates no extra request, restores fetch after one capture, audits every DTO on that page, preserves exact bigint numeric tokens, and logs metadata/DTO failure indices/types only. It does not log item names, inventory values, identities, tokens or cookies. Capture output from page0 and the last page as well as actual filtered/sorted results. Save sanitized metadata, not a HAR with credentials. Original-check failure on duplicate Cache-Control is expected before normalization, even though the new FE correctly accepts it.

Real items remain NOT VERIFIED until the operator confirms all8155 are reachable via pagination (last page163 has5 items for the unchanged starting dataset), supported search/filter/sort and Back/Forward work, details and all20 tabs load their actual data, authorized current edits/conflicts respect ETags and preserve source lineage, and existing CITEM/MZM actions remain available according to real permissions. A DTO audit of one page does not certify the other pages or workflows. Do not hardcode totals or replace failed reads with successful empty lists. Unsupported-contract requirements remain listed in the acceptance matrix.
