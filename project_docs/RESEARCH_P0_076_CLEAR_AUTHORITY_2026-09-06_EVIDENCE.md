# P0-076 — exact Journal clear confirmation authority — 2026-09-06

Date: 2026-09-06  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch entering this block: `research/p0-076-journal-generation-cas-2026-09-06 @ 78e834b6074f4dc51bcd11fe090b297db786dd9c`  
Owner: **P0-076 ACTIVE**. Related owners: P0-010 / P1-206; P1-210 remains post-commit transport-result reconciliation.

This checkpoint refines the already-known bulk confirmation requirement using fresh current source. No production runtime is changed.

## 1. Current source distinction: notification revision vs authoritative DB revision

`journal.js` keeps:

```text
lastJournalRevisionToken
```

from:

```text
chrome.storage.local.webclipJournalRevision
```

through `readJournalRevisionToken()` and storage/runtime refresh signals.

That token is useful for detecting that the page should reload. It is **not** the authoritative destructive CAS token.

The worker's authoritative Journal revision is the exact `WebClipJournal.meta` row:

```text
key = 'revision'
```

written by `touchJournalDbRevision(tx, ...)` and read by `journalRevisionSnapshot()`.

Current staged import already uses this IDB meta revision in its preview receipt and re-reads the same meta key inside the final replace transaction before destructive replacement.

## 2. Current clear gap

Current full/site clear UI:

1. shows a typed destructive confirmation;
2. creates an operationId;
3. sends `WEBCLIP_JOURNAL_CLEAR` with scope + operationId.

It does not send an exact IDB target-revision receipt.

The worker therefore cannot prove that the Journal state the user confirmed is still current when clear begins.

## 3. Do not reuse `journalMutationGeneration`

The P0-076 global `journalMutationGeneration` has a different purpose:

- it rotates on destructive clear/import boundaries;
- ordinary point mutations do not rotate it.

Therefore it cannot by itself invalidate a clear confirmation after an intervening comment/append/edit.

Clear confirmation must bind the exact DB revision, because **any** Journal mutation after the confirmation snapshot should require a new destructive decision.

## 4. Required ephemeral clear receipt

Recommended semantic shape:

```text
journalClearAuthority = {
  version: 1,
  expectedJournalRevision: '<exact IDB meta revision>',
  scope: 'all' | 'site' | 'url',
  scopeKey: '<normalized exact scope key or empty for all>'
}
```

This is an ephemeral extension-page/worker action receipt, not portable Journal data and not a durable reset disposition.

The exact encoding may later use a bounded fingerprint for a sensitive scope if required by the confidentiality owner; the authority must still bind the exact normalized requested scope and must not be reusable for a different scope.

## 5. Preview timing

Do not derive `journalClearAuthority` from `lastJournalRevisionToken`.

Preferred flow:

1. user initiates full/site/url clear;
2. Journal page requests a worker-owned clear preview/snapshot;
3. worker reads authoritative IDB `meta['revision']` and normalizes/binds the requested scope;
4. page shows the typed confirmation for that receipt;
5. final clear command returns the same immutable receipt.

The preview may also include bounded count/summary values if the confirmation UI shows them. If shown, those values should be from the same readonly transaction/snapshot as the revision under the applicable P1-206 view-coherence contract.

## 6. Final admission must compare inside destructive transaction

An outer sequence like:

```text
read revision G1
await
start destructive transaction
clear
```

still has a TOCTOU window.

Required final clear transaction order:

1. open the authoritative readwrite transaction containing `entries`, `meta` and every P0-072 pending/receipt store that must transition atomically;
2. read `meta['revision']`;
3. validate `journalClearAuthority` version/scope/scopeKey;
4. compare current revision with `expectedJournalRevision`;
5. on mismatch: abort/no destructive mutation and return `stale-journal-revision`;
6. only after successful compare: perform generation rotation, P0-072 quarantine/rebase and entry clear;
7. touch new Journal DB revision;
8. report success only on transaction completion.

Current import replacement is the positive control: its final transaction performs an in-transaction `meta['revision']` comparison before continuing replacement.

## 7. Concurrent clear behavior

Two clear confirmations may both be created against revision G1.

If clear A wins and commits:

```text
G1 -> clear A -> G2
```

clear B later enters its serialized `meta` write transaction, observes G2 and returns:

```text
stale-journal-revision
```

B must not clear newly created post-A data.

## 8. Point mutation behavior

Schedule:

```text
clear confirmation receipt = R1
comment/append/edit commits -> DB revision R2
user finally submits old confirmation
```

Expected result:

```text
stale-journal-revision
no entry/pending/receipt mutation
reload/reconfirm
```

The 9-digit typed code remains evidence of user intent, not evidence that the target dataset remained unchanged.

## 9. Scope binding

A receipt for:

```text
scope=site, scopeKey=example.test
```

cannot authorize:

- clear-all;
- another site;
- a URL clear;
- another normalized scope produced after context changes.

Scope mismatch is invalid authority, separate from stale revision.

## 10. Machine outcomes

Relevant clear-admission outcomes:

```text
committed
invalid-authority
scope-mismatch
stale-journal-revision
```

No stale/invalid outcome performs destructive mutation.

Post-commit response loss remains P1-210: a committed clear whose response was lost must be reconciled rather than blindly repeated.

## 11. Deterministic model

Added:

`project_tools/test_p0_076_clear_authority_model.js`

Local scratch execution before durable write:

```text
P0-076 clear authority model: PASS
```

It proves:

- notification/cache revision cannot substitute for current IDB revision;
- scope is bound to the receipt;
- concurrent G1 clear receipts serialize so only the first can commit;
- point mutation invalidates an old confirmation;
- `journalMutationGeneration` is a different dimension and cannot replace DB revision authority.

## 12. Source-bound acceptance impact

The existing intentionally RED `project_tools/test_p0_076_source_contract.js` already requires:

```text
journalClearAuthority
stale-journal-revision
```

Implementation review must additionally verify that the worker comparison occurs **inside the destructive transaction before the first clear/quarantine/rebase mutation**, not merely in an outer preflight.

## 13. Status

Research for exact clear confirmation authority is **COVERED**. Runtime is **RED / NOT IMPLEMENTED**.

P0-076 remains ACTIVE. Runtime/manifest remain `0.9.8`; no build, tag, GitHub Release or Actions run is claimed.
