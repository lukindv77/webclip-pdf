# Research evidence — P0-070 end-to-end source-document generation revalidation — 2026-09-16

Canonical baseline: `main` at `d682af9302d42cf26d3d3d3b5026c9d26fa89ecb`.

Research-only closure-oriented tranche. Production runtime, `manifest.json`, workflows, build/tag/deploy/release state and release-readiness state are unchanged.

## Result

**P0-070 remains ACTIVE / ROOT-CAUSE-REVALIDATED.**

Fresh current source still does not carry one exact top-document generation receipt from content-command admission into `Page.printToPDF` and then into the immutable PDF/result lineage.

The platform already gives the worker an exact `MessageSender.documentId` for a content-script message, but the current `WEBCLIP_GENERATE_PDF` path retains only the tab id plus sanitized URL/title/selection metadata. Later `generatePdfBlob(tabId)` attaches the debugger to `{ tabId }` and asks the Page domain to `printToPDF` whichever document that tab currently represents.

A navigation/reload between message admission and print can therefore retarget the privileged PDF operation to a replacement top document while the operation still carries metadata admitted from the earlier document. The same problem has a second post-print boundary: `collectPrintDiagnosticsForTab(tabId)` sends a tab-only message after PDF bytes exist, so diagnostics may describe a replacement document even when the PDF itself was produced from the original one.

This remains a release-critical root cause because current requirement §5.9 says responsive/resource/temporal/frame state of the saved copy must belong to the same admitted logical document generation as the user's selection, or the result must be classified as degraded/unknown/failure rather than false success.

## Canonical owner / semantic duplicate reconciliation

Fresh `RESEARCH_REGISTRY.md` on the baseline owns this root cause as:

> P0-070 ACTIVE — User save authority is exact full-document generation from command admission through print/cache/download/upload/Journal finalization.

No new P-code is created.

Historical evidence in `RESEARCH_FAMILY_PDF_PRINT_OFFSCREEN_EVIDENCE.md` contains the earlier end-to-end PDF provenance, prepared-document/debugger handoff, SPA generation and related findings. That material was used only for semantic duplicate/root-cause reconciliation and acceptance-shape comparison. Current owner/status comes only from `RESEARCH_REGISTRY.md`.

Adjacent owners stay distinct:

- **P0-070** owns end-to-end source-document generation authority across the whole save operation;
- **P0-080** owns same-browser-document logical SPA/application generation and live selected-DOM authority;
- **P0-023** owns retry-cache reuse across source-document generations;
- **P0-079** owns operation-owned immutable PDF byte/cache generation instead of one mutable tab slot;
- **P0-073/P0-074** own Yandex remote recovery namespace and immutable remote-operation context;
- **P0-076** owns Journal single-entry revision/generation CAS;
- **P0-075/P0-071** own hostile-page/control-plane and printable-representation trust boundaries.

## Fresh current requirement proof

`project_docs/USER_REQUIREMENTS.md` is the current requirements authority.

The current PDF fidelity requirement explicitly states that responsive/resource/temporal/frame state of the saved copy must refer to the **same admitted logical document generation** as the user's selection, or the result must become degraded/unknown/failure instead of false success.

This is a direct product requirement, not merely a research preference.

## Fresh exact-source proof

All current-source statements below were revalidated against exact canonical baseline `d682af9302d42cf26d3d3d3b5026c9d26fa89ecb`.

Fresh fetches prove the production blobs are:

- `service-worker.js`: `6d61ac81befdbf2804ae9dbec425aa08d1194eb1`;
- `content.js`: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`.

Those are the exact bytes reviewed below.

### 1. Platform sender document identity reaches the worker but current admission discards it

Current `WEBCLIP_GENERATE_PDF` handling does:

```text
const tabId = sender.tab?.id;
return generatePdfAndDownload(
  tabId,
  sanitizeContentSaveMeta(message.meta, sender),
  normalizeOperationIdInput(message.operationId)
);
```

The current call does not pass `sender.documentId`, `sender.frameId`, or a monotonic top-navigation generation into the PDF operation.

`sanitizeContentSaveMeta(rawMeta, sender)` derives authoritative URL/origin from `sender.tab.url || sender.url`, then returns bounded title/date/comment/selection/resource/page-analysis data. It does not return an exact source document generation receipt.

This matters because Chrome exposes `MessageSender.documentId` specifically as the UUID of the document that opened/sent the connection/message context.

### 2. `generatePdfBlob(tabId)` targets current tab state

Current `generatePdfBlob(tabId)` constructs:

```text
const debuggee = { tabId };
```

and later invokes:

```text
chrome.debugger.sendCommand(debuggee, 'Page.printToPDF', ...)
```

The operation is therefore addressed to a tab/target, not to the source `documentId` admitted from the content message.

The existing debugger serialization, attach timeout and detach cleanup are useful settlement controls. They do not establish that the current document represented by that tab is still the document that initiated the save.

### 3. Cross-document retarget schedule remains possible

A current-source schedule is:

1. top document A sends `WEBCLIP_GENERATE_PDF`;
2. worker admits `tabId` plus A-derived sanitized metadata but drops `sender.documentId=A`;
3. before debugger attach / `Page.printToPDF`, the top frame commits replacement document B in the same tab;
4. `generatePdfBlob(tabId)` attaches to the current tab target and prints B;
5. operation metadata still describes A;
6. downstream save can therefore carry A metadata with B bytes unless another owner happens to fail first.

A same-URL reload/replacement is especially important because URL equality cannot distinguish A from B.

### 4. URL and frameId are not document-generation identities

The current anti-spoofing choice of deriving URL/origin from `sender.tab`/`sender` is valuable, but URL is descriptive metadata rather than unique document-generation identity.

Chrome documents that a frame can keep the same `frameId` across navigations while the hosted document changes. Chrome added `documentId` specifically because frame identity alone cannot distinguish those document lifetimes.

Consequently neither `{tabId, frameId}` nor `{tabId, URL}` is sufficient for P0-070.

### 5. Post-print diagnostics have an independent retarget boundary

Both current PDF flows follow the same shape:

```text
let pdfBlob = await generatePdfBlob(tabId);
const printDiagnostics = await collectPrintDiagnosticsForTab(tabId);
```

`collectPrintDiagnosticsForTab(tabId)` uses:

```text
chrome.tabs.sendMessage(
  Number(tabId),
  { type: 'WEBCLIP_COLLECT_PRINT_DIAGNOSTICS' }
)
```

without the supported `documentId` targeting option.

Thus even if PDF bytes were produced from A, a navigation after `printToPDF` and before diagnostics can make the diagnostic response come from B.

Diagnostics are evidence about what was printed. They must therefore be exact-source or explicitly unavailable, never silently rebound to the current replacement document.

### 6. Current browser API already supports exact-document messaging

Chrome's `tabs.sendMessage()` accepts an optional `documentId` and sends to that specific document instead of every matching content-script context in the tab.

Therefore the post-print diagnostic retarget problem has a platform-level exact-addressing primitive available on the project's current Chrome baseline.

Using it is an implementation option, not by itself a complete P0-070 fix: source generation must also remain stable during the privileged print interval.

### 7. Same-document SPA generation remains a required composition

P0-080 was freshly revalidated and merged immediately before this tranche.

A stable browser `documentId` does not prove stable logical SPA/application generation. P0-070 must therefore consume the application-generation/liveness authority established by P0-080 rather than treating browser `documentId` as the entire save-generation receipt.

### 8. Downstream ownership controls cannot reconstruct discarded source provenance

Once exact source-document identity is discarded before print, later controls cannot recreate it from:

- URL/title;
- tab id;
- PDF byte size/hash;
- exact remote Yandex object proof;
- Journal entry id;
- operation-owned cache id.

Those controls can prove their own stages, but they cannot prove which source document the bytes came from unless P0-070 passes the source receipt into their lineage.

## Fresh external research

External material is used to validate browser semantics, available primitives and real target/navigation race classes. It is not treated as an automatic WebClip requirement.

### Chrome runtime `MessageSender.documentId`

Chrome documents `MessageSender.documentId` (Chrome 106+) as a UUID of the document that opened the message/connection context.

Reference checked 2026-09-16:

- https://developer.chrome.com/docs/extensions/reference/api/runtime

This means WebClip does not need to infer the initiating browser document from URL alone: exact sender document identity already reaches the privileged listener.

### Chrome `webNavigation` document semantics

Chrome explains why `frameId` is insufficient across navigations and documents `documentId` as a unique identifier per document. When a frame navigates and opens a new document, the identifier changes. `onCommitted` also reports the committed document's `documentId`.

Reference checked 2026-09-16:

- https://developer.chrome.com/docs/extensions/reference/api/webNavigation

This supports a monotonic top-navigation-generation fence in addition to exact document identity. A generation counter/event receipt is important for ABA-like schedules where the originally admitted document becomes current again after an intervening navigation.

### Chrome exact-document messaging

Chrome documents `tabs.sendMessage(tabId, message, { documentId })`, available since Chrome 106, for targeting a specific document instead of all matching contexts in a tab.

Reference checked 2026-09-16:

- https://developer.chrome.com/docs/extensions/reference/api/tabs

This is directly relevant to the current tab-only post-print diagnostics call.

### Chrome debugger / CDP target semantics

Chrome's debugger API documents `Debuggee.tabId` as targeting the tab being debugged and separately exposes opaque target ids/sessions. The `Page.printToPDF` command itself is a Page-domain command and does not accept an extension `documentId` parameter.

References checked 2026-09-16:

- https://developer.chrome.com/docs/extensions/reference/api/debugger
- https://chromedevtools.github.io/devtools-protocol/tot/Page/#method-printToPDF

Therefore a WebClip source-document receipt must be checked/fenced around the target-bound print operation; the print call does not automatically inherit the runtime message's initiating `documentId`.

### Public project evidence: navigation/target operations race in practice

Recent Playwright issue #41900 (2026-07-21) reproduces a Chromium race where a target operation (`page.close`) overlaps a cross-origin navigation commit and can hang. Playwright issue #42366 (2026-08-22) provides a raw-CDP reproduction where `Target.closeTarget` returns success while a meta-refresh navigation is mid-commit and the target continues emitting the destination lifecycle.

Older Puppeteer issue #2735 reports `Page.printToPDF` failing with `Target closed`, demonstrating that PDF generation itself is sensitive to target lifetime.

References checked 2026-09-16:

- https://github.com/microsoft/playwright/issues/41900
- https://github.com/microsoft/playwright/issues/42366
- https://github.com/puppeteer/puppeteer/issues/2735

These public issues do not prove the WebClip bug. They validate the engineering assumption that navigation/target lifecycle can race privileged CDP operations and should be modeled explicitly rather than assumed stable.

### User/community relevance

Current web-clipper user reports show that preview/capture and committed saved content can diverge. A June 2026 Obsidian report says some pages preview correctly in the clipper but save blank, while an April 2026 report describes only part of an article being saved until the user changes selection strategy.

References checked 2026-09-16:

- https://www.reddit.com/r/ObsidianMD/comments/1t5oaqs/web_clipper_just_adds_blank_page_how_to_solve_it/
- https://www.reddit.com/r/ObsidianMD/comments/1sm7cvk/web_clipper_does_not_save_full_article/

These reports are not evidence of WebClip's implementation defect. They demonstrate the user-facing importance of keeping preview/selection authority and the finally committed saved representation in one generation.

## Deterministic model

Added model:

`project_tools/test_p0_070_end_to_end_source_generation_revalidation_model.js`

Local verification:

- `node --check`: **PASS**;
- deterministic execution: **PASS 42 checks**;
- SHA-256: `3cbbd8feeba2e07d43f46caa829175a39bed2f107bd0e19b43e7c99eb412ffce`;
- expected Git blob from exact UTF-8 bytes: `61fdfffcfd070af03f679079bb4bf2f26f7f241a`.

The model is an acceptance/failure model, not a final implementation prescription.

### Current-source failure controls reproduced

The model demonstrates:

1. admission from document A discards the sender's exact document identity;
2. a replacement B in the same tab can become the document printed by a tab-targeted operation;
3. final metadata can still describe A while PDF bytes are modeled as B;
4. same-URL replacement remains distinguishable only by document generation, not URL;
5. PDF may finish on A and a later tab-only diagnostic call may describe B.

### Candidate acceptance controls

The model demonstrates that closure needs at least:

- exact sender `documentId` at admission;
- intended top-frame admission rather than accidental subframe rebinding;
- one monotonic top-navigation generation bound to the operation;
- the P0-080 logical application generation in the same source receipt;
- exact checks immediately before print and after the provisional PDF bytes return;
- no consumer admission of provisional bytes after a navigation-generation mismatch;
- explicit handling of an A → B → restored-A sequence so simple before/after document-id equality cannot create an ABA hole;
- exact-document diagnostics or explicit `unavailable`, never fallback to a replacement current document;
- an immutable PDF receipt carrying source document/navigation/application lineage downstream.

## Required invariant

> A successful save has one source-generation lineage from the exact top document/application generation that admitted the user's save through the exact PDF bytes and every downstream consumer. A tab id, frame id, URL, successful `Page.printToPDF` call, byte hash, remote object identity or Journal id cannot substitute for that source receipt. If top-document/application generation changes before PDF bytes are immutably admitted, the operation must fail closed rather than retarget.

## Acceptance shape for eventual implementation

This research narrows the acceptance boundary without choosing one mandatory implementation.

A robust implementation can compose available browser primitives:

1. **Admission receipt**
   - capture `sender.tab.id`;
   - require intended top-frame sender;
   - capture exact `sender.documentId`;
   - bind P0-080 application generation/selection generation;
   - bind a monotonic top-navigation generation or equivalent exact operation fence.

2. **Pre-print check**
   - immediately before debugger/print authority, prove the source document/application generation is still current;
   - URL equality is only metadata, not proof.

3. **In-print navigation fence**
   - treat any committed top-document generation change while the privileged print operation is in flight as invalidating the provisional result;
   - this must cover A → B → A/restore schedules, not only final document-id inequality.

4. **Post-print check before consumer admission**
   - PDF bytes remain provisional until the exact source generation is revalidated;
   - on mismatch, release/destroy the unadmitted byte object according to bounded resource rules and return explicit stale-navigation failure.

5. **Immutable PDF source receipt**
   - bind operation id;
   - source `documentId`;
   - source top-navigation generation;
   - source application/selection generation;
   - PDF generation id;
   - bounded content receipt such as byte length and digest where required by downstream owners.

6. **Exact diagnostics**
   - address the admitted source document using exact document targeting where available;
   - if it is no longer addressable, persist `unavailable/stale` rather than querying the replacement page.

7. **Downstream composition**
   - P0-023 retry-cache admission consumes the same source receipt;
   - P0-079 operation-owned bytes consume the same source receipt;
   - P0-073/P0-074 remote context and P0-076 Journal finalization preserve, rather than widen, that lineage.

A possible implementation may use `webNavigation` generation tracking, debugger/CDP navigation events, exact document messaging, or an equivalent browser-backed monotonic receipt. The final design must prove the invariant, not merely adopt a particular API.

## Physical closure evidence still required

P0-070 must remain ACTIVE until an implementation tranche proves at least:

1. fresh runtime carries exact top-document identity from command admission into PDF generation;
2. navigation/reload before print fails closed rather than printing the replacement page;
3. same-URL reload/replacement fails closed;
4. navigation during `Page.printToPDF` invalidates provisional bytes before download/cache/upload/Journal admission;
5. an A → B → restored-A/ABA schedule cannot escape the fence;
6. same-document P0-080 application-generation change composes correctly;
7. post-print diagnostics are exact-source or explicitly unavailable;
8. local download path preserves exact source-generation lineage;
9. Yandex upload/retry path preserves the same source-generation lineage with P0-079 operation-owned bytes;
10. Journal finalization records only a matching source/PDF generation;
11. real unpacked Chrome tests exercise representative cross-document navigation, same-URL reload and same-document SPA transition during save;
12. exact-head Repository Integrity and post-merge Repository Integrity pass on the implementation commit.

## Classification

- current status: **ACTIVE / ROOT-CAUSE-REVALIDATED**;
- deterministic research coverage: **PASS 42 checks**;
- physical unpacked-Chrome closure: **not claimed**;
- implementation: **not changed by this tranche**;
- build/tag/deploy/GitHub Release: **not authorized and not performed**;
- release readiness: **unchanged / NOT READY**.
