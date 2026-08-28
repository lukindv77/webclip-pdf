# Audit delta — Journal source-context handoff to tab creation — 2026-08-28

## Scope

Docs-only audit of the handoff from durable/session Journal source context to browser tab creation. No new P-number.

Refines **P1-123** Journal source-context storage lifecycle and **P1-124** exact `tabs.create()` unknown-settlement receipt.

## Finding

`openJournalPage()` intentionally persists source context **before** creating the Journal tab:

1. generate random `contextId`;
2. `await storeJournalSourceContext(contextId, sourceTabId, sourceUrl)`;
3. create `journal.html?...&contextId=<id>` with `createTabNextTo()`.

This ordering is valuable for crash safety: a Journal tab must never be created first and then discover that its source context was not durable.

However the handoff currently has no explicit state/result link between the stored context and the tab-create outcome.

### Proven create failure leaves an orphan context

If `createTabNextTo()` is proven to fail before a tab exists, `openJournalPage()` throws without removing the newly stored context.

The context remains in `chrome.storage.session` for up to the normal 24-hour TTL/pruning lifecycle even though this invocation has no browser consumer.

Repeated proven tab-create failures can therefore accumulate dead context records and consume the bounded `MAX_JOURNAL_SESSION_CONTEXTS` population, causing useful old/live contexts to be pruned earlier than necessary.

### Unknown create settlement is the opposite case

A local `tabs.create()` timeout/worker loss is **not** proof that no Journal tab exists. P1-124 already requires retaining/reconciling an exact create intent across MV3 lifetime.

In that class, eagerly deleting the source context would be wrong: Chrome may still open a late Journal tab whose URL contains the exact `contextId`.

Therefore one generic `catch -> remove context` is also insufficient.

The lifecycle must distinguish:

- context prepared + create **proven failed** -> exact context can be retired immediately;
- context prepared + create **unknown/may succeed** -> context remains pinned to the exact P1-124 create intent until reconciliation;
- create success -> context becomes owned by the exact Journal tab/page generation;
- tab closes/never consumes -> bounded owner/orphan cleanup eventually retires it.

## Required handoff receipt

The pre-create source context should be associated with a create-generation receipt containing at least:

- random `contextId`;
- exact tab-create request generation/nonce;
- source tab/document receipt from P1-175;
- phase such as `prepared | create-unknown | tab-created | consumed/retired`;
- bounded created/expiry metadata.

The Journal target URL's random contextId is already a useful browser-visible identity for exact P1-124 reconciliation.

### Cleanup ownership

- proven pre-create failure compare-deletes only the exact context generation;
- late failure/success from old create A cannot delete context for newer create B;
- unknown create keeps the context discoverable until exact tab reconciliation decides;
- once a Journal page consumes/acknowledges the context, lifecycle may transition to page-owned/session policy;
- generic 24h TTL remains a crash/orphan safety net, not normal cleanup for a synchronously failed create.

## Acceptance cases

1. Context C stores -> tab create succeeds -> exact Journal tab receives C.
2. Context C stores -> create is proven failed -> C is promptly retired.
3. Context C stores -> caller timeout but Chrome later creates tab T -> C remains until T/P1-124 reconciliation; late page can resolve its exact context.
4. Worker dies after C store and before create result -> new worker does not classify C as unused solely from worker loss.
5. Repeated proven create failures do not fill the 512-context population for 24 hours.
6. Create A failure cleanup cannot delete newer context B.
7. User closes reconciled Journal tab without consuming/retaining C -> bounded owner/orphan policy eventually releases it.
8. Context pruning never removes a generation still pinned by an unresolved exact tab-create receipt merely because unrelated failed contexts consumed the cap.

## Classification

- **P1-123** owns bounded/source-context session-storage lifecycle.
- **P1-124** owns exact browser `tabs.create()` settlement/crash reconciliation.
- **P1-175** supplies source-document identity carried by the context.

No new P1-211 is allocated.

## Validation note

Documentation only. Runtime/tests/manifest unchanged. Product tests were not rerun; historical 88/88 JS syntax + 74/74 deterministic PASS remains prior evidence. No build/tag/release.