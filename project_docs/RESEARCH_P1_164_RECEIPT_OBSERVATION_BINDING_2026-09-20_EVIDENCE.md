# P1-164 receipt-version ↔ provider-observation binding — 2026-09-20

## Scope

This tranche closes one qualification-infrastructure gap between the existing private manual-recovery export, the GET-only live Yandex observer, and the local observation-session ledger.

Before this tranche, the private export carried an exact `receiptId`, `receiptUpdatedAt`, and `exportedAt`, but the adapter intentionally discarded those fields before the live observer. The sanitized provider observation was therefore bound to operation/account/root/source/target/resource/public-link identity, but not to the exact durable WebClip receipt **version** from which that observation was prepared.

The tranche adds that missing binding without adding provider authority:

1. the existing private export schema remains `webclip-p1-164-private-observer-export/v1`;
2. the private adapter carries exact receipt snapshot metadata into observer input v2;
3. the GET-only observer sanitizes raw `receiptId` into a domain-separated SHA-256 digest and emits the exact receipt revision/export time;
4. the observation-session ledger v2 makes receipt-id digest part of the immutable subject and requires receipt revision continuity across checkpoints.

This is still qualification infrastructure, not live Yandex evidence.

## Private observer input v2

`webclip-p1-164-live-observer-input/v2` adds:

```text
receiptAnchor:
  receiptId
  receiptUpdatedAt
  exportedAt
```

The adapter obtains all three values only from the already-validated private WebClip export.

The raw `receiptId` remains inside the private observer input outside the repository. It is required only so the observer can derive a stable sanitized identity for the exact receipt.

The adapter still:

- refuses CI;
- requires a clean exact tracked Git checkout;
- reads no OAuth token;
- performs no provider request;
- writes the private observer input exclusively outside the repository.

## Sanitized live observation v2

`webclip-p1-164-live-observation/v2` adds:

```text
receiptAnchor:
  receiptIdDigest
  receiptUpdatedAt
  exportedAt
```

`receiptIdDigest` is domain-separated:

`SHA-256("WEBCLIP_P1_164_OBSERVER\\0receipt-id\\0" + rawReceiptId)`.

The raw receipt ID is not emitted.

The observer validates:

- current destructive receipt namespace;
- positive safe-integer `receiptUpdatedAt`;
- parseable `exportedAt`;
- all previous provider-identity, phase, account/root and watch constraints.

The observer output additionally states:

- `private-receipt-anchor-is-snapshot-not-command-admission-proof`;
- `does-not-authenticate-private-export-origin`.

The existing limitations also remain: the observer itself does not prove WebClip command admission, the running extension source SHA, P1-164 closure, or a Yandex QCF advance.

## Session ledger v2

The session schemas advance together:

- `webclip-p1-164-observation-session-header/v2`
- `webclip-p1-164-observation-session-entry/v2`
- `webclip-p1-164-observation-session-summary/v2`

The immutable session subject now contains the sanitized `receiptIdDigest` in addition to tested source SHA, RPF, Yandex QCF, kind, and the existing receipt identity digests.

Every checkpoint additionally retains:

- exact `receiptUpdatedAt`;
- exact normalized `receiptExportedAt`;
- sanitized `receiptIdDigest`.

The ledger requires:

- receipt export time never regresses;
- receipt revision never regresses;
- a change in effective destructive remote phase requires a **strictly newer** receipt revision;
- re-observation of the same phase on the same receipt revision is allowed;
- current-root changes remain checkpoint-local and can therefore expose a root switch without pretending that the durable receipt changed;
- receipt-id digest cannot change within one session.

This distinction is important:

- a provider observation may change while WebClip's durable receipt is unchanged;
- a WebClip remote phase transition must be represented by a newer durable receipt revision;
- neither condition by itself proves that a destructive command was admitted by the running extension.

## Authority boundary

The new anchor is a **snapshot binding**, not an authenticated attestation.

It proves only that:

- the private adapter consumed a private export containing the given receipt snapshot;
- the sanitized observer output retained a digest of that receipt ID plus its revision/export time;
- the local ledger kept that binding consistent across its checkpoints.

It does **not** prove:

- who created the private export;
- that the private export was not fabricated before observation;
- that the browser extension was running the tested Git SHA;
- that WebClip admitted an unpublish or move;
- that a Yandex mutation occurred;
- that P1-164 is physically qualified.

Those remain independent evidence requirements.

## External comparison research

### SLSA Source 1.2

SLSA treats a source revision as an immutable, uniquely identified snapshot and separates revision identity from source provenance issued by an authority. This supports WebClip's decision to bind evidence to exact identifiers while refusing to treat a digest alone as provenance authenticity.

Reference:
https://slsa.dev/spec/v1.2/source-requirements

### in-toto

in-toto's stronger supply-chain evidence model uses layouts, authorized functionaries and signed link metadata to establish who performed a step and in what order. WebClip's receipt digest is intentionally not presented as equivalent to such authenticated step evidence.

References:
https://in-toto.io/docs/getting-started/
https://in-toto.io/docs/specs/

### RFC 9162 Certificate Transparency

RFC 9162 uses Merkle consistency proofs for append-only history and signed tree heads for authenticated log state. This reinforces the existing WebClip session-ledger limitation: hash continuity and identity binding are not, by themselves, authenticated provenance.

Reference:
https://www.rfc-editor.org/rfc/rfc9162.html

### Yandex Disk REST

The actual provider boundary remains the OAuth-authenticated Yandex Disk REST API. The receipt anchor changes no Yandex endpoint or HTTP method and adds no provider operation.

Reference:
https://yandex.com/dev/disk/rest/

These are comparison inputs only. Current WebClip requirements and P-code authority remain the repository contracts.

## Deterministic coverage

The existing three P1-164 witnesses are extended rather than introducing a second competing model.

### Private export bridge

`project_tools/test_p1_164_private_observer_export.js` now proves:

- raw receipt ID/revision/export time are preserved into the private observer input;
- sanitized observer anchor replaces raw receipt ID with a digest;
- revision and export time survive unchanged;
- adapter remains network-free and OAuth-free.

### GET-only observer

`project_tools/test_p1_164_live_observer.js` now proves:

- input v2 requires exact receipt snapshot metadata;
- malformed receipt namespace/revision/export time fail closed;
- receipt ID digest is stable SHA-256 and raw receipt ID is absent from sanitized anchor/output;
- output carries the new snapshot/authenticity limitations;
- mutation endpoints remain absent and the deterministic test makes no network calls.

### Observation-session ledger

`project_tools/test_p1_164_observation_session.js` now proves:

- receipt ID digest is part of the immutable session subject;
- raw receipt ID cannot occupy the sanitized anchor;
- receipt export time cannot postdate the observation;
- receipt revision/export time cannot regress;
- phase transition without a newer durable receipt revision fails closed;
- same-phase re-observation on the same receipt revision remains valid, including a changed current-root context;
- session summary carries only sanitized receipt anchor data;
- existing classifier parity, chain integrity, credential fencing and `qualificationPass:false` remain enforced.

All of this is deterministic/source evidence only.

## Release identity impact

Changed implementation files are qualification tooling under `project_tools/`; no runtime package member changes.

The changed files are not members of the current P1-231 full-RCF root set, no Chrome/Yandex QA contract projection changes, and the builder contract does not change.

Therefore current identities remain:

- RPF: `sha256:b65c38854c016ce3ea88efd1caf5c3291a3089336ba9d58b01b9f86db73b835a`
- Chrome QCF: `sha256:3715a3453333d3d679a1c1c00a0bab6a02b77c0153f1a4e8d138aa1e8f5a984c`
- Yandex QCF: `sha256:8d6c9711b4f71b8485b49a6ab68f90bcf62bc74155ae0959dbdc4718648879a1`
- full RCF: `sha256:df6709bbe06a91b39828073552c499e307d74c4aebf782b3966fb1163ebdc8ce`
- BCF: `sha256:9eebcc834fa32bd8fe5f03ef14564f0fc1c169d0308dcc2813941b4f913363ff`

No physical Chrome or Yandex QCF evidence is advanced.

## Current boundary

P1-164 remains **ACTIVE**.

The still-required physical matrix is unchanged:

- successful real revoke + Trash;
- unknown settlement around unpublish admission;
- unknown settlement around move admission;
- target visibility delay;
- auth expiry / reauthorization;
- account and root switching;
- source replacement/public-link conflict;
- occupied/replaced immutable target;
- real manual-resolution operator flow;
- independent evidence that the running browser extension is the exact tested candidate source/package generation.

This tranche only makes those future observations harder to mix across receipt versions.

Manifest remains `0.9.8`; release readiness remains **NOT READY**. No build, tag, deployment, GitHub Release, release-gate execution, version bump or provider mutation is part of this tranche.
