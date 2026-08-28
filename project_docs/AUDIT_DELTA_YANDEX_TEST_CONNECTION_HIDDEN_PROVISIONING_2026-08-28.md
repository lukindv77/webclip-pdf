# Audit delta — Yandex connection test should not hide remote provisioning — 2026-08-28

Source-of-truth `main` immediately before this write: `51235adf507c2117fb4d7bc0b3d38c1dda3f6757`.

Docs-only audit checkpoint. Runtime/tests/configuration/manifest are unchanged.

## Classification

No new P-number is assigned.

Primary existing owner: **P1-195** — Yandex capability admission must be operation-specific; read/browse operations should not silently perform write/provisioning side effects.

Adjacent owners:

- **P0-074** — one Yandex operation context/account generation;
- **P1-210** — partial/unknown result after a side effect;
- **P1-177** — auth/status/scheduler state remains distinct from ancillary remote setup.

## Fresh source proof

`testYandexConnection()` starts as a read-like diagnostic:

1. `yandexApi('')` reads Disk/account info;
2. extracts account identity;
3. stores that account into the current auth state when available.

However, when `config.rootPath` is configured, the same command then calls:

`ensureYandexServiceFolders({ includeUpload: true, includeReadLater: true, includeBackup: true })`.

That helper verifies **or creates** the managed directory hierarchy for:

- Upload;
- ReadmeLater;
- Backup/Journal.

Therefore pressing a UI control labeled as checking/testing access can mutate the user's remote Disk before any save/backup operation actually requires those folders.

## Why this is more than wording

The distinction matters for capability and result semantics.

### Read capability becomes write capability

A user may reasonably expect “Проверить доступ” to prove:

- token/account validity;
- disk read/info access;
- optionally whether configured root exists/is accessible.

Creating service directories consumes `disk.write` and changes remote state. It should be explicit provisioning or a prerequisite of the first operation that actually needs the branch.

### Partial result is ambiguous

Deterministic schedule:

1. account read succeeds; token is valid and account A is proven;
2. account metadata is written locally;
3. service-folder creation fails on the second/third branch or its outer response is unknown;
4. `testYandexConnection()` rejects.

The UI can now report “connection test failed” even though authentication/account access was successfully proven and one or more remote directories may already have been created.

Retrying the test can perform more writes, and auth/account truth is conflated with ancillary provisioning truth.

### Multi-request generation rules still apply

If provisioning is retained anywhere, the folder-tree P0-074 audit applies: a multi-segment tree cannot switch accounts/auth generations halfway through.

## Required P1-195 refinement

### Separate diagnostic read from provisioning

A connection-test operation should return a structured diagnostic result using only the minimum required capabilities, for example:

- auth valid/invalid;
- account identity;
- quota/basic Disk info;
- configured root existence/accessibility if requested as a read.

It should not create Upload/ReadmeLater/Backup folders as an undocumented consequence.

### Provision folders at explicit write boundaries

Managed folders may be created when required by:

- Save to Yandex;
- Read Later;
- background/manual backup;
- explicit “create/repair WebClip folders” action if such UI exists.

Each such write operation has its own account/config/operation receipt.

### Preserve truthful partial diagnostics

If account validation succeeds but an optional follow-up check fails, the result should preserve the proven auth/account fact rather than collapse the entire command into a generic “connection failed”.

No remote side-effect uncertainty should be hidden inside a read-looking status response.

## Required regressions

1. Valid token + configured root + missing service folders -> Test Connection does not create directories.
2. Test Connection succeeds using read/info capability only and reports account A.
3. Missing/invalid token -> test fails without any remote write.
4. Save/Read Later/Backup still explicitly create only their required managed branches.
5. Explicit provisioning, if retained, reports partial/unknown side effects separately from auth validity.
6. Root/account changes between test and later write require a fresh operation context; test receipt does not authorize provisioning in a different generation.

## Duplicate check

The earlier restore-list audit already established P1-195 for hidden folder creation during a read/browse operation. This checkpoint applies the same existing rule to the separate `WEBCLIP_YANDEX_TEST`/`testYandexConnection()` path; no new root-cause number is needed.

## Test / release state

Documentation only. Product tests were not rerun. Historical evidence remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Runtime version remains `0.9.8`; no build, tag or GitHub Release was created.