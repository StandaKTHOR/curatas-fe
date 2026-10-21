# BATCH 3F frontend integration receipt

Branch: integration/batch3f-20261021. Base B3E add7a0e1750d4089c83783a1eb25d27c87e32f99. Tested source/harness commit d51b6b47c48397631f7522d7409990e783a8c2de. All B1/B2A/B3E frontend branch tips are ancestors; no unfinished second-developer branch was merged.

DONE VERIFIED: TypeScript, lint (0 errors,23 inherited warnings),322 Vitest tests and production build. Final build used VITE_SCOPED_WORKSPACE_ENABLED=true; fresh gate with default flag also passed318 tests. Existing package/lock and application components unchanged. New4 tests exercise11 scoped operations each on401/403/404/412 without retry or legacy/static/public fallback. Dictionary UI is untouched.

Actual Chromium→Vite→Spring→ownedPG17 browser:18 scenarios PASS, exact original/thumbnail/document bytes and actual download, conflict412, foreign404, read-only403, invalid JWT401, committed revocation and logout. Scoped-phase54 requests all v2; no external origin/fallback. Existing old login destination may use v1 before the scoped phase. This is not a full migration of legacy consumers.

Paired BE tested commit315759aff242966fd3515891f9b85a140431ec33;250 Maven and229 commonPG17 tests PASS. Full nine required reports and case/hash evidence live in the paired BE reports/batch3f directory. Local external evidence/final-state.json records final evidence-only commits and clean heads. The four attached JSON receipts identify actual commands, times and tested FE SHA. All runners/owned ports closed. No dependency change, import, push, deployment or main merge.

PARTIAL: old frontend global routes and historical media/derived clients still require approved migration. BLOCKED multi-catalog release: known legacy/static/workset and direct SQL bypasses, trusted identity/pool/audit model, CITEM ownership/publication/containment decisions. NOT VERIFIED: deployed proxy, production data/restore/performance and other browsers. Recommend conditional physically isolated legacy environment plus separate trusted new-runtime DB identity decision; no approval implied.
