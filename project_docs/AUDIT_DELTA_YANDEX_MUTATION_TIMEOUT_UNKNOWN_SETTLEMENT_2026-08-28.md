# Audit delta — Mutating Yandex API timeout is unknown remote settlement, not proven no-op — 2026-08-28

Source-of-truth `main` immediately before this write: `c6f068f7dfc1aa140887af106463363abd7bbf80`.

Docs-only audit checkpoint. Runtime/tests/configuration/manifest are unchanged. No new P-number is assigned.

## Classification

Primary existing owners:

- **P1-210** — truthful result/reconciliation before admitting a new user-side-effect generation after result loss;
- **P0-074** — immutable Yandex operation/account/config generation;
- **P1-048** — unknown signed-transfer settlement must not be blindly retried.

Adjacent remote checkpoint/object owners: P0-073/P1-184/P1-198.

## Fresh source proof

`yandexApi(endpoint, options, allowRetry)` is the common HTTP wrapper for both read-only and mutating Yandex Disk requests.

On AbortController timeout / AbortError it currently constructs:

`YANDEX_TIMEOUT: "Яндекс Диск не ответил за ... с. Операция остановлена без изменения данных."`

That statement is too strong for mutating HTTP requests.

The same helper is used by operations including:

- `PUT /resources` while creating folder trees;
- `POST /resources/move` for ReadLater->Upload and Delete->Trash;
- `PUT /resources/publish`;
- other remote mutations and state transitions.

After a client-side timeout, WebClip knows only that it stopped receiving/waiting for a timely response. It does **not** know that Yandex failed to accept or apply the request.

## Why AbortController is not rollback

Aborting the local fetch/request path does not constitute a remote transactional cancellation receipt.

A deterministic schedule is:

1. WebClip sends mutating request M.
2. Yandex receives M and begins/applies the side effect.
3. Response is delayed, lost or exceeds WebClip timeout.
4. local AbortController fires.
5. `yandexApi()` throws `YANDEX_TIMEOUT` saying the operation stopped without data changes.
6. UI/caller may now treat retry as safe.
7. A retry M2 can duplicate or conflict with the already-settled M.

For folder creation a subsequent exact GET/409 reconciliation may converge safely. For moves, publication and other mutations the required reconciliation is operation-specific and can require exact source/target/object/publication receipts.

## Read-only vs mutating timeout semantics

The transport result should distinguish method/operation class.

### Read-only request

GET timeout can be reported as a read failure/unknown observation. It does not by itself create remote mutation evidence.

### Mutating request admitted to transport

PUT/POST/DELETE (and any semantic mutation regardless of HTTP verb) timeout must be returned/logged as conceptually:

- `remoteSettlement: unknown`;
- operation generation retained;
- no assertion that data was unchanged;
- no automatic or user-visible blind retry until operation-specific reconciliation runs.

A proven failure **before network admission** may still be classified `not-admitted` / no remote change.

## Required reconciliation by mutation type

Examples:

- Create Folder: fresh metadata check for exact target under the accepted account/config generation; existing same-directory result can converge.
- ReadLater/Trash move: reconcile exact source/target and resource identity under the original move generation.
- Publish: fresh metadata/publication state for the exact remote object; never assume timeout means unpublished.
- Upload/signed transfer: existing remote checkpoint/transfer receipt rules apply.

The generic `yandexApi()` layer may classify transport settlement, but it must not invent a generic "safe to retry" policy for all mutations.

## UI/result requirements

Do not expose a mutating `YANDEX_TIMEOUT` as a terminal message equivalent to "nothing changed".

Callers should receive structured error/result data sufficient to distinguish:

- `not-admitted`;
- authoritative remote/application failure;
- `remote-settlement-unknown`;
- reconciled success;
- reconciled terminal failure/conflict.

P1-210 then governs what a page may truthfully display and when a new user operation may be admitted.

## Required regressions

1. GET timeout remains a bounded read failure and does not create mutation state.
2. Folder PUT applied remotely but response times out -> result is unknown; reconciliation finds directory and converges without duplicate mutation.
3. Move POST applied remotely but response times out -> source/target identity reconciliation proves outcome before retry.
4. Publish PUT applied remotely but response times out -> metadata reconciliation detects publication and does not blind-publish/relabel privacy state.
5. Mutating request fails locally before transport admission -> caller may receive proven `not-admitted` rather than unknown.
6. Reconciliation timeout remains unknown; it is not converted to no-op by elapsed time.
7. Account/root generation changes while outcome is unknown -> old operation receipt is quarantined/reconciled in its original context, not replayed under current context.
8. OperationLog records distinguish client timeout from authoritative remote rejection.

## Duplicate check

P1-210 currently owns **outer runtime response/channel loss** and retry admission. P1-048 owns signed-transfer no-blind-retry semantics. Repository search found no dedicated checkpoint correcting the generic Yandex HTTP wrapper's statement that a timed-out mutating request made no changes.

This is a lower transport-layer manifestation of those existing settlement/reconciliation invariants and does not justify a new number.

## Test / release state

Documentation only. Product tests were not rerun. Historical evidence remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Runtime version remains `0.9.8`; no build/tag/Release was created.