# P0-072 — mutation boundary placement / one-shot stage admission — 2026-09-04

Date: 2026-09-04  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch immediately before the deterministic model: `research/p0-072-recovery-quarantine-2026-09-04 @ ac0f7997965cbcc9b933e555674df16d7f2661ef`  
Deterministic model commit: `4e1e92b74d520b58e9ffca86ac375f54d513c53d`  
Owner: **P0-072 ACTIVE**.

This checkpoint refines the already selected external-stage admission architecture. It does not change runtime, manifest, Registry status or release readiness.

## 1. Fresh source finding — mutation-capable helper boundaries are too broad for admission

The earlier stage-admission checkpoint correctly requires `prepared -> admitted` immediately before a non-cancellable/external mutation. Fresh call-graph inspection shows that this must be interpreted literally: admission cannot be placed merely around a higher-level helper that is *capable* of mutation.

Current `ensureYandexPublicUrl(remotePath, ...)` first performs a read-only metadata request:

```text
GET /resources?path=...&fields=type,public_url
```

If that read already returns `public_url`, the function returns it and does **not** call `/resources/publish`.

Only when no current public URL is observed does it execute:

```text
PUT /resources/publish
```

Therefore marking the publish stage `admitted` before entering `ensureYandexPublicUrl()` would create false physical uncertainty whenever the public link already exists.

P0-072 must not persist an admitted mutation receipt for a path where no mutation request was attempted.

## 2. Correct publish admission boundary

The admission callback/CAS belongs immediately before the concrete mutation request:

```text
read existing public_url
if present -> return factual read result; publish stage remains prepared/not-needed
otherwise:
  CAS publish prepared -> admitted
  PUT /resources/publish
  perform bounded read-only observation/reconciliation
```

This creates the required reset ordering even when reset occurs after the first metadata GET but before publish:

### reset wins after GET

1. `ensureYandexPublicUrl()` observes no link;
2. reset quarantines/detaches the current remote row;
3. publish admission helper re-reads that durable row;
4. admission fails because the row is reset-detached;
5. `/resources/publish` is never called.

### publish admission wins

1. metadata GET observes no link;
2. admission CAS commits `publish=admitted`;
3. reset may then detach the row;
4. publish may have started or may start in the small post-CAS window;
5. later work is factual reconciliation only; no replacement Journal append authority returns.

This is the precise linearization point needed by the earlier P0-072 stage-admission design.

## 3. Admission is a one-shot transition, not reusable permission

A durable state `stage=admitted` means:

```text
this physical mutation may already have crossed the external boundary
```

It must **not** mean:

```text
this operation is authorized to call the mutation again
```

Therefore a stage-admission helper needs at least these structured results:

```text
admitted-now
reset-detached
already-admitted
not-prepared
missing / identity-mismatch
```

Only `admitted-now` authorizes the immediate following external API invocation.

`already-admitted` is an uncertainty/reconciliation state and must never be converted into another start call.

This is especially important after caller timeout, service-worker restart or recovery replay.

## 4. Local download boundary

Current `startAutomaticBlobDownloadBounded(...)` performs several local checks before it constructs the actual Chrome start promise. The concrete non-cancellable browser boundary is:

```text
chrome.downloads.download({ ... })
```

The `download-start` admission CAS therefore belongs after local prerequisites/admission-budget checks and immediately before that Chrome call.

Required behavior:

- reset wins before CAS -> no Chrome start;
- CAS wins -> Chrome start may be issued; reset retains admitted uncertainty;
- `download-start=admitted` observed on restart/re-entry -> do not issue a second Chrome start; enter exact reconciliation under existing P1-146/P0-039/P0-048 owners;
- a caller-side timeout does not reset `admitted` to `prepared`.

The current in-memory `automaticDownloadStartSettlements` map remains useful only for same-worker bounded settlement. It is not durable admission authority.

## 5. Remote upload boundary

Current remote save obtains a signed upload link before the actual PDF transfer and calls `ensureRemoteCheckpoint()` before `runOffscreenSignedTransfer(...)`.

The upload mutation boundary for P0-072 is therefore immediately before the signed PUT transfer, not before acquisition of the signed upload URL.

Target ordering:

```text
obtain/validate upload link
ensure durable remote row exists
CAS upload prepared -> admitted
runOffscreenSignedTransfer(... PUT ...)
```

A cached `remoteCheckpoint` object cannot substitute for the CAS because it may predate a clear/import transaction.

If `upload=admitted` already exists, recovery must reconcile factual remote state rather than replaying the upload merely because a cached/stored plan remains available.

Whether a generic signed-URL acquisition call itself has provisioning semantics is outside this P0-072 checkpoint and remains adjacent to P1-138/read-vs-provisioning research. The irreversible file-transfer boundary is the signed transfer itself.

## 6. Publish retry/recovery consequence

Current `ensureYandexPublicUrl()` performs one publish request and then bounded metadata polling. It does not repeat the PUT inside the same call.

That shape is compatible with one-shot stage admission.

However, future/background recovery must not call the same mutation-capable helper unchanged when `publish=admitted` already exists, because the helper would be capable of issuing another PUT if the read does not yet expose `public_url`.

Required separation:

- current active `publish=prepared` -> mutation-capable path with admission callback;
- current/detached `publish=admitted` -> **read-only publish reconciliation** path;
- verified observed public URL -> factual terminal enrichment;
- reset-detached row -> never starts a new publish stage.

This remains composable with P0-078 publication policy generation and P1-138 read/provisioning separation; it does not close either owner.

## 7. False-admission is not harmless bookkeeping

Over-admitting a stage before a read-only check creates several downstream errors:

- reset may retain an unnecessary unresolved receipt forever;
- capacity accounting may treat a non-event as an active/reconciling mutation;
- user-facing receipt reconciliation (P1-210) could report uncertainty that never existed;
- later code may incorrectly refuse safe work because an old stage appears admitted;
- cleanup/retention policy becomes less truthful.

Therefore the architecture rule is:

> durable admission state records the boundary crossing opportunity for one concrete external mutation request, not merely entry into a helper that might mutate.

## 8. One-shot admission and external errors

Once `admitted-now` commits, a synchronous/local failure before invoking the external API may still be able to prove `cancelled-before-start` if the code can prove the mutation call was never constructed/invoked.

After the external API invocation itself has occurred:

- local timeout is not cancellation;
- external error/Promise rejection is a factual outcome only according to that API's contract;
- anomalous/unknown settlement remains unknown/manual or reconciling as defined by the adjacent owners;
- no retry may simply reset the stage to `prepared`.

For `chrome.downloads.download()`, the existing P0-072 local-settlement checkpoint already distinguishes actual Promise rejection from caller timeout and invalid result anomalies.

## 9. Deterministic model

Added:

`project_tools/test_p0_072_mutation_boundary_placement_model.js`

Local Node result before durable write:

```text
P0-072 mutation boundary placement model: PASS
```

Covered controls:

1. pre-existing public URL returns read-only success and leaves publish stage unadmitted;
2. reset between read and publish boundary blocks the PUT;
3. a prepared publish stage can admit exactly once immediately before mutation;
4. an already-admitted publish stage cannot authorize a second publish call;
5. reset-detached local download stage cannot start Chrome download;
6. already-admitted local download stage cannot authorize a duplicate Chrome start.

The model proves architecture semantics, not current runtime implementation.

## 10. Runtime decomposition refinement

The pending-store/runtime tranche should not expose a generic helper like:

```text
ensureX(..., admission already done by caller)
```

when `ensureX` performs read-before-write branching internally.

Prefer either:

1. lower-level mutation hook/callback passed into the helper and invoked exactly at the mutation boundary; or
2. split read-only observation and mutation functions so the caller can place admission between them.

For current code the lowest-risk target appears to be:

- local: admission immediately inside `startAutomaticBlobDownloadBounded()` before `chrome.downloads.download()`;
- upload: admission immediately before `runOffscreenSignedTransfer()` for the PDF PUT;
- publish: admission callback immediately before `yandexApi('/resources/publish', {method:'PUT'})`;
- admitted recovery: separate read-only reconciliation function/path.

## 11. Owner boundaries

No new P-code is allocated.

- **P0-072** owns reset-vs-stage admission ordering and the one-shot/no-reuse property of that admission.
- **P1-146** remains owner for complete restart-safe exact local-download start settlement.
- **P0-078** remains owner for publication policy generation/revocation.
- **P1-138** remains owner for general read-like vs provisioning mutation separation.
- **P0-073/P0-074/P1-090** remain owners for immutable Yandex context and exact object reconciliation.
- **P0-076** remains owner for non-reset Journal generation/per-entry CAS.

## 12. Status

This checkpoint changes placement/semantics, not storage architecture:

- existing pending stores still use in-place reset quarantine;
- ReadLater/future move receipts still use worker-issued namespaced `meta` receipts;
- stage admission remains transactionally serialized with reset;
- only a fresh `prepared -> admitted` transition authorizes one immediately following external mutation call.

**P0-072 remains ACTIVE.** Runtime/manifest are unchanged; manifest remains `0.9.8`; release remains `NOT READY`. No Actions/build/tag/Release is claimed by this checkpoint.
