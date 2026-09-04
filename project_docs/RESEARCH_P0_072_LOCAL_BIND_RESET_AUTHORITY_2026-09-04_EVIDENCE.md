# P0-072 — local intent→DownloadItem bind reset authority — 2026-09-04

Date: 2026-09-04  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch entering this block: `research/p0-072-recovery-quarantine-2026-09-04 @ b637a62a2403e2ffca6372c0c25ccc3526706438`  
Deterministic model commit: `1be8b77bd7b1459ac0dfa341034a0885ab66d3f1`  
Owner: **P0-072 ACTIVE**.

This checkpoint covers `bindPendingLocalDownloadIntent(intentKey, downloadId)` only. Runtime/manifest are unchanged.

## 1. Current source behavior

The current bind transaction reads the string intent key and the numeric target key from `pendingDownloads`.

If the numeric row already exists and belongs to the same operation, current code immediately deletes the intent and returns the existing numeric row.

If the numeric row does not exist, current code creates:

```text
{ ...intent, downloadId, kind:'download', updatedAt }
```

then deletes the string intent and puts the numeric row in the same transaction.

The spread branch structurally preserves unknown fields, but the same-operation existing-row shortcut can delete the only row carrying a future `journalResetDisposition` / stage barrier.

## 2. Binding is factual reconciliation, not a new external mutation

P0-072 must not forbid all binding after reset.

For an already admitted or legacy admission-unknown local start, an exact later Chrome DownloadItem id is useful factual evidence. The string intent may therefore migrate to numeric identity after reset if the row is still reconciling.

This does not authorize a second `chrome.downloads.download()` call and does not restore Journal append authority.

P1-146/P0-048 continue to own exact DownloadItem/start-settlement identity.

## 3. Stage gate

For the v1 explicit stage protocol:

- `downloadStart = admitted` -> numeric bind may proceed factually;
- missing v1 stage on a legacy row -> remains late-bindable under compatibility rules;
- `downloadStart = prepared` -> numeric bind is inconsistent with the new protocol and must fail closed;
- `downloadStart = cancelled-before-start` -> cannot acquire a numeric DownloadItem identity as if this operation started;
- `downloadStart = not-applicable` -> cannot bind.

A cancelled-before-start receipt is terminal proof only because reset serialized before stage admission. Binding a new numeric identity to it would contradict that proof.

## 4. Same-operation existing numeric row requires reset-authority merge

Current shortcut:

```text
sameOperation -> delete intent -> return existing numeric
```

is insufficient after P0-072.

Before deleting the intent, the transaction must compare/merge reset/stage authority.

Minimum rules:

### source detached, target active

If both rows belong to the same operation and the source intent carries a reset barrier while the numeric target does not, propagate the immutable reset disposition to the numeric row before deleting the source.

If source stage is explicitly `admitted`, preserve that stage fact as well.

This is barrier preservation, not new mutation authority.

### target detached, source active

The detached target wins. The source intent may not remain as an active duplicate capable of later replay/start behavior.

### both detached, same reset id

They may converge to one numeric factual representation while preserving the exact first reset identity.

### both detached, different reset ids

Do not collapse them automatically. Preserve both and return a stable reset-conflict/manual outcome. A later owner may diagnose historical duplicate state, but last-write-wins is not allowed.

## 5. Key migration remains atomic

When binding is allowed, deleting `intent:<...>` and putting numeric `downloadId` must remain one `pendingDownloads` readwrite transaction.

A worker crash must not leave a committed delete without the numeric receipt or vice versa.

The numeric row inherits:

- complete durable data payload;
- operation id;
- reset disposition when present;
- explicit stage metadata when present;
- unknown/manual fields if this is a late P0-039 bind.

## 6. Reset transaction serialization

`bindPendingLocalDownloadIntent()` and Journal reset both use readwrite transactions over `pendingDownloads`, so their physical writes serialize at IndexedDB.

Therefore the main missing protection is not an impossible reset occurring halfway through one active bind transaction. The problem is the bind transaction starting **after** reset and interpreting a detached current intent with old pre-P0-072 semantics.

Every decision must be based on the current transaction-owned intent/numeric rows, never an earlier in-memory copy.

## 7. Deterministic model

Added:

`project_tools/test_p0_072_local_bind_reset_authority_model.js`

Local equivalent result before durable write:

```text
P0-072 local bind reset-authority model: PASS
```

Covered controls:

1. detached admitted intent may bind to a numeric id while preserving reset/stage authority;
2. cancelled-before-start intent cannot bind;
3. same-operation existing numeric target inherits the source reset barrier before source deletion;
4. conflicting reset ids are not collapsed;
5. legacy missing-stage intent remains late-bindable.

This is architecture/model evidence, not runtime PASS.

## 8. Runtime/source acceptance addition

Before P0-072 closure:

- `bindPendingLocalDownloadIntent()` re-reads current intent and numeric target in the owning transaction;
- explicit `prepared/cancelled-before-start/not-applicable` stages cannot bind;
- `admitted` and legacy missing-stage rows may bind only as factual reconciliation;
- same-operation existing numeric shortcut cannot delete a detached intent before preserving/validating its reset/stage authority;
- conflicting reset identities fail closed/manual;
- successful key migration remains atomic and never restores Journal authority;
- detached bind does not authorize another Chrome start.

## 9. Owner boundaries

This does not close P1-146 actual-settlement restart reconciliation, P0-048 exact DownloadItem ownership, P0-076 Journal generation CAS, or P1-064 fairness.

No new P-code is allocated.

## 10. Status

P0-072 remains **ACTIVE**. Runtime and manifest remain unchanged. Manifest remains `0.9.8`; release remains `NOT READY`; no Actions/build/tag/Release is claimed.
