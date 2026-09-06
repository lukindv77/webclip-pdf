# P0-023 — exact source-document generation bound retry cache — 2026-09-06

Date: 2026-09-06  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Research branch: `research/p0-023-exact-source-document-cache-2026-09-06`  
Owner: **P0-023 ACTIVE**.

Canonical Registry wording:

> PDF retry cache must be exact source-document generation bound; same-URL reload/replacement cannot reuse an older document's PDF.

This checkpoint changes no production runtime or Registry status.

## 1. Why P0-023 remains distinct after P0-070 and P0-079

Recent research separates three adjacent authorities:

```text
P0-070  exact full-document/source generation through render
P0-079  immutable operation-owned PDF byte generation after render
P0-023  which live source/document is allowed to discover/reuse a retry generation
```

P0-023 is therefore not obsolete.

P0-070 can truthfully say which source generation produced a PDF, and P0-079 can make those bytes immutable, while a later page/document can still wrongly discover and claim that exact old PDF if retry lookup remains keyed/admitted only by tab/url.

P0-023 owns that discovery/admission boundary.

## 2. Fresh current-source proof

Current cache identity is tab-scoped:

```js
function pdfCacheKey(tabId) {
  return `tab:${tabId}`;
}
```

Current cache metadata includes fields such as:

```text
key
tabId
filename
meta
createdAt
sourceUrl
pdfByteLength
cacheFormat
temporary
journalEntryId
```

but does not contain an exact browser `documentId` or a versioned source-generation receipt.

Current live retry validation in `getValidCachedPdfForTab(tabId)` does roughly:

```text
read tab:<id> metadata
check TTL
chrome.tabs.get(tabId)
normalize current URL
normalize cached sourceUrl/meta.url
if URL missing/different -> delete cache and reject
else -> return cached
```

Thus the current authority predicate is effectively:

```text
same tab + same normalized URL + unexpired
```

That is not exact document identity.

## 3. Same-URL reload failure schedule

Concrete schedule:

```text
T0 tab 7 contains browser document A at https://example.test/article
T1 WebClip renders PDF A and stores retry cache tab:7 with sourceUrl=/article
T2 tab 7 reloads; browser document A is destroyed
T3 new browser document B loads at the exact same URL /article
T4 B asks for retry
T5 getValidCachedPdfForTab(7) compares URL B to cached sourceUrl A
T6 URLs are equal, so B receives PDF A
```

The page URL is equal, but the source document generation is not.

This is the exact canonical P0-023 root cause.

## 4. URL, tab and document are separate identities

Required invariants:

```text
same tabId != same document
same URL != same document
same browser documentId != necessarily same P0-080 SPA/application generation
```

The browser supplies `MessageSender.documentId` for extension messages, and Chrome APIs can target exact `documentId` values on the current minimum Chrome line.

P0-023 should consume trusted/upstream source authority rather than reconstruct identity from a URL.

Official API references:

- https://developer.chrome.com/docs/extensions/reference/api/runtime
- https://developer.chrome.com/docs/extensions/reference/api/tabs
- https://developer.chrome.com/docs/extensions/reference/api/scripting

## 5. Required cache provenance

After P0-070/P0-079 implementation, every sealed PDF generation should retain a bounded non-secret provenance reference to the exact source generation that produced it.

Conceptually:

```js
sealedPdf = {
  cacheGeneration: 'pdf:<worker-issued-generation>',
  sourceGenerationReceipt: {
    version: 1,
    browserDocumentId,
    applicationGeneration,
    selectionRevision,
    // other bounded P0-070 provenance
  },
  byteLength,
  integrityReceipt,
  sealed: true
};
```

P0-023 does not need to define the entire P0-070 receipt. It consumes that exact upstream receipt and prevents a different live source from discovering the PDF as its own retry material.

## 6. Live-page retry admission

A live content-page retry command should be admitted only when the cache generation's exact source receipt matches the trusted current source receipt for the requesting document/application.

Required flow:

```text
content B requests retry
-> worker stamps trusted sender.tab.id / sender.documentId / sender.frameId
-> P0-080/P0-070 current source receipt is validated
-> tab latest-index points to cache generation G
-> read exact sealed G
-> compare G.sourceGenerationReceipt with current source receipt
-> exact match: live-page retry may consume G
-> mismatch: reject live-page retry
```

The comparison cannot be replaced by:

- URL equality;
- hostname equality;
- filename equality;
- byte-length equality;
- tabId equality;
- caller textual operationId equality.

## 7. Important refinement: source mismatch is not sealed-byte deletion authority

Current code deletes the tab cache when URL validation fails.

That behavior becomes unsafe once P0-079 correctly introduces operation-owned immutable generations.

Example:

```text
operation A owns sealed generation G-A
live tab becomes document B
B cannot use G-A
```

The correct result is not:

```text
B mismatch -> delete G-A bytes
```

because operation A may still require those exact bytes for an already admitted Yandex/local recovery path.

Instead separate:

```text
mutable discovery index: tab 7 -> G-A
immutable owned object:    G-A -> PDF bytes + source provenance
```

On mismatch:

```text
reject B
compare-and-clear tab 7 -> G-A if it still points to G-A
retain sealed G-A under its operation/TTL/recovery owner
```

The live-page discovery pointer is not ownership of the byte object.

## 8. Operation-specific recovery is different from live-page retry

A restart/recovery checkpoint for operation A may legitimately say:

```text
continue exact sealed generation G-A
```

even after the visible tab navigated/reloaded to B or was closed.

That is not P0-023 violation, because recovery is not asking B to inherit A's cache.

Therefore two APIs/semantic paths should remain distinct:

```text
retryForCurrentLiveSource(tab, sourceReceipt)
recoverExactOwnedGeneration(generationReceipt)
```

The recovery path must prove exact operation/PDF generation ownership under P0-079/P1-198/destination checkpoint owners. It must not fall back to `tab -> latest`.

## 9. Same-document SPA/application changes

The canonical P0-023 wording names source-document generation, while P0-080 separately owns same-document SPA/application generation.

Implementation should compose rather than create a gap:

- cache stores/links the full upstream P0-070 source receipt;
- if browser documentId is unchanged but P0-080 applicationGeneration/selection authority changed, the current page should not automatically inherit a PDF generated from the older application generation;
- P0-023 consumes that upstream exact receipt rather than inventing another SPA counter.

Thus the narrow document-generation owner composes naturally with the broader exact source receipt.

## 10. Tab latest pointer semantics

A future `tab -> latest generation` index is useful for UI discovery but is explicitly non-authoritative.

Safe rules:

1. Publish/move the pointer only after a sealed generation exists.
2. A lookup must read exact pointed generation and validate its source receipt.
3. On mismatch, clear pointer by compare-and-remove only if it still points to that old generation.
4. Old generation cleanup must not clear a newer pointer.
5. Pointer absence does not prove the sealed generation is gone.
6. Pointer presence does not prove the current page owns the generation.

Schedule:

```text
G-A sealed, pointer -> G-A
G-B sealed later, pointer -> G-B
late cleanup A
```

must leave:

```text
pointer -> G-B
```

not delete/clear B.

## 11. Legacy cache rows

Legacy cache rows have only tab/url-style provenance.

They cannot be upgraded into trusted exact source-document receipts by reading the current tab and copying its current `documentId`.

That would transform:

```text
untrusted old source identity
```

into:

```text
apparently exact current authority
```

without evidence.

Safe choices are bounded fail-closed behavior for live-source reuse, expiry/cleanup according to existing cache lifetime rules, or an explicitly constrained compatibility policy that never claims exact-generation proof.

P0-023 closure must not silently synthesize exact provenance from current mutable state.

## 12. Interaction with P0-079 create-once sealed generations

P0-079 requires the underlying PDF generation itself to be immutable/create-once and exact-key transferable/deletable.

P0-023 adds the admission predicate:

```text
who may discover/retry that generation from a live page?
```

Both are needed:

- immutable bytes without source binding -> wrong page can safely but incorrectly upload the old immutable PDF;
- source binding with mutable bytes -> correct page can still race and upload replaced bytes.

The combined contract is:

```text
exact source receipt
+ exact sealed byte generation
```

## 13. Interaction with P0-070 provenance

P0-070 owns the trusted handoff from browser sender/source through native render and into the sealed-PDF generation.

P0-023 should consume P0-070 provenance rather than recomputing it from `cached.meta.url`.

This allows a mechanically auditable chain:

```text
current requester source receipt S
==
sealed PDF source receipt S
```

before current-page retry is offered/executed.

If P0-070 cannot prove source provenance for a generated PDF, P0-023 cannot later manufacture it.

## 14. Interaction with retry UI

User-facing retry availability should reflect exact source ownership truth.

After same-URL reload/replacement:

- old retry action must not appear as valid for the new document merely because URL matches;
- if old operation A still needs recovery, its state belongs to operation/recovery UI or checkpoint semantics, not current page B's generic retry button;
- rejecting B should be truthful and non-destructive toward A's sealed recovery bytes.

The exact wording/UX is separate from the authority rule.

## 15. Deterministic model

Added:

`project_tools/test_p0_023_exact_source_document_cache_model.js`

Model cases:

1. exact current source receipt -> live retry accepts its sealed generation;
2. same URL, new browser documentId -> reject;
3. same browser document, newer application generation -> reject under consumed upstream receipt;
4. matching URL/size is not identity;
5. live-source mismatch clears discovery pointer but retains old sealed generation for exact recovery;
6. operation-specific recovery can still consume exact old generation after tab replacement;
7. old cleanup cannot clear newer tab pointer;
8. selection/source revision is compared as upstream provenance rather than rebuilt from URL.

Local Node output on 2026-09-06:

```text
P0-023 exact source-document cache model: PASS
```

This is model/architecture evidence only, not production closure.

## 16. Future source-bound acceptance

A source-bound P0-023 gate should require mechanically visible evidence that:

1. the authoritative retry-cache object is not keyed solely as `tab:<id>`;
2. sealed PDF metadata/provenance contains or references a versioned exact source-generation receipt;
3. live retry handler consumes trusted `sender.documentId`/upstream P0-070 receipt;
4. live retry admission compares exact source receipt, not only current URL;
5. same-URL reload/new document cannot get the prior generation;
6. source mismatch does not delete another operation's sealed generation merely because the tab changed;
7. mutable tab latest pointer is compare-and-cleared without affecting a newer pointer;
8. exact operation recovery reads exact owned generation without consulting current tab/latest alias;
9. legacy URL-only rows are not upgraded from current tab identity;
10. P0-079 exact-key offscreen transfer remains the physical byte source.

The production gate is expected to be RED on current main.

## 17. Real Chrome closure evidence

P0-023 is observable at the extension/browser document boundary, so DONE should include current-Chrome evidence.

Minimum physical cases:

- create retry PDF under document A;
- same-tab same-URL reload creates browser document B;
- verify B does not receive/offer A as current-page retry;
- prove old operation A can still use exact sealed generation if a legitimate checkpoint owns it;
- create a new B generation and prove late A cleanup does not remove B pointer/bytes;
- verify same-URL new-document behavior using browser `documentId`, not inferred timestamps/URL alone.

## 18. Status

P0-023 remains **ACTIVE**.

Current state:

- same-URL reload root cause: confirmed in source;
- owner boundary with P0-070/P0-079: defined;
- deterministic model: PASS;
- runtime implementation: absent;
- source gate: expected RED until implementation;
- current-Chrome closure evidence: absent.

Runtime/manifest remain version `0.9.8`; this research creates no build, tag or GitHub Release. Release remains `NOT READY`.
