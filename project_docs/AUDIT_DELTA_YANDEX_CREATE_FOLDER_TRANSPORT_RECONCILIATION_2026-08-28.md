# Audit delta — Yandex Create Folder transport-loss reconciliation — 2026-08-28

Source-of-truth `main` immediately before this write: `472153e05e6a846bdae4eebe3d22c0d96c6bc4ac`.

Docs-only audit checkpoint. Runtime/tests/configuration/manifest are unchanged.

## Classification

No new P-number is assigned.

Primary existing owners:

- **P1-210** — outer transport failure cannot be interpreted as proof that a side effect did not commit;
- **P1-157** — extension-page non-idempotent/runtime side effects require bounded settlement/reconciliation semantics;
- **P0-074** — the target path must be interpreted in one immutable Yandex account/config generation.

## Existing positive control

`ensureYandexFolderTree()` has a useful same-account retry property.

For each requested directory segment it issues `PUT /resources`. If Yandex returns `409`, WebClip does not blindly treat that as success. It performs an exact `GET /resources` for the same path and requires the object to be a directory.

Therefore a second invocation after a **confirmed first creation in the same account namespace** can safely converge instead of creating a duplicate object.

This is the right building block for reconciliation.

## Fresh transport boundary

Options invokes Create Folder with a direct:

`chrome.runtime.sendMessage({type:'WEBCLIP_YANDEX_CREATE_FOLDER', path})`.

The page does not have a worker-issued mutation receipt for that operation and the call is not expressed as a durable create-folder saga.

The remote `PUT` can settle before the extension page receives a response. A runtime channel/worker/page error can therefore produce:

- remote target exists;
- page shows an error / does not know the result;
- no exact page-visible receipt says `committed`, `not-admitted`, or `unknown`.

## Deterministic same-account schedule

1. Account generation A is current.
2. User explicitly selects target `/Projects/New` under a valid A picker receipt.
3. Worker issues remote `PUT`; Yandex creates the directory.
4. The extension-page response is lost/rejected before Options observes success.
5. UI reports an error.
6. User presses Create Folder again.
7. Second invocation receives `409`, exact-GETs `/Projects/New`, verifies `type=dir`, and can converge to success.

The second invocation is physically safe in this schedule, but the first result was still incorrectly represented as a normal terminal failure rather than `unknown/reconcile`.

## Why account generation is mandatory

The same retry property becomes unsafe as an **interpretation** if auth/root context changes between attempts.

A target path existing in account B does not prove that the first unknown operation in account A committed. Likewise a retry in B must not be called reconciliation of A.

The result identity is at least:

`account/auth generation + normalized target path + create-folder operation generation`.

## Required contract

### Operation receipt

Create Folder should obtain a small worker-issued operation receipt before the first remote mutation. The receipt binds:

- expected account/auth generation;
- normalized target path;
- operation id / physical create generation;
- current phase.

### Outcome states

At minimum distinguish:

- `not-admitted` — no remote request began;
- `unknown` — request may have settled remotely;
- `verified` — exact target exists as directory in the captured account;
- `conflict` — target exists but is not a directory;
- `superseded` — current account/config generation no longer matches the receipt.

### Retry semantics

When the page loses the outer response:

1. re-read/reconcile the exact target in the captured account generation when still authorized;
2. accept `PUT 409 + exact GET type=dir` as evidence of target state, not as proof that a specific earlier request was the creator;
3. only after reconciliation may the UI issue a semantically new create operation;
4. if auth changed, require a fresh picker/new operation instead of silently reusing A's receipt in B.

### UI truth

A lost channel after remote creation should produce wording equivalent to “result not confirmed; checking target” rather than “folder was not created”.

## Required regressions

1. PUT succeeds + response delivered -> verified success.
2. PUT succeeds + outer response lost -> exact same-account reconciliation reports verified without a second uncontrolled mutation.
3. PUT outcome unknown + retry sees 409 + exact target directory -> converge safely.
4. PUT outcome unknown + exact target is file -> fail conflict, never report folder success.
5. Unknown A -> auth changes B -> B path cannot reconcile A operation.
6. Unknown A -> same A target absent -> explicit fresh retry may create once.
7. Multi-segment target retains per-prefix progress under the preceding folder-tree generation audit.
8. Page reload after unknown result can discover the receipt and reconcile instead of blind replay.

## Duplicate check

P1-210 owns the generic unknown-result rule; P1-157 owns extension-page mutation transport. The previous folder-tree audit owns immutable account generation during the multi-request tree itself.

This checkpoint records the Create Folder-specific convergence/positive-control behavior and therefore does not justify a new P-number.

## Test / release state

Documentation only. Product tests were not rerun. Historical evidence remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Runtime version remains `0.9.8`; no build, tag or GitHub Release was created.