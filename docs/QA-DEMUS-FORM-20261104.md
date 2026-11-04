# QA historical form presentation — 4 November 2026

Frontend-only continuation of deployed header commit 8759528d34b38e6a78a1215309e944375ec6371c, whose parent is B9 b9b76cced16ba050a9ec4b68e967fccde19dc216. Original UAT baseline: db026f32cf3d0f9cf28ea6271e29c9d0443febc3. Existing B9, header release and CITEM completion archives are not overwritten. No backend, schema, migration, Apache, certificate, identity, grant, SSH or SELinux changes belong to this package.

## Data and presentation contract

The existing read-only `source-inventory` endpoint and `scopedApi.inventoryColumns` expose exactly these nullable string fields:

`Predmet_S, Titul_S, Rada_S, PorC_S, Lomeni_S, HPorC_S, StatSpr_S, Spravce_S, Odd_S, Podsb_S, Pocet_S, Ozn_S, JineC_S, Karta_S, Opsana_S, Overena_S, Zapsal_S, DatZap_S, Skupina_S, Urcil_S, DatZm_S, Fond_S`.

Backend evidence: V48 `InventoryWorkspaceService.COLUMNS`; frontend evidence: `src/features/scoped/scopedApi.ts`, `originalAdapter.ts`, `OriginalSourceBridge.tsx`. The SDK retains catalog/item/semantics/DTO/strong ETag/private no-store validation. Source and current authority reads must both match the parent item ETag. Responses from another item, catalog, authentication context or revision are discarded and aborted. Failure to read evidence is never evidence that historical data is absent.

| Source | Existing form location | Rules |
|---|---|---|
| Predmet_S | Name/type field; object type selector's empty option | Current nonblank value wins. In view mode the name displays marked DEMUS text; in edit mode only its placeholder displays the source, with the actual editable value unchanged. |
| Fond_S | Fund selector's empty option | Marked DEMUS text only; never selected as a dictionary ID. An actual current fund binding takes priority, including an unresolved current record ID. |
| Podsb_S | Existing subcollection field | Explicitly historical source code, never resolved to an authority name/ID. Current value wins; editable value remains current. |
| Pocet_S | Existing current quantity label | Separately labelled historical quantity when current quantity is null. Historical zero is preserved. Never assigned to the numeric input. |
| Zapsal_S / Urcil_S | Existing DEMUS recording information paragraph | Marked historical recorded-by / determined-by text. Urcil is neither current author nor modified-by. |
| DatZap_S / DatZm_S | Existing historical recorded / changed dates | Exact source text, including unusual historical dates; no timezone/date reinterpretation. |
| Titul_S | Existing header Titul and expanded DEMUS section | Existing header implementation retained. No reinterpretation as Predmet_S. |
| Remaining 13 fields | Existing expanded DEMUS source projection and identity section | Available under their exact original names with existing lineage. No invented destination or editable assertion. |

Missing values stay the existing empty input / em dash presentation. Empty string and null remain distinct in historical metadata; zero is not treated as absent. No source value is passed to `setForm`, current drafts, save functions or request bodies. Existing onChange handlers only record deliberate current edits. Historical data is not a prefilled current assertion. Current author/dating/description continue to come from current form/party data; there are no approved author, object-dating or description fields in this 22-column projection. `Změnil v DEMUS` remains unavailable because the projection contains no verified changed-by actor.

## All 20 tabs: availability audit

The tab labels, order, classes, containers and CSS remain unchanged. Availability below concerns historical data, not the existence of current editing functionality. Current-only endpoints must not be described as complete DEMUS history.

| Original tab | Historical data / contract status |
|---|---|
| Základ | Name, fund, source subcollection code, historical quantity, recorded/determined actors and historical dates now visible in existing controls/labels; full 22-field projection preserved. |
| Určení | Current determination records retained. Historical Urcil_S is shown in the basic recording information. Complete historical determination records: NOT EXPOSED by V48 current-owned records endpoint. |
| Vznik | Current origin records retained. Complete historical origin rows: NOT EXPOSED by this V48 projection. No invented mapping. |
| MatTech | Existing typed read-only SourceMatTechPanel, provenance and current materials/techniques retained. |
| Míry | Existing SourceDimensionsPanel and current measurement read retained. |
| Zařazení | Current classification retained; source group/department/collection codes remain in original DEMUS projection, without mapping them to current authority IDs. Complete historical classification rows: NOT EXPOSED. |
| Historie | Existing source identity/lineage and DEMUS projection preserved. Source actor/date fields additionally visible above. No complete raw historical row endpoint. |
| Dokumentace | Current documentation retained. Complete historical documentation rows: NOT EXPOSED. |
| Reference | Current references retained. Complete historical reference rows: NOT EXPOSED. |
| Manipulace | Current records retained. Complete historical manipulation rows: NOT EXPOSED. |
| Akce | Current records retained. Complete historical event rows: NOT EXPOSED. |
| ISO | Current records retained. Complete historical ISO rows: NOT EXPOSED. |
| Plus | V48 has no typed Plus/Sluz source route. Completion branch already has its separate typed sourcePlus reader and provenance/pagination; preserved during port. No fabricated V48 source data. |
| Vyřazení | Current records retained. Complete historical deaccession rows: NOT EXPOSED. |
| Akvizice | Existing acquisition presentation retained. Complete source acquisition object is not provided by the V48 current detail DTO; unavailable is not empty historical evidence. |
| Číselníkové vazby | Existing current authority bindings / source-qualified choices preserved. Textual source labels never become current dictionary IDs automatically. |
| Přílohy | Existing authorized media readers/downloads retained; no new historical inventory field mapping. |
| Umístění | Existing current location retained; no verified historical source location field in the 22-column contract. |
| Foto | Existing authorized media presentation retained; no source field promotion. |
| Audit | Existing catalog audit with capability checks retained; audit denied is not empty history. |

## Validation and limits

Tests cover source-only/current-only/conflicting/missing/Czech values, numeric zero, no unintended save, deliberate current edits, wrong revision, item/catalog/auth switches, late replies, abort and API failure. Original-source guard checks all 20 tab labels/order and source CSS; production guard additionally checks compiled CSS. Full test counts and logs are shipped under verification.

Reference names `kredenc kuchyňská`, `židle`, `nábytek` in regression tests are generated fixtures based on operator-provided examples, not new captures of N 3_CZE6MM E / N 4_CZE6MM E. Actual authenticated QA UI, full 8,155-record browsing and screenshot comparison remain OPERATOR VERIFICATION REQUIRED. QA is accessible through the operator's local forwarding; no DNS probing is needed. The existing extreme 3,600-character-title header overflow remains a documented original UI limitation by explicit user choice. No redesign or CSS fix is included.

## Manual deployment and rollback

The archive supplies BUILD.json, SHA256SUMS, FRONTEND.SHA256SUMS and the unchanged guarded Linux atomic exchange helper. Use the literal release name below as substituted in the packaged document. Perform these commands manually as root on the QA application server after copying the ZIP and its separately delivered checksum into /root/mes-qa-incoming. No commands here are executed by Codex.

```bash
sudo -i
cd /root/mes-qa-incoming
MES_FE_RELEASE=mes-qa-original-uat-20261104-REPLACE
sha256sum -c "$MES_FE_RELEASE.zip.sha256"
cat /etc/os-release
systemctl --version
httpd -V
httpd -S
httpd -M
python3 -c 'import hashlib,ctypes; assert hasattr(hashlib,"file_digest"); assert hasattr(ctypes.CDLL(None),"renameat2")'
curl --fail --silent --show-error http://127.0.0.1:8085/actuator/health
install -d -m 0755 /opt/mes-qa/frontend-candidates
test ! -e "/opt/mes-qa/frontend-candidates/$MES_FE_RELEASE" || exit 1
install -d -m 0755 "/opt/mes-qa/frontend-candidates/$MES_FE_RELEASE"
unzip "$MES_FE_RELEASE.zip" -d "/opt/mes-qa/frontend-candidates/$MES_FE_RELEASE"
cd "/opt/mes-qa/frontend-candidates/$MES_FE_RELEASE"
sha256sum -c SHA256SUMS
python3 operator/frontend_release.py prepare
python3 operator/frontend_release.py status
# Human decision after reviewing staging and the separately supplied backend hotfix:
python3 operator/frontend_release.py activate
python3 operator/frontend_release.py status
curl --fail --silent --show-error --resolve mes-qa.internal:8444:127.0.0.1 https://mes-qa.internal:8444/qa-build.json
```

Use the existing trusted CA (add --cacert with its actual path when necessary), never -k. The helper targets only /var/www/mes-qa; it refuses symlinks, unsafe ownership/permissions, incorrect existing or newly inherited static SELinux labels, altered trees and different filesystems. It does not fix labels or mutate policy. It preserves old immutable assets and records full old/new tree hashes. Activation is a single Linux renameat2 exchange. No restart, public UAT change or backend operation is performed. If backend8085 is unavailable, stop and use the separate priority-A instructions; this frontend cannot repair backend startup.

In the authenticated browser verify POLAKOVA catalog1 / total8,155, normal filtering/sorting/page navigation, reference items N 3_CZE6MM E and N 4_CZE6MM E, marked source fallbacks under the header, all20 tabs and existing capabilities. View current/source conflicts and edit-mode placeholders. Do not save historical values as a test. Confirm existing edit/save and stale ETag handling using operator-approved current edits only. Record screenshots, actual source responses and PASS/FAIL; compilation is not acceptance.

If acceptance fails, in the same candidate directory:

```bash
python3 operator/frontend_release.py status
python3 operator/frontend_release.py rollback
python3 operator/frontend_release.py status
```

Rollback atomically restores the exact pre-activation QA frontend, preserving both trees. Never overwrite or delete the original B9/header release, and never restore/migrate the database for this presentation-only patch.

## Completion branch carry-forward

This branch retains all existing completion functionality from b20a38723b906fb16b4cbacc40a504a4fb6b3a98. Header correction 8759528d34b3 was cherry-picked as 622a57d. Form presentation correction c893d2a was ported as 2e7a521, preserving the newer originalCanEdit inventory authorization during conflict resolution. The legacy metadata guard and actual-form component tests are also carried forward. The frontend-only ZIP and commands above belong to the separate B9/header hotfix branch, not a replacement completion release. The previous full completion archive is immutable and remains unchanged.
