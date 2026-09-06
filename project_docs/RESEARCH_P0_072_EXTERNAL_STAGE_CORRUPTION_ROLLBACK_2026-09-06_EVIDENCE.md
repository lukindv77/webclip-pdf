# P0-072 — external stage corruption / rollback fail-closed semantics — 2026-09-06

Date: 2026-09-06  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch entering this block: `research/p0-072-recovery-quarantine-2026-09-04 @ 5f46471a4807955a937748b862ceae1a9bb6f4be`  
Deterministic model commit: `e675ad4dfd01c40c8b77cbd719e90c78a1ac16db`  
Owner: **P0-072 ACTIVE**.

This checkpoint applies the same absent-vs-invalid distinction to persisted external-stage admission state. Runtime/manifest remain unchanged.

## 1. Gap

Earlier rollout research intentionally treats rows with no `externalStages` field as legacy admission-unknown because current runtime historically has no durable prepared/admitted distinction.

That compatibility rule must not be extended to a row where `externalStages` is present but malformed or of a future unsupported version.

Otherwise corruption/downgrade could erase a stronger stage barrier and let the old worker reinterpret the row as legacy work.

## 2. Parser statuses

The stage parser should distinguish:

```text
absent
valid
invalid
unsupported-version
```

Only true field absence means legacy rollout compatibility.

Present `null`, invalid enum/layout, wrong kind shape or unsupported version are **stage-indeterminate**.

## 3. Admission classes

For stage-specific decisions:

```text
field absent                    -> legacy-admission-unknown
valid prepared                  -> prepared
valid admitted                  -> admitted
valid cancelled-before-start    -> cancelled-before-start
valid not-applicable            -> not-applicable
invalid/unsupported             -> stage-indeterminate
```

Only exact current-version `prepared` can participate in a fresh transaction-local `prepared -> admitted` transition.

Neither `legacy-admission-unknown` nor `stage-indeterminate` can authorize a new physical mutation.

## 4. Reset behavior

When reset wins:

- valid `prepared` -> `cancelled-before-start`;
- valid `admitted` -> reconciling factual uncertainty;
- legacy field-absent -> reconciling/admission-unknown according to the existing rollout contract;
- malformed/unsupported stage -> manual/indeterminate, not synthetic cancellation;
- `not-applicable` remains not applicable.

A malformed stage cannot be rewritten to prepared or treated as proof that the effect never started.

## 5. Downgrade safety

If a future version writes `externalStages.version = 2` and an older v1 worker later opens the same Journal DB, the older worker must not regain permission to start download/upload/publish by treating v2 as a legacy-missing field.

Unsupported version therefore fails closed and is preserved for later compatible recovery/migration.

## 6. Interaction with reset disposition corruption

The two discriminators are independent:

- reset disposition answers whether Journal/reset authority is active/detached/indeterminate;
- externalStages answers whether one specific external mutation may be admitted/reconciled.

A mutation is allowed only when **both** are current and permissive:

```text
checkpoint authority == active
AND current v1 requested stage == prepared
AND operation identity matches
AND fresh admission transaction commits
```

Any malformed/unsupported state blocks admission.

## 7. Local/remote implications

### Local download

A legacy field-absent intent may still be reconciled against an exact DownloadItem, but it cannot issue another `chrome.downloads.download()` merely because no explicit admitted bit exists.

A malformed/future stage is stricter: preserve/manual/reconcile, never start.

### Remote save

A legacy field-absent `phase=prepared` remains admission-unknown and must not simply replay signed upload/publish.

Malformed/future `externalStages` likewise routes away from mutation-capable recovery.

## 8. Deterministic model

Added:

`project_tools/test_p0_072_external_stage_corruption_model.js`

Local Node result before durable write:

```text
P0-072 external stage corruption/rollback model: PASS
```

Covered controls:

1. absent field -> legacy-admission-unknown;
2. absent legacy row cannot gain fresh mutation permission;
3. present null -> stage-indeterminate;
4. unsupported v2 -> stage-indeterminate;
5. future v2 prepared cannot authorize v1 start;
6. valid v1 prepared can be admitted by the later transaction helper;
7. reset maps valid prepared to cancelled-before-start, legacy absent to reconciling and invalid to manual-resolution.

This is architecture/model evidence, not runtime PASS.

## 9. Acceptance correction

The first-runtime helper contract must expose stage parse validity explicitly. A plain helper that returns `null` for both absent and invalid is rejected.

No new P-code is allocated.

## 10. Status

P0-072 remains **ACTIVE**. Runtime/manifest remain unchanged; manifest remains `0.9.8`; release remains `NOT READY`. No Actions/build/tag/GitHub Release is claimed by this checkpoint.
