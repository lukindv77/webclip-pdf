# C40 compact evidence — Physical PDF bytes / cache identity — 2026-09-03

Canonical source baseline: `6960fab35f914b1e1e3ffe1bafa3d1f8d7ca144e`  
Exact runtime blobs: `content.js=f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`, `service-worker.js=cffe46adbd0227bae51c95462d6d705b264838fe`, `offscreen.js=a5f84b928e530222c50c704b80ab30418349f68e`.

## Classification

**`L4-REVALIDATED / FINDING + POSITIVE/PHYSICAL-PDF/SAME-URL/ACTUAL-IDB/MUTABLE-KEY/IMMUTABLE-KEY CONTROLS (P0-023, P0-079; P0-070 supporting)`**.

No new P-code and no Registry wording/status change.

## Accepted execution

- Chrome `152.0.7977.64`;
- workflow run `33715164705`, job `100522698189`;
- exact accepted head `577322daad134340d21a16a7938ff24c95c16174`, SUCCESS;
- temporary receipt commit `b7932fe279d74903fad02bd6b0bfee43bffa0e03`;
- result SHA-256 `658deaf3cd10c6b07734ea57c75f7397a4e1e931649a1046162618f851e4c034`;
- harness `project_tools/research_c40_physical_pdf_cache_identity.py`.

## Fresh matrix

Current WebClip preparation produced two physical PDFs from the exact same URL:

- A: 24,305 bytes, SHA-256 `f5ae6d020369e76bd95437b281a2c955268082aa22480339c74a2780c54afebe`, marker A only;
- B: 24,462 bytes, SHA-256 `c219b541e486ffe9f46a36e6abfe1906d1a1a903725c6af3b2a5fe6f1722f765`, marker B only.

In a real browser IndexedDB with the production database/version/store shape, B overwrote mutable `tab:77`. A retry for doc-A and the key previously passed for offscreen op-A both resolved B's hash, marker, `doc-B` and `op-B`. This physically confirms P0-023 and P0-079.

Distinct `op:op-A:doc-A` and `op:op-B:doc-B` controls retained the correct exact hashes and markers. They prove causality/feasibility, not a production fix.

## Source guards

The accepted result is bound to the current tab-only key, same-URL-only validity check, retry lookup by tab, later offscreen key dereference and production cache schema. All source guards passed.

## Owner reconciliation

**P0-023 ACTIVE** owns document-generation binding; **P0-079 ACTIVE** owns immutable operation-specific cache bytes; **P0-070 ACTIVE** is supporting full-generation authority. No new owner is warranted.

Detailed evidence: `RESEARCH_FULL_RESTART_C40_PHYSICAL_PDF_CACHE_IDENTITY_2026-09-03.md`.
