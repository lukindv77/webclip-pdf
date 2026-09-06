# P0-072 — acceptance matrix addendum — 2026-09-06

Date: 2026-09-06  
Canonical source baseline at start of this continuation: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Owner: **P0-072 ACTIVE**.

This addendum updates `RESEARCH_P0_072_ACCEPTANCE_MATRIX_2026-09-04_EVIDENCE.md` with research corrections discovered while making Commit A implementation-ready and while revalidating the later external-effect receipt tranche. It does not claim runtime implementation.

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

The barrier test is **own-property presence**, not truthiness and not “non-null only”. Any present `journalResetDisposition` field denies ordinary replay/admission/delete authority.

Only exact `active` may regain ordinary replay/admission/delete authority.

A later clear/import does **not** need to abort merely because an already-present barrier body is unsupported/corrupt. It preserves that field exactly, does not overwrite first-reset history, keeps the row unresolved/manual, and may continue the requested Journal reset because the row is already mutation-barred.

Runtime: **RED**.

Primary evidence:

- `RESEARCH_P0_072_RESET_DISPOSITION_CORRUPTION_ROLLBACK_2026-09-06_EVIDENCE.md`;
- `RESEARCH_P0_072_EXISTING_BARRIER_RESET_PROGRESS_2026-09-06_EVIDENCE.md`.

## B. External stage parsing / rollback

Missing `externalStages` remains legacy admission-unknown for rollout compatibility.

Present malformed/unsupported stage state is **not** legacy. It becomes:

```text
stage-indeterminate
```

Only current-version exact `prepared` may participate in fresh one-shot admission.

Reset may still detach a stage-indeterminate row as unknown/manual; stage corruption must not become a reason to leave it active.

Runtime: **RED**.

Primary evidence:

- `RESEARCH_P0_072_EXTERNAL_STAGE_CORRUPTION_ROLLBACK_2026-09-06_EVIDENCE.md`.

## C. Pure helper Commit A

Commit A is specified as one standalone deterministic helper module, conceptually:

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

Strict v1 validation additions:

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

## G. External receipt stable discovery root + forward-compatible envelope

The stable discovery key remains:

```text
externalEffect:<effectId>
```

but the earlier flat receipt body is refined into:

```text
{
  envelopeVersion: 1,
  ...stable discovery/reset fields...,
  payloadVersion: 1,
  payload: { ...effect-specific fields... }
}
```

A valid envelope-v1 receipt with unknown/future `payloadVersion` is visible and non-replayable, but **full clear/import may detach it** by adding the envelope-level reset barrier while preserving the opaque payload.

Unknown/malformed `envelopeVersion` remains a hard reset boundary.

Envelope-v1 top-level shape is exact except optional `resetDisposition`; new authority-bearing top-level fields require an envelope-version bump.

Runtime: **LATER**.

Primary evidence:

- `RESEARCH_P0_072_EXTERNAL_RECEIPT_NAMESPACE_VERSION_2026-09-06_EVIDENCE.md`;
- `RESEARCH_P0_072_EXTERNAL_RECEIPT_FORWARD_ENVELOPE_2026-09-06_EVIDENCE.md`.

## H. External receipt reset barrier ordering

For every envelope-v1 payload implementation, mutation-capable logic must execute in this order:

```text
validate envelope
-> resetDisposition present? deny immediately
-> only then dispatch by payloadVersion
-> unsupported payload: unresolved/manual, no mutation
-> supported payload: evaluate its own fresh admission CAS
```

The presence barrier is stronger and earlier than any payload-specific phase.

A newer runtime that understands payload-v2 must therefore still honor a reset disposition written by an older worker before entering its payload-v2 handler.

Runtime: **LATER**.

Primary evidence:

- `RESEARCH_P0_072_EXTERNAL_RECEIPT_BARRIER_ORDER_2026-09-06_EVIDENCE.md`.

## I. External receipt scope-token version compatibility

Envelope validation treats URL/site scope tokens as bounded opaque strings plus `scopeTokenVersion`.

Strict 64-hex validation belongs only to the supported v1 token algorithm.

Therefore:

```text
full reset + valid envelope + future token format -> may detach
scoped reset + unsupported token version         -> fail closed
scoped reset + supported v1 malformed token      -> fail closed
```

A full reset must not depend on understanding a scope-token algorithm it does not use.

Runtime: **LATER**.

Primary evidence:

- `RESEARCH_P0_072_EXTERNAL_RECEIPT_FORWARD_ENVELOPE_2026-09-06_EVIDENCE.md`.

## J. Reserved receipt-root key validation

Every key under `externalEffect:` is reserved external-effect authority space.

V1 exact key shape is one UUID-v4 suffix. Malformed keys are corruption/indeterminate and are not silently ignored.

Prefix max+1 counts malformed reserved-root keys as scanned work.

Runtime: **LATER**.

Primary evidence:

- `RESEARCH_P0_072_EXTERNAL_RECEIPT_KEY_VALIDATION_2026-09-06_EVIDENCE.md`.

## K. Indeterminate external receipt capacity correction

For a **valid exact one-effect key**, an unsupported/malformed payload/body consumes one unresolved liability slot; it does not globally block unrelated new-effect admission by itself.

Invalid reserved-root key or prefix-scan overflow remains namespace-level fail-closed.

A valid envelope with unknown payload may be full-reset detached under section G. Unknown envelope remains reset-blocking.

Runtime: **LATER**.

Primary evidence:

- `RESEARCH_P0_072_EXTERNAL_RECEIPT_INDETERMINATE_CAPACITY_CORRECTION_2026-09-06_EVIDENCE.md`;
- `RESEARCH_P0_072_EXTERNAL_RECEIPT_FORWARD_ENVELOPE_2026-09-06_EVIDENCE.md`.

## L. P0-072 Journal meta namespace ownership

Reserve these `WebClipJournal.meta` domains:

```text
journalLocalTokenSalt:v1
a legacyPendingFence:v1:<token> namespace
externalEffect:<effectId>
```

(`legacyPendingFence:v1:` is the actual prefix; the leading article above is prose, not part of the key.)

Current worker Journal-meta writes use fixed non-overlapping keys (`revision`, `journalImportLease`, `webclipJournalBackupLease`), and current `journal.js` is a schema opener/reader with no Journal-meta `put()` writer.

Future unrelated/generic meta writers must reject P0-072 reserved keys instead of sharing the namespace.

Runtime: **RED/LATER** depending key family.

Primary evidence:

- `RESEARCH_P0_072_META_NAMESPACE_OWNERSHIP_2026-09-06_EVIDENCE.md`.

## M. Pending-store indeterminate capacity/scheduler

Store-neutral classes:

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

## N. Tooling / production patch status

Fresh 2026-09-06 environment checks still show:

- direct container `git clone`/raw exact-head checkout is unavailable because the container cannot resolve GitHub DNS;
- GitHub connector can safely create/update small files but exposes no hunk/patch primitive for the ~570-KB worker;
- replacing full `service-worker.js` without an exact local checkout remains unnecessarily risky.

Therefore:

- a new small standalone helper file remains safe through the connector;
- full worker Commit B should wait for a reliable exact-head edit path;
- research has not modified production runtime.

This is an execution-environment limitation, not a product architecture blocker.

## O. Current implementation boundary

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

ReadLater namespaced external-effect receipt integration using the stable envelope contract above.

## P. Status

P0-072 remains **ACTIVE**.

The 2026-09-04 acceptance matrix remains useful for the main tranche inventory, but this addendum is the current correction layer wherever wording differs.

Manifest remains `0.9.8`. Release remains `NOT READY`. No build/tag/GitHub Release or Actions run is claimed by this addendum.
