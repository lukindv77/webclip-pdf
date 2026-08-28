# Audit delta — Delete->Trash move must remain in one Yandex account/config generation — 2026-08-28

Source-of-truth `main` immediately before this write: `6897ffacc21ce91b5921add8b16cd7a786d7d247`.

Docs-only audit checkpoint. Runtime/tests/configuration/manifest are unchanged. No new P-number is assigned.

## Classification

Primary owner: **P0-074 — immutable Yandex operation/account/config context**.

Adjacent:

- **P0-022/P0-073/P1-184** — destructive remote identity/provenance;
- **P0-076** — destructive Journal mutation generation;
- **P1-090/P1-183** — exact move target/post-state and Trash saga recovery;
- existing move post-state identity-continuity delta.

## Existing positive controls

Before destructive move, `moveJournalYandexFileToTrash()`:

- reads current Yandex config;
- calls `findYandexFileForJournalEntry()` which can compare stored root/account/resource identity;
- constrains source path to managed Upload/ReadmeLater/Trash branches;
- creates a dated Trash subtree;
- chooses a collision-safe target;
- verifies a target file after move before local deletion proceeds.

These checks are valuable, but they are not one immutable operation context.

## Fresh gap — remote stages can rebind after preflight

After the initial source/account proof, the operation continues through multiple API calls:

1. ensure/create Trash root and month folder;
2. inspect/choose collision target;
3. `POST /resources/move`;
4. repeated `GET /resources` verification at target;
5. return remote move result to `deleteJournalEntry()`;
6. delete the local Journal entry.

`ensureYandexFolderTree()` and `yandexApi()` obtain current auth during each request. No exact account/config generation accepted at source-locate time is passed through these stages.

Thus a later auth/root change can make one logical delete operation span two remote namespaces.

## Deterministic account-switch schedule

1. Entry E belongs to Yandex account A/root R and points to exact source SA.
2. User chooses Delete + move file to Trash.
3. Preflight under A successfully locates SA and validates managed containment.
4. Before Trash folder creation/move, auth changes to account B. B may use the same textual root R and may have a file at the same managed path.
5. Later folder PUTs, collision checks and move use B's current token.
6. WebClip can create Trash hierarchy in B and potentially move B's path-matching object.
7. Target verification also reads B.
8. Operation returns success and local Journal row E (historically A) is deleted.

The result is worse than a simple remote failure: a stale A delete decision can become a B remote mutation followed by loss of A's local management record.

## Root/config switch variant

Even without account change, root R1->R2 after preflight can mix:

- source observation under R1;
- Trash target/hierarchy under R2;
- current scheduler/config state unrelated to the original destructive decision.

Textual path containment against a fresh config does not prove the original operation's authority survived the switch.

## Required contract

Delete-to-Trash must carry one immutable destructive remote receipt from admission through finalization, including at least:

- expected Journal entry generation;
- accepted account UID/auth generation;
- accepted root/config generation;
- source resource identity + verified source path;
- immutable Trash target generation;
- remote move operation generation;
- post-state identity proof.

Every remote call either consumes that context or fresh-checks exact equality before proceeding. A newer current auth/config must yield `superseded/conflict`, never implicit rebind.

Local Journal deletion must occur only after post-state proof for the **same accepted remote object/account generation**.

If remote outcome is unknown, the Journal row or a detached management receipt must remain available for reconciliation; do not destroy the only provenance record merely because a target path currently contains a file.

## Required regressions

1. Delete E under stable account/root A succeeds and local row is removed only after exact post-state proof.
2. A source locate -> account B before Trash folder creation -> no B folder/move mutation.
3. A source locate -> B after target selection -> old A target generation cannot execute in B.
4. A move request settles -> auth changes before verify -> B target object cannot prove A move success.
5. Root changes mid-delete -> operation stops/supersedes without mixing source and target roots.
6. Unknown move outcome preserves enough A receipt to reconcile later without deleting the Journal management identity prematurely.
7. Same textual source/target paths existing in A and B do not allow cross-account confused-deputy behavior.

## Duplicate check

Existing post-state move audit owns target identity continuity; P0-074 owns operation context. Repository search found no dedicated Delete->Trash checkpoint for account/config change **after** source provenance validation. This is therefore a new concrete P0-074/P0-076 manifestation, not a new P-number.

## Test / release state

Documentation only. Product tests were not rerun. Historical evidence remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Runtime version remains `0.9.8`; no build/tag/Release was created.