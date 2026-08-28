# Audit delta — mixed-root publication authorization inside one Yandex operation — 2026-08-28

Source-of-truth `main` immediately before this write: `d4ccfb01f0515511b09d149bed79cb07b3fce322`.

Docs-only audit checkpoint. Runtime/configuration/tests/manifest are unchanged. No new P-number is assigned.

## Classification

Fresh source proof composes existing **P0-074** immutable Yandex operation context with **P0-078** publication-policy generation, plus **P0-073/P1-184** namespace/object proof and **P1-158** bounded prerequisite reads.

Previous single-operation-context audit proves current upload can mix root A metadata with path C. This pass adds a stronger privacy consequence: **publication authorization from old config generation A can be applied to a remote object created under newer root/config generation B where publication is currently disabled.**

No new root cause is needed; P0-078 cannot be implemented as an independent boolean fence detached from P0-074's full config/namespace context.

## Current upload captures publication policy early

`uploadCachedRecordToYandex()` obtains an initial:

`const config = await getYandexConfig()`.

Later it stores publication policy in the remote checkpoint using:

`createPublicLinks: config.createPublicLinks`.

After upload/reuse checkpointing it decides whether to publish with:

`if (config.createPublicLinks) ensureYandexPublicUrl(remotePath, ...)`.

Thus publication authorization is taken from the original local `config` object retained by the operation.

## Service-folder/root work can use a different config generation

The same operation later calls helpers such as `ensureYandexServiceFolders()` that independently read current Yandex config/root/auth.

The prior single-operation-context delta already proves this can make `remotePath` come from a newer root C while the checkpoint's `rootPath` comes from older config A.

Publication now reveals why mixed config fields are more than recovery inconvenience.

## Deterministic stale-policy/new-root publication schedule

Assume configuration generation A is:

- `rootPath = R1`;
- `createPublicLinks = true`.

Then user/import commits generation B:

- `rootPath = R2`;
- `createPublicLinks = false`.

Valid schedule:

1. Upload U begins under A and captures local `config=A`.
2. Before service-folder preparation, settings B commits atomically/currently.
3. `ensureYandexServiceFolders()` fresh-reads B and returns Upload/ReadmeLater paths under R2.
4. U constructs `targetFolder` / `remotePath` under **R2**.
5. U can checkpoint/upload/reuse an object at R2 path while other current requests use current auth/config state.
6. Publication branch later checks **old** `config.createPublicLinks === true` from A.
7. U calls `ensureYandexPublicUrl(remotePath)` for the **R2** object.
8. Current policy B explicitly says public links are disabled, but stale authorization from A is applied to an object in B's namespace generation.

The resulting operation state never existed as one user configuration: `{root=R2, publish=true}` is synthesized by mixing A and B.

## Why this is stronger than ordinary P0-078 stale checkpoint recovery

P0-078 already proves an old checkpoint captured with `createPublicLinks=true` can later publish during recovery after the user disables the global setting.

This pass adds a within-one-live-operation composition:

- stale publication authorization A;
- newly selected root/path B;
- potentially newer auth/account generation;
- one remote object receiving the combined side effect.

So fixing only recovery to recheck publication policy is insufficient. The live operation itself must never assemble policy and target namespace from different config generations.

## Why rechecking only the boolean before publish is also insufficient

A naive patch could fresh-read current `createPublicLinks` immediately before `ensureYandexPublicUrl()`.

That prevents the exact stale-true/now-false publish, but it still lets an old operation silently switch semantic generations mid-flight:

- initial authorization/context A;
- target path B;
- final publication policy C.

If current boolean happens to be true again after disable/re-enable, A→B→C can pass value equality while representing different user decisions/generations.

The invariant is **same immutable operation context**, not last-value-wins boolean freshness.

## Required `YandexOperationContext`

At operation admission create one immutable context generation binding at least:

- config generation/revision;
- normalized rootPath;
- `createPublicLinks` publication policy + policy generation;
- auth session/token generation (secret represented by fingerprint/nonce, not logged);
- proven account UID;
- client/config fields required by this operation;
- worker operation receipt;
- source/PDF generation as appropriate.

Every helper receives that context or an expected generation. Helpers may fresh-read current state only to prove the context is still allowed/current; they may not substitute individual new fields into the old operation.

## Two acceptable policy models

### Frozen-context model

Once save U is explicitly admitted under context A, it executes entirely under A so long as A's auth/context remains valid according to product policy.

A settings change to B does not silently retarget U to R2. U continues R1/A or is canceled/staled before another side effect.

For privacy-sensitive publication, product may choose a stricter rule that disabling publication immediately revokes any not-yet-started publish even for an otherwise frozen upload. In that case the revocation is an explicit generation check, not adoption of arbitrary new config fields.

### Current-generation-required model

Any config generation change invalidates not-yet-settled U. U fails stale before further external side effects and user explicitly starts a new B operation.

This is simpler and safest where preserving old auth/root context is impractical.

Both models prohibit mixing R2 with A's publication authorization.

## P0-078 publication revocation precedence

For privacy, disabling public links should revoke authority for a publish side effect that has **not yet been admitted**.

Therefore even under a frozen-context upload model:

- transfer already admitted may need to settle/reconcile under its exact old receipt;
- a later publish step requires a current permission/policy fence;
- if policy generation was revoked before publish admission, do not publish;
- if publish was already admitted and outcome becomes unknown, retain exact publication attempt receipt and reconcile rather than falsely claiming private.

This separates upload physical settlement from publication authorization.

## Checkpoint coherence

Remote checkpoint must not contain impossible combinations such as:

- `rootPath=R1` but `remotePath=R2/...`;
- account UID from auth B but token-side effects from A;
- publication policy generation A attached to object generation B;
- PDF/content receipt from another retry generation.

Checkpoint admission should assert internal context coherence before any irreversible signed PUT/publish proceeds.

## P1-158 bounded-read consequence

`getYandexConfig()` is currently a direct unbounded `chrome.storage.local.get` helper in several worker paths.

Making that read bounded is required, but not sufficient. A correct context acquisition needs:

1. bounded read of one versioned config snapshot;
2. exact config revision/generation included in the returned context;
3. bounded/proven account/auth snapshot belonging to the same admission generation;
4. no later helper silently replacing pieces with fresher unrelated snapshots.

Bounded independent reads can still produce a logically mixed context if they are not generation-related.

## Required regressions

1. Start under `{R1,publish=true}` -> change to `{R2,publish=false}` before folder ensure -> operation never publishes an R2 object using old true.
2. Same schedule -> checkpoint never stores `root=R1` with `remotePath=R2/...`.
3. Start A -> settings disable publication before publish step while upload already settled -> no new publish is admitted; upload reconciliation remains valid.
4. Publish already admitted under A -> user disables -> outcome unknown -> exact publish attempt is reconciled; UI does not claim private solely from new setting.
5. A publish=true -> B false -> C true with same textual root -> delayed A cannot become current merely because boolean equals C again; generations distinguish them.
6. Root changes without publication toggle -> operation remains one coherent root generation or fails stale; no path/config mixing.
7. Auth/account changes while root/policy values remain equal -> operation generation still detects replacement and does not mix tokens/account receipts.
8. Recovery uses the immutable checkpoint context and does not reconstruct publication authorization from whichever current config value happens to exist.
9. A remote object is observed as already public while policy=false -> observed publication truth remains recorded (publication-observation delta); false policy means no **new publish authorization**, not denial of existing remote state.
10. Explicit unpublish/delete privacy lifecycle remains P0-069/P1-164 and is not inferred from createPublicLinks toggle.
11. Bounded config/auth read timeout fails before external admission and a late read result cannot silently resume old operation under a new generation.
12. Stable one-generation save retains normal current behavior.

## Duplicate check

- **P0-074** primary immutable Yandex operation/config/auth context.
- **P0-078** publication-policy generation/revocation before publish admission.
- **P0-073** account/root namespace receipt.
- **P1-184** exact physical remote object/content proof.
- **P1-158** bounded prerequisite reads feeding, not replacing, context generation.
- **P0-069/P1-164** remain explicit unpublish/destructive publication lifecycle.

No P1-211 is created.

## Test / release state

Documentation only. Product tests were not rerun. Historical gate remains **88/88 syntax + 74/74 deterministic PASS**. No build/tag/Release was created.
