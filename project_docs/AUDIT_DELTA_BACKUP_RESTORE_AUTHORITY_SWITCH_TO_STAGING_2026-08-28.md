# Audit delta — Yandex backup restore authority switches from remote object to staged bytes — 2026-08-28

Source-of-truth `main` immediately before this write: `2adcc852d813ab0c1d85bbda87ecd3c0d27019e6`.

Docs-only audit checkpoint. Runtime/configuration/tests/manifest are unchanged. No new P-number is assigned.

## Classification

This block records a positive current behavior and an acceptance boundary for existing **P0-013** exact selected backup-object identity, composed with **P1-035** staging lifetime and **P0-076** destructive replace generation.

The selected-object staging audit already requires a receipt chain from picker object A through signed download into immutable local staging generation S. Fresh source confirmation shows the later Journal confirmation/replace path already uses S directly rather than re-fetching the Yandex path.

That is the correct authority switch and should be preserved while P0-013 is fixed.

## Positive source proof — fetch returns the staged generation

After signed Yandex download and streaming validation, `fetchJournalBackupFromYandex()` returns fields including:

- `remotePath` for display/provenance;
- `stagingKey: responsePayloadKey`;
- entry count/exported timestamp;
- operation id.

The actual importable bytes are therefore represented by a local staging key once download/inspection succeeds.

## Journal carries the same staging key through confirmation

Journal's Yandex restore flow:

1. receives `fetched.stagingKey`;
2. stores it in page state while opening the dangerous 9-digit confirmation;
3. if user cancels, explicitly discards `fetched.stagingKey`;
4. if user confirms, sends:
   `WEBCLIP_JOURNAL_IMPORT_REPLACE_STAGED { stagingKey: fetched.stagingKey, ... }`.

There is no second Yandex `/resources/download` request at Proceed.

This is important correctness: the destructive confirmation refers to the already downloaded/previewed byte generation, not to whatever object might later occupy the same remote path.

## Correct authority transition

Before staging exists, safe authority is:

`picker selection receipt A -> current exact remote object verification -> signed download under A context`.

Once immutable staged payload S has been created and bound to A:

`S` becomes the source bytes for preview and destructive replace.

The remote path/object is then **provenance metadata**, not a mutable pointer that must be dereferenced again at confirmation time.

Conceptually:

`remote object A --download--> staged bytes S --preview/confirm--> Journal replacement`

not:

`remote path P --preview--> wait --re-fetch P--> replacement`.

## Why revalidating current remote object at Proceed can be wrong

Suppose exact P0-013 implementation successfully proves selected object A and downloads its bytes into S. The user then spends several minutes reviewing the preview/confirmation. During that time an external Yandex client replaces/deletes path P.

S has not changed.

If WebClip were to require the current remote path still resolve to A before allowing Proceed, it would unnecessarily invalidate an already exact local byte generation the user reviewed.

Worse, if it re-fetched P and silently replaced S with new object B, the original confirmation/preview would no longer describe the imported bytes.

Therefore remote currentness after staging is not the destructive-import authority.

## What must still invalidate Proceed

Proceed remains valid only while the exact staged receipt S remains valid.

Invalidation conditions include:

- P1-035 staging payload expired/was cleaned or owner lease lost;
- staging manifest/chunk byte count/digest no longer matches S receipt;
- operation/staging generation is stale or belongs to another page/session;
- preview validation generation does not match S;
- current Journal replace-generation policy rejects the destructive action under P0-076;
- imported content fails schema/provenance normalization during the mandatory fresh replace-time validation.

A change to remote path P **after S was correctly bound/downloaded** is not by itself a reason to substitute bytes.

## Fresh validation at replace remains a positive control

Current `WEBCLIP_JOURNAL_IMPORT_REPLACE_STAGED` path re-normalizes/revalidates the staged source before commit rather than blindly trusting the earlier preview.

This should remain. It proves current integrity of S; it is not a remote re-fetch.

The ideal final chain is:

1. exact selected remote object receipt A;
2. exact staged bytes receipt S bound to A, including byte count/digest;
3. preview receipt V bound to S;
4. user confirmation generation C bound to V/S;
5. replace-time fresh validation of exact S;
6. P0-076 current Journal destructive CAS;
7. atomic replacement.

## Display semantics

The confirmation may display original `remotePath`, selected file metadata and export timestamp to explain provenance.

It should also conceptually make clear that the operation will restore the **downloaded/validated backup**. If remote object later changes, WebClip does not need to confuse the user by pretending it will follow the path again.

If the staging lease expires, UI should say the downloaded backup expired and requires a fresh selection/download/preview — not silently fetch the path under the old confirmation.

## Cleanup semantics

Cancel discards exact S.

Successful replace should delete/release exact S after commit according to staging lifecycle.

Page crash/owner loss uses P1-035 bounded orphan cleanup. No cleanup operation may rebind the same staging key to different bytes.

## Required regressions

1. Select/prove/download A -> create S -> remote A unchanged -> confirm -> exact S imports normally.
2. Create S from A -> external client replaces path with B before user confirms -> Proceed imports validated S/A bytes, never B, provided S is still valid.
3. Create S -> remote A deleted before confirmation -> valid S can still be imported according to product policy; no path re-fetch is required.
4. Create S -> staging payload expires/cleanup wins -> Proceed fails explicitly and requires fresh download/preview; it never re-fetches P silently.
5. Two staged generations S1/S2 from same remote path remain distinct; confirmation C1 can consume only S1.
6. Remote account/root auth changes after S exists -> no re-fetch under new namespace; S provenance remains historical A while local replace authority is checked separately.
7. Replace-time validation detects corrupted/missing S chunk -> no Journal mutation despite valid old preview.
8. User cancel removes/releases only exact S; another staged generation is unaffected.
9. Page reload cannot inherit S merely from displayed remote path unless exact staging-owner/session recovery policy explicitly grants it.
10. Import provenance sanitization remains mandatory; exact selected remote object does not make backup contents privileged/local.
11. P1-035 owner lease protects active S or UI explicitly expires it; raw two-hour wall clock cannot leave enabled Proceed pointing at deleted bytes.
12. P0-076 stale current-Journal generation can reject replace even though S remains valid; S validity and Journal mutation authority are separate.

## Duplicate check

- **P0-013** owns exact selected remote backup object through the download handoff.
- **P1-035** owns exact staging generation lifetime/owner cleanup.
- **P0-076** owns destructive current Journal replace generation.
- This checkpoint is intentionally a positive architecture boundary: once P0-013 has safely produced S, do not reintroduce mutable path authority later.

No P1-211 is created.

## Test / release state

Documentation only. Product tests were not rerun. Historical gate remains **88/88 syntax + 74/74 deterministic PASS**. Real Yandex exact object/version semantics remain E2E work. No build/tag/Release was created.
