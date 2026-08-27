# Audit delta — extension-page version refresh commit point — 2026-08-28

Source-of-truth `main` immediately before this write: `560b3b08b3e89acd159eb9941e7427bf07118947`.

Docs-only audit checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged by this commit.

## New confirmed item: P1-209 — extension-page refresh publishes the version-success marker before the best-effort page reloads have actually succeeded

**Classification:** P1 / evidence-reserved / update/recovery crash-consistency.

This finding is intentionally scoped. Standard Chrome Web Store update installation normally waits for the extension to become idle, and open extension pages participate in preventing that idle state. The concrete product risk here is forced/unpacked/runtime reload/update recovery and any startup state where a tab containing an older/invalidated extension page still exists and this worker-side repair is relied on to refresh it.

## Fresh source proof

Current worker-start code calls:

`reloadOpenExtensionPagesAfterVersionChange().catch(...)`.

The helper implements this order:

1. read current `chrome.runtime.getManifest().version`;
2. read `chrome.storage.local[webclipRuntimeBuildVersion]`;
3. if already equal, return;
4. **write `webclipRuntimeBuildVersion = currentVersion`;**
5. query all tabs;
6. reload tabs whose URL starts with the extension root;
7. suppress individual `tabs.reload()` errors.

The durable marker in step 4 is therefore a **pre-repair admission marker but is interpreted on future starts as a completed-success marker**.

## Failure windows

### 1. Worker termination after marker commit

A deterministic sequence is:

1. previous marker is version A;
2. worker for version B starts;
3. worker writes marker B;
4. worker is terminated before `tabs.query()` or before all `tabs.reload()` calls settle;
5. an old/invalidated extension page remains open;
6. later worker start reads marker B == current version B and returns immediately;
7. no durable obligation remains to retry that page refresh.

The operation is not crash-consistent because its commit point precedes the repair it claims.

### 2. `tabs.query()` error is silently terminal for the generation

Current code does:

`try { tabs = await chrome.tabs.query({}); } catch (_) { return; }`

Because marker B was already committed, a transient/bounded API failure leaves the generation permanently classified as refreshed.

There is no next-start retry unless the manifest version changes again.

### 3. Individual `tabs.reload()` errors are suppressed

Each matching tab is reloaded inside `try/catch (_) {}` and the aggregate `Promise.all()` therefore resolves even when one or more reloads failed.

Again, marker B is already durable and no per-tab or generation repair obligation survives.

### 4. This is distinct from ordinary stale-response generation fencing

There is no conflicting newer refresh required to reproduce the defect. One version transition B plus one failure after the marker write is sufficient.

The defect is therefore commit-point ordering / durable repair ownership rather than an out-of-order response race.

## Product effect

A surviving page from the previous/invalidated extension context can contain:

- older message shapes;
- older client-side validation/policy;
- older progress/session semantics;
- stale cached UI state;
- direct Chrome API paths from the old page implementation.

The new worker may reject those calls, which is preferable to accepting incompatible authority, but the user-visible page can remain broken until manual reload. If protocol compatibility is only partially changed, mixed-generation behavior can be subtler than a clean error.

This item therefore requires refresh **truthfulness and self-heal**, not relaxation of worker ACL/schema checks.

## Chrome lifecycle scope

Chrome's documented standard update lifecycle waits for an extension to become idle before installing an update; open extension pages can keep the extension non-idle. Therefore P1-209 should not be described as proof that normal Web Store updates always hot-swap underneath open options/journal pages.

However unpacked/developer reload and explicit runtime reload invalidate extension contexts, and the repository already contains this refresh helper precisely to repair surviving extension-page tabs after a version change. P1-209 audits the correctness of that repair once it is attempted.

## Why this is not P1-158 / P1-170

- **P1-158** owns direct/unbounded Chrome reads in service-worker critical paths.
- **P1-170** owns unbounded/coalescing behavior of large all-tab Chrome Action refresh waves.

Bounding `tabs.query()` or limiting reload concurrency is useful but does not fix the semantic defect: even a bounded query can fail after the success marker has already been published.

## Why this is not P1-192

**P1-192** owns lifetime of long alarm-started background operations under MV3 service-worker suspension.

P1-209 reproduces even if the worker stays alive: an ordinary `tabs.query()` or per-tab `tabs.reload()` failure is swallowed after the durable marker was committed. The missing element is a crash-safe one-shot repair state machine, not only a keepalive/lifecycle owner.

## Positive controls elsewhere in the same startup layer

### Context menu rebuild

The current context-menu path explicitly pre-arms a repair alarm before destructive/rebuild work (`P1-136`) and only clears its repair obligation after successful rebuild.

That is the safer shape: failure does not silently convert incomplete repair into success.

### Settings import reconciliation

Settings import uses a durable reconciliation marker (`P1-008`, albeit still needing generation ownership). The intended architecture again distinguishes "data write may have settled" from "derived repair definitely finished".

Extension-page refresh currently has no equivalent pending/completed distinction.

## Required P1-209 contract

### Separate pending from completed generation

Do not write `webclipRuntimeBuildVersion = B` as the sole success marker before reload work.

Use a versioned refresh state such as:

- `targetVersion`;
- random refresh generation/id;
- `phase: pending | completed`;
- created/attempt timestamps;
- bounded failure diagnostics.

A worker restart that sees `pending B` must retry/reconcile B rather than assuming success.

### Success commit after actual repair

Publish `completed B` only after the intended bounded tab enumeration/refresh pass has actually settled according to the chosen policy.

If a tab disappeared concurrently, that may be a successful no-longer-needs-repair outcome. A reload error for a still-existing extension tab is not equivalent.

### Per-tab failures must create repair obligation or explicit degradation

Do not silently swallow failed reloads and still declare the whole version repaired.

Acceptable designs include:

- bounded retry on a later worker wake;
- retaining failed tab ids only as short-lived hints while re-enumerating current extension tabs on retry;
- a one-shot repair alarm similar to context-menu repair;
- explicit maximum retry count followed by truthful `refresh-incomplete` diagnostics rather than false completed state.

Do not rely on tab ids as permanent identity across arbitrary browser lifetime; re-enumerate and validate current extension-root URL on each repair pass.

### Keep work bounded

A browser can contain many tabs. Do not replace `Promise.all` with an unbounded retry storm.

Use bounded concurrency/admission and preserve P1-158/P1-170 Chrome-call deadline/queue requirements.

### Do not weaken protocol checks

A stale page that failed to refresh must not be granted compatibility by accepting unsafe/obsolete privileged messages. Current sender ACL/schema checks remain authoritative; page refresh is UX/runtime convergence, not a trust bypass.

## Required deterministic regressions

1. Marker A -> start B -> persist pending B -> terminate worker before tab enumeration: next worker retries B.
2. `tabs.query()` fails once: B is not marked completed; later wake repairs successfully.
3. Two extension tabs exist; reload of one succeeds and one fails: generation remains pending/incomplete until the surviving failed tab is reconciled or explicitly retired by bounded policy.
4. A target tab closes during repair: disappearance is handled idempotently and does not pin repair forever.
5. Worker terminates after all reloads succeed but before completed marker write: next pass may safely re-enumerate/reload again; duplicate page reload is preferable to false success and remains bounded.
6. Worker terminates after completed marker write: later wake performs no unnecessary repeat for the same version.
7. Newer version C arrives while B repair metadata exists: C supersedes B with an explicit generation rule; old B task cannot mark C completed.
8. Large number of open extension tabs is handled with bounded concurrency/API calls.
9. Non-extension tabs are never reloaded by this repair.
10. Standard page reload error does not cause the worker to relax runtime message validation for the stale page.
11. Unpacked/forced extension reload with an invalidated `journal.html` or `options.html` tab converges to the current page code or a truthful bounded incomplete state.
12. Fresh install with no extension pages reaches completed current-version state without unnecessary retries.

## Number allocation

- New evidence-reserved **P1-209** assigned.
- P1-208 remains remote-save recovery phase fairness.
- No P0/P2 number is assigned.

## Test / release state

Audit documentation only. Product runtime/configuration and `manifest.json` are unchanged. Product tests were not rerun; historical gate remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Runtime version remains `0.9.8`. No build, tag or GitHub Release was created.
