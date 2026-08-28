# Audit delta — prepared document to debugger PDF handoff — 2026-08-28

Source-of-truth `main` immediately before this write: `ab9a4f368236cf0e07fe8c160a2d278cb3951892`.

Docs-only audit checkpoint. Runtime/config/manifest/tests are unchanged.

## Classification

No new P-number is assigned.

Fresh source proof refines **P0-070** and the end-to-end PDF provenance contract. It composes with **P0-075/P0-004** frozen printable representation, **P1-198** operation receipt, **P0-079** immutable PDF generation and **P1-147** exact-generation diagnostics.

## Fresh handoff proof

### 1. Content prepares one exact living document before worker admission

Both local and Yandex save flows execute:

`await prepareForPrint(meta)`

inside the content script before sending the privileged runtime save message.

That preparation mutates/constructs print state in the current content document: selected-only styles, resource preparation, frame preparation and related print representation state.

Thus a successful `prepareForPrint` is inherently document-generation-specific even though the returned save request does not carry that generation explicitly.

### 2. Runtime sender supplies document identity but handler drops it

For `WEBCLIP_GENERATE_PDF`, current worker code reads only:

`const tabId = sender.tab?.id`

and calls:

`generatePdfAndDownload(tabId, sanitizeContentSaveMeta(message.meta, sender), operationId)`.

The analogous Yandex flow follows the same tab-owned PDF path.

Chrome's sender includes `documentId` for content-script messages where available, but that identity is not passed into PDF generation.

### 3. Debugger target is tab-only

`generatePdfBlob(tabId)` creates:

`const debuggee = { tabId }`

and ultimately invokes `Page.printToPDF` on that browser target.

Therefore the physical renderer selected at debugger-command time is whichever document is current in the tab then, not necessarily the document whose content script completed preparation and sent the request.

### 4. `prepareForPrint()` success is not a safe commit point

Deterministic schedule:

1. top document A contains selection/print state and completes `prepareForPrint(metaA)`;
2. A sends `WEBCLIP_GENERATE_PDF`; sender identity still represents A;
3. before worker debugger attach/print, tab reloads/navigates to document B — including same-URL B;
4. worker retained only tabId;
5. debugger attaches to current B and `Page.printToPDF` renders B;
6. metadata/selection/resource report originated from prepared A while physical PDF bytes are B.

The stronger frozen-content representation required by P0-075 does not solve this by itself if the worker never proves that the debugger target is the owner of that representation.

### 5. URL equality cannot repair same-URL replacement

A fresh `tabs.get(tabId).url` check can detect ordinary cross-URL navigation but not full reload/replacement at the same URL. P0-070 therefore needs exact document/navigation generation, not only URL revalidation.

## Required P0-070 acceptance

### Prepared-generation receipt

The content preparation phase must produce/be associated with an immutable receipt binding:

- exact sender top `documentId` / navigation generation;
- admitted normalized source URL as descriptive metadata;
- selection/frozen print generation from P0-075/P0-004;
- worker-issued operation receipt P1-198.

### Worker preserves the sender identity

At runtime admission, worker captures sender.documentId and expected tab/document generation before doing any delayed PDF work. The identity must be carried through debugger/PDF generation rather than collapsed to tabId.

### Pre-debugger fence

Immediately before attach/print, prove the current top document still equals the admitted/prepared document generation. Mismatch must fail closed before `Page.printToPDF`.

If Chrome debugger APIs remain tab-addressed, use an independent exact-document/navigation receipt to prove the current tab target still belongs to A. URL-only proof is insufficient.

### Post-print / consumer admission

Once PDF bytes exist, bind them to the same document/print generation before cache/download/Yandex admission. If the tab changed during the print window and exact provenance cannot be established, do not publish a mixed A/B save.

### Diagnostics use the same generation

P1-147 before/after/post-print diagnostics must refer to this exact print/document generation or be marked unavailable. A replacement document never supplies diagnostics for A.

## Regressions

1. Prepare A -> navigate to B before debugger attach -> no PDF B under metadata A.
2. Prepare A -> same-URL reload B -> fail exact document fence despite equal URL.
3. Prepare A -> no navigation -> normal PDF succeeds.
4. Navigation during debugger/print -> post-print consumer admission detects generation mismatch according to chosen Chrome receipt model; mixed provenance is not finalized.
5. Frozen printable representation A exists but current tab is B -> B cannot become its debugger target.
6. Source A closes after already-admitted immutable PDF/download/upload generation -> physical recovery may continue from its durable receipt, but new retry/current-document authority is not transferred to B.
7. Diagnostics query after A replacement -> B diagnostics are rejected/not requested as A evidence.
8. Worker restart cannot reconstruct source document identity from tabId+URL alone for an unadmitted PDF operation.
9. Progress delivery targets/drop semantics remain exact-document under existing P1-198/P0-070 requirements.
10. No regression to debugger attach/detach actual-settlement bounds.

## Numbering result

No new item. **P0-070** remains primary owner; P0-075/P0-004/P1-198/P0-079/P1-147 compose.

## Test / release state

No product tests were rerun. Historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS** remains prior evidence only. No build, tag or Release was created.
