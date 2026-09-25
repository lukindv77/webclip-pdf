# P1-179 — same-account old-root read-only recovery — 2026-09-26

## Scope

This is the remaining bounded source/runtime tranche of existing **P1-179** after PR #351.

Canonical baseline:

`main=e49743fd3c3e4eea64cdf776685d270540b28191`

Post-merge Repository Integrity:

`#1150 / run 36091034772 — SUCCESS`

The previous tranches already bound lease/checkpoint and scheduler outcome state to immutable account/root namespaces. The remaining gap was a prepared or verified checkpoint from account A/root R1 observed after current configuration moved to the same account A/root R2.

Before this tranche, any root mismatch failed closed before remote observation. That was conservative but did not implement the registered historical-reconciliation contract.

## Provider/account evidence

Current Yandex Disk documentation continues to describe the REST API as authenticated access to the user's Disk data. This tranche relies only on a read-only `GET /resources?path=<exact historical path>` under an already proven semantic account credential. It does not infer historical namespace from current settings and does not issue a live provider request during deterministic development.

## Implemented decision matrix

```text
legacy/unbound checkpoint
=> fail closed
=> zero remote
=> preserve checkpoint

checkpoint account B != current semantic account A
=> JOURNAL_BACKUP_NAMESPACE_ACCOUNT_MISMATCH
=> zero remote
=> preserve checkpoint

checkpoint A/R1 + current A/R1
=> existing exact-current recovery
=> current provisioning allowed only after namespace proof
=> GET exact checkpoint path

checkpoint A/R1 + current A/R2
=> historicalRoot=true
=> NO current-root ensure/provision before reconciliation
=> GET exact historical R1 remotePath read-only using current credential proven for account A
=> never rewrite checkpoint root/path to R2
```

## Historical success settlement

A historical R1 success is not a current R2 success.

When the exact historical object is found and size verification passes:

1. recovered checkpoint namespace is revalidated;
2. success is committed to namespace-local state for checkpoint A/R1;
3. the consumed checkpoint is cleared;
4. the current A/R2 operation remains due;
5. the ordinary fresh current-root upload path then performs its own R2 provisioning/admission and creates a current backup.

Therefore:

```text
success namespace == checkpoint namespace == state namespace
historical R1 success != current R2 success
R1 success cannot suppress due(R2)
R1 remotePath cannot become R2 status truth
```

## 404 behavior

For a same-account historical path, a 404 is authoritative only after:

- durable checkpoint namespace validation;
- exact remotePath validation against that historical namespace;
- semantic account match.

The existing prepared-checkpoint grace/attempt policy may then age the exact historical checkpoint. If it retires after the existing threshold, the current namespace can proceed through its own fresh mutation path.

Foreign-account and legacy/unbound checkpoints still cannot age from provider responses because they make zero remote requests.

## Mutation boundary

Historical reconciliation does not call `ensureYandexServiceFolders()`.

Current-root provisioning remains a separate fresh mutation path and is reached only after historical reconciliation has reached a terminal result that permits the old checkpoint to be consumed.

No historical path is retargeted or provisioned.

## Owner boundaries

- P1-177: scheduler generation/alarm delivery admission — unchanged.
- P1-178: auth/settings generation — unchanged.
- P1-196: auth validity/current credential recheck — unchanged.
- P1-138: provisioning mutation boundary — preserved.
- P1-184: exact remote object/content adoption authority — unchanged.
- P1-231: exact release/package evidence generation — unchanged.

No new P-code is allocated.

## Deterministic coverage

Updated:

- `project_tools/test_p1_179_backup_namespace_runtime.js`
- `project_tools/test_p1_179_backup_namespace_binding_refinement_model.js`

Coverage asserts:

- foreign account fails before remote observation;
- same-account root rotation is classified separately;
- historical root skips current `ensureYandexServiceFolders()`;
- exact historical `remotePath` is preserved;
- recovered result preserves checkpoint namespace;
- historical success writes checkpoint namespace state;
- historical success consumes only its checkpoint and then continues to fresh current-root upload;
- legacy/foreign-account checkpoint cannot be deleted before remote authority;
- 404 aging occurs only after admitted exact-path GET;
- live provider calls remain zero in deterministic tests.

## Closure boundary

This tranche is implementation evidence, not yet P1-179 closure evidence.

P1-179 remains **ACTIVE** until:

1. deterministic exact-head CI succeeds;
2. source/runtime closure review confirms all registered P1-179 acceptance areas are absorbed;
3. any Registry transition receives its own exact-head CI evidence.

## Release boundary

No real Yandex OAuth/API mutation, real Chrome qualification, physical release receipt, product ZIP/build, manifest bump, S2/release-policy activation, tag, deploy, GitHub Release or release decision is performed.

Manifest remains `0.9.8`; target remains `0.9.9`; release readiness remains **NOT READY**.


## CI event-payload discovery #1151

Repository Integrity #1151 / run `36176319146` attempt 1 ran on exact head
`f3be9af3aa13190b1109c3d3cef090fe5ee08c24`.

Both dedicated P1-231 authority lanes completed **SUCCESS**. The generic
`repository-integrity` job failed only at **PR change contract** because the
original pull-request event payload treated adjacent owner-code names in the PR
body as declared affected owners.

The PR body was corrected without changing source/head so that the only explicit
affected owner code is `P1-179`.

Attempt 2 re-ran failed jobs on the same exact head and failed on the identical
PR change-contract message. Job logs showed the original pre-correction PR body,
confirming that GitHub Actions re-used the stale pull-request event payload.

Therefore #1151 attempt 1/2 are **not merge evidence**. This documentation-only
commit intentionally creates a fresh pull-request `synchronize` event so the
change contract evaluates current PR metadata. No production runtime, provider
behavior, release policy, manifest version, live qualification, artifact build,
tag, deploy or release decision is changed by this commit.
