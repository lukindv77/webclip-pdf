# Audit delta — selected Yandex backup object through staging receipt — 2026-08-28

Source-of-truth `main` immediately before this write: `be45c49ad28c761c70d2aba020c36cd5fdd092ea`.

Docs-only audit checkpoint. Runtime/config/manifest/tests are unchanged.

## Classification

No new P-number is assigned.

Fresh current-source proof extends **P0-013** from picker-row identity through signed download and local staging. It composes with **P0-074** Yandex account/root/auth generation, **P1-139** picker request ordering, **P1-043** staging storage reservation, imported-provenance controls and replace-import Journal generation **P0-076**.

## Fresh source proof

### 1. Picker still reduces a displayed object to path text

Current Journal picker renders backup metadata but on radio change stores only:

`selectedYandexBackupPath = radio.value`.

Proceed therefore carries no immutable copy of the selected row's size/modified/resource identity/account/root generation.

This remains the existing P0-013 root.

### 2. Worker fetch is path-oriented

`fetchJournalBackupFromYandex(requestedPath, operationId)` normalizes the path, derives current backup structure, checks containment, then requests:

`GET /resources/download?path=<remotePath>`.

It does not current-source re-read exact metadata for the selected object and compare it with the picker selection before requesting the signed link.

### 3. Signed transfer produces staged bytes, but current chain does not preserve selected-object identity

Worker passes the returned signed URL into offscreen `text-download` with a 50 MiB cap. The downloaded response is staged into extension IndexedDB for preview/import.

At this boundary the important correctness fact becomes the **actual staged payload bytes**. A textual remote path is no longer sufficient provenance for those bytes.

Current flow has no selection receipt linking:

`picker object A -> fresh remote metadata A' -> signed download capability -> staged payload generation S`.

### 4. Pre-download metadata verification alone would still need a handoff receipt

The existing P0-013 delta correctly requires a fresh exact metadata comparison before `/resources/download`. This pass clarifies that such a patch is not complete unless the accepted identity is carried into the staged payload/import preview lifecycle.

If the provider permits an object replacement between metadata verification and signed-link generation/use, WebClip must not claim atomic object identity unless Yandex offers a documented conditional/version-bound mechanism.

At minimum the system must know exactly which selected metadata generation was authorized and which local byte generation was downloaded, so residual provider race semantics can be explicit and tested rather than silently collapsed to path.

### 5. Destructive confirmation confirms staged payload, not historical path

The later 9-digit confirmation is valuable user intent before replace-import. But once the network download has happened, the thing the user can safely authorize is the **validated staged payload S and its proven remote-selection receipt**, not merely the path originally clicked in the picker.

If S cannot be proven to derive from selected object A under the accepted provider contract, the preview must identify the mismatch/reselection requirement before destructive replace.

## Required P0-013 receipt chain

### Picker selection receipt

On list/select retain bounded identity for exact object A:

- immutable Yandex operation/account/root/config generation from P0-074;
- normalized path;
- listed size;
- listed modified/revision-like metadata;
- stable resource/object id where API semantics are documented/verified;
- picker list generation P1-139.

### Fresh worker revalidation

Proceed sends the selection receipt, not just path. Worker fresh-reads exact metadata under the same Yandex operation context and compares all authoritative/available identity fields.

Mismatch invalidates selection before signed download side effect.

### Signed-link handoff

The request for `/resources/download` must remain under the same exact account/root/auth operation generation.

If the API exposes a version/object identity that can be bound into conditional download or later response verification, use it. If not, document the residual race and fail closed when post-download evidence contradicts selected receipt.

### Staged payload generation

Offscreen/local staging returns an immutable staging receipt binding:

- staging generation/key;
- exact byte count;
- strong local digest;
- selected remote-object receipt/generation;
- operation receipt;
- schema/preview validation generation.

Do not reconstruct this relation later from path or filename.

### Preview and replace confirmation

The UI preview/confirmation refers to staging receipt S. Replace-import sends S (or worker-owned token for S), not independently supplied remote path/operation text.

P0-076 then validates current Journal replace generation at destructive commit.

### Cleanup/expiry

P1-035 staging lifetime/cleanup must compare the exact S owner generation. Expiring a picker or selected remote object does not allow an old staging key to be rebound to new bytes.

## Deterministic regressions

1. LIST/select A; A unchanged through fresh metadata and download -> S binds A and import succeeds after normal confirmation.
2. A replaced by B with different size before Proceed -> revalidation rejects before signed download.
3. A replaced by equal-size B with different stable resource/revision id -> reject.
4. A replaced after metadata check but before signed-link use; provider exposes version-bound proof -> mismatch/rejection according to documented contract.
5. Same residual window where provider exposes no stable conditional proof -> implementation records/handles limitation conservatively; path equality is never claimed as exact-object proof.
6. Signed response bytes differ from expected/verified content receipt where detectable -> S is rejected, no replace.
7. Reauth A->B with same root/path between list and Proceed -> P0-074 invalidates selection before B fetch.
8. Root change invalidates selection; no automatic retarget to new root.
9. Late old picker list response cannot create a valid selection receipt under newer list generation.
10. Preview shows validated S; remote path changes afterward -> confirmed replace still consumes only already validated S, not a re-fetch by path.
11. Staging S expires/cleanup wins before confirmation -> Proceed fails explicitly; it cannot regenerate/re-fetch path silently under old confirmation.
12. Two staged imports for same remote path remain distinct staging generations/digests and cannot consume each other.
13. Imported Journal provenance checks remain applied to every entry inside S; exact remote-object identity does not make backup contents trusted authority.
14. 50 MiB persistent staging participates in P1-043 global reservation before materialization.

## Numbering result

No new item. **P0-013** remains primary owner. P0-074/P1-139/P1-043/P1-035/P0-076 remain required composition layers.

## Test / release state

No product tests were rerun. Historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS** remains prior evidence only. Real Yandex selected-object/version semantics still require E2E characterization. No build, tag or Release was created.
