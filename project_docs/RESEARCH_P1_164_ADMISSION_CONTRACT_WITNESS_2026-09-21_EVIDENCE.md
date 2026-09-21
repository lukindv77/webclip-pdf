# P1-164 destructive admission source-contract witness — 2026-09-21

## Scope

This tranche adds a **machine-readable source-contract witness** for the existing two-admission
`publication-revoke-trash` protocol and a binder that can pair that source contract with one
sanitized P1-164 provider observation.

It changes no product runtime and adds no provider call.

The purpose is narrow: future physical qualification should be able to say, for one exact clean
candidate checkout, which destructive admissions the source requires before a given observation
phase — without incorrectly claiming that source inspection proves the running browser actually
executed those commands.

## Current production contract revalidated

Fresh inspection of current `service-worker.js` proves the following source ordering.

### Unpublish admission

The composite revoke path calls:

`markPendingPublicationRevokeTrashRemoteAdmission(detachedReceiptId, 'prepared', 'revoke-admitted-unknown')`

before its single:

`PUT /resources/unpublish`

command site.

The admission helper rechecks:

- durable remote identity;
- exact Journal reset generation / row revision authority;

then writes the next durable receipt phase with a fresh `updatedAt` before returning.

If the command result is ambiguous, the path records `retryForbidden: true` and settles by
authoritative metadata reads rather than issuing another unpublish.

### Move admission

The composite Trash path calls:

`markPendingPublicationRevokeTrashRemoteAdmission(key, 'revoke-verified', 'move-admitted-unknown')`

before its single:

`POST /resources/move`

command site.

The move uses the already-prepared immutable target with `overwrite=false`.

If the result is ambiguous, the path again records `retryForbidden: true` and observes the
immutable target rather than issuing another move.

### Restart / recovery

`reconcilePendingPublicationRevokeTrashReceipt` contains no unpublish or move command site for an
already admitted unknown phase.

- `revoke-admitted-unknown` is reconciled by exact source observation;
- `move-admitted-unknown` is reconciled by exact target observation;
- only `revoke-verified`, where move has **not** yet been admitted, may create a fresh move admission.

This preserves the existing at-most-once remote-admission protocol.

## New source-contract artifact

`project_tools/yandex_p1_164_admission_contract.js` derives
`webclip-p1-164-admission-contract/v1` from one exact clean tracked checkout.

The contract binds:

- exact tested Git SHA;
- `service-worker.js` SHA-256;
- canonical contract SHA-256;
- exact unpublish/move endpoints and HTTP methods;
- required durable admission transition before each command;
- one command site per destructive effect;
- unknown-settlement recovery mode;
- immutable move-target overwrite policy;
- durable remote-identity and Journal-authority rechecks;
- negative replay properties.

The CLI requires `git rev-parse HEAD` and a clean tracked worktree before producing a real
contract artifact.

## Observation binding

The same tool can bind that contract to one existing sanitized
`webclip-p1-164-live-observation/v2`.

Binding requires:

- observation `testedSourceSha` exactly equals the contract SHA;
- the contract digest and all contract content still match current `service-worker.js`;
- the observation passes the existing v2 P1-164 semantic validator.

The binding derives the admissions that must already be durable for the observation's
**effective** remote phase:

- `prepared` -> none;
- `revoke-admitted-unknown` -> unpublish;
- `revoke-verified` -> unpublish;
- `move-admitted-unknown` -> unpublish + move;
- `remote-verified` -> unpublish + move.

Manual-resolution wrapper observations use their already-preserved effective/source phase through
the existing observer/ledger validator.

The binder carries the sanitized receipt anchor and provider classification, but hard-codes:

- `commandExecutionProven: false`;
- `providerMutationCausalityProven: false`;
- `runningExtensionSourceProven: false`;
- `qualificationPass: false`.

Therefore it cannot convert source inspection plus provider state into a fabricated live PASS.

## Why no retry/idempotency token is added

Current WebClip source does not send a provider-recognized client idempotency token/key on these
two Yandex destructive calls.

That matters because systems that support safe mutation retry provide a server-side deduplication
contract.

### AWS

AWS Well-Architected guidance distinguishes at-most-once / at-least-once behavior from a service
API that accepts an idempotency token. With such a token, repeated requests can be recognized by
the service and return the stored result instead of repeating the side effect.

References:
- https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_prevent_interaction_failure_idempotent.html
- https://docs.aws.amazon.com/ec2/latest/devguide/ec2-api-idempotency.html

### Stripe

Stripe supports retry-safe mutation by accepting an `Idempotency-Key` and retaining the first
request result for later matching retries.

Reference:
- https://docs.stripe.com/api/idempotent_requests

### Yandex Disk

The actual WebClip live-provider boundary remains the OAuth-authenticated Yandex Disk REST API.

Reference:
- https://yandex.com/dev/disk/rest/

No current project evidence establishes an equivalent Yandex client-token contract for the
specific WebClip `/resources/unpublish` and `/resources/move` requests. The project therefore
continues to use the stricter existing protocol:

`durable admission -> at most one mutation attempt -> authoritative read-only settlement`.

External APIs above are comparison inputs only and do not alter WebClip requirements.

## Deterministic witness

`project_tools/test_p1_164_admission_contract.js` covers:

- exact source-contract schema/digests;
- both admission transitions;
- admission-before-command ordering;
- one command site per destructive effect;
- expected methods and immutable move target;
- durable identity / Journal authority rechecks;
- negative recovery replay;
- no client idempotency token claim;
- phase -> required admission mapping;
- source-SHA equality with sanitized observation;
- contract digest/content tamper rejection;
- receipt-anchor preservation;
- explicit non-proof of command execution, provider causality, running-extension SHA and qualification;
- repository-local observation-file rejection;
- no network/OAuth/provider-mutation implementation in the witness itself.

Negative source fixtures deliberately remove or alter admission, method, durable write and recovery
properties and must fail closed.

This is deterministic/source evidence only.

## Explicit limitations

The contract and binding permanently state:

- `source-contract-only-not-runtime-execution-evidence`;
- `does-not-prove-running-extension-source-sha`;
- `does-not-prove-destructive-command-executed`;
- `does-not-prove-provider-mutation-causality`;
- `does-not-authenticate-private-export-origin`;
- `does-not-close-p1-164`;
- `does-not-advance-yandex-qcf`.

The source contract answers **what the exact candidate source requires**. It does not answer
whether a real browser instance ran that source or whether a particular provider state transition
was caused by that browser command.

## Release identity impact

This tranche changes qualification tooling/tests/docs only.

No runtime package member, QA-contract projection/root, current P1-231 full-RCF root or builder
contract changes.

Therefore current identities remain:

- RPF: `sha256:b65c38854c016ce3ea88efd1caf5c3291a3089336ba9d58b01b9f86db73b835a`
- Chrome QCF: `sha256:3715a3453333d3d679a1c1c00a0bab6a02b77c0153f1a4e8d138aa1e8f5a984c`
- Yandex QCF: `sha256:8d6c9711b4f71b8485b49a6ab68f90bcf62bc74155ae0959dbdc4718648879a1`
- full RCF: `sha256:df6709bbe06a91b39828073552c499e307d74c4aebf782b3966fb1163ebdc8ce`
- BCF: `sha256:9eebcc834fa32bd8fe5f03ef14564f0fc1c169d0308dcc2813941b4f913363ff`

No physical Chrome or Yandex QCF evidence is advanced.

## Current boundary

P1-164 remains **ACTIVE**.

The remaining physical matrix still needs an authorized real browser/Yandex environment:

- successful revoke + Trash;
- unknown settlement around each admission;
- target visibility delay;
- auth expiry / reauthorization;
- account/root switch;
- source/public-link replacement;
- occupied/replaced target;
- real manual-resolution operator flow;
- independent proof that the running extension is the exact tested candidate generation.

Manifest remains `0.9.8`; release readiness remains **NOT READY**.

No build, tag, deployment, GitHub Release, release-gate execution, version bump, provider mutation
or live-provider PASS is part of this tranche.
