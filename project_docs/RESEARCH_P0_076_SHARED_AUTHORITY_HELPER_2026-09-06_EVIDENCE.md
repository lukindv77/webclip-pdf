# P0-076 — shared Journal mutation-authority helper contract — 2026-09-06

Date: 2026-09-06  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch: `research/p0-076-journal-generation-cas-2026-09-06`  
Deterministic model commit: `f3678051a088bc87f731a8670f41f01e76940a4c`  
Owner: **P0-076 ACTIVE**.

This checkpoint defines one pure authority parser/projection contract shared by direct Journal-page IndexedDB reads and service-worker fallback/mutation paths. Runtime/manifest remain unchanged.

## 1. Why one helper is preferable

`journal.js` has direct IndexedDB view paths and fallback paths through service-worker messages. P0-076 requires both to expose exactly the same mutation-authority semantics.

Duplicating parsing rules independently creates a future drift risk around:

- missing vs malformed global generation control;
- legacy vs modern entry authority;
- UUID/revision bounds;
- future-version fail-closed behavior;
- serialized IPC bounds.

The repository already loads local pure scripts in `journal.html`, while the worker uses local `importScripts()`. Therefore a small shared module can serve both contexts without new permissions, remote code or DB schema changes.

Selected conceptual module:

```text
journal-mutation-authority.js
-> globalThis.WebClipJournalMutationAuthority
```

It has no IndexedDB, Chrome API, network, wall-clock or random side effects.

## 2. Stable global control parser

The helper parses the exact `meta` control key value for:

```text
journalMutationGeneration
```

Body v1:

```text
{
  version: 1,
  generation: '<UUID-v4>',
  destructiveBoundarySeen: <boolean>
}
```

Parser result is discriminated:

```text
absent | valid | invalid | unsupported-version
```

Unsupported/malformed must never collapse to absent/bootstrap semantics.

## 3. Per-entry local revision parser

Persisted local-only field:

```text
journalLocalRevision = {
  version: 1,
  generation: '<UUID-v4>',
  revision: <positive safe integer>
}
```

Parser likewise preserves:

```text
absent | valid | invalid | unsupported-version
```

Field absence is legitimate for legacy rows. Present null/malformed/future metadata is indeterminate/fail-closed, not legacy.

## 4. Legacy DB revision bound

Legacy rendered authority temporarily uses exact IDB meta `revision` value.

Current revision values are compact timestamp/random tokens. P0-076 sets a conservative helper bound:

```text
MAX_LEGACY_DB_REVISION_CHARS = 128
```

Exact key absence is represented separately and may produce an empty authority value for pristine legacy state. A present-but-empty/oversized/corrupt revision record is invalid, not equivalent to absence.

This is an IPC/computation bound, not a global storage quota contract.

## 5. Ephemeral rendered authority shapes

Modern:

```text
journalMutationAuthority = {
  version: 1,
  kind: 'modern',
  journalGeneration: '<UUID-v4>',
  entryGeneration: '<UUID-v4>',
  entryRevision: <positive safe integer>
}
```

Legacy:

```text
journalMutationAuthority = {
  version: 1,
  kind: 'legacy',
  journalGeneration: '<UUID-v4 or empty when control absent>',
  legacyDbRevision: '<bounded exact revision or empty when absent>'
}
```

Maximum compact serialized authority:

```text
MAX_JOURNAL_MUTATION_AUTHORITY_JSON_CHARS = 512
```

The field is ephemeral view/IPC state. It is not persisted as a second authority copy, not exported, not imported and not logged as user data.

## 6. Authority construction matrix

Given one transaction-consistent snapshot of entry + generation control + DB revision:

```text
entry missing                                   -> missing
legacy entry + control absent + revision valid  -> valid legacy
legacy entry + control valid + revision valid   -> valid legacy
modern entry + control valid                    -> valid modern
modern entry + control absent                   -> indeterminate
any present malformed/future local revision     -> indeterminate
malformed/future global control                 -> indeterminate
present malformed DB revision                   -> indeterminate
```

A read-only card may still be displayed when authority is indeterminate, but mutation controls must not send an id-only fallback operation.

## 7. Same transaction is mandatory

Authority construction itself is pure, but inputs must be observed from one IndexedDB snapshot.

Mutation-capable direct views therefore open:

```text
[entries, meta]
```

as one readonly transaction, read global control/revision and cursor entries inside it, and publish only on `tx.oncomplete`.

Current `journal.js` already publishes its main page/group reads on `tx.oncomplete`, which is a positive control and avoids creating a new P1-086 issue when `meta` is added.

Aggregate counts/domain metadata that do not return mutation-capable entry objects do not need `meta` merely for P0-076.

## 8. Direct/fallback parity

Entry-returning direct and service-worker fallback projections must both include the same bounded `journalMutationAuthority` field.

Relevant UI entry-returning families are:

- ordinary paged entries;
- URL-group child entries;
- any exact-id entry projection that can render mutation controls.

Group headers, counts and domain summaries do not themselves carry mutation authority.

A transient failure of direct IndexedDB access must not downgrade the fallback card to id-only mutation semantics.

## 9. Projection boundary

Current `journalEntryViewSummary(entry)` deliberately builds a bounded projection instead of returning raw IDB records. This is a useful positive control: future persisted `journalLocalRevision` need not be exposed directly.

Target projection is conceptually:

```text
{
  ...bounded portable/display summary,
  journalMutationAuthority: makeAuthority(entry, control, revision)
}
```

The UI consumes the ephemeral authority, not the persisted raw local-revision object.

## 10. Mutation response propagation

On successful CAS mutation, worker returns:

```text
{
  ok: true,
  mutationOutcome: 'committed',
  entry: <current bounded entry projection>,
  journalMutationAuthority: <new authority>
}
```

The open card replaces its prior authority with the returned value.

On stale outcomes worker returns structured failure with one of:

```text
stale-journal-generation
stale-entry-generation
stale-entry-revision
stale-legacy-revision
```

plus `missing` / `invalid-authority` as applicable.

Current generic `requireOk()` drops these machine distinctions by creating a plain `Error`. P0-076 UI integration must preserve the mutation outcome/code or use a mutation-specific result handler.

Stale response triggers reload/re-render and asks the user to repeat the action. It never automatically retries a mutation or external side effect.

## 11. Strong generation creation stays outside the pure helper

The helper validates and compares IDs but never generates them.

Runtime owner supplies fresh `crypto.randomUUID()` values when:

- global generation is first bootstrapped;
- a destructive boundary rotates global generation;
- a new local entry incarnation is created.

No `Math.random()` fallback is added for P0-076 generation authority.

## 12. Deterministic model

Added:

`project_tools/test_p0_076_authority_helper_model.js`

Local Node result before durable write:

```text
P0-076 shared authority helper model: PASS
```

Controls include:

1. pristine legacy entry with absent control/revision gets bounded legacy authority;
2. legacy entry with valid control/revision remains legacy;
3. modern entry with valid control gets modern authority;
4. modern local authority without global control is indeterminate;
5. present malformed local authority is not legacy;
6. future global control is indeterminate;
7. oversized present legacy DB revision is indeterminate;
8. modern authority remains within the 512-character envelope.

Architecture/model evidence only; runtime remains RED.

## 13. Owner boundaries

P0-076 owns authority shape/comparison and mutation propagation.

P1-086 remains owner of generic readonly IndexedDB publish-after-complete semantics; current applicable Journal page reads are positive controls, not a closure of that owner.

P0-072 owns reset detachment/rebase of pending authority. P1-183/P1-090 own Delete→Trash external-effect receipt/object proof.

## 14. Status / next implementation boundary

P0-076 remains **ACTIVE**.

The shared pure helper is a suitable future first implementation commit because it is small, deterministic and can be tested independently before wiring the large worker. It should not be called runtime-complete until both direct and fallback projections plus mutation handlers consume it.

Runtime/manifest unchanged; manifest remains `0.9.8`; release remains `NOT READY`; no Actions/build/tag/GitHub Release is claimed.
