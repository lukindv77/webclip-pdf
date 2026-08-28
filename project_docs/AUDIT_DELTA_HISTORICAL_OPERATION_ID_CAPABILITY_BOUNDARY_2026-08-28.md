# Audit delta — historical/imported operationId capability boundary — 2026-08-28

Source-of-truth `main` immediately before this write: `1ae37cb240776e9d6fbd0fd1952df39045bd1e04`.

Docs-only audit checkpoint. Production runtime/config/manifest/tests are unchanged.

## Classification

No new P-number is assigned.

Fresh audit clarifies the boundary between **P1-190** (imported/historical OperationLog provenance) and **P1-198** (worker-issued live operation/terminal receipt), with **P1-197** history epoch and **P1-148** Journal-to-log linkage as dependencies.

The important result is two-sided:

1. current imported `operationId` is still trusted enough to resolve a **live current-installation diagnostic record by text**, so P1-190 remains open;
2. no fresh source path was found where an imported Journal entry's operationId is directly fed into `WEBCLIP_OPERATION_LOG_FINISH` / destructive remote control solely by opening that entry, so the current evidence does **not** justify reclassifying P1-190 as a P0 destructive authority issue.

## Fresh source proof

### 1. Import preserves syntactically valid textual operationId

`normalizeImportedJournalEntry()` still accepts `raw.operationId` when it fits length and `[A-Za-z0-9._:-]+` syntax, then stores that text on the imported Journal entry.

No installation namespace, history epoch, locally-issued operation nonce or `imported-unverified` receipt accompanies the text.

### 2. Journal uses that exact text for current OperationLog lookup

The Journal operation-log affordance obtains the entry's `exactOperationId` and sends:

`{ type:'WEBCLIP_OPERATION_LOG_GET', operationId: exactOperationId }`.

The worker handler simply calls:

`getOperationLog(String(message.operationId || ''))`.

Therefore a backup/import can contain textual X that happens to equal a current installation's real operation X. Clicking “Показать лог” can display that unrelated current record as though it were provenance for the imported entry.

This is exactly P1-190/P1-148 forensic linkage corruption.

### 3. Read access is not the same as live operation ownership

Fresh Journal flow inspection did not find a path where merely rendering/selecting an imported entry sends its stored `operationId` to `WEBCLIP_OPERATION_LOG_FINISH` or uses it as a remote/download mutation receipt.

The visible cancellation paths that do call `WEBCLIP_OPERATION_LOG_FINISH` are staged **current operations** such as:

- local Journal import preview cancellation;
- Yandex backup restore preview cancellation.

Those functions use the operationId created/carried for that current operation flow, not `entry.operationId` from an imported Journal row.

This is a useful current boundary and should be preserved.

### 4. Terminal API itself remains text-addressed

`WEBCLIP_OPERATION_LOG_FINISH` currently accepts textual `message.operationId`, status and summary, then calls `finishOperationLog()` by that text alone.

Thus P1-198 remains independently open even though imported entry IDs do not currently reach it automatically. A stale/reloaded extension page or two live operations with colliding textual ids can still terminate/misclassify the wrong diagnostic generation.

The fix must be receipt-based at the terminal API rather than relying on every current caller voluntarily choosing the right text.

### 5. Progress correlation has the same live-vs-history distinction

Current progress/UI correlation also uses operationId text, but imported Journal history does not automatically register itself as an active page progress owner.

The progress-generation audit already requires P1-198 worker receipt + exact document generation for live operations. An imported historical id must never be allowed to satisfy that live receipt merely because the display string matches.

## Required provenance model

### Historical operation reference

Imported/exported Journal records may retain a human-visible historical operation label for diagnostics/roundtrip, for example:

- `sourceOperationId`;
- source installation/schema metadata if available;
- provenance class `imported-history` / `legacy-history`.

That reference is **not** a current OperationLog key or live capability.

### Local live operation receipt

A current entry may activate “Показать лог” as exact provenance only when it stores a locally issued receipt that binds:

- current/local installation namespace;
- P1-197 OperationLog history epoch;
- P1-198 operation nonce/generation;
- operation kind;
- source owner/document generation where applicable.

The display operationId may remain copied/exported separately.

### Imported UI behavior

For imported-unverified historical ids:

- do not automatically query current live OperationLog by textual id;
- display the historical id as inert metadata if useful;
- optionally offer “current log with same text exists” only as explicitly **unverified coincidence**, not as source provenance;
- never expose finish/cancel/retry/control affordances from a historical reference.

### Terminal/control APIs require receipts regardless of UI source

P1-198 must make `WEBCLIP_OPERATION_LOG_FINISH` and any future status/cancel/reconcile control require an exact live receipt/generation. Fixing the imported UI alone is insufficient because stale live extension pages can also carry obsolete textual ids.

### History clear composes with local receipts

P1-197 clear/retention epoch must invalidate old diagnostic writers/links without deleting the independent physical-operation recovery receipt. A Journal entry may truthfully say its historical log was cleared while its local/remote physical save remains valid.

## Deterministic regressions

1. Import entry E with operationId X while current installation already has unrelated live/completed log X -> E does not present X as proven source log.
2. Imported X remains visible as historical metadata if product keeps it, but no current log content is automatically attached as provenance.
3. Imported X cannot activate `WEBCLIP_OPERATION_LOG_FINISH`, progress ownership, retry or physical recovery control.
4. Current locally created entry with exact local operation receipt still opens its correct log.
5. Current log is cleared; entry retains physical save truth but diagnostic link reports history unavailable rather than attaching a later reused textual X.
6. New operation after clear reuses display X under new epoch/receipt -> imported/old entry cannot attach to it.
7. Two current live operations deliberately use same proposed display X -> P1-198 gives distinct receipts or rejects collision; Journal links remain distinct.
8. Delayed current-page cancel with stale receipt cannot finish a newer operation that reused display X.
9. Imported backup from same machine but older history epoch is still historical unless an explicit trusted export receipt proves otherwise.
10. OperationLog export/import text does not recreate terminal/control authority.
11. Progress messages require current live operation/document receipt; imported textual X cannot pass current correlation.
12. Physical Yandex/download checkpoint recovery never depends on imported OperationLog linkage as correctness authority.

## Negative finding / risk boundary

This audit found **no fresh evidence** that imported `operationId` alone currently drives a destructive Yandex mutation, local file deletion/download, or automatic terminal log mutation when the imported entry is merely viewed.

Do not overstate P1-190 as a remote-data authority defect without a separate admissible source path. Its confirmed impact remains provenance/forensic UI integrity, while P1-198 independently owns live terminal/control identity.

## Numbering result

No new item. **P1-190** remains imported/history provenance, **P1-198** remains live operation/terminal receipt, **P1-197** history epoch and **P1-148** exact Journal linkage compose.

## Test / release state

No product tests were rerun. Historical gate remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS** as prior evidence only. No build, tag or Release was created.
