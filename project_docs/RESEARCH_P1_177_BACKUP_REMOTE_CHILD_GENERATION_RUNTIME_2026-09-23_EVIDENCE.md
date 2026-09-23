# WebClip — P1-177 backup remote-child generation admission runtime — 2026-09-23

Date: 2026-09-23  
Canonical baseline: `main = a74f085141a64212d61ab21428824f47cc375ffa`  
Baseline post-merge Repository Integrity: **#1095 / run 35891591416 / SUCCESS**  
Owner: **P1-177**  
Manifest/runtime version: **0.9.8**  
Release readiness: **NOT READY**  
Real Chrome/Yandex L5: **NOT RUN**  
P1-231 S2 activation: **NONE**  
New P-code: **NO**

## 1. Scope

PR #345 closed the first scheduler-generation boundary: durable scheduler control, fixed-alarm generation receipts, explicit Disconnect pause, explicit auth resume, callback admission, and a second admission check immediately before entering the backup pipeline.

The remaining P1-177 race was later remote-child admission inside an already-started background pipeline:

```text
S active
callback admitted
pre-pipeline admission passes
local snapshot / lease work continues
Disconnect -> S+1 paused
later remote child has not started yet
```

The P1-177 contract requires a fresh scheduler-generation/mode check before that child starts. It must not reinterpret an already-started signed effect as cancelled.

## 2. Provider/platform semantics

Current Yandex Disk REST API remains a multi-stage HTTP protocol: resource management is performed through REST requests, while file upload uses a separately obtained upload endpoint followed by transfer of the file bytes. WebClip therefore cannot treat admission to the outer backup function as blanket authority for every later provider child.

Provider semantics and WebClip policy are separate:

- Yandex defines the remote API/transfer stages.
- WebClip owns whether an old scheduler generation may start a new stage.
- A scheduler pause cannot prove cancellation of a transfer that already physically started.

## 3. Runtime design

Background `runDueJournalBackup(...)` now passes its exact admitted `scheduledGeneration` into `exportJournalBackupToYandex(...)`.

The background export:

1. requires a non-zero scheduler generation;
2. captures one immutable current Yandex operation context under that generation;
3. keeps that operation context for remote requests so a later re-auth cannot silently retarget an old pipeline;
4. installs a `beforeRemoteChild` admission hook bound to the same scheduler generation + operation-auth receipt.

Manual backup keeps its existing behavior and does not require scheduler authority.

## 4. Child boundaries

The bound hook is consumed immediately before later remote children in the background backup path:

- each folder-provisioning PUT;
- folder verification GET after an already-existing resource response;
- pending-backup recovery metadata verification;
- upload-URL acquisition;
- signed upload admission;
- post-upload metadata verification.

This is stronger than a single pre-upload check: Disconnect between any two children prevents the later not-yet-started child from inheriting authority from an earlier one.

## 5. Signed-effect settlement

Before signed upload admission, WebClip persists the prepared backup checkpoint with the scheduler generation.

Two cases are intentionally different.

### 5.1 Generation stale before signed upload starts

The child admission fails before `runOffscreenSignedTransfer(...)` is invoked.

No physical signed effect has started, so the just-created prepared checkpoint is retired and the background operation returns a scheduler-stale `skipped` outcome.

### 5.2 Disconnect after signed upload starts

The signed effect is historical work. WebClip does not cancel or rewrite it merely because scheduler generation changed.

If the transfer settles and the next verification child is no longer admitted, the prepared checkpoint remains. Later recovery/reconciliation can determine the remote outcome under the existing P1-076/P1-179/P1-184/P1-210 boundaries.

```text
scheduler pause controls future admission
!=
proof that already-started external work was cancelled
```

## 6. Failure bookkeeping

`JOURNAL_BACKUP_SCHEDULER_STALE` is handled before ordinary background failure settlement.

Therefore a generation/pause veto before a new child produces:

```text
ok = true
skipped = true
lastFailureAt delta = 0
lastBackgroundFailureAt delta = 0
ordinary retry authority = 0
```

A real success/failure from an already-started physical effect remains historical settlement truth. Existing retry scheduling still consumes current scheduler control, so a paused generation does not gain new scheduling authority.

## 7. Operation-context composition

P1-177 does not create a second auth or namespace owner.

It consumes:

- current auth-request authority / operation context from the existing Yandex auth model;
- current account/root proof already represented in scheduler control;
- scheduler generation only for the question: may this old scheduling decision start another child now?

P1-178 remains auth-generation owner.  
P1-179 remains namespace owner.  
P1-076/P1-184/P1-210 remain started/unknown external-effect settlement owners.

## 8. Deterministic coverage

Updated:

- `project_tools/test_p1_177_backup_scheduler_generation_runtime.js`
- `project_tools/test_p1_177_backup_pause_resume_generation_refinement_model.js`

Coverage asserts:

- exact generation propagation from `runDueJournalBackup` into export;
- background-only immutable operation-context capture;
- stale child veto before ordinary failure bookkeeping;
- upload URL / signed upload / post-upload verification gates;
- recovery verification gate;
- folder PUT/GET gates;
- prepared checkpoint before signed-effect admission;
- signed transfer starts only after the fresh child gate;
- started-effect checkpoint is preserved for later reconciliation.

Provider calls in deterministic tests remain **0**.

## 9. Identity impact

Baseline before this tranche:

- 34-file RPF: `sha256:3b493236e8060f2fdfdd60fc1a1078c82eb99f98757a2771fe37b68b68980673`
- 33-file negative/control projection: `sha256:4c5f04e9a2ab4caf1dacb6b7141f2c21fe5fe4af267c20e33e73d00c3ebd052c`
- Chrome QCF: `sha256:3715a3453333d3d679a1c1c00a0bab6a02b77c0153f1a4e8d138aa1e8f5a984c`
- Yandex QCF: `sha256:8d6c9711b4f71b8485b49a6ab68f90bcf62bc74155ae0959dbdc4718648879a1`
- full RCF: `sha256:a099e052fdd75038f40a8895d2f91a8e63cefc545387d9ddebef8b783eb90b07`
- BCF: `sha256:9eebcc834fa32bd8fe5f03ef14564f0fc1c169d0308dcc2813941b4f913363ff`

Because `service-worker.js` changes, exact-head source-generation authority must derive the new RPF and current 33-file control projection. Historical values above remain baseline evidence and must not be rewritten.

## 10. Status boundary

This tranche does not perform real provider qualification or release actions.

P1-177 remains **ACTIVE** until exact-head CI succeeds and current source is re-reviewed for any scheduler-generation admission gap. If that closure review finds no remaining P1-177-owned runtime gap, Registry status may be transitioned in a follow-up exact-head commit; release regression remains separate.
