# WebClip — Wave 1 / P0-079 PDF-cache v4 source gate and physical closure contract — 2026-09-09

Date: 2026-09-09  
Canonical baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Research branch: `research/wave1-implementation-readiness-2026-09-09`  
Owner: **P0-079 ACTIVE**  
Adjacent mandatory composition: P0-023, P0-070, P0-080, P1-198, P1-184, P1-194 and offscreen/IndexedDB lifecycle controls.  
Mode: **RESEARCH-ONLY**.

This file defines what the first Wave 1 production tranche must prove. It does not implement or close P0-079.

## 1. Why a separate closure contract is needed

The existing P0-079 research already proves the root cause:

```text
one mutable tab:<id> PDF slot
-> later save may replace earlier bytes
-> offscreen may upload replacement bytes through an older signed capability
-> late cleanup may delete a newer retry generation
```

The Wave 1 readiness tranche adds rollout constraints that must be part of the first implementation rather than later cleanup:

```text
shared worker/offscreen DB version
v3 legacy behavior
create-once transaction
retry-index publication
one-pass N/H receipt
offscreen exact-generation validation
restart/unknown local settlement
```

A code change that only renames `tab:<id>` to `pdf:<uuid>` is therefore insufficient.

## 2. Current source classification

Canonical current source is intentionally RED for the target contract:

```text
PDF_CACHE_DB_VERSION = 3 in service-worker.js
PDF_CACHE_DB_VERSION = 3 in offscreen.js
physical key = tab:<id>
payload/meta creation = put() / replace-capable
no dedicated retryIndex store
live retry = tabId + current URL
signed offscreen transfer can consume cached.key || pdfCacheKey(tabId)
no exact PDF generation G in transfer receipt
no expected SHA-256 H in transfer receipt
```

Positive controls to preserve:

- payload and metadata are already written in one IDB transaction;
- exact-key helper reads/deletes already exist in part;
- both worker and offscreen close DB connections on `versionchange`;
- offscreen transfer capacity remains bounded by existing reservation logic;
- PDF size limit and streaming Chromium read already exist;
- P0-065 offscreen Blob admission guard remains in front of runtime bootstrap.

## 3. Research source gate

Committed gate:

```text
project_tools/test_wave1_p0_079_v4_source_contract.js
```

The gate is designed to become GREEN only when source visibly proves the Wave 1 v4 invariants.

It checks:

1. worker/offscreen PDF DB versions are equal;
2. version is at least 4;
3. dedicated retry-index authority exists;
4. physical byte identity is no longer `tab:<id>`;
5. explicit PDF generation receipt exists;
6. SHA-256/sealed receipt is visible;
7. payload/meta creation is create-once or equivalent exact conflict-protected CAS;
8. retry index participates in generation publication;
9. legacy v3 rows have fail-closed/unbound semantics;
10. current live retry consumes document/source authority rather than only tabId;
11. Yandex upload carries exact generation + N + H;
12. mutable tab-key fallback is absent;
13. offscreen validates exact generation + N + H + sealed state;
14. offscreen has no tab/latest fallback;
15. exact-generation delete exists;
16. stale cleanup visibly protects a newer pointer by compare-and-remove semantics.

`node --check` on the committed gate source: **PASS**.

Functional gate PASS is not claimed on current production source; current source inspection already proves it is RED by design.

## 4. Two different notions of GREEN

Do not collapse these states.

### Tranche source GREEN

Means the first production patch visibly contains the target v4 mechanisms and deterministic tests pass.

### P0-079 DONE

Requires the Registry owner's full contract:

```text
PDF bytes used for upload/retry are immutable operation-owned generations
```

That includes trusted operation ownership. If P1-198 worker-issued physical operation identity is not yet implemented, P0-079 may have a mechanically correct v4 byte store but still remain ACTIVE for its final `operation-owned` claim.

Likewise source-aware live retry composes with P0-023/P0-070/P0-080; a v4 store alone does not close those owners.

## 5. Minimal production tranche boundary

Recommended first production tranche should touch only the smallest runtime surfaces required for v4 storage mechanics:

```text
service-worker.js
offscreen.js
shared pure helper only if needed
production tests/source gates
```

Avoid combining it with broad Yandex auth/publication/Journal rewrites in one patch.

The tranche should establish:

```text
v4 schema
+ exact generation storage
+ exact offscreen transfer input validation
+ safe legacy behavior
+ exact cleanup semantics
```

It may carry provisional source/owner fields without claiming their upstream owner closure.

## 6. DB v4 migration acceptance matrix

### M01 — fresh profile / no existing DB

Expected:

```text
open v4
create pdfs/meta/retryIndex
new G commit succeeds
```

Evidence: objectStoreNames, exact version=4, one payload/meta/index tuple.

### M02 — existing v3 with one legacy tab row

Pre-state:

```text
pdfs['tab:7'] = old Blob
meta['tab:7'] = v3 metadata
```

Upgrade expectation:

```text
v4 retryIndex store created
old rows remain untouched
no pdf:<G> copy synthesized
no retryIndex[7] trusted pointer synthesized
```

Result classification for old row: `legacy-unbound`.

### M03 — existing v3 with near-limit 48 MiB Blob

Upgrade must not copy/re-hash the Blob merely to change schema.

Acceptance:

```text
upgrade duration/memory does not scale with rewriting every legacy PDF payload
```

No O(total legacy PDF bytes) migration requirement should be introduced.

### M04 — offscreen has old v3 connection open during upgrade

Expected:

```text
worker attempts v4 upgrade
offscreen receives versionchange
old connection closes
upgrade proceeds
new offscreen reopen requests v4
```

No permanent blocked upgrade.

### M05 — worker has old connection open while offscreen initiates v4 open

Symmetric expectation: versionchange closes old connection and both converge on v4.

### M06 — stale code path attempts version 3 after database reached 4

Expected platform behavior is failure, not downgrade. The product-level source gate prevents shipping this mixed-version state by requiring the same constant in both contexts.

## 7. Create-once transaction matrix

### C01 — normal new generation

```text
G-A absent
-> pdfs.add(G-A)
-> meta.add(G-A)
-> retryIndex.put(tab7 -> G-A)
-> tx complete
```

All three become visible together after commit.

### C02 — duplicate G with different bytes

Expected:

```text
Constraint/conflict
zero overwrite
old payload/meta remain
pointer does not move because transaction aborts
```

### C03 — duplicate G with same byte length but different digest

Same as C02. Size is not identity.

### C04 — caller deadline expires before actual transaction settlement

Expected:

```text
caller outcome unknown
actual transaction retains ownership
no immediate put(G) retry
later reconcile exact G
```

If G exists exactly, adopt without rewrite.

### C05 — quota error after transaction begins

Expected transaction abort; payload/meta/index all roll back and there is no dangling retry pointer.

### C06 — pointer publication problem

Because pointer is in the same transaction, failure to write pointer aborts creation rather than exposing a partial current-live-retry state. A different transaction split would need an equally strong recovery contract.

## 8. Same-tab concurrency matrix

### R01 — A then B

```text
A -> G-A -> pointer A
B -> G-B -> pointer B
```

Expected:

```text
G-A exists
G-B exists
pointer -> G-B
```

### R02 — late A delete after B

Expected:

```text
delete G-A only
pointer comparison sees B
pointer preserved
G-B preserved
```

### R03 — TTL cleanup A after B

Same outcome as R02.

### R04 — offscreen A transfer after B became current

Signed A transfer receives exact `pdf:G-A` and must read/send A. It must not consult `retryIndex[tab]` at transfer time.

### R05 — missing G-A while pointer B exists

A transfer/recovery fails/defer for missing exact A. It never substitutes B.

## 9. Live retry matrix

The first v4 tranche may expose storage plumbing before P0-023/P0-070 closure, but final live-retry acceptance must cover:

### L01 exact same source

```text
retryIndex -> G-A
G-A source receipt S-A
current trusted source S-A
-> may consume G-A
```

### L02 same URL / new browser document

```text
S-A.documentId != S-B.documentId
URL equal
-> stale-source
```

### L03 same browser document / newer SPA generation

`applicationGeneration` changed -> stale-source.

### L04 selection revision changed

`selectionRevision` changed -> stale-source.

### L05 legacy `tab:<id>` row

`legacy-unbound`; do not upgrade authority from current page state.

## 10. One-pass PDF digest matrix

### D01 exact stream digest

Collect physical Chromium PDF using existing `ReturnAsStream`.

Record:

```text
G
N
digest H computed incrementally during IO.read
retained physical PDF file
independent SHA-256 of retained file
```

Require both H values equal.

### D02 arbitrary chunk boundaries

Digest must be independent of IO.read chunk boundaries. Deterministic readiness model already proves this property; physical case confirms integration.

### D03 render failure after partial chunks

Partial digest is discarded. No sealed generation.

### D04 clean stream but guard/source fence fails

Returned bytes/digest are discarded before sealing.

### D05 near MAX_PDF_BYTES

Prove one-pass digest does not add another full-size PDF materialization beyond the existing Blob assembly pattern. Capture memory/size/deadline evidence appropriate to existing limits.

## 11. Offscreen exact-transfer matrix

### O01 exact G/N/H

Offscreen reads exact G payload + metadata in one readonly transaction and validates G/N/H/sealed. Then transfer may start.

### O02 generation mismatch

Fail before network fetch.

### O03 metadata byte length mismatch

Fail before network fetch.

### O04 actual Blob size mismatch

Fail before network fetch.

### O05 SHA metadata mismatch against expected H

Fail before network fetch.

### O06 payload missing / metadata present

Fail closed; no reconstruction from retry index.

### O07 metadata missing / payload present

Fail closed.

### O08 tab/latest fallback negative control

Delete/miss exact G while another same-tab generation exists. Offscreen must not fetch/send the newer generation.

## 12. Update/restart matrix

### U01 worker restart after sealed G commit

New worker can reopen exact G and preserve pointer/object semantics.

### U02 offscreen closes/reopens

New offscreen reads v4 and exact G without reliance on prior memory.

### U03 extension/service-worker restart while transfer pending

Transfer result remains governed by destination side-effect owner. PDF identity G remains exact; restart must not regenerate/reselect latest bytes.

### U04 upgrade with legacy rows and current v4 generation

After update:

```text
legacy rows remain unbound
new v4 rows work normally
cleanup can remove each according to its own exact key/type semantics
```

## 13. Storage-pressure interactions

P0-079 does not itself close P1-194 durability/eviction guarantees.

The v4 design must nonetheless avoid making storage pressure less truthful.

Required negative rules:

```text
missing exact G due eviction != use latest G-B
missing G != rerender current tab automatically
pointer without payload != valid retry
payload without metadata != valid retry
```

If quota/eviction makes exact generation unavailable, return truthful unavailable/expired/manual outcome according to the owning flow.

## 14. Evidence receipt for physical P0-079 tranche

A physical closure evidence record should contain at least:

```text
canonical/implementation commit SHA
Chrome exact version/channel
extension manifest version (informational, no release implied)
PDF DB old/new version
fixture identifiers
legacy seed rows and sizes
new G identifiers
source receipt identifiers where applicable
N/H for retained PDFs
pointer state before/after races
worker/offscreen restart points
gate/test commands + exact PASS outputs
retained artifact SHA-256 where physical PDFs are used
```

Do not commit bearer capabilities or user-sensitive page content.

## 15. P0-079 source GREEN conditions

The Wave 1 gate can be GREEN when production source visibly satisfies its checks and deterministic regression passes. That is necessary but not sufficient for P0-079 DONE.

## 16. P0-079 physical closure conditions

At minimum, physical/current-Chrome evidence should prove:

```text
v3 -> v4 upgrade
same-tab A/B independence
late A cleanup safety
exact offscreen A-after-B transfer
worker/offscreen restart persistence
same-version reopen
near-limit PDF path
legacy row remains unbound
```

## 17. P0-079 dependency closure condition

The word `operation-owned` in the Registry must be mechanically grounded.

Therefore final P0-079 DONE should consume a trusted worker/domain ownership primitive, not caller textual `operationId`.

If P1-198 remains unimplemented at the time v4 storage mechanics land:

```text
P0-079 implementation may be PARTIAL/production-progress
P0-079 Registry status remains ACTIVE
```

until ownership is genuinely worker-issued/bound.

## 18. Change Impact scope after implementation

The first v4 storage tranche should trigger targeted Change Impact for at least:

```text
PDF retry/cache identity
Yandex signed offscreen transfer
worker/offscreen IndexedDB lifecycle
retry UI availability
storage cleanup/TTL
restart recovery
large PDF memory/budget behavior
```

It should not mechanically reopen unrelated C01…C46 cells.

## 19. No production authorization from this document

This closure contract defines the gate; it does not authorize a production patch.

No runtime, Registry, manifest, release, build, tag or deployment is changed here.

## 20. Research conclusion

The first Wave 1 implementation tranche is now bounded enough to be evaluated mechanically rather than by code-review intuition.

Current truthful state:

```text
P0-079 root cause = RESEARCHED
PDF-cache v4 target = DEFINED
migration contract = DEFINED
source gate = PRESENT / EXPECTED RED ON CURRENT MAIN
physical closure matrix = DEFINED
production implementation = NOT STARTED BY THIS RESEARCH
P0-079 = ACTIVE
release = NOT READY
```

No new P-code is required.
