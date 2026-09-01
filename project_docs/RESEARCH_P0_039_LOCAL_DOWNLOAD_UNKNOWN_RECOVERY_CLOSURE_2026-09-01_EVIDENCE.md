# P0-039 closure evidence — unknown local-download recovery — 2026-09-01

Canonical owner/status authority remains `RESEARCH_REGISTRY.md`.

Closure base: `main = 014ee40a283d2cdb4499ac12e450daa550fe37f8`.

Owner: **P0-039** — an unknown physical local-download outcome must not lose its only durable recovery evidence merely because Chrome Download history disappeared or a wall-clock TTL elapsed.

## Historical acceptance authority

The exact owner refinement is preserved by Git commit `59fe8fe89ba3af39dd2202639f25b7bcc48879f0` (`docs: refine P0-039 unresolved local download recovery`). It explicitly rejects automatic success without an exact own-extension DownloadItem and requires unresolved evidence to move into a bounded dead-letter/manual-resolution state instead of being deleted after 24 hours.

Required regression from that refinement:

- physical download may have succeeded;
- `downloads.download()` response/worker settlement is lost or unknown;
- Chrome Download history is later missing/cleared;
- more than 24 hours pass;
- durable metadata/operation identity remains recoverable/manageable;
- Journal does not receive a fabricated success entry.

## Fresh current-source failure control

At the closure base, `reconcilePendingLocalDownloads()` had two destructive TTL branches:

1. unbound `intent:*` checkpoint with no matched DownloadItem after `PENDING_LOCAL_DOWNLOAD_TTL_MS` called `removePendingLocalDownload(rawKey)`;
2. bound numeric pending-download checkpoint with no DownloadItem after the same TTL called `removePendingLocalDownload(id)`.

Both branches revoked the Blob URL, wrote an error stating that no Journal entry was created, and permanently discarded the checkpoint that still contained `data`, `operationId`, filename/source metadata and selection identity.

A missing `DownloadItem` is not proof that the physical file never settled. Therefore the old code converted an unknown external outcome into irreversible metadata loss.

## Implementation

The existing `pendingDownloads` store now has an explicit bounded terminal-unknown state rather than a second unbounded store or schema migration.

### State transition

`markPendingLocalDownloadUnknown()` preserves the existing checkpoint and changes only recovery state fields:

- `kind: 'unknown'`;
- `priorKind` retains the preceding `intent`/`download` class;
- `recoveryState: 'manual-resolution'`;
- stable first `unknownAt` timestamp;
- refreshed `updatedAt`;
- bounded `unknownReason` and `unknownTrigger`.

The complete durable `data` payload and `operationId` remain untouched.

Both old TTL-delete branches now call this transition. If the write itself fails, the original active checkpoint is deliberately left in place and the operation is reported `recovery-error`; evidence is not deleted as a cleanup fallback.

### No false Journal success

Moving to `unknown/manual-resolution` does not call `appendJournalEntry()` or `finalizePendingLocalDownload()`. Operation status is `partial` / `recovery-unknown`, explicitly stating that the physical outcome is unknown.

Automatic Journal finalization still requires the existing exact download identity path. P0-048/P1-146 and related settlement owners are not weakened by this change.

### Late exact settlement remains usable

The retained row is not a tombstone that destroys recovery authority:

- an unknown string `intent:*` can still be consumed by `bindPendingLocalDownloadIntent()` if a later exact DownloadItem settlement identifies it; that transition restores `kind:'download'` while retaining the full metadata payload;
- `finalizePendingLocalDownload(downloadId, state, ...)` obtains the durable checkpoint by key and does not reject it because `kind === 'unknown'`, so a later exact numeric `complete` or `interrupted` receipt can resolve a retained bound checkpoint through the existing authoritative path.

### Bounded dead-letter / maintenance fairness

Unknown rows are skipped by the ordinary `updatedAt` reconciliation cursor, so they cannot consume the 12-item active maintenance batch forever.

Admission counts active and unknown rows separately:

- active pending-download capacity remains bounded by `MAX_PENDING_LOCAL_DOWNLOADS = 100`;
- unknown/manual-resolution evidence is independently bounded by the same 100-row ceiling;
- reaching the unknown ceiling fails new admission with an explicit requirement to resolve old unknown checkpoints rather than silently evicting recovery evidence.

This is intentionally a fail-closed capacity policy. P1-064 owns broader recovery fairness and is not closed here.

## Accepted deterministic evidence

Accepted evidence head: `8e18b4b63dc1864d57120f0b7c31eea8774345bb`.

GitHub Actions:

- run `33469941122`;
- job `99737473577`;
- result **SUCCESS**;
- Node `22.23.2`;
- test `project_tools/test_p0_039_local_download_dead_letter.js`.

The regression is bound to exact current `service-worker.js` structure and verifies:

1. new unknown/manual-resolution fields and helper are present;
2. both historical TTL-delete code shapes are absent;
3. both TTL paths transition through `markPendingLocalDownloadUnknown()`;
4. the complete durable metadata object and `operationId` survive the transition;
5. unknown rows are skipped by ordinary maintenance selection;
6. late exact intent binding restores normal `download` state without losing metadata;
7. the existing finalizer remains kind-agnostic and can resolve a retained exact numeric checkpoint;
8. 99 active + 99 unknown rows remain admissible, while the 100th row in either class independently closes that class's capacity.

`node --check service-worker.js` passed on the same exact evidence head.

The temporary evidence workflow was deleted after acceptance; runtime/test source was unchanged afterward.

## Owner / boundary decision

The exact P0-039 root is closed: TTL + missing Chrome Download history no longer destroys the only durable metadata/operation checkpoint for an unknown local-download outcome.

Not closed by this tranche:

- P0-048 — ambiguous physical `downloadId`/intent identity;
- P1-146 — non-cancellable automatic download start / unknown actual settlement;
- P1-064 — broader recovery fairness;
- native Save As lifecycle owners;
- release-level real-browser QA.

## Status decision

P0-039 is eligible for **DONE** after the implementation and accepted deterministic state-machine evidence above.

`RELEASE_READINESS.md` remains **NOT READY**. No build, tag or GitHub Release is implied.
