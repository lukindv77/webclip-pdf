# Audit delta — Yandex folder-tree creation must stay in one auth/account generation — 2026-08-28

Source-of-truth `main` immediately before this write: `a40ea6f962da39552a52840c1db67b545b9c6ac7`.

Docs-only audit checkpoint. Runtime/tests/configuration/manifest are unchanged.

## Classification

No new P-number is assigned.

Primary owner: **P0-074** — one Yandex operation must use one immutable account/auth/config context.

Adjacent owners:

- **P1-137** — folder-picker path authority must be bound to the account generation in which the path was observed;
- **P1-191/P1-178** — auth replacement / OAuth attempt generation;
- **P1-157/P1-210** — extension-page side-effect settlement and reconciliation after unknown outer result.

## Existing positive control

The immediately preceding folder-picker audit already requires `WEBCLIP_YANDEX_CREATE_FOLDER` to carry the account/config generation under which the textual path was selected.

That protects admission of the command. It does not by itself keep the **multi-request folder-tree mutation** in the same generation after admission.

## Fresh source proof

`createYandexFolder(path)` normalizes the requested path and calls:

`ensureYandexFolderTree(normalized)`.

`ensureYandexFolderTree()` then walks every path segment. For a path such as:

`/Projects/WebClip/New`

it issues separate `PUT /resources?path=...` calls for:

1. `/Projects`;
2. `/Projects/WebClip`;
3. `/Projects/WebClip/New`.

A `409` is treated conservatively: the code re-reads the exact path and verifies that the existing object is a directory. This is a useful idempotency control.

However, every individual call goes through `yandexApi()`.

`yandexApi()` obtains its access token by calling `getValidYandexAccessToken()` **for that request**. The folder-tree loop does not carry an immutable token/account UID/auth generation from the command admission.

Therefore an ordinary auth replacement between requests can make one logical tree operation span two accounts.

## Deterministic cross-account schedule

1. User browses account A and selects `/Projects/WebClip/New` under a valid A picker receipt.
2. Worker accepts Create Folder for account generation A.
3. First tree request creates `/Projects` in A.
4. Before the next request, another Options page disconnects/re-authenticates or installs a manual token for account B.
5. Second call to `yandexApi()` fresh-reads the now-current token B.
6. `/Projects/WebClip` is now interpreted in B, not A.
7. The operation either creates a partial hierarchy in B, fails because the parent differs, or produces a mixed remote history in which A and B were both mutated by one user command.
8. The caller receives only success/error for one textual Create Folder action; it has no receipt showing which physical requests settled in which account.

No timeout or malicious input is required.

## Why retry/idempotency is insufficient

The current `409 -> GET -> require type=dir` behavior makes repeating the same path in **one account** reasonably idempotent.

It does not solve generation drift:

- a partial A tree is not equivalent to a full B tree;
- retry under B can leave A side effects behind;
- retry after switching back to A can create a second partial/full tree;
- a generic error cannot tell the user which account was mutated.

Thus “folder creation is idempotent” is only meaningful after the remote namespace/account is fixed.

## Required P0-074 refinement

### Immutable folder-mutation context

Once Create Folder is admitted, capture a bounded context containing at least:

- expected account UID/auth generation;
- config generation relevant to path interpretation;
- normalized target path;
- operation/physical mutation receipt id.

Every `PUT`/verification `GET` in `ensureYandexFolderTree()` must consume that same context or fail closed if it is no longer current/usable.

Do not let later requests silently fresh-bind to a replacement account.

### Partial physical settlement

Folder-tree creation is a saga across multiple remote requests. After each confirmed segment, the operation should retain enough bounded progress evidence to distinguish:

- no remote mutation admitted;
- confirmed prefix created/verified in account A;
- next request outcome unknown;
- full target directory verified in A;
- operation superseded by auth generation B.

A user-facing retry can safely re-read exact segment state in **the captured A namespace** when that namespace is still authorized; otherwise report the historical partial outcome rather than reinterpret the original command in B.

### Auth change is a revocation/supersession boundary

When auth A is replaced by B while a folder mutation is active:

- no not-yet-started segment from A may automatically execute under B;
- already confirmed A segments remain historical remote side effects;
- an unknown A request must be reconciled as A, not guessed from B;
- a new mutation in B requires a new picker/account receipt and new explicit operation generation.

### Result truth

A successful result must mean the full normalized target was verified in one account generation.

A partial/error result should not imply “nothing changed” if a prefix was already created.

## Required regressions

1. Account A, one-segment create -> directory verified in A.
2. Account A, multi-segment create -> all segments use one captured A context.
3. A creates first segment -> auth switches B -> remaining A operation stops/supersedes; no B segment is created by the old command.
4. A request outcome unknown -> auth switches B -> recovery does not inspect B path and claim A settled.
5. Retry in unchanged A with already-created prefix -> `409 + exact GET type=dir` continues safely.
6. Retry in B after A partial side effect -> requires a new B operation receipt and does not relabel A history as B.
7. Disconnect mid-tree -> known A prefix remains reported as historical partial settlement; no later current-account mutation is automatic.
8. Manual-token replacement has the same fence as PKCE account replacement.
9. Concurrent Save Root/config mutation cannot cause folder creation to switch root/account generation halfway through the tree.
10. Outer `runtime.sendMessage` loss after full A creation -> reconciliation confirms target in A before UI launches a semantically new request.

## Duplicate check

The folder-picker account-generation delta protects the **selection/admission** boundary. The root-save generation deltas protect root-setting ancillary verification. Existing P0-074 already owns the invariant that a long Yandex operation cannot mix independently fresh auth/config generations.

This checkpoint applies that existing invariant to the user-visible multi-segment `CREATE_FOLDER` mutation and therefore does not justify a new P-number.

## Test / release state

Documentation only. Product tests were not rerun. Historical evidence remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Runtime version remains `0.9.8`; no build, tag or GitHub Release was created.