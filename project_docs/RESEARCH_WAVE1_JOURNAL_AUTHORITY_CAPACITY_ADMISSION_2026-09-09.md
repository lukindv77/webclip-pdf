# WebClip — Wave 1 transactional Journal authority capacity admission — 2026-09-09

Date: 2026-09-09  
Canonical production baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Canonical Registry blob: `81e5867c0e0936b9524ece8949c53ad4ed83523c`  
Research branch: `research/wave1-journal-authority-capacity-admission-2026-09-09`  
Mode: **RESEARCH-ONLY / PRE-IMPLEMENTATION CONCURRENCY SPECIFICATION**  
Production implementation: **NOT STARTED**.

Primary composed owners: **P0-072, P0-076, P1-043, P1-198**.  
Supporting boundaries: **P1-086, P1-208, P1-210, P2-019**.

No production, Registry, workflow, build, version, tag, release or deployment change is made by this branch.

---

## 1. Purpose

The retention/GC tranche established bounded authority pools for:

```text
F = journalFinalizations
E = pendingRemoteMutations
```

and the invariant:

```text
capacity pressure must never evict unresolved authority
```

The remaining ambiguity was how to enforce a cap safely when multiple user operations race.

A naïve flow is incorrect:

```text
count active rows
await / return to event loop
later add new row
```

Two callers can both observe the final free slot and oversubscribe the cap.

This tranche defines the exact admission linearization without introducing a separate drift-prone counter ledger.

---

## 2. Platform property used

IndexedDB read/write transactions whose scopes overlap are serialized by the transaction scheduler. A later transaction with the same object store in scope cannot start until the earlier overlapping transaction finishes; once it starts it sees the earlier committed changes.

This means WebClip can use the object store itself as the serialized capacity authority:

```text
one readwrite transaction
  -> count active/total
  -> validate exact owner/F where applicable
  -> add row
  -> commit
```

No separate `activeCount` meta record is required solely to prevent oversubscription.

Relevant platform references refreshed 2026-09-09:

```text
MDN IndexedDB Using IndexedDB
W3C IndexedDB 3.0 §2.7.2 Transaction scheduling
```

This is platform/source evidence, not yet a WebClip production/browser receipt.

---

# Part I — F admission

## 3. F capacity transaction

Target transaction scope:

```text
journalFinalizations
```

Mode:

```text
readwrite
```

Within the same transaction:

1. count current `state='admitted'` F rows;
2. count total F rows;
3. optionally delete only already-proven GC-eligible terminal F rows if their linked E rows are handled in a wider exact GC transaction;
4. re-count if cleanup occurred;
5. if active cap reached -> fail;
6. if total cap reached -> fail;
7. `add(F)`;
8. publish success only after transaction complete.

There must be no asynchronous Chrome/network work inside this transaction.

---

## 4. Recommended count implementation

Because J0 already proposes a `state` index, F active count can use:

```js
store.index('state').count(IDBKeyRange.only('admitted'))
```

Total count:

```js
store.count()
```

Both requests stay inside the same readwrite transaction that performs `add(F)`.

The implementation may use a cursor instead if measurement justifies it, but the count/add linearization must remain one transaction.

---

## 5. F capacity failure occurs after P but before physical effect

P and F live in different databases:

```text
P -> WebClipOperationReceipts
F -> WebClipJournal
```

IndexedDB cannot provide one transaction across those databases.

Correct monotonic ordering is therefore:

```text
admit durable P first
  ↓
attempt transactional F admission
  ↓
if F capacity succeeds -> continue
if F capacity fails    -> terminalize same P as failed-before-effect
```

This is safe because no PDF/download/Yandex/destructive effect has yet been admitted.

Do not delete P and pretend the request was never admitted.

A later reconcile must be able to report the exact failed-before-effect operation.

---

## 6. Crash schedule P exists but F does not

Possible schedule:

```text
P committed
worker stops
F never committed
```

Recovery rule:

```text
rediscover same P
inspect that no F/effect receipt exists
resume exact same admission or terminalize same P according to policy
```

Never mint P2 merely because P1 has not yet acquired F.

The common receipt is the continuity anchor across the cross-database gap.

---

# Part II — E admission

## 7. E capacity transaction must include F validation

E and F are both in `WebClipJournal`, so E admission should use one readwrite transaction spanning:

```text
journalFinalizations
pendingRemoteMutations
```

Within the same transaction:

1. read exact F by `finalizationId`;
2. verify F belongs to expected P;
3. verify `F.state == admitted`;
4. where D requires it, verify JG/ER authority or the exact references captured by F;
5. count active E rows;
6. count total E rows;
7. fail if cap exceeded;
8. `add(E.phase='prepared')`;
9. commit.

Only after this transaction commits can the operation proceed toward the remote effect-start boundary.

---

## 8. Active E phases

Active-capacity phases are:

```text
prepared
started-unknown
verified
```

Reason:

- `prepared` consumes a future destructive effect slot;
- `started-unknown` owns an unresolved external effect;
- `verified` still owns pending local finalization.

Terminal/manual retained phases do not consume the *active* cap:

```text
canceled-before-start
local-finalized
remote-complete-local-suppressed
manual-resolution
```

but all retained rows consume the *total* capacity bound.

This is why active and total limits are separate.

---

## 9. Counting E active phases

The initial v8 schema already has a `phase` index.

Within one readwrite transaction, count:

```text
prepared
started-unknown
verified
```

and sum them before add.

A future implementation may add an index such as an omitted/explicit capacity class if performance measurement justifies another schema version, but J0 v8 does not require it for correctness.

Avoid adding a migration solely for a premature optimization.

---

# Part III — why a meta counter ledger is not preferred

## 10. Counter ledger introduces a second derived truth

A meta counter such as:

```text
activeF=17
activeE=4
```

would itself need exact repair after:

- transaction abort;
- import/clear transition;
- GC;
- phase transition;
- legacy rows;
- future schema evolution;
- corruption/manual reset.

The object-store rows are already the source of truth.

Since overlapping readwrite transactions serialize, counting the authoritative rows in the same mutation transaction is simpler and has no counter drift state to repair.

---

## 11. When a counter could become justified later

If real measurement shows indexed `count()` is a material hot-path cost at the chosen caps, a derived counter can be introduced later under its own owner/generation/repair contract.

That is an optimization decision, not required for Wave 1 correctness.

---

# Part IV — effect-start transaction

## 12. E admission is not yet effect admission

After E is `prepared`, the external destructive call still must not start automatically.

The D effect-start linearization remains a second transaction:

```text
scope:
  journalFinalizations
  pendingRemoteMutations
  plus entries/meta if exact D authority requires same-transaction recheck
```

It verifies:

```text
F still admitted
E still prepared and belongs to P/F
JG/ER still valid where required
```

then persists:

```text
E.phase = started-unknown
```

Only after transaction commit may `/resources/move` or equivalent non-cancellable provider mutation be called.

---

## 13. Why E starts as `prepared`

Capacity/admission and effect start are distinct because work may be required between them, including exact source/provider checks.

The durable `prepared` row gives the same physical operation a stable target/effect identity without falsely claiming the external mutation started.

If F is revoked before effect start:

```text
prepared -> canceled-before-start
```

according to the retention contract.

---

# Part V — concurrency schedules

## 14. C1 — two F admissions race for one free slot

Initial:

```text
active F = cap - 1
```

A and B create readwrite transactions on `journalFinalizations`.

Expected:

```text
A starts first
A count sees cap-1
A adds F_A
A commits

B starts afterward
B count sees cap
B rejects
```

Exactly one winner.

---

## 15. C2 — two E admissions race for one free slot

Same rule with overlapping `pendingRemoteMutations` scope.

Exactly one `prepared` E is added.

No external provider call occurs for the rejected operation.

---

## 16. C3 — F revoked while E admission waits

If a clear/replacement transaction touching `journalFinalizations` commits before E admission transaction starts, E admission sees revoked/stale F and rejects.

No E is created and no external effect starts.

---

## 17. C4 — E admission commits before later F revoke

The operation owns a durable `prepared` E, but this still does not force the remote call.

At effect-start transaction, F is checked again.

If revoked by then:

```text
no remote effect
prepared E -> canceled-before-start
```

---

## 18. C5 — effect-start wins before clear/revoke

Effect-start transaction commits:

```text
E.phase=started-unknown
```

Then clear/revoke executes.

Expected:

```text
F may become revoked
E remains started-unknown
external effect is reconciled
never relabeled canceled
```

This preserves P0-072.

---

## 19. C6 — terminal rows fill total capacity

Active count may be below cap while total retained rows hit total cap.

Allowed behavior:

1. attempt bounded cleanup of *already eligible* terminal rows;
2. if total remains full, reject a new F/E before effect;
3. do not delete unresolved or young manual/evidence-limited rows.

Total capacity is therefore a durability safety valve, not permission for lossy eviction.

---

# Part VI — GC + admission composition

## 20. Prefer a single transaction where same-store cleanup is used to admit

If terminal rows are already independently proven GC-eligible, cleanup and new E admission may share one `pendingRemoteMutations` readwrite transaction:

```text
delete eligible terminal detail
count remaining active/total
add new prepared E
commit
```

But paired F/E cross-store GC still must respect the retention contract and terminal P summary prerequisites.

Do not recalculate GC eligibility using network/API work inside the capacity transaction.

---

## 21. Capacity transaction must remain short

Allowed inside transaction:

- IndexedDB reads/counts/cursors;
- exact local comparisons;
- deletes of rows whose eligibility was already established with durable evidence;
- add/put.

Forbidden inside transaction:

- fetch/Yandex API;
- Chrome Downloads API;
- crypto over large blobs;
- UI prompts;
- timers/retry sleeps.

Long transactions increase abort risk and storage contention.

---

# Part VII — source-level helper contracts

## 22. F admission helper

Conceptual signature:

```js
admitJournalFinalizationIntent({
  physicalOperationId,
  kind,
  journalEntryId,
  journalDatasetGenerationId,
  expectedEntryRevision,
  expectedLegacyJournalRevision,
  urlKey,
  siteKey
})
```

Within one readwrite tx it performs capacity + add.

Suggested errors:

```text
WEBCLIP_JOURNAL_FINALIZATION_ACTIVE_CAPACITY
WEBCLIP_JOURNAL_FINALIZATION_TOTAL_CAPACITY
```

Both mean no later external effect should start for that admission attempt.

---

## 23. E admission helper

Conceptual signature:

```js
prepareRemoteMutationEffect({
  physicalOperationId,
  finalizationId,
  kind,
  yandexContextId,
  sourceReceipt,
  targetPath
})
```

Transaction scope:

```text
[journalFinalizations, pendingRemoteMutations]
```

It validates F and capacity before `add(E)`.

Suggested errors:

```text
WEBCLIP_JOURNAL_FINALIZATION_STALE
WEBCLIP_REMOTE_MUTATION_ACTIVE_CAPACITY
WEBCLIP_REMOTE_MUTATION_TOTAL_CAPACITY
```

---

## 24. Effect-start helper

Conceptual:

```js
markRemoteMutationEffectStarted({
  remoteEffectId,
  physicalOperationId,
  finalizationId,
  expectedJournalAuthority
})
```

Returns an exact committed start receipt.

Remote mutation caller must require this receipt before calling the provider.

---

# Part VIII — P1-043 relationship

## 25. What this tranche does and does not solve

This capacity contract solves **row-count admission correctness** for the new F/E authority stores.

It does not close the broader P1-043 concern:

```text
shared-origin storage byte reservation/admission across concurrent large writers
```

F/E are intentionally small bounded metadata rows, so row-count limits plus record-size guards materially reduce risk, but global byte-quota concurrency remains a separate ACTIVE owner.

No P1 status changes are made here.

---

# Part IX — evidence

## 26. Deterministic repository model

Research file:

```text
project_tools/test_wave1_journal_authority_capacity_model.js
```

The model encodes:

- F active/total capacity;
- E active/total capacity;
- concurrent last-slot admission;
- stale/revoked F rejection;
- effect-start recheck;
- P-first/F-second cross-DB failure schedule;
- crash after P before F;
- unsafe separate count/add oversubscription negative control;
- same-transaction terminal cleanup + admission.

An independent deterministic replay of the key schedules passed 9/9 in the research environment.

The repository JS model is research evidence and still requires exact committed-source execution when implementation begins.

---

## 27. Browser control boundary

A local Chromium 144 headless IndexedDB control was attempted to raise the concurrency claim above source/spec evidence. The available browser process did not complete the headless run within the bounded research execution window, so no browser receipt is claimed.

This does not weaken the standards-level transaction-scheduling basis, but it means:

```text
WebClip-specific/current-Chrome capacity browser receipt = NOT AVAILABLE
```

The eventual J0/D implementation physical suite should include the concurrent-last-slot schedule on the exact tested Chrome build.

---

# Part X — future physical acceptance

## 28. Required physical schedules

On an exact production commit/current target browser:

1. seed F active count at cap-1;
2. issue two simultaneous admissions;
3. prove one F commits and one receives capacity error;
4. repeat for E;
5. prove no provider call for rejected E;
6. revoke F while E admission is queued;
7. prove queued E sees revoked F;
8. commit E prepared then revoke F before effect-start;
9. prove zero provider call and exact canceled-before-start;
10. commit effect-start then revoke F;
11. prove E remains started-unknown/reconciled;
12. fill total bound with terminal/manual rows and prove only eligible terminal GC occurs;
13. prove unresolved rows are never evicted;
14. worker restart between P and F reuses same P.

---

# Part XI — owner/status impact

## 29. No new P-code

The root causes are already owned by:

```text
P0-072
P0-076
P1-043
P1-198
P1-208
P1-210
```

Therefore:

```text
P1-231 = NOT ALLOCATED
```

---

## 30. Current decision

Preferred capacity authority is:

```text
NO derived counter ledger for initial Wave 1

F admission:
  one readwrite tx on journalFinalizations
  count active + total
  add F

E admission:
  one readwrite tx spanning journalFinalizations + pendingRemoteMutations
  validate F
  count E active + total
  add prepared E

Effect start:
  separate exact readwrite tx
  revalidate F/E/JG/ER
  persist started-unknown
  only then call provider
```

This gives a single local linearization point for each admission while keeping the source rows themselves authoritative.

---

## 31. Research status

```text
F transactional capacity admission        = DEFINED
E transactional capacity admission        = DEFINED
counter-ledger requirement                 = REJECTED for initial implementation
cross-DB P->F crash semantics              = DEFINED
E/F same-DB validation                     = DEFINED
effect-start recheck                       = DEFINED
standards/source basis                     = CONFIRMED
independent deterministic replay           = PASS 9/9
current-browser physical receipt           = NOT AVAILABLE
production implementation                  = NOT STARTED
P1-231                                     = NOT ALLOCATED
```

Project-wide coverage completion is not re-declared by this tranche. PD7 exact-target reconciliation remains separate.
