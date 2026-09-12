# P0-078 — publication generation / revocation revalidation — 2026-09-13

## Classification

- Owner: `P0-078`.
- Current registry state at research start: `ACTIVE`.
- Result: `ACTIVE / ROOT-CAUSE-REVALIDATED`.
- Research level: exact current-source review + historical duplicate reconciliation + deterministic model + current official Yandex documentation.
- Not claimed: production implementation closure or authorized real-Yandex L5/E2E closure.
- Runtime / manifest / workflow changes: none.
- Release effect: none; release readiness remains `NOT READY`.

## Canonical baseline

Research was performed against canonical `main`:

`de8f2ebb011b521f6b6724716bc664f4c422d7ea`

At research start:

- open pull requests: 0;
- open issues: 0;
- preceding P0-073 merge had exact-canonical push Repository Integrity success (`#604`);
- the current registry definition is:

> `createPublicLinks` is generation/revocation policy: disabling it forbids old not-yet-started publish authority without pretending an already-started unknown publish was cancelled.

This tranche does not alter the registry row or status.

## Executive finding

The P0-078 root cause remains present in current source.

WebClip currently treats publication intent as a captured boolean in two places:

1. the live upload operation retains `config.createPublicLinks` from an earlier configuration read and later uses that old boolean to decide whether to start `PUT /resources/publish`;
2. the durable remote-save checkpoint stores only `createPublicLinks: Boolean(createPublicLinks)`, and restart/maintenance recovery later uses that persisted boolean to decide whether to start a new publish mutation.

There is no `publicationGeneration`, revocation generation, or equivalent current-policy receipt in `service-worker.js`.

Therefore an operation admitted while link creation is enabled can remain *not yet published*, the user can disable link creation, and the stale operation can still start a new publication afterward. The recovery case survives worker restart because the stale boolean is durable.

The inverse correction must also be avoided: disabling future publication must not erase or hide an already observed public URL. Current source usefully observes `public_url` during final verification/recovery even when no new publication should be started. Publication policy authority, observed public state, and explicit unpublish outcome are separate facts.

Once a publish request has actually been admitted, a later local disable is not evidence that the remote mutation was cancelled. Unknown settlement has to be reconciled without blind duplicate publish and without falsely declaring the object private.

Fresh current source reproduces the historical P0-078 mechanism. No new P-code is allocated.

## Current-source proof

### 1. Registry explicitly defines generation/revocation semantics

`project_docs/RESEARCH_REGISTRY.md` currently lists:

`P0-078 | ACTIVE | createPublicLinks is generation/revocation policy: disabling it forbids old not-yet-started publish authority without pretending an already-started unknown publish was cancelled.`

This is the single current owner/status authority.

### 2. `getYandexConfig()` exposes only a boolean publication preference

Current `service-worker.js::getYandexConfig()` reads current storage and returns, among the Yandex settings:

- `clientId`;
- `rootPath`;
- `createPublicLinks`;
- backup settings.

`createPublicLinks` is normalized as:

```js
createPublicLinks: yandexConfig.createPublicLinks !== false
```

No publication-policy generation/revocation receipt is returned.

A fresh current-source search found no `publicationGeneration` symbol in `service-worker.js`.

### 3. Live upload retains stale publication authority

Current `uploadCachedRecordToYandex(...)` captures a `config` object earlier in the operation.

When it creates the durable remote checkpoint it records:

```js
createPublicLinks: config.createPublicLinks
```

Later, after folder preparation, remote upload/reuse work, and durable checkpoint creation, it decides whether to publish using the same retained snapshot:

```js
if (config.createPublicLinks) {
  publicUrl = await ensureYandexPublicUrl(remotePath, operationId);
}
```

There is no fresh generation/revocation admission check immediately before the mutating publish path.

Exact race:

1. operation reads `createPublicLinks=true`;
2. user changes settings to false while operation is awaiting earlier work;
3. no publish has started yet;
4. old operation reaches the branch above;
5. stale `true` starts a new public-link mutation after user revocation.

### 4. Durable checkpoint stores only the old boolean

`checkpointPendingRemoteSaveIntent(...)` builds a durable pending row containing:

```js
createPublicLinks: Boolean(createPublicLinks)
```

The checkpoint has phases such as `prepared` / remote verification state, but publication authority is not represented as a versioned policy capability.

This makes the stale authority restart-persistent.

### 5. Recovery can start publication solely from the stale checkpoint boolean

`recoverPendingRemoteSaves(...)` reads remote metadata and derives any already observed public URL:

```js
let publicUrl = metadata?.public_url
  ? normalizeYandexPublicUrlFromApi(metadata.public_url)
  : String(current.data.publicUrl || '');
```

Then it does:

```js
if (current.createPublicLinks && !publicUrl) {
  publicUrl = await ensureYandexPublicUrl(remotePath, ...);
}
```

There is no current publication-generation comparison before that new mutation.

Exact restart schedule:

1. checkpoint A is created with `createPublicLinks=true`;
2. worker stops before publication starts;
3. user disables link creation;
4. worker restarts later;
5. recovery finds the exact private object;
6. old checkpoint boolean remains true;
7. recovery starts publication despite the newer disable.

A simple read of the latest boolean would improve the `true -> false` case but is still not sufficient for `true -> false -> true`: an old operation from generation 1 must not inherit authority from unrelated generation 3 merely because both booleans are true.

### 6. `ensureYandexPublicUrl()` performs a real mutation

Current helper behavior is:

1. GET metadata / read existing public URL;
2. if no URL exists, call:

```js
await yandexApi('/resources/publish', {
  method: 'PUT',
  query: { path: remotePath },
  ...
});
```

3. repeatedly observe metadata/public URL to settle the result.

The pre-publish GET creates an additional narrow race window: publication can still be revoked while that GET is in flight but before the `PUT` has started. A generation/revocation fence therefore belongs at mutation admission, not only at the beginning of the whole save operation.

### 7. Unknown publish settlement is already treated as potentially successful

`ensureYandexPublicUrl()` captures an error from the publish request, then repeatedly reads the public URL before deciding whether the operation failed.

That is an important positive control: a caller-side error/timeout does not automatically prove the remote publication failed.

P0-078 must preserve this distinction. If policy is disabled *after* the publish request was admitted, the correct state is not “cancelled”; it is an admitted/unknown publication outcome until observation or an explicit revocation saga establishes terminal truth.

### 8. Observed public state is preserved independently of new-publish preference

Live upload final verification always requests metadata fields including `public_url` and then does:

```js
if (!publicUrl) publicUrl = normalizeYandexPublicUrlFromApi(metadata?.public_url || '');
```

Recovery similarly derives `publicUrl` from remote metadata before deciding whether to call `ensureYandexPublicUrl()`.

Therefore current source already has a useful separation:

- `createPublicLinks=false` can prevent an intentional *new* publish in the normal path;
- an object that is already public is still observed truthfully.

That behavior must remain. Privacy cannot be protected by hiding a real public URL from local state.

### 9. No production `/resources/unpublish` path exists

A fresh exact-source search of current `service-worker.js` found no `/resources/unpublish` request.

Therefore changing `createPublicLinks` to false currently expresses only a future-publication preference. It does not itself prove that an already published Yandex object has been made private.

That is not itself assigned to P0-078: explicit unpublish/privacy lifecycle is owned by P0-069/P1-164. It is nevertheless a critical boundary for implementing P0-078 correctly.

## Exact deterministic schedules

### Schedule A — live not-yet-started publish after disable

1. Save A snapshots publication enabled, policy generation G1.
2. File upload/reuse and checkpoint work continue.
3. User disables link creation, advancing publication policy to G2/revoking G1.
4. A has not yet admitted `PUT /resources/publish`.
5. A later evaluates stale `config.createPublicLinks === true`.
6. A sends a new publish request.

Result: an old capability starts a privacy-sensitive mutation after it was revoked.

### Schedule B — restart recovery after disable

1. A checkpoint is durable with old `createPublicLinks=true`.
2. Worker stops before publish admission.
3. User disables publication.
4. Recovery starts after restart.
5. Private exact object is found.
6. Recovery uses old checkpoint boolean and starts publish.

Result: revocation is not restart-safe.

### Schedule C — true -> false -> true stale resurrection

1. A captures enabled generation G1.
2. User disables publication: G2.
3. User later re-enables for new actions: G3.
4. Old A resumes.
5. Checking only current boolean sees `true`.

Result: A must still fail because G1 != G3. Boolean equality does not restore old capability authority.

### Schedule D — disable after publish admission

1. A proves publication authority G1 and durably records/adopts a “publish admitted / settlement unknown” phase.
2. `PUT /resources/publish` is sent.
3. Local caller times out / response becomes unknown.
4. User disables future publication, advancing to G2.
5. Remote G1 request may already have succeeded.

Result: G2 revocation prevents *new* G1 publication admission/retry, but cannot be treated as proof that the already admitted request was cancelled. Recovery must observe/reconcile; explicit unpublish belongs to P0-069/P1-164.

### Schedule E — object was already public while preference is false

1. Exact remote object is already public for an independent/prior reason.
2. Current publication setting is false.
3. Save/recovery reads metadata.

Result: WebClip must retain/surface the observed public URL while starting no new publish mutation. Hiding the URL would turn a privacy exposure into false local “private” state.

### Schedule F — valid policy, wrong object

1. Current publication generation is valid/enabled.
2. Candidate remote object is only path/type/size-compatible and exact object identity is not proven.
3. Code reaches publication decision.

Result: policy authorization cannot substitute for P1-184 exact-object proof. Publication must fail closed before mutation.

### Schedule G — exact object, revoked policy

1. Exact object/namespace proof is strong.
2. Publication generation has been disabled/revoked.

Result: exact object identity cannot override privacy-policy revocation. P0-078 remains an independent gate.

## Historical duplicate reconciliation

`project_docs/RESEARCH_FAMILY_YANDEX_REMOTE_IDENTITY_EVIDENCE.md` already preserves the relevant retired deltas, especially:

- `RESEARCH_DELTA_PUBLICATION_POLICY_2026-08-27.md`;
- `RESEARCH_DELTA_PUBLICATION_OBSERVATION_POLICY_SEPARATION_2026-08-28.md`;
- `RESEARCH_DELTA_YANDEX_MIXED_ROOT_PUBLICATION_CONTEXT_2026-08-28.md`;
- `RESEARCH_DELTA_JOURNAL_REPLACE_VERIFIED_PUBLIC_OBJECT_RECEIPT_2026-08-28.md`;
- `RESEARCH_DELTA_DESTRUCTIVE_PUBLICATION_LIFECYCLE_2026-08-27.md`.

Historical evidence already states the same critical rules:

- P0-078 owns authority to start a new publish mutation under a current privacy-policy generation;
- old checkpoint `createPublicLinks=true` cannot publish after a newer disable;
- `true -> false -> true` requires generation identity, not boolean equality;
- observed public state must remain visible even when future publication is disabled;
- an already-started unknown publish is not cancelled by changing the setting;
- P0-069/P1-164 own explicit unpublish/revocation lifecycle;
- P1-184 owns exact remote object/content proof;
- P0-074 owns the broader immutable Yandex operation context.

Fresh current-source review reproduces the same mechanism. Therefore:

- no new P-code is assigned;
- P0-078 remains the single owner for this publication-authority root;
- status remains `ACTIVE / ROOT-CAUSE-REVALIDATED`.

## Current external evidence

Fresh official Yandex material was reviewed on 2026-09-13.

### Yandex Disk REST API is an explicit HTTP mutation surface

Current Yandex Disk REST documentation describes management of Disk files/folders through HTTP API calls:

- https://yandex.ru/dev/disk-api/doc/ru/
- https://yandex.ru/dev/disk/rest/

This supports treating WebClip's `PUT /resources/publish` as an external side effect rather than a local preference update.

### Public access is externally observable access, not merely local metadata

Current Yandex Disk terms describe public access as access to a file for internet users who know the file's link:

- https://yandex.ru/legal/disk_termsofuse/ru

This makes stale publication authorization privacy-sensitive: creating a public link changes who may access the remote resource.

### Publish and unpublish are distinct operations

Current official Yandex Disk command documentation exposes separate `publish` and `unpublish` commands:

- https://yandex.com/support/yandex-360/customers/disk/desktop/linux/en/cli-commands

Current Yandex 360 audit-event documentation likewise distinguishes creation of public/shared access (`disk_fs-set-public`) from removal/closing of access (`disk_fs-set-private`):

- https://yandex.ru/dev/api360/doc/ru/audit-logs/get-logs

These sources do not prove the WebClip race. They establish that creating and removing public access are distinct external state transitions. The WebClip race is proven by combining that provider semantics with current source, where publication authorization is only an old boolean and no unpublish operation exists in the worker.

## Deterministic model

Added research model:

`project_tools/test_p0_078_publication_generation_revocation_model.js`

Environment:

- Node.js `v22.16.0`.

Commands:

```text
node --check project_tools/test_p0_078_publication_generation_revocation_model.js
node project_tools/test_p0_078_publication_generation_revocation_model.js
```

Result:

`PASS 68 checks`

SHA-256 of the prepared model:

`5ddc7fc6fdc10a40c4e1283985dcc224faa4704b8d5d541efac9ae78ca0d4bd0`

Git blob of the prepared model:

`1461c53d17405442b35c11a159fdaa215d5e82d2`

### Model coverage

The model covers:

1. current-style live stale-true publication after disable;
2. current-style recovery stale checkpoint publication after disable;
3. current disabled policy rejects before mutation;
4. `true -> false -> true` generation mismatch remains revoked for old receipt;
5. exact current enabled generation positive control;
6. checkpoint `createPublicLinks=false` starts no publish;
7. already-public object remains truthfully observed under disabled policy;
8. disabled future publication does not fabricate unpublish;
9. missing/legacy publication generation fails closed for new publish;
10. explicit revocation generation supersedes enabled bit;
11. P0-073 namespace proof precedes publication authority;
12. P1-184 exact-object proof precedes publication authority;
13. operation ID cannot replace generation authority;
14. post-admission disable preserves unknown settlement rather than declaring cancellation;
15. late admitted success after disable is observed without duplicate publish;
16. P0-072 reset composition preserves admitted publication receipt;
17. pre-admission publication work may be dropped/cancelled by reset model;
18. P0-076 stale Journal generation blocks late local finalization;
19. future-publication revocation does not erase stable remote resource identity;
20. valid publication generation cannot compensate for weak object proof;
21. exact object proof cannot override revoked publication policy;
22. a newly authorized receipt under a later re-enabled generation can publish;
23. unrelated new-generation success does not revive an old receipt;
24. observing a public URL on object A grants no publish authority for object B.

This is a bounded deterministic acceptance model, not a claim of real Yandex E2E execution.

## Research invariant

The strongest compact invariant supported by current evidence is:

> Publication is a separately versioned, revocable capability, not a sticky boolean on an upload/recovery receipt. Every new `publish` admission must prove the exact still-authorized publication generation for the same immutable Yandex namespace/object. A stale `createPublicLinks=true` operation may preserve historical intent and may reconcile an already-admitted unknown result, but it cannot start or retry a new publication after policy supersession/revocation. Existing remote public state must remain truthfully observable; making it private requires a separate explicit unpublish/revocation lifecycle.

## Candidate implementation direction — not accepted architecture

A plausible future closure direction is:

- maintain a monotonic publication-policy generation in durable settings;
- increment/supersede it on privacy-relevant publication preference changes;
- bind a publication authorization receipt to the exact upload/recovery operation, account/root/object receipt and publication generation;
- immediately before a *new* `/resources/publish` admission, compare the operation receipt against the current generation and enabled/revocation state;
- durably distinguish `publish-not-started`, `publish-admitted-unknown`, `publish-verified` and explicit `unpublish/revocation` outcomes;
- after publish admission, never treat a later local setting change or timeout as cancellation evidence;
- reconcile unknown admitted publication by exact namespace/object observation without blind publish retry;
- preserve an observed `publicUrl` even when current future-publish policy is false;
- route explicit removal of existing public access through the P0-069/P1-164 unpublish lifecycle;
- compose with P0-073 namespace fencing and P1-184 exact-object/content proof before publication;
- carry P0-074 immutable operation context across all remote requests;
- preserve P0-072 admitted side-effect receipts across reset;
- require P0-076 CAS before late local Journal settlement.

This document does not choose or implement runtime architecture.

## Owner boundaries

- `P0-078`: generation/revocation authority for starting a new publication mutation; stale policy cannot regain authority.
- `P0-069`: deleting local management state for an already-public remote object requires an explicit publication/privacy outcome.
- `P1-164`: per-entry durable/reconciled unpublish lifecycle and resulting public identity semantics.
- `P0-074`: one immutable Yandex auth/account/root/config/publication operation context across a long operation.
- `P0-073`: exact account/root namespace authority before remote observation/mutation.
- `P1-184`: exact remote object/content creation/adoption/unknown-settlement proof.
- `P0-072`: admitted external publication/unpublication receipts survive Journal reset/replace.
- `P0-076`: stale late local settlement cannot mutate a replacement Journal entry.

These owners compose. This tranche does not merge or close any adjacent owner.

## Closure evidence still required

P0-078 must remain `ACTIVE` until implementation and evidence prove, at minimum:

1. exact-source regression for live upload `enabled G1 -> disabled G2` before publish admission: zero publish calls;
2. restart recovery of old G1 checkpoint after G2 disable: zero new publish calls;
3. `true G1 -> false G2 -> true G3`: old G1 remains unauthorized while a new G3 operation succeeds;
4. generation/revocation check occurs at the actual new publish admission boundary, including the GET-before-PUT race window;
5. missing/legacy generation fails closed for new publication without hiding observed public state;
6. an already-public exact object remains truthfully reported when future publication is disabled;
7. already-admitted publish + timeout/disable is retained as unknown until exact reconciliation, with no blind duplicate publish;
8. exact P0-073 namespace + P1-184 object proof is required before publish;
9. P0-074 immutable context prevents account/root/config retargeting between authorization and request;
10. P0-072 reset/replace composition preserves admitted publication receipts;
11. P0-076 local finalization rejects stale replacement generation;
12. P0-069/P1-164 unpublish path proves explicit revocation instead of treating `createPublicLinks=false` as remote-private proof;
13. authorized isolated real-Yandex E2E covers publish, policy supersession before admission, unknown settlement, observation and explicit unpublish/revocation behavior;
14. exact-head Repository Integrity and post-merge integrity on the eventual implementation PR.

No Yandex credentials were available or used in this research tranche, so no real-Yandex L5 closure is claimed.

## Release interpretation

Project-wide deep-research coverage remains complete. This tranche revalidates one already-known critical privacy owner; it does not make critical closure complete and does not make the project release ready.

`P0-078` remains `ACTIVE / ROOT-CAUSE-REVALIDATED`.

No build, tag, deploy or Release is authorized or created by this research checkpoint.
