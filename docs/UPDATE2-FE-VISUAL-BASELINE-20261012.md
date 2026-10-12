# Visual baseline checkpoint — 12 October 2026

Baseline: `5e728e8cc46c2c9b6b8e1cf6dcffd7ac5436b697`.
This is the earliest **evidenced successful DemusKat iteration** in the current repository: committed screenshots, measured 31px staff/public rows, top menu and direct original card navigation. Older `ebd39b4` is a CITEM checkpoint but `src/App.tsx` still contains the 280px sidebar; it is not the requested visual baseline. No branch reset/revert is appropriate.

Original reference: `E:/___MojeProjekty/MuzejniAppka/Demus Kat Printscreens.docx`; extracted in the preceding implementation and re-reviewed through retained `docs/update2-comparison/demus-reference-card.png` and `demus-reference-table.png`. Baseline `edit-desktop.png` and `catalog-desktop.png` visually reviewed. Preserve baseline screenshots unchanged; new evidence goes to `docs/update2-final-comparison/`.

Preserve: grey/blue compact field language, red title bar, full-width working area, direct DEMUS cards, 31px data sheets, visible selection, stable identity/save actions, real ETag writes and retained drafts.

Correct identified differences: oversized/duplicated main field area; unavailable bibliography/MatTech CRUD despite newer verified BE contracts; missing current/source quantity, root acquisition, vocabulary lineage and current parties; historical filters missing; year→January 1 conversion; privacy boundaries; build root/proxy prefix ambiguity. No new design system.

Preparation: no FE `AGENTS.md` found in the repository; existing implementation notes read. BE read-only authority: `UPDATE2-BACKEND-FINAL-HANDOFF-20261012.md`, `UPDATE2-FE-MUSEUM-20261013.md`, `UPDATE2-FUNCTIONAL-GAP-AUDIT-20261012.md`, `UPDATE2-MUSEUM-MODEL-20261013.md`, existing API handoff and UAT runbook. The older functional-gap matrix is explicitly superseded by final backend implementation results.

HLP correction: the newer BE audit identifies `E:/___MojeProjekty/MuzejniAppka/KATALOG.HLP`. Its existence is confirmed by that audited source; compressed help topics remain NOT VERIFIED. Earlier FE “help missing” means unavailable extracted content, not absence of the HLP file.

Backend files, MDB imports, UAT, DNS, Apache and Railway remain untouched. Source-backed fixture checks will be reported separately from live backend/UAT verification.
