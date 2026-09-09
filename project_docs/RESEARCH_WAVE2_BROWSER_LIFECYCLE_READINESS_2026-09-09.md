# WebClip — Wave 2 browser / extension lifecycle implementation-readiness — 2026-09-09

Date: 2026-09-09  
Canonical production baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Canonical Registry: `project_docs/RESEARCH_REGISTRY.md`  
Research branch: `research/wave2-browser-lifecycle-readiness-2026-09-09`  
Mode: **RESEARCH-ONLY / IMPLEMENTATION-READINESS**  
Production implementation: **NOT STARTED**.

No production source, manifest, Registry status, version, build, tag, release or deployment is changed by this tranche. No new P-code is allocated.

---

## 1. Scope

Project-wide production-entry synthesis assigned 20 current ACTIVE owners to Wave 2:

```text
P1-004
P1-124
P1-130
P1-156
P1-157
P1-169
P1-171
P1-175
P1-193
P1-199
P1-200
P1-201
P1-203
P1-204
P1-209
P1-214
P1-217
P1-222
P1-223
P1-227
```

They are grouped into three implementation subprograms:

```text
W2-A native/browser actual settlement
W2-B frame lifecycle/session authority
W2-C extension-page/control-plane generations
```

The purpose of this research tranche is not to rediscover the root causes. Those are already canonical and coverage-complete. The purpose is to remove source-design ambiguity before implementation and prevent 20 separate fixes from inventing 20 incompatible operation/lifecycle models.

---

# Part I — current platform/source boundary

## 2. Current Chrome primitives available inside WebClip's Chrome floor

WebClip's declared minimum is already high enough for the exact-document primitives required by the target design.

Current Chrome API documentation confirms:

- `runtime.MessageSender.documentId` and `documentLifecycle` exist from Chrome 106;
- `scripting.InjectionResult.documentId` exists from Chrome 106;
- `scripting.InjectionTarget.documentIds` exists from Chrome 106;
- `tabs.connect(..., {documentId})` can open a port to one exact document from Chrome 106;
- `permissions.request()` must be initiated from a user gesture;
- `tabs.Tab.pendingUrl` exists and describes a navigation before commit where permission permits reading it;
- `tabs.onCreated` fires for created tabs but documentation explicitly warns that URL may not yet be set, requiring `onUpdated`/later reconciliation;
- extension service-worker module globals are lost on shutdown and Chrome explicitly recommends storage for state that must survive service-worker termination;
- since Chrome 114, sending messages across long-lived messaging resets the service-worker idle timer, while merely opening a port does not;
- Chrome 116 specifically permits `permissions.request()` to exceed the ordinary five-minute service-worker request limit because it is user-prompt-owned.

Therefore target design can use exact document identity, durable receipts and active-session ports without increasing the Chrome minimum.

---

## 3. Current source positive controls

### 3.1 Same-worker `tabs.create` actual settlement

Current worker has `tabCreateSettlements = new Map()` and `createChromeTabBounded()`.

It already understands one important fact correctly:

```text
caller timeout != cancellation of chrome.tabs.create()
```

After a local timeout, a late same-worker success is retained temporarily so an immediate identical retry can return the original Tab rather than create a duplicate.

This is a useful positive control, but it is module-memory only and therefore does not satisfy P1-124 across MV3 worker death.

### 3.2 `scripting.executeScript()` singleton/late receipt

Current worker similarly retains unresolved/late injection settlements in module memory and includes `documentIds` in the computed request key when the caller supplies them.

Again, the positive control is the actual-settlement semantics; the remaining problem is exact caller use + restart durability.

### 3.3 Save As PREPARED/STARTED/RELEASED

Current worker already has durable `chrome.storage.session` checkpoints keyed by `saveAsSessionId` for:

```text
PREPARED
STARTED
RELEASED
```

and deliberately serializes the actual storage mutations so a late PREPARED cannot overtake STARTED/RELEASED.

Current `prepared-save-as.js` deliberately does **not** impose a local timeout around `chrome.downloads.download({saveAs:true})`, which is correct for a user-owned native dialog.

The remaining gaps are exact `prompt-owned` admission, restart/page-loss reconciliation, and bounded RELEASED tombstone retention.

### 3.4 Action generations/late repair

Current worker already has per-tab Action generation and actual-settlement repair logic for timeouts/stale settlements.

The remaining P1-130/P1-217 defect is that ordinary deterministic mutation rejection can leave a mixed browser Action state without a repair obligation and failed reads can leave old URL-specific visual truth.

### 3.5 Context-menu crash-safe repair

Context-menu initialization already has a repair-alarm pattern and callback-based completion compatible with Chrome 118.

P1-204 remains about exact desired-generation truth across restart/supersession, not about inventing a completely different mechanism.

### 3.6 Options read generations

`options.js` already has useful read generations:

```text
yandexStatusGeneration
backupStatusGeneration
folderBrowseGeneration
OperationLog list/detail generations
```

`folderBrowseGeneration` is specifically a positive control preventing an old folder-list response from replacing a newer browse location.

P1-222/P1-223 remain because user edits and mutating completion need their own generations, not because every Options read is stale-unsafe.

---

## 4. Current source defects that W2 must actually remove

### 4.1 `tabs.create` exact recovery is same-worker only

Current `tabCreateSettlements` is module memory.

Worker death can erase:

```text
request key
started actual promise
late success Tab
```

while the new browser tab physically remains.

URL alone is not exact object identity and may match an existing unrelated user tab.

### 4.2 frame-agent registry is same-worker memory

Current worker stores frame authority in:

```text
frameAgentsByTab = new Map()
```

Current `frame-agent.js` has one global loaded sentinel and local state but no:

```text
frameSessionGeneration
workerEpoch
lifecycle Port
disconnect fail-safe cleanup
permissionGeneration
commandGeneration
```

An injected child agent can therefore outlive the worker registry and retain selection/printing mutations.

### 4.3 frame prepare/restore is not generation-owned

Current child `preparePrint()` stores mutable fields such as `printStyle` and `changedAttrs`; `restorePrint()` acts on whichever state is current.

There is no exact render/command generation proving that a late restore belongs to the preparation it is undoing.

### 4.4 extension-page refresh publishes success too early

Current `reloadOpenExtensionPagesAfterVersionChange()`:

1. reads current version;
2. writes `webclipRuntimeBuildVersion=currentVersion`;
3. only then enumerates/reloads extension pages;
4. suppresses enumeration/reload failures.

The durable marker is therefore written before the repair it claims to represent.

### 4.5 Options create-folder result uses current UI state after mutation

Current create-folder path captures `path` but after the remote mutation completes it does:

```text
newFolderName.value = ''
await loadFolders(currentBrowsePath)
```

where `currentBrowsePath` and the input may have changed while the request was in flight.

This can refresh another folder or erase a newer draft.

### 4.6 old caller operation IDs remain presentation + physical namespaces

Current Options/Journal/content surfaces still generate page-local `operationId` values and use them for progress/mutations.

W2 must consume W1 `clientRequestId + physicalOperationId P`, not create a second operation-identity architecture.

---

# Part II — common Chrome-operation taxonomy

## 5. Why one generic timeout wrapper is impossible

Chrome operations belong to materially different semantic classes.

Target taxonomy:

```text
READ
CONVERGENT_BROWSER_STATE
NON_CANCELLABLE_EFFECT
USER_OWNED_PROMPT
DOCUMENT_FRAME_COMMAND
PAGE_LOCAL_UI_GENERATION
```

Each class has a different deadline/recovery rule.

---

## 6. READ

Examples:

```text
tabs.get
tabs.query
permissions.contains
downloads.search
storage reads
```

Contract:

```text
bounded caller wait
late result discarded if caller generation expired
late read must never launch a later mutation after a terminal pre-admission timeout
```

No durable external-effect receipt is needed merely because a read is slow.

This composes with P1-158.

---

## 7. CONVERGENT_BROWSER_STATE

Examples:

```text
Chrome Action icon/badge/title
context-menu desired set
extension-page refresh/reload repair
```

Contract:

```text
generation-owned desired state
partial failure != product failure
failure/stale late settlement => repair obligation
repair recomputes current desired state
bounded/coalesced retry
```

The goal is convergence, not pretending multi-call Chrome UI mutation is atomic.

---

## 8. NON_CANCELLABLE_EFFECT

Examples:

```text
tabs.create
automatic downloads.download
started remote/browser mutations
```

Contract:

```text
durable exact effect receipt BEFORE call
receipt -> started-unknown BEFORE call
caller timeout / worker death does not cancel
no new effect until exact reconciliation
```

This consumes W1 OperationReceipt/Reconcile semantics.

---

## 9. USER_OWNED_PROMPT

Examples:

```text
native Save As dialog
permissions.request()
```

Contract:

```text
prepared exact intent before prompt
no arbitrary terminal timeout while user owns prompt
effect/prompt settlement survives page/worker response loss
post-prompt current-authority recheck
```

Permission prompts additionally must be entered directly from a user gesture.

---

## 10. DOCUMENT_FRAME_COMMAND

Examples:

```text
Start Selection
Read Later
Journal Apply to current page
frame-agent commands
frame prepare/restore
```

Contract:

```text
exact document/session target
command generation
no tabId-only retarget
late response from stale generation ignored
same-generation idempotent reconciliation where command settlement is unknown
```

---

## 11. PAGE_LOCAL_UI_GENERATION

Examples:

```text
Options editable fields
folder browser
folder-name draft
status/result presentation
```

Contract:

```text
capture edit/view generation at request admission
late result may update historical/log truth
late result may not overwrite newer page-local user intent
```

This state normally does not need durable storage because it loses authority when the page itself disappears.

---

# Part III — W2-A native/browser settlement

## 12. P1-124 crash-safe tab launch architecture

### 12.1 Why target URL cannot be the idempotency key

A tab created for:

```text
https://example.test/path
```

cannot later be distinguished exactly from another tab with the same URL merely by query/order/timestamp.

The current same-worker request key is useful only while the worker lives.

### 12.2 Target design: opaque extension-owned relay

Every crash-sensitive `tabs.create` user operation receives:

```text
physicalOperationId P
TabLaunchReceipt TL
launchId L
```

Before calling Chrome:

```text
TL.phase = prepared
TL.target = trusted bounded target URL / internal page
TL.relayUrl = chrome-extension://<id>/open-relay.html?launch=<L>
```

Important confidentiality rule:

```text
relay URL contains only opaque launchId
```

Do **not** put the real target URL into the relay query string.

The target remains in trusted worker receipt storage.

### 12.3 Effect-start boundary

Before `tabs.create()`:

```text
TL prepared
-> persist started-unknown
-> commit
-> chrome.tabs.create({url: relayUrl, ...})
```

After this boundary, caller timeout means reconcile-only.

### 12.4 Binding the actual Tab

Chrome's current API gives multiple positive signals:

```text
tabs.create() result
chrome.tabs.onCreated
tabs.onUpdated
Tab.pendingUrl / url
relay page startup ACK
```

`onCreated` is useful but not sufficient alone because Chrome explicitly documents that URL may not yet be set at that event.

Binding therefore accepts only exact relay identity through one of:

```text
create() resolved Tab whose url/pendingUrl == relayUrl
onCreated/onUpdated exact relay match
relay page ACK carrying launchId, with sender.tab.id
bounded recovery query finding exactly one unclaimed relay tab
```

Then:

```text
TL.phase = tab-bound
TL.tabId = exact tabId
```

### 12.5 Navigation becomes a second effect on a known Tab

After binding, worker retrieves the real target from TL and navigates the exact bound tab:

```text
TL.phase = navigate-prepared
-> navigate-started-unknown
-> tabs.update(TL.tabId, {url: TL.target})
```

If worker dies after this call, there is no duplicate-tab risk because tab identity is already known. Recovery uses `tabs.get(TL.tabId)` / updates rather than `tabs.create()`.

### 12.6 Ambiguity

If bounded recovery sees multiple tabs carrying the same relay launchId:

```text
ambiguous
manual/reconciliation state
```

Never pick first/newest.

### 12.7 Scope

This helper should replace direct new-tab creation for:

```text
WEBCLIP_OPEN_OPTIONS
WEBCLIP_OPEN_INTERNAL_PAGE
WEBCLIP_OPEN_URL
Journal-context create flows where P1-124 applies
```

where exact crash-safe launch is required.

---

## 13. P1-156/P1-169 Save As lifecycle

### 13.1 Preserve domain authority

`physicalOperationId P` is provenance.

The native continuation capability remains:

```text
saveAsSessionId SA
```

Do not replace SA with P.

### 13.2 Refined target phases

```text
PREPARED
PROMPT_OWNED
STARTED(downloadId)
TERMINAL_COMPLETE
TERMINAL_INTERRUPTED
RELEASED
EVIDENCE_LIMITED
```

### 13.3 `PROMPT_OWNED` before browser call

Before the extension page calls:

```text
chrome.downloads.download({saveAs:true})
```

worker/session storage must durably record:

```text
SA phase = prompt-owned
```

Then the page invokes the native call without an artificial short deadline.

### 13.4 Page loss during prompt

Page close/context invalidation after PROMPT_OWNED does not prove cancellation.

Recovery may bind a DownloadItem only using exact/unique evidence such as the session's pinned Blob URL + bounded temporal/session identity.

If exact DownloadItem cannot be proved:

```text
effect-unknown / evidence-limited
```

not:

```text
failed-before-effect
```

### 13.5 Blob pinning

The prepared Blob must remain pinned while PREPARED/PROMPT_OWNED/STARTED is unresolved.

Generic Blob TTL must not revoke the only exact payload while a native dialog is legitimately user-owned.

### 13.6 RELEASED tombstone

RELEASED remains a generation barrier and is retained under a dedicated bounded policy (P1-169).

Late STARTED from an older page/session cannot revive a RELEASED SA.

---

## 14. P1-130/P1-217 Chrome Action convergence

Action is not an irreversible effect and should not consume a durable user OperationReceipt for every badge refresh.

Target state per tab/document generation:

```text
actionTargetGeneration
publicationState = unknown | known-empty | known-history | degraded
repairDirty
```

### 14.1 Immediate authority revocation on target change

When tab URL/document generation changes:

```text
old URL-specific badge/title loses authority immediately
```

The new generation first owns a neutral/unknown desired state.

A failed new Journal/stat read must not leave the old URL's badge as if still current.

### 14.2 Full desired-state convergence

A generation is converged only when every required property mutation for that desired state succeeds:

```text
icon
badge text
badge background
title
```

Any deterministic rejection marks repair dirty.

Successful later properties do not erase the dirty obligation created by an earlier failed property.

### 14.3 Repair

Repair:

```text
recomputes current authoritative state
mints new/current generation
coalesces repeated triggers
uses bounded backoff
```

Same-worker dirty state may remain in memory because worker bootstrap performs a full Action refresh; P1-170 supplies global coalescing/fan-out bounds.

---

## 15. P1-204 context-menu generation

Context menu is convergent browser-owned global state but requires durable crash repair because remove/create state survives worker restart.

Target durable receipt:

```text
ContextMenuGenerationReceipt {
  targetGeneration,
  desiredConfigHash,
  phase: pending | completed | degraded,
  attempt,
  updatedAt
}
```

Correct commit order:

```text
persist pending G
arm/re-arm repair obligation
perform bounded remove/create
verify completion policy
persist completed G
clear only repair obligation belonging to G
```

A late old generation cannot clear a newer repair alarm/receipt.

No user `physicalOperationId` is required for ordinary background context-menu convergence.

---

# Part IV — W2-B frame lifecycle/session authority

## 16. Exact frame identity tuple

A remote-frame authority is at least:

```text
tabId
topDocumentId
frameId
childDocumentId
frameSessionGeneration FS
permissionGeneration PG
```

`frameId` alone is explicitly not identity because a navigation can reuse it.

---

## 17. `FrameSessionCheckpoint`

Frame agents live only inside a current browser/tab session. Therefore minimal cross-worker session authority belongs naturally in trusted `chrome.storage.session`, not long-term portable data.

Conceptual checkpoint:

```text
FrameSessionCheckpoint {
  frameSessionId,
  tabId,
  topDocumentId,
  selectionAuthorityId,
  applicationGeneration,
  permissionGeneration,
  phase,
  updatedAt
}
```

It contains no DOM text/secret URL payload merely to survive worker restart.

The exact selection snapshot remains under its existing owner.

### 17.1 Why storage.session

It survives service-worker recreation during the browser session.

It need not survive full browser restart because the renderer documents/agents it refers to do not survive that boundary as live agents.

---

## 18. Worker epoch and agent instance

Each service-worker instance mints ephemeral:

```text
workerEpochId WE
```

Each evaluated frame agent mints:

```text
agentInstanceId AI
```

REGISTER/port sender browser authority supplies:

```text
tabId
frameId
sender.documentId = childDocumentId
```

The worker never trusts a child-provided documentId string over `MessageSender.documentId`.

A registry entry becomes live only after:

```text
exact FS checkpoint
+ exact topDocumentId
+ exact childDocumentId from sender
+ current permissionGeneration
+ current workerEpoch handshake
```

---

## 19. Active session lifecycle port

### 19.1 Purpose

P1-203's strongest failure is an agent left in `printing` or `selecting` after the worker registry disappears.

During an actively user-owned cross-frame session, use an explicit runtime Port/session channel.

Target shape:

```text
top content <-> worker session lifecycle port
frame agent <-> worker per-agent lifecycle ports
```

Opening a port alone is not used as a hidden keepalive assumption.

While the user session is active, bounded heartbeat/session messages may intentionally keep the worker alive. Chrome documents that messages over long-lived messaging reset the worker idle timer.

When session becomes idle, heartbeat stops and ports may close.

### 19.2 Disconnect fail-safe

Every frame agent's `port.onDisconnect` invokes local fail-safe cleanup for WebClip-owned live mutations:

```text
remove click/keydown interceptors
remove print style owned by current generation
restore changed attrs/resources owned by current generation
leave phase idle/degraded
```

It may retain inert locators/snapshot data for later explicit re-admission, but must not retain active page interception.

Thus unexpected worker termination becomes a safe local rollback trigger rather than orphaning child DOM-control state.

### 19.3 Not a perpetual keepalive

No heartbeat when:

```text
agent idle
no active selection/review/print session
```

This avoids converting every injected frame agent into a permanent MV3 wake source.

---

## 20. Worker restart re-handshake

New worker must not treat old `frameAgentsByTab` memory as recoverable because it is gone.

On next relevant active-session reconciliation:

1. load/validate `FrameSessionCheckpoint`;
2. exact-probe top document/session;
3. reinject/challenge permitted child documents;
4. repeated `frame-agent.js` evaluation on an already-loaded child sends REGISTER;
5. worker validates current `sender.documentId` and permission generation;
6. agent reports bounded local phase/current owned generation;
7. worker either:
   - adopts exact same safe session under new WE;
   - requests same-generation cleanup/restore;
   - rejects stale child/session and requires user re-admission.

A stale agent cannot silently register into a different top-document generation merely because tabId/frameId are unchanged.

---

## 21. Permission generation P1-201

Optional host permission is browser-persistent capability state, so permission generation must be durable beyond one worker.

Target local trusted state:

```text
permissionGeneration PG
lastObservedGrantedOriginSetHash
updatedAt
```

On startup/before use:

```text
read actual permissions
compare exact normalized origin set
if changed -> mint new PG
```

Chrome UI revoke/regrant therefore invalidates old frame-session authority even if WebClip did not initiate the permission change.

Regrant never revives an old FS automatically.

---

## 22. P1-193 two-phase permission prompt

### Phase 1 — prepare intent

Before the actual user grant click:

```text
exact topDocumentId
exact current candidate set
bounded normalized origins
originsHash
permissionGeneration PG
PermissionGrantIntent PR
physical operation P where user-operation tracking applies
```

The UI shows the prepared scope to the user.

### Phase 2 — gesture-owned request

The subsequent explicit Grant button invokes:

```text
permissions.request(exact prepared origins)
```

**immediately from that user click path**, with no unrelated asynchronous discovery inserted before the call.

The prepared intent already exists, so the prompt path itself need not do pre-prompt discovery.

### After settlement

Worker/page reconciles:

```text
actual permissions.contains/getAll
PR exact origins hash
current topDocumentId
current PG
```

If permission was granted but the source document changed:

```text
grant may remain in browser
but stale PR does not inject/enable agents in replacement document
```

Page loss with unresolved prompt is not automatically denial.

---

## 23. P1-200 frame command generation

Every frame command carries:

```text
frameSessionId FS
childDocumentId
permissionGeneration PG
commandGeneration CG
```

Agent applies only the current expected generation/session.

Worker applies a response only if the returned CG still matches the caller's current generation.

Late old response:

```text
ignore stale
```

It cannot update current top selection state.

---

## 24. P1-199 print prepare/restore generation

Remote print mutation is owned by the exact parent render attempt:

```text
remotePrintGeneration = renderAttemptId R
```

or an explicit child generation uniquely derived from R.

Agent state must track WebClip mutations by generation rather than one anonymous global `changedAttrs`/`printStyle` bucket.

Target:

```text
prepare-print(R)
-> preparedReceipt(R)

restore-print(R)
-> restores only R-owned changes
```

A late `restore-print(R1)` cannot remove R2 state.

---

## 25. P1-214 partial multi-frame prepare

Fan-out preparation returns one bounded receipt per exact child:

```text
prepared
failed-before-effect
unknown
```

If the aggregate operation fails:

- exact `prepared` children receive same-generation restore;
- `unknown` children receive idempotent same-generation reconciliation/restore command;
- known `failed-before-effect` children have no rollback obligation.

Do not issue one unqualified global `restore` to every currently registered frame because registry membership may have changed.

---

## 26. P1-227 dynamic frame topology

While a manual selection session is active, top content needs a bounded/coalesced frame topology generation.

Target concepts:

```text
frameTopologyGeneration FT
known frame candidate identities
added/removed diff
```

Dynamic same-origin/cross-origin frame insertion can request agent enable only under the current exact FS/PG.

Removed/replaced child document invalidates its agent receipt immediately.

Topology discovery belongs to existing P1-160/P1-154 bounds; W2 must not create an unbounded MutationObserver -> injection storm.

---

# Part V — W2-C extension/control-plane generations

## 27. P1-175 exact privileged document commands

Popup/context-menu/Journal user action must bind the intended exact document **before** asynchronous injection/permission/frame work.

The final command must use exact document targeting:

```text
tabs.sendMessage(tabId, message, {documentId})
```

and injection may use:

```text
scripting.executeScript({target:{tabId, documentIds:[documentId]}})
```

where appropriate.

Same-URL reload A->B therefore fails stale rather than retargeting the original user gesture to B.

This consumes the W1 exact-document/selection authority rather than creating another source identity.

---

## 28. P1-209 extension-page refresh state machine

Replace the current precommitted single version marker with a durable generation receipt:

```text
ExtensionPageRefreshReceipt {
  targetBundleVersion,
  refreshGeneration RG,
  phase: pending | completed | incomplete,
  createdAt,
  updatedAt,
  boundedAttempt
}
```

### 28.1 Correct ordering

```text
persist pending RG
-> bounded enumerate current extension tabs
-> refresh/reload incompatible pages
-> receive current-page ACKs
-> re-enumerate/reconcile closures
-> persist completed RG
```

### 28.2 Page ACK

Current extension page bootstrap sends:

```text
bundleVersion
protocolVersion
pageInstanceNonce
refreshGeneration
```

Worker validates sender extension origin/page and, where available, exact `sender.documentId`.

Old B-page ACK cannot complete newer C generation.

### 28.3 Crash behavior

Worker death while pending leaves pending.

Next worker retries.

Worker death after all reloads but before completed marker may repeat bounded refresh; duplicate reload is preferable to false success.

---

## 29. P1-222 latest user edit wins

Page read generation and user edit generation are different.

For each editable settings group use a page-local epoch such as:

```text
fieldEditGeneration
```

A read/save response may assign an input only when:

```text
capturedEditGeneration == currentEditGeneration
```

Otherwise the response may update non-destructive status text but not replace the newer draft.

Representative targets:

```text
clientId/rootPath/public-link preference
backup settings
manual token/code input where result cleanup is conditional
newFolderName
```

No durable OperationReceipt is required merely to preserve an unsaved page-local draft.

---

## 30. P1-223 Create Folder mutation vs browse generation

Create Folder is a real remote mutation and should consume W1 common operation/reconciliation semantics when that foundation exists.

At admission capture:

```text
P
clientRequestId
parentPath
folderName
exact targetPath
browseGeneration BG
folderDraftGeneration DG
```

Remote mutation/retry uses the immutable `targetPath`, never whatever `currentBrowsePath` later becomes.

After success:

```text
if current browse path == captured parent
and current BG == captured BG
  -> refresh that parent view
else
  -> do not navigate/replace current browse view
```

Clear `newFolderName` only if:

```text
current DG == captured DG
```

Otherwise preserve the newer user draft.

If outer response is lost after remote mutation admission, use P/domain reconciliation rather than blindly attempting the same folder create again.

---

# Part VI — persistence map

## 31. What lives where

Recommended initial ownership:

| State | Persistence |
|---|---|
| common physical user operation P | `WebClipOperationReceipts` IndexedDB |
| tab launch TL | durable P/domain receipt; target in trusted storage |
| relay launch id | opaque URL + receipt |
| Save As SA | `chrome.storage.session` + P linkage |
| frame session FS | `chrome.storage.session` |
| live agent registry / worker epoch | worker memory, rebuilt by exact handshake |
| permission generation PG | `chrome.storage.local` trusted state |
| Action per-tab dirty/generation | worker memory + bootstrap full repair |
| context-menu desired generation | `chrome.storage.local` + repair alarm |
| extension-page refresh generation | `chrome.storage.local` |
| Options edit/browse generations | page memory |

This deliberately avoids a new generic `WebClipBrowserEffects` database unless implementation proves `WebClipOperationReceipts` cannot safely host the small browser-domain references/state needed by P1-124.

Do not create a database merely because there are multiple browser APIs.

---

# Part VII — proposed W2 implementation DAG

## 32. Entry prerequisite

W2 mutating flows should begin after W1 foundation supplies at least:

```text
A0 OperationReceipt DB
U0 protocol v2
A2 worker-issued physical P
```

Exact document flows also consume A1/P0-080 authority where relevant.

W2 does not need to wait for Yandex L5.

---

## 33. Tranche W2-0 — Chrome-operation semantic helpers

Research/source goal:

```text
operation class taxonomy
phase-aware timeout helper interfaces
common generation helper shapes
```

No behavior cutover yet.

Avoid one universal `Promise.race` for all classes.

---

## 34. Tranche W2-1 — exact document command/injection routing

Owners:

```text
P1-125 supporting
P1-157
P1-175
P1-193 preparation side
```

Likely files:

```text
service-worker.js
popup.js
content.js
```

Make worker exact-document injection/command path canonical.

---

## 35. Tranche W2-2 — crash-safe tab launch

Primary owner:

```text
P1-124
```

Likely files:

```text
service-worker.js
new open-relay.html/js (or equivalent minimal extension-owned relay)
```

Adds TL relay/bind/navigate state machine.

Same-worker `tabCreateSettlements` may remain only as an optimization beneath durable TL, not as sole authority.

---

## 36. Tranche W2-3 — Save As exact native lifecycle

Owners:

```text
P1-156
P1-169
P1-157 supporting
P1-210 supporting
```

Likely files:

```text
service-worker.js
prepared-save-as.js
journal.js
options.js
```

Adds PROMPT_OWNED, reconciliation and tombstone retention.

---

## 37. Tranche W2-4 — permission/frame session substrate

Owners:

```text
P1-004
P1-171
P1-193
P1-200
P1-201
P1-203
P1-227
```

Likely files:

```text
service-worker.js
popup.js
content.js
frame-agent.js
```

Adds:

```text
PG
FS
worker epoch
agent instance
active lifecycle ports/disconnect cleanup
exact document handshake
bounded topology generation
```

---

## 38. Tranche W2-5 — remote print generation / partial rollback

Owners:

```text
P1-199
P1-214
```

Consumes W2-4 FS and W1 B0 render attempt R.

Adds exact prepare/restore receipts per child.

---

## 39. Tranche W2-6 — convergent browser control plane

Owners:

```text
P1-130
P1-204
P1-217
```

Likely file:

```text
service-worker.js
```

Action gets unknown/degraded + dirty repair.

Context menu gets exact pending/completed desired-generation receipt.

---

## 40. Tranche W2-7 — extension pages and Options generations

Owners:

```text
P1-209
P1-222
P1-223
```

Likely files:

```text
service-worker.js
journal.js
options.js
other extension page bootstraps as needed
```

Adds durable page-refresh generation/ACK and page-local latest-edit/mutation-target generations.

---

## 41. W2-Z — Closure Sweep

Required cross-cutting checks:

```text
no tabId-only user command retarget
no same-worker-only tab-create authority
no native prompt timeout interpreted as cancellation
no RELEASED Save As resurrection
no orphan frame-agent selection/printing after worker disconnect
no frameId-only child authority
no stale permission generation reuse
no stale print restore removing newer state
no Action old-URL badge retained after new-target read failure
no deterministic Action property failure without repair obligation
no precommitted extension-page refresh success
no late Options result overwriting newer user edit
no create-folder completion navigating/clearing newer UI generation
```

---

# Part VIII — physical/browser closure matrix

## 42. P1-124 tabs.create

Required current-Chrome schedules:

1. create settles normally through relay -> exact TL/tab bind -> target navigation;
2. worker termination after TL started-unknown and before create result -> onCreated/onUpdated/relay reconciliation binds exact tab;
3. worker termination after tab-bound and during target `tabs.update` -> exact tab reconciles without second create;
4. unrelated existing target-URL tab is not adopted;
5. duplicate relay match fails ambiguous rather than picking first;
6. target sensitive URL never appears in relay query/history as receipt metadata.

---

## 43. Save As

1. user keeps native dialog open longer than ordinary operation deadline -> no false timeout/cancel;
2. PREPARED -> PROMPT_OWNED committed before native call;
3. page remains alive -> STARTED exact downloadId;
4. page invalidated/lost after prompt admission -> no blind second dialog; reconciliation only;
5. complete/interrupted exact DownloadItem -> terminal result;
6. late STARTED after RELEASED cannot resurrect session;
7. tombstone GC after barrier does not allow old page to reuse SA.

---

## 44. Frame worker restart

1. active selecting remote frame with lifecycle ports;
2. forcibly terminate/reload extension worker;
3. agent Port disconnect fires;
4. child removes WebClip click/key interception;
5. printing state removes print style and restores owned attrs;
6. new worker does not trust old registry memory;
7. exact re-handshake can only resume/adopt same current FS/document/PG;
8. stale child or regrant PG fails closed.

---

## 45. Frame prepare/restore

1. R1 prepare then stale R0 restore -> R1 remains;
2. R1 prepare -> worker lost -> disconnect cleanup restores child;
3. partial A prepared/B unknown/C pre-failed -> compensation only exact A/B generations;
4. child navigates same URL and reuses frameId -> old childDocumentId response rejected;
5. permission revoke/regrant -> old FS cannot revive;
6. dynamic frame insertion during selection enters current FT/FS or remains explicitly unavailable.

---

## 46. Action/context menu

Action:

- new target immediately becomes unknown/neutral authority;
- failed data read does not restore/retain old target-specific badge;
- each deterministic property rejection creates bounded repair;
- persistent failure does not create wake loop;
- worker restart recomputes current state.

Context menu:

- pending G survives worker death;
- old repair/alarm cannot complete/delete newer H;
- failed partial rebuild remains pending/degraded;
- completed marker only after chosen full-set completion policy.

---

## 47. Extension pages / Options

Extension page:

- pending version B + worker death before enumeration -> B retries;
- reload failure -> B remains pending;
- old page ACK rejected;
- new exact page ACK completes only current generation;
- version C supersedes B safely.

Options:

- refresh starts -> user edits field -> old refresh cannot overwrite draft;
- Save preferences result arrives after newer edit -> status may update, newer input remains;
- Create Folder under /A -> user browses /B before result -> result does not navigate back to /A;
- user types second folder name while first create pending -> first completion does not clear new draft.

---

# Part IX — source gate / evidence

## 48. Deterministic model

Research file:

```text
project_tools/test_wave2_browser_lifecycle_readiness_model.js
```

Actual local execution on 2026-09-09:

```text
Wave 2 browser lifecycle readiness model: PASS
cases=66
```

The model proves state-machine consistency only, not current production/browser closure.

---

## 49. Source gate

Research file:

```text
project_tools/test_wave2_browser_lifecycle_readiness_source.js
```

`node --check` passes.

The gate is intentionally RED against current `main` because current production still has, among other things:

```text
tabCreateSettlements in worker memory
unversioned frame-agent state
no agent lifecycle Port/disconnect cleanup
no exact permission generation
no durable extension-page refresh pending/completed generation
no latest-edit generation in Options
```

No GitHub Actions workflow is created merely to execute a deliberately RED gate.

---

# Part X — duplicate/root-cause reconciliation

## 50. No new P-code

No P1-231 or other new owner is justified.

Every architecture requirement above maps to existing ACTIVE owners.

The relay-tab implementation is an implementation architecture for P1-124, not a new root cause.

The active frame-session Port/disconnect cleanup is an implementation architecture for P1-203 plus P1-199/200/214 composition, not a new root cause.

The shared operation-class taxonomy refines P1-157 and existing domain owners; it is not a separate finding.

---

# Part XI — interaction with Wave 1 / other waves

## 51. W1 primitives are reused, not duplicated

W2 user mutations consume:

```text
clientRequestId
physicalOperationId P
protocol v2
UserOperationReconcileResult
```

when those foundations land.

Domain capabilities remain separate:

```text
TabLaunchId
SaveAsSessionId
PermissionIntentId
FrameSessionId
RefreshGeneration
```

This preserves the Wave 1 rule that one physical ID is not a universal capability.

---

## 52. W3 dependency

Cross-frame fidelity owners should consume W2-B exact frame/session/document/permission generations.

Do not implement a second frame identity stack inside PDF fidelity code.

---

## 53. W6 dependency

W2 must include minimum safe caps for any new lifecycle registry/receipt it creates.

Broader fairness/fan-out work remains under W6 owners such as P1-166/P1-170/P1-173.

Examples:

```text
bounded outstanding tab launches
bounded frame session/agent count
bounded extension-page reload concurrency
bounded Action repair queue
```

---

# Part XII — external validation policy

## 54. Yandex L5 remains deferred

Nothing in W2 requires real Yandex L5.

Create Folder uses remote mutation semantics, but its W2 research target is UI/admission generation and lost-response behavior; provider semantics remain under the already defined remote-effect architecture.

Per project rule, real Yandex L5 stays at the final external-validation stage and should not block W2 research/implementation.

---

# Part XIII — readiness decision

## 55. W2 status after this tranche

For canonical baseline `d4f5b268...`:

```text
W2 owner partition                         DEFINED
Chrome operation taxonomy                  DEFINED
crash-safe tab-launch architecture         DEFINED
Save As prompt-owned lifecycle             DEFINED
Action degraded/repair semantics           DEFINED
context-menu generation contract           DEFINED
frame session identity                     DEFINED
worker-restart frame fail-safe             DEFINED
permission generation/intent               DEFINED
frame command/print generations            DEFINED
partial rollback contract                  DEFINED
extension-page refresh generation          DEFINED
Options latest-edit/mutation generation    DEFINED
implementation DAG                         DEFINED
physical closure matrix                    DEFINED

W2 L2 model                                PASS 66/66
W2 production source gate                  CURRENT MAIN RED
production implementation                  NOT STARTED
```

### Implementation-readiness conclusion

W2 broad internal architecture is now sufficiently consolidated to enter source implementation planning without another root-cause discovery cycle.

The next useful research target is W3 implementation-readiness synthesis, with W3-B/C explicitly consuming W2 frame/session authority. Independent reversible print-rollback work can be consolidated immediately.
