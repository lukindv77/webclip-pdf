# Audit delta — 20-block cross-subsystem revalidation — 2026-08-28

Source-of-truth `main` immediately before this write: `cb5a8b854fce7d6440370da654092c1cd86d351f`.

This is a lossless docs-only checkpoint for the 20-block source audit performed against the unchanged runtime tree whose `service-worker.js` blob SHA is `9c81d080051ee14d468b78c575dcd9f21ecda803`. It is not a replacement for `PRIORITIES_P0_P1_P2.md` / `DEEP_AUDIT_2026-08-25.md` and does not assign a new P-number.

Production runtime, tests, configuration and `manifest.json` are unchanged by this checkpoint.

## Audit method

The pass re-read current `main` runtime sources, including:

- `service-worker.js`;
- `journal.js`;
- `content.js`;
- `frame-agent.js`;
- `offscreen.js`;
- `prepared-save-as.js`;
- `popup.js`;
- `options.js`;
- `journal-import-stream.js`;
- relevant existing `AUDIT_DELTA_*.md` evidence and canonical P-items.

For every candidate finding, existing semantic owners were checked before allocating a new number. Where source proof matched an existing root cause, this checkpoint records the owner rather than fragmenting the registry.

## Block 1 — pending remote stale-cleanup reactivation

Fresh source proof found a deterministic scan/act race in `cleanupStalePendingRemoteSaves()`:

1. stale row A is selected in a readonly scan by bare physical key;
2. the scan transaction closes;
3. a user retry reactivates the same `journalEntryId` key as active PREPARED attempt B;
4. the later cleanup write transaction blindly deletes that key based on A's old snapshot.

This can remove B's durable pre-side-effect checkpoint before/while/after its signed PUT is admitted.

No new item was created. Ownership remains **P0-074 + P1-184**, with P0-073/P0-076/P0-079 dependencies. A dedicated docs checkpoint was already written during this pass:

`AUDIT_DELTA_REMOTE_STALE_CLEANUP_REACTIVATION_2026-08-28.md`.

Required shape remains immutable remote-save attempt generation and phase/generation compare-and-delete.

## Block 2 — backup lease and source revision

Backup lease itself has a useful random token/CAS discipline: acquire creates a token, renew requires that token, release compares the token before deleting the lease.

No independent lease root cause was confirmed under the current bounded stage deadlines.

However recovered backup success again confirms **P1-207**: a previously staged/verified backup can receive a fresh `lastSuccessAt` / `lastBackgroundSuccessAt` while the current Journal has already advanced to a newer revision. Exact source Journal revision must survive staging/recovery and scheduler freshness must mean `current revision is protected`, not merely `some backup finished recently`.

No new number.

## Block 3 — grouped Journal pagination continuation

`journal.js` caches grouped-page boundaries in `urlGroupPageBoundaries` without Journal revision ownership. A later page is computed from a new IDB read and applies the old boundary to current group order.

Because group ordering includes mutable `latest`, append/delete/import can move a group across the old boundary, causing skip/duplication between pages.

This is a concrete manifestation of **P1-206**, not a new root. A dedicated checkpoint was written during this pass:

`AUDIT_DELTA_JOURNAL_GROUP_BOUNDARY_REVISION_2026-08-28.md`.

Every continuation/boundary must be revision-bound and rejected/restarted after a revision change.

## Block 4 — OperationLog manual clear admission gap

`clearOperationLogs()` snapshots current `operationLogWriteChains`, waits that array, then clears the map and IDB stores. A writer admitted after the snapshot is not in the waited set and can subsequently repopulate cleared history.

This is already **P1-197**, whose durable history epoch exists specifically to make old/new writers distinguishable across clear. **P1-205** remains retention/size cleanup ordering; no new number.

## Block 5 — page-owned native Save As

Positive control: `prepared-save-as.js` intentionally awaits

`chrome.downloads.download({ saveAs: true })`

without a local timeout. This preserves the project invariant that the user-owned native Save As dialog is not artificially timed by the caller.

The lifecycle is nevertheless still incomplete because offscreen applies `BLOB_URL_FALLBACK_TTL_MS = 16 min` to every Blob URL while STARTED is reported only after the native call settles. A dialog left open beyond that TTL can therefore lose its backing Blob indirectly.

This is already exactly **P1-156**, including Blob pin/owner lease, PREPARED GC, STARTED reconciliation and bounded RELEASE. No new number.

## Block 6 — remote frame-agent authority

Fresh `frame-agent.js` revalidation confirms:

- selection commands have no selection-session receipt/sequence -> **P1-200**;
- `prepare-print` / `restore-print` share one mutable `printStyle` + `changedAttrs` without print generation -> **P1-199**;
- an injected child does not itself learn optional-host-permission revoke and requires lifecycle cleanup -> **P1-201**;
- worker registry loss while the child remains alive -> **P1-203**;
- exact document/frame identity remains **P1-171**.

Child Escape can independently enter idle and emit state without top authority, the known split-state manifestation of P1-200.

No new number.

## Block 7 — PDF retry cache / offscreen lifetime

Fresh source still has:

`pdfCacheKey(tabId) -> tab:<tabId>`.

That mutable tab-owned byte slot, offscreen re-read, and tab-wide cleanup are exactly **P0-079**.

Positive control: expired PDF-cache pruning performs scan/delete inside one readwrite IndexedDB transaction, so the separate two-phase stale-cleanup reactivation race from Block 1 was not reproduced here.

Other existing owners remain:

- pre-materialization Blob/cache reservation -> **P1-054 / P0-065**;
- exact remote content/object proof -> **P1-184**;
- Save As Blob fallback -> **P1-156**.

No new number.

## Block 8 — ReadLater→Upload / Delete→Trash destructive authority

`moveReadLaterEntryToRead()` has the important positive ordering of writing `readMove*` checkpoint fields before remote move.

But that checkpoint and later final/error writes still use id-only `updateJournalEntryRecord()` without expected entry revision/generation. Cross-tab delete/mark-read/import replacement therefore remains **P0-076**.

Delete→Trash exact pre-move target/outcome remains **P1-183**, and post-move/unknown settlement exact object reconciliation remains **P1-090**. Local-only delete fallback after unknown settlement is already covered by the existing delete-fallback delta.

No new number.

## Block 9 — local download recovery

Fresh reconciliation confirms existing **P0-048**:

- exact Blob URL is primary recovery identity;
- fallback accepts filename + exact bytes + short age;
- fallback currently takes first `.find()` match rather than proving uniqueness/unclaimed `downloadId`;
- bind can write under a numeric `downloadId` without expected-owner/no-overwrite semantics.

Existing **P0-039** owns insufficient negative proof from bounded `downloads.search({startedAfter, limit:200})` plus eventual TTL removal. Existing **P1-064** owns oldest-batch starvation/fairness. Existing **P1-146** owns automatic download start settlement/admission.

No new number.

## Block 10 — settings/auth/config generations

Fresh source confirms:

- Journal group-by-URL still writes directly from `journal.js` through `chrome.storage.local.set`, outside the shared worker settings mutation contract -> **P1-157**;
- `webclipUserSettingsImportPending` still lacks immutable import generation and old reconciliation can consume a newer marker -> **P1-008**;
- direct unbounded Yandex config reads remain -> **P1-158**;
- capability truthfulness remains **P1-195**;
- token validity/lifetime and generation-fenced invalid-token demotion remain **P1-196**.

Security positive control remains intact: access tokens are intentionally stored in `chrome.storage.session`, and legacy persistent token cleanup is fail-closed.

No new number.

## Block 11 — import/offscreen staging

`journal-import-stream.js` retains useful explicit bounds for:

- total characters;
- per-entry characters;
- per-string characters;
- nesting depth;
- container item count;
- total Journal entries;
- parse deadline.

Import staging gets a random `importId`, so a deterministic same-key reactivation race was not confirmed.

Existing lifecycle issue remains **P1-035**: hourly TTL cleanup does not distinguish orphan staging from a live page still waiting on the 9-digit confirmation. UI/storage need one owner-lease or explicit visible-expiry contract.

No new number.

## Block 12 — alarm-started maintenance and backup lifecycle

`chrome.alarms.onAlarm` still launches `runDueJournalBackup(...).catch(...)` and `runLoggedOperationLogCleanup(...).catch(...)` fire-and-forget.

Pure IndexedDB/serialization stretches can outlive normal MV3 idle expectations before an offscreen lifetime owner is active. This is already exactly **P1-192**.

Related ownership remains:

- unified maintenance composition -> **P1-039**;
- bounded IDB stages -> **P1-075**;
- serialized queue admission -> **P1-173**.

No new number.

## Block 13 — Chrome Action / Incognito

The runtime sender admission correctly blocks almost all content-script persistence/disclosure commands for incognito tabs.

Chrome Action refresh remains a separate privacy boundary: tab action state can still be derived from normal-profile Journal recency unless incognito is explicitly fail-closed before Journal lookup. This is the already reopened **P0-045**.

No new number.

## Block 14 — runtime sender ACL / navigation command identity

No admin/OAuth/import/clear/OperationLog privilege bypass from content was found in this revalidation. Preserve **P0-020** architecture.

Page commands can still be retargeted across navigation when an old user command is later injected/sent by tab id only. That remains **P1-175 / P0-070 / P1-171**, with retry cache document provenance additionally **P0-023**.

No new number.

## Block 15 — OAuth/token generation and invalid-token state

`readYandexAuthState()` still reads `yandexConfig` through direct `chrome.storage.local.get()` while auth reads use the bounded serialized auth helper. That is existing **P1-158**.

Yandex API HTTP failures, including 401-class failures, do not establish a generation-aware current-token demotion contract. A late failure from an old token generation must not clear/downgrade a newly reauthorized token. This remains **P1-196**, not a new item.

PKCE S256/no-client-secret/session-only token invariants remain positive controls.

## Block 16 — supposedly read-only Yandex list/fetch paths

`listJournalBackupsOnYandex()` and `fetchJournalBackupFromYandex()` call `ensureYandexServiceFolders({ includeBackup:true })`.

That helper may create missing service folders, so list/fetch can perform remote writes. This is existing **P1-138** and should be fixed by separating pure lookup/validation from ensure/create mutation authority.

No new number.

## Block 17 — publication policy generation

`checkpointPendingRemoteSaveIntent()` persists `createPublicLinks` as a boolean snapshot. Recovery can later call `ensureYandexPublicUrl()` using that old authority even after current settings changed.

This remains exactly **P0-078**: policy false must revoke not-yet-started old publish authority, while false->true cannot resurrect publication authority for an old operation without an explicit newer generation.

Exact public URL/object proof remains **P1-184**; unpublish/destructive privacy remains **P0-069**.

No new number.

## Block 18 — urlStats rebuild isolation

Maintenance repair has a useful `capturedRevision` check before removing its dirty marker.

But `rebuildAllUrlStats()` remains a multi-transaction additive generation, and point append/delete repair can independently update the same derived keys while a bulk rebuild is in flight. A short concurrent mutation can begin and complete its dirty token entirely inside the bulk token lifetime, while stale global batch deltas later merge onto an exact point rebuild.

This remains the already reopened **P0-050**. A versioned derived generation/stable Journal revision publication contract is still required.

No new number.

## Block 19 — hostile host DOM/control plane

Top content UI still uses:

`host.attachShadow({ mode: 'open' })`.

Control event admission does not rely on browser-trusted user events as an authority boundary. Host-page observation/synthetic control risks therefore remain **P0-075**.

Related existing print/content issues remain:

- host live spoiler/toggle side effects -> **P0-067**;
- same-origin iframe clone activation -> **P0-068**;
- printed safe link scheme representation -> **P0-071**.

No new number.

## Block 20 — debugger / PDF exact document generation

`generatePdfBlob(tabId)` preserves valuable actual-settlement handling around debugger attach/detach and uses `Page.printToPDF` with `transferMode: ReturnAsStream`, reducing the worker Base64 memory copy.

The remaining authority gap is document identity rather than debugger transport itself: generation starts from tab id, and navigation must be fenced from user-command admission through print and post-print cache/download/upload finalization.

This remains **P0-070 / P0-023 / P1-171**. No separate debugger P-number is warranted by this pass.

## Cross-cutting pending-journal-append check

The audit also checked whether ordinary pending Journal append recovery has the same immediately exploitable same-key replacement schedule as remote-save checkpoints.

`recoverPendingJournalAppends()` reads an item snapshot and later `appendJournalEntry(... requirePendingCheckpoint:true)` verifies only that a pending row with the same id still exists, not that it is the same generation/data snapshot. This would be unsafe if a live path replaced that id with a new semantic owner while old recovery was in flight.

Current source review did not establish a new ordinary live path that legitimately reuses one pending-Journal id in a way independent from the already documented per-entry/id-generation and operation-id collision families. Therefore this remains a **watch point, not a committed new finding**. Do not assign P1-208 from this hypothesis without a deterministic admissible source schedule.

If later source proof establishes such replacement, first compare against **P0-041 / P0-076 / P1-198** before allocating a new number.

## Number allocation after this pass

No new P0/P1/P2 number was required by the 20-block pass.

The next numerical slot must not be treated as automatically available for the next observation. In particular **P1-208 remains unassigned by this checkpoint** and requires fresh semantic duplicate-check before any future use.

## Prioritized implementation cluster after revalidation

The audit continues to support solving related generation contracts together rather than applying isolated patches:

1. **P0-079 + P0-074 + P1-184** — immutable PDF bytes, remote attempt generation, exact remote content/object proof.
2. **P0-076 + P1-183/P1-090 + P0-069** — per-entry destructive saga generation, exact move target/outcome, publication cleanup.
3. **P1-197/P1-205/P1-198** — durable OperationLog history epoch, cleanup/write linearization and worker-issued operation receipt.
4. **P1-199/P1-200/P1-201/P1-203/P1-171** — frame document/session/print/permission/worker-lifetime generations.
5. **P1-206 + P0-050 + P1-009** — coherent Journal read revision, versioned derived state and bounded search architecture.
6. **P1-207 + P1-192** — backup source revision truth plus crash-safe background lifecycle/scheduling.
7. **P1-156 + P1-035** — active visible-owner lifetime for Save As/import staging without silent wall-clock revocation.

## Test / release state

This pass changed audit documentation only. Product runtime/configuration and `manifest.json` were not modified.

Product tests were not rerun. The last proven product gate remains historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS** and must not be represented as newly executed on this docs-only HEAD.

Manifest/runtime product version remains `0.9.8`. No build, tag or GitHub Release was created.