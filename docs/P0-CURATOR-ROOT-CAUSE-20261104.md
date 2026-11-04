# Curator evidence contract — 4 November 2026

Status: QA duplicate no-store fields confirmed by operator; supplied metadata match. Browser combination and candidate fix proven locally. Actual DTOs and real-data workflow acceptance NOT VERIFIED.

Current authoritative evidence and optional QA-only header normalization: P0-QA-HEADER-CORRECTION-20261104.md and QA-OPERATOR-METADATA-20261104.json. Candidate60265e38f6dc already addresses the header incompatibility; production React/CSS/validation logic is unchanged in this follow-up.

The operator has now provided actual authenticated HTTP200 metadata and confirmed two no-store response fields. The full row DTOs have not been provided. The earlier private DNS/forwarding limitation was a Codex access limitation, not a deployed QA defect. The merged value fails the old Cache-Control predicate; no claim is made that all later DTO checks have passed on actual QA data. Use operator/capture-curator-response.js in the release on the already authenticated QA page, click its existing retry button, and save the metadata output without credentials or item contents. No extra request is initiated by this helper. Do not reload the page while capture is armed.

Request trace: DemusApp/catalog context → original AdminItems (or authenticated Catalog) → scopedIntegration/scopedApi → GET /api/v2/catalogs/{catalogId}/items/curator-page → CuratorCatalogController → CuratorCatalogService → catalog-owned, nondeleted item SQL/current assertions/source inventory projection → repeatable-read page/count response → exactJson → metadata validator → existing strict item/current/source validators → original compact table. Permission checks precede data queries. No legacy/public endpoint fallback was added.

| Check | Actual source contract and validation | Actual failing QA value |
|---|---|---|
| catalogId | Selected positive catalog ID; response must match; item catalog ownership also checked | Reported1 matches request1; each item ownership still pending |
| page | Zero-based integer, echoed exactly | Reported0 matches request0 |
| pageSize | Requested positive bounded size, echoed exactly | Reported50 matches request size50 |
| sort | Whitelisted field,direction, echoed exactly | Reported inventoryNumber,asc matches full request |
| semantics | CURRENT_ASSERTIONS_AND_SEPARATELY_LABELLED_SOURCE_INVENTORY | Reported exact match |
| items | Array of scoped projections; duplicate/foreign identities rejected | MISSING |
| totalElements | Exact nonnegative safe integer; no hardcoded total | Reported8155, safe and nonnegative |
| totalPages | ceil(totalElements/pageSize) | Reported164 = ceil(8155/50) |
| items.length | min(pageSize,max(0,totalElements-page*pageSize)) | Reported50, matches formula |
| Cache-Control | Private no-store required; original code incorrectly required byte-exact no-store | Two no-store fields confirmed; merged no-store, no-store fails old check |
| DTO | item{id,catalogId,title,inventoryNumber,accessionNumber,version}; current whitelist/currentPresent; currentInventory whitelist; source whitelist; nullable media flags | MISSING |
| query | q/page/size/sort extracted; remaining filters validated/bound by service; invalid or unsupported inputs rejected | MISSING |
| auth | Existing local-auth token + selected-catalog read capability; invalid catalog/401/403 stay errors | MISSING |

Public original default createdAt,desc and scoped QA default inventoryNumber,asc differ. The existing scoped whitelist does not authorize createdAt. Supported sort strings are sent and echoed without aliasing or silent mapping; unsupported chronological sorting remains a reported limitation. This difference alone does not explain a successful response failing its echoed sort check.

Proven defect: HTTP Cache-Control is a directive list; a proxy and origin can produce no-store, no-store. The old equality check rejects this valid privacy instruction. Existing QA Apache source and Spring both set no-store, matching the operator-confirmed QA duplication. [HTTP caching specification](https://www.rfc-editor.org/rfc/rfc9111.html#section-5.2) defines these directives; [Apache mod_headers](https://httpd.apache.org/docs/2.4/mod/mod_headers.html) explains header combination/duplication. Actual duplicated fields are confirmed by operator; raw body/DTO and complete real workflow acceptance remain pending.

Fix: parse the combined header semantically, including case and quoted extension values, and require an unqualified no-store directive. Missing headers, no-cache alone, public caching, malformed syntax and qualified no-store are rejected. All metadata, count, item/DTO, catalog, permission and source/current checks remain. Other scoped private-response checks use the same helper. Errors identify the failed metadata field without logging item contents or credentials.

Second proven defect: AdminItems returned only a bare error before rendering its original frame, search and toolbar. It now retains that frame and offers a retry; counts/table require actual data. Catalog likewise does not label an API failure as a zero-item successful search. No failures are converted to empty successful pages.

Header role finding: local-auth JWT source issues an empty global roles array; the old header checked only that array. Presentation now recognizes the already granted catalog.grant.manage capability for the original Administrátor label. It changes no authorization, global role, password or account. Without that capability the label stays Kurátor. Actual qa.admin capabilities remain unobserved.

No backend source/JAR change was necessary for the locally reproduced contract. No QA database, schema, migrations, users, infrastructure or public UAT was accessed or changed. Native PostgreSQL tests use disposable, isolated generated fixtures, not the Poláková database.

The expanded browser run initially exposed HTTP500 for dictionary references: its inherited v9 test role lacked SELECT on core.catalog_item_dictionary_reference. Existing reviewed QA runtime.sql already grants this read. Only the isolated test fixture was aligned (SELECT only, no DELETE); production source/configuration and actual QA grants were not changed. The final browser assertion rejects unexpected HTTP errors and all20 tabs pass. This separate fixture issue is not attributed to the actual QA deployment.
