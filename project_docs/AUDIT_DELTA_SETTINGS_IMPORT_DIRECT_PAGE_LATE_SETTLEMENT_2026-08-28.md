# Audit delta — settings import vs direct extension-page late settlement — 2026-08-28

Source-of-truth `main` immediately before this write: `d360b532c37b70a759b6701a12c6482ae14733dd`.

Docs-only audit checkpoint. Runtime/configuration/tests/manifest are unchanged. No new P-number is assigned.

## Classification

Fresh source proof refines existing **P1-157** shared-settings mutation ownership and composes with **P1-008** import atomicity/marker generation and **P1-210** unknown mutation settlement.

Prior shared-settings audit already proves stale open pages can overwrite imported values later. This pass proves a stronger physical ordering race: a direct page-owned `chrome.storage.local.set()` can be **started before** the import, remain unresolved while the import commits, and settle afterward, partially rolling back the imported bundle even if the user never performs another post-import edit.

No new root cause is needed.

## Positive control — worker-owned Yandex and OperationLog settings already have cross-import barriers

Current service-worker settings architecture has explicit actual-settlement coordination around import.

`importUserSettings()` calls `waitForUserSettingsMutationBarriers()` before reading previous settings and issuing the bundled import write.

That barrier waits for:

- the prior user-settings import actual settlement;
- `yandexConfigStorageSettlementChain`;
- the current serialized `operationLogSettings` mutation barrier when present.

Conversely:

- `updateYandexConfig(...)` waits for current user-settings import settlement before starting a new Yandex config mutation;
- `saveOperationLogSettings(...)` waits for current import settlement before writing retention settings.

This is a useful physical ordering pattern. It does not solve logical stale-form expected-revision conflicts, but it prevents these worker-owned writes from simply overtaking the bundled import because their Chrome Storage promises settled late.

## `groupByUrl` bypasses that barrier entirely

Journal's grouping checkbox still performs a direct page-context call:

`chrome.storage.local.set({ webclipJournalGroupByUrl: groupByUrl })`

inside a local try/catch.

The write:

- does not enter the service-worker `userSettingsImportStorageSettlement` chain;
- is not visible to `waitForUserSettingsMutationBarriers()`;
- has no shared-settings revision/CAS;
- has no actual-settlement receipt available to the worker import owner.

Chrome Storage mutation itself is non-cancellable from the extension page's perspective. Losing/ignoring the page-side promise does not mean the mutation cannot settle later.

## Deterministic pre-import late-settlement rollback

1. Journal page J displays `groupByUrl=false`.
2. User toggles the checkbox to true; J starts direct Storage write A (`groupByUrl=true`).
3. A's actual Chrome Storage promise remains unresolved/delayed.
4. Another extension page starts user-settings import B whose document specifies `groupByUrl=false` plus Yandex/backup/OperationLog settings.
5. `waitForUserSettingsMutationBarriers()` cannot see A because A is a direct Journal-page write outside worker chains.
6. Import B writes its allowlisted settings bundle + import marker and the actual import mutation commits successfully.
7. Reconciliation may proceed and UI may report imported settings committed.
8. Old page write A settles **after** B and stores `groupByUrl=true`.
9. Durable settings now contain a mixture: imported B for worker-owned fields, but old pre-import A for grouping preference.

The import was internally one bundled `storage.set`, yet its postcondition did not remain true because an older untracked writer was already in flight.

## Why stale-page notification alone cannot close this race

Even if import B immediately broadcasts a new settings revision and J disables its controls:

- A was already physically admitted before B;
- the non-cancellable Storage write can still settle after the notification;
- UI invalidation cannot retract it.

Therefore cross-page refresh is necessary UX but not the correctness primitive.

All writers of an imported/shared key must enter one generation/settlement contract.

## Required P1-157 contract

### Route shared setting mutations through one authoritative owner

`webclipJournalGroupByUrl` should no longer be mutated by a raw extension-page `chrome.storage.local.set` that import cannot observe.

Preferred direction:

- page sends a settings mutation RPC with expected settings revision/edit receipt;
- worker serializes/coordinates the actual Storage mutation with import and other shared writers;
- result returns the new revision/current value;
- unknown outer response reconciles rather than blind retry.

An equivalent page-side protocol is acceptable only if it provides the same global actual-settlement and CAS guarantees; merely adding another local Promise queue per page is insufficient across pages/worker restart.

### One settings revision must cover the imported bundle

Import should atomically advance a durable shared-settings revision alongside its allowlisted values/marker.

All later writers consume expected revision or explicit merge policy. A writer admitted under pre-import revision A cannot settle after B and silently become current merely because Chrome executed its old `set` later.

### Physical ordering + logical CAS are both required

Physical barrier prevents already-started old writer A from landing after import B.

Expected-revision CAS prevents a stale page that starts a **new** mutation after B from intentionally/accidentally writing values based on old UI A.

Neither layer replaces the other.

## Import marker completion

P1-008 marker B must not be removed/declared fully reconciled while a pre-B shared-setting physical mutation can still legally settle afterward and alter the imported generation.

Once every shared writer participates in the global barrier/revision, marker reconciliation can establish:

- bundled values B committed;
- all older admitted shared writes have actually settled before B;
- ancillary scheduler state is reconciled to current generation;
- no old-generation writer remains capable of physically rolling B back.

## Unknown page-write result

The current Journal handler swallows Storage errors and immediately keeps local UI state.

Final design should distinguish:

- confirmed commit/new settings revision;
- conflict/stale expected revision;
- unknown outer/result settlement requiring read reconciliation;
- deterministic failure.

Do not render a durable preference claim solely from the checkbox's local value.

## Required regressions

1. Direct/legacy page write A begins and is delayed -> import B commits -> release A actual settlement: final durable state remains B/current generation; A cannot land after B.
2. Same race with A rejected/unknown: import marker completion remains truthful and bounded.
3. Import B finishes -> stale Journal page starts a new write based on pre-B revision -> explicit conflict/refresh, not overwrite.
4. Two Journal pages have old/new revisions -> only current expected revision can mutate or explicit merge policy applies.
5. Yandex config mutation A and import B remain physically ordered by existing worker barrier.
6. OperationLog retention mutation A and import B remain physically ordered by existing worker barrier.
7. Adding global settings revision does not regress atomic import of the allowlisted bundle + marker.
8. `groupByUrl` write loses runtime response after actual commit -> page reconciles current value/revision before allowing another generation.
9. Import B changes groupByUrl while old Journal page is visible -> page is marked stale/refreshed, but worker CAS remains safe even if notification is missed.
10. Intentional newer settings C after B supersedes B normally and obtains revision C; old A cannot settle afterward and overwrite C.
11. Worker restart during A/B ordering reconstructs enough durable/current revision state; correctness does not rely only on module-memory queues.
12. Settings export after B waits current mutation barrier and reads one coherent committed settings generation.

## Duplicate check

- **P1-157** is primary: every shared settings writer must participate in one versioned mutation/actual-settlement contract.
- **P1-008** owns import bundle + marker/recovery generation.
- **P1-210** owns unknown caller-visible mutation result and reconciliation.
- **P1-141** remains read single-flight freshness after mutations.

No P1-211 is created.

## Test / release state

Documentation only. Product tests were not rerun. Historical gate remains **88/88 syntax + 74/74 deterministic PASS**. No build/tag/Release was created.
