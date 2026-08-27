# Audit delta — pending remote-save phase fairness — 2026-08-28

Source-of-truth `main` immediately before this write: `b092791f1916368abc79e2570a8b6850957dc257`.

Docs-only audit checkpoint. Production runtime, configuration, tests and `manifest.json` are unchanged by this commit. Product tests were not rerun.

## New confirmed item: P1-208 — bounded `pendingRemoteSaves` recovery can starve `remote-verified` local finalization behind auth-blocked PREPARED rows

**Classification:** P1 / evidence-reserved / confirmed by fresh runtime audit.

This item owns recovery **scheduling/fairness across durable phases**. It does not replace the existing correctness owners for remote identity, auth semantics or exact settlement proof.

## Fresh source proof

### 1. Recovery reads only the oldest bounded prefix

`listPendingRemoteSaves(maxItems)` reads `JOURNAL_PENDING_REMOTE_STORE` through the `updatedAt` index in ascending order and stops when it has collected `maxItems` active rows.

`recoverPendingRemoteSaves(trigger, maxItems = 6)` further caps that value to six.

Therefore each maintenance pass can inspect only the six oldest active rows selected by `updatedAt`.

The bounded batch is desirable for MV3/API/runtime limits. The defect is not the cap itself; it is lack of fair/phase-aware progress within that cap.

### 2. Authentication is checked once for the whole pass

At the start of recovery the worker executes the equivalent of:

- `authAvailable = true`;
- `getValidYandexAccessToken()`;
- on failure, `authAvailable = false`.

That is a useful fail-closed gate for rows that still require Yandex API access.

### 3. PREPARED rows are deferred unchanged when auth is absent

Inside the loop, for every row whose phase is not `remote-verified`, recovery checks `authAvailable`.

If auth is unavailable it only increments the local `deferred` counter and `continue`s.

The durable row is not:

- moved behind unexamined work;
- assigned a `nextAttemptAt`/fairness cursor;
- given a new scheduling revision;
- removed from the active prefix;
- converted to a distinct auth-blocked queue class.

Its `updatedAt` remains unchanged.

Therefore the same old auth-blocked PREPARED rows remain at the head of the `updatedAt` index on every later maintenance pass.

### 4. `remote-verified` rows do not require OAuth to finish their local Journal append

A `remote-verified` row bypasses the auth-dependent Yandex reconciliation block.

Recovery proceeds to `appendJournalEntryFromDurableCheckpoint(current.data, ..., { storeName: JOURNAL_PENDING_REMOTE_STORE, key: id })`.

That step is local IndexedDB Journal finalization. If the source checkpoint still exists and append succeeds, recovery removes the remote checkpoint and counts the item as recovered.

Thus a `remote-verified` row is materially different from PREPARED rows during an auth outage: its remaining work can be completed without a Yandex access token.

### 5. Deterministic permanent starvation schedule

A valid persistent schedule is:

1. R1..R6 are old active PREPARED checkpoints and sort first by `updatedAt`.
2. V7 is newer and already `phase:'remote-verified'`; its remote side effect was proven and only local Journal append remains.
3. Browser/session restarts, so the session-only Yandex access token is gone while Journal IndexedDB checkpoints survive.
4. Hourly maintenance calls `recoverPendingRemoteSaves()`.
5. The bounded scan selects only R1..R6.
6. `getValidYandexAccessToken()` fails; all six are deferred with no durable scheduling update.
7. V7 is never read.
8. Every later pass repeats steps 5–7 indefinitely until the user happens to reauthorize.

Nothing about V7 itself requires reauthorization. Its local Journal finalization is starved solely because unrelated older phases monopolize the bounded prefix.

### 6. Existing stale-attempt logic does not guarantee rotation during auth outage

Ordinary remote verification failures can update attempt/error/timestamps and eventually move work or archive repeated unresolved rows.

Auth-unavailable deferral does not perform such a transition. It intentionally avoids treating lack of credentials as a failed remote attempt.

That correctness decision is good, but without separate scheduling metadata it also means the oldest auth-blocked rows can remain permanent prefix occupants.

## Why this is not P1-064

`AUDIT_DELTA_LOCAL_DOWNLOAD_RECOVERY_FAIRNESS_2026-08-27.md` correctly refines **P1-064** for the local `pendingDownloads` queue: twelve old `in_progress` DownloadItems can monopolize the oldest bounded batch and starve a later terminal item.

That delta included a positive-control statement that `pendingRemoteSaves` did not exhibit the same permanent-head behavior on ordinary failures because failure handling updates `updatedAt`, and that auth-unavailable deferral affected remote items uniformly.

Fresh phase audit shows the latter assumption is incomplete: auth deferral is **not uniform across recovery phases**, because `remote-verified` rows need no auth at all.

The two queues have analogous fairness requirements but separate durable state machines, side-effect semantics and caps. Extending P1-064 from Chrome-download reconciliation to Yandex remote-save phase scheduling would blur those boundaries and its existing acceptance language. Therefore a separate P1-208 is warranted.

## Why this is not P1-195 / P1-196

- **P1-195** owns truthful OAuth capability/scope representation.
- **P1-196** owns token validity/lifetime and generation-fenced invalid-token demotion.

Even with a perfect `authAvailable` model, the queue can still starve if auth is truthfully absent. P1-208 begins **after** auth classification: it decides which durable recovery phases receive bounded service.

## Why this is not P1-184 / P0-074

- **P1-184** owns exact local-content / transfer-attempt / remote-object proof and unknown settlement.
- **P0-074** owns immutable Yandex auth/config/account/root operation generation.

Those identities determine whether a row is safe to reconcile/finalize. P1-208 determines whether a safe-to-finalize row is ever reached by bounded maintenance.

Fairness must never weaken those proof requirements.

## Required P1-208 contract

### Phase-aware bounded scheduling

Keep recovery globally bounded, but classify at least:

1. `remote-verified` — no further Yandex API authority needed; local Journal finalization/revision check only;
2. active PREPARED/transfer-unknown rows requiring remote reconciliation and valid auth;
3. auth-blocked rows waiting for user/session capability;
4. stale/dead-letter evidence that is outside the hot recovery queue.

A bounded pass must not let class 3 permanently block class 1.

### Local-finalization priority

`remote-verified` rows should receive a small guaranteed service budget or otherwise be prioritized ahead of work that cannot progress under current auth state.

This does not mean unlimited scanning. Acceptable architectures include:

- a phase index plus bounded per-phase quotas;
- a durable fair scan cursor;
- separate local-finalization and auth-required queues/indexes;
- `nextAttemptAt` scheduling metadata that moves auth-blocked rows out of the immediately eligible prefix without classifying them as failures.

### Durable fairness across MV3 restarts

In-memory rotation alone is insufficient. Browser/worker restart is one of the most natural ways to lose the session token, so the scheduling rule must survive the same restart that creates the starvation condition.

### Auth-blocked is not failed settlement

Do not increment remote-settlement failure attempts, mark stale, or erase evidence merely to rotate an item whose only blocker is missing credentials.

If scheduling metadata is changed, keep it distinct from provider-attempt counters and remote settlement evidence.

### No blind retry

Fairness changes which row is inspected; it does not authorize a new signed PUT or destructive remote operation.

PREPARED/unknown rows remain subject to P1-184/P0-074 exact reconciliation and no-blind-retry rules.

### Exact local finalization still revalidates ownership

A `remote-verified` row may finalize only if its exact durable checkpoint/generation still has Journal authority. Clear/import or a newer generation must cancel stale local append per P0-076 and the remote-checkpoint generation contract.

## Required deterministic regressions

1. Six older PREPARED rows + no Yandex token + one newer `remote-verified`: the verified row is finalized within a bounded number of maintenance passes without reauthorization.
2. Same topology survives MV3/browser restart; session token is absent and verified local finalization still progresses.
3. Twenty mixed active rows with persistent auth outage: every eligible `remote-verified` row receives service within a defined bounded number of scans.
4. Auth-blocked PREPARED rows remain durable and are not falsely marked remote-failed/stale merely to achieve fairness.
5. Reauthorization later resumes the auth-required rows with their original exact operation/account/root/content receipts; no duplicate signed PUT is introduced by the scheduler.
6. `remote-verified` row removed by concurrent clear/import before append is cancelled, not resurrected.
7. One slow/failing remote reconciliation row cannot monopolize every future six-item batch.
8. The existing global recovery deadline (`~120 s`) and per-pass item/API bounds remain enforced.
9. Stale/dead-letter evidence retention rules from P1-184 remain unchanged; fairness does not delete unresolved evidence.
10. During auth outage no Yandex API mutation is attempted on behalf of deferred rows solely to rotate the queue.
11. If all active rows require auth and auth is absent, maintenance remains bounded and reports truthful `authRequired/deferred` state without busy-looping.
12. A verified row whose Journal entry already exists is idempotently finalized/cleaned without being blocked by older auth-required work.

## Positive controls retained

- The recovery batch remains intentionally bounded rather than materializing the entire durable queue.
- Missing auth remains fail-closed for work that actually requires Yandex access.
- `remote-verified` does not automatically imply current Journal authority; durable checkpoint/generation checks still apply.
- Stale unresolved remote evidence remains a separate retention problem owned by P1-184.

## Number allocation

- New evidence-reserved **P1-208** is assigned by this audit block.
- No P0 or P2 number is assigned.
- This does not renumber any previously reserved item.

## Test / release state

Audit documentation only. Product runtime/configuration and `manifest.json` are unchanged. Product tests were not rerun; the last proven product gate remains historical **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Runtime version remains `0.9.8`. No build, tag or GitHub Release was created.
