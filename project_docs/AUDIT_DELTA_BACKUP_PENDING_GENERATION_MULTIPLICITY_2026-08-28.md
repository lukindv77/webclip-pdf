# Audit delta — Journal backup pending-generation multiplicity — 2026-08-28

Source-of-truth `main` immediately before this write: `f14330969bf5e3a78fbfb4e11967bf8071096746`.

Docs-only audit checkpoint. Production runtime/configuration/tests/manifest are unchanged. No new P-number is assigned.

## Classification

This block refines the already established composition of **P1-052** (unknown backup upload settlement evidence), **P0-073/P0-074** (namespace/operation generation), **P1-184** (exact remote content/object proof), and **P1-207** (exact source Journal revision covered by a backup).

The fresh architectural conclusion is that the current singleton backup pending key cannot represent the required state once the existing findings are fixed correctly. A correct design must support **multiple independently addressable backup attempt generations** or an equivalent active/archive model.

No new P-number is needed because multiplicity is the storage-model consequence of preserving already-known unresolved physical generations.

## Current storage model is one global slot

Current runtime defines one key:

`JOURNAL_BACKUP_PENDING_KEY = 'webclipJournalBackupPendingUpload'`.

All prepared/verified/recovered backup checkpoint mutations serialize on the same Chrome Storage queue key and then execute either:

- `chrome.storage.local.set({ [JOURNAL_BACKUP_PENDING_KEY]: pending })`; or
- `chrome.storage.local.remove(JOURNAL_BACKUP_PENDING_KEY)`.

This correctly serializes late Chrome Storage settlement for the singleton. It does **not** make the singleton capable of representing more than one physical backup attempt.

## Current workflow avoids coexistence by deleting/consuming the old slot

Before starting a new backup, recovery reads the singleton pending object.

For a prepared checkpoint that repeatedly returns 404, current code eventually removes the key after the grace/attempt threshold and then later workflow can create a new timestamped backup.

P1-052 already establishes that this removal is unsafe: repeated 404 + time is not authoritative proof that the old signed PUT did not settle.

Once P1-052 is fixed by retaining the old unresolved generation, the singleton becomes a hard data-model conflict:

- keep A in the only slot -> no place to checkpoint a newly allowed B;
- overwrite the slot with B -> destroy A's exact recovery identity;
- encode both ad hoc in one object -> effectively reinvent a bounded generation collection without explicit lifecycle/CAS semantics.

## A new backup can legitimately coexist with an unresolved historical attempt

The product need not block all backup forever merely because a historical physical attempt cannot currently be reconciled.

Examples already required by existing audits:

### Namespace change

Attempt A belongs to account/root generation A/R1 and becomes unresolved. User intentionally configures current B/R2. The new namespace may need a current backup while A/R1 remains retained as historical unresolved evidence.

The existing backup namespace audit explicitly requires that a new B/R2 generation must not erase A/R1.

### Explicit duplicate-accepting policy

P1-052 permits a future product policy where a new timestamped backup is created even though an older upload outcome remains unknown, **provided the old unresolved identity is retained** and the duplicate risk is represented truthfully.

Again, this requires two generations to coexist.

### Source revision follow-up

P1-207 requires source revision A to remain associated with its historical uploaded object while current Journal revision B can remain backup-due. A follow-up backup for B may start while reconciliation/history for A still exists.

## Lease does not solve checkpoint multiplicity

The atomic Journal backup lease is a valuable positive control: it prevents two active backup builders from simultaneously acquiring the ordinary backup critical section.

But the lease is about **concurrent execution ownership**, not historical physical attempt storage.

After operation A ends/crashes/loses usable auth, its unresolved remote receipt may need to persist for days. A later operation B can correctly acquire the lease while A remains archival/reconciliation state.

Making the lease remain occupied until every historical unknown is solved would turn recovery evidence into a permanent availability lock. Deleting the evidence to free the lease would violate P1-052.

Therefore execution lease and attempt-generation storage must remain separate concepts.

## Required generation-aware storage model

Use a bounded durable collection keyed by a random backup attempt generation, or an equivalent active + unresolved archive representation.

Each generation should carry at minimum the already required receipts:

- random local backup attempt generation;
- operation receipt;
- phase (`prepared`, transfer-started/unknown, remote-verified, state-committed, stale-unverified/manual, etc.);
- account UID/root/config/auth operation context;
- exact remote path;
- source Journal revision from P1-207;
- exact staged export generation/content digest/expected bytes;
- remote object/content receipt when verified;
- created/attempt/reconciliation timestamps and bounded diagnostic state.

The scheduler may designate at most one current active generation per current policy/lease, but historical unresolved generations remain independently addressable.

## Compare-and-mutate is required

Moving from one singleton key to a collection is not sufficient by itself.

Every phase transition/delete/archive operation must prove the exact generation it is updating. A late A write must not:

- overwrite B;
- clear B because it believes the singleton belongs to A;
- mark B `remote-verified` using A metadata;
- consume B's source revision or remote path.

The existing Chrome Storage late-settlement serialization can remain an implementation primitive, but generation CAS/identity is still required above serialization.

## Bounded retention without false negative settlement

Multiple unresolved attempts require capacity policy. Follow the same evidence principle as pending remote saves/local downloads:

- active generations have a small hard admission cap;
- new optional backup may be rejected/deferred when safety capacity is full;
- unresolved old generations may move to compact archival/dead-letter form;
- archive pressure may discard expensive body/staging resources when ownership ends, but must retain enough compact identity to avoid converting `unknown` into `did not happen`;
- any final evidence eviction must be explicitly represented as evidence unavailable, not remote absence.

Do not solve multiplicity by restoring the current repeated-404 deletion heuristic.

## Success-state interaction

A `remote-verified` generation A may update backup history only with its own:

- namespace;
- source Journal revision;
- remote object receipt;
- scheduler/settings generation reconciliation.

It must not consume or delete a distinct newer B checkpoint merely because the singleton housekeeping path historically removes one global pending key after success.

Housekeeping should remove/archive by exact generation.

## Required regressions

1. A prepared upload has unknown settlement -> policy permits B -> B obtains a distinct checkpoint; A remains independently reconcilable.
2. A/R1 unresolved -> switch current config to B/R2 -> B backup succeeds; A/R1 receipt survives and is not queried under B.
3. B completes first -> success housekeeping removes/archives only B, not A.
4. A later verifies -> historical A result cannot overwrite current B success/source-revision state; it is recorded under A's exact namespace/revision semantics.
5. Late Chrome Storage write for A settles after B checkpoint creation -> cannot replace B.
6. Old A recovery returns 404 -> counters/status update only A generation.
7. A is `remote-verified` but backup-state commit crashes -> B may not consume A's verified receipt or vice versa.
8. Two generations reference equal textual path/size in different accounts -> namespace/generation keeps them distinct.
9. Two generations happen to reference same source Journal revision -> still separate physical attempts/content receipts.
10. Active-generation capacity reached -> new backup is deferred/rejected without evicting unresolved identities.
11. Archive compaction retains enough generation/path/namespace/content identity to avoid false negative claims.
12. Normal case with no unresolved history behaves as one ordinary active backup and preserves existing lease behavior.

## Duplicate check

- **P1-052** is the primary unknown-settlement preservation owner.
- **P0-073/P0-074** define per-generation Yandex namespace/context.
- **P1-184** defines exact remote physical result proof.
- **P1-207** defines exact source Journal revision carried by each attempt.
- Backup lease P0-046 remains execution mutual exclusion and is not repurposed as historical storage.

No new P1-211 is allocated.

## Test / release state

Documentation only. Product tests were not rerun. Historical gate remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. No build/tag/Release was created.
