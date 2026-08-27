# Audit delta — Yandex legacy account identity — 2026-08-27

Baseline HEAD before this audit block: `4421c39f358766a3b456cdc312684a4e6a0dcf9d`.

Docs-only audit checkpoint. Production runtime and `manifest.json` are unchanged. Canonical large-table synchronization is not claimed.

## Scope

Fresh account-identity audit around existing `P0-073`, focused on destructive Journal operations for legacy/local entries that have remote identity fields (`resourceId` / `publicUrl`) but no stored `accountUid`.

## Result

`P0-073` needs an explicit **missing-account-identity** rule. Current code correctly fails closed when the current Yandex account UID cannot be obtained, but it only performs that current-account check when the Journal entry already contains a non-empty `accountUid`. A legacy/local entry without that field can therefore enter destructive locate/move logic under whatever OAuth account is currently active.

No new P-number is created. `P1-199` remains free.

## Exact runtime proof

### 1. Current-account UID acquisition itself is fail-closed

`getCurrentYandexAccountUid(operationId)`:

1. returns a cached auth `account.uid` when present;
2. otherwise performs `GET /v1/disk`;
3. extracts `info.user.uid`;
4. if UID is missing, throws `YANDEX_ACCOUNT_UID_UNAVAILABLE` with an explicit no-change error.

This is a valuable positive control. The defect is not "Yandex may omit UID and WebClip proceeds" for a newly checked account.

### 2. Journal locator skips account verification when the entry has no accountUid

`findYandexFileForJournalEntry(entry, operationId)` reads:

- `expectedResourceId`;
- `expectedPublicUrl`;
- `expectedAccountUid`;
- `expectedRootPath`;
- path/filename locator data.

It compares the current root whenever an expected root is present.

But current account UID is resolved and compared only inside:

`if (expectedAccountUid) { ... }`

If the entry has an empty/missing accountUid, destructive file discovery continues without proving which Yandex account originally owned the stored remote identity.

### 3. A known resourceId can then be accepted without account binding

`matchesKnownIdentity(item)` treats a returned Yandex file as a match when a stored `expectedResourceId` equals the API `resource_id` (with the existing publicUrl secondary checks).

That object-identity comparison is important and must remain, but it is not a documented substitute for account ownership.

The current Disk API documentation exposes account/user identity and resource identifiers, but this audit did not find an official guarantee that a private `resource_id` is a globally unique, cross-account authorization receipt that makes account binding unnecessary. Do not assume such semantics without an explicit supported contract/E2E proof.

Therefore a legacy entry with:

- `destination='yandex'`;
- non-empty `resourceId` and/or `publicUrl`;
- no `accountUid`;

can perform lookup in the **currently active** account. If a matching/accepted identity is found there, later Trash or ReadLater→Upload logic can mutate that current-account object even though the Journal record never proved it belonged to this account generation.

### 4. New live saves are materially safer

The current live Yandex save path calls `getCurrentYandexAccountUid()` before creating the remote checkpoint and stores `accountUid` in the durable remote-save identity.

Thus the missing-account case is primarily a migration/provenance problem for older local Journal records (and imported records, which are independently constrained by `P0-022`). It should not be solved by weakening current UID requirements.

## Relation to existing items

### P0-073 — primary owner

`P0-073` already owns immutable `accountUid + rootPath` fencing for remote save completion/recovery. Extend it so **absence** of accountUid on a destructive Journal reference is not interpreted as "no account restriction".

### P0-022 — imported provenance remains separate

Imported remote identity is untrusted even when it contains an accountUid/resourceId. Import must remain `imported-unverified` until safe re-bind/proof.

This checkpoint focuses on legacy/local records whose provenance may be local but whose historical schema predates account binding.

### P0-074 — operation generation remains required

Even after a legacy record is safely rebound to account A, long operations must still use immutable auth/config generation and cannot switch A→B between requests.

### P1-184 / P1-090 — object/content proof remains required

Account match proves namespace ownership, not exact remote content or move outcome. Strong object/content receipts and post-move exact identity remain separate gates.

## Required P0-073 refinement

For any destructive or identity-sensitive remote operation (`Trash`, ReadLater move, retry/adoption, publication lifecycle where applicable):

- a trusted local remote binding must include a proven account UID (and root generation/namespace);
- missing accountUid is an **unknown account binding**, not a wildcard;
- do not search/mutate the current account merely because an old record has a resourceId/publicUrl/path;
- imported records remain unverified per P0-022 regardless of populated fields.

### Legacy migration/re-bind options

For legacy local entries without accountUid, acceptable safe behavior includes:

1. **explicit safe re-bind** while the user is on the intended account: perform non-destructive metadata lookup, require stable object identity evidence, current managed-root containment and any available historical path/public identity consistency, then persist a new versioned local binding receipt with current accountUid/root/provenance; or
2. fail closed and require user/manual recovery when exact identity cannot be proven.

Do not silently populate accountUid solely from whichever account happens to be connected at the time of the first destructive click.

If the API/documented semantics cannot prove that an old resourceId/publicUrl refers to the current-account object intended by the old Journal entry, preserve the record and refuse remote mutation.

## Required deterministic / real-Yandex regressions

1. Current `/v1/disk` returns no UID: destructive operation fails closed as today.
2. Legacy local entry has resourceId but no accountUid; current account contains same/path-compatible candidate: no destructive mutation occurs until safe re-bind.
3. Legacy entry has publicUrl but no accountUid: public URL alone cannot waive account binding.
4. Safe re-bind under proven account A persists accountUid/root/provenance and subsequent operation succeeds only in A.
5. Reauth A→B after re-bind: operation fails before B mutation.
6. Imported entry with a forged/populated accountUid still follows P0-022 `imported-unverified` rules; populated field is not a signature.
7. Current new live save continues to fail closed if account UID cannot be established before checkpoint/remote operation.
8. Real Yandex E2E should characterize `resource_id` behavior across move/account contexts before any code treats it as stronger than documented.

## External documentation note

Current official Yandex Disk REST documentation confirms that the API operates on the authorized user's personal Disk and exposes user/account metadata. This audit did not find an official statement establishing private `resource_id` as a globally unique cross-account authorization identity. The safe implementation must therefore keep account UID as an independent required namespace fence rather than infer global uniqueness.

## Classification

- Extend existing `P0-073`; no new P0/P1 item.
- Preserve `P0-022`, `P0-074`, `P1-184`, `P1-090` as separate layers.
- `P1-199` remains free.

Previous product test gate was not re-run by this docs-only checkpoint.
