# Audit delta — Yandex signed-transfer durable phase / backup content receipt — 2026-08-27

Source-of-truth `main` immediately before this write: `c4fefcac36adb1ced1bf43750d415fb9bfd5082e`.

Docs-only audit checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. Canonical large-table synchronization is not claimed by this file.

## Classification

No new P-number is created.

Fresh source proof strengthens existing:

- `P1-184` — exact remote object/content proof and unknown-settlement reconciliation;
- `P1-052` — Journal backup prepared-checkpoint unknown settlement (already reopened by later audit deltas; 15 min + 3x404 is not authoritative negative proof);
- `P1-179` — Journal backup pending/state namespace identity;
- `P0-073` / `P0-074` — immutable account/root/auth/config operation context;
- `P0-079` — immutable local PDF byte generation for PDF upload;
- `P1-194` — truthful recovery durability class.

The concrete missing layer proven here is a **durable side-effect phase/admission receipt**: current checkpoints distinguish `prepared` from `remote-verified`, but do not durably distinguish “signed PUT was never admitted/sent” from “signed PUT may already have started and its settlement is unknown”.

For Journal backup, a second gap compounds this: the exact staged backup body is deleted before remote object/content verification, leaving the prepared checkpoint with only path/size-level evidence.

## Positive control — irreversible transfer is pre-checkpointed

Both major Yandex upload flows correctly create durable recovery state **before** sending the signed upload body:

### PDF save

`uploadCachedRecordToYandex()` obtains the signed upload URL, then calls `ensureRemoteCheckpoint()` before `runOffscreenSignedTransfer({ mode:'pdf-cache-upload', ... })`.

The checkpoint is therefore present before the irreversible signed PUT can begin.

### Journal backup

`exportJournalBackupToYandex()` writes `JOURNAL_BACKUP_PENDING_KEY` with `phase:'prepared'` before invoking `runOffscreenSignedTransfer({ mode:'text-chunks-upload', ... })`.

This ordering is valuable and must be preserved. The finding is **not** “there is no checkpoint before upload”.

The defect is that the checkpoint is not advanced to an exact attempt/admission phase before handing the transfer to an execution context that can outlive/lossily communicate with the service worker.

## Fresh source proof — common signed transfer layer

### 1. Every offscreen transfer gets a random transferId, but it is not a durable recovery key

`runOffscreenSignedTransfer()` creates:

`transferId = signed-<random UUID>`

and includes it in:

- OperationLog request/response events;
- the `WEBCLIP_SIGNED_TRANSFER` offscreen message;
- offscreen heartbeats.

Fresh service-worker search finds no persistence of this transferId into `pendingRemoteSaves` or the Journal backup pending checkpoint.

Thus transferId is diagnostic/runtime correlation only. It cannot answer after restart which exact signed-transfer attempt may have crossed the external side-effect boundary.

### 2. Offscreen admission follows actual promise settlement, not caller timeout

Offscreen reserves transfer count/bytes synchronously on `WEBCLIP_SIGNED_TRANSFER` admission and releases that reservation only in `.finally()` of the actual `handleSignedTransfer()` promise.

This is the correct P0-063 resource-lifetime shape: a caller-side timeout/lost response does not falsely free offscreen capacity while the actual fetch/IDB work is still running.

But the durable checkpoint does not receive an equivalent side-effect-admission receipt.

Resource ownership is therefore stronger than recovery ownership: offscreen knows that an actual transfer is/was running, while restart recovery sees only `phase:'prepared'`.

### 3. Worker deliberately disables transport retry for signed transfer

`runOffscreenSignedTransfer()` calls `sendMessageToOffscreen(..., { retryTransportErrors:false })`.

That is correct: a lost runtime response must not automatically cause a second PUT when the first may have started.

However after the call fails/times out, the durable checkpoint still has no explicit `transfer-admitted/started/unknown` state and no transfer-attempt id.

Suppressing immediate retry prevents one duplicate mechanism; it does not by itself preserve exact durable knowledge of whether the irreversible boundary was crossed.

## PDF remote-save phase proof

`checkpointPendingRemoteSaveIntent()` writes:

- `phase:'prepared'`;
- journalEntryId / operationId;
- expectedPdfBytes;
- account/root/path metadata;
- publication preference snapshot.

After the checkpoint is written, the signed PUT is invoked.

There is no durable update such as:

- `phase:'transfer-admitted'`;
- `transferAttemptId`;
- `transferStartedAt`;
- immutable signed-transfer/body generation receipt.

If the offscreen transfer throws/times out, the caller throws and leaves the checkpoint in `prepared` state. Background recovery later cannot tell from that phase whether:

1. offscreen admission failed before fetch could start;
2. body materialization failed before network send;
3. PUT started and was client-aborted/timed out;
4. PUT physically committed but the response was lost;
5. service-worker/offscreen communication failed after the side effect had already started.

All of those collapse into the same durable state.

This is especially important once P0-079/P1-184 add exact local content receipts: the transfer attempt that used those exact bytes must itself be represented durably, not inferred only from later path observation.

## Journal backup phase + local-content proof

### 1. Backup pending checkpoint is also only `prepared`

Before signed PUT, backup stores a pending object containing:

- `phase:'prepared'`;
- operationId;
- remotePath / filename / monthFolder;
- expectedBytes;
- entryCount / exportedAt;
- timestamps/attempt fields.

It does not contain a transferAttemptId, transfer-admission phase or immutable content digest.

P1-179 separately requires accountUid/rootPath/config generation; those fields are also absent today.

### 2. Exact staged backup payload is deleted in `finally` immediately after signed-transfer call

The backup upload does:

1. stage the full export into chunked transfer storage;
2. create the `prepared` backup checkpoint;
3. call `runOffscreenSignedTransfer({ mode:'text-chunks-upload', payloadKey: staged.stagingKey, ... })`;
4. in `finally`, call `deleteTransferPayloadGroup(staged.stagingKey)`;
5. only **after that**, process transfer response and perform remote metadata verification.

Therefore the exact local body is released before remote object/content verification has succeeded.

This happens on both success-response and error/timeout paths because cleanup is in `finally`.

### 3. After unknown settlement, checkpoint retains only weak content evidence

Once staging is deleted, the backup checkpoint retains `expectedBytes` but no strong digest/fingerprint of the exact JSON bytes that were handed to signed PUT.

Recovery then reads the remote path and currently verifies mainly `type=file + exact size`, exactly the weak proof already tracked by P1-184.

Thus stronger P1-184 acceptance cannot be implemented only in the later GET logic: backup must create and retain a **local content receipt before releasing the staged body**.

If a real Yandex API supplies a trustworthy checksum/immutable creation identity in the relevant metadata, that local receipt can be compared to it after E2E validation. If the API cannot prove content equality, WebClip must not label path+size as exact proof.

### 4. Successful PUT response does not make path identity sufficient

Even when offscreen returns HTTP success, WebClip subsequently performs metadata verification because the product needs exact remote state before final backup-state publication.

Deleting local staging before that verification means a failure in the verify window leaves only the prepared path/size checkpoint.

Therefore this is not limited to caller timeout: ordinary “PUT returned success, verification then failed” also loses the exact staged body before remote proof is durable.

## Relation to P1-052

P1-052 was originally implemented as a grace policy for prepared backup 404s. Later audit already proved that 15 minutes + three 404s are not authoritative proof that an unknown signed PUT never committed.

The new phase evidence explains why `prepared` is semantically overloaded:

- a checkpoint written but definitely never admitted to offscreen is materially different from;
- a checkpoint whose PUT may have started and now requires unknown-settlement reconciliation.

A future cleanup/retry policy can be more precise only if that boundary is durable.

However even a `transfer-started` flag is not sufficient negative/positive proof by itself. It tells recovery which class of reconciliation is required; it does not prove the server committed or did not commit.

## Relation to P1-184

P1-184 needs three separate identities:

1. **local content receipt** — which exact PDF/backup bytes were intended;
2. **transfer attempt receipt** — which irreversible signed PUT attempt may have carried them;
3. **remote object/content receipt** — which exact Yandex object/content ultimately resulted.

Current code has partial pieces:

- PDF has local cached bytes but mutable tab ownership (P0-079) and no strong content digest;
- backup has exact staged bytes temporarily, then deletes them before remote proof;
- runtime transferId exists but is not durable;
- remote verification has path/size and later resourceId, but path/size cannot prove same content/object under unknown settlement.

Fixing only one layer cannot close P1-184.

## Required durable transfer-phase contract

### Attempt identity before irreversible admission

Before calling offscreen for a signed PUT, create a random locally issued `transferAttemptId` bound to the exact operation/checkpoint generation.

Persist a transition equivalent to:

`prepared -> transfer-admitted/may-have-started`

**before** handing the request to offscreen.

This state should conservatively mean: from this point onward, recovery must assume the external PUT may occur, even if the service worker loses the response immediately.

If the worker dies after persisting this state but before actual offscreen send, recovery may conservatively classify the attempt as unknown even though no PUT occurred. That false-positive uncertainty is safer than a false “not started” that authorizes blind retry.

### Offscreen receipt

Pass the same durable transferAttemptId to offscreen.

Heartbeat/result can carry that id, but the offscreen message must not invent a separate unrelated runtime-only identity if exact recovery correlation is required.

If a response returns, transition the exact attempt according to actual transport result; a stale response cannot update another attempt generation.

### Unknown settlement

Local timeout, worker termination, lost runtime response, abort after request transmission, or unclassified transport error after admission must transition/remain in an `outcome-unknown` class.

Do not convert it to `prepared/not-started` merely because the caller received an exception.

No automatic second non-idempotent/overwrite-sensitive attempt until exact operation-specific reconciliation permits it.

### Never-started admission failures

Failures that are proven to occur **before** offscreen transfer admission/network side effect (for example a synchronous/bounded resource-admission rejection before `handleSignedTransfer()` is accepted) may be classified separately as `not-started` if the proof itself is trustworthy and bound to the attempt.

Do not infer this class from absence of a later remote file alone.

## Required backup content-receipt contract

Before deleting staged chunks, persist a bounded strong local receipt for the exact exported byte stream, at least:

- content byte length;
- cryptographic digest/fingerprint suitable for integrity comparison if the remote API can expose a trustworthy counterpart;
- export schema/version;
- entryCount/exportedAt as diagnostics, not substitutes for digest;
- transferAttemptId;
- immutable account/root/config namespace from P1-179/P0-074.

Whether the full staged body must remain after PUT depends on the verified remote reconciliation mechanism:

- if strong remote content proof can be performed from the digest, the large chunks may be released once their digest/attempt receipt is durably committed;
- if exact same bytes are required for safe retry/manual recovery and cannot be reconstructed identically, keep or migrate the body under a bounded recovery owner until terminal settlement;
- if hard storage pressure prevents retaining the body, downgrade recovery truthfully to unresolved/manual rather than pretending path+size is proof.

The product must choose an explicit bounded policy; current unconditional `finally` deletion before remote proof is not sufficient evidence for the stronger recovery promise.

## Required regressions

### PDF

1. Checkpoint PREPARED commits; offscreen admission is rejected before fetch: attempt is classified as proven-not-started only when exact admission evidence supports it.
2. Durable transfer-attempt state commits; worker dies before/while offscreen receives message: recovery treats outcome conservatively as unknown, never as automatic safe retry.
3. PUT physically commits but runtime response is lost: exact transferAttemptId/local content receipt survives and reconciliation binds the resulting remote object to that attempt.
4. Local timeout/Abort after request transmission: checkpoint remains unknown; no blind second PUT.
5. Manual retry after unknown A creates a distinct attempt generation B and cannot overwrite A's attempt receipt (compose with remote checkpoint generation audit).
6. Equal-sized different PDF cannot satisfy A solely by size.

### Journal backup

7. Exact staged bytes get a durable content receipt before chunks are deleted.
8. PUT returns success, metadata verification fails: checkpoint still retains exact content/attempt receipt; recovery does not fall back to size as if it were identity.
9. PUT timeout/unknown: chunk cleanup policy preserves enough exact recovery evidence according to the chosen bounded design.
10. Staging-admission failure before transfer can be distinguished from may-have-started transfer; both do not share an ambiguous plain `prepared` semantic.
11. Worker termination after transfer-attempt admission preserves attempt identity across restart.
12. Three 404s/15 minutes do not erase a may-have-started attempt without authoritative negative proof (P1-052 refinement).
13. Account/root change cannot cause recovery of the old attempt under a new namespace (P1-179/P0-074).
14. Same-size unrelated backup object never becomes remote-verified without stronger object/content proof (P1-184).

## Classification / registry consequence

No new P-number assigned.

Extend/refine:

- `P1-184`: durable content + transfer-attempt + remote-object receipt must form one exact proof chain;
- `P1-052`: prepared backup state must distinguish never-admitted vs may-have-started unknown outcome; 404 grace remains policy, not negative proof;
- `P1-179`: backup transfer attempt/content receipt must be scoped to immutable account/root/config namespace;
- `P0-073/P0-074`: PDF transfer attempt and reconciliation remain bound to exact Yandex identity/context;
- `P0-079`: PDF transfer attempt consumes one exact immutable local cache generation;
- `P1-194`: UI/OperationLog must not describe recovery as guaranteed beyond the durability/proof actually available.

Canonical `PRIORITIES_P0_P1_P2.md` / `DEEP_AUDIT_2026-08-25.md` synchronization remains pending as a separate lossless registry-reconciliation step.

## Test / release state

No product tests were rerun for this docs-only checkpoint. The last proven product gate remains the historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. No build, tag or Release was created.