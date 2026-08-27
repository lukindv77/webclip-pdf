# Audit delta — live operationId provenance / collision — 2026-08-27

Baseline HEAD before this audit block: `73cccba395cfe2760162016c225bbd110f2118a0`.

Docs-only audit checkpoint. Production runtime and `manifest.json` are unchanged. Canonical large-table synchronization is not claimed.

## New confirmed item: P1-198 — live content caller chooses OperationLog identity

**Classification:** P1 / evidence-reserved / confirmed by fresh runtime audit.

This root cause is distinct from:

- `P0-030`: content payload schema/size/tab-URL validation;
- `P1-148`: storing an operationId on a live Journal entry and opening the exact textual log id;
- `P1-190`: imported/foreign operationId provenance;
- `P1-197`: OperationLog history epoch around administrative clear/retention.

The missing invariant is **live operation identity issuance/ownership**: a content caller currently chooses the textual key used as the authoritative identity of a new OperationLog operation.

## Exact runtime proof

### 1. Content message handlers accept caller-provided operationId

Content-allowed save/retry handlers pass `message.operationId` through `normalizeOperationIdInput()` into worker operations:

- `WEBCLIP_GENERATE_PDF`;
- `WEBCLIP_SEND_PDF_TO_YANDEX`;
- `WEBCLIP_RETRY_PDF_TO_YANDEX`;
- `WEBCLIP_DOWNLOAD_CACHED_PDF`.

`normalizeOperationIdInput()` validates only:

- non-empty optional string;
- maximum length;
- `[A-Za-z0-9._:-]+` syntax.

It does not prove the id was issued by this service worker, is unused, belongs to this sender tab/document, or belongs to this operation kind/generation.

Current normal `content.js` generates a random UUID, so ordinary collision probability is negligible. But the project trust model already treats content-side payloads as untrusted at the worker boundary (`P0-030`); correctness/security therefore cannot depend on a caller voluntarily choosing a fresh random key.

### 2. Existing log key is silently reused rather than rejected

`startOperationLog(operationId, type, title, meta)` queues by the supplied textual id and mutates whichever record already has that key.

On an existing record it:

- sets/replaces `type`;
- sets/replaces `title`/description;
- sets `status = 'running'`;
- merges new meta into existing meta;
- preserves/continues the existing event history.

There is no `operation already exists` fail-closed check and no immutable operation-generation owner stored with the log.

Therefore a second live operation using textual id X does not create a separate operation — it joins/rewrites X.

### 3. Terminal status can belong to the wrong physical operation

After two physical operations share X, whichever calls `finishOperationLog(X, ...)` can mark the shared log success/error while the other operation is still running or later append more events.

The resulting timeline/status is not a truthful history of either operation. Per-id Promise serialization prevents transaction races but does not provide ownership isolation.

### 4. P1-148 exact Journal linkage becomes semantically false

Live Journal entries store the supplied operationId as their exact source operation link.

If two live operations collide on X, both entries/checkpoints can legitimately persist X. `Показать лог` then resolves both to the same merged/mutated record even though the physical save operations were different.

Thus syntactic exactness of `operationId` is not sufficient provenance.

### 5. P1-197 history epoch is necessary but not sufficient

A durable OperationLog history epoch prevents **old-generation writers after clear** from resurrecting history. It does not distinguish two live operations admitted in the same history epoch that intentionally reuse the same textual id.

P1-198 therefore needs a per-operation locally issued receipt/nonce orthogonal to the global history epoch.

### 6. Progress identity is also textual

Multiple progress/timeline paths carry only operationId as the correlation token. A collision can cause consumers that accept a matching id to associate stages with the wrong physical operation.

This pass did not find operationId itself used as the primary key of destructive Yandex/local checkpoints, so the confirmed classification remains P1 forensic/progress/provenance integrity rather than P0 remote-data authority.

## Required P1-198 contract

### Worker-issued operation receipt

For privileged/live operations originating from content, the service worker must own identity issuance.

Acceptable shapes include:

- caller requests `begin operation` and receives a cryptographically random worker-issued receipt bound to sender tab/document + operation kind + generation; or
- first privileged message carries a caller correlation label but worker creates a distinct authoritative operation key/nonce and returns it.

Do not use an untrusted content string directly as the authoritative OperationLog/checkpoint provenance key.

### Immutable ownership

A live receipt must bind at least:

- local installation/history namespace as required by P1-197;
- unique operation nonce/generation;
- admitted operation type/kind;
- source tab and exact document/navigation generation where applicable;
- optional caller correlation/display id separately from authoritative identity.

Starting another physical operation with an already-owned receipt must fail closed or explicitly resume the exact same idempotent operation state; it must never silently rewrite the existing log header/type/meta.

### Journal linkage

P1-148 should link a new Journal entry to the exact worker-issued live operation receipt. The human-readable operationId may remain visible/exportable, but the trusted linkage must include the local provenance/namespace needed to distinguish collisions and imports.

Imported historical ids remain P1-190 `imported-unverified` and cannot become live receipts.

### OperationLog writer key

Combine the P1-197 history epoch with the P1-198 operation nonce/generation. A robust conceptual identity is:

`(historyEpoch, operationNonce)`

with a separate display/correlation id if desired.

Do not key authorization solely by a textual id supplied across the content trust boundary.

## Required deterministic regressions

1. Content caller proposes operationId X that already belongs to completed operation A: B cannot reopen/rewrite A as `running`.
2. A and B deliberately propose the same textual X: they receive distinct authoritative receipts/logs or B is explicitly rejected.
3. A remains running while B finishes: B cannot mark A's log terminal.
4. Two Journal entries from A/B cannot both link to one merged log merely because caller strings collide.
5. A stale/imported `operationId` equal to a current local display id cannot acquire the current live receipt/namespace.
6. Administrative clear advances P1-197 history epoch; late old receipt remains invalid even if its display id is reused by a new operation.
7. Exact document navigation invalidates a content operation receipt where the operation requires current-document authority.
8. Normal current content flow still gets a stable operation id/receipt usable by progress UI, recovery diagnostics and Journal `Показать лог`.

## Classification / numbering

- New evidence-reserved `P1-198` assigned by this audit block.
- `P0-079` remains evidence-reserved and separate (PDF byte-cache operation ownership).
- Existing evidence-reserved `P1-195`, `P1-196`, `P1-197` remain separate.
- `P2-020` remains free.

Previous product test gate was not re-run by this docs-only checkpoint.
