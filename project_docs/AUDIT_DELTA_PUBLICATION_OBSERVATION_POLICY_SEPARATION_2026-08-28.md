# Audit delta — publication observation vs policy authority — 2026-08-28

Source-of-truth `main` immediately before this write: `17fa22461643ea4d145622990a2bc18754e96a04`.

Docs-only audit checkpoint. Production runtime, tests, configuration and `manifest.json` are unchanged. Canonical large-table synchronization is not claimed by this file.

## Classification

No new P-number is assigned.

Fresh source proof refines the composition of existing:

- **P0-078** — publication-policy generation / revocation of not-yet-started publish authority;
- **P0-069 / P1-164** — explicit unpublish/privacy outcome before deleting the local management reference;
- **P1-184** — exact remote object/content proof and unknown external-settlement reconciliation;
- **P0-074** — immutable Yandex config/account/root operation generation.

The key distinction is that **publication policy, observed publication state, and unpublish outcome are three different facts**. Future fixes must not collapse them into one `createPublicLinks` boolean.

## Fresh positive control — `createPublicLinks=false` does not erase observed public state

`uploadCachedRecordToYandex()` currently behaves correctly in one important respect:

1. when the operation's captured `config.createPublicLinks` is false, it skips `ensureYandexPublicUrl()` and therefore does not intentionally start a new `/resources/publish` mutation;
2. final verification still reads Yandex metadata including `public_url` and `resource_id`;
3. if a public URL is already present, `publicUrl` is filled from `metadata.public_url`;
4. `markPendingRemoteSaveVerified()` stores that observed URL into the durable checkpoint/Journal data;
5. the successful content-page result returns `publicUrl`, and the UI exposes an `Открыть файл на Яндекс Диске` action when one exists.

The recovery path has the same useful property. `recoverPendingRemoteSaves()` first derives `publicUrl` from current remote metadata regardless of `current.createPublicLinks`; it only calls `ensureYandexPublicUrl()` when the checkpoint says publication was requested and no public URL is already observed.

Therefore a file that was already public before the current save/retry is not falsely rewritten as private merely because the current setting says not to create new permanent links.

This behavior must be preserved.

## Why `false` is not proof of privacy

The Options wording already describes the setting as:

`Создавать постоянную ссылку Яндекс Диска для каждого успешно загруженного PDF`

and warns that a published file remains accessible to anyone holding the link until publication is disabled on Yandex Disk.

Thus `createPublicLinks=false` is an **authorization policy for future publish mutations**, not an assertion that every matching remote object is private.

A reused path can already contain a public object; a prior unknown publish attempt can settle late; recovery can rediscover a public URL after the global setting was disabled. In every such case WebClip should retain and surface the observed public state rather than hide it.

## Existing P0-078 defect remains unchanged

The positive observation behavior does not fix stale publication authority.

A remote-save checkpoint stores only `createPublicLinks: Boolean(createPublicLinks)` from operation admission. `recoverPendingRemoteSaves()` can later execute `ensureYandexPublicUrl()` solely because this stale checkpoint boolean is true.

Therefore:

1. operation/checkpoint A is admitted while publishing is enabled;
2. user disables publication globally before A starts `/resources/publish`;
3. A is later recovered;
4. `current.createPublicLinks === true` from the old checkpoint;
5. recovery can start a new publish mutation after the user's revocation.

The existing P0-078 generation rule remains mandatory. A current boolean check alone is also insufficient for `true -> false -> true`: an old checkpoint must not regain authority automatically when a later unrelated generation happens to be enabled again.

## Required state separation

The remote-save/publication lifecycle should represent at least the following independent dimensions.

### 1. Policy authority

Durable fields/receipt describing whether this operation generation is authorized to start a **new** publish mutation:

- publication-policy generation captured at admission;
- current policy generation/revocation state;
- optional explicit re-authorization receipt if product supports resuming an old operation after a later user decision.

A revoked generation cannot start publish.

### 2. Observed remote publication state

Facts obtained from current remote metadata, independent of whether WebClip caused them:

- public URL observed;
- publication known present;
- publication known absent only when the provider response is sufficiently authoritative for that conclusion;
- publication state unknown when the read itself is unavailable/ambiguous.

Observed public state must not be cleared merely because policy is disabled.

### 3. Publish-operation settlement

If WebClip itself starts `/resources/publish`, preserve a phase/receipt such as:

- not started;
- authorized but not started;
- request started / settlement unknown;
- verified published;
- verified failed/absent under a future authoritative provider contract.

A local timeout or policy change after the PUT was sent is not cancellation.

### 4. Unpublish outcome

Unpublish is a separate destructive/privacy lifecycle owned by P0-069/P1-164:

- user requested revoke or intentionally retain public access;
- unpublish not started / started unknown / verified absent;
- stable `resourceId` remains the file identity after confirmed unpublish unless the provider actually proves otherwise.

Global `createPublicLinks=false` must never be implemented as silent automatic unpublish, and confirmed unpublish must not be represented merely by changing the future-publish setting.

## Reuse/recovery consequences

### Existing public object + policy disabled

If retry/recovery proves the exact intended object under P1-184 and metadata already exposes a public URL:

- do not call `publish`;
- retain the observed `publicUrl` and stable `resourceId`;
- surface that the object is already public even though future link creation is disabled;
- do not silently claim privacy.

### Existing non-public object + stale old `publish=true` checkpoint

If the current publication-policy generation revoked A before publish started:

- recovery may still verify/reconcile the remote file itself;
- A must not publish it;
- the file can finalize as non-public if all other object/Journal gates are satisfied;
- re-enabling publication later does not resurrect A's old authority without a fresh user-authorized generation.

### Publish request already started + later disable

If A already sent the mutating publish request:

- current policy prevents future new publish attempts but cannot retroactively cancel A;
- metadata reconciliation must determine whether the object became public;
- if public, preserve/surface the public URL even though current policy is false;
- do not blind-retry publish solely because the first response was lost.

## P1-184 composition

An observed `public_url` is evidence about publication state, not proof that the **object itself belongs to this operation**.

Before a public URL/object is adopted into the Journal, P1-184 still requires exact object/content/attempt provenance. In particular, the current `allowExisting` path still accepts an existing file primarily from path + exact byte size; publication-state truthfulness does not weaken the already documented requirement for stronger object identity/content proof.

A foreign same-size public file must never become the operation's Journal result merely because its `public_url` is valid.

## Required deterministic regressions

1. `createPublicLinks=false`, exact intended object already public before retry: no new publish call; observed `publicUrl` remains stored/surfaced.
2. Same case with exact intended object non-public: no publish call and no fabricated public URL.
3. Checkpoint A captured publish enabled; user disables before publish starts; recovery A cannot call `/resources/publish`.
4. `true -> false -> true`: old A remains revoked unless explicitly re-authorized by a new generation contract.
5. Publish request A starts, response is lost, then policy becomes false; reconciliation may record a discovered public URL without issuing blind publish retry.
6. Disabling future link creation does not clear an already observed `publicUrl` or stable `resourceId` from a verified entry.
7. Confirmed unpublish clears publication state/URL while preserving stable object identity where supported.
8. Unknown unpublish settlement retains local management/privacy evidence and blocks destructive local-entry removal under P0-069.
9. Same-size unrelated public object at the expected path is rejected by P1-184 object/content proof even though its `public_url` is valid.
10. UI distinguishes `future link creation disabled` from `this exact object is already public` and never presents the former as proof of the latter's privacy.

## Duplicate check

No new item is created.

- **P0-078** owns authority to start a new publish mutation under a current privacy-policy generation.
- **P0-069/P1-164** own explicit unpublish/privacy outcome and preservation of management identity.
- **P1-184** owns exact remote object/content proof and unknown external settlement.
- **P0-074** supplies immutable config/account/root generation but does not replace the stronger privacy revocation semantics.

This checkpoint chiefly prevents an incorrect future implementation: fixing stale publish authorization by dropping `publicUrl` whenever `createPublicLinks=false` would hide real public exposure rather than protect privacy.

## Test / release state

No product tests were rerun for this docs-only checkpoint. The last proven product gate remains the historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Runtime/version remain unchanged (`0.9.8`). No build, tag or Release was created.