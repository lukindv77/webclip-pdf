# P0-033 closure evidence — signed Yandex transport URL OperationLog redaction — 2026-09-01

Canonical owner/status authority remains `AUDIT_REGISTRY.md`.

Base for this closure tranche: `main = a24b97ea9606c10414a804a8baca056713a4ba10`.

Owner: **P0-033** — signed Yandex transport URL is an opaque capability; OperationLog must not retain its real path, query or fragment.

## Current-source failure control

Current `service-worker.js` had two OperationLog sanitization paths that special-cased only `disk.yandex.net` and `*.disk.yandex.net`. For other HTTP(S) URLs the generic log form retained `origin + pathname` while dropping query/fragment.

The deterministic current-shape failure control therefore reproduces:

- `https://uploader1d.disk.yandex.net/upload/opaque/secret?...` -> `https://uploader1d.disk.yandex.net/[REDACTED_SIGNED_PATH]`;
- `https://downloader.disk.yandex.ru/disk/opaque/secret?uid=42&hash=...#fragment` -> **pre-fix leak** `https://downloader.disk.yandex.ru/disk/opaque/secret`.

The second result retains capability-bearing signed transport pathname material and is the exact P0-033 regression.

## Implementation

`operation-log-redaction-guard.js` is loaded in the worker-only security bootstrap through `journal-text-filter.js` before ordinary service-worker execution continues.

It wraps both existing worker bindings:

- `safeUrlForOperationLog()` — direct OperationLog URL field;
- `sanitizeOperationLogValue()` — nested OperationLog metadata/value sanitization.

The guard recognizes the bounded Yandex Disk signed-host families currently covered by this owner:

- `disk.yandex.net` and `*.disk.yandex.net`;
- `disk.yandex.ru` and `*.disk.yandex.ru`.

For those hosts the only retained URL representation is:

`<origin>/[REDACTED_SIGNED_PATH]`

The original path, query and fragment are never delegated to the pre-existing sanitizer. The nested-value guard intentionally redacts a syntactically valid signed transport URL even when its metadata key is not named `url`/`href`, because an opaque capability must not become durable merely through a different field name.

## Deterministic accepted evidence

Accepted exact evidence head: `2b8f78d77da08f797ad2932ac697f7e4b949c0b3`.

GitHub Actions:

- run: `33469046270`;
- job: `99734845451`;
- Node.js: `22.23.2`;
- result: **SUCCESS**;
- durable test: `project_tools/test_p0_033_signed_yandex_log_redaction.js`.

The accepted test proves:

1. the pre-fix `.disk.yandex.ru` pathname leak reproduces;
2. direct `.disk.yandex.net`, `.disk.yandex.ru` and their tested subdomains reduce to origin + constant redacted path;
3. nested signed URLs are redacted even under a non-URL metadata key;
4. serialized sanitized metadata contains none of the fixture signed pathname/query/fragment secrets;
5. the ordinary API endpoint `cloud-api.yandex.net/v1/disk/resources/download?...` remains a negative control: its non-capability API pathname is retained while query is removed by the existing sanitizer;
6. an unrelated ordinary HTTPS URL retains the existing `origin + pathname` log contract;
7. a classic worker-shape control proves JavaScript function-declaration hoisting makes the later-textual `safeUrlForOperationLog` / `sanitizeOperationLogValue` bindings available when the first-line `importScripts(...)` bootstrap installs the guard, and the wrapped bindings remain active afterward;
8. repository wiring remains source-bound: `service-worker.js` imports `journal-text-filter.js` synchronously first, and that worker-only bootstrap imports `operation-log-redaction-guard.js`.

The temporary evidence workflow was deleted before PR delivery.

## Owner / boundary decision

This evidence closes the exact P0-033 root: signed Yandex Disk transport capability path/query/fragment material is not persisted through direct or nested OperationLog URL sanitization for the covered `.disk.yandex.net` and `.disk.yandex.ru` host families.

This closure does **not** claim:

- general durable/display source-URL minimization (P0-066 remains separate);
- Yandex auth/account/root generation closure (P0-073/P0-074 remain separate);
- exact remote-object/content identity (P1-184 and related owners remain separate);
- that arbitrary future Yandex signed transport host families are proven covered without Change Impact.

A future transport-host change must re-run Change Impact rather than silently infer coverage from the current bounded host set.

## Status decision

P0-033 is eligible for **DONE** after this implementation plus deterministic direct failure/positive/negative/bootstrap controls.

`RELEASE_READINESS.md` remains **NOT READY**. This closure does not create a build, tag or GitHub Release.
