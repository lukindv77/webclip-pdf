# WebClip — fresh full-project research — C37 Failure / retry / rollback / convergence — 2026-09-03

Date: 2026-09-03  
Canonical source baseline: `a6be4cfdb7a3affd385479f04d333e75847ee94c`  
Exact `content.js` blob: `f3ee7b51fe9ee94fdfe36e8a7c99f14a548fdc4e`  
Scope: fresh-restart coordinate **C37 — Failure / retry / rollback / convergence**.

## Result

**C37: `L4-REVALIDATED / FINDING + POSITIVE/CLEAN-RETRY/STALE-RESOURCE/DETACHED-LINK/WRAPPER-TOPOLOGY CONTROLS (P1-218, P1-219, P1-221; P1-199, P1-214 supporting/source)`.**

Fresh exact-source Chrome evidence proves that ordinary failure→retry can converge when the page does not supersede WebClip's temporary mutations, but three current local rollback classes still fail once the host changes the affected object/topology before cleanup:

1. a newer host image `src` is overwritten by old WebClip rollback and the retry physically serializes the older `data-src` candidate — **P1-218**;
2. a page-owned child inserted into a WebClip-created image wrapper is disconnected when cleanup removes that wrapper — **P1-219**;
3. an exact link detached during failure cleanup keeps WebClip's temporary absolute href/marker; after reattachment and retry its original relative authored href is permanently lost — **P1-221**.

Current source also still contains the remote cleanup ordering/settlement mechanism already owned by **P1-199/P1-214**: `restoreAfterPrint()` starts remote restore fire-and-forget, while `prepareForPrint()` subsequently awaits a second restore call against shared bookkeeping that the first call may already have synchronously consumed. This tranche records that current source fact as supporting evidence only; it does not claim a fresh remote-frame physical reproduction.

No new P-code, Registry wording/status, runtime, manifest/version, release-readiness, build, tag or Release change is warranted.

## 1. Contract boundary

C37 asks whether one failed save/preparation attempt leaves the next retry on a proven clean, current, generation-correct representation rather than silently restoring old page state, deleting newer host state, or losing rollback ownership.

The relevant current project requirements already distinguish timeout/failure from cancellation and require temporary print mutations to belong to the exact print generation. A retry must repeat the intended logical operation, not inherit stale preparation residue or overwrite page state that superseded WebClip's temporary mutation.

The focused C37 acceptance therefore distinguishes:

- **clean retry** — no host superseding mutation; cleanup may converge normally;
- **superseded** — the host changed the same attribute/topology/object while WebClip owned a temporary value;
- **unresolved/unknown** — cleanup actual settlement cannot be proven;
- **retry** — a new attempt may start only from current/settled state or a generation-safe protocol that prevents stale cleanup from overtaking it.

## 2. Fresh current-source inspection

### 2.1 Resource attributes are restored unconditionally

Current `restoreAfterPrint()` walks `state.changedResourceAttributes` in reverse and restores the value captured before preparation:

```js
if (had) element.setAttribute(name, value ?? '');
else element.removeAttribute(name);
```

It does not compare the element's current value with the exact temporary WebClip value before restoring the older snapshot. The receipt array is then cleared.

This is directly inside **P1-218 ACTIVE**, whose current Registry contract requires compare-before-restore plus preparation-generation ownership.

### 2.2 Temporary image wrapper cleanup owns the wrapper node too broadly

Current cleanup moves the image back to the saved parent/nextSibling and then executes `link?.remove()` on the generated wrapper.

That exact wrapper node can contain newer page-owned descendants by cleanup time. Owning the wrapper node does not imply ownership of arbitrary descendants added after preparation. This is the existing **P1-219 ACTIVE** topology root.

### 2.3 Disconnected normalized links are forgotten

Current link cleanup contains:

```js
if (!link?.isConnected) continue;
```

After the loop, `state.changedLinks = []` clears the entire rollback receipt set.

An exact link object can be temporarily detached and later reattached. Skipping it because it is currently disconnected is not proof that the temporary href/marker has become irrelevant. This is **P1-221 ACTIVE**.

### 2.4 Remote cleanup still has the existing ordering/settlement boundary

Current `restoreAfterPrint()` starts:

```js
restoreRemoteFramesAfterPrint().catch(() => {});
```

Current `prepareForPrint()` begins with `restoreAfterPrint()` and then separately executes:

```js
await restoreRemoteFramesAfterPrint();
```

The first async helper snapshots and clears the shared `remotePrintPrepared` set before awaiting child restore RPC settlement. Therefore the second awaited call can observe no tracked work while the first actual cleanup remains in flight.

Current `frame-agent.js` also retains singleton `printStyle` / `changedAttrs` rollback state and returns `{ok:true}` from `restorePrint()` after swallowing individual cleanup errors and clearing receipts.

These are already-owned **P1-199/P1-214** source-level convergence boundaries. C37 does not allocate another owner.

## 3. Exact physical evidence

Accepted standalone exact-source execution:

- workflow: `Research C37 failure retry rollback`;
- run: `33702598102`;
- job: `100484895616`;
- exact workflow head: `f5516c6f33e379d3fb9f99c0dcf666bda208d441`;
- browser: Google Chrome `151.0.7922.173`;
- conclusion: **SUCCESS**;
- raw receipt commit: `e2b688228468203cee291b1fa221c7db755d45cd`;
- raw result SHA-256: `206ee2c9991f20864bc9f24e6c34fcbdd4e74e59c4d60914b58c137c4f9ddc36`;
- durable harness: `project_tools/research_c37_failure_retry_rollback.py`.

The harness drives actual current `content.js` selection and download preparation. `WEBCLIP_GENERATE_PDF` is held by a local test runtime shim so the first attempt can be rejected after preparation and the second attempt can be physically printed. PDFs are parsed with `pypdf` and relevant image pixels are checked with PyMuPDF.

All fixtures are synthetic local content; no external page/user data is used.

## 4. Fresh result matrix

### 4.1 Clean failure→retry — positive convergence control

A simple selected page has no host mutation of WebClip-owned temporary objects between preparation and failure.

First prepared state contains exactly one print header and one print style. After the synthetic PDF failure, cleanup counters are all zero:

- header `0`;
- print styles `0`;
- image wrappers `0`;
- href markers `0`.

A second preparation again creates one header/style, and the physical retry PDF:

- contains `C37_SELECTED`;
- omits explicit Exclude;
- omits outside scope;
- produces 2 pages;
- PDF SHA-256 `4ae663a66afe6f0d77fc232066cbb5fa008ea43a187c3222f1a9cc44f35e05fb`.

After successful settlement cleanup counters return to zero.

This rejects a blanket claim that every retry is non-convergent. The defect requires superseded/unresolved mutation ownership.

### 4.2 Stale temporary resource attribute overwrites newer host state — P1-218

Fixture:

- selected IMG starts with no `src`;
- `data-src` contains a red SVG;
- current preparation promotes the red data URL into `src`;
- before the mocked PDF failure, the page changes the same IMG `src` to a blue SVG.

Observed sequence:

- before: `src = null`;
- after WebClip prepare: red `src`;
- newer host state: blue `src`;
- after failure cleanup: `src = null`;
- retry preparation: red `src` again.

The cleanup therefore does not preserve the newer blue page state; it blindly restores the old pre-WebClip absence.

Physical retry PDF contains `7,920` red pixels and `0` blue pixels. Exclude/outside remain absent.

PDF SHA-256: `f333747945bbbf00bbcc7453a219b7892324e799f78eacdf1c30427b284a4ec9`.

This is a causal retry consequence, not only a DOM bookkeeping defect: stale rollback changes what the next immutable PDF contains.

### 4.3 Detached normalized link loses authored relative identity across retry — P1-221

Fixture uses:

```html
<base href="https://example.test/base/">
<a href="relative/item">...</a>
```

First preparation:

- authored `href = relative/item`;
- temporary WebClip href becomes `https://example.test/base/relative/item`;
- marker stores `relative/item`.

The exact link object is detached before the mocked PDF failure. Current cleanup skips it because `isConnected=false` and then clears parent rollback receipts.

After the same exact object is reattached:

- href is still absolute;
- marker is still `relative/item`.

Retry preparation now snapshots the **already normalized absolute href** as the new original marker. After successful retry cleanup:

- marker is removed;
- href remains `https://example.test/base/relative/item`.

The original authored relative value has been permanently lost.

Physical retry PDF remains selection-correct; PDF SHA-256 `ab5342c3e2919783162c969212e1a4e647f8c0d99176168618e4e51ad2efe771`.

This is precisely why P1-221 requires a private exact temporary-value/generation receipt rather than treating a host-mutable marker or temporary disconnection as authority.

### 4.4 Page-added child inside WebClip wrapper is deleted on failure cleanup — P1-219

A selected ordinary image is wrapped by WebClip for PDF navigation. Before the mocked PDF failure, the page appends an ordinary `<em>` child to that exact generated wrapper.

Prepared wrapper initially contains one child. After failure cleanup:

- image is connected again in its historical source parent;
- page-added child is disconnected;
- wrapper is disconnected.

Thus current cleanup removes page-owned topology created after WebClip preparation merely because it resides inside the generated wrapper node.

The correct convergence outcome when topology has been superseded may be `superseded`, not forced historical reconstruction.

## 5. Rejected/development hypotheses

### 5.1 First standalone run — rejected harness assumption

Run `33701899042` / job `100482769019` failed before final JSON because the initial link fixture had no absolute base URL; in that synthetic document `link.href` did not demonstrate normalization. The run is retained as harness-development provenance and is not product evidence.

### 5.2 Case-isolation run — diagnostic development evidence

Run `33702064714` / job `100483270778` executed each case independently to separate product observations from the bad link fixture. It confirmed clean retry, stale resource rollback and wrapper topology behavior.

### 5.3 Corrected focused link run

A later focused `<base>` control and then the repaired standalone harness independently reproduced the detached-link loss. The accepted C37 result is the final standalone run `33702598102` above.

No failed exploratory assumption is converted into a PASS/FINDING claim.

## 6. Duplicate / owner reconciliation

No new P-code is warranted.

- **P1-218 ACTIVE** — direct physical stale resource-attribute rollback and retry artifact.
- **P1-219 ACTIVE** — direct browser topology loss from wrapper cleanup after page-added content.
- **P1-221 ACTIVE** — direct detached exact-link receipt loss and authored-href drift across retry.
- **P1-199 ACTIVE** — supporting current source still permits stale remote restore/new prepare ordering through shared singleton bookkeeping.
- **P1-214 ACTIVE** — supporting current source still consumes/clears remote cleanup ownership before actual child restore settlement can be proven.
- **P0-070/P0-075** remain broader generation/isolation context; they are not needed as additional direct C37 owners for the focused local rollback findings.

Historical `RESEARCH_PRINT_ROLLBACK_RETRY_CONVERGENCE_2026-08-30_EVIDENCE.md` is used only for duplicate/root-cause reconciliation and fixture direction. Fresh C37 advancement is controlled by current source and the 2026-09-03 physical matrix.

## 7. External research / architecture comparison

External sources are comparison inputs only; they do not establish WebClip correctness.

### Chrome Extensions API lifecycle

Chrome's Extensions API reference states that extension API methods are asynchronous unless specified otherwise and asynchronous methods return before the operation completes, with promises used to obtain results.

Reference: https://developer.chrome.com/docs/extensions/reference/api

Architectural implication: caller progression/timeout is not itself evidence that a separate asynchronous side effect or cleanup actually settled.

### Browsertrix retry design

Browsertrix Crawler issue #758 explicitly separates failure classification, retry eligibility and whether intermediate retry attempts should be written at all; it argues that retries are part of one capture process and intermediate failed attempts should not become final archive data.

Reference: https://github.com/webrecorder/browsertrix-crawler/issues/758

Issue #789 shows a complementary failure mode: a valid 404 response can be misclassified as a crash, causing retries and loss of the correct final response from the WARC.

Reference: https://github.com/webrecorder/browsertrix-crawler/issues/789

Transferable lesson: retry logic needs truthful settlement classification and must not let an incorrect intermediate interpretation erase the correct operation state.

### SingleFile success/error truth examples

SingleFile issue #1956 reports the inverse mismatch: the file is saved successfully but the UI reports an unexpected error.

Reference: https://github.com/gildas-lormeau/SingleFile/issues/1956

SingleFile issue #1316 reports a server returning HTTP 200 with an application-level `success:false` body while the extension displayed success.

Reference: https://github.com/gildas-lormeau/SingleFile/issues/1316

These examples reinforce the product-level need to distinguish physical side-effect settlement from caller/UI status. They do not map to a new WebClip owner.

## 8. Architecture direction

A convergent C37 target should use one consistent mutation receipt model:

1. **exact object + exact temporary value + generation** for every reversible mutation;
2. **compare-before-restore** — restore only if the current state is still the exact WebClip temporary state owned by that receipt;
3. **superseded outcome** — if the host changed the value/topology, do not overwrite/delete it merely to recreate history;
4. **unresolved outcome** — if cleanup settlement fails or mapping disappears, retain bounded reconciliation ownership rather than clearing the receipt;
5. **retry barrier or generation-safe protocol** — stale cleanup cannot overtake a newer prepare;
6. **topology ownership** — owning a generated wrapper does not mean owning later page-added descendants;
7. **private link receipt** — original authored href is not delegated to a page-mutable marker;
8. **truthful cleanup telemetry** — success/failure/retry logic can distinguish restored, superseded and unresolved cleanup without making already-produced bytes retroactively false.

The clean-retry positive control should remain part of regression coverage so a fix does not turn ordinary retry into a failure path.

## 9. Pipeline mapping

- **B1 User Intent:** unchanged selected scope across failure/retry.
- **B2 Admission:** exact current page object/value/topology generation is relevant to rollback ownership.
- **B3 Capture / B4 materialization:** temporary attributes, links, wrappers and remote child print state are created.
- **B5/B6:** stale resource cleanup changes the next physical PDF from newer blue host state back to stale red preparation state.
- **B7 Persistence/Transfer:** synthetic failure models a downstream save failure after preparation; external side effects remain distinct from local caller state.
- **B8/B9:** not independently exercised by the focused local matrix.

## 10. Verdict and next coordinate

Fresh C37 verdict:

**`L4-REVALIDATED / FINDING + POSITIVE/CLEAN-RETRY/STALE-RESOURCE/DETACHED-LINK/WRAPPER-TOPOLOGY CONTROLS (P1-218, P1-219, P1-221; P1-199, P1-214 supporting/source)`**.

After C37 integration, the next sequential coordinate is **C38 — Node / byte / time / resource budgets**.
