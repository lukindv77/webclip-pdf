# P0-072 — external stage admission ordering across reset — 2026-09-04

Date: 2026-09-04  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch entering this block: `research/p0-072-recovery-quarantine-2026-09-04 @ 8f5c66db870e6a5f8138f714c2ca505d92abb671`  
Deterministic model commit: `dcd3c2b54629fd6330575eb10c95500d517b6a12`  
Owner: **P0-072 ACTIVE**.

This checkpoint reconciles an inconsistency in the earlier P0-072 design: ReadLater receipts had an explicit `prepared -> effect-admitted` ordering, while existing local-download and remote-save rows only existed before side effects but had no transaction-local admission CAS. Runtime is unchanged.

## 1. Fresh current-source finding — durable-before-effect is necessary but not sufficient

Current positive ordering is good:

- local download intent is durable before `chrome.downloads.download()`;
- remote save checkpoint is durable before the signed PDF upload transfer;
- ReadLater currently writes its Journal projection before `/resources/move`.

However, a durable row written before a side effect does not by itself define who wins when a bulk reset races the actual start.

Without an admission CAS, this schedule is possible:

1. old operation writes a durable `prepared`/`intent` row;
2. clear/import transaction quarantines that row and commits;
3. old async function still holds a stale in-memory object/key;
4. old function starts the external operation after reset anyway.

The quarantine still prevents late Journal resurrection, but reset-before-start is no longer a meaningful cancellation boundary.

Earlier P0-072 ReadLater research already chose the stronger rule:

> reset before admission prevents the not-yet-started external effect; admission before reset preserves/reconciles the already admitted effect.

That rule must be consistent across effect classes.

## 2. Current local gap

The local path does:

1. `checkpointPendingLocalDownloadIntent(...)`;
2. return to caller;
3. `startAutomaticBlobDownloadBounded(...)`;
4. eventually call `chrome.downloads.download(...)`.

A reset can commit between steps 1 and 4.

Current `kind:'intent'` alone cannot distinguish:

- prepared, Chrome call not yet admitted;
- Chrome call already issued, Promise still unresolved.

That is why the preceding detached-settlement checkpoint correctly treated a current intent row as uncertain.

Target architecture can remove that ambiguity for future rows by adding explicit stage admission.

## 3. Current remote gap is multi-stage

The normal remote save path currently:

1. obtains the signed upload URL;
2. calls `ensureRemoteCheckpoint()`;
3. starts `runOffscreenSignedTransfer(...)`;
4. later calls `ensureRemoteCheckpoint()` again, which returns the cached in-memory `remoteCheckpoint` when already set;
5. if `createPublicLinks`, calls `ensureYandexPublicUrl(...)`;
6. verifies metadata and appends Journal.

Two reset windows therefore exist:

### Before upload transfer

Reset can quarantine the remote row after `ensureRemoteCheckpoint()` but before the signed transfer starts. The old task still starts upload from its cached state.

### Between upload and publication

Reset can quarantine the row after upload but before `ensureYandexPublicUrl()`. Because the second `ensureRemoteCheckpoint()` returns the cached object without re-reading IndexedDB, the old task may start a new publication side effect after reset.

This is separate from ordinary recovery. Background recovery also currently calls `ensureYandexPublicUrl()` when a verified file lacks `publicUrl`; detached rows must not enter that publication branch.

## 4. General rule — every new external mutation stage needs durable admission ordering

Use a transaction-local stage admission contract for every non-cancellable or externally persistent mutation stage.

Conceptually each receipt/pending row owns bounded stage state:

```text
prepared -> admitted -> terminal factual outcome
```

A reset transaction sharing the same object store is allowed to convert only `prepared` stages into:

```text
cancelled-before-start
```

Already `admitted` stages remain admitted/uncertain and may later record factual settlement.

Once `journalResetDisposition` exists, no new stage may transition from prepared to admitted.

## 5. Required IndexedDB linearization

Stage admission is a small readwrite transaction on the same store that owns the receipt.

It must:

1. get the exact current row;
2. validate current operation identity;
3. reject if reset-detached;
4. require the requested stage to be `prepared`;
5. set it to `admitted` with bounded timestamp/generation data;
6. commit;
7. only after transaction completion call the external API.

Reset and admission transactions then have overlapping readwrite scope and therefore serialize.

Current MDN documentation confirms overlapping IndexedDB write scopes queue instead of executing concurrently:

- https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB
- https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Basic_Terminology

The tiny crash window after admission commit but before actual network/Chrome transmission remains conservative uncertainty. That is acceptable: the receipt says the effect may have been admitted and reconciliation, not fabricated cancellation, follows.

## 6. Local target stage

For `pendingDownloads`, add one explicit stage:

```text
download-start
```

Target sequence:

1. create durable intent with `download-start=prepared`;
2. immediately before `chrome.downloads.download()`, transactionally admit `download-start`;
3. if reset won first, admission fails and the Chrome API is never called;
4. if admission won first, reset preserves the intent/numeric receipt as already admitted uncertainty;
5. late bind/complete/interrupted facts update the detached receipt without Journal append.

This refines the preceding local-settlement result:

- **current runtime** cannot infer intent admission from `kind:'intent'`;
- **target runtime with stage CAS** can safely classify reset-before-admission as `cancelled-before-start` because the reset and admission transactions are ordered.

No contradiction exists; the later design adds the missing durable state.

## 7. Remote target stages

Remote save needs at least two separately admitted mutation stages when applicable:

```text
upload
publish
```

### Upload

For a new file:

- checkpoint row contains `upload=prepared`;
- immediately before `runOffscreenSignedTransfer`, CAS `upload -> admitted`;
- reset-first prevents the transfer;
- admission-first allows factual transfer settlement after reset but never Journal finalization.

For an already reused/proven file, upload stage can be absent/not-applicable rather than fabricated as admitted.

### Publish

When publication policy requests a public link and a link is not already factually observed:

- row contains `publish=prepared` under the operation's policy context;
- immediately before a function capable of `/resources/publish`, CAS `publish -> admitted`;
- reset-first prevents a new public-link mutation;
- admission-first allows factual settlement after reset;
- a completed upload does not automatically authorize later publish after reset.

P0-078 still owns publication policy generation/revocation semantics. P0-072 supplies only the reset ordering barrier.

## 8. Cached in-memory checkpoint is never admission authority

The current remote `ensureRemoteCheckpoint()` caches `remoteCheckpoint` and returns it on subsequent calls.

After stage admission exists, that cached object may remain useful for display/correlation but cannot authorize a new external mutation.

Every external stage calls an admission helper that re-reads the current durable row.

Required negative control:

```text
cached row says active
current IDB row says reset-detached
=> admission fails
```

This is the same no-stale-snapshot rule already chosen for reset disposition writers.

## 9. Read-only factual reconciliation remains different

After reset, a detached row may still need read-only observation to learn whether an already admitted effect happened.

Examples:

- exact Chrome DownloadItem lookup;
- Yandex metadata GET for the already selected remote path/object under the existing identity owners.

P0-072 must not turn a read-only reconciliation pass into new mutation authority.

For remote saves specifically:

- detached recovery may observe an already existing `public_url` from metadata;
- detached recovery may not call `ensureYandexPublicUrl()` merely because `createPublicLinks` was true in the old row;
- detached recovery may record factual upload/file outcome subject to P0-073/P0-074/P1-090 identity limits;
- it never appends into replacement Journal.

P1-138 remains the owner for broader read-like vs provisioning side-effect separation.

## 10. Multi-stage reset semantics

A single remote operation can have mixed state at reset:

```text
upload = admitted
publish = prepared
```

Reset result:

```text
upload -> remains admitted/reconciling
publish -> cancelled-before-start
row -> journalResetDisposition attached
```

Therefore an upload that may have completed before/during reset does not grant permission to create a public link afterwards.

This is important for privacy correctness and composability with P0-078/P0-069 without claiming those owners closed.

## 11. ReadLater compatibility

The previously selected namespaced ReadLater receipt already has the same conceptual two-phase model:

```text
move prepared -> move admitted
```

This checkpoint generalizes the ordering principle; it does not require moving existing local/remote rows into the `meta` receipt namespace.

Storage remains hybrid:

- local/remote current pending stores keep their rows in place;
- ReadLater uses worker-issued namespaced meta receipt;
- all mutation stages obey the same reset/admission ordering contract.

## 12. Delete→Trash compatibility

P1-183 remains responsible for creating the future exact pre-move Trash receipt.

When that receipt exists, its external `move` stage should use the same prepared/admitted ordering so P0-072 can detach it consistently.

No new P-code is allocated.

## 13. Deterministic model

Added:

`project_tools/test_p0_072_external_stage_admission_model.js`

Local Node result before durable write:

```text
P0-072 external stage admission model: PASS
```

Covered schedules:

1. reset before local `download-start` admission prevents start;
2. local admission before reset preserves admitted uncertainty and late factual complete;
3. remote upload admission before reset does not authorize publish after reset;
4. publish admitted before reset may settle factually while row remains detached;
5. stale cached snapshot cannot bypass current reset-detached durable row;
6. operation identity mismatch fails closed;
7. second reset preserves the first reset identity.

The model is architecture evidence, not a runtime PASS.

## 14. Implementation refinement

The prior runtime decomposition should be amended before production patching:

### Pending-store tranche

Add transaction-local stage admission helpers alongside quarantine/writer/delete fencing:

- `admitPendingLocalDownloadStage(intentKey, expectedOperationId, 'download-start')`;
- `admitPendingRemoteSaveStage(id, expectedOperationId, 'upload'|'publish')`;
- dedicated factual settlement transitions.

### Call-site placement

- local: immediately before `chrome.downloads.download()`;
- remote upload: immediately before `runOffscreenSignedTransfer(...)`;
- remote publish: immediately before `ensureYandexPublicUrl(...)` or the lower-level mutation-capable publish boundary;
- recovery: detached rows cannot pass mutation admission.

The admission helper must be the last authority check before the external mutation; an earlier cached row check is insufficient.

## 15. Owner boundaries

This stage ordering is P0-072 only to the extent that it defines reset-before-admission vs admission-before-reset truth.

It does not close:

- P1-146 — complete automatic-download unknown/late settlement;
- P0-078 — current publication policy generation and revocation;
- P0-074 — immutable auth/account/root/config operation context across Yandex stages;
- P0-073 — remote save account/root scope;
- P1-090 — exact destructive remote-object reconciliation;
- P1-138 — general read/provisioning separation;
- P1-183 — Trash receipt creation;
- P0-076 — Journal generation CAS.

## 16. Status

The first runtime tranche needs one additional primitive beyond the prior decomposition: **stage admission CAS on existing pending rows**. Without it, quarantine protects Journal truth but does not define reset-before-start semantics and stale in-memory tasks can initiate new external stages after reset.

P0-072 remains **ACTIVE**. Runtime and manifest are unchanged. Manifest remains `0.9.8`; release remains `NOT READY`; no build/tag/GitHub Release or Actions run is claimed.
