# Audit delta — Journal `contextId` replay semantics — 2026-08-28

Source-of-truth `main` immediately before this write: `a4306d5913a18c121aa0a6ad1373b63267de76b1`.

Docs-only audit checkpoint. Runtime/configuration/tests/manifest are unchanged. No new P-number is assigned.

## Classification

Fresh source review completes the previously open question about whether `journal.html?contextId=<C>` is currently a one-shot capability.

No new blocker is created. This refines existing **P1-123** (Journal source-context storage lifecycle), **P1-124** (`tabs.create()` exact crash/unknown-settlement receipt) and **P1-175** (exact source-document authority).

## Current source proof — `contextId` is reusable for its TTL

`journal.js::loadStoredJournalContext()`:

1. derives `webclipJournalContext:<contextId>`;
2. reads the record from `chrome.storage.session` through the bounded extension-page read helper;
3. validates only age/URL-length/basic shape;
4. copies `sourceTabId` and `sourceUrl` into the page state.

There is no `chrome.storage.session.remove(key)` or compare-and-consume transition after a successful read. Fresh search of `journal.js` finds no session-storage removal for this key.

Therefore, while the record remains within the 24-hour context TTL, a second Journal page opened with the same `contextId` can load the same source context.

That can happen through an intentional tab duplicate/history reopen/copied extension URL, not only through a worker-created original tab.

## Why replay is not independently a current security defect

The stored context currently contains bounded source navigation metadata (`sourceTabId`, `sourceUrl`, `createdAt`). It is not by itself sufficient authority for the most sensitive action:

- Journal later fresh-reads the source tab;
- existing P1-175 requires exact source-document revalidation for Apply/commands;
- downstream PDF/save authority remains separately fenced by P0-070/P0-023;
- the `contextId` is random extension-internal state, not a host-page-provided token.

A duplicated Journal page obtaining the same source context is therefore not presently proven to bypass a remote destructive, credential, or host-permission boundary.

Do not invent a new P-number solely because the record is reusable.

## Critical composition with P1-124

P1-124 proposes using a unique browser-visible nonce to reconcile an unknown `tabs.create()` across MV3 worker loss. The existing random Journal `contextId` is an attractive candidate because it already appears in the target extension URL.

However the current semantics show that `contextId` cannot silently serve two incompatible roles:

1. **reusable source-context lookup key** for Journal pages during the TTL; and
2. **one exact tab-create/page-consumption receipt** proving that a particular create generation produced/was consumed by a particular page generation.

If P1-124 treats “a page with contextId C exists/loaded” as exact one-time create settlement while C remains replayable, a duplicate/reopened page could be mistaken for the exact created-page acknowledgement.

The fix must therefore make the roles explicit.

## Required design boundary

Acceptable models include either:

### A. Separate ids

Keep a reusable `sourceContextId` if product intentionally wants duplicated Journal pages to inherit the same source context, and introduce a distinct one-shot/random `tabCreateIntentId` for P1-124 reconciliation/ACK.

The create receipt is consumed/finalized by one exact tab/document generation; the source context may remain reusable under its own bounded lifecycle.

### B. Single id with separate generation/consumer receipts

If one physical id is retained, its durable/session record must distinguish:

- source-context data;
- tab-create generation;
- exact created tab/document acknowledgement;
- page-consumer generations;
- retired/create-settled state.

A second page may read reusable context if allowed, but it cannot satisfy or overwrite the already-settled create receipt.

## Source-document authority still must be exact

Even a legitimate second consumer must not inherit stale command authority merely from C.

Each Journal page must independently establish a current source receipt before command mutation:

- current source tab exists;
- current source URL/site policy is valid;
- exact top-document/navigation generation is captured;
- final scripting/message dispatch targets that generation.

Thus reusable context is only a navigation hint/bootstrap, not durable command capability.

## Cleanup semantics

The preceding `AUDIT_DELTA_JOURNAL_SOURCE_CONTEXT_TAB_CREATE_HANDOFF_2026-08-28.md` remains valid:

- proven create failure may promptly retire its exact prepared context when no reusable consumer has been intentionally published;
- unknown create settlement must retain enough state for late-tab reconciliation;
- after create settlement, source-context retention policy and create-receipt retention policy become separate concerns;
- generic 24-hour TTL remains bounded orphan cleanup, not proof that an exact create is still unresolved.

If reusable context is kept, pruning must not accidentally delete an unresolved P1-124 create receipt merely because the user opened/duplicated many Journal pages. Conversely a completed create receipt need not pin source context for 24 hours solely for reconciliation.

## Required regressions

1. Normal worker-created Journal tab C loads source context successfully.
2. Duplicate/reopened `journal.html?contextId=C` behavior matches the chosen product policy explicitly: reusable context may load, or one-shot context is visibly expired; it is not accidental.
3. A second page carrying C cannot satisfy the original P1-124 create ACK if that ACK is already owned by another exact tab/document generation.
4. Unknown `tabs.create` A later produces exact tab T -> reconciliation identifies T by create receipt, not merely “some page can read C”.
5. Unrelated duplicate page with C appearing before late T cannot steal the create-settlement receipt.
6. Reusable page consumers independently revalidate P1-175 exact source document before Apply/command.
7. Proven create failure cleanup does not delete source context intentionally retained by an already-acknowledged reusable page generation.
8. Context TTL/pruning and create-receipt TTL/cap remain separately bounded.

## Numbering result

No P1-211 is assigned.

- **P1-123** owns context storage/retention semantics.
- **P1-124** owns exact browser-tab create intent and settlement.
- **P1-175** owns exact source-document command authority.

The architectural acceptance point is: **do not let replayable source context become an implicit one-shot browser-create receipt.**

## Test / release state

Documentation only. Product tests were not rerun. Historical gate remains prior evidence only: **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. No build, tag or GitHub Release was created.
