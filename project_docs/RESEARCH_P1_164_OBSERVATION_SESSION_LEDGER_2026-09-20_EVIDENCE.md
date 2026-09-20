# P1-164 observation-session ledger — 2026-09-20

## Scope

This tranche adds a bounded **local evidence-continuity ledger** for the sanitized outputs produced by
`project_tools/yandex_p1_164_live_observer.js`.

It is qualification infrastructure only. It does **not** call Yandex, does not read OAuth credentials, does not own unpublish/move admission, does not authenticate the origin of an observer JSON file, and does not decide that P1-164 is physically qualified.

The intended operator sequence is:

1. WebClip exports one exact private manual-recovery receipt;
2. the private adapter binds it to an exact clean Git checkout;
3. the GET-only observer records one sanitized provider observation;
4. the observation-session ledger creates or appends a local checkpoint outside the repository;
5. after an explicit WebClip-owned action or later read-only observation, another sanitized checkpoint may be appended;
6. the operator preserves the emitted final digest separately when the chain needs an external continuity anchor.

No step in the ledger replays an admitted destructive command.

## Why a session ledger is needed

One observer output is sufficient for one point-in-time classification, but the remaining P1-164 physical matrix contains multi-observation cases:

- pre-admission baseline -> post-unpublish observation;
- unknown unpublish settlement -> later private-source observation;
- pre-move baseline -> post-move observation;
- target visibility delay;
- auth expiry and reauthorization;
- account/root switching;
- source replacement;
- occupied or replaced target;
- manual-resolution re-observation.

Without a bounded continuity record, those observations can be accidentally mixed across receipts, source generations, accounts, roots, or operator sessions.

## Immutable subject

The session header fixes:

- exact `testedSourceSha`;
- current package RPF;
- current Yandex QCF;
- operation/account/root/source/target/resource/public-URL **digests**;
- kind `publication-revoke-trash`.

The current configured root digest is intentionally **not** part of the immutable receipt subject. It is recorded in each observation checkpoint so an account/root context switch remains observable rather than being silently retargeted.

A checkpoint whose immutable subject differs from the session header fails closed.

## Append-only local layout

A private session directory is created outside the repository:

- `000000.header.json`
- `000001.checkpoint.json`
- `000002.checkpoint.json`
- ...

Files are created with exclusive `wx` semantics and mode `0600` where supported; the directory is created mode `0700` where supported. Symlinked session artifacts and repository-local paths are refused.

Each checkpoint stores:

- sequence number;
- observation timestamp and local recorded timestamp;
- a bounded operator label marked `operatorLabelEvidence: false`;
- predecessor digest;
- exact sanitized observation digest;
- the sanitized observation.

The predecessor of checkpoint 1 is the canonical header digest. Each later predecessor is the canonical digest of the immediately preceding checkpoint.

The chain is bounded to 128 checkpoints and one observation is bounded to 256 KiB.

## Observer semantic verification

The ledger does not trust a structurally plausible JSON classification.

For every observation it:

- requires the exact `webclip-p1-164-live-observation/v1` shape;
- requires all current observer limitations;
- rejects credential-shaped fields anywhere in the object;
- requires every raw identity slot to contain a `sha256:` digest;
- re-runs the production observer's pure `classifyObservation` function over the sanitized account/source/target/context state;
- requires the stored classification and safe next action to match that recomputation;
- allows `observation-window-expired` only as the observer's bounded terminal wrapper over a non-terminal underlying classification, with a non-zero watch and elapsed time at least equal to the requested watch;
- requires the final watch attempt state to equal the underlying pure classification;
- requires monotonic observation time, local recorded time, and effective remote phase.

This catches a locally modified JSON that changes an observed state into a more convenient action.

## Operator-label boundary

Labels are a bounded navigation aid only:

- baseline;
- post-revoke-admission;
- revoke-settlement-check;
- pre-move-admission;
- post-move-admission;
- visibility-delay-check;
- auth-expiry-check;
- account-switch-check;
- root-switch-check;
- source-replacement-check;
- target-occupation-check;
- manual-resolution-check;
- terminal-check;
- other.

Arbitrary claims such as an operator-entered “PASS” label are not accepted. Every checkpoint records `operatorLabelEvidence: false`.

## Integrity model and explicit limitations

The local predecessor chain detects internal inconsistency, accidental alteration, gaps, duplicate observations and reordering when compared with the chain state being verified.

It is **not** a signed transparency log and must not be described as authenticated provenance.

The session therefore carries these limitations explicitly:

- `hash-chain-detects-internal-inconsistency-not-authenticity`
- `does-not-authenticate-observer-origin`
- `does-not-detect-consistent-rewrite-without-external-final-digest`
- `does-not-detect-tail-truncation-without-external-final-digest`
- `operator-labels-are-non-evidentiary`
- `does-not-prove-webclip-command-admission`
- `does-not-prove-running-extension-source-sha`
- `does-not-close-p1-164`
- `does-not-advance-yandex-qcf`

The CLI prints the current final digest after init/append so an operator or later evidence system may preserve that value independently. This tranche does not introduce signing keys, remote transparency infrastructure, or a new trust service.

## External comparison research

The design deliberately borrows only narrow ideas from stronger systems.

**Certificate Transparency / RFC 9162**

RFC 9162 defines an append-only log using Merkle trees and consistency proofs, with signed tree heads. That provides stronger guarantees than this local predecessor chain, including a way to prove that one advertised tree is a prefix of a later tree.

Reference:
https://www.rfc-editor.org/rfc/rfc9162.html

WebClip does **not** claim CT-equivalent guarantees. In particular, without an independently retained final digest the local chain cannot detect a fully consistent rewrite or tail truncation.

**SLSA 1.2**

SLSA distinguishes artifact/revision identity from provenance authenticity and treats source provenance as an attestation associated with an immutable revision identifier. That supports WebClip's separation between:

- exact tested source/package/contract digests;
- the local observation record;
- independent authority/authenticity of the system that produced the record.

References:
https://slsa.dev/spec/v1.2/provenance
https://slsa.dev/spec/v1.2/source-requirements

The P1-164 ledger is not a SLSA attestation and makes no SLSA level claim.

**NIST log-management guidance**

NIST SP 800-92 treats log generation, storage, access and analysis as separate log-management concerns. This is consistent with keeping the private observation session separate from provider mutation and from release authorization.

Reference:
https://csrc.nist.gov/pubs/sp/800/92/final

**Yandex Disk REST**

The actual live provider boundary remains the OAuth-authenticated Yandex Disk REST API. The ledger has no HTTP client and no Yandex endpoint.

Reference:
https://yandex.com/dev/disk/rest/

These sources are comparison inputs, not automatic WebClip requirements. Current project authorities remain the repository contracts and P-code registry.

## Deterministic witness

`project_tools/test_p1_164_observation_session.js` covers:

- exact observer schema normalization;
- immutable receipt subject;
- current-root variation without receipt retargeting;
- canonical JSON/digest round trip;
- header -> checkpoint -> checkpoint predecessor chain;
- exclusive private filesystem creation;
- no overwrite of older checkpoint bytes during append;
- subject mismatch;
- observation-time, recorded-time and phase regression;
- duplicate observation rejection;
- classifier mismatch rejection;
- watch-expiry semantics and final-attempt parity;
- raw identity in a digest slot;
- credential-shaped fields;
- observer/session limitation removal;
- unbounded operator-label claim;
- unexpected files;
- predecessor tamper detection;
- final digest binding;
- repository-local path rejection;
- zero network/provider mutation/OAuth access in the ledger source;
- `qualificationPass: false` as a hard output property.

This is deterministic/source evidence only.

## Release identity impact

This tranche changes only:

- `project_tools/yandex_p1_164_observation_session.js`;
- `project_tools/test_p1_164_observation_session.js`;
- this durable evidence;
- current test-status narrative.

No runtime package member, QA-contract projection/root, full-RCF root or builder contract changes.

Therefore the current release identities remain:

- RPF: `sha256:b65c38854c016ce3ea88efd1caf5c3291a3089336ba9d58b01b9f86db73b835a`
- Chrome QCF: `sha256:3715a3453333d3d679a1c1c00a0bab6a02b77c0153f1a4e8d138aa1e8f5a984c`
- Yandex QCF: `sha256:8d6c9711b4f71b8485b49a6ab68f90bcf62bc74155ae0959dbdc4718648879a1`
- full RCF: `sha256:df6709bbe06a91b39828073552c499e307d74c4aebf782b3966fb1163ebdc8ce`
- BCF: `sha256:9eebcc834fa32bd8fe5f03ef14564f0fc1c169d0308dcc2813941b4f913363ff`

No physical Chrome or Yandex QCF evidence is advanced.

## Current boundary

P1-164 remains **ACTIVE**.

The ledger improves continuity of future real observations but does not satisfy the still-required physical Yandex matrix:

- successful revoke + Trash;
- unknown settlement around unpublish admission;
- unknown settlement around move admission;
- target visibility delay;
- auth expiry / reauthorization;
- account and root switching;
- source replacement/public-link conflict;
- occupied/replaced immutable target;
- real manual-resolution operator flow;
- independent proof that the running browser extension is the exact tested candidate source/package generation.

Manifest remains `0.9.8`; release readiness remains **NOT READY**. No build, tag, deployment, GitHub Release, release-gate execution, version bump or provider mutation is part of this tranche.
