# Audit delta — service-worker Chrome read admission / late precondition settlement

Date: 2026-08-27
Source `main` HEAD audited immediately before this write: `08410536a45d931988db83f41d2e09e707167709`
Scope: audit/docs only. Production runtime/config/manifest untouched.

## Classification

No new P-number created. Fresh inventory strengthens **P1-158 OPEN** and adds a specific read→write admission requirement. It also cross-references **P1-170 OPEN**, **P1-120 REGRESSION** and **P1-173 OPEN** without replacing their root causes.

## What is already correctly bounded

The current service worker has centralized bounded helpers for many read paths:

- OperationLog settings and settings export/import marker reads use `readChromeStorageBounded()`;
- backup storage reads use the same helper;
- prepared Save As session reads are bounded;
- `chrome.tabs.get()` has a bounded helper;
- `chrome.downloads.search()` reconciliation paths are bounded;
- `chrome.alarms.get()` is bounded;
- frame optional-permission `permissions.contains()` is bounded.

So P1-158 is not a blanket statement that every Chrome read is raw; the remaining gaps are identifiable.

## Critical remaining Yandex config reads

### `readYandexAuthState()`

It still performs:

`chrome.storage.local.get('yandexConfig')`

as a direct member of `Promise.all`, while session/legacy OAuth reads use the Yandex auth storage helper.

This is the already-registered P1-158 auth-critical proof: a hung local config read can hold token/config resolution before the network request/operation deadline meaningfully begins.

### `getYandexConfig()`

It still directly awaits `chrome.storage.local.get('yandexConfig')` with no bounded read helper.

This helper feeds multiple privileged/long operations, including upload/recovery, Yandex locate/move, backup/status and publication-policy decisions. Each caller should not have to remember an outer timeout that may not include this prerequisite.

Acceptance: use one bounded config-read primitive or immutable operation context with remaining-budget semantics; a late read result after returned timeout must not launch a later network/destructive side effect.

## Stronger P1-158 proof — read→write config mutation can start after caller timeout

`updateYandexConfig()` serializes config mutations correctly with an actual-settlement queue, but its `actual` task is:

1. direct `chrome.storage.local.get('yandexConfig')`;
2. call `mutator(current)`;
3. `chrome.storage.local.set({ yandexConfig: nextConfig })`.

The caller waits on the **whole actual task** with a 10-second local timeout.

If step 1 remains pending longer than that deadline:

- caller receives a terminal timeout;
- no config write has started yet;
- later, the raw `storage.get` may settle;
- the still-running `actual` continuation then executes the mutator and starts `storage.set` for the first time **after the caller was already told the operation timed out**.

This is distinct from the valid rule "timeout != cancellation" for a side effect that was already sent. Here the mutating phase had not begun when the deadline won.

### Required P1-158 acceptance refinement

For read→write helpers, use an explicit admission boundary:

- prerequisite reads are bounded before mutation admission;
- if their deadline wins, their late result is ignored and must not trigger the subsequent write;
- once the actual non-cancellable write is sent, keep the existing actual-settlement ordering barrier and treat timeout as unknown settlement, not cancellation;
- UI/result semantics must distinguish `timed out before mutation started` from `mutation started, outcome unknown`.

This requirement applies directly to `updateYandexConfig()` and should be used as the pattern for future Chrome read→mutation helpers.

## Crash-consistency stats marker cross-check

`beginJournalStatsMutation()` / `completeJournalStatsMutation()` execute direct `storage.local.get` inside their serialized marker task before set/remove. P1-120 already owns ordering of actual marker mutations.

Fresh audit does **not** create a new stats item, but acceptance should make the phase distinction explicit:

- if a marker write/remove already started, retain actual-settlement ordering;
- if caller deadline wins while still waiting only on a prerequisite read, do not later start a new write solely because that read finally resolved, unless the helper intentionally defines and surfaces that delayed mutation as an accepted pending state.

For a begin-marker, a late extra dirty marker is safer than missing a required marker, so implementation policy may differ from user settings; nevertheless it must be deliberate/tested rather than an accidental consequence of an unbounded read continuation.

## Direct tab reads / fan-out

Two service-worker `chrome.tabs.query({})` paths remain direct:

- `reloadOpenExtensionPagesAfterVersionChange()`;
- `refreshActionForAllTabs()`.

The first is startup best-effort refresh and is not currently a critical operation blocker because it is launched fire-and-forget.

The second belongs mainly to P1-170: Journal changes can launch an O(T) action refresh wave; an unresolved `tabs.query` has no local deadline and the wider flow lacks global coalescing/concurrency control. P1-158 supplies the bounded-read requirement; P1-170 owns fan-out/coalescing.

## Journal context exception

`chrome.storage.session.get(null)` inside serialized Journal-context creation is also direct, but P1-123 intentionally binds the mutation chain to actual settlement while exposing a bounded caller wait and preventing `tabs.create` after local timeout. An orphan context produced by a late actual settlement is bounded by the existing TTL/cap.

Do not mechanically replace this with a helper that would release ordering early. The audit requirement is phase-aware admission, not "put Promise.race around every Chrome call".

## Duplicate check

- P1-158 owns unbounded prerequisite reads and late read results that can cross a terminal deadline into later side effects.
- P1-173 owns unbounded queued turns behind a hung actual settlement.
- P1-120 owns stats-marker ordering/correctness.
- P1-170 owns action-refresh O(T) fan-out/coalescing.
- P1-178/P0-074 own auth/config generation authority, not API read lifetime.
- No P1-197 assigned.

## Test matrix

1. `getYandexConfig()` never settles -> controlled timeout before network/destructive call.
2. `readYandexAuthState()` config read never settles -> token path terminates bounded; no Yandex fetch starts later.
3. `updateYandexConfig()` prerequisite get settles after caller deadline -> **no later set** is started.
4. config set itself starts and settles after caller deadline -> next mutation remains ordered behind actual settlement and UI treats outcome as unknown/pending, not cancelled.
5. direct action-refresh `tabs.query` never settles -> future coalesced refresh can self-heal without unbounded waves (P1-170).
6. stats-marker delayed read behavior is explicitly tested according to the chosen safety policy.
