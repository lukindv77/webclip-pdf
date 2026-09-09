# WebClip — final current-baseline comprehensive research synthesis — 2026-09-09

Date: 2026-09-09  
Canonical production baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Registry authority: `project_docs/RESEARCH_REGISTRY.md` on canonical `main`  
Release authority: `project_docs/RELEASE_READINESS.md` on canonical `main`  
Research synthesis branch: `research/current-baseline-synthesis-2026-09-09`  
Research mode: **RESEARCH-ONLY**

Exact evidence heads incorporated:

```text
PD7 / final coverage reconciliation:
research/pd7-single-axis-scroll-stable-2026-09-09
@90b2a3f653a84d58e807b5f1ce9e20bec569d152

C42 / P1-184 Yandex content identity:
research/p1-184-yandex-upload-content-receipt-2026-09-06
@9efe631c640cec1274340179a815ac33d41021d8
```

This document supersedes the earlier same-day synthesis state in which PD7 was still open. It does not change production code, Registry statuses, manifest/version, build/tag/release or deployment.

## 1. Executive state

The comprehensive current-baseline research campaign has reached:

```text
DEEP-RESEARCH-COVERAGE-COMPLETE = YES
DEEP-RESEARCH-CRITICAL-CLOSURE-COMPLETE = NO
RELEASE-READY = NO
```

Meaning:

- C01…C46 are reconciled for the exact baseline;
- current-source findings are mapped to existing owners or explicit no-new-owner results;
- external/native/provider residuals are bounded with exact required receipts instead of remaining hidden UNKNOWNs;
- the current Chrome Stable platform delta PD7 has an exact physical checkpoint;
- no currently observed independent root cause requires a new P-code.

This is research completeness, not implementation completeness.

## 2. PD7 final result

Exact browser physically executed:

```text
Chrome for Testing Stable 153.0.8010.36
revision r1681091
```

Receipt:

```text
GitHub run 34298764784
job 102301000234
artifact 10084123959
```

Runtime feature discriminator:

```js
CSS.supports("named-feature(single-axis-scroll-container)")
```

Actual current-Stable result:

```text
false
```

Therefore the Single-axis scroll container platform change is not active in the selected Stable target. PD7 is now:

```text
CURRENT-STABLE FEATURE-INACTIVE / WATCH
```

The retained physical control also reconfirmed the existing scrollport-fidelity risk:

```text
raw retained representation: 0 / 40 fixture rows
static-normalized representation: 40 / 40 fixture rows
```

This supports existing P0-004/C20 reasoning but does not create a new owner.

## 3. C42 final research result

C42 is no longer an unbounded `NOT-TRIAGED / UNKNOWN` coverage hole.

Current strongest truthful state:

```text
DETERMINISTIC-COVERED / FINDING (P1-184) + POSITIVE CONTROLS
EXTERNAL-REQUIRED for real Yandex checksum/object/public-link semantics
```

The core defect is exact:

```text
path + exact size != exact remote content identity
```

Required authority:

```text
operation-owned local PDF generation
+ exact byte length
+ local SHA-256
+ exact immutable account/root/config context
+ remote exact-content proof
+ bound resource identity
+ publication only after content proof
+ Journal/recovery settlement bound to the same operation receipt
```

Provider metadata SHA-256 may be a fast path only after live validation; bounded remote download + SHA-256 remains the provider-independent fallback.

P1-184 remains ACTIVE.

## 4. Project architecture conclusion — the dominant problem is authority continuity

The project contains many apparently different defects, but the comprehensive evidence reduces them to several recurring architecture failures.

The most important cross-cutting rule is:

```text
an operation must carry one exact authority/receipt chain
from user admission
through capture/materialization/rendering
through physical bytes and external side effects
through Journal finalization and later recovery
```

Weak substitutes repeatedly proven unsafe include:

```text
URL equality
path equality
filename equality
byte-size equality
resource_id without content proof
timestamp freshness
current global account/root state
absence of a checkpoint
presence of a Journal row
late callback success without generation fencing
blind restore of page-owned state
```

## 5. Architecture Program A — Save Operation Receipt

Recommended central abstraction for the highest-risk cluster:

```text
SaveOperationReceipt
```

Conceptually it should compose at least:

```text
operationId
admissionGeneration
browserDocumentGeneration
application/SPAGeneration
selection/capture generation
print/materialization generation
operation-owned PDF cache generation
PDF byte length
PDF SHA-256
local-download/native side-effect receipt
Yandex account/root/config generation
remote path
remote exact-content receipt
remote resource identity/revision where proven
publication generation/outcome
Journal generation + entry revision
recovery/settlement state
```

This is not a recommendation to create one giant mutable object. The architecture should use immutable stage receipts linked by one operation identity and explicit generation transitions.

Primary owners composing this program include:

```text
P0-070
P0-023
P0-079
P0-073
P0-074
P1-184
P0-078
P0-076
```

This program should be implementation Wave 1 because it carries the highest silent-wrong-artifact risk.

## 6. Architecture Program B — Reversible Page Mutation Ledger

Multiple current findings have the same race:

```text
WebClip changes host-owned state
host/new generation changes it again
late WebClip cleanup blindly restores old state
```

Target abstraction:

```text
MutationReceipt {
  operationGeneration,
  targetIdentity,
  field/property,
  beforeValue,
  valueWrittenByWebClip,
  rollbackPolicy
}
```

Rollback rule:

```text
restore beforeValue only if current value still equals valueWrittenByWebClip
and the receipt still owns the current operation generation
```

For topology mutations, node identity/parent/anchor ownership must also be exact.

This architecture family unifies P1-218/P1-219/P1-220/P1-221/P1-224 and related preparation/cleanup findings under P0-004/P0-075 constraints.

## 7. Architecture Program C — External Side-Effect Settlement

Chrome download APIs, native Save As, Yandex PUT/publish and similar operations share a rule:

```text
caller timeout != cancellation proof
worker restart != cancellation proof
missing local callback != external failure proof
```

Target state model should distinguish at least:

```text
not-admitted
admitted
started
settled-success
settled-failure
unknown
manual-resolution
superseded-with-proof
```

Recovery must reconcile from durable operation receipts rather than infer outcome from absence.

Relevant owners include P0-072, P1-146, P1-156, P1-183, P1-184, P1-194, P1-208 and P1-210.

## 8. Architecture Program D — Bounded Capture and Static Representation

The selected-content contract requires truth under explicit limits, not unlimited DOM cloning.

The target architecture should separate:

```text
source/admitted logical identity
source rendered geometry/state receipt
budget admission
static representation construction
post-normalization geometry truth
physical renderer receipt
```

Important rules:

- budget before expensive materialization;
- user-reached virtual history is authority, not arbitrary programmatic scrolling;
- cross-origin/frame representation must be explicit;
- staticization may intentionally change layout, so post-normalization geometry must be re-measured;
- partial/degraded results must be truthful.

Primary owners include P0-004, P1-003, P1-150, P1-154, P1-167, P1-187, P1-228, P1-229 and P1-230.

PD7 remains future Change Impact WATCH for this program.

## 9. Architecture Program E — Journal as revisioned materialized view, not loose mutable storage

The Journal should be treated as a revisioned authority layer whose rows and derived views have explicit generations.

Research repeatedly supports:

```text
per-entry revision
+ Journal generation
+ composed-view revision
+ derived-index generation
+ backup source revision
```

rather than late writes against stale row identity.

Important owners include P0-050, P0-076, P1-162, P1-174, P1-206, P1-207 and P1-216.

## 10. Defensive security conclusion

Scope remains defensive security only.

The dominant security concern is authority/confidentiality crossing trust boundaries, not exploit discovery.

Priority trust rules:

- host page cannot be trusted with extension authorization state or sensitive input;
- incognito/private-profile state must remain isolated;
- durable URLs/logs/locator metadata must strip credentials, signed capabilities and non-durable secrets;
- OAuth state and account/root generations must be exact;
- imported historical IDs/operation data are not automatically live authority;
- external API evidence must never commit tokens/signed transfer URLs/sensitive PDF content.

Primary owners include P0-045, P0-066, P0-075, P1-165, P1-172, P1-176, P1-182, P1-190, P1-202 and P1-211.

## 11. Performance/scalability conclusion

The main scalability pattern is the same as the fidelity pattern:

```text
admit bounded work before materialization
```

Avoid:

- full Journal/tree/card materialization before filtering;
- unbounded DOM/frame discovery;
- large clone arrays before budget checks;
- recovery loops where one long item starves others;
- redoing expensive work when exact generation receipts permit safe reuse.

Important owners include P1-009, P1-035, P1-043, P1-064, P1-160, P1-162, P1-163, P1-167, P1-168, P1-173, P1-174, P1-192 and P1-208.

## 12. Implementation priority after research completion

### Wave 1 — silent wrong-artifact prevention

Implement/close the exact saved-artifact/generation chain first:

```text
P0-079 -> P0-070 -> P0-073/P0-074 -> P1-184 -> P0-078 -> P0-076
```

P0-023 must be composed into the same end-to-end generation proof.

### Wave 2 — destructive/recovery correctness

P0-072, P0-076, P1-183, P1-090, P1-164, P1-179, P1-207/P1-208 and related receipt owners.

### Wave 3 — selected fidelity and reversible materialization

P0-004 plus P1-218/P1-219/P1-220/P1-221/P1-224, followed by regression of P1-003/P1-150/P1-187/P1-229/P1-230.

### Wave 4 — real external/native settlement

Execute exact Chrome download/native Save As/permission/debugger/Yandex L5 schedules already bounded by research.

### Wave 5 — scale/fairness/UX performance

Journal/discovery/parser/materialization and durable-queue fairness after authority risks are reduced.

## 13. Required closure workflow for every owner

Research evidence supports one standard implementation discipline:

```text
1. freeze exact baseline SHA
2. identify owner + affected B1-B9/C-cells
3. implement minimal sufficient change
4. run deterministic/source gates
5. execute required real browser/native/provider receipt
6. perform Closure Sweep across adjacent authority boundaries
7. run targeted Change Impact
8. update durable evidence
9. change Registry state only if the exact owner acceptance contract is satisfied
```

Do not equate unit/model PASS with physical/external closure.

## 14. Change Impact rule after coverage completion

The declaration is bounded to:

```text
main d4f5b268fa3f7ced5a7bc68da52784863d614138
Chrome Stable target 153.0.8010.36
external baseline 2026-09-09
```

Any later source, product-contract, browser, Yandex/provider, native-helper or external-intent delta reopens only affected cells.

Do not restart the whole C01…C46 campaign unless the coverage model itself changes.

## 15. What not to do next

Do not:

- allocate `P1-231` merely to continue research momentum;
- continue random source enumeration after coverage reconciliation;
- merge research findings into production without owner-specific Closure Sweep;
- downgrade external L5 requirements into deterministic mocks;
- treat Stable major version as feature authority;
- treat path/size/RID/revision as exact remote byte identity;
- mark ACTIVE owners DONE from research evidence;
- infer release readiness from research completeness.

## 16. Release state remains unchanged

Canonical release declaration remains:

```text
NOT READY
manifest = 0.9.8
target WIP = 0.9.9
unpacked Chrome QA = pending
Yandex E2E = pending
release-blocker review = pending
explicit release decision = pending
```

No build, tag, GitHub Release or deployment is justified.

## 17. Final research conclusion

The comprehensive research phase has answered the project-wide discovery question for the current baseline.

The remaining dominant work is no longer “what else should we research?” but:

```text
implement known owners
prove exact closure
run real external/native receipts where required
preserve Change Impact discipline
```

Current final state:

```text
DEEP-RESEARCH-COVERAGE-COMPLETE = YES
known ACTIVE implementation owners = many
new unallocated root cause = none
P1-231 = not allocated
DEEP-RESEARCH-CRITICAL-CLOSURE-COMPLETE = NO
RELEASE-READY = NO
```
