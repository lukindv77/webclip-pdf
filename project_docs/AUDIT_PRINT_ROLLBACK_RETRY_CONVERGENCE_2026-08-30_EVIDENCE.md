# Durable audit evidence — print rollback / retry convergence — 2026-08-30

Canonical status and single-owner authority remain exclusively in `AUDIT_REGISTRY.md`. This document preserves a completed **32-block** source-first correctness audit focused on how PDF preparation converges after partial success, failed cleanup and retry. Cybersecurity questions are intentionally outside this tranche.

Exact fresh source baseline: `main = e01c20785df5c934caa045458647c363f1df857b`.

Working branch: `audit/print-rollback-retry-convergence-20260830`.

Managed Chromium: `144.0.7559.96` on Debian 13. Browser fixtures below are engineering evidence for DOM/lifecycle behavior; they are not real unpacked-extension release QA.

No runtime source, `manifest.json`, version, build, tag or GitHub Release is changed by this audit tranche.

## Executive classification

**No new permanent P-code and no canonical status transition.** Fresh source and deterministic probes refine existing ACTIVE owners:

- **P1-214** — remote multi-frame prepare/restore must retain an exact rollback receipt for every successfully mutated child and preserve unresolved restore ownership until actual settlement.
- **P1-199** — remote child print preparation/cleanup needs exact print-generation ordering; old cleanup cannot undo a newer prepare, and repeated prepare cannot lose ownership of older print artifacts.
- **P1-003** — remote resource-report semantics must be truthful under a deadline; `attempted` cannot describe items never actually attempted.
- **P1-218** — temporary resource attributes need exact compare-before-restore receipts; cleanup failure must not erase the receipt and report success.
- **P1-219** — temporary image-wrapper rollback must own only the topology WebClip created; later page-owned descendants/topology cannot be deleted by blanket wrapper removal.
- **P1-221** — temporary link normalization cleanup must retain exact-node/value ownership even when the original link is temporarily disconnected; discarding the receipt can leave WebClip normalization attached when that exact node returns.
- **P0-067 / P1-212** — preparation-only disclosure mutations must not become unexplained persistent page state when a later PDF stage fails. Existing architectural direction remains a non-mutating/inert print representation.
- **P1-171 / P0-070** remain supporting generation boundaries: mapping loss/document replacement and a retry/new save must not be interpreted as proof that an unresolved previous cleanup has finished.

This tranche does **not** reopen the already completed 56-block physical-render-cut audit. It starts from the later question: after a preparation attempt succeeds partially or cleanup is uncertain, does the next attempt begin from a proven clean baseline?

## Fresh source boundary

Current `content.js` preserves these relevant behaviors:

1. `prepareRemoteFramesForPrint()` clears `state.remotePrintPrepared`, awaits the whole sequential fail-closed fan-out, and only after the fan-out returns records successful responses in `remotePrintPrepared`.
2. `restoreRemoteFramesAfterPrint()` snapshots the set, clears it immediately, then sends `restore-print`; errors are swallowed, missing current mappings are skipped, and `remote.printHeight` is cleared after the attempt.
3. `restoreAfterPrint()` launches remote restore fire-and-forget, then independently performs local cleanup.
4. `prepareForPrint()` starts with `restoreAfterPrint()` and then `await restoreRemoteFramesAfterPrint()`. Because the fire-and-forget call already synchronously empties the set before its first awaited child RPC settles, the second call can observe no work and therefore does not establish a cleanup barrier.
5. local `changedResourceAttributes`, `wrappedImages`, `changedLinks`, print styles, flattened proxies and frame-style receipts are all cleared after cleanup attempts; however their ownership semantics differ substantially.
6. `changedLinks` are skipped if the exact link is disconnected, after which the entire receipt list is cleared.
7. disclosure expansion is intentionally retained after PDF; no failure-specific reversal occurs.

Current `frame-agent.js` preserves these relevant behaviors:

1. print state is singleton: one `phase`, one `printStyle` pointer and one shared `changedAttrs` array.
2. `preparePrint()` has no print generation/idempotence guard and appends a fresh style every time.
3. `restorePrint()` removes only the current `printStyle` pointer, swallows style/attribute mutation failures, clears `changedAttrs`, changes phase back to selecting and returns `{ok:true}` regardless of whether rollback actually completed.
4. child resource prefetch returns `attempted: Math.min(imgs.length, 100)` even though the loop can break on its deadline before visiting that many images.

These source facts are consistent with the historical owners; the fresh value of this tranche is convergence across failure/retry boundaries plus several concrete cleanup edge cases not previously preserved together.

## Blocks 1–8 — remote partial preparation and unresolved rollback

### Block 1 — successful child A can be lost when later child B fails — P1-214

The parent records `remotePrintPrepared` only after `commandMappedRemoteFrames(... failClosed:true)` returns its complete response array. If A mutates successfully and B then throws, the function exits before A is inserted into the rollback set.

A deterministic source-shaped schedule reproduced: A remained `prepared=true`, parent rollback tracking was empty, and normal restore had no child to visit.

### Block 2 — A/B success followed by C failure loses every earlier rollback receipt — P1-214

The defect scales with fan-out. The accumulated local `responses` inside `commandMappedRemoteFrames()` are not returned when a later call throws. Therefore none of the already-successful children become parent-owned rollback work.

Acceptance remains incremental receipt registration or an explicit transaction coordinator that records each child success before proceeding.

### Block 3 — clearing `remotePrintPrepared` is not rollback — positive boundary

`state.remotePrintPrepared.clear()` at the beginning of a new remote prepare only removes parent bookkeeping. It does not remove child print styles, restore promoted image attributes or change child `phase`.

A clean retry must be proven by actual child reconciliation, not by an empty set.

### Block 4 — restore ownership is consumed before actual settlement — P1-214

`restoreRemoteFramesAfterPrint()` copies the ids and immediately clears the authoritative set before sending the first `restore-print` RPC.

A response timeout/rejection therefore converts “cleanup outcome unknown” into “nothing left to reconcile”. This remains the exact settlement half of P1-214.

### Block 5 — missing current remote mapping also consumes the receipt — P1-214/P1-171

After the set is cleared, `const remote = state.remoteFrames.get(frameId)` may return no record; current code simply continues.

A lost/rebuilt mapping is not proof that the old prepared child state was restored. Exact child document/generation reconciliation must decide whether the receipt is obsolete, transferred to a known replacement, or still unresolved.

### Block 6 — `remote.printHeight = 0` cannot be a cleanup receipt — P1-214/P1-229

When a mapped child restore RPC throws, the error is swallowed and parent proceeds to clear its cached `printHeight` anyway.

The geometry cache can therefore say “not prepared” while the child may still contain its print representation. Geometry cache reset must follow/compose with actual restore settlement rather than stand in for it.

### Block 7 — error callers cannot distinguish restored / superseded / failed / unknown — P1-214

`restoreAfterPrint()` returns no structured result and child cleanup errors are hidden by the remote helper. Download/Yandex success and catch paths therefore cannot present or persist a bounded cleanup outcome.

This is not a request to make cleanup failure fatal after already-produced bytes; it is a requirement to preserve reconciliation ownership and truthful status.

### Block 8 — partial remote preparation is mutation, not a read batch — P1-214

The architecture must treat each successful `prepare-print` response as a mutation receipt. Waiting until the whole fan-out finishes is equivalent to buffering commit receipts after irreversible work has already occurred.

## Blocks 9–14 — old cleanup can overtake the next prepare

### Block 9 — `restoreAfterPrint()` starts remote cleanup fire-and-forget — P1-199

The first statement of `restoreAfterPrint()` is `restoreRemoteFramesAfterPrint().catch(() => {})`. The async helper snapshots and clears the set synchronously before it reaches the first awaited child message.

Thus the caller can continue while actual remote cleanup remains in flight.

### Block 10 — the explicit await at the start of `prepareForPrint()` can wait for nothing — P1-199

`prepareForPrint()` calls `restoreAfterPrint()` and then `await restoreRemoteFramesAfterPrint()`. By the time the second helper runs, the first helper may already have consumed the shared set.

The second await therefore does not necessarily wait for the cleanup started by the first call.

### Block 11 — deterministic old-restore/new-prepare model reproduces state inversion — P1-199

Source-shaped async model:

1. generation A is tracked;
2. old restore snapshots and clears tracking, then waits on delayed child delivery;
3. the second restore sees zero ids;
4. generation B prepares and parent tracks B;
5. delayed singleton child restore A settles last.

Observed before delayed A settled: child `phase=printing`, generation B, parent tracking `[1]`.
Observed after A settled: child `phase=selecting`, generation null, parent still tracking `[1]`.

Parent and child now disagree about whether B is prepared.

### Block 12 — repeated child `preparePrint()` has no generation/idempotence guard — P1-199

Current frame-agent simply appends another style and overwrites `state.printStyle`. It does not reject/restore/reconcile an already prepared generation.

Retry correctness therefore depends on an ordering guarantee that current parent code does not provide.

### Block 13 — repeated prepare can leave an orphan print-style node — P1-199

Managed/source-shaped DOM control:

1. prepare A appends style A and points `state.printStyle` to A;
2. prepare B appends style B and replaces the pointer;
3. one restore removes B and clears pointer;
4. A remains connected without an authoritative pointer.

This is the existing P1-199 lost-pointer failure and remains current.

### Block 14 — retry admission must consume a cleanup barrier/receipt, not a guessed idle phase — P1-199/P1-214

A new prepare may begin only after previous exact generation cleanup is settled, or the child protocol must make stale cleanup generation-safe. Empty parent arrays/sets, child phase strings, URL equality or elapsed time are insufficient substitutes.

## Blocks 15–19 — child rollback acknowledgement and resource-report truth

### Block 15 — child style removal failure is swallowed but `restorePrint()` returns success — P1-214

`try { state.printStyle?.remove() } catch (_) {}` suppresses failure, then the function sets `state.printStyle=null` and eventually returns `{ok:true}`.

A parent acknowledgement currently proves only that the handler returned, not that the style was removed.

### Block 16 — child resource-attribute restore failure is also swallowed — P1-214/P1-218

Every remembered attribute restore is wrapped in its own empty catch. The shared `changedAttrs` list is then cleared even if one or all writes failed.

P1-218 already requires compare-before-restore; P1-214 additionally needs a truthful aggregate settlement receipt that can preserve unresolved child cleanup.

### Block 17 — cleanup receipt is erased on failure — P1-214/P1-218

Because `state.changedAttrs=[]` runs unconditionally, a failed restore cannot be retried/reconciled from the child state object. Correct convergence must distinguish successfully restored, superseded-by-current-page, and genuinely unresolved mutations.

### Block 18 — frame-agent `attempted` can overstate actual attempted resources — P1-003

The loop breaks when `Date.now() >= end`, but the returned field is `attempted: Math.min(imgs.length,100)` rather than a counter incremented per visited image.

A deterministic shortened-deadline source model with 20 images visited only 2 while returning `attempted=20`, `loaded=2`, `failed=0`.

### Block 19 — top and child resource reports do not currently share the same omission semantics — P1-003

Top prefetch increments `report.attempted` when an actual task is dequeued and also exposes `omittedByLimit`, `scanTruncated` and `deadlineExceeded`. Child report exposes only attempted/loaded/failed and can count unvisited items as attempted.

Top then numerically adds child attempted/loaded/failed into its own report. The PDF header may consequently describe more resources as “checked” than the child actually visited. Acceptance is report-semantic parity, not merely equal field names.

## Blocks 20–25 — local rollback receipts can be discarded while exact page objects survive

### Block 20 — disconnected normalized link is skipped during cleanup — P1-221

`restoreAfterPrint()` has `if (!link?.isConnected) continue;` for `changedLinks`, then clears the entire array.

Disconnection can be transient; exact JavaScript object identity still exists and may later be reattached by the application.

### Block 21 — managed Chromium: exact reattached link retains WebClip temporary href/marker — P1-221

Fixture used `<base href="https://example.test/base/">` and a link with original `href="item/1"`.

Current-shaped normalization produced temporary `https://example.test/base/item/1` and marker `item/1`. The link was detached before cleanup, so cleanup skipped it and discarded the list. Reattaching the same object produced:

- `href = https://example.test/base/item/1`;
- marker still `item/1`;
- node connected again.

P1-221 acceptance therefore must not equate “temporarily disconnected” with “safe to forget”. Exact value/generation receipt can be settled on the exact object without selector re-resolution, or retained as bounded reconciliation work.

### Block 22 — resource-attribute cleanup demonstrates a useful exact-object contrast — control

`changedResourceAttributes` does not skip merely because the node is disconnected; it still holds exact object identity. Its current defect is instead stale unconditional restore, already P1-218.

These two mechanisms should converge on one principle: exact object identity plus exact temporary-value/generation ownership, with explicit superseded/unresolved outcomes.

### Block 23 — image-wrapper rollback already has a stale-topology owner — P1-219

Current cleanup moves the image back using saved `{parent,nextSibling}` and removes the generated wrapper. Existing P1-219 correctly requires checking that the exact WebClip-created temporary topology still exists before moving the image.

Fresh work does not allocate a duplicate.

### Block 24 — managed Chromium: page-added child inside exact wrapper is deleted by cleanup — P1-219 refinement

After WebClip-shaped wrapping moved image I inside generated anchor W, the fixture appended an ordinary `<em>` child to W. Current-shaped cleanup moved I back and then executed `W.remove()`.

Observed:

- image returned to original parent;
- added child became disconnected;
- added child remained parented to the now-detached anchor.

Exact ownership of wrapper W does **not** imply ownership of descendants the page added later. Cleanup needs topology/content ownership checks; it must not discard newer page-owned content simply because it lives under the generated wrapper.

### Block 25 — wrapper cleanup needs a “superseded” path, not forced historical restoration — P1-219

If W or I has been adopted into newer page topology, the correct result may be to leave the newer topology intact, remove only artifacts still proven WebClip-owned, and record bounded `superseded` reconciliation. Restoring the historical parent/position is not convergence once ownership was superseded.

## Blocks 26–29 — disclosure preparation persists even when a later stage fails

### Block 26 — native `<details>` is intentionally left open after the operation — P0-067/P1-212

`expandSpoilersInIncludedContent()` sets `details.open=true`, and `restoreAfterPrint()` explicitly says expanded disclosure state is intentionally not closed.

That product choice has a distinct failure-path consequence: a failed preparation/PDF can change the user's page even though no PDF was produced.

### Block 27 — forced panel/control attributes and inline styles likewise have no failure rollback — P0-067/P1-212

`forcePanelVisible()` writes `hidden=false`, `aria-hidden=false`, several inline visibility/layout declarations and `aria-expanded=true`. There is no later snapshot restore path.

Managed Chromium current-shaped control confirmed all of these values remain after the modeled failure cleanup.

### Block 28 — the local `snapshotted` set is populated but does not implement rollback — P0-067/P1-212

The disclosure function creates `const snapshotted = new Set()` and adds details/control/panel/container nodes, but the set is local and is never consumed by `restoreAfterPrint()`.

This is evidence that the current code recognizes related nodes but does not retain an operation-owned reversible receipt. Acceptance should explicitly decide semantics: either disclosure changes are an intentional user-visible post-save feature, or failure must leave the page unchanged; current behavior does not distinguish successful save from downstream failure.

### Block 29 — exact-node print-style/proxy removal is a positive cleanup direction

Top print styles are stored as exact node references and removed by iterating those references; flattened proxies are likewise stored as exact proxy nodes and removed directly.

Those mechanisms still need generation/page-convergence composition already covered elsewhere, but they avoid re-resolving arbitrary replacements by selector. Preserve this exact-object direction when fixing other cleanup classes.

## Blocks 30–32 — retry/convergence contract and duplicate decision

### Block 30 — success and failure paths invoke best-effort cleanup but consume no cleanup outcome

Local download and Yandex paths call `restoreAfterPrint()` after success and in `catch`. `updatePageUploadProgress()` can also call it when the worker enters cache/upload stages.

Because cleanup returns no receipt, UI/worker operation state cannot distinguish:

- cleanly restored;
- page superseded a temporary mutation;
- remote cleanup still pending/unknown;
- cleanup failed and needs reconciliation.

A generated PDF may remain usable; the missing piece is truthful page/preparation convergence before allowing a new live-DOM preparation attempt.

### Block 31 — one explicit preparation-generation state machine is the closure direction

A future fix should make each preparation attempt own an exact bounded receipt containing at least:

1. top preparation generation / exact source document+application generation;
2. remote child prepare receipts registered immediately per successful child;
3. local temporary attribute/topology/node mutations with exact temporary values/objects;
4. remote restore status retained until actual settlement;
5. local cleanup status: restored / superseded-by-current-page / unresolved-failure;
6. a **clean-to-reprepare** barrier that a retry/new save must satisfy before mutating the live representation again.

Rollback should be idempotent and generation-safe. Failure to restore page state should not silently be translated into an empty receipt ledger.

### Block 32 — final duplicate/status decision and regression matrix

No new owner is justified. The roots are already individually assigned; this tranche establishes their convergence at retry boundaries.

Required deterministic regression matrix:

1. remote A prepare succeeds, B fails -> A receipt is retained and compensated;
2. A/B succeed, C fails -> both are retained and compensated;
3. restore RPC timeout/lost response -> receipt remains unresolved, not erased;
4. mapping disappears -> receipt remains generation/document-bound until reconciled;
5. old restore A delivered after prepare B -> B remains prepared;
6. repeated child prepare never leaves duplicate/orphan print styles;
7. child style/attribute restore failure cannot return an unconditional clean acknowledgement;
8. child prefetch deadline reports actual attempts plus explicit omitted/deadline truth;
9. top aggregated resource report remains arithmetically and semantically coherent;
10. detached normalized link later reattached -> no WebClip temporary href/marker leak;
11. page changes link href while normalized -> P1-221 compare-before-restore preserves newer value;
12. image remains in exact wrapper with no newer topology -> ordinary unwrap restores correctly;
13. page moves image -> cleanup does not move it back;
14. page adds child/content to wrapper -> cleanup does not delete that newer content;
15. resource attribute exact temp remains -> original state restores; page supersedes it -> newer value survives;
16. downstream PDF failure after disclosure expansion follows explicit product semantics and does not silently masquerade as a fully rolled-back attempt;
17. new live-DOM prepare cannot start until previous unresolved cleanup is reconciled or stale cleanup is provably unable to affect it;
18. normal stable single-frame and multi-frame success remains behaviorally unchanged;
19. real unpacked Chrome remains release QA for actual frame permission/IPC/browser print lifecycle.

`AUDIT_REGISTRY.md` should remain unchanged in this docs-only tranche. Material owner impact for the PR is:

`P1-214, P1-199, P1-003, P1-218, P1-219, P1-221, P0-067, P1-212, P1-171, P0-070`

No runtime/configuration/release artifact is modified.