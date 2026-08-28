# Audit delta — Save Root result can mix concurrent Yandex root generations — 2026-08-28

Source-of-truth `main` immediately before this write: `ebceffe03b25dcbbbffcb5ef72d2f6a608fb5459`.

Docs-only audit checkpoint. Runtime/tests/configuration/manifest are unchanged. No new P-number is assigned.

## Classification

Primary owner: **P0-074 — immutable Yandex operation/config generation**.

Adjacent:

- **P1-157** shared extension-page/settings mutation ordering;
- **P1-177** scheduler state for the current root generation;
- the immediately preceding root partial-commit reconciliation delta;
- **P1-210** for truthful outer operation result/reconciliation.

## Fresh source proof

`saveYandexRoot(requestedRoot)` normalizes the requested path to local variable `normalized` and first commits it through `updateYandexConfig()`.

After that commit, when auth exists, it calls:

`ensureYandexServiceFolders({ includeUpload:true, includeReadLater:true, includeBackup:true })`

Crucially, `ensureYandexServiceFolders()` does **not** consume the root generation/value that `saveYandexRoot()` just committed. It starts with a fresh independent:

`const config = await getYandexConfig()`

and builds/creates/verifies service folders below `config.rootPath` from that later read.

Finally, `saveYandexRoot()` does not return the root that `ensureYandexServiceFolders()` actually verified. It returns the old local request value:

`rootPath: normalized`

and sets `structureVerified=true` solely because the later helper completed.

Thus one operation response can combine two different config generations.

## Deterministic two-Options-tab schedule

1. Current root is A.
2. Options page P1 invokes Save Root B.
3. P1's `updateYandexConfig()` commits B.
4. Before P1 calls/finishes `ensureYandexServiceFolders()`, Options page P2 invokes Save Root C.
5. P2's config mutation commits newer C.
6. P1 enters `ensureYandexServiceFolders()` and fresh-reads current config C.
7. P1 verifies/creates Upload, ReadmeLater and Backup/Journal under **C**, not B.
8. P1 sets local `structureVerified=true`.
9. P1 calls scheduler reconciliation, which likewise operates against current state and may therefore be C.
10. P1 returns `{ok:true, rootPath:B, structureVerified:true, ...paths derived from B}` to its caller.
11. P1 UI can display "Корневая папка сохранена: B. Служебные папки ... проверены" even though current root is C and the folder verification performed by this call was for C.

This does not require timeout, crash, network failure or account switch. Ordinary concurrent settings tabs are sufficient.

## Why storage serialization is insufficient

`updateYandexConfig()` serializes physical config writes. That prevents B and C storage mutations from overtaking each other at the Chrome Storage layer.

The defect occurs **after** B's serialized write has completed: later steps of B no longer retain B generation authority and independently read current config. Physical storage ordering therefore works exactly as designed while the logical operation receipt becomes mixed-generation.

This is the same general invariant P0-074 already requires for long Yandex uploads, now proven on the direct root-settings workflow itself.

## Required contract

### Root-save receipt

The config mutation that publishes B should return an immutable root/config generation receipt, for example conceptually:

- committed root B;
- config generation GB;
- auth/account generation accepted for ancillary verification;
- operation receipt id.

All later B-specific work must either consume that exact receipt or explicitly discover it has been superseded.

### Structure verification

`ensureYandexServiceFolders()` needs an operation-context form that can verify an expected root/account generation rather than always fresh-binding to whichever config is current at helper entry.

For a Save Root operation admitted as GB:

- if GB is still current, verify/create B structure and return a GB-tagged structure receipt;
- if C/GC superseded it, stop B's ancillary work or return `superseded`, not `structureVerified:true for B`;
- do not reinterpret B's request as authorization to manage C merely because C is now globally current.

### Response truth

A returned `rootPath`, service paths, `structureVerified`, scheduler state and account identity must all describe one coherent accepted generation.

If B was superseded by C before completion, acceptable UX includes:

- "B was saved but has already been superseded by C; current state refreshed"; or
- a stale/conflict result that refreshes current settings.

It must not report B as current/verified when the actual verification occurred for C.

### Scheduler handoff

Scheduler reconciliation after root save should be based on a fresh **current scheduler generation** as required by P1-177, but the root-save result must distinguish:

- B's historical config commit outcome; from
- current C scheduler state.

Do not label current-C scheduler reconciliation as proof that B's structure was verified.

## Required regressions

1. Save B with no concurrent mutation -> B structure verified; response all GB.
2. B commits -> C commits before B structure check -> B call returns superseded/conflict, never `B + verified(C)`.
3. B folder verification begins -> C commits mid-tree -> remaining B work does not silently switch to C.
4. B commits under account X -> auth switches Y before verification -> P0-074 account generation fails closed; no mixed X/B response with Y structure.
5. P1 and P2 Save Root concurrently -> final config C and every individual response truthfully identifies whether its generation won/superseded.
6. B response channel lost, C later commits -> reconciliation reads current GC and does not resurrect B.
7. Scheduler reconciliation may target newest current root, but response fields do not conflate that with B structure proof.
8. Service-folder creation already settled for B just before C wins -> B historical result may be logged, but current root remains C and no B success response overwrites UI without generation check.

## Duplicate check

The prior Yandex single-operation context delta proved the same invariant for PDF upload, where initial config A could mix with later service-folder config C. Repository search found no dedicated Save Root concurrency checkpoint.

This is therefore a new manifestation of **P0-074**, not a new root-cause number.

## Test / release state

Documentation only. Product tests were not rerun. Historical evidence remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Runtime version remains `0.9.8`; no build/tag/Release was created.
