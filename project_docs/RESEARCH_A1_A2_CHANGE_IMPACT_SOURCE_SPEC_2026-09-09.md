# WebClip — A1/A2 Change Impact and production-entry source specification — 2026-09-09

Date: 2026-09-09  
Canonical production baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Canonical Registry blob: `81e5867c0e0936b9524ece8949c53ad4ed83523c`  
Research branch: `research/a1-a2-change-impact-source-spec-2026-09-09`  
Mode: **RESEARCH-ONLY / PRE-IMPLEMENTATION CHANGE IMPACT**  
Production implementation: **NOT STARTED**.  
Release readiness: **NOT READY**.  
Real Yandex L5: **DEFERRED**.  
New P-code: **NO**; `P1-231` remains unallocated.

Primary owners composed here:

```text
P0-070 exact full-document generation
P0-080 same-document application/selection generation
P1-125 executeScript late-success exact document binding
P1-198 worker-issued physical operation identity
P1-209 update/old-context repair generation
P1-210 bounded operation reconciliation
```

Important supporting boundaries:

```text
P0-023 exact source retry
P0-076 Journal CAS
P0-079 immutable PDF generation
P1-086 IndexedDB transaction-complete reads
P1-146 automatic-download physical side effect
P1-156 native Save As
P1-157 Chrome call lifetime semantics
P1-171/P1-175 frame/document generation
```

This tranche follows the completed `A0 -> U0 -> J0` production-entry source specification. It does not reopen W1-W6 architecture and does not change production source, Registry, manifest, build, version, tag, release or deployment.

---

# 1. Executive decision

For exact current baseline:

```text
A1 exact content/document authority contract   = DEFINED
A2 worker-issued physical admission contract   = DEFINED
A1/A2 deterministic model                      = PASS
A1/A2 current-source inventory                 = RED CONFIRMED
current-Chrome documentId primitives           = CONTROLLED L3 PASS
production implementation                      = NOT STARTED
owner closure                                  = NO
release readiness                              = NO
```

The important Change Impact from the preceding U0/J0 work is:

```text
U0 must establish a current content protocol realm before A1 may issue authority.
A1 may never auto-upgrade/reuse a legacy content realm.
A2 may admit physical operations while Journal v8 is still passive-v8.
A2 must not activate D0 Journal CAS semantics merely because v8 exists.
```

The most important new/refined sequencing decision is:

> a durable worker-owned physical operation P should be admitted **before** long `prepareForPrint()` work, then the exact reviewed content receipt must be re-probed before the actual render/effect boundary.

Current source instead generates a caller `operationId`, performs `prepareForPrint(meta)`, and only afterwards sends the first worker save message. That leaves long operation work without durable worker continuity and cannot satisfy P0-070/P1-198.

---

# 2. Current-source RED inventory

Committed research inventory:

```text
project_tools/test_a1_a2_current_source_inventory.js
```

Actual execution:

```text
run       34373597115
job       102540661397
commit    e14bc33d371237cceb1b512b62ac0d1ce12773b0
runner    Ubuntu 24.04.5
Node      v22.23.2
result    A1/A2 current-source inventory: PASS; RED facts=28
```

The inventory intentionally asserts current RED shapes; it is not a production GREEN test.

Key observed current shapes:

## 2.1 Content realm is not versioned authority

Current `content.js` only guards duplicate load with:

```text
globalThis.__WEBCLIP_PDF_PROTOTYPE_LOADED__ = true
```

and has none of:

```text
contentRealmNonce
WEBCLIP_CONTENT_PROTOCOL_INFO
WEBCLIP_CONTENT_PROBE
documentActivityGeneration
applicationGeneration
navigationTransitionGeneration
selectionRevision
selectionAuthorityId
selectionSnapshotSha256
```

Therefore the current Boolean means only:

```text
some WebClip content realm already exists
```

not:

```text
this exact compatible content protocol owns the reviewed selection
```

## 2.2 Popup injection is tab-scoped

Current popup:

```text
chrome.scripting.executeScript({ target:{tabId}, files:[...] })
```

ignores the returned `InjectionResult.documentId` and then sends:

```text
chrome.tabs.sendMessage(tab.id, {type:'WEBCLIP_START_SELECTION'})
```

without `documentId`.

This means injection result and command target are not bound to the same browser document.

## 2.3 Save request is caller-operationId + tabId

Current content local save approximately follows:

```text
meta = buildSaveMeta()
operationId = makeOperationId()
prepareForPrint(meta)
chrome.runtime.sendMessage({ WEBCLIP_GENERATE_PDF, meta, operationId })
```

Current worker then uses:

```text
sender.tab.id
normalizeOperationIdInput(message.operationId)
```

for both local and Yandex PDF paths.

There is no worker `admitUserOperation()`, no `clientRequestId`, no `physicalOperationId`, no exact selection receipt and no exact content probe.

## 2.4 Current metadata is mutable-page-derived

`buildSaveMeta()` reads current:

```text
location.hostname
location.origin
location.href
document.title
serializeSelectionSnapshot()
```

at call time.

Those values are useful data, but they are not authority. A later SPA transition or live DOM replacement can change the meaning of the same tab/document.

---

# 3. Controlled current-Chrome primitive receipt

A controlled unpacked MV3 extension fixture was executed on the exact current Stable target:

```text
Chrome for Testing 153.0.8010.36
```

Committed fixture:

```text
project_tools/run_a1_a2_chrome_document_id_fixture.js
```

Actual result:

```text
A1/A2 Chrome documentId fixture: PASS; cases=9
```

Observed exact values in that run:

```text
D1 = CD0F88FF4D839C2F1F38DEF66AE446E0
D2 = 4F34AD45CFB7C638B92B51B682924BF3

InjectionResult.documentId == sender.documentId before reload   PASS
InjectionResult.documentId == sender.documentId after reload    PASS
D1 != D2 after reload                                          PASS
exact send to old D1 after reload rejected                     PASS
exact send to current D2 succeeded                             PASS
sender.documentLifecycle == active                             PASS
sender.frameId == 0                                            PASS
```

Old-D exact routing failed with:

```text
Could not establish connection. Receiving end does not exist.
```

## Evidence interpretation

This is controlled L3 browser/API evidence for platform primitives only.

It proves that the current Chrome target supports the architecture WebClip needs:

```text
executeScript result -> exact documentId
runtime sender -> same documentId
exact tabs.sendMessage(documentId) -> exact current document
reload -> new documentId
old exact documentId does not auto-retarget
```

It does **not** prove WebClip production A1/A2 because current WebClip does not yet use these primitives in the target way.

---

# 4. A1 exact content authority model

A1 owns the content-realm proof that a Save click still refers to the exact reviewed page/selection.

It is not the physical operation owner; A2 owns P.

## 4.1 Authority domains

A1 needs all of these distinct values:

```text
browserDocumentId          trusted from Chrome/worker sender
contentRealmNonce          minted by current content realm

documentActivityGeneration
applicationGeneration
navigationTransitionGeneration
selectionRevision
selectionAuthorityId
selectionSnapshotSha256
```

Do not collapse them into one generic generation.

### `browserDocumentId`

Changes on full browser-document replacement/reload and is trusted from Chrome.

### `contentRealmNonce`

Distinguishes the installed isolated-world content instance inside one browser document.

This matters across extension update/reinjection behavior.

### `documentActivityGeneration`

Fences lifecycle incarnation such as BFCache/pagehide/pageshow transitions.

### `applicationGeneration`

Fences same-document application identity after SPA route/application replacement.

### `navigationTransitionGeneration`

Fences an in-progress or completed same-document navigation transition from a receipt issued before it.

### `selectionRevision`

Advances on any material Include/Exclude authority change.

### `selectionAuthorityId`

Opaque identity for the reviewed authority snapshot.

### `selectionSnapshotSha256`

Digest of the exact bounded reviewed snapshot payload captured at review.

It is not a substitute for private live-state checks.

---

# 5. Selection review receipt must capture payload once

An important refinement over a naïve digest implementation:

Do **not** do this:

```text
review -> issue receipt
prepareForPrint mutates representation
re-serialize live selection/locators
hash again
compare
```

because print preparation itself legitimately mutates attributes/layout/representation and may alter locator serialization inputs.

Preferred flow:

```text
user enters review/save choice
  ↓
serialize exact bounded SelectionSnapshot once
  ↓
canonicalize snapshot
  ↓
H = SHA-256(canonical snapshot)
  ↓
issue SelectionAuthorityReceipt R containing H
  ↓
retain exact snapshot payload S with R for this admission
```

Later live probes validate:

```text
same realm/generations/revision
selected live nodes still connected/admissible
same R identity
```

They do not manufacture a second authority from current mutable DOM.

## 5.1 Canonical digest

Do not hash arbitrary `JSON.stringify(snapshot)` without a stable canonical contract.

Recommended `SelectionAuthorityDigestV1`:

```text
version
mode/semantic schema
bounded include descriptors in canonical order
bounded exclude descriptors in canonical order
remote-frame selection descriptors with exact frame-session identity when W2 consumes them
```

Canonical order should be deterministic and independent of incidental JS object property insertion order.

If selection order is semantically meaningful in current rendering, encode that order explicitly; otherwise sort by stable receipt-local item identity.

The exact implementation should decide this from current `serializeSelectionSnapshot()` semantics during A1 PR, but must not silently switch between ordered-set and unordered-set meaning.

---

# 6. SelectionAuthorityReceipt V1

Conceptual shape:

```js
{
  version: 1,
  protocolVersion: 2,

  contentRealmNonce,
  selectionAuthorityId,

  documentActivityGeneration,
  applicationGeneration,
  navigationTransitionGeneration,
  selectionRevision,

  selectionSnapshotSha256,
  reviewedAt
}
```

The content script must not include a caller-asserted trusted `browserDocumentId` inside this object.

Worker attaches trusted sender/browser authority:

```js
SourceAdmissionReceipt {
  browserDocumentId,
  tabId,
  frameId: 0,
  documentLifecycle: 'active',
  selectionAuthority: R
}
```

---

# 7. Exact content probe

Target message:

```text
WEBCLIP_CONTENT_PROBE
```

Worker sends:

```js
chrome.tabs.sendMessage(tabId, request, { documentId: expectedDocumentId })
```

Request carries exact expected receipt R.

Content success requires all of:

```text
protocol current
contentRealmNonce exact
selectionAuthorityId exact
documentActivityGeneration exact
applicationGeneration exact
navigationTransitionGeneration exact
selectionRevision exact
selectionSnapshotSha256 exact
review authority still active
live selected nodes still connected/admissible
```

Failure returns bounded class such as:

```text
WEBCLIP_REVIEW_REQUIRED
WEBCLIP_DOCUMENT_STALE
WEBCLIP_SELECTION_STALE
WEBCLIP_CONTENT_PROTOCOL_STALE
```

A mismatch must never return a new receipt for automatic retarget.

---

# 8. SPA/application generation observation

A1 must not equate:

```text
same Chrome documentId
```

with:

```text
same application/selection authority
```

P0-080 explicitly requires a second layer.

Recommended content-owned observation contract:

```text
history.pushState / history.replaceState transition observation
popstate
hashchange where route semantics use it
selected/live-root disconnection observation
pagehide/pageshow lifecycle
```

The mechanism must remain isolated-world safe and must not trust host events as authorization.

## 8.1 What advances `applicationGeneration`

At minimum, a committed same-document route/application transition that can replace the meaningful page state advances application generation and revokes a reviewed receipt.

A random unrelated DOM mutation should not advance it.

## 8.2 What advances `selectionRevision`

Material changes to:

```text
Include set
Exclude set
restored selection authority
remote-frame selected set
selection clear/reset
```

advance selection revision.

A hover outline or modal text change does not.

---

# 9. U0 legacy/current content cutover

The prior A0/U0/J0 tranche found that current content has only a Boolean loaded sentinel.

A1 refines the transition:

```text
probe state before injection

ABSENT
  -> inject current bundle
  -> require current protocol info

CURRENT exact protocol
  -> reuse current realm

LEGACY / incompatible / ambiguous
  -> do NOT reinject over it
  -> fail stale/reload-review-required
```

Reason:

- current legacy realm has no safe global cleanup handshake for all listeners/private state;
- bypassing the Boolean can duplicate controls/listeners;
- respecting the Boolean leaves the old code running;
- neither state can be upgraded into current authority automatically.

Therefore:

```text
legacy content selection is not grandfathered into A1 authority
```

The user starts/reviews again in a fresh compatible document/realm.

---

# 10. Popup exact injection/start contract

Target `ensureTopContentScript(tabId)` becomes a document-bound protocol acquisition, not just a script injection call.

Preferred sequence:

```text
1. determine active tab and fail incognito/unsupported scheme as required
2. current-content probe if possible
3. if absent, execute current content bundle
4. require exactly one top-frame InjectionResult
5. capture InjectionResult.documentId = D
6. exact protocol probe/send to D
7. require current protocol/realm
8. return {tabId, documentId:D, protocolInfo}
```

Then start selection:

```js
chrome.tabs.sendMessage(
  tabId,
  {type:'WEBCLIP_START_SELECTION', protocolVersion:2},
  {documentId:D}
)
```

If D vanishes between steps:

```text
fail this attempt
```

Do not silently use a tab-wide send that can target D2.

The current-Chrome L3 fixture directly validates this primitive behavior.

---

# 11. A2 role: physical operation starts at worker admission

Current content currently mints an `operationId` and worker consumes it.

Target separation:

```text
clientCorrelationId   optional presentation/support continuity
clientRequestId       one caller admission request / dedup key
physicalOperationId   worker-only durable authority
```

Only worker mints P.

Caller values are never promoted to P.

---

# 12. Refined save sequence: admit before prepare

This tranche refines the earlier A1/A2 sequence to close the continuity gap during long content preparation.

## 12.1 Phase 1 — reviewed authority

Content is in reviewed state and captures:

```text
R = SelectionAuthorityReceipt
S = exact bounded selection snapshot payload
intent = local/yandex + reading mode + bounded user fields
clientRequestId = newly minted caller request identity
clientCorrelationId = optional display identity
```

No physical effect has started.

## 12.2 Phase 2 — A2 admission request

Content sends an admission-only request before `prepareForPrint()`:

```js
WEBCLIP_ADMIT_PDF_SAVE {
  protocolVersion: 2,
  clientRequestId,
  clientCorrelationId,
  destination,
  readingMode,
  selectionAuthorityReceipt: R,
  selectionSnapshot: S,
  bounded metadata intent
}
```

Worker:

1. verifies sender is trusted content;
2. requires top frame;
3. requires non-incognito;
4. requires `sender.documentId`;
5. requires `sender.documentLifecycle == active` where supplied;
6. exact-probes R back into **that same sender.documentId**;
7. derives source subject/fingerprint;
8. calls A0 `admitUserOperation()`;
9. returns exact P.

Return:

```js
{
  ok:true,
  physicalOperationId,
  clientRequestId,
  clientCorrelationId,
  sourceGenerationId / provisional source receipt as defined by P0-070,
  receiptRevision
}
```

## 12.3 Phase 3 — long preparation

Only after P exists:

```text
prepareForPrint(S / admitted intent)
```

Progress now carries P for functional identity; UI may still show compatibility alias during transition.

## 12.4 Phase 4 — pre-render re-probe

Before `Page.printToPDF` or equivalent render cut, worker requires:

```text
same P still active
same source receipt
same browserDocumentId D
same R exact content probe
```

If stale:

```text
terminalize/transition same P as failed-before-render / review-required
restore page representation
no P2
```

## 12.5 Why this ordering is better

It gives one durable continuity anchor across:

```text
resource preparation
content-side waits
worker restart after admission
render admission
later PDF cache generation
```

without falsely claiming that external/native effect has started.

---

# 13. Admission request fingerprint

For initial PDF operation, fingerprint must bind immutable user admission, not mutable later environment.

Recommended canonical input:

```text
operationKind
sender.documentId
contentRealmNonce
selectionAuthorityId
documentActivityGeneration
applicationGeneration
navigationTransitionGeneration
selectionRevision
selectionSnapshotSha256
destination class
readingMode
bounded admitted comment digest/value according to privacy owner
other immutable user Save intent
```

Do not include:

```text
current OAuth token
signed Yandex URLs
later current Yandex config
progress labels
random render diagnostics
mutable tab title unless product semantics make title immutable admission input
```

The later Yandex C0 context is its own authority domain.

---

# 14. `sourceGenerationId` ownership

A2 needs a stable source reference, but must not invent a second P0-070 identity system.

Preferred relationship:

```text
P = physical operation
S = SourceGenerationReceipt
P references S
S references trusted browser document + A1 receipt
```

Conceptual S:

```js
{
  version:1,
  sourceGenerationId,
  physicalOperationId,
  tabId,
  browserDocumentId,
  topFrameId:0,
  contentRealmNonce,
  documentActivityGeneration,
  applicationGeneration,
  navigationTransitionGeneration,
  selectionRevision,
  selectionAuthorityId,
  selectionSnapshotSha256,
  admittedAt
}
```

This is immutable after admission.

Later P0-079 PdfGenerationReceipt references S.

Do not use:

```text
tabId
URL
operationId
```

alone as source identity.

---

# 15. Same-request retry and lost admission response

`clientRequestId` is specifically required because worker admission response is not a transactional transport guarantee.

Schedule:

```text
content sends admission request C
worker commits P
response is lost / content sees timeout
content still owns exact same reviewed R and same C
content retries admission C
```

Required:

```text
same C + same fingerprint
-> return same P
```

Forbidden:

```text
mint P2 because first response was lost
```

If same clientRequestId arrives with a different immutable request:

```text
CLIENT_REQUEST_CONFLICT
```

Do not rebind C.

---

# 16. Worker restart after P admission

Schedule:

```text
P committed
worker dies
content still shows preparation/progress
new worker receives continuation/reconciliation
```

New worker uses A0 receipt + exact subject/receipt relationships.

It must not rely on an in-memory Promise created by the old worker.

Before continuing render:

```text
exact current document probe against S/R
```

If that document/realm no longer exists:

```text
same P -> review-required/evidence-limited terminal/pre-effect state
```

No new P is minted automatically.

---

# 17. Full reload after admission

The controlled Chrome fixture proves D changes and old exact D no longer receives the message.

Therefore schedule:

```text
P admitted for D1
page reload -> D2
late continuation tries exact probe D1
```

Required:

```text
probe fails
P does not retarget D2
no render under P against D2
user may start a new reviewed operation with new clientRequestId/P
```

This directly composes P0-070/P0-023/P0-079.

---

# 18. SPA transition after admission

Different schedule:

```text
P admitted for browser D1 / applicationGeneration A1
SPA transition occurs inside same D1 -> A2
```

`documentId` alone remains equal.

Required exact A1 probe sees generation mismatch and rejects continuation.

This is why A1 cannot be reduced to Chrome documentId.

---

# 19. Selection changes after admission

If user or restore workflow changes Include/Exclude after P admission but before render:

```text
selectionRevision changes
```

The original P remains tied to original R/S.

Do not silently update P to the new selection.

Possible UX:

```text
old P becomes failed-before-render/review-required
user confirms a new Save click -> new clientRequestId -> new P
```

This preserves user intent rather than auto-retargeting.

---

# 20. `passive-v8` Journal interaction

J0 migrates Journal schema before D0 CAS activation.

A2 may be implemented after J0 while Journal says:

```text
authorityMode = passive-v8
```

Allowed:

```text
create/read WebClipOperationReceipts P
issue A1 source receipt
perform exact source/render foundation work
use legacy Journal mutation semantics only where the staged plan explicitly preserves them
```

Forbidden:

```text
interpret presence of v8 stores as permission to use D0 Journal CAS semantics
```

Only controlled transition:

```text
passive-v8 -> cas-v1
```

activates D0.

This keeps A1/A2 rollout orthogonal to the Journal migration package.

---

# 21. Progress compatibility

During transition UI currently expects `operationId` strings.

Target functional identity:

```text
physicalOperationId = authority
clientCorrelationId = presentation/support only
```

Compatibility responses may temporarily include:

```js
{
  physicalOperationId,
  clientRequestId,
  clientCorrelationId,
  operationId: clientCorrelationId || physicalOperationId
}
```

But all internal progress routing after A2 should prefer exact P.

Never look up physical effect authority by compatibility alias if P is available.

---

# 22. Read-later and retry boundaries

## 22.1 Read Later

`read-later` currently starts via a tab-routed `WEBCLIP_COMMAND` and content performs auto-content/save flow.

A1/A2 must apply the same exact document/selection admission rules to the eventual physical save.

Auto-content may create selection state, but a physical operation is not authorized merely because a tab command existed.

## 22.2 Yandex retry

A Yandex retry against already sealed P0-079 bytes is a later operation class.

It must not pretend there is a current live content selection when recovery is actually bound to immutable PdfGenerationReceipt.

Therefore distinguish:

```text
live source admission path -> A1/A2 exact content receipt
exact cached operation recovery -> exact sealed generation / existing P lineage
```

Do not force all recovery through a current tab/content probe.

---

# 23. Relationship to P1-125 executeScript settlement

A1 popup injection consumes current `executeScript()` result documentId, but P1-125 remains broader:

```text
local caller timeout does not cancel actual executeScript
late success receipt must remain exact-document bound
```

The A1 current-Chrome fixture proves the documentId primitive, not crash-recoverable settlement.

Future production implementation should retain/extend P1-125 settlement tracking with:

```text
expected tabId
expected documentId / navigation identity
actual result documentId
protocol state
late settlement phase
```

A late script installation into D1 must never be consumed as current D2 installation after reload.

---

# 24. Relationship to W2 frame authority

A1 is top-document authority.

Cross-origin frame/session authority remains W2-owned.

A1 should reserve an additive frame-session digest/reference slot rather than duplicating W2:

```text
selection authority may later reference exact FrameSessionReceipt set
```

When W2 lands, any remote selected item must be exact child document/session bound.

Do not let top A1 `applicationGeneration` stand in for child frame generations.

---

# 25. Failure classification before physical effect

Recommended bounded terminal/pre-effect classes for same P:

```text
review-required-document-changed
review-required-application-changed
review-required-selection-changed
content-protocol-stale
content-realm-missing
prepare-failed
render-not-admitted
```

These are not external-effect `unknown` states because no non-cancellable physical effect has started yet.

Do not delete P merely because failure occurred before effect; P1-198/P1-210 need durable history for lost-response reconciliation.

---

# 26. Proposed implementation split

Do not implement A1/A2 as one giant patch.

## A1 PR — exact content/document authority

Production files expected:

```text
content.js
popup.js
possibly small protocol helper shared only if current repository style justifies it
```

A1 should implement:

- current protocol probe/info;
- content realm nonce;
- document/application/navigation/selection generations;
- reviewed SelectionAuthorityReceipt + exact snapshot digest;
- exact document start routing;
- exact worker/content probe primitive;
- legacy realm fail-closed transition;
- source-level/deterministic/current-Chrome regression.

A1 must **not** yet convert caller operationId into P unless A2 lands in same release package under an explicitly tested transition.

## A2 PR — physical operation admission

Production files expected:

```text
service-worker.js
content.js
possibly popup/progress compatibility glue
```

A2 should implement:

- admission-only PDF save request;
- `clientRequestId` lifecycle;
- worker `physicalOperationId` minting via A0;
- exact SourceGenerationReceipt;
- admit-before-prepare sequence;
- continuation/pre-render exact probe;
- same-request dedup;
- compatibility progress mapping;
- restart/lost-response source gates.

A2 must not implement P0-079 immutable PDF cache or Yandex exact content verification; those remain later DAG nodes.

---

# 27. A1 acceptance gates

Required deterministic/source gates:

1. legacy Boolean realm cannot report current v2 authority;
2. current protocol probe returns exact realm/generations;
3. popup captures `InjectionResult.documentId`;
4. start selection uses exact `documentId`;
5. full reload invalidates old exact document;
6. SPA generation change invalidates reviewed receipt;
7. BFCache/lifecycle generation change invalidates receipt;
8. selection change invalidates receipt;
9. detached selected nodes invalidate receipt;
10. exact snapshot payload is captured once at review;
11. digest canonicalization is deterministic;
12. no auto-retarget on mismatch;
13. incognito remains fail-closed;
14. cross-origin child authority remains W2 boundary.

Required physical current-Chrome gate should reuse/extend the documentId fixture and exercise the real unpacked WebClip content bundle once production code exists.

---

# 28. A2 acceptance gates

Required deterministic/source gates:

1. only worker mints P;
2. caller `operationId` never becomes P;
3. same clientRequestId + same fingerprint -> same P;
4. same clientRequestId + different fingerprint -> conflict;
5. P is durable before long prepare;
6. worker probes exact sender document before admission;
7. worker re-probes same receipt before render;
8. reload after P admission does not retarget;
9. SPA generation after P admission does not retarget;
10. selection revision after P admission does not retarget;
11. worker restart after P reuses same P;
12. prepare failure terminalizes/retains same P without external effect;
13. passive-v8 Journal remains passive;
14. progress compatibility alias cannot authorize mutation;
15. retry/recovery path distinguishes live source from sealed-generation recovery.

Production physical evidence should include at minimum:

```text
admit P -> kill/restart worker -> continue exact same source
admit P -> reload page -> reject old P continuation
admit P -> SPA transition -> reject old P continuation
lost admission response -> resend same clientRequestId -> one P
```

---

# 29. Research model receipt

Committed deterministic model:

```text
project_tools/test_a1_a2_change_impact_model.js
```

Actual execution:

```text
A1/A2 change-impact authority model: PASS; cases=35
```

The model covers:

- exact selection equality;
- document/realm/SPA/navigation/selection/lifecycle invalidation;
- live-node disconnect;
- clientRequest dedup/conflict;
- caller correlation vs P;
- lost response retry;
- intentional new attempt;
- legacy protocol boundary;
- prepare/refreeze prohibition;
- passive-v8 boundary;
- sender/top-frame/incognito constraints;
- fingerprint binding;
- cross-cutover schedules.

It is L2 research evidence only.

---

# 30. Current-Chrome receipt

Workflow execution used exact:

```text
run       34373597115
job       102540661397
commit    e14bc33d371237cceb1b512b62ac0d1ce12773b0
Chrome    153.0.8010.36
Ubuntu    24.04.5
Node      v22.23.2
```

Outputs:

```text
A1/A2 change-impact authority model: PASS; cases=35
A1/A2 current-source inventory: PASS; RED facts=28
A1/A2 Chrome documentId fixture: PASS; cases=9
```

Temporary workflow was deleted after receipt.

---

# 31. No new root cause

All discovered issues are compositions/refinements of existing owners:

```text
legacy content transition / source exactness -> P0-070/P0-080/P1-125/P1-209
worker physical identity                  -> P1-198/P1-210
Journal passive/cas boundary              -> P0-076/J0
```

Therefore:

```text
new P-code = NO
P1-231 = UNALLOCATED
```

---

# 32. Final implementation-readiness decision

After this tranche:

```text
A0/U0/J0 source contract                   = DEFINED
A1 exact content/source authority           = DEFINED
A2 physical operation admission             = DEFINED
current Chrome documentId primitive         = PROVEN in controlled fixture
production implementation                   = NOT STARTED
```

The next useful research tranche is no longer another generic authority design.

The next highest-value pre-implementation source work is:

```text
B1 / P0-079 immutable operation-owned PDF cache v4
```

with explicit A2 handoff:

```text
P + SourceGenerationReceipt
-> render attempt
-> sealed PdfGenerationReceipt
-> exact offscreen read/upload by pdfGeneration
```

That tranche should specifically inspect worker/offscreen shared DB migration, create-once payload+metadata atomicity, SHA-256 sealing before external admission, legacy v3 `tab:<id>` handling and exact generation handoff to local download/Yandex paths.
