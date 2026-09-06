# P0-076 — current clear-confirmation target revision contract — 2026-09-06

Date: 2026-09-06  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch: `research/p0-076-journal-generation-cas-2026-09-06`  
Deterministic model commit: `500f1e221a5b65083c0894cf987968a9942498ab`  
Owners: **P0-076 ACTIVE**, adjacent **P0-010** destructive confirmation and **P1-210** lost-result reconciliation.

This checkpoint revalidates the historical bulk-confirmation finding against current source and narrows what remains unresolved. Runtime/manifest remain unchanged.

## 1. Historical finding is not uniformly current

The consolidated Journal-view authority family preserved the 2026-08-28 finding that destructive import/clear confirmation must bind the exact local Journal revision visible when the user confirms destruction.

Fresh current-source review shows staged import has since gained a substantial target-revision contract:

- preview receipt contains `expectedJournalRevision`;
- import lease stores/binds the preview receipt;
- commit receives the same expected revision;
- commit verifies current Journal revision and rejects stale replacement;
- resumed import gets a fresh preview/confirmation rather than silently reusing the old target revision.

Therefore it would be incorrect to restate the historical defect as “current import and clear both have no target revision”.

The remaining directly observed current gap is **clear confirmation**.

## 2. Current clear confirmation is still id/revision-unbound

Current Journal page:

- shows confirmation for site/all clear;
- creates an operationId after confirmation;
- sends `WEBCLIP_JOURNAL_CLEAR` with scope input + operationId;
- does not send the exact Journal revision against which the confirmation was displayed.

Worker handler calls `clearJournalEntries(...)` through the exclusive destructive mutation wrapper using scope + operationId only.

The page-local busy flag / worker exclusive destructive wrapper prevent overlapping bulk commands, but they do not prevent:

- another tab adding/editing a comment;
- a save appending a new row;
- recovery finalizing a row;
- another single-entry mutation;
- a mutation that commits while the user is still entering the confirmation code.

Thus a confirmation displayed at DB revision R1 may currently clear state R2.

## 3. Journal mutation generation is not the confirmation token

P0-076 introduces global:

```text
journalMutationGeneration
```

that rotates on destructive generation boundaries.

It is **not sufficient** to bind the user's clear confirmation because ordinary point mutations do not rotate it.

Example:

```text
confirmation shown under generation G1 / DB revision R1
-> another tab adds comment
-> generation still G1, DB revision now R2
```

A G1-only confirmation check would still accept and delete the new comment.

Therefore two P0-076 tokens have distinct roles:

- `journalMutationGeneration` — bulk epoch / entry-operation continuation across destructive boundaries;
- exact IDB `meta.revision` — snapshot identity for a destructive user confirmation that must become stale after **any** Journal mutation.

Do not conflate them.

## 4. Selected clear target receipt

Before displaying the destructive clear confirmation, obtain a bounded target receipt conceptually:

```text
{
  version: 1,
  kind: 'clear-all' | 'clear-site' | 'clear-url',
  scope: 'all' | 'site' | 'url',
  normalizedScope: '<bounded exact normalized value or empty for all>',
  expectedJournalRevision: '<exact IDB meta revision or empty legacy state>'
}
```

A worker-issued preview/receipt is preferable because it can normalize scope and read the authoritative IDB revision in one place. It does not need to be a secret/capability; the final worker transaction remains authoritative.

Any displayed count/summary that materially influences confirmation should be derived from the same revision snapshot or clearly treated as informational. The exact destructive fence is `expectedJournalRevision`.

The page must not silently refresh the receipt under an already-open confirmation dialog.

## 5. Clear transaction CAS

The final clear transaction already needs `[entries, meta, pending...]` for P0-072/P0-076 integration.

Before any destructive mutation or generation rotation:

1. validate normalized clear receipt / requested scope correspondence;
2. read current `meta.revision` inside the authoritative readwrite transaction;
3. compare to `expectedJournalRevision`;
4. mismatch -> abort with machine outcome `stale-journal-revision`;
5. match -> perform P0-072 detach/rebase + Journal clear + global generation rotation + ordinary revision update atomically;
6. publish `committed` only on `tx.oncomplete`.

No partial reset/quarantine/generation rebase should survive a stale confirmation because all occur in the same aborted transaction.

## 6. Machine outcome

Add bulk confirmation outcome:

```text
stale-journal-revision
```

This differs from single-entry:

```text
stale-journal-generation
stale-entry-generation
stale-entry-revision
```

because bulk confirmation is invalidated by any Journal mutation visible through the DB revision, not only a destructive generation change.

UI behavior:

- do not clear anything;
- close/invalidate stale confirmation;
- reload current Journal state;
- require a new explicit user confirmation.

Do not automatically retry with a refreshed revision.

## 7. Lost response remains a different owner

If clear commits but the response is lost, reusing the same old confirmation receipt will normally see a changed DB revision and fail stale. That prevents blind repeated clearing of later new entries, but it does not truthfully tell the user whether the first clear committed.

That is the existing **P1-210** destructive-operation reconciliation problem.

Future durable clear operation receipt should distinguish:

- not admitted;
- committed with resulting generation/revision;
- unknown/manual.

P0-076 target-revision CAS protects the **first commit admission**. It does not claim to close outer transport-loss truth.

## 8. Import positive control

Current staged import preview/lease is a positive control for the target-revision principle:

```text
preview -> expectedJournalRevision
lease binds preview
final replace checks same expected revision
stale revision -> reject before destructive replace
```

P0-076 clear implementation should reuse the same conceptual target-revision discipline without duplicating import staging semantics.

## 9. Interaction with scoped generation rebase

A scoped clear that passes expected DB revision may rotate global Journal generation G1 -> G2.

Within the same transaction:

- matching/indeterminate P0-072 durable rows detach;
- definite nonmatches rebase expected generation G1 -> G2;
- scoped Journal entries are deleted;
- global generation becomes G2;
- DB revision advances.

If the confirmation revision is stale, **none** of those transitions commit.

Thus user target authority is checked before reset relation consequences become durable.

## 10. Deterministic model

Added:

`project_tools/test_p0_076_clear_confirmation_revision_model.js`

Local Node result before durable write:

```text
P0-076 clear confirmation revision model: PASS
```

Controls:

1. confirmation R1 + point mutation R2 -> clear rejects `stale-journal-revision`;
2. stale confirmation does not rotate generation;
3. unchanged revision -> clear commits and advances generation/revision;
4. replaying the same confirmation after commit is stale rather than blindly clearing again;
5. receipt is bound to exact normalized scope; changing scope is invalid authority.

Architecture/model evidence only; runtime remains RED.

## 11. Source-level acceptance addition

Current P0-076 RED gate should eventually require:

- clear confirmation message carries/uses explicit target authority;
- worker clear path has `stale-journal-revision` machine outcome;
- clear transaction compares exact current DB revision before destructive mutation;
- generation rotation/reset rebase happen only after that comparison in the same transaction.

Import target-revision source should remain a regression positive control.

## 12. Owner boundaries

- **P0-076** — exact Journal revision/generation CAS;
- **P0-010** — destructive full-Journal confirmation/product semantics;
- **P1-210** — response-loss/unknown destructive outcome reconciliation;
- **P1-215** — staged import lifetime;
- **P0-072** — pending/external-effect quarantine/rebase during reset.

No new P-code is created.

## 13. Status

P0-076 remains **ACTIVE**. Current staged-import target revision is a positive control; current clear confirmation remains RED for this contract.

Runtime/manifest unchanged; manifest remains `0.9.8`; release remains `NOT READY`; no Actions/build/tag/GitHub Release is claimed.
