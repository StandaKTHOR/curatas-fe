# UPDATE2 frontend status — 2026-10-12

Repository: `D:/ProjektyJava/IdeaProjects/curatas-fe`

Branch: `feature/citem-demus-ui-24092026`

**Status: implemented and locally reviewable subset; full DemusKat redesign acceptance remains PARTIAL. No Railway/UAT deployment.**

## Implemented screens and workflows

- Shared desktop workspace: full-width original-style top menu, compact panels, preserved routing and role guards; responsive mobile menu.
- Staff catalogue: real dense data sheet with separate inventory/accession, Fond/Podsbírka, Předmět/Titul, author, dating, material and technique columns; row selection, real actions, server sorting/filters, synchronized editable top/bottom pagination and preserved return state.
- Public catalogue/detail: shared compact workspace and persistent identification, existing restricted public API/visibility retained; API failures are visible.
- Creation/edit: explicit three-part composed creation inventory, mandatory inventory and title OR type, optional accession, persistent identity, top/bottom save, primary author/role/dating/description/audit, no default identifier submission.
- Original direct cards, separately rendered MatTech/Míry/Foto, persisted tree selections including third level; parent-aware dictionary creation and returned-ID selection.
- Professional subforms: dense related-record data sheets with contract-verified documentation, classification, determination, manipulation, action, ISO and origin fields; numeric source fields and timestamps preserved; originNote overlay; repeated acquisitions and date/year control.
- Attachments/media: authorized fetch/download, multipart primary correction, caption PATCH, persisted metadata reload, safe main-draft preservation and snapshot version handling.
- Integrity: editor-local ETags, consistent initial snapshots, guarded aggregate writes, partial main PATCH, draft preservation between cards, read-only source lineage, protected imported measurements, conflict comparison without blind retry.

## Binding CITEM requirements

Detailed evidence and per-requirement states: [acceptance matrix](UPDATE2-FE-ACCEPTANCE-MATRIX.md).

Implemented local behavior covers permanent six-field identification, terminology, independent Fond/Podsbírka, correct mandatory fields, real hierarchical selectors, supported rich filters, top/bottom pagination, return state, available professional sections, always-accessible desktop save and export activity. This does not imply approval of full 1:1 field placement or complete historical data.

## Screenshot comparison

Original reference: `E:/___MojeProjekty/MuzejniAppka/Demus Kat Printscreens.docx` (images 3 and 17 copied for comparison).

| Original evidence | New FE screenshot | Observation |
|---|---|---|
| [Original card](update2-comparison/demus-reference-card.png) | [Edit](update2-comparison/edit-desktop.png), [scrolled](update2-comparison/edit-scrolled.png) | Original grey/blue field language, two-column static identity and direct card names implemented. Exact original editable upper-half arrangement is still different; no pixel-parity claim. |
| [Original table](update2-comparison/demus-reference-table.png) | [Staff catalogue](update2-comparison/catalog-desktop.png) | Separate compact columns, 31px measured rows. Original Access has even denser rows and different fields; subset reflects current list API. |
| Same table layout principle | [Public catalogue](update2-comparison/public-catalog-desktop.png) | Anonymous rows also measure 31px; no clone action. |
| Original Vznik card family | [Origin](update2-comparison/origin-desktop.png) | Verified source fields; missing original relationships are not invented. |
| Original creation from same form | [Create](update2-comparison/create-desktop.png) | Explicit inventory and accessible save; full original geometry remains partial. |
| Browser-only modern constraints | [Conflict](update2-comparison/conflict-desktop.png), [mobile](update2-comparison/edit-mobile.png) | 412 retains input and token; mobile document does not overflow horizontally. |

All new screenshots use isolated **synthetic fixtures**, with every API request intercepted and nonlocal requests blocked. No real museum records were changed. Repeat using `scripts/update2-browser.mjs` with local Vite at `http://127.0.0.1:5174`, `VITE_API_BASE=http://127.0.0.1:5174`, and Playwright Chromium installed. This checks real browser rendering, not real BE persistence/authentication.

## Verification

| Check | Final result |
|---|---|
| `npm run typecheck` | PASS, no TypeScript errors |
| `npm run lint` | PASS, 0 errors; 16 unused-variable warnings in legacy code/tests |
| `npm test` | PASS, 130/130 tests, 21 files, no skipped/failing tests |
| `VITE_API_BASE=https://example.invalid npm run build` | PASS, production bundle; existing >500kB main-chunk warning |
| `node scripts/update2-browser.mjs` | PASS, 11 scenarios, 0 page errors; staff and public rows 31px, no anonymous clone action, mobile document overflow false |
| `git diff --check` | PASS after whitespace cleanup |

Test coverage includes existing catalogue/return state, filters, identity and media regressions; new consistent snapshots, token chaining, independent editors, 400/401/403/404/409/412/428, guarded record creation/deletion, missing ETag, create validation, source preservation, every writable professional kind, draft survival, acquisition null clearing, year/leap-day control and rejected attachment caption edits. Gov package tests emit existing missing-sourcemap diagnostics. No real BE or deployment acceptance is implied.

## Remaining requirements / blockers

1. Complete help and museum acceptance document/email source are MISSING locally. Original screenshot references exist and were reviewed; they do not define every interaction or hidden original subform column.
2. Reference/Literatura joins and Plus*/Sluz* write semantics are unresolved in BE handoff. These cards expose available source evidence only and explain their limitations.
3. Podsbírka is contractually a separate text `subCollection`; no authoritative independent dictionary-ID API/type was supplied. Fond uses persisted FUND IDs. No fake subcollection dictionary was invented.
4. Canonical MDB/source lineage, historical relationships, full professional search/export and institution memberships remain BE blockers. Imported evidence is preserved without claiming recovery.
5. Original approved A5 landscape/two-per-A4 evidence cards and full template inventory are MISSING. Existing print workflows remain; exact original print acceptance is not certified.
6. Full geometric 1:1 original editable identification/subforms remain incomplete. Screenshots document the actual differences. Current direct cards and available fields are functional, but this is not a completed museum acceptance.
7. No isolated live Update2 backend/browser integration was run. Fetch and component integration tests plus intercepted browser fixtures validate FE contracts; actual data persistence, canonical dictionary population and staff-network authorization need an isolated BE/UAT acceptance run after approval.
8. Conflict comparison preserves input; full interactive field-by-field reconciliation of every professional record is not implemented. No newer token is silently assigned to a rejected stale draft.

## Git delivery

Implementation commit: see `git log -1 --format=%H` for the commit containing this status and source changes; exact SHA is reported in the chat delivery. No remote push or deployment is performed by this task.
