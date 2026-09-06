# P0-070 — exact full-document generation authority — 2026-09-06

Date: 2026-09-06  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Research branch: `research/p0-070-full-document-generation-2026-09-06`  
Owner: **P0-070 ACTIVE**.

Canonical Registry wording:

> User save authority is exact full-document generation from command admission through print/cache/download/upload/Journal finalization.

This research note does not change production runtime or Registry status.

## 1. Scope and owner decomposition

P0-070 is the end-to-end source-generation owner. It must not be collapsed into any one neighboring generation.

The required authority chain is conceptually:

```text
P0-080 current selection/application receipt
  -> trusted worker source admission
  -> P0-070 exact live document/render generation
  -> P0-071 guarded native render cut
  -> P0-079 exact sealed PDF byte generation
  -> local download / Yandex mutation checkpoint
  -> Journal finalization provenance
```

Neighboring owners remain distinct:

- **P0-080** owns same-document SPA/application generation, live selected-DOM admission, selection revision, and the content-to-worker handoff.
- **P0-023** owns the narrower rule that PDF retry cache is exact source-document-generation bound; same-URL reload/replacement cannot reuse an old document PDF.
- **P0-071 DONE** owns safety of the actual `Page.printToPDF` representation at the render cut, including script freeze and printed-link sanitization.
- **P0-079** owns immutable operation-owned PDF bytes after a successful render.
- **P1-003** owns bounded resource readiness/omission truth for the selected visual resource graph.
- **P1-198** owns worker-issued physical live-operation identity. Caller textual `operationId` remains correlation metadata, never source ownership.
- selected child-frame exact-document/session owners remain authoritative for child-frame state.

P0-070 composes these receipts. It must not invent a second global operation-id authority or silently absorb the narrower owners.

## 2. Fresh source proof: current worker loses browser document identity

Current content save paths ultimately send top-level commands such as:

```text
WEBCLIP_GENERATE_PDF
WEBCLIP_SEND_PDF_TO_YANDEX
```

The corresponding service-worker handling derives `tabId` from `sender.tab?.id`, sanitizes metadata and proceeds through tab-based save helpers.

The browser also supplies `sender.documentId` and `sender.frameId`, but the current full-save/render path does not turn that exact browser document identity into a durable/render admission receipt.

This means the current trusted handoff effectively narrows:

```text
exact sender document A
```

to:

```text
tab N
```

before the native render cut.

A tab id is a container identity, not a document-generation identity.

## 3. Fresh source proof: native print is targeted by tab, not exact document

Current PDF generation creates a Chrome debugger target conceptually as:

```js
const debuggee = { tabId };
```

and invokes:

```text
Page.enable
Page.printToPDF
```

through that tab target.

Therefore a navigation/reload that changes the main document between worker admission and `Page.printToPDF` can retarget the physical render without changing `tabId`.

### Concrete cross-document schedule

```text
T0 content document A has valid selection/application authority
T1 content A sends save command
T2 worker receives message from A but retains only tabId N as render authority
T3 tab N reloads/navigates and now contains browser document B
T4 worker attaches debugger to tab N
T5 Page.printToPDF renders current document B
T6 operation can continue with metadata/provenance derived from A
```

Result:

```text
A authority + B rendered bytes
```

This violates P0-070 even if P0-080 perfectly validated A immediately before command delivery.

## 4. Content-side preparation is an earlier but separate TOCTOU

Current content flow for both local and Yandex paths performs long asynchronous preparation before sending the worker save command:

```text
build/review meta
-> prepareForPrint(meta)
-> send WEBCLIP_GENERATE_PDF or WEBCLIP_SEND_PDF_TO_YANDEX
```

P0-080 already owns the required final application/selection receipt validation after that preparation and immediately before the message.

P0-070 starts at the trusted worker boundary. It cannot treat the P0-080 pre-send validation as a permanent lock on the tab because navigation can happen after send.

## 5. P0-071 is a positive control, not a substitute for P0-070

P0-071 is physically wired on current `main` through the existing worker bootstrap:

```text
service-worker.js
  -> importScripts(..., journal-text-filter.js, ...)
  -> journal-text-filter.js worker-only branch
  -> importScripts('pdf-print-guard.js', ...)
```

`pdf-print-guard.js` wraps debugger `Page.printToPDF`, hides WebClip UI, disables page script execution, scans/sanitizes printed links, performs the real PDF cut, restores href state, resumes scripts and fails closed on cleanup errors.

That is a strong render-cut safety primitive.

However P0-071 deliberately does not prove that the debugger target still represents the exact source document admitted earlier. Freezing document B perfectly does not make B the authorized document A.

Therefore P0-070 must layer exact source-generation fencing around the existing P0-071 guarded print call rather than replacing it.

## 6. Available browser primitives do not require a new broad permission

The project minimum is Chrome 118.

Official Chrome Extension APIs provide the needed exact-document signals since Chrome 106:

- `runtime.MessageSender.documentId` is the browser UUID of the sender document;
- `runtime.MessageSender.frameId` identifies top-level frame 0 vs child frames;
- `tabs.sendMessage(..., { documentId })` can target one exact document;
- `scripting.executeScript({ target: { tabId, documentIds: [...] } })` can target exact browser documents.

The current manifest already has `tabs`, `scripting`, `activeTab` and `debugger` capabilities used by existing flows. P0-070 therefore does not require adding `webNavigation` merely to prove exact document liveness.

Official references:

- https://developer.chrome.com/docs/extensions/reference/api/runtime
- https://developer.chrome.com/docs/extensions/reference/api/tabs
- https://developer.chrome.com/docs/extensions/reference/api/scripting

## 7. CDP gives a render-window navigation fence

A one-time exact-document probe before debugger attach is necessary but not sufficient:

```text
probe A succeeds
-> A navigates to B
-> Page.printToPDF renders B
```

The existing `debugger` permission and `Page.enable` allow an operation-local listener to observe Page-domain navigation events through `chrome.debugger.onEvent`.

Relevant CDP events include:

- `Page.frameStartedNavigating` — a navigation has started, including browser- and renderer-initiated navigation;
- `Page.frameNavigated` — the frame has committed and is associated with a loader;
- `Page.navigatedWithinDocument` — same-document navigation such as History API/fragment navigation.

Official references:

- https://developer.chrome.com/docs/extensions/reference/api/debugger
- https://chromedevtools.github.io/devtools-protocol/tot/Page/

`Page.navigate`/frame metadata also distinguishes cross-document loader changes from same-document navigation; however P0-070 should not depend solely on URL or loader equality because application-generation ABA remains possible.

## 8. Required trusted worker source receipt

The exact representation is an implementation detail, but the semantic receipt should contain only bounded non-secret authority/provenance fields, conceptually:

```js
sourceGenerationReceipt = {
  version: 1,
  tabId,                  // from actual MessageSender
  topFrameId: 0,          // from actual MessageSender
  browserDocumentId,      // from actual MessageSender
  admittedUrl,
  content: {
    applicationGeneration,
    selectionRevision,
    navigationEntryId,
    contentRealmNonce     // optional representation detail
  }
};
```

Rules:

1. `tabId`, `frameId` and `browserDocumentId` come from the real Chrome sender envelope, not duplicate caller strings.
2. The top-level save command explicitly requires the intended top-level sender/frame contract.
3. Same URL is not document identity.
4. Same browser `documentId` is not same SPA/application generation.
5. Caller `operationId` is not included as source ownership authority; P1-198 remains owner of physical operation identity.

## 9. Required pre-render exact-document probe

Before the native render mutation/cut, worker must prove that the admitted browser document is still the exact current content authority.

Preferred fail-closed forms include:

```text
tabs.sendMessage(tabId, probe, { documentId: expectedDocumentId })
```

or an exact `scripting.executeScript` `documentIds` target when appropriate.

The exact target must return/validate the previously admitted P0-080 application/selection receipt, not a newly synthesized current receipt.

Required rejection examples:

```text
expected documentId A, exact target missing    -> stale/review-required
expected documentId A, live document B         -> stale/review-required
same URL but different documentId               -> stale/review-required
same documentId but appGeneration advanced      -> stale/review-required
selectionRevision advanced                      -> stale/review-required
navigationEntry/application generation changed  -> stale/review-required
```

A failed exact-document probe must perform zero `Page.printToPDF`, zero cache publication, zero local/Yandex external save and zero Journal success finalization.

## 10. Required debugger render-window monitor

After exact-document preflight, there is still an unavoidable gap. P0-070 therefore needs an operation-scoped main-frame navigation monitor covering the native render interval.

Conceptual ordering:

```text
trusted worker admission S
-> exact-document probe S
-> attach debugger to tab
-> Page.enable
-> install/arm operation-local navigation monitor
-> final source-generation check
-> existing P0-071 guarded Page.printToPDF
-> require monitor stayed clean through successful render/guard settlement
-> only then accept bytes
```

For the admitted top-level source, any relevant main-frame transition after monitor admission and before byte acceptance makes the render result stale.

### Cross-document/reload

Any main-frame cross-document navigation/reload during the render window:

```text
source stale
-> discard returned PDF bytes if any
-> no sealed P0-079 generation
-> no local download
-> no Yandex upload
-> no Journal success
```

### Same-document SPA/history transition

A main-frame `Page.navigatedWithinDocument`/equivalent transition also fences the admitted P0-080 application generation.

Even if URL later returns to the original value:

```text
A -> B -> A
```

the intervening event is monotonic stale evidence. URL ABA must never resurrect the old receipt.

### Navigation started but cancelled

For archive/source correctness, a main-frame navigation start observed during the protected render-generation window should fail closed unless implementation can prove the old exact source remained the authoritative render throughout. The simpler and safer contract is to treat `frameStartedNavigating` as stale evidence for that attempt.

## 11. Main-frame vs child-frame scope

P0-070 must not turn every child-frame event into a global false positive.

Rules:

- main-frame transition affects the top-level source generation and is directly P0-070-fatal during the render window;
- an unrelated/unselected child-frame navigation is not automatically sufficient to invalidate the top-level source receipt;
- a selected child frame must be governed by its exact child document/session/frame authority owners; P0-070 consumes their validity, it does not replace their generation model;
- child frame id reuse or same-URL reload cannot be inferred current from URL/frameId alone.

The deterministic P0-070 model therefore includes an unselected child-frame navigation as a negative control.

## 12. Byte-acceptance boundary and handoff to P0-079

The critical semantic boundary is:

```text
live source authority
   before successful guarded render + clean navigation fence

sealed PDF byte authority
   after successful guarded render + clean navigation fence + exact cache-generation commit
```

Once the PDF bytes have been accepted into an immutable P0-079 sealed generation, later navigation of the tab must not invalidate or rerender those bytes.

Retry must consume that exact sealed generation. It must not return to the live tab and render whatever is current.

This composes with P0-023: the exact sealed/retry object retains source-document provenance so same-URL reload cannot inherit an old document's PDF.

## 13. Provenance through download/upload/Journal finalization

P0-070 does not end at `Page.printToPDF`.

Current downstream checkpoints carry substantial metadata, operation correlation and destination-specific identity, but there is no explicit versioned source-generation receipt mechanically linking:

```text
trusted source admission
-> accepted render cut
-> exact PDF generation
-> external effect checkpoint
-> Journal finalization
```

Future implementation should preserve a bounded non-secret provenance link across these stages.

Conceptually:

```js
pdfGenerationReceipt = {
  version: 1,
  sourceReceipt: <bounded exact source-generation receipt or stable digest/id>,
  sealedCacheGeneration: <P0-079 exact generation>,
  byteLength,
  integrityReceipt
};
```

Local/Yandex pending checkpoints and Journal success should refer to the same PDF/source provenance rather than independently rebuilding authority from current tab URL/meta.

This is provenance, not permission to reuse stale live source state.

## 14. Unknown/late settlement rules

P0-070 must compose with non-cancellable/unknown downstream effects rather than pretending cancellation.

Important separation:

- **before external effect admission:** stale source generation means fail/abort with zero new effect;
- **after an exact PDF generation and external effect admission:** later live-tab navigation is irrelevant to the already admitted exact bytes; unknown download/upload settlement must be reconciled under the destination-specific owners rather than rerendering;
- a caller timeout cannot authorize a fresh render under a newer tab document as a recovery shortcut.

## 15. Operation identity and concurrency

P0-070 must not rely on caller textual `operationId` as source authority.

Two save commands may reuse the same caller text but have different browser document/application generations. They remain different source admissions.

Concurrent operations on one tab require operation/source-local navigation state. Avoid a single unversioned global `tabId -> stale` Boolean that can poison a later operation after an older listener settles.

Listener lifecycle requirements:

- exact attached/debugger session ownership;
- bounded registration/removal;
- stale/late listener callbacks cannot mutate a newer operation's state;
- debugger detach is handled as unknown/failure for any render whose source/print settlement is not yet proven;
- cleanup error after a returned PDF fails closed before bytes are accepted.

P1-198 remains the owner for trusted physical operation generation used to bind these live resources.

## 16. Race schedules future tests must cover

Minimum deterministic/source/Chrome acceptance cases:

1. stable document A from worker admission through render -> exactly one sealed PDF generation A;
2. A -> B after worker admission but before exact-document probe -> reject before print;
3. A -> B after probe/attach but before or during `Page.printToPDF` -> returned bytes discarded;
4. same-document `/a -> /b` during render -> discard;
5. `/a -> /b -> /a` ABA during render -> discard;
6. same URL with a new browser `documentId` -> reject;
7. same browser documentId with newer P0-080 application generation -> reject;
8. newer selectionRevision after review/preparation -> rejected at the P0-080/P0-070 handoff;
9. caller textual operationId reuse cannot bind A receipt to B;
10. unrelated/unselected child-frame transition alone is a negative control;
11. selected child-frame generation change is surfaced by its owner and prevents silent success;
12. after sealed PDF generation commits, a later tab navigation does not change/re-render bytes used by local/Yandex retry;
13. debugger detach/monitor cleanup failure before byte acceptance produces no downstream success;
14. P0-071 hostile-link render-cut regression remains PASS with the P0-070 monitor layered around it.

## 17. Deterministic research model

Added:

`project_tools/test_p0_070_full_document_generation_model.js`

The model covers:

- stable exact source -> sealed PDF;
- cross-document pre-probe failure;
- cross-document during-render invalidation;
- same-document navigation invalidation;
- A/B/A ABA invalidation;
- same URL / different documentId rejection;
- same document / newer application generation rejection;
- caller operation text as non-authoritative correlation;
- unselected child-frame negative control;
- post-seal navigation immutability.

Local Node execution on 2026-09-06:

```text
P0-070 full-document generation model: PASS
```

This is an architecture/model pass only. It is not production-runtime closure evidence.

## 18. Source-bound runtime gate contract

A future source gate should require mechanically visible production evidence that:

1. top-level save handlers consume trusted `sender.documentId` and explicit top-level `sender.frameId`;
2. worker constructs/validates a versioned source-generation receipt rather than retaining only tabId/current URL;
3. exact-document liveness/admission is rechecked before native render using `documentId` targeting or an equivalently strong browser document primitive;
4. debugger Page-domain navigation events are observed during the render window;
5. main-frame cross-document and same-document transition evidence fences byte acceptance;
6. current P0-071 guarded `Page.printToPDF` remains in the real render path;
7. stale/monitor-cleanup failure cannot publish a PDF cache generation or start local/Yandex/Journal success;
8. accepted render produces a provenance link to the exact sealed P0-079 PDF generation;
9. downstream checkpoints/finalization retain that source/PDF provenance rather than rebuilding from mutable tab state;
10. `operationId` alone is not treated as source-generation authority;
11. no new `webNavigation` permission is required merely to implement this contract.

The source gate is expected to remain RED on the current runtime until implementation.

## 19. Real Chrome evidence required for closure

Because P0-070 concerns the exact physical document consumed by native rendering, deterministic/source tests are insufficient for DONE.

Current-Chrome evidence should physically exercise at least:

- controlled navigation/reload between worker admission and debugger render;
- same-document History API transition during the render window;
- a stable control where the admitted document prints successfully;
- a post-render navigation proving retry/upload consumes the sealed old PDF rather than re-rendering the new page;
- composition with the existing P0-071 physical render guard.

The evidence must verify the actual PDF/output identity, not only UI error text.

## 20. Status

P0-070 remains **ACTIVE**.

Research status after this checkpoint:

- source root cause: confirmed;
- owner boundaries: defined;
- deterministic architecture model: PASS;
- production source implementation: absent;
- source-bound runtime gate: intentionally RED until implementation;
- current-Chrome closure evidence: not yet produced.

Production runtime/manifest remain version `0.9.8` on canonical main. No build, tag or GitHub Release is created by this research work. Release readiness remains `NOT READY`.
