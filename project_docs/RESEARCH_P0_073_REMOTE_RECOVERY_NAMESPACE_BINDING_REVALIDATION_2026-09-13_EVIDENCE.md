# P0-073 — remote-save recovery namespace binding revalidation — 2026-09-13

## Classification

- Owner: `P0-073`.
- Current registry state at research start: `ACTIVE`.
- Result: `ACTIVE / ROOT-CAUSE-REVALIDATED`.
- Research level: current-source review + deterministic model + current official external documentation.
- Not claimed: real authorized Yandex L5/E2E closure.
- Runtime / manifest / workflow changes: none.
- Release effect: none; release readiness remains `NOT READY`.

## Canonical baseline

Research was performed against canonical `main`:

`2446ae8dc7200e483ff494afd2afd5bb251dcb30`

At the start of this tranche:

- open pull requests: 0;
- open issues: 0;
- post-merge Repository Integrity for the preceding P0-074 research merge had completed successfully on the exact baseline SHA (push run `#602`).

The current registry definition under test is:

> Remote-save completion/recovery is immutable account/root scoped; unresolved operation A cannot be rebound to account/root B.

## Executive finding

The P0-073 root cause remains present in current source.

Current upload code does useful work at checkpoint creation: it obtains the current Yandex account UID, captures the configured root, and persists both `accountUid` and `rootPath` into the durable remote-save checkpoint. However, restart/maintenance recovery does not use those durable namespace fields as authority before remote observation or publication.

`recoverPendingRemoteSaves()` currently performs only a global-current authentication availability check, then resolves the checkpoint's persisted textual `remotePath` through `yandexApi()`. `yandexApi()` in turn resolves the current global token for that request. The recovery path does not compare the checkpoint's `accountUid` to the currently authorized account before reading the path, and it does not use the checkpoint's `rootPath` to prove that the path is inside the bound namespace.

Therefore a checkpoint admitted under account A can, after restart/reconnect, observe a same-path/same-size object in account B. If public links are enabled, recovery can also publish that B object. It can then mark the A checkpoint remote-verified with B's observed `resource_id` / public URL and append local Journal metadata carrying A's persisted account/root fields. This creates a cross-account hybrid receipt.

This is a fresh current-source reproduction of the existing P0-073 namespace-binding owner. No new P-code is allocated.

## Current-source proof

### 1. Upload checkpoint creation captures account/root A

`uploadCachedRecordToYandex(...)` computes the target `remotePath`, then obtains:

- `accountUid = await getCurrentYandexAccountUid(operationId)`;
- `rootPath = normalizeDiskPath(config.rootPath || '')`.

It passes both into `checkpointPendingRemoteSaveIntent(...)` before final remote verification / Journal append.

This is a valuable positive control: current source already has durable fields capable of identifying the originating namespace.

### 2. Normalization preserves `accountUid` and `rootPath`

`normalizePendingJournalAppendData(...)` includes:

- bounded `accountUid`;
- normalized `rootPath`;
- `remotePath`;
- Journal identity/meta.

The current durable checkpoint therefore carries explicit namespace evidence rather than only a path string.

### 3. Recovery checks only whether some current auth exists

At the beginning of `recoverPendingRemoteSaves(...)`, current source does:

```js
let authAvailable = true;
try { await getValidYandexAccessToken(); } catch (_) { authAvailable = false; }
```

For a checkpoint that is not already `remote-verified`, it defers only when `authAvailable` is false.

There is no account UID comparison at this admission point.

### 4. Recovery uses the persisted path under current-global auth

For a non-verified checkpoint, recovery reads:

```js
const remotePath = normalizeDiskPath(current.data.remotePath || '');
```

and then calls:

```js
const metadata = await yandexApi('/resources', {
  method: 'GET',
  query: { path: remotePath, fields: 'name,path,type,size,public_url,resource_id' },
  ...
});
```

Current `yandexApi(...)` obtains authorization through `getValidYandexAccessToken()` for the individual request. The checkpoint's persisted `accountUid` is not supplied as request authority and is not compared before the request.

A reconnect A -> B therefore changes the namespace in which the same textual path is interpreted.

### 5. Recovery validates type and exact byte size, not namespace identity

After reading metadata, recovery checks:

- `metadata.type === 'file'`;
- exact byte size against `current.expectedPdfBytes`.

Those checks are useful content-shape controls, but path + type + size are not account identity. Account A and account B can independently contain `/WebClip/Upload/.../x.pdf` with the same byte length.

P1-184 remains responsible for exact remote object/content proof. P0-073 is the prerequisite namespace fence that must be satisfied before such proof is interpreted.

### 6. Recovery can publish in the wrong current account

If the checkpoint says public links should exist and the currently observed object has no public URL, recovery calls:

```js
publicUrl = await ensureYandexPublicUrl(remotePath, String(current.operationId || ''), deadline);
```

That helper is reached after the current-global metadata read and uses the current Yandex request context. Without an account fence, an A checkpoint can therefore authorize publication of B's same-path object.

P0-078 still owns publication-generation/revocation policy. The P0-073 finding here is earlier: the object being observed/published must first belong to the checkpoint's original account/root namespace.

### 7. Recovery then binds current observation into the old checkpoint

Recovery calls `markPendingRemoteSaveVerified(...)` with the `publicUrl` and `metadata.resource_id` obtained from the current-account observation, then calls:

```js
appendJournalEntryFromDurableCheckpoint(current.data, ...)
```

The checkpoint data already carries the original `accountUid` / `rootPath` fields. Therefore an A checkpoint can become a hybrid of:

- A namespace metadata (`accountUid`, `rootPath`, operation intent);
- B observed object identity (`resource_id`);
- B publication URL, if publication was required.

The local Journal append can then durably present that hybrid as one completed save.

### 8. Recovery does not enforce root containment

Current checkpoint normalization stores `rootPath` and `remotePath`, but the recovery path uses `remotePath` directly and does not prove:

```text
remotePath == rootPath OR remotePath starts with rootPath + '/'
```

For current freshly created checkpoints, construction normally produces a managed path. But durable recovery has to treat its persisted receipt as the authority boundary, including upgrade/legacy/corruption cases. A missing or inconsistent root binding must not become a wildcard.

## Exact race schedules

### Schedule A — restart + account A -> B reconnect

1. Upload starts under account A and root `/WebClip`.
2. Durable remote checkpoint records `accountUid=A`, `rootPath=/WebClip`, path `P`, expected bytes `N`.
3. Worker stops/restarts before terminal remote verification / Journal append.
4. User reconnects WebClip to account B, also configured with textual root `/WebClip`.
5. B contains a file at the same textual path `P` with byte size `N`.
6. `recoverPendingRemoteSaves()` sees that a current token exists.
7. It reads `P` through current-global `yandexApi()`, therefore in B.
8. Type and size pass.
9. Recovery marks A's checkpoint verified with B's observed object identity.
10. Local finalization retains the checkpoint's persisted account/root metadata from A.

Result: one durable local record can combine A namespace provenance with B remote object identity.

### Schedule B — wrong-account publication

1. Same setup as Schedule A, with checkpoint `createPublicLinks=true`.
2. B's same-path object is private.
3. Recovery sees no public URL and calls publication for `P` under current account B.
4. B's object becomes public.
5. B public URL is written into A's checkpoint/final Journal metadata.

Result: a stale A checkpoint can cause a privacy-sensitive mutation in B before namespace mismatch is detected, because no such mismatch check exists.

### Schedule C — missing legacy account binding

1. Durable/legacy checkpoint has a path/root but empty `accountUid`.
2. Current user is authenticated to account B.
3. Current recovery treats authentication availability as sufficient and interprets the path under B.

Result: missing account identity acts as a wildcard instead of unknown binding.

Historical P0-073 evidence already requires the opposite rule for destructive/identity-sensitive Yandex authority: missing account binding is unknown, not wildcard.

### Schedule D — root receipt inconsistent with path

1. Checkpoint says `rootPath=/WebClip`.
2. Persisted `remotePath` is `/OtherRoot/...` because of legacy/corrupt/stale state.
3. Recovery does not compare the two.
4. It queries `/OtherRoot/...` in whatever current authorized account exists.

Result: the stored root receipt is informational rather than an enforced authority boundary.

## Historical duplicate reconciliation

`project_docs/RESEARCH_FAMILY_YANDEX_REMOTE_IDENTITY_EVIDENCE.md` already preserves the relevant P0-073 roots.

Especially relevant retired deltas include:

- `RESEARCH_DELTA_YANDEX_LEGACY_ACCOUNT_IDENTITY_2026-08-27.md`;
- `RESEARCH_DELTA_JOURNAL_REPLACE_RECOVERY_EVIDENCE_2026-08-27.md`;
- `RESEARCH_DELTA_READLATER_MOVE_ACCOUNT_GENERATION_CONTINUITY_2026-08-28.md`;
- `RESEARCH_DELTA_TRASH_MOVE_ACCOUNT_GENERATION_CONTINUITY_2026-08-28.md`;
- `RESEARCH_DELTA_YANDEX_DESTRUCTIVE_MOVE_AUTH_GENERATION_2026-08-28.md`;
- `RESEARCH_DELTA_YANDEX_GLOBAL_LOCATE_PAGINATION_COHERENCE_2026-08-28.md`;
- `RESEARCH_DELTA_YANDEX_MIXED_ROOT_PUBLICATION_CONTEXT_2026-08-28.md`;
- `RESEARCH_DELTA_YANDEX_SIGNED_TRANSFER_PHASE_2026-08-27.md`.

The historical legacy-account delta explicitly states the required P0-073 refinement:

- a trusted local remote binding includes a proven account UID and root namespace;
- missing `accountUid` is an unknown account binding, not a wildcard.

Fresh current source reproduces the same root specifically in pending remote-save restart recovery. Therefore:

- no new P-code is created;
- P0-073 remains the owner;
- status remains `ACTIVE / ROOT-CAUSE-REVALIDATED`.

## Current external evidence

Fresh official Yandex OAuth documentation was reviewed on 2026-09-13.

Yandex documents that an OAuth token allows access to Yandex services on behalf of a specific user and that a token contains the ID of the account that can be accessed. Therefore changing the token/account can change the account namespace in which a Disk path is interpreted.

Official sources:

- https://www.yandex.com/dev/id/doc/en/access
- https://yandex.com/dev/id/doc/en/concepts/ya-oauth-intro
- https://www.yandex.com/dev/id/doc/en/user-information

The external documents establish account-scoped authorization semantics. They do not independently prove the WebClip race. The race conclusion comes from combining those semantics with current WebClip recovery code, which resolves remote requests under current-global auth without comparing the checkpoint's persisted account UID.

## Deterministic model

Added research model:

`project_tools/test_p0_073_remote_recovery_namespace_binding_model.js`

Environment:

- Node.js `v22.16.0`.

Commands:

```text
node --check project_tools/test_p0_073_remote_recovery_namespace_binding_model.js
node project_tools/test_p0_073_remote_recovery_namespace_binding_model.js
```

Result:

`PASS 59 checks`

SHA-256 of the prepared model:

`48bacbcb51b9d0538a0f7fa81d714d1c714e8461ab5a65b83a239c7c6e59abf5`

Git blob of the prepared model:

`dfb869a8b633698a9fa4efc9b468d6b3555081c1`

### Model coverage

The model covers:

1. current-style A checkpoint + B current account + same path/size -> cross-account hybrid;
2. B publication caused by A checkpoint;
3. exact account mismatch rejection before publication in candidate semantics;
4. equal textual root across accounts is not namespace equality;
5. missing account binding fails closed;
6. missing root binding fails closed;
7. root/path containment is enforced;
8. exact account/root/path positive control;
9. exact size remains necessary but insufficient for namespace identity;
10. no-auth deferral/failure rather than guessing;
11. path/root normalization preserves account fence;
12. publication-disabled path remains namespace-bound;
13. operation ID cannot substitute for account/root authority;
14. P1-184 exact-object identity remains separate from P0-073 namespace proof;
15. current configured root change does not silently rewrite the checkpoint's bound root in the P0-073 model;
16. sibling-prefix paths such as `/WebClip-Evil` fail containment;
17. empty path fails before remote access;
18. exact-namespace publication positive control;
19. local finalization preserves the checkpoint account/root receipt unchanged.

The candidate model is an acceptance illustration, not a selected runtime architecture.

## Research invariant

The strongest compact invariant supported by current evidence is:

> A durable Yandex recovery receipt is authority only inside the exact account/root namespace it captured. Before any post-restart remote read, publish, adopt, verify, or reconciliation request, WebClip must prove that the request is being interpreted in that same namespace. Missing account/root binding is unknown authority, never a wildcard. A current object observed in another account cannot settle, publish, or rebind the old checkpoint even when path, type, and byte size match.

## Candidate implementation direction — not accepted architecture

A plausible future closure direction is:

- require durable remote-save checkpoints to carry non-empty account UID and normalized root binding before remote admission;
- on recovery, obtain current account identity before the first remote observation and compare it to the checkpoint account UID;
- validate checkpoint `remotePath` containment under the checkpoint's stored root;
- if namespace proof is missing/mismatched, quarantine/defer/manual-resolve without remote publication or adoption;
- pass P0-074's immutable operation context into remote request helpers so a successful admission fence cannot be invalidated by a later reconnect;
- require P1-184 exact object/content proof after namespace proof; path/type/size remain insufficient object identity;
- apply P0-078 publication generation/revocation policy only after namespace/object authority is proven;
- apply P0-076 Journal CAS before late local finalization;
- preserve P0-072 external-effect receipts across reset/replace.

This document does not choose or implement runtime architecture.

## Owner boundaries

- `P0-073`: durable account/root namespace authority for remote completion/recovery; missing binding is not wildcard.
- `P0-074`: one immutable auth/account/root/config/publication operation context across long-running requests.
- `P1-184`: exact remote object/content creation/adoption receipt.
- `P0-078`: publication generation/revocation privacy policy.
- `P0-072`: admitted external-effect receipts survive Journal reset/replace.
- `P0-076`: stale late operation cannot mutate/delete replacement Journal state.
- `P1-090`: exact destructive move source/target identity and unknown-settlement reconciliation.

These owners compose and are not merged by this finding.

## Closure evidence still required

P0-073 must remain `ACTIVE` until implementation and evidence prove, at minimum:

1. exact-source regression for restart/maintenance remote-save recovery;
2. account A checkpoint + current account B is rejected before the first B remote read/publish/adopt action;
3. same textual root/path and exact same byte size across A/B remain a negative control;
4. missing legacy `accountUid` cannot act as wildcard authority;
5. missing/inconsistent root binding cannot act as wildcard authority;
6. exact A account/root positive recovery still succeeds;
7. publication is impossible before P0-073 namespace proof and P0-078 policy proof;
8. P1-184 exact object/content proof composes after namespace proof;
9. restart/recovery retains P0-074 immutable context generation semantics rather than re-reading a new global context mid-operation;
10. P0-072/P0-076 replacement/reset composition tests remain fail-closed;
11. authorized isolated real-Yandex E2E with at least two test accounts containing same-path/same-size controls;
12. exact-head Repository Integrity and post-merge integrity on the eventual implementation PR.

No Yandex credentials were available or used in this research tranche, so no real-Yandex L5 closure is claimed.

## Release interpretation

Research coverage remains complete in the project-wide sense. This tranche strengthens one already-known critical owner; it does not make critical closure complete and does not make the project release ready.

`P0-073` remains `ACTIVE / ROOT-CAUSE-REVALIDATED`.
