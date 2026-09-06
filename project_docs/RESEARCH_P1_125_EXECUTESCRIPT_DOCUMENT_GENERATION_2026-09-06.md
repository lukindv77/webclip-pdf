# P1-125 — `scripting.executeScript()` late success must remain document-generation bound

Date: 2026-09-06
Baseline: `main` = `d4f5b268fa3f7ced5a7bc68da52784863d614138`
Status authority: `project_docs/RESEARCH_REGISTRY.md`
Scope: research only; runtime/manifest/Registry unchanged.

## Registry owner

P1-125 remains ACTIVE. The exact Registry contract is:

> `executeScript` late-success receipt must be exact document generation bound; same-URL reload cannot consume old-document injection receipt.

This owner is not a generic timeout problem. It is the authority of an actual Chrome side effect that may complete after WebClip's bounded caller stopped waiting.

## Fresh source proof

### Positive control: WebClip does not blindly start duplicate injections while Chrome is still pending

`executeScriptSingletonBounded()` maintains `scriptExecutionSettlements`. When a logically identical injection is already still executing, callers wait for that actual settlement instead of starting an immediate duplicate.

This is an important bounded-side-effect control and should remain.

### Current late-success retention

When the caller-side deadline wins but Chrome later resolves the underlying `scripting.executeScript()`, the settlement entry stores:

```text
hasLateSuccess = true
lateSuccess = result
```

for a bounded late-success TTL.

On the next logically matching request, `executeScriptSingletonBounded()` currently does:

```text
if (existing.hasLateSuccess) {
  const result = existing.lateSuccess;
  clearScriptExecutionSettlement(...);
  return result;
}
```

The stored result is therefore promoted to present success without re-proving which document generation it affected.

### Current request keys are tab/logical-operation based

The high-value callers supply explicit keys such as:

```text
content:<tabId>
frame-agent:<tabId>:all
```

These keys remain identical across a same-URL reload in the same tab.

The fallback request-key builder likewise primarily describes the injection target shape (tab/frame ids/files), not a browser document generation.

### `ensureWebClipContentScript()` exact race

1. Tab 9 currently displays document A.
2. WebClip starts `executeScript({target:{tabId:9}, files:['content.js']})`.
3. WebClip's bounded wait times out; actual Chrome operation remains pending.
4. Chrome later succeeds in A. `InjectionResult.documentId` is A.
5. A same-URL reload replaces A with document B in the same tab.
6. A later `ensureWebClipContentScript(9)` uses the same logical key `content:9`.
7. Current code consumes the retained late success from A and returns it as success.
8. B may not contain WebClip content script at all, but the caller believes injection succeeded for the current page.

Textual URL equality cannot detect this because the URL may be identical.

### `enableFrameAgentsForTab()` has the same class of problem

The all-frames injection uses a logical key equivalent to `frame-agent:<tabId>:all`.

A late `InjectionResult[]` belongs to the exact set of top/child documents into which Chrome actually injected. A later same-tab frame tree may contain replacement documents while the logical key stays identical.

Reusing the old result as current all-frame success can therefore misstate which documents actually contain the frame agent.

## Browser evidence available at current minimum version

The project minimum is Chrome 118.

Chrome's `chrome.scripting.InjectionResult` includes `documentId` from Chrome 106. `InjectionTarget.documentIds` is also available from Chrome 106. Therefore the late result already contains the browser evidence needed to bind success to physical document generations; the current runtime simply does not use it as authority.

This owner does not require raising the current minimum Chrome version solely for document generation identity.

## Core rule: late success is a settlement receipt, not reusable current authority

A result arriving after the caller deadline may prove only:

> Chrome executed this injection in these exact document generation(s).

It does **not** prove:

> the current page/frame generation still equals those documents.

The late receipt can be:

- retained diagnostically;
- used to avoid duplicate start while the original Chrome call is still actually pending;
- reconciled against an exact expected/current document generation;
- or discarded as future authority once the actual call settles.

It must never be consumed solely because `tabId`, URL, frame id or logical request key still matches.

## Safe policy options

### Option A — exact-generation reconciliation

Store a normalized late receipt containing the successful `InjectionResult` document ids.

Before treating it as current success, compare it to a trusted expected document/session receipt for the new caller.

For top content injection conceptually:

```text
LateInjectionReceipt V1
  operation class
  tabId
  documentIds[]
  settledAt
```

The exact current top document receipt may come from the surrounding source-document/session owner, not from caller-provided text.

Only exact equality for the intended document generation can authorize reuse.

### Option B — never reuse late success as current success

A simpler safe policy is also valid:

- while actual Chrome injection is pending, do not duplicate it;
- if the bounded caller timed out and actual Chrome later settles, record/log the exact document ids if useful;
- clear the reusable logical settlement;
- the next ensure request starts a fresh current-target injection.

Both `content.js` and `frame-agent.js` already have idempotent global loaded guards, so a duplicate injection into the same still-current document can be made behaviorally harmless, subject to real Chrome verification.

This policy trades a bounded extra injection for simpler authority semantics.

The implementation may choose either option or a hybrid, but cannot keep the current tab-keyed late-success reuse.

## Exact document receipts

For a top-only injection, a successful `InjectionResult` should contain the exact top document id.

For all-frame injection, do not reduce the result to merely “some injections succeeded in tab 9”. Normalize and retain the document/frame set actually affected.

A new frame tree is not equivalent because:

- frame ids can be reused after navigation;
- child documents can independently navigate;
- the set of accessible frames can change with permissions/origins;
- same URL/origin does not imply same physical document.

P1-171 owns exact later frame-agent command targeting. P1-125 supplies truthful evidence about where the bootstrap injection itself actually settled.

## Missing `documentId` must fail closed for reusable authority

Chrome 118 is expected to provide document ids for the relevant scripting results. If a result lacks the identity required by the chosen reconciliation policy, it cannot be upgraded to exact-generation reusable success.

Safe outcomes include:

- discard future-reuse authority and reinject on the next request;
- mark unknown/degraded and require explicit resync.

Do not substitute URL or `frameId` for missing document generation evidence.

## Caller deadline versus actual settlement

P1-125 preserves the project's important distinction between:

- caller stopped waiting;
- Chrome side effect was cancelled;
- Chrome side effect later succeeded/failed.

A timeout is not cancellation evidence. The underlying promise must continue to be observed until settlement so WebClip does not start an unbounded number of duplicate injections.

But once late settlement is known, exact affected-document identity controls any reuse.

## Same-URL and ABA behavior

Required:

- A -> same-URL reload B: A receipt does not authorize B.
- A -> B -> textual URL A: old A receipt does not revive.
- child frame F document A -> document B under same F: old all-frame receipt does not prove B has frame-agent.
- permission/discovery changes do not let old result describe newly accessible frames.

URL/origin may remain diagnostics only.

## Composition with P1-171

P1-125 and P1-171 are adjacent but distinct:

- P1-125: which exact documents received the bootstrap script injection, especially after late settlement;
- P1-171: which exact top/child document generations a later frame-agent command is authorized to target.

A robust cross-origin frame session should compose both receipts:

```text
exact bootstrap result
-> exact child registration
-> exact LIST/TARGET frame receipt
```

Neither owner may replace browser `documentId` with only `tabId/frameId`.

## Composition with P0-070 / P1-125 source-tab authority

For top content injection used by popup/context/Journals, the selected/active source tab itself may navigate after UI admission. P0-070 and source-tab command owners determine which document generation the user operation expects. P1-125 ensures the injection settlement used to satisfy that prerequisite belongs to that same physical generation.

## Composition with P1-157/P1-158

P1-157 owns class-correct lifetime semantics for Chrome calls broadly; P1-158 owns bounded prerequisite reads. P1-125 is narrower: `executeScript` has a potentially late side effect, and the late success must remain generation-specific.

## Required deterministic schedules

1. injection in A settles before deadline -> ordinary success A.
2. injection in A times out then settles A; next ensure still expects A -> reuse only if exact A is proven, otherwise reinject safely.
3. injection in A times out -> same-URL reload B -> late A success -> B cannot consume it.
4. A -> B -> same textual URL A -> old receipt cannot revive.
5. allFrames late result contains top A + child A/X -> replacement top B + child B/X cannot consume it as equivalent set.
6. missing documentId -> not reusable as exact success.
7. actual injection remains pending -> second logical request does not start an uncontrolled duplicate.
8. late result is discarded by chosen safe policy -> next ensure performs fresh current injection and loaded guard prevents harmful duplicate behavior if document never changed.

## Real Chrome evidence before closure

Required unpacked Chrome scenarios should use the actual configured minimum-supported class of browser and record real `InjectionResult.documentId` values:

- delayed/forced-timeout top content injection followed by same-URL reload;
- delayed frame-agent allFrames injection while a child navigates;
- old actual success arrives after replacement document becomes current;
- next ensure proves fresh injection/receipt for B rather than consuming A;
- worker suspension/restart around pending/late settlement where applicable;
- no unbounded duplicate injection loop.

Managed/mock results cannot replace this evidence.

## Source-bound gate

`project_tools/test_p1_125_executescript_document_generation_source.js` is intentionally RED on the current runtime. It requires the late receipt to retain/validate document ids or to be explicitly non-reusable as future current success, while preserving pending-operation deduplication.

## Status

Architecture-saturated for current baseline, P1-125 remains ACTIVE.

No runtime/manifest/Registry change, PR, merge, build, tag or release is performed here.
