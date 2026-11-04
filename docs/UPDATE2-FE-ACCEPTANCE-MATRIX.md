# Original UAT integration acceptance matrix — 4 November 2026

PASS below means local implementation/test evidence. Remote QA remains NOT VERIFIED. Original UAT db026f32cf3d0f9cf28ea6271e29c9d0443febc3 is the foundation; see P0-UAT-FOUNDATION-20261104.md. Existing QA feature commits were ported individually; original worktrees remain intact.

| Requirement | Implementation/evidence | Status / limitation |
|---|---|---|
| Original public deployed UAT source | Public HTML/JS/CSS hashes match preserved BATCH23 receipt/Git revision | PASS revision; server branch label NOT VERIFIED |
| Original styles and layout components | guard-original-uat: original stylesheet bytes, existing literal layout classes, compiled public CSS SHA, all20 tab IDs/order | PASS; not populated pixel acceptance |
| Frame/header/navigation/compact table | Original DemusApp/AdminItems/Catalog reused; original classes retained; error frame restored | PASS local; real QA MISSING |
| Catalog ownership/private access | CatalogProvider/scopedIntegration, scoped API strict ownership checks, backend authorization tests | PASS local; no public catalog exposed by QA build |
| Real Poláková 8155 items | Never hardcoded or replaced by generated rows | Operator reports total8155 and first50 rows; DTO/rendering/workflows NOT VERIFIED |
| Contract validation and errors | curatorPageContract tests, real HTTP+PG contract tests, combined cache-header browser reproduction, retry component tests | PASS local; QA duplicated cache fields confirmed; actual DTO audit still MISSING |
| Quick search/filter/page/Back/Forward | Existing URL-bound controls and scoped whitelist; generated native contract tests; component regression | PASS supported contract |
| Full advanced AST/legacy export/worksets | Existing controls remain explicitly unavailable where scoped authority absent | INCOMPLETE approved scoped contract; no fallback/fake success |
| Chronological createdAt sorting | Public default differs from scoped contract whitelist | INCOMPLETE backend authorization; no silent sort mapping |
| Create inventory item | Original form/full inventory components, validation, accessible Save, double-click guard, unsaved draft, reload, author/time | PASS native local-auth/restricted-runtime/browser |
| Edit/current versus DEMUS | Existing scoped ETag/If-Match; section reload; conflict/error regressions; historical source read-only | PASS local; actual QA save NOT VERIFIED |
| Independent clone | Existing scoped clone, original dialog, source independence/lineage/identity/history/media | Existing implementation retained, component/native coverage retained; not QA real-data acceptance |
| All20 specialist tabs | Základ, Určení, Vznik, MatTech, Míry, Zařazení, Historie, Dokumentace, Reference, Manipulace, Akce, ISO, Plus, Vyřazení, Akvizice, Číselníkové vazby, Přílohy, Umístění, Foto, Audit | IDs/order frozen; browser opens all20; section/repeated-table tests retained |
| Repeated records/current sections | Existing scoped specialist/authority records, range operations, history, item/version checks | PASS component/native suite; not every populated real-data workflow |
| Material/technique dictionaries | Existing three-level UUID binding component + generated PG/browser add/read; source authorities never invented | PASS supported references; QA deletion intentionally prohibited |
| Runtime forbids DELETE | QA build VITE_QA_NO_DELETE=true; binding remove disabled with reason and API guard before transport | PASS component/client guard; no runtime grants changed |
| Fund/subcollection authority | Historical source codes shown separately from approved current dictionaries | Unapproved historical authority mappings remain INCOMPLETE |
| Dates/year keyboard controls | Original date/form controls retained | Actual museum keyboard/year UX acceptance NOT VERIFIED |
| Media/attachments | Existing scoped list/download/photo preview and strict no-store/identity behavior, existing regression/native browser tests | Supported read PASS local; unsupported upload/replace/delete not fabricated |
| Administration/permissions/audit | Existing catalog/user/profile/share/delegation/audit features retained, scoped actions/caps; header label derives from existing caps | PASS local; actual qa.admin cap response MISSING |
| Public/global import/lifecycle/recycle bin | No unsupported privileged operation introduced; no recycle bin | Global/import/legacy lifecycle actions unavailable without approved contract/role |
| Print | Existing local print templates retained, original action state gated on actual data | No claim of complete museum-approved template/help coverage |
| Responsive behavior | Existing responsive classes retained; existing mobile clone test retained | Full real-data/mobile visual acceptance NOT VERIFIED |
| Exact original screenshots/help/CITEM minutes/emails | References in earlier repo docs; latest request references two screenshots but supplies text only | Original screenshot files/complete historical help and signed minutes MISSING for independent 1:1 DemusKat acceptance; verified UAT code is this task's authority |
| QA-only delivery/rollback | Separate static directory, checksum validation, atomic Linux directory exchange, prior assets and old tree retained | Helper tested locally on Linux; Alma/operator runtime NOT VERIFIED |
| Protected systems | No SSH/SCP, remote deployment, DB/schema/data/account/TLS/tunnel/SELinux-policy/vhost changes | Preserved |

No feature is declared complete solely because a build or test count passed. Unsupported operations remain visible with their reason where present in original integration; no new API permissions or database grants were invented.
