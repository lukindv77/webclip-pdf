# WebClip — fresh full-project research — C44 Backup / import / recovery — 2026-09-03

Date: 2026-09-03  
Canonical source baseline: `508877da4357c7610adbb150ea222ea8ea8464bf`  
Exact `service-worker.js` blob: `cffe46adbd0227bae51c95462d6d705b264838fe`  
Exact `journal.js` blob: `05cb89db3c322d547faf17b2359e92161d0bcbe7`  
Scope: fresh-restart coordinate **C44 — Backup / import / recovery**.

## Result

**C44: `L4-REVALIDATED / PARTIAL/FINDING + POSITIVE/PHYSICAL-IDB/RELOAD/STAGED-ID/COUNT/FIELD-ROUNDTRIP/LEASE/CAS CONTROLS; FULL-ROUNDTRIP/MERGE/BROWSER-RESTART/REMOTE-L5 OPEN (P0-013, P1-194, P1-207, P1-215, P0-072; P0-077 positive)`.**

Fresh current-source inspection plus a physical Chrome IndexedDB/race matrix confirms that the current staged-import architecture has durable local building blocks but still lacks the generation/ownership contract required for a truthful destructive restore:

1. normalized import staging is IndexedDB-backed and exact `importId` plus expected entry count are checked;
2. staging survives a renderer reload in a real browser;
3. both transfer staging and normalized import staging are reclaimed by a fixed two-hour wall-clock TTL, with no current live-owner/lease exemption in the inspected cleanup path;
4. destructive import replace touches the Journal revision but does not compare an immutable expected Journal revision captured at preview/confirmation;
5. the same replace transaction clears `pendingAppends`, `pendingDownloads` and `pendingRemoteSaves`, so replacement can erase the only durable reconciliation receipts for already-admitted external side effects;
6. no explicit staged-import merge command/path was found in the current worker/journal UI source, so the requested replace/merge matrix cannot be claimed complete;
7. exact selection/provenance-shaped fields survive the physical staged-row → entries positive control when the chosen `importId` is used, but this is not proof that a user-selected backup object remains generation-bound through every local/remote/restart boundary.

No new P-code is needed. The fresh findings refine existing **P1-194**, **P1-207**, **P1-215**, **P0-013** and the cross-boundary **P0-072**. **P0-077 DONE** remains a positive same-version envelope control and is not reopened. Runtime, Registry wording/status, manifest `0.9.8` and release readiness are unchanged; release remains **NOT READY**.

## Evidence level and boundary

Accepted evidence combines:

- L1 exact-source guards on current `service-worker.js` and `journal.js`;
- L4 Google Chrome physical IndexedDB using the production Journal database name/version and production store names/key shapes relevant to the finding;
- a real renderer reload persistence control;
- deterministic physical stale-revision and TTL schedules;
- causal lease-aware and expected-Journal-revision controls.

It does **not** claim:

- a full current UI export → file → import round trip;
- a real merge path (none was found in the inspected current source);
- full browser-process restart with the real unpacked extension and visible import owner;
- a real remote backup object or Yandex backup transport;
- L5 success for any external/user-owned boundary.

## Accepted exact-source execution

- Google Chrome `151.0.7922.173`;
- workflow run `33723881258`;
- job `100548527410`;
- exact accepted workflow head `4d64d216f281d3ac443632eae737af076020752e`;
- conclusion **SUCCESS**;
- result SHA-256 `56f54b8e797f88361c9ba18c6359609a8a9401d53074afe35c7b8111095ca045`;
- durable harness `project_tools/research_c44_backup_import_recovery.py`.

An earlier run on the pre-fix harness also succeeded, but the accepted receipt is the cleaner second run above after removing a possible late readonly-transaction-listener race from the research harness itself.

## Current exact-source contract

The accepted harness refuses classification unless all of the following current-source conditions hold:

- Journal DB is `WebClipJournal`, version 7;
- normalized import staging is `importStaging` with `keyPath: 'key'` and `importId` / `createdAt` indexes;
- normalized staged rows carry exact `importId`, normalized `entry` and `createdAt`;
- `JOURNAL_IMPORT_STAGING_TTL_MS` is two hours and cleanup derives a cutoff from `Date.now()`;
- transfer staging also has a two-hour wall-clock TTL;
- `commitStagedJournalImport()` consumes `prepared.importId` and `prepared.entryCount`, and has a count-mismatch abort;
- import replace clears all three inspected recovery stores;
- import replace touches Journal DB revision but has no inspected `expectedRevision` / `expectedJournalRevision` / `journalRevision` compare;
- the stats-generation token is present but is not a Journal revision CAS;
- selection snapshot normalization remains present;
- no explicit `WEBCLIP_JOURNAL_IMPORT_MERGE` / staged merge command exists in the inspected worker/journal source.

## Physical matrix

| Schedule / control | Fresh physical result |
|---|---|
| Stage import A + import B in production-shaped `importStaging`, then renderer reload | Both rows remain; exact import A remains present. |
| Mark import A older than the common 2-hour TTL while retaining a synthetic visible-owner marker; run current wall-clock cleanup model | Import A is deleted. |
| Same old staging under lease-aware causal cleanup | Import A is retained; one leased row is protected. |
| Preview at Journal revision 7, then concurrent Journal mutation writes revision 8 + `entry-concurrent`, then current replace of import A | Replace succeeds; concurrent entry disappears; only `entry-import-A` remains. |
| Same stale schedule with expected-revision CAS control | Commit is rejected with `STALE_REVISION`, actual revision 8; concurrent entry remains. |
| Seed pending append/download/remote-save receipts, then current replace schedule | All three checkpoint counts become zero. |
| Same stale schedule rejected by CAS control | All three checkpoint counts remain one. |
| Exact import A field roundtrip | SelectionSnapshot, selectionMeta, selectionExactScope, operationId and provenance markers remain exact; import B is not adopted. |

The positive controls are causal feasibility controls, not claims that production already implements lease/CAS admission.

## P1-194 — staging ownership / TTL

The current cleanup contract treats age as sufficient deletion authority. A staged object can therefore be old and still actively owned by a visible import flow, yet become cleanup-eligible. The physical control proves that a live-owner predicate changes the outcome without requiring an unbounded leak: old abandoned rows remain reclaimable, while a currently leased row can be retained.

This is fresh direct support for **P1-194 ACTIVE**.

## P1-207 — immutable import generation / Journal revision

`commitStagedJournalImport()` uses the prepared import identity and count, which is a useful positive control, but the destructive commit is not fenced by the Journal revision seen at preview/confirmation. In the physical schedule, a concurrent entry is admitted after preview and then silently erased by the later replace. Merely touching/incrementing revision inside the replace transaction does not make the decision generation-exact.

An expected-revision CAS rejects the identical stale schedule before destructive mutation and preserves both the concurrent entry and recovery checkpoints.

This is fresh direct support for **P1-207 ACTIVE**.

## P0-072 — replacement versus already-admitted side effects

Current import replace explicitly clears:

- `pendingAppends`;
- `pendingDownloads`;
- `pendingRemoteSaves`.

Those rows are recovery/reconciliation authority for work that can outlive a caller. Deleting them is not evidence that a non-cancellable local download or remote side effect was cancelled. The physical matrix demonstrates exact receipt loss under replacement.

This is a fresh C44 cross-boundary reproduction of **P0-072 ACTIVE**, not a new root cause or new P-code.

## P0-013 / P1-215 — selected backup/staging identity and merge coverage

Current staged rows carry an exact `importId`, and replace checks the prepared import id/count. The physical control also proves import A does not accidentally copy import B in the modeled exact-id transaction. These are positive building blocks.

They do not close exact user-selected backup authority across transfer staging, normalized staging, restart and remote backup provenance. In addition, no explicit staged import merge path was found in current `service-worker.js` / `journal.js`, so the fresh campaign cannot claim the requested replace/merge coverage. The absent branch remains an explicit coverage/product gap under the existing import-provenance owners rather than being simulated.

## P0-077 positive envelope control

The current project retains the already-DONE same-version export/restore envelope closure under P0-077. C44 does not reopen it. Fresh C44 uses it only as an architecture/limit positive reference; the current tranche does not claim a new full physical export-file-import execution.

## B1–B9 mapping

| Boundary | Fresh C44 result |
|---|---|
| B1 User Intent | A confirmed backup selection must authorize one exact staged generation, not whichever staging/global state is current later. |
| B2 Admission / exact generation | `importId`/count are positive, but expected Journal revision and full selected-backup generation are incomplete. |
| B3 Capture | Imported selection/provenance fields are retained by the physical positive control. |
| B4 Static Materialization | Not the primary boundary. |
| B5 Renderer | Not the primary boundary. |
| B6 Physical Artifact | Full exported backup-file roundtrip remains open. |
| B7 Persistence / Transfer | IDB staging survives renderer reload; fixed TTL has no inspected live lease; replace deletes recovery receipts. |
| B8 Journal / Provenance | Stale preview can overwrite a newer Journal generation; exact CAS control rejects it. |
| B9 Later Reading / Recovery | Browser-process restart, merge and remote backup recovery remain open. |

## Architecture direction

A production closure needs one immutable import receipt that contains at least selected backup object identity/digest, normalized staging generation, expected Journal revision and explicit mode (`replace` or `merge`). The visible flow should hold a renewable bounded lease over transfer + normalized staging. Destructive commit must compare the immutable receipt atomically before changing Journal state. Recovery checkpoints for already-admitted side effects must be reconciled or migrated under explicit authority, never erased as a proxy for cancellation. Merge, if a supported product mode, needs its own exact conflict/provenance semantics and tests rather than falling through replace behavior.

## Remaining C44 exit evidence

C44 remains **OPEN**. Required remaining evidence is:

1. real current UI full export → selected file → transfer staging → normalized staging → commit roundtrip;
2. explicit replace **and** merge semantics, or an explicit product decision that merge is unsupported and the Coverage Matrix/task is updated accordingly;
3. real unpacked-extension owner/page + service-worker restart and full browser restart while a staged import is live;
4. exact selected-backup digest/provenance binding across those restarts;
5. recovery behavior with admitted pending local/remote side effects present during replace/merge;
6. real remote backup roundtrip only when an explicitly authorized external test context is available.

Until those are executed, C44 is a bounded L4 partial rather than a complete restore/recovery claim.
