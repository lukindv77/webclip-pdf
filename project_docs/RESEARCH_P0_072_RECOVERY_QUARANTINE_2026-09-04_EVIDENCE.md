# P0-072 — Journal reset vs admitted recovery authority — design checkpoint — 2026-09-04

Date: 2026-09-04  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch: `research/p0-072-recovery-quarantine-2026-09-04`  
Owner: **P0-072 ACTIVE** — `Bulk clear/replace cannot treat deletion of checkpoints as cancellation of already admitted non-cancellable external side effects.`

This is an interruption-safe research/design checkpoint. It does not claim implementation closure, browser acceptance, remote Yandex semantics, release readiness, or a P-code transition.

## 1. Fresh source finding

Current `service-worker.js` still performs the exact destructive schedule owned by P0-072:

- `clearJournalEntries()` opens one readwrite transaction spanning Journal entries plus `pendingAppends`, `pendingDownloads` and `pendingRemoteSaves`;
- clear-all calls `clear()` on all three recovery stores;
- URL/site clear scans those stores and `cursor.delete()`s records whose normalized `data.meta` matches the requested scope;
- `commitStagedJournalImport()` clears the same three recovery stores before replacing Journal entries;
- `appendJournalEntry()` interprets a missing required durable checkpoint as intentional concurrent clear/import and suppresses stale Journal resurrection;
- `appendJournalEntryFromDurableCheckpoint()` consequently returns `cancelled:true` for that missing-checkpoint case.

The transaction boundary is useful for atomicity, but the lifecycle meaning is wrong. Removing the durable receipt does not cancel a Chrome download, undo a verified remote object, or prove that an already admitted external effect never happened.

The pre-existing stale-Journal prevention must be preserved: an old completion may never append into the replacement Journal generation. P0-072 therefore requires **preserve + quarantine + reconcile**, not either “keep replaying normally” or “delete as cancellation”.

## 2. Current recovery state machines inspected

### `pendingAppends`

Rows are keyed by stable future Journal id and contain normalized Journal metadata plus operation id/timestamps/failure counters. Failure updates use a spread of the current row. `recoverPendingJournalAppends()` retries the Journal append while a checkpoint exists.

Historical/current-source reconciliation is important: the generic `safeAppendJournalEntry()` queue is no longer the live pre-side-effect authority for current local download/Yandex save paths. Nevertheless an existing row may represent metadata after a physical save window and cannot be silently reinterpreted as cancelled merely because Journal was reset.

### `pendingDownloads`

The durable intent is written **before** `chrome.downloads.download()` and initially uses `downloadId = intent:<operationId>`. A successful Chrome start later binds the intent to the numeric persistent DownloadItem id. That bind uses `{...intent, ...}`, so additional disposition metadata can survive the key transition.

Current local recovery already has the correct unknown-settlement direction from P0-039/P0-048:

- `complete` finalizes the Journal only through the durable checkpoint;
- `interrupted` is terminal and may clean up;
- an unmatchable intent or missing DownloadItem after 24 h becomes `kind:'unknown'`, `recoveryState:'manual-resolution'` rather than being deleted;
- ordinary maintenance skips unknown rows;
- active and unknown capacity are bounded separately;
- a later exact DownloadItem can still recover a retained unknown row.

P0-072 must preserve those controls while preventing a post-reset `complete` from resurrecting an old Journal entry.

### `pendingRemoteSaves`

Rows are written before remote transfer/finalization with phase `prepared`; verified remote existence is persisted as `remote-verified`. Recovery probes the existing remote path/size and may complete publication/Journal finalization rather than blindly repeating transfer.

Most later updates spread the current row, but `checkpointPendingRemoteSaveIntent()` has whole-record replacement branches for existing `prepared`/`stale-unverified` state. Those branches would erase a newly added reset disposition unless explicitly fenced.

`stale-unverified` currently does not consume active remote capacity, but generic cleanup deletes stale rows after 30 days and trims over a cap of 100. A reset-quarantined unresolved receipt must be exempt from that generic TTL/cap eviction; otherwise P0-072 would merely move the evidence-loss bug into maintenance.

## 3. Architecture decision — Option A, strict in-place quarantine

Choose **Option A: versioned in-place quarantine inside each existing pending store**.

Do **not** choose a separate `recoveryQuarantine` store for this repair. The current late-settlement code already knows how to bind/update the existing record in place. Moving records to a fourth store would require every local bind, exact DownloadItem settlement, remote verification, retry, cleanup and late writer to dual-read or atomically migrate across stores. That is a larger schema/migration surface and creates new windows where a late event looks only in the original store and loses the authority it is supposed to reconcile.

This decision does not preclude a future schema-owned archival store if a later bounded UX/audit requirement justifies one. It is not needed to close the current root cause.

## 4. Proposed durable disposition contract

Each reset-affected pending row keeps its existing key, operation identity and payload and gains one orthogonal top-level field:

```json
{
  "journalResetDisposition": {
    "version": 1,
    "resetId": "opaque unique reset generation",
    "kind": "clear-all | clear-url | clear-site | import-replace",
    "scope": "all | url | site",
    "scopeKey": "normalized exact URL/site key or empty",
    "sourceOperationId": "checkpoint operationId at quarantine",
    "quarantinedAt": 0,
    "state": "quarantined",
    "outcome": "pending | complete | interrupted | remote-verified | unknown",
    "resolution": "reconciling | terminal | manual-resolution",
    "updatedAt": 0
  }
}
```

Rules:

1. `version`, `resetId` and `sourceOperationId` are immutable for that quarantine lifetime.
2. Ordinary row writers must preserve the exact current disposition; a whole-record writer may not replace a quarantined row.
3. Only a dedicated transition helper may advance `outcome/resolution`, after re-reading the current row inside the same readwrite transaction and matching the expected `resetId` plus operation identity.
4. A later old writer may add factual settlement data (for example numeric DownloadItem id or verified remote identity) but may never clear the disposition or restore normal Journal-append authority.
5. A second Journal clear/import does not overwrite an already quarantined unresolved disposition. It is already detached from Journal generation; retaining the first reset generation avoids stale-reset overwrite races.
6. Missing checkpoint, quarantined checkpoint and ordinary active checkpoint become three distinct states. “Missing” is not silently renamed “cancelled”.

## 5. Reset transition must share the destructive IndexedDB transaction

For clear-all, scoped URL/site clear and import replace:

1. create one `resetId` for the destructive operation;
2. use the existing single `WebClipJournal` readwrite transaction that already contains the Journal mutation;
3. cursor the three pending stores;
4. for rows in scope, replace `cursor.delete()`/store `clear()` with `cursor.update({...current, journalResetDisposition: ...})` when not already quarantined;
5. enforce quarantine capacity inside that same transaction and fail/abort before publishing success if the bounded manual/recovery capacity cannot accept the transition;
6. only then complete the existing Journal clear/import work in that transaction.

A transaction abort must therefore restore **both** the old Journal rows and all original checkpoint rows/dispositions. No post-commit copy into quarantine is acceptable.

Scoped clear keeps the existing exact normalized URL/site predicate over `row.data.meta`; nonmatching checkpoints stay untouched.

Import replace applies the policy to every old pending row before imported entries become the new Journal generation.

## 6. Settlement state machine after reset

| Store / pre-reset state | Reset transition | Allowed factual late settlement | Journal effect | Terminal / retention consequence |
|---|---|---|---|---|
| `pendingAppends` active | quarantine, `outcome=pending`, `resolution=manual-resolution` unless a stronger local receipt exists | failure metadata may update but must preserve disposition | never append into replacement Journal | retain as bounded manual authority; no short TTL deletion |
| `pendingDownloads` `intent` | quarantine, `pending/reconciling` | exact late start may bind `intent:*` to numeric DownloadItem while preserving reset id | never append | continue DownloadItem reconciliation |
| `pendingDownloads` numeric/in-progress | quarantine, `pending/reconciling` | `complete`, `interrupted`, or absence/unknown | never append | complete -> terminal-complete; interrupted -> terminal-interrupted; unknown -> manual-resolution |
| `pendingDownloads` `unknown` | preserve unknown/manual and add quarantine | later exact DownloadItem may still bind/reconcile | never append | unresolved authority is retained and bounded, not TTL-deleted |
| `pendingRemoteSaves` `prepared` | quarantine, `pending/reconciling` | existing recovery may observe remote object/size/publication under its current identity constraints | never append | verified -> terminal-remote-verified; unresolved -> manual/unknown, not cancelled |
| `pendingRemoteSaves` `remote-verified` | quarantine, `remote-verified/terminal` | may enrich exact verified receipt only under same operation/reset identity | never append | retain terminal receipt for bounded audit/cleanup policy |
| `pendingRemoteSaves` `stale-unverified` | quarantine, `unknown/manual-resolution` | explicit future reconciliation may still resolve | never append | exempt from generic 30-day stale deletion while unresolved |

`complete`, `interrupted`, `remote-verified` and `unknown` deliberately remain different outcomes. A timeout, missing response or Journal reset is not a synthetic terminal outcome.

## 7. Admission, retention and cleanup

Quarantine must not consume ordinary active queue capacity forever, but unresolved authority must not be destroyed to make room.

Required bounded policy:

- count active, reset-quarantined unresolved/manual and terminal-retained rows separately;
- use finite per-store quarantine caps; if a destructive reset would exceed the cap, abort that reset fail-closed rather than dropping receipts;
- new irreversible operations must also fail closed if their relevant unresolved/manual capacity is exhausted;
- terminal rows may be removed only under a separately defined bounded terminal-retention rule after terminal evidence is durably recorded;
- unresolved/manual rows are **not** eligible for ordinary short TTL deletion or “trim oldest” eviction;
- `cleanupStalePendingRemoteSaves()` must skip unresolved reset-quarantined rows;
- P0-039 local unknown/manual behavior remains valid and must not regress.

The exact terminal-retention duration is implementation detail; the safety invariant is that only proven terminal receipts may be age/cap cleaned automatically.

## 8. Whole-record writer audit / required fencing

Writers that already spread the current row are compatible only if they also reject attempts to remove/change `journalResetDisposition`.

Writers requiring explicit hardening:

- `checkpointPendingJournalAppend()` — currently whole `put(item)`;
- `checkpointPendingLocalDownloadIntent()` — currently whole `put(item)` under deterministic intent key;
- `checkpointPendingRemoteSaveIntent()` — currently replaces existing `prepared` and `stale-unverified` rows with newly built item objects.

Writers whose current spread behavior is useful but still needs reset-id assertions around semantic transitions:

- local intent -> numeric DownloadItem bind;
- local unknown/manual transition;
- remote `remote-verified` transition;
- remote failure/stale transitions.

A stale writer must never be able to turn a quarantined row back into an ordinary active row merely by issuing a whole-record `put()`.

## 9. Deterministic regression checkpoint

First branch commit:

- `project_tools/test_p0_072_checkpoint_quarantine.js`;
- commit `66a8614feae8d2bea4b916b47d01a38376fea724`.

The source-bound assertions are intentionally **RED** on canonical baseline `d4f5b268...`:

- current clear-all still clears all three recovery stores;
- current import replace still clears all three recovery stores;
- current scoped clear still deletes matching pending rows;
- no versioned `journalResetDisposition` exists yet.

The deterministic model in the same test fixes the required invariants for reset id preservation across local bind, complete/unknown and remote-verified outcomes.

No Repository Integrity run is claimed for this red checkpoint; running the full gate before the runtime repair would be expected to fail by design.

## 10. External architecture research applied

External sources are architecture inputs, not WebClip requirements by themselves:

- IndexedDB 3.0 / MDN transaction guidance: one transaction is the atomic rollback/commit unit; abort rolls back all changes, and browser shutdown aborts in-flight transactions. This supports colocating Journal mutation and quarantine transition in one transaction.
  - https://www.w3.org/TR/IndexedDB/
  - https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB
  - https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction/abort
- Chrome Downloads API: `DownloadItem.id` persists across browser sessions and download state is separately observable as `in_progress`, `interrupted` or `complete`; this supports retaining exact DownloadItem reconciliation authority after Journal reset.
  - https://developer.chrome.com/docs/extensions/reference/api/downloads
- AWS Builders Library, “Making retries safe with idempotent APIs”: a timeout can leave the caller unable to know whether a side effect occurred, so operation identity/reconciliation is required before retry assumptions.
  - https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/
- Chrome Workbox Background Sync provides a comparable browser pattern: failed work is retained in IndexedDB and replayed on later service-worker execution; failed replay is requeued instead of silently disappearing.
  - https://developer.chrome.com/docs/workbox/modules/workbox-background-sync

Applicability decision: WebClip should reuse the durable-operation/receipt principle, but it must retain its own exact DownloadItem/Yandex identity and Journal-generation rules. Workbox retention times and generic HTTP replay semantics are not copied into WebClip.

## 11. Acceptance map for implementation

The runtime change is not complete until deterministic tests cover at least:

1. clear-all quarantine;
2. exact URL scoped clear;
3. exact site scoped clear;
4. import replace quarantine of all old pending rows;
5. late local `complete` without Journal resurrection;
6. late local `interrupted` terminal handling;
7. local unknown/manual preservation plus late exact DownloadItem recovery;
8. remote `remote-verified` after reset without Journal resurrection;
9. unresolved remote/manual retention and generic cleanup exemption;
10. old whole-record writer cannot erase disposition;
11. forced transaction abort restores old Journal and all checkpoint rows;
12. quarantine capacity exhaustion fails destructive reset without partial mutation;
13. nonmatching scoped checkpoint remains ordinary/unchanged;
14. existing P0-039/P0-048 regressions remain green.

Remote tests in this implementation tranche must use synthetic/local state and mocked factual settlement only. They do not prove real Yandex account/root/object semantics and must not close P0-073/P0-074 or remote L5 C44.

## 12. Current status / resume point

Completed in this checkpoint:

- fresh exact-main bootstrap and Repository Integrity verification;
- current-source triage of all three pending stores, clear/import paths, late append/download/remote settlement and cleanup/admission behavior;
- external transaction/download/idempotency/background-recovery research;
- architecture choice A with a bounded state machine;
- first deterministic RED regression committed on a dedicated branch.

Still required:

- implement the runtime helpers and writer fencing in `service-worker.js`;
- turn the red regression green and add behavioral/abort/cap tests;
- update `ARCHITECTURE.md`, `DATA_MODELS.md`, `TEST_PLAN.md`, `TEST_STATUS.md`, C44 evidence/report, Coverage Matrix and Registry only after evidence supports it;
- local-first full deterministic/syntax gate;
- if a physical unpacked Chrome boundary is needed for this specific local lifecycle, run only the minimal applicable browser evidence;
- final PR-first delivery with exact-head Repository Integrity, fresh TOCTOU, expected-head squash merge and post-merge exact-main Integrity.

**P0-072 remains ACTIVE. Manifest remains `0.9.8`. Release remains `NOT READY`. No build, tag or GitHub Release is authorized by this checkpoint.**
