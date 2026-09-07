# P1-209 — Extension-page version refresh: durable pending/completed generation and current-document acknowledgement

Date: 2026-09-07

Status: research / architecture evidence only. Registry owner remains ACTIVE.

Canonical baseline inspected: `main@d4f5b268fa3f7ced5a7bc68da52784863d614138`.
Canonical `service-worker.js` blob inspected: `6d61ac81befdbf2804ae9dbec425aa08d1194eb1`.

This branch does **not** modify production runtime, `manifest.json`, Registry status, build/tag/release state or extension-page production scripts.

## 1. Registry owner

P1-209 is the single current owner for:

> Extension-page version refresh requires pending/completed durable generation and truthful per-page repair/ack; pre-repair version marker is not success.

Historical P1-181 is a permanently reserved duplicate merged into P1-209. It must not be reopened as a parallel implementation owner.

## 2. Scope

P1-209 owns the crash-safe convergence of already-open extension tab pages to the current extension page generation after an extension version/build change.

It answers four questions:

1. when may a new version-refresh attempt be durably admitted;
2. when may that attempt be considered completed;
3. what evidence proves that each currently relevant extension tab page is running the repaired page generation;
4. how a pending repair survives MV3 worker termination, partial Chrome API failure, page replacement and a later extension version change.

It does **not** own generic page RPC semantics, content-script authority, unrelated Chrome Action repair, optional permissions, Yandex auth or Journal mutation correctness.

## 3. Adjacent owners remain separate

P1-209 composes with, but does not replace:

- **P1-141** — page-local stale read/single-flight epoch behavior;
- **P1-192** — MV3 worker lifecycle and durable progress across wakes;
- **P1-198** — worker-issued physical operation identity where required;
- **P1-201** — browser capability/context lifecycle semantics;
- **P1-210** — lost outer response / durable reconciliation receipt;
- **P1-211** — bounded recovery/storage admission where applicable;
- sender ACL and message-schema owners already protecting extension-internal RPC.

P1-209 may consume exact browser document identity as acknowledgement evidence, but does not weaken those adjacent authority boundaries.

## 4. Historical evidence retained by the Chrome/MV3 family

The consolidated Chrome/MV3 evidence family preserves two directly relevant retired deltas:

- `RESEARCH_DELTA_EXTENSION_PAGE_VERSION_REFRESH_COMMIT_POINT_2026-08-28.md`;
- `RESEARCH_DELTA_EXTENSION_PAGE_REFRESH_ACK_2026-08-28.md`.

Their historical finding remains reproducible in current `main`:

```text
read manifest version B
read durable scalar marker A
if A != B:
    write scalar marker B
    enumerate extension tabs
    request reload for each extension tab
    suppress individual reload errors
```

Therefore the scalar marker is written at **admission**, while later worker generations interpret the same marker as **success**.

## 5. Fresh current-source proof

### 5.1 The durable version marker advances before repair starts

Current code defines:

```js
const WEBCLIP_RUNTIME_VERSION_KEY = 'webclipRuntimeBuildVersion';
```

`reloadOpenExtensionPagesAfterVersionChange()` then performs the equivalent of:

```js
const version = chrome.runtime.getManifest().version;
const stored = await chrome.storage.local.get(WEBCLIP_RUNTIME_VERSION_KEY);
if (stored?.[WEBCLIP_RUNTIME_VERSION_KEY] === version) return;

await chrome.storage.local.set({ [WEBCLIP_RUNTIME_VERSION_KEY]: version });
let tabs = [];
try { tabs = await chrome.tabs.query({}); } catch (_) { return; }
```

The new version has therefore been durably announced as completed before Chrome has even proven that the target set can be enumerated.

### 5.2 Enumeration failure becomes false success

If `chrome.tabs.query({})` rejects after the marker write, the function returns.

On a future service-worker startup, the stored marker now equals the manifest version, so the helper returns before making a new repair attempt.

The durable state contains no distinction between:

- “B was admitted but enumeration failed”, and
- “all relevant pages were repaired to B”.

### 5.3 Individual reload failures are deliberately swallowed

For each matching extension tab the current helper executes:

```js
try { await chrome.tabs.reload(tab.id); } catch (_) {}
```

Thus partial repair can also leave the same completed-looking scalar marker.

### 5.4 Worker startup is already a useful recovery trigger

The helper is called during service-worker startup, not only from an installation event.

That is a valuable positive control: future crash-safe implementation can use ordinary later worker wakes to resume a durable pending repair.

The current scalar marker defeats that potential because a crash after the pre-repair write makes later wakes believe there is nothing to resume.

### 5.5 Current extension-page IPC already exists

Options and Journal pages already communicate with the service worker using Chrome runtime messaging/ports. The worker already distinguishes extension-internal senders from content/external senders.

P1-209 therefore should extend the existing internal messaging boundary with a small page-refresh registration/ack protocol, not create an unrelated transport.

## 6. Chrome platform evidence

Current official Chrome documentation establishes three architecture-relevant facts.

### 6.1 `tabs.reload()` is a command receipt, not page-generation proof

The Tabs API signature is:

```text
chrome.tabs.reload(tabId?, reloadProperties?): Promise<void>
```

The promise carries no new document id, build/version identity or page-ready acknowledgement.

Therefore a resolved reload promise may be treated as `reload-issued/settled`, but not as proof that the target current page generation has initialized WebClip's current protocol.

### 6.2 Browser document identity is available at the project minimum Chrome version

`runtime.MessageSender.documentId` is documented since Chrome 106 as a UUID of the document that opened the connection/message.

The project minimum Chrome version is 118, so P1-209 can use `sender.documentId` as a strong current-document discriminator without adding a new browser-version floor.

`tabId` alone is weaker: a tab can navigate/reload while retaining the same tab id, and tab identity is not document identity.

### 6.3 MV3 worker termination is normal

Chrome documents normal service-worker termination after idle periods and explicitly recommends persisting state instead of relying on globals.

Therefore P1-209's repair generation, phase and bounded retry diagnostics must be durable. An in-memory “currently refreshing” flag is not sufficient.

## 7. Deterministic false-success schedules

### Schedule A — crash before enumeration

```text
completed=A
manifest=B
worker W1 starts
W1 writes scalar marker=B
W1 terminates before tabs.query settles
worker W2 starts
stored marker == B
W2 returns
old open page A remains indefinitely
```

### Schedule B — enumeration failure

```text
completed=A
manifest=B
marker=B
chrome.tabs.query rejects
helper returns
next wake sees B and skips
```

### Schedule C — partial reload

```text
pages X,Y are old
marker=B
reload(X) resolves
reload(Y) rejects
error for Y is swallowed
next wake skips because marker=B
Y remains unrepaired
```

### Schedule D — reload command settles but old document is not proven replaced

```text
reload(X) Promise<void> resolves
worker records global success
no page-side B acknowledgement exists
there is no exact evidence that current document X initialized current WebClip code/protocol
```

### Schedule E — stale acknowledgement after replacement

```text
old document D1 was targeted
reload creates D2 in the same tab
late D1 message arrives
if worker trusts tabId/URL only, D1 can falsely acknowledge D2's repair
```

### Schedule F — version advances B -> C before B completes

```text
pending generation G1 targets B
extension is updated again to C
new worker starts G2/C
late B acknowledgement for G1 arrives
without generation/version fencing it can falsely complete current C repair
```

## 8. Required durable state model

A scalar “last build version” is not enough.

A target implementation should expose state with semantics equivalent to:

```text
ExtensionPageRefreshState {
  schemaVersion,

  completedVersion,
  completedAt,

  pending: null | {
    generation,
    targetVersion,
    phase: pending | repairing | incomplete,
    createdAt,
    updatedAt,
    attemptCount,
    nextAttemptAt?,
    lastError?,
    targets: [...] // bounded current repair receipts
  }
}
```

Names may differ. The invariant must not.

### 8.1 `completedVersion`

Means only:

> the completion policy for this version was actually satisfied.

It must never be advanced merely because an attempt was started.

### 8.2 `pending.targetVersion`

Means:

> repair of this version is admitted and may need recovery on a later worker wake.

### 8.3 `pending.generation`

Separates distinct durable repair attempts and rejects stale acknowledgements from superseded versions/attempts.

The generation must be non-secret and durable.

### 8.4 Retry diagnostics

Attempt/error timestamps are operational evidence only. They must not be interpreted as success and must be bounded in size.

## 9. Version transition rules

### 9.1 A -> B with no existing pending repair

Atomically/durably create pending generation G/B before page repair.

Do **not** set `completedVersion=B` at this point.

### 9.2 Worker restart while G/B is pending

Reuse/resume G rather than minting an unrelated new generation on every wake.

Re-enumerate current extension pages because old tab/document snapshots are not durable current truth.

### 9.3 B pending, then extension becomes C

Create/supersede to a new current generation for C.

A late B/G acknowledgement must not mutate C's completion state.

Historical B diagnostics may be retained only within the bounded recovery/history policy; they are not current authority.

### 9.4 `completedVersion == currentVersion` and no pending repair

Startup may return idempotently.

## 10. Per-page target identity

A durable target must not be keyed only by URL or tab id.

For a current tab-hosted extension page, use an attempt-scoped receipt equivalent to:

```text
ExtensionPageRepairTarget {
  refreshGeneration,
  tabId,
  documentId,
  extensionUrl,
  pageKind,
  state: discovered | reload-issued | acked | gone | incomplete,
  challenge?,
  pageNonce?,
  lastAttemptAt?,
  lastError?
}
```

`documentId` is the browser-owned document discriminator. A page-generated nonce is useful as a second freshness/channel discriminator but must not replace `documentId` + refresh generation.

The target list must stay bounded. If many pages are open, process/reconcile in bounded batches and persist enough repair obligation to make progress across wakes.

## 11. Registration / acknowledgement protocol

### 11.1 Do not trust a reload promise as ack

After `tabs.reload()` resolves, target state may become `reload-issued`.

It must not directly become `acked` or make the global generation complete.

### 11.2 Current page code registers itself

A freshly initialized extension page should send an internal registration message containing at least:

- page/build or protocol identity produced by the page code;
- page kind (`options`, `journal`, `yandex-auth-help`, etc. as applicable);
- a fresh page/session nonce.

The service worker obtains browser-owned facts from `MessageSender`, especially:

- `sender.id`;
- `sender.url` / extension origin;
- `sender.tab.id` for a tab-hosted page;
- `sender.documentId`.

The sender must not be allowed to self-declare those browser-owned fields.

### 11.3 Challenge binding

A robust flow is:

```text
page D registers current protocol
worker validates exact internal extension sender D
worker fresh-reads pending G/B
worker associates D with current enumerated target
worker returns or derives an attempt-scoped challenge for G/D
page acknowledges G/D/challenge with current page nonce/protocol
worker fresh-validates G is still current and D is still the intended page
worker marks target acked
```

A one-round registration may be sufficient only if the worker can prove all equivalent bindings atomically from the current pending state and sender metadata. The architecture must reject stale old-document messages.

### 11.4 Build identity caveat

Do not rely solely on a service-worker-side manifest version being B.

The acknowledgement must prove that **current page code** is compatible with the B/current page protocol. A code-level page protocol/build identity is preferable if `chrome.runtime.getManifest().version` observed from an old still-running page cannot physically distinguish old JS from current extension metadata.

This specific browser behavior should be verified in physical Chrome E2E rather than assumed.

## 12. Fresh enumeration is part of completion

Old tab ids are not a durable target set.

Every repair/reconciliation attempt must perform a bounded fresh enumeration of extension-root tab pages.

### 12.1 New page opens during repair

A fresh current page should either:

- self-register/ack current code and become immediately satisfied, or
- be added to the current repair generation before completion.

The global generation must not complete while a currently enumerated relevant page lacks current-page proof.

### 12.2 Target page disappears

A previously discovered target may become `gone` only after fresh browser state proves that exact document is no longer current/present.

A stale local target snapshot is not enough to infer disappearance.

### 12.3 No extension tabs are open

If a successful fresh enumeration proves no relevant extension tab pages are open, the version refresh can complete without creating arbitrary pages merely to obtain acknowledgements.

## 13. Page-kind scope

Current helper reloads only objects returned by `chrome.tabs.query({})` whose URL starts with the extension root.

Therefore P1-209's existing concrete defect concerns **tab-hosted extension pages**.

Examples in this repository include Options and Journal pages and any internal help page opened as a tab.

Popup/offscreen/side-panel contexts have different lifecycles and should not silently be folded into the same completion set unless product requirements explicitly make them P1-209 targets. The refresh protocol may be reusable, but scope should remain evidence-driven.

## 14. Error semantics

### 14.1 Query failure

Keep G/B pending. Record bounded diagnostics. Retry on a safe future worker wake/backoff.

### 14.2 Reload failure

Keep only the affected target incomplete/pending; do not promote global completion.

### 14.3 No acknowledgement

Keep a bounded repair obligation. Do not hot-loop.

After policy exhaustion expose truthful `incomplete/degraded` rather than a false completed marker.

### 14.4 Stale acknowledgement

Ignore/no-op if any of these no longer match:

- current refresh generation;
- current target version/protocol;
- browser document id;
- tab/current target receipt;
- challenge/nonce contract where used.

A stale message may be logged at bounded diagnostic level but cannot mutate completion.

## 15. Sender / security boundary

P1-209 is defensive integrity work.

The new message must remain extension-internal:

- require `sender.id === chrome.runtime.id`;
- require expected extension origin/path/page kind;
- require top-level/tab-hosted document where that is the target class;
- use browser-owned `sender.documentId` rather than trusting message fields;
- do not loosen existing sender ACLs to keep stale pages working.

A web page/content script cannot self-declare extension refresh completion.

## 16. Interaction with stale page RPCs

An old Options/Journal page may continue to hold old in-memory state while repair is pending.

P1-209 must converge that page to current code; it must **not** solve the problem by accepting obsolete message schemas or broadening authority.

A stale page may fail cleanly during the repair window.

Only after the new current document is acknowledged may the system rely on the normal page-local generation/read invariants belonging to their existing owners.

## 17. Retry scheduling and MV3 lifecycle

Chrome service workers are expected to terminate and restart.

Therefore:

- pending repair state must be durable;
- retry/admission must be bounded;
- no `setInterval` or reconnect loop should keep the worker alive solely for P1-209;
- ordinary safe worker wakes and/or an existing bounded maintenance mechanism may resume repair;
- same G/B should be reused while it is the current pending generation;
- a backoff/`nextAttemptAt` may be used if repeated browser API failure otherwise causes churn.

## 18. Completion transaction / CAS invariant

Before promoting G/B to completed:

1. fresh-read durable refresh state;
2. prove G is still the current pending generation;
3. fresh-enumerate current relevant extension tab pages;
4. prove every current target is acked current B/protocol or is no longer present under exact reconciliation rules;
5. atomically/CAS-like publish `completedVersion=B` and clear/supersede pending G.

If C superseded B between any asynchronous steps, B completion must fail/no-op.

## 19. Do not overfit to `webclipRuntimeBuildVersion`

The legacy scalar may be retained temporarily for migration or diagnostics, but it cannot remain the sole authority.

Migration should interpret an existing scalar conservatively. In particular, the presence of `webclipRuntimeBuildVersion == manifestVersion` from an old build does not prove historical page acknowledgement because the old implementation never collected such evidence.

A runtime implementation should decide an explicit migration policy, e.g. initialize the new state and perform one bounded reconciliation after the feature is introduced.

## 20. Deterministic model created in this branch

`project_tools/test_p1_209_extension_page_version_refresh_model.js` models:

1. unsafe pre-repair success marker;
2. pending-before-enumeration;
3. same-generation restart recovery;
4. enumeration failure;
5. reload-issued vs acked distinction;
6. partial reload failure;
7. exact current page acknowledgement;
8. stale old-document acknowledgement;
9. tab-id reuse;
10. B -> C supersession;
11. page opening during repair;
12. disappeared target reconciliation;
13. successful empty enumeration;
14. wrong generation/version/protocol/challenge rejection;
15. one-page ack not covering another page;
16. completed-state idempotence;
17. bounded retry diagnostics semantics;
18. no completion from reload-issued alone;
19. nonce does not replace browser document identity;
20. pending and completed durable meanings remain distinct.

The model is architecture evidence, not production proof.

## 21. Source-bound RED gate contract

The companion source gate should preserve positive controls and require evidence equivalent to:

- current manifest version detection;
- startup reconciliation trigger;
- extension-root tab enumeration;
- bounded `tabs.reload()` repair request;
- a durable refresh state with distinct pending/completed semantics;
- a durable refresh generation;
- a page-side registration/ack message;
- worker validation of browser `sender.documentId` or an equally strong browser current-document identity;
- generation + version/protocol binding;
- reload settlement not directly marking global completion;
- query/reload failures retaining pending state;
- fresh enumeration before completion;
- stale generation ack rejection;
- bounded retry diagnostics/backoff;
- no sender-ACL relaxation;
- no sole pre-repair scalar success marker.

Current production source is expected to be RED against those target requirements.

## 22. Physical Chrome acceptance evidence required before closure

P1-209 must not be closed from documentation/model/source-gate only.

Use an unpacked test extension/profile and capture non-sensitive evidence for at least:

1. **Crash after pending B but before enumeration** — restart resumes B rather than skipping.
2. **Enumeration failure injection** — completed version stays A; B remains pending/incomplete.
3. **One reload rejection** — other pages may repair, failed page remains a repair obligation.
4. **Reload Promise resolves but no page ack** — global B is not completed.
5. **Current page B ack** — exact `sender.documentId`/generation/protocol target becomes acked.
6. **Old-document late ack** — rejected after reload/document replacement.
7. **Same tab id, new document id** — old document cannot satisfy new target.
8. **B -> C while B pending** — late G/B ack cannot complete C.
9. **Worker termination/restart** — durable G survives and retry remains bounded.
10. **New extension tab opens during pending repair** — completion waits for/reconciles its current page proof.
11. **Target closes during repair** — exact disappearance reconciliation allows progress without false ack.
12. **No extension tabs open** — successful enumeration can complete without synthetic page creation.
13. **Repeated API failure** — no hot wake loop; truthful incomplete/degraded diagnostics remain.
14. **Sender ACL** — ordinary web/content sender cannot acknowledge extension-page repair.
15. **Version/build identity experiment** — establish what an old still-running extension page reports from `chrome.runtime.getManifest()` after extension update; if it can report new manifest metadata while still executing old JS, use code/protocol identity as required by this document.

Physical test evidence should record version/generation/document ids only; no user content or credentials are needed.

## 23. Release interpretation

A deterministic model PASS means the proposed state machine is internally consistent for covered schedules.

A source gate PASS would mean a future source revision visibly implements the required structural controls.

Neither result is equivalent to:

- actual browser acknowledgement behavior;
- MV3 crash/restart E2E;
- product test suite PASS;
- release readiness.

No build, tag or GitHub Release is authorized by this research branch.

## 24. Implementation direction

A later runtime task should proceed in this order:

1. verify exact `main`/blob baseline locally;
2. introduce a versioned durable refresh-state schema/migration;
3. persist pending generation before repair;
4. add exact extension-page registration/ack protocol to relevant tab pages;
5. bind worker ack to sender/document/generation/version/protocol;
6. replace phase-blind scalar success with pending/completed state transition;
7. make each attempt fresh-enumerate current extension tabs;
8. keep retry bounded and restart-safe;
9. run syntax + deterministic model + source gate;
10. run physical Chrome scenarios above;
11. only then evaluate Registry status.

## 25. Research conclusion

P1-209 is confirmed on current `main`.

The root cause is stronger than “marker written slightly too early”. It is a missing two-phase repair contract:

```text
admission != reload request != current-page acknowledgement != completed generation
```

The correct durable truth is:

```text
pending G/B
    -> fresh current-page discovery
    -> reload/repair requested where needed
    -> current browser document acknowledges current WebClip page protocol
    -> fresh completion reconciliation
    -> completed B
```

Any earlier promotion of B is a false-success risk across normal MV3 worker termination and partial Chrome API settlement.
