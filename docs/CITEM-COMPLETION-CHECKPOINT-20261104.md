# CITEM completion — development checkpoint 2026-11-04

Separate development branches: `codex/citem-completion-20261104` in FE and BE. Protected release `b9b76cced16b` and its archive are unchanged. No server access, QA database changes or deployment.

| Requirement | Before | Actual change / contract | Evidence | Status / remaining |
|---|---|---|---|---|
| A Advanced filter AST | Original builder disabled in scoped mode | Original builder enabled; bounded AND/OR/NOT AST, parameterized whitelist; POST curator-page/query, catalog fence retained; historical aliases use EXISTS/NOT EXISTS; acquisition-number and hierarchy-division predicates | CompletionSearchPostgres17Test (5), ScopedAdvancedFilterTest (3), advancedFilterContract.test.ts, CompletionCatalog.test.tsx | INTEGRATION TESTED on generated owned PG17. Specific unsupported original field predicates still require completion or documented source semantics. Not QA VERIFIED. |
| A createdAt / paging | Scoped sort rejected real createdAt | Real item.created_at with deterministic item.id tie, original default restored; original URL/back/forward state | Search test and component tests | INTEGRATION TESTED. Separate manual QA approval required for narrow column SELECT grants in ops/completion/001_runtime_read_created_at.sql; never applied to QA. |
| B create current fields | Core three fields only | Optional professional and inventory records saved in same transaction as creation receipt; existing per-section ACL, audit and CAS; zero/NULL and no invented DEMUS identity | CompletionCreationPostgres17Test | INTEGRATION TESTED on generated PG17. |
| B combined edit | Two current sections could not be saved together | Atomic PUT curator-records; existing item patch plus per-section writes, shared If-Match, rollback on denied section | 5 creation/edit native tests, originalCreate/Edit tests | INTEGRATION TESTED. |
| B next inventory number | No approved allocation rule | Expert question pending: approved series, prefix/suffix/zero padding, gaps reuse | User question in this conversation | BLOCKED BY APPROVAL for allocation rule only. Independent work continues. |
| C all 20 tabs | Components exist, operations uneven | Audit in progress; existing record, measurement, reference and source contracts retained | Original source-only design guard 74/74 | NOT IMPLEMENTED in full; never infer completion from tab count. |
| D dictionaries/authorities | Existing UUID material/technique and source bindings | Existing contracts retained, full integration audit pending | Existing tests, not yet rerun for complete batch | Not QA VERIFIED. Author remains text unless explicit authority approval. |
| E exports / print / worksets | Scoped operations incomplete; print only current page | Implementation pending after A/B checkpoint | None for new E changes yet | NOT IMPLEMENTED in full. |
| F media/admin/audit | Scoped read and prior admin functions exist | HTTP media upload and complete write integration still pending; no destructive DELETE | Prior release evidence only | NOT IMPLEMENTED in full / not QA VERIFIED. |
| G integration / release | Protected b9 candidate ready separately | Completion suite/build/package not yet produced | Local targeted evidence in ../evidence | NOT IMPLEMENTED. No completion release claim. |

## Evidence and invariants
Native generated PG17: compiler3 + search5 + creation/edit5 passed (search5 rerun after history predicates; earlier combined compiler3/search4/creation5 pass). No Polakova real-data functional acceptance inferred. Source-only original UAT guard74/74 passed; TypeScript and lint passed at A/B checkpoint. Full batch suite and production build remain pending. Original CSS baseline SHA256: 8aaf645251805d6da8174a0bb0a7d47ba6f0d855cdc3c8c30e91b027d964a5bc. All20 tab IDs/order retained.

## Resume
Continue C/D audit and missing approved contracts, E filtered XLSX/print/personal worksets, F upload/admin integration, G full tests/CSS guard/browser fixtures/manual release. No remote commands, QA migrations or grant application. Never replace old b9 release/archive. New forward migrations must be separate and tested only in owned local fixtures.
