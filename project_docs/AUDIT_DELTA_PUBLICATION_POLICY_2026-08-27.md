# Audit delta — Yandex publication privacy policy generation

Date: 2026-08-27
Source `main` HEAD audited immediately before this write: `80ac35c09a31f5cc97124cd5caf864df92741c0c`
Scope: audit/docs only. Production runtime/config/manifest untouched.

## Classification

No new P-number created. Fresh proof strengthens **P0-078 OPEN** and confirms its composition with **P1-184 OPEN** and **P0-069 OPEN**.

## Current publish call sites

Fresh runtime audit finds the object-publication mutation in `ensureYandexPublicUrl()` via `PUT /resources/publish`.

The two live callers that can reach it are:

1. `uploadCachedRecordToYandex()` after upload/reuse checkpoint creation;
2. `recoverPendingRemoteSaves()` while reconciling a prepared remote-save checkpoint.

Both callers currently authorize publication from stale operation/checkpoint state, not from an immutable/fresh publication-policy generation.

## Live save stale-policy proof

`uploadCachedRecordToYandex()` reads `config` near operation admission and later does:

- ensure/create remote recovery checkpoint;
- if `config.createPublicLinks` is true, call `ensureYandexPublicUrl(remotePath, operationId)`;
- otherwise skip creation.

A concurrent Options/user-settings change `true -> false` after the initial config snapshot but before the publish call does not revoke that old authority. The helper itself does not fresh-read the privacy setting immediately before its mutating PUT.

The race is even narrower than a whole upload: `ensureYandexPublicUrl()` performs a metadata GET first and only then, if no existing `public_url`, sends `PUT /resources/publish`. A global disable that occurs during that GET window still cannot stop the not-yet-started publish.

## Recovery checkpoint stale-policy proof

`checkpointPendingRemoteSaveIntent()` stores only `createPublicLinks: Boolean(createPublicLinks)` as operation data.

`recoverPendingRemoteSaves()` later reads remote metadata and, when `current.createPublicLinks && !publicUrl`, calls `ensureYandexPublicUrl()` without reading current global publication policy/generation.

Thus an old checkpoint created when publication was enabled can create a **new** public link after the user has explicitly disabled future link creation.

A plain current boolean check would still be insufficient for disable -> re-enable: an old generation must not regain publication authority merely because the latest setting happens to be true again. The checkpoint needs policy-generation semantics or an explicit re-authorization receipt.

## P1-184 composition: no publish before exact object/content proof

Current recovery authorizes publication after path + exact-size validation, while live retry can also publish a reused same-size object before final stronger metadata/object binding.

Therefore P0-078 and P1-184 are conjunctive gates:

- P0-078: is this operation generation currently allowed to publish at all?
- P1-184: has WebClip proved that the exact remote object/content belongs to this operation?

Both conditions must be true before `PUT /resources/publish`. A valid privacy-policy generation must never compensate for weak object proof, and exact object proof must never override a global publication revocation.

## Unknown already-started publication

Once the mutating publish request has actually been sent, a local timeout/settings disable is not cancellation. The correct state is unknown settlement until reconciled by metadata/public-url observation. Do not blind-retry and do not declare `createPublicLinks=false` as proof that the remote object was never published.

Checkpoint state therefore needs to distinguish at least:

- publish not authorized/not started;
- publish authorized for policy generation N but not started;
- publish request started, settlement unknown;
- publication verified with resulting public URL;
- publication known absent/explicitly revoked.

## P0-069 composition

No production `/resources/unpublish` path was found in this fresh pass. Therefore global `createPublicLinks=false` is currently only a policy about **creating future links**, not automatic revocation of already verified published entries.

That is correct separation of concerns, but it makes P0-069 mandatory: deleting a Journal entry that still refers to a published object must explicitly address whether public access is preserved or revoked and reconcile that outcome before destroying the management reference.

## Required P0-078 acceptance refinement

1. Store a monotonic publication-policy generation in Yandex config or equivalent durable privacy state.
2. Increment it on every authority-changing config write path, including Options toggle and user-settings import.
3. Capture the generation at save admission/checkpoint creation.
4. Immediately before a not-yet-started `resources/publish`, fresh-read/prove:
   - current policy is enabled;
   - captured generation is still authorized, or the operation received a newer explicit re-authorization;
   - P1-184 exact object/content proof is satisfied.
5. `true -> false` revokes all old generations that have not actually started publish.
6. `false -> true` does not resurrect old checkpoints automatically.
7. If settings change after the PUT is sent, preserve publication reconciliation state; do not claim cancellation.
8. Existing already verified public links are not automatically unpublished by this setting; P0-069/P1-164 own that lifecycle.
9. Regression must cover:
   - disable while live upload is between checkpoint and publish;
   - disable during the metadata GET inside `ensureYandexPublicUrl()` before PUT;
   - old recovery checkpoint true + current false;
   - true -> false -> true with old checkpoint;
   - already-started publish + disable + lost response;
   - same-size unrelated object never reaches publish even when policy is enabled (P1-184).

## Duplicate check

- Not P0-069: that item owns deletion/unpublish lifecycle after a link exists.
- Not P1-184: that item owns exact remote object/content proof.
- Not P0-074: general auth/config operation generation is necessary but publication revocation has stronger privacy semantics: a stale operation must not publish simply because its original config snapshot was once valid.
- No P0-079/P1-197 assigned.
