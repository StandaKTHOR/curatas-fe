# Final frontend handoff — 12 October 2026

Repository `D:/ProjektyJava/IdeaProjects/curatas-fe`, branch `feature/citem-demus-ui-24092026`.

**DESIGN PARITY: PARTIAL. FUNCTIONAL INTEGRATION: PARTIAL. READY FOR UAT PREFLIGHT: YES.** Available verified contracts are implemented and the local package is prepared. Full museum semantics and deployed acceptance remain unresolved. No backend edits, MDB imports, deployment, Railway, DNS or Apache changes were performed.

## Authorities and baseline

Original authority: `E:/___MojeProjekty/MuzejniAppka/Demus Kat Printscreens.docx`; extracted card/table references in `update2-comparison/`. First evidenced successful React baseline: `5e728e8cc46c2c9b6b8e1cf6dcffd7ac5436b697`. Earlier `ebd39b4` still had a 280px sidebar; no branch revert was appropriate. See [baseline checkpoint](UPDATE2-FE-VISUAL-BASELINE-20261012.md).

Read-only BE authority: final backend handoff, FE museum handoff, functional gap audit, museum model, API/runbook documents, Java DTO/service/controller source at backend revision `6c17f477434fcfe8213b1dc52480be9442ad95ae`. Final contracts supersede the historical gap matrix. Binding CITEM conclusions are mapped in [acceptance matrix](UPDATE2-FE-ACCEPTANCE-MATRIX.md).

FE AGENTS.md: MISSING. Independent museum acceptance document/email files: MISSING locally. Full extracted user help: MISSING/NOT VERIFIED. Newer audit identifies `KATALOG.HLP`; its binary topics have not been extracted/validated here. Earlier “help missing” must not be interpreted as absence of that file.

## Implemented screens

- Shared red title/menu bar, grey workspace, blue labels, compact toolbar, full desktop width, responsive layout.
- Staff/public catalogue: accepted 31px rows, real sorting/server filters/pagination, row selection, top/bottom page controls, return-state preservation. Public physical-location filter/column choices removed.
- Create/edit and staff read-only detail: persistent identity/current quantity, compact main fields and structured inventory components, accessible Save, optional accession, required inventory and title OR type, dirty-state/concurrency protection. Read-only source history remains navigable and photo upload is disabled.
- Direct cards: Základ, Určení, Vznik, MatTech, Míry, Zařazení, Historie, Dokumentace, Reference, Manipulace, Akce, ISO, Plus, Vyřazení, Akvizice. Extensions: Číselníkové vazby, Přílohy, Umístění, Foto, Audit. Important fields are accessed through visible navigation, not CSS hiding.
- Separate current material/technique scalars and tuple rows, dimensions, root acquisition and repeated acquisitions; documentation evidence distinct from actual downloadable attachments.
- Authenticated media upload/download and caption metadata editing retain persisted refresh/error handling. No sample ID or mock was added to production components.

## API contract matrix

| Contract | Implementation / evidence | State |
|---|---|---|
| demus-identity quantities/native years | Numeric/null validation; source/current count and neutral discrepancy; no automatic repair/approval claim | Implemented, fixture verified |
| Root DETERMINATION | Returned `_UR` fields; explicit payload null wins; Sbirky/Urceni distinct; no invented Predmet_UR/Pozn_UR | Implemented, fixture verified |
| sourceAcquisition | Dedicated read-only root evidence, exact raw date, boolean flag; no synthetic child AQ | Implemented, fixture verified |
| vocabularies | Actual IDs/code/label, nullable role, correct origin, bounded excerpt/hasMore | Implemented, fixture verified |
| demus-lineage | Authenticated bounded paging/client for items/dictionaries/parties; item/dictionary UI entry points | Implemented; universal party-history UI remains absent |
| MATERIAL_TECHNIQUE | Typed tuple, actual material/technique IDs, order 1406 preserved, no generic tuple clear | Implemented, fixture verified |
| BIBLIOGRAPHY | Ref_RF/Str_RF, LITERATURE IDs, code distinct from label; explicit code-application action | Implemented, fixture verified |
| Professional writes | `fields:{kind,...delta}`; supported CLASSIFICATION payload; no immutable/unknown source writes | Implemented |
| Current parties | CurrentParty shown separately; IDs for DETERMINATION/ORIGIN/MANIPULATION, historical text unchanged by selection | Implemented, fixture verified |
| Link removal | Explicit clearParty/clearDictionary; null/omitted IDs preserve; selecting cancels clearing | Implemented; tuple generic removal unsupported |
| HTTP400 references | Czech explanation, invalid indication, entered citation preserved | Component/browser verified |
| Historical filters | Exact historicalInventoryNumber/acquisitionRecordNumber; eight text operators only, nested AND/OR, exact spaces, server JSON/URL encoding | Implemented, HTTP-fixture/component verified |
| Native years/reviewed dates | Separate source year predicates/evidence; no year-to-January-1 conversion; calendar precision retained | Implemented |
| ETag/If-Match | Consistent snapshot, quoted opaque token, returned-token chaining, version checks around child reads; no blind retry | Implemented; 400/401/403/404/409/412/428 and missing token tested |
| Media | Existing independent endpoint contract; no invented aggregate If-Match | Implemented, fixture verified |
| Public privacy | Restricted endpoints; no source/lineage requests or storage UI | Local verified; institution scope needs live checks |

A rejected write never reports success. Refresh failure after an accepted write can still require reload; multiple writes are not claimed to be transactional. Stale drafts retain their old token. Full interactive reconciliation of every related-record field is not implemented.

## Source evidence and tests

`src/test/fixtures/museum-samples.json` contains whitelisted accepted isolated-source excerpts with manifest/projection provenance. Physical storage/coordinates/historical media paths are excluded. Local numeric IDs are test-only and must never be assumed on UAT; production records are found by actual API identity/search. No seeds/imports were run.

| Safe sample | Evidence |
|---|---|
| GrJBu 1142 | Root determination, source count 2, alias excerpts. Browser current=1 is explicitly synthetic. Safe excerpt lacks Urcil_S/DatUrc_S; no actor/date is invented. Separate typed-return/null tests cover the verified fallback contract. |
| TEX 54388 | MatTech hedvábí, technique null, order 1406, dictionary 281 |
| ST 1669/14 | ORIGIN native year 1776, nullable actor/role retained |
| TEX 53318 | Documentation relationship with empty safe field excerpt; no invented media |
| HN 343/1 | Kurfurst/Str_RF=553; label differs from native code; separate synthetic HTTP400 editing case |

ZV935/6MM remains unresolved; no candidate is silently selected or repaired.

Final sequential checks: TypeScript PASS; **155/155 component/unit/HTTP-fixture tests, 23 files PASS**; lint **0 errors/16 existing warnings**; production root build PASS; **15 browser checks PASS**, zero page/static-resource errors. Screenshots/browser checks use the locally served production artifact on port 5175, with every backend call intercepted. This is not live BE persistence or actual UAT smoke. Baseline 130 tests/11 synthetic browser checks are historical evidence, preserved separately.

Warnings: missing upstream Gov test sourcemaps; main chunk exceeds 500kB; legacy-theme CSS contains unresolved optional image references. Targeted production screens have no static-resource errors; unrelated legacy-theme screens are not certified.

Repeat: `npm run typecheck`, `npm test`, `npm run lint`, `npm run build:uat`; local preview followed by `scripts/update2-final-browser.mjs` with TEST_FRONTEND_ORIGIN and TEST_API_ORIGIN. Use a local frontend only; API interception is not deployment verification.

## Visual comparison

[Browser results](update2-final-comparison/browser-results.json) record source samples, synthetic overlays, checks and writes. Screenshots use safe fixtures, not live museum/UAT data.

| Required screen | Path in update2-final-comparison/ |
|---|---|
| Catalogue | catalog-desktop.png |
| Advanced filters | advanced-filters.png |
| Staff detail | item-detail.png |
| New/edit | new-item.png, edit-desktop.png, edit-mobile.png |
| Determination | determination.png |
| Material/technique | material-technique.png |
| Acquisition | acquisition.png |
| Bibliography | bibliography.png, bibliography-conflict.png |
| Dictionary selection | dictionary-selection.png |
| Additional evidence | quantity-source.png, vocabularies.png, origin.png, documentation.png, public-catalog.png |

Original card/table and first evidenced React baseline were visually reviewed against final captures. Menu, grey/blue fields, stable identity, direct cards and 31px rows preserve the accepted direction. Review found excess toolbar/identity spacing, which was compressed; current count is visible in persistent identification. Save works above the fold and on mobile; source history works in read-only mode.

**Known difference:** Access combines more editable identity/origin/material/location/determination above its tabs. React retains a summary plus separate edit sections and a taller identity area; geometry is not 1:1. New source/relationship extensions have no original screenshot equivalent. Screenshots cannot prove missing help semantics or print layouts. Therefore visual acceptance remains PARTIAL.

## Artifact and UAT configuration

`npm run build:uat` uses `VITE_APP_BASE=/`, `VITE_API_BASE=https://uat.mesonline.cz`. Optional UAT_API_ORIGIN must be a plain HTTPS origin. No /uat/ asset/router prefix, localhost endpoint or sample fixture is bundled; build script verifies these conditions.

Stable artifacts: `artifacts/update2-uat/dist/`, `receipt.json`, `build.log`, `curatas-fe-uat-root.zip`. [Build receipt](update2-final-comparison/build-receipt.json) and [archive checksum](update2-final-comparison/artifact-archive.sha256) are committed evidence. Receipt records exact build source commit, timestamp, SHA256/size of all 112 generated files and deploymentPerformed=false. Artifacts are intentionally Git-ignored and persist on disk.

Target preflight instructions only:

1. Serve HTTPS root and /assets/ files; deep frontend routes fall back to index.html. API failures must remain API responses.
2. Proxy actual `/api/` **and `/public/`** prefixes, including `/api/auth/*`. Actual public routes are `/public/v1/...`; do not invent `/api/public/...` rewriting.
3. Changed API origins require allowed-origin/JWT/ETag exposure checks. Intended UAT is same-origin; local production fixture exposes ETag only because localhost differs from the intercepted target.
4. Validate existing V28 schema/runtime using the BE runbook; no migrations/imports/seeds are authorized here. Check institution scope with actual test accounts.
5. After explicit deployment approval, check real anonymous/deep routes, login/redirect, historic searches, source evidence, dictionaries, uploads/downloads, persistence, stale writes and invalid-reference rejection. Museum testing readiness requires these real checks.

## Blockers and remaining requirements

- Missing full extracted help, independently verified acceptance/email material and approved print templates; full geometry/workflow parity remains partial.
- Podsbírka has the supplied text contract, not an independent proven dictionary-ID model. Fond uses real FUND IDs; no fabricated Podsbírka tree.
- Plus*/Sluz*, O/I semantics, institution membership, unresolved source conflicts, full professional search/export remain source/backend/museum gaps. Bibliography, MatTech and lineage no longer have absent contracts.
- Three-level-capable selectors are tested with synthetic hierarchy; canonical population/completeness is not established by five safe excerpts. No hierarchy is inferred from labels.
- No live isolated BE integration, actual UAT configuration inspection/deployment/persistence smoke. Target IDs require canonical discovery.
- Full child-record reconciliation, universal party-history entry points and original approved A5/two-per-A4 print acceptance remain incomplete.

## Checkpoints and shutdown

`89e028a` baseline; `fc83f63` contracts/source fixtures; `fbb6975` workflows; `fc5f3c5` root artifact; `4b2f9c1` initial sample/browser/layout verification; `cfe8d03` persistent quantity; `d879b9ac1340ed4fa72038cce078744c5fddcaf4` final production source and read-only media verification. Later final verification/delivery commits are in git log. Final exact HEAD is reported in delivery; build receipt is authoritative for bundled code. A later documentation-only commit does not change bundle contents. No remote push.

**SAFE TO SHUTDOWN: YES** after final delivery stops the owned local servers; artifacts require no running process. **READY FOR MUSEUM TESTING: NOT ESTABLISHED.**
