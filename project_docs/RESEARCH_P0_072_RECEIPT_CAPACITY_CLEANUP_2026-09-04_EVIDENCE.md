# P0-072 — receipt capacity, quota failure and terminal cleanup contract — 2026-09-04

Date: 2026-09-04  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch entering this block: `research/p0-072-recovery-quarantine-2026-09-04 @ 294d16d1789a8158931f09b68b2362b345e823e1`  
Deterministic model commit: `543a6f2afa81c366efe9fce351486084e4b9fc92`  
Current owner: **P0-072 ACTIVE**. Supporting global storage owner: **P1-043 ACTIVE**.

This is a defensive reliability/architecture checkpoint. Runtime, manifest, Registry status, release readiness and external Yandex state are unchanged.

## 1. Research question

The selected P0-072 architecture preserves old-generation recovery authority instead of deleting it. That creates a second obligation: preserving truth must remain bounded without turning storage pressure into fabricated cancellation.

The narrow question is:

> What exact capacity/admission/cleanup semantics can P0-072 own locally without pretending to solve the broader shared-origin quota reservation problem already owned by P1-043?

## 2. External platform facts checked fresh

Official browser/platform documentation supports four relevant facts.

### IndexedDB write transactions are the rollback boundary

MDN documents that request errors normally abort the containing transaction and roll it back unless the error is explicitly canceled. `IDBTransaction.abort()` likewise rolls back all changes made by the transaction.

This matters because Journal clear/import plus reset dispositions already share one readwrite transaction. A failed receipt update must therefore fail the destructive reset instead of committing Journal deletion without receipt preservation.

### Quota failure is a real transaction failure mode

MDN lists quota exhaustion among the causes of IndexedDB transaction abort and exposes `QuotaExceededError` for writes that exceed available quota.

Therefore P0-072 must treat actual write failure as authoritative. A preflight estimate cannot replace successful transaction commit.

### Extension storage quota is shared at the extension origin

Chrome documents that extension web storage, including IndexedDB, is shared across the extension origin/service worker/pages/offscreen documents. By default extensions remain subject to normal quota restrictions unless `unlimitedStorage` is requested; `navigator.storage.estimate()` can inspect estimated usage/quota.

Current WebClip manifest does **not** request `unlimitedStorage`.

### `navigator.storage.estimate()` is an estimate, not a reservation

Browser documentation describes storage usage/quota values as estimates. The estimate can inform diagnostics/admission policy, but it cannot reserve bytes against another concurrent writer.

That unresolved global reservation problem remains exactly **P1-043 ACTIVE**.

## 3. Owner separation: local logical capacity vs global physical quota

P0-072 can and should implement an exact **logical namespace envelope** because receipt admissions touching the same `meta` store can count/classify rows and add the new receipt in one readwrite transaction.

P0-072 must **not** claim that this reserves browser disk quota across unrelated stores/writers.

The two controls are complementary:

- P0-072 local envelope prevents unbounded growth by policy and makes concurrent receipt count admission deterministic;
- actual IndexedDB commit is the final physical-storage truth for the write;
- P1-043 remains responsible for cross-subsystem/global byte reservation where snapshot preflight is insufficient.

No `navigator.storage.estimate()` value should be converted into a claim such as “N bytes are reserved for this receipt”.

## 4. Required capacity classes

The receipt namespace and quarantined pending stores need distinct logical classes.

### A. current-active / reconciling

Examples:

- trusted `prepared` external-effect receipt;
- `effect-admitted` receipt still reconciling;
- current pending-store work that may still make automatic progress.

This class consumes the new-operation active cap.

### B. detached unresolved / manual-resolution

Examples:

- admitted move with unknown physical outcome after reset;
- local download with retained unknown exact identity;
- stale remote outcome whose absence is not proven.

This class has a separate hard cap. It does **not** consume ordinary active capacity, but reaching its cap must not be resolved by deleting old unknown truth.

If unresolved/manual capacity is exhausted, admission of another irreversible operation that would require the same durability class fails closed until receipts are resolved/compacted through an authorized path.

### C. terminal retained

Examples with factual terminal evidence:

- `cancelled-before-start` where reset serialized before the effect-admission CAS;
- verified remote move receipt after exact factual settlement;
- proven interrupted terminal outcome where the external API itself establishes interruption.

This class uses a separate retention cap and is eligible for bounded cleanup/compaction because uncertainty no longer exists.

Age/count cleanup applies only after the receipt is already in a proven terminal class. Age never creates terminality.

## 5. No arbitrary numeric cap is selected in this research checkpoint

The architecture requires finite constants, but selecting product numbers without runtime size measurements would create false precision.

This checkpoint therefore fixes the **semantics** of the limits, not their final values:

- finite active count cap;
- finite unresolved/manual count cap;
- finite terminal-retained count cap;
- finite maximum serialized receipt envelope;
- bounded prefix scan count/work envelope;
- bounded field lengths for every path/id/error/context string.

Implementation should choose constants from measured current record sizes and existing operational ceilings, then deterministic tests must exercise exact boundary-1 / boundary / boundary+1 cases.

The existing store limits remain useful reference points, not automatic numbers for the new namespace:

- `pendingAppends` already has a 20-row / 4 MiB aggregate policy;
- local pending-download state already separates unknown from ordinary active rows;
- remote stale history already has a historical cap/TTL policy, although that policy is **not safe** for reset-detached unresolved authority.

## 6. Admission ordering under capacity pressure

For a new ReadLater external move receipt:

1. open readwrite transaction on `meta`;
2. bounded-prefix scan/classify the receipt namespace;
3. refuse if active/manual product envelope is exhausted;
4. validate the new receipt against field/record-size limits;
5. `put()` the trusted `prepared` receipt;
6. publish successful preparation only on transaction `complete`;
7. only later can the exact receipt transition through admission CAS to `effect-admitted`;
8. only after that committed transition may the non-cancellable primary move request be transmitted.

If the `put()` fails for quota/I/O/other uncaught IndexedDB error, no physical move is admitted.

This is a P0-072 fail-closed guarantee and does not depend on predicting available global quota.

## 7. Reset under quota pressure

A clear/import reset usually **updates** existing pending/receipt rows rather than creating a second copy, but adding reset-disposition metadata still increases serialized state and can encounter a real write/quota error.

Safe rule:

> never delete/evict unresolved authority merely to make a destructive reset fit.

The reset transaction already contains Journal mutation and receipt/quarantine transitions. If any required `put/update` fails, the transaction aborts and restores:

- old Journal entries;
- old pending rows;
- old `meta` receipts;
- old reset dispositions/phases.

The UI must therefore receive reset failure, not “Journal cleared” with lost recovery evidence.

A storage estimate may be used for early warning, but successful reset is defined only by transaction `oncomplete`.

## 8. Terminal cleanup may free space before new admission

When capacity is tight, one transaction may first remove or compact receipts that are **already proven terminal** and then admit a new receipt.

Allowed candidates can include, subject to the final retention policy:

- old `cancelled-before-start` receipts;
- old exact `verified` receipts whose user-visible/manual reconciliation need is already satisfied;
- proven interrupted terminal receipts.

Not allowed as automatic space-making candidates:

- `effect-admitted` unresolved;
- `unknown` / `manual-resolution`;
- remote `stale-unverified` whose external absence is not proven;
- a receipt merely because `updatedAt` is old.

If terminal cleanup is insufficient, fail the new irreversible admission. Do not silently sacrifice unresolved evidence.

## 9. `prepared` and `effect-admitted` have different restart meaning

The earlier admission-linearization design gives a useful lifecycle property.

### Persisted `prepared`

If a receipt remains `prepared` after worker/browser restart, the admission CAS did not commit. Under the required code ordering, the primary non-cancellable move was therefore not authorized to transmit.

A trusted stale `prepared` receipt can consequently be cancelled/reclaimed by a generation-exact recovery policy after confirming no newer owner superseded it. It does not need to become manual unknown merely due to worker death.

### Persisted `effect-admitted`

A crash after the admission CAS but before/during transmission is intentionally ambiguous. The request may not have left the process, may have been transmitted, or may have settled without response.

That row cannot become cancelled by age. It remains reconciling/unknown until factual remote evidence resolves it or an explicit manual abandonment policy applies.

This distinction is the main reason `prepared` and `effect-admitted` must remain separate phases.

## 10. Terminal `cancelled-before-start` is narrow proof

`cancelled-before-start` proves only that the **primary external effect guarded by this admission CAS** was not admitted after reset won the serialization order.

It must not be interpreted as proof that no auxiliary work occurred earlier. For example, folder discovery/provisioning or pure reads may have happened before target receipt preparation under their own existing owners/contracts.

P0-072 terminal cleanup therefore speaks about the physical effect represented by the receipt, not every API call in the larger user operation.

## 11. Compact terminal receipt vs unresolved receipt

The project already has a durable two-tier principle:

```text
release expensive resource != delete external outcome evidence
```

P0-072 extends it as follows:

- terminal receipts may be compacted to a smaller immutable tombstone retaining minimum effect id/kind, terminal outcome, timestamps and necessary stable identity/audit reference;
- unresolved/manual receipts retain sufficient exact identity for future reconciliation and cannot be compacted below that requirement merely for space;
- large PDF bodies, Blob URLs, import chunks and other expensive resources are independent lifecycles and need not remain pinned by a compact receipt.

This limits privacy/storage cost while preserving truthful history.

## 12. Interaction with the existing three pending stores

The same semantic classes apply to in-place quarantine without forcing one universal storage layout.

### `pendingAppends`

Reset-detached rows never re-enter ordinary replay. Since they represent local metadata rather than a continuing browser/network action, implementation can classify whether a compact terminal/manual receipt is sufficient instead of keeping rich metadata indefinitely.

### `pendingDownloads`

Existing P0-039 unknown/manual behavior is a positive control. Exact DownloadItem reconciliation may continue for detached reconciling rows. Blob/resource release remains separate. Unknown rows are not age-cleaned into cancellation.

### `pendingRemoteSaves`

Generic `stale-unverified` TTL/max-count cleanup must exclude reset-detached unresolved/manual rows. Terminal verified receipts may enter a separate terminal retention/compaction policy.

## 13. Deterministic model

New durable model:

`project_tools/test_p0_072_receipt_capacity_cleanup_model.js`

Local Node execution before GitHub write:

```text
P0-072 receipt capacity/cleanup model: PASS
```

The model intentionally uses configurable limits rather than pretending research already selected production constants.

It proves:

1. active-cap exhaustion blocks creation of another prepared receipt before external effect admission;
2. unresolved/manual-cap pressure does not silently evict the existing unknown receipt;
3. terminal cleanup removes only already-terminal classes and preserves manual unknown evidence;
4. simulated quota abort restores Journal deletion and reset disposition together;
5. persisted `prepared` is distinct from admitted state;
6. persisted `effect-admitted` remains nonterminal uncertainty;
7. oversized receipt is rejected before admission.

This is L2 architecture evidence, not current runtime implementation proof.

## 14. Required implementation acceptance additions

Add to the P0-072 regression contract:

- exact receipt admission count cap is checked and `put()` occurs in one `meta` readwrite transaction;
- two concurrent admissions at boundary cannot both pass a one-slot remaining logical cap;
- receipt record/field bounds are checked before write;
- `QuotaExceededError`/write abort before effect admission produces no external-effect start;
- reset write/quota failure leaves Journal and every receipt/pending state unchanged;
- cleanup cannot select unresolved/manual rows based on age or count pressure;
- proven terminal cleanup/compaction can restore terminal capacity without touching unresolved rows;
- boundary tests cover configured `N-1`, `N`, `N+1` counts and maximum-record-size edges;
- no test or evidence claims `navigator.storage.estimate()` reserves space;
- P1-043 remains ACTIVE unless its global reservation acceptance is separately implemented/proved.

## 15. Current conclusion

The namespaced `meta` architecture remains viable without a DB version bump, but only under a strict logical capacity envelope and transaction-first truth semantics.

The strongest rule is:

> policy cap can reject before admission; actual IndexedDB commit proves durable local authority; actual transaction abort prevents the external effect/reset from being declared admitted/successful; unresolved external truth is never evicted merely to create capacity.

P0-072 remains **ACTIVE**. Runtime remains unchanged. Manifest remains `0.9.8`; release remains `NOT READY`.

Next useful block: concrete source-level implementation decomposition for `service-worker.js` — minimal helpers, reset transaction changes, append/download/remote writer fencing, namespaced receipt API, and deterministic runtime-test seams — while keeping P1-043/P0-076/P1-183 dependencies explicit and out of false closure.
