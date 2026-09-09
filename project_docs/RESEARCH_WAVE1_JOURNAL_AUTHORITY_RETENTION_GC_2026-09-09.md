# WebClip — Wave 1 Journal authority retention / GC / capacity contract — 2026-09-09

Date: 2026-09-09  
Canonical production baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Canonical Registry blob: `81e5867c0e0936b9524ece8949c53ad4ed83523c`  
Research branch: `research/wave1-journal-authority-retention-gc-2026-09-09`  
Mode: **RESEARCH-ONLY / PRE-IMPLEMENTATION RETENTION SPECIFICATION**  
Production implementation: **NOT STARTED**.

Primary composed owners: **P0-072, P0-076, P1-208, P1-210**.  
Supporting boundaries: **P0-039, P1-035, P1-043, P1-086, P1-090, P1-183, P1-194, P1-198, P2-019**.

No production file, Registry status, workflow, build, version, tag, release or deployment is changed by this research branch.

---

## 1. Purpose

J0 introduced two new durable authority stores:

```text
journalFinalizations     -> F
pendingRemoteMutations   -> E
```

and A0 already defines durable common operation receipts:

```text
WebClipOperationReceipts -> P
```

A correct schema without a correct retention policy is incomplete.

The failure modes are asymmetric:

```text
delete unresolved too early
-> later reconciliation may say not-admitted / failed
-> duplicate external effect becomes possible

never delete anything
-> IndexedDB grows without bound
-> admission/storage pressure eventually breaks the product
```

The retention contract therefore has to distinguish:

```text
active authority
unknown effect
verified-but-local-pending authority
terminal exact outcome
terminal partial outcome
manual/evidence-limited outcome
historical diagnostic detail
```

and it must coordinate GC across two different databases:

```text
WebClipJournal
WebClipOperationReceipts
```

without pretending there is one cross-database atomic transaction.

---

# Part I — positive controls in current architecture

## 2. Existing common OperationReceipt research already establishes the main invariant

The foundation source specification recommends:

```text
MAX_ACTIVE_OPERATION_RECEIPTS = 256
MAX_TOTAL_OPERATION_RECEIPTS = 2048
TERMINAL_OPERATION_RECEIPT_RETENTION_MS = 30 days
```

with the explicit invariant:

```text
capacity pressure must never delete unresolved authority
```

If active capacity is exhausted, new physical operation admission fails instead of evicting an unresolved receipt.

This same rule must apply to F/E.

---

## 3. Existing local download unknown state is a positive control

Current local-download recovery does not delete an unresolved intent merely because 24 hours elapsed.

Instead an old unresolved row transitions to:

```text
unknown / manual-resolution
```

while preserving metadata and operation identity.

This is the right pattern for destructive remote E as well:

```text
age/attempt exhaustion
!= effect did not happen
```

---

## 4. Existing remote-save stale retention is another bounded control

Current production already distinguishes an active pending remote save from a stale/unverified retained record and uses a longer stale retention window.

That demonstrates the product already accepts the idea that:

```text
operational retry queue
!= historical/evidence-limited retention queue
```

The new E contract should make this distinction stronger and exact.

---

# Part II — proposed engineering bounds

## 5. Recommended initial constants

These are implementation starting points, not product promises:

```js
const MAX_ACTIVE_JOURNAL_FINALIZATIONS = 256;
const MAX_ACTIVE_REMOTE_MUTATIONS = 128;

const TERMINAL_DOMAIN_RECEIPT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const PRESSURE_DOMAIN_RECEIPT_MIN_RETENTION_MS = 24 * 60 * 60 * 1000;
const MANUAL_REMOTE_RECEIPT_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;
```

Suggested record-size bounds:

```js
const MAX_JOURNAL_FINALIZATION_JSON_CHARS = 16 * 1024;
const MAX_REMOTE_MUTATION_JSON_CHARS = 64 * 1024;
```

The exact numbers remain tunable after real workload measurement.

The invariants are mandatory:

1. unresolved authority is never removed due to count/age pressure;
2. effect-start admission fails before the external call if durable E capacity is unavailable;
3. terminal detail may be compacted/GC'd only after a durable terminal summary exists in P;
4. manual/evidence-limited rows get a longer boundary than ordinary terminal success;
5. common P is retained at least as long as domain detail required for reconciliation.

---

## 6. Why F cap may align with OperationReceipt active cap

Every new user operation that needs Journal finalization should have at most a small bounded number of active F records.

A 256 starting cap aligns naturally with A0's proposed active P cap.

If the cap is reached:

```text
reject a new operation before render/effect
```

not:

```text
delete oldest admitted F
```

The user-facing state should indicate unresolved operations require reconciliation/cleanup.

---

## 7. Why E cap should be separate and smaller

E represents actual or potentially destructive Yandex mutation authority.

It should remain a smaller, more tightly bounded pool.

If E capacity is full while the operation still has not admitted the remote effect:

```text
fail before effect
mark/finish P/F according to failed-before-effect policy
```

Never call `/resources/move` first and hope to persist E afterward.

---

# Part III — F lifecycle and GC

## 8. F states

Current semantic D model:

```text
admitted
revoked
finalized
expired
```

Retention refines their meaning.

### `admitted`

Active authority.

Never GC because of age alone.

### `revoked`

Journal finalization authority was explicitly revoked by scoped clear/full replacement/etc.

This does **not** imply the external effect was canceled.

F remains until all linked E/P consequences are settled.

### `finalized`

Journal finalization committed successfully.

Potentially GC-eligible after linked domain/common receipts are terminal and retention requirements pass.

### `expired`

Must **not** mean `Date.now() - createdAt > TTL`.

It is allowed only when exact recovery evidence proves:

```text
operation is terminal
no external/non-cancellable effect was admitted
no linked domain receipt remains unresolved
```

This is effectively an exact no-effect closure for an abandoned pre-effect operation.

---

## 9. F age is not cancellation evidence

Forbidden maintenance rule:

```text
F older than N days
-> delete/expire
```

Allowed rule:

```text
P terminal failed-before-effect
+ no effect checkpoint exists
+ exact owner protocol proves no effect admission
-> F may become expired
```

This distinction is central to P0-072.

---

# Part IV — E lifecycle refinement

## 10. Required E phases

The D source specification defined:

```text
prepared
started-unknown
verified
local-finalized
remote-complete-local-suppressed
manual-resolution
```

Retention research adds one exact terminal state:

```text
canceled-before-start
```

This is useful because deleting a `prepared` row when F is revoked would otherwise erase evidence that the external effect was never admitted.

---

## 11. `prepared`

Durable exact target/source checkpoint exists, but external mutation has not crossed the effect-start boundary.

It is not auto-GC'd merely by age.

It is also not automatically executed by background maintenance.

If F is revoked before effect start, E transitions exactly to:

```text
canceled-before-start
```

instead of disappearing.

---

## 12. `started-unknown`

The provider call may have occurred.

This row is never TTL-deleted.

Maintenance may perform only operation-specific reconciliation reads needed to determine exact settlement.

If bounded attempts/time can no longer establish safe exactness, transition to:

```text
manual-resolution
```

while retaining the exact source identity, target path, context and prior observations.

---

## 13. `verified`

The remote effect is exact and verified, but local Journal finalization remains outstanding.

This is still active functional state.

Never TTL-delete.

It should have highest recovery priority because completing local finalization is cheaper and safer than repeatedly spending network/auth work on older unknown/prepared items.

This directly composes with P1-208.

---

## 14. `local-finalized`

Fully terminal successful domain result.

Ordinary terminal retention applies after common P contains a durable terminal summary.

---

## 15. `remote-complete-local-suppressed`

Terminal partial result introduced by D→E reconciliation:

```text
remote external effect is exact and complete
local Journal finalization was revoked/stale and intentionally did not occur
```

Retry disposition is `none` for the external effect.

This row is GC-eligible only after common P has archived the terminal partial truth.

---

## 16. `canceled-before-start`

Exact terminal proof that the mutation never crossed the external effect-start boundary.

This state is preferable to deleting `prepared` immediately because it lets common reconciliation distinguish:

```text
canceled before effect
```

from:

```text
receipt missing / evidence lost
```

Ordinary terminal retention applies.

---

## 17. `manual-resolution`

Automation no longer has enough evidence to classify exact physical outcome safely.

This is terminal for automatic mutation retry, but it is **not equivalent to a proven failed effect**.

Recommended retention is longer than ordinary terminal success because it is the last exact record of the unresolved physical authority.

A starting point of 90 days is reasonable for engineering evaluation, but the invariant matters more than the number.

After detailed E is eventually removed, common P must continue to say `evidence-limited/manual-resolution` for its own remaining retention window.

---

# Part V — recovery fairness

## 18. Phase-aware ordering

A maintenance batch should not simply scan oldest `updatedAt` and process everything equally.

Preferred priority:

```text
1. verified
   -> finish cheap local Journal finalization

2. started-unknown
   -> bounded exact remote reconciliation

3. prepared
   -> do not silently start destructive effect in generic maintenance

4. manual-resolution
   -> no automatic mutation
```

Within one phase, oldest-first is reasonable.

This prevents a large number of auth-blocked/remote work items from starving cheap local finalizations.

---

## 19. Generic reconciliation remains read-only

P1-210's common reconcile API must not turn a `prepared` destructive mutation into an external provider call.

Allowed output:

```text
domain-pending
same-operation-only
```

A later explicit same-operation continuation can decide whether to start the effect.

Generic background/status reads do not invent new destructive authority.

---

# Part VI — GC ordering across databases

## 20. There is no cross-database atomic transaction

P lives in:

```text
WebClipOperationReceipts
```

while F/E live in:

```text
WebClipJournal
```

Therefore cleanup must be designed as a monotonic ordering protocol rather than pretending all three records disappear atomically.

---

## 21. Required terminalization order

Preferred sequence:

```text
A. E/F reach exact terminal domain state

B. P is terminalized with compact immutable terminal summary
   including enough information to preserve:
     operationClass
     retryDisposition
     domain terminal class
     partial/manual distinction
     relevant exact receipt ids/provenance class

C. after domain retention threshold:
   delete terminal E + F together in one WebClipJournal transaction

D. after common receipt retention and after domain rows are absent:
   delete P
```

This ordering prevents domain GC from turning a known terminal operation into `not-admitted`.

---

## 22. Domain pair deletion should be atomic inside `WebClipJournal`

F and its terminal E rows are in the same database.

When they become GC-eligible, delete them in one bounded transaction spanning:

```text
journalFinalizations
pendingRemoteMutations
```

If the transaction aborts:

```text
all rows remain
```

If it commits:

```text
terminal E rows + F disappear together
```

Do not delete E in one wake and F in a later wake unless the intermediate state is explicitly supported.

---

## 23. P must not be GC'd while domain rows remain

Common receipt cleanup must first prove that no live F/E dependency remains.

If it cannot prove this safely:

```text
keep P
```

not:

```text
assume old domain rows are disposable
```

---

## 24. Missing P is not permission to delete F/E

If a terminal-looking F/E exists but its expected P is unexpectedly absent, do not immediately purge the domain authority.

The absence may itself be evidence of corruption/legacy transition/partial rollout.

Preferred classification:

```text
evidence-limited / repair-required
```

and retain domain detail until a bounded repair policy resolves it.

---

# Part VII — quota pressure

## 25. Functional authority has priority over diagnostics

Current WebClip already treats OperationLog as disposable before functional Journal state.

The new stores must follow the same hierarchy.

Under storage pressure:

1. clean eligible diagnostics/temp state first;
2. clean fully terminal F/E only when P terminal summary is durable and a minimum floor elapsed;
3. never delete admitted/started-unknown/verified/manual-young authority to make room;
4. if still full, fail new effect admission.

---

## 26. Pressure cleanup floor

A potential engineering policy is:

```text
normal fully-terminal domain detail: 30 days
quota-pressure eligible fully-terminal detail: >= 24 hours
```

but only when P already contains the terminal summary.

This is a tunable support/history tradeoff, not a correctness requirement.

Manual-resolution rows should not use the ordinary pressure floor because their detailed evidence may be the last exact recovery context.

---

# Part VIII — capacity admission semantics

## 27. F capacity check

Before creating a new F:

```text
count active admitted F
optionally GC only already-eligible terminal rows
if active >= cap:
  fail new operation before later physical effect
```

Proposed error family:

```text
WEBCLIP_JOURNAL_FINALIZATION_CAPACITY
```

---

## 28. E capacity check

Before persisting a new destructive E and before external call:

```text
count active E phases
optionally GC eligible terminal rows
if active >= cap:
  do not start external effect
  return failed-before-effect / capacity result
```

Proposed error:

```text
WEBCLIP_REMOTE_MUTATION_CAPACITY
```

The error is safe because the effect-start boundary has not been crossed.

---

## 29. Capacity race must be transactional

A simple separate count followed by insert is insufficient under concurrency.

Implementation should use one of:

- a meta counter/reservation ledger updated in the same transaction as E/F admission;
- another exact bounded reservation primitive;
- a serialized writer with durable counter validation.

This composes with P1-043's global byte/admission concerns.

The source specification does not yet choose the final counter implementation, but it rejects non-atomic `count -> later put` as the authority boundary.

---

# Part IX — record-size bounds

## 30. F must remain small

F should never duplicate:

- PDF bytes;
- comments;
- selection snapshot;
- complete remote metadata bodies;
- OperationLog event arrays.

It should contain only bounded identity/finalization scope state.

A 16 KiB JSON-character guard is a reasonable initial implementation target.

---

## 31. E must also remain bounded

E may contain source/result identity metadata, but no transport capability or file payload.

A 64 KiB initial JSON-character guard is ample for bounded paths, IDs, hashes, revisions and errors.

If a provider response cannot fit the bounded sanitizer, store only the exact fields required by the effect owner.

---

# Part X — terminal summary contract in P

## 32. Why P needs a compact terminal archive

After F/E detail is GC'd, P must still answer:

```text
What happened to this exact physical operation?
```

Minimum common terminal summary should preserve:

```js
{
  operationClass,
  retryDisposition,
  terminalCode,
  domainKind,
  domainTerminalClass,
  domainReceiptId,
  terminalAt,
  evidenceClass,
  postconditionSummary
}
```

It must not copy secrets, huge provider responses or raw page content.

---

## 33. Domain GC must check that terminal summary is durable

Required precondition:

```text
P.terminal == true
P.terminalSummaryArchived == true
```

Only then can terminal F/E become time-based GC candidates.

This avoids the schedule:

```text
E/F deleted
worker dies
P terminal summary never committed
future reconcile loses exact truth
```

---

# Part XI — manual-resolution aging

## 34. `started-unknown` aging rule

A stale threshold is allowed to change **recovery mode**, not truth.

Example:

```text
started-unknown
+ age >= 24h
+ bounded exact reconciliation attempts >= threshold
-> manual-resolution
```

Never:

```text
-> failed
-> canceled
-> delete
```

This mirrors the existing P0-039 philosophy.

---

## 35. Manual detail eventual boundedness

The project should not retain every evidence-limited provider receipt forever.

After a longer manual retention window and once P has archived the evidence-limited terminal result, detailed E may be removed.

After that point:

```text
P remains evidence-limited/manual-resolution
```

until its own common retention expires.

No later query may reinterpret the missing E as `not-admitted` while P still exists.

---

# Part XII — deterministic model

## 36. Research model

File:

```text
project_tools/test_wave1_journal_authority_retention_model.js
```

Observed local result:

```text
Wave 1 Journal authority retention/GC model: PASS cases=36
```

Covered schedules include:

- active F never GC;
- `started-unknown` never TTL-GC;
- `verified` never GC before local finalization;
- terminal domain rows require P terminal summary;
- manual-resolution longer retention;
- P cleanup ordered after domain cleanup;
- F/E capacity rejects new admission rather than evicting unresolved;
- stale unknown transitions to manual while preserving exact source/target evidence;
- revoked prepared E becomes `canceled-before-start`;
- revoked started E remains `started-unknown`;
- verified recovery priority before network/auth work;
- generic maintenance does not start prepared destructive effects;
- F age alone does not create `expired`;
- exact no-effect proof can terminalize old F;
- F/E domain pair deletion atomicity;
- terminal P summary preserves `settled-partial` after domain GC.

This is L2 architecture evidence only.

---

# Part XIII — source-level acceptance additions

## 37. Future D/J0 source should prove

At minimum:

1. F/E record-size guards exist;
2. unresolved F/E are never TTL-deleted;
3. active capacity exhaustion fails before external effect;
4. `prepared + revoked F` becomes exact `canceled-before-start` or equivalent terminal proof;
5. `started-unknown` cannot be rewritten as canceled by clear/revoke;
6. `verified` recovery is prioritized over expensive unknown/prepared work;
7. generic reconciliation does not start prepared destructive effects;
8. stale unknown becomes manual/evidence-limited rather than deleted;
9. terminal F/E GC requires durable terminal P summary;
10. F/E are removed atomically within WebClipJournal where paired;
11. P is not GC'd while referenced domain authority remains;
12. missing/corrupt cross-reference fails closed;
13. quota pressure removes diagnostics/eligible terminal details before unresolved functional authority;
14. manual-resolution has an explicit bounded retention policy;
15. no GC path fabricates `not-admitted` from evidence loss.

---

# Part XIV — owner impact

## 38. No new P-code

No new independent root cause is introduced.

Relevant current owners already cover the contract:

```text
P0-072   checkpoint deletion cannot cancel admitted external effects
P0-076   Journal authority continuity
P1-208   phase/status fairness
P1-210   exact reconciliation truth
P1-194   durability class truth
P1-043   concurrent storage/admission pressure
P2-019   shared storage/migration architecture backlog
```

Therefore:

```text
P1-231 = NOT ALLOCATED
```

---

## 39. Current research decision

Preferred lifecycle is now:

```text
P admitted
  ↓
F admitted
  ↓
optional E prepared
  ↓
E started-unknown / verified / terminal
  ↓
F finalized/revoked/expired by exact evidence
  ↓
P terminal summary durable
  ↓
retain domain detail
  ↓
GC terminal F+E atomically
  ↓
retain P summary
  ↓
GC P last
```

Active/unknown authority is never removed merely to satisfy age or quota pressure.

---

## 40. Research status

```text
F retention semantics                         = DEFINED
E phase/retention semantics                   = DEFINED
canceled-before-start state                   = DEFINED
manual-resolution aging                       = DEFINED
P -> F/E GC ordering                          = DEFINED
capacity fail-before-effect rule              = DEFINED
phase-aware recovery fairness                 = DEFINED
quota-pressure hierarchy                      = DEFINED
retention/GC deterministic model              = PASS 36/36
production implementation                     = NOT STARTED
P1-231                                        = NOT ALLOCATED
```

Project-wide coverage completion is not re-declared by this tranche. PD7 exact-target reconciliation remains separate.
