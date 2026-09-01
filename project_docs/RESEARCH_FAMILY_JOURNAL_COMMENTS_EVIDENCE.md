# Research family evidence — Journal comments / tombstones / edit generations

This document losslessly consolidates:

- `RESEARCH_DELTA_COMMENT_DELETION_RETENTION_SEMANTICS_2026-08-27.md`;
- `RESEARCH_DELTA_JOURNAL_COMMENT_TOMBSTONE_LIFECYCLE_2026-08-28.md`;
- `RESEARCH_DELTA_DELETED_COMMENT_TOMBSTONE_PORTABLE_CAPACITY_2026-08-28.md`;
- `RESEARCH_DELTA_JOURNAL_COMMENT_PENDING_SAVE_DRAFT_2026-08-29.md`;
- the comment-concurrency and OperationLog-queue refinements in `RESEARCH_DELTA_JOURNAL_CONCURRENCY_SETTLEMENT_2026-08-27.md`.

No runtime/test/manifest change is implied by this family consolidation.

## Owner map

Keep these owners distinct:

- **P1-202** — product/privacy semantics of what the user action called Delete means for the original comment body, ordinary UI/search and future export/backup.
- **P1-211** — bounded tombstone lifecycle/capacity/portable-schema policy for deleted history, including active-vs-history count/text budgets and compaction/retention.
- **P1-225** — local draft typed after Save admission must not be silently discarded by a late success.
- **P0-076** — authoritative per-entry/comment mutation CAS across tabs, clear/import and remote entry mutations; comment changes cannot remain stale read -> separate blind write.
- **P1-173** — `operationLogWriteChains` is another serialized actual-settlement queue that needs bounded queued-turn admission/coalescing; this refinement was discovered in the same concurrency pass and is retained here even though it is not comment-specific.

Adjacent P0-055, P1-009, P1-174, P1-176, P1-186 and P1-206 remain separate owners/dependencies.

# P1-202 — deletion meaning / retained body truthfulness

Current historical source proof establishes that comment deletion is a soft tombstone rather than physical content erasure: the mutation sets `deletedAt`/timestamps while preserving `text` and stable id. At different researched UI checkpoints the deleted body was directly or deliberately available as deleted history; comment search and full Journal serialization still treated the preserved body as data.

The core accepted requirement is not to mislead the user with an ambiguous hybrid. Product must choose one explicit model:

### Privacy-delete model

Delete removes/redacts the user-authored body from the authoritative active record while retaining only a minimal non-sensitive tombstone if identity/history requires it. Then:

- ordinary Journal UI cannot display the old body;
- ordinary comment search cannot match it;
- future export/Yandex backup after deletion cannot contain it;
- post-delete export/import cannot restore it;
- erased text no longer consumes active text quota;
- existing historical backup versions created before deletion are explicitly outside this active-record guarantee unless a separate destructive purge exists.

### Intentional research-history model

If full deleted text is intentionally retained, the action/confirmation/UI must say so truthfully before mutation: retained text may remain historical, searchable according to an explicit query mode, exported/backed up and subject to a documented history retention policy. Do not call retained verbatim body "unrecoverable" or imply erasure.

Whichever model is selected must compose with exact comment/entry generation under P0-076: late Edit cannot repopulate a winning delete; late Delete cannot redact a replacement/imported comment generation.

# P1-211 — bounded tombstone lifecycle and portable capacity

The current soft-delete representation carries full `text` inside `journalComments[]`. Normalization/export/import preserve `deletedAt` and body, which is a positive identity control: deleted rows do not silently resurrect as editable comments after roundtrip.

But active admission historically counts all normalized comments and sums all comment text. Therefore soft-deleted rows continue consuming both the per-entry comment count and aggregate text budgets.

Deterministic failure shape:

1. create then delete comments repeatedly;
2. tombstones remain full-text array elements;
3. active/live visible comments may approach zero while tombstone count/text approaches hard limits;
4. Add Comment is eventually rejected because deleted history consumes the same active capacity;
5. export/Yandex backup preserves the full tombstone history;
6. import/restore reproduces the same capacity debt on another installation/session.

This capacity debt is therefore portable product state, not merely local storage overhead.

Required P1-211 policy:

- active comment capacity and retained-history capacity are explicitly distinct;
- under privacy-delete, erased body text is removed from active text accounting;
- under research-history, full tombstones get a documented bounded count/byte/time retention or compaction policy;
- older tombstones may compact to identity/timestamps-only records where compatible with the chosen semantics;
- repeated legitimate add/delete cycles cannot permanently disable new active comments;
- local mutation, search/indexing, export, Yandex backup and import/restore all use the same policy;
- legacy backups containing full tombstones migrate deterministically or fail with precise compatibility/capacity diagnostics; they never partially resurrect deleted content;
- tombstone compaction/GC is generation-safe and cannot retarget reused comment ids/newer entry generations.

Do not “fix” this by only increasing 500/~2 MiB limits; that only moves an unbounded lifecycle failure.

# P1-225 — pending Save must not discard newer local draft

The editor captured `input.value` into the mutation payload, disabled Save/Cancel, but left the textarea editable. On late normal success it unconditionally exited editor mode and rerendered committed state.

Deterministic local data-loss schedule:

1. user types A;
2. clicks Save; payload A is captured;
3. request remains in flight;
4. textarea stays editable and user types newer draft B;
5. worker commits A and responds success;
6. UI tears down the editor and rerenders A;
7. unsent B disappears without warning.

Choose one safe UI contract:

- **freeze submitted draft**: textarea becomes readonly/disabled immediately after capture, pending state is visible, and failure restores the exact submitted draft; or
- **generation-aware editable draft**: A carries local draft generation, later typing creates generation B, and A success closes the editor only when the current draft generation still equals A. Otherwise committed A updates entry state while unsent B remains visibly preserved.

Apply the same rule to new and existing-comment edits. Underlying mutation authority remains P0-076; preserving a local draft never authorizes mutation of a replacement Journal generation.

# P0-076 — cross-tab comment mutation CAS refinement

The page-local destructive flag is not an authoritative lock: two `journal.html` tabs have independent UI state. Historical comment add/edit/delete flow read an entry, built a whole `journalComments` array outside the final transaction, then passed that precomputed patch to `updateJournalEntryRecord()` without expected entry revision/Journal generation.

Two concurrent writers can therefore last-write-wins and silently drop the other change. The same root cause also affects Delete/Mark Read/Trash/ReadLater flows on one entry and clear/import replacement.

Required shared fence:

- every local mutating flow carries `expectedEntryRevision/identity + Journal generation` into the same IndexedDB transaction that commits;
- comments use transactional read-modify-write/CAS rather than stale full-array patching;
- two Journal tabs either serialize/merge compatible changes or one gets explicit stale/busy conflict;
- incompatible remote mutations of one entry need exact per-entry operation admission before external side effect;
- old mutation spanning clear/import cannot write/delete replacement row with same textual id;
- if a remote side effect already physically settled before local conflict, preserve a durable reconciliation receipt rather than blind retry/rollback.

Core regression: two tabs add different comments concurrently -> both changes are deterministically preserved/serialized or one receives explicit conflict; never silent lost update.

# P1-173 — OperationLog queued-turn refinement retained from concurrency research

`operationLogWriteChains` was researched as `Map<operationId, Promise>` where each later event created `previous.catch(...).then(task)`. If an earlier actual write is slow/unsettled, later progress/events can accumulate one queued Promise/closure each before reaching their bounded IDB transaction. `clearOperationLogs()` also waits a snapshot of these chains.

This is the same queued-turn admission root cause already owned by P1-173, not a new item.

Required direction:

- bounded per-operation event buffer/coalescing or equivalent admission;
- preserve ordering and terminal/security-significant events;
- routine progress may coalesce with explicit overflow diagnostics rather than unbounded closures;
- administrative clear/list/detail cannot depend on traversing an unbounded chain.

Positive comparison retained: Journal revision notification code that uses one actual in-flight write plus one coalesced newest pending payload is not the same unbounded queue shape.

# Family regression matrix

1. Delete semantics exactly match selected privacy-delete or disclosed research-history model.
2. Under privacy-delete, unique secret marker disappears from active UI/search/post-delete export/backup/import.
3. Under research-history, retention/search/export disclosure is explicit before deletion and history has separate bounded lifecycle.
4. Pre-delete historical backup is not falsely claimed erased by later local deletion.
5. Repeated add/delete cycles cannot permanently exhaust active comment capacity.
6. Deleted-body text budget follows selected policy after local mutation and backup/import roundtrip.
7. Legacy full tombstones import under an explicit deterministic migration/retention rule.
8. Concurrent Edit vs Delete linearizes by exact entry/comment generation; losing late edit cannot restore deleted body.
9. Two Journal tabs add/edit/delete same entry without silent lost update.
10. Clear/import replacement invalidates stale comment action by P0-076.
11. Save A + newer typing B preserves B or prevents it by explicit freeze; no silent local draft loss.
12. Save failure preserves exact documented draft state.
13. Search/index rebuild cannot retain stale deleted body contrary to selected semantics.
14. Lazy heavy-card work under P1-174 cannot fetch/display content that selected deletion semantics removed.
15. OperationLog progress queue under one stalled actual write stays bounded/coalesced and clear does not inherit unbounded queued-turn work.

## Retirement result

All unique comment-family source proof, product decisions, portable-capacity refinement, draft-loss schedule, cross-tab CAS refinement and incidental P1-173 queue finding are represented here. The five source delta files can be retired from current `main`; exact originals remain available in Git history.
