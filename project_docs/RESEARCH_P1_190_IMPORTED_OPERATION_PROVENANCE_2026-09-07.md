# P1-190 — imported operationId is historical provenance, not live OperationLog linkage — 2026-09-07

Status: **ACTIVE / architecture-saturated, runtime gate RED**.

Canonical baseline inspected: `main` = `d4f5b268fa3f7ced5a7bc68da52784863d614138`.

Registry owner: an imported `operationId` is historical/unverified provenance and must not automatically link a portable Journal row to an unrelated live local `OperationLog` record.

## 1. Current source proof

`normalizeImportedJournalEntry()` currently accepts a portable operation id whenever the text passes a length/character regex and then stores it in the normal live field:

```js
const importedOperationIdRaw = String(raw.operationId || '').trim();
const importedOperationId = importedOperationIdRaw.length <= MAX_OPERATION_ID_CHARS
  && /^[A-Za-z0-9._:-]+$/.test(importedOperationIdRaw)
    ? importedOperationIdRaw
    : '';
...
operationId: importedOperationId
```

The Journal UI later does:

```js
const operationId = String(entry?.operationId || '').trim();
const exactOperationId = /^[A-Za-z0-9._:-]{1,160}$/.test(operationId) ? operationId : '';
```

and, when non-empty, sends:

```js
{ type: 'WEBCLIP_OPERATION_LOG_GET', operationId: exactOperationId }
```

The worker resolves that request by string key:

```js
return getOperationLog(String(message.operationId || ''));
```

Thus a portable backup string can collide with an unrelated local diagnostic namespace and be presented as an exact linked log.

## 2. Syntax is not provenance

A regex proves only that a string is structurally acceptable as an identifier. It does not prove:

- that the id was minted on this browser profile;
- that the associated OperationLog survived import/export together with the row;
- that the local log belongs to this Journal entry;
- that the imported row was ever produced by the current installation.

Therefore `operationId` must not be both a portable historical field and a live local foreign key.

## 3. Target data model

Imported rows should be normalized conceptually as:

```js
{
  operationId: '',
  historicalOperationId: '<bounded imported text>',
  operationProvenance: 'imported-unverified',
  operationLink: null
}
```

The historical id may be displayed/copyable with an explicit unverified label if product design wants to preserve troubleshooting context. It must not enable `WEBCLIP_OPERATION_LOG_GET` linkage.

Malformed historical ids are discarded.

## 4. Worker-minted local link receipt

A newly created local Journal row may carry a non-portable local receipt such as:

```js
operationLink: {
  version: 1,
  provenance: 'live-local',
  entryId,
  operationId
}
```

The exact field layout may change, but the invariants are:

1. link is minted only by the trusted worker while creating/finalizing the local row/log relationship;
2. receipt binds the Journal entry id and operation id;
3. imported/exported data cannot claim `live-local` merely by copying the object;
4. import normalization strips/demotes any portable `operationLink` and never treats it as trusted;
5. a link cannot be transplanted from entry A to entry B.

A stronger generation/receipt may later compose with P1-198/P0-076, but P1-190 does not need to invent a parallel physical operation identity system.

## 5. Journal UI linkage

`buildLinkedOperationLog(entry)` must stop enabling a linked log solely because `entry.operationId` matches a regex.

Preferred flow:

- derive linked operation authority from the local worker-minted receipt;
- if no valid local receipt exists, show no automatic OperationLog link;
- optionally show `historicalOperationId` separately as imported/unverified metadata;
- never silently fall back from invalid/missing receipt to plain imported `operationId`.

For strongest defense-in-depth, the Journal page can ask the worker for a linked log by Journal entry id and let the worker verify the local receipt before returning the log, rather than accepting an arbitrary portable operation id as a foreign key.

General OperationLog browsing/export in the extension remains a separate feature; P1-190 only governs **automatic Journal-entry linkage**.

## 6. Legacy rows

A pre-migration local row with a plain `operationId` but no provenance receipt is ambiguous: it could be a genuine old local row or a previously imported row.

Fail-closed default:

- do not automatically link it to a local OperationLog merely by string equality;
- optionally retain/display it as `legacy-unverified` historical provenance;
- rebind only if independent local durable evidence proves the exact Journal-entry/log relationship.

This may temporarily reduce convenience for old entries, but avoids fabricating provenance.

## 7. Import/export behavior

Export may preserve a historical operation id for diagnostics, but its representation must make clear that portability removes local-link authority.

Import must always demote:

```text
portable operationId / operationLink -> historical-unverified
```

There is no round-trip rule saying an exported live-local receipt remains live-local after import into the same or another profile.

## 8. Neighboring owners

- **P1-198** — physical live operation identity must be worker-issued; textual caller ids are not ownership capabilities.
- **P0-076** — Journal per-entry revision/generation CAS.
- **P1-189** — duplicate imported hostname is not site authority.
- **P0-022** — imported remote Yandex locator metadata is not destructive provenance.

P1-190 is specifically about the local Journal ↔ OperationLog provenance boundary.

## 9. Deterministic model

`project_tools/test_p1_190_imported_operation_provenance_model.js` proves:

- an imported operation id colliding with a local log is historical only;
- a forged imported `operationLink` is stripped;
- a worker-minted live-local receipt links correctly;
- the receipt cannot be transplanted to another Journal entry;
- a legacy plain operation id without provenance fails closed;
- malformed historical ids are discarded.

Expected output:

```text
P1-190 imported operation provenance model: PASS
```

## 10. Source-bound acceptance gate

Committed source must eventually prove:

1. import normalization no longer writes imported text into live `entry.operationId` linkage authority;
2. imported ids are stored, if at all, as explicitly historical/unverified metadata;
3. imported `operationLink`/provenance claims are stripped/demoted;
4. new live rows receive a worker-minted entry-bound local link receipt;
5. Journal UI does not enable a linked OperationLog from regex-only `entry.operationId`;
6. no compatibility fallback restores string-only linkage for legacy/imported rows;
7. general OperationLog access remains separate from Journal automatic linkage.

## 11. Closure evidence still required

Architecture/model PASS does not close P1-190.

Closure requires production implementation, committed-source gate PASS and direct regression proving:

- a backup row whose historical id equals a real unrelated local log does not link to that log;
- a genuine new local Journal row can still open its own linked OperationLog;
- export→import demotes that link even if imported back into the same profile.

Registry status remains **ACTIVE**. Release remains **NOT READY**.
