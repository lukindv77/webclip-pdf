# P0-072 — pure helper module contract for Commit A — 2026-09-06

Date: 2026-09-06  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch entering this block: `research/p0-072-recovery-quarantine-2026-09-04 @ 37c86de713acb60be0f97c59806102dfd516a94d`  
Deterministic model commit: `73a66edd544ea7279479895f2602fb1be143e969`  
Owner: **P0-072 ACTIVE**.

This checkpoint defines the exact scope of the planned first production-code tranche (“Commit A”). Runtime/manifest remain unchanged in this research checkpoint.

## 1. Why a standalone pure module is preferred

Fresh source inspection confirms the worker already uses small global helper modules loaded by `importScripts()` and tests them independently through Node `vm` contexts. `local-download-identity.js` + `project_tools/test_p0_048_local_download_identity.js` are a current positive example.

The existing `journal-import-digest.js` is intentionally a narrow SHA-256 helper and `local-download-identity.js` is intentionally a narrow local-download identity helper. Adding reset/recovery state-machine code to either module merely to avoid editing the large worker would create architectural coupling.

Preferred implementation direction:

```text
journal-reset-recovery.js
 -> globalThis.WebClipJournalResetRecovery
```

The new module can be added and tested before it is wired into `service-worker.js`. That makes Commit A behavior-neutral at runtime and avoids a large worker replacement merely to prove the helper implementation.

## 2. Commit-A module constraints

The module is pure and deterministic.

It must contain **no**:

- Chrome API calls;
- IndexedDB access;
- `Date.now()`;
- `crypto.randomUUID()` / `crypto.getRandomValues()`;
- timers;
- network/auth/config reads;
- OperationLog writes;
- mutation of caller-owned objects.

All nondeterministic values such as reset id and timestamps are provided explicitly by the transaction/call-site layer later.

This keeps the module testable through the established `vm` pattern and prevents helper tests from claiming transaction behavior they do not own.

## 3. Minimum exported API

Recommended v1 surface:

```text
WebClipJournalResetRecovery = {
  RESET_VERSION,
  STAGE_VERSION,
  MAX_RESET_JSON_CHARS,
  parseResetDispositionField,
  classifyCheckpointAuthority,
  makeResetDisposition,
  parseExternalStagesField,
  classifyExternalStage
}
```

The exact names may be adjusted during implementation, but the semantic separation is required.

## 4. Reset parser is discriminated, not nullable

`parseResetDispositionField(row)` returns one of:

```text
absent
valid
invalid
unsupported-version
```

It must not collapse absent/invalid/future-version into a single `null` result.

This implements the 2026-09-06 corruption/rollback correction.

`classifyCheckpointAuthority(row)` maps to:

```text
missing
active
reset-detached
reset-indeterminate
```

Only exact `active` is ordinary replay/admission/delete authority.

## 5. Exact v1 reset shape

The v1 disposition remains fixed to the previously selected bounded fields:

```text
version
resetId
kind
scope
sourceOperationId
quarantinedAt
state
outcome
resolution
updatedAt
```

Unknown extra keys are rejected for v1 rather than silently accepted. This keeps the ≤512-character envelope meaningful and prevents same-version schema drift.

Future additions require an explicit new version or a separately versioned companion structure.

## 6. `kind` and `scope` must agree

A parser/constructor must reject logically inconsistent pairs.

Allowed v1 mapping:

```text
clear-all      <-> all
clear-url      <-> url
clear-site     <-> site
import-replace <-> all
```

Examples such as `kind='clear-site', scope='url'` are invalid/reset-indeterminate on read.

This prevents corrupted metadata from being treated as a valid detached receipt whose scope semantics cannot be trusted.

## 7. `outcome` and `resolution` are a validated pair

Independent enum validation is insufficient because it permits contradictory state such as:

```text
outcome = unknown
resolution = terminal
```

Minimum allowed v1 pairs:

```text
pending                -> reconciling | manual-resolution
complete               -> terminal
interrupted            -> terminal
remote-verified        -> terminal
unknown                -> manual-resolution
cancelled-before-start -> terminal
start-rejected         -> terminal
```

`pending + manual-resolution` is intentionally retained for reset-targeted `pendingAppends`, which preserve evidence but have no useful automatic Journal replay after reset.

This pair validation does not itself define every later factual transition. Store-specific transition functions remain in later runtime tranches.

## 8. Timestamp and identifier validation

Constructor/parser v1 rules:

- reset id is fixed worker UUID-v4 shape;
- `sourceOperationId` preserves the historical compatibility maximum of 180 chars;
- timestamps are nonnegative safe integers;
- `updatedAt >= quarantinedAt`;
- serialized v1 disposition remains within the established 512-character envelope.

The pure helper does not generate the UUID or timestamp.

## 9. External-stage parser

`parseExternalStagesField(row, kind)` likewise distinguishes:

```text
absent
valid
invalid
unsupported-version
```

Allowed exact v1 shapes:

### Local

```text
{
  version: 1,
  downloadStart: prepared | admitted | cancelled-before-start | not-applicable
}
```

### Remote

```text
{
  version: 1,
  upload: prepared | admitted | cancelled-before-start | not-applicable,
  publish: prepared | admitted | cancelled-before-start | not-applicable
}
```

Unknown same-version fields are rejected rather than ignored.

## 10. Stage classification

`classifyExternalStage(row, kind, stage)` returns:

```text
legacy-admission-unknown
stage-indeterminate
prepared
admitted
cancelled-before-start
not-applicable
```

Only a current-version exact `prepared` state can later participate in the transaction-local one-shot admission CAS.

The pure helper does not itself perform admission.

## 11. Constructor scope is deliberately narrow

`makeResetDisposition()` is appropriate in Commit A because it only validates/builds one immutable v1 value from explicit inputs.

Commit A should **not** yet add:

- IndexedDB transition helpers;
- compare-and-delete functions;
- legacy Chrome Storage readers;
- salt bootstrap/token derivation;
- external mutation admission transactions;
- cleanup/recovery schedulers.

Those depend on current durable state and belong to Commit B/C.

## 12. Existing helper-module test style

Current project precedent loads helper source into a Node `vm` context, obtains the exported global, runs pure deterministic fixtures, then separately source-binds worker integration.

The planned module can use the same pattern:

```text
fs.readFileSync('journal-reset-recovery.js')
vm.runInContext(...)
context.WebClipJournalResetRecovery
```

No new test framework is necessary.

## 13. Deterministic model

Added:

`project_tools/test_p0_072_pure_helper_module_contract_model.js`

Local prototype/model result before durable write:

```text
P0-072 pure helper module contract model: PASS
```

The locally tested prototype implementation was ~5.3 KiB and contained only the pure API above. It was **not** written into production source by this checkpoint.

Covered controls include:

1. valid v1 reset parses as detached;
2. unsupported reset version is indeterminate;
3. absent reset is active legacy state;
4. kind/scope mismatch is rejected;
5. outcome/resolution mismatch is rejected;
6. timestamps cannot move backward;
7. absent externalStages is legacy-admission-unknown;
8. valid prepared stage is recognized;
9. unsupported stage version is indeterminate;
10. extra same-version stage fields are rejected.

## 14. Patch-path implication

Because local git checkout is still unavailable in the execution environment due DNS failure, adding a new small standalone module through the repository contents API is substantially safer than replacing the full ~570-KB `service-worker.js` merely to land Commit A.

Commit A can therefore be implemented as:

- new `journal-reset-recovery.js`;
- new exact helper tests;
- no worker import yet;
- no runtime behavior change.

Commit B would still require a safe worker patch path to load/use the helper and implement atomic reset semantics. Do not hide reset code inside an unrelated already-imported module solely to avoid that future integration step.

## 15. Owner boundaries

This module contract does not close:

- P0-072 runtime acceptance;
- P0-076 Journal-generation CAS;
- P1-146 actual local-download settlement;
- P0-073/P0-074/P1-090 remote identity/context;
- P1-043 global storage reservation;
- P2-019 schema/migration ownership.

No new P-code is allocated.

## 16. Status / exact next research boundary

The helper API is sufficiently defined to implement Commit A without further state-machine redesign.

Before production Commit B, the remaining tooling question is obtaining a reliable exact-head patch/update path for `service-worker.js`; direct local clone remains unavailable.

P0-072 remains **ACTIVE**. Runtime/manifest remain unchanged by this checkpoint; manifest remains `0.9.8`; release remains `NOT READY`. No Actions/build/tag/GitHub Release is claimed.
