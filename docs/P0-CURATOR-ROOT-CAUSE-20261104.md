# Confirmed curator-page root cause — 4 November 2026

CONFIRMED by the human operator's actual capture from authenticated live QA. Exactly one original check failed: Cache-Control exact original check. response.headers.get("Cache-Control") returned no-store, no-store. All other captured checks passed; dtoAudit={checkedItems:50,valid:true,failures:[]}. No raw credentials or item contents were requested or copied. Structured evidence: QA-OPERATOR-METADATA-20261104.json.

| Original condition | Actual operator-captured result | Assessment |
|---|---|---|
| HTTP/authentication | Authenticated HTTP200 | PASS for this request |
| catalogId equals selected catalog1 | 1 | PASS |
| page equals request0 | 0 | PASS |
| pageSize equals request size50 | 50 | PASS |
| sort equals complete request | inventoryNumber,asc | PASS |
| semantics literal | CURRENT_ASSERTIONS_AND_SEPARATELY_LABELLED_SOURCE_INVENTORY | PASS |
| items array and length | Other captured checks passed;50 rows audited | PASS for captured page |
| totalElements safe nonnegative integer | 8155 | PASS |
| totalPages=ceil(totalElements/size) | 164=ceil(8155/50) | PASS |
| row count=min(size,max(0,total-page*size)) | 50 | PASS |
| exact Cache-Control equality to no-store | no-store, no-store | FAIL — identified cause |
| item/current/currentInventory/source/media DTO checks |50 checked; valid=true; failures=[] | Operator-confirmed PASS for page0 |

The original validator throws Invalid curator page at the exact Cache-Control predicate. This is now a demonstrated failure condition on live QA, not a hypothesis. It does not imply a sort/catalog/pagination mismatch. Public UAT createdAt sorting versus the scoped inventoryNumber default is a separate documented contract limitation, not the cause of this captured error.

Candidate60265e38f6dc already fixes this exact problem: hasPrivateNoStore requires a syntactically valid, unqualified no-store directive and handles duplicate fields combined into a directive list. It rejects missing headers, max-age alone, no-cache alone, private alone, public caching even alongside no-store, qualified no-store and malformed syntax. Metadata, totals, item identities/catalog ownership, current/source DTOs, duplicate IDs, permissions and ETag/If-Match checks remain active. Caching is not enabled to fix the error.

Request trace: original DemusApp/catalog context → AdminItems/Catalog → scopedIntegration/scopedApi → authenticated GET /api/v2/catalogs/{catalogId}/items/curator-page → CuratorCatalogController → catalog-authorized CuratorCatalogService SQL/current assertions/source projections → repeatable-read count/page response → exactJson → metadata validator → strict DTO/ownership checks → original compact table. No public/legacy fallback and no fake successful empty results.

This final delivery keeps every production frontend file byte-identical to60265 except qa-build.json, with packaging-time equality enforcement. That candidate was built from verified original public UAT Git commit db026f32cf3d0f9cf28ea6271e29c9d0443febc3 with eight prior QA feature commits ported individually. Original stylesheet bytes, public compiled CSS SHA and all20 tab IDs/order are protected by automated guards. No new production React, CSS or API-validator change is needed after the confirmed audit.

Apache changes are NOT REQUIRED. The final frontend-only bundle omits the earlier optional Apache patch and commands; do not apply that earlier patch as part of this release. No Apache reload, backend rebuild/restart, migration, DB/account/tunnel/certificate/SELinux change is required. Installer label checks are read-only and stop on mismatch without relabeling.

Acceptance is scoped honestly: live QA page0 metadata and50 DTOs are operator-confirmed; the fix and private-cache rejection are locally tested. The operator must still deploy this frontend and verify actual original-table rendering, reachability of all8155 items, filters/sorts/pagination/detail, all20 populated tabs, authorized edits/conflicts and equal-state original-UAT visual acceptance. One captured page is not a test of the whole CITEM integration. See UPDATE2-FE-ACCEPTANCE-MATRIX.md and P0-QA-FRONTEND-OPERATOR-20261104.md. No remote deployment was performed by Codex.
