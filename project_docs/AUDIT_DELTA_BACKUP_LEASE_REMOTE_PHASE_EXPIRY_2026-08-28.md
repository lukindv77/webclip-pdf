# Audit delta — backup lease must remain live through the full remote phase — 2026-08-28

Source-of-truth `main` immediately before this write: `c6bdd2a733172f19eebedb5d8072865913ebcf06`.

Docs-only audit checkpoint. Runtime/tests/configuration/manifest are unchanged.

## Classification

No new P-number is assigned.

Primary owner: **P1-076** — Journal backup lease ownership/liveness.

Required composition:

- **P1-207** — backup source Journal revision/coverage generation;
- **P1-177** — scheduler generation and due-state;
- **P1-194/P1-184** — durable remote-attempt/object evidence;
- **P1-210** — unknown outer/remote settlement;
- **P0-074** — immutable Yandex operation context.

## Existing positive controls

Backup lease acquisition/renew/release are bounded atomic IndexedDB `meta` transactions.

`acquireJournalBackupLease()` rejects with `JOURNAL_BACKUP_BUSY` while the current lease has `expiresAt > now`.

`renewJournalBackupLease(lease)` verifies the exact token before extending expiry.

`releaseJournalBackupLease(lease)` is token-aware, so a stale owner cannot blindly delete a newer owner's lease.

These are good primitives.

## Fresh liveness gap

`JOURNAL_BACKUP_LEASE_TTL_MS` is 10 minutes.

The active backup flow:

1. acquires a lease;
2. stages the full Journal export;
3. calls `renewJournalBackupLease(lease)` once;
4. enters `uploadJournalExportStagedToYandex(...)`;
5. only after the whole remote phase returns does it write success state / housekeeping / release.

There is no lease heartbeat/renewal inside the remote phase and no final token revalidation immediately before publishing success state.

The one pre-network renewal mutates `lease.expiresAt`, but it only buys another fixed 10 minutes from that point.

## Why the remote phase can exceed the lease

The remote phase is not one bounded 90-second PUT.

Before/around the signed transfer it may perform multiple independent Yandex API calls:

- service-folder/tree verification/creation;
- upload-link acquisition;
- signed transfer;
- metadata verification;
- recovery/publication related calls depending on path/state.

`yandexApi()` gives each HTTP request its own bounded timeout (normally 25 seconds, configurable up to 120 seconds). Folder-tree creation walks path segments sequentially. A deep but valid configured root therefore permits many bounded requests whose **aggregate** duration is not bounded by the 10-minute lease.

Even without pathological depth, slow API retries/verification plus network transfer can consume a large part of the lease.

Thus fixed per-request deadlines do not prove lease liveness for the aggregate saga.

## Deterministic overlapping-owner schedule

1. Backup A acquires lease token LA.
2. A finishes staging and renews LA to `t0 + 10 min`.
3. A enters slow remote folder/upload/verify phase.
4. At `t0 + 10 min`, A still has a real remote request/side effect in progress.
5. Scheduler/manual backup B calls `acquireJournalBackupLease()`.
6. LA is expired by wall clock, so B legitimately receives a new lease LB.
7. B now performs recovery/new backup while A is still physically active.
8. A later completes its upload and proceeds to `mutateJournalBackupState(...)` without re-checking that LA is still current.
9. A and B can both publish backup success/failure state or interact with the singleton pending-backup evidence despite the feature claiming exclusive ownership.

A's eventual token-aware `release` does not fix the overlap: it correctly refuses to delete LB, but the conflicting remote/state work has already happened.

## Singleton pending checkpoint consequence

The current backup upload evidence uses `JOURNAL_BACKUP_PENDING_KEY` as a singleton.

Previous audit reasoning that a newer B could not overwrite/reinterpret A while A was live relied on the lease preventing concurrent backup generations.

Once LA can expire during A's actual remote phase, that premise fails:

- B may reconcile/read A's pending evidence while A is still changing remote state;
- B may create/update a later pending generation;
- A can return and perform housekeeping/state commits after B became owner;
- timestamps alone cannot restore generation ordering.

The lease therefore protects semantic ownership, not merely duplicate UI clicks.

## Required P1-076 refinement

### Lease liveness must cover actual side-effect lifetime

Choose one of two equivalent architecture classes:

1. renewable heartbeat/lease checks during long backup phases; or
2. a lease whose validity is tied to the actual operation receipt/settlement rather than a fixed wall-clock expiry that can pass while the owner is provably still active.

At minimum renew/check before and after every potentially long phase, including folder traversal and signed transfer, with enough remaining lease budget for the next bounded phase.

### No stale owner success commit

Immediately before changing authoritative backup success/failure/coverage state, A must prove that it still owns LA or that its historical result is being recorded through a generation-safe receipt that cannot overwrite B's current state.

If ownership was lost:

- preserve A's remote result as historical evidence;
- do not claim it as current scheduler coverage merely because it completed later;
- do not clear/replace B's pending generation;
- reconcile source revision/account/object identity independently.

### Lease expiry is not cancellation evidence

If LA expires while A's signed transfer is actually unsettled, the system cannot infer that A stopped. Before granting a conflicting physical operation, admission must account for the actual unsettled remote receipt.

This composes with P1-194/P1-210 and the offscreen actual-settlement budget.

### Deep-root boundedness

The aggregate service-folder phase should have its own operation deadline / maximum useful path-segment work. A per-request 25-second timeout multiplied by an effectively unbounded segment count is not a bounded backup phase.

This may be implemented as a remaining-deadline budget passed into folder traversal; it also makes lease-renew timing deterministic.

## Required regressions

1. Normal backup completes inside lease -> one owner, success normal.
2. Remote phase crosses original lease expiry -> A renews/retains ownership; B remains busy.
3. A loses ownership before next remote side effect -> A stops before issuing it.
4. A remote request is already unknown/unsettled when lease would expire -> B cannot start a conflicting physical generation solely because wall clock expired.
5. A loses lease, remote object later verifies -> record historical A result without overwriting B coverage/state.
6. B acquires newer lease -> stale A release cannot delete LB (preserve current positive control).
7. Deep root with many slow segment calls obeys aggregate deadline and cannot silently outlive lease.
8. Worker restart while A remote attempt is pending uses durable attempt evidence, not lease expiry, to decide whether new backup is safe.
9. A source revision older than B -> late A completion never marks B covered (P1-207).
10. Auth/root changes during A remain fenced by P0-074 even if lease is still valid.

## Numbering result

No new item. **P1-076** remains the lease owner; this delta strengthens it from atomic token CRUD to **semantic liveness for the full physical backup operation**.

## Test / release state

Documentation only. Product tests were not rerun. Historical evidence remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Runtime version remains `0.9.8`; no build, tag or GitHub Release was created.