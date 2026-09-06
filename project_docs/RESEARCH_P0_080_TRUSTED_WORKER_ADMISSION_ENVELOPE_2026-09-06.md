# P0-080 — trusted worker admission envelope for SPA selection authority — 2026-09-06

Date: 2026-09-06  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Parent branch: `research/p0-080-spa-application-generation-2026-09-06`  
Owner: **P0-080 ACTIVE**. Adjacent owners: P0-070, P1-198, P1-175, frame/document-generation owners.

This checkpoint refines how content-side application/selection authority becomes a trusted worker-side save admission receipt. Production runtime is unchanged.

## 1. Fresh source proof

Current content flow builds save metadata from page state and later sends:

```text
WEBCLIP_GENERATE_PDF { meta, operationId }
```

Current worker handler obtains:

```text
const tabId = sender.tab?.id
```

and then calls `generatePdfAndDownload(...)` with sanitized metadata and caller operation text.

The current save admission path does not bind `sender.documentId` to an application/selection-generation receipt.

Current `sanitizeContentSaveMeta(rawMeta, sender)` does use sender/tab URL as a trusted navigation-oriented input, which is a positive control, but URL is not browser-document identity and does not solve same-document SPA generation.

## 2. Content must not self-declare browser `documentId`

The content script can maintain trusted extension-isolated state such as:

```text
applicationGeneration
selectionRevision
selectionHref
selection roots/liveness
```

But the browser-provided `MessageSender.documentId` belongs to the worker/runtime message boundary.

Therefore this is not sufficient:

```text
meta.browserDocumentId = some content-provided string
```

The worker must stamp the browser identity from the actual sender that delivered the command.

Recommended conceptual envelope:

```text
contentSelectionReceipt = {
  version: 1,
  applicationGeneration,
  selectionRevision,
  href,
  contentRealmNonce
}

workerSelectionAdmission = {
  version: 1,
  tabId: sender.tab.id,
  frameId: sender.frameId,
  browserDocumentId: sender.documentId,
  contentReceipt: <validated exact receipt>,
  admittedAt: ...
}
```

`contentRealmNonce` is optional representation detail. It can help distinguish an isolated-world content-script state lifetime, but it must not substitute for browser `documentId`.

## 3. Final content-side validation must occur after long preparation hazards

A subtle current timing issue is:

```text
build meta / snapshot
-> prepareForPrint(meta) can await resource/frame preparation
-> send WEBCLIP_GENERATE_PDF
```

An SPA may change route/application state during those awaits.

Therefore the final P0-080 validation cannot happen only when the review dialog opens or when metadata is first built.

Immediately before sending the irreversible worker save command, content must re-check at least:

- current application generation equals the receipt generation;
- current selection revision equals the reviewed/admitted revision;
- current href matches the receipt as required for that application generation;
- all local authority-bearing selected roots remain live/current;
- remote-frame selection receipts remain valid under their dedicated owners.

If preparation itself changes selection/app authority, the save must fail/review-required instead of sending stale authority.

## 4. Worker-side sender envelope

When the worker receives `WEBCLIP_GENERATE_PDF`, it should create one trusted admission object from:

```text
sender.tab.id
sender.documentId
sender.frameId
validated contentSelectionReceipt
worker-issued physical operation receipt (P1-198)
```

The worker should not trust duplicate caller fields for tab/document/frame ownership.

For a top-level save command, the implementation should explicitly enforce the intended top-level sender/frame contract rather than silently accepting a frame-local sender as equivalent authority.

Exact child-frame authority for selected remote content remains with the dedicated frame owners; P0-080 does not collapse those into the top-level sender id.

## 5. URL mismatch is an admission signal, not identity replacement

The worker may compare trusted sender/tab URL with the content receipt href as an additional fail-closed check.

But:

```text
same URL != same browser document
same browser document != same SPA application generation
```

All three concepts remain distinct.

If sender URL and content receipt href disagree at command delivery, the safe result is stale/review-required. The worker must not rewrite the receipt to the fresh URL and continue with old selection data.

## 6. Message-boundary TOCTOU

There remains an unavoidable sequence:

```text
content validates receipt S
content sends message
SPA changes immediately afterward
worker receives/adopts S
```

P0-080 alone cannot freeze the page forever. The correct composition is:

1. P0-080 validates and issues current selection/application receipt at command boundary;
2. worker stamps actual browser sender document identity;
3. P0-070 owns the full save generation after admission and must ensure later print/cache/finalization stages still act on the admitted source generation rather than silently adopting later page state.

Thus P0-080 should not invent an endless DOM monitor after save admission; it hands off exact authority to P0-070.

## 7. Review receipt invalidation

A review/save dialog opened at:

```text
applicationGeneration=G
selectionRevision=R1
```

must not later submit after:

```text
selectionRevision=R2
```

without explicit re-review/re-admission.

The final pre-send check should compare the dialog/review receipt, not merely current state to itself.

This prevents an asynchronous prepare step or user action from causing the UI to show one selected scope while a later modified scope is saved.

## 8. Same-document navigation while review is open

If route/app generation changes while the review dialog is open:

- keep stale evidence only for UX if useful;
- disable/fail the final save action for that old receipt;
- require explicit reselection/revalidation under the new generation;
- do not silently rebuild metadata with current URL and retain old selected refs.

URL ABA remains fenced by generation:

```text
G1 /a -> G2 /b -> G3 /a
```

An old review receipt `(G1,R)` never becomes current again merely because href returns to `/a`.

## 9. Source-bound acceptance additions

Future closure should make these mechanically visible:

1. content-side state contains explicit application generation and selection revision;
2. final save-command path revalidates a previously issued/reviewed receipt after asynchronous print/resource preparation and immediately before `sendMessage`;
3. `WEBCLIP_GENERATE_PDF` carries that receipt;
4. worker handler reads/stamps `sender.documentId` rather than trusting a caller document id;
5. worker binds sender document id + tab id to the exact content receipt before handing off to P0-070;
6. sender URL mismatch cannot be repaired by rewriting the receipt to current URL;
7. top-level sender/frame expectations are explicit;
8. later P0-070 stages consume the trusted worker admission rather than raw mutable page metadata.

## 10. Ownership boundaries

**P0-080 owns:** same-document application generation, live selected-DOM admission, selection revision, and the content-to-worker authority handoff.

**P0-070 owns:** source/save generation after worker admission through print/cache/download/upload/finalization.

**P1-198 owns:** worker-issued live operation identity; caller `operationId` remains correlation metadata.

**P1-175 owns:** later Journal Apply/source-page retarget freshness.

Child-frame document/session owners remain authoritative for remote selected frames.

## 11. Status

P0-080 remains **ACTIVE**. Current runtime has neither content application/selection-generation receipts nor sender-document binding in the save admission handler.

Runtime/manifest remain `0.9.8`; release remains `NOT READY`.
