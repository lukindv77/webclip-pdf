# P1-164 passive qualification-evidence binding — 2026-09-22

Status: **PASSIVE CROSS-EVIDENCE BINDER IMPLEMENTED / NO PHYSICAL QUALIFICATION EXECUTED**

Owner:

`P1-164 | ACTIVE`

Canonical baseline before this tranche:

`3917332359bead96693f1c99f68fa61ed976e530`

Baseline post-merge Repository Integrity:

- run #1049;
- run id `35701110369`;
- exact main `3917332359bead96693f1c99f68fa61ed976e530`;
- conclusion **SUCCESS**.

Manifest remains `0.9.8`.
Release readiness remains **NOT READY**.

## Purpose

The current P1-164 qualification path already has distinct passive evidence producers for:

1. exact running-extension source attestation;
2. destructive browser request emission;
3. private destructive-receipt export;
4. GET-only Yandex provider-state observation;
5. append-only local observation-session settlement;
6. exact source admission-contract verification.

Those producers intentionally do not promote one evidence class into another. In particular, the browser command observer can prove exact request emission from a source-attested service worker, while the Yandex observer can prove later read-only provider state for an exact receipt identity. Before this tranche there was no single fail-closed authority that checked whether those independently produced artifacts actually refer to one compatible source/receipt/path/session lineage.

This tranche adds:

`project_tools/p1_164_qualification_evidence_binder.js`

with deterministic coverage:

`project_tools/test_p1_164_qualification_evidence_binder.js`

The binder is deliberately passive. It consumes already-produced evidence and performs no Chrome DevTools call, Yandex API call, OAuth operation, receipt mutation or extension mutation.

## Inputs

The CLI requires five physical evidence inputs, all outside the repository:

- runtime source-attestation JSON;
- browser destructive-command observation JSON;
- sanitized GET-only provider observation JSON;
- private destructive-receipt export JSON;
- verified observation-session directory.

The binder also derives two current source authorities itself from the exact clean checkout:

- current runtime/package identity contract;
- current P1-164 destructive admission contract from `service-worker.js`.

A supplied old source contract is therefore not trusted as a substitute for current source authority.

## Exact-source and release-identity binding

All live evidence is required to bind to one exact tested source SHA.

The runtime attestation, command observation and provider observation must also carry the same current:

- RPF;
- Yandex QCF.

The standalone runtime attestation and the command observation must identify the same browser service-worker target through the sanitized extension-id digest and browser product identity.

The current package-member and parsed-worker counts are checked against the runtime contract rather than hard-coded by the binder.

This tranche does not alter any package/runtime member or release identity projection.

## Receipt and path binding

The private receipt export is revalidated through the existing strict private-export adapter. The binder reconstructs the exact sanitized observer identity expected from that private receipt and requires it to match the provider observation, including:

- receipt-id digest;
- receipt revision;
- receipt export timestamp;
- operation/account/root digests;
- source/target path digests;
- resource/public-link digests;
- current-root digest;
- phase and manual-resolution source phase.

No raw account UID, provider resource id, public URL, receipt id or provider path is emitted by the binder.

The destructive command trace is then required to use the same sanitized source-path digest. A move command must additionally use the same sanitized immutable target-path digest.

This establishes receipt/path consistency. It is not a provider mutation-causality claim.

## Session binding

The observation-session directory is verified using the existing append-only session reader before binding.

The binder computes the exact sanitized provider-observation digest and requires that observation to appear exactly once in the verified session summary. The matching checkpoint must preserve the same:

- phase;
- effective phase;
- receipt-id digest;
- receipt revision.

The binder retains only the sanitized session id digest, final chain digest, checkpoint sequence and observation digest.

The existing session limitation remains unchanged: a local hash chain detects internal inconsistency, but without external retention of the final digest it is not an independent authenticity service.

## Admission/command compatibility

The current source admission contract determines which destructive admissions are valid for the provider observation's effective phase:

- `prepared` -> none;
- `revoke-admitted-unknown` / `revoke-verified` -> `unpublish`;
- `move-admitted-unknown` / `remote-verified` -> `unpublish`, then `move`.

Every observed destructive command must be a correctly ordered member of that source-required admission sequence.

The binder reports both:

- `observedCommands`;
- `requiredCommandCoverageComplete`.

A bounded partial live trace can therefore remain honest. For example, a `move`-only trace may prove that exact move request emission while `requiredCommandCoverageComplete=false` for a phase whose complete source admission lineage also contains `unpublish`.

Partial coverage is never promoted to complete operation coverage, causality or qualification.

## Chronology binding

The binder requires:

1. standalone runtime source attestation no later than the beginning of the destructive-command watch window;
2. a valid command watch interval;
3. command output finalized no earlier than the end of its watch window;
4. provider observation generated no earlier than the end of the destructive-command watch window.

This rules out several stale or reversed evidence combinations.

Chronological order remains correlation evidence only.

## Why provider mutation causality remains false

Chrome DevTools Protocol provides browser-local request correlation such as `requestId` inside Network-domain events. WebClip deliberately sanitizes that identifier before retention, and Yandex's later GET-only resource observation does not return a provider-recognized value that WebClip can prove is the same browser request.

General distributed-tracing standards solve cross-system correlation by propagating an explicit shared trace context across boundaries. The current WebClip/Yandex destructive path has no equivalent provider-recognized correlation token that is both emitted with the destructive command and later returned by the read-only state observation.

Comparison references:

- Chrome DevTools Protocol Network domain: https://chromedevtools.github.io/devtools-protocol/tot/Network/
- W3C Trace Context: https://www.w3.org/TR/trace-context/
- Yandex Disk REST API: https://yandex.com/dev/disk/rest/

These are platform/comparison inputs, not WebClip project authority.

Therefore even a fully consistent future **live** binder output permanently records:

- `runningExtensionSourceProven=true` only because live source evidence was supplied;
- `commandExecutionProven=true` only because live browser command evidence was supplied;
- `providerStateObserved=true` only because live GET-only provider evidence was supplied;
- `providerMutationCausalityProven=false`;
- `qualificationPass=false`;
- `releaseAuthorized=false`.

The output explicitly records that it has identity/time consistency only and no provider-recognized command-to-state correlation token.

## Evidence-class boundary

A successful binder result uses:

`webclip-p1-164-qualification-evidence-binding/v1`

with evidence class:

`passive-cross-evidence-consistency-binding`

It means only that the supplied evidence artifacts passed the current cross-evidence consistency contract.

It does **not** mean:

- the synthetic deterministic witness is physical evidence;
- a provider state transition was caused by the observed browser request;
- every P1-164 physical matrix case passed;
- P1-164 is closed;
- Yandex QCF advances;
- release readiness advances.

## Deterministic witness

`project_tools/test_p1_164_qualification_evidence_binder.js` creates only synthetic/local evidence.

It covers:

- exact current runtime contract derivation;
- current package-member and worker-graph counts;
- synthetic exact runtime attestation;
- synthetic `unpublish + move` command observation;
- synthetic private receipt export;
- synthetic GET-only provider observation;
- real local session-ledger creation/verification in a temporary outside-repository directory;
- current source admission-contract derivation;
- exact source SHA/RPF/Yandex-QCF equality;
- runtime/command browser-target equality;
- receipt/path digest equality;
- provider observation after command window;
- exact provider observation checkpoint binding;
- full required command coverage reporting;
- honest partial command coverage reporting;
- fail-closed command/provider path mismatch;
- fail-closed runtime/command browser mismatch;
- fail-closed reversed chronology;
- fail-closed private-receipt retargeting;
- fail-closed missing session checkpoint;
- fail-closed cross-phase session reuse;
- absence of raw receipt/provider identity from binder output;
- no OAuth-token consumption;
- no provider request construction;
- permanent false causality/qualification/release assertions.

The deterministic witness is not live Chrome/Yandex evidence.

## Identity impact

This tranche changes only qualification tooling, deterministic tests and durable research/test documentation.

No extension package/runtime member, manifest version, package manifest, QA projection, full-RCF root, builder contract or release readiness field is changed.

Expected identities therefore remain unchanged from the exact baseline and must be independently reproduced by Repository Integrity on the exact PR head.

## Remaining physical boundary

P1-164 remains **ACTIVE**.

The real authorized browser/Yandex matrix still requires physical evidence for, at minimum:

- successful revoke + Trash;
- unknown settlement around unpublish admission;
- unknown settlement around move admission;
- target visibility delay;
- auth expiry / reauthorization;
- account/root switching;
- source/public-link replacement;
- occupied/replaced immutable target;
- real manual-resolution operator flow;
- live source/command/provider/session evidence collected from the applicable exact candidate;
- an explicit evidence rule for each matrix case without converting mere temporal/path correlation into provider mutation causality.

P1-231 also remains **ACTIVE**; its passive pre-S2 shadow does not replace current physical QA/governance/release evidence.

## Explicit non-actions

This tranche performs no live browser qualification and no Yandex provider mutation.

It does not build a product ZIP, bump `manifest.json`, run a release action, activate S2, create a tag, deploy, create a GitHub Release or make a release decision.
