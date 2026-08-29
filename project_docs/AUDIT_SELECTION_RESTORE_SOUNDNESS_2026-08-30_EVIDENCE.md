# Durable audit evidence — SelectionSnapshot restore soundness / remote settlement / bounded locator work — 2026-08-30

Canonical status and single-owner authority remain exclusively in `AUDIT_REGISTRY.md`. This document preserves fresh-source proof, managed-Chromium reproductions, positive/negative controls, duplicate/root-cause classification and acceptance criteria for a 36-block deep-audit tranche focused on truthful SelectionSnapshot restore.

Audited fresh source baseline: `main` at `e18163436b169b9945e5da966481a82a3fe54694`.

Managed browser probes used project Chromium `144.0.7559.96`. They are deterministic engineering evidence, not a substitute for real unpacked-Chrome release QA, optional-host-permission cross-origin QA or Yandex E2E.

## Executive classification

No new permanent P-number and no status transition are justified by this tranche.

- **P1-001 ACTIVE — acceptance refinement.** SelectionSnapshot v3 restore truth is end-to-end, not only post-match rendered visibility. A restore must use a sound bounded candidate set/confidence model, apply the requested selection idempotently, and report actual final local/remote selection state. Current remote `restoreOne()` can return `ok:true` when the requested Include/Exclude was toggled off, skipped as nested, or refused at the 250-entry frame cap. Current top restore counters are not reconciled against the final remote `get-state`. Current bounded resolver can exclude the exact target after the first 5000 tag candidates and still accept an in-window decoy with `confidence:'high'`.
- **P1-200 ACTIVE — supporting selection-session refinement.** Remote clear/start/restore settlement must be exact-session ordered. A failed/late clear can leave stale child selections that a subsequent non-idempotent restore toggles rather than restores.
- **P1-171 ACTIVE — supporting document/frame-confidence boundary.** Remote locator confidence must compose the outer frame-path confidence with child confidence. Current `result.confidence || boundary.frameConfidence` can report child `high` even when the frame boundary was only `medium`.
- **P1-154 ACTIVE — supporting aggregate-cap truth.** The child 250-entry cap is real, but `restoreOne()` currently converts a cap refusal into `ok:true`; aggregate local+remote scope still must remain truthful.
- **P1-168 ACTIVE — supporting bounded-work refinement.** Locator creation/scoring is bounded in candidate count but still performs expensive sibling/text work per candidate, and the fixed 5000-prefix policy is not a sound confidence boundary.
- **P1-160 ACTIVE — supporting interactive-work refinement.** Rebuilding whole outline/snapshot state multiple times per mutation remains cumulative work; this tranche records exact selection-side amplification without allocating another performance owner.

Historical family evidence already preserves P1-001 as the locator restore confidence/ambiguity owner. The current compact registry wording focuses on rendered-target admission; these blocks are additional acceptance evidence for the same SelectionSnapshot restore root cause, not P1-229.

No runtime, `manifest.json`, version/build/tag/release state is changed by this audit evidence.

## Source boundary

Fresh `content.js` establishes the current restore pipeline:

1. `applySelectionSnapshot()` starts/synchronizes remote agents, clears local state, sends remote `clear`, then restores each Include and Exclude locator;
2. `restoreRemote()` trusts the child command result and increments `restoredIncludes`/`restoredExcludes` when `result.ok` is truthy;
3. after all restores, top requests remote `get-state` and updates cached snapshots, but does not recompute the already-published restore counters/confidence totals;
4. local v3 resolution ranks only `collectTagCandidatesBounded(..., 5000)` candidates, while `cssCandidate` and `domCandidate` are only bonus flags if those exact nodes are already inside the bounded tag set;
5. local same-origin frame-path resolution explicitly downgrades a child `high` result to `medium` when frame-path confidence is `medium`.

Fresh `frame-agent.js` establishes the remote boundary:

1. selection state uses mutable Include/Exclude maps capped at `MAX_SELECTIONS = 250` each;
2. `addInclude()` and `addExclude()` are toggle/no-op helpers and return no mutation outcome;
3. `restoreOne()` calls those helpers and then returns `ok:true` unless locator resolution/admission itself failed;
4. the child resolver uses the same 5000-tag-candidate ranking shape as top content;
5. `start()` does not clear selection maps;
6. every successful selection mutation sends a freshly serialized full snapshot.

Fresh worker source is an important positive control: `sanitizeSelectionSnapshot()` marks lists over 250 as overflow and only materializes the first 250 locators, with a global snapshot JSON envelope. This tranche therefore does **not** claim an unbounded persistent/imported SelectionSnapshot payload.

## Blocks 1–16 — remote restore result is not actual-state settlement

### Block 1 — remote clear is best-effort before restore — P1-200/P1-001

`applySelectionSnapshot()` awaits `commandMappedRemoteFrames('clear')`, but `commandMappedRemoteFrames()` swallows per-frame errors unless `failClosed` is requested. Selection restore does not request fail-closed behavior.

Therefore the top can proceed into restore with an old child Include/Exclude map still present. This is not merely a transport warning because current child restore semantics are toggle-based rather than idempotent set semantics.

### Block 2 — child `start()` preserves old selection maps — existing P1-200/P1-201 control

`frame-agent.start(mode)` changes phase/mode, installs listeners and sends state. It does not clear Include/Exclude maps.

Historical frame-permission evidence already records this persistence across agent lifecycle/regrant. This tranche does not allocate a new owner for it; the relevance here is that a stale map can be the input to `restoreOne()`.

### Block 3 — duplicate remote Include toggles OFF but reports `ok:true` — P1-001

Managed-Chromium model of the fresh child helpers:

1. first `restoreOne('include', target)` resolves target, `addInclude()` adds it and returns no outcome; `restoreOne()` returns `{ok:true}`;
2. second restore of the same locator enters `addInclude()`'s exact-match branch, removes the Include marker/map entry and returns;
3. `restoreOne()` again unconditionally returns `{ok:true}`.

Observed final state: first result `ok:true`, second result `ok:true`, final Include count **0**.

A restore API cannot truthfully mean “requested selection is restored” if duplicate replay removes it while reporting success.

### Block 4 — duplicate remote Exclude toggles OFF but reports `ok:true` — P1-001

The same schedule applies to `addExclude()`:

1. parent Include exists;
2. first child Exclude restore adds the target and reports `ok:true`;
3. second identical Exclude restore removes it through the exact-match toggle branch;
4. `restoreOne()` still reports `ok:true`.

Observed final Exclude count: **0** after two successful results.

### Block 5 — nested remote Include can be a no-op reported as success — P1-001

Managed fixture:

1. restore parent Include;
2. restore a child locator inside that parent;
3. `addInclude()` returns early because `containing(state.includes, child)` is already true;
4. no child-specific Include is materialized;
5. `restoreOne()` returns `ok:true`.

Final map contains only the parent, while two restore operations were individually reported successful.

### Block 6 — nested remote Exclude can be a no-op reported as success — P1-001

After one Exclude is present, restoring a descendant inside that Exclude returns early from `addExclude()` because `containing(state.excludes, descendant)` is true. `restoreOne()` still returns `ok:true`.

The final map contains only the outer Exclude. This is a legitimate normalized selection policy **only if** the API reports normalization/aliasing truthfully; it is not legitimate to claim exact restoration of both requested items.

### Block 7 — 251st remote Include is refused but reports `ok:true` — P1-001/P1-154

Managed Chromium created 251 independent usable targets and replayed them through the current child logic.

- `MAX_SELECTIONS` is 250;
- after 250 Includes, `addInclude()` returns early for the 251st;
- `restoreOne()` still returns `{ok:true, confidence:'high'}`;
- final Include count is **250**;
- the 251st target has no Include marker.

This directly connects cap admission truth (P1-154) to restore result truth (P1-001).

### Block 8 — 251st remote Exclude is refused but reports `ok:true` — P1-001/P1-154

The corresponding Exclude fixture produced the same result: the 251st Exclude was not materialized because of the cap, yet `restoreOne()` returned `ok:true`.

Final Exclude count: **250**, last requested target absent.

### Block 9 — failed clear + exact stale Include can invert restore — P1-200/P1-001

Deterministic schedule from Blocks 1–3:

1. child already has target A selected from an old selection session;
2. top begins snapshot apply and child `clear` fails/is omitted by best-effort fan-out;
3. top restores locator A;
4. child resolves the correct node A;
5. `addInclude(A)` sees exact stale selection and toggles it **off**;
6. child returns `ok:true`;
7. top increments `restoredIncludes`.

No locator ambiguity or page mutation is required. Session ordering plus toggle semantics alone converts “restore A” into “remove A”.

### Block 10 — mutation helpers expose no settlement result — P1-001 implementation boundary

`addInclude()` / `addExclude()` return no structured result distinguishing:

- added;
- already represented by a parent;
- toggled off;
- refused by cap;
- swallowed/replaced another entry.

`restoreOne()` therefore has no authoritative mutation receipt to convert into truthful `ok` semantics. Fixing only the top counters cannot solve the child API contract.

### Block 11 — final `get-state` refresh does not repair restore counters — P1-001

After restore loops, top requests `get-state` and replaces `remote.snapshot` with the actual child snapshot. This is a useful state refresh.

However, `restoredIncludes`, `restoredExcludes`, `failed*`, `ambiguous*` and confidence counters were already incremented from individual command results. They are not recomputed from the refreshed state.

Thus cached state can truthfully show zero/fewer remote selections while the returned restore report still says they were restored.

### Block 12 — user toast can report nonexistent restored selections — P1-001

The restore toast is built from the stale per-command counters, not from final local+remote materialized state.

In the duplicate remote Include schedule, the child can end with zero Includes while the top has counted two successful restores. User-visible success therefore can contradict the outline/count state immediately after reconciliation.

### Block 13 — Journal Apply warning can be suppressed by false success — P1-001

`showSelectionJournal()` warns about changed markup when `restored.failedIncludes || restored.failedExcludes` is nonzero.

Remote false-success cases increment restored counters rather than failed counters. Consequently the Journal flow may close the dialog without the “part of the selection could not be restored” warning even though requested child selections are absent in final state.

### Block 14 — local duplicate Include overcounts rather than toggles — P1-001 consistency control

Top local restore has different duplicate behavior. On a second identical Include locator, `findContainingInclude(element, true)` returns the same element and the code increments `restoredIncludes` again without adding a second map entry.

So two identical local locators produce one actual Include but can report `restoredIncludes = 2` and record confidence twice.

This is safer than remote toggling, but still violates exact report/state cardinality.

### Block 15 — local duplicate Exclude is counted as failure — semantic inconsistency control

For local Excludes, a second identical locator hits `findContainingExclude(element)` and increments `failedExcludes` rather than treating it as already-restored success.

Current duplicate semantics are therefore inconsistent across:

- local Include: success-counted alias;
- local Exclude: failure;
- remote Include/Exclude: destructive toggle followed by success.

Acceptance needs one explicit idempotent normalization contract.

### Block 16 — local/remote restore parity must be semantic, not merely structural — P1-001/P1-004

The top and child share locator shape/scoring concepts, but applying a resolved locator has materially different semantics. P1-004 remains the feature umbrella; P1-001 owns truthful SelectionSnapshot restore result semantics. No new remote-specific owner is needed.

## Blocks 17–27 — bounded candidate search is not yet sound confidence

### Block 17 — v3 resolver ranks only the first 5000 tag candidates — P1-001/P1-168

`collectTagCandidatesBounded(ownerDoc, tag, 5000)` returns a document-order prefix. `resolveElementLocatorV3InDocument()` ranks only that list.

A cap is necessary for bounded work, but a document-order prefix is not by itself a sound confidence set when stronger exact candidates are known separately.

### Block 18 — exact CSS candidate outside the prefix is computed but ignored — P1-001

The resolver computes `cssCandidate = ownerDoc.querySelector(locator.cssPath)`. But it never inserts that exact node into `candidates`.

`cssMatch` contributes six points only if that node is already among the first 5000 tag candidates. Therefore a valid exact structural candidate beyond the prefix can be known and still excluded from ranking.

### Block 19 — exact DOM-path candidate outside the prefix is also ignored — P1-001

The same is true for `domCandidate = resolveDomPathCandidate(locator.domPath, ownerDoc)`. It contributes four points only when included in the bounded tag prefix.

A safe bounded strategy can prioritize a small set of exact/structural candidates plus a bounded neighborhood; current code instead lets the prefix erase stronger evidence.

### Block 20 — exact target at position 5001 can lose to an in-window decoy with `confidence:'high'` — P1-001

Managed Chromium fixture created 5001 `<div>` candidates. The real target was candidate 5001 and was referenced by exact `id`, CSS path and DOM path. A decoy inside the first 5000 shared strong semantic fields but had a different id.

The current scoring/ranking model returned the decoy with:

- `score = 99`;
- `margin = Infinity` because the real target was absent from ranked candidates;
- `confidence = 'high'`;
- `ambiguous = false`.

This is a stronger failure than “target not found”: bounded omission creates **false high confidence** in the wrong current node.

### Block 21 — weaker decoy still produces a wrong medium-confidence restore — P1-001

A reduced fixture with fewer shared attributes returned the in-window decoy at approximately `score = 38`, above the acceptance threshold 34, with `confidence:'medium'`.

Therefore the failure is not dependent on an artificially maximal semantic clone. Stronger clones make it high confidence; weaker plausible clones can still be admitted.

### Block 22 — exact target inside the window is a positive control

Managed Chromium positive control placed the exact target well inside the first 5000 candidates.

Observed result:

- target id `exact` selected correctly;
- score **95**;
- margin **90**;
- confidence `high`;
- no ambiguity.

This confirms the scoring model can work when its candidate set contains the correct node.

### Block 23 — two equal in-window candidates fail closed as ambiguous — positive control

Managed fixture with two semantically identical candidates produced:

- top score **69** for both;
- margin **0**;
- `ambiguous:true`;
- no selected element.

The ambiguity threshold itself can fail closed. Block 20 bypasses that protection because the omitted exact target cannot participate in the margin calculation.

### Block 24 — frame-agent repeats the same bounded resolver shape — P1-001 parity

Fresh `frame-agent.js` independently implements the same first-5000 tag candidate collection and score/margin thresholds.

Thus the candidate-set soundness problem affects both local/top and permitted cross-origin frame restore. It is not a top-document-only implementation detail.

### Block 25 — local same-origin frame confidence composes conservatively — positive control

Top `resolveElementLocator()` explicitly changes a child `high` resolution to `medium` when `resolveFramePath()` was only `medium` confidence.

This is the correct direction: end-to-end locator confidence cannot exceed confidence in the path used to reach the child document.

### Block 26 — remote frame confidence can incorrectly upgrade to child `high` — P1-001/P1-171

`restoreRemote()` returns:

`confidence: result.confidence || boundary.frameConfidence || 'none'`

If the outer remote boundary/frame locator was only `medium`, but the child-local locator reports `high`, the non-empty child string wins and top records `high`.

This is the opposite of the same-origin composition rule. End-to-end remote confidence must be the conservative composition/minimum of frame-boundary and child-target confidence, not logical-OR precedence.

### Block 27 — frame identity and restore matching remain distinct owners

P1-171 still owns exact child document/frame generation. This tranche does not move resolver soundness into P1-171: the wrong-decoy reproduction occurs in one unchanged document. P1-171 participates only where the outer frame boundary itself is uncertain or stale.

## Blocks 28–35 — bounded work and scope truth

### Block 28 — worker sanitizer provides a real 250-item persistent boundary — positive control

Fresh service-worker `sanitizeSelectionSnapshot()`:

- marks a list over 250 as overflow;
- iterates only `items.slice(0, 250)`;
- bounds locator fields/frame path;
- enforces an overall snapshot JSON envelope;
- can reject overflow on strict import/content-meta paths.

Therefore this audit does not claim an unbounded durable/imported list. Any future acceptance must preserve this fail-closed worker boundary.

### Block 29 — top snapshot serialization computes locators before the final 250 slice — P1-154/P1-168

`serializeSelectionSnapshot()` maps every current local Include/Exclude through `createElementLocator()`, appends remote snapshot locators, and only then returns `includes.slice(0, 250)` / `excludes.slice(0, 250)`.

The output cap therefore does not bound locator-construction work and can hide aggregate local/remote scope after work has already been done. This is the existing P1-154 post-hoc cap root cause plus P1-168 computation detail.

### Block 30 — per-frame 250 cap does not imply aggregate 250 truth — P1-154

Every frame-agent may hold up to 250 Includes and 250 Excludes, while top also has local maps and can map multiple remote frames. UI counts aggregate all of them; portable serialization later slices the combined list to 250 per kind.

This is retained as P1-154, not a new restore P-code. Block 7 adds the separate requirement that cap refusal must not be reported as successful restore.

### Block 31 — child `sendState()` creates cumulative full-snapshot work — P1-168/P1-160

Every successful child add/remove sends `snapshot()`, and `snapshot()` creates a locator for every current Include and Exclude.

For 250 independent Include additions alone, the child constructs:

`1 + 2 + ... + 250 = 31,375` Include locators

across intermediate state notifications, before the final `get-state` serialization. This is bounded but quadratic cumulative work inside an interactive/restore path.

### Block 32 — each locator performs page-controlled sibling/text work — P1-168

Remote and top locator creation materialize sibling arrays, same-tag sibling arrays, text/context strings and structural paths. Top path building can repeatedly enumerate siblings up to depth limits; frame-agent locator similarly computes sibling indices and context.

The 31,375 construction count therefore understates actual DOM work. P1-168 already owns avoiding full sibling-array/string work and early bounds.

### Block 33 — ranking 5000 candidates can multiply sibling/text work per candidate — P1-168/P1-160

For every candidate admitted to ranking, `scoreLocatorCandidateV3()` may read candidate text, parent text, neighboring text and materialize parent sibling arrays plus same-tag subsets.

Candidate count is capped, but worst-case work within that cap can still scale with page-controlled sibling fan-out. A sound resolver should use cheap discriminators/known exact candidates first and reserve expensive context scoring for a small bounded finalist set.

### Block 34 — successful top Include performs multiple full outline rebuilds — P1-160

Current top manual Include path triggers full selection-layer rebuild in `addInclude()`, then `cleanupOrphanExcludes()` rebuilds again, then `cleanupAdSuggestions()` rebuilds again.

Even without ads/orphan cleanup, one successful click can therefore rebuild all outlines three times. Across N selections this creates another bounded-but-quadratic interactive amplification. It belongs to existing P1-160, not a new performance code.

### Block 35 — existing P1-001 browser regression does not cover these edge classes

`project_tools/browser_p1_001_selection_restore.py` proves useful historical controls:

- high-confidence shifted target;
- medium-confidence unique target;
- ambiguity fail-closed;
- same-origin iframe path restore;
- legacy compatibility.

It does not exercise:

- exact target beyond the 5000-candidate window;
- in-window high-confidence decoy with omitted exact target;
- duplicate/nested/cap remote restore actual-state settlement;
- remote boundary-confidence composition;
- final report reconciliation against child `get-state`.

The historical PASS remains valid for its original scenarios but cannot close current P1-001.

## Block 36 — dedup, acceptance and regression contract

### Root-cause classification

No new P-number is allocated.

- **P1-001** is the single owner for SelectionSnapshot restore soundness: candidate-set/confidence truth, rendered-target admission, idempotent application and truthful final report.
- **P1-200** owns exact remote selection-session ordering, especially clear/start/restore interleavings.
- **P1-171** owns exact remote frame/document generation and participates in frame-boundary confidence.
- **P1-154** owns aggregate selection count/byte admission and serialization scope.
- **P1-168** owns locator creation/scoring bounded computation.
- **P1-160** owns bounded/coalesced interactive discovery/render work.

Historical P1-001 family evidence explicitly describes locator restore confidence/ambiguity, so the >5000 false-high-confidence schedule is an acceptance refinement, not P1-229.

### Required acceptance contract

1. Restore commands use **set/idempotent semantics**, not the manual click toggle helpers.
2. Child restore returns a structured mutation receipt such as `added`, `already-represented`, `normalized-to-parent`, `capacity-refused`, `missing`, `ambiguous`; `ok:true` means the requested normalized postcondition is actually true.
3. Duplicate replay cannot remove a restored Include/Exclude.
4. Aggregate/per-frame capacity refusal is reported explicitly and cannot increment restored counters.
5. A failed remote clear cannot be silently followed by toggle-based restore; restore is generation/session fenced or independently idempotent.
6. Final user-visible/returned restore counts are reconciled against actual local+remote postconditions after final state refresh.
7. Locator candidate bounds are **sound**: exact id/CSS/DOM-path candidates that pass grammar/admission checks are explicitly considered even when outside a broad fallback scan; bounded fallback omission cannot manufacture high confidence.
8. Confidence margin is computed over a candidate set whose omission policy is reflected in confidence. If search budget prevents a sound conclusion, return degraded/missing/ambiguous rather than a false high result.
9. Remote confidence is conservative across every frame boundary and the child-local target.
10. Preserve the worker's 250-item/JSON-envelope defenses while making aggregate selection scope truthful.
11. Reduce repeated full-snapshot/outline/sibling work under existing P1-160/P1-168 budgets.

### Deterministic regression cases required for implementation closure

- duplicate remote Include twice: final Include remains present; second application is idempotent success/alias, not toggle removal;
- duplicate remote Exclude twice: final Exclude remains present;
- nested normalized Include/Exclude: result explicitly reports normalization and final-state cardinality matches report semantics;
- 251st remote selection: explicit capacity refusal, restored counter unchanged;
- failed/late clear followed by restore: no inversion of requested state and stale session cannot mutate current session;
- final `get-state` mismatch: top reports degraded/failure rather than stale success counters;
- exact target at candidate position 5001 plus strong decoy in first 5000: resolver selects exact target or fails/degrades; it never returns the decoy with high confidence;
- exact target inside window: preserve current high-confidence positive control;
- two equal candidates: preserve ambiguity fail-closed;
- medium frame boundary + high child target: end-to-end confidence is at most medium;
- local and remote duplicate semantics produce the same normalized postcondition/report contract;
- stress fixture demonstrates bounded finalist scoring/snapshot/outlining work without losing selection truth.

## Test / release interpretation

This audit adds no implementation and does not claim closure of any P-owner. Existing CI/deterministic suites remain the repository gate; the managed Chromium probes above are engineering evidence only. Real unpacked-Chrome extension QA, real optional cross-origin host-permission/frame lifecycle QA and real Yandex E2E remain separate release requirements.

`manifest.json` remains version `0.9.8`; no build, tag or GitHub Release is implied by this evidence.
