# P0-072 — local token salt bootstrap inside authoritative reset transaction — 2026-09-04

Date: 2026-09-04  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch entering this block: `research/p0-072-recovery-quarantine-2026-09-04 @ 28408a6358823e45a20e71a8d21a3657a5d75def`  
Deterministic model commit: `7815495917ee70832f83bb82d8501909cceb91a5`  
Owner: **P0-072 ACTIVE**.

This checkpoint refines execution ordering only. It composes the existing atomic reset and `journalLocalTokenSalt:v1` lifecycle contracts. Runtime/manifest are unchanged.

## 1. Problem with a separate salt prerequisite transaction

The destructive path already needs a bounded Chrome Storage legacy snapshot before opening the authoritative Journal reset transaction.

It would be tempting to then run a second preliminary `meta` transaction to get/create `journalLocalTokenSalt:v1`, compute legacy/source/scope tokens, and only afterwards open the destructive reset transaction.

That works in many schedules but introduces an unnecessary durable preprocessing side effect and another TOCTOU boundary.

A cleaner structure is available because all required primitives are synchronous once the bounded source projection exists.

## 2. Phase A should prepare projections, not authority tokens

Before opening the authoritative reset transaction:

- read the bounded legacy Chrome Storage array;
- validate count and aggregate/row limits;
- produce deterministic bounded legacy-source projections;
- compute requested URL/site normalized scope strings;
- do **not** generate a salt;
- do **not** persist fences;
- do **not** finalize salted tokens.

If this prerequisite fails, no Journal/recovery/meta authority changes.

## 3. Phase B owns salt and token derivation

Inside the same readwrite transaction that owns pending quarantine and Journal clear/replace:

1. read exact `journalLocalTokenSalt:v1` from `meta`;
2. validate it when present;
3. if absent and a token is needed, bounded-prefix scan the dependent v1 namespaces;
4. if dependent receipts/fences prove an older salt must have existed, abort rather than regenerate;
5. if no dependent state exists, generate 32 random bytes synchronously with `crypto.getRandomValues()` and `put()` the fixed encoded salt;
6. compute `legacy-source`, `scope-url`, and `scope-site` tokens synchronously using bundled `WebClipSha256` + `TextEncoder`;
7. continue legacy materialization/fence, receipt matching/detachment, capacity accounting and Journal mutation in the same transaction.

No async WebCrypto or Chrome API call is needed inside the transaction.

## 4. Why this is stronger

This layout guarantees that salt creation, fence creation and Journal reset either commit together when salt is first needed or all abort together.

It also avoids this unnecessary state:

```text
new local salt committed
reset later aborted before any dependent receipt/fence exists
```

Such a state would not be dangerous, but it is needless preprocessing and complicates reasoning.

## 5. Full reset exception remains precise

Clear-all/import-replace can detach already-visible external-effect receipts by namespace without a scope token.

Therefore:

- missing salt + visible external receipts + no hidden legacy token work -> full reset may detach them without creating/recovering salt;
- missing salt + hidden legacy rows requiring fence rendezvous + dependent tokenized/fence state -> fail closed because a replacement salt would orphan historical identity;
- missing salt + hidden legacy rows + no dependent state -> authoritative reset transaction may create the first salt and continue.

Scoped URL/site reset additionally needs valid scope-token context when tokenized receipts exist.

## 6. Concurrent salt creators

Because creation occurs in a `meta` readwrite transaction, concurrent operations serialize on the same store.

The first committed creator installs the salt; the later transaction re-reads and uses that exact current value. No compare-free overwrite or `Math.random()` fallback is allowed.

## 7. Deterministic model

Added:

`project_tools/test_p0_072_local_salt_authoritative_tx_model.js`

Local equivalent result before durable write:

```text
P0-072 local salt authoritative-transaction bootstrap model: PASS
```

Covered controls:

1. hidden legacy work with no dependent prior state can create the first salt inside reset;
2. scoped reset with dependent tokenized state and missing salt aborts unchanged;
3. full reset can detach visible receipt namespace without salt when no legacy rendezvous is needed;
4. full reset with hidden legacy work cannot invent a replacement salt when dependent state proves historical salt loss.

This is architecture/model evidence, not runtime PASS.

## 8. Implementation acceptance addition

- `readLegacyPendingJournalSnapshotBounded()` returns bounded projections/raw-normalized source data, not persisted authority tokens;
- salt get/create and salted token computation occur inside the authoritative `meta` transaction;
- salt creation is synchronous transaction-owned and publishes only on `tx.oncomplete`;
- missing/corrupt salt with dependent receipt/fence state never auto-rotates;
- clear-all/import remains able to detach visible receipt namespace without salt when no token matching/rendezvous is needed;
- no separate pre-reset salt write is required.

## 9. Owner boundaries

This is P0-072 execution ordering. P0-066/P1-216 remain owners for canonical URL confidentiality/identity; P2-019 remains the broader shared schema/migration owner.

No new P-code is allocated.

## 10. Status

P0-072 remains **ACTIVE**. Runtime and manifest remain unchanged. Manifest remains `0.9.8`; release remains `NOT READY`; no Actions/build/tag/Release is claimed.
