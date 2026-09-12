# Research evidence — P0-079 operation-owned PDF cache generation revalidation — 2026-09-13

Canonical baseline: `main` at `e8f4b325344eead1b646ff860e9fb243dfe7ed66`.

Research-only tranche. Production runtime, `manifest.json`, workflows, build/tag/deploy/release state and release-readiness state are unchanged.

## Result

**P0-079 remains ACTIVE / ROOT-CAUSE-REVALIDATED.**

Current source still makes one mutable per-tab PDF cache row (`tab:<id>`) authoritative for later Yandex upload/retry byte dereference. The existing source URL/document-generation guards prevent many cross-navigation mistakes, and exact byte-size checks detect different-size replacement, but they cannot distinguish two different PDF byte strings of the same size produced by concurrent or overlapping operations in the same tab and same browser document generation.

The critical failure schedule is therefore still possible at the local upload-byte identity boundary:

1. operation A materializes PDF bytes A and writes the shared cache row `tab:7`; A captures metadata including that key and A's byte length;
2. before A's signed transfer dereferences the cache bytes, operation B in the same tab/document writes PDF bytes B to the same `tab:7` row;
3. A later dereferences the captured key, which now returns B;
4. if `size(A) == size(B)`, the current expected-size check passes;
5. the later exact remote-size check also passes;
6. A can therefore finalize using A's operation/Journal metadata while the physical uploaded bytes came from B.

This is an identity defect, not merely a size-validation defect. `expectedPdfBytes` is necessary but cannot prove content identity.

## Canonical owner / duplicate reconciliation

`RESEARCH_REGISTRY.md` on the baseline identifies the single current owner as:

> P0-079 ACTIVE — PDF bytes used for Yandex upload/retry must be immutable **operation-owned** cache generations, not one mutable `tab:<id>` slot.

No new P-code is created. The current mechanism reproduces the existing P0-079 root cause already represented in `RESEARCH_FAMILY_YANDEX_REMOTE_IDENTITY_EVIDENCE.md`, including historical evidence around immutable local PDF byte generation, Journal replacement/recovery and signed-transfer identity.

Adjacent owners remain distinct:

- **P0-079** owns exact local PDF byte-generation authority for Yandex upload/retry;
- **P1-184** owns proof that the resulting remote object/content is the exact intended object/content;
- **P0-072** owns survival/reconciliation of already admitted external side effects across bulk reset/replacement;
- **P0-070/P0-080** own broader document/application generation authority and must not be used as substitutes for immutable local byte identity.

## Fresh exact-source proof

All observations below were revalidated against `service-worker.js` / `offscreen.js` on exact baseline `e8f4b325344eead1b646ff860e9fb243dfe7ed66`.

### 1. Cache authority is one mutable row per tab

`pdfCacheKey(tabId)` returns `tab:${tabId}`. `getCachedPdf(tabId)` reads exactly that key.

Both cached-write paths converge on the same key:

- inline/base64 PDF cache writes create an item with `key: pdfCacheKey(tabId)` and store it with `put`;
- Blob/offscreen cache preparation also supplies `key: pdfCacheKey(tabId)` before the offscreen write commits the bytes.

There is no operation id or immutable cache-generation id in the key.

### 2. Existing URL/document-generation guard is useful but not operation identity

`getValidCachedPdfForTab(tabId, expectedSourceUrl, expectedSourceDocumentId)` rejects stale TTL, URL mismatch and browser `documentId` mismatch. This is an important negative control, but two operations in the same tab and same document generation intentionally share those values and therefore both resolve the same mutable cache slot.

### 3. Upload captures metadata, then later dereferences the shared key

The Yandex upload path first materializes/captures a cached record and later invokes the signed-transfer path using that cached record's key and expected byte length.

The offscreen transfer reads the record later by `cacheKey` from IndexedDB. Because the key is tab-scoped rather than operation-scoped, the bytes can have been replaced between capture and dereference.

### 4. Signed-transfer validation proves size, not local generation/content

Before the signed upload, the offscreen path requires the stored Blob size to equal the captured `expectedBytes`. The service worker later also checks remote type and exact byte size.

These checks correctly reject a different-size overwrite. They do not reject a same-size different-content overwrite.

### 5. Retry authority is also the current mutable row

Retry retrieves `getValidCachedPdfForTab(...)`. Therefore a retry is authorized by whichever PDF row is currently stored at the tab key, subject to URL/document checks, rather than an immutable byte generation owned by the failed operation.

### 6. Cleanup is tab-scoped

`deleteCachedPdf(tabId)` deletes the mutable `tab:<id>` row. A late cleanup from operation A cannot name only A's cache generation; after B has overwritten the shared row, the same cleanup authority can remove B's newer retry bytes.

## Deterministic model

Added model:

`project_tools/test_p0_079_operation_owned_pdf_cache_model.js`

Local verification:

- Node: current project/tooling runtime;
- `node --check`: PASS;
- deterministic execution: **PASS 59 checks**;
- SHA-256: `381944a8e8596e2c0395e9c9457cda2cb48eda78ce25777485813631e4e74db1`;
- Git blob: `62497c92b7a06b3c745ea7d21e917a5883d77112`.

### Current-source failure controls reproduced

The model proves:

1. A and B can have different content with exactly the same byte length;
2. A writes `tab:7`, B overwrites the same key in the same URL/document generation;
3. the current same-document guard accepts B;
4. A's later upload dereference physically reads B;
5. same-size substitution passes A's expected-size guard;
6. different-size overwrite is detected, but A's exact bytes have already been lost from the shared slot;
7. late A cleanup deletes B's current shared row;
8. retry resolves B as the latest same-tab/same-document row;
9. different URL, different document generation and different tab remain valid negative controls.

### Candidate acceptance controls

The model also demonstrates a bounded research acceptance shape, without selecting the final runtime architecture:

- immutable operation-owned cache key/generation;
- durable receipt containing operation owner, exact cache generation, byte length and SHA-256 digest;
- exact read rejects owner/generation mismatch;
- same-size A/B remain separately addressable and digest-distinguishable;
- same-size tampering fails digest validation rather than relying on size;
- exact A cleanup cannot delete B;
- restart snapshot/recovery can recover the exact operation-owned bytes and receipt;
- `prepared` and `admitted-unknown` generations are retained while terminal generations may be garbage-collected;
- remote-save checkpoint can carry the exact local cache generation/content receipt instead of only a tab locator + byte count.

The candidate key syntax used by the model is illustrative only and is **not** an accepted implementation design.

## Required invariant

> Every Yandex upload/retry operation must dereference PDF bytes through an immutable durable cache generation owned by that exact operation. A tab-scoped mutable cache key cannot be final upload authority. Retry, recovery and cleanup must target the exact generation; same-size replacement must not be able to substitute bytes.

A strong receipt should bind, as applicable:

- operation id;
- immutable local cache generation/key;
- exact byte length;
- strong content digest (or an equivalently strong immutable content identity);
- source tab/document/application generation needed by the owning save contract;
- filename/source metadata used only as metadata, not byte identity;
- Yandex account/root/config/publication operation context where the receipt crosses into remote side effects;
- durable phase sufficient to distinguish prepared/cancellable work from admitted/unknown external side effects.

## Interaction with admitted/unknown upload side effects

P0-079 must compose with P0-072 rather than weaken it. Once a signed upload may have been admitted, local caller timeout or Journal/reset cleanup is not proof that the external transfer did not settle. The exact operation-owned local-byte receipt therefore cannot be discarded merely because a mutable Journal or tab cache is replaced; it must remain reconcilable until a terminal outcome or bounded/manual-resolution state is durably known.

This evidence does not claim that a local SHA-256 alone proves remote content. Remote exact-object/content proof remains P1-184.

## External protocol context

Fresh official Yandex Disk documentation continues to describe the REST API as providing upload access to remote Yandex storage. This supports treating the signed upload as an external side effect whose local byte source must remain exact and durable; the protocol documentation is not used here to infer a server-side content digest guarantee.

Reference: `https://yandex.com/dev/disk/` (checked 2026-09-13).

## Closure evidence still required

P0-079 must remain ACTIVE until an implementation tranche proves at least:

1. exact-source operation-owned immutable cache generations for every Yandex upload/retry byte dereference;
2. deterministic exact-source races for same-size different-content A/B substitution;
3. concurrent same-tab/same-document save/retry isolation;
4. different-size overwrite behavior without losing the owning operation's retry generation prematurely;
5. late cleanup isolation (A cannot remove B);
6. worker restart/crash recovery preserving exact cache receipt and bytes for nonterminal operations;
7. composition with P0-072 for admitted/unknown signed transfers and bounded/manual-resolution retention;
8. exact remote checkpoint linkage to the local byte-generation receipt;
9. authorized isolated Yandex L5 evidence demonstrating exact intended content/object through retry/race/unknown-settlement schedules, together with P1-184 remote proof;
10. exact-head Repository Integrity plus post-merge Repository Integrity on the implementation commit.

## Classification

- current status: **ACTIVE / ROOT-CAUSE-REVALIDATED**;
- deterministic research coverage: **PASS 59 checks**;
- real Yandex L5 closure: **not claimed**;
- implementation: **not changed by this tranche**;
- build/tag/deploy/release: **not authorized and not performed**;
- release readiness: **unchanged / NOT READY**.
