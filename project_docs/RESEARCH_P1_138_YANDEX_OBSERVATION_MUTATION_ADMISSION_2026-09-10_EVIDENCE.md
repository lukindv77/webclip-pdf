# WebClip — P1-138 Yandex observation → mutation admission — 2026-09-10

Date: 2026-09-10  
Canonical baseline: `main = b285aba3972687c25b190c776ff877dfb0832316`  
Mode: **RESEARCH-ONLY / CURRENT-BASELINE ADMISSION REFINEMENT**  
Production/runtime modification: **NONE**  
Real Yandex L5: **NOT RUN**  
Release-policy activation: **NONE**  
New P-code: **NO**

This tranche refines the existing ACTIVE owner **P1-138**:

> Read-like Yandex list/fetch/status flows must not hide provisioning/mutation authority; pure observation must be separated from ensure/create side effects while keeping bounded UI reads.

It composes P1-138 with the current canonical auth/effect work from PR #206 and PR #207, plus P0-073/P0-074/P0-075, P0-078, P1-090, P1-158, P1-210 and P1-223. It does not duplicate those owners and does not change production source.

The research question is deliberately narrow:

```text
When a user-visible Yandex command begins as observation/read/status,
how must WebClip cross into provisioning or another remote mutation
without silently inheriting read authority, current mutable config,
or stale UI browse authority?
```

---

## 1. Current authority and provenance

Current canonical baseline:

```text
b285aba3972687c25b190c776ff877dfb0832316
```

Immediately preceding canonical research:

```text
PR #206 / 16dee307a391a19d38af8f7cfb0bd581dc53ab59
  immutable live auth/effect context
  durable non-secret checkpoint
  started-unknown before irreversible transport
  same-account read-only reconciliation

PR #207 / b285aba3972687c25b190c776ff877dfb0832316
  four Yandex authority adapter classes
  control-plane/current
  operation-bound data-plane
  historical reconciliation
  signed/offscreen transfer
  authRecordId + authGeneration != secretMaterialRevision
```

Historical family evidence is provenance, not current status authority. The consolidated Yandex auth/config family preserves earlier findings that:

- `testYandexConnection()` can prove auth/account and then fail because hidden service-folder provisioning partially fails;
- retrying such a “test” can perform further writes;
- account metadata responses must not commit across auth generations;
- Create Folder mutation target and folder-browse refresh are separate generations.

Canonical Registry ownership controls status. P1-138 is the direct owner for hidden observation→mutation authority. P1-223 owns the distinct extension-page browse-generation race after Create Folder settlement.

No new root-cause number is allocated.

---

## 2. Fresh current-source findings

### 2.1 `WEBCLIP_YANDEX_TEST` is presented as observation

Current `options.js` sends:

```text
{ type: 'WEBCLIP_YANDEX_TEST' }
```

and on success reports approximately:

```text
Доступ подтверждён: <account>.
```

The user-visible semantic is a connection/access test.

### 2.2 `testYandexConnection()` can provision folders

Current `service-worker.js` performs:

```text
info = await yandexApi('')
account = extractDiskAccount(info)
write account cache when auth exists
config = await getYandexConfig()
if (config.rootPath) {
  ensureYandexServiceFolders({ includeUpload: true, includeReadLater: true, includeBackup: true })
}
```

Therefore a read-like command can cross from account/status observation into provider mutation without a separately represented mutation intent or result plane.

This is still a current production gap. Canonical #206/#207 specify authority classes but do not implement this source transition.

### 2.3 `ensureYandexFolderTree()` is mutation despite its name

Current folder-tree helper issues `PUT /resources` for each path segment. A `409` is followed by `GET /resources` to verify that the existing resource is a directory.

The authority classification is therefore:

```text
PUT segment        = irreversible/provisioning child mutation
409 verification   = read/reconciliation for that exact segment
next PUT segment   = another mutation boundary
```

The word `ensure` is not a read classification.

### 2.4 Generic `yandexApi()` does not encode authority class

Current `yandexApi()` is shared by reads and mutations and obtains current token state per request. It has no argument that proves whether the request is control-plane observation, operation-bound mutation, historical reconciliation or signed-transfer acquisition.

Thus function call shape and HTTP method currently carry more semantic weight than an explicit authority object.

### 2.5 Create Folder UI has separate mutation and browse generations

Current Options handler captures a path from `currentBrowsePath`, sends `WEBCLIP_YANDEX_CREATE_FOLDER`, then after success calls:

```text
loadFolders(currentBrowsePath)
```

Historical P1-223 evidence already shows why this can supersede a newer user navigation. P1-138 must not absorb that owner. The composition boundary is:

```text
P1-138 = whether/how remote mutation is admitted
P1-223 = whether post-result UI refresh is still presentation-current
```

### 2.6 Historical reconciliation still consults current config

Current `findYandexFileForJournalEntry(...)` loads historical Journal fields, but also calls `getYandexConfig()` and `getCurrentYandexAccountUid()`. It compares the entry root with current root and builds fallback candidates using current `config.rootPath`.

After a possible old mutation, historical root/object identity is factual evidence. Current UI root is current intent, not authority to retarget or define the old search namespace.

The current source therefore fails closed on some mismatches, which is useful, but it still lets current config participate too strongly in historical reconciliation target construction.

---

## 3. Core P1-138 distinction

The contract is:

```text
observation authority != mutation authority
```

A successful read may prove facts such as:

```text
credential can read
account UID is X
path P exists
path P is missing
resource is a directory
public_url is absent
```

None of those facts by themselves authorizes:

```text
create folder
publish resource
overwrite/upload
move/delete
retarget old recovery to current root
```

Likewise, a UI command named “test”, “list”, “status”, “fetch”, “find” or “ensure” is not authoritative classification. Classification follows physical side effect and owner contract.

---

## 4. Pure observation contract

A function/API declared pure observation must satisfy all of these:

1. no provider mutation method (`PUT`, `POST`, `PATCH`, `DELETE`) is issued;
2. no local durable write is required to make the observation fact true;
3. optional cache enrichment is generation-fenced and ancillary, not the truth source for the returned observation;
4. timeout/failure cannot trigger provisioning as fallback;
5. retries remain bounded read retries;
6. returned observation does not contain a transferable write authorization;
7. caller cannot reinterpret “missing” as implicit consent to create.

Examples intended to remain pure observation:

```text
connection/account read
folder listing
resource metadata fetch
historical object read/reconciliation
post-mutation readback
```

Account-cache enrichment may be allowed as an ancillary local write only with exact auth-generation compare-and-commit. It must never turn stale account metadata into current identity authority.

---

## 5. Composite command transition protocol

A user-visible command may legitimately need both observation and mutation. It must be modeled as a composition, not one inherited authority:

```text
Phase O: observe
  -> produce ObservationReceipt
  -> no remote mutation

Transition T: derive explicit MutationIntent
  -> identify exact requested child effect
  -> bind account/root/path/config/policy generation
  -> require exact mutation capability
  -> fresh admission under operation-bound data-plane authority

Phase M: mutate
  -> persist started-unknown before irreversible transport
  -> execute exact child effect
  -> settle or reconcile

Phase R: read back / reconcile
  -> observation only
```

An observation receipt may be an input to mutation admission, but it is never sufficient authority on its own.

---

## 6. `testYandexConnection()` target split

The clean target is two result planes:

```text
ConnectionObservation {
  authRecordId,
  authGeneration,
  accountUid,
  accountTruth,
  capabilityTruth,
  observedAt,
  readResult
}

ProvisioningResult? {
  intentId,
  effectIds,
  rootIdentity,
  settlement,
  partialOrUnknown,
  reconciliationRequired
}
```

Preferred product semantic:

```text
WEBCLIP_YANDEX_TEST = observation only
```

If product policy retains automatic provisioning, it must be an explicit child mutation phase with its own admission/result truth. The connection observation remains separately reportable even if provisioning fails or is unknown.

Correct truth table:

| Account read | Provisioning | Connection truth | Provisioning truth |
|---|---|---|---|
| success | not requested | proven/readable | not-run |
| success | success | proven/readable | proven-success |
| success | partial/unknown | proven/readable | partial/unknown |
| success | failed-before-effect | proven/readable | failed-before-effect |
| failed | not started | not proven | not-run |

A provisioning failure cannot retroactively make a successful account read false.

---

## 7. Service-folder provisioning is a child-effect sequence

`ensureYandexServiceFolders()` / `ensureYandexFolderTree()` conceptually expands into child effects:

```text
folder segment 1 create/check
folder segment 2 create/check
...
Upload branch
ReadmeLater branch
Backup branch
```

For each segment:

- before first `PUT`, exact mutation admission is required;
- persist `started-unknown` before transport;
- `409` is not generic success: verify the exact path is a directory;
- timeout/lost response is unknown settlement, not proven absence;
- no blind second `PUT` after unknown settlement;
- a later segment is not authorized merely because an earlier segment succeeded;
- auth/root/config changes before a not-yet-issued segment require re-admission or stop;
- already-issued segment factual identity is immutable.

A folder already existing is an observation about provider state; it does not authorize creation of its next missing child.

---

## 8. Connection test must not become a provisioning retry button

Historical evidence demonstrated this schedule:

```text
account read succeeds
folder A create succeeds
folder B create settlement unknown/fails
outer WEBCLIP_YANDEX_TEST rejects
user retries Test
```

Without split truth, the user may reasonably believe they are retrying a read-only diagnostic while WebClip may issue more writes.

Required rule:

```text
retry observation -> retry observation only
retry/continue provisioning -> explicit provisioning recovery or fresh mutation intent
```

An unknown provisioning child effect is reconciled before another mutation attempt.

---

## 9. Publication uses the same transition rule

Current `ensureYandexPublicUrl()` first reads `public_url`; if absent it issues `PUT /resources/publish` and polls with reads.

Authority sequence:

```text
read existing public_url
-> if present: observation complete
-> if absent: derive publication child MutationIntent
-> re-check exact P0-078 publication policy generation
-> admit publication mutation
-> started-unknown before PUT
-> reconcile/poll exact target after unknown/known response
```

“public_url absent” is not publication consent and does not carry publication authority.

A stale publication generation cannot be repaired by an earlier observation that the URL was absent.

---

## 10. Create Folder composition with P1-223

Create Folder is an explicit mutation, so it is not itself a hidden P1-138 transition. It is included to define the boundary with P1-223.

At admission capture:

```text
mutationTargetPath
mutation auth/account/root authority
mutation effect id
browseGenerationAtAdmission
browsePathAtAdmission
```

After verified mutation settlement:

```text
if browse generation unchanged:
    refresh admitted parent folder
else:
    do not supersede newer navigation
```

The mutation receipt identifies the actual created path. Current `currentBrowsePath` after settlement is not the mutation target authority.

Unknown remote settlement is handled by the mutation/reconciliation owners. P1-223 governs only whether UI refresh is still current after a verified result.

---

## 11. Historical reconciliation must not inherit current root intent

For an old checkpoint/Journal effect:

```text
historical accountUid
historical rootIdentity/rootPath
historical targetPathIdentity
historical resourceId/publicUrl/content identity
```

are effect facts.

Current UI config may be compared for diagnostics, but it must not:

- rewrite the historical root;
- generate a replacement target under the new root;
- make old effect success/failure depend on current root selection when exact historical read reconciliation is otherwise possible;
- authorize a retry under the new root as though it were the old physical effect.

If current root changes from R1 to R2 after an old R1 mutation became `started-unknown`, the safe target is:

```text
read-only reconcile exact R1 effect under proven same-account read authority
```

not:

```text
search/create under R2
```

A new write under R2 is a new intent/effect with fresh admission.

If historical evidence is insufficient to identify the old target safely, reconciliation defers/fails closed. Current root is not a substitute for missing historical identity.

---

## 12. Current account versus historical reconciliation

Canonical #206/#207 already allow a newer credential to observe an old effect only when same-account identity and read capability are proven.

P1-138 refinement:

- current account selection is not itself historical-effect authority;
- cached UID that was not generation-fenced cannot satisfy exact account proof;
- different-account current auth cannot redefine old namespace;
- same-account newer auth may read the historical target, but may not silently mutate/retry it;
- absence observed under the correct historical namespace can feed a new retry policy, but new mutation still requires fresh admission.

---

## 13. Read failure cannot escalate to write

Forbidden fallback shape:

```text
GET/list/status failed or timed out
=> maybe resource is missing
=> create/ensure it
```

A failed observation proves no such absence.

Likewise:

```text
404 on exact resource read
```

may prove absence only under the endpoint/object identity contract. Even then it is evidence, not mutation authority.

---

## 14. Deadlines and fairness

P1-158 bounded read semantics remain intact.

Splitting a composite command must not create unbounded total work. Target rules:

- observation has its own bounded read deadline;
- transition/admission is bounded;
- each mutation effect has bounded local wait but unknown remote settlement semantics;
- reconciliation has bounded read budget;
- parent command has a bounded orchestration budget or an explicit durable continuation checkpoint;
- no read retry loop can repeatedly trigger mutation phases.

Timeout taxonomy remains semantic:

```text
read timeout                 = observation unknown/failed
pre-effect admission timeout = mutation not started
post-start mutation timeout  = remote settlement unknown
reconciliation timeout       = effect remains unresolved
```

---

## 15. UI truth contract

The UI should not collapse independent facts.

A future result can expose separately:

```text
connection: proven | not-proven | unknown
provisioning: not-run | success | partial | unknown | failed-before-effect
refresh: applied | stale-skipped | failed
```

This does not require a particular visual design in this tranche. The invariant is truth separation.

A message equivalent to “Доступ подтверждён” must not imply “service folders were created” unless that separate mutation result is also proven and intentionally surfaced.

---

## 16. Source-cutover implications

A future production implementation should make authority class visible in APIs. Conceptually:

```text
readYandexControlPlane(...)
readHistoricalYandexEffect(checkpoint, readContext, ...)
admitYandexMutation(intent, ...)
executeYandexEffect(effectContext, ...)
runSignedTransfer(...)
```

A single generic `yandexApi()` may remain as low-level transport only if callers cannot bypass the higher-level authority/admission contract.

The important cutover property is not naming. It is that mutation transport is unreachable from pure-observation paths without an explicit admitted mutation object.

---

## 17. Current-call classification table

| Current family | Current shape | Target class | P1-138 transition requirement |
|---|---|---|---|
| connection/account status | GET `/v1/disk` | control-plane observation | no hidden provisioning |
| `testYandexConnection` service-folder setup | read then ensure/create | composite | explicit child mutation admission or separate command |
| interactive folder listing | GET resources | control-plane observation | mutation-free |
| `createYandexFolder` | ensure/tree PUT | explicit mutation | fresh effect admission; P1-223 owns UI refresh |
| `ensureYandexFolderTree` | PUT + 409 GET | child mutation sequence | per-segment effect/reconcile semantics |
| `ensureYandexPublicUrl` initial read | GET | observation | absence is evidence only |
| `ensureYandexPublicUrl` publish | PUT publish | publication child mutation | P0-078 generation + mutation admission |
| post-publish polling | GET | readback/reconciliation | mutation-free |
| historical Journal locate | GET + current config/account reads | historical reconciliation | historical target/root authoritative |
| missing historical identity | fallback search temptation | unresolved | fail/defer; current root cannot substitute |

---

## 18. Deterministic negative/recovery matrix

The companion model covers at minimum:

```text
A01 pure connection observation issues no mutation
A02 successful observation does not grant write authority
A03 missing folder observation does not grant create authority
A04 read timeout cannot escalate to create
A05 404 evidence is not consent
A06 composite command requires explicit transition object
A07 mutation capability checked at transition
A08 account/root/config captured for mutation intent
A09 stale auth before mutation blocks start
A10 stale root before mutation blocks/reacquires
A11 started-unknown written before provider mutation
A12 mutation timeout remains unknown
A13 retry after unknown reconciles first
A14 connection success + provisioning failure preserves connection truth
A15 connection success + provisioning unknown preserves connection truth
A16 provisioning success does not widen auth capability truth
A17 Test retry does not automatically retry provisioning
A18 ensure folder segment is a mutation child effect
A19 409 GET verifies exact directory only
A20 409 does not authorize next missing segment
A21 already-issued segment identity remains immutable
A22 not-yet-issued segment re-admits after auth change
A23 publication absence observation != publish consent
A24 publication generation checked before PUT
A25 publication unknown settlement reconciles before second PUT
A26 Create Folder mutation target is immutable
A27 browse generation is presentation authority only
A28 newer browse prevents stale post-create refresh
A29 mutation success receipt reports actual target
A30 current browse path cannot redefine mutation target
A31 historical root R1 survives current root R2
A32 current root R2 cannot generate replacement old target
A33 same-account newer read auth may reconcile R1
A34 different-account auth cannot reconcile as same namespace
A35 historical target missing identity fails/defer
A36 current config cannot fill missing historical identity
A37 historical reconciliation is read-only
A38 absence proof may feed new intent but not old-effect rebinding
A39 new write under R2 is new physical effect
A40 account-cache metadata must be generation-fenced
A41 stale account A response cannot enrich current B
A42 A→B→A generation resemblance does not accept old A response
A43 read retries are bounded
A44 mutation local timeout is not no-op proof
A45 reconciliation timeout leaves unresolved state
A46 readback polling cannot start new mutation
A47 pure list/fetch/status route has no ensure/create fallback
A48 local UI refresh failure does not falsify proven remote mutation
A49 remote mutation failure does not falsify prior successful observation
A50 S2/release state remains untouched
```

Additional cross-cases exercise combinations of auth generation, root generation, browse generation, partial folder provisioning, publication policy generation and historical reconciliation.

---

## 19. Acceptance contract

P1-138 observation→mutation refinement is research-complete when deterministic evidence proves all of the following:

1. observation and mutation authority are distinct;
2. a read-like UI command cannot hide provider mutation without an explicit child mutation phase;
3. connection truth and provisioning truth remain independently reportable;
4. folder-tree `ensure` operations are classified as mutations;
5. publication read→PUT transition requires separate admission and P0-078 generation;
6. P1-223 browse generation remains separate from Create Folder mutation target authority;
7. historical reconciliation uses historical target/root facts rather than current UI root as target authority;
8. same-account read-only reconciliation does not rebind mutation authority;
9. failure/timeout classes do not escalate observation into mutation;
10. bounded deadlines remain preserved;
11. current runtime source is described truthfully as pre-cutover;
12. no new P-code, production/runtime change, release artifact, provider L5 or S2 activation occurs.

---

## 20. Boundary statement

```text
P1-138 research refinement != runtime implementation
runtime implementation != real provider qualification
real provider qualification != P1-231 S2 activation
P1-231 S2 activation != release readiness
```

This tranche changes neither V1 release authority nor V1 readiness facts.

No official ZIP is built. No real Chrome/Yandex L5 is run. No release receipt, manifest/version, tag, GitHub Release or deployment is changed.
