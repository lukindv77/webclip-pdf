# WebClip — A1/A2 exact content authority and physical operation admission delta — 2026-09-09

Date: 2026-09-09  
Canonical production baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Canonical Registry blob: `81e5867c0e0936b9524ece8949c53ad4ed83523c`  
Research branch: `research/a1-a2-authority-admission-delta-2026-09-09`  
Mode: **RESEARCH-ONLY / PRE-IMPLEMENTATION CHANGE-IMPACT DELTA**  
Production implementation: **NOT STARTED**.  
Release readiness: **NOT READY**.  
Yandex L5: **DEFERRED**.  
New P-code: **NO**. `P1-231` remains unallocated.

Primary composed owners:

```text
P0-070  exact full-document save generation
P0-080  same-document SPA/application generation vs live selection
P1-125  exact-document injection / late-success authority
P1-198  worker-issued physical operation identity
```

Important supporting boundaries:

```text
P1-086  IndexedDB results publish after transaction completion
P1-154  aggregate selection/snapshot admission bounds
P1-157  class-correct Chrome/content call lifetimes
P1-171  exact cross-origin frame/session generation
P1-209  extension/content update protocol fencing
P1-210  exact operation reconciliation / not-admitted semantics
P0-079  later immutable PDF generation owner
P0-076  later Journal CAS owner
```

This tranche follows the already defined and reconciled production-entry sequence:

```text
A0  passive common operation/storage authority
U0  protocol/update/context fencing
J0  WebClipJournal v7 -> v8 passive structural migration
A1  exact live content/review authority
A2  worker-issued durable physical operation admission
```

It does not modify runtime, manifest, Registry, version, build, tag, release or deployment.

---

# 1. Executive result

For the exact baseline above:

```text
A1 source contract                   REFINED / L2 PASS
A2 source contract                   REFINED / L2 PASS
current source                       RED / NOT IMPLEMENTED
current Chrome exact-document basis  L3 CONTROLLED PASS
production owner closure             NO
release readiness                    NO
```

The most important conclusions of this delta are:

1. the earlier A1 proposal with three overlapping content lifecycle counters is unnecessarily complex;
2. the canonical live authority should use browser `documentId` plus content `contentRealmNonce`, `applicationGeneration`, exact `navigationEntryId`, `selectionRevision` and a reviewed snapshot digest;
3. **every observed `navigation.currententrychange` advances `applicationGeneration`**, even when `navigationEntryId` does not change;
4. Chrome Stable 153 physically proves that the Navigation API is visible in the isolated content world and observes main-world `pushState`, `replaceState`, state-only `updateCurrentEntry` and hash navigation;
5. no new required `webNavigation` permission is needed for the A1 SPA fence on the current Chrome-only baseline;
6. popup/content messaging must become exact-`documentId`; stale document targets reject rather than silently retarget on current Stable;
7. the worker-issued physical operation P must be durably admitted **before** `prepareForPrint()` starts, not after it;
8. A2 therefore becomes a two-cut protocol:

```text
user final Save intent
-> exact A1 probe
-> durable P admission
-> long content preparation
-> second exact A1 probe
-> later render/effect owner
```

9. if authority becomes stale after P admission but before render/effect, **the same P is terminalized failed/canceled-before-effect**; it is not deleted and replaced by a new P;
10. `SelectionSnapshot` digest is a reviewed portable snapshot identity, but it must not be blindly recomputed from the WebClip-mutated print DOM after preparation;
11. A2 may coexist with `WebClipJournal v8 authorityMode=passive-v8`; it must not implicitly activate D0 CAS;
12. cached-PDF retry is not a new live-content authorization and must later bind to exact P0-079 `pdfGeneration` rather than current selection.

---

# 2. Evidence boundary

## 2.1 Current-source inventory

Committed tool:

```text
project_tools/test_a1_a2_current_source_inventory.js
```

Accepted GitHub Actions receipt:

```text
run       34373803409
job       102541371808
commit    5b8d7d42788c704632f89364c814afb0a532b4b8
runner    Ubuntu 24.04.4
Node      v22.23.2
result    A1/A2 current-source inventory: PASS; RED facts=38
```

The inventory intentionally proves current source is still RED. It is not a closure test.

## 2.2 Deterministic architecture model

Committed tool:

```text
project_tools/test_a1_a2_authority_admission_model.js
```

Accepted execution:

```text
A1/A2 authority-admission research model: PASS; cases=50
```

The model covers:

- selection review issuance;
- selection revision invalidation;
- detached root detection;
- currententrychange invalidation;
- lifecycle invalidation;
- content-realm replacement;
- print-only mutation non-invalidation;
- request fingerprinting;
- same-request dedup;
- request mismatch rejection;
- P-before-prepare ordering;
- stale-after-admission terminalization;
- no effect before second exact probe;
- progress identity transition;
- cached-retry separation;
- passive-v8 non-activation.

## 2.3 Current Chrome controlled L3

Committed tool:

```text
project_tools/run_a1_a2_chrome_authority_fixture.js
```

Exact browser:

```text
Google Chrome for Testing 153.0.8010.36
```

Accepted execution:

```text
run       34373803409
job       102541371808
commit    5b8d7d42788c704632f89364c814afb0a532b4b8
result    A1/A2 Chrome authority fixture: PASS; cases=21
```

The first workflow attempt had already completed all 21 browser assertions, but the research process exited non-zero because its temporary Chrome profile was removed before Chrome fully terminated. That was a **fixture-cleanup defect**, not an authority failure. The harness lifecycle was corrected and the full identical assertion set then completed with a successful job. Only the successful second run above is accepted as the durable receipt.

Controlled Chrome PASS facts:

```text
executeScript returns InjectionResult
InjectionResult.documentId populated
main-frame InjectionResult.frameId == 0
Navigation API visible in isolated content world
MessageSender.documentId == InjectionResult.documentId
MessageSender.documentLifecycle == active
MessageSender.frameId == 0
Navigation.currentEntry.id initially stable
main-world pushState -> isolated currententrychange
pushState -> new entry id
main-world replaceState -> isolated currententrychange
replaceState -> replaced entry id
state-only updateCurrentEntry -> currententrychange with same entry id
hash same-document navigation -> currententrychange
exact tabs.sendMessage(documentId=current) succeeds
cross-document navigation -> documentId changes
new sender matches new documentId
stale tabs.sendMessage(old documentId) rejects
stale executeScript(old documentId) rejects
exact new-document messaging succeeds
```

This L3 proves the browser primitives required by the target design. It does **not** prove the current WebClip production extension already implements A1/A2.

---

# 3. Current source RED map

## 3.1 Popup start is still tab-wide

Current `popup.js`:

```text
ensureTopContentScript(tabId)
  -> chrome.scripting.executeScript(...content.js...)
  -> ignores InjectionResult.documentId

startSelection(tab)
  -> chrome.tabs.sendMessage(tab.id, WEBCLIP_START_SELECTION)
```

No exact document target is retained or used.

Therefore schedule remains possible:

```text
inject old document D1
D1 navigates/replaces
start message reaches current tab document D2
```

The old command can silently retarget.

A1 target forbids that schedule.

---

## 3.2 Content realm has no exact authority tuple

Current duplicate-load guard is Boolean:

```text
__WEBCLIP_PDF_PROTOTYPE_LOADED__
```

Current state has no:

```text
contentRealmNonce
applicationGeneration
navigationEntryId
selectionRevision
selectionAuthorityId
selectionSnapshotSha256
```

There is also no:

```text
WEBCLIP_CONTENT_PROTOCOL_INFO
WEBCLIP_CONTENT_PROBE
```

Consequently current source cannot answer:

```text
is this exact reviewed selection still the same live authority?
```

---

## 3.3 Selection edits are not revisioned

Current functions including:

```text
addInclude
removeInclude
addExclude
removeExclude
clearSelections
remote snapshot updates
```

mutate maps/attributes directly.

There is no single monotonic selection revision that a Save click can capture and later compare.

---

## 3.4 Portable snapshot is not the live authority by itself

Current snapshot:

```text
version = 3
includes.slice(0, 250)
excludes.slice(0, 250)
```

This is useful portable representation, but it cannot establish live exact selection authority because:

- post-hoc slicing can diverge from live aggregate selection until P1-154 closes;
- locators are representation, not JS object identity;
- a selected DOM object can detach while an equivalent-looking element appears;
- print preparation itself mutates parts of the DOM/attributes.

A1 therefore treats portable snapshot digest as **one component** of a review receipt, not the sole live proof.

---

## 3.5 Caller currently mints operation identity

Current content flow creates:

```text
operationId = makeOperationId()
```

then sends it to worker for:

```text
WEBCLIP_GENERATE_PDF
WEBCLIP_SEND_PDF_TO_YANDEX
WEBCLIP_RETRY_PDF_TO_YANDEX
```

Worker still accepts caller `message.operationId` into the physical operation path.

There is no:

```text
clientRequestId
physicalOperationId
WebClipOperationReceipts v1
WEBCLIP_ADMIT_SAVE_OPERATION
```

on canonical main.

---

## 3.6 Current durable admission happens too late for the final architecture

Current local/Yandex sequence is conceptually:

```text
buildSaveMeta()
make caller operationId
prepareForPrint(meta)
  [long/live DOM work]
send first worker save message
```

Therefore a user can click final Save and WebClip can spend substantial time mutating/preparing the page before one common durable physical operation exists.

That ordering is superseded by this delta.

---

# 4. Research evolution: simplify the earlier A1 lifecycle tuple

The earlier W1 foundation source spec proposed content state including:

```text
documentActivityGeneration
applicationGeneration
navigationTransitionGeneration
selectionRevision
```

The later W1-W6 reconciliation standardized shared generation vocabulary and did not retain the first/third fields as independent authority domains.

Current Chrome L3 now gives a simpler exact basis.

## Final A1 shared authority tuple

```text
browser documentId          // trusted worker/Chrome identity
contentRealmNonce           // exact isolated content realm incarnation
applicationGeneration       // any meaningful same-document/lifecycle incarnation change
navigationEntryId           // exact current NavigationHistoryEntry.id referent
selectionRevision           // material reviewed Include/Exclude composition revision
selectionAuthorityId        // one reviewed authority instance
selectionSnapshotSha256     // bounded portable snapshot identity
```

Do not add persisted/shared:

```text
documentActivityGeneration
navigationTransitionGeneration
```

unless later production evidence demonstrates a distinction that cannot be represented by the canonical tuple.

Local diagnostic counters are allowed, but they must not become competing authority.

---

# 5. Why `applicationGeneration` and `navigationEntryId` are both required

Current Chrome L3 establishes two different schedules.

## 5.1 Entry replacement/new entry

Observed:

```text
pushState
  -> currententrychange
  -> entry id changes

replaceState
  -> currententrychange
  -> entry id changes
```

For these, either id or generation detects staleness.

## 5.2 State-only current-entry update

Observed:

```text
navigation.updateCurrentEntry({state: ...})
  -> currententrychange
  -> entry id stays the same
```

Therefore this is unsafe:

```text
if navigationEntryId unchanged
  -> application authority unchanged
```

It is false.

## Final rule

Every observed `currententrychange`:

```text
applicationGeneration += 1
invalidate current reviewed receipt
update captured navigationEntryId/current URL
```

`navigationEntryId` remains an exact referent, but does not replace the generation.

This is deliberately conservative. State-only application changes can alter live DOM/meaning even when URL/entry id are unchanged.

---

# 6. Navigation API instead of a new required webNavigation permission

Current extension minimum Chrome is 118.

The controlled Chrome 153 fixture proves:

```text
window.navigation exists in the isolated content world
currententrychange observes main-world same-document navigation/state changes
```

Therefore A1 does not require a new mandatory `webNavigation` permission merely to observe SPA transitions.

Preferred source design:

```js
const nav = globalThis.navigation;
if (nav?.currentEntry && nav?.addEventListener) {
  nav.addEventListener('currententrychange', onCurrentEntryChange);
}
```

Fail-closed fallback if the API is unexpectedly unavailable on a supported browser/runtime:

```text
protocolInfo.navigationAuthority = unavailable
review/save exact authority = unavailable
fresh reload/review required / unsupported environment
```

Do not silently fall back to URL polling as exact authority.

---

# 7. A1 content private state

Recommended private fields inside current content realm:

```js
state.contentRealmNonce
state.applicationGeneration
state.navigationEntryId
state.selectionRevision
state.selectionAuthorityId
state.selectionAuthorityReceipt
state.reviewedSelectionSnapshot
state.reviewedSelectionRootRefs
state.activeSaveRequest
```

## 7.1 Initialization

```text
contentRealmNonce = crypto.randomUUID()
applicationGeneration = 1
navigationEntryId = navigation.currentEntry.id
selectionRevision = 1
```

The exact initial number is not globally meaningful; equality within the same realm is.

---

# 8. Material selection revision

Increment `selectionRevision` on every user/authority-relevant composition change, including:

```text
add Include
remove Include
add Exclude
remove Exclude
clear selection
apply/replace restored template
remote-frame selected snapshot materially changes
read-later automatic candidate replacement
```

Do not increment for presentation-only operations such as:

```text
hover outline movement
modal open/close
progress text
WebClip print header insertion
temporary link/resource normalization
print stylesheet insertion/removal
temporary iframe print representation
```

A print-only mutation ledger is W3 authority; it must not masquerade as user-selection change.

---

# 9. Application-generation invalidation

At minimum advance/invalidate on:

```text
navigation.currententrychange
pagehide for an active reviewed/save authority
pageshow persisted=true / BFCache restoration
```

For ordinary cross-document navigation, Chrome `documentId` changes and the old content realm disappears, which is already the strongest fence.

The lifecycle increment remains useful for BFCache/same-realm restoration and for invalidating an already-issued review receipt before a later event can reuse it.

---

# 10. `SelectionAuthorityReceipt v2`

Conceptual shared/IPC shape:

```js
{
  version: 2,
  protocolVersion: 2,

  contentRealmNonce,
  selectionAuthorityId,

  applicationGeneration,
  navigationEntryId,
  selectionRevision,

  selectionSnapshotSha256,
  reviewedAt
}
```

Trusted browser fields are not caller-authored inside this object:

```text
documentId
documentLifecycle
frameId
```

Worker obtains those from `MessageSender` / exact Chrome targeting.

The worker-side source receipt composes them:

```js
{
  browserDocumentId: sender.documentId,
  topFrameId: sender.frameId,
  documentLifecycle: sender.documentLifecycle,
  ...SelectionAuthorityReceiptV2
}
```

---

# 11. Review receipt issuance

## 11.1 Manual Include/Exclude path

Issue/freeze when user enters the reviewed Save state:

```text
selecting
-> Готово
-> review
-> issueSelectionAuthorityReceipt()
```

Opening comment/destination UI does not mint a different authority.

The same receipt must survive until final Save click unless invalidated.

## 11.2 Popup direct Download/Yandex command

Current popup can invoke content commands that jump directly toward Save UI.

Target helper should centralize all entry paths:

```text
enterReviewedSaveState(...)
```

It must:

1. require current protocol/current realm;
2. require at least one admitted selection root;
3. ensure roots are live;
4. serialize bounded portable snapshot;
5. hash it;
6. issue one review receipt;
7. then expose destination/comment controls.

## 11.3 Read Later automatic selection

Read Later is not manual Include/Exclude review, but final user Save still approves an automatically chosen content set.

Target:

```text
auto-detect candidate
-> material selectionRevision update
-> issue review receipt with reviewKind='auto-read-later' in local UI state
-> show comment/final Save
```

The shared authority tuple remains identical; `reviewKind` is product/UI metadata, not a new generation.

## 11.4 Restored Journal template

Applying a portable snapshot must invalidate any prior receipt.

After restore, user must return through reviewed state before Save.

The imported historical snapshot is not itself current authority.

---

# 12. Live root continuity is required in addition to the snapshot digest

At review time store private JS references for the exact selected local roots and the current exact remote-selection authority references available at that stage.

Conceptually:

```js
state.reviewedSelectionRootRefs = [
  { kind: 'include', element },
  { kind: 'exclude', element },
  ...
]
```

A probe succeeds only if all required local roots still satisfy:

```text
element.isConnected == true
ownerDocument is still the expected current document/frame document
same private selected object is still present in the current selection map
```

This catches:

```text
old selected node detached
new visually identical node inserted
selectionRevision accidentally unchanged
```

A locator match to the new node is not permission to retarget the already-reviewed Save.

---

# 13. Portable snapshot digest semantics

At review:

```text
S = canonical bounded portable SelectionSnapshot
H = SHA-256(S)
```

Store:

```text
private reviewed snapshot S
shared receipt.selectionSnapshotSha256 = H
```

On A2 admission, worker sanitizes the submitted reviewed snapshot and recomputes the canonical digest before accepting the request.

Required:

```text
Hworker == Hreceipt
```

This prevents a bug/stale path from pairing authority receipt R with a different portable snapshot S2.

## 13.1 Do not blindly reserialize after `prepareForPrint()`

Current `prepareForPrint()` intentionally changes representation:

```text
inserts print header
normalizes resources/links
wraps images
adds print styles
normalizes selected frame chains
may create flattened print proxies
```

Those are WebClip-owned representation mutations.

Recomputing locator-based portable snapshot after these mutations can make WebClip invalidate itself even though the underlying user-selected root objects remain exact.

Therefore post-prepare live validation uses:

```text
same receipt identity
the same applicationGeneration
same navigationEntryId
same selectionRevision
same connected private root objects
same required remote authority
```

not:

```text
serialize the already-mutated print DOM and demand byte-identical locators
```

The reviewed snapshot digest remains immutable evidence of what was admitted, not a hash of every temporary print representation state.

---

# 14. Exact content probe

Target message:

```text
WEBCLIP_CONTENT_PROBE
```

Worker sends it with exact Chrome target:

```js
chrome.tabs.sendMessage(tabId, request, {
  documentId: expectedDocumentId
})
```

Request carries expected `SelectionAuthorityReceipt v2` identity.

Content response only returns success if private state remains the same.

Conceptual result:

```js
{
  ok: true,
  current: true,
  protocolVersion: 2,
  sameAuthority: true,
  liveSelectionConnected: true,
  applicationGeneration,
  navigationEntryId,
  selectionRevision
}
```

Do not return a newer receipt to auto-retarget a stale operation.

Mismatch:

```text
WEBCLIP_REVIEW_REQUIRED
```

---

# 15. Popup exact start after U0

Current Stable L3 physically confirms `InjectionResult.documentId` exists.

Target startup sequence:

```text
probe current top content realm

ABSENT
  -> executeScript current bundle in top frame
  -> require one unambiguous top InjectionResult
  -> capture documentId D

CURRENT
  -> use reported current D

LEGACY / INCOMPATIBLE
  -> no reinjection over old realm
  -> require reload/new document/review

then:
  tabs.sendMessage(WEBCLIP_START_SELECTION, ..., {documentId:D})
```

If D disappears between injection and start:

```text
fail the old attempt
```

Do not fall back to tab-wide message.

---

# 16. Worker sender gate for A2

`WEBCLIP_ADMIT_SAVE_OPERATION` accepts only current content sender with:

```text
sender.id == chrome.runtime.id
sender.tab.id present
sender.frameId == 0
sender.documentId non-empty
sender.documentLifecycle == active
not incognito
protocolVersion == current
```

The exact source `documentId` comes from sender, not from a content-supplied field.

If the message body also carries a diagnostic document id, it must match sender and never overrides it.

---

# 17. Major A2 refinement: durable P before long preparation

The earlier draft performed content preparation before the worker mutation request.

That ordering is superseded.

## Final two-cut sequence

```text
T0 user reaches reviewed state R

T1 final Save click freezes immutable user intent I
   and one clientRequestId C

T2 content -> worker WEBCLIP_ADMIT_SAVE_OPERATION(C, R, I)

T3 worker exact-probes browser document D / receipt R

T4 worker sanitizes I + reviewed snapshot
   computes request fingerprint H
   admits/reuses durable physical P in A0 DB

T5 content receives P
   binds UI/progress to P

T6 content runs prepareForPrint()/resource preparation

T7 content sends existing destination/render request carrying
   {C, P, R, same immutable I + derived preparation reports}

T8 worker re-validates P/C/H
   exact-probes D/R a second time

T9 only then may A3/B/native/Yandex owner admit its physical effect
```

This gives one durable continuity anchor from final user Save intent through later stages.

---

# 18. Why P must precede `prepareForPrint()`

Current preparation can:

- wait on resource readiness;
- traverse substantial selected DOM;
- trigger safe disclosure controls;
- create temporary page representation;
- fail or be interrupted by navigation/page close.

Even though this is not yet the irreversible external effect, it is already operation work caused by a final user Save command.

Without P:

```text
user clicked Save
long work started
worker/content disappears
no common exact operation exists to explain/reconcile that attempt
```

With P:

```text
user clicked Save
P admitted
long work fails before effect
same P -> failed-before-effect / canceled-before-effect
```

No invented P2 is needed.

---

# 19. `WEBCLIP_ADMIT_SAVE_OPERATION`

Conceptual request:

```js
{
  type: 'WEBCLIP_ADMIT_SAVE_OPERATION',
  protocolVersion: 2,

  clientRequestId,
  clientCorrelationId?,

  operationKind: 'pdf.local-save' | 'pdf.yandex-save',

  selectionAuthority: SelectionAuthorityReceiptV2,

  immutableIntent: {
    destination,
    readingMode,
    fileComment,
    reviewedSelectionSnapshot,
    frozenUrl,
    frozenTitle,
    filenameTimestamp,
    localDateTime
  }
}
```

Exact field set may be normalized during implementation, but authority classes must remain separated.

Do not include derived post-preparation fields such as:

```text
resourceReport
pageAnalysis
render diagnostics
```

in immutable user request identity.

---

# 20. Freeze immutable intent once per final click

Current retries rebuild parts of request state and mint a new caller operation id.

A2 target stores a local private request object:

```js
state.activeSaveRequest = {
  clientRequestId,
  clientCorrelationId,
  selectionAuthorityId,
  immutableIntent,
  immutableIntentFingerprint?,
  physicalOperationId: '',
  phase: 'admitting' | 'preparing' | 'submitted' | 'terminal'
}
```

If the caller receives an unknown/timed-out admission response while the same content realm/review is alive:

```text
retry same C + same immutable intent
```

A0 unique `clientRequestId` returns the same P.

Do not mint C2 merely because the outer response was lost.

---

# 21. Worker request fingerprint

Worker, not content, is final owner of `requestFingerprint` persisted in P.

Recommended canonical digest input:

```text
operationKind
trusted sender.documentId
contentRealmNonce
selectionAuthorityId
applicationGeneration
navigationEntryId
selectionRevision
selectionSnapshotSha256
destination
readingMode
bounded immutable file comment intent
frozen source URL/title identity as allowed by privacy owner
```

Persist only:

```text
sha256:<64 hex>
```

in common P unless a later owner explicitly requires a bounded non-secret field.

Do not persist raw comments/full URLs merely to deduplicate.

---

# 22. A0 P admission semantics consumed by A2

Same exact request:

```text
C + same kind/subject/fingerprint
-> return same P
```

Same C but changed immutable request:

```text
WEBCLIP_CLIENT_REQUEST_MISMATCH
-> no P2
```

Suggested subject key:

```text
content:<browserDocumentId>:<contentRealmNonce>:<selectionAuthorityId>
```

or an equivalent bounded internal key.

Do not use raw URL as common operation subject authority.

---

# 23. Admission response

Conceptual response:

```js
{
  ok: true,
  protocolVersion: 2,
  clientRequestId,
  physicalOperationId,
  deduplicated,
  receiptRevision,
  phase: 'admitted'
}
```

After this response:

```text
physicalOperationId = primary support/progress identity
```

`clientCorrelationId` may still be shown for backwards support but is non-authoritative.

---

# 24. Second exact probe is mandatory

A successful pre-admission probe does not authorize a later render indefinitely.

Between P admission and render:

```text
SPA transition
state-only Navigation update
hash transition
BFCache lifecycle
selected root detached/replaced
user selection edit
remote frame selection change
```

may occur.

Therefore the destination/render message must cause worker to:

1. load exact P;
2. verify same C and request fingerprint;
3. verify P is still active/compatible;
4. exact-target the original sender `documentId`;
5. perform `WEBCLIP_CONTENT_PROBE` with original R;
6. only after success hand authority to A3/B/native/Yandex owner.

---

# 25. Stale after P admission

Schedule:

```text
P admitted
page changes
second probe fails
```

Required:

```text
no Page.printToPDF
no download start
no Yandex mutation
same P terminalized as failed-before-effect/review-required
```

Do not:

```text
delete P
mint P2 automatically
use a newer content receipt
retarget to current tab document
```

User may deliberately review again and start a new request C2/P2.

---

# 26. Preparation failure after P admission

If `prepareForPrint()` fails locally before destination request:

```text
content -> worker WEBCLIP_ABORT_SAVE_OPERATION
  { C, P, reasonClass='prepare-failed-before-effect' }
```

Worker CAS-terminalizes the same P if no downstream effect was admitted.

If content realm disappears before it can send this message:

```text
P remains durable admitted/preparing evidence
P1-210 reconciliation decides exact later class
```

Missing abort response is never proof that P did not exist.

---

# 27. User cancellation after P admission

If product/UI later permits cancellation during preparation:

```text
cancel before any physical effect admission
-> same P canceled-before-effect
```

After a non-cancellable effect start receipt exists, cancellation language changes to reconciliation/unknown semantics under the relevant owner.

A2 itself must not claim cancellation of A3/B/native/Yandex work it does not own.

---

# 28. Lost A2 admission response

Schedule:

```text
worker commits P
outer runtime response is lost/times out
```

Same live request can retry:

```text
same C + same H
-> same P
```

Content must not begin `prepareForPrint()` while admission result is merely unknown.

If the content realm is destroyed:

```text
old selection authority cannot be recreated
old P remains discoverable/reconcilable by worker
new document requires new review/new request
```

---

# 29. Physical identity vs legacy `operationId`

After A2:

```text
physicalOperationId = authority
clientRequestId     = admission dedup identity
clientCorrelationId = presentation/support correlation
```

Caller-generated historical `operationId` may map only to `clientCorrelationId`.

During staged migration, an existing legacy field named `operationId` may temporarily mirror the already worker-issued P when a downstream structure has not yet received its explicit `physicalOperationId` column/property.

Strict rules for such a bridge:

```text
value must equal exact P
caller value cannot enter it
it cannot rebind P
new authority code reads explicit P where available
imports cannot manufacture live P from historical operationId
```

This is compatibility plumbing, not permission to keep caller-owned operation identity.

---

# 30. Progress identity transition

Before P admission UI may show:

```text
clientCorrelationId / clientRequestId
```

After admission every progress message should carry:

```js
{
  clientRequestId,
  physicalOperationId,
  stage,
  ...
}
```

Content binds P exactly once for the active request.

Progress for:

```text
wrong P
wrong C
old review
```

is ignored as stale presentation.

Progress messages remain presentation; they do not prove effect settlement.

---

# 31. Current `pageUploadOperationId` transition

Current content uses:

```text
state.pageUploadOperationId
```

and accepts progress when incoming `operationId` equals it.

Target transitional state:

```text
state.activeSaveRequest.clientRequestId
state.activeSaveRequest.physicalOperationId
```

After P is known, progress matching requires exact P.

Do not use a newly generated retry correlation to claim an older P.

---

# 32. Local download and Yandex save both consume the same A1/A2 front half

The destination differs only after immutable user intent is frozen.

Common:

```text
review receipt
clientRequestId
durable P
preparation
second exact probe
```

Then branch:

```text
local -> later A3/native-download owners
Yandex -> later A3/B/C/D + auth/publication owners
```

Do not maintain separate content authority systems for local and Yandex paths.

---

# 33. Cached Yandex retry is not A1 live selection replay

Current UI retries cached PDF from the same page.

Final architecture:

```text
live initial save
  A1/A2 -> A3 -> sealed pdfGeneration G

retry G
  exact P0-079/P0-023 generation authority
  -> new/existing exact operation receipt according to B/C contract
```

Retry must not ask:

```text
what is the page's current selection now?
```

and must not rerender a newer SPA route under the old retry action.

A1 review authority has served its purpose once exact PDF generation G is sealed.

---

# 34. Read Later relationship

Current Read Later auto-detects main content and then uses the same save machinery.

Target:

```text
auto candidate exact object
-> selectionRevision
-> reviewed auto receipt
-> final user Save click
-> A2 P admission
```

If auto candidate detaches/replaces while comment dialog is open:

```text
second/probe validation fails
-> review required / rerun detection
```

Do not silently detect a new candidate under the same P.

---

# 35. Cross-origin frames and A1

A1 top-level `selectionRevision` must advance when currently accepted remote selection composition changes.

However exact frame lifecycle/session authority is W2/P1-171/P1-004 territory.

Therefore A1/A2 must expose a forward-compatible slot/reference for remote authority but must not invent a second frame generation.

Once W2 lands, exact probe composes:

```text
top browserDocumentId/content realm/application/selection receipt
+
exact FrameSessionGeneration receipts for selected remote frame content
```

Until then, A1 research does not close cross-origin frame umbrella owners.

---

# 36. Relationship to U0 legacy content handling

A1 receipts are issued only by **current protocol content realm**.

Legacy Boolean-loaded realm cannot be trusted to mint a compatible receipt after extension update.

Required:

```text
LEGACY/INCOMPATIBLE realm
-> no A1 authority
-> no A2 admission
-> user reload/new document/review
```

Do not:

```text
bypass old sentinel
inject second content authority realm
adopt old Include/Exclude JS objects into a new realm
```

This preserves the U0 cutover contract.

---

# 37. Relationship to J0 passive v8

A1/A2 require J0 schema-ready barrier to have succeeded for builds that include v8, but they do not switch Journal mutation semantics.

Allowed intermediate state:

```text
WebClipJournal dbVersion = 8
authorityMode            = passive-v8
A1/A2 current protocol   = available
```

Not allowed in A2:

```text
authorityMode = cas-v1
```

unless D0 independently proves all required Journal writers are compatible.

---

# 38. Live Journal compatibility before D0

Newly generated live records may need to remain readable by existing passive-v8/v7-compatible Journal paths.

Transitional rule:

```text
new live operation is created under P
legacy Journal presentation field operationId may mirror P
```

but:

```text
Journal row is not the source of P authority
historical/imported operationId is never upgraded into P
D0 later introduces exact JG/ER finalization ownership
```

This avoids coupling A2 deployment to immediate D0 activation.

---

# 39. Request fingerprint excludes derived preparation output

`prepareForPrint()` currently adds/changes data such as:

```text
resourceReport
pageAnalysis
print diagnostics
```

Those are derived after P admission.

Therefore A2 request fingerprint covers **immutable user/source intent**, not every later derived report.

Otherwise normal preparation would change H and make the operation fail its own identity check.

Derived reports are separately bounded/sanitized and later attached to render/Journal evidence under their owners.

---

# 40. Frozen URL/title semantics

At final Save click, freeze the user-facing source metadata used for this operation.

If application generation changes afterward:

```text
operation becomes stale before effect
```

Do not silently refresh:

```text
location.href
document.title
```

under the same C/P after navigation.

Privacy/durable URL transformation remains P0-066/W5 responsibility; A2 should persist only the request hash/common compact authority required by A0.

---

# 41. Timestamp semantics

User-facing filename timestamp/local date may be frozen at final Save click.

It is diagnostic/naming intent, not source-generation identity.

Retry of the **same C/P** must not regenerate timestamp and thereby change request fingerprint.

A deliberate new Save request may receive a new timestamp.

---

# 42. Source change map — `content.js`

Expected A1/A2 production changes include:

```text
versioned content realm sentinel/protocol info
contentRealmNonce initialization
Navigation currententrychange listener
applicationGeneration
navigationEntryId capture
selectionRevision helper
all material selection mutators call revision helper
review receipt issue/invalidate helpers
private reviewed root refs
reviewed snapshot digest
WEBCLIP_CONTENT_PROBE
central enterReviewedSaveState()
activeSaveRequest state
clientRequestId generation
pre-prepare WEBCLIP_ADMIT_SAVE_OPERATION
physicalOperationId bind
second-stage destination request carries P/C/R
prepare-failure/cancel terminalization request
progress matching by P
```

Do not combine this tranche with W3 PageMutationLedger implementation merely because both touch `content.js`.

---

# 43. Source change map — `popup.js`

Expected U0/A1 composition:

```text
probe content protocol before injection
ABSENT -> inject
consume top InjectionResult.documentId
CURRENT -> reuse exact reported document
LEGACY -> fail/reload required
start selection with tabs.sendMessage(...,{documentId})
no tab-wide fallback after exact D is known
```

A popup-opened new user attempt on a new document may start a fresh selection; it may not retarget an older attempt.

---

# 44. Source change map — `service-worker.js`

Expected A2 foundation:

```text
WEBCLIP_ADMIT_SAVE_OPERATION handler
strict current content sender gate
exact selection receipt normalization
exact current-document probe
reviewed snapshot digest verification
canonical immutable request fingerprint
A0 admitUserOperation()
return P

existing WEBCLIP_GENERATE_PDF / WEBCLIP_SEND_PDF_TO_YANDEX
  require explicit P + C + R
  load exact P
  verify fingerprint/subject
  second exact document probe
  then hand to later owner
```

Caller `message.operationId` must no longer be capable of minting/choosing physical P.

---

# 45. Error classes

Recommended stable classes:

```text
WEBCLIP_CONTENT_PROTOCOL_MISMATCH
WEBCLIP_CONTENT_LEGACY_REALM
WEBCLIP_DOCUMENT_STALE
WEBCLIP_REVIEW_REQUIRED
WEBCLIP_SELECTION_AUTHORITY_STALE
WEBCLIP_CLIENT_REQUEST_REQUIRED
WEBCLIP_CLIENT_REQUEST_MISMATCH
WEBCLIP_OPERATION_NOT_ADMITTED
WEBCLIP_OPERATION_RECEIPT_STALE
WEBCLIP_SAVE_PREPARE_FAILED
```

Exact names can be adapted to existing style; semantic distinction must remain.

Do not collapse all of these into generic `Не удалось сформировать PDF` before OperationLog/support layers have exact class.

---

# 46. Race schedule matrix

## R1 — navigation between popup injection and start

```text
inject D1
navigate -> D2
send exact start to D1
```

Expected:

```text
reject
no start on D2
```

Physically supported by current Chrome stale-documentId control.

## R2 — SPA transition while Save dialog open

```text
review R1
pushState/replaceState/hash/state-only update
applicationGeneration advances
Save click
```

Expected:

```text
A1 probe fails
no P if staleness occurred before admission
review again
```

## R3 — SPA transition after P admission, before render

```text
P admitted
prepare
currententrychange
second probe
```

Expected:

```text
second probe fails
same P terminal failed-before-effect
zero physical effect
```

## R4 — selected root detached during comment dialog

No selectionRevision update is required to catch it.

Expected:

```text
private root live check fails
review required
```

## R5 — WebClip print-only DOM mutation

```text
P admitted
prepareForPrint mutates representation
```

Expected:

```text
selectionRevision unchanged
private selected roots still exact/live
second probe may pass
```

Do not require locator hash of mutated print DOM to equal pre-prepare portable snapshot.

## R6 — admission response lost

```text
P1 committed
content still alive
retry same C/H
```

Expected:

```text
same P1 returned
no P2
```

## R7 — admission response lost + content realm destroyed

Expected:

```text
old P retained/reconciled
new realm cannot reuse old review authority
new user Save -> new review/new C
```

## R8 — same C but comment changed

Expected:

```text
request fingerprint mismatch
hard reject
no new P
```

## R9 — user deliberately reviews again after stale failure

Expected:

```text
new review id
new C
new P
```

The previous P remains truthful terminal evidence.

## R10 — cached retry after page navigated

Expected:

```text
no live selection probe as authority for old PDF
exact pdfGeneration required
```

---

# 47. No tab-id identity

Throughout A1/A2:

```text
tabId = routing handle
```

not:

```text
tabId = document identity
```

The exact document tuple is:

```text
tabId + browser documentId
```

with content/application/review generations below it.

Tab reuse/reload must not preserve authority by itself.

---

# 48. No URL identity

Likewise:

```text
same URL != same browser Document
same browser Document != same SPA application generation
same application generation != same reviewed selection
```

A1/A2 explicitly model all three boundaries.

---

# 49. Protocol/review failure UI

When authority is stale, preferred user message should explain action rather than obscure internal terms:

```text
Страница или выбранные области изменились после проверки.
Проверьте выделение и подтвердите сохранение заново.
```

Legacy content after update:

```text
Эта вкладка использует предыдущую версию WebClip.
Обновите страницу и повторно проверьте выделение.
```

Do not auto-replay a Save after reload.

---

# 50. Defensive-security properties

A1/A2 improvements are defensive architecture:

- host page cannot choose worker physical P;
- stale caller cannot select another current tab document by omission;
- imported/historical operationId cannot become live capability;
- current browser document identity comes from Chrome sender/InjectionResult;
- request dedup persists a hash, not raw sensitive intent in the common operation DB;
- no new browsing-history permission is required for SPA detection under current platform baseline.

This research does not perform vulnerability scanning/exploitation.

---

# 51. Performance/boundedness constraints

A1 must not introduce unbounded work at every SPA event.

`currententrychange` handler should be O(1)/small bounded state mutation:

```text
advance generation
capture current entry id/url reference
invalidate receipt
schedule bounded UI state refresh if needed
```

Do not rescan/serialize the full selection on every history event.

Selection snapshot serialization/digest occurs at reviewed-state admission under P1-154/W6 budgets.

Second probe should validate private references and generation tuple without expensive DOM-wide rediscovery.

---

# 52. Hashing boundary

`selectionSnapshotSha256` and `requestFingerprint` are local identity digests.

They do not prove:

```text
PDF physical fidelity
remote Yandex content
external provider settlement
```

Those require later A3/B/C/L5 evidence.

Do not upgrade their evidence class.

---

# 53. Production tranche split

Preferred implementation remains PR-first and separated.

## A1 production PR

Scope:

```text
content exact realm/application/selection authority
Navigation API invalidation
exact probe
popup exact document targeting
current-protocol source gates
```

No A0 P mutation required beyond U0 compatibility.

## A2 production PR

Prerequisites:

```text
A0 merged
U0 merged
A1 merged
J0 schema-ready where v8 is part of that production baseline
```

Scope:

```text
pre-prepare operation admission
clientRequestId dedup
worker-issued P
same-P stale terminalization
second probe before downstream effect
progress identity transition
```

Do not mix B1 immutable PDF cache implementation into A2 merely because the next downstream stage consumes P.

---

# 54. A1 source gates

Future GREEN source/model gates should require at minimum:

```text
versioned content protocol
contentRealmNonce
applicationGeneration
navigation.currententrychange listener
navigationEntryId
selectionRevision centralized mutation helper
selectionAuthorityId
selectionSnapshotSha256
WEBCLIP_CONTENT_PROBE
private selected-root connectivity verification
popup consumes InjectionResult.documentId
popup exact tabs.sendMessage(documentId)
no tab-wide fallback for admitted start
```

Negative gates:

```text
legacy Boolean sentinel is not the sole version contract
no independent documentActivityGeneration shared field
no independent navigationTransitionGeneration shared field
no required webNavigation permission solely for A1
```

---

# 55. A2 source gates

Future GREEN gates should require:

```text
WEBCLIP_ADMIT_SAVE_OPERATION
clientRequestId
physicalOperationId
A0 exact receipt admission
worker computes request fingerprint
caller operationId cannot select P
P is committed before prepareForPrint starts
same C exact retry -> same P
same C changed request -> reject
second exact content probe before render/effect
stale after P -> same P failed-before-effect
progress binds P after admission
```

Negative gate:

```text
prepareForPrint(meta)
-> first worker admission
```

must disappear from final Save paths.

---

# 56. Future exact Chrome production acceptance

On an exact production commit/current target browser, prove at least:

1. popup injection captures top `documentId`;
2. navigation between injection/start causes old start to reject;
3. current realm protocol probe succeeds;
4. legacy/incompatible realm does not receive second content authority instance;
5. manual Include edit increments `selectionRevision`;
6. Exclude edit increments it;
7. restored template increments it;
8. remote selection update increments top selection revision or exact W2 authority changes;
9. `pushState` invalidates review;
10. `replaceState` invalidates review;
11. state-only `updateCurrentEntry` invalidates review even with same entry id;
12. hash navigation invalidates review;
13. selected root detach invalidates review;
14. print-only temporary representation does not falsely increment selection revision;
15. final Save admits P before artificial long preparation delay;
16. kill worker/content after P admission and prove P remains discoverable;
17. lost admission response + same C returns same P;
18. same C changed comment/intent rejects;
19. SPA change during preparation yields same P failed-before-effect;
20. zero Page.printToPDF/download/Yandex call occurs on stale second probe;
21. deliberate fresh review creates new C/P;
22. current `passive-v8` Journal remains passive;
23. no new webNavigation permission appears solely for SPA tracking.

A1/A2 owner status must not move to DONE from model/L3 fixture alone.

---

# 57. Relationship to next research tranche

After this A1/A2 delta, the next implementation-readiness uncertainty is no longer content admission.

The rational next research target is the first downstream handoff:

```text
A3 exact render/source generation admission
-> B0/B1 immutable operation-owned PDF generation/cache
```

That tranche should answer exactly:

- when `renderAttemptId` is minted relative to P and the second probe;
- how CDP `Page.printToPDF` is fenced against navigation after probe;
- how guarded P0-071 render cut consumes exact source receipt;
- when PDF SHA-256 becomes part of sealed `pdfGeneration`;
- how offscreen and local/Yandex consumers transition from `tab:<id>` aliases to exact G;
- what crash prefix exists between successful print bytes and atomic cache seal.

Do not reopen broad W1-W6 enumeration unless production or new external evidence contradicts the reconciled architecture.

---

# 58. Owner/status decision

No new independent root cause was found.

All observed issues are compositions/refinements of existing owners:

```text
P0-070
P0-080
P1-125
P1-198
P1-209
P1-210
P1-154
P1-157
P1-171
```

Therefore:

```text
new P-code = NO
P1-231 = NOT ALLOCATED
```

No Registry status changes are made.

---

# 59. Final decision

For exact baseline:

```text
main = d4f5b268fa3f7ced5a7bc68da52784863d614138
```

A1/A2 now have an implementation-ready source/cutover contract consistent with A0/U0/J0 and the final W1-W6 vocabulary.

Strongest truthful state:

```text
A1/A2 RESEARCH DELTA                  = COMPLETE
A1/A2 DETERMINISTIC MODEL             = PASS
A1/A2 CURRENT-SOURCE INVENTORY        = RED CONFIRMED
A1/A2 CURRENT-STABLE PLATFORM CONTROL = PASS
A1/A2 PRODUCTION IMPLEMENTATION       = NOT STARTED
A1/A2 OWNER CLOSURE                   = NO
RELEASE READY                         = NO
YANDEX L5                             = DEFERRED
```

The central implementation rule to carry forward is:

```text
reviewed exact content authority
-> worker exact probe
-> durable physical P
-> long page preparation
-> second exact probe
-> render/effect authority
```

not:

```text
prepare current tab
-> later ask worker to treat caller operationId as the operation
```
