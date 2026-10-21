# BATCH 3E frontend receipt

Branch: feature/b3e-scoped-item-media-ui-20261021, based on a2ddd11a91d24ee8fa7a3489a51ce928362ff2bb.

- Initial UI:34aad83816c74158317c0a945ac6f814656dcd4e.
- Tested application/download lifecycle:efb593427fbc16bb6b1e1da10ab6ef80e723783a.
- Additional live foreign-byte test harness:3454387040bdf814b010d2e2511c3e76475bb3dc. Only scripts/live-scoped-smoke.mjs changed; src/package/lock files match the full tested application snapshot.

Fresh baseline:259 Vitest PASS, TypeScript/lint/build PASS. Final:318 Vitest PASS (35 files;36 new transport +23 new component tests), TypeScript/lint/build PASS.23 inherited lint warnings, zero errors. No dependency changes. Feature-enabled production build completed but was not deployed.

Entry /scoped/items requires VITE_SCOPED_WORKSPACE_ENABLED=true, current AuthProvider and explicitly selected CatalogProvider catalog. Backend read/write/dimension/media flags must be individually enabled in an approved environment; full multi-catalog mode stays disabled. Current selection is never an item.write grant. No dictionary editor component was changed.

Implemented: typed lossless numeric/ETag transport, item list/detail/title+inventory edit with explicit conflict comparison, historical read-only/scoped writable dimensions, private media list/detail, PNG/JPEG blob previews and document download, context/session/abort/blob cleanup. No v1/static/public fallback, historical adoption, upload/delete/publication or expert-semantic changes.

Real Vite+Chromium+Spring Boot+owned PG17 smoke passed17 scenarios; exact original/thumbnail/document hashes and actual browser PDF download checked. Foreign item/metadata/byte UUID404, read-only403 and next-request revocation403 verified. Common BE PG17 regression209 PASS plus targeted live rerun for test-only harness strengthening. Main reports and machine evidence are in sibling ../be/reports/batch3e; original logs/fixtures/screenshots in ../evidence. Backend tested code eb9bff8d506bc72360717f5928119fb8be595017.

Legacy global item/media/static/publication bypasses and runtime DB role isolation remain P0 release blockers. Full museum/production multi-catalog readiness is not claimed. No push, deployment, import, merge or original dirty-worktree changes. Report-only commit is resolved by git log and external ../evidence/final-state.json.
