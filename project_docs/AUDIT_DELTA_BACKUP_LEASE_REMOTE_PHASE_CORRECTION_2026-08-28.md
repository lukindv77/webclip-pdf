# Audit correction — backup lease remote-phase expiry proof — 2026-08-28

This docs-only checkpoint corrects one factual statement in the immediately preceding audit file `AUDIT_DELTA_BACKUP_LEASE_REMOTE_PHASE_EXPIRY_2026-08-28.md` (`51235adf507c2117fb4d7bc0b3d38c1dda3f6757`).

Runtime/tests/configuration/manifest are unchanged.

## Correction

The prior checkpoint stated that a deep but valid Yandex root could make `ensureYandexFolderTree()` execute an effectively unbounded number of 25-second requests and therefore outlive the 10-minute backup lease.

That statement is **not correct for the current runtime**.

Current `ensureYandexFolderTree()` already implements **P1-034** controls:

- normalized path length ≤ 2048;
- at most 32 path segments;
- one aggregate 90-second deadline for the whole tree operation;
- each Yandex request receives only the remaining deadline budget.

Therefore deep-root traversal itself is not an unbounded proof of lease expiry and must not be cited as such.

## What remains valid in the P1-076 finding

The semantic lease issue remains real because the current Yandex call stack still contains a separately documented unbounded prerequisite.

`yandexApi()` performs, in order:

1. operation-log preparation;
2. `await getValidYandexAccessToken()`;
3. only after auth resolution configures/starts the bounded HTTP fetch/AbortController path.

`getValidYandexAccessToken()` calls `readYandexAuthState()`.

Canonical **P1-158** already proves that this auth state read includes a direct unbounded `chrome.storage.local.get('yandexConfig')`. A never-settling Chrome Storage read can therefore keep a backup operation alive **before** the network request's own 25/90-second deadline applies.

The backup lease is renewed once immediately before `uploadJournalExportStagedToYandex()`, then no further lease heartbeat/check occurs until the remote call returns. Thus:

1. A renews lease LA for 10 minutes;
2. A enters remote phase;
3. an auth/config prerequisite hangs >10 minutes under P1-158;
4. LA expires while A's operation promise is still genuinely live;
5. B may acquire LB because acquisition checks only `expiresAt > now`;
6. the old A stack may later resume after the Chrome read settles;
7. A does not re-check LA before publishing backup success/failure state.

So the overlap proof is currently a **composition of P1-076 with P1-158**, not a failure of P1-034 folder traversal boundedness.

## Additional boundedness observation

With P1-158 fixed and all remaining backup sub-phases given genuine aggregate remaining-deadline budgets whose maximum sum is proven below the lease duration, a fixed 10-minute lease could be sufficient without a heartbeat.

The acceptance criterion should therefore be stated semantically rather than prescribing renewal frequency:

> A backup owner must prove that its exclusive authority cannot expire while any operation stage that can later resume and publish remote/state side effects remains live.

This may be achieved by:

- lease renewal/heartbeat;
- lease duration derived from one strict whole-operation deadline;
- or operation-receipt admission that blocks a successor while A has an actual unsettled side effect/prerequisite.

Regardless of mechanism, a stale owner must not publish current success/coverage after losing ownership.

## Required regression adjustment

Retain the previous P1-076 overlap regressions, but replace the inaccurate deep-root case with:

1. backup A renews LA;
2. mocked `chrome.storage.local.get('yandexConfig')` never settles for > lease TTL;
3. B attempts backup after TTL;
4. B is not allowed to create a conflicting generation while A may still resume, or A is permanently superseded/fenced before it can issue/publish later side effects;
5. late settlement of A's storage read cannot let A overwrite B's backup state.

Separately keep P1-034 regression proving 32-level/90-second folder-tree boundedness.

## Classification

No numbering change:

- **P1-076** remains the backup lease owner;
- **P1-158** supplies the current concrete unbounded prerequisite that proves possible lease expiry;
- **P1-034** is explicitly a positive control and must not be treated as broken by this audit.

## Test / release state

Documentation only. Product tests were not rerun. Historical evidence remains **88/88 JavaScript syntax + 74/74 deterministic tests PASS**. Runtime version remains `0.9.8`; no build, tag or GitHub Release was created.