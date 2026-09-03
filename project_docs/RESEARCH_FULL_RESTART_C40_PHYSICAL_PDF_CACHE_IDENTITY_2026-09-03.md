# WebClip — fresh full-project research — C40 Physical PDF bytes / cache identity — 2026-09-03

Date: 2026-09-03  
Canonical source baseline: `6960fab35f914b1e1e3ffe1bafa3d1f8d7ca144e`  
Exact `content.js` blob: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`  
Exact `service-worker.js` blob: `cffe46adbd0227bae51c95462d6d705b264838fe`  
Exact `offscreen.js` blob: `a5f84b928e530222c50c704b80ab30418349f68e`  
Scope: fresh-restart coordinate **C40 — Physical PDF bytes / cache identity**.

## Result

**C40: `L4-REVALIDATED / FINDING + POSITIVE/PHYSICAL-PDF/SAME-URL/ACTUAL-IDB/MUTABLE-KEY/IMMUTABLE-KEY CONTROLS (P0-023, P0-079; P0-070 supporting)`.**

Two different document generations at the exact same URL produced distinguishable physical PDFs. Current production source still stores and resolves retry/upload bytes through one mutable `tab:<id>` record. After generation B overwrote `tab:77`, both a retry logically belonging to document A and a deferred offscreen dereference logically belonging to operation A resolved B's valid PDF bytes. Operation/document-scoped keys preserved both byte generations in the positive control.

This confirms the existing P0-023 and P0-079 ownership with physical PDF bytes and a real browser IndexedDB using the current cache schema. No new P-code is needed. Runtime, Registry wording/status, manifest `0.9.8` and release readiness are unchanged; release remains **NOT READY**.

## Evidence level and boundary

The accepted tranche combines:

- L1 exact-source guards for the production key, retry lookup, URL comparison and later offscreen dereference;
- L4 current WebClip content preparation followed by physical Chromium PDF generation for documents A and B;
- L4 real browser IndexedDB records in `WebClipPdfRetryCache` version 3, stores `pdfs` and `meta`, using the production record shape;
- causal positive controls with immutable operation/document-generation keys.

The harness does not perform a real Yandex upload. It exercises the exact cache bytes that the guarded offscreen source later converts to the upload body. Real external object settlement stays C42/L5.

## Accepted exact-source execution

- Google Chrome `152.0.7977.64`;
- workflow run `33715164705`;
- job `100522698189`;
- exact accepted workflow head `577322daad134340d21a16a7938ff24c95c16174`;
- conclusion **SUCCESS**;
- temporary raw-result receipt commit `b7932fe279d74903fad02bd6b0bfee43bffa0e03`;
- raw result SHA-256 `658deaf3cd10c6b07734ea57c75f7397a4e1e931649a1046162618f851e4c034`;
- durable harness `project_tools/research_c40_physical_pdf_cache_identity.py`.

The earlier successful C40 step in failed combined runs is retained only as diagnostic evidence. The accepted receipt is the result above, from the workflow in which both C40 and C41 assertions passed.

## Physical byte matrix

Both pages were served from the same ephemeral `/same-url` locator with `Cache-Control: no-store` and processed through the current WebClip selection/download preparation path.

| Observation | Bytes | SHA-256 | Extracted marker |
|---|---:|---|---|
| Physical PDF A | 24,305 | `f5ae6d020369e76bd95437b281a2c955268082aa22480339c74a2780c54afebe` | A only |
| Physical PDF B | 24,462 | `c219b541e486ffe9f46a36e6abfe1906d1a1a903725c6af3b2a5fe6f1722f765` | B only |
| `tab:77` immediately after A | 24,305 | A hash | `doc-A`, `op-A`, A only |
| Retry for doc-A after same-URL B overwrite | 24,462 | B hash | `doc-B`, `op-B`, B only |
| Deferred offscreen lookup for op-A after overwrite | 24,462 | B hash | `doc-B`, `op-B`, B only |
| Immutable `op:op-A:doc-A` control | 24,305 | A hash | `doc-A`, `op-A`, A only |
| Immutable `op:op-B:doc-B` control | 24,462 | B hash | `doc-B`, `op-B`, B only |

The different exact hashes and mutually exclusive extracted markers prove that the two records are not merely metadata variants of the same PDF.

## Exact current-source contract

The harness refuses to classify the schedule unless all current-source checks hold:

1. `pdfCacheKey(tabId)` returns `tab:${tabId}`;
2. a newly generated remote PDF is stored under `pdfCacheKey(tabId)`;
3. retry calls `getValidCachedPdfForTab(tabId)`;
4. the validity check compares normalized current/cached URL but has no document-generation component;
5. offscreen later executes `getPdfCacheRecord(spec.pdfCacheKey)` and uses `cachedPdfRecordToBlob(record)`;
6. the physical browser control uses the same database name, version and object stores as production.

All six checks were true in the accepted run.

## P0-023 — same-URL document substitution

Document A and document B have the exact same URL, so the current normalized URL check cannot distinguish them. Once B overwrites `tab:77`, a retry requested for A receives B's record and bytes. The result is internally valid and therefore can silently pass type/size checks while violating the admitted document generation.

This is direct fresh physical confirmation of **P0-023 ACTIVE**.

## P0-079 — operation-owned byte substitution

Operation A can pass the string key `tab:77` toward offscreen while the underlying record is still mutable. If operation B writes the same key before offscreen dereferences it, operation A's transfer body is built from B's PDF. Passing a key is therefore not an immutable byte receipt.

This is direct fresh physical confirmation of **P0-079 ACTIVE**. No network failure or corrupt database is required.

## Positive immutable-generation control

When the same physical PDFs are stored under distinct operation/document keys, later reads return the correct exact hashes and markers for both A and B. This is a causal feasibility control, not a claim that production already uses those keys.

A production repair also needs durable ownership metadata and atomic lifecycle rules; changing only the string format without validating document, operation and byte receipts would not close either owner.

## B1–B9 mapping

| Boundary | Fresh C40 result |
|---|---|
| B1 User Intent | Retry of A is not authority to save/upload a later document B. |
| B2 Admission / exact generation | Same URL does not identify a browser document generation. |
| B3 Capture | A and B produce distinguishable selected content. |
| B4 Static Materialization | Current preparation creates distinct printable states. |
| B5 Renderer | Chromium produces two distinct valid PDFs. |
| B6 Physical Artifact | Exact PDF hashes and text markers distinguish A from B. |
| B7 Persistence / Transfer | One mutable tab cache slot substitutes B for A; immutable keys preserve both. |
| B8 Journal / Provenance | Later provenance cannot be truthful if cache bytes are not generation-bound. |
| B9 Later Reading / Recovery | A recovered operation can deliver a readable but wrong document B. |

## Owner reconciliation

- **P0-023 ACTIVE** directly owns exact source-document generation binding for retry cache.
- **P0-079 ACTIVE** directly owns immutable operation-specific PDF bytes across retry/upload/offscreen dereference.
- **P0-070 ACTIVE** remains the broader exact full-document-generation authority and is supporting here.

No new P-code, Registry wording/status or DONE-owner reopening is warranted.

## Architecture direction

Use an immutable artifact identity containing at least operation id, admitted document generation and exact PDF byte digest. Persist the cache record under that identity, pass that immutable identity to offscreen, and validate all ownership fields plus digest before retry or transfer. A mutable tab lookup may remain only as a convenience index pointing to immutable records; it cannot itself authorize bytes.

## Coverage conclusion

C40 advances from the historical L2 finding to the accepted L4 classification above and leaves the open-task projection. C41 has now also been executed, but its real native-dialog/restart remainder stays open at L5.
