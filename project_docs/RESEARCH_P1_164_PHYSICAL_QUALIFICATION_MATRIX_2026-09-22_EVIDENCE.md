# P1-164 passive physical qualification matrix authority — 2026-09-22

Status: **PASSIVE MATRIX AUTHORITY IMPLEMENTED / NO LIVE PHYSICAL QUALIFICATION EXECUTED**

Owner:

`P1-164 | ACTIVE`

Canonical baseline before this tranche:

`105637696c13b0062ce593ba62c1dd7779c388e1`

Baseline post-merge Repository Integrity:

- run #1051;
- run id `35705455581`;
- exact main `105637696c13b0062ce593ba62c1dd7779c388e1`;
- conclusion **SUCCESS**.

Manifest remains `0.9.8`.
Release readiness remains **NOT READY**.

## Purpose

The previous P1-164 tranches created independent passive evidence layers for:

- exact running-extension source attestation;
- destructive browser request emission;
- exact private destructive-receipt export;
- GET-only Yandex provider observation;
- append-only observation-session settlement;
- exact source admission-contract verification;
- cross-evidence consistency binding.

That was not yet sufficient to prepare the real physical matrix deterministically.

Two concrete gaps remained:

1. the v1 cross-evidence binder validated browser command `networkOutcome` / `responseStatus` but discarded those sanitized values from its output, so a later tool could not distinguish a normal 2xx response from a transport-unknown command;
2. it also discarded the provider wrapper phase, manual-resolution source phase, bounded watch parameters and per-attempt provider classification states, so target-visibility-delay and manual-resolution lineage could not be evaluated from the sanitized binding alone.

This tranche closes those tooling gaps without making a Yandex request.

It advances the binder schema to:

`webclip-p1-164-qualification-evidence-binding/v2`

and adds:

`project_tools/p1_164_qualification_matrix.js`

with deterministic coverage:

`project_tools/test_p1_164_qualification_matrix.js`.

## Binder v2 retained data

Binder v2 keeps all prior source/receipt/path/session constraints and adds only sanitized, bounded fields already validated by its input authorities.

### Command result summary

For each observed destructive command it retains:

- command kind: `unpublish` or `move`;
- network outcome:
  - `response`;
  - `loading-failed`;
  - `unknown`;
- numeric HTTP response status, or `0` when no response was observed.

It does not retain:

- raw CDP request id;
- raw provider URL/path;
- request headers;
- cookies;
- OAuth token;
- response body;
- loading error text.

This makes transport-unknown qualification machine-readable without expanding the secret/privacy boundary.

### Provider phase and watch summary

Binder v2 also retains:

- provider wrapper phase;
- preserved `manualResolutionSourcePhase`;
- effective phase;
- final provider classification;
- requested bounded watch seconds;
- elapsed watch milliseconds;
- attempt count;
- sanitized attempt sequence:
  - attempt number;
  - elapsed milliseconds;
  - classification state.

This allows a later matrix evaluator to distinguish, for example:

`move-not-observed -> move-settled-private`

inside one bounded watch without retaining raw provider identity.

## Why this data is necessary

Current production deliberately treats a destructive command response as potentially unreliable.

For both unpublish and move, the source uses:

`durable admission -> at most one mutation attempt -> read-only settlement`

and explicitly forbids blind replay after an admitted unknown state.

A successful response and a lost/unknown response therefore exercise different reliability paths even when both eventually produce the same private provider state.

The physical matrix must be able to prove which path was exercised.

Likewise, a target becoming visible only after repeated GET-only observation is materially different from immediate visibility. Keeping only the final classification would erase the visibility-delay schedule.

## Canonical passive matrix

The new matrix authority defines ten bounded P1-164 cases:

1. `success-revoke-trash`;
2. `unpublish-transport-unknown`;
3. `move-transport-unknown`;
4. `target-visibility-delay`;
5. `auth-expiry-reauth`;
6. `account-switch`;
7. `root-switch`;
8. `source-public-link-replacement`;
9. `target-occupation-replacement`;
10. `manual-resolution`.

These are not new P-codes. They are physical qualification cases for the existing P1-164 owner.

The evaluator consumes one or more sanitized binder-v2 outputs for one case and requires all bindings to stay on one exact:

- tested source SHA;
- RPF;
- Yandex QCF;
- source admission-contract digest;
- sanitized browser service-worker identity;
- receipt-id digest;
- source path digest;
- target path digest;
- observation-session id digest.

Across multiple observations it also requires:

- strictly increasing provider-observation time;
- strictly increasing session checkpoint sequence;
- non-regressing receipt revision.

Cross-receipt or cross-session evidence cannot be silently combined into one case.

## Case-specific consistency rules

### Normal composite success

Requires one binding with:

- complete `unpublish -> move` command coverage;
- both commands observed with 2xx HTTP responses;
- final exact private target/terminal provider classification.

This separates the normal response path from the transport-unknown cases below.

### Unpublish transport unknown

Requires:

- effective phase `revoke-admitted-unknown`;
- observed unpublish command with `loading-failed` or `unknown`;
- provider classification compatible with read-only revoke settlement;
- safe next action that never authorizes blind unpublish replay.

### Move transport unknown

Requires:

- effective phase `move-admitted-unknown`;
- observed move command with `loading-failed` or `unknown`;
- provider classification compatible with read-only move settlement;
- safe next action that never authorizes blind move replay.

A move-only browser trace is allowed to remain honest partial command coverage; it is not promoted to proof of the earlier unpublish command.

### Target visibility delay

Requires a bounded move-phase watch with:

- more than one provider observation attempt;
- at least one pre-terminal move state such as `move-not-observed`, `move-settlement-unknown` or `dual-location`;
- a later private terminal state in the same receipt/session, either within the same watch or a later binding.

### Auth expiry / reauthorization

Requires:

- an `auth-rejected` provider observation;
- a later observation of the same receipt/session after authorization is restored.

The tool explicitly does **not** claim to observe the user's real reauthorization/resume action. That remains separate physical/operator evidence.

### Account and root switching

The account case requires:

`account-conflict -> stop-no-retry`

and the root case requires:

`root-conflict -> stop-no-retry`.

They are separate matrix cases even though the release contract groups them under one higher-level failure-settlement assertion.

### Source/public-link replacement

Requires one of the current conflict classifications such as:

- `source-replaced`;
- `public-url-conflict`;
- `source-conflict`;
- `source-public`;
- terminal replacement/public regression;

with a safe action that does not authorize destructive replay.

### Target occupation/replacement

Requires one of:

- `target-occupied`;
- `target-replaced`;
- `target-public`;

with a safe action that does not retarget or blindly retry the destructive command.

### Manual resolution

Requires:

- wrapper phase `manual-resolution`;
- exact preserved pre-manual effective phase.

The evaluator permanently records that the real operator action is external evidence it cannot observe.

## Release-contract mapping

The matrix does not define a second Yandex release contract.

Every case carries references into the current canonical `yandex-e2e` projection in `release_contract_inputs_v1.json`, including applicable assertions from:

- `yandex.oauth-context`;
- `yandex.remote-effects`;
- `yandex.failure-settlement`.

At runtime and in deterministic tests, the matrix verifies that every referenced release case/assertion still exists.

If the release projection drifts, matrix validation fails closed instead of silently retaining stale semantic mapping.

This tranche does not edit `release_contract_inputs_v1.json`, so current Yandex QCF semantics do not change.

## Evidence/provenance boundary

A binder JSON can be structurally valid whether it came from a future live run or a deterministic fixture.

The current binder deliberately does not cryptographically authenticate:

- its own file origin;
- the private receipt export origin;
- the local observation-session chain as an external attestation service.

Therefore the matrix output permanently uses:

`evidenceClass = passive-physical-matrix-consistency-evaluation`

and may state only:

`caseConsistencySatisfied=true|false`.

It permanently keeps:

- `evidenceOriginAuthenticated=false`;
- `providerMutationCausalityProven=false`;
- `physicalCasePass=false`;
- `qualificationPass=false`;
- `yandexQcfAdvanced=false`;
- `p1_231ReleaseReceiptCreated=false`;
- `releaseAuthorized=false`.

This is intentional.

A JSON file that passes local structural validation is not automatically real physical evidence.

## P1-231 / S2 boundary

Current P1-231 S0-G models physical release evidence as typed receipts with admitted provenance and the permanent S1 pipeline currently reports `evidence-missing`.

The P1-231 implementation plan explicitly places real final external qualification and receipt admission behind the S2 / explicit approval boundary.

This P1-164 tranche therefore does **not**:

- create `project_docs/release_evidence/receipts/*`;
- add or activate `.github/workflows/release-qualification.yml`;
- change V1 readiness;
- activate S2;
- turn a local binder/matrix result into P1-231 release evidence.

This avoids bypassing the explicit release-policy activation fence.

## External comparison research

Fresh external research was used only as comparison input.

### Yandex Disk REST API

Official Disk REST documentation confirms the live provider boundary is OAuth-authenticated HTTP resource operations:

https://yandex.com/dev/disk/rest/

Yandex's public Java client exposes move and unpublish as distinct resource operations:

https://github.com/yandex-disk/yandex-disk-restapi-java/blob/master/disk-restapi-sdk/src/main/java/com/yandex/disk/rest/RestClient.java

Other public Yandex Disk clients likewise expose move separately and may surface asynchronous operation objects/links for provider operations, reinforcing that command response/operation settlement is a distinct concern from later resource-state observation:

https://github.com/ufee/yandex-disk

https://github.com/RomiC/ya-disk

These projects are comparison evidence only. WebClip's current `force_async=false`, exact-resource identity and no-replay contract remain authoritative.

### Distributed correlation

W3C Trace Context standardizes explicit propagation of shared trace identifiers across participating systems:

https://www.w3.org/TR/trace-context/

The current WebClip/Yandex destructive path does not have an equivalent provider-recognized correlation token returned by later GET-only resource observation.

Therefore matching source/receipt/path/time evidence remains consistency evidence, not mutation-causality proof.

### Retry/idempotency comparison

AWS and Stripe document server-recognized idempotency tokens/keys as a mechanism for safe retries:

https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_prevent_interaction_failure_idempotent.html

https://docs.stripe.com/api/idempotent_requests

No current project evidence establishes an equivalent client idempotency contract for these Yandex unpublish/move calls.

WebClip therefore continues to qualify the stricter existing behavior:

`durable admission -> one destructive attempt -> authoritative observation, never blind replay`.

## Deterministic witness

`project_tools/test_p1_164_qualification_matrix.js` is synthetic only.

It covers:

- current Yandex release projection reference mapping;
- binder-v2 command outcome validation;
- binder-v2 provider phase/manual lineage;
- bounded provider attempt history;
- normal revoke+Trash response path;
- unpublish transport-unknown path;
- move transport-unknown path;
- target visibility delay;
- auth expiry then same-receipt observation recovery;
- account switch conflict;
- root switch conflict;
- source/public-link replacement conflict;
- target occupation/replacement conflict;
- manual-resolution lineage;
- cross-receipt rejection;
- session checkpoint reuse rejection;
- receipt revision regression rejection;
- impossible network-outcome/status combination rejection;
- release-contract mapping drift rejection;
- permanent false physical/qualification/release claims;
- absence of OAuth/network/provider mutation authority in the matrix tool.

No synthetic case becomes a physical PASS.

## Identity impact

This tranche changes qualification tooling/tests/docs only.

No extension package/runtime member changes.
No manifest version changes.
No package authority changes.
No release-contract projection changes.
No full-RCF root changes.
No builder contract changes.

Expected current identity axes therefore remain:

- RPF `sha256:feab25126c9d686062f8ed0da8c9d7ad39f468ebc819342bb34fbd2c47e0e843`;
- Chrome QCF `sha256:3715a3453333d3d679a1c1c00a0bab6a02b77c0153f1a4e8d138aa1e8f5a984c`;
- Yandex QCF `sha256:8d6c9711b4f71b8485b49a6ab68f90bcf62bc74155ae0959dbdc4718648879a1`;
- full RCF `sha256:cb34076d37c8dbe99392fac120fb21b03d192e4b53bc7a40650b5cd277311ffb`;
- BCF `sha256:9eebcc834fa32bd8fe5f03ef14564f0fc1c169d0308dcc2813941b4f913363ff`.

Exact-head Repository Integrity must independently reproduce them on the PR head.

## Remaining physical boundary

P1-164 remains **ACTIVE**.

The new matrix makes the remaining physical schedule explicit and machine-checkable for consistency, but real authorized Chrome/Yandex evidence is still required.

In particular, no current local tool authenticates a matrix bundle strongly enough to convert it into:

- physical case PASS;
- P1-164 closure;
- Yandex QCF evidence advancement;
- P1-231 `yandex-e2e` receipt;
- release authorization.

Manifest remains `0.9.8`; release readiness remains **NOT READY**.

## Explicit non-actions

No live Chrome qualification is executed.

No Yandex OAuth token is consumed by the matrix tool.

No Yandex API request or provider mutation is executed by this tranche.

No product ZIP/build, readiness mutation, version bump, release-gate execution, S2 activation, tag, deployment, GitHub Release or release decision is performed.
