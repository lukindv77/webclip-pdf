# Audit delta — extension-page refresh acknowledgement / stale-read epoch composition — 2026-08-28

Source-of-truth `main` immediately before this write: `67bca21a8c9ac5d002b36ec34dc79d7c8eae988b`.

Docs-only audit checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. No new P-number is assigned.

## Classification

Fresh audit refines existing **P1-209** and records its composition with **P1-141**. No independent P1-211 root cause is created.

- **P1-209** remains the primary owner: extension-page version refresh needs a crash-safe pending→completed generation rather than publishing success before repair.
- **P1-141** remains the page-local read single-flight freshness owner across mutation epochs.
- **P1-198** worker-issued operation identity is conceptually reusable for exact repair/session receipts but is not replaced by this page-version protocol.

## Current source still commits version success before any page repair

Current `reloadOpenExtensionPagesAfterVersionChange()` still performs:

1. read manifest version;
2. read `webclipRuntimeBuildVersion`;
3. if unequal, write current version into `chrome.storage.local`;
4. only then enumerate tabs;
5. issue `chrome.tabs.reload(tab.id)` for extension-root tabs;
6. suppress individual reload errors.

Therefore original P1-209 remains fully reproducible.

## New acceptance refinement — `tabs.reload()` settlement is not a current-page-generation acknowledgement

Moving the completed marker from before `tabs.reload()` to immediately after all reload calls settle would improve commit ordering, but it is still weaker than the product invariant.

The Chrome Tabs API exposes `tabs.reload()` as `Promise<void>` and documents it as an operation that reloads a tab. It does not return a new document id, extension build version, or page-ready receipt.

Current WebClip source has no explicit post-reload handshake in which the newly loaded `journal.html`, `options.html` or other extension page proves to the worker:

- its exact page/document generation;
- the running extension build/manifest version;
- that its startup code reached a usable protocol-ready point.

Therefore `reload()` command settlement alone should be treated as **reload requested/accepted**, not as an authoritative proof that the target now runs current page code.

## Failure schedule after the obvious P1-209 fix

Even if the worker is changed to write completed B only after `Promise.all(reloadCalls)`:

1. version transition A→B is detected;
2. worker persists pending B;
3. `tabs.reload(X)` returns/resolves for an open extension tab X;
4. worker immediately persists completed B;
5. target page load is interrupted, crashes, remains invalidated, or otherwise never reaches current WebClip page startup/protocol readiness;
6. next worker start sees completed B and has no durable repair obligation for X;
7. X remains stale/broken until an unrelated/manual reload.

The exact browser failure mechanics may differ by reload/update mode, but the repository currently has no page-side evidence capable of disproving this schedule once the reload command itself has settled.

P1-209 should therefore define completion in terms of the repaired page generation, not merely the control API call that requested repair.

## Required P1-209 acknowledgement contract

### Pending generation first

Persist a bounded repair record before page repair:

- `targetVersion`;
- random `refreshGenerationId`;
- `phase: pending | completed | incomplete`;
- bounded attempt/failure metadata.

### Enumerate current extension pages per attempt

Re-enumerate current tabs on each repair attempt and validate extension-root URLs. Do not treat old tab ids as durable page identity.

For each target, capture an attempt-scoped target receipt sufficient to reject a stale old-page acknowledgement.

### Reload is an intermediate state

A successful `tabs.reload()` settlement moves a target to something equivalent to `reload-issued`, not directly to generation-complete.

### Current page must acknowledge its generation/version

After load, the extension page should send or answer a bounded worker handshake carrying at least:

- current manifest/build version observed by that page;
- page kind (`journal`, `options`, etc.);
- a fresh page/session nonce created by the current page document;
- enough sender/document identity to reject an acknowledgement from a superseded document.

The worker should accept completion only for a page that still corresponds to a current enumerated extension tab and proves version B/current protocol readiness.

Implementation may use a worker challenge, page startup registration, or another exact current-document handshake. Do not rely only on URL/tabId.

### Bounded incomplete state

A page that never acknowledges must not keep a hot retry loop forever. Retain a bounded durable repair obligation and retry on safe future wake(s), then expose truthful `incomplete/degraded` state if policy limits are exhausted.

False completed state is not acceptable.

## P1-141 composition — page-local read epochs must not cross current-page repair generations

Options currently keeps unresolved read-only RPCs in `readOnlyRuntimeInFlight` and may reuse one old actual Promise for a newer logical refresh unless a mutation epoch invalidates reuse.

A successful page reload naturally creates a fresh JS context and therefore discards the old page's in-memory read map. That is a useful positive control **only after the new page generation is proven loaded**.

Before P1-209 repair is acknowledged, a surviving/invalidated old Options page can still hold:

- old logical UI generations;
- unresolved single-flight actuals;
- old mutation/read epoch assumptions;
- old message schemas/validation behavior.

Therefore the refresh protocol must not use "worker marker says version B" as proof that page-local P1-141 state was reset. Only the current-page ACK can establish that a new page context actually exists.

Conversely, P1-141's mutation-epoch fix must not attempt to make an invalidated old page compatible with a new worker. Page-version repair and read freshness are separate layers:

1. P1-209 replaces/reloads stale page code and establishes current page generation;
2. P1-141 prevents a current page from relabelling a pre-mutation read actual as post-mutation truth.

## Worker/page protocol safety

Do not relax worker sender ACL or message schema to make stale pages work during the repair window.

A stale page may fail privileged calls cleanly. Repair correctness is to converge it to current code, not to accept old authority.

Page acknowledgements themselves must be treated as extension-internal protocol messages with exact sender/page-kind checks; a host/content-script message cannot self-declare an extension-page refresh complete.

## Required regressions

1. Marker A → start B → persist pending B → worker dies before enumeration: next worker retries.
2. `tabs.reload(X)` rejects: B stays pending/incomplete; no completed marker.
3. `tabs.reload(X)` resolves but no current-page ACK arrives: B is not marked completed solely from reload settlement.
4. Reload resolves; old/superseded document sends late ACK: rejected by exact page/document refresh generation.
5. Current B page starts and ACKs with fresh page nonce/version B: target becomes reconciled.
6. Two extension tabs: one ACKs, one fails; global B remains pending/incomplete until policy reconciles/retire-disappears the second.
7. Target closes during repair: re-enumeration treats disappearance idempotently; no permanent pin.
8. Worker dies after page ACK but before completed marker: next attempt safely rechecks/reloads/ACKs; duplicate repair is bounded and preferable to false success.
9. Worker dies after completed B: no unnecessary B repair on later start.
10. Version C starts while B pending: C supersedes B; late B page ACK cannot mark C complete.
11. Old Options page contains unresolved P1-141 read actual during forced reload: completed B is not published until a new page context proves current version; old read map is never treated as current B state.
12. Within the new B Options page, a read A overlapping a mutation B still obeys P1-141 mutation-epoch freshness; page-version ACK does not substitute for state-revision provenance.
13. Large number of extension pages uses bounded reload/ACK concurrency and does not create an unbounded registry of dead tab ids.
14. Normal non-extension tabs are never reloaded or admitted as ACK participants.
15. Protocol rejection from stale page remains fail-closed; repair does not weaken privileged message validation.

## Duplicate check / numbering

No new P0/P1/P2 number is created.

Primary owner: **P1-209**.

Composed read freshness: **P1-141**.

P1-201…P1-210 remain occupied and **P1-211 remains unassigned by this block**.

## Test / release state

Audit documentation only. Product runtime/configuration and `manifest.json` are unchanged. Product tests were **not** rerun. The last proven product gate remains historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Version remains `0.9.8`; no build, tag or GitHub Release was created.
