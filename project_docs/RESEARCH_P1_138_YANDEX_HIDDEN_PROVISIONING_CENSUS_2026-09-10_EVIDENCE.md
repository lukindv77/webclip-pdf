# WebClip — P1-138 hidden Yandex provisioning call-site census — 2026-09-10

Date: 2026-09-10  
Canonical baseline: `main = 039f90ed21e44c1939684ee3bf5444651fb20770`  
Mode: **RESEARCH-ONLY / CURRENT-SOURCE CALL-SITE CENSUS**  
Production/runtime modification: **NONE**  
Real Yandex L5: **NOT RUN**  
Release-policy activation: **NONE**  
New P-code: **NO**

This tranche is a current-source census under existing ACTIVE owner **P1-138**. Canonical PR #208 already establishes the general observation → explicit mutation-admission contract. This follow-up enumerates every current `ensureYandexServiceFolders()` consumer and classifies whether provisioning is legitimate mutation work, hidden mutation inside an observational surface, or a mutation that preempts recovery evidence.

No production source is changed.

## 1. Canonical owners

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

Relevant owners:

```text
P1-138  hidden provisioning/mutation in read-like Yandex flows
P0-073  verified account/root authority
P0-074  immutable operation-scoped Yandex context
P0-078  publication-policy generation
P1-090  exact Yandex object identity/reconciliation
P1-158  bounded Yandex reads
P1-177  backup status/scheduler truth vs ancillary remote setup
P1-178  auth-generation-fenced ancillary account writes
P1-179  backup scheduler/pending checkpoint immutable account/root namespace
P1-210  partial/unknown side-effect result semantics
P1-223  Create Folder mutation target vs browse-refresh generation
```

P1-179 is especially important for recovery: a pending backup checkpoint belongs to the historical account/root namespace in which that physical effect was issued. Current configuration cannot migrate it into a newer root. No new owner is required.

## 2. Exact source census

Current `service-worker.js` contains one definition plus eight semantic call sites of `ensureYandexServiceFolders(...)`.

| ID | Current surface | Read-like at entry? | `ensure` can mutate? | Class |
|---|---:|---:|---:|---|
| C01 page PDF upload | no | yes | M1 expected-mutation |
| C02 Journal read-state / remote move | no | yes | M1 expected-mutation |
| C03 `uploadJournalExportStagedToYandex` | no | yes | M1 expected-mutation |
| C04 `recoverPendingJournalBackup` | recovery | yes | H2 recovery-preemption |
| C05 `listJournalBackupsOnYandex` | yes | yes | H1 hidden-read-mutation |
| C06 selected Journal backup import/read preflight | yes | yes | H1 hidden-read-mutation |
| C07 root-path settings mutation | no | yes | M2 ancillary-mutation |
| C08 `testYandexConnection` | yes | yes | H1 hidden-read-mutation |

The definition itself is not a consumer:

```text
async function ensureYandexServiceFolders(...)
```

The helper delegates to `ensureYandexFolderTree()`, and that helper issues `PUT /resources`. Therefore `ensure` is physically capable of provider mutation.

The severity vocabulary is:

```text
M1 expected-mutation
M2 ancillary-mutation
H1 hidden-read-mutation
H2 recovery-preemption
```

Current totals are M1=3, M2=1, H1=3, H2=1.

## 3. Why the split matters

A blanket removal of `ensure` is wrong. C01/C02/C03 are already remote-mutation workflows; they need provisioning, but as explicit admitted child effects bound to the exact operation auth/account/root context.

C05/C06/C08 are different: a list, selected-backup read/import preflight, or connection test should not create provider state merely to obtain observation data.

C04 is different again: recovery must first learn what happened to the historical physical effect. Creating current infrastructure before that reconciliation can alter the environment and blur historical evidence.

C07 is an explicit settings mutation, so ancillary provisioning may be a legitimate product choice, but config truth and remote settlement truth must remain separate.

## 4. C01/C02/C03 — expected mutation pipelines

For page upload, Journal remote move, and Journal backup upload, provisioning remains valid only after explicit mutation admission.

Target sequence:

```text
capture exact operation authority
-> derive pure service namespace
-> admit required folder child effect
-> persist started-unknown before PUT
-> settle/reconcile folder child
-> fresh-admit later upload/move/signed child effect
```

A successful earlier folder creation does not authorize a later child after auth/root/config authority changes. Already-issued child factual identity remains immutable.

## 5. C04 — pending backup recovery and P1-179

Current recovery can load a pending backup and then call `ensureYandexServiceFolders({ includeBackup: true, ... })` before completing historical settlement work.

The target must instead respect P1-179:

```text
load pending checkpoint
-> preserve checkpoint account/root namespace
-> validate historical non-secret target identity
-> acquire proven same-account read context
-> reconcile exact historical target read-only
-> only after settlement/absence proof, create a NEW repair/write MutationIntent if needed
```

If historical identity is insufficient, recovery defers/fails closed.

If root changed R1 → R2:

```text
old R1 pending backup -> reconcile R1 read-only
new R2 provisioning/write -> new physical intent/effect
```

Never call current-R2 `ensure` as a prerequisite for deciding what happened to old R1.

Current root may be a mismatch diagnostic. It is not authority to rewrite the checkpoint namespace.

## 6. C05 — backup listing

`listJournalBackupsOnYandex()` is a direct P1-138 hidden mutation surface because it can ensure/create Backup/Journal folders before listing.

Target contract:

```text
LIST BACKUPS = observation only
```

If the service root is missing, return the appropriate empty/missing/not-configured observation. A 404/missing root is read evidence. It is not provisioning consent.

Read retry or timeout must never escalate into `ensure`.

## 7. C06 — selected backup import/read preflight

The remote phase of selected-backup import should validate the selected path/identity and read it. Remote service-folder creation is not required to consume an existing selected object.

Target:

```text
validate configured/historical namespace without mutation
-> validate exact selected remotePath
-> GET metadata/content
-> verify selected backup identity
-> only then continue into separate local Journal import authority
```

If the backup namespace is missing, do not create it during import preflight.

## 8. C07 — root settings

A root settings command can legitimately commit local config and optionally provision remote service folders, but the truths are independent:

```text
root config commit
remote service provisioning
```

Valid outcomes include:

```text
root saved + provisioning success
root saved + provisioning partial/unknown
root saved + provisioning failed-before-effect
root save failed + provisioning not-started
```

A provisioning failure must not falsify a completed root config commit. A successful config commit must not imply that remote service folders exist. This composes with P1-177/P1-210.

## 9. C08 — connection test

The current connection test reads account/status and can then provision Upload, ReadmeLater and Backup service branches.

Preferred target:

```text
WEBCLIP_YANDEX_TEST = observation only
```

If product policy retains automatic provisioning, it must be a separately admitted child mutation with separate result truth. Repeating a diagnostic must not silently become a provisioning retry button.

## 10. Pure namespace descriptor

Several callers currently use `ensureYandexServiceFolders()` partly to obtain deterministic paths. Path calculation must be separated from provider mutation.

Target local object:

```text
YandexServiceNamespace {
  rootPath,
  uploadPath,
  readLaterPath,
  backupPath,
  journalPath
}
```

It is pure, contains no token/secret, and performs no network I/O.

```text
derive namespace != ensure namespace exists
```

H1/H2 consumers may receive a namespace descriptor without receiving mutation capability. M1/M2 consumers may later submit it to explicit provisioning admission.

## 11. Required source cutover order

A safe future runtime cutover is intentionally staged:

```text
1. introduce non-mutating service-path derivation / namespace descriptor
2. make pure list/test/read consumers use descriptor + GET only
3. make historical recovery consume checkpoint namespace rather than current ensure
4. introduce admitted service-folder provisioning effect API
5. migrate explicit mutation pipelines C01/C02/C03 to that effect API
6. split root-save config truth from ancillary provisioning result
7. remove/lock generic ensure access from observation adapters
```

This avoids two symmetric mistakes: retaining hidden writes in observation paths or accidentally deleting required provisioning from legitimate mutation workflows.

## 12. Deterministic schedules

The companion model covers:

```text
N01 exact source has 1 definition + 8 semantic consumers
N02 C01/C02/C03 classify M1
N03 C04 classifies H2 and binds P1-179 checkpoint namespace
N04 C05/C06/C08 classify H1
N05 C07 classifies M2
N06 test/list/import read paths cannot inherit provisioning capability
N07 recovery cannot provision current root before historical reconciliation
N08 missing historical identity cannot be repaired from current config
N09 same-account newer credential may read old namespace only
N10 different-account credential cannot reconcile as same namespace
N11 root config truth and provisioning truth remain independent
N12 namespace derivation has zero network effects
N13 namespace derivation grants no mutation authority
N14 409 readback verifies exact folder only
N15 one folder child does not authorize the next child
N16 started-unknown mutation reconciles before a second PUT
N17 read timeout cannot trigger ensure
N18 no runtime/release/S2 authority changes
```

## 13. Acceptance contract

Research completion requires deterministic evidence that:

1. all eight semantic consumers are represented and the definition is excluded from the consumer count;
2. the M1/M2/H1/H2 classification is stable against current source;
3. H1 surfaces cannot hide provider provisioning;
4. H2 recovery honors P1-179 historical account/root namespace before any new repair effect;
5. C01/C02/C03 retain provisioning only as admitted mutation child effects;
6. C07 separates local config settlement from remote provisioning settlement;
7. namespace derivation is pure and distinct from creation;
8. no new P-code is allocated;
9. current runtime remains unchanged;
10. no official ZIP is built, no real Chrome/Yandex L5 is run, and no release-policy/readiness/tag/Release/deployment action occurs.

## 14. Boundary statement

```text
P1-138 call-site census != production implementation
production implementation != real provider qualification
real provider qualification != P1-231 S2 activation
P1-231 S2 activation != release readiness
```

V1 readiness and release authority are untouched.
