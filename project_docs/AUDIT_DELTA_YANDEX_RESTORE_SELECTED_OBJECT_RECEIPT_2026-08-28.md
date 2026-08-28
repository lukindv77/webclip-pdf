# Audit delta — Yandex restore selected-backup object receipt — 2026-08-28

## Scope

Docs-only audit of explicit Journal-backup selection from Yandex Disk through fetch/preview/replace. No new P-number.

Refines **P0-013** explicit selected-backup authority and composes with **P1-184** exact remote object/content proof plus P0-074 namespace generation.

## Finding

The picker visibly asks the user to select a **specific backup file**, but the authority carried from list to fetch is only the textual path.

Current list flow returns backup rows containing fields such as:

- `name`;
- `path`;
- `size`;
- `modified`;
- month metadata.

The UI stores only:

`selectedYandexBackupPath`.

Proceed later calls:

`WEBCLIP_JOURNAL_YANDEX_FETCH_BACKUP { path, operationId }`.

The worker fresh-validates that this path is inside the current Journal backup root, obtains a new signed download URL for the path, downloads the current object and validates its JSON structure. It does **not** require a receipt proving that the current remote object is the same object instance/content the user selected in the picker.

### Deterministic path-replacement schedule

1. Picker lists remote object A at path P, showing A's name/time/size to the user.
2. User explicitly selects A; page stores only P.
3. Before Proceed/fetch, another client deletes/replaces P with different valid backup B.
4. Page sends only P.
5. Worker asks Yandex for a fresh download URL for current P and receives B.
6. B is structurally valid `webclip-journal` backup, so streaming preview succeeds.
7. User's later 9-digit confirmation authorizes replacement based on a flow that began with visually selected A, but the staged source is B.

Fresh parse/normalization at Proceed is a strong corruption defense, but it proves **current staged bytes are valid**, not that they are the remote object the user selected.

## Why path + display metadata are insufficient

Even if the UI forwarded `size/modified`, those are useful comparison metadata but not stable object/content identity under replacement or same-size recreation.

The list/fetch receipt should use the strongest Yandex object identity exposed and validated by real API/E2E semantics, plus a local content receipt once bytes are downloaded.

If `resource_id` is suitable/stable for this resource class, the list API should request/store it and fetch must compare current metadata before obtaining/consuming the signed body. If API semantics do not provide a trustworthy immutable object id, use another explicitly validated identity/content strategy; do not silently fall back to path-only authority.

## Required authority chain

The explicit restore source should have one receipt chain:

1. **selection receipt** — account/root/config generation + exact listed object identity + path as locator/display metadata;
2. **fetch precondition** — current remote metadata still matches the selected object receipt before body admission;
3. **download content receipt** — exact staged byte length/digest/generation after signed download;
4. **preview receipt** — validated schema/version/entry count tied to that exact staged content generation;
5. **destructive confirmation** — consumes that exact preview/staging receipt, not only a reusable path;
6. **replace commit** — still revalidates staged bytes/current Journal target generation before mutation.

A mismatch between listed object A and current P/B must invalidate selection and require the user to re-list/re-select, not silently upgrade B to the selected source.

## Namespace composition

Selection identity must also include current Yandex account/root generation. The same textual backup path in another account/root is not the object the user selected earlier.

Reauthentication/root change while picker is open therefore invalidates the old selection receipt even if P exists and contains a valid Journal backup.

## Acceptance cases

1. List A -> select A -> current object remains exact A -> fetch/preview succeeds.
2. List A -> path P replaced by B before Proceed -> stale selection fails and requires re-list/re-select; B is not downloaded as A.
3. A and B have same size/name/modified-like metadata -> strong object/content receipt still rejects substitution.
4. Account changes A-account→B-account while picker open -> old selected receipt cannot fetch same textual P in B.
5. Root/config changes while picker open -> selection becomes stale.
6. Signed download completes -> staged content digest/generation is bound to the selected remote receipt and later preview/confirmation.
7. Staged payload is deleted/expired after preview -> existing staging-lifetime rules require re-stage; worker does not re-fetch P automatically under the old destructive confirmation.
8. Fresh normalization at Replace remains mandatory and is not replaced by trusting list metadata.

## Classification

- **P0-013** remains the primary product authority: restore must use the exact backup explicitly selected by the user, not merely whatever later occupies the same path.
- **P1-184** supplies exact remote object/content proof mechanics.
- **P0-074** supplies account/root/config generation fencing.

No new P1-211 is allocated.

## Validation note

Documentation only. Runtime/tests/manifest unchanged. Product tests were not rerun; historical 88/88 JS syntax + 74/74 deterministic PASS remains prior evidence. No build/tag/release.