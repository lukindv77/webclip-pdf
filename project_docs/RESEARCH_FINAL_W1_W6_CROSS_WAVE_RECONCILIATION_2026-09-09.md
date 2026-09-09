# WebClip — final W1–W6 cross-wave implementation-readiness reconciliation — 2026-09-09

Date: 2026-09-09  
Canonical production baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Canonical Registry: `project_docs/RESEARCH_REGISTRY.md` on `main`  
Research branch: `research/final-w1-w6-cross-wave-reconciliation-2026-09-09`  
Mode: **RESEARCH-ONLY / FINAL IMPLEMENTATION-READINESS RECONCILIATION**  
Production implementation: **NOT STARTED BY THIS TRANCHE**  
Release readiness: **NOT READY**  
Yandex real-provider validation: **L5 DEFERRED TO FINAL EXTERNAL STAGE**

This document does not change production source, Registry status, `manifest.json`, version, build, tag, release or deployment.

Its purpose is to reconcile the six already completed implementation-readiness waves into **one non-conflicting production architecture**, resolve research evolution between earlier/later source specifications, freeze the currently known structural migration packages, define one canonical generation vocabulary, prove the dependency graph is acyclic, preserve all 106 ACTIVE owners, and identify the exact remaining product/external gates without inflating their evidence level.

---

# 1. Executive decision

For exact canonical baseline:

```text
main = d4f5b268fa3f7ced5a7bc68da52784863d614138
```

strongest truthful project state after this reconciliation is:

```text
DEEP-RESEARCH-COVERAGE-COMPLETE            = YES
W1-W6 IMPLEMENTATION-READINESS RECONCILED  = YES
PRODUCTION IMPLEMENTATION COMPLETE          = NO
DEEP-RESEARCH-CRITICAL-CLOSURE-COMPLETE     = NO
RELEASE-READY                               = NO
```

No new root cause requiring a new P-code was identified.

```text
P1-231 = NOT ALLOCATED
```

The project has reached the point where another broad internal architecture enumeration would add little value unless production work or new external evidence contradicts the present model.

The next rational engineering phase is staged production implementation from a fresh exact `main`, PR-first, followed by owner-specific Closure Sweeps and current browser/native/provider evidence.

---

# 2. Evidence set reconciled

Primary readiness evidence incorporated:

```text
W1
project_docs/RESEARCH_WAVE1_IMPLEMENTATION_READINESS_2026-09-09.md
project_docs/RESEARCH_WAVE1_STAGED_IMPLEMENTATION_PLAN_2026-09-09.md
project_docs/RESEARCH_WAVE1_JOURNAL_V8_MIGRATION_SOURCE_SPEC_2026-09-09.md
and the later Wave-1 source-spec / terminalization / capacity tranches

W2
project_docs/RESEARCH_WAVE2_BROWSER_LIFECYCLE_READINESS_2026-09-09.md

W3
project_docs/RESEARCH_WAVE3_FIDELITY_READINESS_2026-09-09.md

W4
project_docs/RESEARCH_WAVE4_JOURNAL_PORTABLE_HISTORY_READINESS_2026-09-09.md

W5
project_docs/RESEARCH_WAVE5_SECURITY_AUTH_GOVERNANCE_READINESS_2026-09-09.md

W6
project_docs/RESEARCH_WAVE6_SCALE_FAIRNESS_READINESS_2026-09-09.md

Project-wide partition
project_docs/RESEARCH_PROJECT_PRODUCTION_ENTRY_SYNTHESIS_2026-09-09.md
```

The W6 branch was reconciled immediately before this tranche:

```text
behind main = 0
ahead main  = 5
final diff  = one research document + two project_tools
workflow/runtime/manifest changes = none
```

The final actuality check immediately before this document write reconfirmed unchanged `main` and unchanged Registry ownership/status authority.

---

# 3. Exact ACTIVE owner denominator remains 106

Canonical denominator:

```text
ACTIVE P0 = 17
ACTIVE P1 = 89
TOTAL     = 106
```

Primary implementation-home counts:

```text
W1 = 21
W2 = 20
W3 = 16
W4 = 15
W5 = 18
W6 = 16
-----------
     106
```

Each owner has exactly one primary wave. Supporting dependencies do not reassign ownership.

## W1 — 21

```text
P0-023 P0-070 P0-072 P0-073 P0-074 P0-076 P0-078 P0-079 P0-080
P1-076 P1-086 P1-090 P1-125 P1-146 P1-179 P1-183 P1-184 P1-194 P1-198 P1-207 P1-210
```

## W2 — 20

```text
P1-004 P1-124 P1-130 P1-156 P1-157 P1-169 P1-171 P1-175 P1-193 P1-199
P1-200 P1-201 P1-203 P1-204 P1-209 P1-214 P1-217 P1-222 P1-223 P1-227
```

## W3 — 16

```text
P0-004
P1-001 P1-003 P1-150 P1-154 P1-187 P1-212 P1-218 P1-219 P1-220
P1-221 P1-224 P1-226 P1-228 P1-229 P1-230
```

## W4 — 15

```text
P0-013 P0-050
P1-008 P1-185 P1-186 P1-188 P1-189 P1-190 P1-197 P1-202
P1-205 P1-206 P1-211 P1-216 P1-225
```

## W5 — 18

```text
P0-022 P0-045 P0-066 P0-069 P0-075
P1-138 P1-161 P1-164 P1-165 P1-172 P1-176 P1-177 P1-178
P1-180 P1-182 P1-191 P1-195 P1-196
```

## W6 — 16

```text
P1-009 P1-035 P1-043 P1-064 P1-158 P1-160 P1-162 P1-163
P1-166 P1-167 P1-168 P1-170 P1-173 P1-174 P1-192 P1-208
```

No owner is omitted and no owner has two primary homes.

---

# 4. Cross-wave architecture principle

The final project architecture is not six independent feature rewrites.

It is one chain of authority domains:

```text
context/privacy admission
-> exact source/application/selection authority
-> worker-issued physical operation
-> exact render attempt
-> immutable PDF byte object
-> browser/native or Yandex effect admission
-> exact external settlement/reconciliation
-> Journal generation/revision finalization
-> durable user reconciliation
```

with independent supporting domains for:

```text
frame/session authority
reversible live-page mutation
portable-data provenance
OAuth/auth capability
publication policy/effect
bounded computation/resource admission
maintenance fairness
```

A later receipt may **reference** an earlier authority, but must not rebuild it from current mutable state.

---

# 5. Research-evolution resolution: Journal v7 vs v8

One genuine research-evolution issue was found.

An earlier W1 staged implementation plan intentionally minimized early migration risk and proposed:

```text
WebClipJournal stays v7 during early Wave 1
```

Later W1 D/J0 source work established that durable Journal authorities require structural capacity before D0 activation and introduced:

```text
J0: WebClipJournal v7 -> v8
```

W4 then explicitly refined the same not-yet-shipped v8 package, and W6 added scale structures that should be present when the package is created.

## Final resolution

The earlier `stay v7` recommendation is **superseded for future production planning** by the later J0 source specification.

This is not a production conflict because canonical runtime is still v7 and none of the research migrations has shipped.

Future implementation must therefore use:

```text
A0
-> U0
-> J0 WebClipJournal v8 passive structural migration
-> later D0 CAS activation
```

Do not implement the outdated earlier branch that skips J0 and then create an immediate v9 to add already-known structures.

---

# 6. Canonical generation vocabulary

A second cross-wave ambiguity was found in research shorthand:

```text
W2: PG = permissionGeneration
W1/W5: PG = publicationPolicyGeneration

W3: AG = applicationGeneration
W5: AG = AuthAttemptGeneration
```

The shorthand is harmless inside isolated diagrams but unsafe in persisted schemas, logs, IPC contracts and shared helpers.

## Final naming rule

Production source/persistence/API contracts use descriptive full names.

Canonical vocabulary:

```text
physicalOperationId
sourceGenerationId
applicationGeneration
selectionRevision
renderAttemptId
pdfGeneration

authAttemptGeneration
authGeneration
configGeneration
publicationPolicyGeneration

journalDatasetGenerationId
entryRevision
journalRevision
urlStatsGeneration
operationLogHistoryGeneration
settingsImportGeneration

frameSessionGeneration
hostPermissionGeneration
frameCommandGeneration
remotePrintGeneration
pageMutationGeneration

maintenanceGeneration
storageReservationId
```

Forbidden as persisted/shared authority field names:

```text
generation
AG
PG
JG
ER
HG
SIG
FS
R
M
```

Short symbols remain acceptable in local research diagrams/tests only when their meaning is explicitly declared.

Do not create one generic `generation` that is interpreted differently by subsystem.

---

# 7. Final known structural schema packages

The purpose of this section is to avoid repeated migrations caused only by known W1–W6 requirements.

It is not a promise that no future Change Impact can ever justify another schema version.

## 7.1 `WebClipOperationReceipts v1`

New functional authority DB.

It is separate from OperationLog because diagnostic clear/retention must not delete live operation authority.

Final known stores:

```text
receipts
resourceReservations
```

### `receipts`

Key:

```text
physicalOperationId
```

Known useful indexes:

```text
clientRequestId
[operationKind, subjectKey]
updatedAt
phase / terminalAt where supported by exact schema choice
```

It stores compact functional operation/domain receipts, not PDF bodies and not diagnostic event streams.

### `resourceReservations`

W6 P1-043 global persistent-byte reservation authority.

Conceptual indexes:

```text
ownerGeneration / ownerRef
resourceClass
phase
leaseUntil / updatedAt
```

Reservation release remains distinct from external-effect settlement evidence.

Do not create another capacity DB unless implementation evidence proves this sole-worker DB cannot safely host the ledger.

---

## 7.2 `WebClipPdfRetryCache v4`

Shared worker/offscreen database and therefore one package-atomic version bump.

Stores:

```text
pdfs
meta
retryIndex   // new
```

Identity:

```text
pdf:<pdfGeneration>
```

Creation:

```text
pdfs.add(exact payload)
meta.add(exact sealed receipt)
retryIndex.put(tab/current-live-source -> exact generation)
```

in one transaction.

Legacy `tab:<id>` v3 rows remain `legacy-unbound`. No UUID or URL/path inference may upgrade them into exact source authority.

Both worker and offscreen must request v4 in the same shipped package and perform the exact protocol/schema handshake before trusted use.

---

## 7.3 `WebClipJournal v8`

Final known forward structural package for W1/W4/W5/W6.

### Sole structural migration owner

```text
service-worker.js
```

`journal.js` becomes a non-owner:

```text
current protocol handshake
-> WEBCLIP_JOURNAL_SCHEMA_READY
-> worker migrates/verifies exact v8
-> page opens exact v8 for normal direct reads
```

If `journal.js` unexpectedly enters `onupgradeneeded`, it aborts/fails schema-not-ready rather than constructing a competing schema.

### Existing stores retained

```text
entries
urlStats
meta
pendingAppends
pendingDownloads
pendingRemoteSaves
importStaging
```

### New known-required stores in the same v8 package

```text
journalFinalizations
pendingRemoteMutations
urlStatsV2
journalSummaries
```

#### `journalFinalizations`

W1 early finalization authority, created before long render/external work.

Carries exact physical operation, JG/ER bridge fields and scoped clear/revoke indexes.

#### `pendingRemoteMutations`

Exact destructive effect ownership for Mark Read/Delete-to-Trash and compatible future domain mutations.

Must include phase/time indexes required for bounded phase-aware recovery.

#### `urlStatsV2`

W4 shadow-generation materialized projection.

Consumers see either a complete old published generation or a complete newly published generation, never partial rebuild truth.

#### `journalSummaries`

W6/W4 derived light projection for:

```text
JournalRowSummary
cheap non-heavy search/filter candidate evaluation
canonical URL/site/reading fields
JG/ER binding
```

It is rebuildable derived state, not source authority.

Initial v8 should include the non-text indexes already known to be required for bounded candidate narrowing and view operations, for example generation + canonical URL/site/reading domains.

Exact substring-search acceleration strategy remains subject to measurement because IndexedDB has no native full-text index. Do not invent an enormous token index without evidence merely to avoid any hypothetical future version. The known structural requirement is the light summary projection; if later scale evidence proves an additional store/index essential, that becomes explicit Change Impact rather than an unreviewed hidden migration.

### Meta state known at v8

At minimum:

```text
datasetGeneration
authorityMode
urlIdentityMigration
publishedUrlStatsGeneration
urlStatsSourceRevision
urlStatsState
durableUrlSchemaVersion
selectionSnapshotSchemaVersion
historicalRemoteProvenanceVersion
journalSummaryProjectionGeneration
maintenance/fairness schema marker as needed
```

### Structural migration rule

`onupgradeneeded` performs only bounded structural creation/seeding.

Do not perform a huge full-entry rewrite there.

Resumable post-open migrations include:

```text
canonical URL identity backfill
summary projection rebuild
projection regeneration
legacy normalization where explicitly authorized
```

with durable generation/cursors.

### Passive-first authority

v8 migration seeds:

```text
authorityMode = passive-v8
```

D0 later performs controlled activation:

```text
passive-v8 -> cas-v1
```

only after all required mutation writers/protocols are compatible.

Unknown/newer authority mode fails closed; no downgrade normalization.

---

## 7.4 `WebClipOperationLogs v3`

OperationLog remains diagnostics, never physical effect authority.

Add:

```text
meta
meta.historyGeneration
```

Clear/retention/writers are fenced by exact `operationLogHistoryGeneration`.

Activation must simultaneously add W6 bounded/coalescible waiting-turn semantics so the new history correctness layer is not introduced behind an unbounded Promise queue.

No OperationLog clear may touch `WebClipOperationReceipts`.

---

## 7.5 `WebClipOffscreenTransfers v1`

No known W1–W6 structural requirement currently justifies a schema bump.

Keep v1 unless a production source spec demonstrates a required object store/index change.

Protocol/bundle versioning is independent from IndexedDB version.

---

# 8. Storage/session ownership map

## IndexedDB durable functional authority

```text
WebClipOperationReceipts v1
  physical user operations
  compact reconciliation receipts
  global storage reservations

WebClipPdfRetryCache v4
  immutable PDF payload/meta generations
  current live-retry pointer

WebClipJournal v8
  Journal rows
  JG/ER finalization authority
  exact remote destructive effect rows
  projections/migrations/summaries

WebClipOperationLogs v3
  diagnostics only
```

## `chrome.storage.session`

Suitable for browser-session/live capability state whose target cannot survive full browser restart as the same live document/session:

```text
Save As continuation session state
OAuth AuthAttemptReceipt / PKCE verifier secret
FrameSessionCheckpoint
other bounded session-only prompt receipts
```

## `chrome.storage.local`

Suitable for non-secret persistent control generations:

```text
hostPermissionGeneration
context-menu desired generation/repair receipt
extension-page refresh generation
publicationPolicyGeneration + desired Boolean
safe auth/config capability metadata where current auth architecture requires it
```

Never place in functional durable receipts/logs:

```text
access token
PKCE verifier outside its session-secret owner
Authorization header
signed upload/download URL
raw bearer capability
```

---

# 9. Final authority dependency graph

The project must not be implemented as one huge PR and must not be treated as six fully serial waves.

The graph has one foundation spine plus coordinated branches.

## 9.1 Foundation spine

```text
A0  passive OperationReceipt v1 + minimum capacity/reservation primitives
 ↓
U0  worker/content/offscreen/extension-page protocol fencing
 ↓
J0  passive WebClipJournal v8 structural migration
 ↓
A1  exact content/source/application/selection protocol
 ↓
A2  worker-issued physicalOperationId admission
 ↓
B0  exact render fence + one-pass PDF SHA-256/length
 ↓
B1  immutable WebClipPdfRetryCache v4 generation
```

This is the hard anti-wrong-artifact spine.

## 9.2 Remote/auth branch

Do not close W1 C0/C1 using a mutable current token model.

Required coordinated sequence:

```text
W5 SECURITY-BASE
  field limits
  privacy-context fence
  durable URL/privacy primitives

W5 AUTH-CORE
  authAttemptGeneration
  captured redirect/state + PKCE
  candidate validate-before-commit
  authGeneration
  accountUid + granted-scope capability receipt
  401 exact-generation demotion

B1 immutable G/N/H
       +
W5 AUTH-CORE
       ↓
C0 immutable Yandex account/root/config/auth/publication context
       ↓
C1 exact remote V2 checkpoint/content/object settlement
```

P1-184 exact remote content therefore cannot outpace P0-079 immutable local bytes or W5 exact auth capability.

Real Yandex L5 remains downstream of internal C1 implementation.

---

## 9.3 Journal/data branch

J0 exists before any of these activation steps.

Parallel pure normalization work may start early, but mutation authority waits for D0.

```text
J0
 ├─ W4 PortableDataAdmission / canonical time/url/provenance/comment normalization
 ├─ W4 canonical URL migration + urlStatsV2 + JournalViewReceipt
 ├─ W6 journalSummaries/search candidate projection
 └─ D0 JG/ER CAS activation
        ↓
     transactional comment mutations
        ↓
     P1-202 PRODUCT DECISION
        ↓
     deleted-comment/tombstone policy P1-211
```

W4 must not create a second Journal generation model.

Use:

```text
journalDatasetGenerationId
entryRevision
journalRevision
urlStatsGeneration
```

for their distinct purposes.

---

## 9.4 Frame/fidelity branch

W3 cross-frame correctness requires W2 exact frame/session authority first.

```text
A1 exact document authority
+ W5 privacy admission
    ↓
W2 exact document routing
    ↓
W2 frame substrate:
  frameSessionGeneration
  hostPermissionGeneration
  exact child documentId
  worker epoch / agent instance
  disconnect fail-safe
    ↓
W2 remotePrintGeneration / partial prepare-restore
    ↓
W3 cross-frame selection/representation/fidelity
```

Independent W3 local rollback work can proceed earlier:

```text
PageMutationLedger
compare-before-restore
exact generated-node/structural rollback
```

W3 may not create another independent frame generation.

---

## 9.5 Browser/native/control branch

After common protocol + physical operation foundations where applicable:

```text
W2 crash-safe tabs.create relay/bind
W2 Save As PROMPT_OWNED lifecycle
W2 Action degraded/convergent repair
W2 context-menu desired generation
W2 extension-page refresh generation
W2 Options latest-edit/browse generations
```

The semantics depend on operation class:

```text
READ
CONVERGENT_BROWSER_STATE
NON_CANCELLABLE_EFFECT
USER_OWNED_PROMPT
DOCUMENT_FRAME_COMMAND
PAGE_LOCAL_UI_GENERATION
```

Do not wrap all six in one generic timeout helper.

---

# 10. W6 is an overlay at creation time, not a final optimization sprint

Five separate scale mechanisms remain canonical:

```text
WorkBudget
StorageReservation
SettlementAdmission
FairRecoveryCursor
CoalescingQueueState
```

They are not interchangeable.

## Co-landing rule

If W1–W5 creates a new queue/store/resource owner, minimum safe bounds land in the same production tranche.

Examples:

```text
OperationReceipts v1
  -> active-row/retention/capacity + resourceReservations

PDF v4
  -> byte/count ownership and exact GC rules

W2 browser actual effects
  -> P1-166 settlement admission cap at activation

Journal v8
  -> phase/time indexes and durable cursor capability
  -> journalSummaries light projection support

OperationLog v3
  -> bounded/coalesced waiting-turn queue

W3 capture history / mutation ledger
  -> node/string/mutation/retained-reference budgets
```

Do not intentionally ship an unbounded new correct subsystem and defer its only admission bound to a later W6 PR.

---

# 11. Final canonical receipt relationships

## User operation

```text
clientRequestId / clientCorrelationId   // request/UI correlation only
physicalOperationId                    // worker-issued physical authority
```

Caller/imported textual IDs never become physical authority.

## Source/capture

```text
sourceGenerationId
browserDocumentId
applicationGeneration
selectionRevision
```

## Render/PDF

```text
renderAttemptId
pdfGeneration
byteLength
sha256
representation/fidelity receipt refs where available
```

W1 proves exact bytes; W3 proves what those bytes truthfully represent.

## Yandex

```text
authGeneration
accountUid
granted capability/scope proof
configGeneration
rootPath
publicationPolicyGeneration
remote effect/content receipt
```

Token remains secret capability, not durable receipt data.

## Journal

```text
journalDatasetGenerationId
journalRevision
entryRevision
finalizationId
```

## Frames

```text
frameSessionGeneration
hostPermissionGeneration
childDocumentId
topDocumentId
frameCommandGeneration
remotePrintGeneration
```

## Page mutation/fidelity

```text
pageMutationGeneration
CaptureAdmissionReceipt
RepresentationPlan
ResourceGraphReceipt
FidelityReceipt
```

---

# 12. External-effect rule across all waves

One invariant survives every subsystem:

```text
caller timeout != cancellation proof
worker death    != cancellation proof
missing callback != external failure proof
```

Effect state must distinguish at least:

```text
not-admitted
admitted / started-unknown
verified-success
verified-failure
unknown
manual-resolution
detached evidence
```

A destructive reset can revoke **future admission authority** but cannot retroactively prove that an already-admitted browser/provider effect did not happen.

This composes:

```text
P0-072
P1-124
P1-146
P1-156
P1-164
P1-183
P1-184
P1-208
P1-210
```

without merging their identities.

---

# 13. Product gate P1-202 remains unresolved

W4 proved that repository evidence supports two materially different policies for deleted comments:

```text
privacy-delete
retained-history
```

There is no canonical product decision selecting one.

Research recommendation remains:

```text
privacy-delete
```

because it has lower privacy surprise and lower tombstone capacity debt.

But this recommendation is not silently promoted to project truth by this reconciliation.

## Required decision point

Before production tranche implementing P1-202/P1-211 deletion semantics:

```text
record explicit canonical product decision
```

Then acceptance/export/search/backup/retention semantics follow that decision.

The absence of this product decision does **not** block foundation A0/U0/J0/B1 or unrelated implementation branches.

---

# 14. Defensive security boundary remains explicit

This project research performs defensive architecture analysis only.

Final security rules:

- host page is untrusted data/control input;
- extension-owned UI/receipt authorizes credential/permission/publication/destructive operations;
- Incognito/unknown context fails closed before normal-profile persistent/history reads;
- operational exact URL and durable/display URL are separate roles;
- SelectionSnapshot portable v4+ minimizes plaintext/raw capability material;
- imported Yandex/operation metadata is historical provenance, not live capability;
- OAuth state is actually compared from captured redirect;
- manual token validates before current auth-generation replacement;
- late 401 is exact auth-generation fenced;
- publish policy, publish admission and observed public state are separate truths;
- tokens/signed transfer URLs never enter durable functional evidence/logs.

No offensive vulnerability scanning/exploit work is implied or required.

---

# 15. Final internal implementation topology

The following is the preferred project-level order. It is a partial order, not a demand that every line wait for every unrelated preceding line.

```text
FOUNDATION
  A0 OperationReceipts v1 + reservation capacity
  U0 protocol/update fencing
  J0 final Journal v8 structural package

SOURCE / ARTIFACT
  A1 exact content/source authority
  A2 physical operation identity
  B0 render fence + N/H
  B1 PDF cache v4

EARLY PARALLEL BRANCHES
  W5 privacy/limits/auth foundation
  W2 exact document/browser lifecycle substrate
  W3 local mutation ledger
  W4 pure portable normalization
  W6 refill-only parser / bounded UI work where independent

REMOTE
  W5 auth core
  C0 immutable Yandex context + publication policy generation
  C1 exact remote content/effect checkpoint

JOURNAL
  W4 URL/projection/view foundations
  D0 JG/ER activation
  W4 transactional comments
  P1-202 decision
  W4 tombstone policy
  OperationLog v3 / Settings SIG

FRAME/FIDELITY
  W2 frame substrate
  W2 exact remote print generation
  W3 selection/representation/resource/fidelity closure

EXTERNAL/USER RECONCILIATION
  D1 destructive domain effects
  D2 exact save finalization
  E0 common read-only reconciliation
  E1 UI reconciliation cutover

SCALE/FAIRNESS COMPLETION
  remaining W6 global search/fairness/action/maintenance work

Z0
  cross-wave Closure Sweep / Change Impact

EXTERNAL CLOSURE
  current Chrome/native QA
  real Yandex L5
  release regression
  explicit release decision
```

---

# 16. What can safely run in parallel

After A0/U0/J0 contract is stable, parallel work is appropriate where authority domains do not overlap.

Examples:

```text
W3 local reversible rollback
parallel with
W4 portable normalization
parallel with
W5 privacy serializer/field limits
```

or:

```text
W2 Save As lifecycle
parallel with
W4 OperationLog history generation
```

or after frame substrate exists:

```text
W3 same-origin geometry work
parallel with
W3 remote representation work
```

---

# 17. Unsafe parallelism

Do not allow separate PRs/teams to independently invent competing versions of:

```text
physicalOperationId
Journal dataset/entry generation
AuthGeneration
PublicationPolicyGeneration
frame/session identity
external-effect unknown semantics
PDF cache generation identity
schema migration ownership
```

These are shared infrastructure, not feature-local implementation details.

---

# 18. Migration/update compatibility gates

## Worker/content

Mutating requests require current protocol. Old realm cannot be silently upgraded and allowed to reuse old reviewed selection authority.

## Worker/offscreen

Before PDF v4 trusted use:

```text
protocolVersion
bundleVersion
pdfCacheDbVersion
active/unknown transfer state
```

must be reconciled.

A stale offscreen with active/unknown effect is not closed as if cancellation were proven.

## Worker/Journal page

Journal page requires exact schema-ready receipt before exact-v8 open.

## Authority mode

Older package encountering newer/unknown `authorityMode` fails mutation closed.

## Legacy rows

No migration step manufactures stronger authority from:

```text
tabId
URL
path
filename
size
timestamps
resourceId alone
legacy operationId
```

---

# 19. L2 final reconciliation model

Durable model:

```text
project_tools/test_final_w1_w6_cross_wave_reconciliation_model.js
```

Execution receipt:

```text
GitHub run     34360187284
job            102494868183
execution SHA  152849fb681af9b693e635eb14ecdb60085fc3de
runner         ubuntu-24.04 / Ubuntu 24.04.4
Node           v22.23.2
result         Final W1-W6 cross-wave reconciliation model: PASS; cases=121
```

The temporary workflow used solely to obtain the receipt was deleted immediately after success and is not part of the intended final branch diff.

The 121 assertions verify, among other things:

- exact 21/20/16/15/18/16 wave counts;
- 106 unique primary ACTIVE owners;
- 17 P0 + 89 P1 denominator;
- P1-231 remains absent;
- schema version freeze `1/4/8/3/1`;
- required Journal-v8 passive stores/meta domains;
- OperationReceipt functional/diagnostic separation;
- unique descriptive generation vocabulary;
- ambiguous shorthand not used as canonical persistence vocabulary;
- final dependency graph acyclic;
- J0 precedes D0;
- B1 precedes C1;
- W5 auth core precedes C0/C1;
- W2 frame substrate/remote print precedes W3 cross-frame closure;
- D0 precedes transactional W4 comments;
- P1-202 remains a product gate;
- W6 minimum bounds co-land with created surfaces;
- Yandex L5 stays external-required;
- current Chrome/native QA remains required;
- PD7 Stable 153 remains feature-inactive/watch;
- no production/release/critical-closure claim is fabricated.

This is L2 architecture evidence, not production/browser/provider closure.

---

# 20. Physical/current-browser evidence still required during implementation closure

Research/model PASS does not replace real browser effects.

At minimum, affected production tranches eventually require current applicable Chrome evidence for:

```text
worker/offscreen PDF v3->v4 migration with pre-existing data
shared DB reopen/versionchange behavior
same-tab concurrent PDF generations
same-URL documentId reload fencing
one-pass PDF digest vs retained physical artifact
worker termination at operation phase boundaries
crash-safe tabs.create relay/bind
native Save As user-owned prompt/page loss/restart
permissions.request user gesture and post-prompt revalidation
frame-agent disconnect/re-handshake/reload/permission revoke-regrant
Action degraded state and bounded repair
large Journal incremental/view/search behavior
maintenance fairness across worker restarts
Incognito contextual fail-closed in real Chrome
```

PD7 current Stable baseline remains:

```text
Chrome for Testing Stable 153.0.8010.36
single-axis-scroll-container feature support = false
CURRENT-STABLE FEATURE-INACTIVE / WATCH
```

A later browser target/platform change reopens its Change Impact; current baseline does not require feature-active PD7 proof.

---

# 21. Real Yandex L5 remains external-required

Do not upgrade these to PASS from local models:

```text
actual granted-scope reporting semantics
actual account identity fields used as capability proof
401/revocation behavior across real reauth/account changes
upload object metadata/checksum semantics
resource identity continuity through exact object operations
publish/unpublish actual settlement
public-link revocation/readback
unknown PUT/provider recovery
checksum-unavailable fallback against real provider
```

Expected L5 sequence, when explicitly authorized at final stage:

```text
exact local G/N/H
-> upload under exact validated ARG/account/root
-> exact remote content proof
-> exact RID/revision observation
-> publication/unpublication where authorized
-> same-size different-content negative controls
-> worker/retry unknown-settlement schedules
-> committed evidence checked for secret leakage
```

Until then:

```text
P1-184 and related provider-bound owners remain ACTIVE
release readiness remains NO
```

---

# 22. Release boundary remains unchanged

This research does not modify `project_docs/RELEASE_READINESS.md`.

Known release blockers remain external to architecture readiness, including applicable unpacked Chrome QA, Yandex E2E/L5, release-blocker review and explicit release decision.

No build/version/tag/release/deployment was created.

---

# 23. Final research conclusion

The final W1–W6 contradiction sweep found **no independent root cause requiring a new P-code**.

It did find and resolve two implementation-level composition risks:

1. **research evolution:** early `Journal stays v7` plan is superseded by later J0 `v7→v8` source specification plus W4/W6 refinements;
2. **generation naming collision:** shorthand `AG/PG/...` means different things in different waves, so production contracts use full descriptive names only.

After those corrections, the six readiness waves compose into one coherent dependency graph.

Final strongest truthful statement:

```text
PROJECT RESEARCH COVERAGE                  COMPLETE for exact baseline
PROJECT IMPLEMENTATION PROGRAM             DEFINED
W1-W6 IMPLEMENTATION READINESS             RECONCILED
SCHEMA / MIGRATION OWNERSHIP                RECONCILED for known requirements
PRODUCTION SOURCE                           STILL CURRENT MAIN / FINDINGS ACTIVE
PRODUCTION IMPLEMENTATION                   NOT COMPLETE
CRITICAL OWNER CLOSURE                      NOT COMPLETE
RELEASE                                     NOT READY
REAL YANDEX L5                              DEFERRED / REQUIRED
NEW P-CODE                                  NONE
P1-231                                      UNALLOCATED
```

The project is now ready to transition from broad architecture research into staged production implementation **without inventing core identity/migration semantics during coding**.

Every future production tranche must still:

1. fresh-check current `main` and Registry;
2. run targeted Change Impact if baseline changed;
3. use a production branch/PR separate from research evidence;
4. preserve exact owner status until required production + browser/native/provider closure exists;
5. perform Closure Sweep across affected neighboring cells, not only the local P-code;
6. avoid release/version/build actions unless separately authorized.
