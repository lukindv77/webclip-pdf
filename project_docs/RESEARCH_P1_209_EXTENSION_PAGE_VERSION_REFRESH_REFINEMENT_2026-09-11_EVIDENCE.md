# P1-209 — Extension-page version refresh truth refinement

Date: 2026-09-11

Status: research / architecture evidence only. Registry owner remains **ACTIVE**.

Canonical baseline: `main = ba0ab1d66a68be00ffb99676633363a5b344fe0d`.

Canonical `service-worker.js` blob inspected: `6d61ac81befdbf2804ae9dbec425aa08d1194eb1`.

Current manifest controls inspected:

- `version = 0.9.8`;
- `minimum_chrome_version = 118`;
- Manifest V3 service worker;
- `tabs` and `storage` permissions already present.

Production/runtime modification: **NONE**.

No historical branch is imported wholesale.

This research does not change `manifest.json`, runtime source, release policy, release readiness, release receipts, product packaging, tags, GitHub Releases, deployment or publishing.

The release hard fence remains:

`EXPLICIT_USER_APPROVAL_FOR_RELEASE_POLICY_ACTIVATION`

## 1. Current owner and duplicate history

Current Registry authority is exact:

> P1-209 ACTIVE — Extension-page version refresh requires pending/completed durable generation and truthful per-page repair/ack; pre-repair version marker is not success.

P1-181 is permanently reserved as `MERGED → P1-209`. It describes the same root cause and must not be reopened as a parallel owner.

P1-209 remains ACTIVE after this research tranche because no runtime implementation or physical Chrome closure evidence is introduced here.

## 2. Current-baseline source proof

The current runtime still contains:

```js
const WEBCLIP_RUNTIME_VERSION_KEY = 'webclipRuntimeBuildVersion';

async function reloadOpenExtensionPagesAfterVersionChange() {
  const version = chrome.runtime.getManifest().version;
  const stored = await chrome.storage.local.get(WEBCLIP_RUNTIME_VERSION_KEY);
  if (stored?.[WEBCLIP_RUNTIME_VERSION_KEY] === version) return;

  await chrome.storage.local.set({ [WEBCLIP_RUNTIME_VERSION_KEY]: version });
  let tabs = [];
  try { tabs = await chrome.tabs.query({}); } catch (_) { return; }
  const extensionRoot = chrome.runtime.getURL('');
  await Promise.all(tabs.map(async (tab) => {
    if (!tab?.id || !String(tab.url || '').startsWith(extensionRoot)) return;
    try { await chrome.tabs.reload(tab.id); } catch (_) {}
  }));
}
```

The helper is invoked at ordinary service-worker startup:

```js
reloadOpenExtensionPagesAfterVersionChange()
  .catch((error) => console.warn('WebClip extension-page refresh:', error));
```

The `service-worker.js` blob is still byte-identical to the blob inspected by the historical 2026-09-07 P1-209 branch. Therefore the root runtime schedule has not been repaired by intervening work.

## 3. Root cause: admission is persisted as completion

The current scalar has only one durable meaning in storage, but the algorithm uses it for two different states:

1. refresh of version B was admitted; and
2. all relevant open extension pages are proven repaired to B.

The write occurs before target enumeration and before any reload settlement:

```text
completed-looking scalar = B
then tabs.query
then per-tab reload
```

A later worker sees the scalar equal to the manifest version and returns before retrying any repair.

This violates the Registry contract even if every Chrome call normally succeeds.

## 4. Deterministic current failure schedules

### 4.1 Worker termination after marker publication

```text
stored completed marker = A
manifest = B
worker W1 writes marker B
W1 terminates before target census settles
worker W2 starts
marker == manifest B
W2 returns
old page remains unproven / unrepaired
```

### 4.2 Census failure

```text
marker B is already durable
chrome.tabs.query({}) rejects
current code catches and returns
future worker sees marker B and skips repair
```

### 4.3 Partial reload failure

```text
old extension tabs X and Y exist
marker B is already durable
reload(X) settles
reload(Y) rejects
Y rejection is swallowed
future worker sees marker B and skips repair
```

### 4.4 Reload settlement without page-generation proof

`chrome.tabs.reload()` resolves `Promise<void>`. The result does not carry the replacement document identity and does not prove that current WebClip page code initialized.

A resolved reload command can mean only `reload-issued/settled`, not `page-current-acked`.

### 4.5 Tab identity is not document identity

A tab may retain the same `tabId` across reload/navigation while the browser document changes. A late message from an older document must not acknowledge a replacement document merely because its tab id and path match.

### 4.6 Version supersession

```text
G1 targets version B
B repair is incomplete
extension becomes C
G2 targets C
late B/G1 settlement arrives
```

Without exact refresh-generation fencing, late G1 settlement can regress or falsely complete G2/C.

## 5. Positive controls in current main

The target implementation should reuse existing good mechanisms rather than create another independent subsystem.

### 5.1 Worker startup already provides a recovery opportunity

The refresh helper runs on worker startup. This is useful because MV3 worker restarts can naturally resume a durable pending repair.

The defect is not the existence of the wake trigger. The defect is that current durable state falsely says the repair already completed.

### 5.2 Serialized late-settlement Chrome Storage mutation infrastructure already exists

Current `service-worker.js` contains:

- `runSerializedLateSettlementOperation(...)`;
- `readChromeStorageBounded(...)`;
- `mutateChromeStorageSerialized(...)`.

The implementation comments already recognize that Chrome Storage mutations are not cancellable and that a timed-out earlier mutation must remain an ordering barrier until its actual promise settles.

P1-209 should reuse this mechanism with a dedicated refresh-state queue key plus a domain generation/CAS invariant. It should not invent an unrelated global lock.

### 5.3 `runtime.getContexts()` is already used in production source

Current source uses `chrome.runtime.getContexts()` for offscreen-document lifecycle reconciliation. The API is therefore already part of the project's platform vocabulary.

### 5.4 Page code already recognizes invalidated extension contexts

Current Options page reconnect logic treats `Extension context invalidated` as a terminal page-context condition and stops reconnecting rather than hot-looping.

This is a useful positive control: stale page contexts are already treated as a real lifecycle state, not as a generic transient network failure.

## 6. Fresh Chrome platform research

### 6.1 `runtime.getContexts()` is available at the project floor

Chrome Runtime API documents `chrome.runtime.getContexts()` as Chrome 116+ / MV3+.

Current WebClip minimum Chrome version is 118, so adopting the API does not require raising the browser floor.

Official source:

- https://developer.chrome.com/docs/extensions/reference/api/runtime

### 6.2 `TAB` contexts expose browser-owned document identity

Chrome Runtime API documents `ExtensionContext` fields including:

- `contextType`;
- `contextId`;
- `documentId`;
- `documentUrl`;
- `documentOrigin`;
- `frameId`;
- `tabId`;
- `windowId`.

`documentId` is a UUID for the associated document.

The same API documents `MessageSender.documentId` since Chrome 106 as the UUID of the document that opened the connection/message.

This provides a browser-owned discriminator stronger than `tabId` or a message-supplied identifier.

Official source:

- https://developer.chrome.com/docs/extensions/reference/api/runtime

### 6.3 Chromium browser tests corroborate TAB-context identity

Chromium's `RuntimeGetContextsApiTest.GetTabContext` opens an extension page in a tab, calls:

```js
chrome.runtime.getContexts({ contextTypes: ['TAB'] })
```

and checks returned `tabId`, `windowId`, `frameId`, `contextId`, `documentId`, `documentUrl` and `documentOrigin` against browser-side values.

Implementation/test source:

- https://chromium.googlesource.com/chromium/src/+/cc748d4034cf809a90bead06f9f9dcabd0dbbaf5/chrome/browser/extensions/api/runtime/runtime_apitest.cc

Current Chromium implementation also derives `document_id` from `ExtensionApiFrameIdMap::GetDocumentId(host)` and `document_url` from the committed frame URL:

- https://chromium.googlesource.com/chromium/src/+/refs/heads/main/extensions/browser/api/runtime/runtime_api.cc

These sources support using `getContexts()` as an exact identity input. They do not prove WebClip-specific post-update behavior without physical validation.

### 6.4 `tabs.reload()` is only a command settlement

Chrome Tabs API documents:

```text
chrome.tabs.reload(tabId?, reloadProperties?): Promise<void>
```

It returns no replacement `documentId`, page-ready receipt or WebClip protocol acknowledgement.

Official source:

- https://developer.chrome.com/docs/extensions/reference/api/tabs

### 6.5 MV3 worker termination is normal

Chrome documents normal service-worker termination after inactivity and instructs extensions to persist important state because globals disappear on shutdown.

Official source:

- https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle

This supports durable pending/completed repair state. It does not mean every `chrome.storage.local` value is eviction-proof; stronger durability classification remains owned elsewhere.

## 7. Community failure-mode comparison

Community reports repeatedly describe extension update/reload leaving an older context unable to use extension APIs until the relevant tab/page is refreshed. The exact examples often concern content scripts rather than extension-owned pages, so they are comparison evidence only.

Representative sources:

- https://stackoverflow.com/questions/53939205/how-to-avoid-extension-context-invalidated-errors-when-messaging-after-an-exte
- https://stackoverflow.com/questions/78267356/extension-context-invalidated-issue-requires-reload-of-current-chrome-tab-for-co

The useful lesson is not to import those projects' remediation. It is that “old document still present after extension generation changed” is a practical lifecycle mode and should be represented explicitly.

## 8. Important refinement: do not make `getContexts()` the sole census authority

The historical P1-209 branch used `tabs.query()` as the current target census and proposed `sender.documentId` for acknowledgement.

Fresh 2026-09-11 platform research reveals a stronger available primitive: `runtime.getContexts({contextTypes:['TAB']})` supplies browser-owned document identity.

However, the official API contract does not by itself prove how a pre-update, invalidated extension page will appear in `getContexts()` immediately after a Web Store/development update in every relevant Chrome lifecycle schedule.

Therefore P1-209 must not replace today's false success with a new false absence rule.

Recommended census is bounded and two-source:

```text
TAB_EXISTENCE_CONTROL = fresh chrome.tabs.query({})
EXACT_CONTEXT_IDENTITY = fresh chrome.runtime.getContexts({ contextTypes: ['TAB'] })
```

For each current tab whose URL is a relevant WebClip extension page:

- if an exact TAB context is visible, consume its browser-owned `documentId`;
- if the tab exists but no exact context/ack can be proven, classify it as `unproven/incomplete`, not `gone`;
- only fresh browser evidence may classify a previously targeted tab/document as no longer present.

Physical Chrome implementation evidence must validate whether stale pre-update extension pages are visible through `getContexts()` and the exact ordering around `tabs.reload()`.

Research-model PASS is not that physical proof.

## 9. Scope of relevant page contexts

The current helper repairs only **tab-hosted** URLs under the extension root returned by `tabs.query()`.

P1-209 therefore owns that concrete target class unless current product requirements expand it.

At minimum the runtime implementation should define an allowlisted set of tab-hosted WebClip page paths actually requiring repair, rather than accepting arbitrary extension-origin documents as equivalent.

Popup/offscreen/side-panel/devtools contexts have distinct lifecycles and should not silently become completion obligations merely because `getContexts()` can enumerate them.

Top-level target identity should normally require:

```text
contextType == TAB
frameId == 0
tabId >= 0
documentUrl is an allowlisted chrome-extension://<self>/... page
```

The exact allowlist is an implementation detail that must follow current page topology.

## 10. Target durable state semantics

A scalar last-version key is insufficient.

A target state may be shaped as:

```text
ExtensionPageRefreshState {
  schemaVersion,
  completedVersion,
  completedAt,
  nextGeneration,
  pending: null | {
    generation,
    targetVersion,
    phase,
    createdAt,
    updatedAt,
    attemptCount,
    nextAttemptAt?,
    lastError?,
    targets: [...]
  }
}
```

Names may differ; meanings may not.

### 10.1 `completedVersion`

Means only that the completion policy for that version has been satisfied.

It is never advanced merely because version repair started.

### 10.2 `pending.targetVersion`

Means the version repair was durably admitted and remains resumable.

### 10.3 `pending.generation`

Is a domain-local, non-secret generation for refresh settlement authority.

It is not a global capability and must not be conflated with P1-198 physical operation identity.

### 10.4 Diagnostics

Attempts, timestamps and errors are bounded operational evidence, never success authority.

## 11. Target per-page receipt

A target receipt should represent both browser tab existence and exact document proof.

Conceptually:

```text
ExtensionPageRepairTarget {
  tabId,
  pageKind,
  extensionPath,
  observedDocumentId?,
  reloadFromDocumentId?,
  reloadIssuedAt?,
  ackedDocumentId?,
  ackProtocol?,
  challenge?,
  state: discovered | reload-issued | awaiting-ack | acked | gone | incomplete
}
```

A target is scoped by the enclosing refresh generation.

`tabId` is not enough. A page nonce/challenge is not enough. A message-supplied `documentId` is not browser authority.

## 12. Page registration / acknowledgement protocol

Current page code should participate in proving its own current protocol initialization.

A safe flow is equivalent to:

```text
page initializes current WebClip page protocol
page sends refresh registration
worker validates extension-internal sender ACL
worker consumes sender.documentId / sender.tab.id / sender.frameId / sender.url
worker fresh-reads pending generation G/version B
worker associates sender with current target
worker returns or derives G/target-scoped challenge
page acknowledges G/challenge/current page protocol
worker fresh-validates G and browser-owned sender identity
worker marks exact target acked
```

A one-message registration can be sufficient only if it proves equivalent freshness and generation binding without trusting caller-declared browser identity.

The message must remain extension-internal:

- `sender.id === chrome.runtime.id`;
- expected extension origin/path;
- top-level/tab-hosted target semantics;
- browser-owned `sender.documentId`;
- exact current pending generation.

A normal web page or content script cannot self-declare page-refresh completion.

## 13. What proves replacement after reload

For an unproven old target, a useful strong receipt is:

```text
G targets tab T / path P
old browser document D_old is observed where available
reload(T) is issued under G
current WebClip page registers from browser sender document D_new
D_new belongs to T/P and current G
if D_old was known, D_new != D_old
current page protocol acknowledgement succeeds
```

This separates:

- reload command settlement;
- browser document replacement;
- initialization of current WebClip page code.

If `D_old` cannot be observed because the stale context is not returned by `getContexts()`, the tab remains a repair obligation; successful current page registration/ack after the admitted reload can establish the new exact current document without pretending the missing old context meant the tab was gone.

## 14. Do not make a new release/package identity owner

P1-209 should not invent a second release/package generation chain.

The page acknowledgement needs a current **page protocol identity** strong enough to distinguish code participating in the new acknowledgement contract from an obsolete page.

A simple `chrome.runtime.getManifest().version` read from page JS is not sufficient evidence by itself unless physical Chrome behavior proves that an old surviving JS context cannot observe current manifest metadata after an extension update.

Safer implementation choices include:

- a compile-time/page-script protocol constant changed when the handshake contract changes; and/or
- exact post-reload document replacement plus successful execution of the current acknowledgement protocol.

If future implementation binds page code to a package/release identity, that must compose with P1-231 rather than create a parallel release authority.

## 15. Fresh-census completion rule

Before G/B can publish `completedVersion=B`:

1. fresh-read durable refresh state;
2. prove G/B is still current;
3. perform fresh bounded `tabs.query()` census of relevant tab-hosted WebClip URLs;
4. obtain/associate exact TAB context identities through `getContexts()` where visible;
5. require current page acknowledgement for every relevant current tab/document, or exact fresh proof that a previously targeted tab/document is gone;
6. if a relevant tab exists but exact context/ack is unknown, remain incomplete;
7. serialized/CAS-like commit `completedVersion=B` and clear pending G only if G/B is still current.

If version C supersedes B during any asynchronous step, late G/B completion is a no-op.

## 16. New page / disappearing page races

### 16.1 New relevant tab appears during repair

The final fresh census must include it. The repair cannot complete from an earlier frozen list that omitted it.

A newly opened page already executing current code may satisfy the generation by registering/acking rather than being forcibly reloaded.

### 16.2 Previously targeted tab disappears

It may be classified `gone` only after fresh browser census proves the target tab/page is no longer current.

Missing `getContexts()` identity alone is not enough when `tabs.query()` still shows the relevant extension tab.

### 16.3 No relevant extension tabs exist

If a successful fresh `tabs.query()` proves there are no relevant tab-hosted WebClip pages, the generation may complete without opening arbitrary pages.

## 17. Boundedness and lifecycle

P1-209 must remain bounded:

- bounded target count;
- bounded per-pass reload work;
- bounded diagnostics/error text;
- bounded API deadlines using current project primitives;
- bounded retry/backoff;
- no `setInterval` or reconnect loop whose purpose is keeping the MV3 worker alive;
- ordinary safe worker wakes resume the same current pending generation.

If the relevant page census exceeds the implementation's safe target capacity, the state must remain `incomplete/degraded` or progress in explicitly bounded batches. It must not silently mark the version complete by truncating the target set.

Broad fair-progress policy across maintenance phases remains P1-192.

## 18. Chrome Storage settlement and CAS

The refresh state belongs in durable storage, but the mutation path must account for late Chrome Storage settlement.

Target implementation should use current `mutateChromeStorageSerialized(...)` infrastructure with a dedicated queue key and generation checks around logical transitions.

Required invariant:

```text
late mutation from G1/B cannot overwrite or complete current G2/C
```

Serialization alone is not sufficient if stale logical data is written after a newer generation was admitted; each transition must fresh-read/compare current generation before publication.

P1-209 owns this refresh-domain state machine. It does not change the generic serialized-storage primitive unless a separate defect is discovered there.

## 19. Durability classification boundary

`chrome.storage.local` is appropriate for MV3 restart persistence, and Chrome explicitly recommends persistent storage instead of globals for service workers.

P1-209 may therefore claim:

> pending refresh survives ordinary worker shutdown/restart after confirmed storage settlement.

It must not automatically claim:

> refresh state is guaranteed against every browser/profile storage-loss mode.

That stronger durability classification remains owned by P1-194.

## 20. Interaction with current owners

P1-209 composes with, but does not duplicate:

- **P1-192** — broad MV3 long-operation lifecycle/fair progress across wakes;
- **P1-194** — truthful recovery durability class;
- **P1-198** — worker-issued physical operation identity where a physical operation owner needs it; P1-209 refresh generation is domain-local settlement identity, not a capability;
- **P1-210** — lost/rejected outer user-operation transport reconciliation;
- **P1-231** — release/package/QA generation authority, if future page protocol is bound to release identity.

Historical P1-209 text named P1-211 as a generic bounded recovery/storage neighbour. That mapping is stale in current Registry. Current P1-211 owns deleted-comment tombstone lifecycle and is not imported into this P1-209 owner map.

No new P-code is allocated.

## 21. Legacy scalar migration

Existing `webclipRuntimeBuildVersion == manifestVersion` cannot prove historical per-page acknowledgement because the legacy implementation never collected such receipts.

A safe migration should treat the scalar as at most historical/admission evidence and initialize the new state conservatively.

One bounded reconciliation under the new state machine may be required even when the scalar already equals the manifest version.

The migration must not force-open pages solely to manufacture acknowledgement.

## 22. Privacy and defensive integrity

Expected durable refresh state contains only extension-internal operational identity such as:

- extension page path/kind;
- tab id;
- opaque browser document id;
- refresh generation;
- bounded timestamps/status/errors.

It should not persist arbitrary visited web URLs, page content, credentials, OAuth material or user document data.

The acknowledgement protocol must keep existing extension sender boundaries narrow rather than weakening them to accommodate stale pages.

## 23. Rejected alternatives

### 23.1 Keep the scalar and move its write after `Promise.all`

Rejected. `tabs.reload()` success is not current-page acknowledgement, and partial/late document replacement still lacks exact proof.

### 23.2 Treat `tabs.reload()` resolution as page readiness

Rejected. The API returns `Promise<void>` only.

### 23.3 Use only `tabId`

Rejected. Tab identity can survive document replacement.

### 23.4 Use only `runtime.getContexts()` and infer missing context means gone

Rejected without physical evidence. A still-existing relevant tab whose old context is not returned would be falsely removed from the obligation set.

### 23.5 Trust `message.documentId`

Rejected. Browser-owned `sender.documentId` is the authority input.

### 23.6 Use only page `getManifest().version`

Rejected as standalone page-code proof until physical behavior establishes that old surviving page code cannot observe current extension metadata.

### 23.7 Hot-loop until every page acknowledges

Rejected. It conflicts with MV3 lifecycle design and can waste resources indefinitely.

### 23.8 Reopen P1-181 or allocate another owner

Rejected. Registry already canonicalizes the root cause as P1-209.

## 24. Deterministic research model in this tranche

`project_tools/test_p1_209_extension_page_version_refresh_refinement_model.js` binds this refinement to current source and models:

- current pre-census false success;
- crash/restart skip schedule;
- pending vs completed meanings;
- same-generation resume;
- census failure;
- reload-issued vs acked;
- dual-source tab/context census;
- missing-context fail-closed behavior;
- browser sender document authority;
- exact post-reload replacement acknowledgement;
- tab-id reuse;
- partial failure;
- B → C supersession;
- late storage settlement CAS;
- final fresh census newcomer race;
- exact gone reconciliation;
- empty target completion;
- bounded-capacity overflow;
- protocol/version evidence boundaries;
- bounded diagnostics;
- P1-192/P1-194/P1-198/P1-210/P1-231 ownership separation;
- unchanged release fence.

Model PASS is research evidence only. It is not current runtime implementation and not physical Chrome qualification.

## 25. Implementation handoff

A future runtime tranche for P1-209 should, in order:

1. add versioned durable refresh state separate from the legacy scalar;
2. reuse bounded/serialized Chrome Storage primitives;
3. admit G/currentVersion before any page repair;
4. perform bounded fresh tab census;
5. use `getContexts()` opportunistically for browser-owned exact document identity, without treating absent context as absent tab;
6. add narrow extension-page registration/ack protocol consuming `sender.documentId`;
7. distinguish `reload-issued` from `acked`;
8. fresh-reconcile current targets before completion;
9. CAS/fence all late settlement by current refresh generation/version;
10. add bounded restart/retry behavior without keeping the worker alive;
11. add physical Chrome evidence for update/reload schedules, stale-context visibility, exact document replacement and acknowledgement;
12. keep P1-209 ACTIVE until that implementation and evidence satisfy the Registry owner.

## 26. External-source boundary

Fresh external research was used to validate platform capabilities and known lifecycle failure modes. It does not create WebClip requirements by itself.

Primary platform sources:

- Chrome Runtime API: https://developer.chrome.com/docs/extensions/reference/api/runtime
- Chrome Tabs API: https://developer.chrome.com/docs/extensions/reference/api/tabs
- Chrome extension service-worker lifecycle: https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle
- Chromium runtime getContexts browser tests: https://chromium.googlesource.com/chromium/src/+/cc748d4034cf809a90bead06f9f9dcabd0dbbaf5/chrome/browser/extensions/api/runtime/runtime_apitest.cc
- Chromium runtime getContexts implementation: https://chromium.googlesource.com/chromium/src/+/refs/heads/main/extensions/browser/api/runtime/runtime_api.cc

Community comparison sources:

- https://stackoverflow.com/questions/53939205/how-to-avoid-extension-context-invalidated-errors-when-messaging-after-an-exte
- https://stackoverflow.com/questions/78267356/extension-context-invalidated-issue-requires-reload-of-current-chrome-tab-for-co

Applicability is bounded by current WebClip requirements, source, minimum Chrome version, defensive integrity, reliability, complexity and owner boundaries documented above.
