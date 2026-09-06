# P0-072 — acceptance matrix addendum — 2026-09-06

Date: 2026-09-06  
Canonical source baseline at start of this continuation: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Owner: **P0-072 ACTIVE**.

This addendum updates `RESEARCH_P0_072_ACCEPTANCE_MATRIX_2026-09-04_EVIDENCE.md` with research corrections discovered while making Commit A implementation-ready. It does not claim runtime implementation.

## A. Reset disposition parsing / rollback

Supersede the older three-state row:

```text
missing | active | reset-detached
```

with:

```text
missing | active | reset-detached | reset-indeterminate
```

Required interpretation:

- field absent on legacy row -> `active`;
- valid current v1 -> `reset-detached`;
- field present but malformed/null -> `reset-indeterminate`;
- unsupported future version -> `reset-indeterminate`.

Only exact `active` may regain ordinary replay/admission/delete authority.

Runtime: **RED**.

Primary evidence:

- `RESEARCH_P0_072_RESET_DISPOSITION_CORRUPTION_ROLLBACK_2026-09-06_EVIDENCE.md`.

## B. External stage parsing / rollback

Missing `externalStages` remains legacy admission-unknown for rollout compatibility.

Present malformed/unsupported stage state is **not** legacy. It becomes:

```text
stage-indeterminate
```

Only current-version exact `prepared` may participate in fresh one-shot admission.

Runtime: **RED**.

Primary evidence:

- `RESEARCH_P0_072_EXTERNAL_STAGE_CORRUPTION_ROLLBACK_2026-09-06_EVIDENCE.md`.

## C. Pure helper Commit A

Commit A is now specified as one standalone deterministic helper module, conceptually:

```text
journal-reset-recovery.js
 -> globalThis.WebClipJournalResetRecovery
```

The module must have no Chrome/IDB/network/time/random side effects and should expose discriminated reset/stage parsers plus bounded v1 construction/classification.

Current source precedent supports direct Node `vm` module testing (`local-download-identity.js`). No `journal.js` or DB schema change is needed merely for this module.

Runtime: **NOT IMPLEMENTED**; research contract **COVERED**.

Primary evidence:

- `RESEARCH_P0_072_PURE_HELPER_MODULE_CONTRACT_2026-09-06_EVIDENCE.md`.

## D. Reset v1 structural invariants

New strict v1 validation additions:

```text
clear-all      <-> all
clear-url      <-> url
clear-site     <-> site
import-replace <-> all
```

and valid outcome/resolution pairs:

```text
pending                -> reconciling | manual-resolution
complete               -> terminal
interrupted            -> terminal
remote-verified        -> terminal
unknown                -> manual-resolution
cancelled-before-start -> terminal
start-rejected         -> terminal
```

Same-version unknown extra fields are rejected to keep the v1 ≤512-character envelope meaningful.

Runtime: **RED**.

## E. Wall-clock correction

The prototype rule:

```text
updatedAt >= quarantinedAt
```

is superseded.

Wall-clock timestamps are bounded metadata, not authority ordering. System-clock rollback must not invalidate a reset barrier.

Ordering comes from IndexedDB commit order, reset/effect identity and state transitions.

Runtime: **RED**.

Primary evidence:

- `RESEARCH_P0_072_WALL_CLOCK_AUTHORITY_CORRECTION_2026-09-06_EVIDENCE.md`.

## F. Legacy fence rollback versioning

The v1 legacy fence is a backward-compatible tombstone.

A future fence/token version must not replace/delete the v1 lookup identity while the historical source can recur. A v2-only namespace is rollback-unsafe for a v1 worker.

Runtime: **RED**.

Primary evidence:

- `RESEARCH_P0_072_LEGACY_FENCE_VERSION_EVOLUTION_2026-09-06_EVIDENCE.md`.

## G. External receipt discovery root correction

Supersede:

```text
externalEffect:v1:<effectId>
```

with stable discovery root:

```text
externalEffect:<effectId>
```

and `version: 1` inside the receipt body.

Reason: a v1-only prefix must not become blind to future receipt versions after downgrade.

Unknown/malformed body remains visible and blocks destructive reset rather than being skipped.

Runtime: **LATER**.

Primary evidence:

- `RESEARCH_P0_072_EXTERNAL_RECEIPT_NAMESPACE_VERSION_2026-09-06_EVIDENCE.md`.

## H. Reserved receipt-root key validation

Every key under `externalEffect:` is reserved external-effect authority space.

V1 exact key shape is one UUID-v4 suffix. Malformed keys are corruption/indeterminate and are not silently ignored.

Prefix max+1 counts malformed reserved-root keys as scanned work.

Runtime: **LATER**.

Primary evidence:

- `RESEARCH_P0_072_EXTERNAL_RECEIPT_KEY_VALIDATION_2026-09-06_EVIDENCE.md`.

## I. Indeterminate receipt capacity correction

For a **valid exact one-effect key**, an unsupported/malformed receipt body conservatively consumes one unresolved liability slot; it does not need to globally block unrelated new-effect admission by itself.

Invalid reserved-root key or prefix-scan overflow remains namespace-level fail-closed.

Destructive reset is stricter: unknown receipt body still blocks reset because v1 cannot prove detachment.

Runtime: **LATER**.

Primary evidence:

- `RESEARCH_P0_072_EXTERNAL_RECEIPT_INDETERMINATE_CAPACITY_CORRECTION_2026-09-06_EVIDENCE.md`.

## J. Pending-store indeterminate capacity/scheduler

New store-neutral classes:

```text
active-current
manual-unresolved
detached-reconciling
terminal-retained
```

- reset-indeterminate -> manual-unresolved;
- local/remote stage-indeterminate -> manual-unresolved;
- reset-detached reconciling -> detached-reconciling;
- reset-detached manual -> manual-unresolved;
- proven terminal -> terminal-retained.

Only `active-current` belongs to ordinary replay/mutation-capable scheduler.

Exact numeric envelopes remain store-specific and preserve P0-039 accepted local-download constraints.

Runtime: **RED**.

Primary evidence:

- `RESEARCH_P0_072_PENDING_INDETERMINATE_CAPACITY_2026-09-06_EVIDENCE.md`.

## K. Tooling / production patch status

Fresh 2026-09-06 environment check:

- direct container `git clone` still fails DNS resolution for `github.com`;
- the available raw download path did not provide a usable exact local checkout;
- GitHub contents/Git-data connector can safely create/update small files but exposes no patch/hunk primitive for the ~570-KB worker.

Therefore:

- adding a new small standalone helper file is safe through the connector;
- replacing full `service-worker.js` without an exact local checkout/patch path remains unnecessarily risky;
- research did not modify production runtime.

This is an execution-environment limitation, not a product architecture blocker.

## L. Current implementation boundary

### Commit A — safe when implementation is explicitly undertaken

- add standalone pure helper module;
- direct `vm` tests against the actual module;
- no worker import/use yet;
- no manifest/DB/runtime behavior change.

### Commit B

Requires a reliable exact-head worker edit path before changing:

- import wiring;
- destructive reset transaction;
- pending/legacy materialization/fencing;
- structured append authority;
- writer/delete cleanup paths.

### Commit C

Local/remote one-shot stage admission and factual-only detached settlement.

### Later

ReadLater namespaced external-effect receipt integration.

## M. Status

P0-072 remains **ACTIVE**.

The 2026-09-04 acceptance matrix remains useful for the main tranche inventory, but the rows above are the current corrections where they differ.

Manifest remains `0.9.8`. Release remains `NOT READY`. No build/tag/GitHub Release or Actions run is claimed by this addendum.
