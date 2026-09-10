# WebClip — P1-138 hidden Yandex provisioning call-site census — 2026-09-10

Date: 2026-09-10  
Canonical baseline: `main = 039f90ed21e44c1939684ee3bf5444651fb20770`  
Mode: **RESEARCH-ONLY / CURRENT-SOURCE CALL-SITE CENSUS**  
Production/runtime modification: **NONE**  
Real Yandex L5: **NOT RUN**  
Release-policy activation: **NONE**  
New P-code: **NO**

This tranche is a source census under the existing ACTIVE **P1-138** owner. It follows canonical PR #208, which established the general observation → explicit mutation-admission contract. The purpose here is narrower: enumerate every current `ensureYandexServiceFolders()` consumer and classify whether provisioning is expected mutation work, hidden mutation inside a read-like surface, or mutation that is unsafe to perform before recovery/read reconciliation.

No production source is changed.

---

## 1. Canonical inputs

Current baseline:

```text
039f90ed21e44c1939684ee3bf5444651fb20770
```

Canonical dependency chain:

```text
#206 immutable auth/effect admission
#207 Yandex effect-adapter classification
#208 P1-138 observation -> explicit mutation admission
```

Relevant owners remain:

```text
P1-138  hidden provisioning/mutation in read-like Yandex flows
P0-073  verified account/root authority
P0-074  immutable operation-scoped Yandex context
P0-078  publication-policy generation
P1-090  exact Yandex object identity/reconciliation
P1-158  bounded Yandex reads
P1-177  backup status/scheduler truth vs ancillary remote setup
P1-178  auth-generation-fenced ancillary account writes
P1-210  partial/unknown side-effect result semantics
P1-223  Create Folder mutation target vs browse-refresh generation
```

No new owner is required.

---

## 2. Exact source census

Current `service-worker.js` contains one definition plus eight semantic call sites of `ensureYandexServiceFolders(...)`.

The eight consumers are:

| ID | Current surface | Current purpose | Read-like at entry? | Can `ensure` mutate provider? | Census class |
|---|---|---|---:|---:|---|
| C01 | page PDF upload flow | prepare Upload/ReadmeLater service branch before save | no | yes | expected mutation pipeline |
| C02 | Journal read-state/move flow | prepare Upload target before remote move | no | yes | expected destructive mutation pipeline |
| C03 | `uploadJournalExportStagedToYandex` | prepare Journal backup branch before upload | no | yes | expected backup mutation pipeline |
| C04 | `recoverPendingJournalBackup` | inspect/reconcile pending backup checkpoint | yes/recovery | yes | **unsafe pre-reconciliation provisioning** |
| C05 | `listJournalBackupsOnYandex` | list remote Journal backups | yes | yes | **direct hidden provisioning** |
| C06 | selected Journal backup import/restore preflight | validate/read selected backup | yes/read-before-local-import | yes | **hidden pre-read provisioning** |
| C07 | root-path settings mutation | persist root then verify/create service structure | no; explicit settings mutation | yes | ancillary mutation requiring separate result truth |
| C08 | `testYandexConnection` | account/access diagnostic | yes | yes | **direct hidden provisioning** |

The definition itself is not a consumer:

```text
async function ensureYandexServiceFolders(...)
```

It is a provisioning helper because it delegates to `ensureYandexFolderTree()`, whose current implementation performs `PUT /resources` and thus can create provider state.

---

## 3. Why a call-site census matters

A blanket rule such as “remove all ensure calls” would be wrong.

Some flows are already semantically mutations:

```text
page upload
remote move/read-state change
journal backup upload
root settings change with explicit provisioning intent
```

Those flows may need service-folder creation. Their defect is not that provisioning exists; the target refinement is that provisioning must be an explicit admitted child effect under the operation's exact auth/account/root context.

Other flows are observational or recovery-oriented:

```text
connection test
backup listing
backup import/read preflight
pending-backup reconciliation
```

In those flows, automatic creation changes the meaning of the command and can destroy evidence about what existed before the read/recovery attempt.

---

## 4. C01 — page upload flow

Current page upload uses `ensureYandexServiceFolders(...)` before choosing the Upload or ReadmeLater branch.

Classification:

```text
mutation pipeline / provisioning expected
```

Target cutover:

1. operation captures exact effect authority;
2. service-folder child effects are admitted explicitly;
3. each missing folder create gets its own started-unknown/reconcile boundary;
4. returned structure is an effect result, not current-global config authority;
5. upload-link acquisition and signed payload upload remain later child effects.

This call site should not be converted to a pure read. It should be converted to an explicit data-plane mutation dependency.

---

## 5. C02 — Journal read-state / remote move flow

Current remote move/read-state flow locates the existing Journal object, reads current config/root, ensures the Upload branch, creates the target folder and then moves the object.

Classification:

```text
destructive mutation pipeline / provisioning expected
```

But the sequencing matters. Once the existing object has been located as historical/current operation evidence, service-folder creation is a distinct new mutation effect. A root/config change cannot silently retarget the move between locate and create/move phases.

Target sequence:

```text
locate exact source
-> admit target-folder provisioning under captured operation root
-> settle/reconcile provisioning
-> fresh-admit move child effect
-> move/reconcile
```

---

## 6. C03 — Journal backup upload

`uploadJournalExportStagedToYandex(...)` calls `ensureYandexServiceFolders({ includeBackup: true, ... })` before creating month folders and uploading the staged backup.

Classification:

```text
backup mutation pipeline / provisioning expected
```

This is legitimate mutation work, but it must use the same exact operation authority as the later backup effect. A service-folder result obtained under a stale root/auth generation cannot authorize the later signed upload.

The backup lease/pending checkpoint remains separate local authority.

---

## 7. C04 — `recoverPendingJournalBackup`

Current recovery loads a pending backup checkpoint and then calls `ensureYandexServiceFolders({ includeBackup: true, ... })` before checking whether the pending `remotePath` lies under the expected Journal backup root.

This is a distinct risk:

```text
recovery of old/unknown effect
-> hidden creation of current service folders
-> only then inspect/reconcile old checkpoint
```

Classification:

```text
unsafe pre-reconciliation provisioning
```

Recovery must first preserve and inspect the historical checkpoint namespace. It must not mutate the current provider tree merely to learn whether the old effect settled.

Required target:

```text
load checkpoint
-> reconstruct/validate historical non-secret root/target identity
-> acquire proven same-account read context
-> read-only reconcile exact old backup target
-> only after settlement/absence proof, if a new repair/write is desired:
     create a new MutationIntent and fresh physical effect
```

If historical identity is insufficient, recovery defers/fails closed. `ensure` is not a safe substitute for missing checkpoint identity.

---

## 8. C05 — `listJournalBackupsOnYandex`

This is the strongest direct P1-138 call site.

Current shape is effectively:

```text
get backup status
require root configured
ensureYandexServiceFolders({ includeBackup: true })
list selected month
```

A user requests a list/read, yet listing can first create Backup/Journal service folders.

Classification:

```text
direct hidden provisioning in a read-only surface
```

Target contract:

```text
LIST BACKUPS = observation only
```

If the Journal backup root does not exist, listing should return an empty/not-configured/missing observation according to product semantics. It must not create the missing folder as a side effect of listing.

A 404/missing root is read evidence. It is not provisioning consent.

---

## 9. C06 — selected backup import/restore preflight

Current import/restore path begins by validating status/root and then calls `ensureYandexServiceFolders({ includeBackup: true, operationId })` before validating the selected `remotePath` and reading the selected backup.

Classification:

```text
hidden pre-read provisioning
```

The import command may later perform substantial local Journal mutations after preview/confirmation, but remote service-folder creation is not required to read an already-selected remote backup.

Target remote phase:

```text
validate selected historical/current backup path against non-mutating configured namespace
-> read metadata/content
-> verify exact selected backup identity
-> only local import authority follows
```

If the backup service folder is missing, that is evidence that the selected remote object cannot exist under that namespace; do not create it during import preflight.

---

## 10. C07 — root-path settings mutation

Current root-setting flow may save the selected root and then, when auth exists, call `ensureYandexServiceFolders(...)` for Upload, ReadmeLater and Backup.

Unlike C05/C08, the entry command is already a settings mutation. Automatic provisioning may be a legitimate product choice, but two truths must remain separate:

```text
root config commit
remote service provisioning
```

Possible outcomes include:

```text
root saved + provisioning success
root saved + provisioning partial/unknown
root saved + provisioning failed-before-effect
root save failed + provisioning not-started
```

A provisioning failure must not falsely imply that root config was not saved. Conversely, a saved root does not prove remote service structure exists.

This composes primarily with P1-177/P1-210 rather than creating a new P1-138 sub-owner.

---

## 11. C08 — `testYandexConnection`

Canonical #208 already establishes the general split. The census confirms this is one of the direct current-source sites:

```text
GET account/status
-> cache account metadata
-> ensure Upload + ReadmeLater + Backup service folders
```

Classification:

```text
direct hidden provisioning in a diagnostic surface
```

Preferred cutover:

```text
WEBCLIP_YANDEX_TEST = observation only
```

If provisioning is retained as product behavior, expose it as a separately admitted child mutation/result, not an invisible continuation of the test.

---

## 12. Hidden mutation severity classes

The census uses four classes:

```text
M1 expected-mutation
   caller is already a remote mutation workflow;
   provision explicitly under operation effect authority.

M2 ancillary-mutation
   caller is an explicit local/settings mutation;
   remote provisioning is separate result truth.

H1 hidden-read-mutation
   caller is read/list/test;
   provisioning must be removed from the observation path or explicitly separated.

H2 recovery-preemption
   caller is reconciling/reading old effect state;
   current provisioning must not precede exact historical reconciliation.
```

Current mapping:

```text
C01 M1
C02 M1
C03 M1
C04 H2
C05 H1
C06 H1
C07 M2
C08 H1
```

---

## 13. Required source cutover order

A safe future runtime implementation should not refactor all sites in one undifferentiated helper replacement.

Recommended dependency order:

```text
1. introduce non-mutating service-path derivation / namespace descriptor
2. make pure list/test/read consumers use descriptor + GET only
3. make historical recovery consume checkpoint namespace rather than current ensure
4. introduce admitted service-folder provisioning effect API
5. migrate explicit mutation pipelines C01/C02/C03 to that effect API
6. split root-save config truth from ancillary provisioning result
7. remove/lock generic ensure access from observation adapters
```

This ordering reduces the risk that a helper cleanup accidentally removes required provisioning from real write flows or keeps hidden writes in read flows.

---

## 14. Non-mutating namespace descriptor

Several current consumers use `ensureYandexServiceFolders()` partly because it conveniently returns paths.

That creates an architectural trap: path derivation is coupled to provider mutation.

Target pure object:

```text
YandexServiceNamespace {
  rootPath,
  uploadPath,
  readLaterPath,
  backupPath,
  journalPath
}
```

It is derived locally from an already captured/configured root and performs no network I/O.

Then:

```text
derive namespace != ensure namespace exists
```

Read/list/import/recovery code may use a namespace descriptor without receiving mutation capability.

Mutation workflows may pass the same descriptor into explicit provisioning admission.

---

## 15. Recovery namespace authority

For C04, the preferred namespace is not necessarily today's configured namespace.

A durable pending-backup checkpoint should bind sufficient non-secret historical identity such as:

```text
accountUid
rootIdentity/rootPath
journalRootPath
target remotePath
physical effect id
expected object/content identity
```

Current config can be displayed as a mismatch diagnostic, but historical reconciliation uses the checkpoint namespace.

If the user changed root R1 → R2:

```text
old R1 pending backup -> reconcile R1 read-only
new R2 backup/provisioning -> new intent/effect
```

Never call current-R2 `ensure` as a prerequisite for deciding what happened to old R1.

---

## 16. Negative schedules

The companion deterministic model covers at minimum:

```text
N01 test connection read succeeds; no provisioning in pure target
N02 list backups on missing Journal root returns observation, does not create root
N03 selected import on missing root does not create folders
N04 pending backup recovery under old R1 with current R2 reconciles R1 read-only
N05 missing historical identity does not trigger current-root ensure
N06 page upload is allowed to provision only after exact mutation admission
N07 remote move provisioning is a child effect before move
N08 backup upload provisioning is a child effect before signed upload
N09 root save success + provisioning failure keeps root-save truth
N10 root save success + provisioning unknown keeps root-save truth
N11 service namespace can be derived without provider I/O
N12 derived namespace is not proof folders exist
N13 read/list consumer cannot receive provisioning capability
N14 H1 caller cannot call admitted create implicitly
N15 H2 caller cannot repair current infrastructure before historical reconciliation
N16 404/missing service root is observation evidence only
N17 read timeout cannot trigger ensure
N18 exact existing directory read does not authorize sibling creation
N19 one successful folder child does not authorize next missing child
N20 started-unknown folder create reconciles before second PUT
N21 auth/root change before next child requires re-admission
N22 current root cannot rewrite historical checkpoint root
N23 same-account newer read credential may reconcile old root
N24 different-account credential cannot reconcile old namespace
N25 explicit mutation pipeline retains exact operation authority
N26 generic path helper has no secret/token material
N27 service namespace descriptor has no network side effect
N28 root provisioning is separate settlement from config commit
N29 test/list/import surfaces remain bounded reads
N30 S2/release state remains untouched
```

---

## 17. Acceptance contract

This call-site census is research-complete when deterministic evidence proves:

1. all eight semantic consumers are represented;
2. the source definition is not counted as a consumer;
3. C01/C02/C03 are retained as expected mutation pipelines, not mislabeled as pure reads;
4. C04 is identified as recovery-preemption risk;
5. C05/C06/C08 are identified as hidden read/pre-read mutation risks;
6. C07 preserves separate root-config and remote-provisioning truths;
7. namespace derivation is separated from namespace creation;
8. historical recovery uses checkpoint root/target, not current-root repair;
9. the cutover does not allocate a new P-code;
10. current runtime remains unchanged;
11. no official ZIP, real Yandex/Chrome L5, release-policy activation, readiness mutation, tag, Release or deployment occurs.

---

## 18. Boundary statement

```text
P1-138 call-site census != production implementation
production implementation != real provider qualification
real provider qualification != P1-231 S2 activation
P1-231 S2 activation != release readiness
```

V1 readiness and release authority are untouched.
