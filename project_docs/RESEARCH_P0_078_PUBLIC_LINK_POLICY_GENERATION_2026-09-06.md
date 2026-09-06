# P0-078 — public-link policy generation / revocation authority — 2026-09-06

Date: 2026-09-06  
Canonical source baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Canonical `service-worker.js` blob: `6d61ac81befdbf2804ae9dbec425aa08d1194eb1` (570842 bytes)  
Canonical `options.js` blob: `e603455b346f56d047a650b03986453c3ad663a9`  
Working branch: `research/p0-078-public-link-policy-generation-2026-09-06`  
Owner: **P0-078 ACTIVE**.

This is a docs/model research checkpoint. Production runtime and manifest are unchanged.

## 1. Canonical requirement and owner

`RESEARCH_REGISTRY.md` defines P0-078 as:

> `createPublicLinks` is generation/revocation policy: disabling it forbids old not-yet-started publish authority without pretending an already-started unknown publish was cancelled.

Current product requirements additionally say that, when the setting is enabled, WebClip may publish an uploaded Yandex resource and persist its `publicUrl`, and the user must be warned that possession of the link can grant access.

This owner is about **authority to start publication**, not generic Yandex auth/account coherence (P0-074), exact remote object identity (P1-184/P1-090), user-initiated per-entry unpublish (P1-164), Journal deletion/publication outcome (P0-069), or Options transport-loss UI reconciliation (P1-210).

## 2. Fresh current-source proof

### 2.1 Dedicated preference writer is only a Boolean mutation

Current `saveYandexPreferences()` calls `updateYandexConfig()` and directly assigns:

```text
config.createPublicLinks = Boolean(preferences.createPublicLinks)
```

There is no durable public-link policy generation/revision.

This writer has a useful positive property: the patch is narrow and does not overwrite unrelated Yandex fields.

### 2.2 User-settings import is a second authority writer

Current user-settings import builds a new `nextYandexConfig` and writes:

```text
createPublicLinks: normalized.yandex.createPublicLinks
```

inside one bundled `chrome.storage.local.set(...)` together with the import reconciliation marker and other user settings.

Current barriers are a positive control:

- direct `updateYandexConfig()` waits for an in-flight user-settings import;
- `importUserSettings()` waits for prior Yandex config mutation settlement.

Therefore a single publication-policy transition function can be shared by both writer paths without allowing them to physically overtake each other.

However neither writer currently advances an exact privacy-policy generation.

### 2.3 Upload freezes the Boolean, not revocable authority

`uploadCachedRecordToYandex()` reads `const config = await getYandexConfig()` and later creates the durable remote-save checkpoint with:

```text
createPublicLinks: config.createPublicLinks
```

After upload/reuse it executes:

```text
if (config.createPublicLinks) {
  publicUrl = await ensureYandexPublicUrl(remotePath, operationId);
}
```

So an operation that read `true` retains a local Boolean snapshot even if the user has since committed `false`.

### 2.4 Recovery can publish an old Boolean after the setting was disabled

`recoverPendingRemoteSaves()` currently reads the checkpoint field:

```text
current.createPublicLinks
```

and, if metadata has no `public_url`, may call:

```text
ensureYandexPublicUrl(remotePath, ...)
```

There is no comparison with a durable current publication-policy generation.

Thus a checkpoint created under old policy `true` can start a new publication side effect after the user has already disabled publication.

### 2.5 Current runtime has no unpublish path

Fresh inspection found no `resources/unpublish` path in `service-worker.js`.

This is not by itself a P0-078 defect: disabling automatic publication is not specified as a hidden mass unpublish of historical links. Explicit per-entry revoke remains P1-164; delete-with-publication-outcome remains P0-069.

It does prove that current `false` cannot be interpreted as having remotely revoked any link that was already created.

## 3. Deterministic failure schedules

### Schedule A — disable after upload, before publish

```text
policy G1 = enabled
operation U reads G1
U uploads/reuses remote file
user commits policy G2 = disabled
U reaches old local `if (config.createPublicLinks)`
U publishes using stale true
```

Current runtime violates P0-078 because G2 committed before U started publication authority.

### Schedule B — recovery resurrects old publication authority

```text
checkpoint U created under old true
worker stops before publish
user disables publication -> G2
later maintenance recovers U
current.createPublicLinks == true
recovery calls ensureYandexPublicUrl()
```

The new worker starts a publication after revocation.

### Schedule C — ABA `true -> false -> true`

```text
U belongs to G1=true
G2=false revokes U before publication admission
G3=true is later enabled for future operations
```

A plain comparison of current Boolean `true` would wrongly resurrect U.

Required rule:

```text
G3=true != authority G1
```

Re-enabling creates authority only for operations admitted under G3. It never restores a revoked G1 operation.

### Schedule D — publication was already admitted when disable commits

```text
U under G1 passes exact policy check
U durably enters publicationPhase=admitted
then G2=false commits
network result for U is lost/unknown
```

G2 cannot truthfully classify U as cancelled. The publish side effect was already admitted under G1 and may have happened remotely.

Recovery must reconcile U's exact remote publication state. It must not fabricate `not public` from current settings.

### Schedule E — import disables publication

A settings import that changes `createPublicLinks true -> false` must produce the same policy-generation transition and revocation barrier as the checkbox writer.

Otherwise P1-008 could atomically commit user settings while P0-078 still allowed old operations to publish because only the dedicated checkbox advanced policy authority.

## 4. What “publication started” means

The remote network call cannot be made atomic with a concurrent `chrome.storage.local` settings write.

The implementable authority boundary is therefore a **durable publication admission receipt written before the first publish mutation**.

Conceptually:

```text
operation publication phase = eligible
-> enter shared policy admission critical section
-> read exact current public-link policy
-> compare generation + enabled
-> if still exact: durably mark checkpoint publicationPhase=admitted
-> release policy admission section
-> only then allow PUT /resources/publish through P0-074 immutable Yandex context
```

`admitted` is the side-effect start boundary for P0-078.

A later `false` cannot erase that receipt or pretend the side effect never started. Conversely, if `false` commits before admission, the old operation must become permanently `revoked-before-admission` and perform no publish call.

## 5. Recommended durable authority

Recommended specialized non-secret authority record:

```text
publicLinkPolicy = {
  version: 1,
  generation: <monotonic safe integer or equivalent opaque generation>,
  enabled: <boolean>
}
```

The generation advances **only when this privacy policy changes**, not when unrelated root/client/backup config fields change.

Compatibility `createPublicLinks` may remain as an exported/display Boolean, but publish authority must come from `publicLinkPolicy`.

Recommended operation-owned checkpoint receipt:

```text
publicationPolicyReceipt = {
  version: 1,
  generation: <exact policy generation observed at operation admission>,
  requested: <boolean>
}

publicationPhase =
  skipped-disabled |
  eligible |
  admitted |
  unknown |
  verified-public |
  revoked-before-admission |
  manual-publication-authority-unverifiable
```

Do not persist OAuth tokens in this receipt.

## 6. Writer contract

All writers that can change `createPublicLinks` must use one transition rule:

```text
same effective Boolean
  -> generation unchanged

true -> false
  -> generation advances
  -> all older eligible/not-admitted publication receipts are revoked

false -> true
  -> generation advances
  -> only new exact-generation operations receive publication authority
```

Mandatory writer coverage currently includes at least:

1. `saveYandexPreferences()`;
2. `importUserSettings()` bundled Yandex config write.

An unrelated root/client/backup mutation must not advance the public-link generation.

## 7. Admission serialization

A fresh Boolean read immediately before publish is insufficient because of:

- read -> concurrent disable commit -> publish admission race;
- ABA `true -> false -> true`;
- legacy checkpoints without generation.

The publication-policy check and durable `publicationPhase=admitted` transition must participate in the same ordering barrier as publication-policy writes.

Current Yandex-config/import settlement barriers are useful infrastructure and should be extended/composed rather than replaced with an unrelated duplicate settings state machine.

The critical section only needs to cover bounded local authority admission. It must not hold a settings lock for the network request itself.

## 8. Recovery contract

### Exact eligible generation still enabled

```text
checkpoint eligible @ G
current policy == G and enabled
-> may durably admit publication
-> publish through the same P0-074 live context
```

### Policy changed before admission

```text
checkpoint eligible @ G1
current policy G2 or G3
-> revoked-before-admission
-> no publish call
-> no later true generation resurrects G1
```

### Already admitted / unknown

```text
publicationPhase = admitted or unknown
-> current false is not cancellation proof
-> reconcile remote publication state first
```

If remote metadata proves a public URL exists, preserve truthful `verified-public` state even if current policy is now false. The user can explicitly revoke that link through the P1-164/P0-069 control path when implemented.

If reconciliation proves publication did not occur and current exact policy no longer authorizes it, do not start a new publish attempt.

### Operation originally admitted while disabled

An operation whose receipt says `requested=false` never acquires publication authority merely because the current setting later becomes true.

## 9. Legacy checkpoint rule

A legacy unresolved checkpoint with:

```text
createPublicLinks=true
```

but no exact publication-policy generation cannot prove that its old authority has not since been revoked.

Safe default:

```text
manual-publication-authority-unverifiable
-> no automatic publish
```

Already `remote-verified`/already public durable evidence remains factual evidence and is not retroactively erased.

Legacy `createPublicLinks=false` rows are privacy-safe with respect to automatic publication and must not be upgraded to current true.

## 10. Existing historical public links

Changing the preference to false is **not** defined as a bulk destructive unpublish operation.

Therefore:

- already completed historical `publicUrl` values remain truthful until separately revoked/invalidated;
- disabling blocks old not-yet-admitted publication generations and future operations while disabled;
- per-entry explicit revoke stays P1-164;
- deletion/publication outcome stays P0-069;
- P0-078 must not silently mass-unpublish all historical Journal entries.

This separation avoids surprising destructive privacy-side effects while making the forward publication authority strict.

## 11. P0-074 composition

P0-074 freezes the auth/account/root/config context used by one long Yandex operation.

P0-078 adds a different rule: a newer privacy generation may revoke the **right to start a publish mutation** before durable publication admission.

This is not a context switch.

Correct composition:

```text
P0-074 context A remains immutable
+
P0-078 current publication fence decides whether A may enter publish-admitted
```

If admitted, every Yandex GET/publish/poll for that exact attempt still uses context A. P0-078 must never solve revocation by silently switching the operation to a newer token/account/root.

## 12. External research — 2026-09-06

External material is comparison evidence, not WebClip authority.

### Yandex

Official Yandex Disk materials describe public access as a distinct access mode: a file can be made publicly available to Internet users who know the link, subject to provider restrictions. Official Yandex CLI documentation exposes separate `publish` and `unpublish` commands. The REST API landing page describes API-based management of user files and access.

Implication for WebClip: a local Boolean change is not remote revocation evidence. Publication and removal of publication are explicit side effects.

Sources:

- https://yandex.ru/dev/disk/rest/
- https://yandex.ru/support/yandex-360/customers/disk/desktop/linux/ru/cli-commands
- https://yandex.ru/legal/disk_termsofuse/ru

Current public SDK/reference ecosystems also expose distinct REST paths `PUT /resources/publish` and `PUT /resources/unpublish`, consistent with that separation:

- https://github.com/yandex-disk/yandex-disk-restapi-java
- https://github.com/tigusigalpa/yandex-disk-php

### Dropbox

Dropbox's API specification has an explicit `revoke_shared_link` operation and explicitly says applications should use revocation rather than relying on move/rename to break a link. It also notes that revoking one link does not prove the resource is inaccessible through other sharing paths.

Implication: revocation is its own identity-sensitive mutation, not a Boolean preference side effect.

Sources:

- https://github.com/dropbox/dropbox-api-spec/blob/main/shared_links.stone
- https://developers.dropbox.com/dbx-sharing-guide
- https://community.dropbox.com/en/discussion/214972/revoking-shared-links

A real integration discussion likewise shows that users/integrators need a dedicated revoke API rather than treating expiry/settings edits as equivalent revocation:

- https://www.reddit.com/r/Integromat/comments/1bsnf8n

### Microsoft Graph / OneDrive

Microsoft Graph models sharing as explicit permission resources. Removing sharing access is an explicit `DELETE .../permissions/{perm-id}` mutation; optional `if-match` can reject deletion against a changed item version.

Implication: explicit identity/revision-aware revocation is a stronger architectural analogy than inferring access removal from a local preference.

Source:

- https://learn.microsoft.com/en-us/graph/api/permission-delete?view=graph-rest-1.0

## 13. Alternatives considered

### A. Keep Boolean and fresh-read immediately before publish

Rejected. It still has read/commit/admission TOCTOU and ABA `true -> false -> true` resurrection.

### B. Revoke on any global Yandex config revision change

Rejected. Root/client/backup edits are not privacy-policy changes and should not revoke otherwise valid publication authority. It also mixes P0-074 config coherence with P0-078 privacy authority.

### C. Dedicated public-link policy generation + durable admission receipt

**Recommended.**

It provides exact revocation, ABA resistance, restart-safe recovery and a precise boundary between not-started and already-admitted side effects.

### D. Automatically unpublish every historical link when the checkbox is disabled

Rejected as the default P0-078 meaning. It would be a broad destructive remote mutation, surprise the user, create substantial unknown-settlement/recovery work, and overlap P1-164/P0-069. A future explicit bulk-revoke product feature would need its own contract and user confirmation.

## 14. Deterministic model

Added:

`project_tools/test_p0_078_public_link_policy_model.js`

Local execution before repository write:

```text
P0-078 public-link policy generation model: PASS
```

The model proves:

1. disable before admission revokes an old operation;
2. later re-enable does not resurrect the revoked generation;
3. an admitted/unknown publication cannot be declared cancelled by a newer false setting;
4. an operation created while disabled cannot use later enable;
5. unrelated config changes do not advance policy generation;
6. checkbox and settings-import writers use the same policy transition semantics;
7. existing completed links are not silently mass-revoked by the preference toggle;
8. legacy true-without-generation fails closed.

This is architecture/model evidence only, not current runtime PASS.

## 15. Implementation acceptance cases

Minimum future source/deterministic gate:

1. G1=true operation, G2=false commits before publish admission -> zero `/resources/publish` calls.
2. G1=true -> G2=false -> G3=true -> old G1 still cannot publish.
3. G1 admission commits before G2=false -> recovery reports admitted/unknown truthfully and reconciles; it does not call the side effect cancelled.
4. Current remote metadata proves publication succeeded after an admitted unknown -> `publicUrl` is preserved even while global policy is false.
5. Reconciliation proves no publication and current generation is no longer G1 -> no new publish retry.
6. Operation created under false never publishes merely because a later generation is true.
7. Dedicated preference writer increments generation exactly on Boolean change.
8. User-settings import increments the same generation exactly on Boolean change.
9. Root/client/backup changes leave publication generation unchanged.
10. Legacy unresolved `true` checkpoint without exact generation performs zero automatic publish calls.
11. Historical completed public entries are not bulk-unpublished by preference change.
12. P0-074 invariant remains: one admitted publication attempt uses one immutable Yandex live context across publish/read/poll.
13. P1-210 remains independent: lost Options mutation response causes fresh durable reconciliation before the checkbox claims a value.

## 16. Owner boundaries

**P0-078 owns:**

- durable public-link privacy-policy generation;
- revocation of older not-yet-admitted publication authority;
- ABA resistance;
- durable publication admission phase;
- recovery rule for old eligible vs admitted/unknown publication attempts;
- both current writers of the policy.

**P0-074 owns:** immutable live Yandex auth/account/root/config context for remote calls.

**P1-008 owns:** user-settings import marker, bundled commit and import reconciliation.

**P1-210 owns:** unknown page/worker mutation-result reconciliation and truthful Options UI.

**P1-164 owns:** explicit per-entry public-link revoke/unpublish.

**P0-069 owns:** Journal deletion when a public Yandex link exists.

**P1-184/P1-090 own:** exact remote object/content identity and destructive reconciliation where applicable.

## 17. Status

P0-078 remains **ACTIVE**.

Current runtime still stores and consumes a Boolean publication snapshot and can publish from an old checkpoint after policy disable. No production source, manifest, build, tag, GitHub Release or Actions run is changed/claimed by this checkpoint.
