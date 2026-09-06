# P0-022 — Yandex remote-binding provenance before destructive authority — 2026-09-06

Canonical owner/status authority remains `project_docs/RESEARCH_REGISTRY.md`.

Fresh baseline:

- `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`;
- `service-worker.js` Git blob = `6d61ac81befdbf2804ae9dbec425aa08d1194eb1`;
- runtime/manifest remains `0.9.8`;
- this branch changes research docs/tools only.

Registry owner:

> P0-022 ACTIVE — Imported/legacy Yandex locator metadata is not destructive object provenance; remote destructive authority requires proven exact object identity.

P0-022 remains **ACTIVE**. This document does not claim implementation or release closure.

## Executive result

Current source has meaningful identity/account/root checks, but it still conflates **remote locator metadata** with **trusted local binding provenance**.

The exact current root is:

1. import normalization copies Yandex locator/identity-looking fields into ordinary Journal row fields;
2. no provenance/trust receipt distinguishes live-verified local binding from imported or legacy-unverified metadata;
3. destructive locator logic consumes those fields directly;
4. when `resourceId/publicUrl` are absent, a file at the stored path can currently be accepted as a match;
5. imported move-checkpoint-like fields are also restored into active fields.

The repair is not "delete all imported Yandex metadata". The fields remain useful as **non-authoritative hints** for display and safe non-destructive re-binding. The missing property is a versioned local trust/provenance receipt that portable/imported strings cannot self-assert.

## Current positive controls to preserve

### Current root mismatch can fail before destructive locate

`findYandexFileForJournalEntry()` reads stored `rootPath` and compares it with current Yandex root when both are present.

### Stored account UID can fail closed

When `entry.accountUid` is non-empty, the locator calls `getCurrentYandexAccountUid()` and rejects mismatching current account.

### Known resource identity is preferred to path

`matchesKnownIdentity()` rejects a conflicting returned `resource_id` when a stored resourceId exists. When API result omits resource_id, exact publicUrl can be used as a secondary known identity according to the current code.

### Global fallback is not used blindly when no stable identity exists after path loss

If the stored path is missing/404 and neither stored resourceId nor publicUrl exists, current code refuses the global search and leaves the Journal record unchanged.

These controls should remain. P0-022 is narrower: none of these fields prove that an **imported/legacy row was locally bound to that remote object**.

## Fresh source findings

## 1. Import copies remote identity-looking fields without provenance

`normalizeImportedJournalEntry()` currently accepts and stores:

- `remotePath`;
- `folder`;
- `publicUrl`;
- `resourceId`;
- `accountUid`;
- `rootPath`.

No `bindingProvenance`, `remoteBindingReceipt`, `verifiedLocally` or equivalent field exists in current source.

Therefore after import the worker cannot distinguish:

- a row created by a live WebClip upload and verified against Yandex in this profile;
- a user-edited/imported row that merely claims matching account/root/resource strings;
- an old schema row whose fields predate current binding requirements.

P0-077 makes WebClip's backup envelope structurally self-restorable. It does **not** cryptographically authenticate arbitrary imported remote identity fields as current destructive capability.

## 2. Imported fields are consumed directly by destructive locator

`findYandexFileForJournalEntry(entry, operationId)` derives:

- `expectedResourceId` from `entry.resourceId`;
- `expectedPublicUrl` from `entry.publicUrl`;
- `expectedAccountUid` from `entry.accountUid`;
- `expectedRootPath` from `entry.rootPath`;
- `storedPath` from `entry.remotePath`.

There is no provenance check before these values become identity/admission inputs.

An imported populated `accountUid` therefore behaves exactly like a locally proven account binding; an imported populated resourceId/publicUrl behaves exactly like a locally proven remote identity hint.

Historical family evidence explicitly rejects that interpretation: imported fields remain `imported-unverified` even when populated.

## 3. Path-only acceptance remains possible

Current `matchesKnownIdentity()` ends conceptually as:

- if expected resourceId -> require matching returned identity/publicUrl conditions;
- else if expected publicUrl -> require matching publicUrl;
- else -> `true`.

Therefore when neither resourceId nor publicUrl exists, a GET of the stored path that returns a file can be accepted as the current object.

For ordinary non-destructive navigation that may be a useful locator heuristic. For Trash/ReadLater move it is not exact object provenance: another file can occupy the same path after replacement.

P1-090 owns exact remote-object proof semantics. P0-022 requires destructive admission not to downgrade to path coincidence.

## 4. Import restores live-looking move checkpoint fields

Current import normalizer also copies:

- `readMovePendingAt`;
- `readMoveSourcePath`;
- `readMoveTargetPath`;
- `readMoveOperationId`;
- `readMoveLastError`.

`moveReadLaterEntryToRead()` treats `readMovePendingAt/readMoveTargetPath` as evidence of an unfinished previous move and enters resume/reconciliation behavior.

A portable/imported row is not proof that this browser/profile has an unresolved live remote side effect. Import therefore must not reactivate checkpoint authority merely because the JSON contains checkpoint-shaped fields.

P1-183 owns durable move settlement/recovery once a genuine move checkpoint exists. P0-022 owns whether imported data is allowed to claim that provenance.

## 5. Legacy rows are ambiguous by definition

A historical local row may contain some combination of path/resource/public/account/root fields but no modern provenance receipt.

Absence of a provenance marker cannot be interpreted as "trusted because this database is local" after schemas/imports have existed for many versions.

Legacy without independently verifiable local binding evidence is `legacy-unverified` for destructive admission.

This does not require deleting the row or its locator hints.

## Required data model

Introduce a versioned non-secret local remote-binding trust concept, naming flexible, conceptually:

```text
YandexRemoteBindingReceipt {
  version: 1,
  provenance: live-verified | rebound-verified,
  account/root scope reference or values,
  exact-object identity receipt owned by P1-090,
  boundAt,
  optional operation receipt reference
}
```

The essential property is not the field name. It is that destructive authority depends on a receipt **created by trusted local verification**, not on the presence of portable strings.

Untrusted row states are conceptually:

```text
imported-unverified
legacy-unverified
```

These states may retain locator hints but cannot start a destructive remote mutation.

## Import rule

On every Journal import, including a future export that contains a serialized local binding receipt:

- raw imported trust/provenance is not accepted as trusted authority;
- resulting row is `imported-unverified` for remote destructive purposes;
- accountUid/rootPath/resourceId/publicUrl/remotePath may be retained only as bounded hints according to P0-066 and schema policy;
- active move checkpoint/recovery ownership is cleared or moved into an inert untrusted-hints namespace;
- import cannot set `live-verified` or `rebound-verified` merely by supplying those strings.

If the project later introduces cryptographically verifiable portable receipts, that would require a new explicit verification design. Current self-export JSON is not such a signature system.

## Legacy rule

Rows with no recognized versioned trusted local binding receipt are `legacy-unverified` for destructive mutation.

Do not upgrade them simply because:

- remotePath still exists;
- filename/path is inside current WebClip folders;
- accountUid string equals current UID;
- resourceId string equals a newly observed result;
- publicUrl still opens;
- current root matches stored root.

These facts can support safe re-binding, but they are not historical provenance by themselves.

## Safe non-destructive re-binding

P0-022 needs a route from imported/legacy usability to trusted local binding without sacrificing safety.

Allowed shape:

1. user initiates or explicitly consents to verifying/reconnecting the saved Yandex file;
2. acquire one immutable live Yandex context under P0-074;
3. prove expected account/root context under P0-073 rules;
4. use imported/legacy fields only as search hints;
5. perform non-destructive metadata lookup;
6. satisfy the exact remote-object identity proof required by P1-090;
7. persist a **new local** `rebound-verified` receipt under current Journal entry generation/P0-076 CAS;
8. only a later/current destructive admission may consume that trusted receipt.

If exact identity cannot be proven, leave the row unchanged/unverified and require manual recovery. Do not silently bind to whichever current-account candidate happens to look plausible.

## Destructive admission rule

Before any remote destructive or identity-sensitive mutation such as:

- Delete -> Trash move;
- ReadLater -> Upload move;
- unpublish/revoke where object identity matters;
- adoption/reconciliation that can later cause mutation;

require all of:

1. current Journal entry generation/confirmation authority under P0-076 where applicable;
2. trusted local binding provenance (`live-verified` or `rebound-verified`); 
3. valid P0-073 account/root scope;
4. one P0-074 immutable live operation context;
5. exact current remote-object proof under P1-090;
6. operation-specific checkpoint/settlement authority such as P1-183/P1-164.

Failure of any prerequisite occurs **before** irreversible Yandex API mutation.

## Path-only locator boundary

`remotePath`, filename, known WebClip folder, site folder and pending target/source paths are locator hints.

They may optimize a safe lookup, but for a destructive mode:

- exact path hit does not by itself authorize;
- file type/size/name/path agreement does not by itself authorize;
- a replacement object at the same path must not inherit authority.

If `findYandexFileForJournalEntry` continues to serve both read-only and destructive callers, it needs an explicit mode/receipt contract so a permissive read-only locator fallback cannot silently be reused by destructive code.

A cleaner alternative is separate APIs:

- `locateYandexBindingHint(...)` — non-destructive, may return candidates;
- `proveYandexObjectForDestructiveMutation(...)` — exact proof only.

Exact names are implementation detail.

## Genuine live-save receipt creation

A new live Yandex save may become `live-verified` only after the runtime has the necessary trusted facts from the actual operation:

- worker-owned operation identity/generation;
- P0-073 account/root scope;
- P0-074 immutable live context;
- actual remote verification and P1-090 exact-object receipt.

Do not mark a row trusted merely when upload is requested or a path is chosen.

P0-073/P0-074 research branches already require stronger remote-save account/context behavior; P0-022 should consume those receipts rather than inventing parallel account/auth generation fields.

## Move post-state

After a genuine destructive move settles and the exact same object is proven at the target:

- preserve the trusted object-binding lineage;
- update path/location as post-state metadata;
- do not mint a new trusted object identity from target path alone;
- unknown move settlement remains unresolved under P1-090/P1-183.

An imported `readMoveTargetPath` can never stand in for that genuine settlement receipt.

## Publication boundary

Imported `publicUrl` may remain useful as a user-visible/openable capability after P0-066 provider-class sanitization.

But:

- it is not proof that the current Journal row owns the corresponding remote object;
- it does not bypass account/root binding;
- it does not authorize Trash/unpublish;
- P0-069/P1-164 still govern publication outcome/revocation.

Display/navigation capability and destructive object authority are distinct roles.

## Owner boundaries

- **P0-022** — imported/legacy provenance class and destructive admission gate.
- **P0-073** — account/root scope continuity and remote-save recovery binding.
- **P0-074** — one immutable live Yandex operation context.
- **P0-076** — exact local Journal entry/revision CAS.
- **P0-069 / P1-164** — public-link deletion/revoke lifecycle.
- **P1-090** — what constitutes exact remote-object proof/reconciliation.
- **P1-183** — genuine move checkpoint/unknown settlement recovery.
- **P0-066** — safe durable/display representation of locator/public URLs.
- **P0-077** — import/export envelope integrity, not authenticity of remote destructive capability.

## Deterministic model

Branch tool:

`project_tools/test_p0_022_yandex_binding_provenance_model.js`

It proves:

1. import forcibly downgrades even a forged `live-verified` payload to `imported-unverified`;
2. imported live-looking move checkpoint fields do not survive as active recovery ownership;
3. legacy row without trusted receipt fails closed despite path coincidence;
4. trusted live receipt still requires account continuity and exact current object proof;
5. resource mismatch blocks;
6. imported/legacy row can become `rebound-verified` only through non-destructive exact proof;
7. publicUrl/path alone never upgrades provenance.

Local creation result:

`P0-022 Yandex binding provenance model: PASS`

The model uses `exactObject=true` as an abstract P1-090 proof bit. It does not claim that one specific Yandex field is universally sufficient proof.

## Source-bound acceptance gate

Current-source gate must remain RED until at least:

- Journal rows have explicit versioned remote binding provenance/receipt semantics;
- import always yields unverified remote destructive provenance regardless raw trust-looking fields;
- imported move checkpoint fields cannot become active move recovery authority;
- legacy/no-receipt rows fail destructive admission;
- Trash and ReadLater move paths check trusted binding before irreversible remote mutation;
- destructive locate cannot accept path-only `return true` as exact identity;
- existing account/root/resource conflict positive guards remain;
- live save/rebind can create trusted local receipt only after current trusted proof.

## Required deterministic/real service matrix after implementation

1. imported row for current account with exact same textual path but replacement object -> no destructive mutation;
2. imported row contains forged current accountUid/root/resourceId -> remains unverified;
3. imported row contains forged `live-verified`/receipt JSON -> downgraded;
4. imported row contains `readMovePendingAt/targetPath` -> no move resume;
5. legacy path-only row where a file exists -> no Trash/move until rebind;
6. legacy resource/public hint but missing trusted receipt -> no destructive mutation;
7. successful non-destructive rebind -> new local trusted receipt;
8. reauth A->B after rebind -> block before B mutation;
9. same path object replacement after rebind -> exact identity mismatch blocks;
10. genuine live-verified new save -> normal destructive path still works;
11. genuine unknown move settlement -> P1-090/P1-183 recovery remains authoritative;
12. export then re-import a trusted row -> imported copy is unverified again.

Real Yandex evidence is required before any closure claim that depends on actual provider `resource_id/public_url/move` semantics.

## Status

**P0-022 remains ACTIVE.**

The architecture is saturated for the current baseline, but runtime has no provenance distinction and still allows locator fields imported/restored into ordinary destructive flows. Implementation plus committed-source and provider-realistic verification are required before status transition.
