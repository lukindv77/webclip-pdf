# WebClip — final current-baseline research coverage reconciliation — 2026-09-09

Date: 2026-09-09  
Canonical production baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Registry authority: `project_docs/RESEARCH_REGISTRY.md` on canonical `main`  
Research branch: `research/pd7-single-axis-scroll-stable-2026-09-09`  
C42 evidence branch: `research/p1-184-yandex-upload-content-receipt-2026-09-06@9efe631c640cec1274340179a815ac33d41021d8`  
Research mode: **RESEARCH-ONLY**

This reconciliation closes the research-coverage reconciliation cycle for the exact baseline above. It does not close ACTIVE findings, change Registry status, edit production runtime/manifest, or authorize build/tag/release/deployment.

## 1. Reconciliation question

The preceding current-baseline reconciliation identified exactly two blockers to a new project-wide coverage-complete checkpoint:

1. PD7 — obtain a feature-active/current-target physical receipt **or** prove the feature is not active in the selected Stable target;
2. C42 — convert the unbounded `NOT-TRIAGED / UNKNOWN` state into either real L5 evidence or an explicitly bounded `EXTERNAL-REQUIRED` terminal research state.

Both blockers are now resolved at the research-coverage level.

## 2. PD7 blocker — RESOLVED for the exact current Stable target

Exact current target physically executed:

```text
Chrome for Testing Stable 153.0.8010.36
revision r1681091
linux64
```

GitHub receipt:

```text
run 34298764784
job 102301000234
execution commit 69c7f1afbc35834ec814661e90ea2727a7ba08db
artifact 10084123959
```

Exact runtime discriminator:

```js
CSS.supports("named-feature(single-axis-scroll-container)")
```

Actual result:

```text
false
```

Therefore Single-axis scroll containers are not active in this exact selected Stable build. The current target does not require the feature-active A-H schedule.

The physical control also retained and independently rendered:

```text
raw PDF rows = 0
static-normalized PDF rows = 40
```

This remains useful P0-004/C20 causal evidence, but is not misclassified as feature-active single-axis behavior.

Current PD7 classification:

```text
CURRENT-STABLE FEATURE-INACTIVE / WATCH
```

Future Stable/browser target changes can reopen this Change Impact.

## 3. C42 blocker — RESOLVED as bounded external research terminality

Fresh C42 source/model work established:

```text
C42 = DETERMINISTIC-COVERED / FINDING (P1-184) + POSITIVE CONTROLS;
      EXTERNAL-REQUIRED for real provider checksum/object/public-link semantics
```

The prior unbounded `NOT-TRIAGED / UNKNOWN` state is retired at the campaign level.

What is proven in-repo:

- exact remote size is not exact content identity;
- same-path/same-size recovery/reuse can adopt wrong bytes;
- the root cause maps to existing P1-184, not a new P-code;
- operation-owned local SHA-256 is the required content truth;
- provider metadata SHA-256 is a candidate fast path only after live validation;
- bounded remote download + SHA-256 is the provider-agnostic fallback;
- RID/revision/path/size alone do not prove exact content.

Remaining live-provider matrix is explicit and requires an authorized disposable Yandex context. That L5 boundary is external evidence, not a hidden source-research gap.

P1-184 remains ACTIVE.

## 4. Remaining partial/external families are explicit, not hidden gaps

The full C01…C46 denominator remains in force.

Residual external/native/interactive boundaries already explicitly documented in the fresh-restart campaign include C41/C43/C44/C45/C46 and related Chrome/native/Yandex settlement cases.

Their state must not be upgraded to local PASS. However they no longer constitute unbounded research omissions because each has:

- an identified environment boundary;
- exact missing receipt/schedule;
- current source/model/managed-browser evidence where applicable;
- owner mapping or explicit no-new-owner result.

They remain implementation/release risks.

## 5. External baseline freshness

The external baseline was refreshed on 2026-09-09 and incorporated:

- Chrome 153 current-channel / PD7 rollout evidence;
- Chrome 154 Beta WATCH deltas;
- current SingleFile signals;
- current Obsidian capture/storage signals;
- Browsertrix capture-vs-replay QA patterns.

No fresh external observation established an independent unallocated WebClip root cause.

## 6. Numbering reconciliation

No new P-code is justified by the reconciliation.

In particular:

```text
P1-231 is not allocated
```

PD7 remains Change Impact against existing P0-004/P1-230/P1-187 and supporting geometry families. C42 maps to existing P1-184 with P0-073/P0-074/P0-078/P0-079 context owners.

## 7. Research coverage decision

For the exact canonical production baseline:

```text
main = d4f5b268fa3f7ced5a7bc68da52784863d614138
```

and the exact current Stable browser checkpoint:

```text
Chrome for Testing Stable 153.0.8010.36
```

the project-wide research denominator is now reconciled without a known unbounded coverage hole.

The strongest truthful project research state is therefore:

```text
DEEP-RESEARCH-COVERAGE-COMPLETE
```

This declaration means:

- current C01…C46 research coverage has been reconciled;
- known findings have owners;
- external/native residuals are explicitly bounded rather than hidden;
- current browser/platform Change Impact has been handled for the selected Stable target;
- no currently observed independent root cause lacks ownership/reconciliation.

It does **not** mean all findings are fixed or all external evidence has been executed.

## 8. Change Impact rule

This coverage-complete checkpoint is baseline-bound, not permanent.

Any later change to one or more of the following reopens only affected coverage cells:

```text
production runtime/source
product/architecture contract
browser/platform semantics or selected release target
Yandex/provider contract or live semantics
native/helper behavior
new user intent / external evidence
```

The correct response is targeted Change Impact, not restarting C01…C46 from zero.

## 9. Implementation state remains materially incomplete

Registry still contains many ACTIVE P0/P1 owners.

Research completeness and implementation closure remain separate:

```text
research coverage = COMPLETE for this baseline
implementation closure = INCOMPLETE
release regression = INCOMPLETE
release readiness = NOT READY
```

A finding can be research-terminal while its production owner remains ACTIVE.

## 10. Highest-risk implementation program after research completion

The next broad work should move from enumeration/research into risk-ranked implementation + Closure Sweep.

### Wave 1 — exact saved-artifact/generation chain

Treat as one end-to-end architecture program:

```text
P0-070 exact save generation
P0-023 exact source-document retry/cache generation
P0-079 immutable operation-owned PDF bytes
P0-073/P0-074 immutable Yandex account/root/config context
P1-184 exact remote content receipt
P0-078 publication policy after content proof
P0-076 Journal finalization CAS
```

This cluster has the highest silent-wrong-artifact risk.

### Wave 2 — destructive/recovery concurrency

Prioritize P0-072, P0-076, P1-183, P1-090, P1-164, P1-179, P1-207/P1-208 and related receipt owners.

### Wave 3 — selected fidelity / reversible materialization

P0-004 plus P1-218/P1-219/P1-220/P1-221/P1-224 should be treated as one rollback/static-representation architecture family, then revalidate P1-003/P1-150/P1-187/P1-229/P1-230.

### Wave 4 — real native/browser/provider settlement

Execute the explicitly bounded Chrome download/native Save As/permission/debugger/Yandex L5 receipts required by their owners and release gate.

### Wave 5 — scale/fairness/performance

Address Journal/discovery/parser/materialization budgets and queue fairness after silent-corruption/authority risks are reduced.

## 11. Closure discipline after this checkpoint

Every production implementation should use:

```text
exact owner scope
-> implementation
-> deterministic/source gate
-> required physical/external receipt
-> Closure Sweep across affected B1-B9 boundaries
-> Change Impact for affected C-cells
-> Registry transition only when exact closure contract is satisfied
```

Do not convert `ACTIVE` to `DONE` from research/model evidence alone.

## 12. Release state

No release-state change is justified.

Canonical release remains:

```text
RELEASE-READY = NO
manifest = 0.9.8
target WIP = 0.9.9
unpacked Chrome QA = pending
Yandex E2E = pending
release-blocker review = pending
explicit release decision = pending
```

Therefore:

```text
DEEP-RESEARCH-CRITICAL-CLOSURE-COMPLETE = NO
RELEASE-READY = NO
```

No build, tag, GitHub Release or deployment is authorized by this document.

## 13. Final reconciliation result

At this checkpoint:

```text
C01…C46 research denominator = reconciled
PD7 exact current Stable = feature-inactive receipt obtained
C42 = source/model terminal + EXTERNAL-REQUIRED L5
new unallocated root cause = none
P1-231 = not allocated
DEEP-RESEARCH-COVERAGE-COMPLETE = YES
DEEP-RESEARCH-CRITICAL-CLOSURE-COMPLETE = NO
RELEASE-READY = NO
```

The comprehensive research phase should now transition from broad discovery to implementation/closure work, while preserving targeted Change Impact for every future source/platform/contract delta.
