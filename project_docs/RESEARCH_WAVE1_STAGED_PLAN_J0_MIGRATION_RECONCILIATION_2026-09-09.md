# WebClip — staged implementation plan reconciliation after J0 migration source specification — 2026-09-09

Date: 2026-09-09  
Canonical production baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Parent branch: `research/wave1-staged-implementation-plan-2026-09-09`  
J0 source specification: `research/wave1-journal-v8-migration-source-spec-2026-09-09`  
Mode: **RESEARCH-ONLY CHANGE IMPACT ADDENDUM**

No production or Registry change is made here.

---

## 1. Graph stays topologically valid

The current graph remains:

```text
A0 -> U0 -> J0 -> A1 -> A2 -> B0 -> B1 -> C0 -> C1 -> D0 -> D1 -> D2 -> E0 -> E1 -> Z0
```

J0 is confirmed as a real migration tranche rather than merely a note inside D0.

---

## 2. J0 package boundary is refined

Earlier planning treated worker+journal as package-atomic because both currently open WebClipJournal.

The preferred implementation is now stronger:

```text
service worker = sole structural migration owner
journal page   = bootstrap via worker, then direct exact-v8 reader
```

Therefore the package still changes both:

```text
service-worker.js
journal.js
```

but only the worker contains v7->v8 schema construction.

The Journal page must abort unexpected `onupgradeneeded` rather than duplicate the schema.

---

## 3. J0 trust level

J0 creates storage capacity only:

```text
WebClipJournal v8
journalFinalizations
pendingRemoteMutations
datasetGeneration
authorityMode=passive-v8
```

Trust remains passive.

Do not advance to a Journal-authority trust level until D0 explicitly activates:

```text
authorityMode=cas-v1
```

---

## 4. J0 is forward-only

After successful v8 migration, literal rollback to current v7 code is not a safe runtime path.

The staged plan therefore classifies J0 similarly to B1 in one important respect:

```text
schema migration commit is a forward compatibility boundary
```

Rollback means a new v8-aware fix, not old-package database recreation.

---

## 5. J0 physical gate is mandatory before D0 activation

Before D0 may activate CAS authority, J0 must prove on an exact production commit/profile:

- v7 data preservation;
- worker-only migration ownership;
- cooperative and non-cooperative blocker schedules;
- no late migration after bounded timeout;
- aborted upgrade rollback;
- stable JG across reopen/restart;
- no eager ER backfill;
- no legacy authority promotion;
- stale v7/newer authority-mode fail-closed behavior.

---

## 6. D0 receives a refined legacy bridge

For rows with no real ER, D0 uses:

```text
JG + legacy-v7 sentinel + captured JR
```

until the first successful CAS writes real ER.

This refinement belongs in D0 gates but requires no new dependency node.

---

## 7. Revised high-risk migration boundaries

The implementation plan now has two explicit forward schema boundaries:

```text
J0  WebClipJournal v8
B1  WebClipPdfRetryCache v4
```

Both require exact opener/protocol choreography before production activation.

They should not be hidden inside large multi-owner patches.

---

## 8. Status impact

```text
staged DAG                         = VALID / REFINED
J0 worker-only migration owner     = DEFINED
J0 physical gate                   = DEFINED
D0 legacy bridge                   = REFINED
production implementation          = NOT STARTED
release                            = NOT READY
P1-231                             = NOT ALLOCATED
```

Project-wide coverage completion is not re-declared by this addendum; PD7 exact-target reconciliation remains separate.
