# P0-079 — atomic sealed PDF-cache writer refinement — 2026-09-06

Date: 2026-09-06  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Parent branch: `research/p0-079-operation-owned-pdf-cache-2026-09-06`  
Owner: **P0-079 ACTIVE**.

This checkpoint refines the create-once/sealed part of P0-079. Production runtime is unchanged.

## 1. Fresh source proof: current writer is transactional but replace-capable

Current `putCachedPdf()` writes PDF payload and metadata in one IndexedDB readwrite transaction, which is a useful positive control for cross-store consistency.

However it uses:

```text
PDF_CACHE_STORE.put(normalizedRecord)
PDF_CACHE_META_STORE.put(metadata)
```

`put()` is replace-capable. Therefore changing the key format from mutable `tab:<id>` to an operation-owned `op:<generation>` key is not sufficient by itself: a second writer with the same generation can still replace the first generation's bytes and metadata.

P0-079 requires the byte generation itself to become immutable after creation.

## 2. Required create-once boundary

For a newly issued PDF cache generation G, the authoritative creation transaction should have create-once semantics across both stores.

Conceptually:

```text
transaction(PDF_CACHE_STORE, PDF_CACHE_META_STORE, readwrite)
  assert neither exact G record already exists
  create payload G
  create metadata G
commit
```

A straightforward IndexedDB representation is `add()` for both exact primary keys so duplicate creation aborts rather than replaces. An explicit get+compare/create state machine is also possible, but the decision and both writes must remain in one transaction.

The implementation must not perform:

```text
read outside transaction
-> decide key absent
-> later put inside transaction
```

because two concurrent writers can both observe absence before either commit.

## 3. Unknown local commit is reconciliation, not blind rewrite

A bounded IndexedDB caller can time out locally while the actual transaction later commits. P0-079 must compose with existing late-settlement semantics.

If create(G) returns unknown to its caller:

```text
do not retry by put(G, bytes)
```

Instead reconcile exact G:

```text
read payload G + metadata G after actual/local barrier permits
if exact sealed receipt matches expected generation/size/integrity metadata:
  adopt committed G
else if G authoritatively absent:
  a new create attempt may be admitted according to operation ownership
else:
  fail closed/manual corruption-conflict
```

The purpose is to prevent an uncertain first create from becoming a second overwrite-capable write.

## 4. Duplicate exact generation cases

### Existing G with different byte identity

Always conflict/fail closed. Never replace.

### Existing G with same byte length only

Still insufficient. Same size is not byte identity.

### Existing G with exact durable integrity receipt

If a future design stores a strong digest/receipt and proves the existing sealed record is exactly the expected committed generation, an idempotent caller may adopt it without rewriting.

P0-079 does not require content-addressing, but any idempotent adoption must prove exact generation + integrity, not merely key + size.

## 5. Cross-store corruption rule

Because payload and metadata represent one sealed generation, these states are invalid:

```text
payload G exists, metadata G missing
metadata G exists, payload G missing
payload generation != metadata generation
sealed/integrity metadata disagree
```

Normal upload/retry must fail closed on such a state. It must not reconstruct missing authority from the tab index or another current record.

Repair/cleanup may remove an orphaned corrupt generation under a dedicated bounded maintenance rule, but must not silently convert it into a valid retry object.

## 6. Tab index ordering

If an optional `tab -> latest generation` pointer is maintained, generation creation and pointer publication are distinct semantic steps.

Safe order:

```text
1. create sealed generation G completely
2. only after committed G exists, publish/move tab pointer to G
```

The tab pointer must never advertise a generation whose payload transaction is still unknown/uncommitted.

If pointer publication fails after G commits, G remains a valid exact operation-owned object; UI/latest discovery can reconcile the pointer separately.

Late cleanup of an older generation A clears the pointer only by compare-and-remove if it still points to A.

## 7. Offscreen read implication

Offscreen transfer must treat `sealed` as a validated invariant, not merely a Boolean string somewhere in source.

Before Blob construction/network transfer it should prove, from the exact record/metadata pair:

- exact requested generation;
- complete cross-store generation match;
- sealed/committed state;
- exact expected byte size;
- any required integrity receipt.

No fallback to latest/tab alias is allowed on missing/corrupt exact G.

## 8. Acceptance additions

Future P0-079 closure should include deterministic cases:

1. two concurrent create attempts for the same G with different bytes -> exactly one may commit; the other conflicts, never overwrites;
2. a late/unknown first create followed by reconciliation -> exact existing G is adopted without rewrite;
3. duplicate key with same size but different integrity -> conflict;
4. payload-only or metadata-only G -> fail closed for upload/retry;
5. tab pointer is never published before sealed G commit;
6. failed pointer publication cannot invalidate already committed exact G;
7. ordinary creation path contains no replace-capable `put()` for an already-issued sealed generation unless guarded by an in-transaction exact CAS that proves no semantic change.

## 9. Owner boundaries

P0-079 owns create-once sealed byte-object semantics and exact generation read/delete/transfer.

P1-198 owns trusted live operation identity used to issue/authorize generation G.

P0-023/P0-070 own source-document/full-save authority that says which document generation the bytes represent.

P1-194 owns stronger durability/eviction guarantees.

Existing generic IndexedDB timeout/late-settlement mechanisms remain infrastructure; P0-079 only constrains how an uncertain cache creation is reconciled.

## 10. Status

P0-079 remains **ACTIVE**. Current source still uses replace-capable `put()` and mutable tab identity; this checkpoint changes no runtime.

Runtime/manifest remain `0.9.8`; release remains `NOT READY`.
