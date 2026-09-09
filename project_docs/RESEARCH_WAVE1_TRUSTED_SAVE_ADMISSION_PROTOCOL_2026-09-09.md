# WebClip — Wave 1 trusted save-admission and render-generation protocol — 2026-09-09

Date: 2026-09-09  
Canonical production baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Research branch: `research/wave1-save-admission-protocol-2026-09-09`  
Mode: **RESEARCH-ONLY / IMPLEMENTATION-READINESS**  
Primary owners composed: **P0-080, P0-070, P1-198**.  
Mandatory adjacent composition: **P0-023, P0-045, P0-066, P0-071, P0-079, P0-076, P1-125, P1-154, P1-171, P1-172, P1-184, P1-194, P1-200, P1-210, P1-218/P1-219/P1-224**.

This checkpoint does not modify production runtime, `manifest.json`, Registry status, release readiness, version, build, tag, GitHub Release or deployment.

## 1. Purpose

The preceding Wave 1 work defined the end-to-end saved-artifact authority graph and then made the P0-079 immutable PDF-cache tranche implementation-ready.

The unresolved upstream question is now narrower and more important:

> What exact authority crosses from the user's reviewed live selection into the service worker, survives the asynchronous preparation/render window without retargeting, and becomes the exact provenance of the immutable PDF generation `{G,N,H}`?

Three existing owners meet at this boundary:

- **P0-080** — same-document application generation, selection revision and live selected-DOM authority;
- **P0-070** — exact full-document generation from command admission through render and downstream provenance;
- **P1-198** — worker-issued physical operation identity; caller `operationId` is correlation metadata only.

The protocol must preserve all three rather than creating one overloaded identifier.

## 2. Canonical source proof

### 2.1 Current content state has no explicit application/selection generation

Current `content.js` keeps long-lived state including:

```text
state.includes = new Map()
state.excludes = new Map()
state.remoteFrames
state.pageUploadActive
state.pageUploadOperationId
```

There is no production `applicationGeneration`, `documentActivityGeneration`, `selectionRevision`, `contentRealmNonce` or exact selection-authority receipt.

P0-080 research already proved that this allows a fresh route/URL to be combined with stale selected DOM references.

### 2.2 Current save sends after long asynchronous preparation without revalidating a prior receipt

Current local flow is conceptually:

```text
meta = reviewed save metadata
await prepareForPrint(meta)
chrome.runtime.sendMessage({
  type: 'WEBCLIP_GENERATE_PDF',
  meta,
  operationId
})
```

Yandex has the same shape with `WEBCLIP_SEND_PDF_TO_YANDEX`.

`prepareForPrint()` may wait for resources and frame preparation. A route, selection or selected-frame generation can change during those awaits.

The target must validate the **same previously reviewed receipt** after preparation and immediately before the irreversible worker command. It must not silently generate a new receipt from whatever state happens to be current at the end.

### 2.3 Current worker receives stronger browser identity than it uses

Chrome's `MessageSender` can provide:

```text
sender.tab.id
sender.frameId
sender.documentId
sender.documentLifecycle
```

The current full-save path ultimately reduces authority to tab-oriented helpers and does not retain an exact top-document source receipt through render.

This creates the P0-070 schedule:

```text
content document A sends save
worker remembers tab N
N navigates to document B
Page.printToPDF targets tab N
B bytes can be combined with A metadata
```

### 2.4 Current popup also has an earlier injection/start retarget window

`popup.js` currently calls:

```js
chrome.scripting.executeScript({
  target: { tabId },
  files: [..., 'content.js']
})
```

but discards the returned `InjectionResult.documentId`.

It then sends `WEBCLIP_START_SELECTION` / `read-later` by tab without exact `documentId` targeting.

Therefore navigation between successful injection and the subsequent start message can retarget that start to a newer document.

This is not the main save-render race, but it is an upstream continuity defect in the same authority chain. It composes with P1-125 rather than receiving a new owner.

## 3. 2026-09-09 Chrome platform refresh

External platform evidence is comparison/input evidence. GitHub production source remains canonical WebClip truth.

Official current Chrome documentation confirms:

1. `runtime.MessageSender.documentId` is available from Chrome 106 and is a UUID of the sending document.
2. `runtime.MessageSender.documentLifecycle` is available from Chrome 106. The lifecycle snapshot may later change, so it is admission evidence, not a permanent lock.
3. `DocumentLifecycle` values include `prerender`, `active`, `cached`, `pending_deletion`.
4. `tabs.sendMessage(tabId, message, { documentId })` can target an exact document from Chrome 106.
5. `scripting.executeScript()` returns `InjectionResult.documentId`, and `InjectionTarget.documentIds` can target exact documents from Chrome 106.
6. Current WebClip minimum Chrome is 118, so no new minimum version is required for these primitives.
7. Chrome's instant-navigation documentation warns that `frameId == 0` alone is not a universal outermost-frame test in a tab containing prerendered pages. User-visible admission should therefore compose active lifecycle with the intended top-level sender contract.
8. CDP Page exposes `getFrameTree`, `frameStartedNavigating`, `frameNavigated`, `navigatedWithinDocument`, `frameDetached` and `printToPDF`.
9. `frameStartedNavigating` may fire even if a navigation is later cancelled. For archive correctness the simplest safe contract is to treat a protected root navigation start as monotonic stale evidence for that render attempt.
10. `pageshow/pagehide` with `event.persisted` are the standard bfcache observation signals. A document can leave the active page and later return without a new application-level selection review.

Official references:

- https://developer.chrome.com/docs/extensions/reference/api/runtime
- https://developer.chrome.com/docs/extensions/reference/api/extensionTypes
- https://developer.chrome.com/docs/extensions/reference/api/tabs
- https://developer.chrome.com/docs/extensions/reference/api/scripting
- https://developer.chrome.com/blog/extension-instantnav
- https://developer.chrome.com/docs/extensions/reference/api/debugger
- https://chromedevtools.github.io/devtools-protocol/tot/Page/
- https://web.dev/articles/bfcache

No new `webNavigation` permission is justified by this protocol.

## 4. Authority taxonomy — do not collapse these identifiers

The protocol needs several separate generations because they answer different questions.

### 4.1 Client correlation id

```text
clientOperationId
```

Source: UI/caller `operationId`.

Meaning:

- diagnostics/progress correlation;
- may repeat;
- may be absent;
- not ownership;
- not physical liveness;
- not source identity;
- not idempotency capability.

### 4.2 Worker physical operation identity — P1-198

```text
physicalOperationId
```

Source: minted by service worker after trusted new-operation admission.

Meaning:

- one physical execution instance;
- unique even if two client requests reuse the same correlation string;
- namespaces live operation-owned resources;
- may be carried into durable recovery where that domain requires it;
- still does not replace domain-specific leases/CAS/effect receipts.

### 4.3 Content realm nonce

```text
contentRealmNonce
```

Source: one opaque UUID per actual isolated-world `content.js` lifetime.

Meaning:

- distinguishes re-injection/new content realm state;
- prevents a later content realm from accidentally satisfying an old review receipt merely because counters restarted at 1;
- does not replace browser `documentId`.

### 4.4 Document activity generation

```text
documentActivityGeneration
```

Source: monotonic content-side generation.

Advance/invalidate on a document activity boundary relevant to old user authority, including:

```text
pagehide
pageshow where persisted === true
```

The exact implementation can increment once at pagehide and again on bfcache return; equality to the old receipt is what matters.

Do **not** increment merely because:

- the tab becomes background;
- an unrelated DOM mutation occurs;
- a timer fires;
- an unselected child changes.

Purpose: prevent active A -> bfcache/cached -> active A from automatically resurrecting an old review receipt under the same browser documentId and URL.

### 4.5 Application/navigation transition generation — P0-080

```text
applicationGeneration
navigationTransitionGeneration
```

Advance on observed same-document application/current-entry transition.

It composes with:

```text
navigation.currentEntry.id
current bounded href
```

The monotonic generation remains necessary because A -> B -> Back(A) can return to an earlier entry id/URL.

### 4.6 Selection revision — P0-080

```text
selectionRevision
```

Advance whenever the authority-bearing Include/Exclude scope changes through user action, explicit restore/reapply, or selected remote-frame scope change as defined by its owner.

A review opened under R1 cannot commit R2 accidentally.

### 4.7 Worker source-generation identity — P0-070

```text
sourceGenerationId
```

Mint after the worker has validated the sender envelope and the content review receipt.

Meaning:

- identifies one admitted full-document source generation for downstream provenance;
- references the exact browser document + content authority axes;
- distinct from physicalOperationId because one physical workflow may own multiple bounded attempts/reconciliations, and source identity should remain semantically explicit.

### 4.8 Render attempt identity

```text
renderAttemptId
```

Mint for each debugger/render-fence attempt.

Meaning:

- owns one debugger event listener/fence lifecycle;
- late events from attempt A cannot poison attempt B;
- supports clean attach/listener/detach ownership.

### 4.9 PDF generation — P0-079

```text
pdfGeneration = G
byteLength = N
sha256 = H
```

Mint/commit only after a successful guarded render and clean source fence.

Meaning:

- `G` is exact immutable object identity;
- `N/H` identify/integrity-check the exact Chromium bytes;
- later live-page changes do not alter G.

## 5. Content-side reviewed selection receipt

The review UI must snapshot an immutable receipt **before** long preparation begins.

Conceptual structure:

```js
selectionAuthorityReceipt = {
  version: 1,
  contentRealmNonce,
  documentActivityGeneration,
  applicationGeneration,
  navigationTransitionGeneration,
  currentEntryId,
  href,                    // live bounded evidence; durable handling follows P0-066
  selectionRevision,
  selectedChildGenerations // bounded exact P1-171/P1-200 receipts/references
};
```

The receipt is not a clone of all DOM data. It names the authority state that the user reviewed.

## 6. Final content validation after `prepareForPrint()`

Target ordering:

```text
1. user selects/reviews scope
2. issue immutable selectionAuthorityReceipt R
3. build bounded metadata under R
4. await prepareForPrint(...)
5. validate exact same R against current content state
6. only if valid -> send save command carrying R
```

The validation must re-check at least:

- same `contentRealmNonce`;
- same `documentActivityGeneration`;
- same `applicationGeneration`;
- same `navigationTransitionGeneration`;
- current Navigation entry evidence;
- bounded current href as required by the live receipt;
- same `selectionRevision`;
- every authority-bearing selected local root is connected and owned by the current document;
- every selected child-frame/session receipt remains exact/current under its owner.

Failure result:

```text
selection-stale / review-required
```

Forbidden repair:

```text
old receipt stale
-> silently build fresh receipt from current state
-> continue old save action
```

That would change what the user reviewed.

## 7. Boundedness dependency — P1-154

The final selected-root validation must not turn into an unbounded scan over attacker/page-controlled selection data.

P1-154 owns the aggregate Include/Exclude count/byte budget. Until that owner is implemented, the P0-080 validator still needs a bounded fail-closed envelope for the roots it checks.

This protocol does not absorb P1-154. It records a mandatory dependency:

```text
exact authority proof
AND
bounded authority proof
```

are both needed before claiming closure.

## 8. BFCache/activity refinement

Browser `documentId` alone is not a sufficient "user reviewed this active incarnation" proof.

Schedule:

```text
D = browser document A
user reviews selection under activity generation K1
pagehide / document moves toward bfcache
later pageshow persisted=true / same document D restored
URL and selected DOM may still look identical
old review action remains in JS state
```

Without an activity generation, equality on `documentId + href + selectionRevision` could revive K1 automatically.

Required rule:

```text
any activity transition invalidates a pre-transition review receipt
```

The user can explicitly review/re-admit under the new activity generation.

## 9. Upstream injection/start continuity

The project already obtains an exact document identity from `chrome.scripting.executeScript()` results, but `popup.js` currently discards it.

Preferred future shape:

```text
InjectionResult for top frame
-> injectedDocumentId D
-> tabs.sendMessage(tabId, WEBCLIP_START_SELECTION, {documentId: D})
```

The same applies to `read-later` startup where a new content-script injection immediately precedes a command.

If navigation occurs between injection and the exact message:

```text
message to D fails
-> do not silently retarget to new D2
```

A fresh user action may inject/start on D2 explicitly. An in-progress old authority may not.

This composes with P1-125's exact-document execution/injection receipt rather than defining another injection owner.

## 10. Worker admission envelope

When `WEBCLIP_GENERATE_PDF` / `WEBCLIP_SEND_PDF_TO_YANDEX` reaches the service worker, browser-provided sender fields are the trust boundary for browser document ownership.

Minimum admission checks:

```text
sender.tab.id exists
sender.documentId exists
sender.documentLifecycle === 'active'
sender.frameId === 0 for the active top-level user-save contract
source URL/product contract is http(s)
incognito is rejected before persistent authority (P0-045)
content selection receipt is structurally bounded and valid
```

Why compose `active + frameId===0`?

Chrome documents that prerendered outermost pages can have nonzero frameId. Therefore frameId alone is not a universal outermost detector. This product is admitting a user-visible save from the currently active top page, so non-active lifecycle is rejected first and frameId 0 is then the expected active-top sender contract.

`documentLifecycle` is a snapshot. It must not be treated as proof that the document remains active through the render window.

## 11. Caller document fields are never browser authority

If message/meta contains values such as:

```text
documentId
frameId
tabId
```

they are diagnostics at most.

Forbidden:

```js
expectedDocumentId = message.documentId || sender.documentId;
```

Required:

```text
browserDocumentId = sender.documentId
browserFrameId = sender.frameId
browserTabId = sender.tab.id
```

Any duplicate caller fields may only be compared as additional consistency signals and never override the sender envelope.

## 12. Mint physical and source identities only after trusted admission

Once sender + content receipt pass:

```js
operationContext = {
  physicalOperationId: issueWorkerPhysicalId(),
  clientOperationId: normalizeClientCorrelation(message.operationId),
  sourceGenerationId: issueWorkerSourceGeneration(),
  browserDocumentId: sender.documentId,
  tabId: sender.tab.id,
  selectionAuthorityReceipt
};
```

Two requests with:

```text
clientOperationId = "same"
```

must still get different:

```text
physicalOperationId
sourceGenerationId
```

## 13. Exact-document source probe must use the existing content realm

Primary probe:

```js
chrome.tabs.sendMessage(
  tabId,
  { type: 'WEBCLIP_SOURCE_AUTHORITY_PROBE', expectedReceipt: ... },
  { documentId: expectedBrowserDocumentId }
)
```

Why this is preferred over `executeScript({documentIds:[...]})`:

- `executeScript` can prove that a document exists;
- it cannot directly inspect the private closure state of the already-running `content.js` IIFE where application/selection generations and selected root references live;
- exact content messaging can ask the actual old content realm to compare a previously issued receipt to its current private authority state.

`executeScript(documentIds)` remains useful as an exact-document liveness primitive elsewhere, but it is not sufficient as the full P0-080 probe.

## 14. Probe miss must not auto-reinject

If exact probe for admitted document D fails:

```text
D no longer reachable
```

Forbidden recovery:

```text
inject fresh content.js into current tab document D2
-> ask D2 for a fresh receipt
-> continue old operation
```

That is retargeting, not recovery.

Result must be:

```text
stale/review-required
zero Page.printToPDF
zero new sealed PDF generation
zero new external effect
zero Journal success
```

The user may start a fresh operation on D2.

## 15. Why one pre-render probe is insufficient

Race:

```text
Probe A for D succeeds
D changes after probe
worker attaches debugger by tabId
Page.printToPDF can hit newer source
```

Therefore P0-070 needs a render-window monitor plus a second exact probe after that monitor is armed.

## 16. Recommended Probe A / fence / Probe B / print / Probe C sequence

Conservative target:

```text
worker admission S

Probe A:
  exact tabs.sendMessage(documentId=D)
  validate same selectionAuthorityReceipt

attach debugger to tab
register operation-local onEvent + onDetach
Page.enable
Page.getFrameTree
capture root frameId + root loaderId
arm renderAttemptId fence

Probe B:
  exact tabs.sendMessage(documentId=D)
  validate same receipt again

existing P0-071 guarded Page.printToPDF
+ exact streaming N/H collection

require navigation/debugger fence clean
require P0-071 guard/cleanup clean

Probe C (conservative):
  exact D receipt validation immediately before byte acceptance

only then:
  mint/commit P0-079 pdfGeneration G
  bind G -> sourceGenerationId + physicalOperationId + N + H
```

### Probe A purpose

Reject obvious stale source before debugger mutation/attachment work.

### Probe B purpose

Close the race between Probe A and monitor arming.

### Probe C purpose

Close any content-authority drift after the guarded physical print returned but before bytes are accepted into the immutable source-provenance chain.

Probe C is intentionally conservative. It can reject a render whose physical cut may have completed just before a later route transition. That is an availability cost, not silent corruption. A future optimization could narrow the byte-acceptance cut only with stronger physical proof; current implementation should prefer correctness.

## 17. CDP root identity as positive control

After `Page.enable`, call:

```text
Page.getFrameTree
```

Capture:

```text
rootFrameId
rootLoaderId
```

These values do not replace Chrome extension `documentId` or P0-080 application generation. They are render-session evidence for deciding which debugger events affect the protected root.

## 18. Fatal render-window events

For the captured root frame and current render attempt, the simplest fail-closed rules are:

### 18.1 `Page.frameStartedNavigating`

Any root navigation start after fence arming and before byte acceptance:

```text
render attempt stale
```

Even if later cancelled.

### 18.2 `Page.frameNavigated`

A root `loaderId` change:

```text
cross-document source replacement
-> stale
```

### 18.3 `Page.navigatedWithinDocument`

Any protected root same-document navigation:

```text
P0-080 application generation may have changed
-> stale
```

### 18.4 `Page.frameDetached`

Root detach/swap:

```text
source/render target lost
-> stale
```

### 18.5 debugger `onDetach`

Detach before byte acceptance:

```text
render settlement unknown/invalid
-> no byte acceptance
```

The listener must be scoped by `renderAttemptId`/physical operation so a late event from attempt A cannot mutate attempt B.

## 19. Child-frame event scope

Do not fail every top-level render merely because any child navigates.

Negative control:

```text
unselected child frame changes
-> top-level source receipt may remain valid
```

Selected child content is different:

```text
selected child exact document/session generation changes
-> its P1-171/P1-200 authority becomes stale
-> aggregate selection receipt becomes stale
```

P0-070 consumes that result. It does not invent a competing child-frame generation model.

## 20. Existing P0-071 guard remains mandatory

P0-070 must wrap around, not replace, the DONE P0-071 render guard.

The guarded print cut already owns:

- page script freeze;
- bounded unsafe link sanitization;
- actual `Page.printToPDF` call;
- restore/cleanup failure behavior.

Target composition:

```text
P0-070 source fence
  around
P0-071 guarded physical render
```

A perfectly sanitized PDF of the wrong document is still wrong. Conversely a correct document rendered without the P0-071 safety guard would regress a closed owner.

## 21. Byte acceptance and one-pass digest

The Wave 1 readiness tranche already established that current `generatePdfBlob()` reads `Page.printToPDF` via `ReturnAsStream` and decodes chunks before building the Blob.

The integrated target should produce:

```js
renderedPdf = {
  blob,
  byteLength: N,
  sha256: H
};
```

by updating incremental SHA-256 over those same decoded chunks.

Do not re-read/re-hash a second full 48 MiB Blob solely to create H.

## 22. Handoff to P0-079

Only after:

```text
Probe A PASS
+ Probe B PASS
+ render fence clean
+ P0-071 guard/cleanup PASS
+ Probe C PASS
+ exact N/H known
```

may a PDF generation be admitted:

```js
pdfGenerationReceipt = {
  generation: G,
  ownerPhysicalOperationId,
  sourceGenerationId,
  byteLength: N,
  sha256: H,
  sealed: true
};
```

Once G is sealed:

- later tab navigation does not invalidate G;
- retry does not rerender the current tab;
- P0-023 provenance decides whether a live-page "retry current source" may discover G;
- restart recovery may consume exact G through its durable receipt without needing the source page to still exist.

## 23. Local vs Yandex paths

Local and Yandex initial saves should share the same trusted admission/render pipeline through exact G/N/H.

Destination-specific behavior begins **after** byte authority exists.

This avoids two subtly different definitions of "which page was saved" between local and Yandex paths.

## 24. Restart boundary

The live content review receipt is useful only while the exact source document exists.

Do not attempt after MV3 restart to recreate live source authority from:

```text
clientOperationId
URL
tabId
filename
```

If render had not produced/sealed G before restart and no exact live operation can be reconciled under the relevant owner, the old live render attempt is not resumable by retargeting.

If exact G already committed, recovery is no longer a live-render problem; it consumes durable downstream receipts.

## 25. Progress identity and P1-210

Current content progress UI correlates messages using caller `operationId`.

After P1-198, progress should distinguish:

```text
clientOperationId     // presentation/correlation
physicalOperationId   // exact physical run
```

The worker can return/publish the physical id after admission. Subsequent progress from that run should carry it.

However knowledge of `physicalOperationId` does not itself authorize mutation/retry. P1-210 remains owner for a lost/rejected outer response: UI should reconcile a worker-issued durable receipt read-only rather than blind-starting a new operation.

## 26. Incognito boundary — P0-045

A private source must fail closed before the protocol persists:

- source provenance;
- PDF cache generation;
- Journal state;
- Yandex recovery checkpoint;
- normal-profile OperationLog state that would leak private source details.

P0-045 remains owner. This protocol simply places the check before physical/source generation becomes durable.

## 27. URL privacy/durability — P0-066

Raw live href is useful as a same-process comparison signal during P0-080 admission.

It must not automatically become durable provenance unchanged.

Durable source receipts should carry only the URL/display identity allowed by P0-066's sanitizer/contract. Exact authority must rely on generations/document identity rather than persisting secret-bearing raw URLs to reconstruct trust later.

## 28. Metadata pre-IPC bounds — P1-172

The selection authority receipt is deliberately compact, but save metadata can still be page/user controlled.

P1-172 remains mandatory:

```text
content-side pre-IPC bounds/sanitization
+
worker authoritative second boundary
```

The trusted sender envelope does not make arbitrary `message.meta` trusted.

## 29. Rollback owners remain orthogonal

P1-218/P1-219/P1-224 own exact compare-before-restore semantics for temporary print mutations.

If source fencing aborts a render attempt, cleanup still must respect those owners. "Source stale" is not permission to blindly restore page state using stale snapshots.

## 30. Important implementation-order correction

The previous Wave 1 readiness sequence placed P0-079 storage mechanics first. That remains mechanically possible, but this admission research clarifies the semantic cutover rule.

### Unsafe temporary state

```text
v4 pdf:<G> exists
but G.ownerOperation / source provenance are populated from provisional caller/tab fields
and exact retry is enabled as if trusted
```

This would give stronger-looking storage a false authority claim.

### Safe option A — preferred

```text
1. introduce pure identity/receipt primitives
2. implement P1-198 physical operation admission for save path
3. implement P0-080 reviewed content receipt + exact worker handoff
4. implement P0-070 Probe A/B/C + render fence
5. enable P0-079 v4 to consume the real physical/source ids
6. enable exact retry/recovery semantics
```

### Safe option B — staged storage mechanics

P0-079 v4 mechanics may land earlier only if:

```text
new rows are explicitly provisional/untrusted for operation/source semantics
exact source retry/recovery remains disabled or fail-closed
no owner is marked DONE
```

Then upstream trusted admission fills the semantic gap before exact retry is enabled.

Therefore the earlier "storage first" recommendation is refined, not silently discarded:

> storage mechanics may be first; trusted product semantics may not be enabled before upstream authority exists.

## 31. Proposed smallest production tranches

### Tranche A — pure identity helpers / P1-198 save-path admission

Touch only enough worker code/tests to establish:

```text
clientOperationId != physicalOperationId
fresh physical id at save admission
sourceGenerationId primitive
```

Do not broadly rewrite every project operation in the same PR unless P1-198 closure explicitly requires it.

### Tranche B — content authority / P0-080

Add:

```text
contentRealmNonce
documentActivityGeneration
application/navigation generation
selectionRevision
review receipt
post-prepare final validation
exact source-probe message handler
```

Include bounded root checks and selected child receipt composition.

### Tranche C — exact injection/start continuity

Preserve `InjectionResult.documentId` and address immediate start/read-later messages to that document.

### Tranche D — P0-070 worker source/render fence

Add:

```text
sender lifecycle/document/frame admission
Probe A
operation-local debugger fence
Page.getFrameTree root/loader receipt
Probe B
P0-071 guarded print
Probe C
source-provenance handoff
```

### Tranche E — P0-079 v4 semantic activation

Consume real:

```text
physicalOperationId
sourceGenerationId
G/N/H
```

and enable exact retry only after the upstream authority is real.

## 32. Acceptance matrix

The accompanying deterministic model covers 21 core schedules.

### A01 stable active top source

Expected: exactly one admitted physical operation, one source generation and one sealed PDF generation.

### A02 same client correlation twice

Expected: distinct physicalOperationId and sourceGenerationId.

### A03 non-active document lifecycle

`prerender`, `cached`, `pending_deletion` -> reject before source admission.

### A04 child-frame save sender

Active child sender -> reject as top-level save authority.

### A05 incognito source

Fail closed before persistent normal-profile authority.

### A06 same URL / replaced browser document

Exact Probe A misses old document -> zero print/effects.

### A07 same document / SPA transition

Old application generation -> reject.

### A08 route ABA

A -> B -> A does not revive old receipt.

### A09 selection revision drift

R1 review cannot commit R2.

### A10 disconnected selected root

Reject even if href/documentId unchanged.

### A11 BFCache/activity ABA

Same browser document/URL after pagehide+bfcache return cannot revive old receipt.

### A12 transition after Probe A before fence

Probe B rejects before print.

### A13 root navigation start during protected render

Reject even if navigation later cancels.

### A14 same-document root navigation during render

Reject returned bytes.

### A15 root loader replacement

Reject returned bytes.

### A16 root frame detach/swap

Reject returned bytes.

### A17 debugger detach

Reject byte acceptance.

### A18 unselected child transition

Negative control: does not by itself invalidate top source.

### A19 selected child generation changes

Reject aggregate selection authority.

### A20 late app drift after print before byte acceptance

Conservative Probe C rejects.

### A21 post-seal live navigation

Exact sealed G remains immutable and is not rerendered.

## 33. Deterministic L2 model

Committed model:

```text
project_tools/test_wave1_save_admission_protocol_model.js
```

Local execution before GitHub write:

```text
Node v22.16.0
Wave 1 trusted save-admission protocol model: PASS
cases=21
```

`node --check` also passed.

This is L2 architecture/model evidence only. It is not production-source GREEN, real-Chrome L3 closure or owner DONE.

## 34. Future physical Chrome evidence

Before P0-080/P0-070 closure, physical unpacked-Chrome evidence should prove at least:

1. same-document Navigation API route transition invalidates old review selection;
2. route ABA does not revive old receipt;
3. disconnected selected root cannot save;
4. BFCache return requires new review/admission;
5. exact `documentId` start/probe does not retarget after reload;
6. navigation between Probe A and B rejects before `Page.printToPDF`;
7. navigation during real guarded print causes returned bytes to be discarded;
8. unselected child navigation negative control still succeeds;
9. selected child generation change fails correctly;
10. P0-071 physical render/link-safety regression remains PASS;
11. accepted stable render records one exact G/N/H provenance;
12. navigation after seal does not change bytes used by retry.

## 35. Source gate direction

A separate RED source gate is added in this branch. It should become GREEN only when production visibly contains the protocol, including:

- content realm/activity/application/selection generations;
- `pagehide` / persisted `pageshow` invalidation;
- final exact receipt validation after `prepareForPrint()` and before both save message types;
- exact content-source probe handler;
- worker physical/client ids separated;
- worker sender `documentId`, lifecycle and active-top contract;
- exact `tabs.sendMessage(...,{documentId})` probes;
- operation-local debugger `onEvent` + `onDetach` fence;
- `Page.getFrameTree` root/loader capture;
- root navigation/detach event coverage;
- byte acceptance before P0-079 only after clean fence;
- source generation + render attempt + G/N/H provenance;
- no new `webNavigation` permission solely for this protocol.

The current `main` is intentionally RED. Do not create a workflow merely to demonstrate expected RED.

## 36. Ownership / no new P-code decision

No new P-code is warranted.

New observations map to existing owners:

- BFCache/activity generation -> P0-080/P0-070 refinement;
- sender lifecycle admission -> P0-070 trusted source boundary;
- exact injection/start document binding -> P1-125 + P0-080 composition;
- client vs physical identity -> P1-198;
- selected child generations -> P1-171/P1-200;
- bounded selected-root proof -> P1-154 dependency;
- raw URL durability -> P0-066;
- lost response/reconciliation -> P1-210;
- post-render exact bytes -> P0-079/P0-023;
- content proof for remote adoption -> P1-184 downstream.

Creating P1-231 would duplicate existing ownership and is therefore prohibited by the Registry allocation rule.

## 37. Current status

```text
DEEP-RESEARCH-COVERAGE-COMPLETE = YES

Wave 1 trusted save-admission protocol = DEFINED
L2 deterministic protocol model = PASS (21 cases)
Production source gate = DEFINED / CURRENT MAIN EXPECTED RED

P0-080 = ACTIVE
P0-070 = ACTIVE
P1-198 = ACTIVE
P0-079 = ACTIVE
P0-023 = ACTIVE

P1-231 = NOT ALLOCATED
production runtime = UNCHANGED
manifest = 0.9.8 / UNCHANGED
Registry = UNCHANGED
release = NOT READY
```

The next research unit after this protocol is the **operation-context cutover and compatibility plan**: how to introduce worker-issued physical/source ids without breaking existing progress UI, OperationLog, pending local downloads, current Yandex checkpoints and manual retry surfaces, while keeping old correlation ids readable but non-authoritative.
