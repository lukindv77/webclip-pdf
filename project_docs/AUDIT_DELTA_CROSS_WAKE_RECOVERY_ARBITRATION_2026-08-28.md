# Audit delta — cross-wake recovery arbitration — 2026-08-28

Source-of-truth `main` immediately before this write: `e829458295079b1afa9ba4862d46997181c9c730`.

Docs-only audit checkpoint. Production runtime/config/manifest/tests are unchanged.

## Classification

No new P-number is assigned.

Fresh review extends **P1-192** from fixed-order maintenance-phase fairness to arbitration between **independent durable wake classes** that can overlap in one MV3 worker: periodic/retry Journal backup alarms and hourly background maintenance.

Queue-local owners remain:

- P1-064 local-download recovery fairness;
- P1-208 remote-save recovery fairness;
- P1-173 pending-turn admission;
- P1-043 shared persistent-storage reservation;
- P0-063 signed-transfer active reservations.

## Fresh source proof

### 1. Background backup and maintenance have independent alarm entry points

`chrome.alarms.onAlarm` currently dispatches:

- `JOURNAL_BACKUP_ALARM` -> `runDueJournalBackup('periodic-alarm', false).catch(...)`;
- `JOURNAL_BACKUP_RETRY_ALARM` -> `runDueJournalBackup('retry-alarm', true).catch(...)`;
- `OPERATION_LOG_CLEANUP_ALARM` -> `runLoggedOperationLogCleanup('alarm').catch(...)`.

Each alarm callback starts a long async chain and returns synchronously. P1-192 already owns the lifecycle consequence of those fire-and-forget chains.

There is no common durable scheduler receipt that says which background work class currently owns the next bounded slice or which class must be serviced next after restart.

### 2. Backup has an appropriate subsystem-local lease

Journal backup itself uses a durable `JOURNAL_BACKUP_LEASE_KEY` in Journal metadata. The lease has a token, operation id, acquisition/expiry times and compare-by-token renew/release semantics.

This is a strong positive control: periodic and retry backup paths cannot freely run two physical backup generations in parallel.

But the backup lease deliberately protects **backup against backup**. It does not coordinate backup with maintenance recovery of pending Journal appends, remote saves, local downloads or stats repair.

### 3. Maintenance owns a different long pipeline

`runLoggedOperationLogCleanup()` performs cleanup work and then recovery in fixed order:

1. pending Journal appends;
2. pending remote saves;
3. pending local downloads;
4. Journal stats repair.

The prior maintenance-phase audit already proved a persistent early remote backlog can consume a worker generation before later phases are entered.

### 4. Backup can overlap the maintenance window

`runDueJournalBackup()` is an independently alarm-started operation. It may perform:

- status/auth/root reads;
- recovery of a pending backup;
- Journal snapshot/export staging;
- Yandex folder/API work;
- signed transfer and verification;
- durable success/failure and future scheduling.

Nothing in the current backup lease prevents hourly maintenance from executing its own IDB/recovery/Yandex work concurrently, and nothing in maintenance waits for or gives scheduling priority to a current backup generation.

This is not automatically corruption: subsystem checkpoints/leases still provide important correctness barriers. The issue is lifecycle/resource fairness.

### 5. Local resource caps turn accidental overlap into deferral/failure pressure

The two chains share finite resources:

- same MV3 worker lifetime;
- same extension-origin IndexedDB/storage budget;
- Yandex API/network activity;
- offscreen signed-transfer count/byte reservations where applicable;
- OperationLog write queues.

P0-063 correctly caps signed transfers rather than allowing unbounded concurrency. P1-043 requires global persistent-byte reservation. Those controls are necessary, but once capacity is bounded an accidental earlier background class can cause another class to defer/fail admission.

Without a durable cross-class scheduling policy, repeated coincidence/restart can keep selecting the same class first even when each individual queue has a fair cursor.

## Required P1-192 refinement

### Durable background-work arbitration

P1-192's scheduler/lifecycle repair should cover at least these classes:

- backup due/retry;
- Journal append recovery;
- remote-save recovery;
- local-download recovery;
- stats/repair maintenance;
- bounded cleanup work that must precede/compose with them.

The implementation need not serialize all background work globally. It must provide deterministic bounded ownership/admission so one class cannot repeatedly consume every usable worker generation or scarce global slot.

Possible designs include a tiny durable next-class cursor plus per-class bounded slices, or a durable work coordinator that merges simultaneous wakes into one current generation.

### Preserve subsystem leases

The backup lease remains necessary and must not be replaced by a coarse global lock. A global lock held through a hung Yandex operation would make fairness worse.

Use layered ownership:

- short-lived global/class scheduling receipt for who receives the next slice;
- subsystem-specific exact operation/checkpoint generations for correctness;
- bounded actual-settlement reservations for shared physical resources.

### Simultaneous alarm delivery should coalesce intent, not erase it

If backup and maintenance wake together:

- both intents become durable/current scheduling demand;
- execution may serialize/round-robin according to bounded policy;
- servicing backup must not mark maintenance done;
- servicing maintenance must not consume the next backup obligation;
- worker termination preserves whichever class still needs a turn.

### User operations remain higher-value but cannot erase recovery

An explicit user save/import may reasonably receive interactive priority, but background recovery receipts must remain pending and receive a later guaranteed wake/slice. Interactive pressure is not proof that unknown external outcomes can be forgotten.

## Deterministic regressions

1. Periodic backup alarm and hourly maintenance alarm fire in the same worker generation: at most intended bounded work runs concurrently and both obligations remain represented until serviced.
2. Backup snapshot consumes >30s/pure IDB and worker is killed: next durable wake eventually services local-download recovery rather than always restarting backup/front phases.
3. Persistent remote-save backlog plus due backup: both receive progress within bounded wakes; remote queue cannot monopolize every generation.
4. Repeated backup retry failures do not prevent local-download terminal checkpoints from being reconciled.
5. Heavy local-download recovery does not indefinitely suppress a due backup or Journal stats repair.
6. Backup lease continues to block duplicate backup physical generations while cross-class scheduler still permits unrelated recovery slices.
7. Offscreen signed-transfer capacity full: denied/deferred class keeps its durable scheduling obligation and is retried fairly after actual reservations release.
8. Persistent-storage reservation pressure: one background class is deferred before materialization; deferral does not delete its checkpoint or reset scheduler to another class forever.
9. Old worker's late scheduler/cursor write cannot rewind a newer background-work generation.
10. No work pending: coordinator converges idle and does not create high-frequency wake loops.
11. Simultaneous periodic+retry backup alarms still collapse to the one backup lease/generation while maintenance remains independently schedulable.
12. Explicit user operation gets interactive priority but unknown background recovery remains durable and later receives a turn.

## Numbering result

No new item is created. **P1-192** remains primary owner, now explicitly including cross-wake/cross-class background arbitration in addition to phase resume and lifecycle ownership.

## Test / release state

No product tests were rerun. Historical gate remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS** as prior evidence only. No build, tag or Release was created.
