# UPDATE2 — FE acceptance matrix

Date: 2026-10-12. Branch: `feature/citem-demus-ui-24092026`.

**Overall status: PARTIAL / full DemusKat parity NOT ACCEPTED.** Implemented changes are reviewable and tested locally. Passing builds and synthetic browser checks do not certify museum acceptance or live Update2 integration.

## Evidence register

| Evidence | Availability / use |
|---|---|
| Original CITEM conclusions, 24 September 2026 | READ: `E:/___MojeProjekty/MuzejniAppka/__Dokumenty_Meetings/Závěry z jednání Citem 24092026.docx`; extracted text reviewed. Overrides earlier Gov design proposals and outdated API assumptions. |
| Original DemusKat screenshots | READ/VISUALLY REVIEWED: `E:/___MojeProjekty/MuzejniAppka/Demus Kat Printscreens.docx`; 27 embedded images extracted. Card, dimensions, references, acquisitions, table, technique hierarchy and menu screenshots reviewed. Selected originals are retained in `update2-comparison/demus-reference-*.png`. |
| Original complete user documentation / help | **MISSING**. Exported Access form definition `ProdukceDUMP/uzip/_access_export ARl_Orig/forms/Help.txt` exists and was inspected; it is not the complete help content. Schema PDF `Kat_DataKat_Tabulky_All.pdf` exists; it is not a user workflow/help authority. |
| Repository museum emails | **MISSING**: no `.eml`/`.msg` museum correspondence in FE repository. No connected mail search or sending performed. |
| Museum acceptance document itself | **MISSING locally**. Regression scenarios are available secondarily in the BE handoff; its linked Google document was not independently read. |
| Existing FE, routing and tests | READ: `src/App.tsx`, pages/components, `src/lib/api.ts`, root CITEM matrix and existing tests. All routes and role protection retained. |
| BE Update2 contract | READ: sibling `curatas-be/docs/CITEM-BACKEND-API-CONTRACT.md` and `CITEM-FE-HANDOFF-20261011.md`; repository implementation, not deployment evidence. |
| Advanced-filter implementation | VERIFIED in sibling `ItemSpecification.java`: structured inventory, `legacyCreatedBy`, `determinedBy`, `fundLegacyCode`. |
| Canonical source lineage, full historical relationships, institution assignment | BLOCKED in BE handoff. FE does not fabricate missing evidence or memberships. |
| Approved print template inventory and exact card variants | **MISSING**, also blocked in BE handoff. Existing print functionality is retained; full original template parity is not claimed. |

## Binding CITEM requirements

| ID | Requirement / source | Implementation evidence | Status and remaining acceptance |
|---|---|---|---|
| REQ-01 | Use full screen; density and maximum original resemblance | `DemusApp.tsx`, `demus.css`, `AdminItems.tsx`: top menu replaces 280px sidebar; real separate catalogue columns, 31px browser-measured rows; grey form panels, blue field labels and native compact inputs | PARTIAL. Table density verified. Detail has a persistent two-column summary, but editable fields and original Access subforms are not yet an exact geometric reconstruction. |
| REQ-02 | Fond, Předmět, Popis, Titul, Autor, Datace remain visible | `DemusIdentificationHeader.tsx`; original two-column arrangement; measured menu/toolbar offsets; expanded/scrollable full description | IMPLEMENTED / locally verified after scroll without toolbar overlap. Museum visual acceptance outstanding. |
| REQ-03 | Three inventory components; preserve historic identities | New `NewInventoryNumber.tsx` for explicit prefix/main/postfix creation; existing persisted `InventoryIdentityPanel` retained for edit, guarded by revision/rowVersion; original source components remain read-only | PARTIAL. Create API accepts composed `inventoryNumber`, not a new three-component DTO. Delimiters are explicitly entered, never inferred from arbitrary historical numbers. Full multiple-number/source reconciliation is a BE blocker. |
| REQ-04 | Fond and Podsbírka distinct | Fond uses real FUND tree IDs; no array-index/fictitious choices. Podsbírka independently uses contractual `subCollection` | IMPLEMENTED per current BE. **Separate Podsbírka dictionary ID contract is MISSING**; no invented tree/type introduced. |
| REQ-05 | “Sbírkový předmět” / “předmět” terminology | Menu/pages retain CITEM terminology; new labels use Předmět, Titul and original card names | IMPLEMENTED for changed screens. |
| REQ-06 | Markant/Signatura are text, not duplicate dictionaries | Removed their duplicate museum scalar editors; retained main text fields. Raw source measurements are read-only, actual dimensions use persisted rows | IMPLEMENTED. Original count/identity of curators remains a source/data blocker, not fabricated FE entries. |
| REQ-07 | Inventory required; accession optional; title OR type | Explicit validation; no required accession; no automatic submission of suggested IDs; no title-from-type fabrication; POST error propagation | IMPLEMENTED / component and browser tests. |
| REQ-08 | Original cards; primary audit/identification fields | Direct original cards: Základ, Určení, Vznik, MatTech, Míry, Zařazení, Historie, Dokumentace, Reference, Manipulace, Akce, ISO, Plus, Vyřazení, Akvizice; extensions Přílohy, Umístění, Foto, Audit. Author/role, dating and description moved to primary card. MatTech/Míry/Foto have distinct contents. Section draft storage survives unmount | PARTIAL. Reference/Literatura and Plus show available read-only source evidence and explicit missing-contract messages. Original complete edit semantics unavailable. |
| REQ-09 | Rich server filters incl. Zapsal, Určil, Fond | Existing AND/OR/NOT builder retained; backend field names verified; combined predicates sent with pagination; active advanced JSON restored from URL | IMPLEMENTED for supported predicates. Arbitrary any-related-field predicates remain BLOCKED by BE coverage. |
| REQ-10 | Pagination above/below, editable page, preserve return state | Two synchronized direct page controls; URL/session filter state; top back action retained; main catalogue/server pagination remains bounded | IMPLEMENTED / browser direct-page and existing return-state tests. |
| REQ-11 | Original A5 landscape, two-per-A4 and template inventory | Existing print components retained | NOT COMPLETE. Approved examples, full template inventory and image variants MISSING. No certification of original legal evidence-card format. |
| REQ-12 | Visible export activity | `exporting` state disables repeated requests and displays “Exportuji…” until actual completion/error | IMPLEMENTED. Complete professional export columns still a BE blocker. |
| REQ-13 | Import/feedback/delete policy deferred | Routes preserved; no import execution or deployment. Unsupported generic DEACCESSION edits removed; existing lifecycle endpoint used | IMPLEMENTED restraint; museum lifecycle/commission semantics remain unresolved. |

## Update2 API / colleague acceptance

| Requirement | Evidence | Status |
|---|---|---|
| Uložit visible on creation and all cards without scrolling to footer | Native form-linked top toolbar action, sticky on desktop; bottom action retained; browser verifies after scroll | IMPLEMENTED |
| Acquisition year selection/arrows | Native calendar plus explicit number/spinner year control; leap-day clamp; no date invented when empty | IMPLEMENTED; native calendar chooses initial date, independent year control then adjusts it |
| Three-level material/technique | Full persisted tree with path labels, searchable without Enter submitting; save actual IDs; creation accepts persisted parent ID and selects returned ID | IMPLEMENTED; depth depends on actual backend rows |
| All professional kinds | Verified fields for DOCUMENTATION, CLASSIFICATION, DETERMINATION, MANIPULATION, ACTION, ISO, ORIGIN. ACTION/ISO/MANIPULATION old unverified fields corrected. Dense related-record tables; full raw source visible separately | IMPLEMENTED available subset; full historical relationships BLOCKED |
| ORIGIN + originNote | Actual source-column keys, numeric years/order, museum `originNote` PATCH, explicit clearing supported | IMPLEMENTED |
| ETag / If-Match | Version → detail → museum → version consistency check; editor-scoped opaque token, sequential guarded PATCH/POST/DELETE, returned tokens consumed, no blind retry, pending write lock, absent ETag blocks next write | IMPLEMENTED / fetch integration tests |
| Stale writes and reconciliation | Preserve draft/error; compare current main record without assigning its new token to stale draft; original token retained; curator must reconcile/reload | PARTIAL: comparison available; no automated field-by-field reconciliation of all related records |
| No false save success | Status/field errors propagated; rejected writes do not set success; created media refreshed from persisted metadata | IMPLEMENTED tested errors 400/401/403/404/409/412/428. Multi-step refresh failures and museum acceptance require further live testing. |
| Preserve unsaved main data after child/media saves | PATCH sends only changed main fields; audit saves only comment; child reload merges only unchanged local fields; media accepts a new token only when persisted writable snapshot is unchanged | IMPLEMENTED; no whole-form overwrite by photo upload |
| Source lineage / identity read-only | No `legacyData` in item save; professional changes send only edited payload leaves; raw source metadata remains read-only; imported dimensions cannot be removed | IMPLEMENTED |
| Attachments | JWT upload/download; correct multipart `primary`; persisted metadata reload; caption PATCH UI; independent count API; no inferred success on rejected requests | IMPLEMENTED in available contract; media endpoints deliberately have no If-Match |
| Public catalogue protection | Restricted public API retained; no staff/professional fields fabricated into public projections; existing anonymity regression retained | VERIFIED by tests; live institution scoping remains BE blocker |
| Responsivity | Desktop layout keeps full working width, table scroll remains local; mobile 390×844 has no document horizontal overflow | VERIFIED with synthetic browser data |

## Validation evidence

See `UPDATE2-FE-STATUS.md` for final check results. `update2-comparison/browser-results.json` records repeatable browser scenarios. Screenshots are **synthetic test data**, not migration or live backend acceptance evidence. No production mocks added. Original screenshots are copied only as comparison evidence.
