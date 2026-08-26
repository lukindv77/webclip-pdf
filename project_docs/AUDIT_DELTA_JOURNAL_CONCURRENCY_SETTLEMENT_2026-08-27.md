# Journal concurrency / Chrome settlement audit delta — 2026-08-27

Baseline source HEAD: `18adf2a745bdb4ed78a83fe173b51016d7e5ef66`.

This is a lossless audit checkpoint. It does **not** replace the canonical `project_docs/PRIORITIES_P0_P1_P2.md` / `DEEP_AUDIT_2026-08-25.md` registry and does not claim a new P-number. Production/runtime/config/manifest are unchanged by this checkpoint.

## Existing P0-076 refinement — per-entry mutation/revision fence must also cover cross-tab concurrency

Fresh runtime review confirms that the missing Journal mutation fence is broader than the already documented clear/import race.

Evidence:

- Service-worker `runExclusiveJournalDestructiveMutation()` guards only `WEBCLIP_JOURNAL_CLEAR` and `WEBCLIP_JOURNAL_IMPORT_REPLACE_STAGED` against each other.
- `WEBCLIP_JOURNAL_DELETE`, `WEBCLIP_JOURNAL_MARK_READ`, `WEBCLIP_JOURNAL_ADD_COMMENT`, `WEBCLIP_JOURNAL_EDIT_COMMENT`, and `WEBCLIP_JOURNAL_DELETE_COMMENT` bypass that worker-level destructive guard.
- `journal.js` has `journalDestructiveOperationInFlight`, but it is page-local. Two simultaneously open `journal.html` tabs have independent flags and can both send mutations for the same Journal entry.
- `updateJournalEntryRecord(id, patch)` performs one bounded readwrite transaction and re-reads the current row, but then spreads an already-computed external `patch` over that row. It does not compare an expected entry revision/identity/generation.
- Comment add/edit/delete first read the entry, build a full `journalComments` array outside the final write transaction, then call `updateJournalEntryRecord(...)`. Two concurrent writers can therefore last-write-wins and silently discard the other writer's comment change.
- `deleteJournalEntryRecordOnly(id)` reads by id and later deletes the current row by the same id without an expected revision/generation. This is the already documented dangerous primitive after clear/import and is equally unsafe against a concurrent mutation of the same entry.
- `moveReadLaterEntryToRead()` does create a durable `readMove*` checkpoint before remote move, but that checkpoint is itself written through ordinary `updateJournalEntryRecord()` without a per-entry compare-and-swap/lease. A concurrent delete/mark-read from another Journal page can therefore race at both the remote and local layers.

Required extension of P0-076:

- Treat the root cause as absence of a durable/versioned **per-entry mutation fence**, not only an import-generation fence.
- Every mutating flow must carry `expectedEntryRevision/identity + journal generation` into the same IndexedDB transaction that commits the local change.
- Mutually incompatible remote mutations of one entry (at minimum Trash vs ReadLater→Upload, and duplicate same action generations) need per-entry operation admission/lease or equivalent exact generation ownership before any remote side effect.
- A second Journal tab must receive deterministic busy/conflict/stale-generation semantics rather than being able to start a competing operation solely because its page-local UI flag is clear.
- Comment mutations must become transactional read-modify-write/CAS so concurrent add/edit/delete cannot silently overwrite one another.
- Import/clear must still invalidate old entry generations as already required by P0-076; the same mechanism should be shared rather than introducing separate incompatible locks.
- Remote outcome that already settled before a local generation conflict must remain durably reconcilable and must not be blindly rolled back/retried.

Required regressions:

1. Two Journal tabs concurrently add different comments to one entry: both changes are either serialized/merged or one receives an explicit stale/busy conflict; no silent lost update.
2. Journal tab A starts `MARK_READ`, tab B starts Trash on the same entry before A commits: at most one remote mutation generation gets admission; the loser performs no competing remote move.
3. Old per-entry mutation spanning replace-import cannot delete/update a replacement record with the same id.
4. Worker/page restart does not reset the authoritative conflict fence if a durable remote mutation is already pending.

No new P0/P1 number is assigned because this is the same root cause already owned by **P0-076**.

## Existing P1-173 refinement — `operationLogWriteChains` is another unbounded queued-turn chain

Fresh registry inventory found an additional serialized Promise chain with the same admission problem described by P1-173.

Evidence:

- `operationLogWriteChains` is a `Map<operationId, Promise>`.
- `queueOperationLogWrite()` takes the current Promise and creates `next = previous.catch(() => {}).then(task)`, then stores `next` back in the Map.
- There is no admission cap, coalescing, or bounded count of queued-but-not-started OperationLog turns for one operationId.
- A slow/hung earlier stage can therefore accumulate closures for later progress/events before they reach the actual bounded IndexedDB transaction.
- This differs from `journalRevisionWriteInFlight` / `pendingJournalRevision`, which intentionally keep one actual write plus one coalesced newest pending value and therefore do not grow an unbounded turn chain.
- `clearOperationLogs()` snapshots all current `operationLogWriteChains.values()` and waits for them before clearing, so a very long chain also directly delays the administrative clear path.

Required extension of P1-173:

- Include `operationLogWriteChains` in the inventory of queues that require admission/backpressure/coalescing.
- Preserve OperationLog ordering, but do not require one Promise closure per progress event while an earlier actual write is unresolved.
- Prefer a bounded per-operation event buffer/coalesced progress model with explicit overflow diagnostics; terminal/security-significant events must not be silently dropped.
- Clearing/list/detail must not depend on traversing an unbounded queued chain.

No new P1 number is assigned because this is the same queue-admission root cause already owned by **P1-173**.

## Registry inventory result — no new root cause from the already-known singleton maps

The same pass rechecked the main service-worker settlement registries:

- `automaticDownloadStartSettlements` has explicit `MAX_PENDING_AUTOMATIC_DOWNLOAD_STARTS = 4` and retains the actual settlement after caller timeout.
- Chrome Action mutations have `MAX_PENDING_ACTION_ACTUAL_SETTLEMENTS = 64` and per-tab generation repair.
- `scriptExecutionSettlements` and `tabCreateSettlements` retain late receipts but still lack a global unresolved cap; this remains exactly **P1-166**.
- `scriptExecutionSettlements`/frame registry document-generation weakness remains **P1-171/P1-004**, not a new item.
- debugger actual settlements are already covered by the P1-131 global pending budget.
- Journal revision/runtime notifications use one in-flight operation plus one coalesced newest pending payload; no unbounded Promise-chain finding was added there.

## Number allocation

Canonical registry still formally ends at P1-194 until the pending Yandex deltas are losslessly merged into both canonical audit documents. P1-195/P1-196 remain evidence-reserved by the earlier OAuth checkpoint. **P1-197 and P0-079 remain unassigned after this block.**

## Test / release evidence

Audit documentation only. Product runtime/configuration and `manifest.json` are unchanged. Product tests were not rerun; do not promote the previous `88/88 syntax + 74/74 deterministic PASS` to this newer docs-only HEAD as a newly executed gate.
