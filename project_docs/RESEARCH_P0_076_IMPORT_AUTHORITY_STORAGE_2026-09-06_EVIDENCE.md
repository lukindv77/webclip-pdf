# P0-076 — imported per-entry authority storage amplification — 2026-09-06

Date: 2026-09-06  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch entering this block: `research/p0-076-journal-generation-cas-2026-09-06 @ 63f9b8d9abce0450f104fd061f2f172a2ef5562d`  
Owner: **P0-076 ACTIVE**. Adjacent global storage owner: **P1-043 ACTIVE**.

This checkpoint covers only the deterministic storage amplification introduced by the selected P0-076 `journalLocalRevision` representation. It does not claim a physical IndexedDB quota reservation or runtime implementation.

## 1. Current source facts

Current worker limits Journal import input to:

```text
MAX_JOURNAL_IMPORT_BYTES = 50 MiB
maxEntries = 100000
```

Before normalized import staging, current runtime estimates source bytes and calls:

```text
ensureStorageBudget(stagedBytes + 16 MiB)
```

capped well above the current 50 MiB input ceiling.

`ensureStorageBudget()` obtains `navigator.storage.estimate()`, requires a fixed 32 MiB safety reserve, optionally cleans disposable transfer/cache/log data and fails closed if the estimate is too low or unavailable.

Current import is two-phase:

1. normalized entries are stored in `WebClipJournal.importStaging`;
2. one authoritative readwrite transaction clears old `entries`, copies normalized staging rows into `entries`, deletes the used staging rows and advances Journal metadata.

The transaction reports success only after completion; abort/error is propagated as failure.

## 2. P0-076 local authority representation

Selected modern row authority remains:

```text
journalLocalRevision = {
  version: 1,
  generation: '<UUID-v4>',
  revision: <positive safe integer>
}
```

For deterministic envelope calculation the worst bounded v1 values are:

- UUID-v4 textual generation: 36 ASCII bytes;
- `revision`: `Number.MAX_SAFE_INTEGER`, 16 decimal ASCII bytes;
- all property names/punctuation: ASCII.

The exact compact UTF-8 JSON *increment* when this property is added to an already non-empty Journal entry is **117 bytes**.

The earlier rough 118-byte figure was the size of a standalone outer object containing only this field. It is not the correct incremental row delta and is superseded by this checkpoint.

## 3. Maximum deterministic P0-076 surcharge

At the existing maximum of 100000 imported entries:

```text
100000 * 117 = 11,700,000 bytes
                 ~= 11.16 MiB
```

Boundary values:

```text
99999  -> 11,699,883 bytes
100000 -> 11,700,000 bytes
100001 -> 11,700,117 bytes, but entry-count admission must reject first
```

This is a **logical serialized authority surcharge**, not a claim about physical IndexedDB allocation.

## 4. Current preflight gap

At the 50 MiB input ceiling, current normalization preflight accounts for:

```text
50 MiB staged input + 16 MiB normalization headroom
= 69,206,016 bytes
```

A P0-076-aware minimum logical estimate for 100000 entries becomes:

```text
69,206,016 + 11,700,000
= 80,906,016 bytes
~= 77.16 MiB
```

Therefore adding per-entry authority without adjusting import admission would make the current preflight systematically omit up to 11.7 MB of known logical data.

## 5. What this number does and does not prove

The 117-byte value is exact for compact UTF-8 JSON representation of the selected bounded field and therefore suitable for deterministic P0-076 accounting/tests.

It is **not** a physical IndexedDB upper bound. Physical usage may differ because IndexedDB uses structured clone plus browser-specific record/index/page/transaction storage, and storage estimates are intentionally approximate.

The replace transaction can also require physical space for rollback/old Journal state, import staging and newly written rows concurrently at the storage-engine level. P0-076 must not invent a multiplier and claim that this peak is reserved.

That global shared-origin reservation/peak-space problem remains **P1-043**.

## 6. Admission contract

P0-076 requires the import preflight input to include at least the deterministic local-authority term derived from actual validated entry count:

```text
authorityLogicalSurcharge = entryCount * 117
```

The final P1-043-aware formula may add stronger measured/reserved terms, but it must not be less informed than the known P0-076 surcharge.

Boundary behavior:

- `entryCount = 99999`: surcharge accepted if all other import bounds pass;
- `entryCount = 100000`: surcharge accepted if all other import bounds pass;
- `entryCount = 100001`: reject by entry-count limit before storage arithmetic can authorize the import;
- storage estimate unavailable: fail closed under current large-write policy;
- estimated free bytes below required admission envelope: fail before normalized staging/replace admission;
- estimate passes but IndexedDB transaction later aborts for quota/I/O: import is **not committed**;
- only transaction completion may produce committed success.

## 7. Where authority should be created

P0-076 does not require authority to be portable or supplied by the backup.

For imported entries it may be generated during trusted normalized staging or during authoritative final copy, provided all of these remain true:

- backup input cannot choose/install the local generation;
- every successfully imported row receives a fresh worker-issued local incarnation and revision 1;
- failed/cancelled staging does not become live Journal authority;
- same backup imported again as a distinct destructive operation receives new local incarnations;
- the deterministic surcharge is included before the path that actually stores those fields.

Generating the field during normalized staging is operationally attractive because the known storage cost is paid before destructive replace and avoids 100000 authority generations being introduced only inside the final replacement transaction. This remains an implementation choice, not a correctness dependency.

## 8. Quota/transaction truth

Current runtime already treats `navigator.storage.estimate()` as a preflight and propagates an unavailable/low-storage failure.

Platform contract checked 2026-09-06:

- `StorageManager.estimate()` returns approximate usage/quota, not an exact reservation;
- IndexedDB quota exhaustion can raise `QuotaExceededError`;
- an unhandled IndexedDB request error aborts/rolls back the transaction;
- Chrome extensions are subject to normal storage quota by default;
- `unlimitedStorage` can exempt IndexedDB from normal quota, but current WebClip manifest does not request it.

Therefore P0-076 must never convert a successful estimate into a commit guarantee.

## 9. Deterministic model

Added:

`project_tools/test_p0_076_import_authority_storage_model.js`

Local scratch execution before durable write:

```text
P0-076 import authority storage model: PASS
```

The model proves:

1. exact 117-byte logical per-entry delta;
2. N-1/N/N+1 entry-count arithmetic;
3. 11,700,000-byte maximum current surcharge;
4. current-vs-P0-076-aware maximum logical preflight arithmetic;
5. estimate-pass plus quota/I/O abort is still failure/no-commit;
6. only completed transaction is success.

## 10. Owner boundary

**P0-076 owns:**

- bounded shape of `journalLocalRevision`;
- deterministic logical bytes introduced by that shape;
- making import admission account for that known addition;
- ensuring authority is local/nonportable and fresh on import;
- no success claim after transaction abort.

**P1-043 owns:**

- shared-origin concurrent byte reservations;
- physical IndexedDB amplification/peak-space measurement;
- transfer/JOURNAL/PDF/log writers competing after a snapshot estimate;
- global quota envelope and reservation release protocol.

P0-076 does not close P1-043.

## 11. Status

Research for this storage-amplification subcase is **COVERED**. Runtime remains **RED / NOT IMPLEMENTED**.

P0-076 remains **ACTIVE** pending actual runtime CAS, authority propagation, clear target revision, external-effect lock integration and committed-source GREEN evidence.

Manifest/runtime remain `0.9.8`. No build, tag, GitHub Release or Actions run is claimed.
