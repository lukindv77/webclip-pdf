# P0-048 closure evidence — unambiguous local-download fallback identity — 2026-09-01

Canonical P-code owner/status authority remains `project_docs/RESEARCH_REGISTRY.md`.

## Scope

Owner: **P0-048 — Local-download fallback identity is ambiguous; one physical `downloadId` cannot be heuristically claimed/overwritten by multiple intents.**

Fresh implementation baseline: `main = 7d839d86e29d88c1ae6b7dbcdefb40ebcec127df`.

This tranche is deliberately limited to durable identity selection/binding for automatic local-download recovery. It does not claim to solve browser-side non-cancellable start settlement, exact final PDF content receipt, or broader source-document generation authority.

## Pre-fix failure condition

Current recovery persisted an intent before `chrome.downloads.download()` and preferred exact Blob URL matching. That was a strong positive control, but when Chrome no longer exposed the Blob URL the fallback used `filename + exact byte count` inside a young bounded time window and selected the first extension-owned matching `DownloadItem` with `.find(...)`.

Therefore two distinct live intents with the same target filename and expected byte length could both consider the same physical candidate eligible. Separately, `bindPendingLocalDownloadIntent(intentKey, downloadId)` deleted the string intent and performed `put(bound)` at the numeric key without checking whether that `downloadId` was already durably owned by another operation. A later heuristic bind could overwrite the earlier checkpoint.

Historical source-first evidence in `RESEARCH_PDF_BYTE_TRANSFER_RECEIPT_2026-08-30_EVIDENCE.md` already assigned this ambiguity to P0-048 and explicitly preserved exact Blob URL as the stronger primary identity.

## Implementation

### 1. Pure bounded identity classifier

`local-download-identity.js` introduces `WebClipLocalDownloadIdentity.chooseUniqueDownloadForIntent()`.

The classifier keeps exact Blob URL as primary identity:

- exactly one candidate whose `url` or `finalUrl` equals the intent Blob URL is accepted;
- multiple exact-URL candidates are treated as ambiguous rather than taking the first result.

The filename/byte fallback is now admitted only when both sides are unique:

- the current intent has exactly one extension-owned candidate matching filename + exact byte count within the existing ten-minute fallback window; and
- that candidate matches exactly one active fallback intent across the bounded durable intent set, and that intent is the current one.

One intent with multiple equal candidates and multiple intents competing for one equal candidate therefore both remain unresolved rather than being arbitrarily associated.

### 2. Bounded all-intent comparison

`service-worker.js` adds `listPendingLocalDownloadFallbackIntents()`.

It reads only durable string `intent:` checkpoints, excludes `unknown/manual-resolution` dead-letter rows from automatic fallback authority, and is bounded by the existing `MAX_PENDING_LOCAL_DOWNLOADS` admission ceiling. The reconciliation batch therefore compares fallback ownership against the bounded set of currently active intents instead of only the one row being processed.

This preserves the P0-039 unknown-outcome contract: dead-letter evidence is retained but cannot silently become automatic heuristic authority.

### 3. Atomic no-overwrite numeric binding

`bindPendingLocalDownloadIntent()` now checks the numeric `downloadId` key inside the same readwrite IndexedDB transaction before deleting the string intent.

- Vacant numeric key: normal bind proceeds.
- Existing row owned by the same operation: the path converges idempotently without creating a second owner.
- Existing row owned by another operation: the transaction fails closed with `WEBCLIP_DOWNLOAD_ID_ALREADY_BOUND`; the losing string intent remains durable and the existing numeric owner is not overwritten.

This is the final collision barrier even if an upstream candidate source becomes ambiguous in the future.

## Deterministic acceptance evidence

Committed-source evidence workflow:

- workflow run: `33470987867`
- job: `99740532019`
- exact evidence head: `e2df9055c1ba9bb1d64abea4035c8382f504a8af`
- result: **SUCCESS**

The read-only job ran:

- `node --check service-worker.js`
- `node --check local-download-identity.js`
- `node project_tools/test_p0_048_local_download_identity.js`
- `git diff --check`

The deterministic regression proves:

1. one active intent + one matching same-name/same-size candidate remains a valid fallback positive control;
2. two active same-name/same-size intents cannot both claim one physical candidate;
3. one intent cannot take the first of two same-name/same-size physical candidates;
4. one unique exact Blob URL remains authoritative despite fallback-field ambiguity;
5. duplicate exact-URL physical candidates fail closed as ambiguous;
6. an already-owned numeric `downloadId` rejects a different operation with `WEBCLIP_DOWNLOAD_ID_ALREADY_BOUND`;
7. the losing string intent remains present after that rejection;
8. the existing numeric checkpoint remains unchanged after that rejection;
9. a vacant numeric `downloadId` still binds normally and removes the corresponding string intent.

The implementation workflow also passed the same regression and JavaScript syntax checks before committing the runtime patch; the separate read-only evidence run above is the accepted closure proof because its checked-out commit already contains the implementation.

## Root saturation / non-claims

No new P-code is warranted. This is the exact P0-048 root already registered by historical research evidence.

This closure does **not** claim:

- exact byte-for-byte content receipt for the downloaded PDF;
- restart-safe ownership of a still-unsettled `chrome.downloads.download()` invocation;
- source-document generation binding for PDF retry/cache;
- release readiness.

Those remain separate registered roots/contracts. P0-048 is closed only for the ambiguity where a physical Chrome `downloadId` could be heuristically claimed or durably overwritten by multiple intents.

## Closure decision

**P0-048: DONE** for the registered owner contract.

Acceptance is supported by the source-level failure model, a bounded unique bipartite fallback rule, transactional no-overwrite binding, and deterministic execution of the actual binding function plus classifier on the committed implementation.

`RELEASE_READINESS.md` remains `NOT READY`; this tranche does not build, tag, or publish a release.
