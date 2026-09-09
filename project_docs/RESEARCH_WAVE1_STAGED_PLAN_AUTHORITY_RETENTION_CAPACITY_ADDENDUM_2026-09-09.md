# WebClip — staged implementation plan addendum: Journal authority retention/capacity — 2026-09-09

Date: 2026-09-09  
Canonical production baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Parent branch: `research/wave1-staged-implementation-plan-2026-09-09`  
Inputs: J0 v8 migration, F/E retention/GC, transactional F/E capacity admission.  
Mode: **RESEARCH-ONLY CHANGE IMPACT ADDENDUM**.

No production or Registry change is made here.

---

## 1. DAG remains unchanged

```text
A0 -> U0 -> J0 -> A1 -> A2 -> B0 -> B1 -> C0 -> C1 -> D0 -> D1 -> D2 -> E0 -> E1 -> Z0
```

Retention/capacity mechanics are not new dependency nodes. They are mandatory acceptance content inside D0/D1/D2/E0/Z0.

---

## 2. D0 additions

D0 implementation must include:

- bounded F record shape;
- transactional active/total F admission;
- no eviction of admitted F;
- P-first/F-second monotonic cross-database ordering;
- exact handling of crash after P before F;
- explicit `canceled-before-start` terminalization path where appropriate;
- passive-v8 -> cas-v1 authority activation only after these writers exist.

---

## 3. D1 additions

D1 implementation must include:

- bounded E record shape;
- transactional E admission spanning `journalFinalizations + pendingRemoteMutations`;
- exact F validation in the E admission transaction;
- active phases `prepared/started-unknown/verified`;
- active and total capacity bounds;
- effect-start recheck and durable `started-unknown` before provider mutation;
- phase-aware recovery priority;
- no TTL deletion of unresolved E;
- stale unknown -> manual-resolution, not failed/canceled;
- terminal F/E pair GC only after durable P summary.

---

## 4. D2 additions

D2 success/finalization must terminalize common P with a compact immutable summary before domain detail becomes GC-eligible.

For composed saves/moves this summary must preserve terminal distinctions including:

```text
succeeded
settled-partial
canceled-before-start
manual/evidence-limited
failed-before-effect
```

No terminal domain cleanup can erase the only durable statement of the exact operation outcome.

---

## 5. E0/E1 additions

E0 must consume live domain truth when present and fall back to exact terminal P summary only after legitimate domain GC.

E1 must never infer retry eligibility from:

```text
missing F/E
old OperationLog error
transport rejection
```

It consumes only `retryDisposition` produced by E0.

---

## 6. Z0 closure additions

Wave 1 activation sweep must include:

1. F last-slot concurrency schedule;
2. E last-slot concurrency schedule;
3. no provider call on capacity rejection;
4. P committed / F absent restart schedule;
5. F revoke while E waits;
6. E prepared then revoke before effect-start;
7. effect-start then revoke;
8. unresolved F/E survive ordinary TTL and quota pressure;
9. stale unknown -> manual-resolution;
10. terminal P summary committed before F/E GC;
11. terminal F/E pair GC atomic within Journal DB;
12. P retained while domain rows remain;
13. legitimate domain GC does not change terminal reconciliation class;
14. `settled-partial` remains non-retryable after detail GC;
15. `canceled-before-start` permits a new attempt only because exact no-effect proof exists.

---

## 7. No counter-ledger tranche

Initial implementation should **not** add a derived `activeF/activeE` meta counter merely for concurrency correctness.

Standards-level IndexedDB scheduling allows authoritative count+add within one overlapping readwrite transaction.

If later performance measurement justifies derived counters, that should be a separately reviewed optimization with repair semantics.

---

## 8. Risk ordering

The highest-risk storage/authority cuts now are:

```text
J0  Journal v8 forward migration
B1  PDF cache v4 forward migration
D0  passive-v8 -> cas-v1 authority activation
D1  first exact destructive-effect path
E1  user-visible retry cutover
```

Retention/GC should not be postponed until after E1, because UI reconciliation depends on terminal truth surviving domain-detail cleanup.

---

## 9. Status

```text
staged DAG                              = VALID
F/E capacity linearization              = DEFINED
F/E retention/GC ordering               = DEFINED
terminal P archive dependency            = DEFINED
D/E/Z gates                              = REFINED
production implementation               = NOT STARTED
release                                 = NOT READY
P1-231                                  = NOT ALLOCATED
```

Project-wide coverage completion is not re-declared here; PD7 exact-target reconciliation remains separate.
