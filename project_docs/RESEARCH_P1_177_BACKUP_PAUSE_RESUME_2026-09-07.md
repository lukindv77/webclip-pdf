# P1-177 — Yandex disconnect / backup pause-resume generation — 2026-09-07

Date: 2026-09-07  
Canonical baseline: `main = d4f5b268fa3f7ced5a7bc68da52784863d614138`  
Working branch: `research/p1-177-backup-pause-resume-2026-09-07`  
Owner: **P1-177 ACTIVE**.

Research/model only. Runtime and manifest are unchanged.

## 1. Canonical owner

Registry defines P1-177 as:

> Yandex Disconnect/re-auth and backup scheduler need explicit no-auth/paused/resume generation semantics while in-flight signed effects remain separately reconciled.

This owner governs scheduler admission state, not exact pending-object namespace (P1-179), auth-attempt generation (P1-178), or unknown signed-upload settlement (P1-184/P1-076).

## 2. Current disconnect has no scheduler state transition

Current `WEBCLIP_YANDEX_DISCONNECT` clears `yandexAuth` and pending PKCE state. It does not write an explicit backup scheduler `paused-no-auth` generation and does not invalidate already queued retry/periodic decisions through a scheduler generation.

## 3. Current due-check does not gate on auth

`getJournalBackupStatus()` returns scheduler/config state such as enabled/rootPath/lastSuccess/lastFailure. `runDueJournalBackup()` checks only whether backup is enabled and rootPath exists before deciding due/retry.

If auth has been removed while backup remains enabled and a root remains configured, the background operation proceeds until Yandex auth access fails deeper in the export path.

## 4. No-auth becomes ordinary failure/retry churn

Background backup failure updates durable `lastFailureAt/lastBackgroundFailureAt/lastBackgroundError`. When backup is enabled and the error is not `JOURNAL_BACKUP_BUSY`, current code schedules another retry alarm.

Therefore explicit Disconnect can become:

```text
no auth
-> backup due
-> ordinary auth error
-> lastFailureAt
-> retry alarm
-> same auth error later
```

This is not truthful scheduler state. Missing auth after explicit disconnect should be a paused control state, not an operational backup failure.

## 5. Required scheduler state

Conceptually:

```text
backupSchedulerControl = {
  version: 1,
  generation: S,
  mode: active | paused-no-auth | paused-user | ...,
  namespace: <P1-179 account/root reference when active>,
  scheduledGeneration: S
}
```

Exact representation may differ. P1-177 needs a generation that invalidates stale alarm decisions across disconnect/re-auth/resume.

## 6. Disconnect semantics

Explicit disconnect:

```text
advance scheduler generation
mode = paused-no-auth
prevent new Yandex backup mutation admission
preserve exact in-flight/pending receipts
```

It MUST NOT claim that an already-issued signed upload request was cancelled. Removing OAuth state does not revoke a signed URL that may already be in flight/offscreen.

## 7. Alarm admission

Every periodic/retry alarm decision must compare the scheduler generation it belongs to (or equivalent durable scheduled receipt) with current scheduler generation.

Outcomes:

### stale generation

```text
-> skip
-> do not start remote work
-> do not update failure state
-> reschedule only according to current scheduler state
```

### paused-no-auth current generation

```text
-> skip as paused
-> no Yandex API call
-> no lastFailureAt increment
-> no retry-error churn
```

### active exact generation

Only then may due/retry logic proceed.

Chrome alarm names cannot carry arbitrary rich payload automatically; implementation may encode a generation in the alarm name or store a durable scheduled-generation receipt checked by the handler.

## 8. Resume semantics

Successful re-auth does not silently revive old alarm authority. It creates a new scheduler generation after the new auth/context is proven.

Before resuming mutation admission:

- P1-178/P1-191 establish proven current auth generation;
- P1-179 establishes the current account/root namespace;
- any old pending signed effect remains bound to its old namespace and reconciles separately.

If re-auth returns to the exact same namespace, recovery policy may reconcile old pending work before or alongside new scheduling. If it switches namespace, old work remains foreign/deferred under P1-179.

## 9. In-flight signed effect

Schedule:

```text
A backup checkpoint persisted
signed upload starts under A
user presses Disconnect
worker/token state is cleared
signed transfer may still commit or remain unknown
```

P1-177 requires:

- scheduler pauses new admissions;
- pending A checkpoint survives;
- lease expiry or auth deletion is not cancellation evidence;
- later reconciliation classifies the exact signed effect using P1-179/P1-184/P1-076.

## 10. Retry/success state across pause

A pause is not a backup failure and should not manufacture `lastFailureAt`.

A pre-pause retry alarm from generation S must not force a backup after resume generation S+2 merely because it fires later.

Likewise a newer success in the resumed generation must not be overridden by stale failure bookkeeping from a pre-pause operation.

## 11. Interaction with P1-179

P1-177 answers **may scheduler run now?**

P1-179 answers **which account/root namespace owns this durable backup state?**

Both are required. An active scheduler without namespace is unsafe; a perfectly scoped checkpoint without pause semantics still causes no-auth retry churn.

## 12. Interaction with P1-178/P1-191

Auth replacement/PKCE completion decides proven auth generation. Scheduler resume consumes the resulting proven auth/context; it does not independently validate tokens or overwrite auth state.

## 13. Deterministic model

`project_tools/test_p1_177_backup_pause_resume_model.js` proves:

1. current-shaped no-auth can become ordinary failure + retry;
2. disconnect pauses new remote admission without fabricated failure;
3. old retry alarm is stale after disconnect generation change;
4. resume creates a new generation and old paused alarms remain stale;
5. in-flight signed-effect checkpoint survives pause unchanged.

Model result: `P1-177 backup pause/resume generation model: PASS`.

## 14. Runtime acceptance requirements

Future implementation must prove:

1. explicit disconnect writes/derives `paused-no-auth` scheduler state;
2. scheduler mode has generation/receipt capable of invalidating old alarm decisions;
3. current no-auth pause causes zero new Yandex calls;
4. pause does not update ordinary backup failure counters;
5. pause does not schedule ordinary error retry churn;
6. stale periodic/retry alarms cannot start work after generation changes;
7. successful re-auth/resume creates a new scheduler generation;
8. resumed namespace is proven through P1-179/P0-074;
9. pending signed effects survive disconnect and are reconciled separately;
10. lease expiry/auth removal is never treated as proof a signed effect did not commit.

## 15. Status

P1-177 remains **ACTIVE**. Current runtime treats no-auth during background backup as an ordinary failure path and has no explicit scheduler pause/resume generation.

Runtime/manifest remain `0.9.8`; release remains `NOT READY`.
