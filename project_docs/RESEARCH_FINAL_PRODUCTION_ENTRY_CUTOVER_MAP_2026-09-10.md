# WebClip — final production-entry cutover map — 2026-09-10

Date: 2026-09-10  
Canonical production baseline: `main = e971bb796e1eed8c295032ab439bd2a8ef5e0d1a`  
Canonical Registry blob: `81e5867c0e0936b9524ece8949c53ad4ed83523c`  
Research branch: `research/final-production-entry-cutover-map-2026-09-10`  
Mode: **RESEARCH-ONLY / FINAL PRE-IMPLEMENTATION CUTOVER RECONCILIATION**  
Production implementation: **NOT STARTED**  
Real unpacked-Chrome acceptance: **NOT RUN BY THIS TRANCHE**  
Real Yandex L5: **DEFERRED TO FINAL EXTERNAL STAGE**  
New P-code: **NO** — `P1-231` remains unallocated.

This tranche changes no production source, manifest, version, Registry status, release, tag or deployment. Its purpose is to reconcile the already completed Wave 1 / W4 / W5 / W6 research into one safe implementation and activation choreography.

---

## 1. Final internal research question

The remaining internal question is not whether the target architecture has enough concepts. It is whether the target can be introduced through reviewable production PRs without an intermediate package that:

- has two authorities for one physical effect;
- upgrades a database before all bundled openers understand the new version;
- starts a non-cancellable browser/provider effect before durable authority exists;
- lets old extension/content/offscreen contexts talk to the new worker as trusted peers;
- upgrades legacy rows into stronger provenance they never possessed;
- permits an apparent rollback that actually downgrades an already-upgraded database;
- disables reconciliation for effects that were already admitted before a feature rollback;
- activates Journal CAS before every writer that can invalidate/replace the dataset participates in the same generation/revision rules.

The answer of this tranche is:

> The researched architecture can be implemented incrementally, but only with a **forward-only schema policy**, **passive-before-authoritative activation**, **one effect owner per row/version**, and a **late coordinated authority cutover** after every required writer/reconciler/UI surface is present.

No additional root cause is required for these rules; they compose existing ACTIVE owners, especially P0-070, P0-072, P0-073, P0-074, P0-076, P0-079, P0-080, P1-090, P1-146, P1-183, P1-184, P1-198, P1-209 and P1-210.

---

# Part I — immutable cutover doctrine

## 2. Dual-format data is allowed; dual authority for one effect is forbidden

During rollout, the repository and a user's profile may legitimately contain both:

```text
legacy rows / legacy checkpoints
and
identityVersion=2 / exact-v2 receipts
```

That does **not** mean two owners may reconcile the same physical effect.

Required dispatch rule:

```text
legacy record
  -> legacy reconciler at its historical evidence level

v2 record
  -> exact-v2 reconciler only
```

Forbidden:

```text
legacy checkpoint observed
+ v2 receipt synthesized around it
+ both recovery paths allowed to start/retry the effect
```

Legacy rows remain legacy/evidence-limited until terminal or explicitly migrated by a provenance-preserving rule. No bulk trust promotion is allowed.

---

## 3. New authority is admitted before the effect, never reconstructed afterward

For any new physical operation `P`:

```text
P durable admission
  -> required domain authority / F / E / local intent
  -> durable effect-start boundary
  -> physical browser/provider effect
```

A timeout/lost response cannot be repaired by minting a new authority after the effect may already have occurred.

This is the common cutover rule for:

- local download;
- Yandex upload;
- publish/unpublish;
- destructive move/delete/Mark Read;
- Journal finalization after remote settlement.

---

## 4. Feature rollback is admission-off, reconciliation-on

Once a v2 effect may have crossed its durable start boundary, a later hotfix/feature rollback may stop **new** v2 admissions but must continue to understand and reconcile existing v2 receipts.

Correct rollback shape:

```text
new admission = disabled
existing v2 receipt reads = enabled
existing v2 reconciliation = enabled
legacy reconciliation = enabled for legacy rows only
```

Forbidden rollback shape:

```text
disable v2 code completely
-> forget started-unknown / verified receipts
-> user retry becomes a fresh effect
```

This rule is mandatory for C1/D1/D2 and for browser-owned local-download effects.

---

# Part II — forward-only schema boundaries

## 5. `WebClipOperationReceipts v1` is additive and independently forward-compatible

A0 creates a new functional database. An older package can ignore it, but once v2 operations have been admitted, a hotfix must preserve the database and the ability to reconcile those receipts.

Do not delete the database as a rollback mechanism.

---

## 6. `WebClipJournal v7 -> v8` is an irreversible compatibility boundary

The final reconciled v8 package is the already researched W1+W4+W6 structure:

```text
existing stores preserved:
  entries
  urlStats
  meta
  pendingAppends
  pendingDownloads
  pendingRemoteSaves
  importStaging

new stores:
  journalFinalizations
  pendingRemoteMutations
  urlStatsV2
  journalSummaries
```

The service worker is the sole structural migration owner. `journal.js` becomes a non-owner direct reader after a worker schema-ready handshake.

After a real profile has migrated to v8, rollback **cannot** mean installing/checking out the old v7 bundle. An old exact-v7 opener may fail with `VersionError` and, more importantly, does not understand the new authority model.

Allowed rollback after J0:

```text
forward hotfix on schema v8
+ authorityMode remains recognized
+ new authority admissions may be disabled
+ existing v8 data remains readable/reconcilable
```

No downgrade migration `v8 -> v7` is part of the plan.

---

## 7. `WebClipPdfRetryCache v3 -> v4` is also forward-only

B1 changes both current openers as one package:

```text
service-worker.js
offscreen.js
```

Target v4 contains immutable PDF generations and the retry index. Once a profile opens v4, an old bundled v3 opener is not a valid rollback target.

Rollback after B1 means a v4-compatible hotfix, never an intentional package downgrade to the v3 openers.

Legacy `tab:<id>` records remain explicitly `legacy-unbound`; they are not renamed into trusted `pdf:<G>` generations.

---

## 8. `authorityMode` is monotonic

J0 seeds:

```text
authorityMode = passive-v8
```

The final Journal authority activation changes it to:

```text
cas-v1
```

This transition is one-way for the implemented generation.

Forbidden:

```text
cas-v1 -> passive-v8
```

because v2 F/JG/ER/E records may already depend on CAS semantics.

If a post-activation defect is found, the safe hotfix is:

```text
keep cas-v1 recognized
block selected/new mutation admissions if required
continue reconciliation/terminalization
```

not semantic downgrade.

---

# Part III — final PR dependency graph

## 9. Final topological order

The preferred implementation sequence is:

```text
A0  passive common OperationReceipts
 ↓
U0  protocol/update fencing
 ↓
J0  WebClipJournal v8 structural package, passive-v8
 ↓
A1  exact content/document/application/selection receipts
 ↓
A2  worker-issued physicalOperationId admission
 ↓
D0a passive Journal F/JG/ER/CAS primitives
 ↓
B0  exact render/source fence + one-pass digest
 ↓
B1  sealed PDF cache v4 G/N/H
 ↓
W5  AUTH-CORE generations and reauthorization fencing
 ↓
C0  immutable Yandex operation context/policy generation
 ↓
C1  exact remote-save/effect engine, initially non-default/passive
 ↓
D1  exact destructive-effect receipts, initially non-default/passive
 ↓
D2  exact save finalization composition
 ↓
W4/W6 resumable derived migrations/projections/view/search paths
 ↓
E0  common read-only reconciliation core
 ↓
E1  UI retryDisposition/reconciliation cutover
 ↓
Z   coordinated authority/default-effect activation
 ↓
real unpacked-Chrome acceptance
 ↓
final real Yandex L5
 ↓
release readiness + explicit release decision
```

Independent code may be developed in parallel, but no merged production tranche may depend on a later node being present for basic safety.

---

# Part IV — tranche contracts

## 10. A0 — passive common OperationReceipts

Primary production file:

```text
service-worker.js
```

Allowed optional extraction: one or more bundled local pure helpers loaded from the extension package.

Adds:

- `WebClipOperationReceipts v1`;
- worker-only physical-id mint primitive;
- request fingerprint / subject / client request normalizers;
- exact create/read/terminalize/retention helpers;
- read-only reconciliation lookup primitives.

Must remain passive:

- existing handlers still own production effects;
- caller `operationId` is not silently reinterpreted as `P`;
- no Yandex/download/Journal behavior changes merely because the DB exists.

Rollback: retain DB; old path can ignore unused passive rows, but do not delete functional receipts.

---

## 11. U0 — protocol and update fencing

Package files:

```text
service-worker.js
content.js
journal.js
options.js
offscreen.js
```

`popup.js` may consume the protocol immediately or in A1; any mutating request sent after U0 must carry/receive a compatible protocol contract before it can become trusted v2 authority.

Required surfaces:

```text
worker protocol
content protocol
offscreen protocol
extension-page protocol
bundle/version generation
P1-209 durable repair/ack generation
```

Stale/missing protocol is fail-closed for trusted mutation. Offscreen mismatch with active/unknown transfer cannot be closed as if the transfer were canceled.

U0 must land before both shared-schema migrations J0/B1 and before A2 trusted mutation admission.

---

## 12. J0 — final cross-wave Journal v8 structural package

Files:

```text
service-worker.js
journal.js
```

Responsibilities:

- worker sole `v7 -> v8` structural owner;
- preserve all v7 stores/rows;
- create `journalFinalizations`, `pendingRemoteMutations`, `urlStatsV2`, `journalSummaries`;
- add only already justified forward indexes;
- seed `datasetGeneration` if absent;
- seed `authorityMode=passive-v8` if absent;
- seed resumable migration/projection metadata without running heavy backfill in `versionchange`;
- page requests worker schema-ready receipt, then opens exact v8 as a non-owner.

Must remain passive:

```text
v8 exists != CAS authority active
```

No legacy row is rewritten merely to fabricate ER/object/content provenance.

---

## 13. A1 — exact source/content authority

Files:

```text
content.js
popup.js
service-worker.js
```

Integration points retained from prior research:

- exact `InjectionResult.documentId` consumption;
- content realm nonce;
- document activity generation;
- application/navigation generation;
- selection revision;
- immutable reviewed selection receipt;
- exact pre/post prepare probes.

Old reviewed state is never transferred automatically into a newly injected or reloaded realm.

---

## 14. A2 — worker-issued physical operation admission

Files:

```text
service-worker.js
content.js
journal.js
options.js
```

`popup.js` participates where it creates the initiating client request.

Target admission:

```text
validate sender + protocol + request shape
-> normalize clientRequestId/clientCorrelationId
-> request fingerprint + subjectKey
-> same clientRequestId + same fingerprint => same P
-> mismatch => reject
-> absent => mint P and persist receipt
-> only after commit call effect owner
```

The caller cannot choose `physicalOperationId`.

A2 may make v2 physical identity the default common correlation once all initiating UIs preserve stable client request identity, but A2 alone does not upgrade PDF/remote/Journal truth.

---

## 15. D0a — passive Journal finalization/CAS primitives

Files:

```text
service-worker.js
journal.js
```

Requires J0 + A2.

Adds but does not globally activate:

- read exact `JG + row + ER/legacy-JR bridge`;
- transactional F admission/capacity;
- F revoke/finalize/expire rules;
- exact entry CAS helpers;
- dataset generation rotation helpers for whole-dataset replacement;
- effect-start recheck helpers used later by C1/D1.

`authorityMode` remains `passive-v8`.

Reason for placing D0a before B0/C1: the final remote path must never first invent F after render/upload work has already become capable of an effect.

---

## 16. B0 — exact render/source fence

Files:

```text
service-worker.js
content.js
```

Existing defensive print helpers/guards remain regression controls, including the current P0-071 rendering guard.

Refactor current `generatePdfBlob(tabId)` toward an operation/source-bound artifact function returning:

```text
blob
N = byteLength
H = sha256
sourceGenerationId
renderAttemptId
```

with exact source probes around the print and one-pass digest in the stream loop.

No durable trusted generation exists until B1 seals G/N/H.

---

## 17. B1 — sealed PDF cache v4

Package-atomic files:

```text
service-worker.js
offscreen.js
```

Required precondition: U0 offscreen protocol fencing.

Current tab-bound lookup/retry path is replaced for new v2 rows with immutable:

```text
pdf:<G>
P
sourceGenerationId
G
N
H
sealed=true
```

Offscreen verifies exact sealed metadata/payload before upload/blob exposure.

This is a forward-only schema cut. No old v3 package rollback afterward.

---

## 18. W5 — AUTH-CORE production entry

Files:

```text
service-worker.js
options.js
```

Must precede C0.

Required semantic separation:

```text
auth attempt generation
credential/capability generation
account identity generation
config/root generation
reauthorization return context
```

Metadata refresh must not look like credential replacement. Token/Authorization/signed URLs remain secret capabilities and are not persisted into functional receipts.

Ordinary current-state Yandex reads may still use current auth/config; long v2 effects cannot silently rebind.

---

## 19. C0 — immutable Yandex operation context

Files:

```text
service-worker.js
options.js
```

Capture before a long remote operation:

```text
yandexContextId
accountUid
rootPath
credential/auth generation
config/root generation
publication policy generation
publication admitted/requested state
```

Context is immutable for one `P`. Reauthentication/config changes can make future work use a new context but cannot rewrite an existing operation's context.

---

## 20. C1 — exact remote-save/effect engine

Files:

```text
service-worker.js
offscreen.js
```

Requires at least:

```text
A2 P
D0a F/JG primitives available
B1 sealed G/N/H
W5 generations
C0 immutable Yandex context
```

For new v2 remote save:

```text
F admitted and still valid
-> exact remote checkpoint V2 durable
-> namespace/source/context preflight
-> phase persisted as started-unknown at effect boundary
-> only then provider/offscreen PUT
-> exact remote bytes/object verification
-> publication as a separate effect if admitted
-> D2 finalization later
```

Provider-independent exact fallback remains bounded download + SHA-256 where metadata cannot prove content digest.

C1 is first landed as an implementation/testable path but **must not become the default user remote-effect path before Z**.

This prevents remote v2 effects from outrunning the final Journal/UI authority cutover.

---

## 21. D1 — destructive remote effects

Files:

```text
service-worker.js
journal.js
```

Applies the same effect-start discipline to Mark Read/delete/unpublish/move families.

New rows use `pendingRemoteMutations`; legacy embedded `readMove*` fields stay legacy-domain evidence.

D1 must be able to represent:

```text
prepared
started-unknown
verified
local-finalized
remote-complete-local-suppressed
canceled-before-start
manual-resolution
```

D1 is non-default until Z.

---

## 22. D2 — end-to-end save finalization

Primary file:

```text
service-worker.js
```

`journal.js` may consume/display the resulting state but does not own remote settlement.

Compose:

```text
P
source receipt
G/N/H
immutable Yandex context
remote object/content receipt
publication receipt when applicable
F/JG/ER
```

Remote exact success with stale/revoked Journal authority is not converted into full success and is never re-uploaded solely to repair local finalization.

---

## 23. W4/W6 — resumable data/projection/view/search cutover

Files may include:

```text
service-worker.js
journal.js
journal-text-filter.js
journal-import-stream.js
journal-import-digest.js
```

plus new bundled pure helpers where separation improves reviewability.

The v8 structural stores already exist from J0. This tranche performs only resumable/bounded post-open work such as:

- canonical legacy URL identity migration;
- versioned `urlStatsV2` generation build/publication;
- `journalSummaries` generation build/publication;
- revision/generation-bound view receipts/cursors;
- bounded summary-first text candidate selection;
- portable normalization/provenance rules.

All migration writers must respect the same dataset generation rules before Z.

A crash/restart may leave a generation incomplete, but an incomplete generation is never published as current.

---

## 24. E0 — common read-only reconciliation core

Primary file:

```text
service-worker.js
```

Given `P` or a stable client request lookup, return bounded state equivalent to:

```text
physicalOperationId
operationClass
phase
retryDisposition
terminal/partial/manual class
domain receipt summary
```

Generic reconciliation is read-only. It does not turn a `prepared` destructive effect into a provider call.

---

## 25. E1 — UI reconciliation cutover

Surfaces include as applicable:

```text
content.js
journal.js
options.js
popup.js
prepared-save-as.js
```

Every user-visible retry after unknown/lost transport must follow `retryDisposition` / same-operation reconciliation rather than infer failure from a missing response.

E1 must be complete for the operation classes that Z will activate.

---

# Part V — coordinated activation

## 26. Z is not another schema migration

Z must not add a new IndexedDB version. Schema capacity already exists.

Z is a functional authority cutover performed only after the exact production commit contains all prerequisites.

The critical Journal transition is:

```text
passive-v8 -> cas-v1
```

The remote/destructive v2 default route is enabled only in the same compatible bundle after the required preflight gates pass.

---

## 27. Mandatory writer inventory before `cas-v1`

Activation cannot be based on a statement such as "save path uses CAS".

Every production path that can create, replace, mutate, finalize or invalidate Journal entry/dataset state must be classified.

Minimum classes to inventory:

```text
ordinary append/finalization
recovery append/finalization
single-entry delete
Mark Read / reading-state mutation
comment/history mutation
URL/site/all clear
full import/replace
resumable canonical URL migration
urlStats/summary generation publication where source revision matters
any maintenance path touching entries/meta generation
```

For each writer, the activation review must show one of:

```text
CAS/JG/ER-aware v2 writer
exact whole-dataset JG rotation/replacement writer
pure derived-store writer bound to exact source generation/revision
legacy-only path unreachable for new cas-v1 records
```

If one unclassified writer remains, `cas-v1` activation is rejected.

---

## 28. No stale-context activation

Before Z accepts a mutating request, protocol fencing must prove the initiating page/content/offscreen context is compatible with the activated bundle.

An old page surviving an extension update cannot invoke a new worker mutation through legacy payload interpretation and obtain v2 authority.

---

## 29. No bulk legacy promotion at Z

Z changes the default admission contract for **new** operations/rows.

It does not rewrite historical data to say:

```text
legacy -> exact-v2
```

Historical recovery remains version-dispatched.

---

# Part VI — rollback and incident rules

## 30. Before irreversible schema cut

Before J0/B1 reaches a tested user profile, ordinary Git revert/cherry-pick may still be viable if no durable new-version data has been created.

This is a repository fact, not a deployment guarantee.

---

## 31. After J0/B1 schema cut

Only forward-compatible hotfixes are safe.

Required incident behavior:

```text
keep DB version support
keep read/reconcile support
optionally block new admissions
never delete unresolved authority
```

---

## 32. After external effect start

A feature flag/hotfix cannot cancel an already started provider/browser effect by removing its checkpoint.

The only safe options are:

- reconcile to exact terminal outcome;
- retain started-unknown/manual-resolution authority;
- suppress stale local finalization when required.

---

## 33. After `cas-v1`

Do not write `passive-v8` back.

If mutation safety is in doubt:

```text
new selected mutation classes = blocked
existing receipts = readable/reconcilable
cas-v1 semantics = retained
```

---

# Part VII — per-PR evidence contract

## 34. Every production PR must prove its own safe intermediate state

Minimum per-PR evidence:

1. exact base/head SHA;
2. changed-file inventory;
3. deterministic model/unit tests for the tranche;
4. repository integrity workflow;
5. full decoded Actions job log when the claim depends on actual stdout/stderr;
6. explicit statement of what remains passive/not activated;
7. no upgrade of Registry status beyond available evidence;
8. rollback class: ordinary pre-schema revert vs forward-only post-schema hotfix.

A green job conclusion without the required output inspection is insufficient where case counts/negative controls matter.

---

## 35. Package-atomic boundaries

The following should not be split across separately releasable intermediate packages:

```text
U0 protocol peers needed by the activated mutation surface
J0 worker structural owner + journal non-owner opener
B1 worker + offscreen PDF-cache v4 openers
Z worker authority activation + all mutation/reconciliation peers required for that activated surface
```

A PR may contain multiple commits, but the resulting runnable package must not expose a half-cut schema/protocol contract.

---

# Part VIII — physical acceptance after internal implementation

## 36. Real unpacked-Chrome acceptance is after production implementation, before Yandex L5

The exact final implementation commit must be loaded as unpacked extension in the target/current Chrome used for acceptance.

At minimum verify:

- v7->v8 real IndexedDB migration with open Journal page/versionchange behavior;
- worker restart during resumable URL/summary/stats rebuild;
- v3->v4 PDF cache migration with stale/offscreen update cases;
- content reload/BFCache/SPA source-generation invalidation;
- worker death between P and F and between F/E phases;
- concurrent last-slot F/E admission;
- clear/import before and after effect-start boundary using controlled fixtures;
- E0/E1 lost-response reconciliation behavior;
- local-download/browser-owned side-effect recovery schedules;
- no stale page/content mutation after bundle protocol transition.

Browser PASS is not Yandex L5.

---

## 37. Final Yandex L5 remains last external stage

Real Yandex L5 must run only after:

```text
final implementation commit fixed
+ repository CI PASS
+ real Chrome acceptance PASS
+ exact test account/root prepared
+ no unresolved pre-L5 blocker
```

L5 verifies provider reality that deterministic fixtures cannot prove, including exact account/root/object behavior and actual provider settlement/reconciliation.

It must not be used as an exploratory substitute for missing deterministic design work.

---

# Part IX — release boundary

## 38. Internal implementation-ready is not release-ready

This tranche may conclude that no further internal architecture research is required **before beginning implementation**.

That does not mean any ACTIVE P-code is closed and does not mean release-ready.

Release readiness still requires:

```text
production implementation
required deterministic/CI evidence
real Chrome acceptance
final Yandex L5 where applicable
release blocker review
version/build readiness
explicit release decision
```

---

## 39. Criteria for internal implementation-ready

Internal architecture is implementation-ready when all of the following are true:

1. every current target authority has one owner and durable identity;
2. every non-cancellable effect has a pre-effect durable admission boundary;
3. every unknown settlement has an exact reconciliation/manual terminal class;
4. shared-schema openers have one package/migration choreography;
5. rollback after schema/effect start is defined as forward-compatible, not fictitious cancellation/downgrade;
6. legacy/v2 coexistence is version-dispatched without trust promotion;
7. all known Journal writers are required to be covered before `cas-v1`;
8. UI lost-response handling precedes activation of operation classes that need it;
9. final real Chrome and Yandex stages are explicitly outside internal deterministic proof;
10. no new independent root cause remains from cutover reconciliation.

This document asserts those conditions at the **research specification level**. The companion deterministic model is used to test the graph/invariants, not to claim production implementation.

---

# Part X — owner/status decision

## 40. No new P-code

The cutover findings are deployment/activation consequences of existing owners rather than a new independent defect family.

Therefore:

```text
P1-231 = NOT ALLOCATED
Registry status changes = NONE
```

---

## 41. Final research decision

Subject to the companion deterministic model passing on the exact committed research source, the project has enough internally specified authority/migration/cutover structure to begin staged production implementation.

The correct next phase after this tranche is not another broad architecture sweep by default. It is implementation beginning at A0/U0/J0 with PR-local evidence, while retaining the right to open a new research tranche if implementation uncovers a genuinely new root cause or invalidates a current assumption.

Real Chrome acceptance and real Yandex L5 remain mandatory external evidence stages and are deliberately not claimed by this research result.
